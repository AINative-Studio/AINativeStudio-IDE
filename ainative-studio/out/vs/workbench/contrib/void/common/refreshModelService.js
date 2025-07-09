/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmcmVzaE1vZGVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9yZWZyZXNoTW9kZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUEyQix3QkFBd0IsRUFBc0IsTUFBTSx3QkFBd0IsQ0FBQztBQUUvRyxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBaUM3RixNQUFNLGNBQWMsR0FBd0U7SUFDM0YsTUFBTSxFQUFFLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQ2xELElBQUksRUFBRSxDQUFDLDRCQUE0QixFQUFFLFVBQVUsQ0FBQztJQUNoRCxRQUFRLEVBQUUsQ0FBQyw0QkFBNEIsRUFBRSxVQUFVLENBQUM7SUFDcEQsMEVBQTBFO0NBQzFFLENBQUE7QUFDRCxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtBQUM5QiwrQkFBK0I7QUFFL0IsTUFBTSxXQUFXLEdBQUcsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFBO0FBRXRFLHNCQUFzQjtBQUN0QixTQUFTLEVBQUUsQ0FBSSxDQUFNLEVBQUUsQ0FBTTtJQUM1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