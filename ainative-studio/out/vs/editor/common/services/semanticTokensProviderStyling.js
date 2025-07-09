/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { TokenMetadata } from '../encodedTokenAttributes.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { ILogService, LogLevel } from '../../../platform/log/common/log.js';
import { SparseMultilineTokens } from '../tokens/sparseMultilineTokens.js';
import { ILanguageService } from '../languages/language.js';
var SemanticTokensProviderStylingConstants;
(function (SemanticTokensProviderStylingConstants) {
    SemanticTokensProviderStylingConstants[SemanticTokensProviderStylingConstants["NO_STYLING"] = 2147483647] = "NO_STYLING";
})(SemanticTokensProviderStylingConstants || (SemanticTokensProviderStylingConstants = {}));
const ENABLE_TRACE = false;
let SemanticTokensProviderStyling = class SemanticTokensProviderStyling {
    constructor(_legend, _themeService, _languageService, _logService) {
        this._legend = _legend;
        this._themeService = _themeService;
        this._languageService = _languageService;
        this._logService = _logService;
        this._hasWarnedOverlappingTokens = false;
        this._hasWarnedInvalidLengthTokens = false;
        this._hasWarnedInvalidEditStart = false;
        this._hashTable = new HashTable();
    }
    getMetadata(tokenTypeIndex, tokenModifierSet, languageId) {
        const encodedLanguageId = this._languageService.languageIdCodec.encodeLanguageId(languageId);
        const entry = this._hashTable.get(tokenTypeIndex, tokenModifierSet, encodedLanguageId);
        let metadata;
        if (entry) {
            metadata = entry.metadata;
            if (ENABLE_TRACE && this._logService.getLevel() === LogLevel.Trace) {
                this._logService.trace(`SemanticTokensProviderStyling [CACHED] ${tokenTypeIndex} / ${tokenModifierSet}: foreground ${TokenMetadata.getForeground(metadata)}, fontStyle ${TokenMetadata.getFontStyle(metadata).toString(2)}`);
            }
        }
        else {
            let tokenType = this._legend.tokenTypes[tokenTypeIndex];
            const tokenModifiers = [];
            if (tokenType) {
                let modifierSet = tokenModifierSet;
                for (let modifierIndex = 0; modifierSet > 0 && modifierIndex < this._legend.tokenModifiers.length; modifierIndex++) {
                    if (modifierSet & 1) {
                        tokenModifiers.push(this._legend.tokenModifiers[modifierIndex]);
                    }
                    modifierSet = modifierSet >> 1;
                }
                if (ENABLE_TRACE && modifierSet > 0 && this._logService.getLevel() === LogLevel.Trace) {
                    this._logService.trace(`SemanticTokensProviderStyling: unknown token modifier index: ${tokenModifierSet.toString(2)} for legend: ${JSON.stringify(this._legend.tokenModifiers)}`);
                    tokenModifiers.push('not-in-legend');
                }
                const tokenStyle = this._themeService.getColorTheme().getTokenStyleMetadata(tokenType, tokenModifiers, languageId);
                if (typeof tokenStyle === 'undefined') {
                    metadata = 2147483647 /* SemanticTokensProviderStylingConstants.NO_STYLING */;
                }
                else {
                    metadata = 0;
                    if (typeof tokenStyle.italic !== 'undefined') {
                        const italicBit = (tokenStyle.italic ? 1 /* FontStyle.Italic */ : 0) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */;
                        metadata |= italicBit | 1 /* MetadataConsts.SEMANTIC_USE_ITALIC */;
                    }
                    if (typeof tokenStyle.bold !== 'undefined') {
                        const boldBit = (tokenStyle.bold ? 2 /* FontStyle.Bold */ : 0) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */;
                        metadata |= boldBit | 2 /* MetadataConsts.SEMANTIC_USE_BOLD */;
                    }
                    if (typeof tokenStyle.underline !== 'undefined') {
                        const underlineBit = (tokenStyle.underline ? 4 /* FontStyle.Underline */ : 0) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */;
                        metadata |= underlineBit | 4 /* MetadataConsts.SEMANTIC_USE_UNDERLINE */;
                    }
                    if (typeof tokenStyle.strikethrough !== 'undefined') {
                        const strikethroughBit = (tokenStyle.strikethrough ? 8 /* FontStyle.Strikethrough */ : 0) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */;
                        metadata |= strikethroughBit | 8 /* MetadataConsts.SEMANTIC_USE_STRIKETHROUGH */;
                    }
                    if (tokenStyle.foreground) {
                        const foregroundBits = (tokenStyle.foreground) << 15 /* MetadataConsts.FOREGROUND_OFFSET */;
                        metadata |= foregroundBits | 16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */;
                    }
                    if (metadata === 0) {
                        // Nothing!
                        metadata = 2147483647 /* SemanticTokensProviderStylingConstants.NO_STYLING */;
                    }
                }
            }
            else {
                if (ENABLE_TRACE && this._logService.getLevel() === LogLevel.Trace) {
                    this._logService.trace(`SemanticTokensProviderStyling: unknown token type index: ${tokenTypeIndex} for legend: ${JSON.stringify(this._legend.tokenTypes)}`);
                }
                metadata = 2147483647 /* SemanticTokensProviderStylingConstants.NO_STYLING */;
                tokenType = 'not-in-legend';
            }
            this._hashTable.add(tokenTypeIndex, tokenModifierSet, encodedLanguageId, metadata);
            if (ENABLE_TRACE && this._logService.getLevel() === LogLevel.Trace) {
                this._logService.trace(`SemanticTokensProviderStyling ${tokenTypeIndex} (${tokenType}) / ${tokenModifierSet} (${tokenModifiers.join(' ')}): foreground ${TokenMetadata.getForeground(metadata)}, fontStyle ${TokenMetadata.getFontStyle(metadata).toString(2)}`);
            }
        }
        return metadata;
    }
    warnOverlappingSemanticTokens(lineNumber, startColumn) {
        if (!this._hasWarnedOverlappingTokens) {
            this._hasWarnedOverlappingTokens = true;
            this._logService.warn(`Overlapping semantic tokens detected at lineNumber ${lineNumber}, column ${startColumn}`);
        }
    }
    warnInvalidLengthSemanticTokens(lineNumber, startColumn) {
        if (!this._hasWarnedInvalidLengthTokens) {
            this._hasWarnedInvalidLengthTokens = true;
            this._logService.warn(`Semantic token with invalid length detected at lineNumber ${lineNumber}, column ${startColumn}`);
        }
    }
    warnInvalidEditStart(previousResultId, resultId, editIndex, editStart, maxExpectedStart) {
        if (!this._hasWarnedInvalidEditStart) {
            this._hasWarnedInvalidEditStart = true;
            this._logService.warn(`Invalid semantic tokens edit detected (previousResultId: ${previousResultId}, resultId: ${resultId}) at edit #${editIndex}: The provided start offset ${editStart} is outside the previous data (length ${maxExpectedStart}).`);
        }
    }
};
SemanticTokensProviderStyling = __decorate([
    __param(1, IThemeService),
    __param(2, ILanguageService),
    __param(3, ILogService)
], SemanticTokensProviderStyling);
export { SemanticTokensProviderStyling };
var SemanticColoringConstants;
(function (SemanticColoringConstants) {
    /**
     * Let's aim at having 8KB buffers if possible...
     * So that would be 8192 / (5 * 4) = 409.6 tokens per area
     */
    SemanticColoringConstants[SemanticColoringConstants["DesiredTokensPerArea"] = 400] = "DesiredTokensPerArea";
    /**
     * Try to keep the total number of areas under 1024 if possible,
     * simply compensate by having more tokens per area...
     */
    SemanticColoringConstants[SemanticColoringConstants["DesiredMaxAreas"] = 1024] = "DesiredMaxAreas";
})(SemanticColoringConstants || (SemanticColoringConstants = {}));
export function toMultilineTokens2(tokens, styling, languageId) {
    const srcData = tokens.data;
    const tokenCount = (tokens.data.length / 5) | 0;
    const tokensPerArea = Math.max(Math.ceil(tokenCount / 1024 /* SemanticColoringConstants.DesiredMaxAreas */), 400 /* SemanticColoringConstants.DesiredTokensPerArea */);
    const result = [];
    let tokenIndex = 0;
    let lastLineNumber = 1;
    let lastStartCharacter = 0;
    while (tokenIndex < tokenCount) {
        const tokenStartIndex = tokenIndex;
        let tokenEndIndex = Math.min(tokenStartIndex + tokensPerArea, tokenCount);
        // Keep tokens on the same line in the same area...
        if (tokenEndIndex < tokenCount) {
            let smallTokenEndIndex = tokenEndIndex;
            while (smallTokenEndIndex - 1 > tokenStartIndex && srcData[5 * smallTokenEndIndex] === 0) {
                smallTokenEndIndex--;
            }
            if (smallTokenEndIndex - 1 === tokenStartIndex) {
                // there are so many tokens on this line that our area would be empty, we must now go right
                let bigTokenEndIndex = tokenEndIndex;
                while (bigTokenEndIndex + 1 < tokenCount && srcData[5 * bigTokenEndIndex] === 0) {
                    bigTokenEndIndex++;
                }
                tokenEndIndex = bigTokenEndIndex;
            }
            else {
                tokenEndIndex = smallTokenEndIndex;
            }
        }
        let destData = new Uint32Array((tokenEndIndex - tokenStartIndex) * 4);
        let destOffset = 0;
        let areaLine = 0;
        let prevLineNumber = 0;
        let prevEndCharacter = 0;
        while (tokenIndex < tokenEndIndex) {
            const srcOffset = 5 * tokenIndex;
            const deltaLine = srcData[srcOffset];
            const deltaCharacter = srcData[srcOffset + 1];
            // Casting both `lineNumber`, `startCharacter` and `endCharacter` here to uint32 using `|0`
            // to validate below with the actual values that will be inserted in the Uint32Array result
            const lineNumber = (lastLineNumber + deltaLine) | 0;
            const startCharacter = (deltaLine === 0 ? (lastStartCharacter + deltaCharacter) | 0 : deltaCharacter);
            const length = srcData[srcOffset + 2];
            const endCharacter = (startCharacter + length) | 0;
            const tokenTypeIndex = srcData[srcOffset + 3];
            const tokenModifierSet = srcData[srcOffset + 4];
            if (endCharacter <= startCharacter) {
                // this token is invalid (most likely a negative length casted to uint32)
                styling.warnInvalidLengthSemanticTokens(lineNumber, startCharacter + 1);
            }
            else if (prevLineNumber === lineNumber && prevEndCharacter > startCharacter) {
                // this token overlaps with the previous token
                styling.warnOverlappingSemanticTokens(lineNumber, startCharacter + 1);
            }
            else {
                const metadata = styling.getMetadata(tokenTypeIndex, tokenModifierSet, languageId);
                if (metadata !== 2147483647 /* SemanticTokensProviderStylingConstants.NO_STYLING */) {
                    if (areaLine === 0) {
                        areaLine = lineNumber;
                    }
                    destData[destOffset] = lineNumber - areaLine;
                    destData[destOffset + 1] = startCharacter;
                    destData[destOffset + 2] = endCharacter;
                    destData[destOffset + 3] = metadata;
                    destOffset += 4;
                    prevLineNumber = lineNumber;
                    prevEndCharacter = endCharacter;
                }
            }
            lastLineNumber = lineNumber;
            lastStartCharacter = startCharacter;
            tokenIndex++;
        }
        if (destOffset !== destData.length) {
            destData = destData.subarray(0, destOffset);
        }
        const tokens = SparseMultilineTokens.create(areaLine, destData);
        result.push(tokens);
    }
    return result;
}
class HashTableEntry {
    constructor(tokenTypeIndex, tokenModifierSet, languageId, metadata) {
        this.tokenTypeIndex = tokenTypeIndex;
        this.tokenModifierSet = tokenModifierSet;
        this.languageId = languageId;
        this.metadata = metadata;
        this.next = null;
    }
}
class HashTable {
    static { this._SIZES = [3, 7, 13, 31, 61, 127, 251, 509, 1021, 2039, 4093, 8191, 16381, 32749, 65521, 131071, 262139, 524287, 1048573, 2097143]; }
    constructor() {
        this._elementsCount = 0;
        this._currentLengthIndex = 0;
        this._currentLength = HashTable._SIZES[this._currentLengthIndex];
        this._growCount = Math.round(this._currentLengthIndex + 1 < HashTable._SIZES.length ? 2 / 3 * this._currentLength : 0);
        this._elements = [];
        HashTable._nullOutEntries(this._elements, this._currentLength);
    }
    static _nullOutEntries(entries, length) {
        for (let i = 0; i < length; i++) {
            entries[i] = null;
        }
    }
    _hash2(n1, n2) {
        return (((n1 << 5) - n1) + n2) | 0; // n1 * 31 + n2, keep as int32
    }
    _hashFunc(tokenTypeIndex, tokenModifierSet, languageId) {
        return this._hash2(this._hash2(tokenTypeIndex, tokenModifierSet), languageId) % this._currentLength;
    }
    get(tokenTypeIndex, tokenModifierSet, languageId) {
        const hash = this._hashFunc(tokenTypeIndex, tokenModifierSet, languageId);
        let p = this._elements[hash];
        while (p) {
            if (p.tokenTypeIndex === tokenTypeIndex && p.tokenModifierSet === tokenModifierSet && p.languageId === languageId) {
                return p;
            }
            p = p.next;
        }
        return null;
    }
    add(tokenTypeIndex, tokenModifierSet, languageId, metadata) {
        this._elementsCount++;
        if (this._growCount !== 0 && this._elementsCount >= this._growCount) {
            // expand!
            const oldElements = this._elements;
            this._currentLengthIndex++;
            this._currentLength = HashTable._SIZES[this._currentLengthIndex];
            this._growCount = Math.round(this._currentLengthIndex + 1 < HashTable._SIZES.length ? 2 / 3 * this._currentLength : 0);
            this._elements = [];
            HashTable._nullOutEntries(this._elements, this._currentLength);
            for (const first of oldElements) {
                let p = first;
                while (p) {
                    const oldNext = p.next;
                    p.next = null;
                    this._add(p);
                    p = oldNext;
                }
            }
        }
        this._add(new HashTableEntry(tokenTypeIndex, tokenModifierSet, languageId, metadata));
    }
    _add(element) {
        const hash = this._hashFunc(element.tokenTypeIndex, element.tokenModifierSet, element.languageId);
        element.next = this._elements[hash];
        this._elements[hash] = element;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNQcm92aWRlclN0eWxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9zZW1hbnRpY1Rva2Vuc1Byb3ZpZGVyU3R5bGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQTZCLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTVELElBQVcsc0NBRVY7QUFGRCxXQUFXLHNDQUFzQztJQUNoRCx3SEFBK0MsQ0FBQTtBQUNoRCxDQUFDLEVBRlUsc0NBQXNDLEtBQXRDLHNDQUFzQyxRQUVoRDtBQUVELE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQztBQUVwQixJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE2QjtJQU96QyxZQUNrQixPQUE2QixFQUMvQixhQUE2QyxFQUMxQyxnQkFBbUQsRUFDeEQsV0FBeUM7UUFIckMsWUFBTyxHQUFQLE9BQU8sQ0FBc0I7UUFDZCxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUN6QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ3ZDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBUi9DLGdDQUEyQixHQUFHLEtBQUssQ0FBQztRQUNwQyxrQ0FBNkIsR0FBRyxLQUFLLENBQUM7UUFDdEMsK0JBQTBCLEdBQUcsS0FBSyxDQUFDO1FBUTFDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRU0sV0FBVyxDQUFDLGNBQXNCLEVBQUUsZ0JBQXdCLEVBQUUsVUFBa0I7UUFDdEYsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3ZGLElBQUksUUFBZ0IsQ0FBQztRQUNyQixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUM7WUFDMUIsSUFBSSxZQUFZLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3BFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxjQUFjLE1BQU0sZ0JBQWdCLGdCQUFnQixhQUFhLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxlQUFlLGFBQWEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM5TixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN4RCxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7WUFDcEMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQztnQkFDbkMsS0FBSyxJQUFJLGFBQWEsR0FBRyxDQUFDLEVBQUUsV0FBVyxHQUFHLENBQUMsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7b0JBQ3BILElBQUksV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUNyQixjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7b0JBQ2pFLENBQUM7b0JBQ0QsV0FBVyxHQUFHLFdBQVcsSUFBSSxDQUFDLENBQUM7Z0JBQ2hDLENBQUM7Z0JBQ0QsSUFBSSxZQUFZLElBQUksV0FBVyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDdkYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0VBQWdFLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2xMLGNBQWMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ3RDLENBQUM7Z0JBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUNuSCxJQUFJLE9BQU8sVUFBVSxLQUFLLFdBQVcsRUFBRSxDQUFDO29CQUN2QyxRQUFRLHFFQUFvRCxDQUFDO2dCQUM5RCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsUUFBUSxHQUFHLENBQUMsQ0FBQztvQkFDYixJQUFJLE9BQU8sVUFBVSxDQUFDLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQzt3QkFDOUMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsMEJBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsNkNBQW9DLENBQUM7d0JBQ2pHLFFBQVEsSUFBSSxTQUFTLDZDQUFxQyxDQUFDO29CQUM1RCxDQUFDO29CQUNELElBQUksT0FBTyxVQUFVLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO3dCQUM1QyxNQUFNLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyx3QkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyw2Q0FBb0MsQ0FBQzt3QkFDM0YsUUFBUSxJQUFJLE9BQU8sMkNBQW1DLENBQUM7b0JBQ3hELENBQUM7b0JBQ0QsSUFBSSxPQUFPLFVBQVUsQ0FBQyxTQUFTLEtBQUssV0FBVyxFQUFFLENBQUM7d0JBQ2pELE1BQU0sWUFBWSxHQUFHLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLDZDQUFvQyxDQUFDO3dCQUMxRyxRQUFRLElBQUksWUFBWSxnREFBd0MsQ0FBQztvQkFDbEUsQ0FBQztvQkFDRCxJQUFJLE9BQU8sVUFBVSxDQUFDLGFBQWEsS0FBSyxXQUFXLEVBQUUsQ0FBQzt3QkFDckQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyw2Q0FBb0MsQ0FBQzt3QkFDdEgsUUFBUSxJQUFJLGdCQUFnQixvREFBNEMsQ0FBQztvQkFDMUUsQ0FBQztvQkFDRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDM0IsTUFBTSxjQUFjLEdBQUcsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLDZDQUFvQyxDQUFDO3dCQUNuRixRQUFRLElBQUksY0FBYyxrREFBeUMsQ0FBQztvQkFDckUsQ0FBQztvQkFDRCxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDcEIsV0FBVzt3QkFDWCxRQUFRLHFFQUFvRCxDQUFDO29CQUM5RCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxZQUFZLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3BFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDREQUE0RCxjQUFjLGdCQUFnQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM3SixDQUFDO2dCQUNELFFBQVEscUVBQW9ELENBQUM7Z0JBQzdELFNBQVMsR0FBRyxlQUFlLENBQUM7WUFDN0IsQ0FBQztZQUNELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVuRixJQUFJLFlBQVksSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsaUNBQWlDLGNBQWMsS0FBSyxTQUFTLE9BQU8sZ0JBQWdCLEtBQUssY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLGFBQWEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsYUFBYSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2xRLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVNLDZCQUE2QixDQUFDLFVBQWtCLEVBQUUsV0FBbUI7UUFDM0UsSUFBSSxDQUFDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUM7WUFDeEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsc0RBQXNELFVBQVUsWUFBWSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ2xILENBQUM7SUFDRixDQUFDO0lBRU0sK0JBQStCLENBQUMsVUFBa0IsRUFBRSxXQUFtQjtRQUM3RSxJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLDZCQUE2QixHQUFHLElBQUksQ0FBQztZQUMxQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyw2REFBNkQsVUFBVSxZQUFZLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDekgsQ0FBQztJQUNGLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxnQkFBb0MsRUFBRSxRQUE0QixFQUFFLFNBQWlCLEVBQUUsU0FBaUIsRUFBRSxnQkFBd0I7UUFDN0osSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUM7WUFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsNERBQTRELGdCQUFnQixlQUFlLFFBQVEsY0FBYyxTQUFTLCtCQUErQixTQUFTLHlDQUF5QyxnQkFBZ0IsSUFBSSxDQUFDLENBQUM7UUFDeFAsQ0FBQztJQUNGLENBQUM7Q0FFRCxDQUFBO0FBN0dZLDZCQUE2QjtJQVN2QyxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxXQUFXLENBQUE7R0FYRCw2QkFBNkIsQ0E2R3pDOztBQUVELElBQVcseUJBWVY7QUFaRCxXQUFXLHlCQUF5QjtJQUNuQzs7O09BR0c7SUFDSCwyR0FBMEIsQ0FBQTtJQUUxQjs7O09BR0c7SUFDSCxrR0FBc0IsQ0FBQTtBQUN2QixDQUFDLEVBWlUseUJBQXlCLEtBQXpCLHlCQUF5QixRQVluQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxNQUFzQixFQUFFLE9BQXNDLEVBQUUsVUFBa0I7SUFDcEgsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztJQUM1QixNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSx1REFBNEMsQ0FBQywyREFBaUQsQ0FBQztJQUNsSixNQUFNLE1BQU0sR0FBNEIsRUFBRSxDQUFDO0lBRTNDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztJQUNuQixJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUM7SUFDdkIsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUM7SUFDM0IsT0FBTyxVQUFVLEdBQUcsVUFBVSxFQUFFLENBQUM7UUFDaEMsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDO1FBQ25DLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUxRSxtREFBbUQ7UUFDbkQsSUFBSSxhQUFhLEdBQUcsVUFBVSxFQUFFLENBQUM7WUFFaEMsSUFBSSxrQkFBa0IsR0FBRyxhQUFhLENBQUM7WUFDdkMsT0FBTyxrQkFBa0IsR0FBRyxDQUFDLEdBQUcsZUFBZSxJQUFJLE9BQU8sQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDMUYsa0JBQWtCLEVBQUUsQ0FBQztZQUN0QixDQUFDO1lBRUQsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLEtBQUssZUFBZSxFQUFFLENBQUM7Z0JBQ2hELDJGQUEyRjtnQkFDM0YsSUFBSSxnQkFBZ0IsR0FBRyxhQUFhLENBQUM7Z0JBQ3JDLE9BQU8sZ0JBQWdCLEdBQUcsQ0FBQyxHQUFHLFVBQVUsSUFBSSxPQUFPLENBQUMsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2pGLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3BCLENBQUM7Z0JBQ0QsYUFBYSxHQUFHLGdCQUFnQixDQUFDO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxhQUFhLEdBQUcsa0JBQWtCLENBQUM7WUFDcEMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLFFBQVEsR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLGFBQWEsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0RSxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDbkIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQztRQUN2QixJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQztRQUN6QixPQUFPLFVBQVUsR0FBRyxhQUFhLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDO1lBQ2pDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNyQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzlDLDJGQUEyRjtZQUMzRiwyRkFBMkY7WUFDM0YsTUFBTSxVQUFVLEdBQUcsQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sY0FBYyxHQUFHLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3RHLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRWhELElBQUksWUFBWSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQyx5RUFBeUU7Z0JBQ3pFLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLEVBQUUsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLENBQUM7aUJBQU0sSUFBSSxjQUFjLEtBQUssVUFBVSxJQUFJLGdCQUFnQixHQUFHLGNBQWMsRUFBRSxDQUFDO2dCQUMvRSw4Q0FBOEM7Z0JBQzlDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxVQUFVLEVBQUUsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFFbkYsSUFBSSxRQUFRLHVFQUFzRCxFQUFFLENBQUM7b0JBQ3BFLElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUNwQixRQUFRLEdBQUcsVUFBVSxDQUFDO29CQUN2QixDQUFDO29CQUNELFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxVQUFVLEdBQUcsUUFBUSxDQUFDO29CQUM3QyxRQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxHQUFHLGNBQWMsQ0FBQztvQkFDMUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUM7b0JBQ3hDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDO29CQUNwQyxVQUFVLElBQUksQ0FBQyxDQUFDO29CQUVoQixjQUFjLEdBQUcsVUFBVSxDQUFDO29CQUM1QixnQkFBZ0IsR0FBRyxZQUFZLENBQUM7Z0JBQ2pDLENBQUM7WUFDRixDQUFDO1lBRUQsY0FBYyxHQUFHLFVBQVUsQ0FBQztZQUM1QixrQkFBa0IsR0FBRyxjQUFjLENBQUM7WUFDcEMsVUFBVSxFQUFFLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxVQUFVLEtBQUssUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLGNBQWM7SUFPbkIsWUFBWSxjQUFzQixFQUFFLGdCQUF3QixFQUFFLFVBQWtCLEVBQUUsUUFBZ0I7UUFDakcsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLENBQUM7Q0FDRDtBQUVELE1BQU0sU0FBUzthQUVDLFdBQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQVFqSjtRQUNDLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZILElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLFNBQVMsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVPLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBa0MsRUFBRSxNQUFjO1FBQ2hGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLEVBQVUsRUFBRSxFQUFVO1FBQ3BDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFFLDhCQUE4QjtJQUNwRSxDQUFDO0lBRU8sU0FBUyxDQUFDLGNBQXNCLEVBQUUsZ0JBQXdCLEVBQUUsVUFBa0I7UUFDckYsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLGdCQUFnQixDQUFDLEVBQUUsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUNyRyxDQUFDO0lBRU0sR0FBRyxDQUFDLGNBQXNCLEVBQUUsZ0JBQXdCLEVBQUUsVUFBa0I7UUFDOUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFMUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLENBQUMsY0FBYyxLQUFLLGNBQWMsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLEtBQUssZ0JBQWdCLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDbkgsT0FBTyxDQUFDLENBQUM7WUFDVixDQUFDO1lBQ0QsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDWixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU0sR0FBRyxDQUFDLGNBQXNCLEVBQUUsZ0JBQXdCLEVBQUUsVUFBa0IsRUFBRSxRQUFnQjtRQUNoRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyRSxVQUFVO1lBQ1YsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUVuQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkgsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7WUFDcEIsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUUvRCxLQUFLLE1BQU0sS0FBSyxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7Z0JBQ2QsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDVixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUN2QixDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztvQkFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNiLENBQUMsR0FBRyxPQUFPLENBQUM7Z0JBQ2IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVPLElBQUksQ0FBQyxPQUF1QjtRQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRyxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUM7SUFDaEMsQ0FBQyJ9