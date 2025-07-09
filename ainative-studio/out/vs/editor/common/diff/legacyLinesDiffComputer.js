/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LcsDiff } from '../../../base/common/diff/diff.js';
import { LinesDiff } from './linesDiffComputer.js';
import { RangeMapping, DetailedLineRangeMapping } from './rangeMapping.js';
import * as strings from '../../../base/common/strings.js';
import { Range } from '../core/range.js';
import { assertFn, checkAdjacentItems } from '../../../base/common/assert.js';
import { LineRange } from '../core/lineRange.js';
const MINIMUM_MATCHING_CHARACTER_LENGTH = 3;
export class LegacyLinesDiffComputer {
    computeDiff(originalLines, modifiedLines, options) {
        const diffComputer = new DiffComputer(originalLines, modifiedLines, {
            maxComputationTime: options.maxComputationTimeMs,
            shouldIgnoreTrimWhitespace: options.ignoreTrimWhitespace,
            shouldComputeCharChanges: true,
            shouldMakePrettyDiff: true,
            shouldPostProcessCharChanges: true,
        });
        const result = diffComputer.computeDiff();
        const changes = [];
        let lastChange = null;
        for (const c of result.changes) {
            let originalRange;
            if (c.originalEndLineNumber === 0) {
                // Insertion
                originalRange = new LineRange(c.originalStartLineNumber + 1, c.originalStartLineNumber + 1);
            }
            else {
                originalRange = new LineRange(c.originalStartLineNumber, c.originalEndLineNumber + 1);
            }
            let modifiedRange;
            if (c.modifiedEndLineNumber === 0) {
                // Deletion
                modifiedRange = new LineRange(c.modifiedStartLineNumber + 1, c.modifiedStartLineNumber + 1);
            }
            else {
                modifiedRange = new LineRange(c.modifiedStartLineNumber, c.modifiedEndLineNumber + 1);
            }
            let change = new DetailedLineRangeMapping(originalRange, modifiedRange, c.charChanges?.map(c => new RangeMapping(new Range(c.originalStartLineNumber, c.originalStartColumn, c.originalEndLineNumber, c.originalEndColumn), new Range(c.modifiedStartLineNumber, c.modifiedStartColumn, c.modifiedEndLineNumber, c.modifiedEndColumn))));
            if (lastChange) {
                if (lastChange.modified.endLineNumberExclusive === change.modified.startLineNumber
                    || lastChange.original.endLineNumberExclusive === change.original.startLineNumber) {
                    // join touching diffs. Probably moving diffs up/down in the algorithm causes touching diffs.
                    change = new DetailedLineRangeMapping(lastChange.original.join(change.original), lastChange.modified.join(change.modified), lastChange.innerChanges && change.innerChanges ?
                        lastChange.innerChanges.concat(change.innerChanges) : undefined);
                    changes.pop();
                }
            }
            changes.push(change);
            lastChange = change;
        }
        assertFn(() => {
            return checkAdjacentItems(changes, (m1, m2) => m2.original.startLineNumber - m1.original.endLineNumberExclusive === m2.modified.startLineNumber - m1.modified.endLineNumberExclusive &&
                // There has to be an unchanged line in between (otherwise both diffs should have been joined)
                m1.original.endLineNumberExclusive < m2.original.startLineNumber &&
                m1.modified.endLineNumberExclusive < m2.modified.startLineNumber);
        });
        return new LinesDiff(changes, [], result.quitEarly);
    }
}
function computeDiff(originalSequence, modifiedSequence, continueProcessingPredicate, pretty) {
    const diffAlgo = new LcsDiff(originalSequence, modifiedSequence, continueProcessingPredicate);
    return diffAlgo.ComputeDiff(pretty);
}
class LineSequence {
    constructor(lines) {
        const startColumns = [];
        const endColumns = [];
        for (let i = 0, length = lines.length; i < length; i++) {
            startColumns[i] = getFirstNonBlankColumn(lines[i], 1);
            endColumns[i] = getLastNonBlankColumn(lines[i], 1);
        }
        this.lines = lines;
        this._startColumns = startColumns;
        this._endColumns = endColumns;
    }
    getElements() {
        const elements = [];
        for (let i = 0, len = this.lines.length; i < len; i++) {
            elements[i] = this.lines[i].substring(this._startColumns[i] - 1, this._endColumns[i] - 1);
        }
        return elements;
    }
    getStrictElement(index) {
        return this.lines[index];
    }
    getStartLineNumber(i) {
        return i + 1;
    }
    getEndLineNumber(i) {
        return i + 1;
    }
    createCharSequence(shouldIgnoreTrimWhitespace, startIndex, endIndex) {
        const charCodes = [];
        const lineNumbers = [];
        const columns = [];
        let len = 0;
        for (let index = startIndex; index <= endIndex; index++) {
            const lineContent = this.lines[index];
            const startColumn = (shouldIgnoreTrimWhitespace ? this._startColumns[index] : 1);
            const endColumn = (shouldIgnoreTrimWhitespace ? this._endColumns[index] : lineContent.length + 1);
            for (let col = startColumn; col < endColumn; col++) {
                charCodes[len] = lineContent.charCodeAt(col - 1);
                lineNumbers[len] = index + 1;
                columns[len] = col;
                len++;
            }
            if (!shouldIgnoreTrimWhitespace && index < endIndex) {
                // Add \n if trim whitespace is not ignored
                charCodes[len] = 10 /* CharCode.LineFeed */;
                lineNumbers[len] = index + 1;
                columns[len] = lineContent.length + 1;
                len++;
            }
        }
        return new CharSequence(charCodes, lineNumbers, columns);
    }
}
class CharSequence {
    constructor(charCodes, lineNumbers, columns) {
        this._charCodes = charCodes;
        this._lineNumbers = lineNumbers;
        this._columns = columns;
    }
    toString() {
        return ('[' + this._charCodes.map((s, idx) => (s === 10 /* CharCode.LineFeed */ ? '\\n' : String.fromCharCode(s)) + `-(${this._lineNumbers[idx]},${this._columns[idx]})`).join(', ') + ']');
    }
    _assertIndex(index, arr) {
        if (index < 0 || index >= arr.length) {
            throw new Error(`Illegal index`);
        }
    }
    getElements() {
        return this._charCodes;
    }
    getStartLineNumber(i) {
        if (i > 0 && i === this._lineNumbers.length) {
            // the start line number of the element after the last element
            // is the end line number of the last element
            return this.getEndLineNumber(i - 1);
        }
        this._assertIndex(i, this._lineNumbers);
        return this._lineNumbers[i];
    }
    getEndLineNumber(i) {
        if (i === -1) {
            // the end line number of the element before the first element
            // is the start line number of the first element
            return this.getStartLineNumber(i + 1);
        }
        this._assertIndex(i, this._lineNumbers);
        if (this._charCodes[i] === 10 /* CharCode.LineFeed */) {
            return this._lineNumbers[i] + 1;
        }
        return this._lineNumbers[i];
    }
    getStartColumn(i) {
        if (i > 0 && i === this._columns.length) {
            // the start column of the element after the last element
            // is the end column of the last element
            return this.getEndColumn(i - 1);
        }
        this._assertIndex(i, this._columns);
        return this._columns[i];
    }
    getEndColumn(i) {
        if (i === -1) {
            // the end column of the element before the first element
            // is the start column of the first element
            return this.getStartColumn(i + 1);
        }
        this._assertIndex(i, this._columns);
        if (this._charCodes[i] === 10 /* CharCode.LineFeed */) {
            return 1;
        }
        return this._columns[i] + 1;
    }
}
class CharChange {
    constructor(originalStartLineNumber, originalStartColumn, originalEndLineNumber, originalEndColumn, modifiedStartLineNumber, modifiedStartColumn, modifiedEndLineNumber, modifiedEndColumn) {
        this.originalStartLineNumber = originalStartLineNumber;
        this.originalStartColumn = originalStartColumn;
        this.originalEndLineNumber = originalEndLineNumber;
        this.originalEndColumn = originalEndColumn;
        this.modifiedStartLineNumber = modifiedStartLineNumber;
        this.modifiedStartColumn = modifiedStartColumn;
        this.modifiedEndLineNumber = modifiedEndLineNumber;
        this.modifiedEndColumn = modifiedEndColumn;
    }
    static createFromDiffChange(diffChange, originalCharSequence, modifiedCharSequence) {
        const originalStartLineNumber = originalCharSequence.getStartLineNumber(diffChange.originalStart);
        const originalStartColumn = originalCharSequence.getStartColumn(diffChange.originalStart);
        const originalEndLineNumber = originalCharSequence.getEndLineNumber(diffChange.originalStart + diffChange.originalLength - 1);
        const originalEndColumn = originalCharSequence.getEndColumn(diffChange.originalStart + diffChange.originalLength - 1);
        const modifiedStartLineNumber = modifiedCharSequence.getStartLineNumber(diffChange.modifiedStart);
        const modifiedStartColumn = modifiedCharSequence.getStartColumn(diffChange.modifiedStart);
        const modifiedEndLineNumber = modifiedCharSequence.getEndLineNumber(diffChange.modifiedStart + diffChange.modifiedLength - 1);
        const modifiedEndColumn = modifiedCharSequence.getEndColumn(diffChange.modifiedStart + diffChange.modifiedLength - 1);
        return new CharChange(originalStartLineNumber, originalStartColumn, originalEndLineNumber, originalEndColumn, modifiedStartLineNumber, modifiedStartColumn, modifiedEndLineNumber, modifiedEndColumn);
    }
}
function postProcessCharChanges(rawChanges) {
    if (rawChanges.length <= 1) {
        return rawChanges;
    }
    const result = [rawChanges[0]];
    let prevChange = result[0];
    for (let i = 1, len = rawChanges.length; i < len; i++) {
        const currChange = rawChanges[i];
        const originalMatchingLength = currChange.originalStart - (prevChange.originalStart + prevChange.originalLength);
        const modifiedMatchingLength = currChange.modifiedStart - (prevChange.modifiedStart + prevChange.modifiedLength);
        // Both of the above should be equal, but the continueProcessingPredicate may prevent this from being true
        const matchingLength = Math.min(originalMatchingLength, modifiedMatchingLength);
        if (matchingLength < MINIMUM_MATCHING_CHARACTER_LENGTH) {
            // Merge the current change into the previous one
            prevChange.originalLength = (currChange.originalStart + currChange.originalLength) - prevChange.originalStart;
            prevChange.modifiedLength = (currChange.modifiedStart + currChange.modifiedLength) - prevChange.modifiedStart;
        }
        else {
            // Add the current change
            result.push(currChange);
            prevChange = currChange;
        }
    }
    return result;
}
class LineChange {
    constructor(originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber, charChanges) {
        this.originalStartLineNumber = originalStartLineNumber;
        this.originalEndLineNumber = originalEndLineNumber;
        this.modifiedStartLineNumber = modifiedStartLineNumber;
        this.modifiedEndLineNumber = modifiedEndLineNumber;
        this.charChanges = charChanges;
    }
    static createFromDiffResult(shouldIgnoreTrimWhitespace, diffChange, originalLineSequence, modifiedLineSequence, continueCharDiff, shouldComputeCharChanges, shouldPostProcessCharChanges) {
        let originalStartLineNumber;
        let originalEndLineNumber;
        let modifiedStartLineNumber;
        let modifiedEndLineNumber;
        let charChanges = undefined;
        if (diffChange.originalLength === 0) {
            originalStartLineNumber = originalLineSequence.getStartLineNumber(diffChange.originalStart) - 1;
            originalEndLineNumber = 0;
        }
        else {
            originalStartLineNumber = originalLineSequence.getStartLineNumber(diffChange.originalStart);
            originalEndLineNumber = originalLineSequence.getEndLineNumber(diffChange.originalStart + diffChange.originalLength - 1);
        }
        if (diffChange.modifiedLength === 0) {
            modifiedStartLineNumber = modifiedLineSequence.getStartLineNumber(diffChange.modifiedStart) - 1;
            modifiedEndLineNumber = 0;
        }
        else {
            modifiedStartLineNumber = modifiedLineSequence.getStartLineNumber(diffChange.modifiedStart);
            modifiedEndLineNumber = modifiedLineSequence.getEndLineNumber(diffChange.modifiedStart + diffChange.modifiedLength - 1);
        }
        if (shouldComputeCharChanges && diffChange.originalLength > 0 && diffChange.originalLength < 20 && diffChange.modifiedLength > 0 && diffChange.modifiedLength < 20 && continueCharDiff()) {
            // Compute character changes for diff chunks of at most 20 lines...
            const originalCharSequence = originalLineSequence.createCharSequence(shouldIgnoreTrimWhitespace, diffChange.originalStart, diffChange.originalStart + diffChange.originalLength - 1);
            const modifiedCharSequence = modifiedLineSequence.createCharSequence(shouldIgnoreTrimWhitespace, diffChange.modifiedStart, diffChange.modifiedStart + diffChange.modifiedLength - 1);
            if (originalCharSequence.getElements().length > 0 && modifiedCharSequence.getElements().length > 0) {
                let rawChanges = computeDiff(originalCharSequence, modifiedCharSequence, continueCharDiff, true).changes;
                if (shouldPostProcessCharChanges) {
                    rawChanges = postProcessCharChanges(rawChanges);
                }
                charChanges = [];
                for (let i = 0, length = rawChanges.length; i < length; i++) {
                    charChanges.push(CharChange.createFromDiffChange(rawChanges[i], originalCharSequence, modifiedCharSequence));
                }
            }
        }
        return new LineChange(originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber, charChanges);
    }
}
export class DiffComputer {
    constructor(originalLines, modifiedLines, opts) {
        this.shouldComputeCharChanges = opts.shouldComputeCharChanges;
        this.shouldPostProcessCharChanges = opts.shouldPostProcessCharChanges;
        this.shouldIgnoreTrimWhitespace = opts.shouldIgnoreTrimWhitespace;
        this.shouldMakePrettyDiff = opts.shouldMakePrettyDiff;
        this.originalLines = originalLines;
        this.modifiedLines = modifiedLines;
        this.original = new LineSequence(originalLines);
        this.modified = new LineSequence(modifiedLines);
        this.continueLineDiff = createContinueProcessingPredicate(opts.maxComputationTime);
        this.continueCharDiff = createContinueProcessingPredicate(opts.maxComputationTime === 0 ? 0 : Math.min(opts.maxComputationTime, 5000)); // never run after 5s for character changes...
    }
    computeDiff() {
        if (this.original.lines.length === 1 && this.original.lines[0].length === 0) {
            // empty original => fast path
            if (this.modified.lines.length === 1 && this.modified.lines[0].length === 0) {
                return {
                    quitEarly: false,
                    changes: []
                };
            }
            return {
                quitEarly: false,
                changes: [{
                        originalStartLineNumber: 1,
                        originalEndLineNumber: 1,
                        modifiedStartLineNumber: 1,
                        modifiedEndLineNumber: this.modified.lines.length,
                        charChanges: undefined
                    }]
            };
        }
        if (this.modified.lines.length === 1 && this.modified.lines[0].length === 0) {
            // empty modified => fast path
            return {
                quitEarly: false,
                changes: [{
                        originalStartLineNumber: 1,
                        originalEndLineNumber: this.original.lines.length,
                        modifiedStartLineNumber: 1,
                        modifiedEndLineNumber: 1,
                        charChanges: undefined
                    }]
            };
        }
        const diffResult = computeDiff(this.original, this.modified, this.continueLineDiff, this.shouldMakePrettyDiff);
        const rawChanges = diffResult.changes;
        const quitEarly = diffResult.quitEarly;
        // The diff is always computed with ignoring trim whitespace
        // This ensures we get the prettiest diff
        if (this.shouldIgnoreTrimWhitespace) {
            const lineChanges = [];
            for (let i = 0, length = rawChanges.length; i < length; i++) {
                lineChanges.push(LineChange.createFromDiffResult(this.shouldIgnoreTrimWhitespace, rawChanges[i], this.original, this.modified, this.continueCharDiff, this.shouldComputeCharChanges, this.shouldPostProcessCharChanges));
            }
            return {
                quitEarly: quitEarly,
                changes: lineChanges
            };
        }
        // Need to post-process and introduce changes where the trim whitespace is different
        // Note that we are looping starting at -1 to also cover the lines before the first change
        const result = [];
        let originalLineIndex = 0;
        let modifiedLineIndex = 0;
        for (let i = -1 /* !!!! */, len = rawChanges.length; i < len; i++) {
            const nextChange = (i + 1 < len ? rawChanges[i + 1] : null);
            const originalStop = (nextChange ? nextChange.originalStart : this.originalLines.length);
            const modifiedStop = (nextChange ? nextChange.modifiedStart : this.modifiedLines.length);
            while (originalLineIndex < originalStop && modifiedLineIndex < modifiedStop) {
                const originalLine = this.originalLines[originalLineIndex];
                const modifiedLine = this.modifiedLines[modifiedLineIndex];
                if (originalLine !== modifiedLine) {
                    // These lines differ only in trim whitespace
                    // Check the leading whitespace
                    {
                        let originalStartColumn = getFirstNonBlankColumn(originalLine, 1);
                        let modifiedStartColumn = getFirstNonBlankColumn(modifiedLine, 1);
                        while (originalStartColumn > 1 && modifiedStartColumn > 1) {
                            const originalChar = originalLine.charCodeAt(originalStartColumn - 2);
                            const modifiedChar = modifiedLine.charCodeAt(modifiedStartColumn - 2);
                            if (originalChar !== modifiedChar) {
                                break;
                            }
                            originalStartColumn--;
                            modifiedStartColumn--;
                        }
                        if (originalStartColumn > 1 || modifiedStartColumn > 1) {
                            this._pushTrimWhitespaceCharChange(result, originalLineIndex + 1, 1, originalStartColumn, modifiedLineIndex + 1, 1, modifiedStartColumn);
                        }
                    }
                    // Check the trailing whitespace
                    {
                        let originalEndColumn = getLastNonBlankColumn(originalLine, 1);
                        let modifiedEndColumn = getLastNonBlankColumn(modifiedLine, 1);
                        const originalMaxColumn = originalLine.length + 1;
                        const modifiedMaxColumn = modifiedLine.length + 1;
                        while (originalEndColumn < originalMaxColumn && modifiedEndColumn < modifiedMaxColumn) {
                            const originalChar = originalLine.charCodeAt(originalEndColumn - 1);
                            const modifiedChar = originalLine.charCodeAt(modifiedEndColumn - 1);
                            if (originalChar !== modifiedChar) {
                                break;
                            }
                            originalEndColumn++;
                            modifiedEndColumn++;
                        }
                        if (originalEndColumn < originalMaxColumn || modifiedEndColumn < modifiedMaxColumn) {
                            this._pushTrimWhitespaceCharChange(result, originalLineIndex + 1, originalEndColumn, originalMaxColumn, modifiedLineIndex + 1, modifiedEndColumn, modifiedMaxColumn);
                        }
                    }
                }
                originalLineIndex++;
                modifiedLineIndex++;
            }
            if (nextChange) {
                // Emit the actual change
                result.push(LineChange.createFromDiffResult(this.shouldIgnoreTrimWhitespace, nextChange, this.original, this.modified, this.continueCharDiff, this.shouldComputeCharChanges, this.shouldPostProcessCharChanges));
                originalLineIndex += nextChange.originalLength;
                modifiedLineIndex += nextChange.modifiedLength;
            }
        }
        return {
            quitEarly: quitEarly,
            changes: result
        };
    }
    _pushTrimWhitespaceCharChange(result, originalLineNumber, originalStartColumn, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedEndColumn) {
        if (this._mergeTrimWhitespaceCharChange(result, originalLineNumber, originalStartColumn, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedEndColumn)) {
            // Merged into previous
            return;
        }
        let charChanges = undefined;
        if (this.shouldComputeCharChanges) {
            charChanges = [new CharChange(originalLineNumber, originalStartColumn, originalLineNumber, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedLineNumber, modifiedEndColumn)];
        }
        result.push(new LineChange(originalLineNumber, originalLineNumber, modifiedLineNumber, modifiedLineNumber, charChanges));
    }
    _mergeTrimWhitespaceCharChange(result, originalLineNumber, originalStartColumn, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedEndColumn) {
        const len = result.length;
        if (len === 0) {
            return false;
        }
        const prevChange = result[len - 1];
        if (prevChange.originalEndLineNumber === 0 || prevChange.modifiedEndLineNumber === 0) {
            // Don't merge with inserts/deletes
            return false;
        }
        if (prevChange.originalEndLineNumber === originalLineNumber && prevChange.modifiedEndLineNumber === modifiedLineNumber) {
            if (this.shouldComputeCharChanges && prevChange.charChanges) {
                prevChange.charChanges.push(new CharChange(originalLineNumber, originalStartColumn, originalLineNumber, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedLineNumber, modifiedEndColumn));
            }
            return true;
        }
        if (prevChange.originalEndLineNumber + 1 === originalLineNumber && prevChange.modifiedEndLineNumber + 1 === modifiedLineNumber) {
            prevChange.originalEndLineNumber = originalLineNumber;
            prevChange.modifiedEndLineNumber = modifiedLineNumber;
            if (this.shouldComputeCharChanges && prevChange.charChanges) {
                prevChange.charChanges.push(new CharChange(originalLineNumber, originalStartColumn, originalLineNumber, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedLineNumber, modifiedEndColumn));
            }
            return true;
        }
        return false;
    }
}
function getFirstNonBlankColumn(txt, defaultValue) {
    const r = strings.firstNonWhitespaceIndex(txt);
    if (r === -1) {
        return defaultValue;
    }
    return r + 1;
}
function getLastNonBlankColumn(txt, defaultValue) {
    const r = strings.lastNonWhitespaceIndex(txt);
    if (r === -1) {
        return defaultValue;
    }
    return r + 2;
}
function createContinueProcessingPredicate(maximumRuntime) {
    if (maximumRuntime === 0) {
        return () => true;
    }
    const startTime = Date.now();
    return () => {
        return Date.now() - startTime < maximumRuntime;
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVnYWN5TGluZXNEaWZmQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL2xlZ2FjeUxpbmVzRGlmZkNvbXB1dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBMEIsT0FBTyxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDakcsT0FBTyxFQUFpRCxTQUFTLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDM0UsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVqRCxNQUFNLGlDQUFpQyxHQUFHLENBQUMsQ0FBQztBQUU1QyxNQUFNLE9BQU8sdUJBQXVCO0lBQ25DLFdBQVcsQ0FBQyxhQUF1QixFQUFFLGFBQXVCLEVBQUUsT0FBa0M7UUFDL0YsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRTtZQUNuRSxrQkFBa0IsRUFBRSxPQUFPLENBQUMsb0JBQW9CO1lBQ2hELDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxvQkFBb0I7WUFDeEQsd0JBQXdCLEVBQUUsSUFBSTtZQUM5QixvQkFBb0IsRUFBRSxJQUFJO1lBQzFCLDRCQUE0QixFQUFFLElBQUk7U0FDbEMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLFdBQVcsRUFB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