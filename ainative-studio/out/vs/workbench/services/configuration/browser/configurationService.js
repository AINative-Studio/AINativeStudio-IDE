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
import { URI } from '../../../../base/common/uri.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { equals } from '../../../../base/common/objects.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Queue, Barrier, Promises, Delayer } from '../../../../base/common/async.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { IWorkspaceContextService, Workspace as BaseWorkspace, toWorkspaceFolder, isWorkspaceFolder, isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier } from '../../../../platform/workspace/common/workspace.js';
import { ConfigurationModel, ConfigurationChangeEvent, mergeChanges } from '../../../../platform/configuration/common/configurationModels.js';
import { isConfigurationOverrides, ConfigurationTargetToString, isConfigurationUpdateOverrides, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { NullPolicyConfiguration, PolicyConfiguration } from '../../../../platform/configuration/common/configurations.js';
import { Configuration } from '../common/configurationModels.js';
import { FOLDER_CONFIG_FOLDER_NAME, defaultSettingsSchemaId, userSettingsSchemaId, workspaceSettingsSchemaId, folderSettingsSchemaId, machineSettingsSchemaId, LOCAL_MACHINE_SCOPES, PROFILE_SCOPES, LOCAL_MACHINE_PROFILE_SCOPES, profileSettingsSchemaId, APPLY_ALL_PROFILES_SETTING, APPLICATION_SCOPES } from '../common/configuration.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, allSettings, windowSettings, resourceSettings, applicationSettings, machineSettings, machineOverridableSettings, keyFromOverrideIdentifiers, OVERRIDE_PROPERTY_PATTERN, resourceLanguageSettingsSchemaId, configurationDefaultsSchemaId, applicationMachineSettings } from '../../../../platform/configuration/common/configurationRegistry.js';
import { isStoredWorkspaceFolder, getStoredWorkspaceFolder, toWorkspaceFolders } from '../../../../platform/workspaces/common/workspaces.js';
import { ConfigurationEditing } from '../common/configurationEditing.js';
import { WorkspaceConfiguration, FolderConfiguration, RemoteUserConfiguration, UserConfiguration, DefaultConfiguration, ApplicationConfiguration } from './configuration.js';
import { mark } from '../../../../base/common/performance.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { delta, distinct, equals as arrayEquals } from '../../../../base/common/arrays.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IWorkbenchAssignmentService } from '../../assignment/common/assignmentService.js';
import { isUndefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { NullPolicyService } from '../../../../platform/policy/common/policy.js';
import { IJSONEditingService } from '../common/jsonEditing.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { runWhenWindowIdle } from '../../../../base/browser/dom.js';
function getLocalUserConfigurationScopes(userDataProfile, hasRemote) {
    const isDefaultProfile = userDataProfile.isDefault || userDataProfile.useDefaultFlags?.settings;
    if (isDefaultProfile) {
        return hasRemote ? LOCAL_MACHINE_SCOPES : undefined;
    }
    return hasRemote ? LOCAL_MACHINE_PROFILE_SCOPES : PROFILE_SCOPES;
}
class Workspace extends BaseWorkspace {
    constructor() {
        super(...arguments);
        this.initialized = false;
    }
}
export class WorkspaceService extends Disposable {
    get restrictedSettings() { return this._restrictedSettings; }
    constructor({ remoteAuthority, configurationCache }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, policyService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.fileService = fileService;
        this.remoteAgentService = remoteAgentService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.initialized = false;
        this.applicationConfiguration = null;
        this.remoteUserConfiguration = null;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._onWillChangeWorkspaceFolders = this._register(new Emitter());
        this.onWillChangeWorkspaceFolders = this._onWillChangeWorkspaceFolders.event;
        this._onDidChangeWorkspaceFolders = this._register(new Emitter());
        this.onDidChangeWorkspaceFolders = this._onDidChangeWorkspaceFolders.event;
        this._onDidChangeWorkspaceName = this._register(new Emitter());
        this.onDidChangeWorkspaceName = this._onDidChangeWorkspaceName.event;
        this._onDidChangeWorkbenchState = this._register(new Emitter());
        this.onDidChangeWorkbenchState = this._onDidChangeWorkbenchState.event;
        this.isWorkspaceTrusted = true;
        this._restrictedSettings = { default: [] };
        this._onDidChangeRestrictedSettings = this._register(new Emitter());
        this.onDidChangeRestrictedSettings = this._onDidChangeRestrictedSettings.event;
        this.configurationRegistry = Registry.as(Extensions.Configuration);
        this.initRemoteUserConfigurationBarrier = new Barrier();
        this.completeWorkspaceBarrier = new Barrier();
        this.defaultConfiguration = this._register(new DefaultConfiguration(configurationCache, environmentService, logService));
        this.policyConfiguration = policyService instanceof NullPolicyService ? new NullPolicyConfiguration() : this._register(new PolicyConfiguration(this.defaultConfiguration, policyService, logService));
        this.configurationCache = configurationCache;
        this._configuration = new Configuration(this.defaultConfiguration.configurationModel, this.policyConfiguration.configurationModel, ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), this.workspace, logService);
        this.applicationConfigurationDisposables = this._register(new DisposableStore());
        this.createApplicationConfiguration();
        this.localUserConfiguration = this._register(new UserConfiguration(userDataProfileService.currentProfile.settingsResource, userDataProfileService.currentProfile.tasksResource, { scopes: getLocalUserConfigurationScopes(userDataProfileService.currentProfile, !!remoteAuthority) }, fileService, uriIdentityService, logService));
        this.cachedFolderConfigs = new ResourceMap();
        this._register(this.localUserConfiguration.onDidChangeConfiguration(userConfiguration => this.onLocalUserConfigurationChanged(userConfiguration)));
        if (remoteAuthority) {
            const remoteUserConfiguration = this.remoteUserConfiguration = this._register(new RemoteUserConfiguration(remoteAuthority, configurationCache, fileService, uriIdentityService, remoteAgentService, logService));
            this._register(remoteUserConfiguration.onDidInitialize(remoteUserConfigurationModel => {
                this._register(remoteUserConfiguration.onDidChangeConfiguration(remoteUserConfigurationModel => this.onRemoteUserConfigurationChanged(remoteUserConfigurationModel)));
                this.onRemoteUserConfigurationChanged(remoteUserConfigurationModel);
                this.initRemoteUserConfigurationBarrier.open();
            }));
        }
        else {
            this.initRemoteUserConfigurationBarrier.open();
        }
        this.workspaceConfiguration = this._register(new WorkspaceConfiguration(configurationCache, fileService, uriIdentityService, logService));
        this._register(this.workspaceConfiguration.onDidUpdateConfiguration(fromCache => {
            this.onWorkspaceConfigurationChanged(fromCache).then(() => {
                this.workspace.initialized = this.workspaceConfiguration.initialized;
                this.checkAndMarkWorkspaceComplete(fromCache);
            });
        }));
        this._register(this.defaultConfiguration.onDidChangeConfiguration(({ properties, defaults }) => this.onDefaultConfigurationChanged(defaults, properties)));
        this._register(this.policyConfiguration.onDidChangeConfiguration(configurationModel => this.onPolicyConfigurationChanged(configurationModel)));
        this._register(userDataProfileService.onDidChangeCurrentProfile(e => this.onUserDataProfileChanged(e)));
        this.workspaceEditingQueue = new Queue();
    }
    createApplicationConfiguration() {
        this.applicationConfigurationDisposables.clear();
        if (this.userDataProfileService.currentProfile.isDefault || this.userDataProfileService.currentProfile.useDefaultFlags?.settings) {
            this.applicationConfiguration = null;
        }
        else {
            this.applicationConfiguration = this.applicationConfigurationDisposables.add(this._register(new ApplicationConfiguration(this.userDataProfilesService, this.fileService, this.uriIdentityService, this.logService)));
            this.applicationConfigurationDisposables.add(this.applicationConfiguration.onDidChangeConfiguration(configurationModel => this.onApplicationConfigurationChanged(configurationModel)));
        }
    }
    // Workspace Context Service Impl
    async getCompleteWorkspace() {
        await this.completeWorkspaceBarrier.wait();
        return this.getWorkspace();
    }
    getWorkspace() {
        return this.workspace;
    }
    getWorkbenchState() {
        // Workspace has configuration file
        if (this.workspace.configuration) {
            return 3 /* WorkbenchState.WORKSPACE */;
        }
        // Folder has single root
        if (this.workspace.folders.length === 1) {
            return 2 /* WorkbenchState.FOLDER */;
        }
        // Empty
        return 1 /* WorkbenchState.EMPTY */;
    }
    getWorkspaceFolder(resource) {
        return this.workspace.getFolder(resource);
    }
    addFolders(foldersToAdd, index) {
        return this.updateFolders(foldersToAdd, [], index);
    }
    removeFolders(foldersToRemove) {
        return this.updateFolders([], foldersToRemove);
    }
    async updateFolders(foldersToAdd, foldersToRemove, index) {
        return this.workspaceEditingQueue.queue(() => this.doUpdateFolders(foldersToAdd, foldersToRemove, index));
    }
    isInsideWorkspace(resource) {
        return !!this.getWorkspaceFolder(resource);
    }
    isCurrentWorkspace(workspaceIdOrFolder) {
        switch (this.getWorkbenchState()) {
            case 2 /* WorkbenchState.FOLDER */: {
                let folderUri = undefined;
                if (URI.isUri(workspaceIdOrFolder)) {
                    folderUri = workspaceIdOrFolder;
                }
                else if (isSingleFolderWorkspaceIdentifier(workspaceIdOrFolder)) {
                    folderUri = workspaceIdOrFolder.uri;
                }
                return URI.isUri(folderUri) && this.uriIdentityService.extUri.isEqual(folderUri, this.workspace.folders[0].uri);
            }
            case 3 /* WorkbenchState.WORKSPACE */:
                return isWorkspaceIdentifier(workspaceIdOrFolder) && this.workspace.id === workspaceIdOrFolder.id;
        }
        return false;
    }
    async doUpdateFolders(foldersToAdd, foldersToRemove, index) {
        if (this.getWorkbenchState() !== 3 /* WorkbenchState.WORKSPACE */) {
            return Promise.resolve(undefined); // we need a workspace to begin with
        }
        if (foldersToAdd.length + foldersToRemove.length === 0) {
            return Promise.resolve(undefined); // nothing to do
        }
        let foldersHaveChanged = false;
        // Remove first (if any)
        let currentWorkspaceFolders = this.getWorkspace().folders;
        let newStoredFolders = currentWorkspaceFolders.map(f => f.raw).filter((folder, index) => {
            if (!isStoredWorkspaceFolder(folder)) {
                return true; // keep entries which are unrelated
            }
            return !this.contains(foldersToRemove, currentWorkspaceFolders[index].uri); // keep entries which are unrelated
        });
        foldersHaveChanged = currentWorkspaceFolders.length !== newStoredFolders.length;
        // Add afterwards (if any)
        if (foldersToAdd.length) {
            // Recompute current workspace folders if we have folders to add
            const workspaceConfigPath = this.getWorkspace().configuration;
            const workspaceConfigFolder = this.uriIdentityService.extUri.dirname(workspaceConfigPath);
            currentWorkspaceFolders = toWorkspaceFolders(newStoredFolders, workspaceConfigPath, this.uriIdentityService.extUri);
            const currentWorkspaceFolderUris = currentWorkspaceFolders.map(folder => folder.uri);
            const storedFoldersToAdd = [];
            for (const folderToAdd of foldersToAdd) {
                const folderURI = folderToAdd.uri;
                if (this.contains(currentWorkspaceFolderUris, folderURI)) {
                    continue; // already existing
                }
                try {
                    const result = await this.fileService.stat(folderURI);
                    if (!result.isDirectory) {
                        continue;
                    }
                }
                catch (e) { /* Ignore */ }
                storedFoldersToAdd.push(getStoredWorkspaceFolder(folderURI, false, folderToAdd.name, workspaceConfigFolder, this.uriIdentityService.extUri));
            }
            // Apply to array of newStoredFolders
            if (storedFoldersToAdd.length > 0) {
                foldersHaveChanged = true;
                if (typeof index === 'number' && index >= 0 && index < newStoredFolders.length) {
                    newStoredFolders = newStoredFolders.slice(0);
                    newStoredFolders.splice(index, 0, ...storedFoldersToAdd);
                }
                else {
                    newStoredFolders = [...newStoredFolders, ...storedFoldersToAdd];
                }
            }
        }
        // Set folders if we recorded a change
        if (foldersHaveChanged) {
            return this.setFolders(newStoredFolders);
        }
        return Promise.resolve(undefined);
    }
    async setFolders(folders) {
        if (!this.instantiationService) {
            throw new Error('Cannot update workspace folders because workspace service is not yet ready to accept writes.');
        }
        await this.instantiationService.invokeFunction(accessor => this.workspaceConfiguration.setFolders(folders, accessor.get(IJSONEditingService)));
        return this.onWorkspaceConfigurationChanged(false);
    }
    contains(resources, toCheck) {
        return resources.some(resource => this.uriIdentityService.extUri.isEqual(resource, toCheck));
    }
    // Workspace Configuration Service Impl
    getConfigurationData() {
        return this._configuration.toData();
    }
    getValue(arg1, arg2) {
        const section = typeof arg1 === 'string' ? arg1 : undefined;
        const overrides = isConfigurationOverrides(arg1) ? arg1 : isConfigurationOverrides(arg2) ? arg2 : undefined;
        return this._configuration.getValue(section, overrides);
    }
    async updateValue(key, value, arg3, arg4, options) {
        const overrides = isConfigurationUpdateOverrides(arg3) ? arg3
            : isConfigurationOverrides(arg3) ? { resource: arg3.resource, overrideIdentifiers: arg3.overrideIdentifier ? [arg3.overrideIdentifier] : undefined } : undefined;
        const target = overrides ? arg4 : arg3;
        const targets = target ? [target] : [];
        if (overrides?.overrideIdentifiers) {
            overrides.overrideIdentifiers = distinct(overrides.overrideIdentifiers);
            overrides.overrideIdentifiers = overrides.overrideIdentifiers.length ? overrides.overrideIdentifiers : undefined;
        }
        if (!targets.length) {
            if (overrides?.overrideIdentifiers && overrides.overrideIdentifiers.length > 1) {
                throw new Error('Configuration Target is required while updating the value for multiple override identifiers');
            }
            const inspect = this.inspect(key, { resource: overrides?.resource, overrideIdentifier: overrides?.overrideIdentifiers ? overrides.overrideIdentifiers[0] : undefined });
            targets.push(...this.deriveConfigurationTargets(key, value, inspect));
            // Remove the setting, if the value is same as default value and is updated only in user target
            if (equals(value, inspect.defaultValue) && targets.length === 1 && (targets[0] === 2 /* ConfigurationTarget.USER */ || targets[0] === 3 /* ConfigurationTarget.USER_LOCAL */)) {
                value = undefined;
            }
        }
        await Promises.settled(targets.map(target => this.writeConfigurationValue(key, value, target, overrides, options)));
    }
    async reloadConfiguration(target) {
        if (target === undefined) {
            this.reloadDefaultConfiguration();
            const application = await this.reloadApplicationConfiguration(true);
            const { local, remote } = await this.reloadUserConfiguration();
            await this.reloadWorkspaceConfiguration();
            await this.loadConfiguration(application, local, remote, true);
            return;
        }
        if (isWorkspaceFolder(target)) {
            await this.reloadWorkspaceFolderConfiguration(target);
            return;
        }
        switch (target) {
            case 7 /* ConfigurationTarget.DEFAULT */:
                this.reloadDefaultConfiguration();
                return;
            case 2 /* ConfigurationTarget.USER */: {
                const { local, remote } = await this.reloadUserConfiguration();
                await this.loadConfiguration(this._configuration.applicationConfiguration, local, remote, true);
                return;
            }
            case 3 /* ConfigurationTarget.USER_LOCAL */:
                await this.reloadLocalUserConfiguration();
                return;
            case 4 /* ConfigurationTarget.USER_REMOTE */:
                await this.reloadRemoteUserConfiguration();
                return;
            case 5 /* ConfigurationTarget.WORKSPACE */:
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                await this.reloadWorkspaceConfiguration();
                return;
        }
    }
    hasCachedConfigurationDefaultsOverrides() {
        return this.defaultConfiguration.hasCachedConfigurationDefaultsOverrides();
    }
    inspect(key, overrides) {
        return this._configuration.inspect(key, overrides);
    }
    keys() {
        return this._configuration.keys();
    }
    async whenRemoteConfigurationLoaded() {
        await this.initRemoteUserConfigurationBarrier.wait();
    }
    /**
     * At present, all workspaces (empty, single-folder, multi-root) in local and remote
     * can be initialized without requiring extension host except following case:
     *
     * A multi root workspace with .code-workspace file that has to be resolved by an extension.
     * Because of readonly `rootPath` property in extension API we have to resolve multi root workspace
     * before extension host starts so that `rootPath` can be set to first folder.
     *
     * This restriction is lifted partially for web in `MainThreadWorkspace`.
     * In web, we start extension host with empty `rootPath` in this case.
     *
     * Related root path issue discussion is being tracked here - https://github.com/microsoft/vscode/issues/69335
     */
    async initialize(arg) {
        mark('code/willInitWorkspaceService');
        const trigger = this.initialized;
        this.initialized = false;
        const workspace = await this.createWorkspace(arg);
        await this.updateWorkspaceAndInitializeConfiguration(workspace, trigger);
        this.checkAndMarkWorkspaceComplete(false);
        mark('code/didInitWorkspaceService');
    }
    updateWorkspaceTrust(trusted) {
        if (this.isWorkspaceTrusted !== trusted) {
            this.isWorkspaceTrusted = trusted;
            const data = this._configuration.toData();
            const folderConfigurationModels = [];
            for (const folder of this.workspace.folders) {
                const folderConfiguration = this.cachedFolderConfigs.get(folder.uri);
                let configurationModel;
                if (folderConfiguration) {
                    configurationModel = folderConfiguration.updateWorkspaceTrust(this.isWorkspaceTrusted);
                    this._configuration.updateFolderConfiguration(folder.uri, configurationModel);
                }
                folderConfigurationModels.push(configurationModel);
            }
            if (this.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                if (folderConfigurationModels[0]) {
                    this._configuration.updateWorkspaceConfiguration(folderConfigurationModels[0]);
                }
            }
            else {
                this._configuration.updateWorkspaceConfiguration(this.workspaceConfiguration.updateWorkspaceTrust(this.isWorkspaceTrusted));
            }
            this.updateRestrictedSettings();
            let keys = [];
            if (this.restrictedSettings.userLocal) {
                keys.push(...this.restrictedSettings.userLocal);
            }
            if (this.restrictedSettings.userRemote) {
                keys.push(...this.restrictedSettings.userRemote);
            }
            if (this.restrictedSettings.workspace) {
                keys.push(...this.restrictedSettings.workspace);
            }
            this.restrictedSettings.workspaceFolder?.forEach((value) => keys.push(...value));
            keys = distinct(keys);
            if (keys.length) {
                this.triggerConfigurationChange({ keys, overrides: [] }, { data, workspace: this.workspace }, 5 /* ConfigurationTarget.WORKSPACE */);
            }
        }
    }
    acquireInstantiationService(instantiationService) {
        this.instantiationService = instantiationService;
    }
    isSettingAppliedForAllProfiles(key) {
        const scope = this.configurationRegistry.getConfigurationProperties()[key]?.scope;
        if (scope && APPLICATION_SCOPES.includes(scope)) {
            return true;
        }
        const allProfilesSettings = this.getValue(APPLY_ALL_PROFILES_SETTING) ?? [];
        return Array.isArray(allProfilesSettings) && allProfilesSettings.includes(key);
    }
    async createWorkspace(arg) {
        if (isWorkspaceIdentifier(arg)) {
            return this.createMultiFolderWorkspace(arg);
        }
        if (isSingleFolderWorkspaceIdentifier(arg)) {
            return this.createSingleFolderWorkspace(arg);
        }
        return this.createEmptyWorkspace(arg);
    }
    async createMultiFolderWorkspace(workspaceIdentifier) {
        await this.workspaceConfiguration.initialize({ id: workspaceIdentifier.id, configPath: workspaceIdentifier.configPath }, this.isWorkspaceTrusted);
        const workspaceConfigPath = workspaceIdentifier.configPath;
        const workspaceFolders = toWorkspaceFolders(this.workspaceConfiguration.getFolders(), workspaceConfigPath, this.uriIdentityService.extUri);
        const workspaceId = workspaceIdentifier.id;
        const workspace = new Workspace(workspaceId, workspaceFolders, this.workspaceConfiguration.isTransient(), workspaceConfigPath, uri => this.uriIdentityService.extUri.ignorePathCasing(uri));
        workspace.initialized = this.workspaceConfiguration.initialized;
        return workspace;
    }
    createSingleFolderWorkspace(singleFolderWorkspaceIdentifier) {
        const workspace = new Workspace(singleFolderWorkspaceIdentifier.id, [toWorkspaceFolder(singleFolderWorkspaceIdentifier.uri)], false, null, uri => this.uriIdentityService.extUri.ignorePathCasing(uri));
        workspace.initialized = true;
        return workspace;
    }
    createEmptyWorkspace(emptyWorkspaceIdentifier) {
        const workspace = new Workspace(emptyWorkspaceIdentifier.id, [], false, null, uri => this.uriIdentityService.extUri.ignorePathCasing(uri));
        workspace.initialized = true;
        return Promise.resolve(workspace);
    }
    checkAndMarkWorkspaceComplete(fromCache) {
        if (!this.completeWorkspaceBarrier.isOpen() && this.workspace.initialized) {
            this.completeWorkspaceBarrier.open();
            this.validateWorkspaceFoldersAndReload(fromCache);
        }
    }
    async updateWorkspaceAndInitializeConfiguration(workspace, trigger) {
        const hasWorkspaceBefore = !!this.workspace;
        let previousState;
        let previousWorkspacePath;
        let previousFolders = [];
        if (hasWorkspaceBefore) {
            previousState = this.getWorkbenchState();
            previousWorkspacePath = this.workspace.configuration ? this.workspace.configuration.fsPath : undefined;
            previousFolders = this.workspace.folders;
            this.workspace.update(workspace);
        }
        else {
            this.workspace = workspace;
        }
        await this.initializeConfiguration(trigger);
        // Trigger changes after configuration initialization so that configuration is up to date.
        if (hasWorkspaceBefore) {
            const newState = this.getWorkbenchState();
            if (previousState && newState !== previousState) {
                this._onDidChangeWorkbenchState.fire(newState);
            }
            const newWorkspacePath = this.workspace.configuration ? this.workspace.configuration.fsPath : undefined;
            if (previousWorkspacePath && newWorkspacePath !== previousWorkspacePath || newState !== previousState) {
                this._onDidChangeWorkspaceName.fire();
            }
            const folderChanges = this.compareFolders(previousFolders, this.workspace.folders);
            if (folderChanges && (folderChanges.added.length || folderChanges.removed.length || folderChanges.changed.length)) {
                await this.handleWillChangeWorkspaceFolders(folderChanges, false);
                this._onDidChangeWorkspaceFolders.fire(folderChanges);
            }
        }
        if (!this.localUserConfiguration.hasTasksLoaded) {
            // Reload local user configuration again to load user tasks
            this._register(runWhenWindowIdle(mainWindow, () => this.reloadLocalUserConfiguration(false, this._configuration.localUserConfiguration)));
        }
    }
    compareFolders(currentFolders, newFolders) {
        const result = { added: [], removed: [], changed: [] };
        result.added = newFolders.filter(newFolder => !currentFolders.some(currentFolder => newFolder.uri.toString() === currentFolder.uri.toString()));
        for (let currentIndex = 0; currentIndex < currentFolders.length; currentIndex++) {
            const currentFolder = currentFolders[currentIndex];
            let newIndex = 0;
            for (newIndex = 0; newIndex < newFolders.length && currentFolder.uri.toString() !== newFolders[newIndex].uri.toString(); newIndex++) { }
            if (newIndex < newFolders.length) {
                if (currentIndex !== newIndex || currentFolder.name !== newFolders[newIndex].name) {
                    result.changed.push(currentFolder);
                }
            }
            else {
                result.removed.push(currentFolder);
            }
        }
        return result;
    }
    async initializeConfiguration(trigger) {
        await this.defaultConfiguration.initialize();
        const initPolicyConfigurationPromise = this.policyConfiguration.initialize();
        const initApplicationConfigurationPromise = this.applicationConfiguration ? this.applicationConfiguration.initialize() : Promise.resolve(ConfigurationModel.createEmptyModel(this.logService));
        const initUserConfiguration = async () => {
            mark('code/willInitUserConfiguration');
            const result = await Promise.all([this.localUserConfiguration.initialize(), this.remoteUserConfiguration ? this.remoteUserConfiguration.initialize() : Promise.resolve(ConfigurationModel.createEmptyModel(this.logService))]);
            if (this.applicationConfiguration) {
                const applicationConfigurationModel = await initApplicationConfigurationPromise;
                result[0] = this.localUserConfiguration.reparse({ exclude: applicationConfigurationModel.getValue(APPLY_ALL_PROFILES_SETTING) });
            }
            mark('code/didInitUserConfiguration');
            return result;
        };
        const [, application, [local, remote]] = await Promise.all([
            initPolicyConfigurationPromise,
            initApplicationConfigurationPromise,
            initUserConfiguration()
        ]);
        mark('code/willInitWorkspaceConfiguration');
        await this.loadConfiguration(application, local, remote, trigger);
        mark('code/didInitWorkspaceConfiguration');
    }
    reloadDefaultConfiguration() {
        this.onDefaultConfigurationChanged(this.defaultConfiguration.reload());
    }
    async reloadApplicationConfiguration(donotTrigger) {
        if (!this.applicationConfiguration) {
            return ConfigurationModel.createEmptyModel(this.logService);
        }
        const model = await this.applicationConfiguration.loadConfiguration();
        if (!donotTrigger) {
            this.onApplicationConfigurationChanged(model);
        }
        return model;
    }
    async reloadUserConfiguration() {
        const [local, remote] = await Promise.all([this.reloadLocalUserConfiguration(true), this.reloadRemoteUserConfiguration(true)]);
        return { local, remote };
    }
    async reloadLocalUserConfiguration(donotTrigger, settingsConfiguration) {
        const model = await this.localUserConfiguration.reload(settingsConfiguration);
        if (!donotTrigger) {
            this.onLocalUserConfigurationChanged(model);
        }
        return model;
    }
    async reloadRemoteUserConfiguration(donotTrigger) {
        if (this.remoteUserConfiguration) {
            const model = await this.remoteUserConfiguration.reload();
            if (!donotTrigger) {
                this.onRemoteUserConfigurationChanged(model);
            }
            return model;
        }
        return ConfigurationModel.createEmptyModel(this.logService);
    }
    async reloadWorkspaceConfiguration() {
        const workbenchState = this.getWorkbenchState();
        if (workbenchState === 2 /* WorkbenchState.FOLDER */) {
            return this.onWorkspaceFolderConfigurationChanged(this.workspace.folders[0]);
        }
        if (workbenchState === 3 /* WorkbenchState.WORKSPACE */) {
            return this.workspaceConfiguration.reload().then(() => this.onWorkspaceConfigurationChanged(false));
        }
    }
    reloadWorkspaceFolderConfiguration(folder) {
        return this.onWorkspaceFolderConfigurationChanged(folder);
    }
    async loadConfiguration(applicationConfigurationModel, userConfigurationModel, remoteUserConfigurationModel, trigger) {
        // reset caches
        this.cachedFolderConfigs = new ResourceMap();
        const folders = this.workspace.folders;
        const folderConfigurations = await this.loadFolderConfigurations(folders);
        const workspaceConfiguration = this.getWorkspaceConfigurationModel(folderConfigurations);
        const folderConfigurationModels = new ResourceMap();
        folderConfigurations.forEach((folderConfiguration, index) => folderConfigurationModels.set(folders[index].uri, folderConfiguration));
        const currentConfiguration = this._configuration;
        this._configuration = new Configuration(this.defaultConfiguration.configurationModel, this.policyConfiguration.configurationModel, applicationConfigurationModel, userConfigurationModel, remoteUserConfigurationModel, workspaceConfiguration, folderConfigurationModels, ConfigurationModel.createEmptyModel(this.logService), new ResourceMap(), this.workspace, this.logService);
        this.initialized = true;
        if (trigger) {
            const change = this._configuration.compare(currentConfiguration);
            this.triggerConfigurationChange(change, { data: currentConfiguration.toData(), workspace: this.workspace }, 5 /* ConfigurationTarget.WORKSPACE */);
        }
        this.updateRestrictedSettings();
    }
    getWorkspaceConfigurationModel(folderConfigurations) {
        switch (this.getWorkbenchState()) {
            case 2 /* WorkbenchState.FOLDER */:
                return folderConfigurations[0];
            case 3 /* WorkbenchState.WORKSPACE */:
                return this.workspaceConfiguration.getConfiguration();
            default:
                return ConfigurationModel.createEmptyModel(this.logService);
        }
    }
    onUserDataProfileChanged(e) {
        e.join((async () => {
            const promises = [];
            promises.push(this.localUserConfiguration.reset(e.profile.settingsResource, e.profile.tasksResource, { scopes: getLocalUserConfigurationScopes(e.profile, !!this.remoteUserConfiguration) }));
            if (e.previous.isDefault !== e.profile.isDefault
                || !!e.previous.useDefaultFlags?.settings !== !!e.profile.useDefaultFlags?.settings) {
                this.createApplicationConfiguration();
                if (this.applicationConfiguration) {
                    promises.push(this.reloadApplicationConfiguration(true));
                }
            }
            let [localUser, application] = await Promise.all(promises);
            application = application ?? this._configuration.applicationConfiguration;
            if (this.applicationConfiguration) {
                localUser = this.localUserConfiguration.reparse({ exclude: application.getValue(APPLY_ALL_PROFILES_SETTING) });
            }
            await this.loadConfiguration(application, localUser, this._configuration.remoteUserConfiguration, true);
        })());
    }
    onDefaultConfigurationChanged(configurationModel, properties) {
        if (this.workspace) {
            const previousData = this._configuration.toData();
            const change = this._configuration.compareAndUpdateDefaultConfiguration(configurationModel, properties);
            if (this.applicationConfiguration) {
                this._configuration.updateApplicationConfiguration(this.applicationConfiguration.reparse());
            }
            if (this.remoteUserConfiguration) {
                this._configuration.updateLocalUserConfiguration(this.localUserConfiguration.reparse());
                this._configuration.updateRemoteUserConfiguration(this.remoteUserConfiguration.reparse());
            }
            if (this.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                const folderConfiguration = this.cachedFolderConfigs.get(this.workspace.folders[0].uri);
                if (folderConfiguration) {
                    this._configuration.updateWorkspaceConfiguration(folderConfiguration.reparse());
                    this._configuration.updateFolderConfiguration(this.workspace.folders[0].uri, folderConfiguration.reparse());
                }
            }
            else {
                this._configuration.updateWorkspaceConfiguration(this.workspaceConfiguration.reparseWorkspaceSettings());
                for (const folder of this.workspace.folders) {
                    const folderConfiguration = this.cachedFolderConfigs.get(folder.uri);
                    if (folderConfiguration) {
                        this._configuration.updateFolderConfiguration(folder.uri, folderConfiguration.reparse());
                    }
                }
            }
            this.triggerConfigurationChange(change, { data: previousData, workspace: this.workspace }, 7 /* ConfigurationTarget.DEFAULT */);
            this.updateRestrictedSettings();
        }
    }
    onPolicyConfigurationChanged(policyConfiguration) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const change = this._configuration.compareAndUpdatePolicyConfiguration(policyConfiguration);
        this.triggerConfigurationChange(change, previous, 7 /* ConfigurationTarget.DEFAULT */);
    }
    onApplicationConfigurationChanged(applicationConfiguration) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const previousAllProfilesSettings = this._configuration.applicationConfiguration.getValue(APPLY_ALL_PROFILES_SETTING) ?? [];
        const change = this._configuration.compareAndUpdateApplicationConfiguration(applicationConfiguration);
        const currentAllProfilesSettings = this.getValue(APPLY_ALL_PROFILES_SETTING) ?? [];
        const configurationProperties = this.configurationRegistry.getConfigurationProperties();
        const changedKeys = [];
        for (const changedKey of change.keys) {
            const scope = configurationProperties[changedKey]?.scope;
            if (scope && APPLICATION_SCOPES.includes(scope)) {
                changedKeys.push(changedKey);
                if (changedKey === APPLY_ALL_PROFILES_SETTING) {
                    for (const previousAllProfileSetting of previousAllProfilesSettings) {
                        if (!currentAllProfilesSettings.includes(previousAllProfileSetting)) {
                            changedKeys.push(previousAllProfileSetting);
                        }
                    }
                    for (const currentAllProfileSetting of currentAllProfilesSettings) {
                        if (!previousAllProfilesSettings.includes(currentAllProfileSetting)) {
                            changedKeys.push(currentAllProfileSetting);
                        }
                    }
                }
            }
            else if (currentAllProfilesSettings.includes(changedKey)) {
                changedKeys.push(changedKey);
            }
        }
        change.keys = changedKeys;
        if (change.keys.includes(APPLY_ALL_PROFILES_SETTING)) {
            this._configuration.updateLocalUserConfiguration(this.localUserConfiguration.reparse({ exclude: currentAllProfilesSettings }));
        }
        this.triggerConfigurationChange(change, previous, 2 /* ConfigurationTarget.USER */);
    }
    onLocalUserConfigurationChanged(userConfiguration) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const change = this._configuration.compareAndUpdateLocalUserConfiguration(userConfiguration);
        this.triggerConfigurationChange(change, previous, 2 /* ConfigurationTarget.USER */);
    }
    onRemoteUserConfigurationChanged(userConfiguration) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const change = this._configuration.compareAndUpdateRemoteUserConfiguration(userConfiguration);
        this.triggerConfigurationChange(change, previous, 2 /* ConfigurationTarget.USER */);
    }
    async onWorkspaceConfigurationChanged(fromCache) {
        if (this.workspace && this.workspace.configuration) {
            let newFolders = toWorkspaceFolders(this.workspaceConfiguration.getFolders(), this.workspace.configuration, this.uriIdentityService.extUri);
            // Validate only if workspace is initialized
            if (this.workspace.initialized) {
                const { added, removed, changed } = this.compareFolders(this.workspace.folders, newFolders);
                /* If changed validate new folders */
                if (added.length || removed.length || changed.length) {
                    newFolders = await this.toValidWorkspaceFolders(newFolders);
                }
                /* Otherwise use existing */
                else {
                    newFolders = this.workspace.folders;
                }
            }
            await this.updateWorkspaceConfiguration(newFolders, this.workspaceConfiguration.getConfiguration(), fromCache);
        }
    }
    updateRestrictedSettings() {
        const changed = [];
        const allProperties = this.configurationRegistry.getConfigurationProperties();
        const defaultRestrictedSettings = Object.keys(allProperties).filter(key => allProperties[key].restricted).sort((a, b) => a.localeCompare(b));
        const defaultDelta = delta(defaultRestrictedSettings, this._restrictedSettings.default, (a, b) => a.localeCompare(b));
        changed.push(...defaultDelta.added, ...defaultDelta.removed);
        const application = (this.applicationConfiguration?.getRestrictedSettings() || []).sort((a, b) => a.localeCompare(b));
        const applicationDelta = delta(application, this._restrictedSettings.application || [], (a, b) => a.localeCompare(b));
        changed.push(...applicationDelta.added, ...applicationDelta.removed);
        const userLocal = this.localUserConfiguration.getRestrictedSettings().sort((a, b) => a.localeCompare(b));
        const userLocalDelta = delta(userLocal, this._restrictedSettings.userLocal || [], (a, b) => a.localeCompare(b));
        changed.push(...userLocalDelta.added, ...userLocalDelta.removed);
        const userRemote = (this.remoteUserConfiguration?.getRestrictedSettings() || []).sort((a, b) => a.localeCompare(b));
        const userRemoteDelta = delta(userRemote, this._restrictedSettings.userRemote || [], (a, b) => a.localeCompare(b));
        changed.push(...userRemoteDelta.added, ...userRemoteDelta.removed);
        const workspaceFolderMap = new ResourceMap();
        for (const workspaceFolder of this.workspace.folders) {
            const cachedFolderConfig = this.cachedFolderConfigs.get(workspaceFolder.uri);
            const folderRestrictedSettings = (cachedFolderConfig?.getRestrictedSettings() || []).sort((a, b) => a.localeCompare(b));
            if (folderRestrictedSettings.length) {
                workspaceFolderMap.set(workspaceFolder.uri, folderRestrictedSettings);
            }
            const previous = this._restrictedSettings.workspaceFolder?.get(workspaceFolder.uri) || [];
            const workspaceFolderDelta = delta(folderRestrictedSettings, previous, (a, b) => a.localeCompare(b));
            changed.push(...workspaceFolderDelta.added, ...workspaceFolderDelta.removed);
        }
        const workspace = this.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ ? this.workspaceConfiguration.getRestrictedSettings().sort((a, b) => a.localeCompare(b))
            : this.workspace.folders[0] ? (workspaceFolderMap.get(this.workspace.folders[0].uri) || []) : [];
        const workspaceDelta = delta(workspace, this._restrictedSettings.workspace || [], (a, b) => a.localeCompare(b));
        changed.push(...workspaceDelta.added, ...workspaceDelta.removed);
        if (changed.length) {
            this._restrictedSettings = {
                default: defaultRestrictedSettings,
                application: application.length ? application : undefined,
                userLocal: userLocal.length ? userLocal : undefined,
                userRemote: userRemote.length ? userRemote : undefined,
                workspace: workspace.length ? workspace : undefined,
                workspaceFolder: workspaceFolderMap.size ? workspaceFolderMap : undefined,
            };
            this._onDidChangeRestrictedSettings.fire(this.restrictedSettings);
        }
    }
    async updateWorkspaceConfiguration(workspaceFolders, configuration, fromCache) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const change = this._configuration.compareAndUpdateWorkspaceConfiguration(configuration);
        const changes = this.compareFolders(this.workspace.folders, workspaceFolders);
        if (changes.added.length || changes.removed.length || changes.changed.length) {
            this.workspace.folders = workspaceFolders;
            const change = await this.onFoldersChanged();
            await this.handleWillChangeWorkspaceFolders(changes, fromCache);
            this.triggerConfigurationChange(change, previous, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
            this._onDidChangeWorkspaceFolders.fire(changes);
        }
        else {
            this.triggerConfigurationChange(change, previous, 5 /* ConfigurationTarget.WORKSPACE */);
        }
        this.updateRestrictedSettings();
    }
    async handleWillChangeWorkspaceFolders(changes, fromCache) {
        const joiners = [];
        this._onWillChangeWorkspaceFolders.fire({
            join(updateWorkspaceTrustStatePromise) {
                joiners.push(updateWorkspaceTrustStatePromise);
            },
            changes,
            fromCache
        });
        try {
            await Promises.settled(joiners);
        }
        catch (error) { /* Ignore */ }
    }
    async onWorkspaceFolderConfigurationChanged(folder) {
        const [folderConfiguration] = await this.loadFolderConfigurations([folder]);
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const folderConfigurationChange = this._configuration.compareAndUpdateFolderConfiguration(folder.uri, folderConfiguration);
        if (this.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceConfigurationChange = this._configuration.compareAndUpdateWorkspaceConfiguration(folderConfiguration);
            this.triggerConfigurationChange(mergeChanges(folderConfigurationChange, workspaceConfigurationChange), previous, 5 /* ConfigurationTarget.WORKSPACE */);
        }
        else {
            this.triggerConfigurationChange(folderConfigurationChange, previous, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        }
        this.updateRestrictedSettings();
    }
    async onFoldersChanged() {
        const changes = [];
        // Remove the configurations of deleted folders
        for (const key of this.cachedFolderConfigs.keys()) {
            if (!this.workspace.folders.filter(folder => folder.uri.toString() === key.toString())[0]) {
                const folderConfiguration = this.cachedFolderConfigs.get(key);
                folderConfiguration.dispose();
                this.cachedFolderConfigs.delete(key);
                changes.push(this._configuration.compareAndDeleteFolderConfiguration(key));
            }
        }
        const toInitialize = this.workspace.folders.filter(folder => !this.cachedFolderConfigs.has(folder.uri));
        if (toInitialize.length) {
            const folderConfigurations = await this.loadFolderConfigurations(toInitialize);
            folderConfigurations.forEach((folderConfiguration, index) => {
                changes.push(this._configuration.compareAndUpdateFolderConfiguration(toInitialize[index].uri, folderConfiguration));
            });
        }
        return mergeChanges(...changes);
    }
    loadFolderConfigurations(folders) {
        return Promise.all([...folders.map(folder => {
                let folderConfiguration = this.cachedFolderConfigs.get(folder.uri);
                if (!folderConfiguration) {
                    folderConfiguration = new FolderConfiguration(!this.initialized, folder, FOLDER_CONFIG_FOLDER_NAME, this.getWorkbenchState(), this.isWorkspaceTrusted, this.fileService, this.uriIdentityService, this.logService, this.configurationCache);
                    this._register(folderConfiguration.onDidChange(() => this.onWorkspaceFolderConfigurationChanged(folder)));
                    this.cachedFolderConfigs.set(folder.uri, this._register(folderConfiguration));
                }
                return folderConfiguration.loadConfiguration();
            })]);
    }
    async validateWorkspaceFoldersAndReload(fromCache) {
        const validWorkspaceFolders = await this.toValidWorkspaceFolders(this.workspace.folders);
        const { removed } = this.compareFolders(this.workspace.folders, validWorkspaceFolders);
        if (removed.length) {
            await this.updateWorkspaceConfiguration(validWorkspaceFolders, this.workspaceConfiguration.getConfiguration(), fromCache);
        }
    }
    // Filter out workspace folders which are files (not directories)
    // Workspace folders those cannot be resolved are not filtered because they are handled by the Explorer.
    async toValidWorkspaceFolders(workspaceFolders) {
        const validWorkspaceFolders = [];
        for (const workspaceFolder of workspaceFolders) {
            try {
                const result = await this.fileService.stat(workspaceFolder.uri);
                if (!result.isDirectory) {
                    continue;
                }
            }
            catch (e) {
                this.logService.warn(`Ignoring the error while validating workspace folder ${workspaceFolder.uri.toString()} - ${toErrorMessage(e)}`);
            }
            validWorkspaceFolders.push(workspaceFolder);
        }
        return validWorkspaceFolders;
    }
    async writeConfigurationValue(key, value, target, overrides, options) {
        if (!this.instantiationService) {
            throw new Error('Cannot write configuration because the configuration service is not yet ready to accept writes.');
        }
        if (target === 7 /* ConfigurationTarget.DEFAULT */) {
            throw new Error('Invalid configuration target');
        }
        if (target === 8 /* ConfigurationTarget.MEMORY */) {
            const previous = { data: this._configuration.toData(), workspace: this.workspace };
            this._configuration.updateValue(key, value, overrides);
            this.triggerConfigurationChange({ keys: overrides?.overrideIdentifiers?.length ? [keyFromOverrideIdentifiers(overrides.overrideIdentifiers), key] : [key], overrides: overrides?.overrideIdentifiers?.length ? overrides.overrideIdentifiers.map(overrideIdentifier => ([overrideIdentifier, [key]])) : [] }, previous, target);
            return;
        }
        const editableConfigurationTarget = this.toEditableConfigurationTarget(target, key);
        if (!editableConfigurationTarget) {
            throw new Error('Invalid configuration target');
        }
        if (editableConfigurationTarget === 2 /* EditableConfigurationTarget.USER_REMOTE */ && !this.remoteUserConfiguration) {
            throw new Error('Invalid configuration target');
        }
        if (overrides?.overrideIdentifiers?.length && overrides.overrideIdentifiers.length > 1) {
            const configurationModel = this.getConfigurationModelForEditableConfigurationTarget(editableConfigurationTarget, overrides.resource);
            if (configurationModel) {
                const overrideIdentifiers = overrides.overrideIdentifiers.sort();
                const existingOverrides = configurationModel.overrides.find(override => arrayEquals([...override.identifiers].sort(), overrideIdentifiers));
                if (existingOverrides) {
                    overrides.overrideIdentifiers = existingOverrides.identifiers;
                }
            }
        }
        // Use same instance of ConfigurationEditing to make sure all writes go through the same queue
        this.configurationEditing = this.configurationEditing ?? this.createConfigurationEditingService(this.instantiationService);
        await (await this.configurationEditing).writeConfiguration(editableConfigurationTarget, { key, value }, { scopes: overrides, ...options });
        switch (editableConfigurationTarget) {
            case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                if (this.applicationConfiguration && this.isSettingAppliedForAllProfiles(key)) {
                    await this.reloadApplicationConfiguration();
                }
                else {
                    await this.reloadLocalUserConfiguration();
                }
                return;
            case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                return this.reloadRemoteUserConfiguration().then(() => undefined);
            case 3 /* EditableConfigurationTarget.WORKSPACE */:
                return this.reloadWorkspaceConfiguration();
            case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */: {
                const workspaceFolder = overrides && overrides.resource ? this.workspace.getFolder(overrides.resource) : null;
                if (workspaceFolder) {
                    return this.reloadWorkspaceFolderConfiguration(workspaceFolder);
                }
            }
        }
    }
    async createConfigurationEditingService(instantiationService) {
        const remoteSettingsResource = (await this.remoteAgentService.getEnvironment())?.settingsPath ?? null;
        return instantiationService.createInstance(ConfigurationEditing, remoteSettingsResource);
    }
    getConfigurationModelForEditableConfigurationTarget(target, resource) {
        switch (target) {
            case 1 /* EditableConfigurationTarget.USER_LOCAL */: return this._configuration.localUserConfiguration;
            case 2 /* EditableConfigurationTarget.USER_REMOTE */: return this._configuration.remoteUserConfiguration;
            case 3 /* EditableConfigurationTarget.WORKSPACE */: return this._configuration.workspaceConfiguration;
            case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */: return resource ? this._configuration.folderConfigurations.get(resource) : undefined;
        }
    }
    getConfigurationModel(target, resource) {
        switch (target) {
            case 3 /* ConfigurationTarget.USER_LOCAL */: return this._configuration.localUserConfiguration;
            case 4 /* ConfigurationTarget.USER_REMOTE */: return this._configuration.remoteUserConfiguration;
            case 5 /* ConfigurationTarget.WORKSPACE */: return this._configuration.workspaceConfiguration;
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */: return resource ? this._configuration.folderConfigurations.get(resource) : undefined;
            default: return undefined;
        }
    }
    deriveConfigurationTargets(key, value, inspect) {
        if (equals(value, inspect.value)) {
            return [];
        }
        const definedTargets = [];
        if (inspect.workspaceFolderValue !== undefined) {
            definedTargets.push(6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        }
        if (inspect.workspaceValue !== undefined) {
            definedTargets.push(5 /* ConfigurationTarget.WORKSPACE */);
        }
        if (inspect.userRemoteValue !== undefined) {
            definedTargets.push(4 /* ConfigurationTarget.USER_REMOTE */);
        }
        if (inspect.userLocalValue !== undefined) {
            definedTargets.push(3 /* ConfigurationTarget.USER_LOCAL */);
        }
        if (inspect.applicationValue !== undefined) {
            definedTargets.push(1 /* ConfigurationTarget.APPLICATION */);
        }
        if (value === undefined) {
            // Remove the setting in all defined targets
            return definedTargets;
        }
        return [definedTargets[0] || 2 /* ConfigurationTarget.USER */];
    }
    triggerConfigurationChange(change, previous, target) {
        if (change.keys.length) {
            if (target !== 7 /* ConfigurationTarget.DEFAULT */) {
                this.logService.debug(`Configuration keys changed in ${ConfigurationTargetToString(target)} target`, ...change.keys);
            }
            const configurationChangeEvent = new ConfigurationChangeEvent(change, previous, this._configuration, this.workspace, this.logService);
            configurationChangeEvent.source = target;
            this._onDidChangeConfiguration.fire(configurationChangeEvent);
        }
    }
    toEditableConfigurationTarget(target, key) {
        if (target === 1 /* ConfigurationTarget.APPLICATION */) {
            return 1 /* EditableConfigurationTarget.USER_LOCAL */;
        }
        if (target === 2 /* ConfigurationTarget.USER */) {
            if (this.remoteUserConfiguration) {
                const scope = this.configurationRegistry.getConfigurationProperties()[key]?.scope;
                if (scope === 2 /* ConfigurationScope.MACHINE */ || scope === 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */ || scope === 3 /* ConfigurationScope.APPLICATION_MACHINE */) {
                    return 2 /* EditableConfigurationTarget.USER_REMOTE */;
                }
                if (this.inspect(key).userRemoteValue !== undefined) {
                    return 2 /* EditableConfigurationTarget.USER_REMOTE */;
                }
            }
            return 1 /* EditableConfigurationTarget.USER_LOCAL */;
        }
        if (target === 3 /* ConfigurationTarget.USER_LOCAL */) {
            return 1 /* EditableConfigurationTarget.USER_LOCAL */;
        }
        if (target === 4 /* ConfigurationTarget.USER_REMOTE */) {
            return 2 /* EditableConfigurationTarget.USER_REMOTE */;
        }
        if (target === 5 /* ConfigurationTarget.WORKSPACE */) {
            return 3 /* EditableConfigurationTarget.WORKSPACE */;
        }
        if (target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
            return 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */;
        }
        return null;
    }
}
let RegisterConfigurationSchemasContribution = class RegisterConfigurationSchemasContribution extends Disposable {
    constructor(workspaceContextService, environmentService, workspaceTrustManagementService, extensionService, lifecycleService) {
        super();
        this.workspaceContextService = workspaceContextService;
        this.environmentService = environmentService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        extensionService.whenInstalledExtensionsRegistered().then(() => {
            this.registerConfigurationSchemas();
            const configurationRegistry = Registry.as(Extensions.Configuration);
            const delayer = this._register(new Delayer(50));
            this._register(Event.any(configurationRegistry.onDidUpdateConfiguration, configurationRegistry.onDidSchemaChange, workspaceTrustManagementService.onDidChangeTrust)(() => delayer.trigger(() => this.registerConfigurationSchemas(), lifecycleService.phase === 4 /* LifecyclePhase.Eventually */ ? undefined : 2500 /* delay longer in early phases */)));
        });
    }
    registerConfigurationSchemas() {
        const allSettingsSchema = {
            properties: allSettings.properties,
            patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true
        };
        const userSettingsSchema = this.environmentService.remoteAuthority ?
            {
                properties: Object.assign({}, applicationSettings.properties, windowSettings.properties, resourceSettings.properties),
                patternProperties: allSettings.patternProperties,
                additionalProperties: true,
                allowTrailingCommas: true,
                allowComments: true
            }
            : allSettingsSchema;
        const profileSettingsSchema = {
            properties: Object.assign({}, machineSettings.properties, machineOverridableSettings.properties, windowSettings.properties, resourceSettings.properties),
            patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true
        };
        const machineSettingsSchema = {
            properties: Object.assign({}, applicationMachineSettings.properties, machineSettings.properties, machineOverridableSettings.properties, windowSettings.properties, resourceSettings.properties),
            patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true
        };
        const workspaceSettingsSchema = {
            properties: Object.assign({}, this.checkAndFilterPropertiesRequiringTrust(machineOverridableSettings.properties), this.checkAndFilterPropertiesRequiringTrust(windowSettings.properties), this.checkAndFilterPropertiesRequiringTrust(resourceSettings.properties)),
            patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true
        };
        const defaultSettingsSchema = {
            properties: Object.keys(allSettings.properties).reduce((result, key) => {
                result[key] = Object.assign({ deprecationMessage: undefined }, allSettings.properties[key]);
                return result;
            }, {}),
            patternProperties: Object.keys(allSettings.patternProperties).reduce((result, key) => {
                result[key] = Object.assign({ deprecationMessage: undefined }, allSettings.patternProperties[key]);
                return result;
            }, {}),
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true
        };
        const folderSettingsSchema = 3 /* WorkbenchState.WORKSPACE */ === this.workspaceContextService.getWorkbenchState() ?
            {
                properties: Object.assign({}, this.checkAndFilterPropertiesRequiringTrust(machineOverridableSettings.properties), this.checkAndFilterPropertiesRequiringTrust(resourceSettings.properties)),
                patternProperties: allSettings.patternProperties,
                additionalProperties: true,
                allowTrailingCommas: true,
                allowComments: true
            } : workspaceSettingsSchema;
        const configDefaultsSchema = {
            type: 'object',
            description: localize('configurationDefaults.description', 'Contribute defaults for configurations'),
            properties: Object.assign({}, this.filterDefaultOverridableProperties(machineOverridableSettings.properties), this.filterDefaultOverridableProperties(windowSettings.properties), this.filterDefaultOverridableProperties(resourceSettings.properties)),
            patternProperties: {
                [OVERRIDE_PROPERTY_PATTERN]: {
                    type: 'object',
                    default: {},
                    $ref: resourceLanguageSettingsSchemaId,
                }
            },
            additionalProperties: false
        };
        this.registerSchemas({
            defaultSettingsSchema,
            userSettingsSchema,
            profileSettingsSchema,
            machineSettingsSchema,
            workspaceSettingsSchema,
            folderSettingsSchema,
            configDefaultsSchema,
        });
    }
    registerSchemas(schemas) {
        const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
        jsonRegistry.registerSchema(defaultSettingsSchemaId, schemas.defaultSettingsSchema);
        jsonRegistry.registerSchema(userSettingsSchemaId, schemas.userSettingsSchema);
        jsonRegistry.registerSchema(profileSettingsSchemaId, schemas.profileSettingsSchema);
        jsonRegistry.registerSchema(machineSettingsSchemaId, schemas.machineSettingsSchema);
        jsonRegistry.registerSchema(workspaceSettingsSchemaId, schemas.workspaceSettingsSchema);
        jsonRegistry.registerSchema(folderSettingsSchemaId, schemas.folderSettingsSchema);
        jsonRegistry.registerSchema(configurationDefaultsSchemaId, schemas.configDefaultsSchema);
    }
    checkAndFilterPropertiesRequiringTrust(properties) {
        if (this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            return properties;
        }
        const result = {};
        Object.entries(properties).forEach(([key, value]) => {
            if (!value.restricted) {
                result[key] = value;
            }
        });
        return result;
    }
    filterDefaultOverridableProperties(properties) {
        const result = {};
        Object.entries(properties).forEach(([key, value]) => {
            if (!value.disallowConfigurationDefault) {
                result[key] = value;
            }
        });
        return result;
    }
};
RegisterConfigurationSchemasContribution = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IWorkspaceTrustManagementService),
    __param(3, IExtensionService),
    __param(4, ILifecycleService)
], RegisterConfigurationSchemasContribution);
let ResetConfigurationDefaultsOverridesCache = class ResetConfigurationDefaultsOverridesCache extends Disposable {
    constructor(configurationService, extensionService) {
        super();
        if (configurationService.hasCachedConfigurationDefaultsOverrides()) {
            extensionService.whenInstalledExtensionsRegistered().then(() => configurationService.reloadConfiguration(7 /* ConfigurationTarget.DEFAULT */));
        }
    }
};
ResetConfigurationDefaultsOverridesCache = __decorate([
    __param(0, IConfigurationService),
    __param(1, IExtensionService)
], ResetConfigurationDefaultsOverridesCache);
let UpdateExperimentalSettingsDefaults = class UpdateExperimentalSettingsDefaults extends Disposable {
    static { this.ID = 'workbench.contrib.updateExperimentalSettingsDefaults'; }
    constructor(workbenchAssignmentService) {
        super();
        this.workbenchAssignmentService = workbenchAssignmentService;
        this.processedExperimentalSettings = new Set();
        this.configurationRegistry = Registry.as(Extensions.Configuration);
        this.processExperimentalSettings(Object.keys(this.configurationRegistry.getConfigurationProperties()));
        this._register(this.configurationRegistry.onDidUpdateConfiguration(({ properties }) => this.processExperimentalSettings(properties)));
    }
    async processExperimentalSettings(properties) {
        const overrides = {};
        const allProperties = this.configurationRegistry.getConfigurationProperties();
        for (const property of properties) {
            const schema = allProperties[property];
            const tags = schema?.tags;
            // Many experimental settings refer to in-development or unstable settings.
            // onExP more clearly indicates that the setting could be
            // part of an experiment.
            if (!tags || !tags.some(tag => tag.toLowerCase() === 'onexp')) {
                continue;
            }
            if (this.processedExperimentalSettings.has(property)) {
                continue;
            }
            this.processedExperimentalSettings.add(property);
            try {
                const value = await this.workbenchAssignmentService.getTreatment(`config.${property}`);
                if (!isUndefined(value) && !equals(value, schema.default)) {
                    overrides[property] = value;
                }
            }
            catch (error) { /*ignore */ }
        }
        if (Object.keys(overrides).length) {
            this.configurationRegistry.registerDefaultConfigurations([{ overrides }]);
        }
    }
};
UpdateExperimentalSettingsDefaults = __decorate([
    __param(0, IWorkbenchAssignmentService)
], UpdateExperimentalSettingsDefaults);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(RegisterConfigurationSchemasContribution, 3 /* LifecyclePhase.Restored */);
workbenchContributionsRegistry.registerWorkbenchContribution(ResetConfigurationDefaultsOverridesCache, 4 /* LifecyclePhase.Eventually */);
registerWorkbenchContribution2(UpdateExperimentalSettingsDefaults.ID, UpdateExperimentalSettingsDefaults, 2 /* WorkbenchPhase.BlockRestore */);
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        [APPLY_ALL_PROFILES_SETTING]: {
            'type': 'array',
            description: localize('setting description', "Configure settings to be applied for all profiles."),
            'default': [],
            'scope': 1 /* ConfigurationScope.APPLICATION */,
            additionalProperties: true,
            uniqueItems: true,
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvbi9icm93c2VyL2NvbmZpZ3VyYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDckYsT0FBTyxFQUE2QixVQUFVLElBQUksY0FBYyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDOUksT0FBTyxFQUFFLHdCQUF3QixFQUFFLFNBQVMsSUFBSSxhQUFhLEVBQW1GLGlCQUFpQixFQUFFLGlCQUFpQixFQUFpRyxpQ0FBaUMsRUFBRSxxQkFBcUIsRUFBaUQsTUFBTSxvREFBb0QsQ0FBQztBQUN6YixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDOUksT0FBTyxFQUEyRSx3QkFBd0IsRUFBaUUsMkJBQTJCLEVBQWlDLDhCQUE4QixFQUFFLHFCQUFxQixFQUErQixNQUFNLDREQUE0RCxDQUFDO0FBQzlYLE9BQU8sRUFBd0Is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