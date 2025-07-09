/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { BlockCommentCommand } from './blockCommentCommand.js';
export var Type;
(function (Type) {
    Type[Type["Toggle"] = 0] = "Toggle";
    Type[Type["ForceAdd"] = 1] = "ForceAdd";
    Type[Type["ForceRemove"] = 2] = "ForceRemove";
})(Type || (Type = {}));
export class LineCommentCommand {
    constructor(languageConfigurationService, selection, indentSize, type, insertSpace, ignoreEmptyLines, ignoreFirstLine) {
        this.languageConfigurationService = languageConfigurationService;
        this._selection = selection;
        this._indentSize = indentSize;
        this._type = type;
        this._insertSpace = insertSpace;
        this._selectionId = null;
        this._deltaColumn = 0;
        this._moveEndPositionDown = false;
        this._ignoreEmptyLines = ignoreEmptyLines;
        this._ignoreFirstLine = ignoreFirstLine || false;
    }
    /**
     * Do an initial pass over the lines and gather info about the line comment string.
     * Returns null if any of the lines doesn't support a line comment string.
     */
    static _gatherPreflightCommentStrings(model, startLineNumber, endLineNumber, languageConfigurationService) {
        model.tokenization.tokenizeIfCheap(startLineNumber);
        const languageId = model.getLanguageIdAtPosition(startLineNumber, 1);
        const config = languageConfigurationService.getLanguageConfiguration(languageId).comments;
        const commentStr = (config ? config.lineCommentToken : null);
        if (!commentStr) {
            // Mode does not support line comments
            return null;
        }
        const lines = [];
        for (let i = 0, lineCount = endLineNumber - startLineNumber + 1; i < lineCount; i++) {
            lines[i] = {
                ignore: false,
                commentStr: commentStr,
                commentStrOffset: 0,
                commentStrLength: commentStr.length
            };
        }
        return lines;
    }
    /**
     * Analyze lines and decide which lines are relevant and what the toggle should do.
     * Also, build up several offsets and lengths useful in the generation of editor operations.
     */
    static _analyzeLines(type, insertSpace, model, lines, startLineNumber, ignoreEmptyLines, ignoreFirstLine, languageConfigurationService) {
        let onlyWhitespaceLines = true;
        let shouldRemoveComments;
        if (type === 0 /* Type.Toggle */) {
            shouldRemoveComments = true;
        }
        else if (type === 1 /* Type.ForceAdd */) {
            shouldRemoveComments = false;
        }
        else {
            shouldRemoveComments = true;
        }
        for (let i = 0, lineCount = lines.length; i < lineCount; i++) {
            const lineData = lines[i];
            const lineNumber = startLineNumber + i;
            if (lineNumber === startLineNumber && ignoreFirstLine) {
                // first line ignored
                lineData.ignore = true;
                continue;
            }
            const lineContent = model.getLineContent(lineNumber);
            const lineContentStartOffset = strings.firstNonWhitespaceIndex(lineContent);
            if (lineContentStartOffset === -1) {
                // Empty or whitespace only line
                lineData.ignore = ignoreEmptyLines;
                lineData.commentStrOffset = lineContent.length;
                continue;
            }
            onlyWhitespaceLines = false;
            lineData.ignore = false;
            lineData.commentStrOffset = lineContentStartOffset;
            if (shouldRemoveComments && !BlockCommentCommand._haystackHasNeedleAtOffset(lineContent, lineData.commentStr, lineContentStartOffset)) {
                if (type === 0 /* Type.Toggle */) {
                    // Every line so far has been a line comment, but this one is not
                    shouldRemoveComments = false;
                }
                else if (type === 1 /* Type.ForceAdd */) {
                    // Will not happen
                }
                else {
                    lineData.ignore = true;
                }
            }
            if (shouldRemoveComments && insertSpace) {
                // Remove a following space if present
                const commentStrEndOffset = lineContentStartOffset + lineData.commentStrLength;
                if (commentStrEndOffset < lineContent.length && lineContent.charCodeAt(commentStrEndOffset) === 32 /* CharCode.Space */) {
                    lineData.commentStrLength += 1;
                }
            }
        }
        if (type === 0 /* Type.Toggle */ && onlyWhitespaceLines) {
            // For only whitespace lines, we insert comments
            shouldRemoveComments = false;
            // Also, no longer ignore them
            for (let i = 0, lineCount = lines.length; i < lineCount; i++) {
                lines[i].ignore = false;
            }
        }
        return {
            supported: true,
            shouldRemoveComments: shouldRemoveComments,
            lines: lines
        };
    }
    /**
     * Analyze all lines and decide exactly what to do => not supported | insert line comments | remove line comments
     */
    static _gatherPreflightData(type, insertSpace, model, startLineNumber, endLineNumber, ignoreEmptyLines, ignoreFirstLine, languageConfigurationService) {
        const lines = LineCommentCommand._gatherPreflightCommentStrings(model, startLineNumber, endLineNumber, languageConfigurationService);
        if (lines === null) {
            return {
                supported: false
            };
        }
        return LineCommentCommand._analyzeLines(type, insertSpace, model, lines, startLineNumber, ignoreEmptyLines, ignoreFirstLine, languageConfigurationService);
    }
    /**
     * Given a successful analysis, execute either insert line comments, either remove line comments
     */
    _executeLineComments(model, builder, data, s) {
        let ops;
        if (data.shouldRemoveComments) {
            ops = LineCommentCommand._createRemoveLineCommentsOperations(data.lines, s.startLineNumber);
        }
        else {
            LineCommentCommand._normalizeInsertionPoint(model, data.lines, s.startLineNumber, this._indentSize);
            ops = this._createAddLineCommentsOperations(data.lines, s.startLineNumber);
        }
        const cursorPosition = new Position(s.positionLineNumber, s.positionColumn);
        for (let i = 0, len = ops.length; i < len; i++) {
            builder.addEditOperation(ops[i].range, ops[i].text);
            if (Range.isEmpty(ops[i].range) && Range.getStartPosition(ops[i].range).equals(cursorPosition)) {
                const lineContent = model.getLineContent(cursorPosition.lineNumber);
                if (lineContent.length + 1 === cursorPosition.column) {
                    this._deltaColumn = (ops[i].text || '').length;
                }
            }
        }
        this._selectionId = builder.trackSelection(s);
    }
    _attemptRemoveBlockComment(model, s, startToken, endToken) {
        let startLineNumber = s.startLineNumber;
        let endLineNumber = s.endLineNumber;
        const startTokenAllowedBeforeColumn = endToken.length + Math.max(model.getLineFirstNonWhitespaceColumn(s.startLineNumber), s.startColumn);
        let startTokenIndex = model.getLineContent(startLineNumber).lastIndexOf(startToken, startTokenAllowedBeforeColumn - 1);
        let endTokenIndex = model.getLineContent(endLineNumber).indexOf(endToken, s.endColumn - 1 - startToken.length);
        if (startTokenIndex !== -1 && endTokenIndex === -1) {
            endTokenIndex = model.getLineContent(startLineNumber).indexOf(endToken, startTokenIndex + startToken.length);
            endLineNumber = startLineNumber;
        }
        if (startTokenIndex === -1 && endTokenIndex !== -1) {
            startTokenIndex = model.getLineContent(endLineNumber).lastIndexOf(startToken, endTokenIndex);
            startLineNumber = endLineNumber;
        }
        if (s.isEmpty() && (startTokenIndex === -1 || endTokenIndex === -1)) {
            startTokenIndex = model.getLineContent(startLineNumber).indexOf(startToken);
            if (startTokenIndex !== -1) {
                endTokenIndex = model.getLineContent(startLineNumber).indexOf(endToken, startTokenIndex + startToken.length);
            }
        }
        // We have to adjust to possible inner white space.
        // For Space after startToken, add Space to startToken - range math will work out.
        if (startTokenIndex !== -1 && model.getLineContent(startLineNumber).charCodeAt(startTokenIndex + startToken.length) === 32 /* CharCode.Space */) {
            startToken += ' ';
        }
        // For Space before endToken, add Space before endToken and shift index one left.
        if (endTokenIndex !== -1 && model.getLineContent(endLineNumber).charCodeAt(endTokenIndex - 1) === 32 /* CharCode.Space */) {
            endToken = ' ' + endToken;
            endTokenIndex -= 1;
        }
        if (startTokenIndex !== -1 && endTokenIndex !== -1) {
            return BlockCommentCommand._createRemoveBlockCommentOperations(new Range(startLineNumber, startTokenIndex + startToken.length + 1, endLineNumber, endTokenIndex + 1), startToken, endToken);
        }
        return null;
    }
    /**
     * Given an unsuccessful analysis, delegate to the block comment command
     */
    _executeBlockComment(model, builder, s) {
        model.tokenization.tokenizeIfCheap(s.startLineNumber);
        const languageId = model.getLanguageIdAtPosition(s.startLineNumber, 1);
        const config = this.languageConfigurationService.getLanguageConfiguration(languageId).comments;
        if (!config || !config.blockCommentStartToken || !config.blockCommentEndToken) {
            // Mode does not support block comments
            return;
        }
        const startToken = config.blockCommentStartToken;
        const endToken = config.blockCommentEndToken;
        let ops = this._attemptRemoveBlockComment(model, s, startToken, endToken);
        if (!ops) {
            if (s.isEmpty()) {
                const lineContent = model.getLineContent(s.startLineNumber);
                let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
                if (firstNonWhitespaceIndex === -1) {
                    // Line is empty or contains only whitespace
                    firstNonWhitespaceIndex = lineContent.length;
                }
                ops = BlockCommentCommand._createAddBlockCommentOperations(new Range(s.startLineNumber, firstNonWhitespaceIndex + 1, s.startLineNumber, lineContent.length + 1), startToken, endToken, this._insertSpace);
            }
            else {
                ops = BlockCommentCommand._createAddBlockCommentOperations(new Range(s.startLineNumber, model.getLineFirstNonWhitespaceColumn(s.startLineNumber), s.endLineNumber, model.getLineMaxColumn(s.endLineNumber)), startToken, endToken, this._insertSpace);
            }
            if (ops.length === 1) {
                // Leave cursor after token and Space
                this._deltaColumn = startToken.length + 1;
            }
        }
        this._selectionId = builder.trackSelection(s);
        for (const op of ops) {
            builder.addEditOperation(op.range, op.text);
        }
    }
    getEditOperations(model, builder) {
        let s = this._selection;
        this._moveEndPositionDown = false;
        if (s.startLineNumber === s.endLineNumber && this._ignoreFirstLine) {
            builder.addEditOperation(new Range(s.startLineNumber, model.getLineMaxColumn(s.startLineNumber), s.startLineNumber + 1, 1), s.startLineNumber === model.getLineCount() ? '' : '\n');
            this._selectionId = builder.trackSelection(s);
            return;
        }
        if (s.startLineNumber < s.endLineNumber && s.endColumn === 1) {
            this._moveEndPositionDown = true;
            s = s.setEndPosition(s.endLineNumber - 1, model.getLineMaxColumn(s.endLineNumber - 1));
        }
        const data = LineCommentCommand._gatherPreflightData(this._type, this._insertSpace, model, s.startLineNumber, s.endLineNumber, this._ignoreEmptyLines, this._ignoreFirstLine, this.languageConfigurationService);
        if (data.supported) {
            return this._executeLineComments(model, builder, data, s);
        }
        return this._executeBlockComment(model, builder, s);
    }
    computeCursorState(model, helper) {
        let result = helper.getTrackedSelection(this._selectionId);
        if (this._moveEndPositionDown) {
            result = result.setEndPosition(result.endLineNumber + 1, 1);
        }
        return new Selection(result.selectionStartLineNumber, result.selectionStartColumn + this._deltaColumn, result.positionLineNumber, result.positionColumn + this._deltaColumn);
    }
    /**
     * Generate edit operations in the remove line comment case
     */
    static _createRemoveLineCommentsOperations(lines, startLineNumber) {
        const res = [];
        for (let i = 0, len = lines.length; i < len; i++) {
            const lineData = lines[i];
            if (lineData.ignore) {
                continue;
            }
            res.push(EditOperation.delete(new Range(startLineNumber + i, lineData.commentStrOffset + 1, startLineNumber + i, lineData.commentStrOffset + lineData.commentStrLength + 1)));
        }
        return res;
    }
    /**
     * Generate edit operations in the add line comment case
     */
    _createAddLineCommentsOperations(lines, startLineNumber) {
        const res = [];
        const afterCommentStr = this._insertSpace ? ' ' : '';
        for (let i = 0, len = lines.length; i < len; i++) {
            const lineData = lines[i];
            if (lineData.ignore) {
                continue;
            }
            res.push(EditOperation.insert(new Position(startLineNumber + i, lineData.commentStrOffset + 1), lineData.commentStr + afterCommentStr));
        }
        return res;
    }
    static nextVisibleColumn(currentVisibleColumn, indentSize, isTab, columnSize) {
        if (isTab) {
            return currentVisibleColumn + (indentSize - (currentVisibleColumn % indentSize));
        }
        return currentVisibleColumn + columnSize;
    }
    /**
     * Adjust insertion points to have them vertically aligned in the add line comment case
     */
    static _normalizeInsertionPoint(model, lines, startLineNumber, indentSize) {
        let minVisibleColumn = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        let j;
        let lenJ;
        for (let i = 0, len = lines.length; i < len; i++) {
            if (lines[i].ignore) {
                continue;
            }
            const lineContent = model.getLineContent(startLineNumber + i);
            let currentVisibleColumn = 0;
            for (let j = 0, lenJ = lines[i].commentStrOffset; currentVisibleColumn < minVisibleColumn && j < lenJ; j++) {
                currentVisibleColumn = LineCommentCommand.nextVisibleColumn(currentVisibleColumn, indentSize, lineContent.charCodeAt(j) === 9 /* CharCode.Tab */, 1);
            }
            if (currentVisibleColumn < minVisibleColumn) {
                minVisibleColumn = currentVisibleColumn;
            }
        }
        minVisibleColumn = Math.floor(minVisibleColumn / indentSize) * indentSize;
        for (let i = 0, len = lines.length; i < len; i++) {
            if (lines[i].ignore) {
                continue;
            }
            const lineContent = model.getLineContent(startLineNumber + i);
            let currentVisibleColumn = 0;
            for (j = 0, lenJ = lines[i].commentStrOffset; currentVisibleColumn < minVisibleColumn && j < lenJ; j++) {
                currentVisibleColumn = LineCommentCommand.nextVisibleColumn(currentVisibleColumn, indentSize, lineContent.charCodeAt(j) === 9 /* CharCode.Tab */, 1);
            }
            if (currentVisibleColumn > minVisibleColumn) {
                lines[i].commentStrOffset = j - 1;
            }
            else {
                lines[i].commentStrOffset = j;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUNvbW1lbnRDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbW1lbnQvYnJvd3Nlci9saW5lQ29tbWVudENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHVDQUF1QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSTlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBNEIvRCxNQUFNLENBQU4sSUFBa0IsSUFJakI7QUFKRCxXQUFrQixJQUFJO0lBQ3JCLG1DQUFVLENBQUE7SUFDVix1Q0FBWSxDQUFBO0lBQ1osNkNBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSmlCLElBQUksS0FBSixJQUFJLFFBSXJCO0FBRUQsTUFBTSxPQUFPLGtCQUFrQjtJQVk5QixZQUNrQiw0QkFBMkQsRUFDNUUsU0FBb0IsRUFDcEIsVUFBa0IsRUFDbEIsSUFBVSxFQUNWLFdBQW9CLEVBQ3BCLGdCQUF5QixFQUN6QixlQUF5QjtRQU5SLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFRNUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFDNUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7UUFDOUIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFX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