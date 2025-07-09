/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import * as stringBuilder from '../../core/stringBuilder.js';
import { Range } from '../../core/range.js';
/**
 * Represents a grouping of colliding bracket pairs.
 *
 * Most of the times this contains a single bracket pair,
 * but sometimes this contains multiple bracket pairs in cases
 * where the same string appears as a closing bracket for multiple
 * bracket pairs, or the same string appears an opening bracket for
 * multiple bracket pairs.
 *
 * e.g. of a group containing a single pair:
 *   open: ['{'], close: ['}']
 *
 * e.g. of a group containing multiple pairs:
 *   open: ['if', 'for'], close: ['end', 'end']
 */
export class RichEditBracket {
    constructor(languageId, index, open, close, forwardRegex, reversedRegex) {
        this._richEditBracketBrand = undefined;
        this.languageId = languageId;
        this.index = index;
        this.open = open;
        this.close = close;
        this.forwardRegex = forwardRegex;
        this.reversedRegex = reversedRegex;
        this._openSet = RichEditBracket._toSet(this.open);
        this._closeSet = RichEditBracket._toSet(this.close);
    }
    /**
     * Check if the provided `text` is an open bracket in this group.
     */
    isOpen(text) {
        return this._openSet.has(text);
    }
    /**
     * Check if the provided `text` is a close bracket in this group.
     */
    isClose(text) {
        return this._closeSet.has(text);
    }
    static _toSet(arr) {
        const result = new Set();
        for (const element of arr) {
            result.add(element);
        }
        return result;
    }
}
/**
 * Groups together brackets that have equal open or close sequences.
 *
 * For example, if the following brackets are defined:
 *   ['IF','END']
 *   ['for','end']
 *   ['{','}']
 *
 * Then the grouped brackets would be:
 *   { open: ['if', 'for'], close: ['end', 'end'] }
 *   { open: ['{'], close: ['}'] }
 *
 */
