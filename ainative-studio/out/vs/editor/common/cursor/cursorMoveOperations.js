/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { CursorColumns } from '../core/cursorColumns.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { AtomicTabMoveOperations } from './cursorAtomicMoveOperations.js';
import { SingleCursorState } from '../cursorCommon.js';
export class CursorPosition {
    constructor(lineNumber, column, leftoverVisibleColumns) {
        this._cursorPositionBrand = undefined;
        this.lineNumber = lineNumber;
        this.column = column;
        this.leftoverVisibleColumns = leftoverVisibleColumns;
    }
}
export class MoveOperations {
    static leftPosition(model, position) {
        if (position.column > model.getLineMinColumn(position.lineNumber)) {
            return position.delta(undefined, -strings.prevCharLength(model.getLineContent(position.lineNumber), position.column - 1));
        }
        else if (position.lineNumber > 1) {
            const newLineNumber = position.lineNumber - 1;
            return new Position(newLineNumber, model.getLineMaxColumn(newLineNumber));
        }
        else {
            return position;
        }
    }
    static leftPositionAtomicSoftTabs(model, position, tabSize) {
        if (position.column <= model.getLineIndentColumn(position.lineNumber)) {
            const minColumn = model.getLineMinColumn(position.lineNumber);
            const lineContent = model.getLineContent(position.lineNumber);
            const newPosition = AtomicTabMoveOperations.atomicPosition(lineContent, position.column - 1, tabSize, 0 /* Direction.Left */);
            if (newPosition !== -1 && newPosition + 1 >= minColumn) {
                return new Position(position.lineNumber, newPosition + 1);
            }
        }
        return this.leftPosition(model, position);
    }
    static left(config, model, position) {
        const pos = config.stickyTabStops
            ? MoveOperations.leftPositionAtomicSoftTabs(model, position, config.tabSize)
            : MoveOperations.leftPosition(model, position);
        return new CursorPosition(pos.lineNumber, pos.column, 0);
    }
    /**
     * @param noOfColumns Must be either `1`
     * or `Math.round(viewModel.getLineContent(viewLineNumber).length / 2)` (for half lines).
    */
    static moveLeft(config, model, cursor, inSelectionMode, noOfColumns) {
        let lineNumber, column;
        if (cursor.hasSelection() && !inSelectionMode) {
            // If the user has a selection and does not want to extend it,
            // put the cursor at the beginning of the selection.
            lineNumber = cursor.selection.startLineNumber;
            column = cursor.selection.startColumn;
        }
        else {
            // This has no effect if noOfColumns === 1.
            // It is ok to do so in the half-line scenario.
            const pos = cursor.position.delta(undefined, -(noOfColumns - 1));
            // We clip the position before normalization, as normalization is not defined
            // for possibly negative columns.
            const normalizedPos = model.normalizePosition(MoveOperations.clipPositionColumn(pos, model), 0 /* PositionAffinity.Left */);
            const p = MoveOperations.left(config, model, normalizedPos);
            lineNumber = p.lineNumber;
            column = p.column;
        }
        return cursor.move(inSelectionMode, lineNumber, column, 0);
    }
    /**
     * Adjusts the column so that it is within min/max of the line.
    */
    static clipPositionColumn(position, model) {
        return new Position(position.lineNumber, MoveOperations.clipRange(position.column, model.getLineMinColumn(position.lineNumber), model.getLineMaxColumn(position.lineNumber)));
    }
    static clipRange(value, min, max) {
        if (value < min) {
            return min;
        }
        if (value > max) {
            return max;
        }
        return value;
    }
    static rightPosition(model, lineNumber, column) {
        if (column < model.getLineMaxColumn(lineNumber)) {
            column = column + strings.nextCharLength(model.getLineContent(lineNumber), column - 1);
        }
        else if (lineNumber < model.getLineCount()) {
            lineNumber = lineNumber + 1;
            column = model.getLineMinColumn(lineNumber);
        }
        return new Position(lineNumber, column);
    }
    static rightPositionAtomicSoftTabs(model, lineNumber, column, tabSize, indentSize) {
        if (column < model.getLineIndentColumn(lineNumber)) {
            const lineContent = model.getLineContent(lineNumber);
            const newPosition = AtomicTabMoveOperations.atomicPosition(lineContent, column - 1, tabSize, 1 /* Direction.Right */);
            if (newPosition !== -1) {
                return new Position(lineNumber, newPosition + 1);
            }
        }
        return this.rightPosition(model, lineNumber, column);
    }
    static right(config, model, position) {
        const pos = config.stickyTabStops
            ? MoveOperations.rightPositionAtomicSoftTabs(model, position.lineNumber, position.column, config.tabSize, config.indentSize)
            : MoveOperations.rightPosition(model, position.lineNumber, position.column);
        return new CursorPosition(pos.lineNumber, pos.column, 0);
    }
    static moveRight(config, model, cursor, inSelectionMode, noOfColumns) {
        let lineNumber, column;
        if (cursor.hasSelection() && !inSelectionMode) {
            // If we are in selection mode, move right without selection cancels selection and puts cursor at the end of the selection
            lineNumber = cursor.selection.endLineNumber;
            column = cursor.selection.endColumn;
        }
        else {
            const pos = cursor.position.delta(undefined, noOfColumns - 1);
            const normalizedPos = model.normalizePosition(MoveOperations.clipPositionColumn(pos, model), 1 /* PositionAffinity.Right */);
            const r = MoveOperations.right(config, model, normalizedPos);
            lineNumber = r.lineNumber;
            column = r.column;
        }
        return cursor.move(inSelectionMode, lineNumber, column, 0);
    }
    static vertical(config, model, lineNumber, column, leftoverVisibleColumns, newLineNumber, allowMoveOnEdgeLine, normalizationAffinity) {
        const currentVisibleColumn = CursorColumns.visibleColumnFromColumn(model.getLineContent(lineNumber), column, config.tabSize) + leftoverVisibleColumns;
        const lineCount = model.getLineCount();
        const wasOnFirstPosition = (lineNumber === 1 && column === 1);
        const wasOnLastPosition = (lineNumber === lineCount && column === model.getLineMaxColumn(lineNumber));
        const wasAtEdgePosition = (newLineNumber < lineNumber ? wasOnFirstPosition : wasOnLastPosition);
        lineNumber = newLineNumber;
        if (lineNumber < 1) {
            lineNumber = 1;
            if (allowMoveOnEdgeLine) {
                column = model.getLineMinColumn(lineNumber);
            }
            else {
                column = Math.min(model.getLineMaxColumn(lineNumber), column);
            }
        }
        else if (lineNumber > lineCount) {
            lineNumber = lineCount;
            if (allowMoveOnEdgeLine) {
                column = model.getLineMaxColumn(lineNumber);
            }
            else {
                column = Math.min(model.getLineMaxColumn(lineNumber), column);
            }
        }
        else {
            column = config.columnFromVisibleColumn(model, lineNumber, currentVisibleColumn);
        }
        if (wasAtEdgePosition) {
            leftoverVisibleColumns = 0;
        }
        else {
            leftoverVisibleColumns = currentVisibleColumn - CursorColumns.visibleColumnFromColumn(model.getLineContent(lineNumber), column, config.tabSize);
        }
        if (normalizationAffinity !== undefined) {
            const position = new Position(lineNumber, column);
            const newPosition = model.normalizePosition(position, normalizationAffinity);
            leftoverVisibleColumns = leftoverVisibleColumns + (column - newPosition.column);
            lineNumber = newPosition.lineNumber;
            column = newPosition.column;
        }
        return new CursorPosition(lineNumber, column, leftoverVisibleColumns);
    }
    static down(config, model, lineNumber, column, leftoverVisibleColumns, count, allowMoveOnLastLine) {
        return this.vertical(config, model, lineNumber, column, leftoverVisibleColumns, lineNumber + count, allowMoveOnLastLine, 4 /* PositionAffinity.RightOfInjectedText */);
    }
    static moveDown(config, model, cursor, inSelectionMode, linesCount) {
        let lineNumber, column;
        if (cursor.hasSelection() && !inSelectionMode) {
            // If we are in selection mode, move down acts relative to the end of selection
            lineNumber = cursor.selection.endLineNumber;
            column = cursor.selection.endColumn;
        }
        else {
            lineNumber = cursor.position.lineNumber;
            column = cursor.position.column;
        }
        let i = 0;
        let r;
        do {
            r = MoveOperations.down(config, model, lineNumber + i, column, cursor.leftoverVisibleColumns, linesCount, true);
            const np = model.normalizePosition(new Position(r.lineNumber, r.column), 2 /* PositionAffinity.None */);
            if (np.lineNumber > lineNumber) {
                break;
            }
        } while (i++ < 10 && lineNumber + i < model.getLineCount());
        return cursor.move(inSelectionMode, r.lineNumber, r.column, r.leftoverVisibleColumns);
    }
    static translateDown(config, model, cursor) {
        const selection = cursor.selection;
        const selectionStart = MoveOperations.down(config, model, selection.selectionStartLineNumber, selection.selectionStartColumn, cursor.selectionStartLeftoverVisibleColumns, 1, false);
        const position = MoveOperations.down(config, model, selection.positionLineNumber, selection.positionColumn, cursor.leftoverVisibleColumns, 1, false);
        return new SingleCursorState(new Range(selectionStart.lineNumber, selectionStart.column, selectionStart.lineNumber, selectionStart.column), 0 /* SelectionStartKind.Simple */, selectionStart.leftoverVisibleColumns, new Position(position.lineNumber, position.column), position.leftoverVisibleColumns);
    }
    static up(config, model, lineNumber, column, leftoverVisibleColumns, count, allowMoveOnFirstLine) {
        return this.vertical(config, model, lineNumber, column, leftoverVisibleColumns, lineNumber - count, allowMoveOnFirstLine, 3 /* PositionAffinity.LeftOfInjectedText */);
    }
    static moveUp(config, model, cursor, inSelectionMode, linesCount) {
        let lineNumber, column;
        if (cursor.hasSelection() && !inSelectionMode) {
            // If we are in selection mode, move up acts relative to the beginning of selection
            lineNumber = cursor.selection.startLineNumber;
            column = cursor.selection.startColumn;
        }
        else {
            lineNumber = cursor.position.lineNumber;
            column = cursor.position.column;
        }
        const r = MoveOperations.up(config, model, lineNumber, column, cursor.leftoverVisibleColumns, linesCount, true);
        return cursor.move(inSelectionMode, r.lineNumber, r.column, r.leftoverVisibleColumns);
    }
    static translateUp(config, model, cursor) {
        const selection = cursor.selection;
        const selectionStart = MoveOperations.up(config, model, selection.selectionStartLineNumber, selection.selectionStartColumn, cursor.selectionStartLeftoverVisibleColumns, 1, false);
        const position = MoveOperations.up(config, model, selection.positionLineNumber, selection.positionColumn, cursor.leftoverVisibleColumns, 1, false);
        return new SingleCursorState(new Range(selectionStart.lineNumber, selectionStart.column, selectionStart.lineNumber, selectionStart.column), 0 /* SelectionStartKind.Simple */, selectionStart.leftoverVisibleColumns, new Position(position.lineNumber, position.column), position.leftoverVisibleColumns);
    }
    static _isBlankLine(model, lineNumber) {
        if (model.getLineFirstNonWhitespaceColumn(lineNumber) === 0) {
            // empty or contains only whitespace
            return true;
        }
        return false;
    }
    static moveToPrevBlankLine(config, model, cursor, inSelectionMode) {
        let lineNumber = cursor.position.lineNumber;
        // If our current line is blank, move to the previous non-blank line
        while (lineNumber > 1 && this._isBlankLine(model, lineNumber)) {
            lineNumber--;
        }
        // Find the previous blank line
        while (lineNumber > 1 && !this._isBlankLine(model, lineNumber)) {
            lineNumber--;
        }
        return cursor.move(inSelectionMode, lineNumber, model.getLineMinColumn(lineNumber), 0);
    }
    static moveToNextBlankLine(config, model, cursor, inSelectionMode) {
        const lineCount = model.getLineCount();
        let lineNumber = cursor.position.lineNumber;
        // If our current line is blank, move to the next non-blank line
        while (lineNumber < lineCount && this._isBlankLine(model, lineNumber)) {
            lineNumber++;
        }
        // Find the next blank line
        while (lineNumber < lineCount && !this._isBlankLine(model, lineNumber)) {
            lineNumber++;
        }
        return cursor.move(inSelectionMode, lineNumber, model.getLineMinColumn(lineNumber), 0);
    }
    static moveToBeginningOfLine(config, model, cursor, inSelectionMode) {
        const lineNumber = cursor.position.lineNumber;
        const minColumn = model.getLineMinColumn(lineNumber);
        const firstNonBlankColumn = model.getLineFirstNonWhitespaceColumn(lineNumber) || minColumn;
        let column;
        const relevantColumnNumber = cursor.position.column;
        if (relevantColumnNumber === firstNonBlankColumn) {
            column = minColumn;
        }
        else {
            column = firstNonBlankColumn;
        }
        return cursor.move(inSelectionMode, lineNumber, column, 0);
    }
    static moveToEndOfLine(config, model, cursor, inSelectionMode, sticky) {
        const lineNumber = cursor.position.lineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        return cursor.move(inSelectionMode, lineNumber, maxColumn, sticky ? 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */ - maxColumn : 0);
    }
    static moveToBeginningOfBuffer(config, model, cursor, inSelectionMode) {
        return cursor.move(inSelectionMode, 1, 1, 0);
    }
    static moveToEndOfBuffer(config, model, cursor, inSelectionMode) {
        const lastLineNumber = model.getLineCount();
        const lastColumn = model.getLineMaxColumn(lastLineNumber);
        return cursor.move(inSelectionMode, lastLineNumber, lastColumn, 0);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZU9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yTW92ZU9wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUUzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQUUsdUJBQXVCLEVBQWEsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRixPQUFPLEVBQStELGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFHcEgsTUFBTSxPQUFPLGNBQWM7SUFPMUIsWUFBWSxVQUFrQixFQUFFLE1BQWMsRUFBRSxzQkFBOEI7UUFOOUUseUJBQW9CLEdBQVMsU0FBUyxDQUFDO1FBT3RDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxzQkFBc0IsQ0FBQztJQUN0RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sY0FBYztJQUNuQixNQUFNLENBQUMsWUFBWSxDQUFDLEtBQXlCLEVBQUUsUUFBa0I7UUFDdkUsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNuRSxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFD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