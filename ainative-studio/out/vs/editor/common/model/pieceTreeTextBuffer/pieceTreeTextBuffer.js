/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import * as strings from '../../../../base/common/strings.js';
import { Range } from '../../core/range.js';
import { ApplyEditsResult } from '../../model.js';
import { PieceTreeBase } from './pieceTreeBase.js';
import { countEOL } from '../../core/eolCounter.js';
import { TextChange } from '../../core/textChange.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class PieceTreeTextBuffer extends Disposable {
    constructor(chunks, BOM, eol, containsRTL, containsUnusualLineTerminators, isBasicASCII, eolNormalized) {
        super();
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._BOM = BOM;
        this._mightContainNonBasicASCII = !isBasicASCII;
        this._mightContainRTL = containsRTL;
        this._mightContainUnusualLineTerminators = containsUnusualLineTerminators;
        this._pieceTree = new PieceTreeBase(chunks, eol, eolNormalized);
    }
    // #region TextBuffer
    equals(other) {
        if (!(other instanceof PieceTreeTextBuffer)) {
            return false;
        }
        if (this._BOM !== other._BOM) {
            return false;
        }
        if (this.getEOL() !== other.getEOL()) {
            return false;
        }
        return this._pieceTree.equal(other._pieceTree);
    }
    mightContainRTL() {
        return this._mightContainRTL;
    }
    mightContainUnusualLineTerminators() {
        return this._mightContainUnusualLineTerminators;
    }
    resetMightContainUnusualLineTerminators() {
        this._mightContainUnusualLineTerminators = false;
    }
    mightContainNonBasicASCII() {
        return this._mightContainNonBasicASCII;
    }
    getBOM() {
        return this._BOM;
    }
    getEOL() {
        return this._pieceTree.getEOL();
    }
    createSnapshot(preserveBOM) {
        return this._pieceTree.createSnapshot(preserveBOM ? this._BOM : '');
    }
    getOffsetAt(lineNumber, column) {
        return this._pieceTree.getOffsetAt(lineNumber, column);
    }
    getPositionAt(offset) {
        return this._pieceTree.getPositionAt(offset);
    }
    getRangeAt(start, length) {
        const end = start + length;
        const startPosition = this.getPositionAt(start);
        const endPosition = this.getPositionAt(end);
        return new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
    }
    getValueInRange(range, eol = 0 /* EndOfLinePreference.TextDefined */) {
        if (range.isEmpty()) {
            return '';
        }
        const lineEnding = this._getEndOfLine(eol);
        return this._pieceTree.getValueInRange(range, lineEnding);
    }
    getValueLengthInRange(range, eol = 0 /* EndOfLinePreference.TextDefined */) {
        if (range.isEmpty()) {
            return 0;
        }
        if (range.startLineNumber === range.endLineNumber) {
            return (range.endColumn - range.startColumn);
        }
        const startOffset = this.getOffsetAt(range.startLineNumber, range.startColumn);
        const endOffset = this.getOffsetAt(range.endLineNumber, range.endColumn);
        // offsets use the text EOL, so we need to compensate for length differences
        // if the requested EOL doesn't match the text EOL
        let eolOffsetCompensation = 0;
        const desiredEOL = this._getEndOfLine(eol);
        const actualEOL = this.getEOL();
        if (desiredEOL.length !== actualEOL.length) {
            const delta = desiredEOL.length - actualEOL.length;
            const eolCount = range.endLineNumber - range.startLineNumber;
            eolOffsetCompensation = delta * eolCount;
        }
        return endOffset - startOffset + eolOffsetCompensation;
    }
    getCharacterCountInRange(range, eol = 0 /* EndOfLinePreference.TextDefined */) {
        if (this._mightContainNonBasicASCII) {
            // we must count by iterating
            let result = 0;
            const fromLineNumber = range.startLineNumber;
            const toLineNumber = range.endLineNumber;
            for (let lineNumber = fromLineNumber; lineNumber <= toLineNumber; lineNumber++) {
                const lineContent = this.getLineContent(lineNumber);
                const fromOffset = (lineNumber === fromLineNumber ? range.startColumn - 1 : 0);
                const toOffset = (lineNumber === toLineNumber ? range.endColumn - 1 : lineContent.length);
                for (let offset = fromOffset; offset < toOffset; offset++) {
                    if (strings.isHighSurrogate(lineContent.charCodeAt(offset))) {
                        result = result + 1;
                        offset = offset + 1;
                    }
                    else {
                        result = result + 1;
                    }
                }
            }
            result += this._getEndOfLine(eol).length * (toLineNumber - fromLineNumber);
            return result;
        }
        return this.getValueLengthInRange(range, eol);
    }
    getNearestChunk(offset) {
        return this._pieceTree.getNearestChunk(offset);
    }
    getLength() {
        return this._pieceTree.getLength();
    }
    getLineCount() {
        return this._pieceTree.getLineCount();
    }
    getLinesContent() {
        return this._pieceTree.getLinesContent();
    }
    getLineContent(lineNumber) {
        return this._pieceTree.getLineContent(lineNumber);
    }
    getLineCharCode(lineNumber, index) {
        return this._pieceTree.getLineCharCode(lineNumber, index);
    }
    getCharCode(offset) {
        return this._pieceTree.getCharCode(offset);
    }
    getLineLength(lineNumber) {
        return this._pieceTree.getLineLength(lineNumber);
    }
    getLineMinColumn(lineNumber) {
        return 1;
    }
    getLineMaxColumn(lineNumber) {
        return this.getLineLength(lineNumber) + 1;
    }
    getLineFirstNonWhitespaceColumn(lineNumber) {
        const result = strings.firstNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 1;
    }
    getLineLastNonWhitespaceColumn(lineNumber) {
        const result = strings.lastNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 2;
    }
    _getEndOfLine(eol) {
        switch (eol) {
            case 1 /* EndOfLinePreference.LF */:
                return '\n';
            case 2 /* EndOfLinePreference.CRLF */:
                return '\r\n';
            case 0 /* EndOfLinePreference.TextDefined */:
                return this.getEOL();
            default:
                throw new Error('Unknown EOL preference');
        }
    }
    setEOL(newEOL) {
        this._pieceTree.setEOL(newEOL);
    }
    applyEdits(rawOperations, recordTrimAutoWhitespace, computeUndoEdits) {
        let mightContainRTL = this._mightContainRTL;
        let mightContainUnusualLineTerminators = this._mightContainUnusualLineTerminators;
        let mightContainNonBasicASCII = this._mightContainNonBasicASCII;
        let canReduceOperations = true;
        let operations = [];
        for (let i = 0; i < rawOperations.length; i++) {
            const op = rawOperations[i];
            if (canReduceOperations && op._isTracked) {
                canReduceOperations = false;
            }
            const validatedRange = op.range;
            if (op.text) {
                let textMightContainNonBasicASCII = true;
                if (!mightContainNonBasicASCII) {
                    textMightContainNonBasicASCII = !strings.isBasicASCII(op.text);
                    mightContainNonBasicASCII = textMightContainNonBasicASCII;
                }
                if (!mightContainRTL && textMightContainNonBasicASCII) {
                    // check if the new inserted text contains RTL
                    mightContainRTL = strings.containsRTL(op.text);
                }
                if (!mightContainUnusualLineTerminators && textMightContainNonBasicASCII) {
                    // check if the new inserted text contains unusual line terminators
                    mightContainUnusualLineTerminators = strings.containsUnusualLineTerminators(op.text);
                }
            }
            let validText = '';
            let eolCount = 0;
            let firstLineLength = 0;
            let lastLineLength = 0;
            if (op.text) {
                let strEOL;
                [eolCount, firstLineLength, lastLineLength, strEOL] = countEOL(op.text);
                const bufferEOL = this.getEOL();
                const expectedStrEOL = (bufferEOL === '\r\n' ? 2 /* StringEOL.CRLF */ : 1 /* StringEOL.LF */);
                if (strEOL === 0 /* StringEOL.Unknown */ || strEOL === expectedStrEOL) {
                    validText = op.text;
                }
                else {
                    validText = op.text.replace(/\r\n|\r|\n/g, bufferEOL);
                }
            }
            operations[i] = {
                sortIndex: i,
                identifier: op.identifier || null,
                range: validatedRange,
                rangeOffset: this.getOffsetAt(validatedRange.startLineNumber, validatedRange.startColumn),
                rangeLength: this.getValueLengthInRange(validatedRange),
                text: validText,
                eolCount: eolCount,
                firstLineLength: firstLineLength,
                lastLineLength: lastLineLength,
                forceMoveMarkers: Boolean(op.forceMoveMarkers),
                isAutoWhitespaceEdit: op.isAutoWhitespaceEdit || false
            };
        }
        // Sort operations ascending
        operations.sort(PieceTreeTextBuffer._sortOpsAscending);
        let hasTouchingRanges = false;
        for (let i = 0, count = operations.length - 1; i < count; i++) {
            const rangeEnd = operations[i].range.getEndPosition();
            const nextRangeStart = operations[i + 1].range.getStartPosition();
            if (nextRangeStart.isBeforeOrEqual(rangeEnd)) {
                if (nextRangeStart.isBefore(rangeEnd)) {
                    // overlapping ranges
                    throw new Error('Overlapping ranges are not allowed!');
                }
                hasTouchingRanges = true;
            }
        }
        if (canReduceOperations) {
            operations = this._reduceOperations(operations);
        }
        // Delta encode operations
        const reverseRanges = (computeUndoEdits || recordTrimAutoWhitespace ? PieceTreeTextBuffer._getInverseEditRanges(operations) : []);
        const newTrimAutoWhitespaceCandidates = [];
        if (recordTrimAutoWhitespace) {
            for (let i = 0; i < operations.length; i++) {
                const op = operations[i];
                const reverseRange = reverseRanges[i];
                if (op.isAutoWhitespaceEdit && op.range.isEmpty()) {
                    // Record already the future line numbers that might be auto whitespace removal candidates on next edit
                    for (let lineNumber = reverseRange.startLineNumber; lineNumber <= reverseRange.endLineNumber; lineNumber++) {
                        let currentLineContent = '';
                        if (lineNumber === reverseRange.startLineNumber) {
                            currentLineContent = this.getLineContent(op.range.startLineNumber);
                            if (strings.firstNonWhitespaceIndex(currentLineContent) !== -1) {
                                continue;
                            }
                        }
                        newTrimAutoWhitespaceCandidates.push({ lineNumber: lineNumber, oldContent: currentLineContent });
                    }
                }
            }
        }
        let reverseOperations = null;
        if (computeUndoEdits) {
            let reverseRangeDeltaOffset = 0;
            reverseOperations = [];
            for (let i = 0; i < operations.length; i++) {
                const op = operations[i];
                const reverseRange = reverseRanges[i];
                const bufferText = this.getValueInRange(op.range);
                const reverseRangeOffset = op.rangeOffset + reverseRangeDeltaOffset;
                reverseRangeDeltaOffset += (op.text.length - bufferText.length);
                reverseOperations[i] = {
                    sortIndex: op.sortIndex,
                    identifier: op.identifier,
                    range: reverseRange,
                    text: bufferText,
                    textChange: new TextChange(op.rangeOffset, bufferText, reverseRangeOffset, op.text)
                };
            }
            // Can only sort reverse operations when the order is not significant
            if (!hasTouchingRanges) {
                reverseOperations.sort((a, b) => a.sortIndex - b.sortIndex);
            }
        }
        this._mightContainRTL = mightContainRTL;
        this._mightContainUnusualLineTerminators = mightContainUnusualLineTerminators;
        this._mightContainNonBasicASCII = mightContainNonBasicASCII;
        const contentChanges = this._doApplyEdits(operations);
        let trimAutoWhitespaceLineNumbers = null;
        if (recordTrimAutoWhitespace && newTrimAutoWhitespaceCandidates.length > 0) {
            // sort line numbers auto whitespace removal candidates for next edit descending
            newTrimAutoWhitespaceCandidates.sort((a, b) => b.lineNumber - a.lineNumber);
            trimAutoWhitespaceLineNumbers = [];
            for (let i = 0, len = newTrimAutoWhitespaceCandidates.length; i < len; i++) {
                const lineNumber = newTrimAutoWhitespaceCandidates[i].lineNumber;
                if (i > 0 && newTrimAutoWhitespaceCandidates[i - 1].lineNumber === lineNumber) {
                    // Do not have the same line number twice
                    continue;
                }
                const prevContent = newTrimAutoWhitespaceCandidates[i].oldContent;
                const lineContent = this.getLineContent(lineNumber);
                if (lineContent.length === 0 || lineContent === prevContent || strings.firstNonWhitespaceIndex(lineContent) !== -1) {
                    continue;
                }
                trimAutoWhitespaceLineNumbers.push(lineNumber);
            }
        }
        this._onDidChangeContent.fire();
        return new ApplyEditsResult(reverseOperations, contentChanges, trimAutoWhitespaceLineNumbers);
    }
    /**
     * Transform operations such that they represent the same logic edit,
     * but that they also do not cause OOM crashes.
     */
    _reduceOperations(operations) {
        if (operations.length < 1000) {
            // We know from empirical testing that a thousand edits work fine regardless of their shape.
            return operations;
        }
        // At one point, due to how events are emitted and how each operation is handled,
        // some operations can trigger a high amount of temporary string allocations,
        // that will immediately get edited again.
        // e.g. a formatter inserting ridiculous ammounts of \n on a model with a single line
        // Therefore, the strategy is to collapse all the operations into a huge single edit operation
        return [this._toSingleEditOperation(operations)];
    }
    _toSingleEditOperation(operations) {
        let forceMoveMarkers = false;
        const firstEditRange = operations[0].range;
        const lastEditRange = operations[operations.length - 1].range;
        const entireEditRange = new Range(firstEditRange.startLineNumber, firstEditRange.startColumn, lastEditRange.endLineNumber, lastEditRange.endColumn);
        let lastEndLineNumber = firstEditRange.startLineNumber;
        let lastEndColumn = firstEditRange.startColumn;
        const result = [];
        for (let i = 0, len = operations.length; i < len; i++) {
            const operation = operations[i];
            const range = operation.range;
            forceMoveMarkers = forceMoveMarkers || operation.forceMoveMarkers;
            // (1) -- Push old text
            result.push(this.getValueInRange(new Range(lastEndLineNumber, lastEndColumn, range.startLineNumber, range.startColumn)));
            // (2) -- Push new text
            if (operation.text.length > 0) {
                result.push(operation.text);
            }
            lastEndLineNumber = range.endLineNumber;
            lastEndColumn = range.endColumn;
        }
        const text = result.join('');
        const [eolCount, firstLineLength, lastLineLength] = countEOL(text);
        return {
            sortIndex: 0,
            identifier: operations[0].identifier,
            range: entireEditRange,
            rangeOffset: this.getOffsetAt(entireEditRange.startLineNumber, entireEditRange.startColumn),
            rangeLength: this.getValueLengthInRange(entireEditRange, 0 /* EndOfLinePreference.TextDefined */),
            text: text,
            eolCount: eolCount,
            firstLineLength: firstLineLength,
            lastLineLength: lastLineLength,
            forceMoveMarkers: forceMoveMarkers,
            isAutoWhitespaceEdit: false
        };
    }
    _doApplyEdits(operations) {
        operations.sort(PieceTreeTextBuffer._sortOpsDescending);
        const contentChanges = [];
        // operations are from bottom to top
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const startLineNumber = op.range.startLineNumber;
            const startColumn = op.range.startColumn;
            const endLineNumber = op.range.endLineNumber;
            const endColumn = op.range.endColumn;
            if (startLineNumber === endLineNumber && startColumn === endColumn && op.text.length === 0) {
                // no-op
                continue;
            }
            if (op.text) {
                // replacement
                this._pieceTree.delete(op.rangeOffset, op.rangeLength);
                this._pieceTree.insert(op.rangeOffset, op.text, true);
            }
            else {
                // deletion
                this._pieceTree.delete(op.rangeOffset, op.rangeLength);
            }
            const contentChangeRange = new Range(startLineNumber, startColumn, endLineNumber, endColumn);
            contentChanges.push({
                range: contentChangeRange,
                rangeLength: op.rangeLength,
                text: op.text,
                rangeOffset: op.rangeOffset,
                forceMoveMarkers: op.forceMoveMarkers
            });
        }
        return contentChanges;
    }
    findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount) {
        return this._pieceTree.findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount);
    }
    // #endregion
    // #region helper
    // testing purpose.
    getPieceTree() {
        return this._pieceTree;
    }
    static _getInverseEditRange(range, text) {
        const startLineNumber = range.startLineNumber;
        const startColumn = range.startColumn;
        const [eolCount, firstLineLength, lastLineLength] = countEOL(text);
        let resultRange;
        if (text.length > 0) {
            // the operation inserts something
            const lineCount = eolCount + 1;
            if (lineCount === 1) {
                // single line insert
                resultRange = new Range(startLineNumber, startColumn, startLineNumber, startColumn + firstLineLength);
            }
            else {
                // multi line insert
                resultRange = new Range(startLineNumber, startColumn, startLineNumber + lineCount - 1, lastLineLength + 1);
            }
        }
        else {
            // There is nothing to insert
            resultRange = new Range(startLineNumber, startColumn, startLineNumber, startColumn);
        }
        return resultRange;
    }
    /**
     * Assumes `operations` are validated and sorted ascending
     */
    static _getInverseEditRanges(operations) {
        const result = [];
        let prevOpEndLineNumber = 0;
        let prevOpEndColumn = 0;
        let prevOp = null;
        for (let i = 0, len = operations.length; i < len; i++) {
            const op = operations[i];
            let startLineNumber;
            let startColumn;
            if (prevOp) {
                if (prevOp.range.endLineNumber === op.range.startLineNumber) {
                    startLineNumber = prevOpEndLineNumber;
                    startColumn = prevOpEndColumn + (op.range.startColumn - prevOp.range.endColumn);
                }
                else {
                    startLineNumber = prevOpEndLineNumber + (op.range.startLineNumber - prevOp.range.endLineNumber);
                    startColumn = op.range.startColumn;
                }
            }
            else {
                startLineNumber = op.range.startLineNumber;
                startColumn = op.range.startColumn;
            }
            let resultRange;
            if (op.text.length > 0) {
                // the operation inserts something
                const lineCount = op.eolCount + 1;
                if (lineCount === 1) {
                    // single line insert
                    resultRange = new Range(startLineNumber, startColumn, startLineNumber, startColumn + op.firstLineLength);
                }
                else {
                    // multi line insert
                    resultRange = new Range(startLineNumber, startColumn, startLineNumber + lineCount - 1, op.lastLineLength + 1);
                }
            }
            else {
                // There is nothing to insert
                resultRange = new Range(startLineNumber, startColumn, startLineNumber, startColumn);
            }
            prevOpEndLineNumber = resultRange.endLineNumber;
            prevOpEndColumn = resultRange.endColumn;
            result.push(resultRange);
            prevOp = op;
        }
        return result;
    }
    static _sortOpsAscending(a, b) {
        const r = Range.compareRangesUsingEnds(a.range, b.range);
        if (r === 0) {
            return a.sortIndex - b.sortIndex;
        }
        return r;
    }
    static _sortOpsDescending(a, b) {
        const r = Range.compareRangesUsingEnds(a.range, b.range);
        if (r === 0) {
            return b.sortIndex - a.sortIndex;
        }
        return -r;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGllY2VUcmVlVGV4dEJ1ZmZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3BpZWNlVHJlZVRleHRCdWZmZXIvcGllY2VUcmVlVGV4dEJ1ZmZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDNUMsT0FBTyxFQUFFLGdCQUFnQixFQUF5TCxNQUFNLGdCQUFnQixDQUFDO0FBQ3pPLE9BQU8sRUFBRSxhQUFhLEVBQWdCLE1BQU0sb0JBQW9CLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBYSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFvQmxFLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxVQUFVO0lBVWxELFlBQVksTUFBc0IsRUFBRSxHQUFXLEVBQUUsR0FBa0IsRUFBRSxXQUFvQixFQUFFLDhCQUF1QyxFQUFFLFlBQXFCLEVBQUUsYUFBc0I7UUFDaEwsS0FBSyxFQUFFLENBQUM7UUFKUSx3QkFBbUIsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDMUUsdUJBQWtCLEdBQWdCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUM7UUFJaEYsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7UUFDaEIsSUFBSSxDQUFDLDBCQUEwQixHQUFH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