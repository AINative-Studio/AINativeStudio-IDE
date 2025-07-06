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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3ZvaWRTZXR0aW5nc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsb0JBQW9CLEVBQWtCLE1BQU0sd0JBQXdCLENBQUM7QUFDdkcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHlCQUF5QixFQUF1RixhQUFhLEVBQWtCLG9CQUFvQixFQUFFLFlBQVksRUFBNEQscUJBQXFCLEVBQThFLHVCQUF1QixFQUEwRCxNQUFNLHdCQUF3QixDQUFDO0FBdUV6YyxNQUFNLDZCQUE2QixHQUFHLENBQUMsT0FBd0csRUFBRSxFQUFFO0lBQ2xKLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8s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