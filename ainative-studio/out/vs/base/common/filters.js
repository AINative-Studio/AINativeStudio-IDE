/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LRUCache } from './map.js';
import { getKoreanAltChars } from './naturalLanguage/korean.js';
import * as strings from './strings.js';
// Combined filters
/**
 * @returns A filter which combines the provided set
 * of filters with an or. The *first* filters that
 * matches defined the return value of the returned
 * filter.
 */
export function or(...filter) {
    return function (word, wordToMatchAgainst) {
        for (let i = 0, len = filter.length; i < len; i++) {
            const match = filter[i](word, wordToMatchAgainst);
            if (match) {
                return match;
            }
        }
        return null;
    };
}
// Prefix
export const matchesStrictPrefix = _matchesPrefix.bind(undefined, false);
export const matchesPrefix = _matchesPrefix.bind(undefined, true);
function _matchesPrefix(ignoreCase, word, wordToMatchAgainst) {
    if (!wordToMatchAgainst || wordToMatchAgainst.length < word.length) {
        return null;
    }
    let matches;
    if (ignoreCase) {
        matches = strings.startsWithIgnoreCase(wordToMatchAgainst, word);
    }
    else {
        matches = wordToMatchAgainst.indexOf(word) === 0;
    }
    if (!matches) {
        return null;
    }
    return word.length > 0 ? [{ start: 0, end: word.length }] : [];
}
// Contiguous Substring
export function matchesContiguousSubString(word, wordToMatchAgainst) {
    const index = wordToMatchAgainst.toLowerCase().indexOf(word.toLowerCase());
    if (index === -1) {
        return null;
    }
    return [{ start: index, end: index + word.length }];
}
// Substring
export function matchesSubString(word, wordToMatchAgainst) {
    return _matchesSubString(word.toLowerCase(), wordToMatchAgainst.toLowerCase(), 0, 0);
}
function _matchesSubString(word, wordToMatchAgainst, i, j) {
    if (i === word.length) {
        return [];
    }
    else if (j === wordToMatchAgainst.length) {
        return null;
    }
    else {
        if (word[i] === wordToMatchAgainst[j]) {
            let result = null;
            if (result = _matchesSubString(word, wordToMatchAgainst, i + 1, j + 1)) {
                return join({ start: j, end: j + 1 }, result);
            }
            return null;
        }
        return _matchesSubString(word, wordToMatchAgainst, i, j + 1);
    }
}
// CamelCase
function isLower(code) {
    return 97 /* CharCode.a */ <= code && code <= 122 /* CharCode.z */;
}
export function isUpper(code) {
    return 65 /* CharCode.A */ <= code && code <= 90 /* CharCode.Z */;
}
function isNumber(code) {
    return 48 /* CharCode.Digit0 */ <= code && code <= 57 /* CharCode.Digit9 */;
}
function isWhitespace(code) {
    return (code === 32 /* CharCode.Space */
        || code === 9 /* CharCode.Tab */
        || code === 10 /* CharCode.LineFeed */
        || code === 13 /* CharCode.CarriageReturn */);
}
const wordSeparators = new Set();
// These are chosen as natural word separators based on writen text.
// It is a subset of the word separators used by the monaco editor.
'()[]{}<>`\'"-/;:,.?!'
    .split('')
    .forEach(s => wordSeparators.add(s.charCodeAt(0)));
function isWordSeparator(code) {
    return isWhitespace(code) || wordSeparators.has(code);
}
function charactersMatch(codeA, codeB) {
    return (codeA === codeB) || (isWordSeparator(codeA) && isWordSeparator(codeB));
}
const alternateCharsCache = new Map();
/**
 * Gets alternative codes to the character code passed in. This comes in the
 * form of an array of character codes, all of which must match _in order_ to
 * successfully match.
 *
 * @param code The character code to check.
 */
