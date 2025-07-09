/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, groupAdjacentBy, numberComparator } from '../../../base/common/arrays.js';
import { assert, checkAdjacentItems } from '../../../base/common/assert.js';
import { splitLines } from '../../../base/common/strings.js';
import { LineRange } from './lineRange.js';
import { OffsetEdit, SingleOffsetEdit } from './offsetEdit.js';
import { Position } from './position.js';
import { Range } from './range.js';
import { SingleTextEdit, TextEdit } from './textEdit.js';
export class LineEdit {
    static { this.empty = new LineEdit([]); }
    static deserialize(data) {
        return new LineEdit(data.map(e => SingleLineEdit.deserialize(e)));
    }
    static fromEdit(edit, initialValue) {
        const textEdit = TextEdit.fromOffsetEdit(edit, initialValue);
        return LineEdit.fromTextEdit(textEdit, initialValue);
    }
    static fromTextEdit(edit, initialValue) {
        const edits = edit.edits;
        const result = [];
        const currentEdits = [];
        for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            const nextEditRange = i + 1 < edits.length ? edits[i + 1] : undefined;
            currentEdits.push(edit);
            if (nextEditRange && nextEditRange.range.startLineNumber === edit.range.endLineNumber) {
                continue;
            }
            const singleEdit = SingleTextEdit.joinEdits(currentEdits, initialValue);
            currentEdits.length = 0;
            const singleLineEdit = SingleLineEdit.fromSingleTextEdit(singleEdit, initialValue);
            result.push(singleLineEdit);
        }
        return new LineEdit(result);
    }
    static createFromUnsorted(edits) {
        const result = edits.slice();
        result.sort(compareBy(i => i.lineRange.startLineNumber, numberComparator));
        return new LineEdit(result);
    }
    constructor(
    /**
     * Have to be sorted by start line number and non-intersecting.
    */
    edits) {
        this.edits = edits;
        assert(checkAdjacentItems(edits, (i1, i2) => i1.lineRange.endLineNumberExclusive <= i2.lineRange.startLineNumber));
    }
    toEdit(initialValue) {
        const edits = [];
        for (const edit of this.edits) {
            const singleEdit = edit.toSingleEdit(initialValue);
            edits.push(singleEdit);
        }
        return new OffsetEdit(edits);
    }
    toString() {
        return this.edits.map(e => e.toString()).join(',');
    }
    serialize() {
        return this.edits.map(e => e.serialize());
    }
    getNewLineRanges() {
        const ranges = [];
        let offset = 0;
        for (const e of this.edits) {
            ranges.push(LineRange.ofLength(e.lineRange.startLineNumber + offset, e.newLines.length));
            offset += e.newLines.length - e.lineRange.length;
        }
        return ranges;
    }
    mapLineNumber(lineNumber) {
        let lineDelta = 0;
        for (const e of this.edits) {
            if (e.lineRange.endLineNumberExclusive > lineNumber) {
                break;
            }
            lineDelta += e.newLines.length - e.lineRange.length;
        }
        return lineNumber + lineDelta;
    }
    mapLineRange(lineRange) {
        return new LineRange(this.mapLineNumber(lineRange.startLineNumber), this.mapLineNumber(lineRange.endLineNumberExclusive));
    }
    rebase(base) {
        return new LineEdit(this.edits.map(e => new SingleLineEdit(base.mapLineRange(e.lineRange), e.newLines)));
    }
    humanReadablePatch(originalLines) {
        const result = [];
        function pushLine(originalLineNumber, modifiedLineNumber, kind, content) {
            const specialChar = (kind === 'unmodified' ? ' ' : (kind === 'deleted' ? '-' : '+'));
            if (content === undefined) {
                content = '[[[[[ WARNING: LINE DOES NOT EXIST ]]]]]';
            }
            const origLn = originalLineNumber === -1 ? '   ' : originalLineNumber.toString().padStart(3, ' ');
            const modLn = modifiedLineNumber === -1 ? '   ' : modifiedLineNumber.toString().padStart(3, ' ');
            result.push(`${specialChar} ${origLn} ${modLn} ${content}`);
        }
        function pushSeperator() {
            result.push('---');
        }
        let lineDelta = 0;
        let first = true;
        for (const edits of groupAdjacentBy(this.edits, (e1, e2) => e1.lineRange.distanceToRange(e2.lineRange) <= 5)) {
            if (!first) {
                pushSeperator();
            }
            else {
                first = false;
            }
            let lastLineNumber = edits[0].lineRange.startLineNumber - 2;
            for (const edit of edits) {
                for (let i = Math.max(1, lastLineNumber); i < edit.lineRange.startLineNumber; i++) {
                    pushLine(i, i + lineDelta, 'unmodified', originalLines[i - 1]);
                }
                const range = edit.lineRange;
                const newLines = edit.newLines;
                for (const replaceLineNumber of range.mapToLineArray(n => n)) {
                    const line = originalLines[replaceLineNumber - 1];
                    pushLine(replaceLineNumber, -1, 'deleted', line);
                }
                for (let i = 0; i < newLines.length; i++) {
                    const line = newLines[i];
                    pushLine(-1, range.startLineNumber + lineDelta + i, 'added', line);
                }
                lastLineNumber = range.endLineNumberExclusive;
                lineDelta += edit.newLines.length - edit.lineRange.length;
            }
            for (let i = lastLineNumber; i <= Math.min(lastLineNumber + 2, originalLines.length); i++) {
                pushLine(i, i + lineDelta, 'unmodified', originalLines[i - 1]);
            }
        }
        return result.join('\n');
    }
    apply(lines) {
        const result = [];
        let currentLineIndex = 0;
        for (const edit of this.edits) {
            while (currentLineIndex < edit.lineRange.startLineNumber - 1) {
                result.push(lines[currentLineIndex]);
                currentLineIndex++;
            }
            for (const newLine of edit.newLines) {
                result.push(newLine);
            }
            currentLineIndex = edit.lineRange.endLineNumberExclusive - 1;
        }
        while (currentLineIndex < lines.length) {
            result.push(lines[currentLineIndex]);
            currentLineIndex++;
        }
        return result;
    }
    toSingleEdit() {
    }
}
export class SingleLineEdit {
    static deserialize(e) {
        return new SingleLineEdit(LineRange.ofLength(e[0], e[1] - e[0]), e[2]);
    }
    static fromSingleTextEdit(edit, initialValue) {
        // 1: ab[cde
        // 2: fghijk
        // 3: lmn]opq
        // replaced with
        // 1n: 123
        // 2n: 456
        // 3n: 789
        // simple solution: replace [1..4) with [1n..4n)
        const newLines = splitLines(edit.text);
        let startLineNumber = edit.range.startLineNumber;
        const survivingFirstLineText = initialValue.getValueOfRange(Range.fromPositions(new Position(edit.range.startLineNumber, 1), edit.range.getStartPosition()));
        newLines[0] = survivingFirstLineText + newLines[0];
        let endLineNumberEx = edit.range.endLineNumber + 1;
        const editEndLineNumberMaxColumn = initialValue.getTransformer().getLineLength(edit.range.endLineNumber) + 1;
        const survivingEndLineText = initialValue.getValueOfRange(Range.fromPositions(edit.range.getEndPosition(), new Position(edit.range.endLineNumber, editEndLineNumberMaxColumn)));
        newLines[newLines.length - 1] = newLines[newLines.length - 1] + survivingEndLineText;
        // Replacing [startLineNumber, endLineNumberEx) with newLines would be correct, however it might not be minimal.
        const startBeforeNewLine = edit.range.startColumn === initialValue.getTransformer().getLineLength(edit.range.startLineNumber) + 1;
        const endAfterNewLine = edit.range.endColumn === 1;
        if (startBeforeNewLine && newLines[0].length === survivingFirstLineText.length) {
            // the replacement would not delete any text on the first line
            startLineNumber++;
            newLines.shift();
        }
        if (newLines.length > 0 && startLineNumber < endLineNumberEx && endAfterNewLine && newLines[newLines.length - 1].length === survivingEndLineText.length) {
            // the replacement would not delete any text on the last line
            endLineNumberEx--;
            newLines.pop();
        }
        return new SingleLineEdit(new LineRange(startLineNumber, endLineNumberEx), newLines);
    }
    constructor(lineRange, newLines) {
        this.lineRange = lineRange;
        this.newLines = newLines;
    }
    toSingleTextEdit(initialValue) {
        if (this.newLines.length === 0) {
            // Deletion
            const textLen = initialValue.getTransformer().textLength;
            if (this.lineRange.endLineNumberExclusive === textLen.lineCount + 2) {
                let startPos;
                if (this.lineRange.startLineNumber > 1) {
                    const startLineNumber = this.lineRange.startLineNumber - 1;
                    const startColumn = initialValue.getTransformer().getLineLength(startLineNumber) + 1;
                    startPos = new Position(startLineNumber, startColumn);
                }
                else {
                    // Delete everything.
                    // In terms of lines, this would end up with 0 lines.
                    // However, a string has always 1 line (which can be empty).
                    startPos = new Position(1, 1);
                }
                const lastPosition = textLen.addToPosition(new Position(1, 1));
                return new SingleTextEdit(Range.fromPositions(startPos, lastPosition), '');
            }
            else {
                return new SingleTextEdit(new Range(this.lineRange.startLineNumber, 1, this.lineRange.endLineNumberExclusive, 1), '');
            }
        }
        else if (this.lineRange.isEmpty) {
            // Insertion
            let endLineNumber;
            let column;
            let text;
            const insertionLine = this.lineRange.startLineNumber;
            if (insertionLine === initialValue.getTransformer().textLength.lineCount + 2) {
                endLineNumber = insertionLine - 1;
                column = initialValue.getTransformer().getLineLength(endLineNumber) + 1;
                text = this.newLines.map(l => '\n' + l).join('');
            }
            else {
                endLineNumber = insertionLine;
                column = 1;
                text = this.newLines.map(l => l + '\n').join('');
            }
            return new SingleTextEdit(Range.fromPositions(new Position(endLineNumber, column)), text);
        }
        else {
            const endLineNumber = this.lineRange.endLineNumberExclusive - 1;
            const endLineNumberMaxColumn = initialValue.getTransformer().getLineLength(endLineNumber) + 1;
            const range = new Range(this.lineRange.startLineNumber, 1, endLineNumber, endLineNumberMaxColumn);
            // Don't add \n to the last line. This is because we subtract one from lineRange.endLineNumberExclusive for endLineNumber.
            const text = this.newLines.join('\n');
            return new SingleTextEdit(range, text);
        }
    }
    toSingleEdit(initialValue) {
        const textEdit = this.toSingleTextEdit(initialValue);
        const range = initialValue.getTransformer().getOffsetRange(textEdit.range);
        return new SingleOffsetEdit(range, textEdit.text);
    }
    toString() {
        return `${this.lineRange}->${JSON.stringify(this.newLines)}`;
    }
    serialize() {
        return [
            this.lineRange.startLineNumber,
            this.lineRange.endLineNumberExclusive,
            this.newLines,
        ];
    }
    removeCommonSuffixPrefixLines(initialValue) {
        let startLineNumber = this.lineRange.startLineNumber;
        let endLineNumberEx = this.lineRange.endLineNumberExclusive;
        let trimStartCount = 0;
        while (startLineNumber < endLineNumberEx && trimStartCount < this.newLines.length
            && this.newLines[trimStartCount] === initialValue.getLineAt(startLineNumber)) {
            startLineNumber++;
            trimStartCount++;
        }
        let trimEndCount = 0;
        while (startLineNumber < endLineNumberEx && trimEndCount + trimStartCount < this.newLines.length
            && this.newLines[this.newLines.length - 1 - trimEndCount] === initialValue.getLineAt(endLineNumberEx - 1)) {
            endLineNumberEx--;
            trimEndCount++;
        }
        if (trimStartCount === 0 && trimEndCount === 0) {
            return this;
        }
        return new SingleLineEdit(new LineRange(startLineNumber, endLineNumberEx), this.newLines.slice(trimStartCount, this.newLines.length - trimEndCount));
    }
    toLineEdit() {
        return new LineEdit([this]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL2xpbmVFZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDOUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDM0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDekMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNuQyxPQUFPLEVBQWdCLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHdkUsTUFBTSxPQUFPLFFBQVE7YUFDRyxVQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUF3QjtRQUNqRCxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFnQixFQUFFLFlBQTBCO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFB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