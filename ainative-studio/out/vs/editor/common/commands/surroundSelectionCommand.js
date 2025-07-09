/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
export class SurroundSelectionCommand {
    constructor(range, charBeforeSelection, charAfterSelection) {
        this._range = range;
        this._charBeforeSelection = charBeforeSelection;
        this._charAfterSelection = charAfterSelection;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(new Range(this._range.startLineNumber, this._range.startColumn, this._range.startLineNumber, this._range.startColumn), this._charBeforeSelection);
        builder.addTrackedEditOperation(new Range(this._range.endLineNumber, this._range.endColumn, this._range.endLineNumber, this._range.endColumn), this._charAfterSelection);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const firstOperationRange = inverseEditOperations[0].range;
        const secondOperationRange = inverseEditOperations[1].range;
        return new Selection(firstOperationRange.endLineNumber, firstOperationRange.endColumn, secondOperationRange.endLineNumber, secondOperationRange.endColumn - this._charAfterSelection.length);
    }
}
/**
 * A surround selection command that runs after composition finished.
 */
export class CompositionSurroundSelectionCommand {
    constructor(_position, _text, _charAfter) {
        this._position = _position;
        this._text = _text;
        this._charAfter = _charAfter;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(new Range(this._position.lineNumber, this._position.column, this._position.lineNumber, this._position.column), this._text + this._charAfter);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const opRange = inverseEditOperations[0].range;
        return new Selection(opRange.endLineNumber, opRange.startColumn, opRange.endLineNumber, opRange.endColumn - this._charAfter.length);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Vycm91bmRTZWxlY3Rpb25Db21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29tbWFuZHMvc3Vycm91bmRTZWxlY3Rpb25Db21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV6QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFJakQsTUFBTSxPQUFPLHdCQUF3QjtJQUtwQyxZQUFZLEtBQWdCLEVBQUUsbUJBQTJCLEVBQUUsa0JBQTBCO1FBQ3BGLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQztRQUNoRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsa0JBQWtCLENBQUM7SUFDL0MsQ0FBQztJQUVNLGlCQUFpQixDQUFDLEtBQWlCLEVBQUUsT0FBOEI7UUFDekUsT0FBTyxDQUFDLHVCQUF1QixDQUFDLElBQUksS0FBSyxDQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FDdkIsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUU5QixPQUFPLENBQUMsdUJBQXVCLENBQUMsSUFBSSxLQUFLLENBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUNyQixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxLQUFpQixFQUFFLE1BQWdDO1FBQzVFLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDaEUsTUFBTSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDM0QsTUFBTSxvQkFBb0IsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFFNUQsT0FBTyxJQUFJLFNBQVMsQ0FDbkIsbUJBQW1CLENBQUMsYUFBYSxFQUNqQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQzdCLG9CQUFvQixDQUFDLGFBQWEsRUFDbEMsb0JBQW9CLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQ2hFLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxtQ0FBbUM7SUFFL0MsWUFDa0IsU0FBbUIsRUFDbkIsS0FBYSxFQUNiLFVBQWtCO1FBRmxCLGNBQVMsR0FBVCxTQUFTLENBQVU7UUFDbkIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGVBQVUsR0FBVixVQUFVLENBQVE7SUFDaEMsQ0FBQztJQUVFLGlCQUFpQixDQUFDLEtBQWlCLEVBQUUsT0FBOEI7UUFDekUsT0FBTyxDQUFDLHVCQUF1QixDQUFDLElBQUksS0FBSyxDQUN4QyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFDekIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDckIsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU0sa0JBQWtCLENBQUMsS0FBaUIsRUFBRSxNQUFnQztRQUM1RSxNQUFNLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQ2hFLE1BQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUUvQyxPQUFPLElBQUksU0FBUyxDQUNuQixPQUFPLENBQUMsYUFBYSxFQUNyQixPQUFPLENBQUMsV0FBVyxFQUNuQixPQUFPLENBQUMsYUFBYSxFQUNyQixPQUFPLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUMxQyxDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=