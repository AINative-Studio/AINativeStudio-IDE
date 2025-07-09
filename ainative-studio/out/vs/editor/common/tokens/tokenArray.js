/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OffsetRange } from '../core/offsetRange.js';
import { LineTokens } from './lineTokens.js';
/**
 * This class represents a sequence of tokens.
 * Conceptually, each token has a length and a metadata number.
 * A token array might be used to annotate a string with metadata.
 * Use {@link TokenArrayBuilder} to efficiently create a token array.
 *
 * TODO: Make this class more efficient (e.g. by using a Int32Array).
*/
export class TokenArray {
    static fromLineTokens(lineTokens) {
        const tokenInfo = [];
        for (let i = 0; i < lineTokens.getCount(); i++) {
            tokenInfo.push(new TokenInfo(lineTokens.getEndOffset(i) - lineTokens.getStartOffset(i), lineTokens.getMetadata(i)));
        }
        return TokenArray.create(tokenInfo);
    }
    static create(tokenInfo) {
        return new TokenArray(tokenInfo);
    }
    constructor(_tokenInfo) {
        this._tokenInfo = _tokenInfo;
    }
    toLineTokens(lineContent, decoder) {
        return LineTokens.createFromTextAndMetadata(this.map((r, t) => ({ text: r.substring(lineContent), metadata: t.metadata })), decoder);
    }
    forEach(cb) {
        let lengthSum = 0;
        for (const tokenInfo of this._tokenInfo) {
            const range = new OffsetRange(lengthSum, lengthSum + tokenInfo.length);
            cb(range, tokenInfo);
            lengthSum += tokenInfo.length;
        }
    }
    map(cb) {
        const result = [];
        let lengthSum = 0;
        for (const tokenInfo of this._tokenInfo) {
            const range = new OffsetRange(lengthSum, lengthSum + tokenInfo.length);
            result.push(cb(range, tokenInfo));
            lengthSum += tokenInfo.length;
        }
        return result;
    }
    slice(range) {
        const result = [];
        let lengthSum = 0;
        for (const tokenInfo of this._tokenInfo) {
            const tokenStart = lengthSum;
            const tokenEndEx = tokenStart + tokenInfo.length;
            if (tokenEndEx > range.start) {
                if (tokenStart >= range.endExclusive) {
                    break;
                }
                const deltaBefore = Math.max(0, range.start - tokenStart);
                const deltaAfter = Math.max(0, tokenEndEx - range.endExclusive);
                result.push(new TokenInfo(tokenInfo.length - deltaBefore - deltaAfter, tokenInfo.metadata));
            }
            lengthSum += tokenInfo.length;
        }
        return TokenArray.create(result);
    }
}
export class TokenInfo {
    constructor(length, metadata) {
        this.length = length;
        this.metadata = metadata;
    }
}
/**
 * TODO: Make this class more efficient (e.g. by using a Int32Array).
*/
export class TokenArrayBuilder {
    constructor() {
        this._tokens = [];
    }
    add(length, metadata) {
        this._tokens.push(new TokenInfo(length, metadata));
    }
    build() {
        return TokenArray.create(this._tokens);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5BcnJheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3Rva2Vucy90b2tlbkFycmF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFN0M7Ozs7Ozs7RUFPRTtBQUNGLE1BQU0sT0FBTyxVQUFVO0lBQ2YsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFzQjtRQUNsRCxNQUFNLFNBQVMsR0FBZ0IsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoRCxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNySCxDQUFDO1FBQ0QsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQXNCO1FBQzFDLE9BQU8sSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELFlBQ2tCLFVBQXVCO1FBQXZCLGVBQVUsR0FBVixVQUFVLENBQWE7SUFDckMsQ0FBQztJQUVFLFlBQVksQ0FBQyxXQUFtQixFQUFFLE9BQXlCO1FBQ2pFLE9BQU8sVUFBVSxDQUFDLHlCQUF5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