/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../base/common/iterator.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
export const USUAL_WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';
/**
 * Create a word definition regular expression based on default word separators.
 * Optionally provide allowed separators that should be included in words.
 *
 * The default would look like this:
 * /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
 */
function createWordRegExp(allowInWords = '') {
    let source = '(-?\\d*\\.\\d\\w*)|([^';
    for (const sep of USUAL_WORD_SEPARATORS) {
        if (allowInWords.indexOf(sep) >= 0) {
            continue;
        }
        source += '\\' + sep;
    }
    source += '\\s]+)';
    return new RegExp(source, 'g');
}
// catches numbers (including floating numbers) in the first group, and alphanum in the second
export const DEFAULT_WORD_REGEXP = createWordRegExp();
export function ensureValidWordDefinition(wordDefinition) {
    let result = DEFAULT_WORD_REGEXP;
    if (wordDefinition && (wordDefinition instanceof RegExp)) {
        if (!wordDefinition.global) {
            let flags = 'g';
            if (wordDefinition.ignoreCase) {
                flags += 'i';
            }
            if (wordDefinition.multiline) {
                flags += 'm';
            }
            if (wordDefinition.unicode) {
                flags += 'u';
            }
            result = new RegExp(wordDefinition.source, flags);
        }
        else {
            result = wordDefinition;
        }
    }
    result.lastIndex = 0;
    return result;
}
const _defaultConfig = new LinkedList();
_defaultConfig.unshift({
    maxLen: 1000,
    windowSize: 15,
    timeBudget: 150
});
export function setDefaultGetWordAtTextConfig(value) {
    const rm = _defaultConfig.unshift(value);
    return toDisposable(rm);
}
export function getWordAtText(column, wordDefinition, text, textOffset, config) {
    // Ensure the regex has the 'g' flag, otherwise this will loop forever
    wordDefinition = ensureValidWordDefinition(wordDefinition);
    if (!config) {
        config = Iterable.first(_defaultConfig);
    }
    if (text.length > config.maxLen) {
        // don't throw strings that long at the regexp
        // but use a sub-string in which a word must occur
        let start = column - config.maxLen / 2;
        if (start < 0) {
            start = 0;
        }
        else {
            textOffset += start;
        }
        text = text.substring(start, column + config.maxLen / 2);
        return getWordAtText(column, wordDefinition, text, textOffset, config);
    }
    const t1 = Date.now();
    const pos = column - 1 - textOffset;
    let prevRegexIndex = -1;
    let match = null;
    for (let i = 1;; i++) {
        // check time budget
        if (Date.now() - t1 >= config.timeBudget) {
            break;
        }
        // reset the index at which the regexp should start matching, also know where it
        // should stop so that subsequent search don't repeat previous searches
        const regexIndex = pos - config.windowSize * i;
        wordDefinition.lastIndex = Math.max(0, regexIndex);
        const thisMatch = _findRegexMatchEnclosingPosition(wordDefinition, text, pos, prevRegexIndex);
        if (!thisMatch && match) {
            // stop: we have something
            break;
        }
        match = thisMatch;
        // stop: searched at start
        if (regexIndex <= 0) {
            break;
        }
        prevRegexIndex = regexIndex;
    }
    if (match) {
        const result = {
            word: match[0],
            startColumn: textOffset + 1 + match.index,
            endColumn: textOffset + 1 + match.index + match[0].length
        };
        wordDefinition.lastIndex = 0;
        return result;
    }
    return null;
}
function _findRegexMatchEnclosingPosition(wordDefinition, text, pos, stopPos) {
    let match;
    while (match = wordDefinition.exec(text)) {
        const matchIndex = match.index || 0;
        if (matchIndex <= pos && wordDefinition.lastIndex >= pos) {
            return match;
        }
        else if (stopPos > 0 && matchIndex > stopPos) {
            return null;
        }
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZEhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvd29yZEhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVoRSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxtQ0FBbUMsQ0FBQztBQW9CekU7Ozs7OztHQU1HO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxlQUF1QixFQUFFO0lBQ2xELElBQUksTUFBTSxHQUFHLHdCQUF3QixDQUFDO0lBQ3RDLEtBQUssTUFBTSxHQUFHLElBQUkscUJBQXFCLEVBQUUsQ0FBQztRQUN6QyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDcEMsU0FBUztRQUNWLENBQUM7UUFDRCxNQUFNLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQztJQUN0QixDQUFDO0lBQ0QsTUFBTSxJQUFJLFFBQVEsQ0FBQztJQUNuQixPQUFPLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNoQyxDQUFDO0FBRUQsOEZBQThGO0FBQzlGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGdCQUFnQixFQUFFLENBQUM7QUFFdEQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLGNBQThCO0lBQ3ZFLElBQUksTUFBTSxHQUFXLG1CQUFtQixDQUFDO0lBRXpDLElBQUksY0FBYyxJQUFJLENBQUMsY0FBYyxZQUFZLE1BQU0sQ0FBQyxFQUFFLENB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