/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalState } from '../../../base/common/errors.js';
import { localize } from '../../../nls.js';
export var TokenType;
(function (TokenType) {
    TokenType[TokenType["LParen"] = 0] = "LParen";
    TokenType[TokenType["RParen"] = 1] = "RParen";
    TokenType[TokenType["Neg"] = 2] = "Neg";
    TokenType[TokenType["Eq"] = 3] = "Eq";
    TokenType[TokenType["NotEq"] = 4] = "NotEq";
    TokenType[TokenType["Lt"] = 5] = "Lt";
    TokenType[TokenType["LtEq"] = 6] = "LtEq";
    TokenType[TokenType["Gt"] = 7] = "Gt";
    TokenType[TokenType["GtEq"] = 8] = "GtEq";
    TokenType[TokenType["RegexOp"] = 9] = "RegexOp";
    TokenType[TokenType["RegexStr"] = 10] = "RegexStr";
    TokenType[TokenType["True"] = 11] = "True";
    TokenType[TokenType["False"] = 12] = "False";
    TokenType[TokenType["In"] = 13] = "In";
    TokenType[TokenType["Not"] = 14] = "Not";
    TokenType[TokenType["And"] = 15] = "And";
    TokenType[TokenType["Or"] = 16] = "Or";
    TokenType[TokenType["Str"] = 17] = "Str";
    TokenType[TokenType["QuotedStr"] = 18] = "QuotedStr";
    TokenType[TokenType["Error"] = 19] = "Error";
    TokenType[TokenType["EOF"] = 20] = "EOF";
})(TokenType || (TokenType = {}));
function hintDidYouMean(...meant) {
    switch (meant.length) {
        case 1:
            return localize('contextkey.scanner.hint.didYouMean1', "Did you mean {0}?", meant[0]);
        case 2:
            return localize('contextkey.scanner.hint.didYouMean2', "Did you mean {0} or {1}?", meant[0], meant[1]);
        case 3:
            return localize('contextkey.scanner.hint.didYouMean3', "Did you mean {0}, {1} or {2}?", meant[0], meant[1], meant[2]);
        default: // we just don't expect that many
            return undefined;
    }
}
const hintDidYouForgetToOpenOrCloseQuote = localize('contextkey.scanner.hint.didYouForgetToOpenOrCloseQuote', "Did you forget to open or close the quote?");
const hintDidYouForgetToEscapeSlash = localize('contextkey.scanner.hint.didYouForgetToEscapeSlash', "Did you forget to escape the '/' (slash) character? Put two backslashes before it to escape, e.g., '\\\\/\'.");
/**
 * A simple scanner for context keys.
 *
 * Example:
 *
 * ```ts
 * const scanner = new Scanner().reset('resourceFileName =~ /docker/ && !config.docker.enabled');
 * const tokens = [...scanner];
 * if (scanner.errorTokens.length > 0) {
 *     scanner.errorTokens.forEach(err => console.error(`Unexpected token at ${err.offset}: ${err.lexeme}\nHint: ${err.additional}`));
 * } else {
 *     // process tokens
 * }
 * ```
 */
