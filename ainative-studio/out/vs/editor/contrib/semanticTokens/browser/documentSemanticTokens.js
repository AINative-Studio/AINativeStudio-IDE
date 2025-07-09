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
var ModelSemanticColoring_1;
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import * as errors from '../../../../base/common/errors.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IModelService } from '../../../common/services/model.js';
import { toMultilineTokens2 } from '../../../common/services/semanticTokensProviderStyling.js';
import { ISemanticTokensStylingService } from '../../../common/services/semanticTokensStyling.js';
import { getDocumentSemanticTokens, hasDocumentSemanticTokensProvider, isSemanticTokens, isSemanticTokensEdits } from '../common/getSemanticTokens.js';
import { SEMANTIC_HIGHLIGHTING_SETTING_ID, isSemanticColoringEnabled } from '../common/semanticTokensConfig.js';
let DocumentSemanticTokensFeature = class DocumentSemanticTokensFeature extends Disposable {
    constructor(semanticTokensStylingService, modelService, themeService, configurationService, languageFeatureDebounceService, languageFeaturesService) {
        super();
        this._watchers = new ResourceMap();
        const register = (model) => {
            this._watchers.get(model.uri)?.dispose();
            this._watchers.set(model.uri, new ModelSemanticColoring(model, semanticTokensStylingService, themeService, languageFeatureDebounceService, languageFeaturesService));
        };
        const deregister = (model, modelSemanticColoring) => {
            modelSemanticColoring.dispose();
            this._watchers.delete(model.uri);
        };
        const handleSettingOrThemeChange = () => {
            for (const model of modelService.getModels()) {
                const curr = this._watchers.get(model.uri);
                if (isSemanticColoringEnabled(model, themeService, configurationService)) {
                    if (!curr) {
                        register(model);
                    }
                }
                else {
                    if (curr) {
                        deregister(model, curr);
                    }
                }
            }
        };
        modelService.getModels().forEach(model => {
            if (isSemanticColoringEnabled(model, themeService, configurationService)) {
                register(model);
            }
        });
        this._register(modelService.onModelAdded((model) => {
            if (isSemanticColoringEnabled(model, themeService, configurationService)) {
                register(model);
            }
        }));
        this._register(modelService.onModelRemoved((model) => {
            const curr = this._watchers.get(model.uri);
            if (curr) {
                deregister(model, curr);
            }
        }));
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(SEMANTIC_HIGHLIGHTING_SETTING_ID)) {
                handleSettingOrThemeChange();
            }
        }));
        this._register(themeService.onDidColorThemeChange(handleSettingOrThemeChange));
    }
    dispose() {
        dispose(this._watchers.values());
        this._watchers.clear();
        super.dispose();
    }
};
DocumentSemanticTokensFeature = __decorate([
    __param(0, ISemanticTokensStylingService),
    __param(1, IModelService),
    __param(2, IThemeService),
    __param(3, IConfigurationService),
    __param(4, ILanguageFeatureDebounceService),
    __param(5, ILanguageFeaturesService)
], DocumentSemanticTokensFeature);
export { DocumentSemanticTokensFeature };
let ModelSemanticColoring = class ModelSemanticColoring extends Disposable {
    static { ModelSemanticColoring_1 = this; }
    static { this.REQUEST_MIN_DELAY = 300; }
    static { this.REQUEST_MAX_DELAY = 2000; }
    constructor(model, _semanticTokensStylingService, themeService, languageFeatureDebounceService, languageFeaturesService) {
        super();
        this._semanticTokensStylingService = _semanticTokensStylingService;
        this._isDisposed = false;
        this._model = model;
        this._provider = languageFeaturesService.documentSemanticTokensProvider;
        this._debounceInformation = languageFeatureDebounceService.for(this._provider, 'DocumentSemanticTokens', { min: ModelSemanticColoring_1.REQUEST_MIN_DELAY, max: ModelSemanticColoring_1.REQUEST_MAX_DELAY });
        this._fetchDocumentSemanticTokens = this._register(new RunOnceScheduler(() => this._fetchDocumentSemanticTokensNow(), ModelSemanticColoring_1.REQUEST_MIN_DELAY));
        this._currentDocumentResponse = null;
        this._currentDocumentRequestCancellationTokenSource = null;
        this._documentProvidersChangeListeners = [];
        this._providersChangedDuringRequest = false;
        this._register(this._model.onDidChangeContent(() => {
            if (!this._fetchDocumentSemanticTokens.isScheduled()) {
                this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
            }
        }));
        this._register(this._model.onDidChangeAttached(() => {
            if (!this._fetchDocumentSemanticTokens.isScheduled()) {
                this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
            }
        }));
        this._register(this._model.onDidChangeLanguage(() => {
            // clear any outstanding state
            if (this._currentDocumentResponse) {
                this._currentDocumentResponse.dispose();
                this._currentDocumentResponse = null;
            }
            if (this._currentDocumentRequestCancellationTokenSource) {
                this._currentDocumentRequestCancellationTokenSource.cancel();
                this._currentDocumentRequestCancellationTokenSource = null;
            }
            this._setDocumentSemanticTokens(null, null, null, []);
            this._fetchDocumentSemanticTokens.schedule(0);
        }));
        const bindDocumentChangeListeners = () => {
            dispose(this._documentProvidersChangeListeners);
            this._documentProvidersChangeListeners = [];
            for (const provider of this._provider.all(model)) {
                if (typeof provider.onDidChange === 'function') {
                    this._documentProvidersChangeListeners.push(provider.onDidChange(() => {
                        if (this._currentDocumentRequestCancellationTokenSource) {
                            // there is already a request running,
                            this._providersChangedDuringRequest = true;
                            return;
                        }
                        this._fetchDocumentSemanticTokens.schedule(0);
                    }));
                }
            }
        };
        bindDocumentChangeListeners();
        this._register(this._provider.onDidChange(() => {
            bindDocumentChangeListeners();
            this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
        }));
        this._register(themeService.onDidColorThemeChange(_ => {
            // clear out existing tokens
            this._setDocumentSemanticTokens(null, null, null, []);
            this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
        }));
        this._fetchDocumentSemanticTokens.schedule(0);
    }
    dispose() {
        if (this._currentDocumentResponse) {
            this._currentDocumentResponse.dispose();
            this._currentDocumentResponse = null;
        }
        if (this._currentDocumentRequestCancellationTokenSource) {
            this._currentDocumentRequestCancellationTokenSource.cancel();
            this._currentDocumentRequestCancellationTokenSource = null;
        }
        dispose(this._documentProvidersChangeListeners);
        this._documentProvidersChangeListeners = [];
        this._setDocumentSemanticTokens(null, null, null, []);
        this._isDisposed = true;
        super.dispose();
    }
    _fetchDocumentSemanticTokensNow() {
        if (this._currentDocumentRequestCancellationTokenSource) {
            // there is already a request running, let it finish...
            return;
        }
        if (!hasDocumentSemanticTokensProvider(this._provider, this._model)) {
            // there is no provider
            if (this._currentDocumentResponse) {
                // there are semantic tokens set
                this._model.tokenization.setSemanticTokens(null, false);
            }
            return;
        }
        if (!this._model.isAttachedToEditor()) {
            // this document is not visible, there is no need to fetch semantic tokens for it
            return;
        }
        const cancellationTokenSource = new CancellationTokenSource();
        const lastProvider = this._currentDocumentResponse ? this._currentDocumentResponse.provider : null;
        const lastResultId = this._currentDocumentResponse ? this._currentDocumentResponse.resultId || null : null;
        const request = getDocumentSemanticTokens(this._provider, this._model, lastProvider, lastResultId, cancellationTokenSource.token);
        this._currentDocumentRequestCancellationTokenSource = cancellationTokenSource;
        this._providersChangedDuringRequest = false;
        const pendingChanges = [];
        const contentChangeListener = this._model.onDidChangeContent((e) => {
            pendingChanges.push(e);
        });
        const sw = new StopWatch(false);
        request.then((res) => {
            this._debounceInformation.update(this._model, sw.elapsed());
            this._currentDocumentRequestCancellationTokenSource = null;
            contentChangeListener.dispose();
            if (!res) {
                this._setDocumentSemanticTokens(null, null, null, pendingChanges);
            }
            else {
                const { provider, tokens } = res;
                const styling = this._semanticTokensStylingService.getStyling(provider);
                this._setDocumentSemanticTokens(provider, tokens || null, styling, pendingChanges);
            }
        }, (err) => {
            const isExpectedError = err && (errors.isCancellationError(err) || (typeof err.message === 'string' && err.message.indexOf('busy') !== -1));
            if (!isExpectedError) {
                errors.onUnexpectedError(err);
            }
            // Semantic tokens eats up all errors and considers errors to mean that the result is temporarily not available
            // The API does not have a special error kind to express this...
            this._currentDocumentRequestCancellationTokenSource = null;
            contentChangeListener.dispose();
            if (pendingChanges.length > 0 || this._providersChangedDuringRequest) {
                // More changes occurred while the request was running
                if (!this._fetchDocumentSemanticTokens.isScheduled()) {
                    this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
                }
            }
        });
    }
    static _copy(src, srcOffset, dest, destOffset, length) {
        // protect against overflows
        length = Math.min(length, dest.length - destOffset, src.length - srcOffset);
        for (let i = 0; i < length; i++) {
            dest[destOffset + i] = src[srcOffset + i];
        }
    }
    _setDocumentSemanticTokens(provider, tokens, styling, pendingChanges) {
        const currentResponse = this._currentDocumentResponse;
        const rescheduleIfNeeded = () => {
            if ((pendingChanges.length > 0 || this._providersChangedDuringRequest) && !this._fetchDocumentSemanticTokens.isScheduled()) {
                this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
            }
        };
        if (this._currentDocumentResponse) {
            this._currentDocumentResponse.dispose();
            this._currentDocumentResponse = null;
        }
        if (this._isDisposed) {
            // disposed!
            if (provider && tokens) {
                provider.releaseDocumentSemanticTokens(tokens.resultId);
            }
            return;
        }
        if (!provider || !styling) {
            this._model.tokenization.setSemanticTokens(null, false);
            return;
        }
        if (!tokens) {
            this._model.tokenization.setSemanticTokens(null, true);
            rescheduleIfNeeded();
            return;
        }
        if (isSemanticTokensEdits(tokens)) {
            if (!currentResponse) {
                // not possible!
                this._model.tokenization.setSemanticTokens(null, true);
                return;
            }
            if (tokens.edits.length === 0) {
                // nothing to do!
                tokens = {
                    resultId: tokens.resultId,
                    data: currentResponse.data
                };
            }
            else {
                let deltaLength = 0;
                for (const edit of tokens.edits) {
                    deltaLength += (edit.data ? edit.data.length : 0) - edit.deleteCount;
                }
                const srcData = currentResponse.data;
                const destData = new Uint32Array(srcData.length + deltaLength);
                let srcLastStart = srcData.length;
                let destLastStart = destData.length;
                for (let i = tokens.edits.length - 1; i >= 0; i--) {
                    const edit = tokens.edits[i];
                    if (edit.start > srcData.length) {
                        styling.warnInvalidEditStart(currentResponse.resultId, tokens.resultId, i, edit.start, srcData.length);
                        // The edits are invalid and there's no way to recover
                        this._model.tokenization.setSemanticTokens(null, true);
                        return;
                    }
                    const copyCount = srcLastStart - (edit.start + edit.deleteCount);
                    if (copyCount > 0) {
                        ModelSemanticColoring_1._copy(srcData, srcLastStart - copyCount, destData, destLastStart - copyCount, copyCount);
                        destLastStart -= copyCount;
                    }
                    if (edit.data) {
                        ModelSemanticColoring_1._copy(edit.data, 0, destData, destLastStart - edit.data.length, edit.data.length);
                        destLastStart -= edit.data.length;
                    }
                    srcLastStart = edit.start;
                }
                if (srcLastStart > 0) {
                    ModelSemanticColoring_1._copy(srcData, 0, destData, 0, srcLastStart);
                }
                tokens = {
                    resultId: tokens.resultId,
                    data: destData
                };
            }
        }
        if (isSemanticTokens(tokens)) {
            this._currentDocumentResponse = new SemanticTokensResponse(provider, tokens.resultId, tokens.data);
            const result = toMultilineTokens2(tokens, styling, this._model.getLanguageId());
            // Adjust incoming semantic tokens
            if (pendingChanges.length > 0) {
                // More changes occurred while the request was running
                // We need to:
                // 1. Adjust incoming semantic tokens
                // 2. Request them again
                for (const change of pendingChanges) {
                    for (const area of result) {
                        for (const singleChange of change.changes) {
                            area.applyEdit(singleChange.range, singleChange.text);
                        }
                    }
                }
            }
            this._model.tokenization.setSemanticTokens(result, true);
        }
        else {
            this._model.tokenization.setSemanticTokens(null, true);
        }
        rescheduleIfNeeded();
    }
};
ModelSemanticColoring = ModelSemanticColoring_1 = __decorate([
    __param(1, ISemanticTokensStylingService),
    __param(2, IThemeService),
    __param(3, ILanguageFeatureDebounceService),
    __param(4, ILanguageFeaturesService)
], ModelSemanticColoring);
class SemanticTokensResponse {
    constructor(provider, resultId, data) {
        this.provider = provider;
        this.resultId = resultId;
        this.data = data;
    }
    dispose() {
        this.provider.releaseDocumentSemanticTokens(this.resultId);
    }
}
registerEditorFeature(DocumentSemanticTokensFeature);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTZW1hbnRpY1Rva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zZW1hbnRpY1Rva2Vucy9icm93c2VyL2RvY3VtZW50U2VtYW50aWNUb2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUkxRSxPQUFPLEVBQStCLCtCQUErQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbkksT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xFLE9BQU8sRUFBaUMsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5SCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRyxPQUFPLEVBQUUseUJB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