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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVuZ3RoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL2xlbmd0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFekQ7O0VBRUU7QUFDRixNQUFNLFVBQVUsVUFBVSxDQUFDLGNBQXNCLEVBQUUsZ0JBQXdCLEVBQUUsWUFBb0IsRUFBRSxjQUFzQjtJQUN4SCxPQUFPLENBQUMsY0FBYyxLQUFLLFlBQVksQ0FBQztRQUN2QyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksR0FBRyxjQUFjLEVBQUUsY0FBYyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ25ELENBQUM7QUFRRCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsQ0FBa0IsQ0FBQztBQUU3QyxNQUFNLFVBQVUsWUFBWSxDQUFDLE1BQWM7SUFDMUMsT0FBTyxNQUF1QixLQUFLLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsSUFBSTtBQUNKLE1BQU0sTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDdkI7O0tBRUs7QUFFTCxNQUFNLFVBQVUsUUFBUSxDQUFDLFNBQWlCLEVBQUUsV0FBbUI7SUFDOUQsaUVBQWlFO0lB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