/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ToggleAutoSaveAction, FocusFilesExplorer, GlobalCompareResourcesAction, ShowActiveFileInExplorer, CompareWithClipboardAction, NEW_FILE_COMMAND_ID, NEW_FILE_LABEL, NEW_FOLDER_COMMAND_ID, NEW_FOLDER_LABEL, TRIGGER_RENAME_LABEL, MOVE_FILE_TO_TRASH_LABEL, COPY_FILE_LABEL, PASTE_FILE_LABEL, FileCopiedContext, renameHandler, moveFileToTrashHandler, copyFileHandler, pasteFileHandler, deleteFileHandler, cutFileHandler, DOWNLOAD_COMMAND_ID, openFilePreserveFocusHandler, DOWNLOAD_LABEL, OpenActiveFileInEmptyWorkspace, UPLOAD_COMMAND_ID, UPLOAD_LABEL, CompareNewUntitledTextFilesAction, SetActiveEditorReadonlyInSession, SetActiveEditorWriteableInSession, ToggleActiveEditorReadonlyInSession, ResetActiveEditorReadonlyInSession } from './fileActions.js';
import { revertLocalChangesCommand, acceptLocalChangesCommand, CONFLICT_RESOLUTION_CONTEXT } from './editors/textFileSaveErrorHandler.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { openWindowCommand, newWindowCommand } from './fileCommands.js';
import { COPY_PATH_COMMAND_ID, REVEAL_IN_EXPLORER_COMMAND_ID, OPEN_TO_SIDE_COMMAND_ID, REVERT_FILE_COMMAND_ID, SAVE_FILE_COMMAND_ID, SAVE_FILE_LABEL, SAVE_FILE_AS_COMMAND_ID, SAVE_FILE_AS_LABEL, SAVE_ALL_IN_GROUP_COMMAND_ID, OpenEditorsGroupContext, COMPARE_WITH_SAVED_COMMAND_ID, COMPARE_RESOURCE_COMMAND_ID, SELECT_FOR_COMPARE_COMMAND_ID, ResourceSelectedForCompareContext, OpenEditorsDirtyEditorContext, COMPARE_SELECTED_COMMAND_ID, REMOVE_ROOT_FOLDER_COMMAND_ID, REMOVE_ROOT_FOLDER_LABEL, SAVE_FILES_COMMAND_ID, COPY_RELATIVE_PATH_COMMAND_ID, SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID, SAVE_FILE_WITHOUT_FORMATTING_LABEL, OpenEditorsReadonlyEditorContext, OPEN_WITH_EXPLORER_COMMAND_ID, NEW_UNTITLED_FILE_COMMAND_ID, NEW_UNTITLED_FILE_LABEL, SAVE_ALL_COMMAND_ID, OpenEditorsSelectedFileOrUntitledContext } from './fileConstants.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { FilesExplorerFocusCondition, ExplorerRootContext, ExplorerFolderContext, ExplorerResourceWritableContext, ExplorerResourceCut, ExplorerResourceMoveableToTrash, ExplorerResourceAvailableEditorIdsContext, FoldersViewVisibleContext } from '../common/files.js';
import { ADD_ROOT_FOLDER_COMMAND_ID, ADD_ROOT_FOLDER_LABEL } from '../../../browser/actions/workspaceCommands.js';
import { CLOSE_SAVED_EDITORS_COMMAND_ID, CLOSE_EDITORS_IN_GROUP_COMMAND_ID, CLOSE_EDITOR_COMMAND_ID, CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID, REOPEN_WITH_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { AutoSaveAfterShortDelayContext } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { WorkbenchListDoubleSelection } from '../../../../platform/list/browser/listService.js';
import { Schemas } from '../../../../base/common/network.js';
import { DirtyWorkingCopiesContext, EnterMultiRootWorkspaceSupportContext, HasWebFileSystemAccess, WorkbenchStateContext, WorkspaceFolderCountContext, SidebarFocusContext, ActiveEditorCanRevertContext, ActiveEditorContext, ResourceContextKey, ActiveEditorAvailableEditorIdsContext, MultipleEditorsSelectedInGroupContext, TwoEditorsSelectedInGroupContext, SelectedEditorsInGroupFileOrUntitledResourceContextKey } from '../../../common/contextkeys.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IExplorerService } from './files.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { VOID_OPEN_SETTINGS_ACTION_ID } from '../../void/browser/voidSettingsPane.js';
// Contribute Global Actions
registerAction2(GlobalCompareResourcesAction);
registerAction2(FocusFilesExplorer);
registerAction2(ShowActiveFileInExplorer);
registerAction2(CompareWithClipboardAction);
registerAction2(CompareNewUntitledTextFilesAction);
registerAction2(ToggleAutoSaveAction);
registerAction2(OpenActiveFileInEmptyWorkspace);
registerAction2(SetActiveEditorReadonlyInSession);
registerAction2(SetActiveEditorWriteableInSession);
registerAction2(ToggleActiveEditorReadonlyInSession);
registerAction2(ResetActiveEditorReadonlyInSession);
// Commands
CommandsRegistry.registerCommand('_files.windowOpen', openWindowCommand);
CommandsRegistry.registerCommand('_files.newWindow', newWindowCommand);
const explorerCommandsWeightBonus = 10; // give our commands a little bit more weight over other default list/tree commands
const RENAME_ID = 'renameFile';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: RENAME_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerRootContext.toNegated(), ExplorerResourceWritableContext),
    primary: 60 /* KeyCode.F2 */,
    mac: {
        primary: 3 /* KeyCode.Enter */
    },
    handler: renameHandler
});
const MOVE_FILE_TO_TRASH_ID = 'moveFileToTrash';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: MOVE_FILE_TO_TRASH_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceMoveableToTrash),
    primary: 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
        secondary: [20 /* KeyCode.Delete */]
    },
    handler: moveFileToTrashHandler
});
const DELETE_FILE_ID = 'deleteFile';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DELETE_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: FilesExplorerFocusCondition,
    primary: 1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */
    },
    handler: deleteFileHandler
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DELETE_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceMoveableToTrash.toNegated()),
    primary: 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */
    },
    handler: deleteFileHandler
});
const CUT_FILE_ID = 'filesExplorer.cut';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: CUT_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerRootContext.toNegated(), ExplorerResourceWritableContext),
    primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
    handler: cutFileHandler,
});
const COPY_FILE_ID = 'filesExplorer.copy';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: COPY_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerRootContext.toNegated()),
    primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
    handler: copyFileHandler,
});
const PASTE_FILE_ID = 'filesExplorer.paste';
CommandsRegistry.registerCommand(PASTE_FILE_ID, pasteFileHandler);
KeybindingsRegistry.registerKeybindingRule({
    id: `^${PASTE_FILE_ID}`, // the `^` enables pasting files into the explorer by preventing default bubble up
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceWritableContext),
    primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'filesExplorer.cancelCut',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceCut),
    primary: 9 /* KeyCode.Escape */,
    handler: async (accessor) => {
        const explorerService = accessor.get(IExplorerService);
        await explorerService.setToCopy([], true);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'filesExplorer.openFilePreserveFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerFolderContext.toNegated()),
    primary: 10 /* KeyCode.Space */,
    handler: openFilePreserveFocusHandler
});
const copyPathCommand = {
    id: COPY_PATH_COMMAND_ID,
    title: nls.localize('copyPath', "Copy Path")
};
const copyRelativePathCommand = {
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    title: nls.localize('copyRelativePath', "Copy Relative Path")
};
export const revealInSideBarCommand = {
    id: REVEAL_IN_EXPLORER_COMMAND_ID,
    title: nls.localize('revealInSideBar', "Reveal in Explorer View")
};
// Editor Title Context Menu
appendEditorTitleContextMenuItem(COPY_PATH_COMMAND_ID, copyPathCommand.title, ResourceContextKey.IsFileSystemResource, '1_cutcopypaste', true);
appendEditorTitleContextMenuItem(COPY_RELATIVE_PATH_COMMAND_ID, copyRelativePathCommand.title, ResourceContextKey.IsFileSystemResource, '1_cutcopypaste', true);
appendEditorTitleContextMenuItem(revealInSideBarCommand.id, revealInSideBarCommand.title, ResourceContextKey.IsFileSystemResource, '2_files', false, 1);
export function appendEditorTitleContextMenuItem(id, title, when, group, supportsMultiSelect, order) {
    const precondition = supportsMultiSelect !== true ? MultipleEditorsSelectedInGroupContext.negate() : undefined;
    // Menu
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: { id, title, precondition },
        when,
        group,
        order,
    });
}
// Editor Title Menu for Conflict Resolution
appendSaveConflictEditorTitleAction('workbench.files.action.acceptLocalChanges', nls.localize('acceptLocalChanges', "Use your changes and overwrite file contents"), Codicon.check, -10, acceptLocalChangesCommand);
appendSaveConflictEditorTitleAction('workbench.files.action.revertLocalChanges', nls.localize('revertLocalChanges', "Discard your changes and revert to file contents"), Codicon.discard, -9, revertLocalChangesCommand);
function appendSaveConflictEditorTitleAction(id, title, icon, order, command) {
    // Command
    CommandsRegistry.registerCommand(id, command);
    // Action
    MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
        command: { id, title, icon },
        when: ContextKeyExpr.equals(CONFLICT_RESOLUTION_CONTEXT, true),
        group: 'navigation',
        order
    });
}
// Menu registration - command palette
export function appendToCommandPalette({ id, title, category, metadata }, when) {
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id,
            title,
            category,
            metadata
        },
        when
    });
}
appendToCommandPalette({
    id: COPY_PATH_COMMAND_ID,
    title: nls.localize2('copyPathOfActive', "Copy Path of Active File"),
    category: Categories.File
});
appendToCommandPalette({
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    title: nls.localize2('copyRelativePathOfActive', "Copy Relative Path of Active File"),
    category: Categories.File
});
appendToCommandPalette({
    id: SAVE_FILE_COMMAND_ID,
    title: SAVE_FILE_LABEL,
    category: Categories.File
});
appendToCommandPalette({
    id: SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID,
    title: SAVE_FILE_WITHOUT_FORMATTING_LABEL,
    category: Categories.File
});
appendToCommandPalette({
    id: SAVE_ALL_IN_GROUP_COMMAND_ID,
    title: nls.localize2('saveAllInGroup', "Save All in Group"),
    category: Categories.File
});
appendToCommandPalette({
    id: SAVE_FILES_COMMAND_ID,
    title: nls.localize2('saveFiles', "Save All Files"),
    category: Categories.File
});
appendToCommandPalette({
    id: REVERT_FILE_COMMAND_ID,
    title: nls.localize2('revert', "Revert File"),
    category: Categories.File
});
appendToCommandPalette({
    id: COMPARE_WITH_SAVED_COMMAND_ID,
    title: nls.localize2('compareActiveWithSaved', "Compare Active File with Saved"),
    category: Categories.File,
    metadata: {
        description: nls.localize2('compareActiveWithSavedMeta', "Opens a new diff editor to compare the active file with the version on disk.")
    }
});
appendToCommandPalette({
    id: SAVE_FILE_AS_COMMAND_ID,
    title: SAVE_FILE_AS_LABEL,
    category: Categories.File
});
appendToCommandPalette({
    id: NEW_FILE_COMMAND_ID,
    title: NEW_FILE_LABEL,
    category: Categories.File
}, WorkspaceFolderCountContext.notEqualsTo('0'));
appendToCommandPalette({
    id: NEW_FOLDER_COMMAND_ID,
    title: NEW_FOLDER_LABEL,
    category: Categories.File,
    metadata: { description: nls.localize2('newFolderDescription', "Create a new folder or directory") }
}, WorkspaceFolderCountContext.notEqualsTo('0'));
appendToCommandPalette({
    id: NEW_UNTITLED_FILE_COMMAND_ID,
    title: NEW_UNTITLED_FILE_LABEL,
    category: Categories.File
});
// Menu registration - open editors
const isFileOrUntitledResourceContextKey = ContextKeyExpr.or(ResourceContextKey.IsFileSystemResource, ResourceContextKey.Scheme.isEqualTo(Schemas.untitled));
const openToSideCommand = {
    id: OPEN_TO_SIDE_COMMAND_ID,
    title: nls.localize('openToSide', "Open to the Side")
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: 'navigation',
    order: 10,
    command: openToSideCommand,
    when: isFileOrUntitledResourceContextKey
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '1_open',
    order: 10,
    command: {
        id: REOPEN_WITH_COMMAND_ID,
        title: nls.localize('reopenWith', "Reopen Editor With...")
    },
    when: ContextKeyExpr.and(
    // Editors with Available Choices to Open With
    ActiveEditorAvailableEditorIdsContext, 
    // Not: editor groups
    OpenEditorsGroupContext.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '1_cutcopypaste',
    order: 10,
    command: copyPathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '1_cutcopypaste',
    order: 20,
    command: copyRelativePathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '2_save',
    order: 10,
    command: {
        id: SAVE_FILE_COMMAND_ID,
        title: SAVE_FILE_LABEL,
        precondition: OpenEditorsDirtyEditorContext
    },
    when: ContextKeyExpr.or(
    // Untitled Editors
    ResourceContextKey.Scheme.isEqualTo(Schemas.untitled), 
    // Or:
    ContextKeyExpr.and(
    // Not: editor groups
    OpenEditorsGroupContext.toNegated(), 
    // Not: readonly editors
    OpenEditorsReadonlyEditorContext.toNegated(), 
    // Not: auto save after short delay
    AutoSaveAfterShortDelayContext.toNegated()))
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '2_save',
    order: 20,
    command: {
        id: REVERT_FILE_COMMAND_ID,
        title: nls.localize('revert', "Revert File"),
        precondition: OpenEditorsDirtyEditorContext
    },
    when: ContextKeyExpr.and(
    // Not: editor groups
    OpenEditorsGroupContext.toNegated(), 
    // Not: readonly editors
    OpenEditorsReadonlyEditorContext.toNegated(), 
    // Not: untitled editors (revert closes them)
    ResourceContextKey.Scheme.notEqualsTo(Schemas.untitled), 
    // Not: auto save after short delay
    AutoSaveAfterShortDelayContext.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '2_save',
    order: 30,
    command: {
        id: SAVE_ALL_IN_GROUP_COMMAND_ID,
        title: nls.localize('saveAll', "Save All"),
        precondition: DirtyWorkingCopiesContext
    },
    // Editor Group
    when: OpenEditorsGroupContext
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 10,
    command: {
        id: COMPARE_WITH_SAVED_COMMAND_ID,
        title: nls.localize('compareWithSaved', "Compare with Saved"),
        precondition: OpenEditorsDirtyEditorContext
    },
    when: ContextKeyExpr.and(ResourceContextKey.IsFileSystemResource, AutoSaveAfterShortDelayContext.toNegated(), WorkbenchListDoubleSelection.toNegated())
});
const compareResourceCommand = {
    id: COMPARE_RESOURCE_COMMAND_ID,
    title: nls.localize('compareWithSelected', "Compare with Selected")
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 20,
    command: compareResourceCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, ResourceSelectedForCompareContext, isFileOrUntitledResourceContextKey, WorkbenchListDoubleSelection.toNegated())
});
const selectForCompareCommand = {
    id: SELECT_FOR_COMPARE_COMMAND_ID,
    title: nls.localize('compareSource', "Select for Compare")
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 30,
    command: selectForCompareCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, isFileOrUntitledResourceContextKey, WorkbenchListDoubleSelection.toNegated())
});
const compareSelectedCommand = {
    id: COMPARE_SELECTED_COMMAND_ID,
    title: nls.localize('compareSelected', "Compare Selected")
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 30,
    command: compareSelectedCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, WorkbenchListDoubleSelection, OpenEditorsSelectedFileOrUntitledContext)
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    group: '1_compare',
    order: 30,
    command: compareSelectedCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, TwoEditorsSelectedInGroupContext, SelectedEditorsInGroupFileOrUntitledResourceContextKey)
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 10,
    command: {
        id: CLOSE_EDITOR_COMMAND_ID,
        title: nls.localize('close', "Close")
    },
    when: OpenEditorsGroupContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 20,
    command: {
        id: CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID,
        title: nls.localize('closeOthers', "Close Others")
    },
    when: OpenEditorsGroupContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 30,
    command: {
        id: CLOSE_SAVED_EDITORS_COMMAND_ID,
        title: nls.localize('closeSaved', "Close Saved")
    }
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 40,
    command: {
        id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
        title: nls.localize('closeAll', "Close All")
    }
});
// Menu registration - explorer
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 4,
    command: {
        id: NEW_FILE_COMMAND_ID,
        title: NEW_FILE_LABEL,
        precondition: ExplorerResourceWritableContext
    },
    when: ExplorerFolderContext
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 6,
    command: {
        id: NEW_FOLDER_COMMAND_ID,
        title: NEW_FOLDER_LABEL,
        precondition: ExplorerResourceWritableContext
    },
    when: ExplorerFolderContext
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 10,
    command: openToSideCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource)
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 20,
    command: {
        id: OPEN_WITH_EXPLORER_COMMAND_ID,
        title: nls.localize('explorerOpenWith', "Open With..."),
    },
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ExplorerResourceAvailableEditorIdsContext),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '3_compare',
    order: 20,
    command: compareResourceCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, ResourceSelectedForCompareContext, WorkbenchListDoubleSelection.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '3_compare',
    order: 30,
    command: selectForCompareCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, WorkbenchListDoubleSelection.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '3_compare',
    order: 30,
    command: compareSelectedCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, WorkbenchListDoubleSelection)
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5_cutcopypaste',
    order: 8,
    command: {
        id: CUT_FILE_ID,
        title: nls.localize('cut', "Cut"),
    },
    when: ContextKeyExpr.and(ExplorerRootContext.toNegated(), ExplorerResourceWritableContext)
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5_cutcopypaste',
    order: 10,
    command: {
        id: COPY_FILE_ID,
        title: COPY_FILE_LABEL,
    },
    when: ExplorerRootContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5_cutcopypaste',
    order: 20,
    command: {
        id: PASTE_FILE_ID,
        title: PASTE_FILE_LABEL,
        precondition: ContextKeyExpr.and(ExplorerResourceWritableContext, FileCopiedContext)
    },
    when: ExplorerFolderContext
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, ({
    group: '5b_importexport',
    order: 10,
    command: {
        id: DOWNLOAD_COMMAND_ID,
        title: DOWNLOAD_LABEL
    },
    when: ContextKeyExpr.or(
    // native: for any remote resource
    ContextKeyExpr.and(IsWebContext.toNegated(), ResourceContextKey.Scheme.notEqualsTo(Schemas.file)), 
    // web: for any files
    ContextKeyExpr.and(IsWebContext, ExplorerFolderContext.toNegated(), ExplorerRootContext.toNegated()), 
    // web: for any folders if file system API support is provided
    ContextKeyExpr.and(IsWebContext, HasWebFileSystemAccess))
}));
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, ({
    group: '5b_importexport',
    order: 20,
    command: {
        id: UPLOAD_COMMAND_ID,
        title: UPLOAD_LABEL,
    },
    when: ContextKeyExpr.and(
    // only in web
    IsWebContext, 
    // only on folders
    ExplorerFolderContext, 
    // only on writable folders
    ExplorerResourceWritableContext)
}));
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '6_copypath',
    order: 10,
    command: copyPathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '6_copypath',
    order: 20,
    command: copyRelativePathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '2_workspace',
    order: 10,
    command: {
        id: ADD_ROOT_FOLDER_COMMAND_ID,
        title: ADD_ROOT_FOLDER_LABEL,
    },
    when: ContextKeyExpr.and(ExplorerRootContext, ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace')))
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '2_workspace',
    order: 30,
    command: {
        id: REMOVE_ROOT_FOLDER_COMMAND_ID,
        title: REMOVE_ROOT_FOLDER_LABEL,
    },
    when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext, ContextKeyExpr.and(WorkspaceFolderCountContext.notEqualsTo('0'), ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace'))))
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '7_modification',
    order: 10,
    command: {
        id: RENAME_ID,
        title: TRIGGER_RENAME_LABEL,
        precondition: ExplorerResourceWritableContext,
    },
    when: ExplorerRootContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '7_modification',
    order: 20,
    command: {
        id: MOVE_FILE_TO_TRASH_ID,
        title: MOVE_FILE_TO_TRASH_LABEL
    },
    alt: {
        id: DELETE_FILE_ID,
        title: nls.localize('deleteFile', "Delete Permanently")
    },
    when: ContextKeyExpr.and(ExplorerRootContext.toNegated(), ExplorerResourceMoveableToTrash)
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '7_modification',
    order: 20,
    command: {
        id: DELETE_FILE_ID,
        title: nls.localize('deleteFile', "Delete Permanently")
    },
    when: ContextKeyExpr.and(ExplorerRootContext.toNegated(), ExplorerResourceMoveableToTrash.toNegated())
});
// Empty Editor Group / Editor Tabs Container Context Menu
for (const menuId of [MenuId.EmptyEditorGroupContext, MenuId.EditorTabsBarContext]) {
    MenuRegistry.appendMenuItem(menuId, { command: { id: NEW_UNTITLED_FILE_COMMAND_ID, title: nls.localize('newFile', "New Text File") }, group: '1_file', order: 10 });
    MenuRegistry.appendMenuItem(menuId, { command: { id: 'workbench.action.quickOpen', title: nls.localize('openFile', "Open File...") }, group: '1_file', order: 20 });
}
// File menu
// Void added this:
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '0_void',
    command: {
        id: VOID_OPEN_SETTINGS_ACTION_ID,
        title: nls.localize({ key: 'openVoid', comment: ['&& denotes a mnemonic'] }, "&&Open Void Settings"),
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '1_new',
    command: {
        id: NEW_UNTITLED_FILE_COMMAND_ID,
        title: nls.localize({ key: 'miNewFile', comment: ['&& denotes a mnemonic'] }, "&&New Text File")
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '4_save',
    command: {
        id: SAVE_FILE_COMMAND_ID,
        title: nls.localize({ key: 'miSave', comment: ['&& denotes a mnemonic'] }, "&&Save"),
        precondition: ContextKeyExpr.or(ActiveEditorContext, ContextKeyExpr.and(FoldersViewVisibleContext, SidebarFocusContext))
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '4_save',
    command: {
        id: SAVE_FILE_AS_COMMAND_ID,
        title: nls.localize({ key: 'miSaveAs', comment: ['&& denotes a mnemonic'] }, "Save &&As..."),
        precondition: ContextKeyExpr.or(ActiveEditorContext, ContextKeyExpr.and(FoldersViewVisibleContext, SidebarFocusContext))
    },
    order: 2
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '4_save',
    command: {
        id: SAVE_ALL_COMMAND_ID,
        title: nls.localize({ key: 'miSaveAll', comment: ['&& denotes a mnemonic'] }, "Save A&&ll"),
        precondition: DirtyWorkingCopiesContext
    },
    order: 3
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '5_autosave',
    command: {
        id: ToggleAutoSaveAction.ID,
        title: nls.localize({ key: 'miAutoSave', comment: ['&& denotes a mnemonic'] }, "A&&uto Save"),
        toggled: ContextKeyExpr.notEquals('config.files.autoSave', 'off')
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: REVERT_FILE_COMMAND_ID,
        title: nls.localize({ key: 'miRevert', comment: ['&& denotes a mnemonic'] }, "Re&&vert File"),
        precondition: ContextKeyExpr.or(
        // Active editor can revert
        ContextKeyExpr.and(ActiveEditorCanRevertContext), 
        // Explorer focused but not on untitled
        ContextKeyExpr.and(ResourceContextKey.Scheme.notEqualsTo(Schemas.untitled), FoldersViewVisibleContext, SidebarFocusContext)),
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: CLOSE_EDITOR_COMMAND_ID,
        title: nls.localize({ key: 'miCloseEditor', comment: ['&& denotes a mnemonic'] }, "&&Close Editor"),
        precondition: ContextKeyExpr.or(ActiveEditorContext, ContextKeyExpr.and(FoldersViewVisibleContext, SidebarFocusContext))
    },
    order: 2
});
// Go to menu
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '3_global_nav',
    command: {
        id: 'workbench.action.quickOpen',
        title: nls.localize({ key: 'miGotoFile', comment: ['&& denotes a mnemonic'] }, "Go to &&File...")
    },
    order: 1
});
// Chat used attachment anchor context menu
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: 'navigation',
    order: 10,
    command: openToSideCommand,
    when: ContextKeyExpr.and(ResourceContextKey.IsFileSystemResource, ExplorerFolderContext.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: 'navigation',
    order: 20,
    command: revealInSideBarCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: '1_cutcopypaste',
    order: 10,
    command: copyPathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: '1_cutcopypaste',
    order: 20,
    command: copyRelativePathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
// Chat resource anchor attachments/anchors context menu
for (const menuId of [MenuId.ChatInlineResourceAnchorContext, MenuId.ChatInputResourceAttachmentContext]) {
    MenuRegistry.appendMenuItem(menuId, {
        group: 'navigation',
        order: 10,
        command: openToSideCommand,
        when: ContextKeyExpr.and(ResourceContextKey.HasResource, ExplorerFolderContext.toNegated())
    });
    MenuRegistry.appendMenuItem(menuId, {
        group: 'navigation',
        order: 20,
        command: revealInSideBarCommand,
        when: ResourceContextKey.IsFileSystemResource
    });
    MenuRegistry.appendMenuItem(menuId, {
        group: '1_cutcopypaste',
        order: 10,
        command: copyPathCommand,
        when: ResourceContextKey.IsFileSystemResource
    });
    MenuRegistry.appendMenuItem(menuId, {
        group: '1_cutcopypaste',
        order: 20,
        command: copyRelativePathCommand,
        when: ResourceContextKey.IsFileSystemResource
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZmlsZUFjdGlvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLDRCQUE0QixFQUFFLHdCQUF3QixFQUFFLDBCQUEwQixFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSx3QkFBd0IsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsNEJBQTRCLEVBQUUsY0FBYyxFQUFFLDhCQUE4QixFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxpQ0FBaUMsRUFBRSxnQ0FBZ0MsRUFBRSxpQ0FBaUMsRUFBRSxtQ0FBbUMsRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3R2QixPQUFPLEVBQUUseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxSSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUd2RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsNkJBQTZCLEVB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