/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../../base/common/async.js';
import { EditorExtensionsRegistry } from '../../../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { localize } from '../../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../../platform/accessibility/common/accessibility.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions } from '../../../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContextKey, IsWindowsContext } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { InlineChatController } from '../../../../inlineChat/browser/inlineChatController.js';
import { CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION } from '../../controller/chat/notebookChatContext.js';
import { NotebookAction, NotebookCellAction, NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, findTargetCellEditor } from '../../controller/coreActions.js';
import { CellEditState } from '../../notebookBrowser.js';
import { CellKind, NOTEBOOK_EDITOR_CURSOR_BOUNDARY } from '../../../common/notebookCommon.js';
import { NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_TYPE, NOTEBOOK_CURSOR_NAVIGATION_MODE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_INPUT_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED, NOTEBOOK_CELL_EDITOR_FOCUSED, IS_COMPOSITE_NOTEBOOK } from '../../../common/notebookContextKeys.js';
const NOTEBOOK_FOCUS_TOP = 'notebook.focusTop';
const NOTEBOOK_FOCUS_BOTTOM = 'notebook.focusBottom';
const NOTEBOOK_FOCUS_PREVIOUS_EDITOR = 'notebook.focusPreviousEditor';
const NOTEBOOK_FOCUS_NEXT_EDITOR = 'notebook.focusNextEditor';
const FOCUS_IN_OUTPUT_COMMAND_ID = 'notebook.cell.focusInOutput';
const FOCUS_OUT_OUTPUT_COMMAND_ID = 'notebook.cell.focusOutOutput';
export const CENTER_ACTIVE_CELL = 'notebook.centerActiveCell';
const NOTEBOOK_CURSOR_PAGEUP_COMMAND_ID = 'notebook.cell.cursorPageUp';
const NOTEBOOK_CURSOR_PAGEUP_SELECT_COMMAND_ID = 'notebook.cell.cursorPageUpSelect';
const NOTEBOOK_CURSOR_PAGEDOWN_COMMAND_ID = 'notebook.cell.cursorPageDown';
const NOTEBOOK_CURSOR_PAGEDOWN_SELECT_COMMAND_ID = 'notebook.cell.cursorPageDownSelect';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.cell.nullAction',
            title: localize('notebook.cell.webviewHandledEvents', "Keypresses that should be handled by the focused element in the cell output."),
            keybinding: [{
                    when: NOTEBOOK_OUTPUT_INPUT_FOCUSED,
                    primary: 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
                }, {
                    when: NOTEBOOK_OUTPUT_INPUT_FOCUSED,
                    primary: 16 /* KeyCode.UpArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
                }],
            f1: false
        });
    }
    run() {
        // noop, these are handled by the output webview
        return;
    }
});
registerAction2(class FocusNextCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_FOCUS_NEXT_EDITOR,
            title: localize('cursorMoveDown', 'Focus Next Cell Editor'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.equals('config.notebook.navigation.allowNavigateToSurroundingCells', true), ContextKeyExpr.and(ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('top'), NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 18 /* KeyCode.DownArrow */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, // code cell keybinding, focus inside editor: lower weight to not override suggest widget
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.equals('config.notebook.navigation.allowNavigateToSurroundingCells', true), ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('markup'), NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.isEqualTo(false), NOTEBOOK_CURSOR_NAVIGATION_MODE), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */, // markdown keybinding, focus on list: higher weight to override list.focusDown
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_CELL_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 11 /* KeyCode.PageUp */, },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
                },
            ]
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        const idx = editor.getCellIndex(activeCell);
        if (typeof idx !== 'number') {
            return;
        }
        if (idx >= editor.getLength() - 1) {
            // last one
            return;
        }
        const focusEditorLine = activeCell.textBuffer.getLineCount();
        const targetCell = (context.cell ?? context.selectedCells?.[0]);
        const foundEditor = targetCell ? findTargetCellEditor(context, targetCell) : undefined;
        if (foundEditor && foundEditor.hasTextFocus() && InlineChatController.get(foundEditor)?.getWidgetPosition()?.lineNumber === focusEditorLine) {
            InlineChatController.get(foundEditor)?.focus();
        }
        else {
            const newCell = editor.cellAt(idx + 1);
            const newFocusMode = newCell.cellKind === CellKind.Markup && newCell.getEditState() === CellEditState.Preview ? 'container' : 'editor';
            await editor.focusNotebookCell(newCell, newFocusMode, { focusEditorLine: 1 });
        }
    }
});
registerAction2(class FocusPreviousCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_FOCUS_PREVIOUS_EDITOR,
            title: localize('cursorMoveUp', 'Focus Previous Cell Editor'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.equals('config.notebook.navigation.allowNavigateToSurroundingCells', true), ContextKeyExpr.and(ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('bottom'), NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 16 /* KeyCode.UpArrow */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, // code cell keybinding, focus inside editor: lower weight to not override suggest widget
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.equals('config.notebook.navigation.allowNavigateToSurroundingCells', true), ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('markup'), NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.isEqualTo(false), NOTEBOOK_CURSOR_NAVIGATION_MODE), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 16 /* KeyCode.UpArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */, // markdown keybinding, focus on list: higher weight to override list.focusDown
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_CELL_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 11 /* KeyCode.PageUp */, },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        const idx = editor.getCellIndex(activeCell);
        if (typeof idx !== 'number') {
            return;
        }
        if (idx < 1 || editor.getLength() === 0) {
            // we don't do loop
            return;
        }
        const newCell = editor.cellAt(idx - 1);
        const newFocusMode = newCell.cellKind === CellKind.Markup && newCell.getEditState() === CellEditState.Preview ? 'container' : 'editor';
        const focusEditorLine = newCell.textBuffer.getLineCount();
        await editor.focusNotebookCell(newCell, newFocusMode, { focusEditorLine: focusEditorLine });
        const foundEditor = findTargetCellEditor(context, newCell);
        if (foundEditor && InlineChatController.get(foundEditor)?.getWidgetPosition()?.lineNumber === focusEditorLine) {
            InlineChatController.get(foundEditor)?.focus();
        }
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: NOTEBOOK_FOCUS_TOP,
            title: localize('focusFirstCell', 'Focus First Cell'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('')),
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                }
            ],
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        if (editor.getLength() === 0) {
            return;
        }
        const firstCell = editor.cellAt(0);
        await editor.focusNotebookCell(firstCell, 'container');
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: NOTEBOOK_FOCUS_BOTTOM,
            title: localize('focusLastCell', 'Focus Last Cell'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
                    mac: undefined,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('')),
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                }
            ],
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        if (!editor.hasModel() || editor.getLength() === 0) {
            return;
        }
        const lastIdx = editor.getLength() - 1;
        const lastVisibleIdx = editor.getPreviousVisibleCellIndex(lastIdx);
        if (lastVisibleIdx) {
            const cell = editor.cellAt(lastVisibleIdx);
            await editor.focusNotebookCell(cell, 'container');
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: FOCUS_IN_OUTPUT_COMMAND_ID,
            title: localize('focusOutput', 'Focus In Active Cell Output'),
            keybinding: [{
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK.negate(), IsWindowsContext),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                }, {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                }],
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_CELL_HAS_OUTPUTS)
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        return timeout(0).then(() => editor.focusNotebookCell(activeCell, 'output'));
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: FOCUS_OUT_OUTPUT_COMMAND_ID,
            title: localize('focusOutputOut', 'Focus Out Active Cell Output'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */, },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED),
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        await editor.focusNotebookCell(activeCell, 'editor');
    }
});
registerAction2(class CenterActiveCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: CENTER_ACTIVE_CELL,
            title: localize('notebookActions.centerActiveCell', "Center Active Cell"),
            keybinding: {
                when: NOTEBOOK_EDITOR_FOCUSED,
                primary: 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */,
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
        });
    }
    async runWithContext(accessor, context) {
        return context.notebookEditor.revealInCenter(context.cell);
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_CURSOR_PAGEUP_COMMAND_ID,
            title: localize('cursorPageUp', "Cell Cursor Page Up"),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus),
                    primary: 11 /* KeyCode.PageUp */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }
            ]
        });
    }
    async runWithContext(accessor, context) {
        EditorExtensionsRegistry.getEditorCommand('cursorPageUp').runCommand(accessor, { pageSize: getPageSize(context) });
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_CURSOR_PAGEUP_SELECT_COMMAND_ID,
            title: localize('cursorPageUpSelect', "Cell Cursor Page Up Select"),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_OUTPUT_FOCUSED.negate()),
                    primary: 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }
            ]
        });
    }
    async runWithContext(accessor, context) {
        EditorExtensionsRegistry.getEditorCommand('cursorPageUpSelect').runCommand(accessor, { pageSize: getPageSize(context) });
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_CURSOR_PAGEDOWN_COMMAND_ID,
            title: localize('cursorPageDown', "Cell Cursor Page Down"),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus),
                    primary: 12 /* KeyCode.PageDown */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }
            ]
        });
    }
    async runWithContext(accessor, context) {
        EditorExtensionsRegistry.getEditorCommand('cursorPageDown').runCommand(accessor, { pageSize: getPageSize(context) });
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_CURSOR_PAGEDOWN_SELECT_COMMAND_ID,
            title: localize('cursorPageDownSelect', "Cell Cursor Page Down Select"),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_OUTPUT_FOCUSED.negate()),
                    primary: 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }
            ]
        });
    }
    async runWithContext(accessor, context) {
        EditorExtensionsRegistry.getEditorCommand('cursorPageDownSelect').runCommand(accessor, { pageSize: getPageSize(context) });
    }
});
function getPageSize(context) {
    const editor = context.notebookEditor;
    const layoutInfo = editor.getViewModel().layoutInfo;
    const lineHeight = layoutInfo?.fontInfo.lineHeight || 17;
    return Math.max(1, Math.floor((layoutInfo?.height || 0) / lineHeight) - 2);
}
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'notebook',
    order: 100,
    type: 'object',
    'properties': {
        'notebook.navigation.allowNavigateToSurroundingCells': {
            type: 'boolean',
            default: true,
            markdownDescription: localize('notebook.navigation.allowNavigateToSurroundingCells', "When enabled cursor can navigate to the next/previous cell when the current cursor in the cell editor is at the first/last line.")
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyb3cuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL25hdmlnYXRpb24vYXJyb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBR2pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN0SCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxVQUFVLElBQUksdUJBQXVCLEVBQTBCLE1BQU0sMEVBQTBFLENBQUM7QUFDekosT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBR3ZILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RyxPQUFPLEVBQXNELGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxvQ0FBb0MsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JNLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFB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