function getAlternateCodes(code) {
    if (alternateCharsCache.has(code)) {
        return alternateCharsCache.get(code);
    }
    // NOTE: This function is written in such a way that it can be extended in
    // the future, but right now the return type takes into account it's only
    // supported by a single "alt codes provider".
    // `ArrayLike<ArrayLike<number>>` is a more appropriate type if changed.
    let result;
    const codes = getKoreanAltChars(code);
    if (codes) {
        result = codes;
    }
    alternateCharsCache.set(code, result);
    return result;
}
function isAlphanumeric(code) {
    return isLower(code) || isUpper(code) || isNumber(code);
}
function join(head, tail) {
    if (tail.length === 0) {
        tail = [head];
    }
    else if (head.end === tail[0].start) {
        tail[0].start = head.start;
    }
    else {
        tail.unshift(head);
    }
    return tail;
}
function nextAnchor(camelCaseWord, start) {
    for (let i = start; i < camelCaseWord.length; i++) {
        const c = camelCaseWord.charCodeAt(i);
        if (isUpper(c) || isNumber(c) || (i > 0 && !isAlphanumeric(camelCaseWord.charCodeAt(i - 1)))) {
            return i;
        }
    }
    return camelCaseWord.length;
}
function _matchesCamelCase(word, camelCaseWord, i, j) {
    if (i === word.length) {
        return [];
    }
    else if (j === camelCaseWord.length) {
        return null;
    }
    else if (word[i] !== camelCaseWord[j].toLowerCase()) {
        return null;
    }
    else {
        let result = null;
        let nextUpperIndex = j + 1;
        result = _matchesCamelCase(word, camelCaseWord, i + 1, j + 1);
        while (!result && (nextUpperIndex = nextAnchor(camelCaseWord, nextUpperIndex)) < camelCaseWord.length) {
            result = _matchesCamelCase(word, camelCaseWord, i + 1, nextUpperIndex);
            nextUpperIndex++;
        }
        return result === null ? null : join({ start: j, end: j + 1 }, result);
    }
}
// Heuristic to avoid computing camel case matcher for words that don't
// look like camelCaseWords.
function analyzeCamelCaseWord(word) {
    let upper = 0, lower = 0, alpha = 0, numeric = 0, code = 0;
    for (let i = 0; i < word.length; i++) {
        code = word.charCodeAt(i);
        if (isUpper(code)) {
            upper++;
        }
        if (isLower(code)) {
            lower++;
        }
        if (isAlphanumeric(code)) {
            alpha++;
        }
        if (isNumber(code)) {
            numeric++;
        }
    }
    const upperPercent = upper / word.length;
    const lowerPercent = lower / word.length;
    const alphaPercent = alpha / word.length;
    const numericPercent = numeric / word.length;
    return { upperPercent, lowerPercent, alphaPercent, numericPercent };
}
function isUpperCaseWord(analysis) {
    const { upperPercent, lowerPercent } = analysis;
    return lowerPercent === 0 && upperPercent > 0.6;
}
function isCamelCaseWord(analysis) {
    const { upperPercent, lowerPercent, alphaPercent, numericPercent } = analysis;
    return lowerPercent > 0.2 && upperPercent < 0.8 && alphaPercent > 0.6 && numericPercent < 0.2;
}
// Heuristic to avoid computing camel case matcher for words that don't
// look like camel case patterns.
function isCamelCasePattern(word) {
    let upper = 0, lower = 0, code = 0, whitespace = 0;
    for (let i = 0; i < word.length; i++) {
        code = word.charCodeAt(i);
        if (isUpper(code)) {
            upper++;
        }
        if (isLower(code)) {
            lower++;
        }
        if (isWhitespace(code)) {
            whitespace++;
        }
    }
    if ((upper === 0 || lower === 0) && whitespace === 0) {
        return word.length <= 30;
    }
    else {
        return upper <= 5;
    }
}
export function matchesCamelCase(word, camelCaseWord) {
    if (!camelCaseWord) {
        return null;
    }
    camelCaseWord = camelCaseWord.trim();
    if (camelCaseWord.length === 0) {
        return null;
    }
    if (!isCamelCasePattern(word)) {
        return null;
    }
    // TODO: Consider removing this check
    if (camelCaseWord.length > 60) {
        camelCaseWord = camelCaseWord.substring(0, 60);
    }
    const analysis = analyzeCamelCaseWord(camelCaseWord);
    if (!isCamelCaseWord(analysis)) {
        if (!isUpperCaseWord(analysis)) {
            return null;
        }
        camelCaseWord = camelCaseWord.toLowerCase();
    }
    let result = null;
    let i = 0;
    word = word.toLowerCase();
    while (i < camelCaseWord.length && (result = _matchesCamelCase(word, camelCaseWord, 0, i)) === null) {
        i = nextAnchor(camelCaseWord, i + 1);
    }
    return result;
}
// Matches beginning of words supporting non-ASCII languages
// If `contiguous` is true then matches word with beginnings of the words in the target. E.g. "pul" will match "Git: Pull"
// Otherwise also matches sub string of the word with beginnings of the words in the target. E.g. "gp" or "g p" will match "Git: Pull"
// Useful in cases where the target is words (e.g. command labels)
export function matchesWords(word, target, contiguous = false) {
    if (!target || target.length === 0) {
        return null;
    }
    let result = null;
    let targetIndex = 0;
    word = word.toLowerCase();
    target = target.toLowerCase();
    while (targetIndex < target.length) {
        result = _matchesWords(word, target, 0, targetIndex, contiguous);
        if (result !== null) {
            break;
        }
        targetIndex = nextWord(target, targetIndex + 1);
    }
    return result;
}
function _matchesWords(word, target, wordIndex, targetIndex, contiguous) {
    let targetIndexOffset = 0;
    if (wordIndex === word.length) {
        return [];
    }
    else if (targetIndex === target.length) {
        return null;
    }
    else if (!charactersMatch(word.charCodeAt(wordIndex), target.charCodeAt(targetIndex))) {
        // Verify alternate characters before exiting
        const altChars = getAlternateCodes(word.charCodeAt(wordIndex));
        if (!altChars) {
            return null;
        }
        for (let k = 0; k < altChars.length; k++) {
            if (!charactersMatch(altChars[k], target.charCodeAt(targetIndex + k))) {
                return null;
            }
        }
        targetIndexOffset += altChars.length - 1;
    }
    let result = null;
    let nextWordIndex = targetIndex + targetIndexOffset + 1;
    result = _matchesWords(word, target, wordIndex + 1, nextWordIndex, contiguous);
    if (!contiguous) {
        while (!result && (nextWordIndex = nextWord(target, nextWordIndex)) < target.length) {
            result = _matchesWords(word, target, wordIndex + 1, nextWordIndex, contiguous);
            nextWordIndex++;
        }
    }
    if (!result) {
        return null;
    }
    // If the characters don't exactly match, then they must be word separators (see charactersMatch(...)).
    // We don't want to include this in the matches but we don't want to throw the target out all together so we return `result`.
    if (word.charCodeAt(wordIndex) !== target.charCodeAt(targetIndex)) {
        // Verify alternate characters before exiting
        const altChars = getAlternateCodes(word.charCodeAt(wordIndex));
        if (!altChars) {
            return result;
        }
        for (let k = 0; k < altChars.length; k++) {
            if (altChars[k] !== target.charCodeAt(targetIndex + k)) {
                return result;
            }
        }
    }
    return join({ start: targetIndex, end: targetIndex + targetIndexOffset + 1 }, result);
}
function nextWord(word, start) {
    for (let i = start; i < word.length; i++) {
        if (isWordSeparator(word.charCodeAt(i)) ||
            (i > 0 && isWordSeparator(word.charCodeAt(i - 1)))) {
            return i;
        }
    }
    return word.length;
}
// Fuzzy
const fuzzyContiguousFilter = or(matchesPrefix, matchesCamelCase, matchesContiguousSubString);
const fuzzySeparateFilter = or(matchesPrefix, matchesCamelCase, matchesSubString);
const fuzzyRegExpCache = new LRUCache(10000); // bounded to 10000 elements
export function matchesFuzzy(word, wordToMatchAgainst, enableSeparateSubstringMatching = false) {
    if (typeof word !== 'string' || typeof wordToMatchAgainst !== 'string') {
        return null; // return early for invalid input
    }
    // Form RegExp for wildcard matches
    let regexp = fuzzyRegExpCache.get(word);
    if (!regexp) {
        regexp = new RegExp(strings.convertSimple2RegExpPattern(word), 'i');
        fuzzyRegExpCache.set(word, regexp);
    }
    // RegExp Filter
    const match = regexp.exec(wordToMatchAgainst);
    if (match) {
        return [{ start: match.index, end: match.index + match[0].length }];
    }
    // Default Filter
    return enableSeparateSubstringMatching ? fuzzySeparateFilter(word, wordToMatchAgainst) : fuzzyContiguousFilter(word, wordToMatchAgainst);
}
/**
 * Match pattern against word in a fuzzy way. As in IntelliSense and faster and more
 * powerful than `matchesFuzzy`
 */
