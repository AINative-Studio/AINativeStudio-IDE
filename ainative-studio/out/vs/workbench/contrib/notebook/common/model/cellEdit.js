/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class MoveCellEdit {
    get label() {
        return this.length === 1 ? 'Move Cell' : 'Move Cells';
    }
    constructor(resource, fromIndex, length, toIndex, editingDelegate, beforedSelections, endSelections) {
        this.resource = resource;
        this.fromIndex = fromIndex;
        this.length = length;
        this.toIndex = toIndex;
        this.editingDelegate = editingDelegate;
        this.beforedSelections = beforedSelections;
        this.endSelections = endSelections;
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.code = 'undoredo.textBufferEdit';
    }
    undo() {
        if (!this.editingDelegate.moveCell) {
            throw new Error('Notebook Move Cell not implemented for Undo/Redo');
        }
        this.editingDelegate.moveCell(this.toIndex, this.length, this.fromIndex, this.endSelections, this.beforedSelections);
    }
    redo() {
        if (!this.editingDelegate.moveCell) {
            throw new Error('Notebook Move Cell not implemented for Undo/Redo');
        }
        this.editingDelegate.moveCell(this.fromIndex, this.length, this.toIndex, this.beforedSelections, this.endSelections);
    }
}
export class SpliceCellsEdit {
    get label() {
        // Compute the most appropriate labels
        if (this.diffs.length === 1 && this.diffs[0][1].length === 0) {
            return this.diffs[0][2].length > 1 ? 'Insert Cells' : 'Insert Cell';
        }
        if (this.diffs.length === 1 && this.diffs[0][2].length === 0) {
            return this.diffs[0][1].length > 1 ? 'Delete Cells' : 'Delete Cell';
        }
        // Default to Insert Cell
        return 'Insert Cell';
    }
    constructor(resource, diffs, editingDelegate, beforeHandles, endHandles) {
        this.resource = resource;
        this.diffs = diffs;
        this.editingDelegate = editingDelegate;
        this.beforeHandles = beforeHandles;
        this.endHandles = endHandles;
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.code = 'undoredo.textBufferEdit';
    }
    undo() {
        if (!this.editingDelegate.replaceCell) {
            throw new Error('Notebook Replace Cell not implemented for Undo/Redo');
        }
        this.diffs.forEach(diff => {
            this.editingDelegate.replaceCell(diff[0], diff[2].length, diff[1], this.beforeHandles);
        });
    }
    redo() {
        if (!this.editingDelegate.replaceCell) {
            throw new Error('Notebook Replace Cell not implemented for Undo/Redo');
        }
        this.diffs.reverse().forEach(diff => {
            this.editingDelegate.replaceCell(diff[0], diff[1].length, diff[2], this.endHandles);
        });
    }
}
export class CellMetadataEdit {
    constructor(resource, index, oldMetadata, newMetadata, editingDelegate) {
        this.resource = resource;
        this.index = index;
        this.oldMetadata = oldMetadata;
        this.newMetadata = newMetadata;
        this.editingDelegate = editingDelegate;
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.label = 'Update Cell Metadata';
        this.code = 'undoredo.textBufferEdit';
    }
    undo() {
        if (!this.editingDelegate.updateCellMetadata) {
            return;
        }
        this.editingDelegate.updateCellMetadata(this.index, this.oldMetadata);
    }
    redo() {
        if (!this.editingDelegate.updateCellMetadata) {
            return;
        }
        this.editingDelegate.updateCellMetadata(this.index, this.newMetadata);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL21vZGVsL2NlbGxFZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBa0JoRyxNQUFNLE9BQU8sWUFBWTtJQUV4QixJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztJQUN2RCxDQUFDO0lBR0QsWUFDUSxRQUFhLEVBQ1osU0FBaUIsRUFDakIsTUFBYyxFQUNkLE9BQWUsRUFDZixlQUF5QyxFQUN6QyxpQkFBOEMsRUFDOUMsYUFBMEM7UUFOM0MsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNaLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixvQkFBZSxHQUFmLGVBQWUsQ0FBMEI7UUFDekMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUE2QjtRQUM5QyxrQkFBYSxHQUFiLGFBQWEsQ0FBNkI7UUFibkQsU0FBSSx3Q0FBOEQ7UUFJbEUsU0FBSSxHQUFXLHlCQUF5QixDQUFDO0lBV3pDLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFB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