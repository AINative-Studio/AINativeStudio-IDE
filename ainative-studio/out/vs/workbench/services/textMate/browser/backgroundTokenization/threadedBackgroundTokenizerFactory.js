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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkZWRCYWNrZ3JvdW5kVG9rZW5pemVyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9icm93c2VyL2JhY2tncm91bmRUb2tlbml6YXRpb24vdGhyZWFkZWRCYWNrZ3JvdW5kVG9rZW5pemVyRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFtQixVQUFVLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFMUgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUM7QUFFdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDaEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sbUZBQW1GLENBQUM7QUFDcEksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRzNFLElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQWtDOzthQUMvQiwrQkFBMEIsR0FBRyxLQUFLLEFBQVIsQ0FBUztJQVdsRCxZQUNrQix1QkFBeUosRUFDekosb0JBQW1DLEVBQ25CLCtCQUFpRixFQUMzRixxQkFBNkQsRUFDbEUsZ0JBQW1ELEVBQ2hELG1CQUF5RCxFQUN4RCxvQkFBMkQsRUFDOUQsaUJBQXFEO1FBUHZELDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBa0k7UUFDekoseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFlO1FBQ0Ysb0NBQStCLEdBQS9CLCtCQUErQixDQUFpQztRQUMxRSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ2pELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDL0Isd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUN2Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQzdDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFqQmpFLHdCQUFtQixHQUErRCxJQUFJLENBQUM7UUFDdkYsWUFBTyxHQUF3RCxJQUFJLENBQUM7UUFDcEUsaUJBQVksR0FBK0MsSUFBSSxDQUFDO1FBQ3ZELGdDQUEyQixHQUFHLElBQUksR0FBRyxFQUF3RSxDQUFDO1FBRXZILGtCQUFhLEdBQXFCLElBQUksQ0FBQztRQUN2QywwQkFBcUIsR0FBb0IsSUFBSSxDQUFDO1FBQzlDLHdCQUFtQixHQUE4QixFQUFFLENBQUM7SUFZNUQsQ0FBQztJQUVNLE9BQU87UUFDYixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELHdHQUF3RztJQUNqRyx5QkFBeUIsQ0FBQyxTQUFxQixFQUFFLFVBQXdDLEVBQUUseUJBQThDO1FBQy9JLGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksU0FBUyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQztZQUFDLE9BQU8sU0FBUyxDQUFDO1FBQUMsQ0FBQztRQUUzRixNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ3ZFLElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUFDLE9BQU8sU0FBUyxDQUFDO1lBQUMsQ0FBQztZQUUzRCxNQUFNLG1CQUFtQixHQUFHLEVBQUUsVUFBVSxFQUFFLFNBQTBELEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM3SCxLQUFLLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7Z0JBQy9DLE1BQU0sVUFBVSxHQUFHLElBQUksaUNBQWlDLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztnQkFDM0wsbUJBQW1CLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRSxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7b0JBQ3hCLG1CQUFtQixDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7b0JBQzNDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUNqRSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLE9BQU8sbUJBQW1CLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ04sT0FBTztnQkFDTixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakIsQ0FBQztZQUNELGFBQWEsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixFQUFFLEVBQUU7Z0JBQ2hFLE1BQU0sU0FBUyxHQUFHLE1BQU0sbUJBQW1CLENBQUM7Z0JBRTVDLDBFQUEwRTtnQkFDMUUsMkRBQTJEO2dCQUMzRCxJQUFJLFNBQVMsRUFBRSxVQUFVLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2hFLFNBQVMsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO2dCQUM3RSxDQUFDO1lBQ0YsQ0FBQztZQUNELHVCQUF1QixFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUU7Z0JBQ3ZDLElBQUksb0NBQWtDLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztvQkFDbkUsT0FBTztnQkFDUixDQUFDO2dCQUNELG9DQUFrQyxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQztnQkFFckUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQztvQkFDL0IsT0FBTyxFQUFFLDRDQUE0QyxHQUFHLFVBQVU7b0JBQ2xFLElBQUksRUFBRSxtQ0FBbUM7aUJBQ3pDLENBQUMsQ0FBQztnQkFFSCxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFvRixvQ0FBb0MsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoSyxDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxxQkFBcUIsQ0FBQyxrQkFBNkM7UUFDekUsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDO1FBQzlDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU0sV0FBVyxDQUFDLEtBQWdCLEVBQUUsUUFBa0I7UUFDdEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDM0IsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFFBQVEsQ0FBQztRQUN0QyxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLHFCQUFxQixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMzRSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7SUFDRixDQUFDO0lBRU8sZUFBZTtRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3RELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNqQyxDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQjtRQUMvQixNQUFNLHVCQUF1QixHQUFvQixHQUFHLGVBQWUsbUJBQW1CLENBQUM7UUFDdkYsTUFBTSwyQkFBMkIsR0FBb0IsR0FBRyxtQkFBbUIsbUJBQW1CLENBQUM7UUFFL0YsTUFBTSxPQUFPLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDdEUsTUFBTSxpQkFBaUIsR0FBb0IsT0FBTyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUM7UUFDM0csTUFBTSxhQUFhLEdBQW9CLEdBQUcsaUJBQWlCLG9CQUFvQixDQUFDO1FBRWhGLE1BQU0sVUFBVSxHQUFnQjtZQUMvQixrQkFBa0IsRUFBRSxJQUFJLENBQUMsbUJBQW1CO1lBQzVDLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztTQUN2RSxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxlQUFlLENBQzVDLFVBQVUsQ0FBQyxZQUFZLENBQUMsK0dBQStHLENBQUMsRUFDeEksZ0JBQWdCLENBQ2hCLENBQUM7UUFDRixrQkFBa0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFO1lBQ3JDLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBd0IsRUFBbUIsRUFBRTtnQkFDOUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdkMsT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0UsQ0FBQztZQUNELG1CQUFtQixFQUFFLEtBQUssRUFBRSxZQUFvQixFQUFFLFNBQWlCLEVBQUUsTUFBa0IsRUFBRSxrQkFBaUMsRUFBaUIsRUFBRTtnQkFDNUksTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDdEUsbUVBQW1FO2dCQUNuRSxvRUFBb0U7Z0JBQ3BFLHNEQUFzRDtnQkFDdEQsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQ3BGLENBQUM7WUFDRixDQUFDO1lBQ0QsdUJBQXVCLEVBQUUsQ0FBQyxNQUFjLEVBQUUsVUFBa0IsRUFBRSxpQkFBcUMsRUFBRSxVQUFrQixFQUFFLGNBQXVCLEVBQVEsRUFBRTtnQkFDekosSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2pHLENBQUM7U0FDRCxDQUFDLENBQUM7UUFDSCxNQUFNLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXJDLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUM3QiwyQkFBMkI7WUFDM0IsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVPLGNBQWM7UUFDckIsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNwRSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsQ0FBQztRQUNELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV6QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUN6QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO0lBQ2pDLENBQUM7O0FBL0pXLGtDQUFrQztJQWU1QyxXQUFBLCtCQUErQixDQUFBO0lBQy9CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxpQkFBaUIsQ0FBQTtHQXBCUCxrQ0FBa0MsQ0FnSzlDOztBQUVELFNBQVMscUJBQXFCLENBQUMsU0FBcUIsRUFBRSxPQUEwQjtJQUMvRSxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzlDLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO0lBRTVELFNBQVMsYUFBYTtRQUNyQixJQUFJLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUM7WUFDcEMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3pCLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRUQsYUFBYSxFQUFFLENBQUM7SUFDaEIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFO1FBQ3RELGFBQWEsRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixPQUFPLGVBQWUsQ0FBQztBQUN4QixDQUFDIn0=