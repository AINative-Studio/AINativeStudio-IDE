/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { CharacterClassifier } from '../core/characterClassifier.js';
import { LineInjectedText } from '../textModelEvents.js';
import { ModelLineProjectionData } from '../modelLineProjectionData.js';
export class MonospaceLineBreaksComputerFactory {
    static create(options) {
        return new MonospaceLineBreaksComputerFactory(options.get(139 /* EditorOption.wordWrapBreakBeforeCharacters */), options.get(138 /* EditorOption.wordWrapBreakAfterCharacters */));
    }
    constructor(breakBeforeChars, breakAfterChars) {
        this.classifier = new WrappingCharacterClassifier(breakBeforeChars, breakAfterChars);
    }
    createLineBreaksComputer(fontInfo, tabSize, wrappingColumn, wrappingIndent, wordBreak) {
        const requests = [];
        const injectedTexts = [];
        const previousBreakingData = [];
        return {
            addRequest: (lineText, injectedText, previousLineBreakData) => {
                requests.push(lineText);
                injectedTexts.push(injectedText);
                previousBreakingData.push(previousLineBreakData);
            },
            finalize: () => {
                const columnsForFullWidthChar = fontInfo.typicalFullwidthCharacterWidth / fontInfo.typicalHalfwidthCharacterWidth;
                const result = [];
                for (let i = 0, len = requests.length; i < len; i++) {
                    const injectedText = injectedTexts[i];
                    const previousLineBreakData = previousBreakingData[i];
                    if (previousLineBreakData && !previousLineBreakData.injectionOptions && !injectedText) {
                        result[i] = createLineBreaksFromPreviousLineBreaks(this.classifier, previousLineBreakData, requests[i], tabSize, wrappingColumn, columnsForFullWidthChar, wrappingIndent, wordBreak);
                    }
                    else {
                        result[i] = createLineBreaks(this.classifier, requests[i], injectedText, tabSize, wrappingColumn, columnsForFullWidthChar, wrappingIndent, wordBreak);
                    }
                }
                arrPool1.length = 0;
                arrPool2.length = 0;
                return result;
            }
        };
    }
}
var CharacterClass;
(function (CharacterClass) {
    CharacterClass[CharacterClass["NONE"] = 0] = "NONE";
    CharacterClass[CharacterClass["BREAK_BEFORE"] = 1] = "BREAK_BEFORE";
    CharacterClass[CharacterClass["BREAK_AFTER"] = 2] = "BREAK_AFTER";
    CharacterClass[CharacterClass["BREAK_IDEOGRAPHIC"] = 3] = "BREAK_IDEOGRAPHIC"; // for Han and Kana.
})(CharacterClass || (CharacterClass = {}));
class WrappingCharacterClassifier extends CharacterClassifier {
    constructor(BREAK_BEFORE, BREAK_AFTER) {
        super(0 /* CharacterClass.NONE */);
        for (let i = 0; i < BREAK_BEFORE.length; i++) {
            this.set(BREAK_BEFORE.charCodeAt(i), 1 /* CharacterClass.BREAK_BEFORE */);
        }
        for (let i = 0; i < BREAK_AFTER.length; i++) {
            this.set(BREAK_AFTER.charCodeAt(i), 2 /* CharacterClass.BREAK_AFTER */);
        }
    }
    get(charCode) {
        if (charCode >= 0 && charCode < 256) {
            return this._asciiMap[charCode];
        }
        else {
            // Initialize CharacterClass.BREAK_IDEOGRAPHIC for these Unicode ranges:
            // 1. CJK Unified Ideographs (0x4E00 -- 0x9FFF)
            // 2. CJK Unified Ideographs Extension A (0x3400 -- 0x4DBF)
            // 3. Hiragana and Katakana (0x3040 -- 0x30FF)
            if ((charCode >= 0x3040 && charCode <= 0x30FF)
                || (charCode >= 0x3400 && charCode <= 0x4DBF)
                || (charCode >= 0x4E00 && charCode <= 0x9FFF)) {
                return 3 /* CharacterClass.BREAK_IDEOGRAPHIC */;
            }
            return (this._map.get(charCode) || this._defaultValue);
        }
    }
}
let arrPool1 = [];
let arrPool2 = [];
function createLineBreaksFromPreviousLineBreaks(classifier, previousBreakingData, lineText, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent, wordBreak) {
    if (firstLineBreakColumn === -1) {
        return null;
    }
    const len = lineText.length;
    if (len <= 1) {
        return null;
    }
    const isKeepAll = (wordBreak === 'keepAll');
    const prevBreakingOffsets = previousBreakingData.breakOffsets;
    const prevBreakingOffsetsVisibleColumn = previousBreakingData.breakOffsetsVisibleColumn;
    const wrappedTextIndentLength = computeWrappedTextIndentLength(lineText, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent);
    const wrappedLineBreakColumn = firstLineBreakColumn - wrappedTextIndentLength;
    const breakingOffsets = arrPool1;
    const breakingOffsetsVisibleColumn = arrPool2;
    let breakingOffsetsCount = 0;
    let lastBreakingOffset = 0;
    let lastBreakingOffsetVisibleColumn = 0;
    let breakingColumn = firstLineBreakColumn;
    const prevLen = prevBreakingOffsets.length;
    let prevIndex = 0;
    if (prevIndex >= 0) {
        let bestDistance = Math.abs(prevBreakingOffsetsVisibleColumn[prevIndex] - breakingColumn);
        while (prevIndex + 1 < prevLen) {
            const distance = Math.abs(prevBreakingOffsetsVisibleColumn[prevIndex + 1] - breakingColumn);
            if (distance >= bestDistance) {
                break;
            }
            bestDistance = distance;
            prevIndex++;
        }
    }
    while (prevIndex < prevLen) {
        // Allow for prevIndex to be -1 (for the case where we hit a tab when walking backwards from the first break)
        let prevBreakOffset = prevIndex < 0 ? 0 : prevBreakingOffsets[prevIndex];
        let prevBreakOffsetVisibleColumn = prevIndex < 0 ? 0 : prevBreakingOffsetsVisibleColumn[prevIndex];
        if (lastBreakingOffset > prevBreakOffset) {
            prevBreakOffset = lastBreakingOffset;
            prevBreakOffsetVisibleColumn = lastBreakingOffsetVisibleColumn;
        }
        let breakOffset = 0;
        let breakOffsetVisibleColumn = 0;
        let forcedBreakOffset = 0;
        let forcedBreakOffsetVisibleColumn = 0;
        // initially, we search as much as possible to the right (if it fits)
        if (prevBreakOffsetVisibleColumn <= breakingColumn) {
            let visibleColumn = prevBreakOffsetVisibleColumn;
            let prevCharCode = prevBreakOffset === 0 ? 0 /* CharCode.Null */ : lineText.charCodeAt(prevBreakOffset - 1);
            let prevCharCodeClass = prevBreakOffset === 0 ? 0 /* CharacterClass.NONE */ : classifier.get(prevCharCode);
            let entireLineFits = true;
            for (let i = prevBreakOffset; i < len; i++) {
                const charStartOffset = i;
                const charCode = lineText.charCodeAt(i);
                let charCodeClass;
                let charWidth;
                if (strings.isHighSurrogate(charCode)) {
                    // A surrogate pair must always be considered as a single unit, so it is never to be broken
                    i++;
                    charCodeClass = 0 /* CharacterClass.NONE */;
                    charWidth = 2;
                }
                else {
                    charCodeClass = classifier.get(charCode);
                    charWidth = computeCharWidth(charCode, visibleColumn, tabSize, columnsForFullWidthChar);
                }
                if (charStartOffset > lastBreakingOffset && canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass, isKeepAll)) {
                    breakOffset = charStartOffset;
                    breakOffsetVisibleColumn = visibleColumn;
                }
                visibleColumn += charWidth;
                // check if adding character at `i` will go over the breaking column
                if (visibleColumn > breakingColumn) {
                    // We need to break at least before character at `i`:
                    if (charStartOffset > lastBreakingOffset) {
                        forcedBreakOffset = charStartOffset;
                        forcedBreakOffsetVisibleColumn = visibleColumn - charWidth;
                    }
                    else {
                        // we need to advance at least by one character
                        forcedBreakOffset = i + 1;
                        forcedBreakOffsetVisibleColumn = visibleColumn;
                    }
                    if (visibleColumn - breakOffsetVisibleColumn > wrappedLineBreakColumn) {
                        // Cannot break at `breakOffset` => reset it if it was set
                        breakOffset = 0;
                    }
                    entireLineFits = false;
                    break;
                }
                prevCharCode = charCode;
                prevCharCodeClass = charCodeClass;
            }
            if (entireLineFits) {
                // there is no more need to break => stop the outer loop!
                if (breakingOffsetsCount > 0) {
                    // Add last segment, no need to assign to `lastBreakingOffset` and `lastBreakingOffsetVisibleColumn`
                    breakingOffsets[breakingOffsetsCount] = prevBreakingOffsets[prevBreakingOffsets.length - 1];
                    breakingOffsetsVisibleColumn[breakingOffsetsCount] = prevBreakingOffsetsVisibleColumn[prevBreakingOffsets.length - 1];
                    breakingOffsetsCount++;
                }
                break;
            }
        }
        if (breakOffset === 0) {
            // must search left
            let visibleColumn = prevBreakOffsetVisibleColumn;
            let charCode = lineText.charCodeAt(prevBreakOffset);
            let charCodeClass = classifier.get(charCode);
            let hitATabCharacter = false;
            for (let i = prevBreakOffset - 1; i >= lastBreakingOffset; i--) {
                const charStartOffset = i + 1;
                const prevCharCode = lineText.charCodeAt(i);
                if (prevCharCode === 9 /* CharCode.Tab */) {
                    // cannot determine the width of a tab when going backwards, so we must go forwards
                    hitATabCharacter = true;
                    break;
                }
                let prevCharCodeClass;
                let prevCharWidth;
                if (strings.isLowSurrogate(prevCharCode)) {
                    // A surrogate pair must always be considered as a single unit, so it is never to be broken
                    i--;
                    prevCharCodeClass = 0 /* CharacterClass.NONE */;
                    prevCharWidth = 2;
                }
                else {
                    prevCharCodeClass = classifier.get(prevCharCode);
                    prevCharWidth = (strings.isFullWidthCharacter(prevCharCode) ? columnsForFullWidthChar : 1);
                }
                if (visibleColumn <= breakingColumn) {
                    if (forcedBreakOffset === 0) {
                        forcedBreakOffset = charStartOffset;
                        forcedBreakOffsetVisibleColumn = visibleColumn;
                    }
                    if (visibleColumn <= breakingColumn - wrappedLineBreakColumn) {
                        // went too far!
                        break;
                    }
                    if (canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass, isKeepAll)) {
                        breakOffset = charStartOffset;
                        breakOffsetVisibleColumn = visibleColumn;
                        break;
                    }
                }
                visibleColumn -= prevCharWidth;
                charCode = prevCharCode;
                charCodeClass = prevCharCodeClass;
            }
            if (breakOffset !== 0) {
                const remainingWidthOfNextLine = wrappedLineBreakColumn - (forcedBreakOffsetVisibleColumn - breakOffsetVisibleColumn);
                if (remainingWidthOfNextLine <= tabSize) {
                    const charCodeAtForcedBreakOffset = lineText.charCodeAt(forcedBreakOffset);
                    let charWidth;
                    if (strings.isHighSurrogate(charCodeAtForcedBreakOffset)) {
                        // A surrogate pair must always be considered as a single unit, so it is never to be broken
                        charWidth = 2;
                    }
                    else {
                        charWidth = computeCharWidth(charCodeAtForcedBreakOffset, forcedBreakOffsetVisibleColumn, tabSize, columnsForFullWidthChar);
                    }
                    if (remainingWidthOfNextLine - charWidth < 0) {
                        // it is not worth it to break at breakOffset, it just introduces an extra needless line!
                        breakOffset = 0;
                    }
                }
            }
            if (hitATabCharacter) {
                // cannot determine the width of a tab when going backwards, so we must go forwards from the previous break
                prevIndex--;
                continue;
            }
        }
        if (breakOffset === 0) {
            // Could not find a good breaking point
            breakOffset = forcedBreakOffset;
            breakOffsetVisibleColumn = forcedBreakOffsetVisibleColumn;
        }
        if (breakOffset <= lastBreakingOffset) {
            // Make sure that we are advancing (at least one character)
            const charCode = lineText.charCodeAt(lastBreakingOffset);
            if (strings.isHighSurrogate(charCode)) {
                // A surrogate pair must always be considered as a single unit, so it is never to be broken
                breakOffset = lastBreakingOffset + 2;
                breakOffsetVisibleColumn = lastBreakingOffsetVisibleColumn + 2;
            }
            else {
                breakOffset = lastBreakingOffset + 1;
                breakOffsetVisibleColumn = lastBreakingOffsetVisibleColumn + computeCharWidth(charCode, lastBreakingOffsetVisibleColumn, tabSize, columnsForFullWidthChar);
            }
        }
        lastBreakingOffset = breakOffset;
        breakingOffsets[breakingOffsetsCount] = breakOffset;
        lastBreakingOffsetVisibleColumn = breakOffsetVisibleColumn;
        breakingOffsetsVisibleColumn[breakingOffsetsCount] = breakOffsetVisibleColumn;
        breakingOffsetsCount++;
        breakingColumn = breakOffsetVisibleColumn + wrappedLineBreakColumn;
        while (prevIndex < 0 || (prevIndex < prevLen && prevBreakingOffsetsVisibleColumn[prevIndex] < breakOffsetVisibleColumn)) {
            prevIndex++;
        }
        let bestDistance = Math.abs(prevBreakingOffsetsVisibleColumn[prevIndex] - breakingColumn);
        while (prevIndex + 1 < prevLen) {
            const distance = Math.abs(prevBreakingOffsetsVisibleColumn[prevIndex + 1] - breakingColumn);
            if (distance >= bestDistance) {
                break;
            }
            bestDistance = distance;
            prevIndex++;
        }
    }
    if (breakingOffsetsCount === 0) {
        return null;
    }
    // Doing here some object reuse which ends up helping a huge deal with GC pauses!
    breakingOffsets.length = breakingOffsetsCount;
    breakingOffsetsVisibleColumn.length = breakingOffsetsCount;
    arrPool1 = previousBreakingData.breakOffsets;
    arrPool2 = previousBreakingData.breakOffsetsVisibleColumn;
    previousBreakingData.breakOffsets = breakingOffsets;
    previousBreakingData.breakOffsetsVisibleColumn = breakingOffsetsVisibleColumn;
    previousBreakingData.wrappedTextIndentLength = wrappedTextIndentLength;
    return previousBreakingData;
}
function createLineBreaks(classifier, _lineText, injectedTexts, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent, wordBreak) {
    const lineText = LineInjectedText.applyInjectedText(_lineText, injectedTexts);
    let injectionOptions;
    let injectionOffsets;
    if (injectedTexts && injectedTexts.length > 0) {
        injectionOptions = injectedTexts.map(t => t.options);
        injectionOffsets = injectedTexts.map(text => text.column - 1);
    }
    else {
        injectionOptions = null;
        injectionOffsets = null;
    }
    if (firstLineBreakColumn === -1) {
        if (!injectionOptions) {
            return null;
        }
        // creating a `LineBreakData` with an invalid `breakOffsetsVisibleColumn` is OK
        // because `breakOffsetsVisibleColumn` will never be used because it contains injected text
        return new ModelLineProjectionData(injectionOffsets, injectionOptions, [lineText.length], [], 0);
    }
    const len = lineText.length;
    if (len <= 1) {
        if (!injectionOptions) {
            return null;
        }
        // creating a `LineBreakData` with an invalid `breakOffsetsVisibleColumn` is OK
        // because `breakOffsetsVisibleColumn` will never be used because it contains injected text
        return new ModelLineProjectionData(injectionOffsets, injectionOptions, [lineText.length], [], 0);
    }
    const isKeepAll = (wordBreak === 'keepAll');
    const wrappedTextIndentLength = computeWrappedTextIndentLength(lineText, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent);
    const wrappedLineBreakColumn = firstLineBreakColumn - wrappedTextIndentLength;
    const breakingOffsets = [];
    const breakingOffsetsVisibleColumn = [];
    let breakingOffsetsCount = 0;
    let breakOffset = 0;
    let breakOffsetVisibleColumn = 0;
    let breakingColumn = firstLineBreakColumn;
    let prevCharCode = lineText.charCodeAt(0);
    let prevCharCodeClass = classifier.get(prevCharCode);
    let visibleColumn = computeCharWidth(prevCharCode, 0, tabSize, columnsForFullWidthChar);
    let startOffset = 1;
    if (strings.isHighSurrogate(prevCharCode)) {
        // A surrogate pair must always be considered as a single unit, so it is never to be broken
        visibleColumn += 1;
        prevCharCode = lineText.charCodeAt(1);
        prevCharCodeClass = classifier.get(prevCharCode);
        startOffset++;
    }
    for (let i = startOffset; i < len; i++) {
        const charStartOffset = i;
        const charCode = lineText.charCodeAt(i);
        let charCodeClass;
        let charWidth;
        if (strings.isHighSurrogate(charCode)) {
            // A surrogate pair must always be considered as a single unit, so it is never to be broken
            i++;
            charCodeClass = 0 /* CharacterClass.NONE */;
            charWidth = 2;
        }
        else {
            charCodeClass = classifier.get(charCode);
            charWidth = computeCharWidth(charCode, visibleColumn, tabSize, columnsForFullWidthChar);
        }
        if (canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass, isKeepAll)) {
            breakOffset = charStartOffset;
            breakOffsetVisibleColumn = visibleColumn;
        }
        visibleColumn += charWidth;
        // check if adding character at `i` will go over the breaking column
        if (visibleColumn > breakingColumn) {
            // We need to break at least before character at `i`:
            if (breakOffset === 0 || visibleColumn - breakOffsetVisibleColumn > wrappedLineBreakColumn) {
                // Cannot break at `breakOffset`, must break at `i`
                breakOffset = charStartOffset;
                breakOffsetVisibleColumn = visibleColumn - charWidth;
            }
            breakingOffsets[breakingOffsetsCount] = breakOffset;
            breakingOffsetsVisibleColumn[breakingOffsetsCount] = breakOffsetVisibleColumn;
            breakingOffsetsCount++;
            breakingColumn = breakOffsetVisibleColumn + wrappedLineBreakColumn;
            breakOffset = 0;
        }
        prevCharCode = charCode;
        prevCharCodeClass = charCodeClass;
    }
    if (breakingOffsetsCount === 0 && (!injectedTexts || injectedTexts.length === 0)) {
        return null;
    }
    // Add last segment
    breakingOffsets[breakingOffsetsCount] = len;
    breakingOffsetsVisibleColumn[breakingOffsetsCount] = visibleColumn;
    return new ModelLineProjectionData(injectionOffsets, injectionOptions, breakingOffsets, breakingOffsetsVisibleColumn, wrappedTextIndentLength);
}
function computeCharWidth(charCode, visibleColumn, tabSize, columnsForFullWidthChar) {
    if (charCode === 9 /* CharCode.Tab */) {
        return (tabSize - (visibleColumn % tabSize));
    }
    if (strings.isFullWidthCharacter(charCode)) {
        return columnsForFullWidthChar;
    }
    if (charCode < 32) {
        // when using `editor.renderControlCharacters`, the substitutions are often wide
        return columnsForFullWidthChar;
    }
    return 1;
}
function tabCharacterWidth(visibleColumn, tabSize) {
    return (tabSize - (visibleColumn % tabSize));
}
/**
 * Kinsoku Shori : Don't break after a leading character, like an open bracket
 * Kinsoku Shori : Don't break before a trailing character, like a period
 */
function canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass, isKeepAll) {
    return (charCode !== 32 /* CharCode.Space */
        && ((prevCharCodeClass === 2 /* CharacterClass.BREAK_AFTER */ && charCodeClass !== 2 /* CharacterClass.BREAK_AFTER */) // break at the end of multiple BREAK_AFTER
            || (prevCharCodeClass !== 1 /* CharacterClass.BREAK_BEFORE */ && charCodeClass === 1 /* CharacterClass.BREAK_BEFORE */) // break at the start of multiple BREAK_BEFORE
            || (!isKeepAll && prevCharCodeClass === 3 /* CharacterClass.BREAK_IDEOGRAPHIC */ && charCodeClass !== 2 /* CharacterClass.BREAK_AFTER */)
            || (!isKeepAll && charCodeClass === 3 /* CharacterClass.BREAK_IDEOGRAPHIC */ && prevCharCodeClass !== 1 /* CharacterClass.BREAK_BEFORE */)));
}
function computeWrappedTextIndentLength(lineText, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent) {
    let wrappedTextIndentLength = 0;
    if (wrappingIndent !== 0 /* WrappingIndent.None */) {
        const firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineText);
        if (firstNonWhitespaceIndex !== -1) {
            // Track existing indent
            for (let i = 0; i < firstNonWhitespaceIndex; i++) {
                const charWidth = (lineText.charCodeAt(i) === 9 /* CharCode.Tab */ ? tabCharacterWidth(wrappedTextIndentLength, tabSize) : 1);
                wrappedTextIndentLength += charWidth;
            }
            // Increase indent of continuation lines, if desired
            const numberOfAdditionalTabs = (wrappingIndent === 3 /* WrappingIndent.DeepIndent */ ? 2 : wrappingIndent === 2 /* WrappingIndent.Indent */ ? 1 : 0);
            for (let i = 0; i < numberOfAdditionalTabs; i++) {
                const charWidth = tabCharacterWidth(wrappedTextIndentLength, tabSize);
                wrappedTextIndentLength += charWidth;
            }
            // Force sticking to beginning of line if no character would fit except for the indentation
            if (wrappedTextIndentLength + columnsForFullWidthChar > firstLineBreakColumn) {
                wrappedTextIndentLength = 0;
            }
        }
    }
    return wrappedTextIndentLength;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL21vbm9zcGFjZUxpbmVCcmVha3NDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXpELE9BQU8sRUFBbUQsdUJBQXVCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6SCxNQUFNLE9BQU8sa0NBQWtDO0lBQ3ZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBK0I7UUFDbkQsT0FBTyxJQUFJLGtDQUFrQyxDQUM1QyxPQUFPLENBQUMsR0FBRyxzREFBNEMsRUFDdkQsT0FBTyxDQUFDLEdBQUcscURBQTJDLENBQ3RELENBQUM7SUFDSCxDQUFDO0lBSUQsWUFBWSxnQkFBd0IsRUFBRSxlQUF1QjtRQUM1RCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksMkJBQTJCLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVNLHdCQUF3QixDQUFDLFFBQWtCLEVBQUUsT0FBZSxFQUFFLGNBQXNCLEVBQUUsY0FBOEIsRUFBRSxTQUErQjtRQUMzSixNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7UUFDOUIsTUFBTSxhQUFhLEdBQWtDLEVBQUUsQ0FBQztRQUN4RCxNQUFNLG9CQUFvQixHQUF1QyxFQUFFLENBQUM7UUFDcEUsT0FBTztZQUNOLFVBQVUsRUFBRSxDQUFDLFFBQWdCLEVBQUUsWUFBdUMsRUFBRSxxQkFB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