/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { buildReplaceStringWithCasePreserved } from '../../../../base/common/search.js';
export class ReplacePattern {
    constructor(replaceString, arg2, arg3) {
        this._hasParameters = false;
        this._replacePattern = replaceString;
        let searchPatternInfo;
        let parseParameters;
        if (typeof arg2 === 'boolean') {
            parseParameters = arg2;
            this._regExp = arg3;
        }
        else {
            searchPatternInfo = arg2;
            parseParameters = !!searchPatternInfo.isRegExp;
            this._regExp = strings.createRegExp(searchPatternInfo.pattern, !!searchPatternInfo.isRegExp, { matchCase: searchPatternInfo.isCaseSensitive, wholeWord: searchPatternInfo.isWordMatch, multiline: searchPatternInfo.isMultiline, global: false, unicode: true });
        }
        if (parseParameters) {
            this.parseReplaceString(replaceString);
        }
        if (this._regExp.global) {
            this._regExp = strings.createRegExp(this._regExp.source, true, { matchCase: !this._regExp.ignoreCase, wholeWord: false, multiline: this._regExp.multiline, global: false });
        }
        this._caseOpsRegExp = new RegExp(/([\s\S]*?)((?:\\[uUlL])+?|)(\$[0-9]+)([\s\S]*?)/g);
    }
    get hasParameters() {
        return this._hasParameters;
    }
    get pattern() {
        return this._replacePattern;
    }
    get regExp() {
        return this._regExp;
    }
    /**
    * Returns the replace string for the first match in the given text.
    * If text has no matches then returns null.
    */
    getReplaceString(text, preserveCase) {
        this._regExp.lastIndex = 0;
        const match = this._regExp.exec(text);
        if (match) {
            if (this.hasParameters) {
                const replaceString = this.replaceWithCaseOperations(text, this._regExp, this.buildReplaceString(match, preserveCase));
                if (match[0] === text) {
                    return replaceString;
                }
                return replaceString.substr(match.index, match[0].length - (text.length - replaceString.length));
            }
            return this.buildReplaceString(match, preserveCase);
        }
        return null;
    }
    /**
     * replaceWithCaseOperations applies case operations to relevant replacement strings and applies
     * the affected $N arguments. It then passes unaffected $N arguments through to string.replace().
     *
     * \u			=> upper-cases one character in a match.
     * \U			=> upper-cases ALL remaining characters in a match.
     * \l			=> lower-cases one character in a match.
     * \L			=> lower-cases ALL remaining characters in a match.
     */
    replaceWithCaseOperations(text, regex, replaceString) {
        // Short-circuit the common path.
        if (!/\\[uUlL]/.test(replaceString)) {
            return text.replace(regex, replaceString);
        }
        // Store the values of the search parameters.
        const firstMatch = regex.exec(text);
        if (firstMatch === null) {
            return text.replace(regex, replaceString);
        }
        let patMatch;
        let newReplaceString = '';
        let lastIndex = 0;
        let lastMatch = '';
        // For each annotated $N, perform text processing on the parameters and perform the substitution.
        while ((patMatch = this._caseOpsRegExp.exec(replaceString)) !== null) {
            lastIndex = patMatch.index;
            const fullMatch = patMatch[0];
            lastMatch = fullMatch;
            let caseOps = patMatch[2]; // \u, \l\u, etc.
            const money = patMatch[3]; // $1, $2, etc.
            if (!caseOps) {
                newReplaceString += fullMatch;
                continue;
            }
            const replacement = firstMatch[parseInt(money.slice(1))];
            if (!replacement) {
                newReplaceString += fullMatch;
                continue;
            }
            const replacementLen = replacement.length;
            newReplaceString += patMatch[1]; // prefix
            caseOps = caseOps.replace(/\\/g, '');
            let i = 0;
            for (; i < caseOps.length; i++) {
                switch (caseOps[i]) {
                    case 'U':
                        newReplaceString += replacement.slice(i).toUpperCase();
                        i = replacementLen;
                        break;
                    case 'u':
                        newReplaceString += replacement[i].toUpperCase();
                        break;
                    case 'L':
                        newReplaceString += replacement.slice(i).toLowerCase();
                        i = replacementLen;
                        break;
                    case 'l':
                        newReplaceString += replacement[i].toLowerCase();
                        break;
                }
            }
            // Append any remaining replacement string content not covered by case operations.
            if (i < replacementLen) {
                newReplaceString += replacement.slice(i);
            }
            newReplaceString += patMatch[4]; // suffix
        }
        // Append any remaining trailing content after the final regex match.
        newReplaceString += replaceString.slice(lastIndex + lastMatch.length);
        return text.replace(regex, newReplaceString);
    }
    buildReplaceString(matches, preserveCase) {
        if (preserveCase) {
            return buildReplaceStringWithCasePreserved(matches, this._replacePattern);
        }
        else {
            return this._replacePattern;
        }
    }
    /**
     * \n => LF
     * \t => TAB
     * \\ => \
     * $0 => $& (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter)
     * everything else stays untouched
     */
    parseReplaceString(replaceString) {
        if (!replaceString || replaceString.length === 0) {
            return;
        }
        let substrFrom = 0, result = '';
        for (let i = 0, len = replaceString.length; i < len; i++) {
            const chCode = replaceString.charCodeAt(i);
            if (chCode === 92 /* CharCode.Backslash */) {
                // move to next char
                i++;
                if (i >= len) {
                    // string ends with a \
                    break;
                }
                const nextChCode = replaceString.charCodeAt(i);
                let replaceWithCharacter = null;
                switch (nextChCode) {
                    case 92 /* CharCode.Backslash */:
                        // \\ => \
                        replaceWithCharacter = '\\';
                        break;
                    case 110 /* CharCode.n */:
                        // \n => LF
                        replaceWithCharacter = '\n';
                        break;
                    case 116 /* CharCode.t */:
                        // \t => TAB
                        replaceWithCharacter = '\t';
                        break;
                }
                if (replaceWithCharacter) {
                    result += replaceString.substring(substrFrom, i - 1) + replaceWithCharacter;
                    substrFrom = i + 1;
                }
            }
            if (chCode === 36 /* CharCode.DollarSign */) {
                // move to next char
                i++;
                if (i >= len) {
                    // string ends with a $
                    break;
                }
                const nextChCode = replaceString.charCodeAt(i);
                let replaceWithCharacter = null;
                switch (nextChCode) {
                    case 48 /* CharCode.Digit0 */:
                        // $0 => $&
                        replaceWithCharacter = '$&';
                        this._hasParameters = true;
                        break;
                    case 96 /* CharCode.BackTick */:
                    case 39 /* CharCode.SingleQuote */:
                        this._hasParameters = true;
                        break;
                    default: {
                        // check if it is a valid string parameter $n (0 <= n <= 99). $0 is already handled by now.
                        if (!this.between(nextChCode, 49 /* CharCode.Digit1 */, 57 /* CharCode.Digit9 */)) {
                            break;
                        }
                        if (i === replaceString.length - 1) {
                            this._hasParameters = true;
                            break;
                        }
                        let charCode = replaceString.charCodeAt(++i);
                        if (!this.between(charCode, 48 /* CharCode.Digit0 */, 57 /* CharCode.Digit9 */)) {
                            this._hasParameters = true;
                            --i;
                            break;
                        }
                        if (i === replaceString.length - 1) {
                            this._hasParameters = true;
                            break;
                        }
                        charCode = replaceString.charCodeAt(++i);
                        if (!this.between(charCode, 48 /* CharCode.Digit0 */, 57 /* CharCode.Digit9 */)) {
                            this._hasParameters = true;
                            --i;
                            break;
                        }
                        break;
                    }
                }
                if (replaceWithCharacter) {
                    result += replaceString.substring(substrFrom, i - 1) + replaceWithCharacter;
                    substrFrom = i + 1;
                }
            }
        }
        if (substrFrom === 0) {
            // no replacement occurred
            return;
        }
        this._replacePattern = result + replaceString.substring(substrFrom);
    }
    between(value, from, to) {
        return from <= value && value <= to;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFHOUQsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEYsTUFBTSxPQUFPLGNBQWM7SUFTMUIsWUFBWSxhQUFxQixFQUFFLElBQVMsRUFBRSxJQUFVO1FBTmhELG1CQUFjLEdBQVksS0FBSyxDQUFDO1FBT3ZDLElBQUksQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFDO1FBQ3JDLElBQUksaUJBQStCLENBQUM7UUFDcEMsSUFBSSxlQUF3QixDQUFDO1FBQzdCLElBQUksT0FBTyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDL0IsZUFBZSxHQUFHLElBQUksQ0FBQztZQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUVyQixDQUFDO2FBQU0sQ0FBQztZQUNQLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUN6QixlQUFlLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQztZQUMvQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLENBQUMsZUFBZSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUs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