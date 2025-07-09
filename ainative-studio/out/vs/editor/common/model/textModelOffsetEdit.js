/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../core/editOperation.js';
import { Range } from '../core/range.js';
import { OffsetEdit, SingleOffsetEdit } from '../core/offsetEdit.js';
import { OffsetRange } from '../core/offsetRange.js';
export class OffsetEdits {
    constructor() {
        // static utils only!
    }
    static asEditOperations(offsetEdit, doc) {
        const edits = [];
        for (const singleEdit of offsetEdit.edits) {
            const range = Range.fromPositions(doc.getPositionAt(singleEdit.replaceRange.start), doc.getPositionAt(singleEdit.replaceRange.start + singleEdit.replaceRange.length));
            edits.push(EditOperation.replace(range, singleEdit.newText));
        }
        return edits;
    }
    static fromContentChanges(contentChanges) {
        const editsArr = contentChanges.map(c => new SingleOffsetEdit(OffsetRange.ofStartAndLength(c.rangeOffset, c.rangeLength), c.text));
        editsArr.reverse();
        const edits = new OffsetEdit(editsArr);
        return edits;
    }
    static fromLineRangeMapping(original, modified, changes) {
        const edits = [];
        for (const c of changes) {
            for (const i of c.innerChanges ?? []) {
                const newText = modified.getValueInRange(i.modifiedRange);
                const startOrig = original.getOffsetAt(i.originalRange.getStartPosition());
                const endExOrig = original.getOffsetAt(i.originalRange.getEndPosition());
                const origRange = new OffsetRange(startOrig, endExOrig);
                edits.push(new SingleOffsetEdit(origRange, newText));
            }
        }
        return new OffsetEdit(edits);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsT2Zmc2V0RWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3RleHRNb2RlbE9mZnNldEVkaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDckUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBTXJELE1BQU0sT0FBZ0IsV0FBVztJQUVoQztRQUNDLHFCQUFxQjtJQUN0QixDQUFDO0lBRUQsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQXNCLEVBQUUsR0FBZTtRQUM5RCxNQUFNLEtBQUssR0FBcUMsRUFBRSxDQUFDO1FBQ25ELEtBQUssTUFBTSxVQUFVLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzNDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQ2hDLEdBQUcsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFDaEQsR0FBRyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUNqRixDQUFDO1lBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsTUFBTSxDQUFDLGtCQUFrQixDQUFDLGNBQThDO1FBQ3ZFLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuSSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkMsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFFBQW9CLEVBQUUsUUFBb0IsRUFBRSxPQUE0QztRQUNuSCxNQUFNLEtBQUssR0FBdUIsRUFBRSxDQUFDO1FBQ3JDLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDekIsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFFMUQsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztnQkFDM0UsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pFLE1BQU0sU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFFeEQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QixDQUFDO0NBQ0QifQ==