function groupFuzzyBrackets(brackets) {
    const N = brackets.length;
    brackets = brackets.map(b => [b[0].toLowerCase(), b[1].toLowerCase()]);
    const group = [];
    for (let i = 0; i < N; i++) {
        group[i] = i;
    }
    const areOverlapping = (a, b) => {
        const [aOpen, aClose] = a;
        const [bOpen, bClose] = b;
        return (aOpen === bOpen || aOpen === bClose || aClose === bOpen || aClose === bClose);
    };
    const mergeGroups = (g1, g2) => {
        const newG = Math.min(g1, g2);
        const oldG = Math.max(g1, g2);
        for (let i = 0; i < N; i++) {
            if (group[i] === oldG) {
                group[i] = newG;
            }
        }
    };
    // group together brackets that have the same open or the same close sequence
    for (let i = 0; i < N; i++) {
        const a = brackets[i];
        for (let j = i + 1; j < N; j++) {
            const b = brackets[j];
            if (areOverlapping(a, b)) {
                mergeGroups(group[i], group[j]);
            }
        }
    }
    const result = [];
    for (let g = 0; g < N; g++) {
        const currentOpen = [];
        const currentClose = [];
        for (let i = 0; i < N; i++) {
            if (group[i] === g) {
                const [open, close] = brackets[i];
                currentOpen.push(open);
                currentClose.push(close);
            }
        }
        if (currentOpen.length > 0) {
            result.push({
                open: currentOpen,
                close: currentClose
            });
        }
    }
    return result;
}
export class RichEditBrackets {
    constructor(languageId, _brackets) {
        this._richEditBracketsBrand = undefined;
        const brackets = groupFuzzyBrackets(_brackets);
        this.brackets = brackets.map((b, index) => {
            return new RichEditBracket(languageId, index, b.open, b.close, getRegexForBracketPair(b.open, b.close, brackets, index), getReversedRegexForBracketPair(b.open, b.close, brackets, index));
        });
        this.forwardRegex = getRegexForBrackets(this.brackets);
        this.reversedRegex = getReversedRegexForBrackets(this.brackets);
        this.textIsBracket = {};
        this.textIsOpenBracket = {};
        this.maxBracketLength = 0;
        for (const bracket of this.brackets) {
            for (const open of bracket.open) {
                this.textIsBracket[open] = bracket;
                this.textIsOpenBracket[open] = true;
                this.maxBracketLength = Math.max(this.maxBracketLength, open.length);
            }
            for (const close of bracket.close) {
                this.textIsBracket[close] = bracket;
                this.textIsOpenBracket[close] = false;
                this.maxBracketLength = Math.max(this.maxBracketLength, close.length);
            }
        }
    }
}
function collectSuperstrings(str, brackets, currentIndex, dest) {
    for (let i = 0, len = brackets.length; i < len; i++) {
        if (i === currentIndex) {
            continue;
        }
        const bracket = brackets[i];
        for (const open of bracket.open) {
            if (open.indexOf(str) >= 0) {
                dest.push(open);
            }
        }
        for (const close of bracket.close) {
            if (close.indexOf(str) >= 0) {
                dest.push(close);
            }
        }
    }
}
function lengthcmp(a, b) {
    return a.length - b.length;
}
function unique(arr) {
    if (arr.length <= 1) {
        return arr;
    }
    const result = [];
    const seen = new Set();
    for (const element of arr) {
        if (seen.has(element)) {
            continue;
        }
        result.push(element);
        seen.add(element);
    }
    return result;
}
/**
 * Create a regular expression that can be used to search forward in a piece of text
 * for a group of bracket pairs. But this regex must be built in a way in which
 * it is aware of the other bracket pairs defined for the language.
 *
 * For example, if a language contains the following bracket pairs:
 *   ['begin', 'end']
 *   ['if', 'end if']
 * The two bracket pairs do not collide because no open or close brackets are equal.
 * So the function getRegexForBracketPair is called twice, once with
 * the ['begin'], ['end'] group consisting of one bracket pair, and once with
 * the ['if'], ['end if'] group consiting of the other bracket pair.
 *
 * But there could be a situation where an occurrence of 'end if' is mistaken
 * for an occurrence of 'end'.
 *
 * Therefore, for the bracket pair ['begin', 'end'], the regex will also
 * target 'end if'. The regex will be something like:
 *   /(\bend if\b)|(\bend\b)|(\bif\b)/
 *
 * The regex also searches for "superstrings" (other brackets that might be mistaken with the current bracket).
 *
 */
function getRegexForBracketPair(open, close, brackets, currentIndex) {
    // search in all brackets for other brackets that are a superstring of these brackets
    let pieces = [];
    pieces = pieces.concat(open);
    pieces = pieces.concat(close);
    for (let i = 0, len = pieces.length; i < len; i++) {
        collectSuperstrings(pieces[i], brackets, currentIndex, pieces);
    }
    pieces = unique(pieces);
    pieces.sort(lengthcmp);
    pieces.reverse();
    return createBracketOrRegExp(pieces);
}
/**
 * Matching a regular expression in JS can only be done "forwards". So JS offers natively only
 * methods to find the first match of a regex in a string. But sometimes, it is useful to
 * find the last match of a regex in a string. For such a situation, a nice solution is to
 * simply reverse the string and then search for a reversed regex.
 *
 * This function also has the fine details of `getRegexForBracketPair`. For the same example
 * given above, the regex produced here would look like:
 *   /(\bfi dne\b)|(\bdne\b)|(\bfi\b)/
 */
function getReversedRegexForBracketPair(open, close, brackets, currentIndex) {
    // search in all brackets for other brackets that are a superstring of these brackets
    let pieces = [];
    pieces = pieces.concat(open);
    pieces = pieces.concat(close);
    for (let i = 0, len = pieces.length; i < len; i++) {
        collectSuperstrings(pieces[i], brackets, currentIndex, pieces);
    }
    pieces = unique(pieces);
    pieces.sort(lengthcmp);
    pieces.reverse();
    return createBracketOrRegExp(pieces.map(toReversedString));
}
/**
 * Creates a regular expression that targets all bracket pairs.
 *
 * e.g. for the bracket pairs:
 *  ['{','}']
 *  ['begin,'end']
 *  ['for','end']
 * the regex would look like:
 *  /(\{)|(\})|(\bbegin\b)|(\bend\b)|(\bfor\b)/
 */