export class Scanner {
    constructor() {
        this._input = '';
        this._start = 0;
        this._current = 0;
        this._tokens = [];
        this._errors = [];
        // u - unicode, y - sticky // TODO@ulugbekna: we accept double quotes as part of the string rather than as a delimiter (to preserve old parser's behavior)
        this.stringRe = /[a-zA-Z0-9_<>\-\./\\:\*\?\+\[\]\^,#@;"%\$\p{L}-]+/uy;
    }
    static getLexeme(token) {
        switch (token.type) {
            case 0 /* TokenType.LParen */:
                return '(';
            case 1 /* TokenType.RParen */:
                return ')';
            case 2 /* TokenType.Neg */:
                return '!';
            case 3 /* TokenType.Eq */:
                return token.isTripleEq ? '===' : '==';
            case 4 /* TokenType.NotEq */:
                return token.isTripleEq ? '!==' : '!=';
            case 5 /* TokenType.Lt */:
                return '<';
            case 6 /* TokenType.LtEq */:
                return '<=';
            case 7 /* TokenType.Gt */:
                return '>=';
            case 8 /* TokenType.GtEq */:
                return '>=';
            case 9 /* TokenType.RegexOp */:
                return '=~';
            case 10 /* TokenType.RegexStr */:
                return token.lexeme;
            case 11 /* TokenType.True */:
                return 'true';
            case 12 /* TokenType.False */:
                return 'false';
            case 13 /* TokenType.In */:
                return 'in';
            case 14 /* TokenType.Not */:
                return 'not';
            case 15 /* TokenType.And */:
                return '&&';
            case 16 /* TokenType.Or */:
                return '||';
            case 17 /* TokenType.Str */:
                return token.lexeme;
            case 18 /* TokenType.QuotedStr */:
                return token.lexeme;
            case 19 /* TokenType.Error */:
                return token.lexeme;
            case 20 /* TokenType.EOF */:
                return 'EOF';
            default:
                throw illegalState(`unhandled token type: ${JSON.stringify(token)}; have you forgotten to add a case?`);
        }
    }
    static { this._regexFlags = new Set(['i', 'g', 's', 'm', 'y', 'u'].map(ch => ch.charCodeAt(0))); }
    static { this._keywords = new Map([
        ['not', 14 /* TokenType.Not */],
        ['in', 13 /* TokenType.In */],
        ['false', 12 /* TokenType.False */],
        ['true', 11 /* TokenType.True */],
    ]); }
    get errors() {
        return this._errors;
    }
    reset(value) {
        this._input = value;
        this._start = 0;
        this._current = 0;
        this._tokens = [];
        this._errors = [];
        return this;
    }
    scan() {
        while (!this._isAtEnd()) {
            this._start = this._current;
            const ch = this._advance();
            switch (ch) {
                case 40 /* CharCode.OpenParen */:
                    this._addToken(0 /* TokenType.LParen */);
                    break;
                case 41 /* CharCode.CloseParen */:
                    this._addToken(1 /* TokenType.RParen */);
                    break;
                case 33 /* CharCode.ExclamationMark */:
                    if (this._match(61 /* CharCode.Equals */)) {
                        const isTripleEq = this._match(61 /* CharCode.Equals */); // eat last `=` if `!==`
                        this._tokens.push({ type: 4 /* TokenType.NotEq */, offset: this._start, isTripleEq });
                    }
                    else {
                        this._addToken(2 /* TokenType.Neg */);
                    }
                    break;
                case 39 /* CharCode.SingleQuote */:
                    this._quotedString();
                    break;
                case 47 /* CharCode.Slash */:
                    this._regex();
                    break;
                case 61 /* CharCode.Equals */:
                    if (this._match(61 /* CharCode.Equals */)) { // support `==`
                        const isTripleEq = this._match(61 /* CharCode.Equals */); // eat last `=` if `===`
                        this._tokens.push({ type: 3 /* TokenType.Eq */, offset: this._start, isTripleEq });
                    }
                    else if (this._match(126 /* CharCode.Tilde */)) {
                        this._addToken(9 /* TokenType.RegexOp */);
                    }
                    else {
                        this._error(hintDidYouMean('==', '=~'));
                    }
                    break;
                case 60 /* CharCode.LessThan */:
                    this._addToken(this._match(61 /* CharCode.Equals */) ? 6 /* TokenType.LtEq */ : 5 /* TokenType.Lt */);
                    break;
                case 62 /* CharCode.GreaterThan */:
                    this._addToken(this._match(61 /* CharCode.Equals */) ? 8 /* TokenType.GtEq */ : 7 /* TokenType.Gt */);
                    break;
                case 38 /* CharCode.Ampersand */:
                    if (this._match(38 /* CharCode.Ampersand */)) {
                        this._addToken(15 /* TokenType.And */);
                    }
                    else {
                        this._error(hintDidYouMean('&&'));
                    }
                    break;
                case 124 /* CharCode.Pipe */:
                    if (this._match(124 /* CharCode.Pipe */)) {
                        this._addToken(16 /* TokenType.Or */);
                    }
                    else {
                        this._error(hintDidYouMean('||'));
                    }
                    break;
                // TODO@ulugbekna: 1) rewrite using a regex 2) reconsider what characters are considered whitespace, including unicode, nbsp, etc.
                case 32 /* CharCode.Space */:
                case 13 /* CharCode.CarriageReturn */:
                case 9 /* CharCode.Tab */:
                case 10 /* CharCode.LineFeed */:
                case 160 /* CharCode.NoBreakSpace */: // &nbsp
                    break;
                default:
                    this._string();
            }
        }
        this._start = this._current;
        this._addToken(20 /* TokenType.EOF */);
        return Array.from(this._tokens);
    }
    _match(expected) {
        if (this._isAtEnd()) {
            return false;
        }
        if (this._input.charCodeAt(this._current) !== expected) {
            return false;
        }
        this._current++;
        return true;
    }
    _advance() {
        return this._input.charCodeAt(this._current++);
    }
    _peek() {
        return this._isAtEnd() ? 0 /* CharCode.Null */ : this._input.charCodeAt(this._current);
    }
    _addToken(type) {
        this._tokens.push({ type, offset: this._start });
    }
    _error(additional) {
        const offset = this._start;
        const lexeme = this._input.substring(this._start, this._current);
        const errToken = { type: 19 /* TokenType.Error */, offset: this._start, lexeme };
        this._errors.push({ offset, lexeme, additionalInfo: additional });
        this._tokens.push(errToken);
    }
    _string() {
        this.stringRe.lastIndex = this._start;
        const match = this.stringRe.exec(this._input);
        if (match) {
            this._current = this._start + match[0].length;
            const lexeme = this._input.substring(this._start, this._current);
            const keyword = Scanner._keywords.get(lexeme);
            if (keyword) {
                this._addToken(keyword);
            }
            else {
                this._tokens.push({ type: 17 /* TokenType.Str */, lexeme, offset: this._start });
            }
        }
    }
    // captures the lexeme without the leading and trailing '
    _quotedString() {
        while (this._peek() !== 39 /* CharCode.SingleQuote */ && !this._isAtEnd()) { // TODO@ulugbekna: add support for escaping ' ?
            this._advance();
        }
        if (this._isAtEnd()) {
            this._error(hintDidYouForgetToOpenOrCloseQuote);
            return;
        }
        // consume the closing '
        this._advance();
        this._tokens.push({ type: 18 /* TokenType.QuotedStr */, lexeme: this._input.substring(this._start + 1, this._current - 1), offset: this._start + 1 });
    }
    /*
     * Lexing a regex expression: /.../[igsmyu]*
     * Based on https://github.com/microsoft/TypeScript/blob/9247ef115e617805983740ba795d7a8164babf89/src/compiler/scanner.ts#L2129-L2181
     *
     * Note that we want slashes within a regex to be escaped, e.g., /file:\\/\\/\\// should match `file:///`
     */
    _regex() {
        let p = this._current;
        let inEscape = false;
        let inCharacterClass = false;
        while (true) {
            if (p >= this._input.length) {
                this._current = p;
                this._error(hintDidYouForgetToEscapeSlash);
                return;
            }
            const ch = this._input.charCodeAt(p);
            if (inEscape) { // parsing an escape character
                inEscape = false;
            }
            else if (ch === 47 /* CharCode.Slash */ && !inCharacterClass) { // end of regex
                p++;
                break;
            }
            else if (ch === 91 /* CharCode.OpenSquareBracket */) {
                inCharacterClass = true;
            }
            else if (ch === 92 /* CharCode.Backslash */) {
                inEscape = true;
            }
            else if (ch === 93 /* CharCode.CloseSquareBracket */) {
                inCharacterClass = false;
            }
            p++;
        }
        // Consume flags // TODO@ulugbekna: use regex instead
        while (p < this._input.length && Scanner._regexFlags.has(this._input.charCodeAt(p))) {
            p++;
        }
        this._current = p;
        const lexeme = this._input.substring(this._start, this._current);
        this._tokens.push({ type: 10 /* TokenType.RegexStr */, lexeme, offset: this._start });
    }
    _isAtEnd() {
        return this._current >= this._input.length;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nhbm5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb250ZXh0a2V5L2NvbW1vbi9zY2FubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFM0MsTUFBTSxDQUFOLElBQWtCLFNBc0JqQjtBQXRCRCxXQUFrQixTQUFTO0lBQzFCLDZDQUFNLENBQUE7SUFDTiw2Q0FBTSxDQUFBO0lBQ04sdUNBQUcsQ0FBQTtJQUNILHFDQUFFLENBQUE7SUFDRiwyQ0FBSyxDQUFBO0lBQ0wscUNBQUUsQ0FBQTtJQUNGLHlDQUFJLENBQUE7SUFDSixxQ0FBRSxDQUFBO0lBQ0YseUNBQUksQ0FBQTtJQUNKLCtDQUFPLENBQUE7SUFDUCxrREFBUSxDQUFBO0lBQ1IsMENBQUksQ0FBQTtJQUNKLDRDQUFLLENBQUE7SUFDTCxzQ0FBRSxDQUFBO0lBQ0Ysd0NBQUcsQ0FBQTtJQUNILHdDQUFHLENBQUE7SUFDSCxzQ0FBRSxDQUFBO0lBQ0Ysd0NBQUcsQ0FBQTtJQUNILG9EQUFTLENBQUE7SUFDVCw0Q0FBSyxDQUFBO0lBQ0wsd0NBQUcsQ0FBQTtBQUNKLENBQUMsRUF0QmlCLFNBQVMsS0FBVCxTQUFTLFFBc0IxQjtBQXNERCxTQUFTLGNBQWMsQ0FBQyxHQUFHLEtBQWU7SUFDekMsUUFBUSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDdEIsS0FBSyxDQUFDO1lBQ0wsT0FBTyxRQUFRLENBQUMscUNBQXFDLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkYsS0FBSyxDQUFDO1lBQ0wsT0FBTyxRQUFR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