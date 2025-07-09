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
import * as strings from '../../../../base/common/strings.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { IndentAction } from '../../../common/languages/languageConfiguration.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import * as indentUtils from '../../indentation/common/indentUtils.js';
import { getGoodIndentForLine, getIndentMetadata } from '../../../common/languages/autoIndent.js';
import { getEnterAction } from '../../../common/languages/enterAction.js';
let MoveLinesCommand = class MoveLinesCommand {
    constructor(selection, isMovingDown, autoIndent, _languageConfigurationService) {
        this._languageConfigurationService = _languageConfigurationService;
        this._selection = selection;
        this._isMovingDown = isMovingDown;
        this._autoIndent = autoIndent;
        this._selectionId = null;
        this._moveEndLineSelectionShrink = false;
    }
    getEditOperations(model, builder) {
        const getLanguageId = () => {
            return model.getLanguageId();
        };
        const getLanguageIdAtPosition = (lineNumber, column) => {
            return model.getLanguageIdAtPosition(lineNumber, column);
        };
        const modelLineCount = model.getLineCount();
        if (this._isMovingDown && this._selection.endLineNumber === modelLineCount) {
            this._selectionId = builder.trackSelection(this._selection);
            return;
        }
        if (!this._isMovingDown && this._selection.startLineNumber === 1) {
            this._selectionId = builder.trackSelection(this._selection);
            return;
        }
        this._moveEndPositionDown = false;
        let s = this._selection;
        if (s.startLineNumber < s.endLineNumber && s.endColumn === 1) {
            this._moveEndPositionDown = true;
            s = s.setEndPosition(s.endLineNumber - 1, model.getLineMaxColumn(s.endLineNumber - 1));
        }
        const { tabSize, indentSize, insertSpaces } = model.getOptions();
        const indentConverter = this.buildIndentConverter(tabSize, indentSize, insertSpaces);
        if (s.startLineNumber === s.endLineNumber && model.getLineMaxColumn(s.startLineNumber) === 1) {
            // Current line is empty
            const lineNumber = s.startLineNumber;
            const otherLineNumber = (this._isMovingDown ? lineNumber + 1 : lineNumber - 1);
            if (model.getLineMaxColumn(otherLineNumber) === 1) {
                // Other line number is empty too, so no editing is needed
                // Add a no-op to force running by the model
                builder.addEditOperation(new Range(1, 1, 1, 1), null);
            }
            else {
                // Type content from other line number on line number
                builder.addEditOperation(new Range(lineNumber, 1, lineNumber, 1), model.getLineContent(otherLineNumber));
                // Remove content from other line number
                builder.addEditOperation(new Range(otherLineNumber, 1, otherLineNumber, model.getLineMaxColumn(otherLineNumber)), null);
            }
            // Track selection at the other line number
            s = new Selection(otherLineNumber, 1, otherLineNumber, 1);
        }
        else {
            let movingLineNumber;
            let movingLineText;
            if (this._isMovingDown) {
                movingLineNumber = s.endLineNumber + 1;
                movingLineText = model.getLineContent(movingLineNumber);
                // Delete line that needs to be moved
                builder.addEditOperation(new Range(movingLineNumber - 1, model.getLineMaxColumn(movingLineNumber - 1), movingLineNumber, model.getLineMaxColumn(movingLineNumber)), null);
                let insertingText = movingLineText;
                if (this.shouldAutoIndent(model, s)) {
                    const movingLineMatchResult = this.matchEnterRule(model, indentConverter, tabSize, movingLineNumber, s.startLineNumber - 1);
                    // if s.startLineNumber - 1 matches onEnter rule, we still honor that.
                    if (movingLineMatchResult !== null) {
                        const oldIndentation = strings.getLeadingWhitespace(model.getLineContent(movingLineNumber));
                        const newSpaceCnt = movingLineMatchResult + indentUtils.getSpaceCnt(oldIndentation, tabSize);
                        const newIndentation = indentUtils.generateIndent(newSpaceCnt, tabSize, insertSpaces);
                        insertingText = newIndentation + this.trimStart(movingLineText);
                    }
                    else {
                        // no enter rule matches, let's check indentatin rules then.
                        const virtualModel = {
                            tokenization: {
                                getLineTokens: (lineNumber) => {
                                    if (lineNumber === s.startLineNumber) {
                                        return model.tokenization.getLineTokens(movingLineNumber);
                                    }
                                    else {
                                        return model.tokenization.getLineTokens(lineNumber);
                                    }
                                },
                                getLanguageId,
                                getLanguageIdAtPosition,
                            },
                            getLineContent: (lineNumber) => {
                                if (lineNumber === s.startLineNumber) {
                                    return model.getLineContent(movingLineNumber);
                                }
                                else {
                                    return model.getLineContent(lineNumber);
                                }
                            },
                        };
                        const indentOfMovingLine = getGoodIndentForLine(this._autoIndent, virtualModel, model.getLanguageIdAtPosition(movingLineNumber, 1), s.startLineNumber, indentConverter, this._languageConfigurationService);
                        if (indentOfMovingLine !== null) {
                            const oldIndentation = strings.getLeadingWhitespace(model.getLineContent(movingLineNumber));
                            const newSpaceCnt = indentUtils.getSpaceCnt(indentOfMovingLine, tabSize);
                            const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, tabSize);
                            if (newSpaceCnt !== oldSpaceCnt) {
                                const newIndentation = indentUtils.generateIndent(newSpaceCnt, tabSize, insertSpaces);
                                insertingText = newIndentation + this.trimStart(movingLineText);
                            }
                        }
                    }
                    // add edit operations for moving line first to make sure it's executed after we make indentation change
                    // to s.startLineNumber
                    builder.addEditOperation(new Range(s.startLineNumber, 1, s.startLineNumber, 1), insertingText + '\n');
                    const ret = this.matchEnterRuleMovingDown(model, indentConverter, tabSize, s.startLineNumber, movingLineNumber, insertingText);
                    // check if the line being moved before matches onEnter rules, if so let's adjust the indentation by onEnter rules.
                    if (ret !== null) {
                        if (ret !== 0) {
                            this.getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, ret);
                        }
                    }
                    else {
                        // it doesn't match onEnter rules, let's check indentation rules then.
                        const virtualModel = {
                            tokenization: {
                                getLineTokens: (lineNumber) => {
                                    if (lineNumber === s.startLineNumber) {
                                        // TODO@aiday-mar: the tokens here don't correspond exactly to the corresponding content (after indentation adjustment), have to fix this.
                                        return model.tokenization.getLineTokens(movingLineNumber);
                                    }
                                    else if (lineNumber >= s.startLineNumber + 1 && lineNumber <= s.endLineNumber + 1) {
                                        return model.tokenization.getLineTokens(lineNumber - 1);
                                    }
                                    else {
                                        return model.tokenization.getLineTokens(lineNumber);
                                    }
                                },
                                getLanguageId,
                                getLanguageIdAtPosition,
                            },
                            getLineContent: (lineNumber) => {
                                if (lineNumber === s.startLineNumber) {
                                    return insertingText;
                                }
                                else if (lineNumber >= s.startLineNumber + 1 && lineNumber <= s.endLineNumber + 1) {
                                    return model.getLineContent(lineNumber - 1);
                                }
                                else {
                                    return model.getLineContent(lineNumber);
                                }
                            },
                        };
                        const newIndentatOfMovingBlock = getGoodIndentForLine(this._autoIndent, virtualModel, model.getLanguageIdAtPosition(movingLineNumber, 1), s.startLineNumber + 1, indentConverter, this._languageConfigurationService);
                        if (newIndentatOfMovingBlock !== null) {
                            const oldIndentation = strings.getLeadingWhitespace(model.getLineContent(s.startLineNumber));
                            const newSpaceCnt = indentUtils.getSpaceCnt(newIndentatOfMovingBlock, tabSize);
                            const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, tabSize);
                            if (newSpaceCnt !== oldSpaceCnt) {
                                const spaceCntOffset = newSpaceCnt - oldSpaceCnt;
                                this.getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, spaceCntOffset);
                            }
                        }
                    }
                }
                else {
                    // Insert line that needs to be moved before
                    builder.addEditOperation(new Range(s.startLineNumber, 1, s.startLineNumber, 1), insertingText + '\n');
                }
            }
            else {
                movingLineNumber = s.startLineNumber - 1;
                movingLineText = model.getLineContent(movingLineNumber);
                // Delete line that needs to be moved
                builder.addEditOperation(new Range(movingLineNumber, 1, movingLineNumber + 1, 1), null);
                // Insert line that needs to be moved after
                builder.addEditOperation(new Range(s.endLineNumber, model.getLineMaxColumn(s.endLineNumber), s.endLineNumber, model.getLineMaxColumn(s.endLineNumber)), '\n' + movingLineText);
                if (this.shouldAutoIndent(model, s)) {
                    const virtualModel = {
                        tokenization: {
                            getLineTokens: (lineNumber) => {
                                if (lineNumber === movingLineNumber) {
                                    return model.tokenization.getLineTokens(s.startLineNumber);
                                }
                                else {
                                    return model.tokenization.getLineTokens(lineNumber);
                                }
                            },
                            getLanguageId,
                            getLanguageIdAtPosition,
                        },
                        getLineContent: (lineNumber) => {
                            if (lineNumber === movingLineNumber) {
                                return model.getLineContent(s.startLineNumber);
                            }
                            else {
                                return model.getLineContent(lineNumber);
                            }
                        },
                    };
                    const ret = this.matchEnterRule(model, indentConverter, tabSize, s.startLineNumber, s.startLineNumber - 2);
                    // check if s.startLineNumber - 2 matches onEnter rules, if so adjust the moving block by onEnter rules.
                    if (ret !== null) {
                        if (ret !== 0) {
                            this.getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, ret);
                        }
                    }
                    else {
                        // it doesn't match any onEnter rule, let's check indentation rules then.
                        const indentOfFirstLine = getGoodIndentForLine(this._autoIndent, virtualModel, model.getLanguageIdAtPosition(s.startLineNumber, 1), movingLineNumber, indentConverter, this._languageConfigurationService);
                        if (indentOfFirstLine !== null) {
                            // adjust the indentation of the moving block
                            const oldIndent = strings.getLeadingWhitespace(model.getLineContent(s.startLineNumber));
                            const newSpaceCnt = indentUtils.getSpaceCnt(indentOfFirstLine, tabSize);
                            const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndent, tabSize);
                            if (newSpaceCnt !== oldSpaceCnt) {
                                const spaceCntOffset = newSpaceCnt - oldSpaceCnt;
                                this.getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, spaceCntOffset);
                            }
                        }
                    }
                }
            }
        }
        this._selectionId = builder.trackSelection(s);
    }
    buildIndentConverter(tabSize, indentSize, insertSpaces) {
        return {
            shiftIndent: (indentation) => {
                return ShiftCommand.shiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            },
            unshiftIndent: (indentation) => {
                return ShiftCommand.unshiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            }
        };
    }
    parseEnterResult(model, indentConverter, tabSize, line, enter) {
        if (enter) {
            let enterPrefix = enter.indentation;
            if (enter.indentAction === IndentAction.None) {
                enterPrefix = enter.indentation + enter.appendText;
            }
            else if (enter.indentAction === IndentAction.Indent) {
                enterPrefix = enter.indentation + enter.appendText;
            }
            else if (enter.indentAction === IndentAction.IndentOutdent) {
                enterPrefix = enter.indentation;
            }
            else if (enter.indentAction === IndentAction.Outdent) {
                enterPrefix = indentConverter.unshiftIndent(enter.indentation) + enter.appendText;
            }
            const movingLineText = model.getLineContent(line);
            if (this.trimStart(movingLineText).indexOf(this.trimStart(enterPrefix)) >= 0) {
                const oldIndentation = strings.getLeadingWhitespace(model.getLineContent(line));
                let newIndentation = strings.getLeadingWhitespace(enterPrefix);
                const indentMetadataOfMovelingLine = getIndentMetadata(model, line, this._languageConfigurationService);
                if (indentMetadataOfMovelingLine !== null && indentMetadataOfMovelingLine & 2 /* IndentConsts.DECREASE_MASK */) {
                    newIndentation = indentConverter.unshiftIndent(newIndentation);
                }
                const newSpaceCnt = indentUtils.getSpaceCnt(newIndentation, tabSize);
                const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, tabSize);
                return newSpaceCnt - oldSpaceCnt;
            }
        }
        return null;
    }
    /**
     *
     * @param model
     * @param indentConverter
     * @param tabSize
     * @param line the line moving down
     * @param futureAboveLineNumber the line which will be at the `line` position
     * @param futureAboveLineText
     */
    matchEnterRuleMovingDown(model, indentConverter, tabSize, line, futureAboveLineNumber, futureAboveLineText) {
        if (strings.lastNonWhitespaceIndex(futureAboveLineText) >= 0) {
            // break
            const maxColumn = model.getLineMaxColumn(futureAboveLineNumber);
            const enter = getEnterAction(this._autoIndent, model, new Range(futureAboveLineNumber, maxColumn, futureAboveLineNumber, maxColumn), this._languageConfigurationService);
            return this.parseEnterResult(model, indentConverter, tabSize, line, enter);
        }
        else {
            // go upwards, starting from `line - 1`
            let validPrecedingLine = line - 1;
            while (validPrecedingLine >= 1) {
                const lineContent = model.getLineContent(validPrecedingLine);
                const nonWhitespaceIdx = strings.lastNonWhitespaceIndex(lineContent);
                if (nonWhitespaceIdx >= 0) {
                    break;
                }
                validPrecedingLine--;
            }
            if (validPrecedingLine < 1 || line > model.getLineCount()) {
                return null;
            }
            const maxColumn = model.getLineMaxColumn(validPrecedingLine);
            const enter = getEnterAction(this._autoIndent, model, new Range(validPrecedingLine, maxColumn, validPrecedingLine, maxColumn), this._languageConfigurationService);
            return this.parseEnterResult(model, indentConverter, tabSize, line, enter);
        }
    }
    matchEnterRule(model, indentConverter, tabSize, line, oneLineAbove, previousLineText) {
        let validPrecedingLine = oneLineAbove;
        while (validPrecedingLine >= 1) {
            // ship empty lines as empty lines just inherit indentation
            let lineContent;
            if (validPrecedingLine === oneLineAbove && previousLineText !== undefined) {
                lineContent = previousLineText;
            }
            else {
                lineContent = model.getLineContent(validPrecedingLine);
            }
            const nonWhitespaceIdx = strings.lastNonWhitespaceIndex(lineContent);
            if (nonWhitespaceIdx >= 0) {
                break;
            }
            validPrecedingLine--;
        }
        if (validPrecedingLine < 1 || line > model.getLineCount()) {
            return null;
        }
        const maxColumn = model.getLineMaxColumn(validPrecedingLine);
        const enter = getEnterAction(this._autoIndent, model, new Range(validPrecedingLine, maxColumn, validPrecedingLine, maxColumn), this._languageConfigurationService);
        return this.parseEnterResult(model, indentConverter, tabSize, line, enter);
    }
    trimStart(str) {
        return str.replace(/^\s+/, '');
    }
    shouldAutoIndent(model, selection) {
        if (this._autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
            return false;
        }
        // if it's not easy to tokenize, we stop auto indent.
        if (!model.tokenization.isCheapToTokenize(selection.startLineNumber)) {
            return false;
        }
        const languageAtSelectionStart = model.getLanguageIdAtPosition(selection.startLineNumber, 1);
        const languageAtSelectionEnd = model.getLanguageIdAtPosition(selection.endLineNumber, 1);
        if (languageAtSelectionStart !== languageAtSelectionEnd) {
            return false;
        }
        if (this._languageConfigurationService.getLanguageConfiguration(languageAtSelectionStart).indentRulesSupport === null) {
            return false;
        }
        return true;
    }
    getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, offset) {
        for (let i = s.startLineNumber; i <= s.endLineNumber; i++) {
            const lineContent = model.getLineContent(i);
            const originalIndent = strings.getLeadingWhitespace(lineContent);
            const originalSpacesCnt = indentUtils.getSpaceCnt(originalIndent, tabSize);
            const newSpacesCnt = originalSpacesCnt + offset;
            const newIndent = indentUtils.generateIndent(newSpacesCnt, tabSize, insertSpaces);
            if (newIndent !== originalIndent) {
                builder.addEditOperation(new Range(i, 1, i, originalIndent.length + 1), newIndent);
                if (i === s.endLineNumber && s.endColumn <= originalIndent.length + 1 && newIndent === '') {
                    // as users select part of the original indent white spaces
                    // when we adjust the indentation of endLine, we should adjust the cursor position as well.
                    this._moveEndLineSelectionShrink = true;
                }
            }
        }
    }
    computeCursorState(model, helper) {
        let result = helper.getTrackedSelection(this._selectionId);
        if (this._moveEndPositionDown) {
            result = result.setEndPosition(result.endLineNumber + 1, 1);
        }
        if (this._moveEndLineSelectionShrink && result.startLineNumber < result.endLineNumber) {
            result = result.setEndPosition(result.endLineNumber, 2);
        }
        return result;
    }
};
MoveLinesCommand = __decorate([
    __param(3, ILanguageConfigurationService)
], MoveLinesCommand);
export { MoveLinesCommand };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUxpbmVzQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9saW5lc09wZXJhdGlvbnMvYnJvd3Nlci9tb3ZlTGluZXNDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHOUQsT0FBTyxFQUF1QixZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUUzRyxPQUFPLEtBQUssV0FBVyxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBbUMsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuSSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkUsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBZ0I7SUFVNUIsWUFDQyxTQUFvQixFQUNwQixZQUFxQixFQUNyQixVQUFvQyxFQUNZLDZCQUE0RDtRQUE1RCxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQStCO1FBRTVHLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO1FBQzlCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxD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