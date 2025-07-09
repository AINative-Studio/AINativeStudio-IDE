/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { countEOL } from '../core/eolCounter.js';
/**
 * Represents sparse tokens over a contiguous range of lines.
 */
export class SparseMultilineTokens {
    static create(startLineNumber, tokens) {
        return new SparseMultilineTokens(startLineNumber, new SparseMultilineTokensStorage(tokens));
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
        return this._endLineNumber;
    }
    constructor(startLineNumber, tokens) {
        this._startLineNumber = startLineNumber;
        this._tokens = tokens;
        this._endLineNumber = this._startLineNumber + this._tokens.getMaxDeltaLine();
    }
    toString() {
        return this._tokens.toString(this._startLineNumber);
    }
    _updateEndLineNumber() {
        this._endLineNumber = this._startLineNumber + this._tokens.getMaxDeltaLine();
    }
    isEmpty() {
        return this._tokens.isEmpty();
    }
    getLineTokens(lineNumber) {
        if (this._startLineNumber <= lineNumber && lineNumber <= this._endLineNumber) {
            return this._tokens.getLineTokens(lineNumber - this._startLineNumber);
        }
        return null;
    }
    getRange() {
        const deltaRange = this._tokens.getRange();
        if (!deltaRange) {
            return deltaRange;
        }
        return new Range(this._startLineNumber + deltaRange.startLineNumber, deltaRange.startColumn, this._startLineNumber + deltaRange.endLineNumber, deltaRange.endColumn);
    }
    removeTokens(range) {
        const startLineIndex = range.startLineNumber - this._startLineNumber;
        const endLineIndex = range.endLineNumber - this._startLineNumber;
        this._startLineNumber += this._tokens.removeTokens(startLineIndex, range.startColumn - 1, endLineIndex, range.endColumn - 1);
        this._updateEndLineNumber();
    }
    split(range) {
        // split tokens to two:
        // a) all the tokens before `range`
        // b) all the tokens after `range`
        const startLineIndex = range.startLineNumber - this._startLineNumber;
        const endLineIndex = range.endLineNumber - this._startLineNumber;
        const [a, b, bDeltaLine] = this._tokens.split(startLineIndex, range.startColumn - 1, endLineIndex, range.endColumn - 1);
        return [new SparseMultilineTokens(this._startLineNumber, a), new SparseMultilineTokens(this._startLineNumber + bDeltaLine, b)];
    }
    applyEdit(range, text) {
        const [eolCount, firstLineLength, lastLineLength] = countEOL(text);
        this.acceptEdit(range, eolCount, firstLineLength, lastLineLength, text.length > 0 ? text.charCodeAt(0) : 0 /* CharCode.Null */);
    }
    acceptEdit(range, eolCount, firstLineLength, lastLineLength, firstCharCode) {
        this._acceptDeleteRange(range);
        this._acceptInsertText(new Position(range.startLineNumber, range.startColumn), eolCount, firstLineLength, lastLineLength, firstCharCode);
        this._updateEndLineNumber();
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
        const tokenMaxDeltaLine = this._tokens.getMaxDeltaLine();
        if (firstLineIndex >= tokenMaxDeltaLine + 1) {
            // this deletion occurs entirely after this block, so there is nothing to do
            return;
        }
        if (firstLineIndex < 0 && lastLineIndex >= tokenMaxDeltaLine + 1) {
            // this deletion completely encompasses this block
            this._startLineNumber = 0;
            this._tokens.clear();
            return;
        }
        if (firstLineIndex < 0) {
            const deletedBefore = -firstLineIndex;
            this._startLineNumber -= deletedBefore;
            this._tokens.acceptDeleteRange(range.startColumn - 1, 0, 0, lastLineIndex, range.endColumn - 1);
        }
        else {
            this._tokens.acceptDeleteRange(0, firstLineIndex, range.startColumn - 1, lastLineIndex, range.endColumn - 1);
        }
    }
    _acceptInsertText(position, eolCount, firstLineLength, lastLineLength, firstCharCode) {
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
        const tokenMaxDeltaLine = this._tokens.getMaxDeltaLine();
        if (lineIndex >= tokenMaxDeltaLine + 1) {
            // this insertion occurs after this block, so there is nothing to do
            return;
        }
        this._tokens.acceptInsertText(lineIndex, position.column - 1, eolCount, firstLineLength, lastLineLength, firstCharCode);
    }
}
class SparseMultilineTokensStorage {
    constructor(tokens) {
        this._tokens = tokens;
        this._tokenCount = tokens.length / 4;
    }
    toString(startLineNumber) {
        const pieces = [];
        for (let i = 0; i < this._tokenCount; i++) {
            pieces.push(`(${this._getDeltaLine(i) + startLineNumber},${this._getStartCharacter(i)}-${this._getEndCharacter(i)})`);
        }
        return `[${pieces.join(',')}]`;
    }
    getMaxDeltaLine() {
        const tokenCount = this._getTokenCount();
        if (tokenCount === 0) {
            return -1;
        }
        return this._getDeltaLine(tokenCount - 1);
    }
    getRange() {
        const tokenCount = this._getTokenCount();
        if (tokenCount === 0) {
            return null;
        }
        const startChar = this._getStartCharacter(0);
        const maxDeltaLine = this._getDeltaLine(tokenCount - 1);
        const endChar = this._getEndCharacter(tokenCount - 1);
        return new Range(0, startChar + 1, maxDeltaLine, endChar + 1);
    }
    _getTokenCount() {
        return this._tokenCount;
    }
    _getDeltaLine(tokenIndex) {
        return this._tokens[4 * tokenIndex];
    }
    _getStartCharacter(tokenIndex) {
        return this._tokens[4 * tokenIndex + 1];
    }
    _getEndCharacter(tokenIndex) {
        return this._tokens[4 * tokenIndex + 2];
    }
    isEmpty() {
        return (this._getTokenCount() === 0);
    }
    getLineTokens(deltaLine) {
        let low = 0;
        let high = this._getTokenCount() - 1;
        while (low < high) {
            const mid = low + Math.floor((high - low) / 2);
            const midDeltaLine = this._getDeltaLine(mid);
            if (midDeltaLine < deltaLine) {
                low = mid + 1;
            }
            else if (midDeltaLine > deltaLine) {
                high = mid - 1;
            }
            else {
                let min = mid;
                while (min > low && this._getDeltaLine(min - 1) === deltaLine) {
                    min--;
                }
                let max = mid;
                while (max < high && this._getDeltaLine(max + 1) === deltaLine) {
                    max++;
                }
                return new SparseLineTokens(this._tokens.subarray(4 * min, 4 * max + 4));
            }
        }
        if (this._getDeltaLine(low) === deltaLine) {
            return new SparseLineTokens(this._tokens.subarray(4 * low, 4 * low + 4));
        }
        return null;
    }
    clear() {
        this._tokenCount = 0;
    }
    removeTokens(startDeltaLine, startChar, endDeltaLine, endChar) {
        const tokens = this._tokens;
        const tokenCount = this._tokenCount;
        let newTokenCount = 0;
        let hasDeletedTokens = false;
        let firstDeltaLine = 0;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 4 * i;
            const tokenDeltaLine = tokens[srcOffset];
            const tokenStartCharacter = tokens[srcOffset + 1];
            const tokenEndCharacter = tokens[srcOffset + 2];
            const tokenMetadata = tokens[srcOffset + 3];
            if ((tokenDeltaLine > startDeltaLine || (tokenDeltaLine === startDeltaLine && tokenEndCharacter >= startChar))
                && (tokenDeltaLine < endDeltaLine || (tokenDeltaLine === endDeltaLine && tokenStartCharacter <= endChar))) {
                hasDeletedTokens = true;
            }
            else {
                if (newTokenCount === 0) {
                    firstDeltaLine = tokenDeltaLine;
                }
                if (hasDeletedTokens) {
                    // must move the token to the left
                    const destOffset = 4 * newTokenCount;
                    tokens[destOffset] = tokenDeltaLine - firstDeltaLine;
                    tokens[destOffset + 1] = tokenStartCharacter;
                    tokens[destOffset + 2] = tokenEndCharacter;
                    tokens[destOffset + 3] = tokenMetadata;
                }
                newTokenCount++;
            }
        }
        this._tokenCount = newTokenCount;
        return firstDeltaLine;
    }
    split(startDeltaLine, startChar, endDeltaLine, endChar) {
        const tokens = this._tokens;
        const tokenCount = this._tokenCount;
        const aTokens = [];
        const bTokens = [];
        let destTokens = aTokens;
        let destOffset = 0;
        let destFirstDeltaLine = 0;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 4 * i;
            const tokenDeltaLine = tokens[srcOffset];
            const tokenStartCharacter = tokens[srcOffset + 1];
            const tokenEndCharacter = tokens[srcOffset + 2];
            const tokenMetadata = tokens[srcOffset + 3];
            if ((tokenDeltaLine > startDeltaLine || (tokenDeltaLine === startDeltaLine && tokenEndCharacter >= startChar))) {
                if ((tokenDeltaLine < endDeltaLine || (tokenDeltaLine === endDeltaLine && tokenStartCharacter <= endChar))) {
                    // this token is touching the range
                    continue;
                }
                else {
                    // this token is after the range
                    if (destTokens !== bTokens) {
                        // this token is the first token after the range
                        destTokens = bTokens;
                        destOffset = 0;
                        destFirstDeltaLine = tokenDeltaLine;
                    }
                }
            }
            destTokens[destOffset++] = tokenDeltaLine - destFirstDeltaLine;
            destTokens[destOffset++] = tokenStartCharacter;
            destTokens[destOffset++] = tokenEndCharacter;
            destTokens[destOffset++] = tokenMetadata;
        }
        return [new SparseMultilineTokensStorage(new Uint32Array(aTokens)), new SparseMultilineTokensStorage(new Uint32Array(bTokens)), destFirstDeltaLine];
    }
    acceptDeleteRange(horizontalShiftForFirstLineTokens, startDeltaLine, startCharacter, endDeltaLine, endCharacter) {
        // This is a bit complex, here are the cases I used to think about this:
        //
        // 1. The token starts before the deletion range
        // 1a. The token is completely before the deletion range
        //               -----------
        //                          xxxxxxxxxxx
        // 1b. The token starts before, the deletion range ends after the token
        //               -----------
        //                      xxxxxxxxxxx
        // 1c. The token starts before, the deletion range ends precisely with the token
        //               ---------------
        //                      xxxxxxxx
        // 1d. The token starts before, the deletion range is inside the token
        //               ---------------
        //                    xxxxx
        //
        // 2. The token starts at the same position with the deletion range
        // 2a. The token starts at the same position, and ends inside the deletion range
        //               -------
        //               xxxxxxxxxxx
        // 2b. The token starts at the same position, and ends at the same position as the deletion range
        //               ----------
        //               xxxxxxxxxx
        // 2c. The token starts at the same position, and ends after the deletion range
        //               -------------
        //               xxxxxxx
        //
        // 3. The token starts inside the deletion range
        // 3a. The token is inside the deletion range
        //                -------
        //             xxxxxxxxxxxxx
        // 3b. The token starts inside the deletion range, and ends at the same position as the deletion range
        //                ----------
        //             xxxxxxxxxxxxx
        // 3c. The token starts inside the deletion range, and ends after the deletion range
        //                ------------
        //             xxxxxxxxxxx
        //
        // 4. The token starts after the deletion range
        //                  -----------
        //          xxxxxxxx
        //
        const tokens = this._tokens;
        const tokenCount = this._tokenCount;
        const deletedLineCount = (endDeltaLine - startDeltaLine);
        let newTokenCount = 0;
        let hasDeletedTokens = false;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 4 * i;
            let tokenDeltaLine = tokens[srcOffset];
            let tokenStartCharacter = tokens[srcOffset + 1];
            let tokenEndCharacter = tokens[srcOffset + 2];
            const tokenMetadata = tokens[srcOffset + 3];
            if (tokenDeltaLine < startDeltaLine || (tokenDeltaLine === startDeltaLine && tokenEndCharacter <= startCharacter)) {
                // 1a. The token is completely before the deletion range
                // => nothing to do
                newTokenCount++;
                continue;
            }
            else if (tokenDeltaLine === startDeltaLine && tokenStartCharacter < startCharacter) {
                // 1b, 1c, 1d
                // => the token survives, but it needs to shrink
                if (tokenDeltaLine === endDeltaLine && tokenEndCharacter > endCharacter) {
                    // 1d. The token starts before, the deletion range is inside the token
                    // => the token shrinks by the deletion character count
                    tokenEndCharacter -= (endCharacter - startCharacter);
                }
                else {
                    // 1b. The token starts before, the deletion range ends after the token
                    // 1c. The token starts before, the deletion range ends precisely with the token
                    // => the token shrinks its ending to the deletion start
                    tokenEndCharacter = startCharacter;
                }
            }
            else if (tokenDeltaLine === startDeltaLine && tokenStartCharacter === startCharacter) {
                // 2a, 2b, 2c
                if (tokenDeltaLine === endDeltaLine && tokenEndCharacter > endCharacter) {
                    // 2c. The token starts at the same position, and ends after the deletion range
                    // => the token shrinks by the deletion character count
                    tokenEndCharacter -= (endCharacter - startCharacter);
                }
                else {
                    // 2a. The token starts at the same position, and ends inside the deletion range
                    // 2b. The token starts at the same position, and ends at the same position as the deletion range
                    // => the token is deleted
                    hasDeletedTokens = true;
                    continue;
                }
            }
            else if (tokenDeltaLine < endDeltaLine || (tokenDeltaLine === endDeltaLine && tokenStartCharacter < endCharacter)) {
                // 3a, 3b, 3c
                if (tokenDeltaLine === endDeltaLine && tokenEndCharacter > endCharacter) {
                    // 3c. The token starts inside the deletion range, and ends after the deletion range
                    // => the token moves to continue right after the deletion
                    tokenDeltaLine = startDeltaLine;
                    tokenStartCharacter = startCharacter;
                    tokenEndCharacter = tokenStartCharacter + (tokenEndCharacter - endCharacter);
                }
                else {
                    // 3a. The token is inside the deletion range
                    // 3b. The token starts inside the deletion range, and ends at the same position as the deletion range
                    // => the token is deleted
                    hasDeletedTokens = true;
                    continue;
                }
            }
            else if (tokenDeltaLine > endDeltaLine) {
                // 4. (partial) The token starts after the deletion range, on a line below...
                if (deletedLineCount === 0 && !hasDeletedTokens) {
                    // early stop, there is no need to walk all the tokens and do nothing...
                    newTokenCount = tokenCount;
                    break;
                }
                tokenDeltaLine -= deletedLineCount;
            }
            else if (tokenDeltaLine === endDeltaLine && tokenStartCharacter >= endCharacter) {
                // 4. (continued) The token starts after the deletion range, on the last line where a deletion occurs
                if (horizontalShiftForFirstLineTokens && tokenDeltaLine === 0) {
                    tokenStartCharacter += horizontalShiftForFirstLineTokens;
                    tokenEndCharacter += horizontalShiftForFirstLineTokens;
                }
                tokenDeltaLine -= deletedLineCount;
                tokenStartCharacter -= (endCharacter - startCharacter);
                tokenEndCharacter -= (endCharacter - startCharacter);
            }
            else {
                throw new Error(`Not possible!`);
            }
            const destOffset = 4 * newTokenCount;
            tokens[destOffset] = tokenDeltaLine;
            tokens[destOffset + 1] = tokenStartCharacter;
            tokens[destOffset + 2] = tokenEndCharacter;
            tokens[destOffset + 3] = tokenMetadata;
            newTokenCount++;
        }
        this._tokenCount = newTokenCount;
    }
    acceptInsertText(deltaLine, character, eolCount, firstLineLength, lastLineLength, firstCharCode) {
        // Here are the cases I used to think about this:
        //
        // 1. The token is completely before the insertion point
        //            -----------   |
        // 2. The token ends precisely at the insertion point
        //            -----------|
        // 3. The token contains the insertion point
        //            -----|------
        // 4. The token starts precisely at the insertion point
        //            |-----------
        // 5. The token is completely after the insertion point
        //            |   -----------
        //
        const isInsertingPreciselyOneWordCharacter = (eolCount === 0
            && firstLineLength === 1
            && ((firstCharCode >= 48 /* CharCode.Digit0 */ && firstCharCode <= 57 /* CharCode.Digit9 */)
                || (firstCharCode >= 65 /* CharCode.A */ && firstCharCode <= 90 /* CharCode.Z */)
                || (firstCharCode >= 97 /* CharCode.a */ && firstCharCode <= 122 /* CharCode.z */)));
        const tokens = this._tokens;
        const tokenCount = this._tokenCount;
        for (let i = 0; i < tokenCount; i++) {
            const offset = 4 * i;
            let tokenDeltaLine = tokens[offset];
            let tokenStartCharacter = tokens[offset + 1];
            let tokenEndCharacter = tokens[offset + 2];
            if (tokenDeltaLine < deltaLine || (tokenDeltaLine === deltaLine && tokenEndCharacter < character)) {
                // 1. The token is completely before the insertion point
                // => nothing to do
                continue;
            }
            else if (tokenDeltaLine === deltaLine && tokenEndCharacter === character) {
                // 2. The token ends precisely at the insertion point
                // => expand the end character only if inserting precisely one character that is a word character
                if (isInsertingPreciselyOneWordCharacter) {
                    tokenEndCharacter += 1;
                }
                else {
                    continue;
                }
            }
            else if (tokenDeltaLine === deltaLine && tokenStartCharacter < character && character < tokenEndCharacter) {
                // 3. The token contains the insertion point
                if (eolCount === 0) {
                    // => just expand the end character
                    tokenEndCharacter += firstLineLength;
                }
                else {
                    // => cut off the token
                    tokenEndCharacter = character;
                }
            }
            else {
                // 4. or 5.
                if (tokenDeltaLine === deltaLine && tokenStartCharacter === character) {
                    // 4. The token starts precisely at the insertion point
                    // => grow the token (by keeping its start constant) only if inserting precisely one character that is a word character
                    // => otherwise behave as in case 5.
                    if (isInsertingPreciselyOneWordCharacter) {
                        continue;
                    }
                }
                // => the token must move and keep its size constant
                if (tokenDeltaLine === deltaLine) {
                    tokenDeltaLine += eolCount;
                    // this token is on the line where the insertion is taking place
                    if (eolCount === 0) {
                        tokenStartCharacter += firstLineLength;
                        tokenEndCharacter += firstLineLength;
                    }
                    else {
                        const tokenLength = tokenEndCharacter - tokenStartCharacter;
                        tokenStartCharacter = lastLineLength + (tokenStartCharacter - character);
                        tokenEndCharacter = tokenStartCharacter + tokenLength;
                    }
                }
                else {
                    tokenDeltaLine += eolCount;
                }
            }
            tokens[offset] = tokenDeltaLine;
            tokens[offset + 1] = tokenStartCharacter;
            tokens[offset + 2] = tokenEndCharacter;
        }
    }
}
export class SparseLineTokens {
    constructor(tokens) {
        this._tokens = tokens;
    }
    getCount() {
        return this._tokens.length / 4;
    }
    getStartCharacter(tokenIndex) {
        return this._tokens[4 * tokenIndex + 1];
    }
    getEndCharacter(tokenIndex) {
        return this._tokens[4 * tokenIndex + 2];
    }
    getMetadata(tokenIndex) {
        return this._tokens[4 * tokenIndex + 3];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BhcnNlTXVsdGlsaW5lVG9rZW5zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdG9rZW5zL3NwYXJzZU11bHRpbGluZVRva2Vucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDL0MsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVqRDs7R0FFRztBQUNILE1BQU0sT0FBTyxxQkFBcUI7SUFFMUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUF1QixFQUFFLE1BQW1CO1FBQ2hFLE9BQU8sSUFBSSxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsSUFBSSw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzdGLENBQUM7SUFNRDs7T0FFRztJQUNILElBQVcsZUFBZTtRQUN6QixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztJQUM5QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLGFBQWE7UUFDdkIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDO0lBQzVCLENBQUM7SUFFRCxZQUFvQixlQUF1QixFQUFFLE1BQW9DO1FBQ2hGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUM7UUFDeEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUM5RSxDQUFDO0lBRU0sUUFBUTtRQUNkLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENB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