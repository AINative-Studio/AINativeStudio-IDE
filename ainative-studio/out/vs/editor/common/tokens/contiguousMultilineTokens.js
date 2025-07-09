/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { readUInt32BE, writeUInt32BE } from '../../../base/common/buffer.js';
import { Position } from '../core/position.js';
import { countEOL } from '../core/eolCounter.js';
import { ContiguousTokensEditing } from './contiguousTokensEditing.js';
import { LineRange } from '../core/lineRange.js';
/**
 * Represents contiguous tokens over a contiguous range of lines.
 */
export class ContiguousMultilineTokens {
    static deserialize(buff, offset, result) {
        const view32 = new Uint32Array(buff.buffer);
        const startLineNumber = readUInt32BE(buff, offset);
        offset += 4;
        const count = readUInt32BE(buff, offset);
        offset += 4;
        const tokens = [];
        for (let i = 0; i < count; i++) {
            const byteCount = readUInt32BE(buff, offset);
            offset += 4;
            tokens.push(view32.subarray(offset / 4, offset / 4 + byteCount / 4));
            offset += byteCount;
        }
        result.push(new ContiguousMultilineTokens(startLineNumber, tokens));
        return offset;
    }
    /**
     * (Inclusive) start line number for these tokens.
     */
    get startLineNumber() {
        return this._startLineNumber;
    }
    /**
     * (Inclusive) end line number for these tokens.
     */
    get endLineNumber() {
        return this._startLineNumber + this._tokens.length - 1;
    }
    constructor(startLineNumber, tokens) {
        this._startLineNumber = startLineNumber;
        this._tokens = tokens;
    }
    getLineRange() {
        return new LineRange(this._startLineNumber, this._startLineNumber + this._tokens.length);
    }
    /**
     * @see {@link _tokens}
     */
    getLineTokens(lineNumber) {
        return this._tokens[lineNumber - this._startLineNumber];
    }
    appendLineTokens(lineTokens) {
        this._tokens.push(lineTokens);
    }
    serializeSize() {
        let result = 0;
        result += 4; // 4 bytes for the start line number
        result += 4; // 4 bytes for the line count
        for (let i = 0; i < this._tokens.length; i++) {
            const lineTokens = this._tokens[i];
            if (!(lineTokens instanceof Uint32Array)) {
                throw new Error(`Not supported!`);
            }
            result += 4; // 4 bytes for the byte count
            result += lineTokens.byteLength;
        }
        return result;
    }
    serialize(destination, offset) {
        writeUInt32BE(destination, this._startLineNumber, offset);
        offset += 4;
        writeUInt32BE(destination, this._tokens.length, offset);
        offset += 4;
        for (let i = 0; i < this._tokens.length; i++) {
            const lineTokens = this._tokens[i];
            if (!(lineTokens instanceof Uint32Array)) {
                throw new Error(`Not supported!`);
            }
            writeUInt32BE(destination, lineTokens.byteLength, offset);
            offset += 4;
            destination.set(new Uint8Array(lineTokens.buffer), offset);
            offset += lineTokens.byteLength;
        }
        return offset;
    }
    applyEdit(range, text) {
        const [eolCount, firstLineLength] = countEOL(text);
        this._acceptDeleteRange(range);
        this._acceptInsertText(new Position(range.startLineNumber, range.startColumn), eolCount, firstLineLength);
    }
    _acceptDeleteRange(range) {
        if (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn) {
            // Nothing to delete
            return;
        }
        const firstLineIndex = range.startLineNumber - this._startLineNumber;
        const lastLineIndex = range.endLineNumber - this._startLineNumber;
        if (lastLineIndex < 0) {
            // this deletion occurs entirely before this block, so we only need to adjust line numbers
            const deletedLinesCount = lastLineIndex - firstLineIndex;
            this._startLineNumber -= deletedLinesCount;
            return;
        }
        if (firstLineIndex >= this._tokens.length) {
            // this deletion occurs entirely after this block, so there is nothing to do
            return;
        }
        if (firstLineIndex < 0 && lastLineIndex >= this._tokens.length) {
            // this deletion completely encompasses this block
            this._startLineNumber = 0;
            this._tokens = [];
            return;
        }
        if (firstLineIndex === lastLineIndex) {
            // a delete on a single line
            this._tokens[firstLineIndex] = ContiguousTokensEditing.delete(this._tokens[firstLineIndex], range.startColumn - 1, range.endColumn - 1);
            return;
        }
        if (firstLineIndex >= 0) {
            // The first line survives
            this._tokens[firstLineIndex] = ContiguousTokensEditing.deleteEnding(this._tokens[firstLineIndex], range.startColumn - 1);
            if (lastLineIndex < this._tokens.length) {
                // The last line survives
                const lastLineTokens = ContiguousTokensEditing.deleteBeginning(this._tokens[lastLineIndex], range.endColumn - 1);
                // Take remaining text on last line and append it to remaining text on first line
                this._tokens[firstLineIndex] = ContiguousTokensEditing.append(this._tokens[firstLineIndex], lastLineTokens);
                // Delete middle lines
                this._tokens.splice(firstLineIndex + 1, lastLineIndex - firstLineIndex);
            }
            else {
                // The last line does not survive
                // Take remaining text on last line and append it to remaining text on first line
                this._tokens[firstLineIndex] = ContiguousTokensEditing.append(this._tokens[firstLineIndex], null);
                // Delete lines
                this._tokens = this._tokens.slice(0, firstLineIndex + 1);
            }
        }
        else {
            // The first line does not survive
            const deletedBefore = -firstLineIndex;
            this._startLineNumber -= deletedBefore;
            // Remove beginning from last line
            this._tokens[lastLineIndex] = ContiguousTokensEditing.deleteBeginning(this._tokens[lastLineIndex], range.endColumn - 1);
            // Delete lines
            this._tokens = this._tokens.slice(lastLineIndex);
        }
    }
    _acceptInsertText(position, eolCount, firstLineLength) {
        if (eolCount === 0 && firstLineLength === 0) {
            // Nothing to insert
            return;
        }
        const lineIndex = position.lineNumber - this._startLineNumber;
        if (lineIndex < 0) {
            // this insertion occurs before this block, so we only need to adjust line numbers
            this._startLineNumber += eolCount;
            return;
        }
        if (lineIndex >= this._tokens.length) {
            // this insertion occurs after this block, so there is nothing to do
            return;
        }
        if (eolCount === 0) {
            // Inserting text on one line
            this._tokens[lineIndex] = ContiguousTokensEditing.insert(this._tokens[lineIndex], position.column - 1, firstLineLength);
            return;
        }
        this._tokens[lineIndex] = ContiguousTokensEditing.deleteEnding(this._tokens[lineIndex], position.column - 1);
        this._tokens[lineIndex] = ContiguousTokensEditing.insert(this._tokens[lineIndex], position.column - 1, firstLineLength);
        this._insertLines(position.lineNumber, eolCount);
    }
    _insertLines(insertIndex, insertCount) {
        if (insertCount === 0) {
            return;
        }
        const lineTokens = [];
        for (let i = 0; i < insertCount; i++) {
            lineTokens[i] = null;
        }
        this._tokens = arrays.arrayInsert(this._tokens, insertIndex, lineTokens);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGlndW91c011bHRpbGluZVRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3Rva2Vucy9jb250aWd1b3VzTXVsdGlsaW5lVG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVqRDs7R0FFRztBQUNILE1BQU0sT0FBTyx5QkFBeUI7SUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFnQixFQUFFLE1BQWMsRUFBRSxNQUFtQztRQUM5RixNQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUMsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFDaEUsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxNQUFNLEdBQWtCLEVBQUUsQ0FBQztRQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENB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