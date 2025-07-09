/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ShiftCommand_1;
import * as strings from '../../../base/common/strings.js';
import { CursorColumns } from '../core/cursorColumns.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
import { getEnterAction } from '../languages/enterAction.js';
import { ILanguageConfigurationService } from '../languages/languageConfigurationRegistry.js';
const repeatCache = Object.create(null);
function cachedStringRepeat(str, count) {
    if (count <= 0) {
        return '';
    }
    if (!repeatCache[str]) {
        repeatCache[str] = ['', str];
    }
    const cache = repeatCache[str];
    for (let i = cache.length; i <= count; i++) {
        cache[i] = cache[i - 1] + str;
    }
    return cache[count];
}
let ShiftCommand = ShiftCommand_1 = class ShiftCommand {
    static unshiftIndent(line, column, tabSize, indentSize, insertSpaces) {
        // Determine the visible column where the content starts
        const contentStartVisibleColumn = CursorColumns.visibleColumnFromColumn(line, column, tabSize);
        if (insertSpaces) {
            const indent = cachedStringRepeat(' ', indentSize);
            const desiredTabStop = CursorColumns.prevIndentTabStop(contentStartVisibleColumn, indentSize);
            const indentCount = desiredTabStop / indentSize; // will be an integer
            return cachedStringRepeat(indent, indentCount);
        }
        else {
            const indent = '\t';
            const desiredTabStop = CursorColumns.prevRenderTabStop(contentStartVisibleColumn, tabSize);
            const indentCount = desiredTabStop / tabSize; // will be an integer
            return cachedStringRepeat(indent, indentCount);
        }
    }
    static shiftIndent(line, column, tabSize, indentSize, insertSpaces) {
        // Determine the visible column where the content starts
        const contentStartVisibleColumn = CursorColumns.visibleColumnFromColumn(line, column, tabSize);
        if (insertSpaces) {
            const indent = cachedStringRepeat(' ', indentSize);
            const desiredTabStop = CursorColumns.nextIndentTabStop(contentStartVisibleColumn, indentSize);
            const indentCount = desiredTabStop / indentSize; // will be an integer
            return cachedStringRepeat(indent, indentCount);
        }
        else {
            const indent = '\t';
            const desiredTabStop = CursorColumns.nextRenderTabStop(contentStartVisibleColumn, tabSize);
            const indentCount = desiredTabStop / tabSize; // will be an integer
            return cachedStringRepeat(indent, indentCount);
        }
    }
    constructor(range, opts, _languageConfigurationService) {
        this._languageConfigurationService = _languageConfigurationService;
        this._opts = opts;
        this._selection = range;
        this._selectionId = null;
        this._useLastEditRangeForCursorEndPosition = false;
        this._selectionStartColumnStaysPut = false;
    }
    _addEditOperation(builder, range, text) {
        if (this._useLastEditRangeForCursorEndPosition) {
            builder.addTrackedEditOperation(range, text);
        }
        else {
            builder.addEditOperation(range, text);
        }
    }
    getEditOperations(model, builder) {
        const startLine = this._selection.startLineNumber;
        let endLine = this._selection.endLineNumber;
        if (this._selection.endColumn === 1 && startLine !== endLine) {
            endLine = endLine - 1;
        }
        const { tabSize, indentSize, insertSpaces } = this._opts;
        const shouldIndentEmptyLines = (startLine === endLine);
        if (this._opts.useTabStops) {
            // if indenting or outdenting on a whitespace only line
            if (this._selection.isEmpty()) {
                if (/^\s*$/.test(model.getLineContent(startLine))) {
                    this._useLastEditRangeForCursorEndPosition = true;
                }
            }
            // keep track of previous line's "miss-alignment"
            let previousLineExtraSpaces = 0, extraSpaces = 0;
            for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++, previousLineExtraSpaces = extraSpaces) {
                extraSpaces = 0;
                const lineText = model.getLineContent(lineNumber);
                let indentationEndIndex = strings.firstNonWhitespaceIndex(lineText);
                if (this._opts.isUnshift && (lineText.length === 0 || indentationEndIndex === 0)) {
                    // empty line or line with no leading whitespace => nothing to do
                    continue;
                }
                if (!shouldIndentEmptyLines && !this._opts.isUnshift && lineText.length === 0) {
                    // do not indent empty lines => nothing to do
                    continue;
                }
                if (indentationEndIndex === -1) {
                    // the entire line is whitespace
                    indentationEndIndex = lineText.length;
                }
                if (lineNumber > 1) {
                    const contentStartVisibleColumn = CursorColumns.visibleColumnFromColumn(lineText, indentationEndIndex + 1, tabSize);
                    if (contentStartVisibleColumn % indentSize !== 0) {
                        // The current line is "miss-aligned", so let's see if this is expected...
                        // This can only happen when it has trailing commas in the indent
                        if (model.tokenization.isCheapToTokenize(lineNumber - 1)) {
                            const enterAction = getEnterAction(this._opts.autoIndent, model, new Range(lineNumber - 1, model.getLineMaxColumn(lineNumber - 1), lineNumber - 1, model.getLineMaxColumn(lineNumber - 1)), this._languageConfigurationService);
                            if (enterAction) {
                                extraSpaces = previousLineExtraSpaces;
                                if (enterAction.appendText) {
                                    for (let j = 0, lenJ = enterAction.appendText.length; j < lenJ && extraSpaces < indentSize; j++) {
                                        if (enterAction.appendText.charCodeAt(j) === 32 /* CharCode.Space */) {
                                            extraSpaces++;
                                        }
                                        else {
                                            break;
                                        }
                                    }
                                }
                                if (enterAction.removeText) {
                                    extraSpaces = Math.max(0, extraSpaces - enterAction.removeText);
                                }
                                // Act as if `prefixSpaces` is not part of the indentation
                                for (let j = 0; j < extraSpaces; j++) {
                                    if (indentationEndIndex === 0 || lineText.charCodeAt(indentationEndIndex - 1) !== 32 /* CharCode.Space */) {
                                        break;
                                    }
                                    indentationEndIndex--;
                                }
                            }
                        }
                    }
                }
                if (this._opts.isUnshift && indentationEndIndex === 0) {
                    // line with no leading whitespace => nothing to do
                    continue;
                }
                let desiredIndent;
                if (this._opts.isUnshift) {
                    desiredIndent = ShiftCommand_1.unshiftIndent(lineText, indentationEndIndex + 1, tabSize, indentSize, insertSpaces);
                }
                else {
                    desiredIndent = ShiftCommand_1.shiftIndent(lineText, indentationEndIndex + 1, tabSize, indentSize, insertSpaces);
                }
                this._addEditOperation(builder, new Range(lineNumber, 1, lineNumber, indentationEndIndex + 1), desiredIndent);
                if (lineNumber === startLine && !this._selection.isEmpty()) {
                    // Force the startColumn to stay put because we're inserting after it
                    this._selectionStartColumnStaysPut = (this._selection.startColumn <= indentationEndIndex + 1);
                }
            }
        }
        else {
            // if indenting or outdenting on a whitespace only line
            if (!this._opts.isUnshift && this._selection.isEmpty() && model.getLineLength(startLine) === 0) {
                this._useLastEditRangeForCursorEndPosition = true;
            }
            const oneIndent = (insertSpaces ? cachedStringRepeat(' ', indentSize) : '\t');
            for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
                const lineText = model.getLineContent(lineNumber);
                let indentationEndIndex = strings.firstNonWhitespaceIndex(lineText);
                if (this._opts.isUnshift && (lineText.length === 0 || indentationEndIndex === 0)) {
                    // empty line or line with no leading whitespace => nothing to do
                    continue;
                }
                if (!shouldIndentEmptyLines && !this._opts.isUnshift && lineText.length === 0) {
                    // do not indent empty lines => nothing to do
                    continue;
                }
                if (indentationEndIndex === -1) {
                    // the entire line is whitespace
                    indentationEndIndex = lineText.length;
                }
                if (this._opts.isUnshift && indentationEndIndex === 0) {
                    // line with no leading whitespace => nothing to do
                    continue;
                }
                if (this._opts.isUnshift) {
                    indentationEndIndex = Math.min(indentationEndIndex, indentSize);
                    for (let i = 0; i < indentationEndIndex; i++) {
                        const chr = lineText.charCodeAt(i);
                        if (chr === 9 /* CharCode.Tab */) {
                            indentationEndIndex = i + 1;
                            break;
                        }
                    }
                    this._addEditOperation(builder, new Range(lineNumber, 1, lineNumber, indentationEndIndex + 1), '');
                }
                else {
                    this._addEditOperation(builder, new Range(lineNumber, 1, lineNumber, 1), oneIndent);
                    if (lineNumber === startLine && !this._selection.isEmpty()) {
                        // Force the startColumn to stay put because we're inserting after it
                        this._selectionStartColumnStaysPut = (this._selection.startColumn === 1);
                    }
                }
            }
        }
        this._selectionId = builder.trackSelection(this._selection);
    }
    computeCursorState(model, helper) {
        if (this._useLastEditRangeForCursorEndPosition) {
            const lastOp = helper.getInverseEditOperations()[0];
            return new Selection(lastOp.range.endLineNumber, lastOp.range.endColumn, lastOp.range.endLineNumber, lastOp.range.endColumn);
        }
        const result = helper.getTrackedSelection(this._selectionId);
        if (this._selectionStartColumnStaysPut) {
            // The selection start should not move
            const initialStartColumn = this._selection.startColumn;
            const resultStartColumn = result.startColumn;
            if (resultStartColumn <= initialStartColumn) {
                return result;
            }
            if (result.getDirection() === 0 /* SelectionDirection.LTR */) {
                return new Selection(result.startLineNumber, initialStartColumn, result.endLineNumber, result.endColumn);
            }
            return new Selection(result.endLineNumber, result.endColumn, result.startLineNumber, initialStartColumn);
        }
        return result;
    }
};
ShiftCommand = ShiftCommand_1 = __decorate([
    __param(2, ILanguageConfigurationService)
], ShiftCommand);
export { ShiftCommand };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpZnRDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29tbWFuZHMvc2hpZnRDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxzQkFBc0IsQ0FBQztBQUlyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDN0QsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFXOUYsTUFBTSxXQUFXLEdBQWdDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckUsU0FBUyxrQkFBa0IsQ0FBQyxHQUFXLEVBQUUsS0FBYTtJQUNyRCxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNoQixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDdkIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFDRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM1QyxLQUFLLENB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