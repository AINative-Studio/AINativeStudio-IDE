/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { LineTokens } from './lineTokens.js';
/**
 * Represents sparse tokens in a text model.
 */
export class SparseTokensStore {
    constructor(languageIdCodec) {
        this._pieces = [];
        this._isComplete = false;
        this._languageIdCodec = languageIdCodec;
    }
    flush() {
        this._pieces = [];
        this._isComplete = false;
    }
    isEmpty() {
        return (this._pieces.length === 0);
    }
    set(pieces, isComplete) {
        this._pieces = pieces || [];
        this._isComplete = isComplete;
    }
    setPartial(_range, pieces) {
        // console.log(`setPartial ${_range} ${pieces.map(p => p.toString()).join(', ')}`);
        let range = _range;
        if (pieces.length > 0) {
            const _firstRange = pieces[0].getRange();
            const _lastRange = pieces[pieces.length - 1].getRange();
            if (!_firstRange || !_lastRange) {
                return _range;
            }
            range = _range.plusRange(_firstRange).plusRange(_lastRange);
        }
        let insertPosition = null;
        for (let i = 0, len = this._pieces.length; i < len; i++) {
            const piece = this._pieces[i];
            if (piece.endLineNumber < range.startLineNumber) {
                // this piece is before the range
                continue;
            }
            if (piece.startLineNumber > range.endLineNumber) {
                // this piece is after the range, so mark the spot before this piece
                // as a good insertion position and stop looping
                insertPosition = insertPosition || { index: i };
                break;
            }
            // this piece might intersect with the range
            piece.removeTokens(range);
            if (piece.isEmpty()) {
                // remove the piece if it became empty
                this._pieces.splice(i, 1);
                i--;
                len--;
                continue;
            }
            if (piece.endLineNumber < range.startLineNumber) {
                // after removal, this piece is before the range
                continue;
            }
            if (piece.startLineNumber > range.endLineNumber) {
                // after removal, this piece is after the range
                insertPosition = insertPosition || { index: i };
                continue;
            }
            // after removal, this piece contains the range
            const [a, b] = piece.split(range);
            if (a.isEmpty()) {
                // this piece is actually after the range
                insertPosition = insertPosition || { index: i };
                continue;
            }
            if (b.isEmpty()) {
                // this piece is actually before the range
                continue;
            }
            this._pieces.splice(i, 1, a, b);
            i++;
            len++;
            insertPosition = insertPosition || { index: i };
        }
        insertPosition = insertPosition || { index: this._pieces.length };
        if (pieces.length > 0) {
            this._pieces = arrays.arrayInsert(this._pieces, insertPosition.index, pieces);
        }
        // console.log(`I HAVE ${this._pieces.length} pieces`);
        // console.log(`${this._pieces.map(p => p.toString()).join('\n')}`);
        return range;
    }
    isComplete() {
        return this._isComplete;
    }
    addSparseTokens(lineNumber, aTokens) {
        if (aTokens.getLineContent().length === 0) {
            // Don't do anything for empty lines
            return aTokens;
        }
        const pieces = this._pieces;
        if (pieces.length === 0) {
            return aTokens;
        }
        const pieceIndex = SparseTokensStore._findFirstPieceWithLine(pieces, lineNumber);
        const bTokens = pieces[pieceIndex].getLineTokens(lineNumber);
        if (!bTokens) {
            return aTokens;
        }
        const aLen = aTokens.getCount();
        const bLen = bTokens.getCount();
        let aIndex = 0;
        const result = [];
        let resultLen = 0;
        let lastEndOffset = 0;
        const emitToken = (endOffset, metadata) => {
            if (endOffset === lastEndOffset) {
                return;
            }
            lastEndOffset = endOffset;
            result[resultLen++] = endOffset;
            result[resultLen++] = metadata;
        };
        for (let bIndex = 0; bIndex < bLen; bIndex++) {
            const bStartCharacter = bTokens.getStartCharacter(bIndex);
            const bEndCharacter = bTokens.getEndCharacter(bIndex);
            const bMetadata = bTokens.getMetadata(bIndex);
            const bMask = (((bMetadata & 1 /* MetadataConsts.SEMANTIC_USE_ITALIC */) ? 2048 /* MetadataConsts.ITALIC_MASK */ : 0)
                | ((bMetadata & 2 /* MetadataConsts.SEMANTIC_USE_BOLD */) ? 4096 /* MetadataConsts.BOLD_MASK */ : 0)
                | ((bMetadata & 4 /* MetadataConsts.SEMANTIC_USE_UNDERLINE */) ? 8192 /* MetadataConsts.UNDERLINE_MASK */ : 0)
                | ((bMetadata & 8 /* MetadataConsts.SEMANTIC_USE_STRIKETHROUGH */) ? 16384 /* MetadataConsts.STRIKETHROUGH_MASK */ : 0)
                | ((bMetadata & 16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */) ? 16744448 /* MetadataConsts.FOREGROUND_MASK */ : 0)
                | ((bMetadata & 32 /* MetadataConsts.SEMANTIC_USE_BACKGROUND */) ? 4278190080 /* MetadataConsts.BACKGROUND_MASK */ : 0)) >>> 0;
            const aMask = (~bMask) >>> 0;
            // push any token from `a` that is before `b`
            while (aIndex < aLen && aTokens.getEndOffset(aIndex) <= bStartCharacter) {
                emitToken(aTokens.getEndOffset(aIndex), aTokens.getMetadata(aIndex));
                aIndex++;
            }
            // push the token from `a` if it intersects the token from `b`
            if (aIndex < aLen && aTokens.getStartOffset(aIndex) < bStartCharacter) {
                emitToken(bStartCharacter, aTokens.getMetadata(aIndex));
            }
            // skip any tokens from `a` that are contained inside `b`
            while (aIndex < aLen && aTokens.getEndOffset(aIndex) < bEndCharacter) {
                emitToken(aTokens.getEndOffset(aIndex), (aTokens.getMetadata(aIndex) & aMask) | (bMetadata & bMask));
                aIndex++;
            }
            if (aIndex < aLen) {
                emitToken(bEndCharacter, (aTokens.getMetadata(aIndex) & aMask) | (bMetadata & bMask));
                if (aTokens.getEndOffset(aIndex) === bEndCharacter) {
                    // `a` ends exactly at the same spot as `b`!
                    aIndex++;
                }
            }
            else {
                const aMergeIndex = Math.min(Math.max(0, aIndex - 1), aLen - 1);
                // push the token from `b`
                emitToken(bEndCharacter, (aTokens.getMetadata(aMergeIndex) & aMask) | (bMetadata & bMask));
            }
        }
        // push the remaining tokens from `a`
        while (aIndex < aLen) {
            emitToken(aTokens.getEndOffset(aIndex), aTokens.getMetadata(aIndex));
            aIndex++;
        }
        return new LineTokens(new Uint32Array(result), aTokens.getLineContent(), this._languageIdCodec);
    }
    static _findFirstPieceWithLine(pieces, lineNumber) {
        let low = 0;
        let high = pieces.length - 1;
        while (low < high) {
            let mid = low + Math.floor((high - low) / 2);
            if (pieces[mid].endLineNumber < lineNumber) {
                low = mid + 1;
            }
            else if (pieces[mid].startLineNumber > lineNumber) {
                high = mid - 1;
            }
            else {
                while (mid > low && pieces[mid - 1].startLineNumber <= lineNumber && lineNumber <= pieces[mid - 1].endLineNumber) {
                    mid--;
                }
                return mid;
            }
        }
        return low;
    }
    acceptEdit(range, eolCount, firstLineLength, lastLineLength, firstCharCode) {
        for (const piece of this._pieces) {
            piece.acceptEdit(range, eolCount, firstLineLength, lastLineLength, firstCharCode);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BhcnNlVG9rZW5zU3RvcmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi90b2tlbnMvc3BhcnNlVG9rZW5zU3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFLN0M7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBTTdCLFlBQVksZUFBaUM7UUFDNUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDbEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDekIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQztJQUN6QyxDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0lBQzFCLENBQUM7SUFFTSxPQUFPO1FBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFTSxHQUFHLENBQUMsTUFBc0MsRUFBRSxVQUFtQjtRQUNyRSxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7SUFDL0IsQ0FBQztJQUVNLFVBQVUsQ0FBQyxNQUFhLEVBQUUsTUFBK0I7UUFDL0QsbUZBQW1GO1FBRW5GLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUNuQixJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkIsTUFB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