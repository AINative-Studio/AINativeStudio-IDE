/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { SingleCursorState } from '../cursorCommon.js';
import { DeleteOperations } from './cursorDeleteOperations.js';
import { getMapForWordSeparators } from '../core/wordCharacterClassifier.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
var WordType;
(function (WordType) {
    WordType[WordType["None"] = 0] = "None";
    WordType[WordType["Regular"] = 1] = "Regular";
    WordType[WordType["Separator"] = 2] = "Separator";
})(WordType || (WordType = {}));
export var WordNavigationType;
(function (WordNavigationType) {
    WordNavigationType[WordNavigationType["WordStart"] = 0] = "WordStart";
    WordNavigationType[WordNavigationType["WordStartFast"] = 1] = "WordStartFast";
    WordNavigationType[WordNavigationType["WordEnd"] = 2] = "WordEnd";
    WordNavigationType[WordNavigationType["WordAccessibility"] = 3] = "WordAccessibility"; // Respect chrome definition of a word
})(WordNavigationType || (WordNavigationType = {}));
export class WordOperations {
    static _createWord(lineContent, wordType, nextCharClass, start, end) {
        // console.log('WORD ==> ' + start + ' => ' + end + ':::: <<<' + lineContent.substring(start, end) + '>>>');
        return { start: start, end: end, wordType: wordType, nextCharClass: nextCharClass };
    }
    static _createIntlWord(intlWord, nextCharClass) {
        // console.log('INTL WORD ==> ' + intlWord.index + ' => ' + intlWord.index + intlWord.segment.length + ':::: <<<' + intlWord.segment + '>>>');
        return { start: intlWord.index, end: intlWord.index + intlWord.segment.length, wordType: 1 /* WordType.Regular */, nextCharClass: nextCharClass };
    }
    static _findPreviousWordOnLine(wordSeparators, model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        return this._doFindPreviousWordOnLine(lineContent, wordSeparators, position);
    }
    static _doFindPreviousWordOnLine(lineContent, wordSeparators, position) {
        let wordType = 0 /* WordType.None */;
        const previousIntlWord = wordSeparators.findPrevIntlWordBeforeOrAtOffset(lineContent, position.column - 2);
        for (let chIndex = position.column - 2; chIndex >= 0; chIndex--) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (previousIntlWord && chIndex === previousIntlWord.index) {
                return this._createIntlWord(previousIntlWord, chClass);
            }
            if (chClass === 0 /* WordCharacterClass.Regular */) {
                if (wordType === 2 /* WordType.Separator */) {
                    return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                }
                wordType = 1 /* WordType.Regular */;
            }
            else if (chClass === 2 /* WordCharacterClass.WordSeparator */) {
                if (wordType === 1 /* WordType.Regular */) {
                    return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                }
                wordType = 2 /* WordType.Separator */;
            }
            else if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                if (wordType !== 0 /* WordType.None */) {
                    return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                }
            }
        }
        if (wordType !== 0 /* WordType.None */) {
            return this._createWord(lineContent, wordType, 1 /* WordCharacterClass.Whitespace */, 0, this._findEndOfWord(lineContent, wordSeparators, wordType, 0));
        }
        return null;
    }
    static _findEndOfWord(lineContent, wordSeparators, wordType, startIndex) {
        const nextIntlWord = wordSeparators.findNextIntlWordAtOrAfterOffset(lineContent, startIndex);
        const len = lineContent.length;
        for (let chIndex = startIndex; chIndex < len; chIndex++) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (nextIntlWord && chIndex === nextIntlWord.index + nextIntlWord.segment.length) {
                return chIndex;
            }
            if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                return chIndex;
            }
            if (wordType === 1 /* WordType.Regular */ && chClass === 2 /* WordCharacterClass.WordSeparator */) {
                return chIndex;
            }
            if (wordType === 2 /* WordType.Separator */ && chClass === 0 /* WordCharacterClass.Regular */) {
                return chIndex;
            }
        }
        return len;
    }
    static _findNextWordOnLine(wordSeparators, model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        return this._doFindNextWordOnLine(lineContent, wordSeparators, position);
    }
    static _doFindNextWordOnLine(lineContent, wordSeparators, position) {
        let wordType = 0 /* WordType.None */;
        const len = lineContent.length;
        const nextIntlWord = wordSeparators.findNextIntlWordAtOrAfterOffset(lineContent, position.column - 1);
        for (let chIndex = position.column - 1; chIndex < len; chIndex++) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (nextIntlWord && chIndex === nextIntlWord.index) {
                return this._createIntlWord(nextIntlWord, chClass);
            }
            if (chClass === 0 /* WordCharacterClass.Regular */) {
                if (wordType === 2 /* WordType.Separator */) {
                    return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                }
                wordType = 1 /* WordType.Regular */;
            }
            else if (chClass === 2 /* WordCharacterClass.WordSeparator */) {
                if (wordType === 1 /* WordType.Regular */) {
                    return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                }
                wordType = 2 /* WordType.Separator */;
            }
            else if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                if (wordType !== 0 /* WordType.None */) {
                    return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                }
            }
        }
        if (wordType !== 0 /* WordType.None */) {
            return this._createWord(lineContent, wordType, 1 /* WordCharacterClass.Whitespace */, this._findStartOfWord(lineContent, wordSeparators, wordType, len - 1), len);
        }
        return null;
    }
    static _findStartOfWord(lineContent, wordSeparators, wordType, startIndex) {
        const previousIntlWord = wordSeparators.findPrevIntlWordBeforeOrAtOffset(lineContent, startIndex);
        for (let chIndex = startIndex; chIndex >= 0; chIndex--) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (previousIntlWord && chIndex === previousIntlWord.index) {
                return chIndex;
            }
            if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                return chIndex + 1;
            }
            if (wordType === 1 /* WordType.Regular */ && chClass === 2 /* WordCharacterClass.WordSeparator */) {
                return chIndex + 1;
            }
            if (wordType === 2 /* WordType.Separator */ && chClass === 0 /* WordCharacterClass.Regular */) {
                return chIndex + 1;
            }
        }
        return 0;
    }
    static moveWordLeft(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        let lineNumber = position.lineNumber;
        let column = position.column;
        if (column === 1) {
            if (lineNumber > 1) {
                lineNumber = lineNumber - 1;
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, column));
        if (wordNavigationType === 0 /* WordNavigationType.WordStart */) {
            return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
        }
        if (wordNavigationType === 1 /* WordNavigationType.WordStartFast */) {
            if (!hasMulticursor // avoid having multiple cursors stop at different locations when doing word start
                && prevWordOnLine
                && prevWordOnLine.wordType === 2 /* WordType.Separator */
                && prevWordOnLine.end - prevWordOnLine.start === 1
                && prevWordOnLine.nextCharClass === 0 /* WordCharacterClass.Regular */) {
                // Skip over a word made up of one single separator and followed by a regular character
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
            }
            return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
        }
        if (wordNavigationType === 3 /* WordNavigationType.WordAccessibility */) {
            while (prevWordOnLine
                && prevWordOnLine.wordType === 2 /* WordType.Separator */) {
                // Skip over words made up of only separators
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
            }
            return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
        }
        // We are stopping at the ending of words
        if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
            prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
        }
        return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.end + 1 : 1);
    }
    static _moveWordPartLeft(model, position) {
        const lineNumber = position.lineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (position.column === 1) {
            return (lineNumber > 1 ? new Position(lineNumber - 1, model.getLineMaxColumn(lineNumber - 1)) : position);
        }
        const lineContent = model.getLineContent(lineNumber);
        for (let column = position.column - 1; column > 1; column--) {
            const left = lineContent.charCodeAt(column - 2);
            const right = lineContent.charCodeAt(column - 1);
            if (left === 95 /* CharCode.Underline */ && right !== 95 /* CharCode.Underline */) {
                // snake_case_variables
                return new Position(lineNumber, column);
            }
            if (left === 45 /* CharCode.Dash */ && right !== 45 /* CharCode.Dash */) {
                // kebab-case-variables
                return new Position(lineNumber, column);
            }
            if ((strings.isLowerAsciiLetter(left) || strings.isAsciiDigit(left)) && strings.isUpperAsciiLetter(right)) {
                // camelCaseVariables
                return new Position(lineNumber, column);
            }
            if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                // thisIsACamelCaseWithOneLetterWords
                if (column + 1 < maxColumn) {
                    const rightRight = lineContent.charCodeAt(column);
                    if (strings.isLowerAsciiLetter(rightRight) || strings.isAsciiDigit(rightRight)) {
                        return new Position(lineNumber, column);
                    }
                }
            }
        }
        return new Position(lineNumber, 1);
    }
    static moveWordRight(wordSeparators, model, position, wordNavigationType) {
        let lineNumber = position.lineNumber;
        let column = position.column;
        let movedDown = false;
        if (column === model.getLineMaxColumn(lineNumber)) {
            if (lineNumber < model.getLineCount()) {
                movedDown = true;
                lineNumber = lineNumber + 1;
                column = 1;
            }
        }
        let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, column));
        if (wordNavigationType === 2 /* WordNavigationType.WordEnd */) {
            if (nextWordOnLine && nextWordOnLine.wordType === 2 /* WordType.Separator */) {
                if (nextWordOnLine.end - nextWordOnLine.start === 1 && nextWordOnLine.nextCharClass === 0 /* WordCharacterClass.Regular */) {
                    // Skip over a word made up of one single separator and followed by a regular character
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
                }
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.end + 1;
            }
            else {
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        else if (wordNavigationType === 3 /* WordNavigationType.WordAccessibility */) {
            if (movedDown) {
                // If we move to the next line, pretend that the cursor is right before the first character.
                // This is needed when the first word starts right at the first character - and in order not to miss it,
                // we need to start before.
                column = 0;
            }
            while (nextWordOnLine
                && (nextWordOnLine.wordType === 2 /* WordType.Separator */
                    || nextWordOnLine.start + 1 <= column)) {
                // Skip over a word made up of one single separator
                // Also skip over word if it begins before current cursor position to ascertain we're moving forward at least 1 character.
                nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.start + 1;
            }
            else {
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        else {
            if (nextWordOnLine && !movedDown && column >= nextWordOnLine.start + 1) {
                nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.start + 1;
            }
            else {
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        return new Position(lineNumber, column);
    }
    static _moveWordPartRight(model, position) {
        const lineNumber = position.lineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (position.column === maxColumn) {
            return (lineNumber < model.getLineCount() ? new Position(lineNumber + 1, 1) : position);
        }
        const lineContent = model.getLineContent(lineNumber);
        for (let column = position.column + 1; column < maxColumn; column++) {
            const left = lineContent.charCodeAt(column - 2);
            const right = lineContent.charCodeAt(column - 1);
            if (left !== 95 /* CharCode.Underline */ && right === 95 /* CharCode.Underline */) {
                // snake_case_variables
                return new Position(lineNumber, column);
            }
            if (left !== 45 /* CharCode.Dash */ && right === 45 /* CharCode.Dash */) {
                // kebab-case-variables
                return new Position(lineNumber, column);
            }
            if ((strings.isLowerAsciiLetter(left) || strings.isAsciiDigit(left)) && strings.isUpperAsciiLetter(right)) {
                // camelCaseVariables
                return new Position(lineNumber, column);
            }
            if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                // thisIsACamelCaseWithOneLetterWords
                if (column + 1 < maxColumn) {
                    const rightRight = lineContent.charCodeAt(column);
                    if (strings.isLowerAsciiLetter(rightRight) || strings.isAsciiDigit(rightRight)) {
                        return new Position(lineNumber, column);
                    }
                }
            }
        }
        return new Position(lineNumber, maxColumn);
    }
    static _deleteWordLeftWhitespace(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const startIndex = position.column - 2;
        const lastNonWhitespace = strings.lastNonWhitespaceIndex(lineContent, startIndex);
        if (lastNonWhitespace + 1 < startIndex) {
            return new Range(position.lineNumber, lastNonWhitespace + 2, position.lineNumber, position.column);
        }
        return null;
    }
    static deleteWordLeft(ctx, wordNavigationType) {
        const wordSeparators = ctx.wordSeparators;
        const model = ctx.model;
        const selection = ctx.selection;
        const whitespaceHeuristics = ctx.whitespaceHeuristics;
        if (!selection.isEmpty()) {
            return selection;
        }
        if (DeleteOperations.isAutoClosingPairDelete(ctx.autoClosingDelete, ctx.autoClosingBrackets, ctx.autoClosingQuotes, ctx.autoClosingPairs.autoClosingPairsOpenByEnd, ctx.model, [ctx.selection], ctx.autoClosedCharacters)) {
            const position = ctx.selection.getPosition();
            return new Range(position.lineNumber, position.column - 1, position.lineNumber, position.column + 1);
        }
        const position = new Position(selection.positionLineNumber, selection.positionColumn);
        let lineNumber = position.lineNumber;
        let column = position.column;
        if (lineNumber === 1 && column === 1) {
            // Ignore deleting at beginning of file
            return null;
        }
        if (whitespaceHeuristics) {
            const r = this._deleteWordLeftWhitespace(model, position);
            if (r) {
                return r;
            }
        }
        let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        if (wordNavigationType === 0 /* WordNavigationType.WordStart */) {
            if (prevWordOnLine) {
                column = prevWordOnLine.start + 1;
            }
            else {
                if (column > 1) {
                    column = 1;
                }
                else {
                    lineNumber--;
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
        }
        else {
            if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
            }
            if (prevWordOnLine) {
                column = prevWordOnLine.end + 1;
            }
            else {
                if (column > 1) {
                    column = 1;
                }
                else {
                    lineNumber--;
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
        }
        return new Range(lineNumber, column, position.lineNumber, position.column);
    }
    static deleteInsideWord(wordSeparators, model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = new Position(selection.positionLineNumber, selection.positionColumn);
        const r = this._deleteInsideWordWhitespace(model, position);
        if (r) {
            return r;
        }
        return this._deleteInsideWordDetermineDeleteRange(wordSeparators, model, position);
    }
    static _charAtIsWhitespace(str, index) {
        const charCode = str.charCodeAt(index);
        return (charCode === 32 /* CharCode.Space */ || charCode === 9 /* CharCode.Tab */);
    }
    static _deleteInsideWordWhitespace(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const lineContentLength = lineContent.length;
        if (lineContentLength === 0) {
            // empty line
            return null;
        }
        let leftIndex = Math.max(position.column - 2, 0);
        if (!this._charAtIsWhitespace(lineContent, leftIndex)) {
            // touches a non-whitespace character to the left
            return null;
        }
        let rightIndex = Math.min(position.column - 1, lineContentLength - 1);
        if (!this._charAtIsWhitespace(lineContent, rightIndex)) {
            // touches a non-whitespace character to the right
            return null;
        }
        // walk over whitespace to the left
        while (leftIndex > 0 && this._charAtIsWhitespace(lineContent, leftIndex - 1)) {
            leftIndex--;
        }
        // walk over whitespace to the right
        while (rightIndex + 1 < lineContentLength && this._charAtIsWhitespace(lineContent, rightIndex + 1)) {
            rightIndex++;
        }
        return new Range(position.lineNumber, leftIndex + 1, position.lineNumber, rightIndex + 2);
    }
    static _deleteInsideWordDetermineDeleteRange(wordSeparators, model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const lineLength = lineContent.length;
        if (lineLength === 0) {
            // empty line
            if (position.lineNumber > 1) {
                return new Range(position.lineNumber - 1, model.getLineMaxColumn(position.lineNumber - 1), position.lineNumber, 1);
            }
            else {
                if (position.lineNumber < model.getLineCount()) {
                    return new Range(position.lineNumber, 1, position.lineNumber + 1, 1);
                }
                else {
                    // empty model
                    return new Range(position.lineNumber, 1, position.lineNumber, 1);
                }
            }
        }
        const touchesWord = (word) => {
            return (word.start + 1 <= position.column && position.column <= word.end + 1);
        };
        const createRangeWithPosition = (startColumn, endColumn) => {
            startColumn = Math.min(startColumn, position.column);
            endColumn = Math.max(endColumn, position.column);
            return new Range(position.lineNumber, startColumn, position.lineNumber, endColumn);
        };
        const deleteWordAndAdjacentWhitespace = (word) => {
            let startColumn = word.start + 1;
            let endColumn = word.end + 1;
            let expandedToTheRight = false;
            while (endColumn - 1 < lineLength && this._charAtIsWhitespace(lineContent, endColumn - 1)) {
                expandedToTheRight = true;
                endColumn++;
            }
            if (!expandedToTheRight) {
                while (startColumn > 1 && this._charAtIsWhitespace(lineContent, startColumn - 2)) {
                    startColumn--;
                }
            }
            return createRangeWithPosition(startColumn, endColumn);
        };
        const prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        if (prevWordOnLine && touchesWord(prevWordOnLine)) {
            return deleteWordAndAdjacentWhitespace(prevWordOnLine);
        }
        const nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (nextWordOnLine && touchesWord(nextWordOnLine)) {
            return deleteWordAndAdjacentWhitespace(nextWordOnLine);
        }
        if (prevWordOnLine && nextWordOnLine) {
            return createRangeWithPosition(prevWordOnLine.end + 1, nextWordOnLine.start + 1);
        }
        if (prevWordOnLine) {
            return createRangeWithPosition(prevWordOnLine.start + 1, prevWordOnLine.end + 1);
        }
        if (nextWordOnLine) {
            return createRangeWithPosition(nextWordOnLine.start + 1, nextWordOnLine.end + 1);
        }
        return createRangeWithPosition(1, lineLength + 1);
    }
    static _deleteWordPartLeft(model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const pos = selection.getPosition();
        const toPosition = WordOperations._moveWordPartLeft(model, pos);
        return new Range(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
    }
    static _findFirstNonWhitespaceChar(str, startIndex) {
        const len = str.length;
        for (let chIndex = startIndex; chIndex < len; chIndex++) {
            const ch = str.charAt(chIndex);
            if (ch !== ' ' && ch !== '\t') {
                return chIndex;
            }
        }
        return len;
    }
    static _deleteWordRightWhitespace(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const startIndex = position.column - 1;
        const firstNonWhitespace = this._findFirstNonWhitespaceChar(lineContent, startIndex);
        if (startIndex + 1 < firstNonWhitespace) {
            // bingo
            return new Range(position.lineNumber, position.column, position.lineNumber, firstNonWhitespace + 1);
        }
        return null;
    }
    static deleteWordRight(ctx, wordNavigationType) {
        const wordSeparators = ctx.wordSeparators;
        const model = ctx.model;
        const selection = ctx.selection;
        const whitespaceHeuristics = ctx.whitespaceHeuristics;
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = new Position(selection.positionLineNumber, selection.positionColumn);
        let lineNumber = position.lineNumber;
        let column = position.column;
        const lineCount = model.getLineCount();
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (lineNumber === lineCount && column === maxColumn) {
            // Ignore deleting at end of file
            return null;
        }
        if (whitespaceHeuristics) {
            const r = this._deleteWordRightWhitespace(model, position);
            if (r) {
                return r;
            }
        }
        let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (wordNavigationType === 2 /* WordNavigationType.WordEnd */) {
            if (nextWordOnLine) {
                column = nextWordOnLine.end + 1;
            }
            else {
                if (column < maxColumn || lineNumber === lineCount) {
                    column = maxColumn;
                }
                else {
                    lineNumber++;
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, 1));
                    if (nextWordOnLine) {
                        column = nextWordOnLine.start + 1;
                    }
                    else {
                        column = model.getLineMaxColumn(lineNumber);
                    }
                }
            }
        }
        else {
            if (nextWordOnLine && column >= nextWordOnLine.start + 1) {
                nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.start + 1;
            }
            else {
                if (column < maxColumn || lineNumber === lineCount) {
                    column = maxColumn;
                }
                else {
                    lineNumber++;
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, 1));
                    if (nextWordOnLine) {
                        column = nextWordOnLine.start + 1;
                    }
                    else {
                        column = model.getLineMaxColumn(lineNumber);
                    }
                }
            }
        }
        return new Range(lineNumber, column, position.lineNumber, position.column);
    }
    static _deleteWordPartRight(model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const pos = selection.getPosition();
        const toPosition = WordOperations._moveWordPartRight(model, pos);
        return new Range(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
    }
    static _createWordAtPosition(model, lineNumber, word) {
        const range = new Range(lineNumber, word.start + 1, lineNumber, word.end + 1);
        return {
            word: model.getValueInRange(range),
            startColumn: range.startColumn,
            endColumn: range.endColumn
        };
    }
    static getWordAtPosition(model, _wordSeparators, _intlSegmenterLocales, position) {
        const wordSeparators = getMapForWordSeparators(_wordSeparators, _intlSegmenterLocales);
        const prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        if (prevWord && prevWord.wordType === 1 /* WordType.Regular */ && prevWord.start <= position.column - 1 && position.column - 1 <= prevWord.end) {
            return WordOperations._createWordAtPosition(model, position.lineNumber, prevWord);
        }
        const nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (nextWord && nextWord.wordType === 1 /* WordType.Regular */ && nextWord.start <= position.column - 1 && position.column - 1 <= nextWord.end) {
            return WordOperations._createWordAtPosition(model, position.lineNumber, nextWord);
        }
        return null;
    }
    static word(config, model, cursor, inSelectionMode, position) {
        const wordSeparators = getMapForWordSeparators(config.wordSeparators, config.wordSegmenterLocales);
        const prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        const nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (!inSelectionMode) {
            // Entering word selection for the first time
            let startColumn;
            let endColumn;
            if (prevWord && prevWord.wordType === 1 /* WordType.Regular */ && prevWord.start <= position.column - 1 && position.column - 1 <= prevWord.end) {
                // isTouchingPrevWord
                startColumn = prevWord.start + 1;
                endColumn = prevWord.end + 1;
            }
            else if (nextWord && nextWord.wordType === 1 /* WordType.Regular */ && nextWord.start <= position.column - 1 && position.column - 1 <= nextWord.end) {
                // isTouchingNextWord
                startColumn = nextWord.start + 1;
                endColumn = nextWord.end + 1;
            }
            else {
                if (prevWord) {
                    startColumn = prevWord.end + 1;
                }
                else {
                    startColumn = 1;
                }
                if (nextWord) {
                    endColumn = nextWord.start + 1;
                }
                else {
                    endColumn = model.getLineMaxColumn(position.lineNumber);
                }
            }
            return new SingleCursorState(new Range(position.lineNumber, startColumn, position.lineNumber, endColumn), 1 /* SelectionStartKind.Word */, 0, new Position(position.lineNumber, endColumn), 0);
        }
        let startColumn;
        let endColumn;
        if (prevWord && prevWord.wordType === 1 /* WordType.Regular */ && prevWord.start < position.column - 1 && position.column - 1 < prevWord.end) {
            // isInsidePrevWord
            startColumn = prevWord.start + 1;
            endColumn = prevWord.end + 1;
        }
        else if (nextWord && nextWord.wordType === 1 /* WordType.Regular */ && nextWord.start < position.column - 1 && position.column - 1 < nextWord.end) {
            // isInsideNextWord
            startColumn = nextWord.start + 1;
            endColumn = nextWord.end + 1;
        }
        else {
            startColumn = position.column;
            endColumn = position.column;
        }
        const lineNumber = position.lineNumber;
        let column;
        if (cursor.selectionStart.containsPosition(position)) {
            column = cursor.selectionStart.endColumn;
        }
        else if (position.isBeforeOrEqual(cursor.selectionStart.getStartPosition())) {
            column = startColumn;
            const possiblePosition = new Position(lineNumber, column);
            if (cursor.selectionStart.containsPosition(possiblePosition)) {
                column = cursor.selectionStart.endColumn;
            }
        }
        else {
            column = endColumn;
            const possiblePosition = new Position(lineNumber, column);
            if (cursor.selectionStart.containsPosition(possiblePosition)) {
                column = cursor.selectionStart.startColumn;
            }
        }
        return cursor.move(true, lineNumber, column, 0);
    }
}
export class WordPartOperations extends WordOperations {
    static deleteWordPartLeft(ctx) {
        const candidates = enforceDefined([
            WordOperations.deleteWordLeft(ctx, 0 /* WordNavigationType.WordStart */),
            WordOperations.deleteWordLeft(ctx, 2 /* WordNavigationType.WordEnd */),
            WordOperations._deleteWordPartLeft(ctx.model, ctx.selection)
        ]);
        candidates.sort(Range.compareRangesUsingEnds);
        return candidates[2];
    }
    static deleteWordPartRight(ctx) {
        const candidates = enforceDefined([
            WordOperations.deleteWordRight(ctx, 0 /* WordNavigationType.WordStart */),
            WordOperations.deleteWordRight(ctx, 2 /* WordNavigationType.WordEnd */),
            WordOperations._deleteWordPartRight(ctx.model, ctx.selection)
        ]);
        candidates.sort(Range.compareRangesUsingStarts);
        return candidates[0];
    }
    static moveWordPartLeft(wordSeparators, model, position, hasMulticursor) {
        const candidates = enforceDefined([
            WordOperations.moveWordLeft(wordSeparators, model, position, 0 /* WordNavigationType.WordStart */, hasMulticursor),
            WordOperations.moveWordLeft(wordSeparators, model, position, 2 /* WordNavigationType.WordEnd */, hasMulticursor),
            WordOperations._moveWordPartLeft(model, position)
        ]);
        candidates.sort(Position.compare);
        return candidates[2];
    }
    static moveWordPartRight(wordSeparators, model, position) {
        const candidates = enforceDefined([
            WordOperations.moveWordRight(wordSeparators, model, position, 0 /* WordNavigationType.WordStart */),
            WordOperations.moveWordRight(wordSeparators, model, position, 2 /* WordNavigationType.WordEnd */),
            WordOperations._moveWordPartRight(model, position)
        ]);
        candidates.sort(Position.compare);
        return candidates[0];
    }
}
function enforceDefined(arr) {
    return arr.filter(el => Boolean(el));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yV29yZE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yV29yZE9wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUUzRCxPQUFPLEVBQStELGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDcEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDL0QsT0FBTyxFQUFvRSx1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9JLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUF5QnpDLElBQVcsUUFJVjtBQUpELFdBQVcsUUFBUTtJQUNsQix1Q0FBUSxDQUFBO0lBQ1IsNkNBQVcsQ0FBQTtJQUNYLGlEQUFhLENBQUE7QUFDZCxDQUFDLEVBSlUsUUFBUSxLQUFSLFFBQVEsUUFJbEI7QUFFRCxNQUFNLENBQU4sSUFBa0Isa0JBS2pCO0FBTEQsV0FBa0Isa0JBQWtCO0lBQ25DLHFFQUFhLENBQUE7SUFDYiw2RUFBaUIsQ0FBQTtJQUNqQixpRUFBVyxDQUFBO0lBQ1gscUZBQXFCLENBQUEsQ0FBQyxzQ0FBc0M7QUFDN0QsQ0FBQyxFQUxpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBS25DO0FBY0QsTUFBTSxPQUFPLGNBQWM7SUFFbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFtQixFQUFFLFFBQWtCLEVBQUUsYUFBaUMsRUFBRSxLQUFhLEVBQUUsR0FBVztRQUNoSSw0R0FBNEc7UUFDNUcsT0FBTyxFQUFFLEtBQUss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