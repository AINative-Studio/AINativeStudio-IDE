/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../../../base/common/keyCodes.js';
import { Mimes } from '../../../../../../base/common/mime.js';
import { IBulkEditService, ResourceTextEdit } from '../../../../../../editor/browser/services/bulkEditService.js';
import { localize, localize2 } from '../../../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContext, InputFocusedContextKey } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { ResourceNotebookCellEdit } from '../../../../bulkEdit/browser/bulkCellEdits.js';
import { changeCellToKind, computeCellLinesContents, copyCellRange, joinCellsWithSurrounds, joinSelectedCells, moveCellRange } from '../../controller/cellOperations.js';
import { cellExecutionArgs, CELL_TITLE_CELL_GROUP_ID, NotebookCellAction, NotebookMultiCellAction, parseMultiCellExecutionArgs } from '../../controller/coreActions.js';
import { CellFocusMode, EXPAND_CELL_INPUT_COMMAND_ID, EXPAND_CELL_OUTPUT_COMMAND_ID } from '../../notebookBrowser.js';
import { NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_INPUT_COLLAPSED, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED, NOTEBOOK_CELL_TYPE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_OUTPUT_FOCUSED } from '../../../common/notebookContextKeys.js';
import * as icons from '../../notebookIcons.js';
import { CellKind, NotebookSetting } from '../../../common/notebookCommon.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
//#region Move/Copy cells
const MOVE_CELL_UP_COMMAND_ID = 'notebook.cell.moveUp';
const MOVE_CELL_DOWN_COMMAND_ID = 'notebook.cell.moveDown';
const COPY_CELL_UP_COMMAND_ID = 'notebook.cell.copyUp';
const COPY_CELL_DOWN_COMMAND_ID = 'notebook.cell.copyDown';
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: MOVE_CELL_UP_COMMAND_ID,
            title: localize2('notebookActions.moveCellUp', "Move Cell Up"),
            icon: icons.moveUpIcon,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.equals('config.notebook.dragAndDropEnabled', false),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 14
            }
        });
    }
    async runWithContext(accessor, context) {
        return moveCellRange(context, 'up');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: MOVE_CELL_DOWN_COMMAND_ID,
            title: localize2('notebookActions.moveCellDown', "Move Cell Down"),
            icon: icons.moveDownIcon,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.equals('config.notebook.dragAndDropEnabled', false),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 14
            }
        });
    }
    async runWithContext(accessor, context) {
        return moveCellRange(context, 'down');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: COPY_CELL_UP_COMMAND_ID,
            title: localize2('notebookActions.copyCellUp', "Copy Cell Up"),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async runWithContext(accessor, context) {
        return copyCellRange(context, 'up');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: COPY_CELL_DOWN_COMMAND_ID,
            title: localize2('notebookActions.copyCellDown', "Copy Cell Down"),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 13
            }
        });
    }
    async runWithContext(accessor, context) {
        return copyCellRange(context, 'down');
    }
});
//#endregion
//#region Join/Split
const SPLIT_CELL_COMMAND_ID = 'notebook.cell.split';
const JOIN_SELECTED_CELLS_COMMAND_ID = 'notebook.cell.joinSelected';
const JOIN_CELL_ABOVE_COMMAND_ID = 'notebook.cell.joinAbove';
const JOIN_CELL_BELOW_COMMAND_ID = 'notebook.cell.joinBelow';
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: SPLIT_CELL_COMMAND_ID,
            title: localize2('notebookActions.splitCell', "Split Cell"),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_INPUT_COLLAPSED.toNegated()),
                order: 5 /* CellToolbarOrder.SplitCell */,
                group: CELL_TITLE_CELL_GROUP_ID
            },
            icon: icons.splitCellIcon,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, EditorContextKeys.editorTextFocus),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
        });
    }
    async runWithContext(accessor, context) {
        if (context.notebookEditor.isReadOnly) {
            return;
        }
        const bulkEditService = accessor.get(IBulkEditService);
        const cell = context.cell;
        const index = context.notebookEditor.getCellIndex(cell);
        const splitPoints = cell.focusMode === CellFocusMode.Container ? [{ lineNumber: 1, column: 1 }] : cell.getSelectionsStartPosition();
        if (splitPoints && splitPoints.length > 0) {
            await cell.resolveTextModel();
            if (!cell.hasModel()) {
                return;
            }
            const newLinesContents = computeCellLinesContents(cell, splitPoints);
            if (newLinesContents) {
                const language = cell.language;
                const kind = cell.cellKind;
                const mime = cell.mime;
                const textModel = await cell.resolveTextModel();
                await bulkEditService.apply([
                    new ResourceTextEdit(cell.uri, { range: textModel.getFullModelRange(), text: newLinesContents[0] }),
                    new ResourceNotebookCellEdit(context.notebookEditor.textModel.uri, {
                        editType: 1 /* CellEditType.Replace */,
                        index: index + 1,
                        count: 0,
                        cells: newLinesContents.slice(1).map(line => ({
                            cellKind: kind,
                            language,
                            mime,
                            source: line,
                            outputs: [],
                            metadata: {}
                        }))
                    })
                ], { quotableLabel: 'Split Notebook Cell' });
                context.notebookEditor.cellAt(index + 1)?.updateEditState(cell.getEditState(), 'splitCell');
            }
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: JOIN_CELL_ABOVE_COMMAND_ID,
            title: localize2('notebookActions.joinCellAbove', "Join With Previous Cell"),
            keybinding: {
                when: NOTEBOOK_EDITOR_FOCUSED,
                primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 40 /* KeyCode.KeyJ */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 10
            }
        });
    }
    async runWithContext(accessor, context) {
        const bulkEditService = accessor.get(IBulkEditService);
        return joinCellsWithSurrounds(bulkEditService, context, 'above');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: JOIN_CELL_BELOW_COMMAND_ID,
            title: localize2('notebookActions.joinCellBelow', "Join With Next Cell"),
            keybinding: {
                when: NOTEBOOK_EDITOR_FOCUSED,
                primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 40 /* KeyCode.KeyJ */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 11
            }
        });
    }
    async runWithContext(accessor, context) {
        const bulkEditService = accessor.get(IBulkEditService);
        return joinCellsWithSurrounds(bulkEditService, context, 'below');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: JOIN_SELECTED_CELLS_COMMAND_ID,
            title: localize2('notebookActions.joinSelectedCells', "Join Selected Cells"),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 12
            }
        });
    }
    async runWithContext(accessor, context) {
        const bulkEditService = accessor.get(IBulkEditService);
        const notificationService = accessor.get(INotificationService);
        return joinSelectedCells(bulkEditService, notificationService, context);
    }
});
//#endregion
//#region Change Cell Type
const CHANGE_CELL_TO_CODE_COMMAND_ID = 'notebook.cell.changeToCode';
const CHANGE_CELL_TO_MARKDOWN_COMMAND_ID = 'notebook.cell.changeToMarkdown';
registerAction2(class ChangeCellToCodeAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: CHANGE_CELL_TO_CODE_COMMAND_ID,
            title: localize2('notebookActions.changeCellToCode', "Change Cell to Code"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_OUTPUT_FOCUSED.toNegated()),
                primary: 55 /* KeyCode.KeyY */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
            }
        });
    }
    async runWithContext(accessor, context) {
        await changeCellToKind(CellKind.Code, context);
    }
});
registerAction2(class ChangeCellToMarkdownAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: CHANGE_CELL_TO_MARKDOWN_COMMAND_ID,
            title: localize2('notebookActions.changeCellToMarkdown', "Change Cell to Markdown"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_OUTPUT_FOCUSED.toNegated()),
                primary: 43 /* KeyCode.KeyM */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_TYPE.isEqualTo('code')),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_TYPE.isEqualTo('code')),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
            }
        });
    }
    async runWithContext(accessor, context) {
        await changeCellToKind(CellKind.Markup, context, 'markdown', Mimes.markdown);
    }
});
//#endregion
//#region Collapse Cell
const COLLAPSE_CELL_INPUT_COMMAND_ID = 'notebook.cell.collapseCellInput';
const COLLAPSE_CELL_OUTPUT_COMMAND_ID = 'notebook.cell.collapseCellOutput';
const COLLAPSE_ALL_CELL_INPUTS_COMMAND_ID = 'notebook.cell.collapseAllCellInputs';
const EXPAND_ALL_CELL_INPUTS_COMMAND_ID = 'notebook.cell.expandAllCellInputs';
const COLLAPSE_ALL_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.collapseAllCellOutputs';
const EXPAND_ALL_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.expandAllCellOutputs';
const TOGGLE_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.toggleOutputs';
const TOGGLE_CELL_OUTPUT_SCROLLING = 'notebook.cell.toggleOutputScrolling';
registerAction2(class CollapseCellInputAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COLLAPSE_CELL_INPUT_COMMAND_ID,
            title: localize2('notebookActions.collapseCellInput', "Collapse Cell Input"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_INPUT_COLLAPSED.toNegated(), InputFocusedContext.toNegated()),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            context.cell.isInputCollapsed = true;
        }
        else {
            context.selectedCells.forEach(cell => cell.isInputCollapsed = true);
        }
    }
});
registerAction2(class ExpandCellInputAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXPAND_CELL_INPUT_COMMAND_ID,
            title: localize2('notebookActions.expandCellInput', "Expand Cell Input"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_INPUT_COLLAPSED),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            context.cell.isInputCollapsed = false;
        }
        else {
            context.selectedCells.forEach(cell => cell.isInputCollapsed = false);
        }
    }
});
registerAction2(class CollapseCellOutputAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COLLAPSE_CELL_OUTPUT_COMMAND_ID,
            title: localize2('notebookActions.collapseCellOutput', "Collapse Cell Output"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED.toNegated(), InputFocusedContext.toNegated(), NOTEBOOK_CELL_HAS_OUTPUTS),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 50 /* KeyCode.KeyT */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            context.cell.isOutputCollapsed = true;
        }
        else {
            context.selectedCells.forEach(cell => cell.isOutputCollapsed = true);
        }
    }
});
registerAction2(class ExpandCellOuputAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXPAND_CELL_OUTPUT_COMMAND_ID,
            title: localize2('notebookActions.expandCellOutput', "Expand Cell Output"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 50 /* KeyCode.KeyT */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            context.cell.isOutputCollapsed = false;
        }
        else {
            context.selectedCells.forEach(cell => cell.isOutputCollapsed = false);
        }
    }
});
registerAction2(class extends NotebookMultiCellAction {
    constructor() {
        super({
            id: TOGGLE_CELL_OUTPUTS_COMMAND_ID,
            precondition: NOTEBOOK_CELL_LIST_FOCUSED,
            title: localize2('notebookActions.toggleOutputs', "Toggle Outputs"),
            metadata: {
                description: localize('notebookActions.toggleOutputs', "Toggle Outputs"),
                args: cellExecutionArgs
            }
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        let cells = [];
        if (context.ui) {
            cells = [context.cell];
        }
        else if (context.selectedCells) {
            cells = context.selectedCells;
        }
        for (const cell of cells) {
            cell.isOutputCollapsed = !cell.isOutputCollapsed;
        }
    }
});
registerAction2(class CollapseAllCellInputsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COLLAPSE_ALL_CELL_INPUTS_COMMAND_ID,
            title: localize2('notebookActions.collapseAllCellInput', "Collapse All Cell Inputs"),
            f1: true,
        });
    }
    async runWithContext(accessor, context) {
        forEachCell(context.notebookEditor, cell => cell.isInputCollapsed = true);
    }
});
registerAction2(class ExpandAllCellInputsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXPAND_ALL_CELL_INPUTS_COMMAND_ID,
            title: localize2('notebookActions.expandAllCellInput', "Expand All Cell Inputs"),
            f1: true
        });
    }
    async runWithContext(accessor, context) {
        forEachCell(context.notebookEditor, cell => cell.isInputCollapsed = false);
    }
});
registerAction2(class CollapseAllCellOutputsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COLLAPSE_ALL_CELL_OUTPUTS_COMMAND_ID,
            title: localize2('notebookActions.collapseAllCellOutput', "Collapse All Cell Outputs"),
            f1: true,
        });
    }
    async runWithContext(accessor, context) {
        forEachCell(context.notebookEditor, cell => cell.isOutputCollapsed = true);
    }
});
registerAction2(class ExpandAllCellOutputsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXPAND_ALL_CELL_OUTPUTS_COMMAND_ID,
            title: localize2('notebookActions.expandAllCellOutput', "Expand All Cell Outputs"),
            f1: true
        });
    }
    async runWithContext(accessor, context) {
        forEachCell(context.notebookEditor, cell => cell.isOutputCollapsed = false);
    }
});
registerAction2(class ToggleCellOutputScrolling extends NotebookMultiCellAction {
    constructor() {
        super({
            id: TOGGLE_CELL_OUTPUT_SCROLLING,
            title: localize2('notebookActions.toggleScrolling', "Toggle Scroll Cell Output"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated(), NOTEBOOK_CELL_HAS_OUTPUTS),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 55 /* KeyCode.KeyY */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    toggleOutputScrolling(viewModel, globalScrollSetting, collapsed) {
        const cellMetadata = viewModel.model.metadata;
        // TODO: when is cellMetadata undefined? Is that a case we need to support? It is currently a read-only property.
        if (cellMetadata) {
            const currentlyEnabled = cellMetadata['scrollable'] !== undefined ? cellMetadata['scrollable'] : globalScrollSetting;
            const shouldEnableScrolling = collapsed || !currentlyEnabled;
            cellMetadata['scrollable'] = shouldEnableScrolling;
            viewModel.resetRenderer();
        }
    }
    async runWithContext(accessor, context) {
        const globalScrolling = accessor.get(IConfigurationService).getValue(NotebookSetting.outputScrolling);
        if (context.ui) {
            context.cell.outputsViewModels.forEach((viewModel) => {
                this.toggleOutputScrolling(viewModel, globalScrolling, context.cell.isOutputCollapsed);
            });
            context.cell.isOutputCollapsed = false;
        }
        else {
            context.selectedCells.forEach(cell => {
                cell.outputsViewModels.forEach((viewModel) => {
                    this.toggleOutputScrolling(viewModel, globalScrolling, cell.isOutputCollapsed);
                });
                cell.isOutputCollapsed = false;
            });
        }
    }
});
//#endregion
function forEachCell(editor, callback) {
    for (let i = 0; i < editor.getLength(); i++) {
        const cell = editor.cellAt(i);
        callback(cell, i);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jZWxsQ29tbWFuZHMvY2VsbENvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0sMkNBQTJDLENBQUM7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFHMUgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLHdCQUF3QixFQUFFLGFBQWEsRUFBRSxzQkFBc0IsRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6SyxPQUFPLEVBQUUsaUJBQWlCLEVBQStDLHdCQUF3QixFQUEwRixrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdTLE9BQU8sRUFBRSxhQUFhLEVBQUUsNEJBQTRCLEVBQUUsNkJBQTZCLEVBQXlELE1BQU0sMEJBQTBCLENBQUM7QUFDN0ssT0FBTyxFQUFFLHNCQUFzQixFQUFFLHlCQUF5QixFQUFFLDZCQUE2QixFQUFFLDBCQUEwQixFQUFFLDhCQUE4QixFQUFFLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDalUsT0FBTyxLQUFLLEtBQUssTUFBTSx3QkFBd0IsQ0FBQztBQUNoRCxPQUFPLEVBQWdCLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV6Ryx5QkFBeUI7QUFDekIsTUFBTSx1QkFBdUIsR0FBRyxzQkFBc0IsQ0FBQztBQUN2RCxNQUFNLHlCQUF5QixHQUFHLHdCQUF3QixDQUFDO0FBQzNELE1BQU0sdUJBQXVCLEdBQUcsc0JBQXNCLENBQUM7QUFDdkQsTUFBTSx5QkFBeUIsR0FBRyx3QkFBd0IsQ0FBQztBQUUzRCxlQUFlLENBQUMsS0FBTSxTQUFRLGtCQUFrQjtJQUMvQztRQUNDLEtBQUssQ0FDSjtZQUNDLEVBQUUsRUFBRSx1QkFBdUI7WUFDM0IsS0FBSyxFQUFFLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxjQUFjLENBQUM7WUFDOUQsSUFBSSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQ3RCLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsK0NBQTRCO2dCQUNyQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEYsTUFBTSw2Q0FBbUM7YUFDekM7WUFDRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7Z0JBQzVCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssQ0FBQztnQkFDeEUsS0FBSywrQ0FBZ0M7Z0JBQ3JDLEtBQUssRUFBRSxFQUFFO2FBQ1Q7U0FDRCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW1DO1FBQ25GLE9BQU8sYUFBYSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxrQkFBa0I7SUFDL0M7UUFDQyxLQUFLLENBQ0o7WUFDQyxFQUFFLEVBQUUseUJBQXlCO1lBQzdCLEtBQUssRUFBRSxTQUFTLENBQUMsOEJBQThCLEVBQUUsZ0JBQWdCLENBQUM7WUFDbEUsSUFBSSxFQUFFLEtBQUssQ0FBQyxZQUFZO1lBQ3hCLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsaURBQThCO2dCQUN2QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEYsTUFBTSw2Q0FBbUM7YUFDekM7WUFDRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7Z0JBQzVCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssQ0FBQztnQkFDeEUsS0FBSywrQ0FBZ0M7Z0JBQ3JDLEtBQUssRUFBRSxFQUFFO2FBQ1Q7U0FDRCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW1DO1FBQ25GLE9BQU8sYUFBYSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxrQkFBa0I7SUFDL0M7UUFDQyxLQUFLLENBQ0o7WUFDQyxFQUFFLEVBQUUsdUJBQXVCO1lBQzNCLEtBQUssRUFBRSxTQUFTLENBQUMsNEJBQTRCLEVBQUUsY0FBYyxDQUFDO1lBQzlELFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsOENBQXlCLDJCQUFrQjtnQkFDcEQsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2xGLE1BQU0sNkNBQW1DO2FBQ3pDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBMEIsRUFBRSxPQUFtQztRQUNuRixPQUFPLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsa0JBQWtCO0lBQy9DO1FBQ0MsS0FBSyxDQUNKO1lBQ0MsRUFBRSxFQUFFLHlCQUF5QjtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLDhCQUE4QixFQUFFLGdCQUFnQixDQUFDO1lBQ2xFLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsOENBQXlCLDZCQUFvQjtnQkFDdEQsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2xGLE1BQU0sNkNBQW1DO2FBQ3pDO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsaUJBQWlCO2dCQUM1QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSx3QkFBd0IsRUFBRSxzQkFBc0IsQ0FBQztnQkFDbkcsS0FBSywrQ0FBZ0M7Z0JBQ3JDLEtBQUssRUFBRSxFQUFFO2FBQ1Q7U0FDRCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW1DO1FBQ25GLE9BQU8sYUFBYSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBR0gsWUFBWTtBQUVaLG9CQUFvQjtBQUVwQixNQUFNLHFCQUFxQixHQUFHLHFCQUFxQixDQUFDO0FBQ3BELE1BQU0sOEJBQThCLEdBQUcsNEJBQTRCLENBQUM7QUFDcEUsTUFBTSwwQkFBMEIsR0FBRyx5QkFBeUIsQ0FBQztBQUM3RCxNQUFNLDBCQUEwQixHQUFHLHlCQUF5QixDQUFDO0FBRzdELGVBQWUsQ0FBQyxLQUFNLFNBQVEsa0JBQWtCO0lBQy9DO1FBQ0MsS0FBSyxDQUNKO1lBQ0MsRUFBRSxFQUFFLHFCQUFxQjtZQUN6QixLQUFLLEVBQUUsU0FBUyxDQUFDLDJCQUEyQixFQUFFLFlBQVksQ0FBQztZQUMzRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7Z0JBQzVCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2Qix3QkFBd0IsRUFDeEIsc0JBQXNCLEVBQ3RCLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxDQUN6QztnQkFDRCxLQUFLLG9DQUE0QjtnQkFDakMsS0FBSyxFQUFFLHdCQUF3QjthQUMvQjtZQUNELElBQUksRUFBRSxLQUFLLENBQUMsYUFBYTtZQUN6QixVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsd0JBQXdCLEVBQUUsc0JBQXNCLEVBQUUsaUJBQWlCLENBQUMsZUFBZSxDQUFDO2dCQUN0SSxPQUFPLEVBQUUsUUFBUSxDQUFDLGlEQUE2QixFQUFFLG1EQUE2Qiw2QkFBb0IsQ0FBQztnQkFDbkcsTUFBTSw2Q0FBbUM7YUFDekM7U0FDRCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW1DO1FBQ25GLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN2QyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN2RCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQzFCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLEtBQUssYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBQ3BJLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDM0MsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUU5QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQ3RCLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxnQkFBZ0IsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDckUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUMvQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUV2QixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNoRCxNQUFNLGVBQWUsQ0FBQyxLQUFLLENBQzFCO29CQUNDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbkcsSUFBSSx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQ2hFO3dCQUNDLFFBQVEsOEJBQXNCO3dCQUM5QixLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUM7d0JBQ2hCLEtBQUssRUFBRSxDQUFDO3dCQUNSLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDN0MsUUFBUSxFQUFFLElBQUk7NEJBQ2QsUUFBUTs0QkFDUixJQUFJOzRCQUNKLE1BQU0sRUFBRSxJQUFJOzRCQUNaLE9BQU8sRUFBRSxFQUFFOzRCQUNYLFFBQVEsRUFBRSxFQUFFO3lCQUNaLENBQUMsQ0FBQztxQkFDSCxDQUNEO2lCQUNELEVBQ0QsRUFBRSxhQUFhLEVBQUUscUJBQXFCLEVBQUUsQ0FDeEMsQ0FBQztnQkFFRixPQUFPLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM3RixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFHSCxlQUFlLENBQUMsS0FBTSxTQUFRLGtCQUFrQjtJQUMvQztRQUNDLEtBQUssQ0FDSjtZQUNDLEVBQUUsRUFBRSwwQkFBMEI7WUFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQywrQkFBK0IsRUFBRSx5QkFBeUIsQ0FBQztZQUM1RSxVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLHVCQUF1QjtnQkFDN0IsT0FBTyxFQUFFLCtDQUEyQiwwQkFBZSx3QkFBZTtnQkFDbEUsTUFBTSw2Q0FBbUM7YUFDekM7WUFDRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7Z0JBQzVCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLHdCQUF3QixDQUFDO2dCQUMzRSxLQUFLLCtDQUFnQztnQkFDckMsS0FBSyxFQUFFLEVBQUU7YUFDVDtTQUNELENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBbUM7UUFDbkYsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sc0JBQXNCLENBQUMsZUFBZSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNsRSxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBR0gsZUFBZSxDQUFDLEtBQU0sU0FBUSxrQkFBa0I7SUFDL0M7UUFDQyxLQUFLLENBQ0o7WUFDQyxFQUFFLEVBQUUsMEJBQTBCO1lBQzlCLEtBQUssRUFBRSxTQUFTLENBQUMsK0JBQStCLEVBQUUscUJBQXFCLENBQUM7WUFDeEUsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSx1QkFBdUI7Z0JBQzdCLE9BQU8sRUFBRSwrQ0FBMkIsd0JBQWU7Z0JBQ25ELE1BQU0sNkNBQW1DO2FBQ3pDO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsaUJBQWlCO2dCQUM1QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSx3QkFBd0IsQ0FBQztnQkFDM0UsS0FBSywrQ0FBZ0M7Z0JBQ3JDLEtBQUssRUFBRSxFQUFFO2FBQ1Q7U0FDRCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW1DO1FBQ25GLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN2RCxPQUFPLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbEUsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsa0JBQWtCO0lBQy9DO1FBQ0MsS0FBSyxDQUNKO1lBQ0MsRUFBRSxFQUFFLDhCQUE4QjtZQUNsQyxLQUFLLEVBQUUsU0FBUyxDQUFDLG1DQUFtQyxFQUFFLHFCQUFxQixDQUFDO1lBQzVFLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtnQkFDNUIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsd0JBQXdCLENBQUM7Z0JBQzNFLEtBQUssK0NBQWdDO2dCQUNyQyxLQUFLLEVBQUUsRUFBRTthQUNUO1NBQ0QsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBMEIsRUFBRSxPQUFtQztRQUNuRixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDdkQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDL0QsT0FBTyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDekUsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILFlBQVk7QUFFWiwwQkFBMEI7QUFFMUIsTUFBTSw4QkFBOEIsR0FBRyw0QkFBNEIsQ0FBQztBQUNwRSxNQUFNLGtDQUFrQyxHQUFHLGdDQUFnQyxDQUFDO0FBRTVFLGVBQWUsQ0FBQyxNQUFNLHNCQUF1QixTQUFRLHVCQUF1QjtJQUMzRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw4QkFBOEI7WUFDbEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQ0FBa0MsRUFBRSxxQkFBcUIsQ0FBQztZQUMzRSxVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNsSSxPQUFPLHVCQUFjO2dCQUNyQixNQUFNLDZDQUFtQzthQUN6QztZQUNELFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuRyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7Z0JBQzVCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLHdCQUF3QixFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDM0ksS0FBSywrQ0FBZ0M7YUFDckM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW9FO1FBQ3BILE1BQU0sZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLE1BQU0sMEJBQTJCLFNBQVEsdUJBQXVCO0lBQy9FO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUsU0FBUyxDQUFDLHNDQUFzQyxFQUFFLHlCQUF5QixDQUFDO1lBQ25GLFVBQVUsRUFBRTtnQkFDWCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsdUJBQXVCLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2xJLE9BQU8sdUJBQWM7Z0JBQ3JCLE1BQU0sNkNBQW1DO2FBQ3pDO1lBQ0QsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pHLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtnQkFDNUIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsd0JBQXdCLEVBQUUsc0JBQXNCLEVBQUUsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN6SSxLQUFLLCtDQUFnQzthQUNyQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBb0U7UUFDcEgsTUFBTSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlFLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxZQUFZO0FBRVosdUJBQXVCO0FBRXZCLE1BQU0sOEJBQThCLEdBQUcsaUNBQWlDLENBQUM7QUFDekUsTUFBTSwrQkFBK0IsR0FBRyxrQ0FBa0MsQ0FBQztBQUMzRSxNQUFNLG1DQUFtQyxHQUFHLHFDQUFxQyxDQUFDO0FBQ2xGLE1BQU0saUNBQWlDLEdBQUcsbUNBQW1DLENBQUM7QUFDOUUsTUFBTSxvQ0FBb0MsR0FBRyxzQ0FBc0MsQ0FBQztBQUNwRixNQUFNLGtDQUFrQyxHQUFHLG9DQUFvQyxDQUFDO0FBQ2hGLE1BQU0sOEJBQThCLEdBQUcsNkJBQTZCLENBQUM7QUFDckUsTUFBTSw0QkFBNEIsR0FBRyxxQ0FBcUMsQ0FBQztBQUUzRSxlQUFlLENBQUMsTUFBTSx1QkFBd0IsU0FBUSx1QkFBdUI7SUFDNUU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsOEJBQThCO1lBQ2xDLEtBQUssRUFBRSxTQUFTLENBQUMsbUNBQW1DLEVBQUUscUJBQXFCLENBQUM7WUFDNUUsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxFQUFFLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoSSxPQUFPLEVBQUUsUUFBUSxDQUFDLGlEQUE2QixFQUFFLGlEQUE2QixDQUFDO2dCQUMvRSxNQUFNLDZDQUFtQzthQUN6QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxTQUFTLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDNUQsT0FBTywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW9FO1FBQ3BILElBQUksT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQ3RDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDckUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsTUFBTSxxQkFBc0IsU0FBUSx1QkFBdUI7SUFDMUU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNEJBQTRCO1lBQ2hDLEtBQUssRUFBRSxTQUFTLENBQUMsaUNBQWlDLEVBQUUsbUJBQW1CLENBQUM7WUFDeEUsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLDZCQUE2QixDQUFDO2dCQUNuRixPQUFPLEVBQUUsUUFBUSxDQUFDLGlEQUE2QixFQUFFLGlEQUE2QixDQUFDO2dCQUMvRSxNQUFNLDZDQUFtQzthQUN6QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxTQUFTLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDNUQsT0FBTywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW9FO1FBQ3BILElBQUksT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBQ3ZDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsTUFBTSx3QkFBeUIsU0FBUSx1QkFBdUI7SUFDN0U7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0JBQStCO1lBQ25DLEtBQUssRUFBRSxTQUFTLENBQUMsb0NBQW9DLEVBQUUsc0JBQXNCLENBQUM7WUFDOUUsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLDhCQUE4QixDQUFDLFNBQVMsRUFBRSxFQUFFLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxFQUFFLHlCQUF5QixDQUFDO2dCQUM1SixPQUFPLEVBQUUsUUFBUSxDQUFDLGlEQUE2Qix3QkFBZTtnQkFDOUQsTUFBTSw2Q0FBbUM7YUFDekM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW9FO1FBQ3BILElBQUksT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1FBQ3ZDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsTUFBTSxxQkFBc0IsU0FBUSx1QkFBdUI7SUFDMUU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNkJBQTZCO1lBQ2pDLEtBQUssRUFBRSxTQUFTLENBQUMsa0NBQWtDLEVBQUUsb0JBQW9CLENBQUM7WUFDMUUsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLDhCQUE4QixDQUFDO2dCQUNwRixPQUFPLEVBQUUsUUFBUSxDQUFDLGlEQUE2Qix3QkFBZTtnQkFDOUQsTUFBTSw2Q0FBbUM7YUFDekM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW9FO1FBQ3BILElBQUksT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1FBQ3hDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDdkUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsS0FBTSxTQUFRLHVCQUF1QjtJQUNwRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw4QkFBOEI7WUFDbEMsWUFBWSxFQUFFLDBCQUEwQjtZQUN4QyxLQUFLLEVBQUUsU0FBUyxDQUFDLCtCQUErQixFQUFFLGdCQUFnQixDQUFDO1lBQ25FLFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLGdCQUFnQixDQUFDO2dCQUN4RSxJQUFJLEVBQUUsaUJBQWlCO2FBQ3ZCO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLFNBQVMsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUM1RCxPQUFPLDJCQUEyQixDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBb0U7UUFDcEgsSUFBSSxLQUFLLEdBQThCLEVBQUUsQ0FBQztRQUMxQyxJQUFJLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoQixLQUFLLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsQ0FBQzthQUFNLElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2xDLEtBQUssR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQy9CLENBQUM7UUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztRQUNsRCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxNQUFNLDJCQUE0QixTQUFRLHVCQUF1QjtJQUNoRjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQ0FBbUM7WUFDdkMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzQ0FBc0MsRUFBRSwwQkFBMEIsQ0FBQztZQUNwRixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBb0U7UUFDcEgsV0FBVyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0UsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxNQUFNLHlCQUEwQixTQUFRLHVCQUF1QjtJQUM5RTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxpQ0FBaUM7WUFDckMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQ0FBb0MsRUFBRSx3QkFBd0IsQ0FBQztZQUNoRixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBb0U7UUFDcEgsV0FBVyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLENBQUM7SUFDNUUsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxNQUFNLDRCQUE2QixTQUFRLHVCQUF1QjtJQUNqRjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxvQ0FBb0M7WUFDeEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyx1Q0FBdUMsRUFBRSwyQkFBMkIsQ0FBQztZQUN0RixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBb0U7UUFDcEgsV0FBVyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDNUUsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxNQUFNLDBCQUEyQixTQUFRLHVCQUF1QjtJQUMvRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxrQ0FBa0M7WUFDdEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQ0FBcUMsRUFBRSx5QkFBeUIsQ0FBQztZQUNsRixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBb0U7UUFDcEgsV0FBVyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDLENBQUM7SUFDN0UsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxNQUFNLHlCQUEwQixTQUFRLHVCQUF1QjtJQUM5RTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw0QkFBNEI7WUFDaEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxpQ0FBaUMsRUFBRSwyQkFBMkIsQ0FBQztZQUNoRixVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxFQUFFLEVBQUUseUJBQXlCLENBQUM7Z0JBQ2hILE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLHdCQUFlO2dCQUM5RCxNQUFNLDZDQUFtQzthQUN6QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxTQUErQixFQUFFLG1CQUE0QixFQUFFLFNBQWtCO1FBQzlHLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzlDLGlIQUFpSDtRQUNqSCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLFlBQVksQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQztZQUNySCxNQUFNLHFCQUFxQixHQUFHLFNBQVMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQzdELFlBQVksQ0FBQyxZQUFZLENBQUMsR0FBRyxxQkFBcUIsQ0FBQztZQUNuRCxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBb0U7UUFDcEgsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFFBQVEsQ0FBVSxlQUFlLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDL0csSUFBSSxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtnQkFDcEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3hGLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFDeEMsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO29CQUM1QyxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDaEYsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsWUFBWTtBQUVaLFNBQVMsV0FBVyxDQUFDLE1BQXVCLEVBQUUsUUFBdUQ7SUFDcEcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzdDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsUUFBUSxDQUFDLElBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDO0FBQ0YsQ0FBQyJ9