function getRegexForBrackets(brackets) {
    let pieces = [];
    for (const bracket of brackets) {
        for (const open of bracket.open) {
            pieces.push(open);
        }
        for (const close of bracket.close) {
            pieces.push(close);
        }
    }
    pieces = unique(pieces);
    return createBracketOrRegExp(pieces);
}
/**
 * Matching a regular expression in JS can only be done "forwards". So JS offers natively only
 * methods to find the first match of a regex in a string. But sometimes, it is useful to
 * find the last match of a regex in a string. For such a situation, a nice solution is to
 * simply reverse the string and then search for a reversed regex.
 *
 * e.g. for the bracket pairs:
 *  ['{','}']
 *  ['begin,'end']
 *  ['for','end']
 * the regex would look like:
 *  /(\{)|(\})|(\bnigeb\b)|(\bdne\b)|(\brof\b)/
 */
function getReversedRegexForBrackets(brackets) {
    let pieces = [];
    for (const bracket of brackets) {
        for (const open of bracket.open) {
            pieces.push(open);
        }
        for (const close of bracket.close) {
            pieces.push(close);
        }
    }
    pieces = unique(pieces);
    return createBracketOrRegExp(pieces.map(toReversedString));
}
function prepareBracketForRegExp(str) {
    // This bracket pair uses letters like e.g. "begin" - "end"
    const insertWordBoundaries = (/^[\w ]+$/.test(str));
    str = strings.escapeRegExpCharacters(str);
    return (insertWordBoundaries ? `\\b${str}\\b` : str);
}
export function createBracketOrRegExp(pieces, options) {
    const regexStr = `(${pieces.map(prepareBracketForRegExp).join(')|(')})`;
    return strings.createRegExp(regexStr, true, options);
}
const toReversedString = (function () {
    function reverse(str) {
        // create a Uint16Array and then use a TextDecoder to create a string
        const arr = new Uint16Array(str.length);
        let offset = 0;
        for (let i = str.length - 1; i >= 0; i--) {
            arr[offset++] = str.charCodeAt(i);
        }
        return stringBuilder.getPlatformTextDecoder().decode(arr);
    }
    let lastInput = null;
    let lastOutput = null;
    return function toReversedString(str) {
        if (lastInput !== str) {
            lastInput = str;
            lastOutput = reverse(lastInput);
        }
        return lastOutput;
    };
})();
export class BracketsUtils {
    static _findPrevBracketInText(reversedBracketRegex, lineNumber, reversedText, offset) {
        const m = reversedText.match(reversedBracketRegex);
        if (!m) {
            return null;
        }
        const matchOffset = reversedText.length - (m.index || 0);
        const matchLength = m[0].length;
        const absoluteMatchOffset = offset + matchOffset;
        return new Range(lineNumber, absoluteMatchOffset - matchLength + 1, lineNumber, absoluteMatchOffset + 1);
    }
    static findPrevBracketInRange(reversedBracketRegex, lineNumber, lineText, startOffset, endOffset) {
        // Because JS does not support backwards regex search, we search forwards in a reversed string with a reversed regex ;)
        const reversedLineText = toReversedString(lineText);
        const reversedSubstr = reversedLineText.substring(lineText.length - endOffset, lineText.length - startOffset);
        return this._findPrevBracketInText(reversedBracketRegex, lineNumber, reversedSubstr, startOffset);
    }
    static findNextBracketInText(bracketRegex, lineNumber, text, offset) {
        const m = text.match(bracketRegex);
        if (!m) {
            return null;
        }
        const matchOffset = m.index || 0;
        const matchLength = m[0].length;
        if (matchLength === 0) {
            return null;
        }
        const absoluteMatchOffset = offset + matchOffset;
        return new Range(lineNumber, absoluteMatchOffset + 1, lineNumber, absoluteMatchOffset + 1 + matchLength);
    }
    static findNextBracketInRange(bracketRegex, lineNumber, lineText, startOffset, endOffset) {
        const substr = lineText.substring(startOffset, endOffset);
        return this.findNextBracketInText(bracketRegex, lineNumber, substr, startOffset);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmljaEVkaXRCcmFja2V0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9zdXBwb3J0cy9yaWNoRWRpdEJyYWNrZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxLQUFLLGFBQWEsTUFBTSw2QkFBNkIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFRNUM7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFNLE9BQU8sZUFBZTtJQWlEM0IsWUFBWSxVQUFrQixFQUFFLEtBQWEsRUFBRSxJQUFjLEVBQUUsS0FBZSxFQUFFLFlBQW9CLEVBQUUsYUFBcUI7UUFoRDNILDBCQUFxQixHQUFTLFNBQVMsQ0FBQztRQWlEdkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLFFBQVEsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxJQUFZO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksT0FBTyxDQUFDLElBQVk7UUFDMUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFhO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDakMsS0FBSyxNQUFNLE9BQU8sSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUMzQixNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7Q0FDRDtBQUVEOzs7Ozs7Ozs7Ozs7R0FZRztBQUNILFNBQVMsa0JBQWtCLENBQUMsUUFBa0M7SUFDN0QsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUUxQixRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFdkUsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFDO0lBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM1QixLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2QsQ0FBQztJQUVELE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBZ0IsRUFBRSxDQUFnQixFQUFFLEVBQUU7UUFDN0QsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLEtBQUssS0FBSyxLQUFLLElBQUksS0FBSyxLQUFLLE1BQU0sSUFBSSxNQUFNLEtBQUssS0FBSyxJQUFJLE1BQU0sS0FBSyxNQUFNLENBQUMsQ0FBQztJQUN2RixDQUFDLENBQUM7SUFFRixNQUFNLFdBQVcsR0FBRyxDQUFDLEVBQVUsRUFBRSxFQUFVLEVBQUUsRUFBRTtRQUM5QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM5QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUIsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3ZCLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDakIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUM7SUFFRiw2RUFBNkU7SUFDN0UsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixJQUFJLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBc0IsRUFBRSxDQUFDO0lBQ3JDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM1QixNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7UUFDakMsTUFBTSxZQUFZLEdBQWEsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM1QixJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZCLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDWCxJQUFJLEVBQUUsV0FBVztnQkFDakIsS0FBSyxFQUFFLFlBQVk7YUFDbkIsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLE9BQU8sZ0JBQWdCO0lBZ0M1QixZQUFZLFVBQWtCLEVBQUUsU0FBbUM7UUEvQm5FLDJCQUFzQixHQUFTLFNBQVMsQ0FBQztRQWdDeEMsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFL0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3pDLE9BQU8sSUFBSSxlQUFlLENBQ3pCLFVBQVUsRUFDVixLQUFLLEVBQ0wsQ0FBQyxDQUFDLElBQUksRUFDTixDQUFDLENBQUMsS0FBSyxFQUNQLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLEVBQ3hELDhCQUE4QixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQ2hFLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxZQUFZLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxhQUFhLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRWhFLElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUM7UUFFNUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsQ0FBQztRQUMxQixLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEUsQ0FBQztZQUNELEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQztnQkFDcEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztnQkFDdEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2RSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELFNBQVMsbUJBQW1CLENBQUMsR0FBVyxFQUFFLFFBQTJCLEVBQUUsWUFBb0IsRUFBRSxJQUFjO0lBQzFHLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNyRCxJQUFJLENBQUMsS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUN4QixTQUFTO1FBQ1YsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QixLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakIsQ0FBQztRQUNGLENBQUM7UUFDRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLENBQVMsRUFBRSxDQUFTO0lBQ3RDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQzVCLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxHQUFhO0lBQzVCLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNyQixPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFDRCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7SUFDNUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUMvQixLQUFLLE1BQU0sT0FBTyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzNCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLFNBQVM7UUFDVixDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXNCRztBQUNILFNBQVMsc0JBQXNCLENBQUMsSUFBYyxFQUFFLEtBQWUsRUFBRSxRQUEyQixFQUFFLFlBQW9CO0lBQ2pILHFGQUFxRjtJQUNyRixJQUFJLE1BQU0sR0FBYSxFQUFFLENBQUM7SUFDMUIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0IsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25ELG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFDRCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLE9BQU8scUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILFNBQVMsOEJBQThCLENBQUMsSUFBYyxFQUFFLEtBQWUsRUFBRSxRQUEyQixFQUFFLFlBQW9CO0lBQ3pILHFGQUFxRjtJQUNyRixJQUFJLE1BQU0sR0FBYSxFQUFFLENBQUM7SUFDMUIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0IsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25ELG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFDRCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLE9BQU8scUJBQXFCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7QUFDNUQsQ0FBQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILFNBQVMsbUJBQW1CLENBQUMsUUFBMkI7SUFDdkQsSUFBSSxNQUFNLEdBQWEsRUFBRSxDQUFDO0lBQzFCLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7UUFDaEMsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQixDQUFDO1FBQ0QsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUNELE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEIsT0FBTyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsU0FBUywyQkFBMkIsQ0FBQyxRQUEyQjtJQUMvRCxJQUFJLE1BQU0sR0FBYSxFQUFFLENBQUM7SUFDMUIsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNoQyxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25CLENBQUM7UUFDRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBQ0QsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QixPQUFPLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUM7QUFFRCxTQUFTLHVCQUF1QixDQUFDLEdBQVc7SUFDM0MsMkRBQTJEO0lBQzNELE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDcEQsR0FBRyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMxQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsTUFBZ0IsRUFBRSxPQUErQjtJQUN0RixNQUFNLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUN4RSxPQUFPLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN0RCxDQUFDO0FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDO0lBRXpCLFNBQVMsT0FBTyxDQUFDLEdBQVc7UUFDM0IscUVBQXFFO1FBQ3JFLE1BQU0sR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4QyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMxQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFDRCxPQUFPLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsSUFBSSxTQUFTLEdBQWtCLElBQUksQ0FBQztJQUNwQyxJQUFJLFVBQVUsR0FBa0IsSUFBSSxDQUFDO0lBQ3JDLE9BQU8sU0FBUyxnQkFBZ0IsQ0FBQyxHQUFXO1FBQzNDLElBQUksU0FBUyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLFNBQVMsR0FBRyxHQUFHLENBQUM7WUFDaEIsVUFBVSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsT0FBTyxVQUFXLENBQUM7SUFDcEIsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVMLE1BQU0sT0FBTyxhQUFhO0lBRWpCLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBNEIsRUFBRSxVQUFrQixFQUFFLFlBQW9CLEVBQUUsTUFBYztRQUMzSCxNQUFNLENBQUMsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFbkQsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ1IsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNoQyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sR0FBRyxXQUFXLENBQUM7UUFFakQsT0FBTyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLEdBQUcsV0FBVyxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDMUcsQ0FBQztJQUVNLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBNEIsRUFBRSxVQUFrQixFQUFFLFFBQWdCLEVBQUUsV0FBbUIsRUFBRSxTQUFpQjtRQUM5SSx1SEFBdUg7UUFDdkgsTUFBTSxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRCxNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxTQUFTLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQztRQUM5RyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ25HLENBQUM7SUFFTSxNQUFNLENBQUMscUJBQXFCLENBQUMsWUFBb0IsRUFBRSxVQUFrQixFQUFFLElBQVksRUFBRSxNQUFjO1FBQ3pHLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFbkMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ1IsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDakMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNoQyxJQUFJLFdBQVcsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxNQUFNLG1CQUFtQixHQUFHLE1BQU0sR0FBRyxXQUFXLENBQUM7UUFFakQsT0FBTyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFDMUcsQ0FBQztJQUVNLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxZQUFvQixFQUFFLFVBQWtCLEVBQUUsUUFBZ0IsRUFBRSxXQUFtQixFQUFFLFNBQWlCO1FBQ3RJLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzFELE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2xGLENBQUM7Q0FDRCJ9