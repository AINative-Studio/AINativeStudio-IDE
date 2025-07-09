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
import { distinct } from '../../../../base/common/arrays.js';
import { sequence } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import * as json from '../../../../base/common/json.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import * as resources from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI as uri } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { launchSchemaId } from '../../../services/configuration/common/configuration.js';
import { ACTIVE_GROUP, IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { CONTEXT_DEBUG_CONFIGURATION_TYPE, DebugConfigurationProviderTriggerKind } from '../common/debug.js';
import { launchSchema } from '../common/debugSchemas.js';
import { getVisibleAndSorted } from '../common/debugUtils.js';
import { debugConfigure } from './debugIcons.js';
const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
jsonRegistry.registerSchema(launchSchemaId, launchSchema);
const DEBUG_SELECTED_CONFIG_NAME_KEY = 'debug.selectedconfigname';
const DEBUG_SELECTED_ROOT = 'debug.selectedroot';
// Debug type is only stored if a dynamic configuration is used for better restore
const DEBUG_SELECTED_TYPE = 'debug.selectedtype';
const DEBUG_RECENT_DYNAMIC_CONFIGURATIONS = 'debug.recentdynamicconfigurations';
const ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME = 'onDebugDynamicConfigurations';
let ConfigurationManager = class ConfigurationManager {
    constructor(adapterManager, contextService, configurationService, quickInputService, instantiationService, storageService, extensionService, historyService, uriIdentityService, contextKeyService, logService) {
        this.adapterManager = adapterManager;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.historyService = historyService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.getSelectedConfig = () => Promise.resolve(undefined);
        this.selectedDynamic = false;
        this._onDidSelectConfigurationName = new Emitter();
        this._onDidChangeConfigurationProviders = new Emitter();
        this.onDidChangeConfigurationProviders = this._onDidChangeConfigurationProviders.event;
        this.configProviders = [];
        this.toDispose = [this._onDidChangeConfigurationProviders];
        this.initLaunches();
        this.setCompoundSchemaValues();
        this.registerListeners();
        const previousSelectedRoot = this.storageService.get(DEBUG_SELECTED_ROOT, 1 /* StorageScope.WORKSPACE */);
        const previousSelectedType = this.storageService.get(DEBUG_SELECTED_TYPE, 1 /* StorageScope.WORKSPACE */);
        const previousSelectedLaunch = this.launches.find(l => l.uri.toString() === previousSelectedRoot);
        const previousSelectedName = this.storageService.get(DEBUG_SELECTED_CONFIG_NAME_KEY, 1 /* StorageScope.WORKSPACE */);
        this.debugConfigurationTypeContext = CONTEXT_DEBUG_CONFIGURATION_TYPE.bindTo(contextKeyService);
        const dynamicConfig = previousSelectedType ? { type: previousSelectedType } : undefined;
        if (previousSelectedLaunch && previousSelectedLaunch.getConfigurationNames().length) {
            this.selectConfiguration(previousSelectedLaunch, previousSelectedName, undefined, dynamicConfig);
        }
        else if (this.launches.length > 0) {
            this.selectConfiguration(undefined, previousSelectedName, undefined, dynamicConfig);
        }
    }
    registerDebugConfigurationProvider(debugConfigurationProvider) {
        this.configProviders.push(debugConfigurationProvider);
        this._onDidChangeConfigurationProviders.fire();
        return {
            dispose: () => {
                this.unregisterDebugConfigurationProvider(debugConfigurationProvider);
                this._onDidChangeConfigurationProviders.fire();
            }
        };
    }
    unregisterDebugConfigurationProvider(debugConfigurationProvider) {
        const ix = this.configProviders.indexOf(debugConfigurationProvider);
        if (ix >= 0) {
            this.configProviders.splice(ix, 1);
        }
    }
    /**
     * if scope is not specified,a value of DebugConfigurationProvideTrigger.Initial is assumed.
     */
    hasDebugConfigurationProvider(debugType, triggerKind) {
        if (triggerKind === undefined) {
            triggerKind = DebugConfigurationProviderTriggerKind.Initial;
        }
        // check if there are providers for the given type that contribute a provideDebugConfigurations method
        const provider = this.configProviders.find(p => p.provideDebugConfigurations && (p.type === debugType) && (p.triggerKind === triggerKind));
        return !!provider;
    }
    async resolveConfigurationByProviders(folderUri, type, config, token) {
        const resolveDebugConfigurationForType = async (type, config) => {
            if (type !== '*') {
                await this.adapterManager.activateDebuggers('onDebugResolve', type);
            }
            for (const p of this.configProviders) {
                if (p.type === type && p.resolveDebugConfiguration && config) {
                    config = await p.resolveDebugConfiguration(folderUri, config, token);
                }
            }
            return config;
        };
        let resolvedType = config.type ?? type;
        let result = config;
        for (let seen = new Set(); result && !seen.has(resolvedType);) {
            seen.add(resolvedType);
            result = await resolveDebugConfigurationForType(resolvedType, result);
            result = await resolveDebugConfigurationForType('*', result);
            resolvedType = result?.type ?? type;
        }
        return result;
    }
    async resolveDebugConfigurationWithSubstitutedVariables(folderUri, type, config, token) {
        // pipe the config through the promises sequentially. Append at the end the '*' types
        const providers = this.configProviders.filter(p => p.type === type && p.resolveDebugConfigurationWithSubstitutedVariables)
            .concat(this.configProviders.filter(p => p.type === '*' && p.resolveDebugConfigurationWithSubstitutedVariables));
        let result = config;
        await sequence(providers.map(provider => async () => {
            // If any provider returned undefined or null make sure to respect that and do not pass the result to more resolver
            if (result) {
                result = await provider.resolveDebugConfigurationWithSubstitutedVariables(folderUri, result, token);
            }
        }));
        return result;
    }
    async provideDebugConfigurations(folderUri, type, token) {
        await this.adapterManager.activateDebuggers('onDebugInitialConfigurations');
        const results = await Promise.all(this.configProviders.filter(p => p.type === type && p.triggerKind === DebugConfigurationProviderTriggerKind.Initial && p.provideDebugConfigurations).map(p => p.provideDebugConfigurations(folderUri, token)));
        return results.reduce((first, second) => first.concat(second), []);
    }
    async getDynamicProviders() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const debugDynamicExtensionsTypes = this.extensionService.extensions.reduce((acc, e) => {
            if (!e.activationEvents) {
                return acc;
            }
            const explicitTypes = [];
            let hasGenericEvent = false;
            for (const event of e.activationEvents) {
                if (event === ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME) {
                    hasGenericEvent = true;
                }
                else if (event.startsWith(`${ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME}:`)) {
                    explicitTypes.push(event.slice(ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME.length + 1));
                }
            }
            if (explicitTypes.length) {
                explicitTypes.forEach(t => acc.add(t));
            }
            else if (hasGenericEvent) {
                const debuggerType = e.contributes?.debuggers?.[0].type;
                if (debuggerType) {
                    acc.add(debuggerType);
                }
            }
            return acc;
        }, new Set());
        for (const configProvider of this.configProviders) {
            if (configProvider.triggerKind === DebugConfigurationProviderTriggerKind.Dynamic) {
                debugDynamicExtensionsTypes.add(configProvider.type);
            }
        }
        return [...debugDynamicExtensionsTypes].map(type => {
            return {
                label: this.adapterManager.getDebuggerLabel(type),
                getProvider: async () => {
                    await this.adapterManager.activateDebuggers(ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME, type);
                    return this.configProviders.find(p => p.type === type && p.triggerKind === DebugConfigurationProviderTriggerKind.Dynamic && p.provideDebugConfigurations);
                },
                type,
                pick: async () => {
                    // Do a late 'onDebugDynamicConfigurationsName' activation so extensions are not activated too early #108578
                    await this.adapterManager.activateDebuggers(ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME, type);
                    const disposables = new DisposableStore();
                    const token = new CancellationTokenSource();
                    disposables.add(token);
                    const input = disposables.add(this.quickInputService.createQuickPick());
                    input.busy = true;
                    input.placeholder = nls.localize('selectConfiguration', "Select Launch Configuration");
                    const chosenPromise = new Promise(resolve => {
                        disposables.add(input.onDidAccept(() => resolve(input.activeItems[0])));
                        disposables.add(input.onDidTriggerItemButton(async (context) => {
                            resolve(undefined);
                            const { launch, config } = context.item;
                            await launch.openConfigFile({ preserveFocus: false, type: config.type, suppressInitialConfigs: true });
                            // Only Launch have a pin trigger button
                            await launch.writeConfiguration(config);
                            await this.selectConfiguration(launch, config.name);
                            this.removeRecentDynamicConfigurations(config.name, config.type);
                        }));
                        disposables.add(input.onDidHide(() => resolve(undefined)));
                    }).finally(() => token.cancel());
                    let items;
                    try {
                        // This await invokes the extension providers, which might fail due to several reasons,
                        // therefore we gate this logic under a try/catch to prevent leaving the Debug Tab
                        // selector in a borked state.
                        items = await this.getDynamicConfigurationsByType(type, token.token);
                    }
                    catch (err) {
                        this.logService.error(err);
                        disposables.dispose();
                        return;
                    }
                    input.items = items;
                    input.busy = false;
                    input.show();
                    const chosen = await chosenPromise;
                    disposables.dispose();
                    return chosen;
                }
            };
        });
    }
    async getDynamicConfigurationsByType(type, token = CancellationToken.None) {
        // Do a late 'onDebugDynamicConfigurationsName' activation so extensions are not activated too early #108578
        await this.adapterManager.activateDebuggers(ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME, type);
        const picks = [];
        const provider = this.configProviders.find(p => p.type === type && p.triggerKind === DebugConfigurationProviderTriggerKind.Dynamic && p.provideDebugConfigurations);
        this.getLaunches().forEach(launch => {
            if (provider) {
                picks.push(provider.provideDebugConfigurations(launch.workspace?.uri, token).then(configurations => configurations.map(config => ({
                    label: config.name,
                    description: launch.name,
                    config,
                    buttons: [{
                            iconClass: ThemeIcon.asClassName(debugConfigure),
                            tooltip: nls.localize('editLaunchConfig', "Edit Debug Configuration in launch.json")
                        }],
                    launch
                }))));
            }
        });
        return (await Promise.all(picks)).flat();
    }
    getAllConfigurations() {
        const all = [];
        for (const l of this.launches) {
            for (const name of l.getConfigurationNames()) {
                const config = l.getConfiguration(name) || l.getCompound(name);
                if (config) {
                    all.push({ launch: l, name, presentation: config.presentation });
                }
            }
        }
        return getVisibleAndSorted(all);
    }
    removeRecentDynamicConfigurations(name, type) {
        const remaining = this.getRecentDynamicConfigurations().filter(c => c.name !== name || c.type !== type);
        this.storageService.store(DEBUG_RECENT_DYNAMIC_CONFIGURATIONS, JSON.stringify(remaining), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        if (this.selectedConfiguration.name === name && this.selectedType === type && this.selectedDynamic) {
            this.selectConfiguration(undefined, undefined);
        }
        else {
            this._onDidSelectConfigurationName.fire();
        }
    }
    getRecentDynamicConfigurations() {
        return JSON.parse(this.storageService.get(DEBUG_RECENT_DYNAMIC_CONFIGURATIONS, 1 /* StorageScope.WORKSPACE */, '[]'));
    }
    registerListeners() {
        this.toDispose.push(Event.any(this.contextService.onDidChangeWorkspaceFolders, this.contextService.onDidChangeWorkbenchState)(() => {
            this.initLaunches();
            this.selectConfiguration(undefined);
            this.setCompoundSchemaValues();
        }));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('launch')) {
                // A change happen in the launch.json. If there is already a launch configuration selected, do not change the selection.
                await this.selectConfiguration(undefined);
                this.setCompoundSchemaValues();
            }
        }));
        this.toDispose.push(this.adapterManager.onDidDebuggersExtPointRead(() => {
            this.setCompoundSchemaValues();
        }));
    }
    initLaunches() {
        this.launches = this.contextService.getWorkspace().folders.map(folder => this.instantiationService.createInstance(Launch, this, this.adapterManager, folder));
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            this.launches.push(this.instantiationService.createInstance(WorkspaceLaunch, this, this.adapterManager));
        }
        this.launches.push(this.instantiationService.createInstance(UserLaunch, this, this.adapterManager));
        if (this.selectedLaunch && this.launches.indexOf(this.selectedLaunch) === -1) {
            this.selectConfiguration(undefined);
        }
    }
    setCompoundSchemaValues() {
        const compoundConfigurationsSchema = launchSchema.properties['compounds'].items.properties['configurations'];
        const launchNames = this.launches.map(l => l.getConfigurationNames(true)).reduce((first, second) => first.concat(second), []);
        compoundConfigurationsSchema.items.oneOf[0].enum = launchNames;
        compoundConfigurationsSchema.items.oneOf[1].properties.name.enum = launchNames;
        const folderNames = this.contextService.getWorkspace().folders.map(f => f.name);
        compoundConfigurationsSchema.items.oneOf[1].properties.folder.enum = folderNames;
        jsonRegistry.registerSchema(launchSchemaId, launchSchema);
    }
    getLaunches() {
        return this.launches;
    }
    getLaunch(workspaceUri) {
        if (!uri.isUri(workspaceUri)) {
            return undefined;
        }
        return this.launches.find(l => l.workspace && this.uriIdentityService.extUri.isEqual(l.workspace.uri, workspaceUri));
    }
    get selectedConfiguration() {
        return {
            launch: this.selectedLaunch,
            name: this.selectedName,
            getConfig: this.getSelectedConfig,
            type: this.selectedType
        };
    }
    get onDidSelectConfiguration() {
        return this._onDidSelectConfigurationName.event;
    }
    getWorkspaceLaunch() {
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            return this.launches[this.launches.length - 1];
        }
        return undefined;
    }
    async selectConfiguration(launch, name, config, dynamicConfig) {
        if (typeof launch === 'undefined') {
            const rootUri = this.historyService.getLastActiveWorkspaceRoot();
            launch = this.getLaunch(rootUri);
            if (!launch || launch.getConfigurationNames().length === 0) {
                launch = this.launches.find(l => !!(l && l.getConfigurationNames().length)) || launch || this.launches[0];
            }
        }
        const previousLaunch = this.selectedLaunch;
        const previousName = this.selectedName;
        const previousSelectedDynamic = this.selectedDynamic;
        this.selectedLaunch = launch;
        if (this.selectedLaunch) {
            this.storageService.store(DEBUG_SELECTED_ROOT, this.selectedLaunch.uri.toString(), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_SELECTED_ROOT, 1 /* StorageScope.WORKSPACE */);
        }
        const names = launch ? launch.getConfigurationNames() : [];
        this.getSelectedConfig = () => {
            const selected = this.selectedName ? launch?.getConfiguration(this.selectedName) : undefined;
            return Promise.resolve(selected || config);
        };
        let type = config?.type;
        if (name && names.indexOf(name) >= 0) {
            this.setSelectedLaunchName(name);
        }
        else if (dynamicConfig && dynamicConfig.type) {
            // We could not find the previously used name and config is not passed. We should get all dynamic configurations from providers
            // And potentially auto select the previously used dynamic configuration #96293
            type = dynamicConfig.type;
            if (!config) {
                const providers = (await this.getDynamicProviders()).filter(p => p.type === type);
                this.getSelectedConfig = async () => {
                    const activatedProviders = await Promise.all(providers.map(p => p.getProvider()));
                    const provider = activatedProviders.length > 0 ? activatedProviders[0] : undefined;
                    if (provider && launch && launch.workspace) {
                        const token = new CancellationTokenSource();
                        const dynamicConfigs = await provider.provideDebugConfigurations(launch.workspace.uri, token.token);
                        const dynamicConfig = dynamicConfigs.find(c => c.name === name);
                        if (dynamicConfig) {
                            return dynamicConfig;
                        }
                    }
                    return undefined;
                };
            }
            this.setSelectedLaunchName(name);
            let recentDynamicProviders = this.getRecentDynamicConfigurations();
            if (name && dynamicConfig.type) {
                // We need to store the recently used dynamic configurations to be able to show them in UI #110009
                recentDynamicProviders.unshift({ name, type: dynamicConfig.type });
                recentDynamicProviders = distinct(recentDynamicProviders, t => `${t.name} : ${t.type}`);
                this.storageService.store(DEBUG_RECENT_DYNAMIC_CONFIGURATIONS, JSON.stringify(recentDynamicProviders), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }
        else if (!this.selectedName || names.indexOf(this.selectedName) === -1) {
            // We could not find the configuration to select, pick the first one, or reset the selection if there is no launch configuration
            const nameToSet = names.length ? names[0] : undefined;
            this.setSelectedLaunchName(nameToSet);
        }
        if (!config && launch && this.selectedName) {
            config = launch.getConfiguration(this.selectedName);
            type = config?.type;
        }
        this.selectedType = dynamicConfig?.type || config?.type;
        this.selectedDynamic = !!dynamicConfig;
        // Only store the selected type if we are having a dynamic configuration. Otherwise restoring this configuration from storage might be misindentified as a dynamic configuration
        this.storageService.store(DEBUG_SELECTED_TYPE, dynamicConfig ? this.selectedType : undefined, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        if (type) {
            this.debugConfigurationTypeContext.set(type);
        }
        else {
            this.debugConfigurationTypeContext.reset();
        }
        if (this.selectedLaunch !== previousLaunch || this.selectedName !== previousName || previousSelectedDynamic !== this.selectedDynamic) {
            this._onDidSelectConfigurationName.fire();
        }
    }
    setSelectedLaunchName(selectedName) {
        this.selectedName = selectedName;
        if (this.selectedName) {
            this.storageService.store(DEBUG_SELECTED_CONFIG_NAME_KEY, this.selectedName, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_SELECTED_CONFIG_NAME_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
    dispose() {
        this.toDispose = dispose(this.toDispose);
    }
};
ConfigurationManager = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, IExtensionService),
    __param(7, IHistoryService),
    __param(8, IUriIdentityService),
    __param(9, IContextKeyService),
    __param(10, ILogService)
], ConfigurationManager);
export { ConfigurationManager };
class AbstractLaunch {
    constructor(configurationManager, adapterManager) {
        this.configurationManager = configurationManager;
        this.adapterManager = adapterManager;
    }
    getCompound(name) {
        const config = this.getDeduplicatedConfig();
        if (!config || !config.compounds) {
            return undefined;
        }
        return config.compounds.find(compound => compound.name === name);
    }
    getConfigurationNames(ignoreCompoundsAndPresentation = false) {
        const config = this.getDeduplicatedConfig();
        if (!config || (!Array.isArray(config.configurations) && !Array.isArray(config.compounds))) {
            return [];
        }
        else {
            const configurations = [];
            if (config.configurations) {
                configurations.push(...config.configurations.filter(cfg => cfg && typeof cfg.name === 'string'));
            }
            if (ignoreCompoundsAndPresentation) {
                return configurations.map(c => c.name);
            }
            if (config.compounds) {
                configurations.push(...config.compounds.filter(compound => typeof compound.name === 'string' && compound.configurations && compound.configurations.length));
            }
            return getVisibleAndSorted(configurations).map(c => c.name);
        }
    }
    getConfiguration(name) {
        // We need to clone the configuration in order to be able to make changes to it #42198
        const config = this.getDeduplicatedConfig();
        if (!config || !config.configurations) {
            return undefined;
        }
        const configuration = config.configurations.find(config => config && config.name === name);
        if (!configuration) {
            return;
        }
        if (this instanceof UserLaunch) {
            return { ...configuration, __configurationTarget: 2 /* ConfigurationTarget.USER */ };
        }
        else if (this instanceof WorkspaceLaunch) {
            return { ...configuration, __configurationTarget: 5 /* ConfigurationTarget.WORKSPACE */ };
        }
        else {
            return { ...configuration, __configurationTarget: 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ };
        }
    }
    async getInitialConfigurationContent(folderUri, type, useInitialConfigs, token) {
        let content = '';
        const adapter = type
            ? { debugger: this.adapterManager.getEnabledDebugger(type) }
            : await this.adapterManager.guessDebugger(true);
        if (adapter?.withConfig && adapter.debugger) {
            content = await adapter.debugger.getInitialConfigurationContent([adapter.withConfig.config]);
        }
        else if (adapter?.debugger) {
            const initialConfigs = useInitialConfigs ?
                await this.configurationManager.provideDebugConfigurations(folderUri, adapter.debugger.type, token || CancellationToken.None) :
                [];
            content = await adapter.debugger.getInitialConfigurationContent(initialConfigs);
        }
        return content;
    }
    get hidden() {
        return false;
    }
    getDeduplicatedConfig() {
        const original = this.getConfig();
        return original && {
            version: original.version,
            compounds: original.compounds && distinguishConfigsByName(original.compounds),
            configurations: original.configurations && distinguishConfigsByName(original.configurations),
        };
    }
}
function distinguishConfigsByName(things) {
    const seen = new Map();
    return things.map(thing => {
        const no = seen.get(thing.name) || 0;
        seen.set(thing.name, no + 1);
        return no === 0 ? thing : { ...thing, name: `${thing.name} (${no})` };
    });
}
let Launch = class Launch extends AbstractLaunch {
    constructor(configurationManager, adapterManager, workspace, fileService, textFileService, editorService, configurationService) {
        super(configurationManager, adapterManager);
        this.workspace = workspace;
        this.fileService = fileService;
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.configurationService = configurationService;
    }
    get uri() {
        return resources.joinPath(this.workspace.uri, '/.vscode/launch.json');
    }
    get name() {
        return this.workspace.name;
    }
    getConfig() {
        return this.configurationService.inspect('launch', { resource: this.workspace.uri }).workspaceFolderValue;
    }
    async openConfigFile({ preserveFocus, type, suppressInitialConfigs }, token) {
        const resource = this.uri;
        let created = false;
        let content = '';
        try {
            const fileContent = await this.fileService.readFile(resource);
            content = fileContent.value.toString();
        }
        catch {
            // launch.json not found: create one by collecting launch configs from debugConfigProviders
            content = await this.getInitialConfigurationContent(this.workspace.uri, type, !suppressInitialConfigs, token);
            if (!content) {
                // Cancelled
                return { editor: null, created: false };
            }
            created = true; // pin only if config file is created #8727
            try {
                await this.textFileService.write(resource, content);
            }
            catch (error) {
                throw new Error(nls.localize('DebugConfig.failed', "Unable to create 'launch.json' file inside the '.vscode' folder ({0}).", error.message));
            }
        }
        const index = content.indexOf(`"${this.configurationManager.selectedConfiguration.name}"`);
        let startLineNumber = 1;
        for (let i = 0; i < index; i++) {
            if (content.charAt(i) === '\n') {
                startLineNumber++;
            }
        }
        const selection = startLineNumber > 1 ? { startLineNumber, startColumn: 4 } : undefined;
        const editor = await this.editorService.openEditor({
            resource,
            options: {
                selection,
                preserveFocus,
                pinned: created,
                revealIfVisible: true
            },
        }, ACTIVE_GROUP);
        return ({
            editor: editor ?? null,
            created
        });
    }
    async writeConfiguration(configuration) {
        // note: we don't get the deduplicated config since we don't want that to 'leak' into the file
        const fullConfig = this.getConfig() || {};
        fullConfig.configurations = [...fullConfig.configurations || [], configuration];
        await this.configurationService.updateValue('launch', fullConfig, { resource: this.workspace.uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
    }
};
Launch = __decorate([
    __param(3, IFileService),
    __param(4, ITextFileService),
    __param(5, IEditorService),
    __param(6, IConfigurationService)
], Launch);
let WorkspaceLaunch = class WorkspaceLaunch extends AbstractLaunch {
    constructor(configurationManager, adapterManager, editorService, configurationService, contextService) {
        super(configurationManager, adapterManager);
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.contextService = contextService;
    }
    get workspace() {
        return undefined;
    }
    get uri() {
        return this.contextService.getWorkspace().configuration;
    }
    get name() {
        return nls.localize('workspace', "workspace");
    }
    getConfig() {
        return this.configurationService.inspect('launch').workspaceValue;
    }
    async openConfigFile({ preserveFocus, type, useInitialConfigs }, token) {
        const launchExistInFile = !!this.getConfig();
        if (!launchExistInFile) {
            // Launch property in workspace config not found: create one by collecting launch configs from debugConfigProviders
            const content = await this.getInitialConfigurationContent(undefined, type, useInitialConfigs, token);
            if (content) {
                await this.configurationService.updateValue('launch', json.parse(content), 5 /* ConfigurationTarget.WORKSPACE */);
            }
            else {
                return { editor: null, created: false };
            }
        }
        const editor = await this.editorService.openEditor({
            resource: this.contextService.getWorkspace().configuration,
            options: { preserveFocus }
        }, ACTIVE_GROUP);
        return ({
            editor: editor ?? null,
            created: false
        });
    }
};
WorkspaceLaunch = __decorate([
    __param(2, IEditorService),
    __param(3, IConfigurationService),
    __param(4, IWorkspaceContextService)
], WorkspaceLaunch);
let UserLaunch = class UserLaunch extends AbstractLaunch {
    constructor(configurationManager, adapterManager, configurationService, preferencesService) {
        super(configurationManager, adapterManager);
        this.configurationService = configurationService;
        this.preferencesService = preferencesService;
    }
    get workspace() {
        return undefined;
    }
    get uri() {
        return this.preferencesService.userSettingsResource;
    }
    get name() {
        return nls.localize('user settings', "user settings");
    }
    get hidden() {
        return true;
    }
    getConfig() {
        return this.configurationService.inspect('launch').userValue;
    }
    async openConfigFile({ preserveFocus, type, useInitialContent }) {
        const editor = await this.preferencesService.openUserSettings({ jsonEditor: true, preserveFocus, revealSetting: { key: 'launch' } });
        return ({
            editor: editor ?? null,
            created: false
        });
    }
};
UserLaunch = __decorate([
    __param(2, IConfigurationService),
    __param(3, IPreferencesService)
], UserLaunch);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb25maWd1cmF0aW9uTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnQ29uZmlndXJhdGlvbk1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFFeEQsT0FBTyxFQUFFLGVBQWUsRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RixPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxP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