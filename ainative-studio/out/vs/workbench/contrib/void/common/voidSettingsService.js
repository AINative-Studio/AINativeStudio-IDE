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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vdm9pZFNldHRpbmdzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3RELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxvQkFBb0IsRUFBa0IsTUFBTSx3QkFBd0IsQ0FBQztBQUN2RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUseUJBQXlCLEVBQXVGLGFBQWEsRUFBa0Isb0JBQW9CLEVBQUUsWUFBWSxFQUE0RCxxQkFBcUIsRUFBOEUsdUJBQXVCLEVBQTBELE1BQU0sd0JBQXdCLENBQUM7QUF1RXpjLE1BQU0sNkJBQTZCLEdBQUcsQ0FBQyxPQUF3RyxFQUFFLEVBQUU7SUFDbEosTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcs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