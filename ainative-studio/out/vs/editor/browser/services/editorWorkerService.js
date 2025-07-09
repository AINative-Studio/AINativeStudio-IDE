/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { timeout } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { logOnceWebWorkerWarning } from '../../../base/common/worker/webWorker.js';
import { createWebWorker } from '../../../base/browser/webWorkerFactory.js';
import { Range } from '../../common/core/range.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { EditorWorker } from '../../common/services/editorWebWorker.js';
import { IModelService } from '../../common/services/model.js';
import { ITextResourceConfigurationService } from '../../common/services/textResourceConfiguration.js';
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { canceled, onUnexpectedError } from '../../../base/common/errors.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { MovedText } from '../../common/diff/linesDiffComputer.js';
import { DetailedLineRangeMapping, RangeMapping, LineRangeMapping } from '../../common/diff/rangeMapping.js';
import { LineRange } from '../../common/core/lineRange.js';
import { mainWindow } from '../../../base/browser/window.js';
import { WindowIntervalTimer } from '../../../base/browser/dom.js';
import { WorkerTextModelSyncClient } from '../../common/services/textModelSync/textModelSync.impl.js';
import { EditorWorkerHost } from '../../common/services/editorWorkerHost.js';
/**
 * Stop the worker if it was not needed for 5 min.
 */
