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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWwvbW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFFM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFekQsT0FBTyxFQUFtRCx1QkFBdUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXpILE1BQU0sT0FBTyxrQ0FBa0M7SUFDdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUErQjtRQUNuRCxPQUFPLElBQUksa0NBQWtDLENBQzVDLE9BQU8sQ0FBQyxHQUFHLHNEQUE0QyxFQUN2RCxPQUFPLENBQUMsR0FBRyxxREFBMkMsQ0FDdEQsQ0FBQztJQUNILENBQUM7SUFJRCxZQUFZLGdCQUF3QixFQUFFLGVBQXVCO1FBQzVELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRU0sd0JBQXdCLENBQUMsUUFBa0IsRUFBRSxPQUFlLEVBQUUsY0FBc0IsRUFBRSxjQUE4QixFQUFFLFNBQStCO1FBQzNKLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM5QixNQUFNLGFBQWEsR0FBa0MsRUFBRSxDQUFDO1FBQ3hELE1BQU0sb0JBQW9CLEdBQXVDLEVBQUUsQ0FBQztRQUNwRSxPQUFPO1lBQ04sVUFBVSxFQUFFLENBQUMsUUFBZ0IsRUFBRSxZQUF1QyxFQUFFLHFCQUFx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