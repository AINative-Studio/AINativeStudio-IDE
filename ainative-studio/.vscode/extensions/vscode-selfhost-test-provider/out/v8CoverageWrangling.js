"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffsetToPosition = exports.RangeCoverageTracker = void 0;
class RangeCoverageTracker {
    constructor() {
        /**
         * A noncontiguous, non-overlapping, ordered set of ranges and whether
         * that range has been covered.
         */
        this.ranges = [];
    }
    /**
     * Adds a coverage tracker initialized for a function with {@link isBlockCoverage} set to true.
     */
    static initializeBlocks(fns) {
        const rt = new RangeCoverageTracker();
        let start = 0;
        const stack = [];
        // note: comes pre-sorted from V8
        for (const { ranges } of fns) {
            for (const range of ranges) {
                while (stack.length && stack[stack.length - 1].endOffset < range.startOffset) {
                    const last = stack.pop();
                    rt.setCovered(start, last.endOffset, last.count > 0);
                    start = last.endOffset;
                }
                if (range.startOffset > start && stack.length) {
                    rt.setCovered(start, range.startOffset, !!stack[stack.length - 1].count);
                }
                start = range.startOffset;
                stack.push(range);
            }
        }
        while (stack.length) {
            const last = stack.pop();
            rt.setCovered(start, last.endOffset, last.count > 0);
            start = last.endOffset;
        }
        return rt;
    }
    /** Makes a copy of the range tracker. */
    clone() {
        const rt = new RangeCoverageTracker();
        rt.ranges = this.ranges.slice();
        return rt;
    }
    /** Marks a range covered */
    cover(start, end) {
        this.setCovered(start, end, true);
    }
    /** Marks a range as uncovered */
    uncovered(start, end) {
        this.setCovered(start, end, false);
    }
    /** Iterates over coverage ranges */
    [Symbol.iterator]() {
        return this.ranges[Symbol.iterator]();
    }
    /**
     * Marks the given character range as being covered or uncovered.
     *
     * todo@connor4312: this is a hot path is could probably be optimized to
     * avoid rebuilding the array. Maybe with a nice tree structure?
     */
    setCovered(start, end, covered) {
        const newRanges = [];
        let i = 0;
        for (; i < this.ranges.length && this.ranges[i].end <= start; i++) {
            newRanges.push(this.ranges[i]);
        }
        const push = (range) => {
            const last = newRanges.length && newRanges[newRanges.length - 1];
            if (last && last.end === range.start && last.covered === range.covered) {
                last.end = range.end;
            }
            else {
                newRanges.push(range);
            }
        };
        push({ start, end, covered });
        for (; i < this.ranges.length; i++) {
            const range = this.ranges[i];
            const last = newRanges[newRanges.length - 1];
            if (range.start === last.start && range.end === last.end) {
                // ranges are equal:
                last.covered || (last.covered = range.covered);
            }
            else if (range.end < last.start || range.start > last.end) {
                // ranges don't overlap
                push(range);
            }
            else if (range.start < last.start && range.end > last.end) {
                // range contains last:
                newRanges.pop();
                push({ start: range.start, end: last.start, covered: range.covered });
                push({ start: last.start, end: last.end, covered: range.covered || last.covered });
                push({ start: last.end, end: range.end, covered: range.covered });
            }
            else if (range.start >= last.start && range.end <= last.end) {
                // last contains range:
                newRanges.pop();
                push({ start: last.start, end: range.start, covered: last.covered });
                push({ start: range.start, end: range.end, covered: range.covered || last.covered });
                push({ start: range.end, end: last.end, covered: last.covered });
            }
            else if (range.start < last.start && range.end <= last.end) {
                // range overlaps start of last:
                newRanges.pop();
                push({ start: range.start, end: last.start, covered: range.covered });
                push({ start: last.start, end: range.end, covered: range.covered || last.covered });
                push({ start: range.end, end: last.end, covered: last.covered });
            }
            else if (range.start >= last.start && range.end > last.end) {
                // range overlaps end of last:
                newRanges.pop();
                push({ start: last.start, end: range.start, covered: last.covered });
                push({ start: range.start, end: last.end, covered: range.covered || last.covered });
                push({ start: last.end, end: range.end, covered: range.covered });
            }
            else {
                throw new Error('unreachable');
            }
        }
        this.ranges = newRanges;
    }
}
exports.RangeCoverageTracker = RangeCoverageTracker;
class OffsetToPosition {
    constructor(source) {
        /** Line numbers to byte offsets. */
        this.lines = [];
        this.lines.push(0);
        for (let i = source.indexOf('\n'); i !== -1; i = source.indexOf('\n', i + 1)) {
            this.lines.push(i + 1);
        }
        this.totalLength = source.length;
    }
    getLineLength(lineNumber) {
        return ((lineNumber < this.lines.length - 1 ? this.lines[lineNumber + 1] - 1 : this.totalLength) -
            this.lines[lineNumber]);
    }
    /**
     * Gets the line the offset appears on.
     */
    getLineOfOffset(offset) {
        let low = 0;
        let high = this.lines.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.lines[mid] > offset) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        return low - 1;
    }
    /**
     * Converts from a file offset to a base 0 line/column .
     */
    toLineColumn(offset) {
        const line = this.getLineOfOffset(offset);
        return { line: line, column: offset - this.lines[line] };
    }
}
exports.OffsetToPosition = OffsetToPosition;
//# sourceMappingURL=v8CoverageWrangling.js.map