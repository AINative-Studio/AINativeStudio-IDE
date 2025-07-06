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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZUNvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29udHJvbGxlci9jdXJzb3JNb3ZlQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUUxRSxPQUFPLEVBQW1CLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFM0UsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUV0Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sSUFBSSxHQUFHO1FBQ1osd0JBQXdCO1FBQ3hCLGtCQUFrQjtRQUNsQixrQkFBa0I7UUFDbEIsRUFBRTtRQUNGLEdBQUc7S0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUViLFNBQVMsV0FBVyxDQUFDLFFBQWlFO1FBQ3JGLGtCQUFrQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbEQsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJLENBQUMseUNBQXlDLEVB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VyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLFNBQVMsQ0FBQyw2QkFBNkIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV0RSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QixZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFeEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3RUFBd0UsRUFBRSxHQUFHLEVBQUU7UUFDbkYsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLFNBQVMsQ0FBQyw2QkFBNkIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV0RSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QixZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFeEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtRkFBbUYsRUFBRSxHQUFHLEVBQUU7UUFDOUYsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLFNBQVMsQ0FBQyw2QkFBNkIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV0RSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFD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