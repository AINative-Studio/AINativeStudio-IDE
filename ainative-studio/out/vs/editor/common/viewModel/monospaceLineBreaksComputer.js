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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC9tb25vc3BhY2VMaW5lQnJlYWtzQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUUzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUV6RCxPQUFPLEVBQW1ELHVCQUF1QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFekgsTUFBTSxPQUFPLGtDQUFrQztJQUN2QyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQStCO1FBQ25ELE9BQU8sSUFBSSxrQ0FBa0MsQ0FDNUMsT0FBTyxDQUFDLEdBQUcsc0RBQTRDLEVBQ3ZELE9BQU8sQ0FBQyxHQUFHLHFEQUEyQyxDQUN0RCxDQUFDO0lBQ0gsQ0FBQztJQUlELFlBQVksZ0JBQXdCLEVBQUUsZUFBdUI7UUFDNUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLDJCQUEyQixDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFTSx3QkFBd0IsQ0FBQyxRQUFrQixFQUFFLE9BQWUsRUFBRSxjQUFzQixFQUFFLGNBQThCLEVBQUUsU0FBK0I7UUFDM0osTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFDO1FBQzlCLE1BQU0sYUFBYSxHQUFrQyxFQUFFLENBQUM7UUFDeEQsTUFBTSxvQkFBb0IsR0FBdUMsRUFBRSxDQUFDO1FBQ3BFLE9BQU87WUFDTixVQUFVLEVBQUUsQ0FBQyxRQUFnQixFQUFFLFlBQXVDLEVBQUUs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