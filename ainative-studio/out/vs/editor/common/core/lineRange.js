/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../base/common/errors.js';
import { OffsetRange } from './offsetRange.js';
import { Range } from './range.js';
import { findFirstIdxMonotonousOrArrLen, findLastIdxMonotonous, findLastMonotonous } from '../../../base/common/arraysFind.js';
/**
 * A range of lines (1-based).
 */
export class LineRange {
    static fromRange(range) {
        return new LineRange(range.startLineNumber, range.endLineNumber);
    }
    static fromRangeInclusive(range) {
        return new LineRange(range.startLineNumber, range.endLineNumber + 1);
    }
    static subtract(a, b) {
        if (!b) {
            return [a];
        }
        if (a.startLineNumber < b.startLineNumber && b.endLineNumberExclusive < a.endLineNumberExclusive) {
            return [
                new LineRange(a.startLineNumber, b.startLineNumber),
                new LineRange(b.endLineNumberExclusive, a.endLineNumberExclusive)
            ];
        }
        else if (b.startLineNumber <= a.startLineNumber && a.endLineNumberExclusive <= b.endLineNumberExclusive) {
            return [];
        }
        else if (b.endLineNumberExclusive < a.endLineNumberExclusive) {
            return [new LineRange(Math.max(b.endLineNumberExclusive, a.startLineNumber), a.endLineNumberExclusive)];
        }
        else {
            return [new LineRange(a.startLineNumber, Math.min(b.startLineNumber, a.endLineNumberExclusive))];
        }
    }
    /**
     * @param lineRanges An array of sorted line ranges.
     */
    static joinMany(lineRanges) {
        if (lineRanges.length === 0) {
            return [];
        }
        let result = new LineRangeSet(lineRanges[0].slice());
        for (let i = 1; i < lineRanges.length; i++) {
            result = result.getUnion(new LineRangeSet(lineRanges[i].slice()));
        }
        return result.ranges;
    }
    static join(lineRanges) {
        if (lineRanges.length === 0) {
            throw new BugIndicatingError('lineRanges cannot be empty');
        }
        let startLineNumber = lineRanges[0].startLineNumber;
        let endLineNumberExclusive = lineRanges[0].endLineNumberExclusive;
        for (let i = 1; i < lineRanges.length; i++) {
            startLineNumber = Math.min(startLineNumber, lineRanges[i].startLineNumber);
            endLineNumberExclusive = Math.max(endLineNumberExclusive, lineRanges[i].endLineNumberExclusive);
        }
        return new LineRange(startLineNumber, endLineNumberExclusive);
    }
    static ofLength(startLineNumber, length) {
        return new LineRange(startLineNumber, startLineNumber + length);
    }
    /**
     * @internal
     */
    static deserialize(lineRange) {
        return new LineRange(lineRange[0], lineRange[1]);
    }
    constructor(startLineNumber, endLineNumberExclusive) {
        if (startLineNumber > endLineNumberExclusive) {
            throw new BugIndicatingError(`startLineNumber ${startLineNumber} cannot be after endLineNumberExclusive ${endLineNumberExclusive}`);
        }
        this.startLineNumber = startLineNumber;
        this.endLineNumberExclusive = endLineNumberExclusive;
    }
    /**
     * Indicates if this line range contains the given line number.
     */
    contains(lineNumber) {
        return this.startLineNumber <= lineNumber && lineNumber < this.endLineNumberExclusive;
    }
    /**
     * Indicates if this line range is empty.
     */
    get isEmpty() {
        return this.startLineNumber === this.endLineNumberExclusive;
    }
    /**
     * Moves this line range by the given offset of line numbers.
     */
    delta(offset) {
        return new LineRange(this.startLineNumber + offset, this.endLineNumberExclusive + offset);
    }
    deltaLength(offset) {
        return new LineRange(this.startLineNumber, this.endLineNumberExclusive + offset);
    }
    /**
     * The number of lines this line range spans.
     */
    get length() {
        return this.endLineNumberExclusive - this.startLineNumber;
    }
    /**
     * Creates a line range that combines this and the given line range.
     */
    join(other) {
        return new LineRange(Math.min(this.startLineNumber, other.startLineNumber), Math.max(this.endLineNumberExclusive, other.endLineNumberExclusive));
    }
    toString() {
        return `[${this.startLineNumber},${this.endLineNumberExclusive})`;
    }
    /**
     * The resulting range is empty if the ranges do not intersect, but touch.
     * If the ranges don't even touch, the result is undefined.
     */
    intersect(other) {
        const startLineNumber = Math.max(this.startLineNumber, other.startLineNumber);
        const endLineNumberExclusive = Math.min(this.endLineNumberExclusive, other.endLineNumberExclusive);
        if (startLineNumber <= endLineNumberExclusive) {
            return new LineRange(startLineNumber, endLineNumberExclusive);
        }
        return undefined;
    }
    intersectsStrict(other) {
        return this.startLineNumber < other.endLineNumberExclusive && other.startLineNumber < this.endLineNumberExclusive;
    }
    overlapOrTouch(other) {
        return this.startLineNumber <= other.endLineNumberExclusive && other.startLineNumber <= this.endLineNumberExclusive;
    }
    equals(b) {
        return this.startLineNumber === b.startLineNumber && this.endLineNumberExclusive === b.endLineNumberExclusive;
    }
    toInclusiveRange() {
        if (this.isEmpty) {
            return null;
        }
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER);
    }
    /**
     * @deprecated Using this function is discouraged because it might lead to bugs: The end position is not guaranteed to be a valid position!
    */
    toExclusiveRange() {
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive, 1);
    }
    mapToLineArray(f) {
        const result = [];
        for (let lineNumber = this.startLineNumber; lineNumber < this.endLineNumberExclusive; lineNumber++) {
            result.push(f(lineNumber));
        }
        return result;
    }
    forEach(f) {
        for (let lineNumber = this.startLineNumber; lineNumber < this.endLineNumberExclusive; lineNumber++) {
            f(lineNumber);
        }
    }
    /**
     * @internal
     */
    serialize() {
        return [this.startLineNumber, this.endLineNumberExclusive];
    }
    includes(lineNumber) {
        return this.startLineNumber <= lineNumber && lineNumber < this.endLineNumberExclusive;
    }
    /**
     * Converts this 1-based line range to a 0-based offset range (subtracts 1!).
     * @internal
     */
    toOffsetRange() {
        return new OffsetRange(this.startLineNumber - 1, this.endLineNumberExclusive - 1);
    }
    distanceToRange(other) {
        if (this.endLineNumberExclusive <= other.startLineNumber) {
            return other.startLineNumber - this.endLineNumberExclusive;
        }
        if (other.endLineNumberExclusive <= this.startLineNumber) {
            return this.startLineNumber - other.endLineNumberExclusive;
        }
        return 0;
    }
    distanceToLine(lineNumber) {
        if (this.contains(lineNumber)) {
            return 0;
        }
        if (lineNumber < this.startLineNumber) {
            return this.startLineNumber - lineNumber;
        }
        return lineNumber - this.endLineNumberExclusive;
    }
    addMargin(marginTop, marginBottom) {
        return new LineRange(this.startLineNumber - marginTop, this.endLineNumberExclusive + marginBottom);
    }
}
export class LineRangeSet {
    constructor(
    /**
     * Sorted by start line number.
     * No two line ranges are touching or intersecting.
     */
    _normalizedRanges = []) {
        this._normalizedRanges = _normalizedRanges;
    }
    get ranges() {
        return this._normalizedRanges;
    }
    addRange(range) {
        if (range.length === 0) {
            return;
        }
        // Idea: Find joinRange such that:
        // replaceRange = _normalizedRanges.replaceRange(joinRange, range.joinAll(joinRange.map(idx => this._normalizedRanges[idx])))
        // idx of first element that touches range or that is after range
        const joinRangeStartIdx = findFirstIdxMonotonousOrArrLen(this._normalizedRanges, r => r.endLineNumberExclusive >= range.startLineNumber);
        // idx of element after { last element that touches range or that is before range }
        const joinRangeEndIdxExclusive = findLastIdxMonotonous(this._normalizedRanges, r => r.startLineNumber <= range.endLineNumberExclusive) + 1;
        if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
            // If there is no element that touches range, then joinRangeStartIdx === joinRangeEndIdxExclusive and that value is the index of the element after range
            this._normalizedRanges.splice(joinRangeStartIdx, 0, range);
        }
        else if (joinRangeStartIdx === joinRangeEndIdxExclusive - 1) {
            // Else, there is an element that touches range and in this case it is both the first and last element. Thus we can replace it
            const joinRange = this._normalizedRanges[joinRangeStartIdx];
            this._normalizedRanges[joinRangeStartIdx] = joinRange.join(range);
        }
        else {
            // First and last element are different - we need to replace the entire range
            const joinRange = this._normalizedRanges[joinRangeStartIdx].join(this._normalizedRanges[joinRangeEndIdxExclusive - 1]).join(range);
            this._normalizedRanges.splice(joinRangeStartIdx, joinRangeEndIdxExclusive - joinRangeStartIdx, joinRange);
        }
    }
    contains(lineNumber) {
        const rangeThatStartsBeforeEnd = findLastMonotonous(this._normalizedRanges, r => r.startLineNumber <= lineNumber);
        return !!rangeThatStartsBeforeEnd && rangeThatStartsBeforeEnd.endLineNumberExclusive > lineNumber;
    }
    intersects(range) {
        const rangeThatStartsBeforeEnd = findLastMonotonous(this._normalizedRanges, r => r.startLineNumber < range.endLineNumberExclusive);
        return !!rangeThatStartsBeforeEnd && rangeThatStartsBeforeEnd.endLineNumberExclusive > range.startLineNumber;
    }
    getUnion(other) {
        if (this._normalizedRanges.length === 0) {
            return other;
        }
        if (other._normalizedRanges.length === 0) {
            return this;
        }
        const result = [];
        let i1 = 0;
        let i2 = 0;
        let current = null;
        while (i1 < this._normalizedRanges.length || i2 < other._normalizedRanges.length) {
            let next = null;
            if (i1 < this._normalizedRanges.length && i2 < other._normalizedRanges.length) {
                const lineRange1 = this._normalizedRanges[i1];
                const lineRange2 = other._normalizedRanges[i2];
                if (lineRange1.startLineNumber < lineRange2.startLineNumber) {
                    next = lineRange1;
                    i1++;
                }
                else {
                    next = lineRange2;
                    i2++;
                }
            }
            else if (i1 < this._normalizedRanges.length) {
                next = this._normalizedRanges[i1];
                i1++;
            }
            else {
                next = other._normalizedRanges[i2];
                i2++;
            }
            if (current === null) {
                current = next;
            }
            else {
                if (current.endLineNumberExclusive >= next.startLineNumber) {
                    // merge
                    current = new LineRange(current.startLineNumber, Math.max(current.endLineNumberExclusive, next.endLineNumberExclusive));
                }
                else {
                    // push
                    result.push(current);
                    current = next;
                }
            }
        }
        if (current !== null) {
            result.push(current);
        }
        return new LineRangeSet(result);
    }
    /**
     * Subtracts all ranges in this set from `range` and returns the result.
     */
    subtractFrom(range) {
        // idx of first element that touches range or that is after range
        const joinRangeStartIdx = findFirstIdxMonotonousOrArrLen(this._normalizedRanges, r => r.endLineNumberExclusive >= range.startLineNumber);
        // idx of element after { last element that touches range or that is before range }
        const joinRangeEndIdxExclusive = findLastIdxMonotonous(this._normalizedRanges, r => r.startLineNumber <= range.endLineNumberExclusive) + 1;
        if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
            return new LineRangeSet([range]);
        }
        const result = [];
        let startLineNumber = range.startLineNumber;
        for (let i = joinRangeStartIdx; i < joinRangeEndIdxExclusive; i++) {
            const r = this._normalizedRanges[i];
            if (r.startLineNumber > startLineNumber) {
                result.push(new LineRange(startLineNumber, r.startLineNumber));
            }
            startLineNumber = r.endLineNumberExclusive;
        }
        if (startLineNumber < range.endLineNumberExclusive) {
            result.push(new LineRange(startLineNumber, range.endLineNumberExclusive));
        }
        return new LineRangeSet(result);
    }
    toString() {
        return this._normalizedRanges.map(r => r.toString()).join(', ');
    }
    getIntersection(other) {
        const result = [];
        let i1 = 0;
        let i2 = 0;
        while (i1 < this._normalizedRanges.length && i2 < other._normalizedRanges.length) {
            const r1 = this._normalizedRanges[i1];
            const r2 = other._normalizedRanges[i2];
            const i = r1.intersect(r2);
            if (i && !i.isEmpty) {
                result.push(i);
            }
            if (r1.endLineNumberExclusive < r2.endLineNumberExclusive) {
                i1++;
            }
            else {
                i2++;
            }
        }
        return new LineRangeSet(result);
    }
    getWithDelta(value) {
        return new LineRangeSet(this._normalizedRanges.map(r => r.delta(value)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVJhbmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9saW5lUmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUFFLDhCQUE4QixFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFL0g7O0dBRUc7QUFDSCxNQUFNLE9BQU8sU0FBUztJQUNkLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBWTtRQUNuQyxPQUFPLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBWTtRQUM1QyxPQUFPLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFZLEVBQUUsQ0FBd0I7UUFDNUQsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ1IsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1osQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsZUFBZSxJQUFJLENBQUMsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNsRyxPQUFPO2dCQUNOLElBQUks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