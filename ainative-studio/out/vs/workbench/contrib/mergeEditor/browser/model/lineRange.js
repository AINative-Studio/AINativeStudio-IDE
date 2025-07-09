/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Range } from '../../../../../editor/common/core/range.js';
export class LineRange {
    static { this.compareByStart = compareBy(l => l.startLineNumber, numberComparator); }
    static join(ranges) {
        if (ranges.length === 0) {
            return undefined;
        }
        let startLineNumber = Number.MAX_SAFE_INTEGER;
        let endLineNumber = 0;
        for (const range of ranges) {
            startLineNumber = Math.min(startLineNumber, range.startLineNumber);
            endLineNumber = Math.max(endLineNumber, range.startLineNumber + range.lineCount);
        }
        return new LineRange(startLineNumber, endLineNumber - startLineNumber);
    }
    static fromLineNumbers(startLineNumber, endExclusiveLineNumber) {
        return new LineRange(startLineNumber, endExclusiveLineNumber - startLineNumber);
    }
    constructor(startLineNumber, lineCount) {
        this.startLineNumber = startLineNumber;
        this.lineCount = lineCount;
        if (lineCount < 0) {
            throw new BugIndicatingError();
        }
    }
    join(other) {
        return new LineRange(Math.min(this.startLineNumber, other.startLineNumber), Math.max(this.endLineNumberExclusive, other.endLineNumberExclusive) - this.startLineNumber);
    }
    get endLineNumberExclusive() {
        return this.startLineNumber + this.lineCount;
    }
    get isEmpty() {
        return this.lineCount === 0;
    }
    /**
     * Returns false if there is at least one line between `this` and `other`.
    */
    touches(other) {
        return (this.endLineNumberExclusive >= other.startLineNumber &&
            other.endLineNumberExclusive >= this.startLineNumber);
    }
    isAfter(range) {
        return this.startLineNumber >= range.endLineNumberExclusive;
    }
    isBefore(range) {
        return range.startLineNumber >= this.endLineNumberExclusive;
    }
    delta(lineDelta) {
        return new LineRange(this.startLineNumber + lineDelta, this.lineCount);
    }
    toString() {
        return `[${this.startLineNumber},${this.endLineNumberExclusive})`;
    }
    equals(originalRange) {
        return this.startLineNumber === originalRange.startLineNumber && this.lineCount === originalRange.lineCount;
    }
    contains(lineNumber) {
        return this.startLineNumber <= lineNumber && lineNumber < this.endLineNumberExclusive;
    }
    deltaEnd(delta) {
        return new LineRange(this.startLineNumber, this.lineCount + delta);
    }
    deltaStart(lineDelta) {
        return new LineRange(this.startLineNumber + lineDelta, this.lineCount - lineDelta);
    }
    getLines(model) {
        const result = new Array(this.lineCount);
        for (let i = 0; i < this.lineCount; i++) {
            result[i] = model.getLineContent(this.startLineNumber + i);
        }
        return result;
    }
    containsRange(range) {
        return this.startLineNumber <= range.startLineNumber && range.endLineNumberExclusive <= this.endLineNumberExclusive;
    }
    toRange() {
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive, 1);
    }
    toInclusiveRange() {
        if (this.isEmpty) {
            return undefined;
        }
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    }
    toInclusiveRangeOrEmpty() {
        if (this.isEmpty) {
            return new Range(this.startLineNumber, 1, this.startLineNumber, 1);
        }
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    }
    intersects(lineRange) {
        return this.startLineNumber <= lineRange.endLineNumberExclusive
            && lineRange.startLineNumber <= this.endLineNumberExclusive;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVJhbmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbW9kZWwvbGluZVJhbmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBYyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHbkUsTUFBTSxPQUFPLFNBQVM7YUFDRSxtQkFBYyxHQUEwQixTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFFNUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFtQjtRQUNyQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksZUFBZSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztRQUM5QyxJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdEIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUM1QixlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ25FLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsRixDQUFDO1FBQ0QsT0FBTyxJQUFJLFNBQVMsQ0FBQyxlQUFl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