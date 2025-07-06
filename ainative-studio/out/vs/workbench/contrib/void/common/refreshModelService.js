/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { IVoidSettingsService } from './voidSettingsService.js';
import { ILLMMessageService } from './sendLLMMessageService.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { refreshableProviderNames } from './voidSettingsTypes.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
const refreshBasedOn = {
    ollama: ['_didFillInProviderSettings', 'endpoint'],
    vLLM: ['_didFillInProviderSettings', 'endpoint'],
    lmStudio: ['_didFillInProviderSettings', 'endpoint'],
    // openAICompatible: ['_didFillInProviderSettings', 'endpoint', 'apiKey'],
};
const REFRESH_INTERVAL = 5_000;
// const COOLDOWN_TIMEOUT = 300
const autoOptions = { enableProviderOnSuccess: true, doNotFire: true };
// element-wise equals
function eq(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
export const IRefreshModelService = createDecorator('RefreshModelService');
let RefreshModelService = class RefreshModelService extends Disposable {
    constructor(voidSettingsService, llmMessageService) {
        super();
        this.voidSettingsService = voidSettingsService;
        this.llmMessageService = llmMessageService;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event; // this is primarily for use in react, so react can listen + update on state changes
        this.state = {
            ollama: { state: 'init', timeoutId: null },
            vLLM: { state: 'init', timeoutId: null },
            lmStudio: { state: 'init', timeoutId: null },
        };
        // start listening for models (and don't stop)
        this.startRefreshingModels = (providerName, options) => {
            this._clearProviderTimeout(providerName);
            this._setRefreshState(providerName, 'refreshing', options);
            const autoPoll = () => {
                if (this.voidSettingsService.state.globalSettings.autoRefreshModels) {
                    // resume auto-polling
                    const timeoutId = setTimeout(() => this.startRefreshingModels(providerName, autoOptions), REFRESH_INTERVAL);
                    this._setTimeoutId(providerName, timeoutId);
                }
            };
            const listFn = providerName === 'ollama' ? this.llmMessageService.ollamaList
                : this.llmMessageService.openAICompatibleList;
            listFn({
                providerName,
                onSuccess: ({ models }) => {
                    // set the models to the detected models
                    this.voidSettingsService.setAutodetectedModels(providerName, models.map(model => {
                        if (providerName === 'ollama')
                            return model.name;
                        else if (providerName === 'vLLM')
                            return model.id;
                        else if (providerName === 'lmStudio')
                            return model.id;
                        else
                            throw new Error('refreshMode fn: unknown provider', providerName);
                    }), { enableProviderOnSuccess: options.enableProviderOnSuccess, hideRefresh: options.doNotFire });
                    if (options.enableProviderOnSuccess)
                        this.voidSettingsService.setSettingOfProvider(providerName, '_didFillInProviderSettings', true);
                    this._setRefreshState(providerName, 'finished', options);
                    autoPoll();
                },
                onError: ({ error }) => {
                    this._setRefreshState(providerName, 'error', options);
                    autoPoll();
                }
            });
        };
        const disposables = new Set();
        const initializeAutoPollingAndOnChange = () => {
            this._clearAllTimeouts();
            disposables.forEach(d => d.dispose());
            disposables.clear();
            if (!voidSettingsService.state.globalSettings.autoRefreshModels)
                return;
            for (const providerName of refreshableProviderNames) {
                // const { '_didFillInProviderSettings': enabled } = this.voidSettingsService.state.settingsOfProvider[providerName]
                this.startRefreshingModels(providerName, autoOptions);
                // every time providerName.enabled changes, refresh models too, like a useEffect
                let relevantVals = () => refreshBasedOn[providerName].map(settingName => voidSettingsService.state.settingsOfProvider[providerName][settingName]);
                let prevVals = relevantVals(); // each iteration of a for loop has its own context and vars, so this is ok
                disposables.add(voidSettingsService.onDidChangeState(() => {
                    const newVals = relevantVals();
                    if (!eq(prevVals, newVals)) {
                        const prevEnabled = prevVals[0];
                        const enabled = newVals[0];
                        // if it was just enabled, or there was a change and it wasn't to the enabled state, refresh
                        if ((enabled && !prevEnabled) || (!enabled && !prevEnabled)) {
                            // if user just clicked enable, refresh
                            this.startRefreshingModels(providerName, autoOptions);
                        }
                        else {
                            // else if user just clicked disable, don't refresh
                            // //give cooldown before re-enabling (or at least re-fetching)
                            // const timeoutId = setTimeout(() => this.refreshModels(providerName, !enabled), COOLDOWN_TIMEOUT)
                            // this._setTimeoutId(providerName, timeoutId)
                        }
                        prevVals = newVals;
                    }
                }));
            }
        };
        // on mount (when get init settings state), and if a relevant feature flag changes, start refreshing models
        voidSettingsService.waitForInitState.then(() => {
            initializeAutoPollingAndOnChange();
            this._register(voidSettingsService.onDidChangeState((type) => { if (typeof type === 'object' && type[1] === 'autoRefreshModels')
                initializeAutoPollingAndOnChange(); }));
        });
    }
    _clearAllTimeouts() {
        for (const providerName of refreshableProviderNames) {
            this._clearProviderTimeout(providerName);
        }
    }
    _clearProviderTimeout(providerName) {
        // cancel any existing poll
        if (this.state[providerName].timeoutId) {
            clearTimeout(this.state[providerName].timeoutId);
            this._setTimeoutId(providerName, null);
        }
    }
    _setTimeoutId(providerName, timeoutId) {
        this.state[providerName].timeoutId = timeoutId;
    }
    _setRefreshState(providerName, state, options) {
        if (options?.doNotFire)
            return;
        this.state[providerName].state = state;
        this._onDidChangeState.fire(providerName);
    }
};
RefreshModelService = __decorate([
    __param(0, IVoidSettingsService),
    __param(1, ILLMMessageService)
], RefreshModelService);
export { RefreshModelService };
registerSingleton(IRefreshModelService, RefreshModelService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmcmVzaE1vZGVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3JlZnJlc2hNb2RlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQTJCLHdCQUF3QixFQUFzQixNQUFNLHdCQUF3QixDQUFDO0FBRS9HLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFpQzdGLE1BQU0sY0FBYyxHQUF3RTtJQUMzRixNQUFNLEVBQUUsQ0FBQyw0QkFBNEIsRUFBRSxVQUFVLENBQUM7SUFDbEQsSUFBSSxFQUFFLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQ2hELFFBQVEsRUFBRSxDQUFDLDRCQUE0QixFQUFFLFVBQVUsQ0FBQztJQUNwRCwwRUFBMEU7Q0FDMUUsQ0FBQTtBQUNELE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO0FBQzlCLCtCQUErQjtBQUUvQixNQUFNLFdBQVcsR0FBRyxFQUFFLHVCQUF1QixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUE7QUFFdEUsc0JBQXNCO0FBQ3RCLFNBQVMsRUFBRSxDQUFJLENBQU0sRUFBRSxDQUFNO0lBQzVCLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTTtRQUFFLE9BQU8sS0FBSyxDQUFBO0lBQ3ZDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFBO0lBQ2hDLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUM7QUFRRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUM7QUFFMUYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBUWxELFlBQ3VCLG1CQUEwRCxFQUM1RCxpQkFBc0Q7UUFFMUUsS0FBSyxFQUFFLENBQUE7UUFIZ0Msd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUMzQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBTjFELHNCQUFpQixHQUFHLElBQUksT0FBTyxFQUEyQixDQUFDO1FBQ25FLHFCQUFnQixHQUFtQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsb0ZBQW9GO1FBZ0U5SyxVQUFLLEdBQWdDO1lBQ3BDLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtZQUMxQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUU7WUFDeEMsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1NBQzVDLENBQUE7UUFHRCw4Q0FBOEM7UUFDOUMsMEJBQXFCLEdBQWtELENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBRWhHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUV4QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUUxRCxNQUFNLFFBQVEsR0FBRyxHQUFHLEVBQUU7Z0JBQ3JCLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDckUsc0JBQXNCO29CQUN0QixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO29CQUMzRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDNUMsQ0FBQztZQUNGLENBQUMsQ0FBQTtZQUNELE1BQU0sTUFBTSxHQUFHLFlBQVksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVO2dCQUMzRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixDQUFBO1lBRTlDLE1BQU0sQ0FBQztnQkFDTixZQUFZO2dCQUNaLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtvQkFDekIsd0NBQXdDO29CQUN4QyxJQUFJLENBQUMsbUJBQW1CLENBQUMscUJBQXFCLENBQzdDLFlBQVksRUFDWixNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO3dCQUNsQixJQUFJLFlBQVksS0FBSyxRQUFROzRCQUFFLE9BQVEsS0FBNkIsQ0FBQyxJQUFJLENBQUM7NkJBQ3JFLElBQUksWUFBWSxLQUFLLE1BQU07NEJBQUUsT0FBUSxLQUF1QyxDQUFDLEVBQUUsQ0FBQzs2QkFDaEYsSUFBSSxZQUFZLEtBQUssVUFBVTs0QkFBRSxPQUFRLEtBQXVDLENBQUMsRUFBRSxDQUFDOzs0QkFDcEYsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDeEUsQ0FBQyxDQUFDLEVBQ0YsRUFBRSx1QkFBdUIsRUFBRSxPQUFPLENBQUMsdUJBQXVCLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FDNUYsQ0FBQTtvQkFFRCxJQUFJLE9BQU8sQ0FBQyx1QkFBdUI7d0JBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLFlBQVksRUFBRSw0QkFBNEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtvQkFFcEksSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUE7b0JBQ3hELFFBQVEsRUFBRSxDQUFBO2dCQUNYLENBQUM7Z0JBQ0QsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO29CQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtvQkFDckQsUUFBUSxFQUFFLENBQUE7Z0JBQ1gsQ0FBQzthQUNELENBQUMsQ0FBQTtRQUdILENBQUMsQ0FBQTtRQXpHQSxNQUFNLFdBQVcsR0FBcUIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUUvQyxNQUFNLGdDQUFnQyxHQUFHLEdBQUcsRUFBRTtZQUM3QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUN4QixXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDckMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBRW5CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGlCQUFpQjtnQkFBRSxPQUFNO1lBRXZFLEtBQUssTUFBTSxZQUFZLElBQUksd0JBQXdCLEVBQUUsQ0FBQztnQkFFckQsb0hBQW9IO2dCQUNwSCxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUVyRCxnRkFBZ0Y7Z0JBQ2hGLElBQUksWUFBWSxHQUFHLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtnQkFDakosSUFBSSxRQUFRLEdBQUcsWUFBWSxFQUFFLENBQUEsQ0FBQywyRUFBMkU7Z0JBQ3pHLFdBQVcsQ0FBQyxHQUFHLENBQ2QsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO29CQUN6QyxNQUFNLE9BQU8sR0FBRyxZQUFZLEVBQUUsQ0FBQTtvQkFDOUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQzt3QkFFNUIsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBWSxDQUFBO3dCQUMxQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFZLENBQUE7d0JBRXJDLDRGQUE0Rjt3QkFDNUYsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDOzRCQUM3RCx1Q0FBdUM7NEJBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUE7d0JBQ3RELENBQUM7NkJBQ0ksQ0FBQzs0QkFDTCxtREFBbUQ7NEJBRW5ELCtEQUErRDs0QkFDL0QsbUdBQW1HOzRCQUNuRyw4Q0FBOEM7d0JBQy9DLENBQUM7d0JBQ0QsUUFBUSxHQUFHLE9BQU8sQ0FBQTtvQkFDbkIsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELDJHQUEyRztRQUMzRyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQzlDLGdDQUFnQyxFQUFFLENBQUE7WUFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLG1CQUFtQjtnQkFBRSxnQ0FBZ0MsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQ3ZKLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUVILENBQUM7SUF1REQsaUJBQWlCO1FBQ2hCLEtBQUssTUFBTSxZQUFZLElBQUksd0JBQXdCLEVBQUUsQ0FBQztZQUNyRCxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxZQUFxQztRQUMxRCwyQkFBMkI7UUFDM0IsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2hELElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRU8sYUFBYSxDQUFDLFlBQXFDLEVBQUUsU0FBZ0M7UUFDNUYsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO0lBQy9DLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxZQUFxQyxFQUFFLEtBQWdDLEVBQUUsT0FBZ0M7UUFDakksSUFBSSxPQUFPLEVBQUUsU0FBUztZQUFFLE9BQU07UUFDOUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDMUMsQ0FBQztDQUNELENBQUE7QUFqSlksbUJBQW1CO0lBUzdCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxrQkFBa0IsQ0FBQTtHQVZSLG1CQUFtQixDQWlKL0I7O0FBRUQsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLGtDQUEwQixDQUFDIn0=