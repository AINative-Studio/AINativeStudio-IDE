/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Selection } from '../../../common/core/selection.js';
export class InPlaceReplaceCommand {
    constructor(editRange, originalSelection, text) {
        this._editRange = editRange;
        this._originalSelection = originalSelection;
        this._text = text;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(this._editRange, this._text);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const srcRange = inverseEditOperations[0].range;
        if (!this._originalSelection.isEmpty()) {
            // Preserve selection and extends to typed text
            return new Selection(srcRange.endLineNumber, srcRange.endColumn - this._text.length, srcRange.endLineNumber, srcRange.endColumn);
        }
        return new Selection(srcRange.endLineNumber, Math.min(this._originalSelection.positionColumn, srcRange.endColumn), srcRange.endLineNumber, Math.min(this._originalSelection.positionColumn, srcRange.endColumn));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5QbGFjZVJlcGxhY2VDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2luUGxhY2VSZXBsYWNlL2Jyb3dzZXIvaW5QbGFjZVJlcGxhY2VDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUk5RCxNQUFNLE9BQU8scUJBQXFCO0lBTWpDLFlBQVksU0FBZ0IsRUFBRSxpQkFBNEIsRUFBRSxJQUFZO1FBQ3ZFLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQztRQUM1QyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRU0saUJBQWlCLENBQUMsS0FBaUIsRUFBRSxPQUE4QjtRQUN6RSxPQUFPLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVNLGtCQUFrQixDQUFDLEtBQWlCLEVBQUUsTUFBZ0M7UUFDNUUsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUNoRSxNQUFNLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFFaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3hDLCtDQUErQztZQUMvQyxPQUFPLElBQUksU0FBUyxDQUNuQixRQUFRLENBQUMsYUFBYSxFQUN0QixRQUFRLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUN0QyxRQUFRLENBQUMsYUFBYSxFQUN0QixRQUFRLENBQUMsU0FBUyxDQUNsQixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sSUFBSSxTQUFTLENBQ25CLFFBQVEsQ0FBQyxhQUFhLEVBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQ3BFLFFBQVEsQ0FBQyxhQUFhLEVBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQ3BFLENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==