const STOP_WORKER_DELTA_TIME_MS = 5 * 60 * 1000;
function canSyncModel(modelService, resource) {
    const model = modelService.getModel(resource);
    if (!model) {
        return false;
    }
    if (model.isTooLargeForSyncing()) {
        return false;
    }
    return true;
}
let EditorWorkerService = class EditorWorkerService extends Disposable {
    constructor(workerDescriptor, modelService, configurationService, logService, _languageConfigurationService, languageFeaturesService) {
        super();
        this._languageConfigurationService = _languageConfigurationService;
        this._modelService = modelService;
        this._workerManager = this._register(new WorkerManager(workerDescriptor, this._modelService));
        this._logService = logService;
        // register default link-provider and default completions-provider
        this._register(languageFeaturesService.linkProvider.register({ language: '*', hasAccessToAllModels: true }, {
            provideLinks: async (model, token) => {
                if (!canSyncModel(this._modelService, model.uri)) {
                    return Promise.resolve({ links: [] }); // File too large
                }
                const worker = await this._workerWithResources([model.uri]);
                const links = await worker.$computeLinks(model.uri.toString());
                return links && { links };
            }
        }));
        this._register(languageFeaturesService.completionProvider.register('*', new WordBasedCompletionItemProvider(this._workerManager, configurationService, this._modelService, this._languageConfigurationService)));
    }
    dispose() {
        super.dispose();
    }
    canComputeUnicodeHighlights(uri) {
        return canSyncModel(this._modelService, uri);
    }
    async computedUnicodeHighlights(uri, options, range) {
        const worker = await this._workerWithResources([uri]);
        return worker.$computeUnicodeHighlights(uri.toString(), options, range);
    }
    async computeDiff(original, modified, options, algorithm) {
        const worker = await this._workerWithResources([original, modified], /* forceLargeModels */ true);
        const result = await worker.$computeDiff(original.toString(), modified.toString(), options, algorithm);
        if (!result) {
            return null;
        }
        // Convert from space efficient JSON data to rich objects.
        const diff = {
            identical: result.identical,
            quitEarly: result.quitEarly,
            changes: toLineRangeMappings(result.changes),
            moves: result.moves.map(m => new MovedText(new LineRangeMapping(new LineRange(m[0], m[1]), new LineRange(m[2], m[3])), toLineRangeMappings(m[4])))
        };
        return diff;
        function toLineRangeMappings(changes) {
            return changes.map((c) => new DetailedLineRangeMapping(new LineRange(c[0], c[1]), new LineRange(c[2], c[3]), c[4]?.map((c) => new RangeMapping(new Range(c[0], c[1], c[2], c[3]), new Range(c[4], c[5], c[6], c[7])))));
        }
    }
    canComputeDirtyDiff(original, modified) {
        return (canSyncModel(this._modelService, original) && canSyncModel(this._modelService, modified));
    }
    async computeDirtyDiff(original, modified, ignoreTrimWhitespace) {
        const worker = await this._workerWithResources([original, modified]);
        return worker.$computeDirtyDiff(original.toString(), modified.toString(), ignoreTrimWhitespace);
    }
    async computeMoreMinimalEdits(resource, edits, pretty = false) {
        if (isNonEmptyArray(edits)) {
            if (!canSyncModel(this._modelService, resource)) {
                return Promise.resolve(edits); // File too large
            }
            const sw = StopWatch.create();
            const result = this._workerWithResources([resource]).then(worker => worker.$computeMoreMinimalEdits(resource.toString(), edits, pretty));
            result.finally(() => this._logService.trace('FORMAT#computeMoreMinimalEdits', resource.toString(true), sw.elapsed()));
            return Promise.race([result, timeout(1000).then(() => edits)]);
        }
        else {
            return Promise.resolve(undefined);
        }
    }
    computeHumanReadableDiff(resource, edits) {
        if (isNonEmptyArray(edits)) {
            if (!canSyncModel(this._modelService, resource)) {
                return Promise.resolve(edits); // File too large
            }
            const sw = StopWatch.create();
            const opts = { ignoreTrimWhitespace: false, maxComputationTimeMs: 1000, computeMoves: false };
            const result = (this._workerWithResources([resource])
                .then(worker => worker.$computeHumanReadableDiff(resource.toString(), edits, opts))
                .catch((err) => {
                onUnexpectedError(err);
                // In case of an exception, fall back to computeMoreMinimalEdits
                return this.computeMoreMinimalEdits(resource, edits, true);
            }));
            result.finally(() => this._logService.trace('FORMAT#computeHumanReadableDiff', resource.toString(true), sw.elapsed()));
            return result;
        }
        else {
            return Promise.resolve(undefined);
        }
    }
    canNavigateValueSet(resource) {
        return (canSyncModel(this._modelService, resource));
    }
    async navigateValueSet(resource, range, up) {
        const model = this._modelService.getModel(resource);
        if (!model) {
            return null;
        }
        const wordDefRegExp = this._languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).getWordDefinition();
        const wordDef = wordDefRegExp.source;
        const wordDefFlags = wordDefRegExp.flags;
        const worker = await this._workerWithResources([resource]);
        return worker.$navigateValueSet(resource.toString(), range, up, wordDef, wordDefFlags);
    }
    canComputeWordRanges(resource) {
        return canSyncModel(this._modelService, resource);
    }
    async computeWordRanges(resource, range) {
        const model = this._modelService.getModel(resource);
        if (!model) {
            return Promise.resolve(null);
        }
        const wordDefRegExp = this._languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).getWordDefinition();
        const wordDef = wordDefRegExp.source;
        const wordDefFlags = wordDefRegExp.flags;
        const worker = await this._workerWithResources([resource]);
        return worker.$computeWordRanges(resource.toString(), range, wordDef, wordDefFlags);
    }
    async findSectionHeaders(uri, options) {
        const worker = await this._workerWithResources([uri]);
        return worker.$findSectionHeaders(uri.toString(), options);
    }
    async computeDefaultDocumentColors(uri) {
        const worker = await this._workerWithResources([uri]);
        return worker.$computeDefaultDocumentColors(uri.toString());
    }
    async _workerWithResources(resources, forceLargeModels = false) {
        const worker = await this._workerManager.withWorker();
        return await worker.workerWithSyncedResources(resources, forceLargeModels);
    }
};
EditorWorkerService = __decorate([
    __param(1, IModelService),
    __param(2, ITextResourceConfigurationService),
    __param(3, ILogService),
    __param(4, ILanguageConfigurationService),
    __param(5, ILanguageFeaturesService)
], EditorWorkerService);
export { EditorWorkerService };
class WordBasedCompletionItemProvider {
    constructor(workerManager, configurationService, modelService, languageConfigurationService) {
        this.languageConfigurationService = languageConfigurationService;
        this._debugDisplayName = 'wordbasedCompletions';
        this._workerManager = workerManager;
        this._configurationService = configurationService;
        this._modelService = modelService;
    }
    async provideCompletionItems(model, position) {
        const config = this._configurationService.getValue(model.uri, position, 'editor');
        if (config.wordBasedSuggestions === 'off') {
            return undefined;
        }
        const models = [];
        if (config.wordBasedSuggestions === 'currentDocument') {
            // only current file and only if not too large
            if (canSyncModel(this._modelService, model.uri)) {
                models.push(model.uri);
            }
        }
        else {
            // either all files or files of same language
            for (const candidate of this._modelService.getModels()) {
                if (!canSyncModel(this._modelService, candidate.uri)) {
                    continue;
                }
                if (candidate === model) {
                    models.unshift(candidate.uri);
                }
                else if (config.wordBasedSuggestions === 'allDocuments' || candidate.getLanguageId() === model.getLanguageId()) {
                    models.push(candidate.uri);
                }
            }
        }
        if (models.length === 0) {
            return undefined; // File too large, no other files
        }
        const wordDefRegExp = this.languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).getWordDefinition();
        const word = model.getWordAtPosition(position);
        const replace = !word ? Range.fromPositions(position) : new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
        const insert = replace.setEndPosition(position.lineNumber, position.column);
        const client = await this._workerManager.withWorker();
        const data = await client.textualSuggest(models, word?.word, wordDefRegExp);
        if (!data) {
            return undefined;
        }
        return {
            duration: data.duration,
            suggestions: data.words.map((word) => {
                return {
                    kind: 18 /* languages.CompletionItemKind.Text */,
                    label: word,
                    insertText: word,
                    range: { insert, replace }
                };
            }),
        };
    }
}
let WorkerManager = class WorkerManager extends Disposable {
    constructor(_workerDescriptor, modelService) {
        super();
        this._workerDescriptor = _workerDescriptor;
        this._modelService = modelService;
        this._editorWorkerClient = null;
        this._lastWorkerUsedTime = (new Date()).getTime();
        const stopWorkerInterval = this._register(new WindowIntervalTimer());
        stopWorkerInterval.cancelAndSet(() => this._checkStopIdleWorker(), Math.round(STOP_WORKER_DELTA_TIME_MS / 2), mainWindow);
        this._register(this._modelService.onModelRemoved(_ => this._checkStopEmptyWorker()));
    }
    dispose() {
        if (this._editorWorkerClient) {
            this._editorWorkerClient.dispose();
            this._editorWorkerClient = null;
        }
        super.dispose();
    }
    /**
     * Check if the model service has no more models and stop the worker if that is the case.
     */
    _checkStopEmptyWorker() {
        if (!this._editorWorkerClient) {
            return;
        }
        const models = this._modelService.getModels();
        if (models.length === 0) {
            // There are no more models => nothing possible for me to do
            this._editorWorkerClient.dispose();
            this._editorWorkerClient = null;
        }
    }
    /**
     * Check if the worker has been idle for a while and then stop it.
     */
    _checkStopIdleWorker() {
        if (!this._editorWorkerClient) {
            return;
        }
        const timeSinceLastWorkerUsedTime = (new Date()).getTime() - this._lastWorkerUsedTime;
        if (timeSinceLastWorkerUsedTime > STOP_WORKER_DELTA_TIME_MS) {
            this._editorWorkerClient.dispose();
            this._editorWorkerClient = null;
        }
    }
    withWorker() {
        this._lastWorkerUsedTime = (new Date()).getTime();
        if (!this._editorWorkerClient) {
            this._editorWorkerClient = new EditorWorkerClient(this._workerDescriptor, false, this._modelService);
        }
        return Promise.resolve(this._editorWorkerClient);
    }
};
WorkerManager = __decorate([
    __param(1, IModelService)
], WorkerManager);
class SynchronousWorkerClient {
    constructor(instance) {
        this._instance = instance;
        this.proxy = this._instance;
    }
    dispose() {
        this._instance.dispose();
    }
    setChannel(channel, handler) {
        throw new Error(`Not supported`);
    }
    getChannel(channel) {
        throw new Error(`Not supported`);
    }
}
let EditorWorkerClient = class EditorWorkerClient extends Disposable {
    constructor(_workerDescriptorOrWorker, keepIdleModels, modelService) {
        super();
        this._workerDescriptorOrWorker = _workerDescriptorOrWorker;
        this._disposed = false;
        this._modelService = modelService;
        this._keepIdleModels = keepIdleModels;
        this._worker = null;
        this._modelManager = null;
    }
    // foreign host request
    fhr(method, args) {
        throw new Error(`Not implemented!`);
    }
    _getOrCreateWorker() {
        if (!this._worker) {
            try {
                this._worker = this._register(createWebWorker(this._workerDescriptorOrWorker));
                EditorWorkerHost.setChannel(this._worker, this._createEditorWorkerHost());
            }
            catch (err) {
                logOnceWebWorkerWarning(err);
                this._worker = this._createFallbackLocalWorker();
            }
        }
        return this._worker;
    }
    async _getProxy() {
        try {
            const proxy = this._getOrCreateWorker().proxy;
            await proxy.$ping();
            return proxy;
        }
        catch (err) {
            logOnceWebWorkerWarning(err);
            this._worker = this._createFallbackLocalWorker();
            return this._worker.proxy;
        }
    }
    _createFallbackLocalWorker() {
        return new SynchronousWorkerClient(new EditorWorker(null));
    }
    _createEditorWorkerHost() {
        return {
            $fhr: (method, args) => this.fhr(method, args)
        };
    }
    _getOrCreateModelManager(proxy) {
        if (!this._modelManager) {
            this._modelManager = this._register(new WorkerTextModelSyncClient(proxy, this._modelService, this._keepIdleModels));
        }
        return this._modelManager;
    }
    async workerWithSyncedResources(resources, forceLargeModels = false) {
        if (this._disposed) {
            return Promise.reject(canceled());
        }
        const proxy = await this._getProxy();
        this._getOrCreateModelManager(proxy).ensureSyncedResources(resources, forceLargeModels);
        return proxy;
    }
    async textualSuggest(resources, leadingWord, wordDefRegExp) {
        const proxy = await this.workerWithSyncedResources(resources);
        const wordDef = wordDefRegExp.source;
        const wordDefFlags = wordDefRegExp.flags;
        return proxy.$textualSuggest(resources.map(r => r.toString()), leadingWord, wordDef, wordDefFlags);
    }
    dispose() {
        super.dispose();
        this._disposed = true;
    }
};
EditorWorkerClient = __decorate([
    __param(2, IModelService)
], EditorWorkerClient);
export { EditorWorkerClient };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV29ya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9lZGl0b3JXb3JrZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFFNUUsT0FBTyxFQUFFLHVCQUF1QixFQUE2QixNQUFNLDBDQUEwQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQXdCLE1BQU0sMkNBQTJDLENBQUM7QUFFbEcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRzNELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTdFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBR3JGLE9BQU8sRUFBNkIsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENB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