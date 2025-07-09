/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/range.js';
/**
 * Returns the intersection between a ranged group and a range.
 * Returns `[]` if the intersection is empty.
 */
export function groupIntersect(range, groups) {
    const result = [];
    for (const r of groups) {
        if (range.start >= r.range.end) {
            continue;
        }
        if (range.end < r.range.start) {
            break;
        }
        const intersection = Range.intersect(range, r.range);
        if (Range.isEmpty(intersection)) {
            continue;
        }
        result.push({
            range: intersection,
            size: r.size
        });
    }
    return result;
}
/**
 * Shifts a range by that `much`.
 */
export function shift({ start, end }, much) {
    return { start: start + much, end: end + much };
}
/**
 * Consolidates a collection of ranged groups.
 *
 * Consolidation is the process of merging consecutive ranged groups
 * that share the same `size`.
 */
export function consolidate(groups) {
    const result = [];
    let previousGroup = null;
    for (const group of groups) {
        const start = group.range.start;
        const end = group.range.end;
        const size = group.size;
        if (previousGroup && size === previousGroup.size) {
            previousGroup.range.end = end;
            continue;
        }
        previousGroup = { range: { start, end }, size };
        result.push(previousGroup);
    }
    return result;
}
/**
 * Concatenates several collections of ranged groups into a single
 * collection.
 */
function concat(...groups) {
    return consolidate(groups.reduce((r, g) => r.concat(g), []));
}
export class RangeMap {
    get paddingTop() {
        return this._paddingTop;
    }
    set paddingTop(paddingTop) {
        this._size = this._size + paddingTop - this._paddingTop;
        this._paddingTop = paddingTop;
    }
    constructor(topPadding) {
        this.groups = [];
        this._size = 0;
        this._paddingTop = 0;
        this._paddingTop = topPadding ?? 0;
        this._size = this._paddingTop;
    }
    splice(index, deleteCount, items = []) {
        const diff = items.length - deleteCount;
        const before = groupIntersect({ start: 0, end: index }, this.groups);
        const after = groupIntersect({ start: index + deleteCount, end: Number.POSITIVE_INFINITY }, this.groups)
            .map(g => ({ range: shift(g.range, diff), size: g.size }));
        const middle = items.map((item, i) => ({
            range: { start: index + i, end: index + i + 1 },
            size: item.size
        }));
        this.groups = concat(before, middle, after);
        this._size = this._paddingTop + this.groups.reduce((t, g) => t + (g.size * (g.range.end - g.range.start)), 0);
    }
    /**
     * Returns the number of items in the range map.
     */
    get count() {
        const len = this.groups.length;
        if (!len) {
            return 0;
        }
        return this.groups[len - 1].range.end;
    }
    /**
     * Returns the sum of the sizes of all items in the range map.
     */
    get size() {
        return this._size;
    }
    /**
     * Returns the index of the item at the given position.
     */
    indexAt(position) {
        if (position < 0) {
            return -1;
        }
        if (position < this._paddingTop) {
            return 0;
        }
        let index = 0;
        let size = this._paddingTop;
        for (const group of this.groups) {
            const count = group.range.end - group.range.start;
            const newSize = size + (count * group.size);
            if (position < newSize) {
                return index + Math.floor((position - size) / group.size);
            }
            index += count;
            size = newSize;
        }
        return index;
    }
    /**
     * Returns the index of the item right after the item at the
     * index of the given position.
     */
    indexAfter(position) {
        return Math.min(this.indexAt(position) + 1, this.count);
    }
    /**
     * Returns the start position of the item at the given index.
     */
    positionAt(index) {
        if (index < 0) {
            return -1;
        }
        let position = 0;
        let count = 0;
        for (const group of this.groups) {
            const groupCount = group.range.end - group.range.start;
            const newCount = count + groupCount;
            if (index < newCount) {
                return this._paddingTop + position + ((index - count) * group.size);
            }
            position += groupCount * group.size;
            count = newCount;
        }
        return -1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VNYXAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2xpc3QvcmFuZ2VNYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBV3pEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQUMsS0FBYSxFQUFFLE1BQXNCO0lBQ25FLE1BQU0sTUFBTSxHQUFtQixFQUFFLENBQUM7SUFFbEMsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUN4QixJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNoQyxTQUFTO1FBQ1YsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQy9CLE1BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXJELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFNBQVM7UUFDVixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNYLEtBQUssRUFBRSxZQUFZO1lBQ25CLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtTQUNaLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFVLEVBQUUsSUFBWTtJQUN6RCxP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