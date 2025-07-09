/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TokenMetadata } from '../encodedTokenAttributes.js';
import { OffsetRange } from '../core/offsetRange.js';
import { TokenArrayBuilder } from './tokenArray.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
export class LineTokens {
    static createEmpty(lineContent, decoder) {
        const defaultMetadata = LineTokens.defaultTokenMetadata;
        const tokens = new Uint32Array(2);
        tokens[0] = lineContent.length;
        tokens[1] = defaultMetadata;
        return new LineTokens(tokens, lineContent, decoder);
    }
    static createFromTextAndMetadata(data, decoder) {
        let offset = 0;
        let fullText = '';
        const tokens = new Array();
        for (const { text, metadata } of data) {
            tokens.push(offset + text.length, metadata);
            offset += text.length;
            fullText += text;
        }
        return new LineTokens(new Uint32Array(tokens), fullText, decoder);
    }
    static convertToEndOffset(tokens, lineTextLength) {
        const tokenCount = (tokens.length >>> 1);
        const lastTokenIndex = tokenCount - 1;
        for (let tokenIndex = 0; tokenIndex < lastTokenIndex; tokenIndex++) {
            tokens[tokenIndex << 1] = tokens[(tokenIndex + 1) << 1];
        }
        tokens[lastTokenIndex << 1] = lineTextLength;
    }
    static findIndexInTokensArray(tokens, desiredIndex) {
        if (tokens.length <= 2) {
            return 0;
        }
        let low = 0;
        let high = (tokens.length >>> 1) - 1;
        while (low < high) {
            const mid = low + Math.floor((high - low) / 2);
            const endOffset = tokens[(mid << 1)];
            if (endOffset === desiredIndex) {
                return mid + 1;
            }
            else if (endOffset < desiredIndex) {
                low = mid + 1;
            }
            else if (endOffset > desiredIndex) {
                high = mid;
            }
        }
        return low;
    }
    static { this.defaultTokenMetadata = ((0 /* FontStyle.None */ << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)
        | (1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
        | (2 /* ColorId.DefaultBackground */ << 24 /* MetadataConsts.BACKGROUND_OFFSET */)) >>> 0; }
    constructor(tokens, text, decoder) {
        this._lineTokensBrand = undefined;
        const tokensLength = tokens.length > 1 ? tokens[tokens.length - 2] : 0;
        if (tokensLength !== text.length) {
            onUnexpectedError(new Error('Token length and text length do not match!'));
        }
        this._tokens = tokens;
        this._tokensCount = (this._tokens.length >>> 1);
        this._text = text;
        this.languageIdCodec = decoder;
    }
    equals(other) {
        if (other instanceof LineTokens) {
            return this.slicedEquals(other, 0, this._tokensCount);
        }
        return false;
    }
    slicedEquals(other, sliceFromTokenIndex, sliceTokenCount) {
        if (this._text !== other._text) {
            return false;
        }
        if (this._tokensCount !== other._tokensCount) {
            return false;
        }
        const from = (sliceFromTokenIndex << 1);
        const to = from + (sliceTokenCount << 1);
        for (let i = from; i < to; i++) {
            if (this._tokens[i] !== other._tokens[i]) {
                return false;
            }
        }
        return true;
    }
    getLineContent() {
        return this._text;
    }
    getCount() {
        return this._tokensCount;
    }
    getStartOffset(tokenIndex) {
        if (tokenIndex > 0) {
            return this._tokens[(tokenIndex - 1) << 1];
        }
        return 0;
    }
    getMetadata(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return metadata;
    }
    getLanguageId(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        const languageId = TokenMetadata.getLanguageId(metadata);
        return this.languageIdCodec.decodeLanguageId(languageId);
    }
    getStandardTokenType(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getTokenType(metadata);
    }
    getForeground(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getForeground(metadata);
    }
    getClassName(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getClassNameFromMetadata(metadata);
    }
    getInlineStyle(tokenIndex, colorMap) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getInlineStyleFromMetadata(metadata, colorMap);
    }
    getPresentation(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getPresentationFromMetadata(metadata);
    }
    getEndOffset(tokenIndex) {
        return this._tokens[tokenIndex << 1];
    }
    /**
     * Find the token containing offset `offset`.
     * @param offset The search offset
     * @return The index of the token containing the offset.
     */
    findTokenIndexAtOffset(offset) {
        return LineTokens.findIndexInTokensArray(this._tokens, offset);
    }
    inflate() {
        return this;
    }
    sliceAndInflate(startOffset, endOffset, deltaOffset) {
        return new SliceLineTokens(this, startOffset, endOffset, deltaOffset);
    }
    sliceZeroCopy(range) {
        return this.sliceAndInflate(range.start, range.endExclusive, 0);
    }
    /**
     * @pure
     * @param insertTokens Must be sorted by offset.
    */
    withInserted(insertTokens) {
        if (insertTokens.length === 0) {
            return this;
        }
        let nextOriginalTokenIdx = 0;
        let nextInsertTokenIdx = 0;
        let text = '';
        const newTokens = new Array();
        let originalEndOffset = 0;
        while (true) {
            const nextOriginalTokenEndOffset = nextOriginalTokenIdx < this._tokensCount ? this._tokens[nextOriginalTokenIdx << 1] : -1;
            const nextInsertToken = nextInsertTokenIdx < insertTokens.length ? insertTokens[nextInsertTokenIdx] : null;
            if (nextOriginalTokenEndOffset !== -1 && (nextInsertToken === null || nextOriginalTokenEndOffset <= nextInsertToken.offset)) {
                // original token ends before next insert token
                text += this._text.substring(originalEndOffset, nextOriginalTokenEndOffset);
                const metadata = this._tokens[(nextOriginalTokenIdx << 1) + 1];
                newTokens.push(text.length, metadata);
                nextOriginalTokenIdx++;
                originalEndOffset = nextOriginalTokenEndOffset;
            }
            else if (nextInsertToken) {
                if (nextInsertToken.offset > originalEndOffset) {
                    // insert token is in the middle of the next token.
                    text += this._text.substring(originalEndOffset, nextInsertToken.offset);
                    const metadata = this._tokens[(nextOriginalTokenIdx << 1) + 1];
                    newTokens.push(text.length, metadata);
                    originalEndOffset = nextInsertToken.offset;
                }
                text += nextInsertToken.text;
                newTokens.push(text.length, nextInsertToken.tokenMetadata);
                nextInsertTokenIdx++;
            }
            else {
                break;
            }
        }
        return new LineTokens(new Uint32Array(newTokens), text, this.languageIdCodec);
    }
    getTokensInRange(range) {
        const builder = new TokenArrayBuilder();
        const startTokenIndex = this.findTokenIndexAtOffset(range.start);
        const endTokenIndex = this.findTokenIndexAtOffset(range.endExclusive);
        for (let tokenIndex = startTokenIndex; tokenIndex <= endTokenIndex; tokenIndex++) {
            const tokenRange = new OffsetRange(this.getStartOffset(tokenIndex), this.getEndOffset(tokenIndex));
            const length = tokenRange.intersectionLength(range);
            if (length > 0) {
                builder.add(length, this.getMetadata(tokenIndex));
            }
        }
        return builder.build();
    }
    getTokenText(tokenIndex) {
        const startOffset = this.getStartOffset(tokenIndex);
        const endOffset = this.getEndOffset(tokenIndex);
        const text = this._text.substring(startOffset, endOffset);
        return text;
    }
    forEach(callback) {
        const tokenCount = this.getCount();
        for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex++) {
            callback(tokenIndex);
        }
    }
    toString() {
        let result = '';
        this.forEach((i) => {
            result += `[${this.getTokenText(i)}]{${this.getClassName(i)}}`;
        });
        return result;
    }
}
class SliceLineTokens {
    constructor(source, startOffset, endOffset, deltaOffset) {
        this._source = source;
        this._startOffset = startOffset;
        this._endOffset = endOffset;
        this._deltaOffset = deltaOffset;
        this._firstTokenIndex = source.findTokenIndexAtOffset(startOffset);
        this.languageIdCodec = source.languageIdCodec;
        this._tokensCount = 0;
        for (let i = this._firstTokenIndex, len = source.getCount(); i < len; i++) {
            const tokenStartOffset = source.getStartOffset(i);
            if (tokenStartOffset >= endOffset) {
                break;
            }
            this._tokensCount++;
        }
    }
    getMetadata(tokenIndex) {
        return this._source.getMetadata(this._firstTokenIndex + tokenIndex);
    }
    getLanguageId(tokenIndex) {
        return this._source.getLanguageId(this._firstTokenIndex + tokenIndex);
    }
    getLineContent() {
        return this._source.getLineContent().substring(this._startOffset, this._endOffset);
    }
    equals(other) {
        if (other instanceof SliceLineTokens) {
            return (this._startOffset === other._startOffset
                && this._endOffset === other._endOffset
                && this._deltaOffset === other._deltaOffset
                && this._source.slicedEquals(other._source, this._firstTokenIndex, this._tokensCount));
        }
        return false;
    }
    getCount() {
        return this._tokensCount;
    }
    getStandardTokenType(tokenIndex) {
        return this._source.getStandardTokenType(this._firstTokenIndex + tokenIndex);
    }
    getForeground(tokenIndex) {
        return this._source.getForeground(this._firstTokenIndex + tokenIndex);
    }
    getEndOffset(tokenIndex) {
        const tokenEndOffset = this._source.getEndOffset(this._firstTokenIndex + tokenIndex);
        return Math.min(this._endOffset, tokenEndOffset) - this._startOffset + this._deltaOffset;
    }
    getClassName(tokenIndex) {
        return this._source.getClassName(this._firstTokenIndex + tokenIndex);
    }
    getInlineStyle(tokenIndex, colorMap) {
        return this._source.getInlineStyle(this._firstTokenIndex + tokenIndex, colorMap);
    }
    getPresentation(tokenIndex) {
        return this._source.getPresentation(this._firstTokenIndex + tokenIndex);
    }
    findTokenIndexAtOffset(offset) {
        return this._source.findTokenIndexAtOffset(offset + this._startOffset - this._deltaOffset) - this._firstTokenIndex;
    }
    getTokenText(tokenIndex) {
        const adjustedTokenIndex = this._firstTokenIndex + tokenIndex;
        const tokenStartOffset = this._source.getStartOffset(adjustedTokenIndex);
        const tokenEndOffset = this._source.getEndOffset(adjustedTokenIndex);
        let text = this._source.getTokenText(adjustedTokenIndex);
        if (tokenStartOffset < this._startOffset) {
            text = text.substring(this._startOffset - tokenStartOffset);
        }
        if (tokenEndOffset > this._endOffset) {
            text = text.substring(0, text.length - (tokenEndOffset - this._endOffset));
        }
        return text;
    }
    forEach(callback) {
        for (let tokenIndex = 0; tokenIndex < this.getCount(); tokenIndex++) {
            callback(tokenIndex);
        }
    }
}
export function getStandardTokenTypeAtPosition(model, position) {
    const lineNumber = position.lineNumber;
    if (!model.tokenization.isCheapToTokenize(lineNumber)) {
        return undefined;
    }
    model.tokenization.forceTokenization(lineNumber);
    const lineTokens = model.tokenization.getLineTokens(lineNumber);
    const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
    const tokenType = lineTokens.getStandardTokenType(tokenIndex);
    return tokenType;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3Rva2Vucy9saW5lVG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBeUQsYUFBYSxFQUFzQixNQUFNLDhCQUE4QixDQUFDO0FBR3hJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNyRCxPQUFPLEVBQWMsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQXFCbkUsTUFBTSxPQUFPLFVBQVU7SUFDZixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQW1CLEVBQUUsT0FBeUI7UUFDdkUsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLG9CQUFvQixDQUFDO1FBRXhELE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxlQUFlLENBQUM7UUFFNUIsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFTSxNQUFNLENBQUMseUJBQXlCLENBQUMsSUFBMEMsRUFBRSxPQUF5QjtRQUM1RyxJQUFJLE1BQU0sR0FBVyxDQUFDLENBQUM7UUFDdkIsSUFBSSxRQUFRLEdBQVcsRUFBRSxDQUFDO1FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSyxFQUFVLENBQUM7UUFDbkMsS0FBSyxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLElB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