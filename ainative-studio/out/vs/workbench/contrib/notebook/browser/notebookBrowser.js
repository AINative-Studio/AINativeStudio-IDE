/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NOTEBOOK_EDITOR_ID } from '../common/notebookCommon.js';
import { isCompositeNotebookEditorInput } from '../common/notebookEditorInput.js';
import { cellRangesToIndexes, reduceCellRanges } from '../common/notebookRange.js';
import { NotebookTextDiffEditor } from './diff/notebookDiffEditor.js';
//#region Shared commands
export const EXPAND_CELL_INPUT_COMMAND_ID = 'notebook.cell.expandCellInput';
export const EXECUTE_CELL_COMMAND_ID = 'notebook.cell.execute';
export const DETECT_CELL_LANGUAGE = 'notebook.cell.detectLanguage';
export const CHANGE_CELL_LANGUAGE = 'notebook.cell.changeLanguage';
export const QUIT_EDIT_CELL_COMMAND_ID = 'notebook.cell.quitEdit';
export const EXPAND_CELL_OUTPUT_COMMAND_ID = 'notebook.cell.expandCellOutput';
//#endregion
//#region Notebook extensions
// Hardcoding viewType/extension ID for now. TODO these should be replaced once we can
// look them up in the marketplace dynamically.
export const IPYNB_VIEW_TYPE = 'jupyter-notebook';
export const JUPYTER_EXTENSION_ID = 'ms-toolsai.jupyter';
/** @deprecated use the notebookKernel<Type> "keyword" instead */
export const KERNEL_EXTENSIONS = new Map([
    [IPYNB_VIEW_TYPE, JUPYTER_EXTENSION_ID],
]);
// @TODO lramos15, place this in a similar spot to our normal recommendations.
export const KERNEL_RECOMMENDATIONS = new Map();
KERNEL_RECOMMENDATIONS.set(IPYNB_VIEW_TYPE, new Map());
KERNEL_RECOMMENDATIONS.get(IPYNB_VIEW_TYPE)?.set('python', {
    extensionIds: [
        'ms-python.python',
        JUPYTER_EXTENSION_ID
    ],
    displayName: 'Python + Jupyter',
});
//#endregion
//#region  Output related types
// !! IMPORTANT !! ----------------------------------------------------------------------------------
// NOTE that you MUST update vs/workbench/contrib/notebook/browser/view/renderers/webviewPreloads.ts#L1986
// whenever changing the values of this const enum. The webviewPreloads-files manually inlines these values
// because it cannot have dependencies.
// !! IMPORTANT !! ----------------------------------------------------------------------------------
export var RenderOutputType;
(function (RenderOutputType) {
    RenderOutputType[RenderOutputType["Html"] = 0] = "Html";
    RenderOutputType[RenderOutputType["Extension"] = 1] = "Extension";
})(RenderOutputType || (RenderOutputType = {}));
export var ScrollToRevealBehavior;
(function (ScrollToRevealBehavior) {
    ScrollToRevealBehavior[ScrollToRevealBehavior["fullCell"] = 0] = "fullCell";
    ScrollToRevealBehavior[ScrollToRevealBehavior["firstLine"] = 1] = "firstLine";
})(ScrollToRevealBehavior || (ScrollToRevealBehavior = {}));
//#endregion
export var CellLayoutState;
(function (CellLayoutState) {
    CellLayoutState[CellLayoutState["Uninitialized"] = 0] = "Uninitialized";
    CellLayoutState[CellLayoutState["Estimated"] = 1] = "Estimated";
    CellLayoutState[CellLayoutState["FromCache"] = 2] = "FromCache";
    CellLayoutState[CellLayoutState["Measured"] = 3] = "Measured";
})(CellLayoutState || (CellLayoutState = {}));
export var CellLayoutContext;
(function (CellLayoutContext) {
    CellLayoutContext[CellLayoutContext["Fold"] = 0] = "Fold";
})(CellLayoutContext || (CellLayoutContext = {}));
/**
 * Vertical Lane in the overview ruler of the notebook editor.
 */
