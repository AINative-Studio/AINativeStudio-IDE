/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { buildReplaceStringWithCasePreserved } from '../../../../base/common/search.js';
var ReplacePatternKind;
(function (ReplacePatternKind) {
    ReplacePatternKind[ReplacePatternKind["StaticValue"] = 0] = "StaticValue";
    ReplacePatternKind[ReplacePatternKind["DynamicPieces"] = 1] = "DynamicPieces";
})(ReplacePatternKind || (ReplacePatternKind = {}));
/**
 * Assigned when the replace pattern is entirely static.
 */
class StaticValueReplacePattern {
    constructor(staticValue) {
        this.staticValue = staticValue;
        this.kind = 0 /* ReplacePatternKind.StaticValue */;
    }
}
/**
 * Assigned when the replace pattern has replacement patterns.
 */
class DynamicPiecesReplacePattern {
    constructor(pieces) {
        this.pieces = pieces;
        this.kind = 1 /* ReplacePatternKind.DynamicPieces */;
    }
}
export class ReplacePattern {
    static fromStaticValue(value) {
        return new ReplacePattern([ReplacePiece.staticValue(value)]);
    }
    get hasReplacementPatterns() {
        return (this._state.kind === 1 /* ReplacePatternKind.DynamicPieces */);
    }
    constructor(pieces) {
        if (!pieces || pieces.length === 0) {
            this._state = new StaticValueReplacePattern('');
        }
        else if (pieces.length === 1 && pieces[0].staticValue !== null) {
            this._state = new StaticValueReplacePattern(pieces[0].staticValue);
        }
        else {
            this._state = new DynamicPiecesReplacePattern(pieces);
        }
    }
    buildReplaceString(matches, preserveCase) {
        if (this._state.kind === 0 /* ReplacePatternKind.StaticValue */) {
            if (preserveCase) {
                return buildReplaceStringWithCasePreserved(matches, this._state.staticValue);
            }
            else {
                return this._state.staticValue;
            }
        }
        let result = '';
        for (let i = 0, len = this._state.pieces.length; i < len; i++) {
            const piece = this._state.pieces[i];
            if (piece.staticValue !== null) {
                // static value ReplacePiece
                result += piece.staticValue;
                continue;
            }
            // match index ReplacePiece
            let match = ReplacePattern._substitute(piece.matchIndex, matches);
            if (piece.caseOps !== null && piece.caseOps.length > 0) {
                const repl = [];
                const lenOps = piece.caseOps.length;
                let opIdx = 0;
                for (let idx = 0, len = match.length; idx < len; idx++) {
                    if (opIdx >= lenOps) {
                        repl.push(match.slice(idx));
                        break;
                    }
                    switch (piece.caseOps[opIdx]) {
                        case 'U':
                            repl.push(match[idx].toUpperCase());
                            break;
                        case 'u':
                            repl.push(match[idx].toUpperCase());
                            opIdx++;
                            break;
                        case 'L':
                            repl.push(match[idx].toLowerCase());
                            break;
                        case 'l':
                            repl.push(match[idx].toLowerCase());
                            opIdx++;
                            break;
                        default:
                            repl.push(match[idx]);
                    }
                }
                match = repl.join('');
            }
            result += match;
        }
        return result;
    }
    static _substitute(matchIndex, matches) {
        if (matches === null) {
            return '';
        }
        if (matchIndex === 0) {
            return matches[0];
        }
        let remainder = '';
        while (matchIndex > 0) {
            if (matchIndex < matches.length) {
                // A match can be undefined
                const match = (matches[matchIndex] || '');
                return match + remainder;
            }
            remainder = String(matchIndex % 10) + remainder;
            matchIndex = Math.floor(matchIndex / 10);
        }
        return '$' + remainder;
    }
}
/**
 * A replace piece can either be a static string or an index to a specific match.
 */
export class ReplacePiece {
    static staticValue(value) {
        return new ReplacePiece(value, -1, null);
    }
    static matchIndex(index) {
        return new ReplacePiece(null, index, null);
    }
    static caseOps(index, caseOps) {
        return new ReplacePiece(null, index, caseOps);
    }
    constructor(staticValue, matchIndex, caseOps) {
        this.staticValue = staticValue;
        this.matchIndex = matchIndex;
        if (!caseOps || caseOps.length === 0) {
            this.caseOps = null;
        }
        else {
            this.caseOps = caseOps.slice(0);
        }
    }
}
class ReplacePieceBuilder {
    constructor(source) {
        this._source = source;
        this._lastCharIndex = 0;
        this._result = [];
        this._resultLen = 0;
        this._currentStaticPiece = '';
    }
    emitUnchanged(toCharIndex) {
        this._emitStatic(this._source.substring(this._lastCharIndex, toCharIndex));
        this._lastCharIndex = toCharIndex;
    }
    emitStatic(value, toCharIndex) {
        this._emitStatic(value);
        this._lastCharIndex = toCharIndex;
    }
    _emitStatic(value) {
        if (value.length === 0) {
            return;
        }
        this._currentStaticPiece += value;
    }
    emitMatchIndex(index, toCharIndex, caseOps) {
        if (this._currentStaticPiece.length !== 0) {
            this._result[this._resultLen++] = ReplacePiece.staticValue(this._currentStaticPiece);
            this._currentStaticPiece = '';
        }
        this._result[this._resultLen++] = ReplacePiece.caseOps(index, caseOps);
        this._lastCharIndex = toCharIndex;
    }
    finalize() {
        this.emitUnchanged(this._source.length);
        if (this._currentStaticPiece.length !== 0) {
            this._result[this._resultLen++] = ReplacePiece.staticValue(this._currentStaticPiece);
            this._currentStaticPiece = '';
        }
        return new ReplacePattern(this._result);
    }
}
/**
 * \n			=> inserts a LF
 * \t			=> inserts a TAB
 * \\			=> inserts a "\".
 * \u			=> upper-cases one character in a match.
 * \U			=> upper-cases ALL remaining characters in a match.
 * \l			=> lower-cases one character in a match.
 * \L			=> lower-cases ALL remaining characters in a match.
 * $$			=> inserts a "$".
 * $& and $0	=> inserts the matched substring.
 * $n			=> Where n is a non-negative integer lesser than 100, inserts the nth parenthesized submatch string
 * everything else stays untouched
 *
 * Also see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
 */
