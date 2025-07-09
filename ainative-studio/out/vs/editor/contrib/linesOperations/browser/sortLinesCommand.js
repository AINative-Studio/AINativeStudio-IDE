/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
export class SortLinesCommand {
    static { this._COLLATOR = null; }
    static getCollator() {
        if (!SortLinesCommand._COLLATOR) {
            SortLinesCommand._COLLATOR = new Intl.Collator();
        }
        return SortLinesCommand._COLLATOR;
    }
    constructor(selection, descending) {
        this.selection = selection;
        this.descending = descending;
        this.selectionId = null;
    }
    getEditOperations(model, builder) {
        const op = sortLines(model, this.selection, this.descending);
        if (op) {
            builder.addEditOperation(op.range, op.text);
        }
        this.selectionId = builder.trackSelection(this.selection);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this.selectionId);
    }
    static canRun(model, selection, descending) {
        if (model === null) {
            return false;
        }
        const data = getSortData(model, selection, descending);
        if (!data) {
            return false;
        }
        for (let i = 0, len = data.before.length; i < len; i++) {
            if (data.before[i] !== data.after[i]) {
                return true;
            }
        }
        return false;
    }
}
function getSortData(model, selection, descending) {
    const startLineNumber = selection.startLineNumber;
    let endLineNumber = selection.endLineNumber;
    if (selection.endColumn === 1) {
        endLineNumber--;
    }
    // Nothing to sort if user didn't select anything.
    if (startLineNumber >= endLineNumber) {
        return null;
    }
    const linesToSort = [];
    // Get the contents of the selection to be sorted.
    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
        linesToSort.push(model.getLineContent(lineNumber));
    }
    let sorted = linesToSort.slice(0);
    sorted.sort(SortLinesCommand.getCollator().compare);
    // If descending, reverse the order.
    if (descending === true) {
        sorted = sorted.reverse();
    }
    return {
        startLineNumber: startLineNumber,
        endLineNumber: endLineNumber,
        before: linesToSort,
        after: sorted
    };
}
/**
 * Generate commands for sorting lines on a model.
 */
function sortLines(model, selection, descending) {
    const data = getSortData(model, selection, descending);
    if (!data) {
        return null;
    }
    return EditOperation.replace(new Range(data.startLineNumber, 1, data.endLineNumber, model.getLineMaxColumn(data.endLineNumber)), data.after.join('\n'));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ydExpbmVzQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9saW5lc09wZXJhdGlvbnMvYnJvd3Nlci9zb3J0TGluZXNDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0sdUNBQXVDLENBQUM7QUFDNUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBS3RELE1BQU0sT0FBTyxnQkFBZ0I7YUFFYixjQUFTLEdBQXlCLElBQUksQ0FBQztJQUMvQyxNQUFNLENBQUMsV0FBVztRQUN4QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakMsZ0JBQWdCLENBQUMsU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2xELENBQUM7UUFDRCxPQUFPLGdCQUFnQixDQUFDLFNBQVMsQ0FBQztJQUNuQyxDQUFDO0lBTUQsWUFBWSxTQUFvQixFQUFFLFVBQW1CO1FBQ3BELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFpQixFQUFFLE9BQThCO1FBQ3pFLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDN0QsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJ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