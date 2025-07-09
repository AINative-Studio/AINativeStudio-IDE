/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TokenMetadata } from '../../../common/encodedTokenAttributes.js';
/**
 * A token on a line.
 */
export class TestLineToken {
    constructor(endIndex, metadata) {
        this.endIndex = endIndex;
        this._metadata = metadata;
    }
    getStandardTokenType() {
        return TokenMetadata.getTokenType(this._metadata);
    }
    getForeground() {
        return TokenMetadata.getForeground(this._metadata);
    }
    getType() {
        return TokenMetadata.getClassNameFromMetadata(this._metadata);
    }
    getInlineStyle(colorMap) {
        return TokenMetadata.getInlineStyleFromMetadata(this._metadata, colorMap);
    }
    getPresentation() {
        return TokenMetadata.getPresentationFromMetadata(this._metadata);
    }
    static _equals(a, b) {
        return (a.endIndex === b.endIndex
            && a._metadata === b._metadata);
    }
    static equalsArr(a, b) {
        const aLen = a.length;
        const bLen = b.length;
        if (aLen !== bLen) {
            return false;
        }
        for (let i = 0; i < aLen; i++) {
            if (!this._equals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
}
export class TestLineTokens {
    constructor(actual) {
        this._actual = actual;
    }
    equals(other) {
        if (other instanceof TestLineTokens) {
            return TestLineToken.equalsArr(this._actual, other._actual);
        }
        return false;
    }
    getCount() {
        return this._actual.length;
    }
    getStandardTokenType(tokenIndex) {
        return this._actual[tokenIndex].getStandardTokenType();
    }
    getForeground(tokenIndex) {
        return this._actual[tokenIndex].getForeground();
    }
    getEndOffset(tokenIndex) {
        return this._actual[tokenIndex].endIndex;
    }
    getClassName(tokenIndex) {
        return this._actual[tokenIndex].getType();
    }
    getInlineStyle(tokenIndex, colorMap) {
        return this._actual[tokenIndex].getInlineStyle(colorMap);
    }
    getPresentation(tokenIndex) {
        return this._actual[tokenIndex].getPresentation();
    }
    findTokenIndexAtOffset(offset) {
        throw new Error('Not implemented');
    }
    getLineContent() {
        throw new Error('Not implemented');
    }
    getMetadata(tokenIndex) {
        throw new Error('Method not implemented.');
    }
    getLanguageId(tokenIndex) {
        throw new Error('Method not implemented.');
    }
    getTokenText(tokenIndex) {
        throw new Error('Method not implemented.');
    }
    forEach(callback) {
        throw new Error('Not implemented');
    }
    get languageIdCodec() {
        throw new Error('Not implemented');
    }
}
export class TestLineTokenFactory {
    static inflateArr(tokens) {
        const tokensCount = (tokens.length >>> 1);
        const result = new Array(tokensCount);
        for (let i = 0; i < tokensCount; i++) {
            const endOffset = tokens[i << 1];
            const metadata = tokens[(i << 1) + 1];
            result[i] = new TestLineToken(endOffset, metadata);
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdExpbmVUb2tlbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vY29yZS90ZXN0TGluZVRva2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBVyxhQUFhLEVBQXlDLE1BQU0sMkNBQTJDLENBQUM7QUFHMUg7O0dBRUc7QUFDSCxNQUFNLE9BQU8sYUFBYTtJQVF6QixZQUFZLFFBQWdCLEVBQUUsUUFBZ0I7UUFDN0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7SUFDM0IsQ0FBQztJQUVNLG9CQUFvQjtRQUMxQixPQUFPLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU8sYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVNLE9BQU87UUFDYixPQUFPLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVNLGNBQWMsQ0FBQyxRQUFrQjtRQUN2QyxPQUFPLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFTSxlQUFlO1FBQ3JCLE9BQU8sYUFBYSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFnQixFQUFFLENBQWdCO1FBQ3hELE9BQU8sQ0FDTixDQUFDLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FB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