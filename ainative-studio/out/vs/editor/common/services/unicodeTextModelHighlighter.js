/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../core/range.js';
import { Searcher } from '../model/textModelSearch.js';
import * as strings from '../../../base/common/strings.js';
import { assertNever } from '../../../base/common/assert.js';
import { DEFAULT_WORD_REGEXP, getWordAtText } from '../core/wordHelper.js';
export class UnicodeTextModelHighlighter {
    static computeUnicodeHighlights(model, options, range) {
        const startLine = range ? range.startLineNumber : 1;
        const endLine = range ? range.endLineNumber : model.getLineCount();
        const codePointHighlighter = new CodePointHighlighter(options);
        const candidates = codePointHighlighter.getCandidateCodePoints();
        let regex;
        if (candidates === 'allNonBasicAscii') {
            regex = new RegExp('[^\\t\\n\\r\\x20-\\x7E]', 'g');
        }
        else {
            regex = new RegExp(`${buildRegExpCharClassExpr(Array.from(candidates))}`, 'g');
        }
        const searcher = new Searcher(null, regex);
        const ranges = [];
        let hasMore = false;
        let m;
        let ambiguousCharacterCount = 0;
        let invisibleCharacterCount = 0;
        let nonBasicAsciiCharacterCount = 0;
        forLoop: for (let lineNumber = startLine, lineCount = endLine; lineNumber <= lineCount; lineNumber++) {
            const lineContent = model.getLineContent(lineNumber);
            const lineLength = lineContent.length;
            // Reset regex to search from the beginning
            searcher.reset(0);
            do {
                m = searcher.next(lineContent);
                if (m) {
                    let startIndex = m.index;
                    let endIndex = m.index + m[0].length;
                    // Extend range to entire code point
                    if (startIndex > 0) {
                        const charCodeBefore = lineContent.charCodeAt(startIndex - 1);
                        if (strings.isHighSurrogate(charCodeBefore)) {
                            startIndex--;
                        }
                    }
                    if (endIndex + 1 < lineLength) {
                        const charCodeBefore = lineContent.charCodeAt(endIndex - 1);
                        if (strings.isHighSurrogate(charCodeBefore)) {
                            endIndex++;
                        }
                    }
                    const str = lineContent.substring(startIndex, endIndex);
                    let word = getWordAtText(startIndex + 1, DEFAULT_WORD_REGEXP, lineContent, 0);
                    if (word && word.endColumn <= startIndex + 1) {
                        // The word does not include the problematic character, ignore the word
                        word = null;
                    }
                    const highlightReason = codePointHighlighter.shouldHighlightNonBasicASCII(str, word ? word.word : null);
                    if (highlightReason !== 0 /* SimpleHighlightReason.None */) {
                        if (highlightReason === 3 /* SimpleHighlightReason.Ambiguous */) {
                            ambiguousCharacterCount++;
                        }
                        else if (highlightReason === 2 /* SimpleHighlightReason.Invisible */) {
                            invisibleCharacterCount++;
                        }
                        else if (highlightReason === 1 /* SimpleHighlightReason.NonBasicASCII */) {
                            nonBasicAsciiCharacterCount++;
                        }
                        else {
                            assertNever(highlightReason);
                        }
                        const MAX_RESULT_LENGTH = 1000;
                        if (ranges.length >= MAX_RESULT_LENGTH) {
                            hasMore = true;
                            break forLoop;
                        }
                        ranges.push(new Range(lineNumber, startIndex + 1, lineNumber, endIndex + 1));
                    }
                }
            } while (m);
        }
        return {
            ranges,
            hasMore,
            ambiguousCharacterCount,
            invisibleCharacterCount,
            nonBasicAsciiCharacterCount
        };
    }
    static computeUnicodeHighlightReason(char, options) {
        const codePointHighlighter = new CodePointHighlighter(options);
        const reason = codePointHighlighter.shouldHighlightNonBasicASCII(char, null);
        switch (reason) {
            case 0 /* SimpleHighlightReason.None */:
                return null;
            case 2 /* SimpleHighlightReason.Invisible */:
                return { kind: 1 /* UnicodeHighlighterReasonKind.Invisible */ };
            case 3 /* SimpleHighlightReason.Ambiguous */: {
                const codePoint = char.codePointAt(0);
                const primaryConfusable = codePointHighlighter.ambiguousCharacters.getPrimaryConfusable(codePoint);
                const notAmbiguousInLocales = strings.AmbiguousCharacters.getLocales().filter((l) => !strings.AmbiguousCharacters.getInstance(new Set([...options.allowedLocales, l])).isAmbiguous(codePoint));
                return { kind: 0 /* UnicodeHighlighterReasonKind.Ambiguous */, confusableWith: String.fromCodePoint(primaryConfusable), notAmbiguousInLocales };
            }
            case 1 /* SimpleHighlightReason.NonBasicASCII */:
                return { kind: 2 /* UnicodeHighlighterReasonKind.NonBasicAscii */ };
        }
    }
}
function buildRegExpCharClassExpr(codePoints, flags) {
    const src = `[${strings.escapeRegExpCharacters(codePoints.map((i) => String.fromCodePoint(i)).join(''))}]`;
    return src;
}
export var UnicodeHighlighterReasonKind;
(function (UnicodeHighlighterReasonKind) {
    UnicodeHighlighterReasonKind[UnicodeHighlighterReasonKind["Ambiguous"] = 0] = "Ambiguous";
    UnicodeHighlighterReasonKind[UnicodeHighlighterReasonKind["Invisible"] = 1] = "Invisible";
    UnicodeHighlighterReasonKind[UnicodeHighlighterReasonKind["NonBasicAscii"] = 2] = "NonBasicAscii";
})(UnicodeHighlighterReasonKind || (UnicodeHighlighterReasonKind = {}));
class CodePointHighlighter {
    constructor(options) {
        this.options = options;
        this.allowedCodePoints = new Set(options.allowedCodePoints);
        this.ambiguousCharacters = strings.AmbiguousCharacters.getInstance(new Set(options.allowedLocales));
    }
    getCandidateCodePoints() {
        if (this.options.nonBasicASCII) {
            return 'allNonBasicAscii';
        }
        const set = new Set();
        if (this.options.invisibleCharacters) {
            for (const cp of strings.InvisibleCharacters.codePoints) {
                if (!isAllowedInvisibleCharacter(String.fromCodePoint(cp))) {
                    set.add(cp);
                }
            }
        }
        if (this.options.ambiguousCharacters) {
            for (const cp of this.ambiguousCharacters.getConfusableCodePoints()) {
                set.add(cp);
            }
        }
        for (const cp of this.allowedCodePoints) {
            set.delete(cp);
        }
        return set;
    }
    shouldHighlightNonBasicASCII(character, wordContext) {
        const codePoint = character.codePointAt(0);
        if (this.allowedCodePoints.has(codePoint)) {
            return 0 /* SimpleHighlightReason.None */;
        }
        if (this.options.nonBasicASCII) {
            return 1 /* SimpleHighlightReason.NonBasicASCII */;
        }
        let hasBasicASCIICharacters = false;
        let hasNonConfusableNonBasicAsciiCharacter = false;
        if (wordContext) {
            for (const char of wordContext) {
                const codePoint = char.codePointAt(0);
                const isBasicASCII = strings.isBasicASCII(char);
                hasBasicASCIICharacters = hasBasicASCIICharacters || isBasicASCII;
                if (!isBasicASCII &&
                    !this.ambiguousCharacters.isAmbiguous(codePoint) &&
                    !strings.InvisibleCharacters.isInvisibleCharacter(codePoint)) {
                    hasNonConfusableNonBasicAsciiCharacter = true;
                }
            }
        }
        if (
        /* Don't allow mixing weird looking characters with ASCII */ !hasBasicASCIICharacters &&
            /* Is there an obviously weird looking character? */ hasNonConfusableNonBasicAsciiCharacter) {
            return 0 /* SimpleHighlightReason.None */;
        }
        if (this.options.invisibleCharacters) {
            // TODO check for emojis
            if (!isAllowedInvisibleCharacter(character) && strings.InvisibleCharacters.isInvisibleCharacter(codePoint)) {
                return 2 /* SimpleHighlightReason.Invisible */;
            }
        }
        if (this.options.ambiguousCharacters) {
            if (this.ambiguousCharacters.isAmbiguous(codePoint)) {
                return 3 /* SimpleHighlightReason.Ambiguous */;
            }
        }
        return 0 /* SimpleHighlightReason.None */;
    }
}
function isAllowedInvisibleCharacter(character) {
    return character === ' ' || character === '\n' || character === '\t';
}
var SimpleHighlightReason;
(function (SimpleHighlightReason) {
    SimpleHighlightReason[SimpleHighlightReason["None"] = 0] = "None";
    SimpleHighlightReason[SimpleHighlightReason["NonBasicASCII"] = 1] = "NonBasicASCII";
    SimpleHighlightReason[SimpleHighlightReason["Invisible"] = 2] = "Invisible";
    SimpleHighlightReason[SimpleHighlightReason["Ambiguous"] = 3] = "Ambiguous";
})(SimpleHighlightReason || (SimpleHighlightReason = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pY29kZVRleHRNb2RlbEhpZ2hsaWdodGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdW5pY29kZVRleHRNb2RlbEhpZ2hsaWdodGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUUzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTNFLE1BQU0sT0FBTywyQkFBMkI7SUFDaEMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEtBQXNDLEVBQUUsT0FBa0MsRUFBRSxLQUFjO1FBQ2hJLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRW5FLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUvRCxNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQ2pFLElBQUksS0FBYSxDQUFDO1FBQ2xCLElBQUksVUFBVSxLQUFLLGtCQUFrQixFQUFFLENBQUM7WUFDdkMsS0FBSyxHQUFHLElB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