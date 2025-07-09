/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import * as strings from '../../../base/common/strings.js';
import { StringBuilder } from '../core/stringBuilder.js';
import { LineDecoration, LineDecorationsNormalizer } from './lineDecorations.js';
import { LinePart } from './linePart.js';
export var RenderWhitespace;
(function (RenderWhitespace) {
    RenderWhitespace[RenderWhitespace["None"] = 0] = "None";
    RenderWhitespace[RenderWhitespace["Boundary"] = 1] = "Boundary";
    RenderWhitespace[RenderWhitespace["Selection"] = 2] = "Selection";
    RenderWhitespace[RenderWhitespace["Trailing"] = 3] = "Trailing";
    RenderWhitespace[RenderWhitespace["All"] = 4] = "All";
})(RenderWhitespace || (RenderWhitespace = {}));
export class LineRange {
    constructor(startIndex, endIndex) {
        this.startOffset = startIndex;
        this.endOffset = endIndex;
    }
    equals(otherLineRange) {
        return this.startOffset === otherLineRange.startOffset
            && this.endOffset === otherLineRange.endOffset;
    }
}
export class RenderLineInput {
    constructor(useMonospaceOptimizations, canUseHalfwidthRightwardsArrow, lineContent, continuesWithWrappedLine, isBasicASCII, containsRTL, fauxIndentLength, lineTokens, lineDecorations, tabSize, startVisibleColumn, spaceWidth, middotWidth, wsmiddotWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures, selectionsOnLine) {
        this.useMonospaceOptimizations = useMonospaceOptimizations;
        this.canUseHalfwidthRightwardsArrow = canUseHalfwidthRightwardsArrow;
        this.lineContent = lineContent;
        this.continuesWithWrappedLine = continuesWithWrappedLine;
        this.isBasicASCII = isBasicASCII;
        this.containsRTL = containsRTL;
        this.fauxIndentLength = fauxIndentLength;
        this.lineTokens = lineTokens;
        this.lineDecorations = lineDecorations.sort(LineDecoration.compare);
        this.tabSize = tabSize;
        this.startVisibleColumn = startVisibleColumn;
        this.spaceWidth = spaceWidth;
        this.stopRenderingLineAfter = stopRenderingLineAfter;
        this.renderWhitespace = (renderWhitespace === 'all'
            ? 4 /* RenderWhitespace.All */
            : renderWhitespace === 'boundary'
                ? 1 /* RenderWhitespace.Boundary */
                : renderWhitespace === 'selection'
                    ? 2 /* RenderWhitespace.Selection */
                    : renderWhitespace === 'trailing'
                        ? 3 /* RenderWhitespace.Trailing */
                        : 0 /* RenderWhitespace.None */);
        this.renderControlCharacters = renderControlCharacters;
        this.fontLigatures = fontLigatures;
        this.selectionsOnLine = selectionsOnLine && selectionsOnLine.sort((a, b) => a.startOffset < b.startOffset ? -1 : 1);
        const wsmiddotDiff = Math.abs(wsmiddotWidth - spaceWidth);
        const middotDiff = Math.abs(middotWidth - spaceWidth);
        if (wsmiddotDiff < middotDiff) {
            this.renderSpaceWidth = wsmiddotWidth;
            this.renderSpaceCharCode = 0x2E31; // U+2E31 - WORD SEPARATOR MIDDLE DOT
        }
        else {
            this.renderSpaceWidth = middotWidth;
            this.renderSpaceCharCode = 0xB7; // U+00B7 - MIDDLE DOT
        }
    }
    sameSelection(otherSelections) {
        if (this.selectionsOnLine === null) {
            return otherSelections === null;
        }
        if (otherSelections === null) {
            return false;
        }
        if (otherSelections.length !== this.selectionsOnLine.length) {
            return false;
        }
        for (let i = 0; i < this.selectionsOnLine.length; i++) {
            if (!this.selectionsOnLine[i].equals(otherSelections[i])) {
                return false;
            }
        }
        return true;
    }
    equals(other) {
        return (this.useMonospaceOptimizations === other.useMonospaceOptimizations
            && this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
            && this.lineContent === other.lineContent
            && this.continuesWithWrappedLine === other.continuesWithWrappedLine
            && this.isBasicASCII === other.isBasicASCII
            && this.containsRTL === other.containsRTL
            && this.fauxIndentLength === other.fauxIndentLength
            && this.tabSize === other.tabSize
            && this.startVisibleColumn === other.startVisibleColumn
            && this.spaceWidth === other.spaceWidth
            && this.renderSpaceWidth === other.renderSpaceWidth
            && this.renderSpaceCharCode === other.renderSpaceCharCode
            && this.stopRenderingLineAfter === other.stopRenderingLineAfter
            && this.renderWhitespace === other.renderWhitespace
            && this.renderControlCharacters === other.renderControlCharacters
            && this.fontLigatures === other.fontLigatures
            && LineDecoration.equalsArr(this.lineDecorations, other.lineDecorations)
            && this.lineTokens.equals(other.lineTokens)
            && this.sameSelection(other.selectionsOnLine));
    }
}
var CharacterMappingConstants;
(function (CharacterMappingConstants) {
    CharacterMappingConstants[CharacterMappingConstants["PART_INDEX_MASK"] = 4294901760] = "PART_INDEX_MASK";
    CharacterMappingConstants[CharacterMappingConstants["CHAR_INDEX_MASK"] = 65535] = "CHAR_INDEX_MASK";
    CharacterMappingConstants[CharacterMappingConstants["CHAR_INDEX_OFFSET"] = 0] = "CHAR_INDEX_OFFSET";
    CharacterMappingConstants[CharacterMappingConstants["PART_INDEX_OFFSET"] = 16] = "PART_INDEX_OFFSET";
})(CharacterMappingConstants || (CharacterMappingConstants = {}));
export class DomPosition {
    constructor(partIndex, charIndex) {
        this.partIndex = partIndex;
        this.charIndex = charIndex;
    }
}
/**
 * Provides a both direction mapping between a line's character and its rendered position.
 */
