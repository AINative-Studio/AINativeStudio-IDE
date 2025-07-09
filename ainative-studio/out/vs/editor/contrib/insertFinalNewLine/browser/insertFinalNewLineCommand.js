/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
export class InsertFinalNewLineCommand {
    constructor(selection) {
        this._selection = selection;
        this._selectionId = null;
    }
    getEditOperations(model, builder) {
        const op = insertFinalNewLine(model);
        if (op) {
            builder.addEditOperation(op.range, op.text);
        }
        this._selectionId = builder.trackSelection(this._selection);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this._selectionId);
    }
}
/**
 * Generate edit operations for inserting a final new line if needed.
 * Returns undefined if no edit is needed.
 */
export function insertFinalNewLine(model) {
    const lineCount = model.getLineCount();
    const lastLine = model.getLineContent(lineCount);
    const lastLineIsEmptyOrWhitespace = strings.lastNonWhitespaceIndex(lastLine) === -1;
    if (!lineCount || lastLineIsEmptyOrWhitespace) {
        return;
    }
    return EditOperation.insert(new Position(lineCount, model.getLineMaxColumn(lineCount)), model.getEOL());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0RmluYWxOZXdMaW5lQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbnNlcnRGaW5hbE5ld0xpbmUvYnJvd3Nlci9pbnNlcnRGaW5hbE5ld0xpbmVDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFLNUQsTUFBTSxPQUFPLHlCQUF5QjtJQU1yQyxZQUFZLFNBQW9CO1FBQy9CLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO0lBQzFCLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFpQixFQUFFLE9BQThCO1FBQ3pFLE1BQU0sRUFBRSxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVNLGtCQUFrQixDQUFDLEtBQWlCLEVBQUUsTUFBZ0M7UUFDNUUsT0FBTyxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFlBQWEsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7Q0FDRDtBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxLQUFpQjtJQUNuRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDdkMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqRCxNQUFNLDJCQUEyQixHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUVwRixJQUFJLENBQUMsU0FBUyxJQUFJLDJCQUEyQixFQUFFLENBQUM7UUFDL0MsT0FBTztJQUNSLENBQUM7SUFFRCxPQUFPLGFBQWEsQ0FBQyxNQUFNLENBQzFCLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUNkLENBQUM7QUFDSCxDQUFDIn0=