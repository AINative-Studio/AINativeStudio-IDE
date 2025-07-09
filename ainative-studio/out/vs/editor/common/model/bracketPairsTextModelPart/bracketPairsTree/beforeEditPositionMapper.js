/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../core/range.js';
import { lengthAdd, lengthDiffNonNegative, lengthLessThanEqual, lengthOfString, lengthToObj, positionToLength, toLength } from './length.js';
export class TextEditInfo {
    static fromModelContentChanges(changes) {
        // Must be sorted in ascending order
        const edits = changes.map(c => {
            const range = Range.lift(c.range);
            return new TextEditInfo(positionToLength(range.getStartPosition()), positionToLength(range.getEndPosition()), lengthOfString(c.text));
        }).reverse();
        return edits;
    }
    constructor(startOffset, endOffset, newLength) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.newLength = newLength;
    }
    toString() {
        return `[${lengthToObj(this.startOffset)}...${lengthToObj(this.endOffset)}) -> ${lengthToObj(this.newLength)}`;
    }
}
export class BeforeEditPositionMapper {
    /**
     * @param edits Must be sorted by offset in ascending order.
    */
    constructor(edits) {
        this.nextEditIdx = 0;
        this.deltaOldToNewLineCount = 0;
        this.deltaOldToNewColumnCount = 0;
        this.deltaLineIdxInOld = -1;
        this.edits = edits.map(edit => TextEditInfoCache.from(edit));
    }
    /**
     * @param offset Must be equal to or greater than the last offset this method has been called with.
    */
    getOffsetBeforeChange(offset) {
        this.adjustNextEdit(offset);
        return this.translateCurToOld(offset);
    }
    /**
     * @param offset Must be equal to or greater than the last offset this method has been called with.
     * Returns null if there is no edit anymore.
    */
    getDistanceToNextChange(offset) {
        this.adjustNextEdit(offset);
        const nextEdit = this.edits[this.nextEditIdx];
        const nextChangeOffset = nextEdit ? this.translateOldToCur(nextEdit.offsetObj) : null;
        if (nextChangeOffset === null) {
            return null;
        }
        return lengthDiffNonNegative(offset, nextChangeOffset);
    }
    translateOldToCur(oldOffsetObj) {
        if (oldOffsetObj.lineCount === this.deltaLineIdxInOld) {
            return toLength(oldOffsetObj.lineCount + this.deltaOldToNewLineCount, oldOffsetObj.columnCount + this.deltaOldToNewColumnCount);
        }
        else {
            return toLength(oldOffsetObj.lineCount + this.deltaOldToNewLineCount, oldOffsetObj.columnCount);
        }
    }
    translateCurToOld(newOffset) {
        const offsetObj = lengthToObj(newOffset);
        if (offsetObj.lineCount - this.deltaOldToNewLineCount === this.deltaLineIdxInOld) {
            return toLength(offsetObj.lineCount - this.deltaOldToNewLineCount, offsetObj.columnCount - this.deltaOldToNewColumnCount);
        }
        else {
            return toLength(offsetObj.lineCount - this.deltaOldToNewLineCount, offsetObj.columnCount);
        }
    }
    adjustNextEdit(offset) {
        while (this.nextEditIdx < this.edits.length) {
            const nextEdit = this.edits[this.nextEditIdx];
            // After applying the edit, what is its end offset (considering all previous edits)?
            const nextEditEndOffsetInCur = this.translateOldToCur(nextEdit.endOffsetAfterObj);
            if (lengthLessThanEqual(nextEditEndOffsetInCur, offset)) {
                // We are after the edit, skip it
                this.nextEditIdx++;
                const nextEditEndOffsetInCurObj = lengthToObj(nextEditEndOffsetInCur);
                // Before applying the edit, what is its end offset (considering all previous edits)?
                const nextEditEndOffsetBeforeInCurObj = lengthToObj(this.translateOldToCur(nextEdit.endOffsetBeforeObj));
                const lineDelta = nextEditEndOffsetInCurObj.lineCount - nextEditEndOffsetBeforeInCurObj.lineCount;
                this.deltaOldToNewLineCount += lineDelta;
                const previousColumnDelta = this.deltaLineIdxInOld === nextEdit.endOffsetBeforeObj.lineCount ? this.deltaOldToNewColumnCount : 0;
                const columnDelta = nextEditEndOffsetInCurObj.columnCount - nextEditEndOffsetBeforeInCurObj.columnCount;
                this.deltaOldToNewColumnCount = previousColumnDelta + columnDelta;
                this.deltaLineIdxInOld = nextEdit.endOffsetBeforeObj.lineCount;
            }
            else {
                // We are in or before the edit.
                break;
            }
        }
    }
}
class TextEditInfoCache {
    static from(edit) {
        return new TextEditInfoCache(edit.startOffset, edit.endOffset, edit.newLength);
    }
    constructor(startOffset, endOffset, textLength) {
        this.endOffsetBeforeObj = lengthToObj(endOffset);
        this.endOffsetAfterObj = lengthToObj(lengthAdd(startOffset, textLength));
        this.offsetObj = lengthToObj(startOffset);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVmb3JlRWRpdFBvc2l0aW9uTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL2JlZm9yZUVkaXRQb3NpdGlvbk1hcHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0MsT0FBTyxFQUFVLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUlySixNQUFNLE9BQU8sWUFBWTtJQUNqQixNQUFNLENBQUMsdUJBQXVCLENBQUMsT0FBOEI7UUFDbkUsb0NBQW9DO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDN0IsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbEMsT0FBTyxJQUFJLFlBQVksQ0FDdEIsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFDMUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQ3hDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ3RCLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNiLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELFlBQ2lCLFdBQW1CLEVBQ25CLFNBQWlCLEVBQ2pCLFNBQWlCO1FBRmpCLGdCQUFXLEdBQVgsV0FBVyxD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