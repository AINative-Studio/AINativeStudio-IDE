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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tTGluZUJyZWFrc0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlldy9kb21MaW5lQnJlYWtzQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFakYsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBR3pELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVuRSxPQUFPLEVBQW1ELHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkksT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFbkUsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBRW5HLE1BQU0sT0FBTyw0QkFBNEI7SUFFakMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFvQjtRQUN4QyxPQUFPLElBQUksNEJBQTRCLENBQUMsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsWUFBb0IsWUFBNkI7UUFBN0IsaUJBQVksR0FBWixZQUFZLENBQWlCO0lBQ2pELENBQUM7SUFFTSx3QkFBd0IsQ0FBQyxRQUFrQixFQUFFLE9BQWUsRUFBRSxjQUFzQixFQUFFLGNBQThCLEVBQUUsU0FBK0I7UUFDM0osTUFBTSxRQUFRLEdBQWEs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