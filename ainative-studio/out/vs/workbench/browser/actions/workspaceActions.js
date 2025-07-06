/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { IWorkspaceContextService, hasWorkspaceFileExtension } from '../../../platform/workspace/common/workspace.js';
import { IWorkspaceEditingService } from '../../services/workspaces/common/workspaceEditing.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { ADD_ROOT_FOLDER_COMMAND_ID, ADD_ROOT_FOLDER_LABEL, PICK_WORKSPACE_FOLDER_COMMAND_ID, SET_ROOT_FOLDER_COMMAND_ID } from './workspaceCommands.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { MenuRegistry, MenuId, Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { EmptyWorkspaceSupportContext, EnterMultiRootWorkspaceSupportContext, OpenFolderWorkspaceSupportContext, WorkbenchStateContext, WorkspaceFolderCountContext } from '../../common/contextkeys.js';
import { IHostService } from '../../services/host/browser/host.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { IsMacNativeContext } from '../../../platform/contextkey/common/contextkeys.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
const workspacesCategory = localize2('workspaces', 'Workspaces');
export class OpenFileAction extends Action2 {
    static { this.ID = 'workbench.action.files.openFile'; }
    constructor() {
        super({
            id: OpenFileAction.ID,
            title: localize2('openFile', 'Open File...'),
            category: Categories.File,
            f1: true,
            keybinding: {
                when: IsMacNativeContext.toNegated(),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */
            }
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickFileAndOpen({ forceNewWindow: false, telemetryExtraData: data });
    }
}
export class OpenFolderAction extends Action2 {
    static { this.ID = 'workbench.action.files.openFolder'; }
    constructor() {
        super({
            id: OpenFolderAction.ID,
            title: localize2('openFolder', 'Open Folder...'),
            category: Categories.File,
            f1: true,
            precondition: OpenFolderWorkspaceSupportContext,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: undefined,
                linux: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */)
                },
                win: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */)
                }
            }
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickFolderAndOpen({ forceNewWindow: false, telemetryExtraData: data });
    }
}
export class OpenFolderViaWorkspaceAction extends Action2 {
    // This action swaps the folders of a workspace with
    // the selected folder and is a workaround for providing
    // "Open Folder..." in environments that do not support
    // this without having a workspace open (e.g. web serverless)
    static { this.ID = 'workbench.action.files.openFolderViaWorkspace'; }
    constructor() {
        super({
            id: OpenFolderViaWorkspaceAction.ID,
            title: localize2('openFolder', 'Open Folder...'),
            category: Categories.File,
            f1: true,
            precondition: ContextKeyExpr.and(OpenFolderWorkspaceSupportContext.toNegated(), WorkbenchStateContext.isEqualTo('workspace')),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */
            }
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        return commandService.executeCommand(SET_ROOT_FOLDER_COMMAND_ID);
    }
}
export class OpenFileFolderAction extends Action2 {
    static { this.ID = 'workbench.action.files.openFileFolder'; }
    static { this.LABEL = localize2('openFileFolder', 'Open...'); }
    constructor() {
        super({
            id: OpenFileFolderAction.ID,
            title: OpenFileFolderAction.LABEL,
            category: Categories.File,
            f1: true,
            precondition: ContextKeyExpr.and(IsMacNativeContext, OpenFolderWorkspaceSupportContext),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */
            }
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickFileFolderAndOpen({ forceNewWindow: false, telemetryExtraData: data });
    }
}
class OpenWorkspaceAction extends Action2 {
    static { this.ID = 'workbench.action.openWorkspace'; }
    constructor() {
        super({
            id: OpenWorkspaceAction.ID,
            title: localize2('openWorkspaceAction', 'Open Workspace from File...'),
            category: Categories.File,
            f1: true,
            precondition: EnterMultiRootWorkspaceSupportContext
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickWorkspaceAndOpen({ telemetryExtraData: data });
    }
}
class CloseWorkspaceAction extends Action2 {
    static { this.ID = 'workbench.action.closeFolder'; }
    constructor() {
        super({
            id: CloseWorkspaceAction.ID,
            title: localize2('closeWorkspace', 'Close Workspace'),
            category: workspacesCategory,
            f1: true,
            precondition: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), EmptyWorkspaceSupportContext),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 36 /* KeyCode.KeyF */)
            }
        });
    }
    async run(accessor) {
        const hostService = accessor.get(IHostService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        return hostService.openWindow({ forceReuseWindow: true, remoteAuthority: environmentService.remoteAuthority });
    }
}
class OpenWorkspaceConfigFileAction extends Action2 {
    static { this.ID = 'workbench.action.openWorkspaceConfigFile'; }
    constructor() {
        super({
            id: OpenWorkspaceConfigFileAction.ID,
            title: localize2('openWorkspaceConfigFile', 'Open Workspace Configuration File'),
            category: workspacesCategory,
            f1: true,
            precondition: WorkbenchStateContext.isEqualTo('workspace')
        });
    }
    async run(accessor) {
        const contextService = accessor.get(IWorkspaceContextService);
        const editorService = accessor.get(IEditorService);
        const configuration = contextService.getWorkspace().configuration;
        if (configuration) {
            await editorService.openEditor({ resource: configuration, options: { pinned: true } });
        }
    }
}
export class AddRootFolderAction extends Action2 {
    static { this.ID = 'workbench.action.addRootFolder'; }
    constructor() {
        super({
            id: AddRootFolderAction.ID,
            title: ADD_ROOT_FOLDER_LABEL,
            category: workspacesCategory,
            f1: true,
            precondition: ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace'))
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        return commandService.executeCommand(ADD_ROOT_FOLDER_COMMAND_ID);
    }
}
export class RemoveRootFolderAction extends Action2 {
    static { this.ID = 'workbench.action.removeRootFolder'; }
    constructor() {
        super({
            id: RemoveRootFolderAction.ID,
            title: localize2('globalRemoveFolderFromWorkspace', 'Remove Folder from Workspace...'),
            category: workspacesCategory,
            f1: true,
            precondition: ContextKeyExpr.and(WorkspaceFolderCountContext.notEqualsTo('0'), ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace')))
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const folder = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
        if (folder) {
            await workspaceEditingService.removeFolders([folder.uri]);
        }
    }
}
class SaveWorkspaceAsAction extends Action2 {
    static { this.ID = 'workbench.action.saveWorkspaceAs'; }
    constructor() {
        super({
            id: SaveWorkspaceAsAction.ID,
            title: localize2('saveWorkspaceAsAction', 'Save Workspace As...'),
            category: workspacesCategory,
            f1: true,
            precondition: EnterMultiRootWorkspaceSupportContext
        });
    }
    async run(accessor) {
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const contextService = accessor.get(IWorkspaceContextService);
        const configPathUri = await workspaceEditingService.pickNewWorkspacePath();
        if (configPathUri && hasWorkspaceFileExtension(configPathUri)) {
            switch (contextService.getWorkbenchState()) {
                case 1 /* WorkbenchState.EMPTY */:
                case 2 /* WorkbenchState.FOLDER */: {
                    const folders = contextService.getWorkspace().folders.map(folder => ({ uri: folder.uri }));
                    return workspaceEditingService.createAndEnterWorkspace(folders, configPathUri);
                }
                case 3 /* WorkbenchState.WORKSPACE */:
                    return workspaceEditingService.saveAndEnterWorkspace(configPathUri);
            }
        }
    }
}
class DuplicateWorkspaceInNewWindowAction extends Action2 {
    static { this.ID = 'workbench.action.duplicateWorkspaceInNewWindow'; }
    constructor() {
        super({
            id: DuplicateWorkspaceInNewWindowAction.ID,
            title: localize2('duplicateWorkspaceInNewWindow', 'Duplicate As Workspace in New Window'),
            category: workspacesCategory,
            f1: true,
            precondition: EnterMultiRootWorkspaceSupportContext
        });
    }
    async run(accessor) {
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const hostService = accessor.get(IHostService);
        const workspacesService = accessor.get(IWorkspacesService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        const folders = workspaceContextService.getWorkspace().folders;
        const remoteAuthority = environmentService.remoteAuthority;
        const newWorkspace = await workspacesService.createUntitledWorkspace(folders, remoteAuthority);
        await workspaceEditingService.copyWorkspaceSettings(newWorkspace);
        return hostService.openWindow([{ workspaceUri: newWorkspace.configPath }], { forceNewWindow: true, remoteAuthority });
    }
}
// --- Actions Registration
registerAction2(AddRootFolderAction);
registerAction2(RemoveRootFolderAction);
registerAction2(OpenFileAction);
registerAction2(OpenFolderAction);
registerAction2(OpenFolderViaWorkspaceAction);
registerAction2(OpenFileFolderAction);
registerAction2(OpenWorkspaceAction);
registerAction2(OpenWorkspaceConfigFileAction);
registerAction2(CloseWorkspaceAction);
registerAction2(SaveWorkspaceAsAction);
registerAction2(DuplicateWorkspaceInNewWindowAction);
// --- Menu Registration
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFileAction.ID,
        title: localize({ key: 'miOpenFile', comment: ['&& denotes a mnemonic'] }, "&&Open File...")
    },
    order: 1,
    when: IsMacNativeContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFolderAction.ID,
        title: localize({ key: 'miOpenFolder', comment: ['&& denotes a mnemonic'] }, "Open &&Folder...")
    },
    order: 2,
    when: OpenFolderWorkspaceSupportContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFolderViaWorkspaceAction.ID,
        title: localize({ key: 'miOpenFolder', comment: ['&& denotes a mnemonic'] }, "Open &&Folder...")
    },
    order: 2,
    when: ContextKeyExpr.and(OpenFolderWorkspaceSupportContext.toNegated(), WorkbenchStateContext.isEqualTo('workspace'))
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFileFolderAction.ID,
        title: localize({ key: 'miOpen', comment: ['&& denotes a mnemonic'] }, "&&Open...")
    },
    order: 1,
    when: ContextKeyExpr.and(IsMacNativeContext, OpenFolderWorkspaceSupportContext)
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenWorkspaceAction.ID,
        title: localize({ key: 'miOpenWorkspace', comment: ['&& denotes a mnemonic'] }, "Open Wor&&kspace from File...")
    },
    order: 3,
    when: EnterMultiRootWorkspaceSupportContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '3_workspace',
    command: {
        id: ADD_ROOT_FOLDER_COMMAND_ID,
        title: localize({ key: 'miAddFolderToWorkspace', comment: ['&& denotes a mnemonic'] }, "A&&dd Folder to Workspace...")
    },
    when: ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace')),
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '3_workspace',
    command: {
        id: SaveWorkspaceAsAction.ID,
        title: localize('miSaveWorkspaceAs', "Save Workspace As...")
    },
    order: 2,
    when: EnterMultiRootWorkspaceSupportContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '3_workspace',
    command: {
        id: DuplicateWorkspaceInNewWindowAction.ID,
        title: localize('duplicateWorkspace', "Duplicate Workspace")
    },
    order: 3,
    when: EnterMultiRootWorkspaceSupportContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: CloseWorkspaceAction.ID,
        title: localize({ key: 'miCloseFolder', comment: ['&& denotes a mnemonic'] }, "Close &&Folder")
    },
    order: 3,
    when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('folder'), EmptyWorkspaceSupportContext)
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: CloseWorkspaceAction.ID,
        title: localize({ key: 'miCloseWorkspace', comment: ['&& denotes a mnemonic'] }, "Close &&Workspace")
    },
    order: 3,
    when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), EmptyWorkspaceSupportContext)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvd29ya3NwYWNlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRXRELE9BQU8sRUFBRSx3QkFBd0IsRUFBb0MseUJBQXlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN4SixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxxQkFBcUIsRUFBRSxnQ0FBZ0MsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3pKLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUscUNBQXFDLEVBQUUsaUNBQWlDLEVBQUUscUJBQXFCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV6TSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFF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