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
var LanguageDetectionService_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguageDetectionService, LanguageDetectionStatsId } from '../common/languageDetectionWorkerService.js';
import { FileAccess, nodeModulesAsarPath, nodeModulesPath, Schemas } from '../../../../base/common/network.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { URI } from '../../../../base/common/uri.js';
import { isWeb } from '../../../../base/common/platform.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IDiagnosticsService } from '../../../../platform/diagnostics/common/diagnostics.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { LRUCache } from '../../../../base/common/map.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { canASAR } from '../../../../amdX.js';
import { createWebWorker } from '../../../../base/browser/webWorkerFactory.js';
import { WorkerTextModelSyncClient } from '../../../../editor/common/services/textModelSync/textModelSync.impl.js';
import { LanguageDetectionWorkerHost } from './languageDetectionWorker.protocol.js';
const TOP_LANG_COUNTS = 12;
const regexpModuleLocation = `${nodeModulesPath}/vscode-regexp-languagedetection`;
const regexpModuleLocationAsar = `${nodeModulesAsarPath}/vscode-regexp-languagedetection`;
const moduleLocation = `${nodeModulesPath}/@vscode/vscode-languagedetection`;
const moduleLocationAsar = `${nodeModulesAsarPath}/@vscode/vscode-languagedetection`;
let LanguageDetectionService = class LanguageDetectionService extends Disposable {
    static { LanguageDetectionService_1 = this; }
    static { this.enablementSettingKey = 'workbench.editor.languageDetection'; }
    static { this.historyBasedEnablementConfig = 'workbench.editor.historyBasedLanguageDetection'; }
    static { this.preferHistoryConfig = 'workbench.editor.preferHistoryBasedLanguageDetection'; }
    static { this.workspaceOpenedLanguagesStorageKey = 'workbench.editor.languageDetectionOpenedLanguages.workspace'; }
    static { this.globalOpenedLanguagesStorageKey = 'workbench.editor.languageDetectionOpenedLanguages.global'; }
    constructor(_environmentService, languageService, _configurationService, _diagnosticsService, _workspaceContextService, modelService, _editorService, telemetryService, storageService, _logService) {
        super();
        this._environmentService = _environmentService;
        this._configurationService = _configurationService;
        this._diagnosticsService = _diagnosticsService;
        this._workspaceContextService = _workspaceContextService;
        this._editorService = _editorService;
        this._logService = _logService;
        this.hasResolvedWorkspaceLanguageIds = false;
        this.workspaceLanguageIds = new Set();
        this.sessionOpenedLanguageIds = new Set();
        this.historicalGlobalOpenedLanguageIds = new LRUCache(TOP_LANG_COUNTS);
        this.historicalWorkspaceOpenedLanguageIds = new LRUCache(TOP_LANG_COUNTS);
        this.dirtyBiases = true;
        this.langBiases = {};
        const useAsar = canASAR && this._environmentService.isBuilt && !isWeb;
        this._languageDetectionWorkerClient = this._register(new LanguageDetectionWorkerClient(modelService, languageService, telemetryService, 
        // TODO See if it's possible to bundle vscode-languagedetection
        useAsar
            ? FileAccess.asBrowserUri(`${moduleLocationAsar}/dist/lib/index.js`).toString(true)
            : FileAccess.asBrowserUri(`${moduleLocation}/dist/lib/index.js`).toString(true), useAsar
            ? FileAccess.asBrowserUri(`${moduleLocationAsar}/model/model.json`).toString(true)
            : FileAccess.asBrowserUri(`${moduleLocation}/model/model.json`).toString(true), useAsar
            ? FileAccess.asBrowserUri(`${moduleLocationAsar}/model/group1-shard1of1.bin`).toString(true)
            : FileAccess.asBrowserUri(`${moduleLocation}/model/group1-shard1of1.bin`).toString(true), useAsar
            ? FileAccess.asBrowserUri(`${regexpModuleLocationAsar}/dist/index.js`).toString(true)
            : FileAccess.asBrowserUri(`${regexpModuleLocation}/dist/index.js`).toString(true)));
        this.initEditorOpenedListeners(storageService);
    }
    async resolveWorkspaceLanguageIds() {
        if (this.hasResolvedWorkspaceLanguageIds) {
            return;
        }
        this.hasResolvedWorkspaceLanguageIds = true;
        const fileExtensions = await this._diagnosticsService.getWorkspaceFileExtensions(this._workspaceContextService.getWorkspace());
        let count = 0;
        for (const ext of fileExtensions.extensions) {
            const langId = this._languageDetectionWorkerClient.getLanguageId(ext);
            if (langId && count < TOP_LANG_COUNTS) {
                this.workspaceLanguageIds.add(langId);
                count++;
                if (count > TOP_LANG_COUNTS) {
                    break;
                }
            }
        }
        this.dirtyBiases = true;
    }
    isEnabledForLanguage(languageId) {
        return !!languageId && this._configurationService.getValue(LanguageDetectionService_1.enablementSettingKey, { overrideIdentifier: languageId });
    }
    getLanguageBiases() {
        if (!this.dirtyBiases) {
            return this.langBiases;
        }
        const biases = {};
        // Give different weight to the biases depending on relevance of source
        this.sessionOpenedLanguageIds.forEach(lang => biases[lang] = (biases[lang] ?? 0) + 7);
        this.workspaceLanguageIds.forEach(lang => biases[lang] = (biases[lang] ?? 0) + 5);
        [...this.historicalWorkspaceOpenedLanguageIds.keys()].forEach(lang => biases[lang] = (biases[lang] ?? 0) + 3);
        [...this.historicalGlobalOpenedLanguageIds.keys()].forEach(lang => biases[lang] = (biases[lang] ?? 0) + 1);
        this._logService.trace('Session Languages:', JSON.stringify([...this.sessionOpenedLanguageIds]));
        this._logService.trace('Workspace Languages:', JSON.stringify([...this.workspaceLanguageIds]));
        this._logService.trace('Historical Workspace Opened Languages:', JSON.stringify([...this.historicalWorkspaceOpenedLanguageIds.keys()]));
        this._logService.trace('Historical Globally Opened Languages:', JSON.stringify([...this.historicalGlobalOpenedLanguageIds.keys()]));
        this._logService.trace('Computed Language Detection Biases:', JSON.stringify(biases));
        this.dirtyBiases = false;
        this.langBiases = biases;
        return biases;
    }
    async detectLanguage(resource, supportedLangs) {
        const useHistory = this._configurationService.getValue(LanguageDetectionService_1.historyBasedEnablementConfig);
        const preferHistory = this._configurationService.getValue(LanguageDetectionService_1.preferHistoryConfig);
        if (useHistory) {
            await this.resolveWorkspaceLanguageIds();
        }
        const biases = useHistory ? this.getLanguageBiases() : undefined;
        return this._languageDetectionWorkerClient.detectLanguage(resource, biases, preferHistory, supportedLangs);
    }
    // TODO: explore using the history service or something similar to provide this list of opened editors
    // so this service can support delayed instantiation. This may be tricky since it seems the IHistoryService
    // only gives history for a workspace... where this takes advantage of history at a global level as well.
    initEditorOpenedListeners(storageService) {
        try {
            const globalLangHistoryData = JSON.parse(storageService.get(LanguageDetectionService_1.globalOpenedLanguagesStorageKey, 0 /* StorageScope.PROFILE */, '[]'));
            this.historicalGlobalOpenedLanguageIds.fromJSON(globalLangHistoryData);
        }
        catch (e) {
            console.error(e);
        }
        try {
            const workspaceLangHistoryData = JSON.parse(storageService.get(LanguageDetectionService_1.workspaceOpenedLanguagesStorageKey, 1 /* StorageScope.WORKSPACE */, '[]'));
            this.historicalWorkspaceOpenedLanguageIds.fromJSON(workspaceLangHistoryData);
        }
        catch (e) {
            console.error(e);
        }
        this._register(this._editorService.onDidActiveEditorChange(() => {
            const activeLanguage = this._editorService.activeTextEditorLanguageId;
            if (activeLanguage && this._editorService.activeEditor?.resource?.scheme !== Schemas.untitled) {
                this.sessionOpenedLanguageIds.add(activeLanguage);
                this.historicalGlobalOpenedLanguageIds.set(activeLanguage, true);
                this.historicalWorkspaceOpenedLanguageIds.set(activeLanguage, true);
                storageService.store(LanguageDetectionService_1.globalOpenedLanguagesStorageKey, JSON.stringify(this.historicalGlobalOpenedLanguageIds.toJSON()), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                storageService.store(LanguageDetectionService_1.workspaceOpenedLanguagesStorageKey, JSON.stringify(this.historicalWorkspaceOpenedLanguageIds.toJSON()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                this.dirtyBiases = true;
            }
        }));
    }
};
LanguageDetectionService = LanguageDetectionService_1 = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, ILanguageService),
    __param(2, IConfigurationService),
    __param(3, IDiagnosticsService),
    __param(4, IWorkspaceContextService),
    __param(5, IModelService),
    __param(6, IEditorService),
    __param(7, ITelemetryService),
    __param(8, IStorageService),
    __param(9, ILogService)
], LanguageDetectionService);
export { LanguageDetectionService };
export class LanguageDetectionWorkerClient extends Disposable {
    constructor(_modelService, _languageService, _telemetryService, _indexJsUri, _modelJsonUri, _weightsUri, _regexpModelUri) {
        super();
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._telemetryService = _telemetryService;
        this._indexJsUri = _indexJsUri;
        this._modelJsonUri = _modelJsonUri;
        this._weightsUri = _weightsUri;
        this._regexpModelUri = _regexpModelUri;
    }
    _getOrCreateLanguageDetectionWorker() {
        if (!this.worker) {
            const workerClient = this._register(createWebWorker(FileAccess.asBrowserUri('vs/workbench/services/languageDetection/browser/languageDetectionWebWorkerMain.js'), 'LanguageDetectionWorker'));
            LanguageDetectionWorkerHost.setChannel(workerClient, {
                $getIndexJsUri: async () => this.getIndexJsUri(),
                $getLanguageId: async (languageIdOrExt) => this.getLanguageId(languageIdOrExt),
                $sendTelemetryEvent: async (languages, confidences, timeSpent) => this.sendTelemetryEvent(languages, confidences, timeSpent),
                $getRegexpModelUri: async () => this.getRegexpModelUri(),
                $getModelJsonUri: async () => this.getModelJsonUri(),
                $getWeightsUri: async () => this.getWeightsUri(),
            });
            const workerTextModelSyncClient = WorkerTextModelSyncClient.create(workerClient, this._modelService);
            this.worker = { workerClient, workerTextModelSyncClient };
        }
        return this.worker;
    }
    _guessLanguageIdByUri(uri) {
        const guess = this._languageService.guessLanguageIdByFilepathOrFirstLine(uri);
        if (guess && guess !== 'unknown') {
            return guess;
        }
        return undefined;
    }
    async getIndexJsUri() {
        return this._indexJsUri;
    }
    getLanguageId(languageIdOrExt) {
        if (!languageIdOrExt) {
            return undefined;
        }
        if (this._languageService.isRegisteredLanguageId(languageIdOrExt)) {
            return languageIdOrExt;
        }
        const guessed = this._guessLanguageIdByUri(URI.file(`file.${languageIdOrExt}`));
        if (!guessed || guessed === 'unknown') {
            return undefined;
        }
        return guessed;
    }
    async getModelJsonUri() {
        return this._modelJsonUri;
    }
    async getWeightsUri() {
        return this._weightsUri;
    }
    async getRegexpModelUri() {
        return this._regexpModelUri;
    }
    async sendTelemetryEvent(languages, confidences, timeSpent) {
        this._telemetryService.publicLog2(LanguageDetectionStatsId, {
            languages: languages.join(','),
            confidences: confidences.join(','),
            timeSpent
        });
    }
    async detectLanguage(resource, langBiases, preferHistory, supportedLangs) {
        const startTime = Date.now();
        const quickGuess = this._guessLanguageIdByUri(resource);
        if (quickGuess) {
            return quickGuess;
        }
        const { workerClient, workerTextModelSyncClient } = this._getOrCreateLanguageDetectionWorker();
        await workerTextModelSyncClient.ensureSyncedResources([resource]);
        const modelId = await workerClient.proxy.$detectLanguage(resource.toString(), langBiases, preferHistory, supportedLangs);
        const languageId = this.getLanguageId(modelId);
        const LanguageDetectionStatsId = 'automaticlanguagedetection.perf';
        this._telemetryService.publicLog2(LanguageDetectionStatsId, {
            timeSpent: Date.now() - startTime,
            detection: languageId || 'unknown',
        });
        return languageId;
    }
}
// For now we use Eager until we handle keeping track of history better.
registerSingleton(ILanguageDetectionService, LanguageDetectionService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb25Xb3JrZXJTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGFuZ3VhZ2VEZXRlY3Rpb24vYnJvd3Nlci9sYW5ndWFnZURldGVjdGlvbldvcmtlclNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHlCQUF5QixFQUFpRSx3QkFBd0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2pMLE9BQU8sRUFBbUIsVUFBVSxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoSSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RB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