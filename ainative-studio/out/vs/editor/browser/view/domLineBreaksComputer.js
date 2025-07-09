/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from '../../../base/browser/trustedTypes.js';
import * as strings from '../../../base/common/strings.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { applyFontInfo } from '../config/domFontInfo.js';
import { StringBuilder } from '../../common/core/stringBuilder.js';
import { ModelLineProjectionData } from '../../common/modelLineProjectionData.js';
import { LineInjectedText } from '../../common/textModelEvents.js';
const ttPolicy = createTrustedTypesPolicy('domLineBreaksComputer', { createHTML: value => value });
export class DOMLineBreaksComputerFactory {
    static create(targetWindow) {
        return new DOMLineBreaksComputerFactory(new WeakRef(targetWindow));
    }
    constructor(targetWindow) {
        this.targetWindow = targetWindow;
    }
    createLineBreaksComputer(fontInfo, tabSize, wrappingColumn, wrappingIndent, wordBreak) {
        const requests = [];
        const injectedTexts = [];
        return {
            addRequest: (lineText, injectedText, previousLineBreakData) => {
                requests.push(lineText);
                injectedTexts.push(injectedText);
            },
            finalize: () => {
                return createLineBreaks(assertIsDefined(this.targetWindow.deref()), requests, fontInfo, tabSize, wrappingColumn, wrappingIndent, wordBreak, injectedTexts);
            }
        };
    }
}
function createLineBreaks(targetWindow, requests, fontInfo, tabSize, firstLineBreakColumn, wrappingIndent, wordBreak, injectedTextsPerLine) {
    function createEmptyLineBreakWithPossiblyInjectedText(requestIdx) {
        const injectedTexts = injectedTextsPerLine[requestIdx];
        if (injectedTexts) {
            const lineText = LineInjectedText.applyInjectedText(requests[requestIdx], injectedTexts);
            const injectionOptions = injectedTexts.map(t => t.options);
            const injectionOffsets = injectedTexts.map(text => text.column - 1);
            // creating a `LineBreakData` with an invalid `breakOffsetsVisibleColumn` is OK
            // because `breakOffsetsVisibleColumn` will never be used because it contains injected text
            return new ModelLineProjectionData(injectionOffsets, injectionOptions, [lineText.length], [], 0);
        }
        else {
            return null;
        }
    }
    if (firstLineBreakColumn === -1) {
        const result = [];
        for (let i = 0, len = requests.length; i < len; i++) {
            result[i] = createEmptyLineBreakWithPossiblyInjectedText(i);
        }
        return result;
    }
    const overallWidth = Math.round(firstLineBreakColumn * fontInfo.typicalHalfwidthCharacterWidth);
    const additionalIndent = (wrappingIndent === 3 /* WrappingIndent.DeepIndent */ ? 2 : wrappingIndent === 2 /* WrappingIndent.Indent */ ? 1 : 0);
    const additionalIndentSize = Math.round(tabSize * additionalIndent);
    const additionalIndentLength = Math.ceil(fontInfo.spaceWidth * additionalIndentSize);
    const containerDomNode = document.createElement('div');
    applyFontInfo(containerDomNode, fontInfo);
    const sb = new StringBuilder(10000);
    const firstNonWhitespaceIndices = [];
    const wrappedTextIndentLengths = [];
    const renderLineContents = [];
    const allCharOffsets = [];
    const allVisibleColumns = [];
    for (let i = 0; i < requests.length; i++) {
        const lineContent = LineInjectedText.applyInjectedText(requests[i], injectedTextsPerLine[i]);
        let firstNonWhitespaceIndex = 0;
        let wrappedTextIndentLength = 0;
        let width = overallWidth;
        if (wrappingIndent !== 0 /* WrappingIndent.None */) {
            firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
            if (firstNonWhitespaceIndex === -1) {
                // all whitespace line
                firstNonWhitespaceIndex = 0;
            }
            else {
                // Track existing indent
                for (let i = 0; i < firstNonWhitespaceIndex; i++) {
                    const charWidth = (lineContent.charCodeAt(i) === 9 /* CharCode.Tab */
                        ? (tabSize - (wrappedTextIndentLength % tabSize))
                        : 1);
                    wrappedTextIndentLength += charWidth;
                }
                const indentWidth = Math.ceil(fontInfo.spaceWidth * wrappedTextIndentLength);
                // Force sticking to beginning of line if no character would fit except for the indentation
                if (indentWidth + fontInfo.typicalFullwidthCharacterWidth > overallWidth) {
                    firstNonWhitespaceIndex = 0;
                    wrappedTextIndentLength = 0;
                }
                else {
                    width = overallWidth - indentWidth;
                }
            }
        }
        const renderLineContent = lineContent.substr(firstNonWhitespaceIndex);
        const tmp = renderLine(renderLineContent, wrappedTextIndentLength, tabSize, width, sb, additionalIndentLength);
        firstNonWhitespaceIndices[i] = firstNonWhitespaceIndex;
        wrappedTextIndentLengths[i] = wrappedTextIndentLength;
        renderLineContents[i] = renderLineContent;
        allCharOffsets[i] = tmp[0];
        allVisibleColumns[i] = tmp[1];
    }
    const html = sb.build();
    const trustedhtml = ttPolicy?.createHTML(html) ?? html;
    containerDomNode.innerHTML = trustedhtml;
    containerDomNode.style.position = 'absolute';
    containerDomNode.style.top = '10000';
    if (wordBreak === 'keepAll') {
        // word-break: keep-all; overflow-wrap: anywhere
        containerDomNode.style.wordBreak = 'keep-all';
        containerDomNode.style.overflowWrap = 'anywhere';
    }
    else {
        // overflow-wrap: break-word
        containerDomNode.style.wordBreak = 'inherit';
        containerDomNode.style.overflowWrap = 'break-word';
    }
    targetWindow.document.body.appendChild(containerDomNode);
    const range = document.createRange();
    const lineDomNodes = Array.prototype.slice.call(containerDomNode.children, 0);
    const result = [];
    for (let i = 0; i < requests.length; i++) {
        const lineDomNode = lineDomNodes[i];
        const breakOffsets = readLineBreaks(range, lineDomNode, renderLineContents[i], allCharOffsets[i]);
        if (breakOffsets === null) {
            result[i] = createEmptyLineBreakWithPossiblyInjectedText(i);
            continue;
        }
        const firstNonWhitespaceIndex = firstNonWhitespaceIndices[i];
        const wrappedTextIndentLength = wrappedTextIndentLengths[i] + additionalIndentSize;
        const visibleColumns = allVisibleColumns[i];
        const breakOffsetsVisibleColumn = [];
        for (let j = 0, len = breakOffsets.length; j < len; j++) {
            breakOffsetsVisibleColumn[j] = visibleColumns[breakOffsets[j]];
        }
        if (firstNonWhitespaceIndex !== 0) {
            // All break offsets are relative to the renderLineContent, make them absolute again
            for (let j = 0, len = breakOffsets.length; j < len; j++) {
                breakOffsets[j] += firstNonWhitespaceIndex;
            }
        }
        let injectionOptions;
        let injectionOffsets;
        const curInjectedTexts = injectedTextsPerLine[i];
        if (curInjectedTexts) {
            injectionOptions = curInjectedTexts.map(t => t.options);
            injectionOffsets = curInjectedTexts.map(text => text.column - 1);
        }
        else {
            injectionOptions = null;
            injectionOffsets = null;
        }
        result[i] = new ModelLineProjectionData(injectionOffsets, injectionOptions, breakOffsets, breakOffsetsVisibleColumn, wrappedTextIndentLength);
    }
    containerDomNode.remove();
    return result;
}
var Constants;
(function (Constants) {
    Constants[Constants["SPAN_MODULO_LIMIT"] = 16384] = "SPAN_MODULO_LIMIT";
})(Constants || (Constants = {}));
function renderLine(lineContent, initialVisibleColumn, tabSize, width, sb, wrappingIndentLength) {
    if (wrappingIndentLength !== 0) {
        const hangingOffset = String(wrappingIndentLength);
        sb.appendString('<div style="text-indent: -');
        sb.appendString(hangingOffset);
        sb.appendString('px; padding-left: ');
        sb.appendString(hangingOffset);
        sb.appendString('px; box-sizing: border-box; width:');
    }
    else {
        sb.appendString('<div style="width:');
    }
    sb.appendString(String(width));
    sb.appendString('px;">');
    // if (containsRTL) {
    // 	sb.appendASCIIString('" dir="ltr');
    // }
    const len = lineContent.length;
    let visibleColumn = initialVisibleColumn;
    let charOffset = 0;
    const charOffsets = [];
    const visibleColumns = [];
    let nextCharCode = (0 < len ? lineContent.charCodeAt(0) : 0 /* CharCode.Null */);
    sb.appendString('<span>');
    for (let charIndex = 0; charIndex < len; charIndex++) {
        if (charIndex !== 0 && charIndex % 16384 /* Constants.SPAN_MODULO_LIMIT */ === 0) {
            sb.appendString('</span><span>');
        }
        charOffsets[charIndex] = charOffset;
        visibleColumns[charIndex] = visibleColumn;
        const charCode = nextCharCode;
        nextCharCode = (charIndex + 1 < len ? lineContent.charCodeAt(charIndex + 1) : 0 /* CharCode.Null */);
        let producedCharacters = 1;
        let charWidth = 1;
        switch (charCode) {
            case 9 /* CharCode.Tab */:
                producedCharacters = (tabSize - (visibleColumn % tabSize));
                charWidth = producedCharacters;
                for (let space = 1; space <= producedCharacters; space++) {
                    if (space < producedCharacters) {
                        sb.appendCharCode(0xA0); // &nbsp;
                    }
                    else {
                        sb.appendASCIICharCode(32 /* CharCode.Space */);
                    }
                }
                break;
            case 32 /* CharCode.Space */:
                if (nextCharCode === 32 /* CharCode.Space */) {
                    sb.appendCharCode(0xA0); // &nbsp;
                }
                else {
                    sb.appendASCIICharCode(32 /* CharCode.Space */);
                }
                break;
            case 60 /* CharCode.LessThan */:
                sb.appendString('&lt;');
                break;
            case 62 /* CharCode.GreaterThan */:
                sb.appendString('&gt;');
                break;
            case 38 /* CharCode.Ampersand */:
                sb.appendString('&amp;');
                break;
            case 0 /* CharCode.Null */:
                sb.appendString('&#00;');
                break;
            case 65279 /* CharCode.UTF8_BOM */:
            case 8232 /* CharCode.LINE_SEPARATOR */:
            case 8233 /* CharCode.PARAGRAPH_SEPARATOR */:
            case 133 /* CharCode.NEXT_LINE */:
                sb.appendCharCode(0xFFFD);
                break;
            default:
                if (strings.isFullWidthCharacter(charCode)) {
                    charWidth++;
                }
                if (charCode < 32) {
                    sb.appendCharCode(9216 + charCode);
                }
                else {
                    sb.appendCharCode(charCode);
                }
        }
        charOffset += producedCharacters;
        visibleColumn += charWidth;
    }
    sb.appendString('</span>');
    charOffsets[lineContent.length] = charOffset;
    visibleColumns[lineContent.length] = visibleColumn;
    sb.appendString('</div>');
    return [charOffsets, visibleColumns];
}
function readLineBreaks(range, lineDomNode, lineContent, charOffsets) {
    if (lineContent.length <= 1) {
        return null;
    }
    const spans = Array.prototype.slice.call(lineDomNode.children, 0);
    const breakOffsets = [];
    try {
        discoverBreaks(range, spans, charOffsets, 0, null, lineContent.length - 1, null, breakOffsets);
    }
    catch (err) {
        console.log(err);
        return null;
    }
    if (breakOffsets.length === 0) {
        return null;
    }
    breakOffsets.push(lineContent.length);
    return breakOffsets;
}
function discoverBreaks(range, spans, charOffsets, low, lowRects, high, highRects, result) {
    if (low === high) {
        return;
    }
    lowRects = lowRects || readClientRect(range, spans, charOffsets[low], charOffsets[low + 1]);
    highRects = highRects || readClientRect(range, spans, charOffsets[high], charOffsets[high + 1]);
    if (Math.abs(lowRects[0].top - highRects[0].top) <= 0.1) {
        // same line
        return;
    }
    // there is at least one line break between these two offsets
    if (low + 1 === high) {
        // the two characters are adjacent, so the line break must be exactly between them
        result.push(high);
        return;
    }
    const mid = low + ((high - low) / 2) | 0;
    const midRects = readClientRect(range, spans, charOffsets[mid], charOffsets[mid + 1]);
    discoverBreaks(range, spans, charOffsets, low, lowRects, mid, midRects, result);
    discoverBreaks(range, spans, charOffsets, mid, midRects, high, highRects, result);
}
function readClientRect(range, spans, startOffset, endOffset) {
    range.setStart(spans[(startOffset / 16384 /* Constants.SPAN_MODULO_LIMIT */) | 0].firstChild, startOffset % 16384 /* Constants.SPAN_MODULO_LIMIT */);
    range.setEnd(spans[(endOffset / 16384 /* Constants.SPAN_MODULO_LIMIT */) | 0].firstChild, endOffset % 16384 /* Constants.SPAN_MODULO_LIMIT */);
    return range.getClientRects();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tTGluZUJyZWFrc0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXcvZG9tTGluZUJyZWFrc0NvbXB1dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWpGLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUd6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbkUsT0FBTyxFQUFtRCx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25JLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRW5FLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLHVCQUF1QixFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztBQUVuRyxNQUFNLE9BQU8sNEJBQTRCO0lBRWpDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBb0I7UUFDeEMsT0FBTyxJQUFJLDRCQUE0QixDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVELFlBQW9CLFlBQTZCO1FBQTdCLGlCQUFZLEdBQVosWUFBWSxDQUFpQjtJQUNqRCxDQUFDO0lBRU0sd0JBQXdCLENBQUMsUUFBa0IsRUFBRSxPQUFlLEVBQUUsY0FBc0IsRUFBRSxjQUE4QixFQUFFLFNBQStCO1FBQzNKLE1BQU0sUUFBUSxHQUFh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