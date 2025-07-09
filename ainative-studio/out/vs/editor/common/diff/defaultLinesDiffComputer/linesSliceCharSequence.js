/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLastIdxMonotonous, findLastMonotonous, findFirstMonotonous } from '../../../../base/common/arraysFind.js';
import { OffsetRange } from '../../core/offsetRange.js';
import { Position } from '../../core/position.js';
import { Range } from '../../core/range.js';
import { isSpace } from './utils.js';
export class LinesSliceCharSequence {
    constructor(lines, range, considerWhitespaceChanges) {
        this.lines = lines;
        this.range = range;
        this.considerWhitespaceChanges = considerWhitespaceChanges;
        this.elements = [];
        this.firstElementOffsetByLineIdx = [];
        this.lineStartOffsets = [];
        this.trimmedWsLengthsByLineIdx = [];
        this.firstElementOffsetByLineIdx.push(0);
        for (let lineNumber = this.range.startLineNumber; lineNumber <= this.range.endLineNumber; lineNumber++) {
            let line = lines[lineNumber - 1];
            let lineStartOffset = 0;
            if (lineNumber === this.range.startLineNumber && this.range.startColumn > 1) {
                lineStartOffset = this.range.startColumn - 1;
                line = line.substring(lineStartOffset);
            }
            this.lineStartOffsets.push(lineStartOffset);
            let trimmedWsLength = 0;
            if (!considerWhitespaceChanges) {
                const trimmedStartLine = line.trimStart();
                trimmedWsLength = line.length - trimmedStartLine.length;
                line = trimmedStartLine.trimEnd();
            }
            this.trimmedWsLengthsByLineIdx.push(trimmedWsLength);
            const lineLength = lineNumber === this.range.endLineNumber ? Math.min(this.range.endColumn - 1 - lineStartOffset - trimmedWsLength, line.length) : line.length;
            for (let i = 0; i < lineLength; i++) {
                this.elements.push(line.charCodeAt(i));
            }
            if (lineNumber < this.range.endLineNumber) {
                this.elements.push('\n'.charCodeAt(0));
                this.firstElementOffsetByLineIdx.push(this.elements.length);
            }
        }
    }
    toString() {
        return `Slice: "${this.text}"`;
    }
    get text() {
        return this.getText(new OffsetRange(0, this.length));
    }
    getText(range) {
        return this.elements.slice(range.start, range.endExclusive).map(e => String.fromCharCode(e)).join('');
    }
    getElement(offset) {
        return this.elements[offset];
    }
    get length() {
        return this.elements.length;
    }
    getBoundaryScore(length) {
        //   a   b   c   ,           d   e   f
        // 11  0   0   12  15  6   13  0   0   11
        const prevCategory = getCategory(length > 0 ? this.elements[length - 1] : -1);
        const nextCategory = getCategory(length < this.elements.length ? this.elements[length] : -1);
        if (prevCategory === 7 /* CharBoundaryCategory.LineBreakCR */ && nextCategory === 8 /* CharBoundaryCategory.LineBreakLF */) {
            // don't break between \r and \n
            return 0;
        }
        if (prevCategory === 8 /* CharBoundaryCategory.LineBreakLF */) {
            // prefer the linebreak before the change
            return 150;
        }
        let score = 0;
        if (prevCategory !== nextCategory) {
            score += 10;
            if (prevCategory === 0 /* CharBoundaryCategory.WordLower */ && nextCategory === 1 /* CharBoundaryCategory.WordUpper */) {
                score += 1;
            }
        }
        score += getCategoryBoundaryScore(prevCategory);
        score += getCategoryBoundaryScore(nextCategory);
        return score;
    }
    translateOffset(offset, preference = 'right') {
        // find smallest i, so that lineBreakOffsets[i] <= offset using binary search
        const i = findLastIdxMonotonous(this.firstElementOffsetByLineIdx, (value) => value <= offset);
        const lineOffset = offset - this.firstElementOffsetByLineIdx[i];
        return new Position(this.range.startLineNumber + i, 1 + this.lineStartOffsets[i] + lineOffset + ((lineOffset === 0 && preference === 'left') ? 0 : this.trimmedWsLengthsByLineIdx[i]));
    }
    translateRange(range) {
        const pos1 = this.translateOffset(range.start, 'right');
        const pos2 = this.translateOffset(range.endExclusive, 'left');
        if (pos2.isBefore(pos1)) {
            return Range.fromPositions(pos2, pos2);
        }
        return Range.fromPositions(pos1, pos2);
    }
    /**
     * Finds the word that contains the character at the given offset
     */
    findWordContaining(offset) {
        if (offset < 0 || offset >= this.elements.length) {
            return undefined;
        }
        if (!isWordChar(this.elements[offset])) {
            return undefined;
        }
        // find start
        let start = offset;
        while (start > 0 && isWordChar(this.elements[start - 1])) {
            start--;
        }
        // find end
        let end = offset;
        while (end < this.elements.length && isWordChar(this.elements[end])) {
            end++;
        }
        return new OffsetRange(start, end);
    }
    /** fooBar has the two sub-words foo and bar */
    findSubWordContaining(offset) {
        if (offset < 0 || offset >= this.elements.length) {
            return undefined;
        }
        if (!isWordChar(this.elements[offset])) {
            return undefined;
        }
        // find start
        let start = offset;
        while (start > 0 && isWordChar(this.elements[start - 1]) && !isUpperCase(this.elements[start])) {
            start--;
        }
        // find end
        let end = offset;
        while (end < this.elements.length && isWordChar(this.elements[end]) && !isUpperCase(this.elements[end])) {
            end++;
        }
        return new OffsetRange(start, end);
    }
    countLinesIn(range) {
        return this.translateOffset(range.endExclusive).lineNumber - this.translateOffset(range.start).lineNumber;
    }
    isStronglyEqual(offset1, offset2) {
        return this.elements[offset1] === this.elements[offset2];
    }
    extendToFullLines(range) {
        const start = findLastMonotonous(this.firstElementOffsetByLineIdx, x => x <= range.start) ?? 0;
        const end = findFirstMonotonous(this.firstElementOffsetByLineIdx, x => range.endExclusive <= x) ?? this.elements.length;
        return new OffsetRange(start, end);
    }
}
function isWordChar(charCode) {
    return charCode >= 97 /* CharCode.a */ && charCode <= 122 /* CharCode.z */
        || charCode >= 65 /* CharCode.A */ && charCode <= 90 /* CharCode.Z */
        || charCode >= 48 /* CharCode.Digit0 */ && charCode <= 57 /* CharCode.Digit9 */;
}
function isUpperCase(charCode) {
    return charCode >= 65 /* CharCode.A */ && charCode <= 90 /* CharCode.Z */;
}
var CharBoundaryCategory;
(function (CharBoundaryCategory) {
    CharBoundaryCategory[CharBoundaryCategory["WordLower"] = 0] = "WordLower";
    CharBoundaryCategory[CharBoundaryCategory["WordUpper"] = 1] = "WordUpper";
    CharBoundaryCategory[CharBoundaryCategory["WordNumber"] = 2] = "WordNumber";
    CharBoundaryCategory[CharBoundaryCategory["End"] = 3] = "End";
    CharBoundaryCategory[CharBoundaryCategory["Other"] = 4] = "Other";
    CharBoundaryCategory[CharBoundaryCategory["Separator"] = 5] = "Separator";
    CharBoundaryCategory[CharBoundaryCategory["Space"] = 6] = "Space";
    CharBoundaryCategory[CharBoundaryCategory["LineBreakCR"] = 7] = "LineBreakCR";
    CharBoundaryCategory[CharBoundaryCategory["LineBreakLF"] = 8] = "LineBreakLF";
})(CharBoundaryCategory || (CharBoundaryCategory = {}));
const score = {
    [0 /* CharBoundaryCategory.WordLower */]: 0,
    [1 /* CharBoundaryCategory.WordUpper */]: 0,
    [2 /* CharBoundaryCategory.WordNumber */]: 0,
    [3 /* CharBoundaryCategory.End */]: 10,
    [4 /* CharBoundaryCategory.Other */]: 2,
    [5 /* CharBoundaryCategory.Separator */]: 30,
    [6 /* CharBoundaryCategory.Space */]: 3,
    [7 /* CharBoundaryCategory.LineBreakCR */]: 10,
    [8 /* CharBoundaryCategory.LineBreakLF */]: 10,
};
function getCategoryBoundaryScore(category) {
    return score[category];
}
function getCategory(charCode) {
    if (charCode === 10 /* CharCode.LineFeed */) {
        return 8 /* CharBoundaryCategory.LineBreakLF */;
    }
    else if (charCode === 13 /* CharCode.CarriageReturn */) {
        return 7 /* CharBoundaryCategory.LineBreakCR */;
    }
    else if (isSpace(charCode)) {
        return 6 /* CharBoundaryCategory.Space */;
    }
    else if (charCode >= 97 /* CharCode.a */ && charCode <= 122 /* CharCode.z */) {
        return 0 /* CharBoundaryCategory.WordLower */;
    }
    else if (charCode >= 65 /* CharCode.A */ && charCode <= 90 /* CharCode.Z */) {
        return 1 /* CharBoundaryCategory.WordUpper */;
    }
    else if (charCode >= 48 /* CharCode.Digit0 */ && charCode <= 57 /* CharCode.Digit9 */) {
        return 2 /* CharBoundaryCategory.WordNumber */;
    }
    else if (charCode === -1) {
        return 3 /* CharBoundaryCategory.End */;
    }
    else if (charCode === 44 /* CharCode.Comma */ || charCode === 59 /* CharCode.Semicolon */) {
        return 5 /* CharBoundaryCategory.Separator */;
    }
    else {
        return 4 /* CharBoundaryCategory.Other */;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNTbGljZUNoYXJTZXF1ZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyL2xpbmVzU2xpY2VDaGFyU2VxdWVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFdkgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyQyxNQUFNLE9BQU8sc0JBQXNCO0lBTWxDLFlBQTRCLEtBQWUsRUFBbUIsS0FBWSxFQUFrQix5QkFBa0M7UUFBbEcsVUFBSyxHQUFMLEtBQUssQ0FBVTtRQUFtQixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQWtCLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBUztRQUw3RyxhQUFRLEdBQWEsRUFBRSxDQUFDO1FBQ3hCLGdDQUEyQixHQUFhLEVBQUUsQ0FBQztRQUMzQyxxQkFBZ0IsR0FBYSxFQUFFLENBQUM7UUFDaEMsOEJBQXlCLEdBQWEsRUFBRSxDQUFDO1FBR3pELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsS0FBSyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxVQUFVLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsVUFB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