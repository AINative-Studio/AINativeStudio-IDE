/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../base/common/errors.js';
/**
 * A range of offsets (0-based).
*/
export class OffsetRange {
    static fromTo(start, endExclusive) {
        return new OffsetRange(start, endExclusive);
    }
    static addRange(range, sortedRanges) {
        let i = 0;
        while (i < sortedRanges.length && sortedRanges[i].endExclusive < range.start) {
            i++;
        }
        let j = i;
        while (j < sortedRanges.length && sortedRanges[j].start <= range.endExclusive) {
            j++;
        }
        if (i === j) {
            sortedRanges.splice(i, 0, range);
        }
        else {
            const start = Math.min(range.start, sortedRanges[i].start);
            const end = Math.max(range.endExclusive, sortedRanges[j - 1].endExclusive);
            sortedRanges.splice(i, j - i, new OffsetRange(start, end));
        }
    }
    static tryCreate(start, endExclusive) {
        if (start > endExclusive) {
            return undefined;
        }
        return new OffsetRange(start, endExclusive);
    }
    static ofLength(length) {
        return new OffsetRange(0, length);
    }
    static ofStartAndLength(start, length) {
        return new OffsetRange(start, start + length);
    }
    static emptyAt(offset) {
        return new OffsetRange(offset, offset);
    }
    constructor(start, endExclusive) {
        this.start = start;
        this.endExclusive = endExclusive;
        if (start > endExclusive) {
            throw new BugIndicatingError(`Invalid range: ${this.toString()}`);
        }
    }
    get isEmpty() {
        return this.start === this.endExclusive;
    }
    delta(offset) {
        return new OffsetRange(this.start + offset, this.endExclusive + offset);
    }
    deltaStart(offset) {
        return new OffsetRange(this.start + offset, this.endExclusive);
    }
    deltaEnd(offset) {
        return new OffsetRange(this.start, this.endExclusive + offset);
    }
    get length() {
        return this.endExclusive - this.start;
    }
    toString() {
        return `[${this.start}, ${this.endExclusive})`;
    }
    equals(other) {
        return this.start === other.start && this.endExclusive === other.endExclusive;
    }
    containsRange(other) {
        return this.start <= other.start && other.endExclusive <= this.endExclusive;
    }
    contains(offset) {
        return this.start <= offset && offset < this.endExclusive;
    }
    /**
     * for all numbers n: range1.contains(n) or range2.contains(n) => range1.join(range2).contains(n)
     * The joined range is the smallest range that contains both ranges.
     */
    join(other) {
        return new OffsetRange(Math.min(this.start, other.start), Math.max(this.endExclusive, other.endExclusive));
    }
    /**
     * for all numbers n: range1.contains(n) and range2.contains(n) <=> range1.intersect(range2).contains(n)
     *
     * The resulting range is empty if the ranges do not intersect, but touch.
     * If the ranges don't even touch, the result is undefined.
     */
    intersect(other) {
        const start = Math.max(this.start, other.start);
        const end = Math.min(this.endExclusive, other.endExclusive);
        if (start <= end) {
            return new OffsetRange(start, end);
        }
        return undefined;
    }
    intersectionLength(range) {
        const start = Math.max(this.start, range.start);
        const end = Math.min(this.endExclusive, range.endExclusive);
        return Math.max(0, end - start);
    }
    intersects(other) {
        const start = Math.max(this.start, other.start);
        const end = Math.min(this.endExclusive, other.endExclusive);
        return start < end;
    }
    intersectsOrTouches(other) {
        const start = Math.max(this.start, other.start);
        const end = Math.min(this.endExclusive, other.endExclusive);
        return start <= end;
    }
    isBefore(other) {
        return this.endExclusive <= other.start;
    }
    isAfter(other) {
        return this.start >= other.endExclusive;
    }
    slice(arr) {
        return arr.slice(this.start, this.endExclusive);
    }
    substring(str) {
        return str.substring(this.start, this.endExclusive);
    }
    /**
     * Returns the given value if it is contained in this instance, otherwise the closest value that is contained.
     * The range must not be empty.
     */
    clip(value) {
        if (this.isEmpty) {
            throw new BugIndicatingError(`Invalid clipping range: ${this.toString()}`);
        }
        return Math.max(this.start, Math.min(this.endExclusive - 1, value));
    }
    /**
     * Returns `r := value + k * length` such that `r` is contained in this range.
     * The range must not be empty.
     *
     * E.g. `[5, 10).clipCyclic(10) === 5`, `[5, 10).clipCyclic(11) === 6` and `[5, 10).clipCyclic(4) === 9`.
     */
    clipCyclic(value) {
        if (this.isEmpty) {
            throw new BugIndicatingError(`Invalid clipping range: ${this.toString()}`);
        }
        if (value < this.start) {
            return this.endExclusive - ((this.start - value) % this.length);
        }
        if (value >= this.endExclusive) {
            return this.start + ((value - this.start) % this.length);
        }
        return value;
    }
    map(f) {
        const result = [];
        for (let i = this.start; i < this.endExclusive; i++) {
            result.push(f(i));
        }
        return result;
    }
    forEach(f) {
        for (let i = this.start; i < this.endExclusive; i++) {
            f(i);
        }
    }
}
export class OffsetRangeSet {
    constructor() {
        this._sortedRanges = [];
    }
    addRange(range) {
        let i = 0;
        while (i < this._sortedRanges.length && this._sortedRanges[i].endExclusive < range.start) {
            i++;
        }
        let j = i;
        while (j < this._sortedRanges.length && this._sortedRanges[j].start <= range.endExclusive) {
            j++;
        }
        if (i === j) {
            this._sortedRanges.splice(i, 0, range);
        }
        else {
            const start = Math.min(range.start, this._sortedRanges[i].start);
            const end = Math.max(range.endExclusive, this._sortedRanges[j - 1].endExclusive);
            this._sortedRanges.splice(i, j - i, new OffsetRange(start, end));
        }
    }
    toString() {
        return this._sortedRanges.map(r => r.toString()).join(', ');
    }
    /**
     * Returns of there is a value that is contained in this instance and the given range.
     */
    intersectsStrict(other) {
        // TODO use binary search
        let i = 0;
        while (i < this._sortedRanges.length && this._sortedRanges[i].endExclusive <= other.start) {
            i++;
        }
        return i < this._sortedRanges.length && this._sortedRanges[i].start < other.endExclusive;
    }
    intersectWithRange(other) {
        // TODO use binary search + slice
        const result = new OffsetRangeSet();
        for (const range of this._sortedRanges) {
            const intersection = range.intersect(other);
            if (intersection) {
                result.addRange(intersection);
            }
        }
        return result;
    }
    intersectWithRangeLength(other) {
        return this.intersectWithRange(other).length;
    }
    get length() {
        return this._sortedRanges.reduce((prev, cur) => prev + cur.length, 0);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2Zmc2V0UmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL29mZnNldFJhbmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBT3BFOztFQUVFO0FBQ0YsTUFBTSxPQUFPLFdBQVc7SUFDaEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFhLEVBQUUsWUFBb0I7UUFDdkQsT0FBTyxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVNLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBa0IsRUFBRSxZQUEyQjtRQUNyRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDVixPQUFPLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzlFLENBQUMsRUFBRSxDQUFDO1FBQ0wsQ0FBQztRQUNELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNWLE9BQU8sQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDL0UsQ0FBQyxFQUFFLENBQUM7UUFDTCxDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDYixZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FB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