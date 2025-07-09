/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as types from '../../../base/common/types.js';
import { CursorState, SingleCursorState } from '../cursorCommon.js';
import { MoveOperations } from './cursorMoveOperations.js';
import { WordOperations } from './cursorWordOperations.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
export class CursorMoveCommands {
    static addCursorDown(viewModel, cursors, useLogicalLine) {
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[resultLen++] = new CursorState(cursor.modelState, cursor.viewState);
            if (useLogicalLine) {
                result[resultLen++] = CursorState.fromModelState(MoveOperations.translateDown(viewModel.cursorConfig, viewModel.model, cursor.modelState));
            }
            else {
                result[resultLen++] = CursorState.fromViewState(MoveOperations.translateDown(viewModel.cursorConfig, viewModel, cursor.viewState));
            }
        }
        return result;
    }
    static addCursorUp(viewModel, cursors, useLogicalLine) {
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[resultLen++] = new CursorState(cursor.modelState, cursor.viewState);
            if (useLogicalLine) {
                result[resultLen++] = CursorState.fromModelState(MoveOperations.translateUp(viewModel.cursorConfig, viewModel.model, cursor.modelState));
            }
            else {
                result[resultLen++] = CursorState.fromViewState(MoveOperations.translateUp(viewModel.cursorConfig, viewModel, cursor.viewState));
            }
        }
        return result;
    }
    static moveToBeginningOfLine(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = this._moveToLineStart(viewModel, cursor, inSelectionMode);
        }
        return result;
    }
    static _moveToLineStart(viewModel, cursor, inSelectionMode) {
        const currentViewStateColumn = cursor.viewState.position.column;
        const currentModelStateColumn = cursor.modelState.position.column;
        const isFirstLineOfWrappedLine = currentViewStateColumn === currentModelStateColumn;
        const currentViewStatelineNumber = cursor.viewState.position.lineNumber;
        const firstNonBlankColumn = viewModel.getLineFirstNonWhitespaceColumn(currentViewStatelineNumber);
        const isBeginningOfViewLine = currentViewStateColumn === firstNonBlankColumn;
        if (!isFirstLineOfWrappedLine && !isBeginningOfViewLine) {
            return this._moveToLineStartByView(viewModel, cursor, inSelectionMode);
        }
        else {
            return this._moveToLineStartByModel(viewModel, cursor, inSelectionMode);
        }
    }
    static _moveToLineStartByView(viewModel, cursor, inSelectionMode) {
        return CursorState.fromViewState(MoveOperations.moveToBeginningOfLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode));
    }
    static _moveToLineStartByModel(viewModel, cursor, inSelectionMode) {
        return CursorState.fromModelState(MoveOperations.moveToBeginningOfLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
    }
    static moveToEndOfLine(viewModel, cursors, inSelectionMode, sticky) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = this._moveToLineEnd(viewModel, cursor, inSelectionMode, sticky);
        }
        return result;
    }
    static _moveToLineEnd(viewModel, cursor, inSelectionMode, sticky) {
        const viewStatePosition = cursor.viewState.position;
        const viewModelMaxColumn = viewModel.getLineMaxColumn(viewStatePosition.lineNumber);
        const isEndOfViewLine = viewStatePosition.column === viewModelMaxColumn;
        const modelStatePosition = cursor.modelState.position;
        const modelMaxColumn = viewModel.model.getLineMaxColumn(modelStatePosition.lineNumber);
        const isEndLineOfWrappedLine = viewModelMaxColumn - viewStatePosition.column === modelMaxColumn - modelStatePosition.column;
        if (isEndOfViewLine || isEndLineOfWrappedLine) {
            return this._moveToLineEndByModel(viewModel, cursor, inSelectionMode, sticky);
        }
        else {
            return this._moveToLineEndByView(viewModel, cursor, inSelectionMode, sticky);
        }
    }
    static _moveToLineEndByView(viewModel, cursor, inSelectionMode, sticky) {
        return CursorState.fromViewState(MoveOperations.moveToEndOfLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, sticky));
    }
    static _moveToLineEndByModel(viewModel, cursor, inSelectionMode, sticky) {
        return CursorState.fromModelState(MoveOperations.moveToEndOfLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, sticky));
    }
    static expandLineSelection(viewModel, cursors) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const startLineNumber = cursor.modelState.selection.startLineNumber;
            const lineCount = viewModel.model.getLineCount();
            let endLineNumber = cursor.modelState.selection.endLineNumber;
            let endColumn;
            if (endLineNumber === lineCount) {
                endColumn = viewModel.model.getLineMaxColumn(lineCount);
            }
            else {
                endLineNumber++;
                endColumn = 1;
            }
            result[i] = CursorState.fromModelState(new SingleCursorState(new Range(startLineNumber, 1, startLineNumber, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(endLineNumber, endColumn), 0));
        }
        return result;
    }
    static moveToBeginningOfBuffer(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveToBeginningOfBuffer(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
        }
        return result;
    }
    static moveToEndOfBuffer(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveToEndOfBuffer(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
        }
        return result;
    }
    static selectAll(viewModel, cursor) {
        const lineCount = viewModel.model.getLineCount();
        const maxColumn = viewModel.model.getLineMaxColumn(lineCount);
        return CursorState.fromModelState(new SingleCursorState(new Range(1, 1, 1, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(lineCount, maxColumn), 0));
    }
    static line(viewModel, cursor, inSelectionMode, _position, _viewPosition) {
        const position = viewModel.model.validatePosition(_position);
        const viewPosition = (_viewPosition
            ? viewModel.coordinatesConverter.validateViewPosition(new Position(_viewPosition.lineNumber, _viewPosition.column), position)
            : viewModel.coordinatesConverter.convertModelPositionToViewPosition(position));
        if (!inSelectionMode) {
            // Entering line selection for the first time
            const lineCount = viewModel.model.getLineCount();
            let selectToLineNumber = position.lineNumber + 1;
            let selectToColumn = 1;
            if (selectToLineNumber > lineCount) {
                selectToLineNumber = lineCount;
                selectToColumn = viewModel.model.getLineMaxColumn(selectToLineNumber);
            }
            return CursorState.fromModelState(new SingleCursorState(new Range(position.lineNumber, 1, selectToLineNumber, selectToColumn), 2 /* SelectionStartKind.Line */, 0, new Position(selectToLineNumber, selectToColumn), 0));
        }
        // Continuing line selection
        const enteringLineNumber = cursor.modelState.selectionStart.getStartPosition().lineNumber;
        if (position.lineNumber < enteringLineNumber) {
            return CursorState.fromViewState(cursor.viewState.move(true, viewPosition.lineNumber, 1, 0));
        }
        else if (position.lineNumber > enteringLineNumber) {
            const lineCount = viewModel.getLineCount();
            let selectToViewLineNumber = viewPosition.lineNumber + 1;
            let selectToViewColumn = 1;
            if (selectToViewLineNumber > lineCount) {
                selectToViewLineNumber = lineCount;
                selectToViewColumn = viewModel.getLineMaxColumn(selectToViewLineNumber);
            }
            return CursorState.fromViewState(cursor.viewState.move(true, selectToViewLineNumber, selectToViewColumn, 0));
        }
        else {
            const endPositionOfSelectionStart = cursor.modelState.selectionStart.getEndPosition();
            return CursorState.fromModelState(cursor.modelState.move(true, endPositionOfSelectionStart.lineNumber, endPositionOfSelectionStart.column, 0));
        }
    }
    static word(viewModel, cursor, inSelectionMode, _position) {
        const position = viewModel.model.validatePosition(_position);
        return CursorState.fromModelState(WordOperations.word(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, position));
    }
    static cancelSelection(viewModel, cursor) {
        if (!cursor.modelState.hasSelection()) {
            return new CursorState(cursor.modelState, cursor.viewState);
        }
        const lineNumber = cursor.viewState.position.lineNumber;
        const column = cursor.viewState.position.column;
        return CursorState.fromViewState(new SingleCursorState(new Range(lineNumber, column, lineNumber, column), 0 /* SelectionStartKind.Simple */, 0, new Position(lineNumber, column), 0));
    }
    static moveTo(viewModel, cursor, inSelectionMode, _position, _viewPosition) {
        if (inSelectionMode) {
            if (cursor.modelState.selectionStartKind === 1 /* SelectionStartKind.Word */) {
                return this.word(viewModel, cursor, inSelectionMode, _position);
            }
            if (cursor.modelState.selectionStartKind === 2 /* SelectionStartKind.Line */) {
                return this.line(viewModel, cursor, inSelectionMode, _position, _viewPosition);
            }
        }
        const position = viewModel.model.validatePosition(_position);
        const viewPosition = (_viewPosition
            ? viewModel.coordinatesConverter.validateViewPosition(new Position(_viewPosition.lineNumber, _viewPosition.column), position)
            : viewModel.coordinatesConverter.convertModelPositionToViewPosition(position));
        return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, viewPosition.lineNumber, viewPosition.column, 0));
    }
    static simpleMove(viewModel, cursors, direction, inSelectionMode, value, unit) {
        switch (direction) {
            case 0 /* CursorMove.Direction.Left */: {
                if (unit === 4 /* CursorMove.Unit.HalfLine */) {
                    // Move left by half the current line length
                    return this._moveHalfLineLeft(viewModel, cursors, inSelectionMode);
                }
                else {
                    // Move left by `moveParams.value` columns
                    return this._moveLeft(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 1 /* CursorMove.Direction.Right */: {
                if (unit === 4 /* CursorMove.Unit.HalfLine */) {
                    // Move right by half the current line length
                    return this._moveHalfLineRight(viewModel, cursors, inSelectionMode);
                }
                else {
                    // Move right by `moveParams.value` columns
                    return this._moveRight(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 2 /* CursorMove.Direction.Up */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    // Move up by view lines
                    return this._moveUpByViewLines(viewModel, cursors, inSelectionMode, value);
                }
                else {
                    // Move up by model lines
                    return this._moveUpByModelLines(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 3 /* CursorMove.Direction.Down */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    // Move down by view lines
                    return this._moveDownByViewLines(viewModel, cursors, inSelectionMode, value);
                }
                else {
                    // Move down by model lines
                    return this._moveDownByModelLines(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 4 /* CursorMove.Direction.PrevBlankLine */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    return cursors.map(cursor => CursorState.fromViewState(MoveOperations.moveToPrevBlankLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode)));
                }
                else {
                    return cursors.map(cursor => CursorState.fromModelState(MoveOperations.moveToPrevBlankLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode)));
                }
            }
            case 5 /* CursorMove.Direction.NextBlankLine */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    return cursors.map(cursor => CursorState.fromViewState(MoveOperations.moveToNextBlankLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode)));
                }
                else {
                    return cursors.map(cursor => CursorState.fromModelState(MoveOperations.moveToNextBlankLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode)));
                }
            }
            case 6 /* CursorMove.Direction.WrappedLineStart */: {
                // Move to the beginning of the current view line
                return this._moveToViewMinColumn(viewModel, cursors, inSelectionMode);
            }
            case 7 /* CursorMove.Direction.WrappedLineFirstNonWhitespaceCharacter */: {
                // Move to the first non-whitespace column of the current view line
                return this._moveToViewFirstNonWhitespaceColumn(viewModel, cursors, inSelectionMode);
            }
            case 8 /* CursorMove.Direction.WrappedLineColumnCenter */: {
                // Move to the "center" of the current view line
                return this._moveToViewCenterColumn(viewModel, cursors, inSelectionMode);
            }
            case 9 /* CursorMove.Direction.WrappedLineEnd */: {
                // Move to the end of the current view line
                return this._moveToViewMaxColumn(viewModel, cursors, inSelectionMode);
            }
            case 10 /* CursorMove.Direction.WrappedLineLastNonWhitespaceCharacter */: {
                // Move to the last non-whitespace column of the current view line
                return this._moveToViewLastNonWhitespaceColumn(viewModel, cursors, inSelectionMode);
            }
            default:
                return null;
        }
    }
    static viewportMove(viewModel, cursors, direction, inSelectionMode, value) {
        const visibleViewRange = viewModel.getCompletelyVisibleViewRange();
        const visibleModelRange = viewModel.coordinatesConverter.convertViewRangeToModelRange(visibleViewRange);
        switch (direction) {
            case 11 /* CursorMove.Direction.ViewPortTop */: {
                // Move to the nth line start in the viewport (from the top)
                const modelLineNumber = this._firstLineNumberInRange(viewModel.model, visibleModelRange, value);
                const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumber);
                return [this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumber, modelColumn)];
            }
            case 13 /* CursorMove.Direction.ViewPortBottom */: {
                // Move to the nth line start in the viewport (from the bottom)
                const modelLineNumber = this._lastLineNumberInRange(viewModel.model, visibleModelRange, value);
                const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumber);
                return [this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumber, modelColumn)];
            }
            case 12 /* CursorMove.Direction.ViewPortCenter */: {
                // Move to the line start in the viewport center
                const modelLineNumber = Math.round((visibleModelRange.startLineNumber + visibleModelRange.endLineNumber) / 2);
                const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumber);
                return [this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumber, modelColumn)];
            }
            case 14 /* CursorMove.Direction.ViewPortIfOutside */: {
                // Move to a position inside the viewport
                const result = [];
                for (let i = 0, len = cursors.length; i < len; i++) {
                    const cursor = cursors[i];
                    result[i] = this.findPositionInViewportIfOutside(viewModel, cursor, visibleViewRange, inSelectionMode);
                }
                return result;
            }
            default:
                return null;
        }
    }
    static findPositionInViewportIfOutside(viewModel, cursor, visibleViewRange, inSelectionMode) {
        const viewLineNumber = cursor.viewState.position.lineNumber;
        if (visibleViewRange.startLineNumber <= viewLineNumber && viewLineNumber <= visibleViewRange.endLineNumber - 1) {
            // Nothing to do, cursor is in viewport
            return new CursorState(cursor.modelState, cursor.viewState);
        }
        else {
            let newViewLineNumber;
            if (viewLineNumber > visibleViewRange.endLineNumber - 1) {
                newViewLineNumber = visibleViewRange.endLineNumber - 1;
            }
            else if (viewLineNumber < visibleViewRange.startLineNumber) {
                newViewLineNumber = visibleViewRange.startLineNumber;
            }
            else {
                newViewLineNumber = viewLineNumber;
            }
            const position = MoveOperations.vertical(viewModel.cursorConfig, viewModel, viewLineNumber, cursor.viewState.position.column, cursor.viewState.leftoverVisibleColumns, newViewLineNumber, false);
            return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, position.lineNumber, position.column, position.leftoverVisibleColumns));
        }
    }
    /**
     * Find the nth line start included in the range (from the start).
     */
    static _firstLineNumberInRange(model, range, count) {
        let startLineNumber = range.startLineNumber;
        if (range.startColumn !== model.getLineMinColumn(startLineNumber)) {
            // Move on to the second line if the first line start is not included in the range
            startLineNumber++;
        }
        return Math.min(range.endLineNumber, startLineNumber + count - 1);
    }
    /**
     * Find the nth line start included in the range (from the end).
     */
    static _lastLineNumberInRange(model, range, count) {
        let startLineNumber = range.startLineNumber;
        if (range.startColumn !== model.getLineMinColumn(startLineNumber)) {
            // Move on to the second line if the first line start is not included in the range
            startLineNumber++;
        }
        return Math.max(startLineNumber, range.endLineNumber - count + 1);
    }
    static _moveLeft(viewModel, cursors, inSelectionMode, noOfColumns) {
        return cursors.map(cursor => CursorState.fromViewState(MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns)));
    }
    static _moveHalfLineLeft(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const halfLine = Math.round(viewModel.getLineLength(viewLineNumber) / 2);
            result[i] = CursorState.fromViewState(MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, halfLine));
        }
        return result;
    }
    static _moveRight(viewModel, cursors, inSelectionMode, noOfColumns) {
        return cursors.map(cursor => CursorState.fromViewState(MoveOperations.moveRight(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns)));
    }
    static _moveHalfLineRight(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const halfLine = Math.round(viewModel.getLineLength(viewLineNumber) / 2);
            result[i] = CursorState.fromViewState(MoveOperations.moveRight(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, halfLine));
        }
        return result;
    }
    static _moveDownByViewLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromViewState(MoveOperations.moveDown(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveDownByModelLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveDown(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveUpByViewLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromViewState(MoveOperations.moveUp(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveUpByModelLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveUp(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveToViewPosition(viewModel, cursor, inSelectionMode, toViewLineNumber, toViewColumn) {
        return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, toViewLineNumber, toViewColumn, 0));
    }
    static _moveToModelPosition(viewModel, cursor, inSelectionMode, toModelLineNumber, toModelColumn) {
        return CursorState.fromModelState(cursor.modelState.move(inSelectionMode, toModelLineNumber, toModelColumn, 0));
    }
    static _moveToViewMinColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineMinColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewFirstNonWhitespaceColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineFirstNonWhitespaceColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewCenterColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = Math.round((viewModel.getLineMaxColumn(viewLineNumber) + viewModel.getLineMinColumn(viewLineNumber)) / 2);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewMaxColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineMaxColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewLastNonWhitespaceColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineLastNonWhitespaceColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
}
export var CursorMove;
(function (CursorMove) {
    const isCursorMoveArgs = function (arg) {
        if (!types.isObject(arg)) {
            return false;
        }
        const cursorMoveArg = arg;
        if (!types.isString(cursorMoveArg.to)) {
            return false;
        }
        if (!types.isUndefined(cursorMoveArg.select) && !types.isBoolean(cursorMoveArg.select)) {
            return false;
        }
        if (!types.isUndefined(cursorMoveArg.by) && !types.isString(cursorMoveArg.by)) {
            return false;
        }
        if (!types.isUndefined(cursorMoveArg.value) && !types.isNumber(cursorMoveArg.value)) {
            return false;
        }
        return true;
    };
    CursorMove.metadata = {
        description: 'Move cursor to a logical position in the view',
        args: [
            {
                name: 'Cursor move argument object',
                description: `Property-value pairs that can be passed through this argument:
					* 'to': A mandatory logical position value providing where to move the cursor.
						\`\`\`
						'left', 'right', 'up', 'down', 'prevBlankLine', 'nextBlankLine',
						'wrappedLineStart', 'wrappedLineEnd', 'wrappedLineColumnCenter'
						'wrappedLineFirstNonWhitespaceCharacter', 'wrappedLineLastNonWhitespaceCharacter'
						'viewPortTop', 'viewPortCenter', 'viewPortBottom', 'viewPortIfOutside'
						\`\`\`
					* 'by': Unit to move. Default is computed based on 'to' value.
						\`\`\`
						'line', 'wrappedLine', 'character', 'halfLine'
						\`\`\`
					* 'value': Number of units to move. Default is '1'.
					* 'select': If 'true' makes the selection. Default is 'false'.
				`,
                constraint: isCursorMoveArgs,
                schema: {
                    'type': 'object',
                    'required': ['to'],
                    'properties': {
                        'to': {
                            'type': 'string',
                            'enum': ['left', 'right', 'up', 'down', 'prevBlankLine', 'nextBlankLine', 'wrappedLineStart', 'wrappedLineEnd', 'wrappedLineColumnCenter', 'wrappedLineFirstNonWhitespaceCharacter', 'wrappedLineLastNonWhitespaceCharacter', 'viewPortTop', 'viewPortCenter', 'viewPortBottom', 'viewPortIfOutside']
                        },
                        'by': {
                            'type': 'string',
                            'enum': ['line', 'wrappedLine', 'character', 'halfLine']
                        },
                        'value': {
                            'type': 'number',
                            'default': 1
                        },
                        'select': {
                            'type': 'boolean',
                            'default': false
                        }
                    }
                }
            }
        ]
    };
    /**
     * Positions in the view for cursor move command.
     */
    CursorMove.RawDirection = {
        Left: 'left',
        Right: 'right',
        Up: 'up',
        Down: 'down',
        PrevBlankLine: 'prevBlankLine',
        NextBlankLine: 'nextBlankLine',
        WrappedLineStart: 'wrappedLineStart',
        WrappedLineFirstNonWhitespaceCharacter: 'wrappedLineFirstNonWhitespaceCharacter',
        WrappedLineColumnCenter: 'wrappedLineColumnCenter',
        WrappedLineEnd: 'wrappedLineEnd',
        WrappedLineLastNonWhitespaceCharacter: 'wrappedLineLastNonWhitespaceCharacter',
        ViewPortTop: 'viewPortTop',
        ViewPortCenter: 'viewPortCenter',
        ViewPortBottom: 'viewPortBottom',
        ViewPortIfOutside: 'viewPortIfOutside'
    };
    /**
     * Units for Cursor move 'by' argument
     */
    CursorMove.RawUnit = {
        Line: 'line',
        WrappedLine: 'wrappedLine',
        Character: 'character',
        HalfLine: 'halfLine'
    };
    function parse(args) {
        if (!args.to) {
            // illegal arguments
            return null;
        }
        let direction;
        switch (args.to) {
            case CursorMove.RawDirection.Left:
                direction = 0 /* Direction.Left */;
                break;
            case CursorMove.RawDirection.Right:
                direction = 1 /* Direction.Right */;
                break;
            case CursorMove.RawDirection.Up:
                direction = 2 /* Direction.Up */;
                break;
            case CursorMove.RawDirection.Down:
                direction = 3 /* Direction.Down */;
                break;
            case CursorMove.RawDirection.PrevBlankLine:
                direction = 4 /* Direction.PrevBlankLine */;
                break;
            case CursorMove.RawDirection.NextBlankLine:
                direction = 5 /* Direction.NextBlankLine */;
                break;
            case CursorMove.RawDirection.WrappedLineStart:
                direction = 6 /* Direction.WrappedLineStart */;
                break;
            case CursorMove.RawDirection.WrappedLineFirstNonWhitespaceCharacter:
                direction = 7 /* Direction.WrappedLineFirstNonWhitespaceCharacter */;
                break;
            case CursorMove.RawDirection.WrappedLineColumnCenter:
                direction = 8 /* Direction.WrappedLineColumnCenter */;
                break;
            case CursorMove.RawDirection.WrappedLineEnd:
                direction = 9 /* Direction.WrappedLineEnd */;
                break;
            case CursorMove.RawDirection.WrappedLineLastNonWhitespaceCharacter:
                direction = 10 /* Direction.WrappedLineLastNonWhitespaceCharacter */;
                break;
            case CursorMove.RawDirection.ViewPortTop:
                direction = 11 /* Direction.ViewPortTop */;
                break;
            case CursorMove.RawDirection.ViewPortBottom:
                direction = 13 /* Direction.ViewPortBottom */;
                break;
            case CursorMove.RawDirection.ViewPortCenter:
                direction = 12 /* Direction.ViewPortCenter */;
                break;
            case CursorMove.RawDirection.ViewPortIfOutside:
                direction = 14 /* Direction.ViewPortIfOutside */;
                break;
            default:
                // illegal arguments
                return null;
        }
        let unit = 0 /* Unit.None */;
        switch (args.by) {
            case CursorMove.RawUnit.Line:
                unit = 1 /* Unit.Line */;
                break;
            case CursorMove.RawUnit.WrappedLine:
                unit = 2 /* Unit.WrappedLine */;
                break;
            case CursorMove.RawUnit.Character:
                unit = 3 /* Unit.Character */;
                break;
            case CursorMove.RawUnit.HalfLine:
                unit = 4 /* Unit.HalfLine */;
                break;
        }
        return {
            direction: direction,
            unit: unit,
            select: (!!args.select),
            value: (args.value || 1)
        };
    }
    CursorMove.parse = parse;
    let Direction;
    (function (Direction) {
        Direction[Direction["Left"] = 0] = "Left";
        Direction[Direction["Right"] = 1] = "Right";
        Direction[Direction["Up"] = 2] = "Up";
        Direction[Direction["Down"] = 3] = "Down";
        Direction[Direction["PrevBlankLine"] = 4] = "PrevBlankLine";
        Direction[Direction["NextBlankLine"] = 5] = "NextBlankLine";
        Direction[Direction["WrappedLineStart"] = 6] = "WrappedLineStart";
        Direction[Direction["WrappedLineFirstNonWhitespaceCharacter"] = 7] = "WrappedLineFirstNonWhitespaceCharacter";
        Direction[Direction["WrappedLineColumnCenter"] = 8] = "WrappedLineColumnCenter";
        Direction[Direction["WrappedLineEnd"] = 9] = "WrappedLineEnd";
        Direction[Direction["WrappedLineLastNonWhitespaceCharacter"] = 10] = "WrappedLineLastNonWhitespaceCharacter";
        Direction[Direction["ViewPortTop"] = 11] = "ViewPortTop";
        Direction[Direction["ViewPortCenter"] = 12] = "ViewPortCenter";
        Direction[Direction["ViewPortBottom"] = 13] = "ViewPortBottom";
        Direction[Direction["ViewPortIfOutside"] = 14] = "ViewPortIfOutside";
    })(Direction = CursorMove.Direction || (CursorMove.Direction = {}));
    let Unit;
    (function (Unit) {
        Unit[Unit["None"] = 0] = "None";
        Unit[Unit["Line"] = 1] = "Line";
        Unit[Unit["WrappedLine"] = 2] = "WrappedLine";
        Unit[Unit["Character"] = 3] = "Character";
        Unit[Unit["HalfLine"] = 4] = "HalfLine";
    })(Unit = CursorMove.Unit || (CursorMove.Unit = {}));
})(CursorMove || (CursorMove = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvck1vdmVDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssS0FBSyxNQUFNLCtCQUErQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxXQUFXLEVBQThELGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDaEksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMzRCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBSXpDLE1BQU0sT0FBTyxrQkFBa0I7SUFFdkIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxTQUFxQixFQUFFLE9BQXNCLEVBQUUsY0FBdUI7UUFDakcsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQztRQUN4QyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMzRSxJQUFJLGNBQWMsRUFBRSxDQUFD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