export function matchesFuzzy2(pattern, word) {
    const score = fuzzyScore(pattern, pattern.toLowerCase(), 0, word, word.toLowerCase(), 0, { firstMatchCanBeWeak: true, boostFullMatch: true });
    return score ? createMatches(score) : null;
}
export function anyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos) {
    const max = Math.min(13, pattern.length);
    for (; patternPos < max; patternPos++) {
        const result = fuzzyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos, { firstMatchCanBeWeak: true, boostFullMatch: true });
        if (result) {
            return result;
        }
    }
    return [0, wordPos];
}
//#region --- fuzzyScore ---
export function createMatches(score) {
    if (typeof score === 'undefined') {
        return [];
    }
    const res = [];
    const wordPos = score[1];
    for (let i = score.length - 1; i > 1; i--) {
        const pos = score[i] + wordPos;
        const last = res[res.length - 1];
        if (last && last.end === pos) {
            last.end = pos + 1;
        }
        else {
            res.push({ start: pos, end: pos + 1 });
        }
    }
    return res;
}
const _maxLen = 128;
function initTable() {
    const table = [];
    const row = [];
    for (let i = 0; i <= _maxLen; i++) {
        row[i] = 0;
    }
    for (let i = 0; i <= _maxLen; i++) {
        table.push(row.slice(0));
    }
    return table;
}
function initArr(maxLen) {
    const row = [];
    for (let i = 0; i <= maxLen; i++) {
        row[i] = 0;
    }
    return row;
}
const _minWordMatchPos = initArr(2 * _maxLen); // min word position for a certain pattern position
const _maxWordMatchPos = initArr(2 * _maxLen); // max word position for a certain pattern position
const _diag = initTable(); // the length of a contiguous diagonal match
const _table = initTable();
const _arrows = initTable();
const _debug = false;
function printTable(table, pattern, patternLen, word, wordLen) {
    function pad(s, n, pad = ' ') {
        while (s.length < n) {
            s = pad + s;
        }
        return s;
    }
    let ret = ` |   |${word.split('').map(c => pad(c, 3)).join('|')}\n`;
    for (let i = 0; i <= patternLen; i++) {
        if (i === 0) {
            ret += ' |';
        }
        else {
            ret += `${pattern[i - 1]}|`;
        }
        ret += table[i].slice(0, wordLen + 1).map(n => pad(n.toString(), 3)).join('|') + '\n';
    }
    return ret;
}
function printTables(pattern, patternStart, word, wordStart) {
    pattern = pattern.substr(patternStart);
    word = word.substr(wordStart);
    console.log(printTable(_table, pattern, pattern.length, word, word.length));
    console.log(printTable(_arrows, pattern, pattern.length, word, word.length));
    console.log(printTable(_diag, pattern, pattern.length, word, word.length));
}
function isSeparatorAtPos(value, index) {
    if (index < 0 || index >= value.length) {
        return false;
    }
    const code = value.codePointAt(index);
    switch (code) {
        case 95 /* CharCode.Underline */:
        case 45 /* CharCode.Dash */:
        case 46 /* CharCode.Period */:
        case 32 /* CharCode.Space */:
        case 47 /* CharCode.Slash */:
        case 92 /* CharCode.Backslash */:
        case 39 /* CharCode.SingleQuote */:
        case 34 /* CharCode.DoubleQuote */:
        case 58 /* CharCode.Colon */:
        case 36 /* CharCode.DollarSign */:
        case 60 /* CharCode.LessThan */:
        case 62 /* CharCode.GreaterThan */:
        case 40 /* CharCode.OpenParen */:
        case 41 /* CharCode.CloseParen */:
        case 91 /* CharCode.OpenSquareBracket */:
        case 93 /* CharCode.CloseSquareBracket */:
        case 123 /* CharCode.OpenCurlyBrace */:
        case 125 /* CharCode.CloseCurlyBrace */:
            return true;
        case undefined:
            return false;
        default:
            if (strings.isEmojiImprecise(code)) {
                return true;
            }
            return false;
    }
}
function isWhitespaceAtPos(value, index) {
    if (index < 0 || index >= value.length) {
        return false;
    }
    const code = value.charCodeAt(index);
    switch (code) {
        case 32 /* CharCode.Space */:
        case 9 /* CharCode.Tab */:
            return true;
        default:
            return false;
    }
}
function isUpperCaseAtPos(pos, word, wordLow) {
    return word[pos] !== wordLow[pos];
}
export function isPatternInWord(patternLow, patternPos, patternLen, wordLow, wordPos, wordLen, fillMinWordPosArr = false) {
    while (patternPos < patternLen && wordPos < wordLen) {
        if (patternLow[patternPos] === wordLow[wordPos]) {
            if (fillMinWordPosArr) {
                // Remember the min word position for each pattern position
                _minWordMatchPos[patternPos] = wordPos;
            }
            patternPos += 1;
        }
        wordPos += 1;
    }
    return patternPos === patternLen; // pattern must be exhausted
}
var Arrow;
(function (Arrow) {
    Arrow[Arrow["Diag"] = 1] = "Diag";
    Arrow[Arrow["Left"] = 2] = "Left";
    Arrow[Arrow["LeftLeft"] = 3] = "LeftLeft";
})(Arrow || (Arrow = {}));
export var FuzzyScore;
(function (FuzzyScore) {
    /**
     * No matches and value `-100`
     */
    FuzzyScore.Default = ([-100, 0]);
    function isDefault(score) {
        return !score || (score.length === 2 && score[0] === -100 && score[1] === 0);
    }
    FuzzyScore.isDefault = isDefault;
})(FuzzyScore || (FuzzyScore = {}));
export class FuzzyScoreOptions {
    static { this.default = { boostFullMatch: true, firstMatchCanBeWeak: false }; }
    constructor(firstMatchCanBeWeak, boostFullMatch) {
        this.firstMatchCanBeWeak = firstMatchCanBeWeak;
        this.boostFullMatch = boostFullMatch;
    }
}
export function fuzzyScore(pattern, patternLow, patternStart, word, wordLow, wordStart, options = FuzzyScoreOptions.default) {
    const patternLen = pattern.length > _maxLen ? _maxLen : pattern.length;
    const wordLen = word.length > _maxLen ? _maxLen : word.length;
    if (patternStart >= patternLen || wordStart >= wordLen || (patternLen - patternStart) > (wordLen - wordStart)) {
        return undefined;
    }
    // Run a simple check if the characters of pattern occur
    // (in order) at all in word. If that isn't the case we
    // stop because no match will be possible
    if (!isPatternInWord(patternLow, patternStart, patternLen, wordLow, wordStart, wordLen, true)) {
        return undefined;
    }
    // Find the max matching word position for each pattern position
    // NOTE: the min matching word position was filled in above, in the `isPatternInWord` call
    _fillInMaxWordMatchPos(patternLen, wordLen, patternStart, wordStart, patternLow, wordLow);
    let row = 1;
    let column = 1;
    let patternPos = patternStart;
    let wordPos = wordStart;
    const hasStrongFirstMatch = [false];
    // There will be a match, fill in tables
    for (row = 1, patternPos = patternStart; patternPos < patternLen; row++, patternPos++) {
        // Reduce search space to possible matching word positions and to possible access from next row
        const minWordMatchPos = _minWordMatchPos[patternPos];
        const maxWordMatchPos = _maxWordMatchPos[patternPos];
        const nextMaxWordMatchPos = (patternPos + 1 < patternLen ? _maxWordMatchPos[patternPos + 1] : wordLen);
        for (column = minWordMatchPos - wordStart + 1, wordPos = minWordMatchPos; wordPos < nextMaxWordMatchPos; column++, wordPos++) {
            let score = Number.MIN_SAFE_INTEGER;
            let canComeDiag = false;
            if (wordPos <= maxWordMatchPos) {
                score = _doScore(pattern, patternLow, patternPos, patternStart, word, wordLow, wordPos, wordLen, wordStart, _diag[row - 1][column - 1] === 0, hasStrongFirstMatch);
            }
            let diagScore = 0;
            if (score !== Number.MIN_SAFE_INTEGER) {
                canComeDiag = true;
                diagScore = score + _table[row - 1][column - 1];
            }
            const canComeLeft = wordPos > minWordMatchPos;
            const leftScore = canComeLeft ? _table[row][column - 1] + (_diag[row][column - 1] > 0 ? -5 : 0) : 0; // penalty for a gap start
            const canComeLeftLeft = wordPos > minWordMatchPos + 1 && _diag[row][column - 1] > 0;
            const leftLeftScore = canComeLeftLeft ? _table[row][column - 2] + (_diag[row][column - 2] > 0 ? -5 : 0) : 0; // penalty for a gap start
            if (canComeLeftLeft && (!canComeLeft || leftLeftScore >= leftScore) && (!canComeDiag || leftLeftScore >= diagScore)) {
                // always prefer choosing left left to jump over a diagonal because that means a match is earlier in the word
                _table[row][column] = leftLeftScore;
                _arrows[row][column] = 3 /* Arrow.LeftLeft */;
                _diag[row][column] = 0;
            }
            else if (canComeLeft && (!canComeDiag || leftScore >= diagScore)) {
                // always prefer choosing left since that means a match is earlier in the word
                _table[row][column] = leftScore;
                _arrows[row][column] = 2 /* Arrow.Left */;
                _diag[row][column] = 0;
            }
            else if (canComeDiag) {
                _table[row][column] = diagScore;
                _arrows[row][column] = 1 /* Arrow.Diag */;
                _diag[row][column] = _diag[row - 1][column - 1] + 1;
            }
            else {
                throw new Error(`not possible`);
            }
        }
    }
    if (_debug) {
        printTables(pattern, patternStart, word, wordStart);
    }
    if (!hasStrongFirstMatch[0] && !options.firstMatchCanBeWeak) {
        return undefined;
    }
    row--;
    column--;
    const result = [_table[row][column], wordStart];
    let backwardsDiagLength = 0;
    let maxMatchColumn = 0;
    while (row >= 1) {
        // Find the column where we go diagonally up
        let diagColumn = column;
        do {
            const arrow = _arrows[row][diagColumn];
            if (arrow === 3 /* Arrow.LeftLeft */) {
                diagColumn = diagColumn - 2;
            }
            else if (arrow === 2 /* Arrow.Left */) {
                diagColumn = diagColumn - 1;
            }
            else {
                // found the diagonal
                break;
            }
        } while (diagColumn >= 1);
        // Overturn the "forwards" decision if keeping the "backwards" diagonal would give a better match
        if (backwardsDiagLength > 1 // only if we would have a contiguous match of 3 characters
            && patternLow[patternStart + row - 1] === wordLow[wordStart + column - 1] // only if we can do a contiguous match diagonally
            && !isUpperCaseAtPos(diagColumn + wordStart - 1, word, wordLow) // only if the forwards chose diagonal is not an uppercase
            && backwardsDiagLength + 1 > _diag[row][diagColumn] // only if our contiguous match would be longer than the "forwards" contiguous match
        ) {
            diagColumn = column;
        }
        if (diagColumn === column) {
            // this is a contiguous match
            backwardsDiagLength++;
        }
        else {
            backwardsDiagLength = 1;
        }
        if (!maxMatchColumn) {
            // remember the last matched column
            maxMatchColumn = diagColumn;
        }
        row--;
        column = diagColumn - 1;
        result.push(column);
    }
    if (wordLen - wordStart === patternLen && options.boostFullMatch) {
        // the word matches the pattern with all characters!
        // giving the score a total match boost (to come up ahead other words)
        result[0] += 2;
    }
    // Add 1 penalty for each skipped character in the word
    const skippedCharsCount = maxMatchColumn - patternLen;
    result[0] -= skippedCharsCount;
    return result;
}
function _fillInMaxWordMatchPos(patternLen, wordLen, patternStart, wordStart, patternLow, wordLow) {
    let patternPos = patternLen - 1;
    let wordPos = wordLen - 1;
    while (patternPos >= patternStart && wordPos >= wordStart) {
        if (patternLow[patternPos] === wordLow[wordPos]) {
            _maxWordMatchPos[patternPos] = wordPos;
            patternPos--;
        }
        wordPos--;
    }
}
function _doScore(pattern, patternLow, patternPos, patternStart, word, wordLow, wordPos, wordLen, wordStart, newMatchStart, outFirstMatchStrong) {
    if (patternLow[patternPos] !== wordLow[wordPos]) {
        return Number.MIN_SAFE_INTEGER;
    }
    let score = 1;
    let isGapLocation = false;
    if (wordPos === (patternPos - patternStart)) {
        // common prefix: `foobar <-> foobaz`
        //                            ^^^^^
        score = pattern[patternPos] === word[wordPos] ? 7 : 5;
    }
    else if (isUpperCaseAtPos(wordPos, word, wordLow) && (wordPos === 0 || !isUpperCaseAtPos(wordPos - 1, word, wordLow))) {
        // hitting upper-case: `foo <-> forOthers`
        //                              ^^ ^
        score = pattern[patternPos] === word[wordPos] ? 7 : 5;
        isGapLocation = true;
    }
    else if (isSeparatorAtPos(wordLow, wordPos) && (wordPos === 0 || !isSeparatorAtPos(wordLow, wordPos - 1))) {
        // hitting a separator: `. <-> foo.bar`
        //                                ^
        score = 5;
    }
    else if (isSeparatorAtPos(wordLow, wordPos - 1) || isWhitespaceAtPos(wordLow, wordPos - 1)) {
        // post separator: `foo <-> bar_foo`
        //                              ^^^
        score = 5;
        isGapLocation = true;
    }
    if (score > 1 && patternPos === patternStart) {
        outFirstMatchStrong[0] = true;
    }
    if (!isGapLocation) {
        isGapLocation = isUpperCaseAtPos(wordPos, word, wordLow) || isSeparatorAtPos(wordLow, wordPos - 1) || isWhitespaceAtPos(wordLow, wordPos - 1);
    }
    //
    if (patternPos === patternStart) { // first character in pattern
        if (wordPos > wordStart) {
            // the first pattern character would match a word character that is not at the word start
            // so introduce a penalty to account for the gap preceding this match
            score -= isGapLocation ? 3 : 5;
        }
    }
    else {
        if (newMatchStart) {
            // this would be the beginning of a new match (i.e. there would be a gap before this location)
            score += isGapLocation ? 2 : 0;
        }
        else {
            // this is part of a contiguous match, so give it a slight bonus, but do so only if it would not be a preferred gap location
            score += isGapLocation ? 0 : 1;
        }
    }
    if (wordPos + 1 === wordLen) {
        // we always penalize gaps, but this gives unfair advantages to a match that would match the last character in the word
        // so pretend there is a gap after the last character in the word to normalize things
        score -= isGapLocation ? 3 : 5;
    }
    return score;
}
//#endregion
//#region --- graceful ---
export function fuzzyScoreGracefulAggressive(pattern, lowPattern, patternPos, word, lowWord, wordPos, options) {
    return fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, true, options);
}
export function fuzzyScoreGraceful(pattern, lowPattern, patternPos, word, lowWord, wordPos, options) {
    return fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, false, options);
}
function fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, aggressive, options) {
    let top = fuzzyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos, options);
    if (top && !aggressive) {
        // when using the original pattern yield a result we`
        // return it unless we are aggressive and try to find
        // a better alignment, e.g. `cno` -> `^co^ns^ole` or `^c^o^nsole`.
        return top;
    }
    if (pattern.length >= 3) {
        // When the pattern is long enough then try a few (max 7)
        // permutations of the pattern to find a better match. The
        // permutations only swap neighbouring characters, e.g
        // `cnoso` becomes `conso`, `cnsoo`, `cnoos`.
        const tries = Math.min(7, pattern.length - 1);
        for (let movingPatternPos = patternPos + 1; movingPatternPos < tries; movingPatternPos++) {
            const newPattern = nextTypoPermutation(pattern, movingPatternPos);
            if (newPattern) {
                const candidate = fuzzyScore(newPattern, newPattern.toLowerCase(), patternPos, word, lowWord, wordPos, options);
                if (candidate) {
                    candidate[0] -= 3; // permutation penalty
                    if (!top || candidate[0] > top[0]) {
                        top = candidate;
                    }
                }
            }
        }
    }
    return top;
}
function nextTypoPermutation(pattern, patternPos) {
    if (patternPos + 1 >= pattern.length) {
        return undefined;
    }
    const swap1 = pattern[patternPos];
    const swap2 = pattern[patternPos + 1];
    if (swap1 === swap2) {
        return undefined;
    }
    return pattern.slice(0, patternPos)
        + swap2
        + swap1
        + pattern.slice(patternPos + 2);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9maWx0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDcEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDaEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxjQUFjLENBQUM7QUFZeEMsbUJBQW1CO0FBRW5COzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLEVBQUUsQ0FBQyxHQUFHLE1BQWlCO0lBQ3RDLE9BQU8sVUFBVSxJQUFZLEVBQUUsa0JBQTBCO1FBQ3hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDbEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUztBQUVULE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFZLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ2xGLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBWSxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUUzRSxTQUFTLGNBQWMsQ0FBQyxVQUFtQixFQUFFLElBQVks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