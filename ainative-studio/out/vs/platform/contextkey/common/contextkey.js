/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isChrome, isEdge, isFirefox, isLinux, isMacintosh, isSafari, isWeb, isWindows } from '../../../base/common/platform.js';
import { isFalsyOrWhitespace } from '../../../base/common/strings.js';
import { Scanner } from './scanner.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { localize } from '../../../nls.js';
import { illegalArgument } from '../../../base/common/errors.js';
const CONSTANT_VALUES = new Map();
CONSTANT_VALUES.set('false', false);
CONSTANT_VALUES.set('true', true);
CONSTANT_VALUES.set('isMac', isMacintosh);
CONSTANT_VALUES.set('isLinux', isLinux);
CONSTANT_VALUES.set('isWindows', isWindows);
CONSTANT_VALUES.set('isWeb', isWeb);
CONSTANT_VALUES.set('isMacNative', isMacintosh && !isWeb);
CONSTANT_VALUES.set('isEdge', isEdge);
CONSTANT_VALUES.set('isFirefox', isFirefox);
CONSTANT_VALUES.set('isChrome', isChrome);
CONSTANT_VALUES.set('isSafari', isSafari);
/** allow register constant context keys that are known only after startup; requires running `substituteConstants` on the context key - https://github.com/microsoft/vscode/issues/174218#issuecomment-1437972127 */
export function setConstant(key, value) {
    if (CONSTANT_VALUES.get(key) !== undefined) {
        throw illegalArgument('contextkey.setConstant(k, v) invoked with already set constant `k`');
    }
    CONSTANT_VALUES.set(key, value);
}
const hasOwnProperty = Object.prototype.hasOwnProperty;
export var ContextKeyExprType;
(function (ContextKeyExprType) {
    ContextKeyExprType[ContextKeyExprType["False"] = 0] = "False";
    ContextKeyExprType[ContextKeyExprType["True"] = 1] = "True";
    ContextKeyExprType[ContextKeyExprType["Defined"] = 2] = "Defined";
    ContextKeyExprType[ContextKeyExprType["Not"] = 3] = "Not";
    ContextKeyExprType[ContextKeyExprType["Equals"] = 4] = "Equals";
    ContextKeyExprType[ContextKeyExprType["NotEquals"] = 5] = "NotEquals";
    ContextKeyExprType[ContextKeyExprType["And"] = 6] = "And";
    ContextKeyExprType[ContextKeyExprType["Regex"] = 7] = "Regex";
    ContextKeyExprType[ContextKeyExprType["NotRegex"] = 8] = "NotRegex";
    ContextKeyExprType[ContextKeyExprType["Or"] = 9] = "Or";
    ContextKeyExprType[ContextKeyExprType["In"] = 10] = "In";
    ContextKeyExprType[ContextKeyExprType["NotIn"] = 11] = "NotIn";
    ContextKeyExprType[ContextKeyExprType["Greater"] = 12] = "Greater";
    ContextKeyExprType[ContextKeyExprType["GreaterEquals"] = 13] = "GreaterEquals";
    ContextKeyExprType[ContextKeyExprType["Smaller"] = 14] = "Smaller";
    ContextKeyExprType[ContextKeyExprType["SmallerEquals"] = 15] = "SmallerEquals";
})(ContextKeyExprType || (ContextKeyExprType = {}));
const defaultConfig = {
    regexParsingWithErrorRecovery: true
};
const errorEmptyString = localize('contextkey.parser.error.emptyString', "Empty context key expression");
const hintEmptyString = localize('contextkey.parser.error.emptyString.hint', "Did you forget to write an expression? You can also put 'false' or 'true' to always evaluate to false or true, respectively.");
const errorNoInAfterNot = localize('contextkey.parser.error.noInAfterNot', "'in' after 'not'.");
const errorClosingParenthesis = localize('contextkey.parser.error.closingParenthesis', "closing parenthesis ')'");
const errorUnexpectedToken = localize('contextkey.parser.error.unexpectedToken', "Unexpected token");
const hintUnexpectedToken = localize('contextkey.parser.error.unexpectedToken.hint', "Did you forget to put && or || before the token?");
const errorUnexpectedEOF = localize('contextkey.parser.error.unexpectedEOF', "Unexpected end of expression");
const hintUnexpectedEOF = localize('contextkey.parser.error.unexpectedEOF.hint', "Did you forget to put a context key?");
/**
 * A parser for context key expressions.
 *
 * Example:
 * ```ts
 * const parser = new Parser();
 * const expr = parser.parse('foo == "bar" && baz == true');
 *
 * if (expr === undefined) {
 * 	// there were lexing or parsing errors
 * 	// process lexing errors with `parser.lexingErrors`
 *  // process parsing errors with `parser.parsingErrors`
 * } else {
 * 	// expr is a valid expression
 * }
 * ```
 */
