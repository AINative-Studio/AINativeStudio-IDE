/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineTokens } from './lineTokens.js';
export const EMPTY_LINE_TOKENS = (new Uint32Array(0)).buffer;
export class ContiguousTokensEditing {
    static deleteBeginning(lineTokens, toChIndex) {
        if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
            return lineTokens;
        }
        return ContiguousTokensEditing.delete(lineTokens, 0, toChIndex);
    }
    static deleteEnding(lineTokens, fromChIndex) {
        if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
            return lineTokens;
        }
        const tokens = toUint32Array(lineTokens);
        const lineTextLength = tokens[tokens.length - 2];
        return ContiguousTokensEditing.delete(lineTokens, fromChIndex, lineTextLength);
    }
    static delete(lineTokens, fromChIndex, toChIndex) {
        if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS || fromChIndex === toChIndex) {
            return lineTokens;
        }
        const tokens = toUint32Array(lineTokens);
        const tokensCount = (tokens.length >>> 1);
        // special case: deleting everything
        if (fromChIndex === 0 && tokens[tokens.length - 2] === toChIndex) {
            return EMPTY_LINE_TOKENS;
        }
        const fromTokenIndex = LineTokens.findIndexInTokensArray(tokens, fromChIndex);
        const fromTokenStartOffset = (fromTokenIndex > 0 ? tokens[(fromTokenIndex - 1) << 1] : 0);
        const fromTokenEndOffset = tokens[fromTokenIndex << 1];
        if (toChIndex < fromTokenEndOffset) {
            // the delete range is inside a single token
            const delta = (toChIndex - fromChIndex);
            for (let i = fromTokenIndex; i < tokensCount; i++) {
                tokens[i << 1] -= delta;
            }
            return lineTokens;
        }
        let dest;
        let lastEnd;
        if (fromTokenStartOffset !== fromChIndex) {
            tokens[fromTokenIndex << 1] = fromChIndex;
            dest = ((fromTokenIndex + 1) << 1);
            lastEnd = fromChIndex;
        }
        else {
            dest = (fromTokenIndex << 1);
            lastEnd = fromTokenStartOffset;
        }
        const delta = (toChIndex - fromChIndex);
        for (let tokenIndex = fromTokenIndex + 1; tokenIndex < tokensCount; tokenIndex++) {
            const tokenEndOffset = tokens[tokenIndex << 1] - delta;
            if (tokenEndOffset > lastEnd) {
                tokens[dest++] = tokenEndOffset;
                tokens[dest++] = tokens[(tokenIndex << 1) + 1];
                lastEnd = tokenEndOffset;
            }
        }
        if (dest === tokens.length) {
            // nothing to trim
            return lineTokens;
        }
        const tmp = new Uint32Array(dest);
        tmp.set(tokens.subarray(0, dest), 0);
        return tmp.buffer;
    }
    static append(lineTokens, _otherTokens) {
        if (_otherTokens === EMPTY_LINE_TOKENS) {
            return lineTokens;
        }
        if (lineTokens === EMPTY_LINE_TOKENS) {
            return _otherTokens;
        }
        if (lineTokens === null) {
            return lineTokens;
        }
        if (_otherTokens === null) {
            // cannot determine combined line length...
            return null;
        }
        const myTokens = toUint32Array(lineTokens);
        const otherTokens = toUint32Array(_otherTokens);
        const otherTokensCount = (otherTokens.length >>> 1);
        const result = new Uint32Array(myTokens.length + otherTokens.length);
        result.set(myTokens, 0);
        let dest = myTokens.length;
        const delta = myTokens[myTokens.length - 2];
        for (let i = 0; i < otherTokensCount; i++) {
            result[dest++] = otherTokens[(i << 1)] + delta;
            result[dest++] = otherTokens[(i << 1) + 1];
        }
        return result.buffer;
    }
    static insert(lineTokens, chIndex, textLength) {
        if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
            // nothing to do
            return lineTokens;
        }
        const tokens = toUint32Array(lineTokens);
        const tokensCount = (tokens.length >>> 1);
        let fromTokenIndex = LineTokens.findIndexInTokensArray(tokens, chIndex);
        if (fromTokenIndex > 0) {
            const fromTokenStartOffset = tokens[(fromTokenIndex - 1) << 1];
            if (fromTokenStartOffset === chIndex) {
                fromTokenIndex--;
            }
        }
        for (let tokenIndex = fromTokenIndex; tokenIndex < tokensCount; tokenIndex++) {
            tokens[tokenIndex << 1] += textLength;
        }
        return lineTokens;
    }
}
export function toUint32Array(arr) {
    if (arr instanceof Uint32Array) {
        return arr;
    }
    else {
        return new Uint32Array(arr);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGlndW91c1Rva2Vuc0VkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi90b2tlbnMvY29udGlndW91c1Rva2Vuc0VkaXRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTdDLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFFN0QsTUFBTSxPQUFPLHVCQUF1QjtJQUU1QixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQTRDLEVBQUUsU0FBaUI7UUFDNUYsSUFBSSxVQUFVLEtBQUssSUFBSSxJQUFJLFVBQVUsS0FBSyxpQkFBaUIsRUFBRSxDQUFDO1lBQzdELE9BQU8sVUFBVSxDQUFDO1FBQ25CLENBQUM7UUFDRCxPQUFPLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFTSxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQTRDLEVBQUUsV0FBbUI7UUFDM0YsSUFBSSxVQUFVLEtBQUssSUFBSSxJQUFJLFVBQVUsS0FBSyxpQkFBaUIsRUFBRSxDQUFDO1lBQzdELE9BQU8sVUFBVSxDQUFDO1FBQ25CLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekMsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDakQsT0FBTyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FB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