export class CharacterMapping {
    static getPartIndex(partData) {
        return (partData & 4294901760 /* CharacterMappingConstants.PART_INDEX_MASK */) >>> 16 /* CharacterMappingConstants.PART_INDEX_OFFSET */;
    }
    static getCharIndex(partData) {
        return (partData & 65535 /* CharacterMappingConstants.CHAR_INDEX_MASK */) >>> 0 /* CharacterMappingConstants.CHAR_INDEX_OFFSET */;
    }
    constructor(length, partCount) {
        this.length = length;
        this._data = new Uint32Array(this.length);
        this._horizontalOffset = new Uint32Array(this.length);
    }
    setColumnInfo(column, partIndex, charIndex, horizontalOffset) {
        const partData = ((partIndex << 16 /* CharacterMappingConstants.PART_INDEX_OFFSET */)
            | (charIndex << 0 /* CharacterMappingConstants.CHAR_INDEX_OFFSET */)) >>> 0;
        this._data[column - 1] = partData;
        this._horizontalOffset[column - 1] = horizontalOffset;
    }
    getHorizontalOffset(column) {
        if (this._horizontalOffset.length === 0) {
            // No characters on this line
            return 0;
        }
        return this._horizontalOffset[column - 1];
    }
    charOffsetToPartData(charOffset) {
        if (this.length === 0) {
            return 0;
        }
        if (charOffset < 0) {
            return this._data[0];
        }
        if (charOffset >= this.length) {
            return this._data[this.length - 1];
        }
        return this._data[charOffset];
    }
    getDomPosition(column) {
        const partData = this.charOffsetToPartData(column - 1);
        const partIndex = CharacterMapping.getPartIndex(partData);
        const charIndex = CharacterMapping.getCharIndex(partData);
        return new DomPosition(partIndex, charIndex);
    }
    getColumn(domPosition, partLength) {
        const charOffset = this.partDataToCharOffset(domPosition.partIndex, partLength, domPosition.charIndex);
        return charOffset + 1;
    }
    partDataToCharOffset(partIndex, partLength, charIndex) {
        if (this.length === 0) {
            return 0;
        }
        const searchEntry = ((partIndex << 16 /* CharacterMappingConstants.PART_INDEX_OFFSET */)
            | (charIndex << 0 /* CharacterMappingConstants.CHAR_INDEX_OFFSET */)) >>> 0;
        let min = 0;
        let max = this.length - 1;
        while (min + 1 < max) {
            const mid = ((min + max) >>> 1);
            const midEntry = this._data[mid];
            if (midEntry === searchEntry) {
                return mid;
            }
            else if (midEntry > searchEntry) {
                max = mid;
            }
            else {
                min = mid;
            }
        }
        if (min === max) {
            return min;
        }
        const minEntry = this._data[min];
        const maxEntry = this._data[max];
        if (minEntry === searchEntry) {
            return min;
        }
        if (maxEntry === searchEntry) {
            return max;
        }
        const minPartIndex = CharacterMapping.getPartIndex(minEntry);
        const minCharIndex = CharacterMapping.getCharIndex(minEntry);
        const maxPartIndex = CharacterMapping.getPartIndex(maxEntry);
        let maxCharIndex;
        if (minPartIndex !== maxPartIndex) {
            // sitting between parts
            maxCharIndex = partLength;
        }
        else {
            maxCharIndex = CharacterMapping.getCharIndex(maxEntry);
        }
        const minEntryDistance = charIndex - minCharIndex;
        const maxEntryDistance = maxCharIndex - charIndex;
        if (minEntryDistance <= maxEntryDistance) {
            return min;
        }
        return max;
    }
    inflate() {
        const result = [];
        for (let i = 0; i < this.length; i++) {
            const partData = this._data[i];
            const partIndex = CharacterMapping.getPartIndex(partData);
            const charIndex = CharacterMapping.getCharIndex(partData);
            const visibleColumn = this._horizontalOffset[i];
            result.push([partIndex, charIndex, visibleColumn]);
        }
        return result;
    }
}
export var ForeignElementType;
(function (ForeignElementType) {
    ForeignElementType[ForeignElementType["None"] = 0] = "None";
    ForeignElementType[ForeignElementType["Before"] = 1] = "Before";
    ForeignElementType[ForeignElementType["After"] = 2] = "After";
})(ForeignElementType || (ForeignElementType = {}));
export class RenderLineOutput {
    constructor(characterMapping, containsRTL, containsForeignElements) {
        this._renderLineOutputBrand = undefined;
        this.characterMapping = characterMapping;
        this.containsRTL = containsRTL;
        this.containsForeignElements = containsForeignElements;
    }
}
export function renderViewLine(input, sb) {
    if (input.lineContent.length === 0) {
        if (input.lineDecorations.length > 0) {
            // This line is empty, but it contains inline decorations
            sb.appendString(`<span>`);
            let beforeCount = 0;
            let afterCount = 0;
            let containsForeignElements = 0 /* ForeignElementType.None */;
            for (const lineDecoration of input.lineDecorations) {
                if (lineDecoration.type === 1 /* InlineDecorationType.Before */ || lineDecoration.type === 2 /* InlineDecorationType.After */) {
                    sb.appendString(`<span class="`);
                    sb.appendString(lineDecoration.className);
                    sb.appendString(`"></span>`);
                    if (lineDecoration.type === 1 /* InlineDecorationType.Before */) {
                        containsForeignElements |= 1 /* ForeignElementType.Before */;
                        beforeCount++;
                    }
                    if (lineDecoration.type === 2 /* InlineDecorationType.After */) {
                        containsForeignElements |= 2 /* ForeignElementType.After */;
                        afterCount++;
                    }
                }
            }
            sb.appendString(`</span>`);
            const characterMapping = new CharacterMapping(1, beforeCount + afterCount);
            characterMapping.setColumnInfo(1, beforeCount, 0, 0);
            return new RenderLineOutput(characterMapping, false, containsForeignElements);
        }
        // completely empty line
        sb.appendString('<span><span></span></span>');
        return new RenderLineOutput(new CharacterMapping(0, 0), false, 0 /* ForeignElementType.None */);
    }
    return _renderLine(resolveRenderLineInput(input), sb);
}
export class RenderLineOutput2 {
    constructor(characterMapping, html, containsRTL, containsForeignElements) {
        this.characterMapping = characterMapping;
        this.html = html;
        this.containsRTL = containsRTL;
        this.containsForeignElements = containsForeignElements;
    }
}
export function renderViewLine2(input) {
    const sb = new StringBuilder(10000);
    const out = renderViewLine(input, sb);
    return new RenderLineOutput2(out.characterMapping, sb.build(), out.containsRTL, out.containsForeignElements);
}
class ResolvedRenderLineInput {
    constructor(fontIsMonospace, canUseHalfwidthRightwardsArrow, lineContent, len, isOverflowing, overflowingCharCount, parts, containsForeignElements, fauxIndentLength, tabSize, startVisibleColumn, containsRTL, spaceWidth, renderSpaceCharCode, renderWhitespace, renderControlCharacters) {
        this.fontIsMonospace = fontIsMonospace;
        this.canUseHalfwidthRightwardsArrow = canUseHalfwidthRightwardsArrow;
        this.lineContent = lineContent;
        this.len = len;
        this.isOverflowing = isOverflowing;
        this.overflowingCharCount = overflowingCharCount;
        this.parts = parts;
        this.containsForeignElements = containsForeignElements;
        this.fauxIndentLength = fauxIndentLength;
        this.tabSize = tabSize;
        this.startVisibleColumn = startVisibleColumn;
        this.containsRTL = containsRTL;
        this.spaceWidth = spaceWidth;
        this.renderSpaceCharCode = renderSpaceCharCode;
        this.renderWhitespace = renderWhitespace;
        this.renderControlCharacters = renderControlCharacters;
        //
    }
}
function resolveRenderLineInput(input) {
    const lineContent = input.lineContent;
    let isOverflowing;
    let overflowingCharCount;
    let len;
    if (input.stopRenderingLineAfter !== -1 && input.stopRenderingLineAfter < lineContent.length) {
        isOverflowing = true;
        overflowingCharCount = lineContent.length - input.stopRenderingLineAfter;
        len = input.stopRenderingLineAfter;
    }
    else {
        isOverflowing = false;
        overflowingCharCount = 0;
        len = lineContent.length;
    }
    let tokens = transformAndRemoveOverflowing(lineContent, input.containsRTL, input.lineTokens, input.fauxIndentLength, len);
    if (input.renderControlCharacters && !input.isBasicASCII) {
        // Calling `extractControlCharacters` before adding (possibly empty) line parts
        // for inline decorations. `extractControlCharacters` removes empty line parts.
        tokens = extractControlCharacters(lineContent, tokens);
    }
    if (input.renderWhitespace === 4 /* RenderWhitespace.All */ ||
        input.renderWhitespace === 1 /* RenderWhitespace.Boundary */ ||
        (input.renderWhitespace === 2 /* RenderWhitespace.Selection */ && !!input.selectionsOnLine) ||
        (input.renderWhitespace === 3 /* RenderWhitespace.Trailing */ && !input.continuesWithWrappedLine)) {
        tokens = _applyRenderWhitespace(input, lineContent, len, tokens);
    }
    let containsForeignElements = 0 /* ForeignElementType.None */;
    if (input.lineDecorations.length > 0) {
        for (let i = 0, len = input.lineDecorations.length; i < len; i++) {
            const lineDecoration = input.lineDecorations[i];
            if (lineDecoration.type === 3 /* InlineDecorationType.RegularAffectingLetterSpacing */) {
                // Pretend there are foreign elements... although not 100% accurate.
                containsForeignElements |= 1 /* ForeignElementType.Before */;
            }
            else if (lineDecoration.type === 1 /* InlineDecorationType.Before */) {
                containsForeignElements |= 1 /* ForeignElementType.Before */;
            }
            else if (lineDecoration.type === 2 /* InlineDecorationType.After */) {
                containsForeignElements |= 2 /* ForeignElementType.After */;
            }
        }
        tokens = _applyInlineDecorations(lineContent, len, tokens, input.lineDecorations);
    }
    if (!input.containsRTL) {
        // We can never split RTL text, as it ruins the rendering
        tokens = splitLargeTokens(lineContent, tokens, !input.isBasicASCII || input.fontLigatures);
    }
    return new ResolvedRenderLineInput(input.useMonospaceOptimizations, input.canUseHalfwidthRightwardsArrow, lineContent, len, isOverflowing, overflowingCharCount, tokens, containsForeignElements, input.fauxIndentLength, input.tabSize, input.startVisibleColumn, input.containsRTL, input.spaceWidth, input.renderSpaceCharCode, input.renderWhitespace, input.renderControlCharacters);
}
/**
 * In the rendering phase, characters are always looped until token.endIndex.
 * Ensure that all tokens end before `len` and the last one ends precisely at `len`.
 */
