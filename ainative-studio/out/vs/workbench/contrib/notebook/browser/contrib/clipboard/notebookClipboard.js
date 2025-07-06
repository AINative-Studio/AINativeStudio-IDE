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
import { localize, localize2 } from '../../../../../../nls.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { registerWorkbenchContribution2 } from '../../../../../common/contributions.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { NOTEBOOK_CELL_EDITABLE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED } from '../../../common/notebookContextKeys.js';
import { cellRangeToViewCells, expandCellRangesWithHiddenCells, getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { CopyAction, CutAction, PasteAction } from '../../../../../../editor/contrib/clipboard/browser/clipboard.js';
import { IClipboardService } from '../../../../../../platform/clipboard/common/clipboardService.js';
import { cloneNotebookCellTextModel } from '../../../common/model/notebookCellTextModel.js';
import { SelectionStateType } from '../../../common/notebookCommon.js';
import { INotebookService } from '../../../common/notebookService.js';
import * as platform from '../../../../../../base/common/platform.js';
import { Action2, MenuId, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { NotebookAction, NotebookCellAction, NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, NOTEBOOK_OUTPUT_WEBVIEW_ACTION_WEIGHT } from '../../controller/coreActions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContextKey } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { RedoCommand, UndoCommand } from '../../../../../../editor/browser/editorExtensions.js';
import { Categories } from '../../../../../../platform/action/common/actionCommonCategories.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { showWindowLogActionId } from '../../../../../services/log/common/logConstants.js';
import { getActiveElement, getWindow, isAncestor, isEditableElement, isHTMLElement } from '../../../../../../base/browser/dom.js';
let _logging = false;
function toggleLogging() {
    _logging = !_logging;
}
function _log(loggerService, str) {
    if (_logging) {
        loggerService.info(`[NotebookClipboard]: ${str}`);
    }
}
function getFocusedEditor(accessor) {
    const loggerService = accessor.get(ILogService);
    const editorService = accessor.get(IEditorService);
    const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    if (!editor) {
        _log(loggerService, '[Revive Webview] No notebook editor found for active editor pane, bypass');
        return;
    }
    if (!editor.hasEditorFocus()) {
        _log(loggerService, '[Revive Webview] Notebook editor is not focused, bypass');
        return;
    }
    if (!editor.hasWebviewFocus()) {
        _log(loggerService, '[Revive Webview] Notebook editor backlayer webview is not focused, bypass');
        return;
    }
    // If none of the outputs have focus, then webview is not focused
    const view = editor.getViewModel();
    if (view && view.viewCells.every(cell => !cell.outputIsFocused && !cell.outputIsHovered)) {
        return;
    }
    return { editor, loggerService };
}
function getFocusedWebviewDelegate(accessor) {
    const result = getFocusedEditor(accessor);
    if (!result) {
        return;
    }
    const webview = result.editor.getInnerWebview();
    _log(result.loggerService, '[Revive Webview] Notebook editor backlayer webview is focused');
    return webview;
}
function withWebview(accessor, f) {
    const webview = getFocusedWebviewDelegate(accessor);
    if (webview) {
        f(webview);
        return true;
    }
    return false;
}
function withEditor(accessor, f) {
    const result = getFocusedEditor(accessor);
    return result ? f(result.editor) : false;
}
const PRIORITY = 105;
UndoCommand.addImplementation(PRIORITY, 'notebook-webview', accessor => {
    return withWebview(accessor, webview => webview.undo());
});
RedoCommand.addImplementation(PRIORITY, 'notebook-webview', accessor => {
    return withWebview(accessor, webview => webview.redo());
});
CopyAction?.addImplementation(PRIORITY, 'notebook-webview', accessor => {
    return withWebview(accessor, webview => webview.copy());
});
PasteAction?.addImplementation(PRIORITY, 'notebook-webview', accessor => {
    return withWebview(accessor, webview => webview.paste());
});
CutAction?.addImplementation(PRIORITY, 'notebook-webview', accessor => {
    return withWebview(accessor, webview => webview.cut());
});
export function runPasteCells(editor, activeCell, pasteCells) {
    if (!editor.hasModel()) {
        return false;
    }
    const textModel = editor.textModel;
    if (editor.isReadOnly) {
        return false;
    }
    const originalState = {
        kind: SelectionStateType.Index,
        focus: editor.getFocus(),
        selections: editor.getSelections()
    };
    if (activeCell) {
        const currCellIndex = editor.getCellIndex(activeCell);
        const newFocusIndex = typeof currCellIndex === 'number' ? currCellIndex + 1 : 0;
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: newFocusIndex,
                count: 0,
                cells: pasteCells.items.map(cell => cloneNotebookCellTextModel(cell))
            }
        ], true, originalState, () => ({
            kind: SelectionStateType.Index,
            focus: { start: newFocusIndex, end: newFocusIndex + 1 },
            selections: [{ start: newFocusIndex, end: newFocusIndex + pasteCells.items.length }]
        }), undefined, true);
    }
    else {
        if (editor.getLength() !== 0) {
            return false;
        }
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: 0,
                count: 0,
                cells: pasteCells.items.map(cell => cloneNotebookCellTextModel(cell))
            }
        ], true, originalState, () => ({
            kind: SelectionStateType.Index,
            focus: { start: 0, end: 1 },
            selections: [{ start: 1, end: pasteCells.items.length + 1 }]
        }), undefined, true);
    }
    return true;
}
export function runCopyCells(accessor, editor, targetCell) {
    if (!editor.hasModel()) {
        return false;
    }
    if (editor.hasOutputTextSelection()) {
        getWindow(editor.getDomNode()).document.execCommand('copy');
        return true;
    }
    const clipboardService = accessor.get(IClipboardService);
    const notebookService = accessor.get(INotebookService);
    const selections = editor.getSelections();
    if (targetCell) {
        const targetCellIndex = editor.getCellIndex(targetCell);
        const containingSelection = selections.find(selection => selection.start <= targetCellIndex && targetCellIndex < selection.end);
        if (!containingSelection) {
            clipboardService.writeText(targetCell.getText());
            notebookService.setToCopy([targetCell.model], true);
            return true;
        }
    }
    const selectionRanges = expandCellRangesWithHiddenCells(editor, editor.getSelections());
    const selectedCells = cellRangeToViewCells(editor, selectionRanges);
    if (!selectedCells.length) {
        return false;
    }
    clipboardService.writeText(selectedCells.map(cell => cell.getText()).join('\n'));
    notebookService.setToCopy(selectedCells.map(cell => cell.model), true);
    return true;
}
export function runCutCells(accessor, editor, targetCell) {
    if (!editor.hasModel() || editor.isReadOnly) {
        return false;
    }
    const textModel = editor.textModel;
    const clipboardService = accessor.get(IClipboardService);
    const notebookService = accessor.get(INotebookService);
    const selections = editor.getSelections();
    if (targetCell) {
        // from ui
        const targetCellIndex = editor.getCellIndex(targetCell);
        const containingSelection = selections.find(selection => selection.start <= targetCellIndex && targetCellIndex < selection.end);
        if (!containingSelection) {
            clipboardService.writeText(targetCell.getText());
            // delete cell
            const focus = editor.getFocus();
            const newFocus = focus.end <= targetCellIndex ? focus : { start: focus.start - 1, end: focus.end - 1 };
            const newSelections = selections.map(selection => (selection.end <= targetCellIndex ? selection : { start: selection.start - 1, end: selection.end - 1 }));
            textModel.applyEdits([
                { editType: 1 /* CellEditType.Replace */, index: targetCellIndex, count: 1, cells: [] }
            ], true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: selections }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: newSelections }), undefined, true);
            notebookService.setToCopy([targetCell.model], false);
            return true;
        }
    }
    const focus = editor.getFocus();
    const containingSelection = selections.find(selection => selection.start <= focus.start && focus.end <= selection.end);
    if (!containingSelection) {
        // focus is out of any selection, we should only cut this cell
        const targetCell = editor.cellAt(focus.start);
        clipboardService.writeText(targetCell.getText());
        const newFocus = focus.end === editor.getLength() ? { start: focus.start - 1, end: focus.end - 1 } : focus;
        const newSelections = selections.map(selection => (selection.end <= focus.start ? selection : { start: selection.start - 1, end: selection.end - 1 }));
        textModel.applyEdits([
            { editType: 1 /* CellEditType.Replace */, index: focus.start, count: 1, cells: [] }
        ], true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: selections }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: newSelections }), undefined, true);
        notebookService.setToCopy([targetCell.model], false);
        return true;
    }
    const selectionRanges = expandCellRangesWithHiddenCells(editor, editor.getSelections());
    const selectedCells = cellRangeToViewCells(editor, selectionRanges);
    if (!selectedCells.length) {
        return false;
    }
    clipboardService.writeText(selectedCells.map(cell => cell.getText()).join('\n'));
    const edits = selectionRanges.map(range => ({ editType: 1 /* CellEditType.Replace */, index: range.start, count: range.end - range.start, cells: [] }));
    const firstSelectIndex = selectionRanges[0].start;
    /**
     * If we have cells, 0, 1, 2, 3, 4, 5, 6
     * and cells 1, 2 are selected, and then we delete cells 1 and 2
     * the new focused cell should still be at index 1
     */
    const newFocusedCellIndex = firstSelectIndex < textModel.cells.length - 1
        ? firstSelectIndex
        : Math.max(textModel.cells.length - 2, 0);
    textModel.applyEdits(edits, true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: selectionRanges }, () => {
        return {
            kind: SelectionStateType.Index,
            focus: { start: newFocusedCellIndex, end: newFocusedCellIndex + 1 },
            selections: [{ start: newFocusedCellIndex, end: newFocusedCellIndex + 1 }]
        };
    }, undefined, true);
    notebookService.setToCopy(selectedCells.map(cell => cell.model), false);
    return true;
}
let NotebookClipboardContribution = class NotebookClipboardContribution extends Disposable {
    static { this.ID = 'workbench.contrib.notebookClipboard'; }
    constructor(_editorService) {
        super();
        this._editorService = _editorService;
        const PRIORITY = 105;
        if (CopyAction) {
            this._register(CopyAction.addImplementation(PRIORITY, 'notebook-clipboard', accessor => {
                return this.runCopyAction(accessor);
            }));
        }
        if (PasteAction) {
            this._register(PasteAction.addImplementation(PRIORITY, 'notebook-clipboard', accessor => {
                return this.runPasteAction(accessor);
            }));
        }
        if (CutAction) {
            this._register(CutAction.addImplementation(PRIORITY, 'notebook-clipboard', accessor => {
                return this.runCutAction(accessor);
            }));
        }
    }
    _getContext() {
        const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        const activeCell = editor?.getActiveCell();
        return {
            editor,
            activeCell
        };
    }
    _focusInsideEmebedMonaco(editor) {
        const windowSelection = getWindow(editor.getDomNode()).getSelection();
        if (windowSelection?.rangeCount !== 1) {
            return false;
        }
        const activeSelection = windowSelection.getRangeAt(0);
        if (activeSelection.startContainer === activeSelection.endContainer && activeSelection.endOffset - activeSelection.startOffset === 0) {
            return false;
        }
        let container = activeSelection.commonAncestorContainer;
        const body = editor.getDomNode();
        if (!body.contains(container)) {
            return false;
        }
        while (container
            &&
                container !== body) {
            if (container.classList && container.classList.contains('monaco-editor')) {
                return true;
            }
            container = container.parentNode;
        }
        return false;
    }
    runCopyAction(accessor) {
        const loggerService = accessor.get(ILogService);
        const activeElement = getActiveElement();
        if (isHTMLElement(activeElement) && isEditableElement(activeElement)) {
            _log(loggerService, '[NotebookEditor] focus is on input or textarea element, bypass');
            return false;
        }
        const { editor } = this._getContext();
        if (!editor) {
            _log(loggerService, '[NotebookEditor] no active notebook editor, bypass');
            return false;
        }
        if (!isAncestor(activeElement, editor.getDomNode())) {
            _log(loggerService, '[NotebookEditor] focus is outside of the notebook editor, bypass');
            return false;
        }
        if (this._focusInsideEmebedMonaco(editor)) {
            _log(loggerService, '[NotebookEditor] focus is on embed monaco editor, bypass');
            return false;
        }
        _log(loggerService, '[NotebookEditor] run copy actions on notebook model');
        return runCopyCells(accessor, editor, undefined);
    }
    runPasteAction(accessor) {
        const activeElement = getActiveElement();
        if (activeElement && isEditableElement(activeElement)) {
            return false;
        }
        const notebookService = accessor.get(INotebookService);
        const pasteCells = notebookService.getToCopy();
        if (!pasteCells) {
            return false;
        }
        const { editor, activeCell } = this._getContext();
        if (!editor) {
            return false;
        }
        return runPasteCells(editor, activeCell, pasteCells);
    }
    runCutAction(accessor) {
        const activeElement = getActiveElement();
        if (activeElement && isEditableElement(activeElement)) {
            return false;
        }
        const { editor } = this._getContext();
        if (!editor) {
            return false;
        }
        return runCutCells(accessor, editor, undefined);
    }
};
NotebookClipboardContribution = __decorate([
    __param(0, IEditorService)
], NotebookClipboardContribution);
export { NotebookClipboardContribution };
registerWorkbenchContribution2(NotebookClipboardContribution.ID, NotebookClipboardContribution, 2 /* WorkbenchPhase.BlockRestore */);
const COPY_CELL_COMMAND_ID = 'notebook.cell.copy';
const CUT_CELL_COMMAND_ID = 'notebook.cell.cut';
const PASTE_CELL_COMMAND_ID = 'notebook.cell.paste';
const PASTE_CELL_ABOVE_COMMAND_ID = 'notebook.cell.pasteAbove';
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: COPY_CELL_COMMAND_ID,
            title: localize('notebookActions.copy', "Copy Cell"),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: NOTEBOOK_EDITOR_FOCUSED,
                group: "1_copy" /* CellOverflowToolbarGroups.Copy */,
                order: 2,
            },
            keybinding: platform.isNative ? undefined : {
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
                win: { primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, secondary: [2048 /* KeyMod.CtrlCmd */ | 19 /* KeyCode.Insert */] },
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async runWithContext(accessor, context) {
        runCopyCells(accessor, context.notebookEditor, context.cell);
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: CUT_CELL_COMMAND_ID,
            title: localize('notebookActions.cut', "Cut Cell"),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
                group: "1_copy" /* CellOverflowToolbarGroups.Copy */,
                order: 1,
            },
            keybinding: platform.isNative ? undefined : {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
                win: { primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */, secondary: [1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */] },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async runWithContext(accessor, context) {
        runCutCells(accessor, context.notebookEditor, context.cell);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: PASTE_CELL_COMMAND_ID,
            title: localize('notebookActions.paste', "Paste Cell"),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
                group: "1_copy" /* CellOverflowToolbarGroups.Copy */,
                order: 3,
            },
            keybinding: platform.isNative ? undefined : {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                win: { primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */, secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */] },
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */, secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */] },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    async runWithContext(accessor, context) {
        const notebookService = accessor.get(INotebookService);
        const pasteCells = notebookService.getToCopy();
        if (!context.notebookEditor.hasModel() || context.notebookEditor.isReadOnly) {
            return;
        }
        if (!pasteCells) {
            return;
        }
        runPasteCells(context.notebookEditor, context.cell, pasteCells);
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: PASTE_CELL_ABOVE_COMMAND_ID,
            title: localize('notebookActions.pasteAbove', "Paste Cell Above"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 52 /* KeyCode.KeyV */,
                weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
            },
        });
    }
    async runWithContext(accessor, context) {
        const notebookService = accessor.get(INotebookService);
        const pasteCells = notebookService.getToCopy();
        const editor = context.notebookEditor;
        const textModel = editor.textModel;
        if (editor.isReadOnly) {
            return;
        }
        if (!pasteCells) {
            return;
        }
        const originalState = {
            kind: SelectionStateType.Index,
            focus: editor.getFocus(),
            selections: editor.getSelections()
        };
        const currCellIndex = context.notebookEditor.getCellIndex(context.cell);
        const newFocusIndex = currCellIndex;
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: currCellIndex,
                count: 0,
                cells: pasteCells.items.map(cell => cloneNotebookCellTextModel(cell))
            }
        ], true, originalState, () => ({
            kind: SelectionStateType.Index,
            focus: { start: newFocusIndex, end: newFocusIndex + 1 },
            selections: [{ start: newFocusIndex, end: newFocusIndex + pasteCells.items.length }]
        }), undefined, true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleNotebookClipboardLog',
            title: localize2('toggleNotebookClipboardLog', 'Toggle Notebook Clipboard Troubleshooting'),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        toggleLogging();
        if (_logging) {
            const commandService = accessor.get(ICommandService);
            commandService.executeCommand(showWindowLogActionId);
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.output.selectAll',
            title: localize('notebook.cell.output.selectAll', "Select All"),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED),
                weight: NOTEBOOK_OUTPUT_WEBVIEW_ACTION_WEIGHT
            }
        });
    }
    async runWithContext(accessor, _context) {
        withEditor(accessor, editor => {
            if (!editor.hasEditorFocus()) {
                return false;
            }
            if (editor.hasEditorFocus() && !editor.hasWebviewFocus()) {
                return true;
            }
            const cell = editor.getActiveCell();
            if (!cell || !cell.outputIsFocused || !editor.hasWebviewFocus()) {
                return true;
            }
            if (cell.inputInOutputIsFocused) {
                editor.selectInputContents(cell);
            }
            else {
                editor.selectOutputContent(cell);
            }
            return true;
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDbGlwYm9hcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvY2xpcGJvYXJkL25vdGVib29rQ2xpcGJvYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hFLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHdCQUF3QixFQUFFLHVCQUF1QixFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUosT0FBTyxFQUFFLG9CQUFvQixFQUFFLCtCQUErQixFQUFFLCtCQUErQixFQUFtQyxNQUFNLDBCQUEwQixDQUFDO0FBQ25LLE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3JILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BHLE9BQU8sRUFBRSwwQkFBMEIsRUFBeUIsTUFBTSxnREFBZ0QsQ0FBQztBQUNuSCxPQUFPLEVBQXFELGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxLQUFLLFFBQVEsTUFBTSwyQ0FBMkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxF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