export class Parser {
    // Note: this doesn't produce an exact syntax tree but a normalized one
    // ContextKeyExpression's that we use as AST nodes do not expose constructors that do not normalize
    static { this._parseError = new Error(); }
    get lexingErrors() {
        return this._scanner.errors;
    }
    get parsingErrors() {
        return this._parsingErrors;
    }
    constructor(_config = defaultConfig) {
        this._config = _config;
        // lifetime note: `_scanner` lives as long as the parser does, i.e., is not reset between calls to `parse`
        this._scanner = new Scanner();
        // lifetime note: `_tokens`, `_current`, and `_parsingErrors` must be reset between calls to `parse`
        this._tokens = [];
        this._current = 0; // invariant: 0 <= this._current < this._tokens.length ; any incrementation of this value must first call `_isAtEnd`
        this._parsingErrors = [];
        this._flagsGYRe = /g|y/g;
    }
    /**
     * Parse a context key expression.
     *
     * @param input the expression to parse
     * @returns the parsed expression or `undefined` if there's an error - call `lexingErrors` and `parsingErrors` to see the errors
     */
    parse(input) {
        if (input === '') {
            this._parsingErrors.push({ message: errorEmptyString, offset: 0, lexeme: '', additionalInfo: hintEmptyString });
            return undefined;
        }
        this._tokens = this._scanner.reset(input).scan();
        // @ulugbekna: we do not stop parsing if there are lexing errors to be able to reconstruct regexes with unescaped slashes; TODO@ulugbekna: make this respect config option for recovery
        this._current = 0;
        this._parsingErrors = [];
        try {
            const expr = this._expr();
            if (!this._isAtEnd()) {
                const peek = this._peek();
                const additionalInfo = peek.type === 17 /* TokenType.Str */ ? hintUnexpectedToken : undefined;
                this._parsingErrors.push({ message: errorUnexpectedToken, offset: peek.offset, lexeme: Scanner.getLexeme(peek), additionalInfo });
                throw Parser._parseError;
            }
            return expr;
        }
        catch (e) {
            if (!(e === Parser._parseError)) {
                throw e;
            }
            return undefined;
        }
    }
    _expr() {
        return this._or();
    }
    _or() {
        const expr = [this._and()];
        while (this._matchOne(16 /* TokenType.Or */)) {
            const right = this._and();
            expr.push(right);
        }
        return expr.length === 1 ? expr[0] : ContextKeyExpr.or(...expr);
    }
    _and() {
        const expr = [this._term()];
        while (this._matchOne(15 /* TokenType.And */)) {
            const right = this._term();
            expr.push(right);
        }
        return expr.length === 1 ? expr[0] : ContextKeyExpr.and(...expr);
    }
    _term() {
        if (this._matchOne(2 /* TokenType.Neg */)) {
            const peek = this._peek();
            switch (peek.type) {
                case 11 /* TokenType.True */:
                    this._advance();
                    return ContextKeyFalseExpr.INSTANCE;
                case 12 /* TokenType.False */:
                    this._advance();
                    return ContextKeyTrueExpr.INSTANCE;
                case 0 /* TokenType.LParen */: {
                    this._advance();
                    const expr = this._expr();
                    this._consume(1 /* TokenType.RParen */, errorClosingParenthesis);
                    return expr?.negate();
                }
                case 17 /* TokenType.Str */:
                    this._advance();
                    return ContextKeyNotExpr.create(peek.lexeme);
                default:
                    throw this._errExpectedButGot(`KEY | true | false | '(' expression ')'`, peek);
            }
        }
        return this._primary();
    }
    _primary() {
        const peek = this._peek();
        switch (peek.type) {
            case 11 /* TokenType.True */:
                this._advance();
                return ContextKeyExpr.true();
            case 12 /* TokenType.False */:
                this._advance();
                return ContextKeyExpr.false();
            case 0 /* TokenType.LParen */: {
                this._advance();
                const expr = this._expr();
                this._consume(1 /* TokenType.RParen */, errorClosingParenthesis);
                return expr;
            }
            case 17 /* TokenType.Str */: {
                // KEY
                const key = peek.lexeme;
                this._advance();
                // =~ regex
                if (this._matchOne(9 /* TokenType.RegexOp */)) {
                    // @ulugbekna: we need to reconstruct the regex from the tokens because some extensions use unescaped slashes in regexes
                    const expr = this._peek();
                    if (!this._config.regexParsingWithErrorRecovery) {
                        this._advance();
                        if (expr.type !== 10 /* TokenType.RegexStr */) {
                            throw this._errExpectedButGot(`REGEX`, expr);
                        }
                        const regexLexeme = expr.lexeme;
                        const closingSlashIndex = regexLexeme.lastIndexOf('/');
                        const flags = closingSlashIndex === regexLexeme.length - 1 ? undefined : this._removeFlagsGY(regexLexeme.substring(closingSlashIndex + 1));
                        let regexp;
                        try {
                            regexp = new RegExp(regexLexeme.substring(1, closingSlashIndex), flags);
                        }
                        catch (e) {
                            throw this._errExpectedButGot(`REGEX`, expr);
                        }
                        return ContextKeyRegexExpr.create(key, regexp);
                    }
                    switch (expr.type) {
                        case 10 /* TokenType.RegexStr */:
                        case 19 /* TokenType.Error */: { // also handle an ErrorToken in case of smth such as /(/file)/
                            const lexemeReconstruction = [expr.lexeme]; // /REGEX/ or /REGEX/FLAGS
                            this._advance();
                            let followingToken = this._peek();
                            let parenBalance = 0;
                            for (let i = 0; i < expr.lexeme.length; i++) {
                                if (expr.lexeme.charCodeAt(i) === 40 /* CharCode.OpenParen */) {
                                    parenBalance++;
                                }
                                else if (expr.lexeme.charCodeAt(i) === 41 /* CharCode.CloseParen */) {
                                    parenBalance--;
                                }
                            }
                            while (!this._isAtEnd() && followingToken.type !== 15 /* TokenType.And */ && followingToken.type !== 16 /* TokenType.Or */) {
                                switch (followingToken.type) {
                                    case 0 /* TokenType.LParen */:
                                        parenBalance++;
                                        break;
                                    case 1 /* TokenType.RParen */:
                                        parenBalance--;
                                        break;
                                    case 10 /* TokenType.RegexStr */:
                                    case 18 /* TokenType.QuotedStr */:
                                        for (let i = 0; i < followingToken.lexeme.length; i++) {
                                            if (followingToken.lexeme.charCodeAt(i) === 40 /* CharCode.OpenParen */) {
                                                parenBalance++;
                                            }
                                            else if (expr.lexeme.charCodeAt(i) === 41 /* CharCode.CloseParen */) {
                                                parenBalance--;
                                            }
                                        }
                                }
                                if (parenBalance < 0) {
                                    break;
                                }
                                lexemeReconstruction.push(Scanner.getLexeme(followingToken));
                                this._advance();
                                followingToken = this._peek();
                            }
                            const regexLexeme = lexemeReconstruction.join('');
                            const closingSlashIndex = regexLexeme.lastIndexOf('/');
                            const flags = closingSlashIndex === regexLexeme.length - 1 ? undefined : this._removeFlagsGY(regexLexeme.substring(closingSlashIndex + 1));
                            let regexp;
                            try {
                                regexp = new RegExp(regexLexeme.substring(1, closingSlashIndex), flags);
                            }
                            catch (e) {
                                throw this._errExpectedButGot(`REGEX`, expr);
                            }
                            return ContextKeyExpr.regex(key, regexp);
                        }
                        case 18 /* TokenType.QuotedStr */: {
                            const serializedValue = expr.lexeme;
                            this._advance();
                            // replicate old regex parsing behavior
                            let regex = null;
                            if (!isFalsyOrWhitespace(serializedValue)) {
                                const start = serializedValue.indexOf('/');
                                const end = serializedValue.lastIndexOf('/');
                                if (start !== end && start >= 0) {
                                    const value = serializedValue.slice(start + 1, end);
                                    const caseIgnoreFlag = serializedValue[end + 1] === 'i' ? 'i' : '';
                                    try {
                                        regex = new RegExp(value, caseIgnoreFlag);
                                    }
                                    catch (_e) {
                                        throw this._errExpectedButGot(`REGEX`, expr);
                                    }
                                }
                            }
                            if (regex === null) {
                                throw this._errExpectedButGot('REGEX', expr);
                            }
                            return ContextKeyRegexExpr.create(key, regex);
                        }
                        default:
                            throw this._errExpectedButGot('REGEX', this._peek());
                    }
                }
                // [ 'not' 'in' value ]
                if (this._matchOne(14 /* TokenType.Not */)) {
                    this._consume(13 /* TokenType.In */, errorNoInAfterNot);
                    const right = this._value();
                    return ContextKeyExpr.notIn(key, right);
                }
                // [ ('==' | '!=' | '<' | '<=' | '>' | '>=' | 'in') value ]
                const maybeOp = this._peek().type;
                switch (maybeOp) {
                    case 3 /* TokenType.Eq */: {
                        this._advance();
                        const right = this._value();
                        if (this._previous().type === 18 /* TokenType.QuotedStr */) { // to preserve old parser behavior: "foo == 'true'" is preserved as "foo == 'true'", but "foo == true" is optimized as "foo"
                            return ContextKeyExpr.equals(key, right);
                        }
                        switch (right) {
                            case 'true':
                                return ContextKeyExpr.has(key);
                            case 'false':
                                return ContextKeyExpr.not(key);
                            default:
                                return ContextKeyExpr.equals(key, right);
                        }
                    }
                    case 4 /* TokenType.NotEq */: {
                        this._advance();
                        const right = this._value();
                        if (this._previous().type === 18 /* TokenType.QuotedStr */) { // same as above with "foo != 'true'"
                            return ContextKeyExpr.notEquals(key, right);
                        }
                        switch (right) {
                            case 'true':
                                return ContextKeyExpr.not(key);
                            case 'false':
                                return ContextKeyExpr.has(key);
                            default:
                                return ContextKeyExpr.notEquals(key, right);
                        }
                    }
                    // TODO: ContextKeyExpr.smaller(key, right) accepts only `number` as `right` AND during eval of this node, we just eval to `false` if `right` is not a number
                    // consequently, package.json linter should _warn_ the user if they're passing undesired things to ops
                    case 5 /* TokenType.Lt */:
                        this._advance();
                        return ContextKeySmallerExpr.create(key, this._value());
                    case 6 /* TokenType.LtEq */:
                        this._advance();
                        return ContextKeySmallerEqualsExpr.create(key, this._value());
                    case 7 /* TokenType.Gt */:
                        this._advance();
                        return ContextKeyGreaterExpr.create(key, this._value());
                    case 8 /* TokenType.GtEq */:
                        this._advance();
                        return ContextKeyGreaterEqualsExpr.create(key, this._value());
                    case 13 /* TokenType.In */:
                        this._advance();
                        return ContextKeyExpr.in(key, this._value());
                    default:
                        return ContextKeyExpr.has(key);
                }
            }
            case 20 /* TokenType.EOF */:
                this._parsingErrors.push({ message: errorUnexpectedEOF, offset: peek.offset, lexeme: '', additionalInfo: hintUnexpectedEOF });
                throw Parser._parseError;
            default:
                throw this._errExpectedButGot(`true | false | KEY \n\t| KEY '=~' REGEX \n\t| KEY ('==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not' 'in') value`, this._peek());
        }
    }
    _value() {
        const token = this._peek();
        switch (token.type) {
            case 17 /* TokenType.Str */:
            case 18 /* TokenType.QuotedStr */:
                this._advance();
                return token.lexeme;
            case 11 /* TokenType.True */:
                this._advance();
                return 'true';
            case 12 /* TokenType.False */:
                this._advance();
                return 'false';
            case 13 /* TokenType.In */: // we support `in` as a value, e.g., "when": "languageId == in" - exists in existing extensions
                this._advance();
                return 'in';
            default:
                // this allows "when": "foo == " which's used by existing extensions
                // we do not call `_advance` on purpose - we don't want to eat unintended tokens
                return '';
        }
    }
    _removeFlagsGY(flags) {
        return flags.replaceAll(this._flagsGYRe, '');
    }
    // careful: this can throw if current token is the initial one (ie index = 0)
    _previous() {
        return this._tokens[this._current - 1];
    }
    _matchOne(token) {
        if (this._check(token)) {
            this._advance();
            return true;
        }
        return false;
    }
    _advance() {
        if (!this._isAtEnd()) {
            this._current++;
        }
        return this._previous();
    }
    _consume(type, message) {
        if (this._check(type)) {
            return this._advance();
        }
        throw this._errExpectedButGot(message, this._peek());
    }
    _errExpectedButGot(expected, got, additionalInfo) {
        const message = localize('contextkey.parser.error.expectedButGot', "Expected: {0}\nReceived: '{1}'.", expected, Scanner.getLexeme(got));
        const offset = got.offset;
        const lexeme = Scanner.getLexeme(got);
        this._parsingErrors.push({ message, offset, lexeme, additionalInfo });
        return Parser._parseError;
    }
    _check(type) {
        return this._peek().type === type;
    }
    _peek() {
        return this._tokens[this._current];
    }
    _isAtEnd() {
        return this._peek().type === 20 /* TokenType.EOF */;
    }
}
export class ContextKeyExpr {
    static false() {
        return ContextKeyFalseExpr.INSTANCE;
    }
    static true() {
        return ContextKeyTrueExpr.INSTANCE;
    }
    static has(key) {
        return ContextKeyDefinedExpr.create(key);
    }
    static equals(key, value) {
        return ContextKeyEqualsExpr.create(key, value);
    }
    static notEquals(key, value) {
        return ContextKeyNotEqualsExpr.create(key, value);
    }
    static regex(key, value) {
        return ContextKeyRegexExpr.create(key, value);
    }
    static in(key, value) {
        return ContextKeyInExpr.create(key, value);
    }
    static notIn(key, value) {
        return ContextKeyNotInExpr.create(key, value);
    }
    static not(key) {
        return ContextKeyNotExpr.create(key);
    }
    static and(...expr) {
        return ContextKeyAndExpr.create(expr, null, true);
    }
    static or(...expr) {
        return ContextKeyOrExpr.create(expr, null, true);
    }
    static greater(key, value) {
        return ContextKeyGreaterExpr.create(key, value);
    }
    static greaterEquals(key, value) {
        return ContextKeyGreaterEqualsExpr.create(key, value);
    }
    static smaller(key, value) {
        return ContextKeySmallerExpr.create(key, value);
    }
    static smallerEquals(key, value) {
        return ContextKeySmallerEqualsExpr.create(key, value);
    }
    static { this._parser = new Parser({ regexParsingWithErrorRecovery: false }); }
    static deserialize(serialized) {
        if (serialized === undefined || serialized === null) { // an empty string needs to be handled by the parser to get a corresponding parsing error reported
            return undefined;
        }
        const expr = this._parser.parse(serialized);
        return expr;
    }
}
export function validateWhenClauses(whenClauses) {
    const parser = new Parser({ regexParsingWithErrorRecovery: false }); // we run with no recovery to guide users to use correct regexes
    return whenClauses.map(whenClause => {
        parser.parse(whenClause);
        if (parser.lexingErrors.length > 0) {
            return parser.lexingErrors.map((se) => ({
                errorMessage: se.additionalInfo ?
                    localize('contextkey.scanner.errorForLinterWithHint', "Unexpected token. Hint: {0}", se.additionalInfo) :
                    localize('contextkey.scanner.errorForLinter', "Unexpected token."),
                offset: se.offset,
                length: se.lexeme.length,
            }));
        }
        else if (parser.parsingErrors.length > 0) {
            return parser.parsingErrors.map((pe) => ({
                errorMessage: pe.additionalInfo ? `${pe.message}. ${pe.additionalInfo}` : pe.message,
                offset: pe.offset,
                length: pe.lexeme.length,
            }));
        }
        else {
            return [];
        }
    });
}
export function expressionsAreEqualWithConstantSubstitution(a, b) {
    const aExpr = a ? a.substituteConstants() : undefined;
    const bExpr = b ? b.substituteConstants() : undefined;
    if (!aExpr && !bExpr) {
        return true;
    }
    if (!aExpr || !bExpr) {
        return false;
    }
    return aExpr.equals(bExpr);
}
function cmp(a, b) {
    return a.cmp(b);
}
export class ContextKeyFalseExpr {
    static { this.INSTANCE = new ContextKeyFalseExpr(); }
    constructor() {
        this.type = 0 /* ContextKeyExprType.False */;
    }
    cmp(other) {
        return this.type - other.type;
    }
    equals(other) {
        return (other.type === this.type);
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        return false;
    }
    serialize() {
        return 'false';
    }
    keys() {
        return [];
    }
    map(mapFnc) {
        return this;
    }
    negate() {
        return ContextKeyTrueExpr.INSTANCE;
    }
}
export class ContextKeyTrueExpr {
    static { this.INSTANCE = new ContextKeyTrueExpr(); }
    constructor() {
        this.type = 1 /* ContextKeyExprType.True */;
    }
    cmp(other) {
        return this.type - other.type;
    }
    equals(other) {
        return (other.type === this.type);
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        return true;
    }
    serialize() {
        return 'true';
    }
    keys() {
        return [];
    }
    map(mapFnc) {
        return this;
    }
    negate() {
        return ContextKeyFalseExpr.INSTANCE;
    }
}
export class ContextKeyDefinedExpr {
    static create(key, negated = null) {
        const constantValue = CONSTANT_VALUES.get(key);
        if (typeof constantValue === 'boolean') {
            return constantValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE;
        }
        return new ContextKeyDefinedExpr(key, negated);
    }
    constructor(key, negated) {
        this.key = key;
        this.negated = negated;
        this.type = 2 /* ContextKeyExprType.Defined */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp1(this.key, other.key);
    }
    equals(other) {
        if (other.type === this.type) {
            return (this.key === other.key);
        }
        return false;
    }
    substituteConstants() {
        const constantValue = CONSTANT_VALUES.get(this.key);
        if (typeof constantValue === 'boolean') {
            return constantValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE;
        }
        return this;
    }
    evaluate(context) {
        return (!!context.getValue(this.key));
    }
    serialize() {
        return this.key;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapDefined(this.key);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyNotExpr.create(this.key, this);
        }
        return this.negated;
    }
}
export class ContextKeyEqualsExpr {
    static create(key, value, negated = null) {
        if (typeof value === 'boolean') {
            return (value ? ContextKeyDefinedExpr.create(key, negated) : ContextKeyNotExpr.create(key, negated));
        }
        const constantValue = CONSTANT_VALUES.get(key);
        if (typeof constantValue === 'boolean') {
            const trueValue = constantValue ? 'true' : 'false';
            return (value === trueValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE);
        }
        return new ContextKeyEqualsExpr(key, value, negated);
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 4 /* ContextKeyExprType.Equals */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return (this.key === other.key && this.value === other.value);
        }
        return false;
    }
    substituteConstants() {
        const constantValue = CONSTANT_VALUES.get(this.key);
        if (typeof constantValue === 'boolean') {
            const trueValue = constantValue ? 'true' : 'false';
            return (this.value === trueValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE);
        }
        return this;
    }
    evaluate(context) {
        // Intentional ==
        // eslint-disable-next-line eqeqeq
        return (context.getValue(this.key) == this.value);
    }
    serialize() {
        return `${this.key} == '${this.value}'`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapEquals(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyNotEqualsExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeyInExpr {
    static create(key, valueKey) {
        return new ContextKeyInExpr(key, valueKey);
    }
    constructor(key, valueKey) {
        this.key = key;
        this.valueKey = valueKey;
        this.type = 10 /* ContextKeyExprType.In */;
        this.negated = null;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.valueKey, other.key, other.valueKey);
    }
    equals(other) {
        if (other.type === this.type) {
            return (this.key === other.key && this.valueKey === other.valueKey);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        const source = context.getValue(this.valueKey);
        const item = context.getValue(this.key);
        if (Array.isArray(source)) {
            return source.includes(item);
        }
        if (typeof item === 'string' && typeof source === 'object' && source !== null) {
            return hasOwnProperty.call(source, item);
        }
        return false;
    }
    serialize() {
        return `${this.key} in '${this.valueKey}'`;
    }
    keys() {
        return [this.key, this.valueKey];
    }
    map(mapFnc) {
        return mapFnc.mapIn(this.key, this.valueKey);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyNotInExpr.create(this.key, this.valueKey);
        }
        return this.negated;
    }
}
export class ContextKeyNotInExpr {
    static create(key, valueKey) {
        return new ContextKeyNotInExpr(key, valueKey);
    }
    constructor(key, valueKey) {
        this.key = key;
        this.valueKey = valueKey;
        this.type = 11 /* ContextKeyExprType.NotIn */;
        this._negated = ContextKeyInExpr.create(key, valueKey);
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return this._negated.cmp(other._negated);
    }
    equals(other) {
        if (other.type === this.type) {
            return this._negated.equals(other._negated);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        return !this._negated.evaluate(context);
    }
    serialize() {
        return `${this.key} not in '${this.valueKey}'`;
    }
    keys() {
        return this._negated.keys();
    }
    map(mapFnc) {
        return mapFnc.mapNotIn(this.key, this.valueKey);
    }
    negate() {
        return this._negated;
    }
}
export class ContextKeyNotEqualsExpr {
    static create(key, value, negated = null) {
        if (typeof value === 'boolean') {
            if (value) {
                return ContextKeyNotExpr.create(key, negated);
            }
            return ContextKeyDefinedExpr.create(key, negated);
        }
        const constantValue = CONSTANT_VALUES.get(key);
        if (typeof constantValue === 'boolean') {
            const falseValue = constantValue ? 'true' : 'false';
            return (value === falseValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE);
        }
        return new ContextKeyNotEqualsExpr(key, value, negated);
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 5 /* ContextKeyExprType.NotEquals */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return (this.key === other.key && this.value === other.value);
        }
        return false;
    }
    substituteConstants() {
        const constantValue = CONSTANT_VALUES.get(this.key);
        if (typeof constantValue === 'boolean') {
            const falseValue = constantValue ? 'true' : 'false';
            return (this.value === falseValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE);
        }
        return this;
    }
    evaluate(context) {
        // Intentional !=
        // eslint-disable-next-line eqeqeq
        return (context.getValue(this.key) != this.value);
    }
    serialize() {
        return `${this.key} != '${this.value}'`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapNotEquals(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyEqualsExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeyNotExpr {
    static create(key, negated = null) {
        const constantValue = CONSTANT_VALUES.get(key);
        if (typeof constantValue === 'boolean') {
            return (constantValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE);
        }
        return new ContextKeyNotExpr(key, negated);
    }
    constructor(key, negated) {
        this.key = key;
        this.negated = negated;
        this.type = 3 /* ContextKeyExprType.Not */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp1(this.key, other.key);
    }
    equals(other) {
        if (other.type === this.type) {
            return (this.key === other.key);
        }
        return false;
    }
    substituteConstants() {
        const constantValue = CONSTANT_VALUES.get(this.key);
        if (typeof constantValue === 'boolean') {
            return (constantValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE);
        }
        return this;
    }
    evaluate(context) {
        return (!context.getValue(this.key));
    }
    serialize() {
        return `!${this.key}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapNot(this.key);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyDefinedExpr.create(this.key, this);
        }
        return this.negated;
    }
}
function withFloatOrStr(value, callback) {
    if (typeof value === 'string') {
        const n = parseFloat(value);
        if (!isNaN(n)) {
            value = n;
        }
    }
    if (typeof value === 'string' || typeof value === 'number') {
        return callback(value);
    }
    return ContextKeyFalseExpr.INSTANCE;
}
export class ContextKeyGreaterExpr {
    static create(key, _value, negated = null) {
        return withFloatOrStr(_value, (value) => new ContextKeyGreaterExpr(key, value, negated));
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 12 /* ContextKeyExprType.Greater */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return (this.key === other.key && this.value === other.value);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        if (typeof this.value === 'string') {
            return false;
        }
        return (parseFloat(context.getValue(this.key)) > this.value);
    }
    serialize() {
        return `${this.key} > ${this.value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapGreater(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeySmallerEqualsExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeyGreaterEqualsExpr {
    static create(key, _value, negated = null) {
        return withFloatOrStr(_value, (value) => new ContextKeyGreaterEqualsExpr(key, value, negated));
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 13 /* ContextKeyExprType.GreaterEquals */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return (this.key === other.key && this.value === other.value);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        if (typeof this.value === 'string') {
            return false;
        }
        return (parseFloat(context.getValue(this.key)) >= this.value);
    }
    serialize() {
        return `${this.key} >= ${this.value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapGreaterEquals(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeySmallerExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeySmallerExpr {
    static create(key, _value, negated = null) {
        return withFloatOrStr(_value, (value) => new ContextKeySmallerExpr(key, value, negated));
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 14 /* ContextKeyExprType.Smaller */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return (this.key === other.key && this.value === other.value);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        if (typeof this.value === 'string') {
            return false;
        }
        return (parseFloat(context.getValue(this.key)) < this.value);
    }
    serialize() {
        return `${this.key} < ${this.value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapSmaller(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyGreaterEqualsExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeySmallerEqualsExpr {
    static create(key, _value, negated = null) {
        return withFloatOrStr(_value, (value) => new ContextKeySmallerEqualsExpr(key, value, negated));
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 15 /* ContextKeyExprType.SmallerEquals */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return (this.key === other.key && this.value === other.value);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        if (typeof this.value === 'string') {
            return false;
        }
        return (parseFloat(context.getValue(this.key)) <= this.value);
    }
    serialize() {
        return `${this.key} <= ${this.value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapSmallerEquals(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyGreaterExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeyRegexExpr {
    static create(key, regexp) {
        return new ContextKeyRegexExpr(key, regexp);
    }
    constructor(key, regexp) {
        this.key = key;
        this.regexp = regexp;
        this.type = 7 /* ContextKeyExprType.Regex */;
        this.negated = null;
        //
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        if (this.key < other.key) {
            return -1;
        }
        if (this.key > other.key) {
            return 1;
        }
        const thisSource = this.regexp ? this.regexp.source : '';
        const otherSource = other.regexp ? other.regexp.source : '';
        if (thisSource < otherSource) {
            return -1;
        }
        if (thisSource > otherSource) {
            return 1;
        }
        return 0;
    }
    equals(other) {
        if (other.type === this.type) {
            const thisSource = this.regexp ? this.regexp.source : '';
            const otherSource = other.regexp ? other.regexp.source : '';
            return (this.key === other.key && thisSource === otherSource);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        const value = context.getValue(this.key);
        return this.regexp ? this.regexp.test(value) : false;
    }
    serialize() {
        const value = this.regexp
            ? `/${this.regexp.source}/${this.regexp.flags}`
            : '/invalid/';
        return `${this.key} =~ ${value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapRegex(this.key, this.regexp);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyNotRegexExpr.create(this);
        }
        return this.negated;
    }
}
export class ContextKeyNotRegexExpr {
    static create(actual) {
        return new ContextKeyNotRegexExpr(actual);
    }
    constructor(_actual) {
        this._actual = _actual;
        this.type = 8 /* ContextKeyExprType.NotRegex */;
        //
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return this._actual.cmp(other._actual);
    }
    equals(other) {
        if (other.type === this.type) {
            return this._actual.equals(other._actual);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        return !this._actual.evaluate(context);
    }
    serialize() {
        return `!(${this._actual.serialize()})`;
    }
    keys() {
        return this._actual.keys();
    }
    map(mapFnc) {
        return new ContextKeyNotRegexExpr(this._actual.map(mapFnc));
    }
    negate() {
        return this._actual;
    }
}
/**
 * @returns the same instance if nothing changed.
 */
function eliminateConstantsInArray(arr) {
    // Allocate array only if there is a difference
    let newArr = null;
    for (let i = 0, len = arr.length; i < len; i++) {
        const newExpr = arr[i].substituteConstants();
        if (arr[i] !== newExpr) {
            // something has changed!
            // allocate array on first difference
            if (newArr === null) {
                newArr = [];
                for (let j = 0; j < i; j++) {
                    newArr[j] = arr[j];
                }
            }
        }
        if (newArr !== null) {
            newArr[i] = newExpr;
        }
    }
    if (newArr === null) {
        return arr;
    }
    return newArr;
}
export class ContextKeyAndExpr {
    static create(_expr, negated, extraRedundantCheck) {
        return ContextKeyAndExpr._normalizeArr(_expr, negated, extraRedundantCheck);
    }
    constructor(expr, negated) {
        this.expr = expr;
        this.negated = negated;
        this.type = 6 /* ContextKeyExprType.And */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        if (this.expr.length < other.expr.length) {
            return -1;
        }
        if (this.expr.length > other.expr.length) {
            return 1;
        }
        for (let i = 0, len = this.expr.length; i < len; i++) {
            const r = cmp(this.expr[i], other.expr[i]);
            if (r !== 0) {
                return r;
            }
        }
        return 0;
    }
    equals(other) {
        if (other.type === this.type) {
            if (this.expr.length !== other.expr.length) {
                return false;
            }
            for (let i = 0, len = this.expr.length; i < len; i++) {
                if (!this.expr[i].equals(other.expr[i])) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    substituteConstants() {
        const exprArr = eliminateConstantsInArray(this.expr);
        if (exprArr === this.expr) {
            // no change
            return this;
        }
        return ContextKeyAndExpr.create(exprArr, this.negated, false);
    }
    evaluate(context) {
        for (let i = 0, len = this.expr.length; i < len; i++) {
            if (!this.expr[i].evaluate(context)) {
                return false;
            }
        }
        return true;
    }
    static _normalizeArr(arr, negated, extraRedundantCheck) {
        const expr = [];
        let hasTrue = false;
        for (const e of arr) {
            if (!e) {
                continue;
            }
            if (e.type === 1 /* ContextKeyExprType.True */) {
                // anything && true ==> anything
                hasTrue = true;
                continue;
            }
            if (e.type === 0 /* ContextKeyExprType.False */) {
                // anything && false ==> false
                return ContextKeyFalseExpr.INSTANCE;
            }
            if (e.type === 6 /* ContextKeyExprType.And */) {
                expr.push(...e.expr);
                continue;
            }
            expr.push(e);
        }
        if (expr.length === 0 && hasTrue) {
            return ContextKeyTrueExpr.INSTANCE;
        }
        if (expr.length === 0) {
            return undefined;
        }
        if (expr.length === 1) {
            return expr[0];
        }
        expr.sort(cmp);
        // eliminate duplicate terms
        for (let i = 1; i < expr.length; i++) {
            if (expr[i - 1].equals(expr[i])) {
                expr.splice(i, 1);
                i--;
            }
        }
        if (expr.length === 1) {
            return expr[0];
        }
        // We must distribute any OR expression because we don't support parens
        // OR extensions will be at the end (due to sorting rules)
        while (expr.length > 1) {
            const lastElement = expr[expr.length - 1];
            if (lastElement.type !== 9 /* ContextKeyExprType.Or */) {
                break;
            }
            // pop the last element
            expr.pop();
            // pop the second to last element
            const secondToLastElement = expr.pop();
            const isFinished = (expr.length === 0);
            // distribute `lastElement` over `secondToLastElement`
            const resultElement = ContextKeyOrExpr.create(lastElement.expr.map(el => ContextKeyAndExpr.create([el, secondToLastElement], null, extraRedundantCheck)), null, isFinished);
            if (resultElement) {
                expr.push(resultElement);
                expr.sort(cmp);
            }
        }
        if (expr.length === 1) {
            return expr[0];
        }
        // resolve false AND expressions
        if (extraRedundantCheck) {
            for (let i = 0; i < expr.length; i++) {
                for (let j = i + 1; j < expr.length; j++) {
                    if (expr[i].negate().equals(expr[j])) {
                        // A && !A case
                        return ContextKeyFalseExpr.INSTANCE;
                    }
                }
            }
            if (expr.length === 1) {
                return expr[0];
            }
        }
        return new ContextKeyAndExpr(expr, negated);
    }
    serialize() {
        return this.expr.map(e => e.serialize()).join(' && ');
    }
    keys() {
        const result = [];
        for (const expr of this.expr) {
            result.push(...expr.keys());
        }
        return result;
    }
    map(mapFnc) {
        return new ContextKeyAndExpr(this.expr.map(expr => expr.map(mapFnc)), null);
    }
    negate() {
        if (!this.negated) {
            const result = [];
            for (const expr of this.expr) {
                result.push(expr.negate());
            }
            this.negated = ContextKeyOrExpr.create(result, this, true);
        }
        return this.negated;
    }
}
export class ContextKeyOrExpr {
    static create(_expr, negated, extraRedundantCheck) {
        return ContextKeyOrExpr._normalizeArr(_expr, negated, extraRedundantCheck);
    }
    constructor(expr, negated) {
        this.expr = expr;
        this.negated = negated;
        this.type = 9 /* ContextKeyExprType.Or */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        if (this.expr.length < other.expr.length) {
            return -1;
        }
        if (this.expr.length > other.expr.length) {
            return 1;
        }
        for (let i = 0, len = this.expr.length; i < len; i++) {
            const r = cmp(this.expr[i], other.expr[i]);
            if (r !== 0) {
                return r;
            }
        }
        return 0;
    }
    equals(other) {
        if (other.type === this.type) {
            if (this.expr.length !== other.expr.length) {
                return false;
            }
            for (let i = 0, len = this.expr.length; i < len; i++) {
                if (!this.expr[i].equals(other.expr[i])) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    substituteConstants() {
        const exprArr = eliminateConstantsInArray(this.expr);
        if (exprArr === this.expr) {
            // no change
            return this;
        }
        return ContextKeyOrExpr.create(exprArr, this.negated, false);
    }
    evaluate(context) {
        for (let i = 0, len = this.expr.length; i < len; i++) {
            if (this.expr[i].evaluate(context)) {
                return true;
            }
        }
        return false;
    }
    static _normalizeArr(arr, negated, extraRedundantCheck) {
        let expr = [];
        let hasFalse = false;
        if (arr) {
            for (let i = 0, len = arr.length; i < len; i++) {
                const e = arr[i];
                if (!e) {
                    continue;
                }
                if (e.type === 0 /* ContextKeyExprType.False */) {
                    // anything || false ==> anything
                    hasFalse = true;
                    continue;
                }
                if (e.type === 1 /* ContextKeyExprType.True */) {
                    // anything || true ==> true
                    return ContextKeyTrueExpr.INSTANCE;
                }
                if (e.type === 9 /* ContextKeyExprType.Or */) {
                    expr = expr.concat(e.expr);
                    continue;
                }
                expr.push(e);
            }
            if (expr.length === 0 && hasFalse) {
                return ContextKeyFalseExpr.INSTANCE;
            }
            expr.sort(cmp);
        }
        if (expr.length === 0) {
            return undefined;
        }
        if (expr.length === 1) {
            return expr[0];
        }
        // eliminate duplicate terms
        for (let i = 1; i < expr.length; i++) {
            if (expr[i - 1].equals(expr[i])) {
                expr.splice(i, 1);
                i--;
            }
        }
        if (expr.length === 1) {
            return expr[0];
        }
        // resolve true OR expressions
        if (extraRedundantCheck) {
            for (let i = 0; i < expr.length; i++) {
                for (let j = i + 1; j < expr.length; j++) {
                    if (expr[i].negate().equals(expr[j])) {
                        // A || !A case
                        return ContextKeyTrueExpr.INSTANCE;
                    }
                }
            }
            if (expr.length === 1) {
                return expr[0];
            }
        }
        return new ContextKeyOrExpr(expr, negated);
    }
    serialize() {
        return this.expr.map(e => e.serialize()).join(' || ');
    }
    keys() {
        const result = [];
        for (const expr of this.expr) {
            result.push(...expr.keys());
        }
        return result;
    }
    map(mapFnc) {
        return new ContextKeyOrExpr(this.expr.map(expr => expr.map(mapFnc)), null);
    }
    negate() {
        if (!this.negated) {
            const result = [];
            for (const expr of this.expr) {
                result.push(expr.negate());
            }
            // We don't support parens, so here we distribute the AND over the OR terminals
            // We always take the first 2 AND pairs and distribute them
            while (result.length > 1) {
                const LEFT = result.shift();
                const RIGHT = result.shift();
                const all = [];
                for (const left of getTerminals(LEFT)) {
                    for (const right of getTerminals(RIGHT)) {
                        all.push(ContextKeyAndExpr.create([left, right], null, false));
                    }
                }
                result.unshift(ContextKeyOrExpr.create(all, null, false));
            }
            this.negated = ContextKeyOrExpr.create(result, this, true);
        }
        return this.negated;
    }
}
export class RawContextKey extends ContextKeyDefinedExpr {
    static { this._info = []; }
    static all() {
        return RawContextKey._info.values();
    }
    constructor(key, defaultValue, metaOrHide) {
        super(key, null);
        this._defaultValue = defaultValue;
        // collect all context keys into a central place
        if (typeof metaOrHide === 'object') {
            RawContextKey._info.push({ ...metaOrHide, key });
        }
        else if (metaOrHide !== true) {
            RawContextKey._info.push({ key, description: metaOrHide, type: defaultValue !== null && defaultValue !== undefined ? typeof defaultValue : undefined });
        }
    }
    bindTo(target) {
        return target.createKey(this.key, this._defaultValue);
    }
    getValue(target) {
        return target.getContextKeyValue(this.key);
    }
    toNegated() {
        return this.negate();
    }
    isEqualTo(value) {
        return ContextKeyEqualsExpr.create(this.key, value);
    }
    notEqualsTo(value) {
        return ContextKeyNotEqualsExpr.create(this.key, value);
    }
    greater(value) {
        return ContextKeyGreaterExpr.create(this.key, value);
    }
}
export const IContextKeyService = createDecorator('contextKeyService');
function cmp1(key1, key2) {
    if (key1 < key2) {
        return -1;
    }
    if (key1 > key2) {
        return 1;
    }
    return 0;
}
function cmp2(key1, value1, key2, value2) {
    if (key1 < key2) {
        return -1;
    }
    if (key1 > key2) {
        return 1;
    }
    if (value1 < value2) {
        return -1;
    }
    if (value1 > value2) {
        return 1;
    }
    return 0;
}
/**
 * Returns true if it is provable `p` implies `q`.
 */
export function implies(p, q) {
    if (p.type === 0 /* ContextKeyExprType.False */ || q.type === 1 /* ContextKeyExprType.True */) {
        // false implies anything
        // anything implies true
        return true;
    }
    if (p.type === 9 /* ContextKeyExprType.Or */) {
        if (q.type === 9 /* ContextKeyExprType.Or */) {
            // `a || b || c` can only imply something like `a || b || c || d`
            return allElementsIncluded(p.expr, q.expr);
        }
        return false;
    }
    if (q.type === 9 /* ContextKeyExprType.Or */) {
        for (const element of q.expr) {
            if (implies(p, element)) {
                return true;
            }
        }
        return false;
    }
    if (p.type === 6 /* ContextKeyExprType.And */) {
        if (q.type === 6 /* ContextKeyExprType.And */) {
            // `a && b && c` implies `a && c`
            return allElementsIncluded(q.expr, p.expr);
        }
        for (const element of p.expr) {
            if (implies(element, q)) {
                return true;
            }
        }
        return false;
    }
    return p.equals(q);
}
/**
 * Returns true if all elements in `p` are also present in `q`.
 * The two arrays are assumed to be sorted
 */
function allElementsIncluded(p, q) {
    let pIndex = 0;
    let qIndex = 0;
    while (pIndex < p.length && qIndex < q.length) {
        const cmp = p[pIndex].cmp(q[qIndex]);
        if (cmp < 0) {
            // an element from `p` is missing from `q`
            return false;
        }
        else if (cmp === 0) {
            pIndex++;
            qIndex++;
        }
        else {
            qIndex++;
        }
    }
    return (pIndex === p.length);
}
function getTerminals(node) {
    if (node.type === 9 /* ContextKeyExprType.Or */) {
        return node.expr;
    }
    return [node];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb250ZXh0a2V5L2NvbW1vbi9jb250ZXh0a2V5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDakksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBaUMsTUFBTSxjQUFjLENBQUM7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFakUsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUM7QUFDbkQsZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDcEMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbEMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDMUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDeEMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDNUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDcEMsZUFBZSxD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