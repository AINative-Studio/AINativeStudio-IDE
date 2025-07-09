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
var ThreadedBackgroundTokenizerFactory_1;
import { canASAR } from '../../../../../amdX.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { FileAccess, nodeModulesAsarPath, nodeModulesPath } from '../../../../../base/common/network.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IExtensionResourceLoaderService } from '../../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { TextMateWorkerHost } from './worker/textMateWorkerHost.js';
import { TextMateWorkerTokenizerController } from './textMateWorkerTokenizerController.js';
import { createWebWorker } from '../../../../../base/browser/webWorkerFactory.js';
let ThreadedBackgroundTokenizerFactory = class ThreadedBackgroundTokenizerFactory {
    static { ThreadedBackgroundTokenizerFactory_1 = this; }
    static { this._reportedMismatchingTokens = false; }
    constructor(_reportTokenizationTime, _shouldTokenizeAsync, _extensionResourceLoaderService, _configurationService, _languageService, _environmentService, _notificationService, _telemetryService) {
        this._reportTokenizationTime = _reportTokenizationTime;
        this._shouldTokenizeAsync = _shouldTokenizeAsync;
        this._extensionResourceLoaderService = _extensionResourceLoaderService;
        this._configurationService = _configurationService;
        this._languageService = _languageService;
        this._environmentService = _environmentService;
        this._notificationService = _notificationService;
        this._telemetryService = _telemetryService;
        this._workerProxyPromise = null;
        this._worker = null;
        this._workerProxy = null;
        this._workerTokenizerControllers = new Map();
        this._currentTheme = null;
        this._currentTokenColorMap = null;
        this._grammarDefinitions = [];
    }
    dispose() {
        this._disposeWorker();
    }
    // Will be recreated after worker is disposed (because tokenizer is re-registered when languages change)
    createBackgroundTokenizer(textModel, tokenStore, maxTokenizationLineLength) {
        // fallback to default sync background tokenizer
        if (!this._shouldTokenizeAsync() || textModel.isTooLargeForSyncing()) {
            return undefined;
        }
        const store = new DisposableStore();
        const controllerContainer = this._getWorkerProxy().then((workerProxy) => {
            if (store.isDisposed || !workerProxy) {
                return undefined;
            }
            const controllerContainer = { controller: undefined, worker: this._worker };
            store.add(keepAliveWhenAttached(textModel, () => {
                const controller = new TextMateWorkerTokenizerController(textModel, workerProxy, this._languageService.languageIdCodec, tokenStore, this._configurationService, maxTokenizationLineLength);
                controllerContainer.controller = controller;
                this._workerTokenizerControllers.set(controller.controllerId, controller);
                return toDisposable(() => {
                    controllerContainer.controller = undefined;
                    this._workerTokenizerControllers.delete(controller.controllerId);
                    controller.dispose();
                });
            }));
            return controllerContainer;
        });
        return {
            dispose() {
                store.dispose();
            },
            requestTokens: async (startLineNumber, endLineNumberExclusive) => {
                const container = await controllerContainer;
                // If there is no controller, the model has been detached in the meantime.
                // Only request the proxy object if the worker is the same!
                if (container?.controller && container.worker === this._worker) {
                    container.controller.requestTokens(startLineNumber, endLineNumberExclusive);
                }
            },
            reportMismatchingTokens: (lineNumber) => {
                if (ThreadedBackgroundTokenizerFactory_1._reportedMismatchingTokens) {
                    return;
                }
                ThreadedBackgroundTokenizerFactory_1._reportedMismatchingTokens = true;
                this._notificationService.error({
                    message: 'Async Tokenization Token Mismatch in line ' + lineNumber,
                    name: 'Async Tokenization Token Mismatch',
                });
                this._telemetryService.publicLog2('asyncTokenizationMismatchingTokens', {});
            },
        };
    }
    setGrammarDefinitions(grammarDefinitions) {
        this._grammarDefinitions = grammarDefinitions;
        this._disposeWorker();
    }
    acceptTheme(theme, colorMap) {
        this._currentTheme = theme;
        this._currentTokenColorMap = colorMap;
        if (this._currentTheme && this._currentTokenColorMap && this._workerProxy) {
            this._workerProxy.$acceptTheme(this._currentTheme, this._currentTokenColorMap);
        }
    }
    _getWorkerProxy() {
        if (!this._workerProxyPromise) {
            this._workerProxyPromise = this._createWorkerProxy();
        }
        return this._workerProxyPromise;
    }
    async _createWorkerProxy() {
        const onigurumaModuleLocation = `${nodeModulesPath}/vscode-oniguruma`;
        const onigurumaModuleLocationAsar = `${nodeModulesAsarPath}/vscode-oniguruma`;
        const useAsar = canASAR && this._environmentService.isBuilt && !isWeb;
        const onigurumaLocation = useAsar ? onigurumaModuleLocationAsar : onigurumaModuleLocation;
        const onigurumaWASM = `${onigurumaLocation}/release/onig.wasm`;
        const createData = {
            grammarDefinitions: this._grammarDefinitions,
            onigurumaWASMUri: FileAccess.asBrowserUri(onigurumaWASM).toString(true),
        };
        const worker = this._worker = createWebWorker(FileAccess.asBrowserUri('vs/workbench/services/textMate/browser/backgroundTokenization/worker/textMateTokenizationWorker.workerMain.js'), 'TextMateWorker');
        TextMateWorkerHost.setChannel(worker, {
            $readFile: async (_resource) => {
                const resource = URI.revive(_resource);
                return this._extensionResourceLoaderService.readExtensionResource(resource);
            },
            $setTokensAndStates: async (controllerId, versionId, tokens, lineEndStateDeltas) => {
                const controller = this._workerTokenizerControllers.get(controllerId);
                // When a model detaches, it is removed synchronously from the map.
                // However, the worker might still be sending tokens for that model,
                // so we ignore the event when there is no controller.
                if (controller) {
                    controller.setTokensAndStates(controllerId, versionId, tokens, lineEndStateDeltas);
                }
            },
            $reportTokenizationTime: (timeMs, languageId, sourceExtensionId, lineLength, isRandomSample) => {
                this._reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, isRandomSample);
            }
        });
        await worker.proxy.$init(createData);
        if (this._worker !== worker) {
            // disposed in the meantime
            return null;
        }
        this._workerProxy = worker.proxy;
        if (this._currentTheme && this._currentTokenColorMap) {
            this._workerProxy.$acceptTheme(this._currentTheme, this._currentTokenColorMap);
        }
        return worker.proxy;
    }
    _disposeWorker() {
        for (const controller of this._workerTokenizerControllers.values()) {
            controller.dispose();
        }
        this._workerTokenizerControllers.clear();
        if (this._worker) {
            this._worker.dispose();
            this._worker = null;
        }
        this._workerProxy = null;
        this._workerProxyPromise = null;
    }
};
ThreadedBackgroundTokenizerFactory = ThreadedBackgroundTokenizerFactory_1 = __decorate([
    __param(2, IExtensionResourceLoaderService),
    __param(3, IConfigurationService),
    __param(4, ILanguageService),
    __param(5, IEnvironmentService),
    __param(6, INotificationService),
    __param(7, ITelemetryService)
], ThreadedBackgroundTokenizerFactory);
export { ThreadedBackgroundTokenizerFactory };
function keepAliveWhenAttached(textModel, factory) {
    const disposableStore = new DisposableStore();
    const subStore = disposableStore.add(new DisposableStore());
    function checkAttached() {
        if (textModel.isAttachedToEditor()) {
            subStore.add(factory());
        }
        else {
            subStore.clear();
        }
    }
    checkAttached();
    disposableStore.add(textModel.onDidChangeAttached(() => {
        checkAttached();
    }));
    return disposableStore;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkZWRCYWNrZ3JvdW5kVG9rZW5pemVyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci9iYWNrZ3JvdW5kVG9rZW5pemF0aW9uL3RocmVhZGVkQmFja2dyb3VuZFRva2VuaXplckZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBbUIsVUFBVSxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTFILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLG1GQUFtRixDQUFDO0FBQ3BJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHdD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