export function parseReplaceString(replaceString) {
    if (!replaceString || replaceString.length === 0) {
        return new ReplacePattern(null);
    }
    const caseOps = [];
    const result = new ReplacePieceBuilder(replaceString);
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
            // let replaceWithCharacter: string | null = null;
            switch (nextChCode) {
                case 92 /* CharCode.Backslash */:
                    // \\ => inserts a "\"
                    result.emitUnchanged(i - 1);
                    result.emitStatic('\\', i + 1);
                    break;
                case 110 /* CharCode.n */:
                    // \n => inserts a LF
                    result.emitUnchanged(i - 1);
                    result.emitStatic('\n', i + 1);
                    break;
                case 116 /* CharCode.t */:
                    // \t => inserts a TAB
                    result.emitUnchanged(i - 1);
                    result.emitStatic('\t', i + 1);
                    break;
                // Case modification of string replacements, patterned after Boost, but only applied
                // to the replacement text, not subsequent content.
                case 117 /* CharCode.u */:
                // \u => upper-cases one character.
                case 85 /* CharCode.U */:
                // \U => upper-cases ALL following characters.
                case 108 /* CharCode.l */:
                // \l => lower-cases one character.
                case 76 /* CharCode.L */:
                    // \L => lower-cases ALL following characters.
                    result.emitUnchanged(i - 1);
                    result.emitStatic('', i + 1);
                    caseOps.push(String.fromCharCode(nextChCode));
                    break;
            }
            continue;
        }
        if (chCode === 36 /* CharCode.DollarSign */) {
            // move to next char
            i++;
            if (i >= len) {
                // string ends with a $
                break;
            }
            const nextChCode = replaceString.charCodeAt(i);
            if (nextChCode === 36 /* CharCode.DollarSign */) {
                // $$ => inserts a "$"
                result.emitUnchanged(i - 1);
                result.emitStatic('$', i + 1);
                continue;
            }
            if (nextChCode === 48 /* CharCode.Digit0 */ || nextChCode === 38 /* CharCode.Ampersand */) {
                // $& and $0 => inserts the matched substring.
                result.emitUnchanged(i - 1);
                result.emitMatchIndex(0, i + 1, caseOps);
                caseOps.length = 0;
                continue;
            }
            if (49 /* CharCode.Digit1 */ <= nextChCode && nextChCode <= 57 /* CharCode.Digit9 */) {
                // $n
                let matchIndex = nextChCode - 48 /* CharCode.Digit0 */;
                // peek next char to probe for $nn
                if (i + 1 < len) {
                    const nextNextChCode = replaceString.charCodeAt(i + 1);
                    if (48 /* CharCode.Digit0 */ <= nextNextChCode && nextNextChCode <= 57 /* CharCode.Digit9 */) {
                        // $nn
                        // move to next char
                        i++;
                        matchIndex = matchIndex * 10 + (nextNextChCode - 48 /* CharCode.Digit0 */);
                        result.emitUnchanged(i - 2);
                        result.emitMatchIndex(matchIndex, i + 1, caseOps);
                        caseOps.length = 0;
                        continue;
                    }
                }
                result.emitUnchanged(i - 1);
                result.emitMatchIndex(matchIndex, i + 1, caseOps);
                caseOps.length = 0;
                continue;
            }
        }
    }
    return result.finalize();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVBhdHRlcm4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZmluZC9icm93c2VyL3JlcGxhY2VQYXR0ZXJuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhGLElBQVcsa0JBR1Y7QUFIRCxXQUFXLGtCQUFrQjtJQUM1Qix5RUFBZSxDQUFBO0lBQ2YsNkVBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQUhVLGtCQUFrQixLQUFsQixrQkFBa0IsUUFHNUI7QUFFRDs7R0FFRztBQUNILE1BQU0seUJBQXlCO0lBRTlCLFlBQTRCLFdBQW1CO1FBQW5CLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBRC9CLFNBQUksMENBQWtDO0lBQ0gsQ0FBQztDQUNwRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSwyQkFBMkI7SUFFaEMsWUFBNEIsTUFBc0I7UUFBdEIsV0FBTSxHQUFOLE1BQU0sQ0FBZ0I7UUFEbEMsU0FBSSw0Q0FBb0M7SUFDRixDQUFDO0NBQ3ZEO0FBRUQsTUFBTSxPQUFPLGNBQWM7SUFFbkIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFhO1FBQzFDLE9BQU8sSUFBSSxjQUFjLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBSUQsSUFBVyxzQkFBc0I7UUFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSw2Q0FBcUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxZQUFZLE1BQTZCO1FBQ3hDLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxJQUFJ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