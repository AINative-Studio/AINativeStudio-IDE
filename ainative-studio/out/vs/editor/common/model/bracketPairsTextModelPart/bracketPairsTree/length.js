/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { splitLines } from '../../../../../base/common/strings.js';
import { Position } from '../../../core/position.js';
import { Range } from '../../../core/range.js';
import { TextLength } from '../../../core/textLength.js';
/**
 * The end must be greater than or equal to the start.
*/
export function lengthDiff(startLineCount, startColumnCount, endLineCount, endColumnCount) {
    return (startLineCount !== endLineCount)
        ? toLength(endLineCount - startLineCount, endColumnCount)
        : toLength(0, endColumnCount - startColumnCount);
}
export const lengthZero = 0;
export function lengthIsZero(length) {
    return length === 0;
}
/*
 * We have 52 bits available in a JS number.
 * We use the upper 26 bits to store the line and the lower 26 bits to store the column.
 */
///*
const factor = 2 ** 26;
/*/
const factor = 1000000;
// */
export function toLength(lineCount, columnCount) {
    // llllllllllllllllllllllllllcccccccccccccccccccccccccc (52 bits)
    //       line count (26 bits)    column count (26 bits)
    // If there is no overflow (all values/sums below 2^26 = 67108864),
    // we have `toLength(lns1, cols1) + toLength(lns2, cols2) = toLength(lns1 + lns2, cols1 + cols2)`.
    return (lineCount * factor + columnCount);
}
export function lengthToObj(length) {
    const l = length;
    const lineCount = Math.floor(l / factor);
    const columnCount = l - lineCount * factor;
    return new TextLength(lineCount, columnCount);
}
export function lengthGetLineCount(length) {
    return Math.floor(length / factor);
}
/**
 * Returns the amount of columns of the given length, assuming that it does not span any line.
*/
export function lengthGetColumnCountIfZeroLineCount(length) {
    return length;
}
export function lengthAdd(l1, l2) {
    let r = l1 + l2;
    if (l2 >= factor) {
        r = r - (l1 % factor);
    }
    return r;
}
export function sumLengths(items, lengthFn) {
    return items.reduce((a, b) => lengthAdd(a, lengthFn(b)), lengthZero);
}
export function lengthEquals(length1, length2) {
    return length1 === length2;
}
/**
 * Returns a non negative length `result` such that `lengthAdd(length1, result) = length2`, or zero if such length does not exist.
 */
export function lengthDiffNonNegative(length1, length2) {
    const l1 = length1;
    const l2 = length2;
    const diff = l2 - l1;
    if (diff <= 0) {
        // line-count of length1 is higher than line-count of length2
        // or they are equal and column-count of length1 is higher than column-count of length2
        return lengthZero;
    }
    const lineCount1 = Math.floor(l1 / factor);
    const lineCount2 = Math.floor(l2 / factor);
    const colCount2 = l2 - lineCount2 * factor;
    if (lineCount1 === lineCount2) {
        const colCount1 = l1 - lineCount1 * factor;
        return toLength(0, colCount2 - colCount1);
    }
    else {
        return toLength(lineCount2 - lineCount1, colCount2);
    }
}
export function lengthLessThan(length1, length2) {
    // First, compare line counts, then column counts.
    return length1 < length2;
}
export function lengthLessThanEqual(length1, length2) {
    return length1 <= length2;
}
export function lengthGreaterThanEqual(length1, length2) {
    return length1 >= length2;
}
export function lengthToPosition(length) {
    const l = length;
    const lineCount = Math.floor(l / factor);
    const colCount = l - lineCount * factor;
    return new Position(lineCount + 1, colCount + 1);
}
export function positionToLength(position) {
    return toLength(position.lineNumber - 1, position.column - 1);
}
export function lengthsToRange(lengthStart, lengthEnd) {
    const l = lengthStart;
    const lineCount = Math.floor(l / factor);
    const colCount = l - lineCount * factor;
    const l2 = lengthEnd;
    const lineCount2 = Math.floor(l2 / factor);
    const colCount2 = l2 - lineCount2 * factor;
    return new Range(lineCount + 1, colCount + 1, lineCount2 + 1, colCount2 + 1);
}
export function lengthOfRange(range) {
    if (range.startLineNumber === range.endLineNumber) {
        return new TextLength(0, range.endColumn - range.startColumn);
    }
    else {
        return new TextLength(range.endLineNumber - range.startLineNumber, range.endColumn - 1);
    }
}
export function lengthCompare(length1, length2) {
    const l1 = length1;
    const l2 = length2;
    return l1 - l2;
}
export function lengthOfString(str) {
    const lines = splitLines(str);
    return toLength(lines.length - 1, lines[lines.length - 1].length);
}
export function lengthOfStringObj(str) {
    const lines = splitLines(str);
    return new TextLength(lines.length - 1, lines[lines.length - 1].length);
}
/**
 * Computes a numeric hash of the given length.
*/
export function lengthHash(length) {
    return length;
}
export function lengthMax(length1, length2) {
    return length1 > length2 ? length1 : length2;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVuZ3RoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvbGVuZ3RoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV6RDs7RUFFRTtBQUNGLE1BQU0sVUFBVSxVQUFVLENBQUMsY0FBc0IsRUFBRSxnQkFBd0IsRUFBRSxZQUFvQixFQUFFLGNBQXNCO0lBQ3hILE9BQU8sQ0FBQyxjQUFjLEtBQUssWUFBWSxDQUFDO1FBQ3ZDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxHQUFHLGNBQWMsRUFBRSxjQUFjLENBQUM7UUFDekQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsY0FBYyxHQUFHLGdCQUFnQixDQUFDLENBQUM7QUFDbkQsQ0FBQztBQVFELE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxDQUFrQixDQUFDO0FBRTdDLE1BQU0sVUFBVSxZQUFZLENBQUMsTUFBYztJQUMxQyxPQUFPLE1BQXVCLEtBQUssQ0FBQyxDQUFDO0FBQ3RDLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxJQUFJO0FBQ0osTUFBTSxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUN2Qjs7S0FFSztBQUVMLE1BQU0sVUFBVSxRQUFRLENBQUMsU0FBaUIsRUFBRSxXQUFtQjtJQUM5RCxpRUFBaUU7SUFD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