function transformAndRemoveOverflowing(lineContent, lineContainsRTL, tokens, fauxIndentLength, len) {
    const result = [];
    let resultLen = 0;
    // The faux indent part of the line should have no token type
    if (fauxIndentLength > 0) {
        result[resultLen++] = new LinePart(fauxIndentLength, '', 0, false);
    }
    let startOffset = fauxIndentLength;
    for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
        const endIndex = tokens.getEndOffset(tokenIndex);
        if (endIndex <= fauxIndentLength) {
            // The faux indent part of the line should have no token type
            continue;
        }
        const type = tokens.getClassName(tokenIndex);
        if (endIndex >= len) {
            const tokenContainsRTL = (lineContainsRTL ? strings.containsRTL(lineContent.substring(startOffset, len)) : false);
            result[resultLen++] = new LinePart(len, type, 0, tokenContainsRTL);
            break;
        }
        const tokenContainsRTL = (lineContainsRTL ? strings.containsRTL(lineContent.substring(startOffset, endIndex)) : false);
        result[resultLen++] = new LinePart(endIndex, type, 0, tokenContainsRTL);
        startOffset = endIndex;
    }
    return result;
}
/**
 * written as a const enum to get value inlining.
 */
var Constants;
(function (Constants) {
    Constants[Constants["LongToken"] = 50] = "LongToken";
})(Constants || (Constants = {}));
/**
 * See https://github.com/microsoft/vscode/issues/6885.
 * It appears that having very large spans causes very slow reading of character positions.
 * So here we try to avoid that.
 */
