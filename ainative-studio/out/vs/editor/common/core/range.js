/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from './position.js';
/**
 * A range in the editor. (startLineNumber,startColumn) is <= (endLineNumber,endColumn)
 */
export class Range {
    constructor(startLineNumber, startColumn, endLineNumber, endColumn) {
        if ((startLineNumber > endLineNumber) || (startLineNumber === endLineNumber && startColumn > endColumn)) {
            this.startLineNumber = endLineNumber;
            this.startColumn = endColumn;
            this.endLineNumber = startLineNumber;
            this.endColumn = startColumn;
        }
        else {
            this.startLineNumber = startLineNumber;
            this.startColumn = startColumn;
            this.endLineNumber = endLineNumber;
            this.endColumn = endColumn;
        }
    }
    /**
     * Test if this range is empty.
     */
    isEmpty() {
        return Range.isEmpty(this);
    }
    /**
     * Test if `range` is empty.
     */
    static isEmpty(range) {
        return (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn);
    }
    /**
     * Test if position is in this range. If the position is at the edges, will return true.
     */
    containsPosition(position) {
        return Range.containsPosition(this, position);
    }
    /**
     * Test if `position` is in `range`. If the position is at the edges, will return true.
     */
    static containsPosition(range, position) {
        if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
            return false;
        }
        if (position.lineNumber === range.startLineNumber && position.column < range.startColumn) {
            return false;
        }
        if (position.lineNumber === range.endLineNumber && position.column > range.endColumn) {
            return false;
        }
        return true;
    }
    /**
     * Test if `position` is in `range`. If the position is at the edges, will return false.
     * @internal
     */
    static strictContainsPosition(range, position) {
        if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
            return false;
        }
        if (position.lineNumber === range.startLineNumber && position.column <= range.startColumn) {
            return false;
        }
        if (position.lineNumber === range.endLineNumber && position.column >= range.endColumn) {
            return false;
        }
        return true;
    }
    /**
     * Test if range is in this range. If the range is equal to this range, will return true.
     */
    containsRange(range) {
        return Range.containsRange(this, range);
    }
    /**
     * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
     */
    static containsRange(range, otherRange) {
        if (otherRange.startLineNumber < range.startLineNumber || otherRange.endLineNumber < range.startLineNumber) {
            return false;
        }
        if (otherRange.startLineNumber > range.endLineNumber || otherRange.endLineNumber > range.endLineNumber) {
            return false;
        }
        if (otherRange.startLineNumber === range.startLineNumber && otherRange.startColumn < range.startColumn) {
            return false;
        }
        if (otherRange.endLineNumber === range.endLineNumber && otherRange.endColumn > range.endColumn) {
            return false;
        }
        return true;
    }
    /**
     * Test if `range` is strictly in this range. `range` must start after and end before this range for the result to be true.
     */
    strictContainsRange(range) {
        return Range.strictContainsRange(this, range);
    }
    /**
     * Test if `otherRange` is strictly in `range` (must start after, and end before). If the ranges are equal, will return false.
     */
    static strictContainsRange(range, otherRange) {
        if (otherRange.startLineNumber < range.startLineNumber || otherRange.endLineNumber < range.startLineNumber) {
            return false;
        }
        if (otherRange.startLineNumber > range.endLineNumber || otherRange.endLineNumber > range.endLineNumber) {
            return false;
        }
        if (otherRange.startLineNumber === range.startLineNumber && otherRange.startColumn <= range.startColumn) {
            return false;
        }
        if (otherRange.endLineNumber === range.endLineNumber && otherRange.endColumn >= range.endColumn) {
            return false;
        }
        return true;
    }
    /**
     * A reunion of the two ranges.
     * The smallest position will be used as the start point, and the largest one as the end point.
     */
    plusRange(range) {
        return Range.plusRange(this, range);
    }
    /**
     * A reunion of the two ranges.
     * The smallest position will be used as the start point, and the largest one as the end point.
     */
    static plusRange(a, b) {
        let startLineNumber;
        let startColumn;
        let endLineNumber;
        let endColumn;
        if (b.startLineNumber < a.startLineNumber) {
            startLineNumber = b.startLineNumber;
            startColumn = b.startColumn;
        }
        else if (b.startLineNumber === a.startLineNumber) {
            startLineNumber = b.startLineNumber;
            startColumn = Math.min(b.startColumn, a.startColumn);
        }
        else {
            startLineNumber = a.startLineNumber;
            startColumn = a.startColumn;
        }
        if (b.endLineNumber > a.endLineNumber) {
            endLineNumber = b.endLineNumber;
            endColumn = b.endColumn;
        }
        else if (b.endLineNumber === a.endLineNumber) {
            endLineNumber = b.endLineNumber;
            endColumn = Math.max(b.endColumn, a.endColumn);
        }
        else {
            endLineNumber = a.endLineNumber;
            endColumn = a.endColumn;
        }
        return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
    }
    /**
     * A intersection of the two ranges.
     */
    intersectRanges(range) {
        return Range.intersectRanges(this, range);
    }
    /**
     * A intersection of the two ranges.
     */
    static intersectRanges(a, b) {
        let resultStartLineNumber = a.startLineNumber;
        let resultStartColumn = a.startColumn;
        let resultEndLineNumber = a.endLineNumber;
        let resultEndColumn = a.endColumn;
        const otherStartLineNumber = b.startLineNumber;
        const otherStartColumn = b.startColumn;
        const otherEndLineNumber = b.endLineNumber;
        const otherEndColumn = b.endColumn;
        if (resultStartLineNumber < otherStartLineNumber) {
            resultStartLineNumber = otherStartLineNumber;
            resultStartColumn = otherStartColumn;
        }
        else if (resultStartLineNumber === otherStartLineNumber) {
            resultStartColumn = Math.max(resultStartColumn, otherStartColumn);
        }
        if (resultEndLineNumber > otherEndLineNumber) {
            resultEndLineNumber = otherEndLineNumber;
            resultEndColumn = otherEndColumn;
        }
        else if (resultEndLineNumber === otherEndLineNumber) {
            resultEndColumn = Math.min(resultEndColumn, otherEndColumn);
        }
        // Check if selection is now empty
        if (resultStartLineNumber > resultEndLineNumber) {
            return null;
        }
        if (resultStartLineNumber === resultEndLineNumber && resultStartColumn > resultEndColumn) {
            return null;
        }
        return new Range(resultStartLineNumber, resultStartColumn, resultEndLineNumber, resultEndColumn);
    }
    /**
     * Test if this range equals other.
     */
    equalsRange(other) {
        return Range.equalsRange(this, other);
    }
    /**
     * Test if range `a` equals `b`.
     */
    static equalsRange(a, b) {
        if (!a && !b) {
            return true;
        }
        return (!!a &&
            !!b &&
            a.startLineNumber === b.startLineNumber &&
            a.startColumn === b.startColumn &&
            a.endLineNumber === b.endLineNumber &&
            a.endColumn === b.endColumn);
    }
    /**
     * Return the end position (which will be after or equal to the start position)
     */
    getEndPosition() {
        return Range.getEndPosition(this);
    }
    /**
     * Return the end position (which will be after or equal to the start position)
     */
    static getEndPosition(range) {
        return new Position(range.endLineNumber, range.endColumn);
    }
    /**
     * Return the start position (which will be before or equal to the end position)
     */
    getStartPosition() {
        return Range.getStartPosition(this);
    }
    /**
     * Return the start position (which will be before or equal to the end position)
     */
    static getStartPosition(range) {
        return new Position(range.startLineNumber, range.startColumn);
    }
    /**
     * Transform to a user presentable string representation.
     */
    toString() {
        return '[' + this.startLineNumber + ',' + this.startColumn + ' -> ' + this.endLineNumber + ',' + this.endColumn + ']';
    }
    /**
     * Create a new range using this range's start position, and using endLineNumber and endColumn as the end position.
     */
    setEndPosition(endLineNumber, endColumn) {
        return new Range(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
    }
    /**
     * Create a new range using this range's end position, and using startLineNumber and startColumn as the start position.
     */
    setStartPosition(startLineNumber, startColumn) {
        return new Range(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
    }
    /**
     * Create a new empty range using this range's start position.
     */
    collapseToStart() {
        return Range.collapseToStart(this);
    }
    /**
     * Create a new empty range using this range's start position.
     */
    static collapseToStart(range) {
        return new Range(range.startLineNumber, range.startColumn, range.startLineNumber, range.startColumn);
    }
    /**
     * Create a new empty range using this range's end position.
     */
    collapseToEnd() {
        return Range.collapseToEnd(this);
    }
    /**
     * Create a new empty range using this range's end position.
     */
    static collapseToEnd(range) {
        return new Range(range.endLineNumber, range.endColumn, range.endLineNumber, range.endColumn);
    }
    /**
     * Moves the range by the given amount of lines.
     */
    delta(lineCount) {
        return new Range(this.startLineNumber + lineCount, this.startColumn, this.endLineNumber + lineCount, this.endColumn);
    }
    isSingleLine() {
        return this.startLineNumber === this.endLineNumber;
    }
    // ---
    static fromPositions(start, end = start) {
        return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
    }
    static lift(range) {
        if (!range) {
            return null;
        }
        return new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
    }
    /**
     * Test if `obj` is an `IRange`.
     */
    static isIRange(obj) {
        return (obj
            && (typeof obj.startLineNumber === 'number')
            && (typeof obj.startColumn === 'number')
            && (typeof obj.endLineNumber === 'number')
            && (typeof obj.endColumn === 'number'));
    }
    /**
     * Test if the two ranges are touching in any way.
     */
    static areIntersectingOrTouching(a, b) {
        // Check if `a` is before `b`
        if (a.endLineNumber < b.startLineNumber || (a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn)) {
            return false;
        }
        // Check if `b` is before `a`
        if (b.endLineNumber < a.startLineNumber || (b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn)) {
            return false;
        }
        // These ranges must intersect
        return true;
    }
    /**
     * Test if the two ranges are intersecting. If the ranges are touching it returns true.
     */
    static areIntersecting(a, b) {
        // Check if `a` is before `b`
        if (a.endLineNumber < b.startLineNumber || (a.endLineNumber === b.startLineNumber && a.endColumn <= b.startColumn)) {
            return false;
        }
        // Check if `b` is before `a`
        if (b.endLineNumber < a.startLineNumber || (b.endLineNumber === a.startLineNumber && b.endColumn <= a.startColumn)) {
            return false;
        }
        // These ranges must intersect
        return true;
    }
    /**
     * Test if the two ranges are intersecting, but not touching at all.
     */
    static areOnlyIntersecting(a, b) {
        // Check if `a` is before `b`
        if (a.endLineNumber < (b.startLineNumber - 1) || (a.endLineNumber === b.startLineNumber && a.endColumn < (b.startColumn - 1))) {
            return false;
        }
        // Check if `b` is before `a`
        if (b.endLineNumber < (a.startLineNumber - 1) || (b.endLineNumber === a.startLineNumber && b.endColumn < (a.startColumn - 1))) {
            return false;
        }
        // These ranges must intersect
        return true;
    }
    /**
     * A function that compares ranges, useful for sorting ranges
     * It will first compare ranges on the startPosition and then on the endPosition
     */
    static compareRangesUsingStarts(a, b) {
        if (a && b) {
            const aStartLineNumber = a.startLineNumber | 0;
            const bStartLineNumber = b.startLineNumber | 0;
            if (aStartLineNumber === bStartLineNumber) {
                const aStartColumn = a.startColumn | 0;
                const bStartColumn = b.startColumn | 0;
                if (aStartColumn === bStartColumn) {
                    const aEndLineNumber = a.endLineNumber | 0;
                    const bEndLineNumber = b.endLineNumber | 0;
                    if (aEndLineNumber === bEndLineNumber) {
                        const aEndColumn = a.endColumn | 0;
                        const bEndColumn = b.endColumn | 0;
                        return aEndColumn - bEndColumn;
                    }
                    return aEndLineNumber - bEndLineNumber;
                }
                return aStartColumn - bStartColumn;
            }
            return aStartLineNumber - bStartLineNumber;
        }
        const aExists = (a ? 1 : 0);
        const bExists = (b ? 1 : 0);
        return aExists - bExists;
    }
    /**
     * A function that compares ranges, useful for sorting ranges
     * It will first compare ranges on the endPosition and then on the startPosition
     */
    static compareRangesUsingEnds(a, b) {
        if (a.endLineNumber === b.endLineNumber) {
            if (a.endColumn === b.endColumn) {
                if (a.startLineNumber === b.startLineNumber) {
                    return a.startColumn - b.startColumn;
                }
                return a.startLineNumber - b.startLineNumber;
            }
            return a.endColumn - b.endColumn;
        }
        return a.endLineNumber - b.endLineNumber;
    }
    /**
     * Test if the range spans multiple lines.
     */
    static spansMultipleLines(range) {
        return range.endLineNumber > range.startLineNumber;
    }
    toJSON() {
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL3JhbmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUF3QnBEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLEtBQUs7SUFtQmpCLFlBQVksZUFBdUIsRUFBRSxXQUFtQixFQUFFLGFBQXFCLEVBQUUsU0FBaUI7UUFDakcsSUFBSSxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsS0FBSyxhQUFhLElBQUksV0FBVyxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDekcsSUFBSSxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUM7WUFDckMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7WUFDN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxlQUFlLENBQUM7WUFDckMsSUFBSSxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUM7UUFDOUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztZQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztZQUMvQixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztZQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUM1QixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksT0FBTztRQUNiLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDbEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUssS0FBSyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqRyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxnQkFBZ0IsQ0FBQyxRQUFtQjtRQUMxQyxPQUFPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQWEsRUFBRSxRQUFtQjtRQUNoRSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM5RixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMxRixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLGFBQWEsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN0RixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsc0JBQXNCLENBQUMsS0FBYSxFQUFFLFFBQW1CO1FBQ3RFLElBQUksUUFBUSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsZUFBZSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzlGLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELElBQUksUUFBUSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsZUFBZSxJQUFJLFFBQVEsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzNGLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELElBQUksUUFBUSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsYUFBYSxJQUFJLFFBQVEsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3ZGLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVEOztPQUVHO0lBQ0ksYUFBYSxDQUFDLEtBQWE7UUFDakMsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQWEsRUFBRSxVQUFrQjtRQUM1RCxJQUFJLFVBQVUsQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxVQUFVLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM1RyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLFVBQVUsQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLGFBQWEsSUFBSSxVQUFVLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4RyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLFVBQVUsQ0FBQyxlQUFlLEtBQUssS0FBSyxDQUFDLGVBQWUsSUFBSSxVQUFVLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN4RyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLFVBQVUsQ0FBQyxhQUFhLEtBQUssS0FBSyxDQUFDLGFBQWEsSUFBSSxVQUFVLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoRyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNJLG1CQUFtQixDQUFDLEtBQWE7UUFDdkMsT0FBTyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFhLEVBQUUsVUFBa0I7UUFDbEUsSUFBSSxVQUFVLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQyxlQUFlLElBQUksVUFBVSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDNUcsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxVQUFVLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQyxhQUFhLElBQUksVUFBVSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEcsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxVQUFVLENBQUMsZUFBZSxLQUFLLEtBQUssQ0FBQyxlQUFlLElBQUksVUFBVSxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDekcsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxVQUFVLENBQUMsYUFBYSxLQUFLLEtBQUssQ0FBQyxhQUFhLElBQUksVUFBVSxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakcsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksU0FBUyxDQUFDLEtBQWE7UUFDN0IsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUMzQyxJQUFJLGVBQXVCLENBQUM7UUFDNUIsSUFBSSxXQUFtQixDQUFDO1FBQ3hCLElBQUksYUFBcUIsQ0FBQztRQUMxQixJQUFJLFNBQWlCLENBQUM7UUFFdEIsSUFBSSxDQUFDLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQztZQUNwQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUM3QixDQUFDO2FBQU0sSUFBSSxDQUFDLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNwRCxlQUFlLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQztZQUNwQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0RCxDQUFDO2FBQU0sQ0FBQztZQUNQLGVBQWUsR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDO1lBQ3BDLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDO1FBQzdCLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3ZDLGFBQWEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDO1lBQ2hDLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3pCLENBQUM7YUFBTSxJQUFJLENBQUMsQ0FBQyxhQUFhLEtBQUssQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2hELGFBQWEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDO1lBQ2hDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hELENBQUM7YUFBTSxDQUFDO1lBQ1AsYUFBYSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUM7WUFDaEMsU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDekIsQ0FBQztRQUVELE9BQU8sSUFBSSxLQUFLLENBQUMsZUFBZSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZUFBZSxDQUFDLEtBQWE7UUFDbkMsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQVMsRUFBRSxDQUFTO1FBQ2pELElBQUkscUJBQXFCLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQztRQUM5QyxJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFDdEMsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDO1FBQzFDLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDbEMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDO1FBQy9DLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUN2QyxNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUM7UUFDM0MsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUVuQyxJQUFJLHFCQUFxQixHQUFHLG9CQUFvQixFQUFFLENBQUM7WUFDbEQscUJBQXFCLEdBQUcsb0JBQW9CLENBQUM7WUFDN0MsaUJBQWlCLEdBQUcsZ0JBQWdCLENBQUM7UUFDdEMsQ0FBQzthQUFNLElBQUkscUJBQXFCLEtBQUssb0JBQW9CLEVBQUUsQ0FBQztZQUMzRCxpQkFBaUIsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVELElBQUksbUJBQW1CLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztZQUM5QyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQztZQUN6QyxlQUFlLEdBQUcsY0FBYyxDQUFDO1FBQ2xDLENBQUM7YUFBTSxJQUFJLG1CQUFtQixLQUFLLGtCQUFrQixFQUFFLENBQUM7WUFDdkQsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFFRCxrQ0FBa0M7UUFDbEMsSUFBSSxxQkFBcUIsR0FBRyxtQkFBbUIsRUFBRSxDQUFDO1lBQ2pELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELElBQUkscUJBQXFCLEtBQUssbUJBQW1CLElBQUksaUJBQWlCLEdBQUcsZUFBZSxFQUFFLENBQUM7WUFDMUYsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNsRyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxXQUFXLENBQUMsS0FBZ0M7UUFDbEQsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQTRCLEVBQUUsQ0FBNEI7UUFDbkYsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2QsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxDQUNOLENBQUMsQ0FBQyxDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxDQUFDLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQyxlQUFlO1lBQ3ZDLENBQUMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDLFdBQVc7WUFDL0IsQ0FBQyxDQUFDLGFBQWEsS0FBSyxDQUFDLENBQUMsYUFBYTtZQUNuQyxDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQzNCLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjO1FBQ3BCLE9BQU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQWE7UUFDekMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxnQkFBZ0I7UUFDdEIsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQWE7UUFDM0MsT0FBTyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxRQUFRO1FBQ2QsT0FBTyxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUM7SUFDdkgsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYyxDQUFDLGFBQXFCLEVBQUUsU0FBaUI7UUFDN0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFRDs7T0FFRztJQUNJLGdCQUFnQixDQUFDLGVBQXVCLEVBQUUsV0FBbUI7UUFDbkUsT0FBTyxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFRDs7T0FFRztJQUNJLGVBQWU7UUFDckIsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBYTtRQUMxQyxPQUFPLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN0RyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxhQUFhO1FBQ25CLE9BQU8sS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQWE7UUFDeEMsT0FBTyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSyxDQUFDLFNBQWlCO1FBQzdCLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdEgsQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxJQUFJLENBQUMsZUFBZSxLQUFLLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDcEQsQ0FBQztJQUVELE1BQU07SUFFQyxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQWdCLEVBQUUsTUFBaUIsS0FBSztRQUNuRSxPQUFPLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBUU0sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFnQztRQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsRyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQVE7UUFDOUIsT0FBTyxDQUNOLEdBQUc7ZUFDQSxDQUFDLE9BQU8sR0FBRyxDQUFDLGVBQWUsS0FBSyxRQUFRLENBQUM7ZUFDekMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxXQUFXLEtBQUssUUFBUSxDQUFDO2VBQ3JDLENBQUMsT0FBTyxHQUFHLENBQUMsYUFBYSxLQUFLLFFBQVEsQ0FBQztlQUN2QyxDQUFDLE9BQU8sR0FBRyxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FDdEMsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUMzRCw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxLQUFLLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNuSCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxLQUFLLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNuSCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQVMsRUFBRSxDQUFTO1FBQ2pELDZCQUE2QjtRQUM3QixJQUFJLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLEtBQUssQ0FBQyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3BILE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixJQUFJLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLEtBQUssQ0FBQyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3BILE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUNyRCw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLEtBQUssQ0FBQyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDL0gsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxLQUFLLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQy9ILE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBNEIsRUFBRSxDQUE0QjtRQUNoRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNaLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7WUFDL0MsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztZQUUvQyxJQUFJLGdCQUFnQixLQUFLLGdCQUFnQixFQUFFLENBQUM7Z0JBQzNDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO2dCQUN2QyxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztnQkFFdkMsSUFBSSxZQUFZLEtBQUssWUFBWSxFQUFFLENBQUM7b0JBQ25DLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO29CQUMzQyxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQztvQkFFM0MsSUFBSSxjQUFjLEtBQUssY0FBYyxFQUFFLENBQUM7d0JBQ3ZDLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO3dCQUNuQyxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQzt3QkFDbkMsT0FBTyxVQUFVLEdBQUcsVUFBVSxDQUFDO29CQUNoQyxDQUFDO29CQUNELE9BQU8sY0FBYyxHQUFHLGNBQWMsQ0FBQztnQkFDeEMsQ0FBQztnQkFDRCxPQUFPLFlBQVksR0FBRyxZQUFZLENBQUM7WUFDcEMsQ0FBQztZQUNELE9BQU8sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7UUFDNUMsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE9BQU8sT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUMxQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQVMsRUFBRSxDQUFTO1FBQ3hELElBQUksQ0FBQyxDQUFDLGFBQWEsS0FBSyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxDQUFDLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDN0MsT0FBTyxDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUM7Z0JBQ3RDLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxlQUFlLENBQUM7WUFDOUMsQ0FBQztZQUNELE9BQU8sQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ2xDLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQztJQUMxQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBYTtRQUM3QyxPQUFPLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQztJQUNwRCxDQUFDO0lBRU0sTUFBTTtRQUNaLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEIn0=