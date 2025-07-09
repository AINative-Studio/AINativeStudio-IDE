/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
export class ReplaceAllCommand {
    constructor(editorSelection, ranges, replaceStrings) {
        this._editorSelection = editorSelection;
        this._ranges = ranges;
        this._replaceStrings = replaceStrings;
        this._trackedEditorSelectionId = null;
    }
    getEditOperations(model, builder) {
        if (this._ranges.length > 0) {
            // Collect all edit operations
            const ops = [];
            for (let i = 0; i < this._ranges.length; i++) {
                ops.push({
                    range: this._ranges[i],
                    text: this._replaceStrings[i]
                });
            }
            // Sort them in ascending order by range starts
            ops.sort((o1, o2) => {
                return Range.compareRangesUsingStarts(o1.range, o2.range);
            });
            // Merge operations that touch each other
            const resultOps = [];
            let previousOp = ops[0];
            for (let i = 1; i < ops.length; i++) {
                if (previousOp.range.endLineNumber === ops[i].range.startLineNumber && previousOp.range.endColumn === ops[i].range.startColumn) {
                    // These operations are one after another and can be merged
                    previousOp.range = previousOp.range.plusRange(ops[i].range);
                    previousOp.text = previousOp.text + ops[i].text;
                }
                else {
                    resultOps.push(previousOp);
                    previousOp = ops[i];
                }
            }
            resultOps.push(previousOp);
            for (const op of resultOps) {
                builder.addEditOperation(op.range, op.text);
            }
        }
        this._trackedEditorSelectionId = builder.trackSelection(this._editorSelection);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this._trackedEditorSelectionId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZUFsbENvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZmluZC9icm93c2VyL3JlcGxhY2VBbGxDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQVV0RCxNQUFNLE9BQU8saUJBQWlCO0lBTzdCLFlBQVksZUFBMEIsRUFBRSxNQUFlLEVBQUUsY0FBd0I7UUFDaEYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQztRQUN4QyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUN0QyxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDO0lBQ3ZDLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFpQixFQUFFLE9BQThCO1FBQ3pFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0IsOEJBQThCO1lBQzlCLE1BQU0sR0FBRyxHQUFxQixFQUFFLENBQUM7WUFDakMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlDLEdBQUcsQ0FBQyxJQUFJLENBQUM7b0JBQ1IsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUN0QixJQUFJLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7aUJBQzdCLENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCwrQ0FBK0M7WUFDL0MsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtnQkFDbkIsT0FBTyxLQUFLLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDM0QsQ0FBQyxDQUFDLENBQUM7WUFFSCx5Q0FBeUM7WUFDekMsTUFBTSxTQUFTLEdBQXFCLEVBQUUsQ0FBQztZQUN2QyxJQUFJLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLGFBQWEsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLFNBQVMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNoSSwyREFBMkQ7b0JBQzNELFVBQVUsQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUM1RCxVQUFVLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDakQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQzNCLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLENBQUM7WUFDRixDQUFDO1lBQ0QsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUUzQixLQUFLLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUM1QixPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMseUJBQXlCLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRU0sa0JBQWtCLENBQUMsS0FBaUIsRUFBRSxNQUFnQztRQUM1RSxPQUFPLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMseUJBQTBCLENBQUMsQ0FBQztJQUNwRSxDQUFDO0NBQ0QifQ==