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
import { localize, localize2 } from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorResourceAccessor } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { CLOSE_EDITOR_COMMAND_ID, MOVE_ACTIVE_EDITOR_COMMAND_ID, SPLIT_EDITOR_LEFT, SPLIT_EDITOR_RIGHT, SPLIT_EDITOR_UP, SPLIT_EDITOR_DOWN, splitEditor, LAYOUT_EDITOR_GROUPS_COMMAND_ID, UNPIN_EDITOR_COMMAND_ID, COPY_ACTIVE_EDITOR_COMMAND_ID, SPLIT_EDITOR, TOGGLE_MAXIMIZE_EDITOR_GROUP, MOVE_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, COPY_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, MOVE_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, COPY_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID as NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID } from './editorCommands.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ItemActivation, IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { AllEditorsByMostRecentlyUsedQuickAccess, ActiveGroupEditorsByMostRecentlyUsedQuickAccess, AllEditorsByAppearanceQuickAccess } from './editorQuickAccess.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { isLinux, isNative, isWindows } from '../../../../base/common/platform.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { ActiveEditorAvailableEditorIdsContext, ActiveEditorContext, ActiveEditorGroupEmptyContext, AuxiliaryBarVisibleContext, EditorPartMaximizedEditorGroupContext, EditorPartMultipleEditorGroupsContext, IsAuxiliaryWindowFocusedContext, MultipleEditorGroupsContext, SideBarVisibleContext } from '../../../common/contextkeys.js';
import { getActiveDocument } from '../../../../base/browser/dom.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { resolveCommandsContext } from './editorCommandsContext.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { prepareMoveCopyEditors } from './editor.js';
class ExecuteCommandAction extends Action2 {
    constructor(desc, commandId, commandArgs) {
        super(desc);
        this.commandId = commandId;
        this.commandArgs = commandArgs;
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        return commandService.executeCommand(this.commandId, this.commandArgs);
    }
}
class AbstractSplitEditorAction extends Action2 {
    getDirection(configurationService) {
        return preferredSideBySideGroupDirection(configurationService);
    }
    async run(accessor, ...args) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const configurationService = accessor.get(IConfigurationService);
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const direction = this.getDirection(configurationService);
        const commandContext = resolveCommandsContext(args, editorService, editorGroupsService, listService);
        splitEditor(editorGroupsService, direction, commandContext);
    }
}
export class SplitEditorAction extends AbstractSplitEditorAction {
    static { this.ID = SPLIT_EDITOR; }
    constructor() {
        super({
            id: SplitEditorAction.ID,
            title: localize2('splitEditor', 'Split Editor'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */
            },
            category: Categories.View
        });
    }
}
export class SplitEditorOrthogonalAction extends AbstractSplitEditorAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorOrthogonal',
            title: localize2('splitEditorOrthogonal', 'Split Editor Orthogonal'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */)
            },
            category: Categories.View
        });
    }
    getDirection(configurationService) {
        const direction = preferredSideBySideGroupDirection(configurationService);
        return direction === 3 /* GroupDirection.RIGHT */ ? 1 /* GroupDirection.DOWN */ : 3 /* GroupDirection.RIGHT */;
    }
}
export class SplitEditorLeftAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: SPLIT_EDITOR_LEFT,
            title: localize2('splitEditorGroupLeft', 'Split Editor Left'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */)
            },
            category: Categories.View
        }, SPLIT_EDITOR_LEFT);
    }
}
export class SplitEditorRightAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: SPLIT_EDITOR_RIGHT,
            title: localize2('splitEditorGroupRight', 'Split Editor Right'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */)
            },
            category: Categories.View
        }, SPLIT_EDITOR_RIGHT);
    }
}
export class SplitEditorUpAction extends ExecuteCommandAction {
    static { this.LABEL = localize('splitEditorGroupUp', "Split Editor Up"); }
    constructor() {
        super({
            id: SPLIT_EDITOR_UP,
            title: localize2('splitEditorGroupUp', "Split Editor Up"),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */)
            },
            category: Categories.View
        }, SPLIT_EDITOR_UP);
    }
}
export class SplitEditorDownAction extends ExecuteCommandAction {
    static { this.LABEL = localize('splitEditorGroupDown', "Split Editor Down"); }
    constructor() {
        super({
            id: SPLIT_EDITOR_DOWN,
            title: localize2('splitEditorGroupDown', "Split Editor Down"),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */)
            },
            category: Categories.View
        }, SPLIT_EDITOR_DOWN);
    }
}
export class JoinTwoGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.joinTwoGroups',
            title: localize2('joinTwoGroups', 'Join Editor Group with Next Group'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor, context) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        let sourceGroup;
        if (context && typeof context.groupId === 'number') {
            sourceGroup = editorGroupService.getGroup(context.groupId);
        }
        else {
            sourceGroup = editorGroupService.activeGroup;
        }
        if (sourceGroup) {
            const targetGroupDirections = [3 /* GroupDirection.RIGHT */, 1 /* GroupDirection.DOWN */, 2 /* GroupDirection.LEFT */, 0 /* GroupDirection.UP */];
            for (const targetGroupDirection of targetGroupDirections) {
                const targetGroup = editorGroupService.findGroup({ direction: targetGroupDirection }, sourceGroup);
                if (targetGroup && sourceGroup !== targetGroup) {
                    editorGroupService.mergeGroup(sourceGroup, targetGroup);
                    break;
                }
            }
        }
    }
}
export class JoinAllGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.joinAllGroups',
            title: localize2('joinAllGroups', 'Join All Editor Groups'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.mergeAllGroups(editorGroupService.activeGroup);
    }
}
export class NavigateBetweenGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateEditorGroups',
            title: localize2('navigateEditorGroups', 'Navigate Between Editor Groups'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const nextGroup = editorGroupService.findGroup({ location: 2 /* GroupLocation.NEXT */ }, editorGroupService.activeGroup, true);
        nextGroup?.focus();
    }
}
export class FocusActiveGroupAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.focusActiveEditorGroup',
            title: localize2('focusActiveEditorGroup', 'Focus Active Editor Group'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.activeGroup.focus();
    }
}
class AbstractFocusGroupAction extends Action2 {
    constructor(desc, scope) {
        super(desc);
        this.scope = scope;
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const group = editorGroupService.findGroup(this.scope, editorGroupService.activeGroup, true);
        group?.focus();
    }
}
export class FocusFirstGroupAction extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusFirstEditorGroup',
            title: localize2('focusFirstEditorGroup', 'Focus First Editor Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */
            },
            category: Categories.View
        }, { location: 0 /* GroupLocation.FIRST */ });
    }
}
export class FocusLastGroupAction extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusLastEditorGroup',
            title: localize2('focusLastEditorGroup', 'Focus Last Editor Group'),
            f1: true,
            category: Categories.View
        }, { location: 1 /* GroupLocation.LAST */ });
    }
}
export class FocusNextGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusNextGroup',
            title: localize2('focusNextGroup', 'Focus Next Editor Group'),
            f1: true,
            category: Categories.View
        }, { location: 2 /* GroupLocation.NEXT */ });
    }
}
export class FocusPreviousGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusPreviousGroup',
            title: localize2('focusPreviousGroup', 'Focus Previous Editor Group'),
            f1: true,
            category: Categories.View
        }, { location: 3 /* GroupLocation.PREVIOUS */ });
    }
}
export class FocusLeftGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusLeftGroup',
            title: localize2('focusLeftGroup', 'Focus Left Editor Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */)
            },
            category: Categories.View
        }, { direction: 2 /* GroupDirection.LEFT */ });
    }
}
export class FocusRightGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusRightGroup',
            title: localize2('focusRightGroup', 'Focus Right Editor Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */)
            },
            category: Categories.View
        }, { direction: 3 /* GroupDirection.RIGHT */ });
    }
}
export class FocusAboveGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusAboveGroup',
            title: localize2('focusAboveGroup', 'Focus Editor Group Above'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */)
            },
            category: Categories.View
        }, { direction: 0 /* GroupDirection.UP */ });
    }
}
export class FocusBelowGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusBelowGroup',
            title: localize2('focusBelowGroup', 'Focus Editor Group Below'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */)
            },
            category: Categories.View
        }, { direction: 1 /* GroupDirection.DOWN */ });
    }
}
let CloseEditorAction = class CloseEditorAction extends Action {
    static { this.ID = 'workbench.action.closeActiveEditor'; }
    static { this.LABEL = localize('closeEditor', "Close Editor"); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(Codicon.close));
        this.commandService = commandService;
    }
    run(context) {
        return this.commandService.executeCommand(CLOSE_EDITOR_COMMAND_ID, undefined, context);
    }
};
CloseEditorAction = __decorate([
    __param(2, ICommandService)
], CloseEditorAction);
export { CloseEditorAction };
let UnpinEditorAction = class UnpinEditorAction extends Action {
    static { this.ID = 'workbench.action.unpinActiveEditor'; }
    static { this.LABEL = localize('unpinEditor', "Unpin Editor"); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(Codicon.pinned));
        this.commandService = commandService;
    }
    run(context) {
        return this.commandService.executeCommand(UNPIN_EDITOR_COMMAND_ID, undefined, context);
    }
};
UnpinEditorAction = __decorate([
    __param(2, ICommandService)
], UnpinEditorAction);
export { UnpinEditorAction };
let CloseEditorTabAction = class CloseEditorTabAction extends Action {
    static { this.ID = 'workbench.action.closeActiveEditor'; }
    static { this.LABEL = localize('closeOneEditor', "Close"); }
    constructor(id, label, editorGroupService) {
        super(id, label, ThemeIcon.asClassName(Codicon.close));
        this.editorGroupService = editorGroupService;
    }
    async run(context) {
        const group = context ? this.editorGroupService.getGroup(context.groupId) : this.editorGroupService.activeGroup;
        if (!group) {
            // group mentioned in context does not exist
            return;
        }
        const targetEditor = context?.editorIndex !== undefined ? group.getEditorByIndex(context.editorIndex) : group.activeEditor;
        if (!targetEditor) {
            // No editor open or editor at index does not exist
            return;
        }
        const editors = [];
        if (group.isSelected(targetEditor)) {
            editors.push(...group.selectedEditors);
        }
        else {
            editors.push(targetEditor);
        }
        // Close specific editors in group
        for (const editor of editors) {
            await group.closeEditor(editor, { preserveFocus: context?.preserveFocus });
        }
    }
};
CloseEditorTabAction = __decorate([
    __param(2, IEditorGroupsService)
], CloseEditorTabAction);
export { CloseEditorTabAction };
export class RevertAndCloseEditorAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.revertAndCloseActiveEditor',
            title: localize2('revertAndCloseActiveEditor', 'Revert and Close Editor'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane) {
            const editor = activeEditorPane.input;
            const group = activeEditorPane.group;
            // first try a normal revert where the contents of the editor are restored
            try {
                await editorService.revert({ editor, groupId: group.id });
            }
            catch (error) {
                logService.error(error);
                // if that fails, since we are about to close the editor, we accept that
                // the editor cannot be reverted and instead do a soft revert that just
                // enables us to close the editor. With this, a user can always close a
                // dirty editor even when reverting fails.
                await editorService.revert({ editor, groupId: group.id }, { soft: true });
            }
            await group.closeEditor(editor);
        }
    }
}
export class CloseLeftEditorsInGroupAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeEditorsToTheLeft',
            title: localize2('closeEditorsToTheLeft', 'Close Editors to the Left in Group'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor, context) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const { group, editor } = this.getTarget(editorGroupService, context);
        if (group && editor) {
            await group.closeEditors({ direction: 0 /* CloseDirection.LEFT */, except: editor, excludeSticky: true });
        }
    }
    getTarget(editorGroupService, context) {
        if (context) {
            return { editor: context.editor, group: editorGroupService.getGroup(context.groupId) };
        }
        // Fallback to active group
        return { group: editorGroupService.activeGroup, editor: editorGroupService.activeGroup.activeEditor };
    }
}
class AbstractCloseAllAction extends Action2 {
    groupsToClose(editorGroupService) {
        const groupsToClose = [];
        // Close editors in reverse order of their grid appearance so that the editor
        // group that is the first (top-left) remains. This helps to keep view state
        // for editors around that have been opened in this visually first group.
        const groups = editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        for (let i = groups.length - 1; i >= 0; i--) {
            groupsToClose.push(groups[i]);
        }
        return groupsToClose;
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        const progressService = accessor.get(IProgressService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const filesConfigurationService = accessor.get(IFilesConfigurationService);
        const fileDialogService = accessor.get(IFileDialogService);
        // Depending on the editor and auto save configuration,
        // split editors into buckets for handling confirmation
        const dirtyEditorsWithDefaultConfirm = new Set();
        const dirtyAutoSaveOnFocusChangeEditors = new Set();
        const dirtyAutoSaveOnWindowChangeEditors = new Set();
        const editorsWithCustomConfirm = new Map();
        for (const { editor, groupId } of editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: this.excludeSticky })) {
            let confirmClose = false;
            if (editor.closeHandler) {
                confirmClose = editor.closeHandler.showConfirm(); // custom handling of confirmation on close
            }
            else {
                confirmClose = editor.isDirty() && !editor.isSaving(); // default confirm only when dirty and not saving
            }
            if (!confirmClose) {
                continue;
            }
            // Editor has custom confirm implementation
            if (typeof editor.closeHandler?.confirm === 'function') {
                let customEditorsToConfirm = editorsWithCustomConfirm.get(editor.typeId);
                if (!customEditorsToConfirm) {
                    customEditorsToConfirm = new Set();
                    editorsWithCustomConfirm.set(editor.typeId, customEditorsToConfirm);
                }
                customEditorsToConfirm.add({ editor, groupId });
            }
            // Editor will be saved on focus change when a
            // dialog appears, so just track that separate
            else if (!editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) && filesConfigurationService.getAutoSaveMode(editor).mode === 3 /* AutoSaveMode.ON_FOCUS_CHANGE */) {
                dirtyAutoSaveOnFocusChangeEditors.add({ editor, groupId });
            }
            // Windows, Linux: editor will be saved on window change
            // when a native dialog appears, so just track that separate
            // (see https://github.com/microsoft/vscode/issues/134250)
            else if ((isNative && (isWindows || isLinux)) && !editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) && filesConfigurationService.getAutoSaveMode(editor).mode === 4 /* AutoSaveMode.ON_WINDOW_CHANGE */) {
                dirtyAutoSaveOnWindowChangeEditors.add({ editor, groupId });
            }
            // Editor will show in generic file based dialog
            else {
                dirtyEditorsWithDefaultConfirm.add({ editor, groupId });
            }
        }
        // 1.) Show default file based dialog
        if (dirtyEditorsWithDefaultConfirm.size > 0) {
            const editors = Array.from(dirtyEditorsWithDefaultConfirm.values());
            await this.revealEditorsToConfirm(editors, editorGroupService); // help user make a decision by revealing editors
            const confirmation = await fileDialogService.showSaveConfirm(editors.map(({ editor }) => {
                if (editor instanceof SideBySideEditorInput) {
                    return editor.primary.getName(); // prefer shorter names by using primary's name in this case
                }
                return editor.getName();
            }));
            switch (confirmation) {
                case 2 /* ConfirmResult.CANCEL */:
                    return;
                case 1 /* ConfirmResult.DONT_SAVE */:
                    await this.revertEditors(editorService, logService, progressService, editors);
                    break;
                case 0 /* ConfirmResult.SAVE */:
                    await editorService.save(editors, { reason: 1 /* SaveReason.EXPLICIT */ });
                    break;
            }
        }
        // 2.) Show custom confirm based dialog
        for (const [, editorIdentifiers] of editorsWithCustomConfirm) {
            const editors = Array.from(editorIdentifiers.values());
            await this.revealEditorsToConfirm(editors, editorGroupService); // help user make a decision by revealing editors
            const confirmation = await editors.at(0)?.editor.closeHandler?.confirm?.(editors);
            if (typeof confirmation === 'number') {
                switch (confirmation) {
                    case 2 /* ConfirmResult.CANCEL */:
                        return;
                    case 1 /* ConfirmResult.DONT_SAVE */:
                        await this.revertEditors(editorService, logService, progressService, editors);
                        break;
                    case 0 /* ConfirmResult.SAVE */:
                        await editorService.save(editors, { reason: 1 /* SaveReason.EXPLICIT */ });
                        break;
                }
            }
        }
        // 3.) Save autosaveable editors (focus change)
        if (dirtyAutoSaveOnFocusChangeEditors.size > 0) {
            const editors = Array.from(dirtyAutoSaveOnFocusChangeEditors.values());
            await editorService.save(editors, { reason: 3 /* SaveReason.FOCUS_CHANGE */ });
        }
        // 4.) Save autosaveable editors (window change)
        if (dirtyAutoSaveOnWindowChangeEditors.size > 0) {
            const editors = Array.from(dirtyAutoSaveOnWindowChangeEditors.values());
            await editorService.save(editors, { reason: 4 /* SaveReason.WINDOW_CHANGE */ });
        }
        // 5.) Finally close all editors: even if an editor failed to
        // save or revert and still reports dirty, the editor part makes
        // sure to bring up another confirm dialog for those editors
        // specifically.
        return this.doCloseAll(editorGroupService);
    }
    revertEditors(editorService, logService, progressService, editors) {
        return progressService.withProgress({
            location: 10 /* ProgressLocation.Window */, // use window progress to not be too annoying about this operation
            delay: 800, // delay so that it only appears when operation takes a long time
            title: localize('reverting', "Reverting Editors..."),
        }, () => this.doRevertEditors(editorService, logService, editors));
    }
    async doRevertEditors(editorService, logService, editors) {
        try {
            // We first attempt to revert all editors with `soft: false`, to ensure that
            // working copies revert to their state on disk. Even though we close editors,
            // it is possible that other parties hold a reference to the working copy
            // and expect it to be in a certain state after the editor is closed without
            // saving.
            await editorService.revert(editors);
        }
        catch (error) {
            logService.error(error);
            // if that fails, since we are about to close the editor, we accept that
            // the editor cannot be reverted and instead do a soft revert that just
            // enables us to close the editor. With this, a user can always close a
            // dirty editor even when reverting fails.
            await editorService.revert(editors, { soft: true });
        }
    }
    async revealEditorsToConfirm(editors, editorGroupService) {
        try {
            const handledGroups = new Set();
            for (const { editor, groupId } of editors) {
                if (handledGroups.has(groupId)) {
                    continue;
                }
                handledGroups.add(groupId);
                const group = editorGroupService.getGroup(groupId);
                await group?.openEditor(editor);
            }
        }
        catch (error) {
            // ignore any error as the revealing is just convinience
        }
    }
    async doCloseAll(editorGroupService) {
        await Promise.all(this.groupsToClose(editorGroupService).map(group => group.closeAllEditors({ excludeSticky: this.excludeSticky })));
    }
}
export class CloseAllEditorsAction extends AbstractCloseAllAction {
    static { this.ID = 'workbench.action.closeAllEditors'; }
    static { this.LABEL = localize2('closeAllEditors', 'Close All Editors'); }
    constructor() {
        super({
            id: CloseAllEditorsAction.ID,
            title: CloseAllEditorsAction.LABEL,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */)
            },
            icon: Codicon.closeAll,
            category: Categories.View
        });
    }
    get excludeSticky() {
        return true; // exclude sticky from this mass-closing operation
    }
}
export class CloseAllEditorGroupsAction extends AbstractCloseAllAction {
    constructor() {
        super({
            id: 'workbench.action.closeAllGroups',
            title: localize2('closeAllGroups', 'Close All Editor Groups'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 53 /* KeyCode.KeyW */)
            },
            category: Categories.View
        });
    }
    get excludeSticky() {
        return false; // the intent to close groups means, even sticky are included
    }
    async doCloseAll(editorGroupService) {
        await super.doCloseAll(editorGroupService);
        for (const groupToClose of this.groupsToClose(editorGroupService)) {
            editorGroupService.removeGroup(groupToClose);
        }
    }
}
export class CloseEditorsInOtherGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeEditorsInOtherGroups',
            title: localize2('closeEditorsInOtherGroups', 'Close Editors in Other Groups'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor, context) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const groupToSkip = context ? editorGroupService.getGroup(context.groupId) : editorGroupService.activeGroup;
        await Promise.all(editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).map(async (group) => {
            if (groupToSkip && group.id === groupToSkip.id) {
                return;
            }
            return group.closeAllEditors({ excludeSticky: true });
        }));
    }
}
export class CloseEditorInAllGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeEditorInAllGroups',
            title: localize2('closeEditorInAllGroups', 'Close Editor in All Groups'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const activeEditor = editorService.activeEditor;
        if (activeEditor) {
            await Promise.all(editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).map(group => group.closeEditor(activeEditor)));
        }
    }
}
class AbstractMoveCopyGroupAction extends Action2 {
    constructor(desc, direction, isMove) {
        super(desc);
        this.direction = direction;
        this.isMove = isMove;
    }
    async run(accessor, context) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        let sourceGroup;
        if (context && typeof context.groupId === 'number') {
            sourceGroup = editorGroupService.getGroup(context.groupId);
        }
        else {
            sourceGroup = editorGroupService.activeGroup;
        }
        if (sourceGroup) {
            let resultGroup = undefined;
            if (this.isMove) {
                const targetGroup = this.findTargetGroup(editorGroupService, sourceGroup);
                if (targetGroup) {
                    resultGroup = editorGroupService.moveGroup(sourceGroup, targetGroup, this.direction);
                }
            }
            else {
                resultGroup = editorGroupService.copyGroup(sourceGroup, sourceGroup, this.direction);
            }
            if (resultGroup) {
                editorGroupService.activateGroup(resultGroup);
            }
        }
    }
    findTargetGroup(editorGroupService, sourceGroup) {
        const targetNeighbours = [this.direction];
        // Allow the target group to be in alternative locations to support more
        // scenarios of moving the group to the taret location.
        // Helps for https://github.com/microsoft/vscode/issues/50741
        switch (this.direction) {
            case 2 /* GroupDirection.LEFT */:
            case 3 /* GroupDirection.RIGHT */:
                targetNeighbours.push(0 /* GroupDirection.UP */, 1 /* GroupDirection.DOWN */);
                break;
            case 0 /* GroupDirection.UP */:
            case 1 /* GroupDirection.DOWN */:
                targetNeighbours.push(2 /* GroupDirection.LEFT */, 3 /* GroupDirection.RIGHT */);
                break;
        }
        for (const targetNeighbour of targetNeighbours) {
            const targetNeighbourGroup = editorGroupService.findGroup({ direction: targetNeighbour }, sourceGroup);
            if (targetNeighbourGroup) {
                return targetNeighbourGroup;
            }
        }
        return undefined;
    }
}
class AbstractMoveGroupAction extends AbstractMoveCopyGroupAction {
    constructor(desc, direction) {
        super(desc, direction, true);
    }
}
export class MoveGroupLeftAction extends AbstractMoveGroupAction {
    constructor() {
        super({
            id: 'workbench.action.moveActiveEditorGroupLeft',
            title: localize2('moveActiveGroupLeft', 'Move Editor Group Left'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 15 /* KeyCode.LeftArrow */)
            },
            category: Categories.View
        }, 2 /* GroupDirection.LEFT */);
    }
}
export class MoveGroupRightAction extends AbstractMoveGroupAction {
    constructor() {
        super({
            id: 'workbench.action.moveActiveEditorGroupRight',
            title: localize2('moveActiveGroupRight', 'Move Editor Group Right'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 17 /* KeyCode.RightArrow */)
            },
            category: Categories.View
        }, 3 /* GroupDirection.RIGHT */);
    }
}
export class MoveGroupUpAction extends AbstractMoveGroupAction {
    constructor() {
        super({
            id: 'workbench.action.moveActiveEditorGroupUp',
            title: localize2('moveActiveGroupUp', 'Move Editor Group Up'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 16 /* KeyCode.UpArrow */)
            },
            category: Categories.View
        }, 0 /* GroupDirection.UP */);
    }
}
export class MoveGroupDownAction extends AbstractMoveGroupAction {
    constructor() {
        super({
            id: 'workbench.action.moveActiveEditorGroupDown',
            title: localize2('moveActiveGroupDown', 'Move Editor Group Down'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 18 /* KeyCode.DownArrow */)
            },
            category: Categories.View
        }, 1 /* GroupDirection.DOWN */);
    }
}
class AbstractDuplicateGroupAction extends AbstractMoveCopyGroupAction {
    constructor(desc, direction) {
        super(desc, direction, false);
    }
}
export class DuplicateGroupLeftAction extends AbstractDuplicateGroupAction {
    constructor() {
        super({
            id: 'workbench.action.duplicateActiveEditorGroupLeft',
            title: localize2('duplicateActiveGroupLeft', 'Duplicate Editor Group Left'),
            f1: true,
            category: Categories.View
        }, 2 /* GroupDirection.LEFT */);
    }
}
export class DuplicateGroupRightAction extends AbstractDuplicateGroupAction {
    constructor() {
        super({
            id: 'workbench.action.duplicateActiveEditorGroupRight',
            title: localize2('duplicateActiveGroupRight', 'Duplicate Editor Group Right'),
            f1: true,
            category: Categories.View
        }, 3 /* GroupDirection.RIGHT */);
    }
}
export class DuplicateGroupUpAction extends AbstractDuplicateGroupAction {
    constructor() {
        super({
            id: 'workbench.action.duplicateActiveEditorGroupUp',
            title: localize2('duplicateActiveGroupUp', 'Duplicate Editor Group Up'),
            f1: true,
            category: Categories.View
        }, 0 /* GroupDirection.UP */);
    }
}
export class DuplicateGroupDownAction extends AbstractDuplicateGroupAction {
    constructor() {
        super({
            id: 'workbench.action.duplicateActiveEditorGroupDown',
            title: localize2('duplicateActiveGroupDown', 'Duplicate Editor Group Down'),
            f1: true,
            category: Categories.View
        }, 1 /* GroupDirection.DOWN */);
    }
}
export class MinimizeOtherGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.minimizeOtherEditors',
            title: localize2('minimizeOtherEditorGroups', 'Expand Editor Group'),
            f1: true,
            category: Categories.View,
            precondition: MultipleEditorGroupsContext
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.arrangeGroups(1 /* GroupsArrangement.EXPAND */);
    }
}
export class MinimizeOtherGroupsHideSidebarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.minimizeOtherEditorsHideSidebar',
            title: localize2('minimizeOtherEditorGroupsHideSidebar', 'Expand Editor Group and Hide Side Bars'),
            f1: true,
            category: Categories.View,
            precondition: ContextKeyExpr.or(MultipleEditorGroupsContext, SideBarVisibleContext, AuxiliaryBarVisibleContext)
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(true, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        editorGroupService.arrangeGroups(1 /* GroupsArrangement.EXPAND */);
    }
}
export class ResetGroupSizesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.evenEditorWidths',
            title: localize2('evenEditorGroups', 'Reset Editor Group Sizes'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.arrangeGroups(2 /* GroupsArrangement.EVEN */);
    }
}
export class ToggleGroupSizesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleEditorWidths',
            title: localize2('toggleEditorWidths', 'Toggle Editor Group Sizes'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.toggleExpandGroup();
    }
}
export class MaximizeGroupHideSidebarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.maximizeEditorHideSidebar',
            title: localize2('maximizeEditorHideSidebar', 'Maximize Editor Group and Hide Side Bars'),
            f1: true,
            category: Categories.View,
            precondition: ContextKeyExpr.or(ContextKeyExpr.and(EditorPartMaximizedEditorGroupContext.negate(), EditorPartMultipleEditorGroupsContext), SideBarVisibleContext, AuxiliaryBarVisibleContext)
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        if (editorService.activeEditor) {
            layoutService.setPartHidden(true, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
            layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            editorGroupService.arrangeGroups(0 /* GroupsArrangement.MAXIMIZE */);
        }
    }
}
export class ToggleMaximizeEditorGroupAction extends Action2 {
    constructor() {
        super({
            id: TOGGLE_MAXIMIZE_EDITOR_GROUP,
            title: localize2('toggleMaximizeEditorGroup', 'Toggle Maximize Editor Group'),
            f1: true,
            category: Categories.View,
            precondition: ContextKeyExpr.or(EditorPartMultipleEditorGroupsContext, EditorPartMaximizedEditorGroupContext),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 43 /* KeyCode.KeyM */),
            },
            menu: [{
                    id: MenuId.EditorTitle,
                    order: -10000, // towards the front
                    group: 'navigation',
                    when: EditorPartMaximizedEditorGroupContext
                },
                {
                    id: MenuId.EmptyEditorGroup,
                    order: -10000, // towards the front
                    group: 'navigation',
                    when: EditorPartMaximizedEditorGroupContext
                }],
            icon: Codicon.screenFull,
            toggled: EditorPartMaximizedEditorGroupContext,
        });
    }
    async run(accessor, ...args) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const resolvedContext = resolveCommandsContext(args, editorService, editorGroupsService, listService);
        if (resolvedContext.groupedEditors.length) {
            editorGroupsService.toggleMaximizeGroup(resolvedContext.groupedEditors[0].group);
        }
    }
}
class AbstractNavigateEditorAction extends Action2 {
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const result = this.navigate(editorGroupService);
        if (!result) {
            return;
        }
        const { groupId, editor } = result;
        if (!editor) {
            return;
        }
        const group = editorGroupService.getGroup(groupId);
        if (group) {
            await group.openEditor(editor);
        }
    }
}
export class OpenNextEditor extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.nextEditor',
            title: localize2('openNextEditor', 'Open Next Editor'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */]
                }
            },
            category: Categories.View
        });
    }
    navigate(editorGroupService) {
        // Navigate in active group if possible
        const activeGroup = editorGroupService.activeGroup;
        const activeGroupEditors = activeGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        const activeEditorIndex = activeGroup.activeEditor ? activeGroupEditors.indexOf(activeGroup.activeEditor) : -1;
        if (activeEditorIndex + 1 < activeGroupEditors.length) {
            return { editor: activeGroupEditors[activeEditorIndex + 1], groupId: activeGroup.id };
        }
        // Otherwise try in next group that has editors
        const handledGroups = new Set();
        let currentGroup = editorGroupService.activeGroup;
        while (currentGroup && !handledGroups.has(currentGroup.id)) {
            currentGroup = editorGroupService.findGroup({ location: 2 /* GroupLocation.NEXT */ }, currentGroup, true);
            if (currentGroup) {
                handledGroups.add(currentGroup.id);
                const groupEditors = currentGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
                if (groupEditors.length > 0) {
                    return { editor: groupEditors[0], groupId: currentGroup.id };
                }
            }
        }
        return undefined;
    }
}
export class OpenPreviousEditor extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.previousEditor',
            title: localize2('openPreviousEditor', 'Open Previous Editor'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 92 /* KeyCode.BracketLeft */]
                }
            },
            category: Categories.View
        });
    }
    navigate(editorGroupService) {
        // Navigate in active group if possible
        const activeGroup = editorGroupService.activeGroup;
        const activeGroupEditors = activeGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        const activeEditorIndex = activeGroup.activeEditor ? activeGroupEditors.indexOf(activeGroup.activeEditor) : -1;
        if (activeEditorIndex > 0) {
            return { editor: activeGroupEditors[activeEditorIndex - 1], groupId: activeGroup.id };
        }
        // Otherwise try in previous group that has editors
        const handledGroups = new Set();
        let currentGroup = editorGroupService.activeGroup;
        while (currentGroup && !handledGroups.has(currentGroup.id)) {
            currentGroup = editorGroupService.findGroup({ location: 3 /* GroupLocation.PREVIOUS */ }, currentGroup, true);
            if (currentGroup) {
                handledGroups.add(currentGroup.id);
                const groupEditors = currentGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
                if (groupEditors.length > 0) {
                    return { editor: groupEditors[groupEditors.length - 1], groupId: currentGroup.id };
                }
            }
        }
        return undefined;
    }
}
export class OpenNextEditorInGroup extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.nextEditorInGroup',
            title: localize2('nextEditorInGroup', 'Open Next Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */),
                mac: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */)
                }
            },
            category: Categories.View
        });
    }
    navigate(editorGroupService) {
        const group = editorGroupService.activeGroup;
        const editors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        const index = group.activeEditor ? editors.indexOf(group.activeEditor) : -1;
        return { editor: index + 1 < editors.length ? editors[index + 1] : editors[0], groupId: group.id };
    }
}
export class OpenPreviousEditorInGroup extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.previousEditorInGroup',
            title: localize2('openPreviousEditorInGroup', 'Open Previous Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */),
                mac: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */)
                }
            },
            category: Categories.View
        });
    }
    navigate(editorGroupService) {
        const group = editorGroupService.activeGroup;
        const editors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        const index = group.activeEditor ? editors.indexOf(group.activeEditor) : -1;
        return { editor: index > 0 ? editors[index - 1] : editors[editors.length - 1], groupId: group.id };
    }
}
export class OpenFirstEditorInGroup extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.firstEditorInGroup',
            title: localize2('firstEditorInGroup', 'Open First Editor in Group'),
            f1: true,
            category: Categories.View
        });
    }
    navigate(editorGroupService) {
        const group = editorGroupService.activeGroup;
        const editors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        return { editor: editors[0], groupId: group.id };
    }
}
export class OpenLastEditorInGroup extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.lastEditorInGroup',
            title: localize2('lastEditorInGroup', 'Open Last Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 21 /* KeyCode.Digit0 */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 30 /* KeyCode.Digit9 */],
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 21 /* KeyCode.Digit0 */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 30 /* KeyCode.Digit9 */]
                }
            },
            category: Categories.View
        });
    }
    navigate(editorGroupService) {
        const group = editorGroupService.activeGroup;
        const editors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        return { editor: editors[editors.length - 1], groupId: group.id };
    }
}
export class NavigateForwardAction extends Action2 {
    static { this.ID = 'workbench.action.navigateForward'; }
    static { this.LABEL = localize('navigateForward', "Go Forward"); }
    constructor() {
        super({
            id: NavigateForwardAction.ID,
            title: {
                ...localize2('navigateForward', "Go Forward"),
                mnemonicTitle: localize({ key: 'miForward', comment: ['&& denotes a mnemonic'] }, "&&Forward")
            },
            f1: true,
            icon: Codicon.arrowRight,
            precondition: ContextKeyExpr.has('canNavigateForward'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                win: { primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */, secondary: [123 /* KeyCode.BrowserForward */] },
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 88 /* KeyCode.Minus */, secondary: [123 /* KeyCode.BrowserForward */] },
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 88 /* KeyCode.Minus */, secondary: [123 /* KeyCode.BrowserForward */] }
            },
            menu: [
                { id: MenuId.MenubarGoMenu, group: '1_history_nav', order: 2 },
                { id: MenuId.CommandCenter, order: 2, when: ContextKeyExpr.has('config.workbench.navigationControl.enabled') }
            ]
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goForward(0 /* GoFilter.NONE */);
    }
}
export class NavigateBackwardsAction extends Action2 {
    static { this.ID = 'workbench.action.navigateBack'; }
    static { this.LABEL = localize('navigateBack', "Go Back"); }
    constructor() {
        super({
            id: NavigateBackwardsAction.ID,
            title: {
                ...localize2('navigateBack', "Go Back"),
                mnemonicTitle: localize({ key: 'miBack', comment: ['&& denotes a mnemonic'] }, "&&Back")
            },
            f1: true,
            precondition: ContextKeyExpr.has('canNavigateBack'),
            icon: Codicon.arrowLeft,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                win: { primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */, secondary: [122 /* KeyCode.BrowserBack */] },
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 88 /* KeyCode.Minus */, secondary: [122 /* KeyCode.BrowserBack */] },
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 88 /* KeyCode.Minus */, secondary: [122 /* KeyCode.BrowserBack */] }
            },
            menu: [
                { id: MenuId.MenubarGoMenu, group: '1_history_nav', order: 1 },
                { id: MenuId.CommandCenter, order: 1, when: ContextKeyExpr.has('config.workbench.navigationControl.enabled') }
            ]
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goBack(0 /* GoFilter.NONE */);
    }
}
export class NavigatePreviousAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateLast',
            title: localize2('navigatePrevious', 'Go Previous'),
            f1: true
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goPrevious(0 /* GoFilter.NONE */);
    }
}
export class NavigateForwardInEditsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateForwardInEditLocations',
            title: localize2('navigateForwardInEdits', 'Go Forward in Edit Locations'),
            f1: true
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goForward(1 /* GoFilter.EDITS */);
    }
}
export class NavigateBackwardsInEditsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateBackInEditLocations',
            title: localize2('navigateBackInEdits', 'Go Back in Edit Locations'),
            f1: true
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goBack(1 /* GoFilter.EDITS */);
    }
}
export class NavigatePreviousInEditsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigatePreviousInEditLocations',
            title: localize2('navigatePreviousInEdits', 'Go Previous in Edit Locations'),
            f1: true
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goPrevious(1 /* GoFilter.EDITS */);
    }
}
export class NavigateToLastEditLocationAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateToLastEditLocation',
            title: localize2('navigateToLastEditLocation', 'Go to Last Edit Location'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */)
            }
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goLast(1 /* GoFilter.EDITS */);
    }
}
export class NavigateForwardInNavigationsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateForwardInNavigationLocations',
            title: localize2('navigateForwardInNavigations', 'Go Forward in Navigation Locations'),
            f1: true
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goForward(2 /* GoFilter.NAVIGATION */);
    }
}
export class NavigateBackwardsInNavigationsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateBackInNavigationLocations',
            title: localize2('navigateBackInNavigations', 'Go Back in Navigation Locations'),
            f1: true
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
    }
}
export class NavigatePreviousInNavigationsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigatePreviousInNavigationLocations',
            title: localize2('navigatePreviousInNavigationLocations', 'Go Previous in Navigation Locations'),
            f1: true
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
    }
}
export class NavigateToLastNavigationLocationAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateToLastNavigationLocation',
            title: localize2('navigateToLastNavigationLocation', 'Go to Last Navigation Location'),
            f1: true
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goLast(2 /* GoFilter.NAVIGATION */);
    }
}
export class ReopenClosedEditorAction extends Action2 {
    static { this.ID = 'workbench.action.reopenClosedEditor'; }
    constructor() {
        super({
            id: ReopenClosedEditorAction.ID,
            title: localize2('reopenClosedEditor', 'Reopen Closed Editor'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 50 /* KeyCode.KeyT */
            },
            category: Categories.View
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.reopenLastClosedEditor();
    }
}
export class ClearRecentFilesAction extends Action2 {
    static { this.ID = 'workbench.action.clearRecentFiles'; }
    constructor() {
        super({
            id: ClearRecentFilesAction.ID,
            title: localize2('clearRecentFiles', 'Clear Recently Opened...'),
            f1: true,
            category: Categories.File
        });
    }
    async run(accessor) {
        const dialogService = accessor.get(IDialogService);
        const workspacesService = accessor.get(IWorkspacesService);
        const historyService = accessor.get(IHistoryService);
        // Ask for confirmation
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('confirmClearRecentsMessage', "Do you want to clear all recently opened files and workspaces?"),
            detail: localize('confirmClearDetail', "This action is irreversible!"),
            primaryButton: localize({ key: 'clearButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Clear")
        });
        if (!confirmed) {
            return;
        }
        // Clear global recently opened
        workspacesService.clearRecentlyOpened();
        // Clear workspace specific recently opened
        historyService.clearRecentlyOpened();
    }
}
export class ShowEditorsInActiveGroupByMostRecentlyUsedAction extends Action2 {
    static { this.ID = 'workbench.action.showEditorsInActiveGroup'; }
    constructor() {
        super({
            id: ShowEditorsInActiveGroupByMostRecentlyUsedAction.ID,
            title: localize2('showEditorsInActiveGroup', 'Show Editors in Active Group By Most Recently Used'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX);
    }
}
export class ShowAllEditorsByAppearanceAction extends Action2 {
    static { this.ID = 'workbench.action.showAllEditors'; }
    constructor() {
        super({
            id: ShowAllEditorsByAppearanceAction.ID,
            title: localize2('showAllEditors', 'Show All Editors By Appearance'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 46 /* KeyCode.KeyP */),
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 2 /* KeyCode.Tab */
                }
            },
            category: Categories.File
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(AllEditorsByAppearanceQuickAccess.PREFIX);
    }
}
export class ShowAllEditorsByMostRecentlyUsedAction extends Action2 {
    static { this.ID = 'workbench.action.showAllEditorsByMostRecentlyUsed'; }
    constructor() {
        super({
            id: ShowAllEditorsByMostRecentlyUsedAction.ID,
            title: localize2('showAllEditorsByMostRecentlyUsed', 'Show All Editors By Most Recently Used'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(AllEditorsByMostRecentlyUsedQuickAccess.PREFIX);
    }
}
class AbstractQuickAccessEditorAction extends Action2 {
    constructor(desc, prefix, itemActivation) {
        super(desc);
        this.prefix = prefix;
        this.itemActivation = itemActivation;
    }
    async run(accessor) {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const keybindings = keybindingService.lookupKeybindings(this.desc.id);
        quickInputService.quickAccess.show(this.prefix, {
            quickNavigateConfiguration: { keybindings },
            itemActivation: this.itemActivation
        });
    }
}
export class QuickAccessPreviousRecentlyUsedEditorAction extends AbstractQuickAccessEditorAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenPreviousRecentlyUsedEditor',
            title: localize2('quickOpenPreviousRecentlyUsedEditor', 'Quick Open Previous Recently Used Editor'),
            f1: true,
            category: Categories.View
        }, AllEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined);
    }
}
export class QuickAccessLeastRecentlyUsedEditorAction extends AbstractQuickAccessEditorAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenLeastRecentlyUsedEditor',
            title: localize2('quickOpenLeastRecentlyUsedEditor', 'Quick Open Least Recently Used Editor'),
            f1: true,
            category: Categories.View
        }, AllEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined);
    }
}
export class QuickAccessPreviousRecentlyUsedEditorInGroupAction extends AbstractQuickAccessEditorAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenPreviousRecentlyUsedEditorInGroup',
            title: localize2('quickOpenPreviousRecentlyUsedEditorInGroup', 'Quick Open Previous Recently Used Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 2 /* KeyCode.Tab */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 2 /* KeyCode.Tab */
                }
            },
            precondition: ActiveEditorGroupEmptyContext.toNegated(),
            category: Categories.View
        }, ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined);
    }
}
export class QuickAccessLeastRecentlyUsedEditorInGroupAction extends AbstractQuickAccessEditorAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenLeastRecentlyUsedEditorInGroup',
            title: localize2('quickOpenLeastRecentlyUsedEditorInGroup', 'Quick Open Least Recently Used Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */
                }
            },
            precondition: ActiveEditorGroupEmptyContext.toNegated(),
            category: Categories.View
        }, ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX, ItemActivation.LAST);
    }
}
export class QuickAccessPreviousEditorFromHistoryAction extends Action2 {
    static { this.ID = 'workbench.action.openPreviousEditorFromHistory'; }
    constructor() {
        super({
            id: QuickAccessPreviousEditorFromHistoryAction.ID,
            title: localize2('navigateEditorHistoryByInput', 'Quick Open Previous Editor from History'),
            f1: true
        });
    }
    async run(accessor) {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const keybindings = keybindingService.lookupKeybindings(QuickAccessPreviousEditorFromHistoryAction.ID);
        // Enforce to activate the first item in quick access if
        // the currently active editor group has n editor opened
        let itemActivation = undefined;
        if (editorGroupService.activeGroup.count === 0) {
            itemActivation = ItemActivation.FIRST;
        }
        quickInputService.quickAccess.show('', { quickNavigateConfiguration: { keybindings }, itemActivation });
    }
}
export class OpenNextRecentlyUsedEditorAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openNextRecentlyUsedEditor',
            title: localize2('openNextRecentlyUsedEditor', 'Open Next Recently Used Editor'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        historyService.openNextRecentlyUsedEditor();
    }
}
export class OpenPreviousRecentlyUsedEditorAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openPreviousRecentlyUsedEditor',
            title: localize2('openPreviousRecentlyUsedEditor', 'Open Previous Recently Used Editor'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        historyService.openPreviouslyUsedEditor();
    }
}
export class OpenNextRecentlyUsedEditorInGroupAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openNextRecentlyUsedEditorInGroup',
            title: localize2('openNextRecentlyUsedEditorInGroup', 'Open Next Recently Used Editor In Group'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        historyService.openNextRecentlyUsedEditor(editorGroupsService.activeGroup.id);
    }
}
export class OpenPreviousRecentlyUsedEditorInGroupAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openPreviousRecentlyUsedEditorInGroup',
            title: localize2('openPreviousRecentlyUsedEditorInGroup', 'Open Previous Recently Used Editor In Group'),
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        historyService.openPreviouslyUsedEditor(editorGroupsService.activeGroup.id);
    }
}
export class ClearEditorHistoryAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.clearEditorHistory',
            title: localize2('clearEditorHistory', 'Clear Editor History'),
            f1: true
        });
    }
    async run(accessor) {
        const dialogService = accessor.get(IDialogService);
        const historyService = accessor.get(IHistoryService);
        // Ask for confirmation
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('confirmClearEditorHistoryMessage', "Do you want to clear the history of recently opened editors?"),
            detail: localize('confirmClearDetail', "This action is irreversible!"),
            primaryButton: localize({ key: 'clearButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Clear")
        });
        if (!confirmed) {
            return;
        }
        // Clear editor history
        historyService.clear();
    }
}
export class MoveEditorLeftInGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorLeftInGroup',
            title: localize2('moveEditorLeft', 'Move Editor Left'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */,
                mac: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */)
                }
            },
            f1: true,
            category: Categories.View
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'left' });
    }
}
export class MoveEditorRightInGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorRightInGroup',
            title: localize2('moveEditorRight', 'Move Editor Right'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */,
                mac: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */)
                }
            },
            f1: true,
            category: Categories.View
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'right' });
    }
}
export class MoveEditorToPreviousGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToPreviousGroup',
            title: localize2('moveEditorToPreviousGroup', 'Move Editor into Previous Group'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 15 /* KeyCode.LeftArrow */
                }
            },
            f1: true,
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'previous', by: 'group' });
    }
}
export class MoveEditorToNextGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToNextGroup',
            title: localize2('moveEditorToNextGroup', 'Move Editor into Next Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 17 /* KeyCode.RightArrow */
                }
            },
            category: Categories.View
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'next', by: 'group' });
    }
}
export class MoveEditorToAboveGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToAboveGroup',
            title: localize2('moveEditorToAboveGroup', 'Move Editor into Group Above'),
            f1: true,
            category: Categories.View
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'up', by: 'group' });
    }
}
export class MoveEditorToBelowGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToBelowGroup',
            title: localize2('moveEditorToBelowGroup', 'Move Editor into Group Below'),
            f1: true,
            category: Categories.View
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'down', by: 'group' });
    }
}
export class MoveEditorToLeftGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToLeftGroup',
            title: localize2('moveEditorToLeftGroup', 'Move Editor into Left Group'),
            f1: true,
            category: Categories.View
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'left', by: 'group' });
    }
}
export class MoveEditorToRightGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToRightGroup',
            title: localize2('moveEditorToRightGroup', 'Move Editor into Right Group'),
            f1: true,
            category: Categories.View
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'right', by: 'group' });
    }
}
export class MoveEditorToFirstGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToFirstGroup',
            title: localize2('moveEditorToFirstGroup', 'Move Editor into First Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 22 /* KeyCode.Digit1 */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 22 /* KeyCode.Digit1 */
                }
            },
            category: Categories.View
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'first', by: 'group' });
    }
}
export class MoveEditorToLastGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToLastGroup',
            title: localize2('moveEditorToLastGroup', 'Move Editor into Last Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 30 /* KeyCode.Digit9 */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 30 /* KeyCode.Digit9 */
                }
            },
            category: Categories.View
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'last', by: 'group' });
    }
}
export class SplitEditorToPreviousGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToPreviousGroup',
            title: localize2('splitEditorToPreviousGroup', 'Split Editor into Previous Group'),
            f1: true,
            category: Categories.View
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'previous', by: 'group' });
    }
}
export class SplitEditorToNextGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToNextGroup',
            title: localize2('splitEditorToNextGroup', 'Split Editor into Next Group'),
            f1: true,
            category: Categories.View
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'next', by: 'group' });
    }
}
export class SplitEditorToAboveGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToAboveGroup',
            title: localize2('splitEditorToAboveGroup', 'Split Editor into Group Above'),
            f1: true,
            category: Categories.View
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'up', by: 'group' });
    }
}
export class SplitEditorToBelowGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToBelowGroup',
            title: localize2('splitEditorToBelowGroup', 'Split Editor into Group Below'),
            f1: true,
            category: Categories.View
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'down', by: 'group' });
    }
}
export class SplitEditorToLeftGroupAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.splitEditorToLeftGroup'; }
    static { this.LABEL = localize('splitEditorToLeftGroup', "Split Editor into Left Group"); }
    constructor() {
        super({
            id: 'workbench.action.splitEditorToLeftGroup',
            title: localize2('splitEditorToLeftGroup', "Split Editor into Left Group"),
            f1: true,
            category: Categories.View
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'left', by: 'group' });
    }
}
export class SplitEditorToRightGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToRightGroup',
            title: localize2('splitEditorToRightGroup', 'Split Editor into Right Group'),
            f1: true,
            category: Categories.View
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'right', by: 'group' });
    }
}
export class SplitEditorToFirstGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToFirstGroup',
            title: localize2('splitEditorToFirstGroup', 'Split Editor into First Group'),
            f1: true,
            category: Categories.View
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'first', by: 'group' });
    }
}
export class SplitEditorToLastGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToLastGroup',
            title: localize2('splitEditorToLastGroup', 'Split Editor into Last Group'),
            f1: true,
            category: Categories.View
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'last', by: 'group' });
    }
}
export class EditorLayoutSingleAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutSingle'; }
    constructor() {
        super({
            id: EditorLayoutSingleAction.ID,
            title: localize2('editorLayoutSingle', 'Single Column Editor Layout'),
            f1: true,
            category: Categories.View
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}], orientation: 0 /* GroupOrientation.HORIZONTAL */ });
    }
}
export class EditorLayoutTwoColumnsAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoColumns'; }
    constructor() {
        super({
            id: EditorLayoutTwoColumnsAction.ID,
            title: localize2('editorLayoutTwoColumns', 'Two Columns Editor Layout'),
            f1: true,
            category: Categories.View
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}, {}], orientation: 0 /* GroupOrientation.HORIZONTAL */ });
    }
}
export class EditorLayoutThreeColumnsAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutThreeColumns'; }
    constructor() {
        super({
            id: EditorLayoutThreeColumnsAction.ID,
            title: localize2('editorLayoutThreeColumns', 'Three Columns Editor Layout'),
            f1: true,
            category: Categories.View
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}, {}, {}], orientation: 0 /* GroupOrientation.HORIZONTAL */ });
    }
}
export class EditorLayoutTwoRowsAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoRows'; }
    constructor() {
        super({
            id: EditorLayoutTwoRowsAction.ID,
            title: localize2('editorLayoutTwoRows', 'Two Rows Editor Layout'),
            f1: true,
            category: Categories.View
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}, {}], orientation: 1 /* GroupOrientation.VERTICAL */ });
    }
}
export class EditorLayoutThreeRowsAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutThreeRows'; }
    constructor() {
        super({
            id: EditorLayoutThreeRowsAction.ID,
            title: localize2('editorLayoutThreeRows', 'Three Rows Editor Layout'),
            f1: true,
            category: Categories.View
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}, {}, {}], orientation: 1 /* GroupOrientation.VERTICAL */ });
    }
}
export class EditorLayoutTwoByTwoGridAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoByTwoGrid'; }
    constructor() {
        super({
            id: EditorLayoutTwoByTwoGridAction.ID,
            title: localize2('editorLayoutTwoByTwoGrid', 'Grid Editor Layout (2x2)'),
            f1: true,
            category: Categories.View
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{ groups: [{}, {}] }, { groups: [{}, {}] }], orientation: 0 /* GroupOrientation.HORIZONTAL */ });
    }
}
export class EditorLayoutTwoColumnsBottomAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoColumnsBottom'; }
    constructor() {
        super({
            id: EditorLayoutTwoColumnsBottomAction.ID,
            title: localize2('editorLayoutTwoColumnsBottom', 'Two Columns Bottom Editor Layout'),
            f1: true,
            category: Categories.View
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}, { groups: [{}, {}] }], orientation: 1 /* GroupOrientation.VERTICAL */ });
    }
}
export class EditorLayoutTwoRowsRightAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoRowsRight'; }
    constructor() {
        super({
            id: EditorLayoutTwoRowsRightAction.ID,
            title: localize2('editorLayoutTwoRowsRight', 'Two Rows Right Editor Layout'),
            f1: true,
            category: Categories.View
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}, { groups: [{}, {}] }], orientation: 0 /* GroupOrientation.HORIZONTAL */ });
    }
}
class AbstractCreateEditorGroupAction extends Action2 {
    constructor(desc, direction) {
        super(desc);
        this.direction = direction;
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        // We are about to create a new empty editor group. We make an opiniated
        // decision here whether to focus that new editor group or not based
        // on what is currently focused. If focus is outside the editor area not
        // in the <body>, we do not focus, with the rationale that a user might
        // have focus on a tree/list with the intention to pick an element to
        // open in the new group from that tree/list.
        //
        // If focus is inside the editor area, we want to prevent the situation
        // of an editor having keyboard focus in an inactive editor group
        // (see https://github.com/microsoft/vscode/issues/189256)
        const activeDocument = getActiveDocument();
        const focusNewGroup = layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */) || activeDocument.activeElement === activeDocument.body;
        const group = editorGroupService.addGroup(editorGroupService.activeGroup, this.direction);
        editorGroupService.activateGroup(group);
        if (focusNewGroup) {
            group.focus();
        }
    }
}
export class NewEditorGroupLeftAction extends AbstractCreateEditorGroupAction {
    constructor() {
        super({
            id: 'workbench.action.newGroupLeft',
            title: localize2('newGroupLeft', 'New Editor Group to the Left'),
            f1: true,
            category: Categories.View
        }, 2 /* GroupDirection.LEFT */);
    }
}
export class NewEditorGroupRightAction extends AbstractCreateEditorGroupAction {
    constructor() {
        super({
            id: 'workbench.action.newGroupRight',
            title: localize2('newGroupRight', 'New Editor Group to the Right'),
            f1: true,
            category: Categories.View
        }, 3 /* GroupDirection.RIGHT */);
    }
}
export class NewEditorGroupAboveAction extends AbstractCreateEditorGroupAction {
    constructor() {
        super({
            id: 'workbench.action.newGroupAbove',
            title: localize2('newGroupAbove', 'New Editor Group Above'),
            f1: true,
            category: Categories.View
        }, 0 /* GroupDirection.UP */);
    }
}
export class NewEditorGroupBelowAction extends AbstractCreateEditorGroupAction {
    constructor() {
        super({
            id: 'workbench.action.newGroupBelow',
            title: localize2('newGroupBelow', 'New Editor Group Below'),
            f1: true,
            category: Categories.View
        }, 1 /* GroupDirection.DOWN */);
    }
}
export class ToggleEditorTypeAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleEditorType',
            title: localize2('toggleEditorType', 'Toggle Editor Type'),
            f1: true,
            category: Categories.View,
            precondition: ActiveEditorAvailableEditorIdsContext
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorResolverService = accessor.get(IEditorResolverService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!activeEditorPane) {
            return;
        }
        const activeEditorResource = EditorResourceAccessor.getCanonicalUri(activeEditorPane.input);
        if (!activeEditorResource) {
            return;
        }
        const editorIds = editorResolverService.getEditors(activeEditorResource).map(editor => editor.id).filter(id => id !== activeEditorPane.input.editorId);
        if (editorIds.length === 0) {
            return;
        }
        // Replace the current editor with the next avaiable editor type
        await editorService.replaceEditors([
            {
                editor: activeEditorPane.input,
                replacement: {
                    resource: activeEditorResource,
                    options: {
                        override: editorIds[0]
                    }
                }
            }
        ], activeEditorPane.group);
    }
}
export class ReOpenInTextEditorAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.reopenTextEditor',
            title: localize2('reopenTextEditor', 'Reopen Editor with Text Editor'),
            f1: true,
            category: Categories.View,
            precondition: ActiveEditorAvailableEditorIdsContext
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!activeEditorPane) {
            return;
        }
        const activeEditorResource = EditorResourceAccessor.getCanonicalUri(activeEditorPane.input);
        if (!activeEditorResource) {
            return;
        }
        // Replace the current editor with the text editor
        await editorService.replaceEditors([
            {
                editor: activeEditorPane.input,
                replacement: {
                    resource: activeEditorResource,
                    options: {
                        override: DEFAULT_EDITOR_ASSOCIATION.id
                    }
                }
            }
        ], activeEditorPane.group);
    }
}
class BaseMoveCopyEditorToNewWindowAction extends Action2 {
    constructor(id, title, keybinding, move) {
        super({
            id,
            title,
            category: Categories.View,
            precondition: ActiveEditorContext,
            keybinding,
            f1: true
        });
        this.move = move;
    }
    async run(accessor, ...args) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const resolvedContext = resolveCommandsContext(args, editorService, editorGroupsService, listService);
        if (!resolvedContext.groupedEditors.length) {
            return;
        }
        const auxiliaryEditorPart = await editorGroupsService.createAuxiliaryEditorPart();
        const { group, editors } = resolvedContext.groupedEditors[0]; // only single group supported for move/copy for now
        const editorsWithOptions = prepareMoveCopyEditors(group, editors, resolvedContext.preserveFocus);
        if (this.move) {
            group.moveEditors(editorsWithOptions, auxiliaryEditorPart.activeGroup);
        }
        else {
            group.copyEditors(editorsWithOptions, auxiliaryEditorPart.activeGroup);
        }
        auxiliaryEditorPart.activeGroup.focus();
    }
}
export class MoveEditorToNewWindowAction extends BaseMoveCopyEditorToNewWindowAction {
    constructor() {
        super(MOVE_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, {
            ...localize2('moveEditorToNewWindow', "Move Editor into New Window"),
            mnemonicTitle: localize({ key: 'miMoveEditorToNewWindow', comment: ['&& denotes a mnemonic'] }, "&&Move Editor into New Window"),
        }, undefined, true);
    }
}
export class CopyEditorToNewindowAction extends BaseMoveCopyEditorToNewWindowAction {
    constructor() {
        super(COPY_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, {
            ...localize2('copyEditorToNewWindow', "Copy Editor into New Window"),
            mnemonicTitle: localize({ key: 'miCopyEditorToNewWindow', comment: ['&& denotes a mnemonic'] }, "&&Copy Editor into New Window"),
        }, { primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 45 /* KeyCode.KeyO */), weight: 200 /* KeybindingWeight.WorkbenchContrib */ }, false);
    }
}
class BaseMoveCopyEditorGroupToNewWindowAction extends Action2 {
    constructor(id, title, move) {
        super({
            id,
            title,
            category: Categories.View,
            f1: true
        });
        this.move = move;
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const activeGroup = editorGroupService.activeGroup;
        const auxiliaryEditorPart = await editorGroupService.createAuxiliaryEditorPart();
        editorGroupService.mergeGroup(activeGroup, auxiliaryEditorPart.activeGroup, {
            mode: this.move ? 1 /* MergeGroupMode.MOVE_EDITORS */ : 0 /* MergeGroupMode.COPY_EDITORS */
        });
        auxiliaryEditorPart.activeGroup.focus();
    }
}
export class MoveEditorGroupToNewWindowAction extends BaseMoveCopyEditorGroupToNewWindowAction {
    constructor() {
        super(MOVE_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, {
            ...localize2('moveEditorGroupToNewWindow', "Move Editor Group into New Window"),
            mnemonicTitle: localize({ key: 'miMoveEditorGroupToNewWindow', comment: ['&& denotes a mnemonic'] }, "&&Move Editor Group into New Window"),
        }, true);
    }
}
export class CopyEditorGroupToNewWindowAction extends BaseMoveCopyEditorGroupToNewWindowAction {
    constructor() {
        super(COPY_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, {
            ...localize2('copyEditorGroupToNewWindow', "Copy Editor Group into New Window"),
            mnemonicTitle: localize({ key: 'miCopyEditorGroupToNewWindow', comment: ['&& denotes a mnemonic'] }, "&&Copy Editor Group into New Window"),
        }, false);
    }
}
export class RestoreEditorsToMainWindowAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.restoreEditorsToMainWindow',
            title: {
                ...localize2('restoreEditorsToMainWindow', "Restore Editors into Main Window"),
                mnemonicTitle: localize({ key: 'miRestoreEditorsToMainWindow', comment: ['&& denotes a mnemonic'] }, "&&Restore Editors into Main Window"),
            },
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext,
            category: Categories.View
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.mergeAllGroups(editorGroupService.mainPart.activeGroup);
    }
}
export class NewEmptyEditorWindowAction extends Action2 {
    constructor() {
        super({
            id: NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID,
            title: {
                ...localize2('newEmptyEditorWindow', "New Empty Editor Window"),
                mnemonicTitle: localize({ key: 'miNewEmptyEditorWindow', comment: ['&& denotes a mnemonic'] }, "&&New Empty Editor Window"),
            },
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const auxiliaryEditorPart = await editorGroupService.createAuxiliaryEditorPart();
        auxiliaryEditorPart.activeGroup.focus();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQWdILDBCQUEwQixFQUFtQixzQkFBc0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTlOLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBUyxNQUFNLG1EQUFtRCxDQUFDO0FBQ25HLE9BQU8sRUFBWSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLDZCQUE2QixFQUFvQyxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLCtCQUErQixFQUFFLHVCQUF1QixFQUFFLDZCQUE2QixFQUFFLFlBQVksRUFBRSw0QkFBNEIsRUFBRSxzQ0FBc0MsRUFBRSxzQ0FBc0MsRUFBRSw0Q0FBNEMsRUFBRSw0Q0FBNEMsRUFBRSxrQ0FBa0MsSUFBSSxrQ0FBa0MsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2xsQixPQUFPLEVBQUUsb0JBQW9CLEVBQWtFLGlDQUFpQyxFQUFxRixNQUFNLHdE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