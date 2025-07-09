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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkZvcm1hdHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9qc29uRm9ybWF0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQXlCLE1BQU0sV0FBVyxDQUFDO0FBa0RqRSxNQUFNLFVBQVUsTUFBTSxDQUFDLFlBQW9CLEVBQUUsS0FBd0IsRUFBRSxPQUEwQjtJQUNoRyxJQUFJLGtCQUEwQixDQUFDO0lBQy9CLElBQUksVUFBa0IsQ0FBQztJQUN2QixJQUFJLGVBQXVCLENBQUM7SUFDNUIsSUFBSSxVQUFrQixDQUFDO0lBQ3ZCLElBQUksUUFBZ0IsQ0FBQztJQUNyQixJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ1gsVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDMUIsUUFBUSxHQUFHLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBRXJDLGVBQWUsR0FBRyxVQUFVLENBQUM7UUFDN0IsT0FBTyxlQUFlLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxlQUFlLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN6RSxlQUFlLEVBQUUsQ0FBQztRQUNuQixDQUFDO1FBQ0QsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLE9BQU8sU0FBUyxHQUFHLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDM0UsU0FBUyxFQUFFLENBQUM7UUFDYixDQUFDO1FBQ0QsVUFBVSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2hFLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLFVB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