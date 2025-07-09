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
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, TreeItemCollapsibleState } from '../../../common/views.js';
import { localize, localize2 } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { TreeView, TreeViewPane } from '../../../browser/parts/views/treeView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ALL_SYNC_RESOURCES, IUserDataSyncService, IUserDataSyncEnablementService, IUserDataAutoSyncService, UserDataSyncError, getLastSyncResourceUri, IUserDataSyncResourceProviderService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { FolderThemeIcon } from '../../../../platform/theme/common/themeService.js';
import { fromNow } from '../../../../base/common/date.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toAction } from '../../../../base/common/actions.js';
import { IUserDataSyncWorkbenchService, CONTEXT_SYNC_STATE, getSyncAreaLabel, CONTEXT_ACCOUNT_STATE, CONTEXT_ENABLE_ACTIVITY_VIEWS, SYNC_TITLE, SYNC_CONFLICTS_VIEW_ID, CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW, CONTEXT_HAS_CONFLICTS } from '../../../services/userDataSync/common/userDataSync.js';
import { IUserDataSyncMachinesService, isWebPlatform } from '../../../../platform/userDataSync/common/userDataSyncMachines.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { basename } from '../../../../base/common/resources.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataSyncConflictsViewPane } from './userDataSyncConflictsView.js';
let UserDataSyncDataViews = class UserDataSyncDataViews extends Disposable {
    constructor(container, instantiationService, userDataSyncEnablementService, userDataSyncMachinesService, userDataSyncService) {
        super();
        this.instantiationService = instantiationService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this.userDataSyncService = userDataSyncService;
        this.registerViews(container);
    }
    registerViews(container) {
        this.registerConflictsView(container);
        this.registerActivityView(container, true);
        this.registerMachinesView(container);
        this.registerActivityView(container, false);
        this.registerTroubleShootView(container);
        this.registerExternalActivityView(container);
    }
    registerConflictsView(container) {
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewName = localize2('conflicts', "Conflicts");
        const viewDescriptor = {
            id: SYNC_CONFLICTS_VIEW_ID,
            name: viewName,
            ctorDescriptor: new SyncDescriptor(UserDataSyncConflictsViewPane),
            when: ContextKeyExpr.and(CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW, CONTEXT_HAS_CONFLICTS),
            canToggleVisibility: false,
            canMoveView: false,
            treeView: this.instantiationService.createInstance(TreeView, SYNC_CONFLICTS_VIEW_ID, viewName.value),
            collapsed: false,
            order: 100,
        };
        viewsRegistry.registerViews([viewDescriptor], container);
    }
    registerMachinesView(container) {
        const id = `workbench.views.sync.machines`;
        const name = localize2('synced machines', "Synced Machines");
        const treeView = this.instantiationService.createInstance(TreeView, id, name.value);
        const dataProvider = this.instantiationService.createInstance(UserDataSyncMachinesViewDataProvider, treeView);
        treeView.showRefreshAction = true;
        treeView.canSelectMany = true;
        treeView.dataProvider = dataProvider;
        this._register(Event.any(this.userDataSyncMachinesService.onDidChange, this.userDataSyncService.onDidResetRemote)(() => treeView.refresh()));
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewDescriptor = {
            id,
            name,
            ctorDescriptor: new SyncDescriptor(TreeViewPane),
            when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_ENABLE_ACTIVITY_VIEWS),
            canToggleVisibility: true,
            canMoveView: false,
            treeView,
            collapsed: false,
            order: 300,
        };
        viewsRegistry.registerViews([viewDescriptor], container);
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.editMachineName`,
                    title: localize('workbench.actions.sync.editMachineName', "Edit Name"),
                    icon: Codicon.edit,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', id)),
                        group: 'inline',
                    },
                });
            }
            async run(accessor, handle) {
                const changed = await dataProvider.rename(handle.$treeItemHandle);
                if (changed) {
                    await treeView.refresh();
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.turnOffSyncOnMachine`,
                    title: localize('workbench.actions.sync.turnOffSyncOnMachine', "Turn off Settings Sync"),
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', id), ContextKeyExpr.equals('viewItem', 'sync-machine')),
                    },
                });
            }
            async run(accessor, handle, selected) {
                if (await dataProvider.disable((selected || [handle]).map(handle => handle.$treeItemHandle))) {
                    await treeView.refresh();
                }
            }
        }));
    }
    registerActivityView(container, remote) {
        const id = `workbench.views.sync.${remote ? 'remote' : 'local'}Activity`;
        const name = remote ? localize2('remote sync activity title', "Sync Activity (Remote)") : localize2('local sync activity title', "Sync Activity (Local)");
        const treeView = this.instantiationService.createInstance(TreeView, id, name.value);
        treeView.showCollapseAllAction = true;
        treeView.showRefreshAction = true;
        treeView.dataProvider = remote ? this.instantiationService.createInstance(RemoteUserDataSyncActivityViewDataProvider)
            : this.instantiationService.createInstance(LocalUserDataSyncActivityViewDataProvider);
        this._register(Event.any(this.userDataSyncEnablementService.onDidChangeResourceEnablement, this.userDataSyncEnablementService.onDidChangeEnablement, this.userDataSyncService.onDidResetLocal, this.userDataSyncService.onDidResetRemote)(() => treeView.refresh()));
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewDescriptor = {
            id,
            name,
            ctorDescriptor: new SyncDescriptor(TreeViewPane),
            when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_ENABLE_ACTIVITY_VIEWS),
            canToggleVisibility: true,
            canMoveView: false,
            treeView,
            collapsed: false,
            order: remote ? 200 : 400,
            hideByDefault: !remote,
        };
        viewsRegistry.registerViews([viewDescriptor], container);
        this.registerDataViewActions(id);
    }
    registerExternalActivityView(container) {
        const id = `workbench.views.sync.externalActivity`;
        const name = localize2('downloaded sync activity title', "Sync Activity (Developer)");
        const dataProvider = this.instantiationService.createInstance(ExtractedUserDataSyncActivityViewDataProvider, undefined);
        const treeView = this.instantiationService.createInstance(TreeView, id, name.value);
        treeView.showCollapseAllAction = false;
        treeView.showRefreshAction = false;
        treeView.dataProvider = dataProvider;
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewDescriptor = {
            id,
            name,
            ctorDescriptor: new SyncDescriptor(TreeViewPane),
            when: CONTEXT_ENABLE_ACTIVITY_VIEWS,
            canToggleVisibility: true,
            canMoveView: false,
            treeView,
            collapsed: false,
            hideByDefault: false,
        };
        viewsRegistry.registerViews([viewDescriptor], container);
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.loadActivity`,
                    title: localize('workbench.actions.sync.loadActivity', "Load Sync Activity"),
                    icon: Codicon.cloudUpload,
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', id),
                        group: 'navigation',
                    },
                });
            }
            async run(accessor) {
                const fileDialogService = accessor.get(IFileDialogService);
                const result = await fileDialogService.showOpenDialog({
                    title: localize('select sync activity file', "Select Sync Activity File or Folder"),
                    canSelectFiles: true,
                    canSelectFolders: true,
                    canSelectMany: false,
                });
                if (!result?.[0]) {
                    return;
                }
                dataProvider.activityDataResource = result[0];
                await treeView.refresh();
            }
        }));
    }
    registerDataViewActions(viewId) {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.${viewId}.resolveResource`,
                    title: localize('workbench.actions.sync.resolveResourceRef', "Show raw JSON sync data"),
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /sync-resource-.*/i))
                    },
                });
            }
            async run(accessor, handle) {
                const { resource } = JSON.parse(handle.$treeItemHandle);
                const editorService = accessor.get(IEditorService);
                await editorService.openEditor({ resource: URI.parse(resource), options: { pinned: true } });
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.${viewId}.compareWithLocal`,
                    title: localize('workbench.actions.sync.compareWithLocal', "Compare with Local"),
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /sync-associatedResource-.*/i))
                    },
                });
            }
            async run(accessor, handle) {
                const commandService = accessor.get(ICommandService);
                const { resource, comparableResource } = JSON.parse(handle.$treeItemHandle);
                const remoteResource = URI.parse(resource);
                const localResource = URI.parse(comparableResource);
                return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, remoteResource, localResource, localize('remoteToLocalDiff', "{0} ↔ {1}", localize({ key: 'leftResourceName', comment: ['remote as in file in cloud'] }, "{0} (Remote)", basename(remoteResource)), localize({ key: 'rightResourceName', comment: ['local as in file in disk'] }, "{0} (Local)", basename(localResource))), undefined);
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.${viewId}.replaceCurrent`,
                    title: localize('workbench.actions.sync.replaceCurrent', "Restore"),
                    icon: Codicon.discard,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /sync-resource-.*/i), ContextKeyExpr.notEquals('viewItem', `sync-resource-${"profiles" /* SyncResource.Profiles */}`)),
                        group: 'inline',
                    },
                });
            }
            async run(accessor, handle) {
                const dialogService = accessor.get(IDialogService);
                const userDataSyncService = accessor.get(IUserDataSyncService);
                const { syncResourceHandle, syncResource } = JSON.parse(handle.$treeItemHandle);
                const result = await dialogService.confirm({
                    message: localize({ key: 'confirm replace', comment: ['A confirmation message to replace current user data (settings, extensions, keybindings, snippets) with selected version'] }, "Would you like to replace your current {0} with selected?", getSyncAreaLabel(syncResource)),
                    type: 'info',
                    title: SYNC_TITLE.value
                });
                if (result.confirmed) {
                    return userDataSyncService.replace({ created: syncResourceHandle.created, uri: URI.revive(syncResourceHandle.uri) });
                }
            }
        }));
    }
    registerTroubleShootView(container) {
        const id = `workbench.views.sync.troubleshoot`;
        const name = localize2('troubleshoot', "Troubleshoot");
        const treeView = this.instantiationService.createInstance(TreeView, id, name.value);
        const dataProvider = this.instantiationService.createInstance(UserDataSyncTroubleshootViewDataProvider);
        treeView.showRefreshAction = true;
        treeView.dataProvider = dataProvider;
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewDescriptor = {
            id,
            name,
            ctorDescriptor: new SyncDescriptor(TreeViewPane),
            when: CONTEXT_ENABLE_ACTIVITY_VIEWS,
            canToggleVisibility: true,
            canMoveView: false,
            treeView,
            collapsed: false,
            order: 500,
            hideByDefault: true
        };
        viewsRegistry.registerViews([viewDescriptor], container);
    }
};
UserDataSyncDataViews = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUserDataSyncEnablementService),
    __param(3, IUserDataSyncMachinesService),
    __param(4, IUserDataSyncService)
], UserDataSyncDataViews);
export { UserDataSyncDataViews };
let UserDataSyncActivityViewDataProvider = class UserDataSyncActivityViewDataProvider {
    constructor(userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncWorkbenchService, notificationService, userDataProfilesService) {
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncResourceProviderService = userDataSyncResourceProviderService;
        this.userDataAutoSyncService = userDataAutoSyncService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.notificationService = notificationService;
        this.userDataProfilesService = userDataProfilesService;
        this.syncResourceHandlesByProfile = new Map();
    }
    async getChildren(element) {
        try {
            if (!element) {
                return await this.getRoots();
            }
            if (element.profile || element.handle === this.userDataProfilesService.defaultProfile.id) {
                let promise = this.syncResourceHandlesByProfile.get(element.handle);
                if (!promise) {
                    this.syncResourceHandlesByProfile.set(element.handle, promise = this.getSyncResourceHandles(element.profile));
                }
                return await promise;
            }
            if (element.syncResourceHandle) {
                return await this.getChildrenForSyncResourceTreeItem(element);
            }
            return [];
        }
        catch (error) {
            if (!(error instanceof UserDataSyncError)) {
                error = UserDataSyncError.toUserDataSyncError(error);
            }
            if (error instanceof UserDataSyncError && error.code === "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */) {
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: error.message,
                    actions: {
                        primary: [
                            toAction({
                                id: 'reset',
                                label: localize('reset', "Reset Synced Data"),
                                run: () => this.userDataSyncWorkbenchService.resetSyncedData()
                            }),
                        ]
                    }
                });
            }
            else {
                this.notificationService.error(error);
            }
            throw error;
        }
    }
    async getRoots() {
        this.syncResourceHandlesByProfile.clear();
        const roots = [];
        const profiles = await this.getProfiles();
        if (profiles.length) {
            const profileTreeItem = {
                handle: this.userDataProfilesService.defaultProfile.id,
                label: { label: this.userDataProfilesService.defaultProfile.name },
                collapsibleState: TreeItemCollapsibleState.Expanded,
            };
            roots.push(profileTreeItem);
        }
        else {
            const defaultSyncResourceHandles = await this.getSyncResourceHandles();
            roots.push(...defaultSyncResourceHandles);
        }
        for (const profile of profiles) {
            const profileTreeItem = {
                handle: profile.id,
                label: { label: profile.name },
                collapsibleState: TreeItemCollapsibleState.Collapsed,
                profile,
            };
            roots.push(profileTreeItem);
        }
        return roots;
    }
    async getChildrenForSyncResourceTreeItem(element) {
        const syncResourceHandle = element.syncResourceHandle;
        const associatedResources = await this.userDataSyncResourceProviderService.getAssociatedResources(syncResourceHandle);
        const previousAssociatedResources = syncResourceHandle.previous ? await this.userDataSyncResourceProviderService.getAssociatedResources(syncResourceHandle.previous) : [];
        return associatedResources.map(({ resource, comparableResource }) => {
            const handle = JSON.stringify({ resource: resource.toString(), comparableResource: comparableResource.toString() });
            const previousResource = previousAssociatedResources.find(previous => basename(previous.resource) === basename(resource))?.resource;
            return {
                handle,
                collapsibleState: TreeItemCollapsibleState.None,
                resourceUri: resource,
                command: previousResource ? {
                    id: API_OPEN_DIFF_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [
                        previousResource,
                        resource,
                        localize('sideBySideLabels', "{0} ↔ {1}", `${basename(resource)} (${fromNow(syncResourceHandle.previous.created, true)})`, `${basename(resource)} (${fromNow(syncResourceHandle.created, true)})`),
                        undefined
                    ]
                } : {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [resource, undefined, undefined]
                },
                contextValue: `sync-associatedResource-${syncResourceHandle.syncResource}`
            };
        });
    }
    async getSyncResourceHandles(profile) {
        const treeItems = [];
        const result = await Promise.all(ALL_SYNC_RESOURCES.map(async (syncResource) => {
            const resourceHandles = await this.getResourceHandles(syncResource, profile);
            return resourceHandles.map((resourceHandle, index) => ({ ...resourceHandle, syncResource, previous: resourceHandles[index + 1] }));
        }));
        const syncResourceHandles = result.flat().sort((a, b) => b.created - a.created);
        for (const syncResourceHandle of syncResourceHandles) {
            const handle = JSON.stringify({ syncResourceHandle, syncResource: syncResourceHandle.syncResource });
            treeItems.push({
                handle,
                collapsibleState: TreeItemCollapsibleState.Collapsed,
                label: { label: getSyncAreaLabel(syncResourceHandle.syncResource) },
                description: fromNow(syncResourceHandle.created, true),
                tooltip: new Date(syncResourceHandle.created).toLocaleString(),
                themeIcon: FolderThemeIcon,
                syncResourceHandle,
                contextValue: `sync-resource-${syncResourceHandle.syncResource}`
            });
        }
        return treeItems;
    }
};
UserDataSyncActivityViewDataProvider = __decorate([
    __param(0, IUserDataSyncService),
    __param(1, IUserDataSyncResourceProviderService),
    __param(2, IUserDataAutoSyncService),
    __param(3, IUserDataSyncWorkbenchService),
    __param(4, INotificationService),
    __param(5, IUserDataProfilesService)
], UserDataSyncActivityViewDataProvider);
class LocalUserDataSyncActivityViewDataProvider extends UserDataSyncActivityViewDataProvider {
    getResourceHandles(syncResource, profile) {
        return this.userDataSyncResourceProviderService.getLocalSyncResourceHandles(syncResource, profile);
    }
    async getProfiles() {
        return this.userDataProfilesService.profiles
            .filter(p => !p.isDefault)
            .map(p => ({
            id: p.id,
            collection: p.id,
            name: p.name,
        }));
    }
}
let RemoteUserDataSyncActivityViewDataProvider = class RemoteUserDataSyncActivityViewDataProvider extends UserDataSyncActivityViewDataProvider {
    constructor(userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncMachinesService, userDataSyncWorkbenchService, notificationService, userDataProfilesService) {
        super(userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncWorkbenchService, notificationService, userDataProfilesService);
        this.userDataSyncMachinesService = userDataSyncMachinesService;
    }
    async getChildren(element) {
        if (!element) {
            this.machinesPromise = undefined;
        }
        return super.getChildren(element);
    }
    getMachines() {
        if (this.machinesPromise === undefined) {
            this.machinesPromise = this.userDataSyncMachinesService.getMachines();
        }
        return this.machinesPromise;
    }
    getResourceHandles(syncResource, profile) {
        return this.userDataSyncResourceProviderService.getRemoteSyncResourceHandles(syncResource, profile);
    }
    getProfiles() {
        return this.userDataSyncResourceProviderService.getRemoteSyncedProfiles();
    }
    async getChildrenForSyncResourceTreeItem(element) {
        const children = await super.getChildrenForSyncResourceTreeItem(element);
        if (children.length) {
            const machineId = await this.userDataSyncResourceProviderService.getMachineId(element.syncResourceHandle);
            if (machineId) {
                const machines = await this.getMachines();
                const machine = machines.find(({ id }) => id === machineId);
                children[0].description = machine?.isCurrent ? localize({ key: 'current', comment: ['Represents current machine'] }, "Current") : machine?.name;
            }
        }
        return children;
    }
};
RemoteUserDataSyncActivityViewDataProvider = __decorate([
    __param(0, IUserDataSyncService),
    __param(1, IUserDataSyncResourceProviderService),
    __param(2, IUserDataAutoSyncService),
    __param(3, IUserDataSyncMachinesService),
    __param(4, IUserDataSyncWorkbenchService),
    __param(5, INotificationService),
    __param(6, IUserDataProfilesService)
], RemoteUserDataSyncActivityViewDataProvider);
let ExtractedUserDataSyncActivityViewDataProvider = class ExtractedUserDataSyncActivityViewDataProvider extends UserDataSyncActivityViewDataProvider {
    constructor(activityDataResource, userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncWorkbenchService, notificationService, userDataProfilesService, fileService, uriIdentityService) {
        super(userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncWorkbenchService, notificationService, userDataProfilesService);
        this.activityDataResource = activityDataResource;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
    }
    async getChildren(element) {
        if (!element) {
            this.machinesPromise = undefined;
            if (!this.activityDataResource) {
                return [];
            }
            const stat = await this.fileService.resolve(this.activityDataResource);
            if (stat.isDirectory) {
                this.activityDataLocation = this.activityDataResource;
            }
            else {
                this.activityDataLocation = this.uriIdentityService.extUri.joinPath(this.uriIdentityService.extUri.dirname(this.activityDataResource), 'remoteActivity');
                try {
                    await this.fileService.del(this.activityDataLocation, { recursive: true });
                }
                catch (e) { /* ignore */ }
                await this.userDataSyncService.extractActivityData(this.activityDataResource, this.activityDataLocation);
            }
        }
        return super.getChildren(element);
    }
    getResourceHandles(syncResource, profile) {
        return this.userDataSyncResourceProviderService.getLocalSyncResourceHandles(syncResource, profile, this.activityDataLocation);
    }
    async getProfiles() {
        return this.userDataSyncResourceProviderService.getLocalSyncedProfiles(this.activityDataLocation);
    }
    async getChildrenForSyncResourceTreeItem(element) {
        const children = await super.getChildrenForSyncResourceTreeItem(element);
        if (children.length) {
            const machineId = await this.userDataSyncResourceProviderService.getMachineId(element.syncResourceHandle);
            if (machineId) {
                const machines = await this.getMachines();
                const machine = machines.find(({ id }) => id === machineId);
                children[0].description = machine?.isCurrent ? localize({ key: 'current', comment: ['Represents current machine'] }, "Current") : machine?.name;
            }
        }
        return children;
    }
    getMachines() {
        if (this.machinesPromise === undefined) {
            this.machinesPromise = this.userDataSyncResourceProviderService.getLocalSyncedMachines(this.activityDataLocation);
        }
        return this.machinesPromise;
    }
};
ExtractedUserDataSyncActivityViewDataProvider = __decorate([
    __param(1, IUserDataSyncService),
    __param(2, IUserDataSyncResourceProviderService),
    __param(3, IUserDataAutoSyncService),
    __param(4, IUserDataSyncWorkbenchService),
    __param(5, INotificationService),
    __param(6, IUserDataProfilesService),
    __param(7, IFileService),
    __param(8, IUriIdentityService)
], ExtractedUserDataSyncActivityViewDataProvider);
let UserDataSyncMachinesViewDataProvider = class UserDataSyncMachinesViewDataProvider {
    constructor(treeView, userDataSyncMachinesService, quickInputService, notificationService, dialogService, userDataSyncWorkbenchService) {
        this.treeView = treeView;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this.quickInputService = quickInputService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
    }
    async getChildren(element) {
        if (!element) {
            this.machinesPromise = undefined;
        }
        try {
            let machines = await this.getMachines();
            machines = machines.filter(m => !m.disabled).sort((m1, m2) => m1.isCurrent ? -1 : 1);
            this.treeView.message = machines.length ? undefined : localize('no machines', "No Machines");
            return machines.map(({ id, name, isCurrent, platform }) => ({
                handle: id,
                collapsibleState: TreeItemCollapsibleState.None,
                label: { label: name },
                description: isCurrent ? localize({ key: 'current', comment: ['Current machine'] }, "Current") : undefined,
                themeIcon: platform && isWebPlatform(platform) ? Codicon.globe : Codicon.vm,
                contextValue: 'sync-machine'
            }));
        }
        catch (error) {
            this.notificationService.error(error);
            return [];
        }
    }
    getMachines() {
        if (this.machinesPromise === undefined) {
            this.machinesPromise = this.userDataSyncMachinesService.getMachines();
        }
        return this.machinesPromise;
    }
    async disable(machineIds) {
        const machines = await this.getMachines();
        const machinesToDisable = machines.filter(({ id }) => machineIds.includes(id));
        if (!machinesToDisable.length) {
            throw new Error(localize('not found', "machine not found with id: {0}", machineIds.join(',')));
        }
        const result = await this.dialogService.confirm({
            type: 'info',
            message: machinesToDisable.length > 1 ? localize('turn off sync on multiple machines', "Are you sure you want to turn off sync on selected machines?")
                : localize('turn off sync on machine', "Are you sure you want to turn off sync on {0}?", machinesToDisable[0].name),
            primaryButton: localize({ key: 'turn off', comment: ['&& denotes a mnemonic'] }, "&&Turn off"),
        });
        if (!result.confirmed) {
            return false;
        }
        if (machinesToDisable.some(machine => machine.isCurrent)) {
            await this.userDataSyncWorkbenchService.turnoff(false);
        }
        const otherMachinesToDisable = machinesToDisable.filter(machine => !machine.isCurrent)
            .map(machine => ([machine.id, false]));
        if (otherMachinesToDisable.length) {
            await this.userDataSyncMachinesService.setEnablements(otherMachinesToDisable);
        }
        return true;
    }
    async rename(machineId) {
        const disposableStore = new DisposableStore();
        const inputBox = disposableStore.add(this.quickInputService.createInputBox());
        inputBox.placeholder = localize('placeholder', "Enter the name of the machine");
        inputBox.busy = true;
        inputBox.show();
        const machines = await this.getMachines();
        const machine = machines.find(({ id }) => id === machineId);
        const enabledMachines = machines.filter(({ disabled }) => !disabled);
        if (!machine) {
            inputBox.hide();
            disposableStore.dispose();
            throw new Error(localize('not found', "machine not found with id: {0}", machineId));
        }
        inputBox.busy = false;
        inputBox.value = machine.name;
        const validateMachineName = (machineName) => {
            machineName = machineName.trim();
            return machineName && !enabledMachines.some(m => m.id !== machineId && m.name === machineName) ? machineName : null;
        };
        disposableStore.add(inputBox.onDidChangeValue(() => inputBox.validationMessage = validateMachineName(inputBox.value) ? '' : localize('valid message', "Machine name should be unique and not empty")));
        return new Promise((c, e) => {
            disposableStore.add(inputBox.onDidAccept(async () => {
                const machineName = validateMachineName(inputBox.value);
                disposableStore.dispose();
                if (machineName && machineName !== machine.name) {
                    try {
                        await this.userDataSyncMachinesService.renameMachine(machineId, machineName);
                        c(true);
                    }
                    catch (error) {
                        e(error);
                    }
                }
                else {
                    c(false);
                }
            }));
        });
    }
};
UserDataSyncMachinesViewDataProvider = __decorate([
    __param(1, IUserDataSyncMachinesService),
    __param(2, IQuickInputService),
    __param(3, INotificationService),
    __param(4, IDialogService),
    __param(5, IUserDataSyncWorkbenchService)
], UserDataSyncMachinesViewDataProvider);
let UserDataSyncTroubleshootViewDataProvider = class UserDataSyncTroubleshootViewDataProvider {
    constructor(fileService, userDataSyncWorkbenchService, environmentService, uriIdentityService) {
        this.fileService = fileService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.environmentService = environmentService;
        this.uriIdentityService = uriIdentityService;
    }
    async getChildren(element) {
        if (!element) {
            return [{
                    handle: 'SYNC_LOGS',
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                    label: { label: localize('sync logs', "Logs") },
                    themeIcon: Codicon.folder,
                }, {
                    handle: 'LAST_SYNC_STATES',
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                    label: { label: localize('last sync states', "Last Synced Remotes") },
                    themeIcon: Codicon.folder,
                }];
        }
        if (element.handle === 'LAST_SYNC_STATES') {
            return this.getLastSyncStates();
        }
        if (element.handle === 'SYNC_LOGS') {
            return this.getSyncLogs();
        }
        return [];
    }
    async getLastSyncStates() {
        const result = [];
        for (const syncResource of ALL_SYNC_RESOURCES) {
            const resource = getLastSyncResourceUri(undefined, syncResource, this.environmentService, this.uriIdentityService.extUri);
            if (await this.fileService.exists(resource)) {
                result.push({
                    handle: resource.toString(),
                    label: { label: getSyncAreaLabel(syncResource) },
                    collapsibleState: TreeItemCollapsibleState.None,
                    resourceUri: resource,
                    command: { id: API_OPEN_EDITOR_COMMAND_ID, title: '', arguments: [resource, undefined, undefined] },
                });
            }
        }
        return result;
    }
    async getSyncLogs() {
        const logResources = await this.userDataSyncWorkbenchService.getAllLogResources();
        const result = [];
        for (const syncLogResource of logResources) {
            const logFolder = this.uriIdentityService.extUri.dirname(syncLogResource);
            result.push({
                handle: syncLogResource.toString(),
                collapsibleState: TreeItemCollapsibleState.None,
                resourceUri: syncLogResource,
                label: { label: this.uriIdentityService.extUri.basename(logFolder) },
                description: this.uriIdentityService.extUri.isEqual(logFolder, this.environmentService.logsHome) ? localize({ key: 'current', comment: ['Represents current log file'] }, "Current") : undefined,
                command: { id: API_OPEN_EDITOR_COMMAND_ID, title: '', arguments: [syncLogResource, undefined, undefined] },
            });
        }
        return result;
    }
};
UserDataSyncTroubleshootViewDataProvider = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataSyncWorkbenchService),
    __param(2, IEnvironmentService),
    __param(3, IUriIdentityService)
], UserDataSyncTroubleshootViewDataProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jVmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXNlckRhdGFTeW5jL2Jyb3dzZXIvdXNlckRhdGFTeW5jVmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBa0IsVUFBVSxFQUF5RCx3QkFBd0IsRUFBd0MsTUFBTSwwQkFBMEIsQ0FBQztBQUM3TCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQXNELDhCQUE4QixFQUFFLHdCQUF3QixFQUFFLGlCQUFpQixFQUF5QixzQkFBc0IsRUFBc0Msb0NBQW9DLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5VyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLEdBQUcsRUFBVSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFD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