export var NotebookOverviewRulerLane;
(function (NotebookOverviewRulerLane) {
    NotebookOverviewRulerLane[NotebookOverviewRulerLane["Left"] = 1] = "Left";
    NotebookOverviewRulerLane[NotebookOverviewRulerLane["Center"] = 2] = "Center";
    NotebookOverviewRulerLane[NotebookOverviewRulerLane["Right"] = 4] = "Right";
    NotebookOverviewRulerLane[NotebookOverviewRulerLane["Full"] = 7] = "Full";
})(NotebookOverviewRulerLane || (NotebookOverviewRulerLane = {}));
export function isNotebookCellDecoration(obj) {
    return !!obj && typeof obj.handle === 'number';
}
export function isNotebookViewZoneDecoration(obj) {
    return !!obj && typeof obj.viewZoneId === 'string';
}
export var CellRevealType;
(function (CellRevealType) {
    CellRevealType[CellRevealType["Default"] = 1] = "Default";
    CellRevealType[CellRevealType["Top"] = 2] = "Top";
    CellRevealType[CellRevealType["Center"] = 3] = "Center";
    CellRevealType[CellRevealType["CenterIfOutsideViewport"] = 4] = "CenterIfOutsideViewport";
    CellRevealType[CellRevealType["NearTopIfOutsideViewport"] = 5] = "NearTopIfOutsideViewport";
    CellRevealType[CellRevealType["FirstLineIfOutsideViewport"] = 6] = "FirstLineIfOutsideViewport";
})(CellRevealType || (CellRevealType = {}));
export var CellRevealRangeType;
(function (CellRevealRangeType) {
    CellRevealRangeType[CellRevealRangeType["Default"] = 1] = "Default";
    CellRevealRangeType[CellRevealRangeType["Center"] = 2] = "Center";
    CellRevealRangeType[CellRevealRangeType["CenterIfOutsideViewport"] = 3] = "CenterIfOutsideViewport";
})(CellRevealRangeType || (CellRevealRangeType = {}));
export var CellEditState;
(function (CellEditState) {
    /**
     * Default state.
     * For markup cells, this is the renderer version of the markup.
     * For code cell, the browser focus should be on the container instead of the editor
     */
    CellEditState[CellEditState["Preview"] = 0] = "Preview";
    /**
     * Editing mode. Source for markup or code is rendered in editors and the state will be persistent.
     */
    CellEditState[CellEditState["Editing"] = 1] = "Editing";
})(CellEditState || (CellEditState = {}));
export var CellFocusMode;
(function (CellFocusMode) {
    CellFocusMode[CellFocusMode["Container"] = 0] = "Container";
    CellFocusMode[CellFocusMode["Editor"] = 1] = "Editor";
    CellFocusMode[CellFocusMode["Output"] = 2] = "Output";
    CellFocusMode[CellFocusMode["ChatInput"] = 3] = "ChatInput";
})(CellFocusMode || (CellFocusMode = {}));
export var CursorAtBoundary;
(function (CursorAtBoundary) {
    CursorAtBoundary[CursorAtBoundary["None"] = 0] = "None";
    CursorAtBoundary[CursorAtBoundary["Top"] = 1] = "Top";
    CursorAtBoundary[CursorAtBoundary["Bottom"] = 2] = "Bottom";
    CursorAtBoundary[CursorAtBoundary["Both"] = 3] = "Both";
})(CursorAtBoundary || (CursorAtBoundary = {}));
export var CursorAtLineBoundary;
(function (CursorAtLineBoundary) {
    CursorAtLineBoundary[CursorAtLineBoundary["None"] = 0] = "None";
    CursorAtLineBoundary[CursorAtLineBoundary["Start"] = 1] = "Start";
    CursorAtLineBoundary[CursorAtLineBoundary["End"] = 2] = "End";
    CursorAtLineBoundary[CursorAtLineBoundary["Both"] = 3] = "Both";
})(CursorAtLineBoundary || (CursorAtLineBoundary = {}));
export function getNotebookEditorFromEditorPane(editorPane) {
    if (!editorPane) {
        return;
    }
    if (editorPane.getId() === NOTEBOOK_EDITOR_ID) {
        return editorPane.getControl();
    }
    if (editorPane.getId() === NotebookTextDiffEditor.ID) {
        return editorPane.getControl().inlineNotebookEditor;
    }
    const input = editorPane.input;
    const isCompositeNotebook = input && isCompositeNotebookEditorInput(input);
    if (isCompositeNotebook) {
        return editorPane.getControl()?.notebookEditor;
    }
    return undefined;
}
/**
 * ranges: model selections
 * this will convert model selections to view indexes first, and then include the hidden ranges in the list view
 */
export function expandCellRangesWithHiddenCells(editor, ranges) {
    // assuming ranges are sorted and no overlap
    const indexes = cellRangesToIndexes(ranges);
    const modelRanges = [];
    indexes.forEach(index => {
        const viewCell = editor.cellAt(index);
        if (!viewCell) {
            return;
        }
        const viewIndex = editor.getViewIndexByModelIndex(index);
        if (viewIndex < 0) {
            return;
        }
        const nextViewIndex = viewIndex + 1;
        const range = editor.getCellRangeFromViewRange(viewIndex, nextViewIndex);
        if (range) {
            modelRanges.push(range);
        }
    });
    return reduceCellRanges(modelRanges);
}
export function cellRangeToViewCells(editor, ranges) {
    const cells = [];
    reduceCellRanges(ranges).forEach(range => {
        cells.push(...editor.getCellsInRange(range));
    });
    return cells;
}
//#region Cell Folding
export var CellFoldingState;
(function (CellFoldingState) {
    CellFoldingState[CellFoldingState["None"] = 0] = "None";
    CellFoldingState[CellFoldingState["Expanded"] = 1] = "Expanded";
    CellFoldingState[CellFoldingState["Collapsed"] = 2] = "Collapsed";
})(CellFoldingState || (CellFoldingState = {}));
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tCcm93c2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tCcm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBcUJoRyxPQUFPLEVBQXdLLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdk8sT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFjLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFNL0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHdEUseUJBQXlCO0FBQ3pCLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLCtCQUErQixDQUFDO0FBQzVFLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLHVCQUF1QixDQUFDO0FBQy9ELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLDhCQUE4QixDQUFDO0FBQ25FLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLDhCQUE4QixDQUFDO0FBQ25FLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLHdCQUF3QixDQUFDO0FBQ2xFLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGdDQUFnQyxDQUFDO0FBRzlFLFlBQVk7QUFFWiw2QkFBNkI7QUFFN0Isc0ZBQXNGO0FBQ3RGLCtDQUErQztBQUMvQyxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUM7QUFDbEQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsb0JBQW9CLENBQUM7QUFDekQsaUVBQWlFO0FBQ2pFLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxD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