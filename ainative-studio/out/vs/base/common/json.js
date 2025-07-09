/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ScanError;
(function (ScanError) {
    ScanError[ScanError["None"] = 0] = "None";
    ScanError[ScanError["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
    ScanError[ScanError["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
    ScanError[ScanError["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
    ScanError[ScanError["InvalidUnicode"] = 4] = "InvalidUnicode";
    ScanError[ScanError["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
    ScanError[ScanError["InvalidCharacter"] = 6] = "InvalidCharacter";
})(ScanError || (ScanError = {}));
export var SyntaxKind;
(function (SyntaxKind) {
    SyntaxKind[SyntaxKind["OpenBraceToken"] = 1] = "OpenBraceToken";
    SyntaxKind[SyntaxKind["CloseBraceToken"] = 2] = "CloseBraceToken";
    SyntaxKind[SyntaxKind["OpenBracketToken"] = 3] = "OpenBracketToken";
    SyntaxKind[SyntaxKind["CloseBracketToken"] = 4] = "CloseBracketToken";
    SyntaxKind[SyntaxKind["CommaToken"] = 5] = "CommaToken";
    SyntaxKind[SyntaxKind["ColonToken"] = 6] = "ColonToken";
    SyntaxKind[SyntaxKind["NullKeyword"] = 7] = "NullKeyword";
    SyntaxKind[SyntaxKind["TrueKeyword"] = 8] = "TrueKeyword";
    SyntaxKind[SyntaxKind["FalseKeyword"] = 9] = "FalseKeyword";
    SyntaxKind[SyntaxKind["StringLiteral"] = 10] = "StringLiteral";
    SyntaxKind[SyntaxKind["NumericLiteral"] = 11] = "NumericLiteral";
    SyntaxKind[SyntaxKind["LineCommentTrivia"] = 12] = "LineCommentTrivia";
    SyntaxKind[SyntaxKind["BlockCommentTrivia"] = 13] = "BlockCommentTrivia";
    SyntaxKind[SyntaxKind["LineBreakTrivia"] = 14] = "LineBreakTrivia";
    SyntaxKind[SyntaxKind["Trivia"] = 15] = "Trivia";
    SyntaxKind[SyntaxKind["Unknown"] = 16] = "Unknown";
    SyntaxKind[SyntaxKind["EOF"] = 17] = "EOF";
})(SyntaxKind || (SyntaxKind = {}));
export var ParseErrorCode;
(function (ParseErrorCode) {
    ParseErrorCode[ParseErrorCode["InvalidSymbol"] = 1] = "InvalidSymbol";
    ParseErrorCode[ParseErrorCode["InvalidNumberFormat"] = 2] = "InvalidNumberFormat";
    ParseErrorCode[ParseErrorCode["PropertyNameExpected"] = 3] = "PropertyNameExpected";
    ParseErrorCode[ParseErrorCode["ValueExpected"] = 4] = "ValueExpected";
    ParseErrorCode[ParseErrorCode["ColonExpected"] = 5] = "ColonExpected";
    ParseErrorCode[ParseErrorCode["CommaExpected"] = 6] = "CommaExpected";
    ParseErrorCode[ParseErrorCode["CloseBraceExpected"] = 7] = "CloseBraceExpected";
    ParseErrorCode[ParseErrorCode["CloseBracketExpected"] = 8] = "CloseBracketExpected";
    ParseErrorCode[ParseErrorCode["EndOfFileExpected"] = 9] = "EndOfFileExpected";
    ParseErrorCode[ParseErrorCode["InvalidCommentToken"] = 10] = "InvalidCommentToken";
    ParseErrorCode[ParseErrorCode["UnexpectedEndOfComment"] = 11] = "UnexpectedEndOfComment";
    ParseErrorCode[ParseErrorCode["UnexpectedEndOfString"] = 12] = "UnexpectedEndOfString";
    ParseErrorCode[ParseErrorCode["UnexpectedEndOfNumber"] = 13] = "UnexpectedEndOfNumber";
    ParseErrorCode[ParseErrorCode["InvalidUnicode"] = 14] = "InvalidUnicode";
    ParseErrorCode[ParseErrorCode["InvalidEscapeCharacter"] = 15] = "InvalidEscapeCharacter";
    ParseErrorCode[ParseErrorCode["InvalidCharacter"] = 16] = "InvalidCharacter";
})(ParseErrorCode || (ParseErrorCode = {}));
export var ParseOptions;
(function (ParseOptions) {
    ParseOptions.DEFAULT = {
        allowTrailingComma: true
    };
})(ParseOptions || (ParseOptions = {}));
/**
 * Creates a JSON scanner on the given text.
 * If ignoreTrivia is set, whitespaces or comments are ignored.
 */
export function createScanner(text, ignoreTrivia = false) {
    let pos = 0;
    const len = text.length;
    let value = '';
    let tokenOffset = 0;
    let token = 16 /* SyntaxKind.Unknown */;
    let scanError = 0 /* ScanError.None */;
    function scanHexDigits(count) {
        let digits = 0;
        let hexValue = 0;
        while (digits < count) {
            const ch = text.charCodeAt(pos);
            if (ch >= 48 /* CharacterCodes._0 */ && ch <= 57 /* CharacterCodes._9 */) {
                hexValue = hexValue * 16 + ch - 48 /* CharacterCodes._0 */;
            }
            else if (ch >= 65 /* CharacterCodes.A */ && ch <= 70 /* CharacterCodes.F */) {
                hexValue = hexValue * 16 + ch - 65 /* CharacterCodes.A */ + 10;
            }
            else if (ch >= 97 /* CharacterCodes.a */ && ch <= 102 /* CharacterCodes.f */) {
                hexValue = hexValue * 16 + ch - 97 /* CharacterCodes.a */ + 10;
            }
            else {
                break;
            }
            pos++;
            digits++;
        }
        if (digits < count) {
            hexValue = -1;
        }
        return hexValue;
    }
    function setPosition(newPosition) {
        pos = newPosition;
        value = '';
        tokenOffset = 0;
        token = 16 /* SyntaxKind.Unknown */;
        scanError = 0 /* ScanError.None */;
    }
    function scanNumber() {
        const start = pos;
        if (text.charCodeAt(pos) === 48 /* CharacterCodes._0 */) {
            pos++;
        }
        else {
            pos++;
            while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
            }
        }
        if (pos < text.length && text.charCodeAt(pos) === 46 /* CharacterCodes.dot */) {
            pos++;
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
                while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                    pos++;
                }
            }
            else {
                scanError = 3 /* ScanError.UnexpectedEndOfNumber */;
                return text.substring(start, pos);
            }
        }
        let end = pos;
        if (pos < text.length && (text.charCodeAt(pos) === 69 /* CharacterCodes.E */ || text.charCodeAt(pos) === 101 /* CharacterCodes.e */)) {
            pos++;
            if (pos < text.length && text.charCodeAt(pos) === 43 /* CharacterCodes.plus */ || text.charCodeAt(pos) === 45 /* CharacterCodes.minus */) {
                pos++;
            }
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
                while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                    pos++;
                }
                end = pos;
            }
            else {
                scanError = 3 /* ScanError.UnexpectedEndOfNumber */;
            }
        }
        return text.substring(start, end);
    }
    function scanString() {
        let result = '', start = pos;
        while (true) {
            if (pos >= len) {
                result += text.substring(start, pos);
                scanError = 2 /* ScanError.UnexpectedEndOfString */;
                break;
            }
            const ch = text.charCodeAt(pos);
            if (ch === 34 /* CharacterCodes.doubleQuote */) {
                result += text.substring(start, pos);
                pos++;
                break;
            }
            if (ch === 92 /* CharacterCodes.backslash */) {
                result += text.substring(start, pos);
                pos++;
                if (pos >= len) {
                    scanError = 2 /* ScanError.UnexpectedEndOfString */;
                    break;
                }
                const ch2 = text.charCodeAt(pos++);
                switch (ch2) {
                    case 34 /* CharacterCodes.doubleQuote */:
                        result += '\"';
                        break;
                    case 92 /* CharacterCodes.backslash */:
                        result += '\\';
                        break;
                    case 47 /* CharacterCodes.slash */:
                        result += '/';
                        break;
                    case 98 /* CharacterCodes.b */:
                        result += '\b';
                        break;
                    case 102 /* CharacterCodes.f */:
                        result += '\f';
                        break;
                    case 110 /* CharacterCodes.n */:
                        result += '\n';
                        break;
                    case 114 /* CharacterCodes.r */:
                        result += '\r';
                        break;
                    case 116 /* CharacterCodes.t */:
                        result += '\t';
                        break;
                    case 117 /* CharacterCodes.u */: {
                        const ch3 = scanHexDigits(4);
                        if (ch3 >= 0) {
                            result += String.fromCharCode(ch3);
                        }
                        else {
                            scanError = 4 /* ScanError.InvalidUnicode */;
                        }
                        break;
                    }
                    default:
                        scanError = 5 /* ScanError.InvalidEscapeCharacter */;
                }
                start = pos;
                continue;
            }
            if (ch >= 0 && ch <= 0x1F) {
                if (isLineBreak(ch)) {
                    result += text.substring(start, pos);
                    scanError = 2 /* ScanError.UnexpectedEndOfString */;
                    break;
                }
                else {
                    scanError = 6 /* ScanError.InvalidCharacter */;
                    // mark as error but continue with string
                }
            }
            pos++;
        }
        return result;
    }
    function scanNext() {
        value = '';
        scanError = 0 /* ScanError.None */;
        tokenOffset = pos;
        if (pos >= len) {
            // at the end
            tokenOffset = len;
            return token = 17 /* SyntaxKind.EOF */;
        }
        let code = text.charCodeAt(pos);
        // trivia: whitespace
        if (isWhitespace(code)) {
            do {
                pos++;
                value += String.fromCharCode(code);
                code = text.charCodeAt(pos);
            } while (isWhitespace(code));
            return token = 15 /* SyntaxKind.Trivia */;
        }
        // trivia: newlines
        if (isLineBreak(code)) {
            pos++;
            value += String.fromCharCode(code);
            if (code === 13 /* CharacterCodes.carriageReturn */ && text.charCodeAt(pos) === 10 /* CharacterCodes.lineFeed */) {
                pos++;
                value += '\n';
            }
            return token = 14 /* SyntaxKind.LineBreakTrivia */;
        }
        switch (code) {
            // tokens: []{}:,
            case 123 /* CharacterCodes.openBrace */:
                pos++;
                return token = 1 /* SyntaxKind.OpenBraceToken */;
            case 125 /* CharacterCodes.closeBrace */:
                pos++;
                return token = 2 /* SyntaxKind.CloseBraceToken */;
            case 91 /* CharacterCodes.openBracket */:
                pos++;
                return token = 3 /* SyntaxKind.OpenBracketToken */;
            case 93 /* CharacterCodes.closeBracket */:
                pos++;
                return token = 4 /* SyntaxKind.CloseBracketToken */;
            case 58 /* CharacterCodes.colon */:
                pos++;
                return token = 6 /* SyntaxKind.ColonToken */;
            case 44 /* CharacterCodes.comma */:
                pos++;
                return token = 5 /* SyntaxKind.CommaToken */;
            // strings
            case 34 /* CharacterCodes.doubleQuote */:
                pos++;
                value = scanString();
                return token = 10 /* SyntaxKind.StringLiteral */;
            // comments
            case 47 /* CharacterCodes.slash */: {
                const start = pos - 1;
                // Single-line comment
                if (text.charCodeAt(pos + 1) === 47 /* CharacterCodes.slash */) {
                    pos += 2;
                    while (pos < len) {
                        if (isLineBreak(text.charCodeAt(pos))) {
                            break;
                        }
                        pos++;
                    }
                    value = text.substring(start, pos);
                    return token = 12 /* SyntaxKind.LineCommentTrivia */;
                }
                // Multi-line comment
                if (text.charCodeAt(pos + 1) === 42 /* CharacterCodes.asterisk */) {
                    pos += 2;
                    const safeLength = len - 1; // For lookahead.
                    let commentClosed = false;
                    while (pos < safeLength) {
                        const ch = text.charCodeAt(pos);
                        if (ch === 42 /* CharacterCodes.asterisk */ && text.charCodeAt(pos + 1) === 47 /* CharacterCodes.slash */) {
                            pos += 2;
                            commentClosed = true;
                            break;
                        }
                        pos++;
                    }
                    if (!commentClosed) {
                        pos++;
                        scanError = 1 /* ScanError.UnexpectedEndOfComment */;
                    }
                    value = text.substring(start, pos);
                    return token = 13 /* SyntaxKind.BlockCommentTrivia */;
                }
                // just a single slash
                value += String.fromCharCode(code);
                pos++;
                return token = 16 /* SyntaxKind.Unknown */;
            }
            // numbers
            case 45 /* CharacterCodes.minus */:
                value += String.fromCharCode(code);
                pos++;
                if (pos === len || !isDigit(text.charCodeAt(pos))) {
                    return token = 16 /* SyntaxKind.Unknown */;
                }
            // found a minus, followed by a number so
            // we fall through to proceed with scanning
            // numbers
            case 48 /* CharacterCodes._0 */:
            case 49 /* CharacterCodes._1 */:
            case 50 /* CharacterCodes._2 */:
            case 51 /* CharacterCodes._3 */:
            case 52 /* CharacterCodes._4 */:
            case 53 /* CharacterCodes._5 */:
            case 54 /* CharacterCodes._6 */:
            case 55 /* CharacterCodes._7 */:
            case 56 /* CharacterCodes._8 */:
            case 57 /* CharacterCodes._9 */:
                value += scanNumber();
                return token = 11 /* SyntaxKind.NumericLiteral */;
            // literals and unknown symbols
            default:
                // is a literal? Read the full word.
                while (pos < len && isUnknownContentCharacter(code)) {
                    pos++;
                    code = text.charCodeAt(pos);
                }
                if (tokenOffset !== pos) {
                    value = text.substring(tokenOffset, pos);
                    // keywords: true, false, null
                    switch (value) {
                        case 'true': return token = 8 /* SyntaxKind.TrueKeyword */;
                        case 'false': return token = 9 /* SyntaxKind.FalseKeyword */;
                        case 'null': return token = 7 /* SyntaxKind.NullKeyword */;
                    }
                    return token = 16 /* SyntaxKind.Unknown */;
                }
                // some
                value += String.fromCharCode(code);
                pos++;
                return token = 16 /* SyntaxKind.Unknown */;
        }
    }
    function isUnknownContentCharacter(code) {
        if (isWhitespace(code) || isLineBreak(code)) {
            return false;
        }
        switch (code) {
            case 125 /* CharacterCodes.closeBrace */:
            case 93 /* CharacterCodes.closeBracket */:
            case 123 /* CharacterCodes.openBrace */:
            case 91 /* CharacterCodes.openBracket */:
            case 34 /* CharacterCodes.doubleQuote */:
            case 58 /* CharacterCodes.colon */:
            case 44 /* CharacterCodes.comma */:
            case 47 /* CharacterCodes.slash */:
                return false;
        }
        return true;
    }
    function scanNextNonTrivia() {
        let result;
        do {
            result = scanNext();
        } while (result >= 12 /* SyntaxKind.LineCommentTrivia */ && result <= 15 /* SyntaxKind.Trivia */);
        return result;
    }
    return {
        setPosition: setPosition,
        getPosition: () => pos,
        scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
        getToken: () => token,
        getTokenValue: () => value,
        getTokenOffset: () => tokenOffset,
        getTokenLength: () => pos - tokenOffset,
        getTokenError: () => scanError
    };
}
function isWhitespace(ch) {
    return ch === 32 /* CharacterCodes.space */ || ch === 9 /* CharacterCodes.tab */ || ch === 11 /* CharacterCodes.verticalTab */ || ch === 12 /* CharacterCodes.formFeed */ ||
        ch === 160 /* CharacterCodes.nonBreakingSpace */ || ch === 5760 /* CharacterCodes.ogham */ || ch >= 8192 /* CharacterCodes.enQuad */ && ch <= 8203 /* CharacterCodes.zeroWidthSpace */ ||
        ch === 8239 /* CharacterCodes.narrowNoBreakSpace */ || ch === 8287 /* CharacterCodes.mathematicalSpace */ || ch === 12288 /* CharacterCodes.ideographicSpace */ || ch === 65279 /* CharacterCodes.byteOrderMark */;
}
function isLineBreak(ch) {
    return ch === 10 /* CharacterCodes.lineFeed */ || ch === 13 /* CharacterCodes.carriageReturn */ || ch === 8232 /* CharacterCodes.lineSeparator */ || ch === 8233 /* CharacterCodes.paragraphSeparator */;
}
function isDigit(ch) {
    return ch >= 48 /* CharacterCodes._0 */ && ch <= 57 /* CharacterCodes._9 */;
}
var CharacterCodes;
(function (CharacterCodes) {
    CharacterCodes[CharacterCodes["nullCharacter"] = 0] = "nullCharacter";
    CharacterCodes[CharacterCodes["maxAsciiCharacter"] = 127] = "maxAsciiCharacter";
    CharacterCodes[CharacterCodes["lineFeed"] = 10] = "lineFeed";
    CharacterCodes[CharacterCodes["carriageReturn"] = 13] = "carriageReturn";
    CharacterCodes[CharacterCodes["lineSeparator"] = 8232] = "lineSeparator";
    CharacterCodes[CharacterCodes["paragraphSeparator"] = 8233] = "paragraphSeparator";
    // REVIEW: do we need to support this?  The scanner doesn't, but our IText does.  This seems
    // like an odd disparity?  (Or maybe it's completely fine for them to be different).
    CharacterCodes[CharacterCodes["nextLine"] = 133] = "nextLine";
    // Unicode 3.0 space characters
    CharacterCodes[CharacterCodes["space"] = 32] = "space";
    CharacterCodes[CharacterCodes["nonBreakingSpace"] = 160] = "nonBreakingSpace";
    CharacterCodes[CharacterCodes["enQuad"] = 8192] = "enQuad";
    CharacterCodes[CharacterCodes["emQuad"] = 8193] = "emQuad";
    CharacterCodes[CharacterCodes["enSpace"] = 8194] = "enSpace";
    CharacterCodes[CharacterCodes["emSpace"] = 8195] = "emSpace";
    CharacterCodes[CharacterCodes["threePerEmSpace"] = 8196] = "threePerEmSpace";
    CharacterCodes[CharacterCodes["fourPerEmSpace"] = 8197] = "fourPerEmSpace";
    CharacterCodes[CharacterCodes["sixPerEmSpace"] = 8198] = "sixPerEmSpace";
    CharacterCodes[CharacterCodes["figureSpace"] = 8199] = "figureSpace";
    CharacterCodes[CharacterCodes["punctuationSpace"] = 8200] = "punctuationSpace";
    CharacterCodes[CharacterCodes["thinSpace"] = 8201] = "thinSpace";
    CharacterCodes[CharacterCodes["hairSpace"] = 8202] = "hairSpace";
    CharacterCodes[CharacterCodes["zeroWidthSpace"] = 8203] = "zeroWidthSpace";
    CharacterCodes[CharacterCodes["narrowNoBreakSpace"] = 8239] = "narrowNoBreakSpace";
    CharacterCodes[CharacterCodes["ideographicSpace"] = 12288] = "ideographicSpace";
    CharacterCodes[CharacterCodes["mathematicalSpace"] = 8287] = "mathematicalSpace";
    CharacterCodes[CharacterCodes["ogham"] = 5760] = "ogham";
    CharacterCodes[CharacterCodes["_"] = 95] = "_";
    CharacterCodes[CharacterCodes["$"] = 36] = "$";
    CharacterCodes[CharacterCodes["_0"] = 48] = "_0";
    CharacterCodes[CharacterCodes["_1"] = 49] = "_1";
    CharacterCodes[CharacterCodes["_2"] = 50] = "_2";
    CharacterCodes[CharacterCodes["_3"] = 51] = "_3";
    CharacterCodes[CharacterCodes["_4"] = 52] = "_4";
    CharacterCodes[CharacterCodes["_5"] = 53] = "_5";
    CharacterCodes[CharacterCodes["_6"] = 54] = "_6";
    CharacterCodes[CharacterCodes["_7"] = 55] = "_7";
    CharacterCodes[CharacterCodes["_8"] = 56] = "_8";
    CharacterCodes[CharacterCodes["_9"] = 57] = "_9";
    CharacterCodes[CharacterCodes["a"] = 97] = "a";
    CharacterCodes[CharacterCodes["b"] = 98] = "b";
    CharacterCodes[CharacterCodes["c"] = 99] = "c";
    CharacterCodes[CharacterCodes["d"] = 100] = "d";
    CharacterCodes[CharacterCodes["e"] = 101] = "e";
    CharacterCodes[CharacterCodes["f"] = 102] = "f";
    CharacterCodes[CharacterCodes["g"] = 103] = "g";
    CharacterCodes[CharacterCodes["h"] = 104] = "h";
    CharacterCodes[CharacterCodes["i"] = 105] = "i";
    CharacterCodes[CharacterCodes["j"] = 106] = "j";
    CharacterCodes[CharacterCodes["k"] = 107] = "k";
    CharacterCodes[CharacterCodes["l"] = 108] = "l";
    CharacterCodes[CharacterCodes["m"] = 109] = "m";
    CharacterCodes[CharacterCodes["n"] = 110] = "n";
    CharacterCodes[CharacterCodes["o"] = 111] = "o";
    CharacterCodes[CharacterCodes["p"] = 112] = "p";
    CharacterCodes[CharacterCodes["q"] = 113] = "q";
    CharacterCodes[CharacterCodes["r"] = 114] = "r";
    CharacterCodes[CharacterCodes["s"] = 115] = "s";
    CharacterCodes[CharacterCodes["t"] = 116] = "t";
    CharacterCodes[CharacterCodes["u"] = 117] = "u";
    CharacterCodes[CharacterCodes["v"] = 118] = "v";
    CharacterCodes[CharacterCodes["w"] = 119] = "w";
    CharacterCodes[CharacterCodes["x"] = 120] = "x";
    CharacterCodes[CharacterCodes["y"] = 121] = "y";
    CharacterCodes[CharacterCodes["z"] = 122] = "z";
    CharacterCodes[CharacterCodes["A"] = 65] = "A";
    CharacterCodes[CharacterCodes["B"] = 66] = "B";
    CharacterCodes[CharacterCodes["C"] = 67] = "C";
    CharacterCodes[CharacterCodes["D"] = 68] = "D";
    CharacterCodes[CharacterCodes["E"] = 69] = "E";
    CharacterCodes[CharacterCodes["F"] = 70] = "F";
    CharacterCodes[CharacterCodes["G"] = 71] = "G";
    CharacterCodes[CharacterCodes["H"] = 72] = "H";
    CharacterCodes[CharacterCodes["I"] = 73] = "I";
    CharacterCodes[CharacterCodes["J"] = 74] = "J";
    CharacterCodes[CharacterCodes["K"] = 75] = "K";
    CharacterCodes[CharacterCodes["L"] = 76] = "L";
    CharacterCodes[CharacterCodes["M"] = 77] = "M";
    CharacterCodes[CharacterCodes["N"] = 78] = "N";
    CharacterCodes[CharacterCodes["O"] = 79] = "O";
    CharacterCodes[CharacterCodes["P"] = 80] = "P";
    CharacterCodes[CharacterCodes["Q"] = 81] = "Q";
    CharacterCodes[CharacterCodes["R"] = 82] = "R";
    CharacterCodes[CharacterCodes["S"] = 83] = "S";
    CharacterCodes[CharacterCodes["T"] = 84] = "T";
    CharacterCodes[CharacterCodes["U"] = 85] = "U";
    CharacterCodes[CharacterCodes["V"] = 86] = "V";
    CharacterCodes[CharacterCodes["W"] = 87] = "W";
    CharacterCodes[CharacterCodes["X"] = 88] = "X";
    CharacterCodes[CharacterCodes["Y"] = 89] = "Y";
    CharacterCodes[CharacterCodes["Z"] = 90] = "Z";
    CharacterCodes[CharacterCodes["ampersand"] = 38] = "ampersand";
    CharacterCodes[CharacterCodes["asterisk"] = 42] = "asterisk";
    CharacterCodes[CharacterCodes["at"] = 64] = "at";
    CharacterCodes[CharacterCodes["backslash"] = 92] = "backslash";
    CharacterCodes[CharacterCodes["bar"] = 124] = "bar";
    CharacterCodes[CharacterCodes["caret"] = 94] = "caret";
    CharacterCodes[CharacterCodes["closeBrace"] = 125] = "closeBrace";
    CharacterCodes[CharacterCodes["closeBracket"] = 93] = "closeBracket";
    CharacterCodes[CharacterCodes["closeParen"] = 41] = "closeParen";
    CharacterCodes[CharacterCodes["colon"] = 58] = "colon";
    CharacterCodes[CharacterCodes["comma"] = 44] = "comma";
    CharacterCodes[CharacterCodes["dot"] = 46] = "dot";
    CharacterCodes[CharacterCodes["doubleQuote"] = 34] = "doubleQuote";
    CharacterCodes[CharacterCodes["equals"] = 61] = "equals";
    CharacterCodes[CharacterCodes["exclamation"] = 33] = "exclamation";
    CharacterCodes[CharacterCodes["greaterThan"] = 62] = "greaterThan";
    CharacterCodes[CharacterCodes["lessThan"] = 60] = "lessThan";
    CharacterCodes[CharacterCodes["minus"] = 45] = "minus";
    CharacterCodes[CharacterCodes["openBrace"] = 123] = "openBrace";
    CharacterCodes[CharacterCodes["openBracket"] = 91] = "openBracket";
    CharacterCodes[CharacterCodes["openParen"] = 40] = "openParen";
    CharacterCodes[CharacterCodes["percent"] = 37] = "percent";
    CharacterCodes[CharacterCodes["plus"] = 43] = "plus";
    CharacterCodes[CharacterCodes["question"] = 63] = "question";
    CharacterCodes[CharacterCodes["semicolon"] = 59] = "semicolon";
    CharacterCodes[CharacterCodes["singleQuote"] = 39] = "singleQuote";
    CharacterCodes[CharacterCodes["slash"] = 47] = "slash";
    CharacterCodes[CharacterCodes["tilde"] = 126] = "tilde";
    CharacterCodes[CharacterCodes["backspace"] = 8] = "backspace";
    CharacterCodes[CharacterCodes["formFeed"] = 12] = "formFeed";
    CharacterCodes[CharacterCodes["byteOrderMark"] = 65279] = "byteOrderMark";
    CharacterCodes[CharacterCodes["tab"] = 9] = "tab";
    CharacterCodes[CharacterCodes["verticalTab"] = 11] = "verticalTab";
})(CharacterCodes || (CharacterCodes = {}));
/**
 * For a given offset, evaluate the location in the JSON document. Each segment in the location path is either a property name or an array index.
 */
export function getLocation(text, position) {
    const segments = []; // strings or numbers
    const earlyReturnException = new Object();
    let previousNode = undefined;
    const previousNodeInst = {
        value: {},
        offset: 0,
        length: 0,
        type: 'object',
        parent: undefined
    };
    let isAtPropertyKey = false;
    function setPreviousNode(value, offset, length, type) {
        previousNodeInst.value = value;
        previousNodeInst.offset = offset;
        previousNodeInst.length = length;
        previousNodeInst.type = type;
        previousNodeInst.colonOffset = undefined;
        previousNode = previousNodeInst;
    }
    try {
        visit(text, {
            onObjectBegin: (offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                previousNode = undefined;
                isAtPropertyKey = position > offset;
                segments.push(''); // push a placeholder (will be replaced)
            },
            onObjectProperty: (name, offset, length) => {
                if (position < offset) {
                    throw earlyReturnException;
                }
                setPreviousNode(name, offset, length, 'property');
                segments[segments.length - 1] = name;
                if (position <= offset + length) {
                    throw earlyReturnException;
                }
            },
            onObjectEnd: (offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                previousNode = undefined;
                segments.pop();
            },
            onArrayBegin: (offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                previousNode = undefined;
                segments.push(0);
            },
            onArrayEnd: (offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                previousNode = undefined;
                segments.pop();
            },
            onLiteralValue: (value, offset, length) => {
                if (position < offset) {
                    throw earlyReturnException;
                }
                setPreviousNode(value, offset, length, getNodeType(value));
                if (position <= offset + length) {
                    throw earlyReturnException;
                }
            },
            onSeparator: (sep, offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                if (sep === ':' && previousNode && previousNode.type === 'property') {
                    previousNode.colonOffset = offset;
                    isAtPropertyKey = false;
                    previousNode = undefined;
                }
                else if (sep === ',') {
                    const last = segments[segments.length - 1];
                    if (typeof last === 'number') {
                        segments[segments.length - 1] = last + 1;
                    }
                    else {
                        isAtPropertyKey = true;
                        segments[segments.length - 1] = '';
                    }
                    previousNode = undefined;
                }
            }
        });
    }
    catch (e) {
        if (e !== earlyReturnException) {
            throw e;
        }
    }
    return {
        path: segments,
        previousNode,
        isAtPropertyKey,
        matches: (pattern) => {
            let k = 0;
            for (let i = 0; k < pattern.length && i < segments.length; i++) {
                if (pattern[k] === segments[i] || pattern[k] === '*') {
                    k++;
                }
                else if (pattern[k] !== '**') {
                    return false;
                }
            }
            return k === pattern.length;
        }
    };
}
/**
 * Parses the given text and returns the object the JSON content represents. On invalid input, the parser tries to be as fault tolerant as possible, but still return a result.
 * Therefore always check the errors list to find out if the input was valid.
 */
export function parse(text, errors = [], options = ParseOptions.DEFAULT) {
    let currentProperty = null;
    let currentParent = [];
    const previousParents = [];
    function onValue(value) {
        if (Array.isArray(currentParent)) {
            currentParent.push(value);
        }
        else if (currentProperty !== null) {
            currentParent[currentProperty] = value;
        }
    }
    const visitor = {
        onObjectBegin: () => {
            const object = {};
            onValue(object);
            previousParents.push(currentParent);
            currentParent = object;
            currentProperty = null;
        },
        onObjectProperty: (name) => {
            currentProperty = name;
        },
        onObjectEnd: () => {
            currentParent = previousParents.pop();
        },
        onArrayBegin: () => {
            const array = [];
            onValue(array);
            previousParents.push(currentParent);
            currentParent = array;
            currentProperty = null;
        },
        onArrayEnd: () => {
            currentParent = previousParents.pop();
        },
        onLiteralValue: onValue,
        onError: (error, offset, length) => {
            errors.push({ error, offset, length });
        }
    };
    visit(text, visitor, options);
    return currentParent[0];
}
/**
 * Parses the given text and returns a tree representation the JSON content. On invalid input, the parser tries to be as fault tolerant as possible, but still return a result.
 */
export function parseTree(text, errors = [], options = ParseOptions.DEFAULT) {
    let currentParent = { type: 'array', offset: -1, length: -1, children: [], parent: undefined }; // artificial root
    function ensurePropertyComplete(endOffset) {
        if (currentParent.type === 'property') {
            currentParent.length = endOffset - currentParent.offset;
            currentParent = currentParent.parent;
        }
    }
    function onValue(valueNode) {
        currentParent.children.push(valueNode);
        return valueNode;
    }
    const visitor = {
        onObjectBegin: (offset) => {
            currentParent = onValue({ type: 'object', offset, length: -1, parent: currentParent, children: [] });
        },
        onObjectProperty: (name, offset, length) => {
            currentParent = onValue({ type: 'property', offset, length: -1, parent: currentParent, children: [] });
            currentParent.children.push({ type: 'string', value: name, offset, length, parent: currentParent });
        },
        onObjectEnd: (offset, length) => {
            currentParent.length = offset + length - currentParent.offset;
            currentParent = currentParent.parent;
            ensurePropertyComplete(offset + length);
        },
        onArrayBegin: (offset, length) => {
            currentParent = onValue({ type: 'array', offset, length: -1, parent: currentParent, children: [] });
        },
        onArrayEnd: (offset, length) => {
            currentParent.length = offset + length - currentParent.offset;
            currentParent = currentParent.parent;
            ensurePropertyComplete(offset + length);
        },
        onLiteralValue: (value, offset, length) => {
            onValue({ type: getNodeType(value), offset, length, parent: currentParent, value });
            ensurePropertyComplete(offset + length);
        },
        onSeparator: (sep, offset, length) => {
            if (currentParent.type === 'property') {
                if (sep === ':') {
                    currentParent.colonOffset = offset;
                }
                else if (sep === ',') {
                    ensurePropertyComplete(offset);
                }
            }
        },
        onError: (error, offset, length) => {
            errors.push({ error, offset, length });
        }
    };
    visit(text, visitor, options);
    const result = currentParent.children[0];
    if (result) {
        delete result.parent;
    }
    return result;
}
/**
 * Finds the node at the given path in a JSON DOM.
 */
export function findNodeAtLocation(root, path) {
    if (!root) {
        return undefined;
    }
    let node = root;
    for (const segment of path) {
        if (typeof segment === 'string') {
            if (node.type !== 'object' || !Array.isArray(node.children)) {
                return undefined;
            }
            let found = false;
            for (const propertyNode of node.children) {
                if (Array.isArray(propertyNode.children) && propertyNode.children[0].value === segment) {
                    node = propertyNode.children[1];
                    found = true;
                    break;
                }
            }
            if (!found) {
                return undefined;
            }
        }
        else {
            const index = segment;
            if (node.type !== 'array' || index < 0 || !Array.isArray(node.children) || index >= node.children.length) {
                return undefined;
            }
            node = node.children[index];
        }
    }
    return node;
}
/**
 * Gets the JSON path of the given JSON DOM node
 */
export function getNodePath(node) {
    if (!node.parent || !node.parent.children) {
        return [];
    }
    const path = getNodePath(node.parent);
    if (node.parent.type === 'property') {
        const key = node.parent.children[0].value;
        path.push(key);
    }
    else if (node.parent.type === 'array') {
        const index = node.parent.children.indexOf(node);
        if (index !== -1) {
            path.push(index);
        }
    }
    return path;
}
/**
 * Evaluates the JavaScript object of the given JSON DOM node
 */
export function getNodeValue(node) {
    switch (node.type) {
        case 'array':
            return node.children.map(getNodeValue);
        case 'object': {
            const obj = Object.create(null);
            for (const prop of node.children) {
                const valueNode = prop.children[1];
                if (valueNode) {
                    obj[prop.children[0].value] = getNodeValue(valueNode);
                }
            }
            return obj;
        }
        case 'null':
        case 'string':
        case 'number':
        case 'boolean':
            return node.value;
        default:
            return undefined;
    }
}
export function contains(node, offset, includeRightBound = false) {
    return (offset >= node.offset && offset < (node.offset + node.length)) || includeRightBound && (offset === (node.offset + node.length));
}
/**
 * Finds the most inner node at the given offset. If includeRightBound is set, also finds nodes that end at the given offset.
 */
export function findNodeAtOffset(node, offset, includeRightBound = false) {
    if (contains(node, offset, includeRightBound)) {
        const children = node.children;
        if (Array.isArray(children)) {
            for (let i = 0; i < children.length && children[i].offset <= offset; i++) {
                const item = findNodeAtOffset(children[i], offset, includeRightBound);
                if (item) {
                    return item;
                }
            }
        }
        return node;
    }
    return undefined;
}
/**
 * Parses the given text and invokes the visitor functions for each object, array and literal reached.
 */
export function visit(text, visitor, options = ParseOptions.DEFAULT) {
    const _scanner = createScanner(text, false);
    function toNoArgVisit(visitFunction) {
        return visitFunction ? () => visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength()) : () => true;
    }
    function toOneArgVisit(visitFunction) {
        return visitFunction ? (arg) => visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength()) : () => true;
    }
    const onObjectBegin = toNoArgVisit(visitor.onObjectBegin), onObjectProperty = toOneArgVisit(visitor.onObjectProperty), onObjectEnd = toNoArgVisit(visitor.onObjectEnd), onArrayBegin = toNoArgVisit(visitor.onArrayBegin), onArrayEnd = toNoArgVisit(visitor.onArrayEnd), onLiteralValue = toOneArgVisit(visitor.onLiteralValue), onSeparator = toOneArgVisit(visitor.onSeparator), onComment = toNoArgVisit(visitor.onComment), onError = toOneArgVisit(visitor.onError);
    const disallowComments = options && options.disallowComments;
    const allowTrailingComma = options && options.allowTrailingComma;
    function scanNext() {
        while (true) {
            const token = _scanner.scan();
            switch (_scanner.getTokenError()) {
                case 4 /* ScanError.InvalidUnicode */:
                    handleError(14 /* ParseErrorCode.InvalidUnicode */);
                    break;
                case 5 /* ScanError.InvalidEscapeCharacter */:
                    handleError(15 /* ParseErrorCode.InvalidEscapeCharacter */);
                    break;
                case 3 /* ScanError.UnexpectedEndOfNumber */:
                    handleError(13 /* ParseErrorCode.UnexpectedEndOfNumber */);
                    break;
                case 1 /* ScanError.UnexpectedEndOfComment */:
                    if (!disallowComments) {
                        handleError(11 /* ParseErrorCode.UnexpectedEndOfComment */);
                    }
                    break;
                case 2 /* ScanError.UnexpectedEndOfString */:
                    handleError(12 /* ParseErrorCode.UnexpectedEndOfString */);
                    break;
                case 6 /* ScanError.InvalidCharacter */:
                    handleError(16 /* ParseErrorCode.InvalidCharacter */);
                    break;
            }
            switch (token) {
                case 12 /* SyntaxKind.LineCommentTrivia */:
                case 13 /* SyntaxKind.BlockCommentTrivia */:
                    if (disallowComments) {
                        handleError(10 /* ParseErrorCode.InvalidCommentToken */);
                    }
                    else {
                        onComment();
                    }
                    break;
                case 16 /* SyntaxKind.Unknown */:
                    handleError(1 /* ParseErrorCode.InvalidSymbol */);
                    break;
                case 15 /* SyntaxKind.Trivia */:
                case 14 /* SyntaxKind.LineBreakTrivia */:
                    break;
                default:
                    return token;
            }
        }
    }
    function handleError(error, skipUntilAfter = [], skipUntil = []) {
        onError(error);
        if (skipUntilAfter.length + skipUntil.length > 0) {
            let token = _scanner.getToken();
            while (token !== 17 /* SyntaxKind.EOF */) {
                if (skipUntilAfter.indexOf(token) !== -1) {
                    scanNext();
                    break;
                }
                else if (skipUntil.indexOf(token) !== -1) {
                    break;
                }
                token = scanNext();
            }
        }
    }
    function parseString(isValue) {
        const value = _scanner.getTokenValue();
        if (isValue) {
            onLiteralValue(value);
        }
        else {
            onObjectProperty(value);
        }
        scanNext();
        return true;
    }
    function parseLiteral() {
        switch (_scanner.getToken()) {
            case 11 /* SyntaxKind.NumericLiteral */: {
                let value = 0;
                try {
                    value = JSON.parse(_scanner.getTokenValue());
                    if (typeof value !== 'number') {
                        handleError(2 /* ParseErrorCode.InvalidNumberFormat */);
                        value = 0;
                    }
                }
                catch (e) {
                    handleError(2 /* ParseErrorCode.InvalidNumberFormat */);
                }
                onLiteralValue(value);
                break;
            }
            case 7 /* SyntaxKind.NullKeyword */:
                onLiteralValue(null);
                break;
            case 8 /* SyntaxKind.TrueKeyword */:
                onLiteralValue(true);
                break;
            case 9 /* SyntaxKind.FalseKeyword */:
                onLiteralValue(false);
                break;
            default:
                return false;
        }
        scanNext();
        return true;
    }
    function parseProperty() {
        if (_scanner.getToken() !== 10 /* SyntaxKind.StringLiteral */) {
            handleError(3 /* ParseErrorCode.PropertyNameExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
            return false;
        }
        parseString(false);
        if (_scanner.getToken() === 6 /* SyntaxKind.ColonToken */) {
            onSeparator(':');
            scanNext(); // consume colon
            if (!parseValue()) {
                handleError(4 /* ParseErrorCode.ValueExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
            }
        }
        else {
            handleError(5 /* ParseErrorCode.ColonExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
        }
        return true;
    }
    function parseObject() {
        onObjectBegin();
        scanNext(); // consume open brace
        let needsComma = false;
        while (_scanner.getToken() !== 2 /* SyntaxKind.CloseBraceToken */ && _scanner.getToken() !== 17 /* SyntaxKind.EOF */) {
            if (_scanner.getToken() === 5 /* SyntaxKind.CommaToken */) {
                if (!needsComma) {
                    handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
                }
                onSeparator(',');
                scanNext(); // consume comma
                if (_scanner.getToken() === 2 /* SyntaxKind.CloseBraceToken */ && allowTrailingComma) {
                    break;
                }
            }
            else if (needsComma) {
                handleError(6 /* ParseErrorCode.CommaExpected */, [], []);
            }
            if (!parseProperty()) {
                handleError(4 /* ParseErrorCode.ValueExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
            }
            needsComma = true;
        }
        onObjectEnd();
        if (_scanner.getToken() !== 2 /* SyntaxKind.CloseBraceToken */) {
            handleError(7 /* ParseErrorCode.CloseBraceExpected */, [2 /* SyntaxKind.CloseBraceToken */], []);
        }
        else {
            scanNext(); // consume close brace
        }
        return true;
    }
    function parseArray() {
        onArrayBegin();
        scanNext(); // consume open bracket
        let needsComma = false;
        while (_scanner.getToken() !== 4 /* SyntaxKind.CloseBracketToken */ && _scanner.getToken() !== 17 /* SyntaxKind.EOF */) {
            if (_scanner.getToken() === 5 /* SyntaxKind.CommaToken */) {
                if (!needsComma) {
                    handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
                }
                onSeparator(',');
                scanNext(); // consume comma
                if (_scanner.getToken() === 4 /* SyntaxKind.CloseBracketToken */ && allowTrailingComma) {
                    break;
                }
            }
            else if (needsComma) {
                handleError(6 /* ParseErrorCode.CommaExpected */, [], []);
            }
            if (!parseValue()) {
                handleError(4 /* ParseErrorCode.ValueExpected */, [], [4 /* SyntaxKind.CloseBracketToken */, 5 /* SyntaxKind.CommaToken */]);
            }
            needsComma = true;
        }
        onArrayEnd();
        if (_scanner.getToken() !== 4 /* SyntaxKind.CloseBracketToken */) {
            handleError(8 /* ParseErrorCode.CloseBracketExpected */, [4 /* SyntaxKind.CloseBracketToken */], []);
        }
        else {
            scanNext(); // consume close bracket
        }
        return true;
    }
    function parseValue() {
        switch (_scanner.getToken()) {
            case 3 /* SyntaxKind.OpenBracketToken */:
                return parseArray();
            case 1 /* SyntaxKind.OpenBraceToken */:
                return parseObject();
            case 10 /* SyntaxKind.StringLiteral */:
                return parseString(true);
            default:
                return parseLiteral();
        }
    }
    scanNext();
    if (_scanner.getToken() === 17 /* SyntaxKind.EOF */) {
        if (options.allowEmptyContent) {
            return true;
        }
        handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
        return false;
    }
    if (!parseValue()) {
        handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
        return false;
    }
    if (_scanner.getToken() !== 17 /* SyntaxKind.EOF */) {
        handleError(9 /* ParseErrorCode.EndOfFileExpected */, [], []);
    }
    return true;
}
export function getNodeType(value) {
    switch (typeof value) {
        case 'boolean': return 'boolean';
        case 'number': return 'number';
        case 'string': return 'string';
        case 'object': {
            if (!value) {
                return 'null';
            }
            else if (Array.isArray(value)) {
                return 'array';
            }
            return 'object';
        }
        default: return 'null';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9qc29uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBTixJQUFrQixTQVFqQjtBQVJELFdBQWtCLFNBQVM7SUFDMUIseUNBQVEsQ0FBQTtJQUNSLDZFQUEwQixDQUFBO0lBQzFCLDJFQUF5QixDQUFBO0lBQ3pCLDJFQUF5QixDQUFBO0lBQ3pCLDZEQUFrQixDQUFBO0lBQ2xCLDZFQUEwQixDQUFBO0lBQzFCLGlFQUFvQixDQUFBO0FBQ3JCLENBQUMsRUFSaUIsU0FBUyxLQUFULFNBQVMsUUFRMUI7QUFFRCxNQUFNLENBQU4sSUFBa0IsVUFrQmpCO0FBbEJELFdBQWtCLFVBQVU7SUFDM0IsK0RBQWtCLENBQUE7SUFDbEIsaUVBQW1CLENBQUE7SUFDbkIsbUVBQW9CLENBQUE7SUFDcEIscUVBQXFCLENBQUE7SUFDckIsdURBQWMsQ0FBQTtJQUNkLHVEQUFjLENBQUE7SUFDZCx5REFBZSxDQUFBO0lBQ2YseURBQWUsQ0FBQTtJQUNmLDJEQUFnQixDQUFBO0lBQ2hCLDhEQUFrQixDQUFBO0lBQ2xCLGdFQUFtQixDQUFBO0lBQ25CLHNFQUFzQixDQUFBO0lBQ3RCLHdFQUF1QixDQUFBO0lBQ3ZCLGtFQUFvQixDQUFBO0lBQ3BCLGdEQUFXLENBQUE7SUFDWCxrREFBWSxDQUFBO0lBQ1osMENBQVEsQ0FBQTtBQUNULENBQUMsRUFsQmlCLFVBQVUsS0FBVixVQUFVLFFBa0IzQjtBQWdERCxNQUFNLENBQU4sSUFBa0IsY0FpQmpCO0FBakJELFdBQWtCLGNBQWM7SUFDL0IscUVBQWlCLENBQUE7SUFDakIsaUZBQXVCLENBQUE7SUFDdkIsbUZBQXdCLENBQUE7SUFDeEIscUVBQWlCLENBQUE7SUFDakIscUVBQWlCLENB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