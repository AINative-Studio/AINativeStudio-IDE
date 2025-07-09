/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { CoreNavigationCommands } from '../../../browser/coreCommands.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { CursorMove } from '../../../common/cursor/cursorMoveCommands.js';
import { withTestCodeEditor } from '../testCodeEditor.js';
suite('Cursor move command test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const TEXT = [
        '    \tMy First Line\t ',
        '\tMy Second Line',
        '    Third Line🐶',
        '',
        '1'
    ].join('\n');
    function executeTest(callback) {
        withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
            callback(editor, viewModel);
        });
    }
    test('move left should move to left character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveLeft(viewModel);
            cursorEqual(viewModel, 1, 7);
        });
    });
    test('move left should move to left by n characters', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveLeft(viewModel, 3);
            cursorEqual(viewModel, 1, 5);
        });
    });
    test('move left should move to left by half line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveLeft(viewModel, 1, CursorMove.RawUnit.HalfLine);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move left moves to previous line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 2, 3);
            moveLeft(viewModel, 10);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move right should move to right character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 5);
            moveRight(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move right should move to right by n characters', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 2);
            moveRight(viewModel, 6);
            cursorEqual(viewModel, 1, 8);
        });
    });
    test('move right should move to right by half line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 4);
            moveRight(viewModel, 1, CursorMove.RawUnit.HalfLine);
            cursorEqual(viewModel, 1, 14);
        });
    });
    test('move right moves to next line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveRight(viewModel, 100);
            cursorEqual(viewModel, 2, 1);
        });
    });
    test('move to first character of line from middle', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineStart(viewModel);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move to first character of line from first non white space character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 6);
            moveToLineStart(viewModel);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move to first character of line from first character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 1);
            moveToLineStart(viewModel);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move to first non white space character of line from middle', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineFirstNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move to first non white space character of line from first non white space character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 6);
            moveToLineFirstNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move to first non white space character of line from first character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 1);
            moveToLineFirstNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move to end of line from middle', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineEnd(viewModel);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move to end of line from last non white space character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 19);
            moveToLineEnd(viewModel);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move to end of line from line end', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 21);
            moveToLineEnd(viewModel);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move to last non white space character from middle', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineLastNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 19);
        });
    });
    test('move to last non white space character from last non white space character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 19);
            moveToLineLastNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 19);
        });
    });
    test('move to last non white space character from line end', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 21);
            moveToLineLastNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 19);
        });
    });
    test('move to center of line not from center', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineCenter(viewModel);
            cursorEqual(viewModel, 1, 11);
        });
    });
    test('move to center of line from center', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 11);
            moveToLineCenter(viewModel);
            cursorEqual(viewModel, 1, 11);
        });
    });
    test('move to center of line from start', () => {
        executeTest((editor, viewModel) => {
            moveToLineStart(viewModel);
            moveToLineCenter(viewModel);
            cursorEqual(viewModel, 1, 11);
        });
    });
    test('move to center of line from end', () => {
        executeTest((editor, viewModel) => {
            moveToLineEnd(viewModel);
            moveToLineCenter(viewModel);
            cursorEqual(viewModel, 1, 11);
        });
    });
    test('move up by cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 3, 5);
            cursorEqual(viewModel, 3, 5);
            moveUp(viewModel, 2);
            cursorEqual(viewModel, 1, 5);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move up by model line cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 3, 5);
            cursorEqual(viewModel, 3, 5);
            moveUpByModelLine(viewModel, 2);
            cursorEqual(viewModel, 1, 5);
            moveUpByModelLine(viewModel, 1);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move down by model line cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 3, 5);
            cursorEqual(viewModel, 3, 5);
            moveDownByModelLine(viewModel, 2);
            cursorEqual(viewModel, 5, 2);
            moveDownByModelLine(viewModel, 1);
            cursorEqual(viewModel, 5, 2);
        });
    });
    test('move up with selection by cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 3, 5);
            cursorEqual(viewModel, 3, 5);
            moveUp(viewModel, 1, true);
            cursorEqual(viewModel, 2, 2, 3, 5);
            moveUp(viewModel, 1, true);
            cursorEqual(viewModel, 1, 5, 3, 5);
        });
    });
    test('move up and down with tabs by cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 5);
            cursorEqual(viewModel, 1, 5);
            moveDown(viewModel, 4);
            cursorEqual(viewModel, 5, 2);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 4, 1);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 3, 5);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 2, 2);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 1, 5);
        });
    });
    test('move up and down with end of lines starting from a long one by cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveToEndOfLine(viewModel);
            cursorEqual(viewModel, 1, 21);
            moveToEndOfLine(viewModel);
            cursorEqual(viewModel, 1, 21);
            moveDown(viewModel, 2);
            cursorEqual(viewModel, 3, 17);
            moveDown(viewModel, 1);
            cursorEqual(viewModel, 4, 1);
            moveDown(viewModel, 1);
            cursorEqual(viewModel, 5, 2);
            moveUp(viewModel, 4);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move to view top line moves to first visible line if it is first line', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 10, 1);
            moveTo(viewModel, 2, 2);
            moveToTop(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move to view top line moves to top visible line when first line is not visible', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(2, 1, 10, 1);
            moveTo(viewModel, 4, 1);
            moveToTop(viewModel);
            cursorEqual(viewModel, 2, 2);
        });
    });
    test('move to view top line moves to nth line from top', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 10, 1);
            moveTo(viewModel, 4, 1);
            moveToTop(viewModel, 3);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view top line moves to last line if n is greater than last visible line number', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 3, 1);
            moveTo(viewModel, 2, 2);
            moveToTop(viewModel, 4);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view center line moves to the center line', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(3, 1, 3, 1);
            moveTo(viewModel, 2, 2);
            moveToCenter(viewModel);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view bottom line moves to last visible line if it is last line', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 5, 1);
            moveTo(viewModel, 2, 2);
            moveToBottom(viewModel);
            cursorEqual(viewModel, 5, 1);
        });
    });
    test('move to view bottom line moves to last visible line when last line is not visible', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(2, 1, 3, 1);
            moveTo(viewModel, 2, 2);
            moveToBottom(viewModel);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view bottom line moves to nth line from bottom', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 5, 1);
            moveTo(viewModel, 4, 1);
            moveToBottom(viewModel, 3);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view bottom line moves to first line if n is lesser than first visible line number', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(2, 1, 5, 1);
            moveTo(viewModel, 4, 1);
            moveToBottom(viewModel, 5);
            cursorEqual(viewModel, 2, 2);
        });
    });
});
suite('Cursor move by blankline test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const TEXT = [
        '    \tMy First Line\t ',
        '\tMy Second Line',
        '    Third Line🐶',
        '',
        '1',
        '2',
        '3',
        '',
        '         ',
        'a',
        'b',
    ].join('\n');
    function executeTest(callback) {
        withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
            callback(editor, viewModel);
        });
    }
    test('move down should move to start of next blank line', () => {
        executeTest((editor, viewModel) => {
            moveDownByBlankLine(viewModel, false);
            cursorEqual(viewModel, 4, 1);
        });
    });
    test('move up should move to start of previous blank line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 7, 1);
            moveUpByBlankLine(viewModel, false);
            cursorEqual(viewModel, 4, 1);
        });
    });
    test('move down should skip over whitespace if already on blank line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 8, 1);
            moveDownByBlankLine(viewModel, false);
            cursorEqual(viewModel, 11, 1);
        });
    });
    test('move up should skip over whitespace if already on blank line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 9, 1);
            moveUpByBlankLine(viewModel, false);
            cursorEqual(viewModel, 4, 1);
        });
    });
    test('move up should go to first column of first line if not empty', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 2, 1);
            moveUpByBlankLine(viewModel, false);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move down should go to first column of last line if not empty', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 10, 1);
            moveDownByBlankLine(viewModel, false);
            cursorEqual(viewModel, 11, 1);
        });
    });
    test('select down should select to start of next blank line', () => {
        executeTest((editor, viewModel) => {
            moveDownByBlankLine(viewModel, true);
            selectionEqual(viewModel.getSelection(), 4, 1, 1, 1);
        });
    });
    test('select up should select to start of previous blank line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 7, 1);
            moveUpByBlankLine(viewModel, true);
            selectionEqual(viewModel.getSelection(), 4, 1, 7, 1);
        });
    });
});
// Move command
function move(viewModel, args) {
    CoreNavigationCommands.CursorMove.runCoreEditorCommand(viewModel, args);
}
function moveToLineStart(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineStart });
}
function moveToLineFirstNonWhitespaceCharacter(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineFirstNonWhitespaceCharacter });
}
function moveToLineCenter(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineColumnCenter });
}
function moveToLineEnd(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineEnd });
}
function moveToLineLastNonWhitespaceCharacter(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineLastNonWhitespaceCharacter });
}
function moveLeft(viewModel, value, by, select) {
    move(viewModel, { to: CursorMove.RawDirection.Left, by: by, value: value, select: select });
}
function moveRight(viewModel, value, by, select) {
    move(viewModel, { to: CursorMove.RawDirection.Right, by: by, value: value, select: select });
}
function moveUp(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.Up, by: CursorMove.RawUnit.WrappedLine, value: noOfLines, select: select });
}
function moveUpByBlankLine(viewModel, select) {
    move(viewModel, { to: CursorMove.RawDirection.PrevBlankLine, by: CursorMove.RawUnit.WrappedLine, select: select });
}
function moveUpByModelLine(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.Up, value: noOfLines, select: select });
}
function moveDown(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.Down, by: CursorMove.RawUnit.WrappedLine, value: noOfLines, select: select });
}
function moveDownByBlankLine(viewModel, select) {
    move(viewModel, { to: CursorMove.RawDirection.NextBlankLine, by: CursorMove.RawUnit.WrappedLine, select: select });
}
function moveDownByModelLine(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.Down, value: noOfLines, select: select });
}
function moveToTop(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.ViewPortTop, value: noOfLines, select: select });
}
function moveToCenter(viewModel, select) {
    move(viewModel, { to: CursorMove.RawDirection.ViewPortCenter, select: select });
}
function moveToBottom(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.ViewPortBottom, value: noOfLines, select: select });
}
function cursorEqual(viewModel, posLineNumber, posColumn, selLineNumber = posLineNumber, selColumn = posColumn) {
    positionEqual(viewModel.getPosition(), posLineNumber, posColumn);
    selectionEqual(viewModel.getSelection(), posLineNumber, posColumn, selLineNumber, selColumn);
}
function positionEqual(position, lineNumber, column) {
    assert.deepStrictEqual(position, new Position(lineNumber, column), 'position equal');
}
function selectionEqual(selection, posLineNumber, posColumn, selLineNumber, selColumn) {
    assert.deepStrictEqual({
        selectionStartLineNumber: selection.selectionStartLineNumber,
        selectionStartColumn: selection.selectionStartColumn,
        positionLineNumber: selection.positionLineNumber,
        positionColumn: selection.positionColumn
    }, {
        selectionStartLineNumber: selLineNumber,
        selectionStartColumn: selColumn,
        positionLineNumber: posLineNumber,
        positionColumn: posColumn
    }, 'selection equal');
}
function moveTo(viewModel, lineNumber, column, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.MoveToSelect.runCoreEditorCommand(viewModel, {
            position: new Position(lineNumber, column)
        });
    }
    else {
        CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
            position: new Position(lineNumber, column)
        });
    }
}
function moveToEndOfLine(viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorEndSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorEnd.runCoreEditorCommand(viewModel, {});
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZUNvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbnRyb2xsZXIvY3Vyc29yTW92ZUNvbW1hbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFMUUsT0FBTyxFQUFtQixrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRTNFLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7SUFFdEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLElBQUksR0FBRztRQUNaLHdCQUF3QjtRQUN4QixrQkFBa0I7UUFDbEIsa0JBQWtCO1FBQ2xCLEVBQUU7UUFDRixHQUFHO0tBQ0gsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFYixTQUFTLFdBQVcsQ0FBQyxRQUFpRTtRQUNyRixrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2xELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBSSxDQUFDLHlDQUF5QyxF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