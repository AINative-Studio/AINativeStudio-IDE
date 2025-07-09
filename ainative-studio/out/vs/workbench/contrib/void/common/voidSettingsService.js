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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IMetricsService } from './metricsService.js';
import { defaultProviderSettings, getModelCapabilities } from './modelCapabilities.js';
import { VOID_SETTINGS_STORAGE_KEY } from './storageKeys.js';
import { defaultSettingsOfProvider, providerNames, modelSelectionsEqual, featureNames, defaultGlobalSettings, defaultOverridesOfModel } from './voidSettingsTypes.js';
const _modelsWithSwappedInNewModels = (options) => {
    const { existingModels, models, type } = options;
    const existingModelsMap = {};
    for (const existingModel of existingModels) {
        existingModelsMap[existingModel.modelName] = existingModel;
    }
    const newDefaultModels = models.map((modelName, i) => ({ modelName, type, isHidden: !!existingModelsMap[modelName]?.isHidden, }));
    return [
        ...newDefaultModels, // swap out all the models of this type for the new models of this type
        ...existingModels.filter(m => {
            const keep = m.type !== type;
            return keep;
        })
    ];
};
export const modelFilterOfFeatureName = {
    'Autocomplete': { filter: (o, opts) => getModelCapabilities(o.providerName, o.modelName, opts.overridesOfModel).supportsFIM, emptyMessage: { message: 'No models support FIM', priority: 'always' } },
    'Chat': { filter: o => true, emptyMessage: null, },
    'Ctrl+K': { filter: o => true, emptyMessage: null, },
    'Apply': { filter: o => true, emptyMessage: null, },
    'SCM': { filter: o => true, emptyMessage: null, },
};
const _stateWithMergedDefaultModels = (state) => {
    let newSettingsOfProvider = state.settingsOfProvider;
    // recompute default models
    for (const providerName of providerNames) {
        const defaultModels = defaultSettingsOfProvider[providerName]?.models ?? [];
        const currentModels = newSettingsOfProvider[providerName]?.models ?? [];
        const defaultModelNames = defaultModels.map(m => m.modelName);
        const newModels = _modelsWithSwappedInNewModels({ existingModels: currentModels, models: defaultModelNames, type: 'default' });
        newSettingsOfProvider = {
            ...newSettingsOfProvider,
            [providerName]: {
                ...newSettingsOfProvider[providerName],
                models: newModels,
            },
        };
    }
    return {
        ...state,
        settingsOfProvider: newSettingsOfProvider,
    };
};
const _validatedModelState = (state) => {
    let newSettingsOfProvider = state.settingsOfProvider;
    // recompute _didFillInProviderSettings
    for (const providerName of providerNames) {
        const settingsAtProvider = newSettingsOfProvider[providerName];
        const didFillInProviderSettings = Object.keys(defaultProviderSettings[providerName]).every(key => !!settingsAtProvider[key]);
        if (didFillInProviderSettings === settingsAtProvider._didFillInProviderSettings)
            continue;
        newSettingsOfProvider = {
            ...newSettingsOfProvider,
            [providerName]: {
                ...settingsAtProvider,
                _didFillInProviderSettings: didFillInProviderSettings,
            },
        };
    }
    // update model options
    let newModelOptions = [];
    for (const providerName of providerNames) {
        const providerTitle = providerName; // displayInfoOfProviderName(providerName).title.toLowerCase() // looks better lowercase, best practice to not use raw providerName
        if (!newSettingsOfProvider[providerName]._didFillInProviderSettings)
            continue; // if disabled, don't display model options
        for (const { modelName, isHidden } of newSettingsOfProvider[providerName].models) {
            if (isHidden)
                continue;
            newModelOptions.push({ name: `${modelName} (${providerTitle})`, selection: { providerName, modelName } });
        }
    }
    // now that model options are updated, make sure the selection is valid
    // if the user-selected model is no longer in the list, update the selection for each feature that needs it to something relevant (the 0th model available, or null)
    let newModelSelectionOfFeature = state.modelSelectionOfFeature;
    for (const featureName of featureNames) {
        const { filter } = modelFilterOfFeatureName[featureName];
        const filterOpts = { chatMode: state.globalSettings.chatMode, overridesOfModel: state.overridesOfModel };
        const modelOptionsForThisFeature = newModelOptions.filter((o) => filter(o.selection, filterOpts));
        const modelSelectionAtFeature = newModelSelectionOfFeature[featureName];
        const selnIdx = modelSelectionAtFeature === null ? -1 : modelOptionsForThisFeature.findIndex(m => modelSelectionsEqual(m.selection, modelSelectionAtFeature));
        if (selnIdx !== -1)
            continue; // no longer in list, so update to 1st in list or null
        newModelSelectionOfFeature = {
            ...newModelSelectionOfFeature,
            [featureName]: modelOptionsForThisFeature.length === 0 ? null : modelOptionsForThisFeature[0].selection
        };
    }
    const newState = {
        ...state,
        settingsOfProvider: newSettingsOfProvider,
        modelSelectionOfFeature: newModelSelectionOfFeature,
        overridesOfModel: state.overridesOfModel,
        _modelOptions: newModelOptions,
    };
    return newState;
};
const defaultState = () => {
    const d = {
        settingsOfProvider: deepClone(defaultSettingsOfProvider),
        modelSelectionOfFeature: { 'Chat': null, 'Ctrl+K': null, 'Autocomplete': null, 'Apply': null, 'SCM': null },
        globalSettings: deepClone(defaultGlobalSettings),
        optionsOfModelSelection: { 'Chat': {}, 'Ctrl+K': {}, 'Autocomplete': {}, 'Apply': {}, 'SCM': {} },
        overridesOfModel: deepClone(defaultOverridesOfModel),
        _modelOptions: [], // computed later
        mcpUserStateOfName: {},
    };
    return d;
};
export const IVoidSettingsService = createDecorator('VoidSettingsService');
let VoidSettingsService = class VoidSettingsService extends Disposable {
    constructor(_storageService, _encryptionService, _metricsService) {
        super();
        this._storageService = _storageService;
        this._encryptionService = _encryptionService;
        this._metricsService = _metricsService;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event; // this is primarily for use in react, so react can listen + update on state changes
        this.dangerousSetState = async (newState) => {
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            this._onUpdate_syncApplyToChat();
            this._onUpdate_syncSCMToChat();
        };
        this.setSettingOfProvider = async (providerName, settingName, newVal) => {
            const newModelSelectionOfFeature = this.state.modelSelectionOfFeature;
            const newOptionsOfModelSelection = this.state.optionsOfModelSelection;
            const newSettingsOfProvider = {
                ...this.state.settingsOfProvider,
                [providerName]: {
                    ...this.state.settingsOfProvider[providerName],
                    [settingName]: newVal,
                }
            };
            const newGlobalSettings = this.state.globalSettings;
            const newOverridesOfModel = this.state.overridesOfModel;
            const newMCPUserStateOfName = this.state.mcpUserStateOfName;
            const newState = {
                modelSelectionOfFeature: newModelSelectionOfFeature,
                optionsOfModelSelection: newOptionsOfModelSelection,
                settingsOfProvider: newSettingsOfProvider,
                globalSettings: newGlobalSettings,
                overridesOfModel: newOverridesOfModel,
                mcpUserStateOfName: newMCPUserStateOfName,
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
        };
        this.setGlobalSetting = async (settingName, newVal) => {
            const newState = {
                ...this.state,
                globalSettings: {
                    ...this.state.globalSettings,
                    [settingName]: newVal
                }
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            // hooks
            if (this.state.globalSettings.syncApplyToChat)
                this._onUpdate_syncApplyToChat();
            if (this.state.globalSettings.syncSCMToChat)
                this._onUpdate_syncSCMToChat();
        };
        this.setModelSelectionOfFeature = async (featureName, newVal) => {
            const newState = {
                ...this.state,
                modelSelectionOfFeature: {
                    ...this.state.modelSelectionOfFeature,
                    [featureName]: newVal
                }
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            // hooks
            if (featureName === 'Chat') {
                // When Chat model changes, update synced features
                this._onUpdate_syncApplyToChat();
                this._onUpdate_syncSCMToChat();
            }
        };
        this.setOptionsOfModelSelection = async (featureName, providerName, modelName, newVal) => {
            const newState = {
                ...this.state,
                optionsOfModelSelection: {
                    ...this.state.optionsOfModelSelection,
                    [featureName]: {
                        ...this.state.optionsOfModelSelection[featureName],
                        [providerName]: {
                            ...this.state.optionsOfModelSelection[featureName][providerName],
                            [modelName]: {
                                ...this.state.optionsOfModelSelection[featureName][providerName]?.[modelName],
                                ...newVal
                            }
                        }
                    }
                }
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
        };
        this.setOverridesOfModel = async (providerName, modelName, overrides) => {
            const newState = {
                ...this.state,
                overridesOfModel: {
                    ...this.state.overridesOfModel,
                    [providerName]: {
                        ...this.state.overridesOfModel[providerName],
                        [modelName]: overrides === undefined ? undefined : {
                            ...this.state.overridesOfModel[providerName][modelName],
                            ...overrides
                        },
                    }
                }
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            this._metricsService.capture('Update Model Overrides', { providerName, modelName, overrides });
        };
        // MCP Server State
        this._setMCPUserStateOfName = async (newStates) => {
            const newState = {
                ...this.state,
                mcpUserStateOfName: {
                    ...this.state.mcpUserStateOfName,
                    ...newStates
                }
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            this._metricsService.capture('Set MCP Server States', { newStates });
        };
        this.addMCPUserStateOfNames = async (newMCPStates) => {
            const { mcpUserStateOfName: mcpServerStates } = this.state;
            const newMCPServerStates = {
                ...mcpServerStates,
                ...newMCPStates,
            };
            await this._setMCPUserStateOfName(newMCPServerStates);
            this._metricsService.capture('Add MCP Servers', { servers: Object.keys(newMCPStates).join(', ') });
        };
        this.removeMCPUserStateOfNames = async (serverNames) => {
            const { mcpUserStateOfName: mcpServerStates } = this.state;
            const newMCPServerStates = {
                ...mcpServerStates,
            };
            serverNames.forEach(serverName => {
                if (serverName in newMCPServerStates) {
                    delete newMCPServerStates[serverName];
                }
            });
            await this._setMCPUserStateOfName(newMCPServerStates);
            this._metricsService.capture('Remove MCP Servers', { servers: serverNames.join(', ') });
        };
        this.setMCPServerState = async (serverName, state) => {
            const { mcpUserStateOfName } = this.state;
            const newMCPServerStates = {
                ...mcpUserStateOfName,
                [serverName]: state,
            };
            await this._setMCPUserStateOfName(newMCPServerStates);
            this._metricsService.capture('Update MCP Server State', { serverName, state });
        };
        // at the start, we haven't read the partial config yet, but we need to set state to something
        this.state = defaultState();
        let resolver = () => { };
        this.waitForInitState = new Promise((res, rej) => resolver = res);
        this._resolver = resolver;
        this.readAndInitializeState();
    }
    async resetState() {
        await this.dangerousSetState(defaultState());
    }
    async readAndInitializeState() {
        let readS;
        try {
            readS = await this._readState();
            // 1.0.3 addition, remove when enough users have had this code run
            if (readS.globalSettings.includeToolLintErrors === undefined)
                readS.globalSettings.includeToolLintErrors = true;
            // autoapprove is now an obj not a boolean (1.2.5)
            if (typeof readS.globalSettings.autoApprove === 'boolean')
                readS.globalSettings.autoApprove = {};
            // 1.3.5 add source control feature
            if (readS.modelSelectionOfFeature && !readS.modelSelectionOfFeature['SCM']) {
                readS.modelSelectionOfFeature['SCM'] = deepClone(readS.modelSelectionOfFeature['Chat']);
                readS.optionsOfModelSelection['SCM'] = deepClone(readS.optionsOfModelSelection['Chat']);
            }
            // add disableSystemMessage feature
            if (readS.globalSettings.disableSystemMessage === undefined)
                readS.globalSettings.disableSystemMessage = false;
            // add autoAcceptLLMChanges feature
            if (readS.globalSettings.autoAcceptLLMChanges === undefined)
                readS.globalSettings.autoAcceptLLMChanges = false;
        }
        catch (e) {
            readS = defaultState();
        }
        // the stored data structure might be outdated, so we need to update it here
        try {
            readS = {
                ...defaultState(),
                ...readS,
                // no idea why this was here, seems like a bug
                // ...defaultSettingsOfProvider,
                // ...readS.settingsOfProvider,
            };
            for (const providerName of providerNames) {
                readS.settingsOfProvider[providerName] = {
                    ...defaultSettingsOfProvider[providerName],
                    ...readS.settingsOfProvider[providerName],
                };
                // conversion from 1.0.3 to 1.2.5 (can remove this when enough people update)
                for (const m of readS.settingsOfProvider[providerName].models) {
                    if (!m.type) {
                        const old = m;
                        if (old.isAutodetected)
                            m.type = 'autodetected';
                        else if (old.isDefault)
                            m.type = 'default';
                        else
                            m.type = 'custom';
                    }
                }
                // remove when enough people have had it run (default is now {})
                if (providerName === 'openAICompatible' && !readS.settingsOfProvider[providerName].headersJSON) {
                    readS.settingsOfProvider[providerName].headersJSON = '{}';
                }
            }
        }
        catch (e) {
            readS = defaultState();
        }
        this.state = readS;
        this.state = _stateWithMergedDefaultModels(this.state);
        this.state = _validatedModelState(this.state);
        this._resolver();
        this._onDidChangeState.fire();
    }
    async _readState() {
        const encryptedState = this._storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (!encryptedState)
            return defaultState();
        const stateStr = await this._encryptionService.decrypt(encryptedState);
        const state = JSON.parse(stateStr);
        return state;
    }
    async _storeState() {
        const state = this.state;
        const encryptedState = await this._encryptionService.encrypt(JSON.stringify(state));
        this._storageService.store(VOID_SETTINGS_STORAGE_KEY, encryptedState, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    _onUpdate_syncApplyToChat() {
        // if sync is turned on, sync (call this whenever Chat model or !!sync changes)
        this.setModelSelectionOfFeature('Apply', deepClone(this.state.modelSelectionOfFeature['Chat']));
    }
    _onUpdate_syncSCMToChat() {
        this.setModelSelectionOfFeature('SCM', deepClone(this.state.modelSelectionOfFeature['Chat']));
    }
    setAutodetectedModels(providerName, autodetectedModelNames, logging) {
        const { models } = this.state.settingsOfProvider[providerName];
        const oldModelNames = models.map(m => m.modelName);
        const newModels = _modelsWithSwappedInNewModels({ existingModels: models, models: autodetectedModelNames, type: 'autodetected' });
        this.setSettingOfProvider(providerName, 'models', newModels);
        // if the models changed, log it
        const new_names = newModels.map(m => m.modelName);
        if (!(oldModelNames.length === new_names.length
            && oldModelNames.every((_, i) => oldModelNames[i] === new_names[i]))) {
            this._metricsService.capture('Autodetect Models', { providerName, newModels: newModels, ...logging });
        }
    }
    toggleModelHidden(providerName, modelName) {
        const { models } = this.state.settingsOfProvider[providerName];
        const modelIdx = models.findIndex(m => m.modelName === modelName);
        if (modelIdx === -1)
            return;
        const newIsHidden = !models[modelIdx].isHidden;
        const newModels = [
            ...models.slice(0, modelIdx),
            { ...models[modelIdx], isHidden: newIsHidden },
            ...models.slice(modelIdx + 1, Infinity)
        ];
        this.setSettingOfProvider(providerName, 'models', newModels);
        this._metricsService.capture('Toggle Model Hidden', { providerName, modelName, newIsHidden });
    }
    addModel(providerName, modelName) {
        const { models } = this.state.settingsOfProvider[providerName];
        const existingIdx = models.findIndex(m => m.modelName === modelName);
        if (existingIdx !== -1)
            return; // if exists, do nothing
        const newModels = [
            ...models,
            { modelName, type: 'custom', isHidden: false }
        ];
        this.setSettingOfProvider(providerName, 'models', newModels);
        this._metricsService.capture('Add Model', { providerName, modelName });
    }
    deleteModel(providerName, modelName) {
        const { models } = this.state.settingsOfProvider[providerName];
        const delIdx = models.findIndex(m => m.modelName === modelName);
        if (delIdx === -1)
            return false;
        const newModels = [
            ...models.slice(0, delIdx), // delete the idx
            ...models.slice(delIdx + 1, Infinity)
        ];
        this.setSettingOfProvider(providerName, 'models', newModels);
        this._metricsService.capture('Delete Model', { providerName, modelName });
        return true;
    }
};
VoidSettingsService = __decorate([
    __param(0, IStorageService),
    __param(1, IEncryptionService),
    __param(2, IMetricsService)
], VoidSettingsService);
registerSingleton(IVoidSettingsService, VoidSettingsService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi92b2lkU2V0dGluZ3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLG9CQUFvQixFQUFrQixNQUFNLHdCQUF3QixDQUFDO0FBQ3ZHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzdELE9BQU8sRUFBRSx5QkFBeUIsRUFBdUYsYUFBYSxFQUFrQixvQkFBb0IsRUFBRSxZQUFZLEVBQTRELHFCQUFxQixFQUE4RSx1QkFBdUIsRUFBMEQsTUFBTSx3QkFBd0IsQ0FBQztBQXVFemMsTUFBTSw2QkFBNkIsR0FBRyxDQUFDLE9BQXdHLEVBQUUsRUFBRTtJQUNsSixNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFFaEQsTUFBTSxpQkFBaUIsR0FBMEMsRUFBRSxDQUFBO0lBQ25FLEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFLENBQUM7UUFDNUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLGFBQWEsQ0FBQTtJQUMzRCxDQUFDO0lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFFakksT0FBTztRQUNOLEdBQUcsZ0JBQWdCLEVBQUUsdUVBQXVFO1FBQzVGLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM1QixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQTtZQUM1QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUMsQ0FBQztLQUNGLENBQUE7QUFDRixDQUFDLENBQUE7QUFHRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FPOUI7SUFDTixjQUFjLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUU7SUFDck0sTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEdBQUc7SUFDbEQsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEdBQUc7SUFDcEQsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEdBQUc7SUFDbkQsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEdBQUc7Q0FDakQsQ0FBQTtBQUdELE1BQU0sNkJBQTZCLEdBQUcsQ0FBQyxLQUF3QixFQUFxQixFQUFFO0lBQ3JGLElBQUkscUJBQXFCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFBO0lBRXBELDJCQUEyQjtJQUMzQixLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQzFDLE1BQU0sYUFBYSxHQUFHLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxFQUFFLE1BQU0sSUFBSSxFQUFFLENBQUE7UUFDM0UsTUFBTSxhQUFhLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFDLEVBQUUsTUFBTSxJQUFJLEVBQUUsQ0FBQTtRQUN2RSxNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDN0QsTUFBTSxTQUFTLEdBQUcsNkJBQTZCLENBQUMsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUM5SCxxQkFBcUIsR0FBRztZQUN2QixHQUFHLHFCQUFxQjtZQUN4QixDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNmLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFDO2dCQUN0QyxNQUFNLEVBQUUsU0FBUzthQUNqQjtTQUNELENBQUE7SUFDRixDQUFDO0lBQ0QsT0FBTztRQUNOLEdBQUcsS0FBSztRQUNSLGtCQUFrQixFQUFFLHFCQUFxQjtLQUN6QyxDQUFBO0FBQ0YsQ0FBQyxDQUFBO0FBRUQsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLEtBQStDLEVBQXFCLEVBQUU7SUFFbkcsSUFBSSxxQkFBcUIsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUE7SUFFcEQsdUNBQXVDO0lBQ3ZDLEtBQUssTUFBTSxZQUFZLElBQUksYUFBYSxFQUFFLENBQUM7UUFDMUMsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUU5RCxNQUFNLHlCQUF5QixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsR0FBc0MsQ0FBQyxDQUFDLENBQUE7UUFFL0osSUFBSSx5QkFBeUIsS0FBSyxrQkFBa0IsQ0FBQywwQkFBMEI7WUFBRSxTQUFRO1FBRXpGLHFCQUFxQixHQUFHO1lBQ3ZCLEdBQUcscUJBQXFCO1lBQ3hCLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQ2YsR0FBRyxrQkFBa0I7Z0JBQ3JCLDBCQUEwQixFQUFFLHlCQUF5QjthQUNyRDtTQUNELENBQUE7SUFDRixDQUFDO0lBRUQsdUJBQXVCO0lBQ3ZCLElBQUksZUFBZSxHQUFrQixFQUFFLENBQUE7SUFDdkMsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUMxQyxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUEsQ0FBQyxtSUFBbUk7UUFDdEssSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDLDBCQUEwQjtZQUFFLFNBQVEsQ0FBQywyQ0FBMkM7UUFDekgsS0FBSyxNQUFNLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xGLElBQUksUUFBUTtnQkFBRSxTQUFRO1lBQ3RCLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxTQUFTLEtBQUssYUFBYSxHQUFHLEVBQUUsU0FBUyxFQUFFLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxRyxDQUFDO0lBQ0YsQ0FBQztJQUVELHVFQUF1RTtJQUN2RSxvS0FBb0s7SUFDcEssSUFBSSwwQkFBMEIsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUE7SUFDOUQsS0FBSyxNQUFNLFdBQVcsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUV4QyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDeEQsTUFBTSxVQUFVLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDeEcsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRWpHLE1BQU0sdUJBQXVCLEdBQUcsMEJBQTBCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDdkUsTUFBTSxPQUFPLEdBQUcsdUJBQXVCLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUE7UUFFN0osSUFBSSxPQUFPLEtBQUssQ0FBQyxDQUFDO1lBQUUsU0FBUSxDQUFDLHNEQUFzRDtRQUVuRiwwQkFBMEIsR0FBRztZQUM1QixHQUFHLDBCQUEwQjtZQUM3QixDQUFDLFdBQVcsQ0FBQyxFQUFFLDBCQUEwQixDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUN2RyxDQUFBO0lBQ0YsQ0FBQztJQUdELE1BQU0sUUFBUSxHQUFHO1FBQ2hCLEdBQUcsS0FBSztRQUNSLGtCQUFrQixFQUFFLHFCQUFxQjtRQUN6Qyx1QkFBdUIsRUFBRSwwQkFBMEI7UUFDbkQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLGdCQUFnQjtRQUN4QyxhQUFhLEVBQUUsZUFBZTtLQUNGLENBQUE7SUFFN0IsT0FBTyxRQUFRLENBQUE7QUFDaEIsQ0FBQyxDQUFBO0FBTUQsTUFBTSxZQUFZLEdBQUcsR0FBRyxFQUFFO0lBQ3pCLE1BQU0sQ0FBQyxHQUFzQjtRQUM1QixrQkFBa0IsRUFBRSxTQUFTLENBQUMseUJBQXlCLENBQUM7UUFDeEQsdUJBQXVCLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7UUFDM0csY0FBYyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQztRQUNoRCx1QkFBdUIsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtRQUNqRyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsdUJBQXVCLENBQUM7UUFDcEQsYUFBYSxFQUFFLEVBQUUsRUFBRSxpQkFBaUI7UUFDcEMsa0JBQWtCLEVBQUUsRUFBRTtLQUN0QixDQUFBO0lBQ0QsT0FBTyxDQUFDLENBQUE7QUFDVCxDQUFDLENBQUE7QUFHRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUM7QUFDakcsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBVzNDLFlBQ2tCLGVBQWlELEVBQzlDLGtCQUF1RCxFQUMxRCxlQUFpRDtRQUlsRSxLQUFLLEVBQUUsQ0FBQTtRQU4yQixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDN0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUN6QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFYbEQsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUNoRCxxQkFBZ0IsR0FBZ0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLG9GQUFvRjtRQTRCM0osc0JBQWlCLEdBQUcsS0FBSyxFQUFFLFFBQTJCLEVBQUUsRUFBRTtZQUN6RCxJQUFJLENBQUMsS0FBSyxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzNDLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ3hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUM3QixJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtZQUNoQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUMvQixDQUFDLENBQUE7UUFxR0QseUJBQW9CLEdBQTJCLEtBQUssRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBRTFGLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQTtZQUVyRSxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUE7WUFFckUsTUFBTSxxQkFBcUIsR0FBdUI7Z0JBQ2pELEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0I7Z0JBQ2hDLENBQUMsWUFBWSxDQUFDLEVBQUU7b0JBQ2YsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQztvQkFDOUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxNQUFNO2lCQUNyQjthQUNELENBQUE7WUFFRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFBO1lBQ25ELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQTtZQUN2RCxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUE7WUFFM0QsTUFBTSxRQUFRLEdBQUc7Z0JBQ2hCLHVCQUF1QixFQUFFLDBCQUEwQjtnQkFDbkQsdUJBQXVCLEVBQUUsMEJBQTBCO2dCQUNuRCxrQkFBa0IsRUFBRSxxQkFBcUI7Z0JBQ3pDLGNBQWMsRUFBRSxpQkFBaUI7Z0JBQ2pDLGdCQUFnQixFQUFFLG1CQUFtQjtnQkFDckMsa0JBQWtCLEVBQUUscUJBQXFCO2FBQ3pDLENBQUE7WUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRTNDLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ3hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUU5QixDQUFDLENBQUE7UUFZRCxxQkFBZ0IsR0FBdUIsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNwRSxNQUFNLFFBQVEsR0FBc0I7Z0JBQ25DLEdBQUcsSUFBSSxDQUFDLEtBQUs7Z0JBQ2IsY0FBYyxFQUFFO29CQUNmLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjO29CQUM1QixDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU07aUJBQ3JCO2FBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyxLQUFLLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDM0MsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDeEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFBO1lBRTdCLFFBQVE7WUFDUixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWU7Z0JBQUUsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7WUFDL0UsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxhQUFhO2dCQUFFLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO1FBRTVFLENBQUMsQ0FBQTtRQUdELCtCQUEwQixHQUFpQyxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3hGLE1BQU0sUUFBUSxHQUFzQjtnQkFDbkMsR0FBRyxJQUFJLENBQUMsS0FBSztnQkFDYix1QkFBdUIsRUFBRTtvQkFDeEIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QjtvQkFDckMsQ0FBQyxXQUFXLENBQUMsRUFBRSxNQUFNO2lCQUNyQjthQUNELENBQUE7WUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRTNDLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ3hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUU3QixRQUFRO1lBQ1IsSUFBSSxXQUFXLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzVCLGtEQUFrRDtnQkFDbEQsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7Z0JBQ2hDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUE7UUFHRCwrQkFBMEIsR0FBRyxLQUFLLEVBQUUsV0FBd0IsRUFBRSxZQUEwQixFQUFFLFNBQWlCLEVBQUUsTUFBc0MsRUFBRSxFQUFFO1lBQ3RKLE1BQU0sUUFBUSxHQUFzQjtnQkFDbkMsR0FBRyxJQUFJLENBQUMsS0FBSztnQkFDYix1QkFBdUIsRUFBRTtvQkFDeEIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QjtvQkFDckMsQ0FBQyxXQUFXLENBQUMsRUFBRTt3QkFDZCxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsV0FBVyxDQUFDO3dCQUNsRCxDQUFDLFlBQVksQ0FBQyxFQUFFOzRCQUNmLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxZQUFZLENBQUM7NEJBQ2hFLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0NBQ1osR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDO2dDQUM3RSxHQUFHLE1BQU07NkJBQ1Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFBO1lBQ0QsSUFBSSxDQUFDLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUUzQyxNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUN4QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDOUIsQ0FBQyxDQUFBO1FBRUQsd0JBQW1CLEdBQUcsS0FBSyxFQUFFLFlBQTBCLEVBQUUsU0FBaUIsRUFBRSxTQUE4QyxFQUFFLEVBQUU7WUFDN0gsTUFBTSxRQUFRLEdBQXNCO2dCQUNuQyxHQUFHLElBQUksQ0FBQyxLQUFLO2dCQUNiLGdCQUFnQixFQUFFO29CQUNqQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCO29CQUM5QixDQUFDLFlBQVksQ0FBQyxFQUFFO3dCQUNmLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7d0JBQzVDLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzs0QkFDbEQsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQzs0QkFDdkQsR0FBRyxTQUFTO3lCQUNaO3FCQUNEO2lCQUNEO2FBQ0QsQ0FBQztZQUVGLElBQUksQ0FBQyxLQUFLLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUMsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO1lBRTlCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2hHLENBQUMsQ0FBQTtRQWtFRCxtQkFBbUI7UUFDWCwyQkFBc0IsR0FBRyxLQUFLLEVBQUUsU0FBNkIsRUFBRSxFQUFFO1lBQ3hFLE1BQU0sUUFBUSxHQUFzQjtnQkFDbkMsR0FBRyxJQUFJLENBQUMsS0FBSztnQkFDYixrQkFBa0IsRUFBRTtvQkFDbkIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQjtvQkFDaEMsR0FBRyxTQUFTO2lCQUNaO2FBQ0QsQ0FBQztZQUNGLElBQUksQ0FBQyxLQUFLLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUMsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDLENBQUE7UUFFRCwyQkFBc0IsR0FBRyxLQUFLLEVBQUUsWUFBZ0MsRUFBRSxFQUFFO1lBQ25FLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO1lBQzFELE1BQU0sa0JBQWtCLEdBQUc7Z0JBQzFCLEdBQUcsZUFBZTtnQkFDbEIsR0FBRyxZQUFZO2FBQ2YsQ0FBQTtZQUNELE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFDckQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BHLENBQUMsQ0FBQTtRQUVELDhCQUF5QixHQUFHLEtBQUssRUFBRSxXQUFxQixFQUFFLEVBQUU7WUFDM0QsTUFBTSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7WUFDMUQsTUFBTSxrQkFBa0IsR0FBRztnQkFDMUIsR0FBRyxlQUFlO2FBQ2xCLENBQUE7WUFDRCxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNoQyxJQUFJLFVBQVUsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO29CQUN0QyxPQUFPLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUN0QyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDRixNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQ3JELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pGLENBQUMsQ0FBQTtRQUVELHNCQUFpQixHQUFHLEtBQUssRUFBRSxVQUFrQixFQUFFLEtBQW1CLEVBQUUsRUFBRTtZQUNyRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO1lBQ3pDLE1BQU0sa0JBQWtCLEdBQUc7Z0JBQzFCLEdBQUcsa0JBQWtCO2dCQUNyQixDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUs7YUFDbkIsQ0FBQTtZQUNELE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFDckQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNoRixDQUFDLENBQUE7UUF6V0EsOEZBQThGO1FBQzlGLElBQUksQ0FBQyxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUE7UUFDM0IsSUFBSSxRQUFRLEdBQWUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUV6QixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBWUQsS0FBSyxDQUFDLFVBQVU7UUFDZixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFLRCxLQUFLLENBQUMsc0JBQXNCO1FBQzNCLElBQUksS0FBd0IsQ0FBQTtRQUM1QixJQUFJLENBQUM7WUFDSixLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEMsa0VBQWtFO1lBQ2xFLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsS0FBSyxTQUFTO2dCQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFBO1lBRS9HLGtEQUFrRDtZQUNsRCxJQUFJLE9BQU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxXQUFXLEtBQUssU0FBUztnQkFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7WUFFaEcsbUNBQW1DO1lBQ25DLElBQUksS0FBSyxDQUFDLHVCQUF1QixJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzVFLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZGLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDeEYsQ0FBQztZQUNELG1DQUFtQztZQUNuQyxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEtBQUssU0FBUztnQkFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQztZQUUvRyxtQ0FBbUM7WUFDbkMsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLG9CQUFvQixLQUFLLFNBQVM7Z0JBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUM7UUFDaEgsQ0FBQztRQUNELE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDVixLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUE7UUFDdkIsQ0FBQztRQUVELDRFQUE0RTtRQUM1RSxJQUFJLENBQUM7WUFDSixLQUFLLEdBQUc7Z0JBQ1AsR0FBRyxZQUFZLEVBQUU7Z0JBQ2pCLEdBQUcsS0FBSztnQkFDUiw4Q0FBOEM7Z0JBQzlDLGdDQUFnQztnQkFDaEMsK0JBQStCO2FBQy9CLENBQUE7WUFFRCxLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUMxQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEdBQUc7b0JBQ3hDLEdBQUcseUJBQXlCLENBQUMsWUFBWSxDQUFDO29CQUMxQyxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7aUJBQ2xDLENBQUE7Z0JBRVIsNkVBQTZFO2dCQUM3RSxLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDL0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDYixNQUFNLEdBQUcsR0FBSSxDQUF1RCxDQUFBO3dCQUNwRSxJQUFJLEdBQUcsQ0FBQyxjQUFjOzRCQUNyQixDQUFDLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQTs2QkFDbkIsSUFBSSxHQUFHLENBQUMsU0FBUzs0QkFDckIsQ0FBQyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUE7OzRCQUNkLENBQUMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFBO29CQUN2QixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsZ0VBQWdFO2dCQUNoRSxJQUFJLFlBQVksS0FBSyxrQkFBa0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDaEcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7Z0JBQzFELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDVixLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUE7UUFDdkIsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxLQUFLLEdBQUcsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxLQUFLLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRzlDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFL0IsQ0FBQztJQUdPLEtBQUssQ0FBQyxVQUFVO1FBQ3ZCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLHlCQUF5QixvQ0FBMkIsQ0FBQTtRQUVwRyxJQUFJLENBQUMsY0FBYztZQUNsQixPQUFPLFlBQVksRUFBRSxDQUFBO1FBRXRCLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN0RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUdPLEtBQUssQ0FBQyxXQUFXO1FBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7UUFDeEIsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNuRixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxjQUFjLGdFQUErQyxDQUFDO0lBQ3JILENBQUM7SUFxQ08seUJBQXlCO1FBQ2hDLCtFQUErRTtRQUMvRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNoRyxDQUFDO0lBRU8sdUJBQXVCO1FBQzlCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzlGLENBQUM7SUE0RkQscUJBQXFCLENBQUMsWUFBMEIsRUFBRSxzQkFBZ0MsRUFBRSxPQUFlO1FBRWxHLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlELE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFbEQsTUFBTSxTQUFTLEdBQUcsNkJBQTZCLENBQUMsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQTtRQUNqSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU1RCxnQ0FBZ0M7UUFDaEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQyxNQUFNO2VBQzNDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDbkUsQ0FBQztZQUNGLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3RHLENBQUM7SUFDRixDQUFDO0lBQ0QsaUJBQWlCLENBQUMsWUFBMEIsRUFBRSxTQUFpQjtRQUc5RCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5RCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsQ0FBQTtRQUNqRSxJQUFJLFFBQVEsS0FBSyxDQUFDLENBQUM7WUFBRSxPQUFNO1FBQzNCLE1BQU0sV0FBVyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUM5QyxNQUFNLFNBQVMsR0FBNEI7WUFDMUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUM7WUFDNUIsRUFBRSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFO1lBQzlDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQztTQUN2QyxDQUFBO1FBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFNUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUE7SUFFOUYsQ0FBQztJQUNELFFBQVEsQ0FBQyxZQUEwQixFQUFFLFNBQWlCO1FBQ3JELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFBO1FBQ3BFLElBQUksV0FBVyxLQUFLLENBQUMsQ0FBQztZQUFFLE9BQU0sQ0FBQyx3QkFBd0I7UUFDdkQsTUFBTSxTQUFTLEdBQUc7WUFDakIsR0FBRyxNQUFNO1lBQ1QsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFXO1NBQ3ZELENBQUE7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU1RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtJQUV2RSxDQUFDO0lBQ0QsV0FBVyxDQUFDLFlBQTBCLEVBQUUsU0FBaUI7UUFDeEQsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLENBQUE7UUFDL0QsSUFBSSxNQUFNLEtBQUssQ0FBQyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUE7UUFDL0IsTUFBTSxTQUFTLEdBQUc7WUFDakIsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsRUFBRSxpQkFBaUI7WUFDN0MsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDO1NBQ3JDLENBQUE7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU1RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUV6RSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FtREQsQ0FBQTtBQS9YSyxtQkFBbUI7SUFZdEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0dBZFosbUJBQW1CLENBK1h4QjtBQUdELGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLG1CQUFtQixrQ0FBMEIsQ0FBQyJ9