/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SelectionStateType } from '../../common/notebookCommon.js';
import { CellFocusMode } from '../notebookBrowser.js';
export class JoinCellEdit {
    constructor(resource, index, direction, cell, selections, inverseRange, insertContent, removedCell, editingDelegate) {
        this.resource = resource;
        this.index = index;
        this.direction = direction;
        this.cell = cell;
        this.selections = selections;
        this.inverseRange = inverseRange;
        this.insertContent = insertContent;
        this.removedCell = removedCell;
        this.editingDelegate = editingDelegate;
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.label = 'Join Cell';
        this.code = 'undoredo.textBufferEdit';
        this._deletedRawCell = this.removedCell.model;
    }
    async undo() {
        if (!this.editingDelegate.insertCell || !this.editingDelegate.createCellViewModel) {
            throw new Error('Notebook Insert Cell not implemented for Undo/Redo');
        }
        await this.cell.resolveTextModel();
        this.cell.textModel?.applyEdits([
            { range: this.inverseRange, text: '' }
        ]);
        this.cell.setSelections(this.selections);
        const cell = this.editingDelegate.createCellViewModel(this._deletedRawCell);
        if (this.direction === 'above') {
            this.editingDelegate.insertCell(this.index, this._deletedRawCell, { kind: SelectionStateType.Handle, primary: cell.handle, selections: [cell.handle] });
            cell.focusMode = CellFocusMode.Editor;
        }
        else {
            this.editingDelegate.insertCell(this.index, cell.model, { kind: SelectionStateType.Handle, primary: this.cell.handle, selections: [this.cell.handle] });
            this.cell.focusMode = CellFocusMode.Editor;
        }
    }
    async redo() {
        if (!this.editingDelegate.deleteCell) {
            throw new Error('Notebook Delete Cell not implemented for Undo/Redo');
        }
        await this.cell.resolveTextModel();
        this.cell.textModel?.applyEdits([
            { range: this.inverseRange, text: this.insertContent }
        ]);
        this.editingDelegate.deleteCell(this.index, { kind: SelectionStateType.Handle, primary: this.cell.handle, selections: [this.cell.handle] });
        this.cell.focusMode = CellFocusMode.Editor;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvY2VsbEVkaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUE4QyxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBSWhILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQVV0RCxNQUFNLE9BQU8sWUFBWTtJQUt4QixZQUNRLFFBQWEsRUFDWixLQUFhLEVBQ2IsU0FBNEIsRUFDNUIsSUFBdUIsRUFDdkIsVUFBdUIsRUFDdkIsWUFBbUIsRUFDbkIsYUFBcUIsRUFDckIsV0FBOEIsRUFDOUIsZUFBeUM7UUFSMUMsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNaLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixjQUFTLEdBQVQsU0FBUyxDQUFtQjtRQUM1QixTQUFJLEdBQUosSUFBSSxDQUFtQjtRQUN2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3ZCLGlCQUFZLEdBQVosWUFBWSxDQUFPO1FBQ25CLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBQ3JCLGdCQUFXLEdBQVgsV0FBVyxDQUFtQjtRQUM5QixvQkFBZSxHQUFmLGVBQWUsQ0FBMEI7UUFibEQsU0FBSSx3Q0FBOEQ7UUFDbEUsVUFBSyxHQUFXLFdBQVcsQ0FBQztRQUM1QixTQUFJLEdBQVcseUJBQXlCLENBQUM7UUFheEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztJQUMvQyxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUk7UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENB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