/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { getMapForWordSeparators } from '../core/wordCharacterClassifier.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { FindMatch, SearchData } from '../model.js';
const LIMIT_FIND_COUNT = 999;
export class SearchParams {
    constructor(searchString, isRegex, matchCase, wordSeparators) {
        this.searchString = searchString;
        this.isRegex = isRegex;
        this.matchCase = matchCase;
        this.wordSeparators = wordSeparators;
    }
    parseSearchRequest() {
        if (this.searchString === '') {
            return null;
        }
        // Try to create a RegExp out of the params
        let multiline;
        if (this.isRegex) {
            multiline = isMultilineRegexSource(this.searchString);
        }
        else {
            multiline = (this.searchString.indexOf('\n') >= 0);
        }
        let regex = null;
        try {
            regex = strings.createRegExp(this.searchString, this.isRegex, {
                matchCase: this.matchCase,
                wholeWord: false,
                multiline: multiline,
                global: true,
                unicode: true
            });
        }
        catch (err) {
            return null;
        }
        if (!regex) {
            return null;
        }
        let canUseSimpleSearch = (!this.isRegex && !multiline);
        if (canUseSimpleSearch && this.searchString.toLowerCase() !== this.searchString.toUpperCase()) {
            // casing might make a difference
            canUseSimpleSearch = this.matchCase;
        }
        return new SearchData(regex, this.wordSeparators ? getMapForWordSeparators(this.wordSeparators, []) : null, canUseSimpleSearch ? this.searchString : null);
    }
}
export function isMultilineRegexSource(searchString) {
    if (!searchString || searchString.length === 0) {
        return false;
    }
    for (let i = 0, len = searchString.length; i < len; i++) {
        const chCode = searchString.charCodeAt(i);
        if (chCode === 10 /* CharCode.LineFeed */) {
            return true;
        }
        if (chCode === 92 /* CharCode.Backslash */) {
            // move to next char
            i++;
            if (i >= len) {
                // string ends with a \
                break;
            }
            const nextChCode = searchString.charCodeAt(i);
            if (nextChCode === 110 /* CharCode.n */ || nextChCode === 114 /* CharCode.r */ || nextChCode === 87 /* CharCode.W */) {
                return true;
            }
        }
    }
    return false;
}
export function createFindMatch(range, rawMatches, captureMatches) {
    if (!captureMatches) {
        return new FindMatch(range, null);
    }
    const matches = [];
    for (let i = 0, len = rawMatches.length; i < len; i++) {
        matches[i] = rawMatches[i];
    }
    return new FindMatch(range, matches);
}
class LineFeedCounter {
    constructor(text) {
        const lineFeedsOffsets = [];
        let lineFeedsOffsetsLen = 0;
        for (let i = 0, textLen = text.length; i < textLen; i++) {
            if (text.charCodeAt(i) === 10 /* CharCode.LineFeed */) {
                lineFeedsOffsets[lineFeedsOffsetsLen++] = i;
            }
        }
        this._lineFeedsOffsets = lineFeedsOffsets;
    }
    findLineFeedCountBeforeOffset(offset) {
        const lineFeedsOffsets = this._lineFeedsOffsets;
        let min = 0;
        let max = lineFeedsOffsets.length - 1;
        if (max === -1) {
            // no line feeds
            return 0;
        }
        if (offset <= lineFeedsOffsets[0]) {
            // before first line feed
            return 0;
        }
        while (min < max) {
            const mid = min + ((max - min) / 2 >> 0);
            if (lineFeedsOffsets[mid] >= offset) {
                max = mid - 1;
            }
            else {
                if (lineFeedsOffsets[mid + 1] >= offset) {
                    // bingo!
                    min = mid;
                    max = mid;
                }
                else {
                    min = mid + 1;
                }
            }
        }
        return min + 1;
    }
}
export class TextModelSearch {
    static findMatches(model, searchParams, searchRange, captureMatches, limitResultCount) {
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return [];
        }
        if (searchData.regex.multiline) {
            return this._doFindMatchesMultiline(model, searchRange, new Searcher(searchData.wordSeparators, searchData.regex), captureMatches, limitResultCount);
        }
        return this._doFindMatchesLineByLine(model, searchRange, searchData, captureMatches, limitResultCount);
    }
    /**
     * Multiline search always executes on the lines concatenated with \n.
     * We must therefore compensate for the count of \n in case the model is CRLF
     */
    static _getMultilineMatchRange(model, deltaOffset, text, lfCounter, matchIndex, match0) {
        let startOffset;
        let lineFeedCountBeforeMatch = 0;
        if (lfCounter) {
            lineFeedCountBeforeMatch = lfCounter.findLineFeedCountBeforeOffset(matchIndex);
            startOffset = deltaOffset + matchIndex + lineFeedCountBeforeMatch /* add as many \r as there were \n */;
        }
        else {
            startOffset = deltaOffset + matchIndex;
        }
        let endOffset;
        if (lfCounter) {
            const lineFeedCountBeforeEndOfMatch = lfCounter.findLineFeedCountBeforeOffset(matchIndex + match0.length);
            const lineFeedCountInMatch = lineFeedCountBeforeEndOfMatch - lineFeedCountBeforeMatch;
            endOffset = startOffset + match0.length + lineFeedCountInMatch /* add as many \r as there were \n */;
        }
        else {
            endOffset = startOffset + match0.length;
        }
        const startPosition = model.getPositionAt(startOffset);
        const endPosition = model.getPositionAt(endOffset);
        return new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
    }
    static _doFindMatchesMultiline(model, searchRange, searcher, captureMatches, limitResultCount) {
        const deltaOffset = model.getOffsetAt(searchRange.getStartPosition());
        // We always execute multiline search over the lines joined with \n
        // This makes it that \n will match the EOL for both CRLF and LF models
        // We compensate for offset errors in `_getMultilineMatchRange`
        const text = model.getValueInRange(searchRange, 1 /* EndOfLinePreference.LF */);
        const lfCounter = (model.getEOL() === '\r\n' ? new LineFeedCounter(text) : null);
        const result = [];
        let counter = 0;
        let m;
        searcher.reset(0);
        while ((m = searcher.next(text))) {
            result[counter++] = createFindMatch(this._getMultilineMatchRange(model, deltaOffset, text, lfCounter, m.index, m[0]), m, captureMatches);
            if (counter >= limitResultCount) {
                return result;
            }
        }
        return result;
    }
    static _doFindMatchesLineByLine(model, searchRange, searchData, captureMatches, limitResultCount) {
        const result = [];
        let resultLen = 0;
        // Early case for a search range that starts & stops on the same line number
        if (searchRange.startLineNumber === searchRange.endLineNumber) {
            const text = model.getLineContent(searchRange.startLineNumber).substring(searchRange.startColumn - 1, searchRange.endColumn - 1);
            resultLen = this._findMatchesInLine(searchData, text, searchRange.startLineNumber, searchRange.startColumn - 1, resultLen, result, captureMatches, limitResultCount);
            return result;
        }
        // Collect results from first line
        const text = model.getLineContent(searchRange.startLineNumber).substring(searchRange.startColumn - 1);
        resultLen = this._findMatchesInLine(searchData, text, searchRange.startLineNumber, searchRange.startColumn - 1, resultLen, result, captureMatches, limitResultCount);
        // Collect results from middle lines
        for (let lineNumber = searchRange.startLineNumber + 1; lineNumber < searchRange.endLineNumber && resultLen < limitResultCount; lineNumber++) {
            resultLen = this._findMatchesInLine(searchData, model.getLineContent(lineNumber), lineNumber, 0, resultLen, result, captureMatches, limitResultCount);
        }
        // Collect results from last line
        if (resultLen < limitResultCount) {
            const text = model.getLineContent(searchRange.endLineNumber).substring(0, searchRange.endColumn - 1);
            resultLen = this._findMatchesInLine(searchData, text, searchRange.endLineNumber, 0, resultLen, result, captureMatches, limitResultCount);
        }
        return result;
    }
    static _findMatchesInLine(searchData, text, lineNumber, deltaOffset, resultLen, result, captureMatches, limitResultCount) {
        const wordSeparators = searchData.wordSeparators;
        if (!captureMatches && searchData.simpleSearch) {
            const searchString = searchData.simpleSearch;
            const searchStringLen = searchString.length;
            const textLength = text.length;
            let lastMatchIndex = -searchStringLen;
            while ((lastMatchIndex = text.indexOf(searchString, lastMatchIndex + searchStringLen)) !== -1) {
                if (!wordSeparators || isValidMatch(wordSeparators, text, textLength, lastMatchIndex, searchStringLen)) {
                    result[resultLen++] = new FindMatch(new Range(lineNumber, lastMatchIndex + 1 + deltaOffset, lineNumber, lastMatchIndex + 1 + searchStringLen + deltaOffset), null);
                    if (resultLen >= limitResultCount) {
                        return resultLen;
                    }
                }
            }
            return resultLen;
        }
        const searcher = new Searcher(searchData.wordSeparators, searchData.regex);
        let m;
        // Reset regex to search from the beginning
        searcher.reset(0);
        do {
            m = searcher.next(text);
            if (m) {
                result[resultLen++] = createFindMatch(new Range(lineNumber, m.index + 1 + deltaOffset, lineNumber, m.index + 1 + m[0].length + deltaOffset), m, captureMatches);
                if (resultLen >= limitResultCount) {
                    return resultLen;
                }
            }
        } while (m);
        return resultLen;
    }
    static findNextMatch(model, searchParams, searchStart, captureMatches) {
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return null;
        }
        const searcher = new Searcher(searchData.wordSeparators, searchData.regex);
        if (searchData.regex.multiline) {
            return this._doFindNextMatchMultiline(model, searchStart, searcher, captureMatches);
        }
        return this._doFindNextMatchLineByLine(model, searchStart, searcher, captureMatches);
    }
    static _doFindNextMatchMultiline(model, searchStart, searcher, captureMatches) {
        const searchTextStart = new Position(searchStart.lineNumber, 1);
        const deltaOffset = model.getOffsetAt(searchTextStart);
        const lineCount = model.getLineCount();
        // We always execute multiline search over the lines joined with \n
        // This makes it that \n will match the EOL for both CRLF and LF models
        // We compensate for offset errors in `_getMultilineMatchRange`
        const text = model.getValueInRange(new Range(searchTextStart.lineNumber, searchTextStart.column, lineCount, model.getLineMaxColumn(lineCount)), 1 /* EndOfLinePreference.LF */);
        const lfCounter = (model.getEOL() === '\r\n' ? new LineFeedCounter(text) : null);
        searcher.reset(searchStart.column - 1);
        const m = searcher.next(text);
        if (m) {
            return createFindMatch(this._getMultilineMatchRange(model, deltaOffset, text, lfCounter, m.index, m[0]), m, captureMatches);
        }
        if (searchStart.lineNumber !== 1 || searchStart.column !== 1) {
            // Try again from the top
            return this._doFindNextMatchMultiline(model, new Position(1, 1), searcher, captureMatches);
        }
        return null;
    }
    static _doFindNextMatchLineByLine(model, searchStart, searcher, captureMatches) {
        const lineCount = model.getLineCount();
        const startLineNumber = searchStart.lineNumber;
        // Look in first line
        const text = model.getLineContent(startLineNumber);
        const r = this._findFirstMatchInLine(searcher, text, startLineNumber, searchStart.column, captureMatches);
        if (r) {
            return r;
        }
        for (let i = 1; i <= lineCount; i++) {
            const lineIndex = (startLineNumber + i - 1) % lineCount;
            const text = model.getLineContent(lineIndex + 1);
            const r = this._findFirstMatchInLine(searcher, text, lineIndex + 1, 1, captureMatches);
            if (r) {
                return r;
            }
        }
        return null;
    }
    static _findFirstMatchInLine(searcher, text, lineNumber, fromColumn, captureMatches) {
        // Set regex to search from column
        searcher.reset(fromColumn - 1);
        const m = searcher.next(text);
        if (m) {
            return createFindMatch(new Range(lineNumber, m.index + 1, lineNumber, m.index + 1 + m[0].length), m, captureMatches);
        }
        return null;
    }
    static findPreviousMatch(model, searchParams, searchStart, captureMatches) {
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return null;
        }
        const searcher = new Searcher(searchData.wordSeparators, searchData.regex);
        if (searchData.regex.multiline) {
            return this._doFindPreviousMatchMultiline(model, searchStart, searcher, captureMatches);
        }
        return this._doFindPreviousMatchLineByLine(model, searchStart, searcher, captureMatches);
    }
    static _doFindPreviousMatchMultiline(model, searchStart, searcher, captureMatches) {
        const matches = this._doFindMatchesMultiline(model, new Range(1, 1, searchStart.lineNumber, searchStart.column), searcher, captureMatches, 10 * LIMIT_FIND_COUNT);
        if (matches.length > 0) {
            return matches[matches.length - 1];
        }
        const lineCount = model.getLineCount();
        if (searchStart.lineNumber !== lineCount || searchStart.column !== model.getLineMaxColumn(lineCount)) {
            // Try again with all content
            return this._doFindPreviousMatchMultiline(model, new Position(lineCount, model.getLineMaxColumn(lineCount)), searcher, captureMatches);
        }
        return null;
    }
    static _doFindPreviousMatchLineByLine(model, searchStart, searcher, captureMatches) {
        const lineCount = model.getLineCount();
        const startLineNumber = searchStart.lineNumber;
        // Look in first line
        const text = model.getLineContent(startLineNumber).substring(0, searchStart.column - 1);
        const r = this._findLastMatchInLine(searcher, text, startLineNumber, captureMatches);
        if (r) {
            return r;
        }
        for (let i = 1; i <= lineCount; i++) {
            const lineIndex = (lineCount + startLineNumber - i - 1) % lineCount;
            const text = model.getLineContent(lineIndex + 1);
            const r = this._findLastMatchInLine(searcher, text, lineIndex + 1, captureMatches);
            if (r) {
                return r;
            }
        }
        return null;
    }
    static _findLastMatchInLine(searcher, text, lineNumber, captureMatches) {
        let bestResult = null;
        let m;
        searcher.reset(0);
        while ((m = searcher.next(text))) {
            bestResult = createFindMatch(new Range(lineNumber, m.index + 1, lineNumber, m.index + 1 + m[0].length), m, captureMatches);
        }
        return bestResult;
    }
}
function leftIsWordBounday(wordSeparators, text, textLength, matchStartIndex, matchLength) {
    if (matchStartIndex === 0) {
        // Match starts at start of string
        return true;
    }
    const charBefore = text.charCodeAt(matchStartIndex - 1);
    if (wordSeparators.get(charBefore) !== 0 /* WordCharacterClass.Regular */) {
        // The character before the match is a word separator
        return true;
    }
    if (charBefore === 13 /* CharCode.CarriageReturn */ || charBefore === 10 /* CharCode.LineFeed */) {
        // The character before the match is line break or carriage return.
        return true;
    }
    if (matchLength > 0) {
        const firstCharInMatch = text.charCodeAt(matchStartIndex);
        if (wordSeparators.get(firstCharInMatch) !== 0 /* WordCharacterClass.Regular */) {
            // The first character inside the match is a word separator
            return true;
        }
    }
    return false;
}
function rightIsWordBounday(wordSeparators, text, textLength, matchStartIndex, matchLength) {
    if (matchStartIndex + matchLength === textLength) {
        // Match ends at end of string
        return true;
    }
    const charAfter = text.charCodeAt(matchStartIndex + matchLength);
    if (wordSeparators.get(charAfter) !== 0 /* WordCharacterClass.Regular */) {
        // The character after the match is a word separator
        return true;
    }
    if (charAfter === 13 /* CharCode.CarriageReturn */ || charAfter === 10 /* CharCode.LineFeed */) {
        // The character after the match is line break or carriage return.
        return true;
    }
    if (matchLength > 0) {
        const lastCharInMatch = text.charCodeAt(matchStartIndex + matchLength - 1);
        if (wordSeparators.get(lastCharInMatch) !== 0 /* WordCharacterClass.Regular */) {
            // The last character in the match is a word separator
            return true;
        }
    }
    return false;
}
export function isValidMatch(wordSeparators, text, textLength, matchStartIndex, matchLength) {
    return (leftIsWordBounday(wordSeparators, text, textLength, matchStartIndex, matchLength)
        && rightIsWordBounday(wordSeparators, text, textLength, matchStartIndex, matchLength));
}
export class Searcher {
    constructor(wordSeparators, searchRegex) {
        this._wordSeparators = wordSeparators;
        this._searchRegex = searchRegex;
        this._prevMatchStartIndex = -1;
        this._prevMatchLength = 0;
    }
    reset(lastIndex) {
        this._searchRegex.lastIndex = lastIndex;
        this._prevMatchStartIndex = -1;
        this._prevMatchLength = 0;
    }
    next(text) {
        const textLength = text.length;
        let m;
        do {
            if (this._prevMatchStartIndex + this._prevMatchLength === textLength) {
                // Reached the end of the line
                return null;
            }
            m = this._searchRegex.exec(text);
            if (!m) {
                return null;
            }
            const matchStartIndex = m.index;
            const matchLength = m[0].length;
            if (matchStartIndex === this._prevMatchStartIndex && matchLength === this._prevMatchLength) {
                if (matchLength === 0) {
                    // the search result is an empty string and won't advance `regex.lastIndex`, so `regex.exec` will stuck here
                    // we attempt to recover from that by advancing by two if surrogate pair found and by one otherwise
                    if (strings.getNextCodePoint(text, textLength, this._searchRegex.lastIndex) > 0xFFFF) {
                        this._searchRegex.lastIndex += 2;
                    }
                    else {
                        this._searchRegex.lastIndex += 1;
                    }
                    continue;
                }
                // Exit early if the regex matches the same range twice
                return null;
            }
            this._prevMatchStartIndex = matchStartIndex;
            this._prevMatchLength = matchLength;
            if (!this._wordSeparators || isValidMatch(this._wordSeparators, text, textLength, matchStartIndex, matchLength)) {
                return m;
            }
        } while (m);
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsU2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdGV4dE1vZGVsU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUErQyx1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUF1QixTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBR3pFLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDO0FBRTdCLE1BQU0sT0FBTyxZQUFZO0lBTXhCLFlBQVksWUFBb0IsRUFBRSxPQUFnQixFQUFFLFNBQWtCLEVBQUUsY0FBNkI7UUFDcEcsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7SUFDdEMsQ0FBQztJQUVNLGtCQUFrQjtRQUN4QixJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsMkNBQTJDO1FBQzNDLElBQUksU0FBa0IsQ0FBQztRQUN2QixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixTQUFTLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FB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