function splitLargeTokens(lineContent, tokens, onlyAtSpaces) {
    let lastTokenEndIndex = 0;
    const result = [];
    let resultLen = 0;
    if (onlyAtSpaces) {
        // Split only at spaces => we need to walk each character
        for (let i = 0, len = tokens.length; i < len; i++) {
            const token = tokens[i];
            const tokenEndIndex = token.endIndex;
            if (lastTokenEndIndex + 50 /* Constants.LongToken */ < tokenEndIndex) {
                const tokenType = token.type;
                const tokenMetadata = token.metadata;
                const tokenContainsRTL = token.containsRTL;
                let lastSpaceOffset = -1;
                let currTokenStart = lastTokenEndIndex;
                for (let j = lastTokenEndIndex; j < tokenEndIndex; j++) {
                    if (lineContent.charCodeAt(j) === 32 /* CharCode.Space */) {
                        lastSpaceOffset = j;
                    }
                    if (lastSpaceOffset !== -1 && j - currTokenStart >= 50 /* Constants.LongToken */) {
                        // Split at `lastSpaceOffset` + 1
                        result[resultLen++] = new LinePart(lastSpaceOffset + 1, tokenType, tokenMetadata, tokenContainsRTL);
                        currTokenStart = lastSpaceOffset + 1;
                        lastSpaceOffset = -1;
                    }
                }
                if (currTokenStart !== tokenEndIndex) {
                    result[resultLen++] = new LinePart(tokenEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
                }
            }
            else {
                result[resultLen++] = token;
            }
            lastTokenEndIndex = tokenEndIndex;
        }
    }
    else {
        // Split anywhere => we don't need to walk each character
        for (let i = 0, len = tokens.length; i < len; i++) {
            const token = tokens[i];
            const tokenEndIndex = token.endIndex;
            const diff = (tokenEndIndex - lastTokenEndIndex);
            if (diff > 50 /* Constants.LongToken */) {
                const tokenType = token.type;
                const tokenMetadata = token.metadata;
                const tokenContainsRTL = token.containsRTL;
                const piecesCount = Math.ceil(diff / 50 /* Constants.LongToken */);
                for (let j = 1; j < piecesCount; j++) {
                    const pieceEndIndex = lastTokenEndIndex + (j * 50 /* Constants.LongToken */);
                    result[resultLen++] = new LinePart(pieceEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
                }
                result[resultLen++] = new LinePart(tokenEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
            }
            else {
                result[resultLen++] = token;
            }
            lastTokenEndIndex = tokenEndIndex;
        }
    }
    return result;
}
function isControlCharacter(charCode) {
    if (charCode < 32) {
        return (charCode !== 9 /* CharCode.Tab */);
    }
    if (charCode === 127) {
        // DEL
        return true;
    }
    if ((charCode >= 0x202A && charCode <= 0x202E)
        || (charCode >= 0x2066 && charCode <= 0x2069)
        || (charCode >= 0x200E && charCode <= 0x200F)
        || charCode === 0x061C) {
        // Unicode Directional Formatting Characters
        // LRE	U+202A	LEFT-TO-RIGHT EMBEDDING
        // RLE	U+202B	RIGHT-TO-LEFT EMBEDDING
        // PDF	U+202C	POP DIRECTIONAL FORMATTING
        // LRO	U+202D	LEFT-TO-RIGHT OVERRIDE
        // RLO	U+202E	RIGHT-TO-LEFT OVERRIDE
        // LRI	U+2066	LEFT-TO-RIGHT ISOLATE
        // RLI	U+2067	RIGHT-TO-LEFT ISOLATE
        // FSI	U+2068	FIRST STRONG ISOLATE
        // PDI	U+2069	POP DIRECTIONAL ISOLATE
        // LRM	U+200E	LEFT-TO-RIGHT MARK
        // RLM	U+200F	RIGHT-TO-LEFT MARK
        // ALM	U+061C	ARABIC LETTER MARK
        return true;
    }
    return false;
}
function extractControlCharacters(lineContent, tokens) {
    const result = [];
    let lastLinePart = new LinePart(0, '', 0, false);
    let charOffset = 0;
    for (const token of tokens) {
        const tokenEndIndex = token.endIndex;
        for (; charOffset < tokenEndIndex; charOffset++) {
            const charCode = lineContent.charCodeAt(charOffset);
            if (isControlCharacter(charCode)) {
                if (charOffset > lastLinePart.endIndex) {
                    // emit previous part if it has text
                    lastLinePart = new LinePart(charOffset, token.type, token.metadata, token.containsRTL);
                    result.push(lastLinePart);
                }
                lastLinePart = new LinePart(charOffset + 1, 'mtkcontrol', token.metadata, false);
                result.push(lastLinePart);
            }
        }
        if (charOffset > lastLinePart.endIndex) {
            // emit previous part if it has text
            lastLinePart = new LinePart(tokenEndIndex, token.type, token.metadata, token.containsRTL);
            result.push(lastLinePart);
        }
    }
    return result;
}
/**
 * Whitespace is rendered by "replacing" tokens with a special-purpose `mtkw` type that is later recognized in the rendering phase.
 * Moreover, a token is created for every visual indent because on some fonts the glyphs used for rendering whitespace (&rarr; or &middot;) do not have the same width as &nbsp;.
 * The rendering phase will generate `style="width:..."` for these tokens.
 */
function _applyRenderWhitespace(input, lineContent, len, tokens) {
    const continuesWithWrappedLine = input.continuesWithWrappedLine;
    const fauxIndentLength = input.fauxIndentLength;
    const tabSize = input.tabSize;
    const startVisibleColumn = input.startVisibleColumn;
    const useMonospaceOptimizations = input.useMonospaceOptimizations;
    const selections = input.selectionsOnLine;
    const onlyBoundary = (input.renderWhitespace === 1 /* RenderWhitespace.Boundary */);
    const onlyTrailing = (input.renderWhitespace === 3 /* RenderWhitespace.Trailing */);
    const generateLinePartForEachWhitespace = (input.renderSpaceWidth !== input.spaceWidth);
    const result = [];
    let resultLen = 0;
    let tokenIndex = 0;
    let tokenType = tokens[tokenIndex].type;
    let tokenContainsRTL = tokens[tokenIndex].containsRTL;
    let tokenEndIndex = tokens[tokenIndex].endIndex;
    const tokensLength = tokens.length;
    let lineIsEmptyOrWhitespace = false;
    let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
    let lastNonWhitespaceIndex;
    if (firstNonWhitespaceIndex === -1) {
        lineIsEmptyOrWhitespace = true;
        firstNonWhitespaceIndex = len;
        lastNonWhitespaceIndex = len;
    }
    else {
        lastNonWhitespaceIndex = strings.lastNonWhitespaceIndex(lineContent);
    }
    let wasInWhitespace = false;
    let currentSelectionIndex = 0;
    let currentSelection = selections && selections[currentSelectionIndex];
    let tmpIndent = startVisibleColumn % tabSize;
    for (let charIndex = fauxIndentLength; charIndex < len; charIndex++) {
        const chCode = lineContent.charCodeAt(charIndex);
        if (currentSelection && charIndex >= currentSelection.endOffset) {
            currentSelectionIndex++;
            currentSelection = selections && selections[currentSelectionIndex];
        }
        let isInWhitespace;
        if (charIndex < firstNonWhitespaceIndex || charIndex > lastNonWhitespaceIndex) {
            // in leading or trailing whitespace
            isInWhitespace = true;
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            // a tab character is rendered both in all and boundary cases
            isInWhitespace = true;
        }
        else if (chCode === 32 /* CharCode.Space */) {
            // hit a space character
            if (onlyBoundary) {
                // rendering only boundary whitespace
                if (wasInWhitespace) {
                    isInWhitespace = true;
                }
                else {
                    const nextChCode = (charIndex + 1 < len ? lineContent.charCodeAt(charIndex + 1) : 0 /* CharCode.Null */);
                    isInWhitespace = (nextChCode === 32 /* CharCode.Space */ || nextChCode === 9 /* CharCode.Tab */);
                }
            }
            else {
                isInWhitespace = true;
            }
        }
        else {
            isInWhitespace = false;
        }
        // If rendering whitespace on selection, check that the charIndex falls within a selection
        if (isInWhitespace && selections) {
            isInWhitespace = !!currentSelection && currentSelection.startOffset <= charIndex && currentSelection.endOffset > charIndex;
        }
        // If rendering only trailing whitespace, check that the charIndex points to trailing whitespace.
        if (isInWhitespace && onlyTrailing) {
            isInWhitespace = lineIsEmptyOrWhitespace || charIndex > lastNonWhitespaceIndex;
        }
        if (isInWhitespace && tokenContainsRTL) {
            // If the token contains RTL text, breaking it up into multiple line parts
            // to render whitespace might affect the browser's bidi layout.
            //
            // We render whitespace in such tokens only if the whitespace
            // is the leading or the trailing whitespace of the line,
            // which doesn't affect the browser's bidi layout.
            if (charIndex >= firstNonWhitespaceIndex && charIndex <= lastNonWhitespaceIndex) {
                isInWhitespace = false;
            }
        }
        if (wasInWhitespace) {
            // was in whitespace token
            if (!isInWhitespace || (!useMonospaceOptimizations && tmpIndent >= tabSize)) {
                // leaving whitespace token or entering a new indent
                if (generateLinePartForEachWhitespace) {
                    const lastEndIndex = (resultLen > 0 ? result[resultLen - 1].endIndex : fauxIndentLength);
                    for (let i = lastEndIndex + 1; i <= charIndex; i++) {
                        result[resultLen++] = new LinePart(i, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
                    }
                }
                else {
                    result[resultLen++] = new LinePart(charIndex, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
                }
                tmpIndent = tmpIndent % tabSize;
            }
        }
        else {
            // was in regular token
            if (charIndex === tokenEndIndex || (isInWhitespace && charIndex > fauxIndentLength)) {
                result[resultLen++] = new LinePart(charIndex, tokenType, 0, tokenContainsRTL);
                tmpIndent = tmpIndent % tabSize;
            }
        }
        if (chCode === 9 /* CharCode.Tab */) {
            tmpIndent = tabSize;
        }
        else if (strings.isFullWidthCharacter(chCode)) {
            tmpIndent += 2;
        }
        else {
            tmpIndent++;
        }
        wasInWhitespace = isInWhitespace;
        while (charIndex === tokenEndIndex) {
            tokenIndex++;
            if (tokenIndex < tokensLength) {
                tokenType = tokens[tokenIndex].type;
                tokenContainsRTL = tokens[tokenIndex].containsRTL;
                tokenEndIndex = tokens[tokenIndex].endIndex;
            }
            else {
                break;
            }
        }
    }
    let generateWhitespace = false;
    if (wasInWhitespace) {
        // was in whitespace token
        if (continuesWithWrappedLine && onlyBoundary) {
            const lastCharCode = (len > 0 ? lineContent.charCodeAt(len - 1) : 0 /* CharCode.Null */);
            const prevCharCode = (len > 1 ? lineContent.charCodeAt(len - 2) : 0 /* CharCode.Null */);
            const isSingleTrailingSpace = (lastCharCode === 32 /* CharCode.Space */ && (prevCharCode !== 32 /* CharCode.Space */ && prevCharCode !== 9 /* CharCode.Tab */));
            if (!isSingleTrailingSpace) {
                generateWhitespace = true;
            }
        }
        else {
            generateWhitespace = true;
        }
    }
    if (generateWhitespace) {
        if (generateLinePartForEachWhitespace) {
            const lastEndIndex = (resultLen > 0 ? result[resultLen - 1].endIndex : fauxIndentLength);
            for (let i = lastEndIndex + 1; i <= len; i++) {
                result[resultLen++] = new LinePart(i, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
            }
        }
        else {
            result[resultLen++] = new LinePart(len, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
        }
    }
    else {
        result[resultLen++] = new LinePart(len, tokenType, 0, tokenContainsRTL);
    }
    return result;
}
/**
 * Inline decorations are "merged" on top of tokens.
 * Special care must be taken when multiple inline decorations are at play and they overlap.
 */
function _applyInlineDecorations(lineContent, len, tokens, _lineDecorations) {
    _lineDecorations.sort(LineDecoration.compare);
    const lineDecorations = LineDecorationsNormalizer.normalize(lineContent, _lineDecorations);
    const lineDecorationsLen = lineDecorations.length;
    let lineDecorationIndex = 0;
    const result = [];
    let resultLen = 0;
    let lastResultEndIndex = 0;
    for (let tokenIndex = 0, len = tokens.length; tokenIndex < len; tokenIndex++) {
        const token = tokens[tokenIndex];
        const tokenEndIndex = token.endIndex;
        const tokenType = token.type;
        const tokenMetadata = token.metadata;
        const tokenContainsRTL = token.containsRTL;
        while (lineDecorationIndex < lineDecorationsLen && lineDecorations[lineDecorationIndex].startOffset < tokenEndIndex) {
            const lineDecoration = lineDecorations[lineDecorationIndex];
            if (lineDecoration.startOffset > lastResultEndIndex) {
                lastResultEndIndex = lineDecoration.startOffset;
                result[resultLen++] = new LinePart(lastResultEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
            }
            if (lineDecoration.endOffset + 1 <= tokenEndIndex) {
                // This line decoration ends before this token ends
                lastResultEndIndex = lineDecoration.endOffset + 1;
                result[resultLen++] = new LinePart(lastResultEndIndex, tokenType + ' ' + lineDecoration.className, tokenMetadata | lineDecoration.metadata, tokenContainsRTL);
                lineDecorationIndex++;
            }
            else {
                // This line decoration continues on to the next token
                lastResultEndIndex = tokenEndIndex;
                result[resultLen++] = new LinePart(lastResultEndIndex, tokenType + ' ' + lineDecoration.className, tokenMetadata | lineDecoration.metadata, tokenContainsRTL);
                break;
            }
        }
        if (tokenEndIndex > lastResultEndIndex) {
            lastResultEndIndex = tokenEndIndex;
            result[resultLen++] = new LinePart(lastResultEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
        }
    }
    const lastTokenEndIndex = tokens[tokens.length - 1].endIndex;
    if (lineDecorationIndex < lineDecorationsLen && lineDecorations[lineDecorationIndex].startOffset === lastTokenEndIndex) {
        while (lineDecorationIndex < lineDecorationsLen && lineDecorations[lineDecorationIndex].startOffset === lastTokenEndIndex) {
            const lineDecoration = lineDecorations[lineDecorationIndex];
            result[resultLen++] = new LinePart(lastResultEndIndex, lineDecoration.className, lineDecoration.metadata, false);
            lineDecorationIndex++;
        }
    }
    return result;
}
/**
 * This function is on purpose not split up into multiple functions to allow runtime type inference (i.e. performance reasons).
 * Notice how all the needed data is fully resolved and passed in (i.e. no other calls).
 */
function _renderLine(input, sb) {
    const fontIsMonospace = input.fontIsMonospace;
    const canUseHalfwidthRightwardsArrow = input.canUseHalfwidthRightwardsArrow;
    const containsForeignElements = input.containsForeignElements;
    const lineContent = input.lineContent;
    const len = input.len;
    const isOverflowing = input.isOverflowing;
    const overflowingCharCount = input.overflowingCharCount;
    const parts = input.parts;
    const fauxIndentLength = input.fauxIndentLength;
    const tabSize = input.tabSize;
    const startVisibleColumn = input.startVisibleColumn;
    const containsRTL = input.containsRTL;
    const spaceWidth = input.spaceWidth;
    const renderSpaceCharCode = input.renderSpaceCharCode;
    const renderWhitespace = input.renderWhitespace;
    const renderControlCharacters = input.renderControlCharacters;
    const characterMapping = new CharacterMapping(len + 1, parts.length);
    let lastCharacterMappingDefined = false;
    let charIndex = 0;
    let visibleColumn = startVisibleColumn;
    let charOffsetInPart = 0; // the character offset in the current part
    let charHorizontalOffset = 0; // the character horizontal position in terms of chars relative to line start
    let partDisplacement = 0;
    if (containsRTL) {
        sb.appendString('<span dir="ltr">');
    }
    else {
        sb.appendString('<span>');
    }
    for (let partIndex = 0, tokensLen = parts.length; partIndex < tokensLen; partIndex++) {
        const part = parts[partIndex];
        const partEndIndex = part.endIndex;
        const partType = part.type;
        const partContainsRTL = part.containsRTL;
        const partRendersWhitespace = (renderWhitespace !== 0 /* RenderWhitespace.None */ && part.isWhitespace());
        const partRendersWhitespaceWithWidth = partRendersWhitespace && !fontIsMonospace && (partType === 'mtkw' /*only whitespace*/ || !containsForeignElements);
        const partIsEmptyAndHasPseudoAfter = (charIndex === partEndIndex && part.isPseudoAfter());
        charOffsetInPart = 0;
        sb.appendString('<span ');
        if (partContainsRTL) {
            sb.appendString('style="unicode-bidi:isolate" ');
        }
        sb.appendString('class="');
        sb.appendString(partRendersWhitespaceWithWidth ? 'mtkz' : partType);
        sb.appendASCIICharCode(34 /* CharCode.DoubleQuote */);
        if (partRendersWhitespace) {
            let partWidth = 0;
            {
                let _charIndex = charIndex;
                let _visibleColumn = visibleColumn;
                for (; _charIndex < partEndIndex; _charIndex++) {
                    const charCode = lineContent.charCodeAt(_charIndex);
                    const charWidth = (charCode === 9 /* CharCode.Tab */ ? (tabSize - (_visibleColumn % tabSize)) : 1) | 0;
                    partWidth += charWidth;
                    if (_charIndex >= fauxIndentLength) {
                        _visibleColumn += charWidth;
                    }
                }
            }
            if (partRendersWhitespaceWithWidth) {
                sb.appendString(' style="width:');
                sb.appendString(String(spaceWidth * partWidth));
                sb.appendString('px"');
            }
            sb.appendASCIICharCode(62 /* CharCode.GreaterThan */);
            for (; charIndex < partEndIndex; charIndex++) {
                characterMapping.setColumnInfo(charIndex + 1, partIndex - partDisplacement, charOffsetInPart, charHorizontalOffset);
                partDisplacement = 0;
                const charCode = lineContent.charCodeAt(charIndex);
                let producedCharacters;
                let charWidth;
                if (charCode === 9 /* CharCode.Tab */) {
                    producedCharacters = (tabSize - (visibleColumn % tabSize)) | 0;
                    charWidth = producedCharacters;
                    if (!canUseHalfwidthRightwardsArrow || charWidth > 1) {
                        sb.appendCharCode(0x2192); // RIGHTWARDS ARROW
                    }
                    else {
                        sb.appendCharCode(0xFFEB); // HALFWIDTH RIGHTWARDS ARROW
                    }
                    for (let space = 2; space <= charWidth; space++) {
                        sb.appendCharCode(0xA0); // &nbsp;
                    }
                }
                else { // must be CharCode.Space
                    producedCharacters = 2;
                    charWidth = 1;
                    sb.appendCharCode(renderSpaceCharCode); // &middot; or word separator middle dot
                    sb.appendCharCode(0x200C); // ZERO WIDTH NON-JOINER
                }
                charOffsetInPart += producedCharacters;
                charHorizontalOffset += charWidth;
                if (charIndex >= fauxIndentLength) {
                    visibleColumn += charWidth;
                }
            }
        }
        else {
            sb.appendASCIICharCode(62 /* CharCode.GreaterThan */);
            for (; charIndex < partEndIndex; charIndex++) {
                characterMapping.setColumnInfo(charIndex + 1, partIndex - partDisplacement, charOffsetInPart, charHorizontalOffset);
                partDisplacement = 0;
                const charCode = lineContent.charCodeAt(charIndex);
                let producedCharacters = 1;
                let charWidth = 1;
                switch (charCode) {
                    case 9 /* CharCode.Tab */:
                        producedCharacters = (tabSize - (visibleColumn % tabSize));
                        charWidth = producedCharacters;
                        for (let space = 1; space <= producedCharacters; space++) {
                            sb.appendCharCode(0xA0); // &nbsp;
                        }
                        break;
                    case 32 /* CharCode.Space */:
                        sb.appendCharCode(0xA0); // &nbsp;
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
                        if (renderControlCharacters) {
                            // See https://unicode-table.com/en/blocks/control-pictures/
                            sb.appendCharCode(9216);
                        }
                        else {
                            sb.appendString('&#00;');
                        }
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
                        // See https://unicode-table.com/en/blocks/control-pictures/
                        if (renderControlCharacters && charCode < 32) {
                            sb.appendCharCode(9216 + charCode);
                        }
                        else if (renderControlCharacters && charCode === 127) {
                            // DEL
                            sb.appendCharCode(9249);
                        }
                        else if (renderControlCharacters && isControlCharacter(charCode)) {
                            sb.appendString('[U+');
                            sb.appendString(to4CharHex(charCode));
                            sb.appendString(']');
                            producedCharacters = 8;
                            charWidth = producedCharacters;
                        }
                        else {
                            sb.appendCharCode(charCode);
                        }
                }
                charOffsetInPart += producedCharacters;
                charHorizontalOffset += charWidth;
                if (charIndex >= fauxIndentLength) {
                    visibleColumn += charWidth;
                }
            }
        }
        if (partIsEmptyAndHasPseudoAfter) {
            partDisplacement++;
        }
        else {
            partDisplacement = 0;
        }
        if (charIndex >= len && !lastCharacterMappingDefined && part.isPseudoAfter()) {
            lastCharacterMappingDefined = true;
            characterMapping.setColumnInfo(charIndex + 1, partIndex, charOffsetInPart, charHorizontalOffset);
        }
        sb.appendString('</span>');
    }
    if (!lastCharacterMappingDefined) {
        // When getting client rects for the last character, we will position the
        // text range at the end of the span, insteaf of at the beginning of next span
        characterMapping.setColumnInfo(len + 1, parts.length - 1, charOffsetInPart, charHorizontalOffset);
    }
    if (isOverflowing) {
        sb.appendString('<span class="mtkoverflow">');
        sb.appendString(nls.localize('showMore', "Show more ({0})", renderOverflowingCharCount(overflowingCharCount)));
        sb.appendString('</span>');
    }
    sb.appendString('</span>');
    return new RenderLineOutput(characterMapping, containsRTL, containsForeignElements);
}
function to4CharHex(n) {
    return n.toString(16).toUpperCase().padStart(4, '0');
}
function renderOverflowingCharCount(n) {
    if (n < 1024) {
        return nls.localize('overflow.chars', "{0} chars", n);
    }
    if (n < 1024 * 1024) {
        return `${(n / 1024).toFixed(1)} KB`;
    }
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdMYXlvdXQvdmlld0xpbmVSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFFM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVqRixPQUFPLEVBQUUsUUFBUSxFQUFvQixNQUFNLGVBQWUsQ0FBQztBQUUzRCxNQUFNLENBQU4sSUFBa0IsZ0JBTWpCO0FBTkQsV0FBa0IsZ0JBQWdCO0lBQ2pDLHVEQUFRLENBQUE7SUFDUiwrREFBWSxDQUFBO0lBQ1osaUVBQWEsQ0FBQTtJQUNiLCtEQUFZLENBQUE7SUFDWixxREFBTyxDQUFBO0FBQ1IsQ0FBQyxFQU5pQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBTWpDO0FBRUQsTUFBTSxPQUFPLFNBQVM7SUFXckIsWUFBWSxVQUFrQixFQUFFLFFBQWdCO1FBQy9DLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO1FBQzlCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0lBQzNCLENBQUM7SUFFTSxNQUFNLENBQUMsY0FBeUI7UUFDdEMsT0FBTyxJQUFJLENBQUMsV0FBVyxLQUFLLGNBQWMsQ0FBQyxXQUFXO2VBQ2xELElBQUksQ0FBQyxTQUFTLEtBQUssY0FBYyxDQUFDLFNBQVMsQ0FBQztJQUNqRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZUFBZTtJQTJCM0IsWUFDQyx5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