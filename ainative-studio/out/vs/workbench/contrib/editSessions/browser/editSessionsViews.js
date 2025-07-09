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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { TreeView, TreeViewPane } from '../../../browser/parts/views/treeView.js';
import { Extensions, TreeItemCollapsibleState } from '../../../common/views.js';
import { ChangeType, EDIT_SESSIONS_DATA_VIEW_ID, EDIT_SESSIONS_SCHEME, EDIT_SESSIONS_SHOW_VIEW, EDIT_SESSIONS_TITLE, IEditSessionsStorageService } from '../common/editSessions.js';
import { URI } from '../../../../base/common/uri.js';
import { fromNow } from '../../../../base/common/date.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { basename } from '../../../../base/common/path.js';
const EDIT_SESSIONS_COUNT_KEY = 'editSessionsCount';
const EDIT_SESSIONS_COUNT_CONTEXT_KEY = new RawContextKey(EDIT_SESSIONS_COUNT_KEY, 0);
let EditSessionsDataViews = class EditSessionsDataViews extends Disposable {
    constructor(container, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.registerViews(container);
    }
    registerViews(container) {
        const viewId = EDIT_SESSIONS_DATA_VIEW_ID;
        const treeView = this.instantiationService.createInstance(TreeView, viewId, EDIT_SESSIONS_TITLE.value);
        treeView.showCollapseAllAction = true;
        treeView.showRefreshAction = true;
        treeView.dataProvider = this.instantiationService.createInstance(EditSessionDataViewDataProvider);
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        viewsRegistry.registerViews([{
                id: viewId,
                name: EDIT_SESSIONS_TITLE,
                ctorDescriptor: new SyncDescriptor(TreeViewPane),
                canToggleVisibility: true,
                canMoveView: false,
                treeView,
                collapsed: false,
                when: ContextKeyExpr.and(EDIT_SESSIONS_SHOW_VIEW),
                order: 100,
                hideByDefault: true,
            }], container);
        viewsRegistry.registerViewWelcomeContent(viewId, {
            content: localize('noStoredChanges', 'You have no stored changes in the cloud to display.\n{0}', `[${localize('storeWorkingChangesTitle', 'Store Working Changes')}](command:workbench.editSessions.actions.store)`),
            when: ContextKeyExpr.equals(EDIT_SESSIONS_COUNT_KEY, 0),
            order: 1
        });
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.resume',
                    title: localize('workbench.editSessions.actions.resume.v2', "Resume Working Changes"),
                    icon: Codicon.desktopDownload,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /edit-session/i)),
                        group: 'inline'
                    }
                });
            }
            async run(accessor, handle) {
                const editSessionId = URI.parse(handle.$treeItemHandle).path.substring(1);
                const commandService = accessor.get(ICommandService);
                await commandService.executeCommand('workbench.editSessions.actions.resumeLatest', editSessionId, true);
                await treeView.refresh();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.store',
                    title: localize('workbench.editSessions.actions.store.v2', "Store Working Changes"),
                    icon: Codicon.cloudUpload,
                });
            }
            async run(accessor, handle) {
                const commandService = accessor.get(ICommandService);
                await commandService.executeCommand('workbench.editSessions.actions.storeCurrent');
                await treeView.refresh();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.delete',
                    title: localize('workbench.editSessions.actions.delete.v2', "Delete Working Changes"),
                    icon: Codicon.trash,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /edit-session/i)),
                        group: 'inline'
                    }
                });
            }
            async run(accessor, handle) {
                const editSessionId = URI.parse(handle.$treeItemHandle).path.substring(1);
                const dialogService = accessor.get(IDialogService);
                const editSessionStorageService = accessor.get(IEditSessionsStorageService);
                const result = await dialogService.confirm({
                    message: localize('confirm delete.v2', 'Are you sure you want to permanently delete your working changes with ref {0}?', editSessionId),
                    detail: localize('confirm delete detail.v2', ' You cannot undo this action.'),
                    type: 'warning',
                    title: EDIT_SESSIONS_TITLE.value
                });
                if (result.confirmed) {
                    await editSessionStorageService.delete('editSessions', editSessionId);
                    await treeView.refresh();
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.deleteAll',
                    title: localize('workbench.editSessions.actions.deleteAll', "Delete All Working Changes from Cloud"),
                    icon: Codicon.trash,
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.greater(EDIT_SESSIONS_COUNT_KEY, 0)),
                    }
                });
            }
            async run(accessor) {
                const dialogService = accessor.get(IDialogService);
                const editSessionStorageService = accessor.get(IEditSessionsStorageService);
                const result = await dialogService.confirm({
                    message: localize('confirm delete all', 'Are you sure you want to permanently delete all stored changes from the cloud?'),
                    detail: localize('confirm delete all detail', ' You cannot undo this action.'),
                    type: 'warning',
                    title: EDIT_SESSIONS_TITLE.value
                });
                if (result.confirmed) {
                    await editSessionStorageService.delete('editSessions', null);
                    await treeView.refresh();
                }
            }
        }));
    }
};
EditSessionsDataViews = __decorate([
    __param(1, IInstantiationService)
], EditSessionsDataViews);
export { EditSessionsDataViews };
let EditSessionDataViewDataProvider = class EditSessionDataViewDataProvider {
    constructor(editSessionsStorageService, contextKeyService, workspaceContextService, fileService) {
        this.editSessionsStorageService = editSessionsStorageService;
        this.contextKeyService = contextKeyService;
        this.workspaceContextService = workspaceContextService;
        this.fileService = fileService;
        this.editSessionsCount = EDIT_SESSIONS_COUNT_CONTEXT_KEY.bindTo(this.contextKeyService);
    }
    async getChildren(element) {
        if (!element) {
            return this.getAllEditSessions();
        }
        const [ref, folderName, filePath] = URI.parse(element.handle).path.substring(1).split('/');
        if (ref && !folderName) {
            return this.getEditSession(ref);
        }
        else if (ref && folderName && !filePath) {
            return this.getEditSessionFolderContents(ref, folderName);
        }
        return [];
    }
    async getAllEditSessions() {
        const allEditSessions = await this.editSessionsStorageService.list('editSessions');
        this.editSessionsCount.set(allEditSessions.length);
        const editSessions = [];
        for (const session of allEditSessions) {
            const resource = URI.from({ scheme: EDIT_SESSIONS_SCHEME, authority: 'remote-session-content', path: `/${session.ref}` });
            const sessionData = await this.editSessionsStorageService.read('editSessions', session.ref);
            if (!sessionData) {
                continue;
            }
            const content = JSON.parse(sessionData.content);
            const label = content.folders.map((folder) => folder.name).join(', ') ?? session.ref;
            const machineId = content.machine;
            const machineName = machineId ? await this.editSessionsStorageService.getMachineById(machineId) : undefined;
            const description = machineName === undefined ? fromNow(session.created, true) : `${fromNow(session.created, true)}\u00a0\u00a0\u2022\u00a0\u00a0${machineName}`;
            editSessions.push({
                handle: resource.toString(),
                collapsibleState: TreeItemCollapsibleState.Collapsed,
                label: { label },
                description: description,
                themeIcon: Codicon.repo,
                contextValue: `edit-session`
            });
        }
        return editSessions;
    }
    async getEditSession(ref) {
        const data = await this.editSessionsStorageService.read('editSessions', ref);
        if (!data) {
            return [];
        }
        const content = JSON.parse(data.content);
        if (content.folders.length === 1) {
            const folder = content.folders[0];
            return this.getEditSessionFolderContents(ref, folder.name);
        }
        return content.folders.map((folder) => {
            const resource = URI.from({ scheme: EDIT_SESSIONS_SCHEME, authority: 'remote-session-content', path: `/${data.ref}/${folder.name}` });
            return {
                handle: resource.toString(),
                collapsibleState: TreeItemCollapsibleState.Collapsed,
                label: { label: folder.name },
                themeIcon: Codicon.folder
            };
        });
    }
    async getEditSessionFolderContents(ref, folderName) {
        const data = await this.editSessionsStorageService.read('editSessions', ref);
        if (!data) {
            return [];
        }
        const content = JSON.parse(data.content);
        const currentWorkspaceFolder = this.workspaceContextService.getWorkspace().folders.find((folder) => folder.name === folderName);
        const editSessionFolder = content.folders.find((folder) => folder.name === folderName);
        if (!editSessionFolder) {
            return [];
        }
        return Promise.all(editSessionFolder.workingChanges.map(async (change) => {
            const cloudChangeUri = URI.from({ scheme: EDIT_SESSIONS_SCHEME, authority: 'remote-session-content', path: `/${data.ref}/${folderName}/${change.relativeFilePath}` });
            if (currentWorkspaceFolder?.uri) {
                // find the corresponding file in the workspace
                const localCopy = joinPath(currentWorkspaceFolder.uri, change.relativeFilePath);
                if (change.type === ChangeType.Addition && await this.fileService.exists(localCopy)) {
                    return {
                        handle: cloudChangeUri.toString(),
                        resourceUri: cloudChangeUri,
                        collapsibleState: TreeItemCollapsibleState.None,
                        label: { label: change.relativeFilePath },
                        themeIcon: Codicon.file,
                        command: {
                            id: 'vscode.diff',
                            title: localize('compare changes', 'Compare Changes'),
                            arguments: [
                                localCopy,
                                cloudChangeUri,
                                `${basename(change.relativeFilePath)} (${localize('local copy', 'Local Copy')} \u2194 ${localize('cloud changes', 'Cloud Changes')})`,
                                undefined
                            ]
                        }
                    };
                }
            }
            return {
                handle: cloudChangeUri.toString(),
                resourceUri: cloudChangeUri,
                collapsibleState: TreeItemCollapsibleState.None,
                label: { label: change.relativeFilePath },
                themeIcon: Codicon.file,
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: localize('open file', 'Open File'),
                    arguments: [cloudChangeUri, undefined, undefined]
                }
            };
        }));
    }
};
EditSessionDataViewDataProvider = __decorate([
    __param(0, IEditSessionsStorageService),
    __param(1, IContextKeyService),
    __param(2, IWorkspaceContextService),
    __param(3, IFileService)
], EditSessionDataViewDataProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zVmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFNlc3Npb25zL2Jyb3dzZXIvZWRpdFNlc3Npb25zVmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQXlFLHdCQUF3QixFQUF3QyxNQUFNLDBCQUEwQixDQUFDO0FBQzdMLE9BQU8sRUFBRSxVQUFVLEVBQUUsMEJBQTBCLEVBQUUsb0JBQW9CLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQWUsMkJBQTJCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqTSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFB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