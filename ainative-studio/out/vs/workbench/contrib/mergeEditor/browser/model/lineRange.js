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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVJhbmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tb2RlbC9saW5lUmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFjLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUduRSxNQUFNLE9BQU8sU0FBUzthQUNFLG1CQUFjLEdBQTBCLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUU1RyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQW1CO1FBQ3JDLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxlQUFlLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQzlDLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQztRQUN0QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzVCLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDbkUsYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFDRCxPQUFPLElBQUksU0FBUyxDQUFDLGVBQWUs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