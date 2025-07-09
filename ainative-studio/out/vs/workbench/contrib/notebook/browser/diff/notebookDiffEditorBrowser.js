/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { localize } from '../../../../../nls.js';
export var DiffSide;
(function (DiffSide) {
    DiffSide[DiffSide["Original"] = 0] = "Original";
    DiffSide[DiffSide["Modified"] = 1] = "Modified";
})(DiffSide || (DiffSide = {}));
export const DIFF_CELL_MARGIN = 16;
export const NOTEBOOK_DIFF_CELL_INPUT = new RawContextKey('notebook.diffEditor.cell.inputChanged', false);
export const NOTEBOOK_DIFF_METADATA = new RawContextKey('notebook.diffEditor.metadataChanged', false);
export const NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY = 'notebook.diffEditor.cell.ignoreWhitespace';
export const NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE = new RawContextKey(NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY, false);
export const NOTEBOOK_DIFF_CELL_PROPERTY = new RawContextKey('notebook.diffEditor.cell.property.changed', false);
export const NOTEBOOK_DIFF_CELL_PROPERTY_EXPANDED = new RawContextKey('notebook.diffEditor.cell.property.expanded', false);
export const NOTEBOOK_DIFF_CELLS_COLLAPSED = new RawContextKey('notebook.diffEditor.allCollapsed', undefined, localize('notebook.diffEditor.allCollapsed', "Whether all cells in notebook diff editor are collapsed"));
export const NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS = new RawContextKey('notebook.diffEditor.hasUnchangedCells', undefined, localize('notebook.diffEditor.hasUnchangedCells', "Whether there are unchanged cells in the notebook diff editor"));
export const NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN = new RawContextKey('notebook.diffEditor.unchangedCellsAreHidden', undefined, localize('notebook.diffEditor.unchangedCellsAreHidden', "Whether the unchanged cells in the notebook diff editor are hidden"));
export const NOTEBOOK_DIFF_ITEM_KIND = new RawContextKey('notebook.diffEditor.item.kind', undefined, localize('notebook.diffEditor.item.kind', "The kind of item in the notebook diff editor, Cell, Metadata or Output"));
export const NOTEBOOK_DIFF_ITEM_DIFF_STATE = new RawContextKey('notebook.diffEditor.item.state', undefined, localize('notebook.diffEditor.item.state', "The diff state of item in the notebook diff editor, delete, insert, modified or unchanged"));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmRWRpdG9yQnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvbm90ZWJvb2tEaWZmRWRpdG9yQnJvd3Nlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFNeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR2pELE1BQU0sQ0FBTixJQUFZLFFBR1g7QUFIRCxXQUFZLFFBQVE7SUFDbkIsK0NBQVksQ0FBQTtJQUNaLCtDQUFZLENBQUE7QUFDYixDQUFDLEVBSFcsUUFBUSxLQUFSLFFBQVEsUUFHbkI7QUF5SUQsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO0FBQ25DLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLElBQUksYUFBYSxDQUFVLHVDQUF1QyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ25ILE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLElBQUksYUFBYSxDQUFVLHFDQUFxQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQy9HLE1BQU0sQ0FBQyxNQUFNLHdDQUF3QyxHQUFHLDJDQUEyQyxDQUFDO0FBQ3BHLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLElBQUksYUFBYSxDQUFVLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ2hJLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLElBQUksYUFBYSxDQUFVLDJDQUEyQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzFILE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLElBQUksYUFBYSxDQUFVLDRDQUE0QyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3BJLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUFVLGtDQUFrQyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsa0NBQWtDLEVBQUUseURBQXlELENBQUMsQ0FBQyxDQUFDO0FBQ2hPLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLElBQUksYUFBYSxDQUFVLHVDQUF1QyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsK0RBQStELENBQUMsQ0FBQyxDQUFDO0FBQ3BQLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLElBQUksYUFBYSxDQUFVLDZDQUE2QyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsNkNBQTZDLEVBQUUsb0VBQW9FLENBQUMsQ0FBQyxDQUFDO0FBQ3hRLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLElBQUksYUFBYSxDQUFVLCtCQUErQixFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsd0VBQXdFLENBQUMsQ0FBQyxDQUFDO0FBQ25PLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUFVLGdDQUFnQyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsMkZBQTJGLENBQUMsQ0FBQyxDQUFDIn0=