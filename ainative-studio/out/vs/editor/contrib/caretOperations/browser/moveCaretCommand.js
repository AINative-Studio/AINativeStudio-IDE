/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
export class MoveCaretCommand {
    constructor(selection, isMovingLeft) {
        this._selection = selection;
        this._isMovingLeft = isMovingLeft;
    }
    getEditOperations(model, builder) {
        if (this._selection.startLineNumber !== this._selection.endLineNumber || this._selection.isEmpty()) {
            return;
        }
        const lineNumber = this._selection.startLineNumber;
        const startColumn = this._selection.startColumn;
        const endColumn = this._selection.endColumn;
        if (this._isMovingLeft && startColumn === 1) {
            return;
        }
        if (!this._isMovingLeft && endColumn === model.getLineMaxColumn(lineNumber)) {
            return;
        }
        if (this._isMovingLeft) {
            const rangeBefore = new Range(lineNumber, startColumn - 1, lineNumber, startColumn);
            const charBefore = model.getValueInRange(rangeBefore);
            builder.addEditOperation(rangeBefore, null);
            builder.addEditOperation(new Range(lineNumber, endColumn, lineNumber, endColumn), charBefore);
        }
        else {
            const rangeAfter = new Range(lineNumber, endColumn, lineNumber, endColumn + 1);
            const charAfter = model.getValueInRange(rangeAfter);
            builder.addEditOperation(rangeAfter, null);
            builder.addEditOperation(new Range(lineNumber, startColumn, lineNumber, startColumn), charAfter);
        }
    }
    computeCursorState(model, helper) {
        if (this._isMovingLeft) {
            return new Selection(this._selection.startLineNumber, this._selection.startColumn - 1, this._selection.endLineNumber, this._selection.endColumn - 1);
        }
        else {
            return new Selection(this._selection.startLineNumber, this._selection.startColumn + 1, this._selection.endLineNumber, this._selection.endColumn + 1);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUNhcmV0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jYXJldE9wZXJhdGlvbnMvYnJvd3Nlci9tb3ZlQ2FyZXRDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFJOUQsTUFBTSxPQUFPLGdCQUFnQjtJQUs1QixZQUFZLFNBQW9CLEVBQUUsWUFBcUI7UUFDdEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFDNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7SUFDbkMsQ0FBQztJQUVNLGlCQUFpQixDQUFDLEtBQWlCLEVBQUUsT0FBOEI7UUFDekUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDcEcsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztRQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztRQUM1QyxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksV0FBVyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdDLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksU0FBUyxLQUFLLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzdFLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLFdBQVcsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3BGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1QyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFVBQVUsR0FBRyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0UsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwRCxPQUFPLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRyxDQUFDO0lBQ0YsQ0FBQztJQUVNLGtCQUFrQixDQUFDLEtBQWlCLEVBQUUsTUFBZ0M7UUFDNUUsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdEosQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0SixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=