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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyb3cuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbmF2aWdhdGlvbi9hcnJvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHakUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEcsT0FBTyxFQUFFLFVBQVUsSUFBSSx1QkFBdUIsRUFBMEIsTUFBTSwwRUFBMEUsQ0FBQztBQUN6SixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDNUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFHdkgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RHLE9BQU8sRUFBc0QsY0FBYyxFQUFFLGtCQUFrQixFQUFFLG9DQUFvQyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDck0sT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFN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