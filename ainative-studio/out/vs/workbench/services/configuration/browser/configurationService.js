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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vYnJvd3Nlci9jb25maWd1cmF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JGLE9BQU8sRUFBNkIsVUFBVSxJQUFJLGNBQWMsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzlJLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxTQUFTLElBQUksYUFBYSxFQUFtRixpQkFBaUIsRUFBRSxpQkFBaUIsRUFBaUcsaUNBQWlDLEVBQUUscUJBQXFCLEVBQWlELE1BQU0sb0RBQW9ELENBQUM7QUFDemIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQzlJLE9BQU8sRUFBMkUsd0JBQXdCLEVBQWlFLDJCQUEyQixFQUFpQyw4QkFBOEIsRUFBRSxxQkFBcUIsRUFBK0IsTUFBTSw0REFBNEQsQ0FBQztBQUM5WCxPQUFPLEVBQXdC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