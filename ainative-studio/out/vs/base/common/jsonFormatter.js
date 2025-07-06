/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createScanner } from './json.js';
export function format(documentText, range, options) {
    let initialIndentLevel;
    let formatText;
    let formatTextStart;
    let rangeStart;
    let rangeEnd;
    if (range) {
        rangeStart = range.offset;
        rangeEnd = rangeStart + range.length;
        formatTextStart = rangeStart;
        while (formatTextStart > 0 && !isEOL(documentText, formatTextStart - 1)) {
            formatTextStart--;
        }
        let endOffset = rangeEnd;
        while (endOffset < documentText.length && !isEOL(documentText, endOffset)) {
            endOffset++;
        }
        formatText = documentText.substring(formatTextStart, endOffset);
        initialIndentLevel = computeIndentLevel(formatText, options);
    }
    else {
        formatText = documentText;
        initialIndentLevel = 0;
        formatTextStart = 0;
        rangeStart = 0;
        rangeEnd = documentText.length;
    }
    const eol = getEOL(options, documentText);
    let lineBreak = false;
    let indentLevel = 0;
    let indentValue;
    if (options.insertSpaces) {
        indentValue = repeat(' ', options.tabSize || 4);
    }
    else {
        indentValue = '\t';
    }
    const scanner = createScanner(formatText, false);
    let hasError = false;
    function newLineAndIndent() {
        return eol + repeat(indentValue, initialIndentLevel + indentLevel);
    }
    function scanNext() {
        let token = scanner.scan();
        lineBreak = false;
        while (token === 15 /* SyntaxKind.Trivia */ || token === 14 /* SyntaxKind.LineBreakTrivia */) {
            lineBreak = lineBreak || (token === 14 /* SyntaxKind.LineBreakTrivia */);
            token = scanner.scan();
        }
        hasError = token === 16 /* SyntaxKind.Unknown */ || scanner.getTokenError() !== 0 /* ScanError.None */;
        return token;
    }
    const editOperations = [];
    function addEdit(text, startOffset, endOffset) {
        if (!hasError && startOffset < rangeEnd && endOffset > rangeStart && documentText.substring(startOffset, endOffset) !== text) {
            editOperations.push({ offset: startOffset, length: endOffset - startOffset, content: text });
        }
    }
    let firstToken = scanNext();
    if (firstToken !== 17 /* SyntaxKind.EOF */) {
        const firstTokenStart = scanner.getTokenOffset() + formatTextStart;
        const initialIndent = repeat(indentValue, initialIndentLevel);
        addEdit(initialIndent, formatTextStart, firstTokenStart);
    }
    while (firstToken !== 17 /* SyntaxKind.EOF */) {
        let firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
        let secondToken = scanNext();
        let replaceContent = '';
        while (!lineBreak && (secondToken === 12 /* SyntaxKind.LineCommentTrivia */ || secondToken === 13 /* SyntaxKind.BlockCommentTrivia */)) {
            // comments on the same line: keep them on the same line, but ignore them otherwise
            const commentTokenStart = scanner.getTokenOffset() + formatTextStart;
            addEdit(' ', firstTokenEnd, commentTokenStart);
            firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
            replaceContent = secondToken === 12 /* SyntaxKind.LineCommentTrivia */ ? newLineAndIndent() : '';
            secondToken = scanNext();
        }
        if (secondToken === 2 /* SyntaxKind.CloseBraceToken */) {
            if (firstToken !== 1 /* SyntaxKind.OpenBraceToken */) {
                indentLevel--;
                replaceContent = newLineAndIndent();
            }
        }
        else if (secondToken === 4 /* SyntaxKind.CloseBracketToken */) {
            if (firstToken !== 3 /* SyntaxKind.OpenBracketToken */) {
                indentLevel--;
                replaceContent = newLineAndIndent();
            }
        }
        else {
            switch (firstToken) {
                case 3 /* SyntaxKind.OpenBracketToken */:
                case 1 /* SyntaxKind.OpenBraceToken */:
                    indentLevel++;
                    replaceContent = newLineAndIndent();
                    break;
                case 5 /* SyntaxKind.CommaToken */:
                case 12 /* SyntaxKind.LineCommentTrivia */:
                    replaceContent = newLineAndIndent();
                    break;
                case 13 /* SyntaxKind.BlockCommentTrivia */:
                    if (lineBreak) {
                        replaceContent = newLineAndIndent();
                    }
                    else {
                        // symbol following comment on the same line: keep on same line, separate with ' '
                        replaceContent = ' ';
                    }
                    break;
                case 6 /* SyntaxKind.ColonToken */:
                    replaceContent = ' ';
                    break;
                case 10 /* SyntaxKind.StringLiteral */:
                    if (secondToken === 6 /* SyntaxKind.ColonToken */) {
                        replaceContent = '';
                        break;
                    }
                // fall through
                case 7 /* SyntaxKind.NullKeyword */:
                case 8 /* SyntaxKind.TrueKeyword */:
                case 9 /* SyntaxKind.FalseKeyword */:
                case 11 /* SyntaxKind.NumericLiteral */:
                case 2 /* SyntaxKind.CloseBraceToken */:
                case 4 /* SyntaxKind.CloseBracketToken */:
                    if (secondToken === 12 /* SyntaxKind.LineCommentTrivia */ || secondToken === 13 /* SyntaxKind.BlockCommentTrivia */) {
                        replaceContent = ' ';
                    }
                    else if (secondToken !== 5 /* SyntaxKind.CommaToken */ && secondToken !== 17 /* SyntaxKind.EOF */) {
                        hasError = true;
                    }
                    break;
                case 16 /* SyntaxKind.Unknown */:
                    hasError = true;
                    break;
            }
            if (lineBreak && (secondToken === 12 /* SyntaxKind.LineCommentTrivia */ || secondToken === 13 /* SyntaxKind.BlockCommentTrivia */)) {
                replaceContent = newLineAndIndent();
            }
        }
        const secondTokenStart = scanner.getTokenOffset() + formatTextStart;
        addEdit(replaceContent, firstTokenEnd, secondTokenStart);
        firstToken = secondToken;
    }
    return editOperations;
}
/**
 * Creates a formatted string out of the object passed as argument, using the given formatting options
 * @param any The object to stringify and format
 * @param options The formatting options to use
 */
