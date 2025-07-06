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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFRvSHRtbFRva2VuaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3RleHRUb0h0bWxUb2tlbml6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQW1CLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RFLE9BQU8sRUFBa0Qsb0JBQW9CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUV2RyxPQUFPLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFLbkUsTUFBTSxRQUFRLEdBQWdDO0lBQzdDLGVBQWUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO0lBQ2hDLGVBQWUsRUFBRSxDQUFDLE1BQWMsRUFBRSxNQUFlLEVBQUUsS0FBYSxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsMEJBQWtCLEtBQUssQ0FBQztDQUNoSCxDQUFDO0FBRUYsTUFBTSxVQUFVLG9CQUFvQixDQUFDLGVBQWlDLEVBQUUsSUFBWSxFQUFFLFVBQWtCO0lBQ3ZHLE9BQU8saUJBQWlCLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDO0FBQ25ILENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUFDLGVBQWlDLEVBQUUsSUFBWSxFQUFFLFVBQXlCO0lBQ2hILElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNqQixPQUFPLGlCQUFpQixDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzNF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