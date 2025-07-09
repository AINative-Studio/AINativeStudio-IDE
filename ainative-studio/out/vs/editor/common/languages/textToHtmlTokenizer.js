/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { LineTokens } from '../tokens/lineTokens.js';
import { TokenizationRegistry } from '../languages.js';
import { NullState, nullTokenizeEncoded } from './nullTokenize.js';
const fallback = {
    getInitialState: () => NullState,
    tokenizeEncoded: (buffer, hasEOL, state) => nullTokenizeEncoded(0 /* LanguageId.Null */, state)
};
export function tokenizeToStringSync(languageService, text, languageId) {
    return _tokenizeToString(text, languageService.languageIdCodec, TokenizationRegistry.get(languageId) || fallback);
}
export async function tokenizeToString(languageService, text, languageId) {
    if (!languageId) {
        return _tokenizeToString(text, languageService.languageIdCodec, fallback);
    }
    const tokenizationSupport = await TokenizationRegistry.getOrCreate(languageId);
    return _tokenizeToString(text, languageService.languageIdCodec, tokenizationSupport || fallback);
}
export function tokenizeLineToHTML(text, viewLineTokens, colorMap, startOffset, endOffset, tabSize, useNbsp) {
    let result = `<div>`;
    let charIndex = startOffset;
    let tabsCharDelta = 0;
    let prevIsSpace = true;
    for (let tokenIndex = 0, tokenCount = viewLineTokens.getCount(); tokenIndex < tokenCount; tokenIndex++) {
        const tokenEndIndex = viewLineTokens.getEndOffset(tokenIndex);
        if (tokenEndIndex <= startOffset) {
            continue;
        }
        let partContent = '';
        for (; charIndex < tokenEndIndex && charIndex < endOffset; charIndex++) {
            const charCode = text.charCodeAt(charIndex);
            switch (charCode) {
                case 9 /* CharCode.Tab */: {
                    let insertSpacesCount = tabSize - (charIndex + tabsCharDelta) % tabSize;
                    tabsCharDelta += insertSpacesCount - 1;
                    while (insertSpacesCount > 0) {
                        if (useNbsp && prevIsSpace) {
                            partContent += '&#160;';
                            prevIsSpace = false;
                        }
                        else {
                            partContent += ' ';
                            prevIsSpace = true;
                        }
                        insertSpacesCount--;
                    }
                    break;
                }
                case 60 /* CharCode.LessThan */:
                    partContent += '&lt;';
                    prevIsSpace = false;
                    break;
                case 62 /* CharCode.GreaterThan */:
                    partContent += '&gt;';
                    prevIsSpace = false;
                    break;
                case 38 /* CharCode.Ampersand */:
                    partContent += '&amp;';
                    prevIsSpace = false;
                    break;
                case 0 /* CharCode.Null */:
                    partContent += '&#00;';
                    prevIsSpace = false;
                    break;
                case 65279 /* CharCode.UTF8_BOM */:
                case 8232 /* CharCode.LINE_SEPARATOR */:
                case 8233 /* CharCode.PARAGRAPH_SEPARATOR */:
                case 133 /* CharCode.NEXT_LINE */:
                    partContent += '\ufffd';
                    prevIsSpace = false;
                    break;
                case 13 /* CharCode.CarriageReturn */:
                    // zero width space, because carriage return would introduce a line break
                    partContent += '&#8203';
                    prevIsSpace = false;
                    break;
                case 32 /* CharCode.Space */:
                    if (useNbsp && prevIsSpace) {
                        partContent += '&#160;';
                        prevIsSpace = false;
                    }
                    else {
                        partContent += ' ';
                        prevIsSpace = true;
                    }
                    break;
                default:
                    partContent += String.fromCharCode(charCode);
                    prevIsSpace = false;
            }
        }
        result += `<span style="${viewLineTokens.getInlineStyle(tokenIndex, colorMap)}">${partContent}</span>`;
        if (tokenEndIndex > endOffset || charIndex >= endOffset) {
            break;
        }
    }
    result += `</div>`;
    return result;
}
export function _tokenizeToString(text, languageIdCodec, tokenizationSupport) {
    let result = `<div class="monaco-tokenized-source">`;
    const lines = strings.splitLines(text);
    let currentState = tokenizationSupport.getInitialState();
    for (let i = 0, len = lines.length; i < len; i++) {
        const line = lines[i];
        if (i > 0) {
            result += `<br/>`;
        }
        const tokenizationResult = tokenizationSupport.tokenizeEncoded(line, true, currentState);
        LineTokens.convertToEndOffset(tokenizationResult.tokens, line.length);
        const lineTokens = new LineTokens(tokenizationResult.tokens, line, languageIdCodec);
        const viewLineTokens = lineTokens.inflate();
        let startOffset = 0;
        for (let j = 0, lenJ = viewLineTokens.getCount(); j < lenJ; j++) {
            const type = viewLineTokens.getClassName(j);
            const endIndex = viewLineTokens.getEndOffset(j);
            result += `<span class="${type}">${strings.escape(line.substring(startOffset, endIndex))}</span>`;
            startOffset = endIndex;
        }
        currentState = tokenizationResult.endState;
    }
    result += `</div>`;
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFRvSHRtbFRva2VuaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy90ZXh0VG9IdG1sVG9rZW5pemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFtQixVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RSxPQUFPLEVBQWtELG9CQUFvQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFdkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBS25FLE1BQU0sUUFBUSxHQUFnQztJQUM3QyxlQUFlLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztJQUNoQyxlQUFlLEVBQUUsQ0FBQyxNQUFjLEVBQUUsTUFBZSxFQUFFLEtBQWEsRUFBRSxFQUFFLENBQUMsbUJBQW1CLDBCQUFrQixLQUFLLENBQUM7Q0FDaEgsQ0FBQztBQUVGLE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxlQUFpQyxFQUFFLElBQVksRUFBRSxVQUFrQjtJQUN2RyxPQUFPLGlCQUFpQixDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQztBQUNuSCxDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxlQUFpQyxFQUFFLElBQVksRUFBRSxVQUF5QjtJQUNoSCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDakIsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMz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