export function toFormattedString(obj, options) {
    const content = JSON.stringify(obj, undefined, options.insertSpaces ? options.tabSize || 4 : '\t');
    if (options.eol !== undefined) {
        return content.replace(/\r\n|\r|\n/g, options.eol);
    }
    return content;
}
function repeat(s, count) {
    let result = '';
    for (let i = 0; i < count; i++) {
        result += s;
    }
    return result;
}
function computeIndentLevel(content, options) {
    let i = 0;
    let nChars = 0;
    const tabSize = options.tabSize || 4;
    while (i < content.length) {
        const ch = content.charAt(i);
        if (ch === ' ') {
            nChars++;
        }
        else if (ch === '\t') {
            nChars += tabSize;
        }
        else {
            break;
        }
        i++;
    }
    return Math.floor(nChars / tabSize);
}
export function getEOL(options, text) {
    for (let i = 0; i < text.length; i++) {
        const ch = text.charAt(i);
        if (ch === '\r') {
            if (i + 1 < text.length && text.charAt(i + 1) === '\n') {
                return '\r\n';
            }
            return '\r';
        }
        else if (ch === '\n') {
            return '\n';
        }
    }
    return (options && options.eol) || '\n';
}
export function isEOL(text, offset) {
    return '\r\n'.indexOf(text.charAt(offset)) !== -1;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkZvcm1hdHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vanNvbkZvcm1hdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUF5QixNQUFNLFdBQVcsQ0FBQztBQWtEakUsTUFBTSxVQUFVLE1BQU0sQ0FBQyxZQUFvQixFQUFFLEtBQXdCLEVBQUUsT0FBMEI7SUFDaEcsSUFBSSxrQkFBMEIsQ0FBQztJQUMvQixJQUFJLFVBQWtCLENBQUM7SUFDdkIsSUFBSSxlQUF1QixDQUFDO0lBQzVCLElBQUksVUFBa0IsQ0FBQztJQUN2QixJQUFJLFFBQWdCLENBQUM7SUFDckIsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQzFCLFFBQVEsR0FBRyxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUVyQyxlQUFlLEdBQUcsVUFBVSxDQUFDO1FBQzdCLE9BQU8sZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsZUFBZSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDekUsZUFBZSxFQUFFLENBQUM7UUFDbkIsQ0FBQztRQUNELElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUN6QixPQUFPLFNBQVMsR0FBRyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzNFLFNBQVMsRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUNELFVBQVUsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNoRSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FB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