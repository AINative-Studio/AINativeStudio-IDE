/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { Position } from '../core/position.js';
import { ContiguousTokensEditing, EMPTY_LINE_TOKENS, toUint32Array } from './contiguousTokensEditing.js';
import { LineTokens } from './lineTokens.js';
import { TokenMetadata } from '../encodedTokenAttributes.js';
/**
 * Represents contiguous tokens in a text model.
 */
export class ContiguousTokensStore {
    constructor(languageIdCodec) {
        this._lineTokens = [];
        this._len = 0;
        this._languageIdCodec = languageIdCodec;
    }
    flush() {
        this._lineTokens = [];
        this._len = 0;
    }
    get hasTokens() {
        return this._lineTokens.length > 0;
    }
    getTokens(topLevelLanguageId, lineIndex, lineText) {
        let rawLineTokens = null;
        if (lineIndex < this._len) {
            rawLineTokens = this._lineTokens[lineIndex];
        }
        if (rawLineTokens !== null && rawLineTokens !== EMPTY_LINE_TOKENS) {
            return new LineTokens(toUint32Array(rawLineTokens), lineText, this._languageIdCodec);
        }
        const lineTokens = new Uint32Array(2);
        lineTokens[0] = lineText.length;
        lineTokens[1] = getDefaultMetadata(this._languageIdCodec.encodeLanguageId(topLevelLanguageId));
        return new LineTokens(lineTokens, lineText, this._languageIdCodec);
    }
    static _massageTokens(topLevelLanguageId, lineTextLength, _tokens) {
        const tokens = _tokens ? toUint32Array(_tokens) : null;
        if (lineTextLength === 0) {
            let hasDifferentLanguageId = false;
            if (tokens && tokens.length > 1) {
                hasDifferentLanguageId = (TokenMetadata.getLanguageId(tokens[1]) !== topLevelLanguageId);
            }
            if (!hasDifferentLanguageId) {
                return EMPTY_LINE_TOKENS;
            }
        }
        if (!tokens || tokens.length === 0) {
            const tokens = new Uint32Array(2);
            tokens[0] = lineTextLength;
            tokens[1] = getDefaultMetadata(topLevelLanguageId);
            return tokens.buffer;
        }
        // Ensure the last token covers the end of the text
        tokens[tokens.length - 2] = lineTextLength;
        if (tokens.byteOffset === 0 && tokens.byteLength === tokens.buffer.byteLength) {
            // Store directly the ArrayBuffer pointer to save an object
            return tokens.buffer;
        }
        return tokens;
    }
    _ensureLine(lineIndex) {
        while (lineIndex >= this._len) {
            this._lineTokens[this._len] = null;
            this._len++;
        }
    }
    _deleteLines(start, deleteCount) {
        if (deleteCount === 0) {
            return;
        }
        if (start + deleteCount > this._len) {
            deleteCount = this._len - start;
        }
        this._lineTokens.splice(start, deleteCount);
        this._len -= deleteCount;
    }
    _insertLines(insertIndex, insertCount) {
        if (insertCount === 0) {
            return;
        }
        const lineTokens = [];
        for (let i = 0; i < insertCount; i++) {
            lineTokens[i] = null;
        }
        this._lineTokens = arrays.arrayInsert(this._lineTokens, insertIndex, lineTokens);
        this._len += insertCount;
    }
    setTokens(topLevelLanguageId, lineIndex, lineTextLength, _tokens, checkEquality) {
        const tokens = ContiguousTokensStore._massageTokens(this._languageIdCodec.encodeLanguageId(topLevelLanguageId), lineTextLength, _tokens);
        this._ensureLine(lineIndex);
        const oldTokens = this._lineTokens[lineIndex];
        this._lineTokens[lineIndex] = tokens;
        if (checkEquality) {
            return !ContiguousTokensStore._equals(oldTokens, tokens);
        }
        return false;
    }
    static _equals(_a, _b) {
        if (!_a || !_b) {
            return !_a && !_b;
        }
        const a = toUint32Array(_a);
        const b = toUint32Array(_b);
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0, len = a.length; i < len; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    //#region Editing
    acceptEdit(range, eolCount, firstLineLength) {
        this._acceptDeleteRange(range);
        this._acceptInsertText(new Position(range.startLineNumber, range.startColumn), eolCount, firstLineLength);
    }
    _acceptDeleteRange(range) {
        const firstLineIndex = range.startLineNumber - 1;
        if (firstLineIndex >= this._len) {
            return;
        }
        if (range.startLineNumber === range.endLineNumber) {
            if (range.startColumn === range.endColumn) {
                // Nothing to delete
                return;
            }
            this._lineTokens[firstLineIndex] = ContiguousTokensEditing.delete(this._lineTokens[firstLineIndex], range.startColumn - 1, range.endColumn - 1);
            return;
        }
        this._lineTokens[firstLineIndex] = ContiguousTokensEditing.deleteEnding(this._lineTokens[firstLineIndex], range.startColumn - 1);
        const lastLineIndex = range.endLineNumber - 1;
        let lastLineTokens = null;
        if (lastLineIndex < this._len) {
            lastLineTokens = ContiguousTokensEditing.deleteBeginning(this._lineTokens[lastLineIndex], range.endColumn - 1);
        }
        // Take remaining text on last line and append it to remaining text on first line
        this._lineTokens[firstLineIndex] = ContiguousTokensEditing.append(this._lineTokens[firstLineIndex], lastLineTokens);
        // Delete middle lines
        this._deleteLines(range.startLineNumber, range.endLineNumber - range.startLineNumber);
    }
    _acceptInsertText(position, eolCount, firstLineLength) {
        if (eolCount === 0 && firstLineLength === 0) {
            // Nothing to insert
            return;
        }
        const lineIndex = position.lineNumber - 1;
        if (lineIndex >= this._len) {
            return;
        }
        if (eolCount === 0) {
            // Inserting text on one line
            this._lineTokens[lineIndex] = ContiguousTokensEditing.insert(this._lineTokens[lineIndex], position.column - 1, firstLineLength);
            return;
        }
        this._lineTokens[lineIndex] = ContiguousTokensEditing.deleteEnding(this._lineTokens[lineIndex], position.column - 1);
        this._lineTokens[lineIndex] = ContiguousTokensEditing.insert(this._lineTokens[lineIndex], position.column - 1, firstLineLength);
        this._insertLines(position.lineNumber, eolCount);
    }
    //#endregion
    setMultilineTokens(tokens, textModel) {
        if (tokens.length === 0) {
            return { changes: [] };
        }
        const ranges = [];
        for (let i = 0, len = tokens.length; i < len; i++) {
            const element = tokens[i];
            let minChangedLineNumber = 0;
            let maxChangedLineNumber = 0;
            let hasChange = false;
            for (let lineNumber = element.startLineNumber; lineNumber <= element.endLineNumber; lineNumber++) {
                if (hasChange) {
                    this.setTokens(textModel.getLanguageId(), lineNumber - 1, textModel.getLineLength(lineNumber), element.getLineTokens(lineNumber), false);
                    maxChangedLineNumber = lineNumber;
                }
                else {
                    const lineHasChange = this.setTokens(textModel.getLanguageId(), lineNumber - 1, textModel.getLineLength(lineNumber), element.getLineTokens(lineNumber), true);
                    if (lineHasChange) {
                        hasChange = true;
                        minChangedLineNumber = lineNumber;
                        maxChangedLineNumber = lineNumber;
                    }
                }
            }
            if (hasChange) {
                ranges.push({ fromLineNumber: minChangedLineNumber, toLineNumber: maxChangedLineNumber, });
            }
        }
        return { changes: ranges };
    }
}
function getDefaultMetadata(topLevelLanguageId) {
    return ((topLevelLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
        | (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)
        | (0 /* FontStyle.None */ << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)
        | (1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
        | (2 /* ColorId.DefaultBackground */ << 24 /* MetadataConsts.BACKGROUND_OFFSET */)
        // If there is no grammar, we just take a guess and try to match brackets.
        | (1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */)) >>> 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGlndW91c1Rva2Vuc1N0b3JlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdG9rZW5zL2NvbnRpZ3VvdXNUb2tlbnNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTdDLE9BQU8sRUFBcUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFJaEk7O0dBRUc7QUFDSCxNQUFNLE9BQU8scUJBQXFCO0lBS2pDLFlBQVksZUFBaUM7UUFDNUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDO0lBQ3pDLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7SUFDZixDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVNLFNBQVMsQ0FBQyxrQkFBMEIsRUFBRSxTQUFpQixFQUFFLFFBQWdCO1FBQy9FLElBQUksYUFBYSxHQUFxQyxJQUFJLENBQUM7UUFDM0QsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzNCLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxJQUFJLGFBQWEsS0FBSyxJQUFJLElBQUksYUFBYSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDbkUsT0FBTyxJQUFJLFVBQVUsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUNoQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUMvRixPQUFPLElBQUksVUFBVSxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVPLE1BQU0sQ0FBQyxjQUFjLENBQUMsa0JBQThCLEVBQUUsY0FBc0IsRUFBRSxPQUF5QztRQUU5SCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRXZELElBQUksY0FBYyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLElBQUksc0JBQXNCLEdBQUcsS0FBSyxDQUFDO1lBQ25DLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLHNCQUFzQixHQUFHLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzFGLENBQUM7WUFFRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxpQkFBaUIsQ0FBQztZQUMxQixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsY0FBYyxDQUFDO1lBQzNCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ25ELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUN0QixDQUFDO1FBRUQsbURBQW1EO1FBQ25ELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLGNBQWMsQ0FBQztRQUUzQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEtBQUssTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMvRSwyREFBMkQ7WUFDM0QsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ3RCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxXQUFXLENBQUMsU0FBaUI7UUFDcEMsT0FBTyxTQUFTLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztZQUNuQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FBQyxLQUFhLEVBQUUsV0FBbUI7UUFDdEQsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLEtBQUssR0FBRyxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUNqQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxJQUFJLElBQUksV0FBVyxDQUFDO0lBQzFCLENBQUM7SUFFTyxZQUFZLENBQUMsV0FBbUIsRUFBRSxXQUFtQjtRQUM1RCxJQUFJLFdBQVcsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sVUFBVSxHQUF5QyxFQUFFLENBQUM7UUFDNUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDdEIsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNqRixJQUFJLENBQUMsSUFBSSxJQUFJLFdBQVcsQ0FBQztJQUMxQixDQUFDO0lBRU0sU0FBUyxDQUFDLGtCQUEwQixFQUFFLFNBQWlCLEVBQUUsY0FBc0IsRUFBRSxPQUF5QyxFQUFFLGFBQXNCO1FBQ3hKLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekksSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBRXJDLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBb0MsRUFBRSxFQUFvQztRQUNoRyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNuQixDQUFDO1FBRUQsTUFBTSxDQUFDLEdBQUcsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxHQUFHLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUU1QixJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELGlCQUFpQjtJQUVWLFVBQVUsQ0FBQyxLQUFhLEVBQUUsUUFBZ0IsRUFBRSxlQUF1QjtRQUN6RSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUMzRyxDQUFDO0lBRU8sa0JBQWtCLENBQUMsS0FBYTtRQUV2QyxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztRQUNqRCxJQUFJLGNBQWMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxlQUFlLEtBQUssS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25ELElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQzNDLG9CQUFvQjtnQkFDcEIsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEosT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFakksTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDOUMsSUFBSSxjQUFjLEdBQXFDLElBQUksQ0FBQztRQUM1RCxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDL0IsY0FBYyxHQUFHLHVCQUF1QixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDaEgsQ0FBQztRQUVELGlGQUFpRjtRQUNqRixJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRXBILHNCQUFzQjtRQUN0QixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFFBQWtCLEVBQUUsUUFBZ0IsRUFBRSxlQUF1QjtRQUV0RixJQUFJLFFBQVEsS0FBSyxDQUFDLElBQUksZUFBZSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdDLG9CQUFvQjtZQUNwQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLElBQUksU0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM1QixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BCLDZCQUE2QjtZQUM3QixJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQ2hJLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3JILElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFaEksSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxZQUFZO0lBRUwsa0JBQWtCLENBQUMsTUFBbUMsRUFBRSxTQUFxQjtRQUNuRixJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUN4QixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQXVELEVBQUUsQ0FBQztRQUV0RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLElBQUksb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLElBQUksb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztZQUN0QixLQUFLLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxlQUFlLEVBQUUsVUFBVSxJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDbEcsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxVQUFVLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDekksb0JBQW9CLEdBQUcsVUFBVSxDQUFDO2dCQUNuQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLEVBQUUsVUFBVSxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQzlKLElBQUksYUFBYSxFQUFFLENBQUM7d0JBQ25CLFNBQVMsR0FBRyxJQUFJLENBQUM7d0JBQ2pCLG9CQUFvQixHQUFHLFVBQVUsQ0FBQzt3QkFDbEMsb0JBQW9CLEdBQUcsVUFBVSxDQUFDO29CQUNuQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsY0FBYyxFQUFFLG9CQUFvQixFQUFFLFlBQVksRUFBRSxvQkFBb0IsR0FBRyxDQUFDLENBQUM7WUFDNUYsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQzVCLENBQUM7Q0FDRDtBQUVELFNBQVMsa0JBQWtCLENBQUMsa0JBQThCO0lBQ3pELE9BQU8sQ0FDTixDQUFDLGtCQUFrQiw0Q0FBb0MsQ0FBQztVQUN0RCxDQUFDLDJFQUEyRCxDQUFDO1VBQzdELENBQUMsbUVBQWtELENBQUM7VUFDcEQsQ0FBQyw4RUFBNkQsQ0FBQztVQUMvRCxDQUFDLDhFQUE2RCxDQUFDO1FBQ2pFLDBFQUEwRTtVQUN4RSxrREFBdUMsQ0FDekMsS0FBSyxDQUFDLENBQUM7QUFDVCxDQUFDIn0=