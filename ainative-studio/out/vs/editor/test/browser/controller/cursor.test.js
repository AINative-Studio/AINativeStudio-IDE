/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { CoreEditingCommands, CoreNavigationCommands } from '../../../browser/coreCommands.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../common/languages.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { IndentAction } from '../../../common/languages/languageConfiguration.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { TextModel } from '../../../common/model/textModel.js';
import { createCodeEditorServices, instantiateTestCodeEditor, withTestCodeEditor } from '../testCodeEditor.js';
import { createTextModel, instantiateTextModel } from '../../common/testTextModel.js';
import { InputMode } from '../../../common/inputMode.js';
// --------- utils
function moveTo(editor, viewModel, lineNumber, column, inSelectionMode = false) {
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
function moveLeft(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorLeftSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorLeft.runCoreEditorCommand(viewModel, {});
    }
}
function moveRight(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorRightSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorRight.runCoreEditorCommand(viewModel, {});
    }
}
function moveDown(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorDownSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorDown.runCoreEditorCommand(viewModel, {});
    }
}
function moveUp(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorUpSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorUp.runCoreEditorCommand(viewModel, {});
    }
}
function moveToBeginningOfLine(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorHomeSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorHome.runCoreEditorCommand(viewModel, {});
    }
}
function moveToEndOfLine(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorEndSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorEnd.runCoreEditorCommand(viewModel, {});
    }
}
function moveToBeginningOfBuffer(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorTopSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorTop.runCoreEditorCommand(viewModel, {});
    }
}
function moveToEndOfBuffer(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorBottomSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorBottom.runCoreEditorCommand(viewModel, {});
    }
}
function assertCursor(viewModel, what) {
    let selections;
    if (what instanceof Position) {
        selections = [new Selection(what.lineNumber, what.column, what.lineNumber, what.column)];
    }
    else if (what instanceof Selection) {
        selections = [what];
    }
    else {
        selections = what;
    }
    const actual = viewModel.getSelections().map(s => s.toString());
    const expected = selections.map(s => s.toString());
    assert.deepStrictEqual(actual, expected);
}
suite('Editor Controller - Cursor', () => {
    const LINE1 = '    \tMy First Line\t ';
    const LINE2 = '\tMy Second Line';
    const LINE3 = '    Third Line🐶';
    const LINE4 = '';
    const LINE5 = '1';
    const TEXT = LINE1 + '\r\n' +
        LINE2 + '\n' +
        LINE3 + '\n' +
        LINE4 + '\r\n' +
        LINE5;
    function runTest(callback) {
        withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
            callback(editor, viewModel);
        });
    }
    ensureNoDisposablesAreLeakedInTestSuite();
    test('cursor initialized', () => {
        runTest((editor, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    // --------- absolute move
    test('no move', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 1);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 2);
            assertCursor(viewModel, new Position(1, 2));
        });
    });
    test('move in selection mode', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 2, true);
            assertCursor(viewModel, new Selection(1, 1, 1, 2));
        });
    });
    test('move beyond line end', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 25);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('move empty line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 4, 20);
            assertCursor(viewModel, new Position(4, 1));
        });
    });
    test('move one char line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 5, 20);
            assertCursor(viewModel, new Position(5, 2));
        });
    });
    test('selection down', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 1, true);
            assertCursor(viewModel, new Selection(1, 1, 2, 1));
        });
    });
    test('move and then select', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 3);
            assertCursor(viewModel, new Position(2, 3));
            moveTo(editor, viewModel, 2, 15, true);
            assertCursor(viewModel, new Selection(2, 3, 2, 15));
            moveTo(editor, viewModel, 1, 2, true);
            assertCursor(viewModel, new Selection(2, 3, 1, 2));
        });
    });
    // --------- move left
    test('move left on top left position', () => {
        runTest((editor, viewModel) => {
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move left', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 3);
            assertCursor(viewModel, new Position(1, 3));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(1, 2));
        });
    });
    test('move left with surrogate pair', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 17);
            assertCursor(viewModel, new Position(3, 17));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(3, 15));
        });
    });
    test('move left goes to previous row', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            assertCursor(viewModel, new Position(2, 1));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(1, 21));
        });
    });
    test('move left selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            assertCursor(viewModel, new Position(2, 1));
            moveLeft(editor, viewModel, true);
            assertCursor(viewModel, new Selection(2, 1, 1, 21));
        });
    });
    // --------- move right
    test('move right on bottom right position', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 5, 2);
            assertCursor(viewModel, new Position(5, 2));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(5, 2));
        });
    });
    test('move right', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 3);
            assertCursor(viewModel, new Position(1, 3));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(1, 4));
        });
    });
    test('move right with surrogate pair', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 15);
            assertCursor(viewModel, new Position(3, 15));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(3, 17));
        });
    });
    test('move right goes to next row', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 21);
            assertCursor(viewModel, new Position(1, 21));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(2, 1));
        });
    });
    test('move right selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 21);
            assertCursor(viewModel, new Position(1, 21));
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 21, 2, 1));
        });
    });
    // --------- move down
    test('move down', () => {
        runTest((editor, viewModel) => {
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(3, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(4, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, 2));
        });
    });
    test('move down with selection', () => {
        runTest((editor, viewModel) => {
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 2, 1));
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 3, 1));
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 4, 1));
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 5, 1));
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 5, 2));
        });
    });
    test('move down with tabs', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 5);
            assertCursor(viewModel, new Position(1, 5));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 2));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(3, 5));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(4, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, 2));
        });
    });
    // --------- move up
    test('move up', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 5);
            assertCursor(viewModel, new Position(3, 5));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(2, 2));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 5));
        });
    });
    test('move up with selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 5);
            assertCursor(viewModel, new Position(3, 5));
            moveUp(editor, viewModel, true);
            assertCursor(viewModel, new Selection(3, 5, 2, 2));
            moveUp(editor, viewModel, true);
            assertCursor(viewModel, new Selection(3, 5, 1, 5));
        });
    });
    test('move up and down with tabs', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 5);
            assertCursor(viewModel, new Position(1, 5));
            moveDown(editor, viewModel);
            moveDown(editor, viewModel);
            moveDown(editor, viewModel);
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, 2));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(4, 1));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(3, 5));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(2, 2));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 5));
        });
    });
    test('move up and down with end of lines starting from a long one', () => {
        runTest((editor, viewModel) => {
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, LINE2.length + 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(3, LINE3.length + 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(4, LINE4.length + 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, LINE5.length + 1));
            moveUp(editor, viewModel);
            moveUp(editor, viewModel);
            moveUp(editor, viewModel);
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('issue #44465: cursor position not correct when move', () => {
        runTest((editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            // going once up on the first line remembers the offset visual columns
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 2));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 5));
            // going twice up on the first line discards the offset visual columns
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 1));
        });
    });
    test('issue #144041: Cursor up/down works', () => {
        const model = createTextModel([
            'Word1 Word2 Word3 Word4',
            'Word5 Word6 Word7 Word8',
        ].join('\n'));
        withTestCodeEditor(model, { wrappingIndent: 'indent', wordWrap: 'wordWrapColumn', wordWrapColumn: 20 }, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1)]);
            const cursorPositions = [];
            function reportCursorPosition() {
                cursorPositions.push(viewModel.getCursorStates()[0].viewState.position.toString());
            }
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            assert.deepStrictEqual(cursorPositions, [
                '(1,1)',
                '(2,5)',
                '(3,1)',
                '(4,5)',
                '(4,10)',
                '(3,1)',
                '(2,5)',
                '(1,1)',
                '(1,1)',
            ]);
        });
        model.dispose();
    });
    test('issue #140195: Cursor up/down makes progress', () => {
        const model = createTextModel([
            'Word1 Word2 Word3 Word4',
            'Word5 Word6 Word7 Word8',
        ].join('\n'));
        withTestCodeEditor(model, { wrappingIndent: 'indent', wordWrap: 'wordWrapColumn', wordWrapColumn: 20 }, (editor, viewModel) => {
            editor.changeDecorations((changeAccessor) => {
                changeAccessor.deltaDecorations([], [
                    {
                        range: new Range(1, 22, 1, 22),
                        options: {
                            showIfCollapsed: true,
                            description: 'test',
                            after: {
                                content: 'some very very very very very very very very long text',
                            }
                        }
                    }
                ]);
            });
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1)]);
            const cursorPositions = [];
            function reportCursorPosition() {
                cursorPositions.push(viewModel.getCursorStates()[0].viewState.position.toString());
            }
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            assert.deepStrictEqual(cursorPositions, [
                '(1,1)',
                '(2,5)',
                '(5,19)',
                '(6,1)',
                '(7,5)',
                '(6,1)',
                '(2,8)',
                '(1,1)',
                '(1,1)',
            ]);
        });
        model.dispose();
    });
    // --------- move to beginning of line
    test('move to beginning of line', () => {
        runTest((editor, viewModel) => {
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 6));
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of line from within line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 6));
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of line from whitespace at beginning of line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 2);
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 6));
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of line from within line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveToBeginningOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 8, 1, 6));
            moveToBeginningOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 8, 1, 1));
        });
    });
    test('move to beginning of line with selection multiline forward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveTo(editor, viewModel, 3, 9, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 5, 3, 5));
        });
    });
    test('move to beginning of line with selection multiline backward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 9);
            moveTo(editor, viewModel, 1, 8, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(1, 6, 1, 6));
        });
    });
    test('move to beginning of line with selection single line forward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 2);
            moveTo(editor, viewModel, 3, 9, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 5, 3, 5));
        });
    });
    test('move to beginning of line with selection single line backward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 9);
            moveTo(editor, viewModel, 3, 2, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 5, 3, 5));
        });
    });
    test('issue #15401: "End" key is behaving weird when text is selected part 1', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveTo(editor, viewModel, 3, 9, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 5, 3, 5));
        });
    });
    test('issue #17011: Shift+home/end now go to the end of the selection start\'s line, not the selection\'s end', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveTo(editor, viewModel, 3, 9, true);
            moveToBeginningOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 8, 3, 5));
        });
    });
    // --------- move to end of line
    test('move to end of line', () => {
        runTest((editor, viewModel) => {
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('move to end of line from within line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 6);
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('move to end of line from whitespace at end of line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 20);
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('move to end of line from within line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 6);
            moveToEndOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 6, 1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 6, 1, LINE1.length + 1));
        });
    });
    test('move to end of line with selection multiline forward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 1);
            moveTo(editor, viewModel, 3, 9, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 17, 3, 17));
        });
    });
    test('move to end of line with selection multiline backward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 9);
            moveTo(editor, viewModel, 1, 1, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(1, 21, 1, 21));
        });
    });
    test('move to end of line with selection single line forward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 1);
            moveTo(editor, viewModel, 3, 9, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 17, 3, 17));
        });
    });
    test('move to end of line with selection single line backward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 9);
            moveTo(editor, viewModel, 3, 1, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 17, 3, 17));
        });
    });
    test('issue #15401: "End" key is behaving weird when text is selected part 2', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 1);
            moveTo(editor, viewModel, 3, 9, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 17, 3, 17));
        });
    });
    // --------- move to beginning of buffer
    test('move to beginning of buffer', () => {
        runTest((editor, viewModel) => {
            moveToBeginningOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of buffer from within first line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 3);
            moveToBeginningOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of buffer from within another line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            moveToBeginningOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of buffer from within first line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 3);
            moveToBeginningOfBuffer(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 3, 1, 1));
        });
    });
    test('move to beginning of buffer from within another line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            moveToBeginningOfBuffer(editor, viewModel, true);
            assertCursor(viewModel, new Selection(3, 3, 1, 1));
        });
    });
    // --------- move to end of buffer
    test('move to end of buffer', () => {
        runTest((editor, viewModel) => {
            moveToEndOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(5, LINE5.length + 1));
        });
    });
    test('move to end of buffer from within last line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 5, 1);
            moveToEndOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(5, LINE5.length + 1));
        });
    });
    test('move to end of buffer from within another line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            moveToEndOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(5, LINE5.length + 1));
        });
    });
    test('move to end of buffer from within last line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 5, 1);
            moveToEndOfBuffer(editor, viewModel, true);
            assertCursor(viewModel, new Selection(5, 1, 5, LINE5.length + 1));
        });
    });
    test('move to end of buffer from within another line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            moveToEndOfBuffer(editor, viewModel, true);
            assertCursor(viewModel, new Selection(3, 3, 5, LINE5.length + 1));
        });
    });
    // --------- misc
    test('select all', () => {
        runTest((editor, viewModel) => {
            CoreNavigationCommands.SelectAll.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, new Selection(1, 1, 5, LINE5.length + 1));
        });
    });
    // --------- eventing
    test('no move doesn\'t trigger event', () => {
        runTest((editor, viewModel) => {
            const disposable = viewModel.onEvent((e) => {
                assert.ok(false, 'was not expecting event');
            });
            moveTo(editor, viewModel, 1, 1);
            disposable.dispose();
        });
    });
    test('move eventing', () => {
        runTest((editor, viewModel) => {
            let events = 0;
            const disposable = viewModel.onEvent((e) => {
                if (e.kind === 7 /* OutgoingViewModelEventKind.CursorStateChanged */) {
                    events++;
                    assert.deepStrictEqual(e.selections, [new Selection(1, 2, 1, 2)]);
                }
            });
            moveTo(editor, viewModel, 1, 2);
            assert.strictEqual(events, 1, 'receives 1 event');
            disposable.dispose();
        });
    });
    test('move in selection mode eventing', () => {
        runTest((editor, viewModel) => {
            let events = 0;
            const disposable = viewModel.onEvent((e) => {
                if (e.kind === 7 /* OutgoingViewModelEventKind.CursorStateChanged */) {
                    events++;
                    assert.deepStrictEqual(e.selections, [new Selection(1, 1, 1, 2)]);
                }
            });
            moveTo(editor, viewModel, 1, 2, true);
            assert.strictEqual(events, 1, 'receives 1 event');
            disposable.dispose();
        });
    });
    // --------- state save & restore
    test('saveState & restoreState', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 1, true);
            assertCursor(viewModel, new Selection(1, 1, 2, 1));
            const savedState = JSON.stringify(viewModel.saveCursorState());
            moveTo(editor, viewModel, 1, 1, false);
            assertCursor(viewModel, new Position(1, 1));
            viewModel.restoreCursorState(JSON.parse(savedState));
            assertCursor(viewModel, new Selection(1, 1, 2, 1));
        });
    });
    // --------- updating cursor
    test('Independent model edit 1', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 16, true);
            editor.getModel().applyEdits([EditOperation.delete(new Range(2, 1, 2, 2))]);
            assertCursor(viewModel, new Selection(1, 1, 2, 15));
        });
    });
    test('column select 1', () => {
        withTestCodeEditor([
            '\tprivate compute(a:number): boolean {',
            '\t\tif (a + 3 === 0 || a + 5 === 0) {',
            '\t\t\treturn false;',
            '\t\t}',
            '\t}'
        ], {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Position(1, 7));
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: new Position(4, 4),
                viewPosition: new Position(4, 4),
                mouseColumn: 15,
                doColumnSelect: true
            });
            const expectedSelections = [
                new Selection(1, 7, 1, 12),
                new Selection(2, 4, 2, 9),
                new Selection(3, 3, 3, 6),
                new Selection(4, 4, 4, 4),
            ];
            assertCursor(viewModel, expectedSelections);
        });
    });
    test('grapheme breaking', () => {
        withTestCodeEditor([
            'abcabc',
            'ãããããã',
            '辻󠄀辻󠄀辻󠄀',
            'பு',
        ], {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 1, 2, 1)]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(2, 3));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(2, 1));
            viewModel.setSelections('test', [new Selection(3, 1, 3, 1)]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(3, 4));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(3, 1));
            viewModel.setSelections('test', [new Selection(4, 1, 4, 1)]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(4, 3));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(4, 1));
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 5));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(3, 4));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(2, 5));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 3));
        });
    });
    test('issue #4905 - column select is biased to the right', () => {
        withTestCodeEditor([
            'var gulp = require("gulp");',
            'var path = require("path");',
            'var rimraf = require("rimraf");',
            'var isarray = require("isarray");',
            'var merge = require("merge-stream");',
            'var concat = require("gulp-concat");',
            'var newer = require("gulp-newer");',
        ].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 4, false);
            assertCursor(viewModel, new Position(1, 4));
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: new Position(4, 1),
                viewPosition: new Position(4, 1),
                mouseColumn: 1,
                doColumnSelect: true
            });
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 1),
                new Selection(2, 4, 2, 1),
                new Selection(3, 4, 3, 1),
                new Selection(4, 4, 4, 1),
            ]);
        });
    });
    test('issue #20087: column select with mouse', () => {
        withTestCodeEditor([
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" Key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SoMEKEy" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" valuE="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="00X"/>',
        ].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 10, 10, false);
            assertCursor(viewModel, new Position(10, 10));
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: new Position(1, 1),
                viewPosition: new Position(1, 1),
                mouseColumn: 1,
                doColumnSelect: true
            });
            assertCursor(viewModel, [
                new Selection(10, 10, 10, 1),
                new Selection(9, 10, 9, 1),
                new Selection(8, 10, 8, 1),
                new Selection(7, 10, 7, 1),
                new Selection(6, 10, 6, 1),
                new Selection(5, 10, 5, 1),
                new Selection(4, 10, 4, 1),
                new Selection(3, 10, 3, 1),
                new Selection(2, 10, 2, 1),
                new Selection(1, 10, 1, 1),
            ]);
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: new Position(1, 1),
                viewPosition: new Position(1, 1),
                mouseColumn: 1,
                doColumnSelect: true
            });
            assertCursor(viewModel, [
                new Selection(10, 10, 10, 1),
                new Selection(9, 10, 9, 1),
                new Selection(8, 10, 8, 1),
                new Selection(7, 10, 7, 1),
                new Selection(6, 10, 6, 1),
                new Selection(5, 10, 5, 1),
                new Selection(4, 10, 4, 1),
                new Selection(3, 10, 3, 1),
                new Selection(2, 10, 2, 1),
                new Selection(1, 10, 1, 1),
            ]);
        });
    });
    test('issue #20087: column select with keyboard', () => {
        withTestCodeEditor([
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" Key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SoMEKEy" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" valuE="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="00X"/>',
        ].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 10, 10, false);
            assertCursor(viewModel, new Position(10, 10));
            CoreNavigationCommands.CursorColumnSelectLeft.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(10, 10, 10, 9)
            ]);
            CoreNavigationCommands.CursorColumnSelectLeft.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(10, 10, 10, 8)
            ]);
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(10, 10, 10, 9)
            ]);
            CoreNavigationCommands.CursorColumnSelectUp.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(10, 10, 10, 9),
                new Selection(9, 10, 9, 9),
            ]);
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(10, 10, 10, 9)
            ]);
        });
    });
    test('issue #118062: Column selection cannot select first position of a line', () => {
        withTestCodeEditor([
            'hello world',
        ].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 2, false);
            assertCursor(viewModel, new Position(1, 2));
            CoreNavigationCommands.CursorColumnSelectLeft.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 2, 1, 1)
            ]);
        });
    });
    test('column select with keyboard', () => {
        withTestCodeEditor([
            'var gulp = require("gulp");',
            'var path = require("path");',
            'var rimraf = require("rimraf");',
            'var isarray = require("isarray");',
            'var merge = require("merge-stream");',
            'var concat = require("gulp-concat");',
            'var newer = require("gulp-newer");',
        ].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 4, false);
            assertCursor(viewModel, new Position(1, 4));
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 5)
            ]);
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 5),
                new Selection(2, 4, 2, 5)
            ]);
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 5),
                new Selection(2, 4, 2, 5),
                new Selection(3, 4, 3, 5),
            ]);
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 5),
                new Selection(2, 4, 2, 5),
                new Selection(3, 4, 3, 5),
                new Selection(4, 4, 4, 5),
                new Selection(5, 4, 5, 5),
                new Selection(6, 4, 6, 5),
                new Selection(7, 4, 7, 5),
            ]);
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 6),
                new Selection(2, 4, 2, 6),
                new Selection(3, 4, 3, 6),
                new Selection(4, 4, 4, 6),
                new Selection(5, 4, 5, 6),
                new Selection(6, 4, 6, 6),
                new Selection(7, 4, 7, 6),
            ]);
            // 10 times
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 16),
                new Selection(2, 4, 2, 16),
                new Selection(3, 4, 3, 16),
                new Selection(4, 4, 4, 16),
                new Selection(5, 4, 5, 16),
                new Selection(6, 4, 6, 16),
                new Selection(7, 4, 7, 16),
            ]);
            // 10 times
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 26),
                new Selection(2, 4, 2, 26),
                new Selection(3, 4, 3, 26),
                new Selection(4, 4, 4, 26),
                new Selection(5, 4, 5, 26),
                new Selection(6, 4, 6, 26),
                new Selection(7, 4, 7, 26),
            ]);
            // 2 times => reaching the ending of lines 1 and 2
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 28),
                new Selection(4, 4, 4, 28),
                new Selection(5, 4, 5, 28),
                new Selection(6, 4, 6, 28),
                new Selection(7, 4, 7, 28),
            ]);
            // 4 times => reaching the ending of line 3
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 32),
                new Selection(5, 4, 5, 32),
                new Selection(6, 4, 6, 32),
                new Selection(7, 4, 7, 32),
            ]);
            // 2 times => reaching the ending of line 4
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 34),
                new Selection(6, 4, 6, 34),
                new Selection(7, 4, 7, 34),
            ]);
            // 1 time => reaching the ending of line 7
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 35),
                new Selection(6, 4, 6, 35),
                new Selection(7, 4, 7, 35),
            ]);
            // 3 times => reaching the ending of lines 5 & 6
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 37),
                new Selection(6, 4, 6, 37),
                new Selection(7, 4, 7, 35),
            ]);
            // cannot go anywhere anymore
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 37),
                new Selection(6, 4, 6, 37),
                new Selection(7, 4, 7, 35),
            ]);
            // cannot go anywhere anymore even if we insist
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 37),
                new Selection(6, 4, 6, 37),
                new Selection(7, 4, 7, 35),
            ]);
            // can easily go back
            CoreNavigationCommands.CursorColumnSelectLeft.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 36),
                new Selection(6, 4, 6, 36),
                new Selection(7, 4, 7, 35),
            ]);
        });
    });
    test('setSelection / setPosition with source', () => {
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                return new EncodedTokenizationResult(new Uint32Array(0), state);
            }
        };
        const LANGUAGE_ID = 'modelModeTest1';
        const languageRegistration = TokenizationRegistry.register(LANGUAGE_ID, tokenizationSupport);
        const model = createTextModel('Just text', LANGUAGE_ID);
        withTestCodeEditor(model, {}, (editor1, cursor1) => {
            let event = undefined;
            const disposable = editor1.onDidChangeCursorPosition(e => {
                event = e;
            });
            editor1.setSelection(new Range(1, 2, 1, 3), 'navigation');
            assert.strictEqual(event.source, 'navigation');
            event = undefined;
            editor1.setPosition(new Position(1, 2), 'navigation');
            assert.strictEqual(event.source, 'navigation');
            disposable.dispose();
        });
        languageRegistration.dispose();
        model.dispose();
    });
});
suite('Editor Controller', () => {
    const surroundingLanguageId = 'surroundingLanguage';
    const indentRulesLanguageId = 'indentRulesLanguage';
    const electricCharLanguageId = 'electricCharLanguage';
    const autoClosingLanguageId = 'autoClosingLanguage';
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createCodeEditorServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: surroundingLanguageId }));
        disposables.add(languageConfigurationService.register(surroundingLanguageId, {
            autoClosingPairs: [{ open: '(', close: ')' }]
        }));
        setupIndentRulesLanguage(indentRulesLanguageId, {
            decreaseIndentPattern: /^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(case\b.*|default):\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
            increaseIndentPattern: /^((?!\/\/).)*(\{[^}"'`]*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(case\b.*|default):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
            indentNextLinePattern: /^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$)/,
            unIndentedLinePattern: /^(?!.*([;{}]|\S:)\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!.*(\{[^}"']*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(case\b.*|default):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(case\b.*|default):\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$))/
        });
        disposables.add(languageService.registerLanguage({ id: electricCharLanguageId }));
        disposables.add(languageConfigurationService.register(electricCharLanguageId, {
            __electricCharacterSupport: {
                docComment: { open: '/**', close: ' */' }
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ]
        }));
        setupAutoClosingLanguage();
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function setupOnEnterLanguage(indentAction) {
        const onEnterLanguageId = 'onEnterMode';
        disposables.add(languageService.registerLanguage({ id: onEnterLanguageId }));
        disposables.add(languageConfigurationService.register(onEnterLanguageId, {
            onEnterRules: [{
                    beforeText: /.*/,
                    action: {
                        indentAction: indentAction
                    }
                }]
        }));
        return onEnterLanguageId;
    }
    function setupIndentRulesLanguage(languageId, indentationRules) {
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            indentationRules: indentationRules
        }));
        return languageId;
    }
    function setupAutoClosingLanguage() {
        disposables.add(languageService.registerLanguage({ id: autoClosingLanguageId }));
        disposables.add(languageConfigurationService.register(autoClosingLanguageId, {
            comments: {
                blockComment: ['/*', '*/']
            },
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '\'', close: '\'', notIn: ['string', 'comment'] },
                { open: '\"', close: '\"', notIn: ['string'] },
                { open: '`', close: '`', notIn: ['string', 'comment'] },
                { open: '/**', close: ' */', notIn: ['string'] },
                { open: 'begin', close: 'end', notIn: ['string'] }
            ],
            __electricCharacterSupport: {
                docComment: { open: '/**', close: ' */' }
            }
        }));
    }
    function setupAutoClosingLanguageTokenization() {
        class BaseState {
            constructor(parent = null) {
                this.parent = parent;
            }
            clone() { return this; }
            equals(other) {
                if (!(other instanceof BaseState)) {
                    return false;
                }
                if (!this.parent && !other.parent) {
                    return true;
                }
                if (!this.parent || !other.parent) {
                    return false;
                }
                return this.parent.equals(other.parent);
            }
        }
        class StringState {
            constructor(char, parentState) {
                this.char = char;
                this.parentState = parentState;
            }
            clone() { return this; }
            equals(other) { return other instanceof StringState && this.char === other.char && this.parentState.equals(other.parentState); }
        }
        class BlockCommentState {
            constructor(parentState) {
                this.parentState = parentState;
            }
            clone() { return this; }
            equals(other) { return other instanceof StringState && this.parentState.equals(other.parentState); }
        }
        const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(autoClosingLanguageId);
        disposables.add(TokenizationRegistry.register(autoClosingLanguageId, {
            getInitialState: () => new BaseState(),
            tokenize: undefined,
            tokenizeEncoded: function (line, hasEOL, _state) {
                let state = _state;
                const tokens = [];
                const generateToken = (length, type, newState) => {
                    if (tokens.length > 0 && tokens[tokens.length - 1].type === type) {
                        // grow last tokens
                        tokens[tokens.length - 1].length += length;
                    }
                    else {
                        tokens.push({ length, type });
                    }
                    line = line.substring(length);
                    if (newState) {
                        state = newState;
                    }
                };
                while (line.length > 0) {
                    advance();
                }
                const result = new Uint32Array(tokens.length * 2);
                let startIndex = 0;
                for (let i = 0; i < tokens.length; i++) {
                    result[2 * i] = startIndex;
                    result[2 * i + 1] = ((encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
                        | (tokens[i].type << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */));
                    startIndex += tokens[i].length;
                }
                return new EncodedTokenizationResult(result, state);
                function advance() {
                    if (state instanceof BaseState) {
                        const m1 = line.match(/^[^'"`{}/]+/g);
                        if (m1) {
                            return generateToken(m1[0].length, 0 /* StandardTokenType.Other */);
                        }
                        if (/^['"`]/.test(line)) {
                            return generateToken(1, 2 /* StandardTokenType.String */, new StringState(line.charAt(0), state));
                        }
                        if (/^{/.test(line)) {
                            return generateToken(1, 0 /* StandardTokenType.Other */, new BaseState(state));
                        }
                        if (/^}/.test(line)) {
                            return generateToken(1, 0 /* StandardTokenType.Other */, state.parent || new BaseState());
                        }
                        if (/^\/\//.test(line)) {
                            return generateToken(line.length, 1 /* StandardTokenType.Comment */, state);
                        }
                        if (/^\/\*/.test(line)) {
                            return generateToken(2, 1 /* StandardTokenType.Comment */, new BlockCommentState(state));
                        }
                        return generateToken(1, 0 /* StandardTokenType.Other */, state);
                    }
                    else if (state instanceof StringState) {
                        const m1 = line.match(/^[^\\'"`\$]+/g);
                        if (m1) {
                            return generateToken(m1[0].length, 2 /* StandardTokenType.String */);
                        }
                        if (/^\\/.test(line)) {
                            return generateToken(2, 2 /* StandardTokenType.String */);
                        }
                        if (line.charAt(0) === state.char) {
                            return generateToken(1, 2 /* StandardTokenType.String */, state.parentState);
                        }
                        if (/^\$\{/.test(line)) {
                            return generateToken(2, 0 /* StandardTokenType.Other */, new BaseState(state));
                        }
                        return generateToken(1, 0 /* StandardTokenType.Other */, state);
                    }
                    else if (state instanceof BlockCommentState) {
                        const m1 = line.match(/^[^*]+/g);
                        if (m1) {
                            return generateToken(m1[0].length, 2 /* StandardTokenType.String */);
                        }
                        if (/^\*\//.test(line)) {
                            return generateToken(2, 1 /* StandardTokenType.Comment */, state.parentState);
                        }
                        return generateToken(1, 0 /* StandardTokenType.Other */, state);
                    }
                    else {
                        throw new Error(`unknown state`);
                    }
                }
            }
        }));
    }
    function setAutoClosingLanguageEnabledSet(chars) {
        disposables.add(languageConfigurationService.register(autoClosingLanguageId, {
            autoCloseBefore: chars,
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '\'', close: '\'', notIn: ['string', 'comment'] },
                { open: '\"', close: '\"', notIn: ['string'] },
                { open: '`', close: '`', notIn: ['string', 'comment'] },
                { open: '/**', close: ' */', notIn: ['string'] }
            ],
        }));
    }
    function createTextModel(text, languageId = null, options = TextModel.DEFAULT_CREATION_OPTIONS, uri = null) {
        return disposables.add(instantiateTextModel(instantiationService, text, languageId, options, uri));
    }
    function withTestCodeEditor(text, options, callback) {
        let model;
        if (typeof text === 'string') {
            model = createTextModel(text);
        }
        else if (Array.isArray(text)) {
            model = createTextModel(text.join('\n'));
        }
        else {
            model = text;
        }
        const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model, options));
        const viewModel = editor.getViewModel();
        viewModel.setHasFocus(true);
        callback(editor, viewModel);
    }
    function usingCursor(opts, callback) {
        const model = createTextModel(opts.text.join('\n'), opts.languageId, opts.modelOpts);
        const editorOptions = opts.editorOpts || {};
        withTestCodeEditor(model, editorOptions, (editor, viewModel) => {
            callback(editor, model, viewModel);
        });
    }
    let AutoClosingColumnType;
    (function (AutoClosingColumnType) {
        AutoClosingColumnType[AutoClosingColumnType["Normal"] = 0] = "Normal";
        AutoClosingColumnType[AutoClosingColumnType["Special1"] = 1] = "Special1";
        AutoClosingColumnType[AutoClosingColumnType["Special2"] = 2] = "Special2";
    })(AutoClosingColumnType || (AutoClosingColumnType = {}));
    function extractAutoClosingSpecialColumns(maxColumn, annotatedLine) {
        const result = [];
        for (let j = 1; j <= maxColumn; j++) {
            result[j] = 0 /* AutoClosingColumnType.Normal */;
        }
        let column = 1;
        for (let j = 0; j < annotatedLine.length; j++) {
            if (annotatedLine.charAt(j) === '|') {
                result[column] = 1 /* AutoClosingColumnType.Special1 */;
            }
            else if (annotatedLine.charAt(j) === '!') {
                result[column] = 2 /* AutoClosingColumnType.Special2 */;
            }
            else {
                column++;
            }
        }
        return result;
    }
    function assertType(editor, model, viewModel, lineNumber, column, chr, expectedInsert, message) {
        const lineContent = model.getLineContent(lineNumber);
        const expected = lineContent.substr(0, column - 1) + expectedInsert + lineContent.substr(column - 1);
        moveTo(editor, viewModel, lineNumber, column);
        viewModel.type(chr, 'keyboard');
        assert.deepStrictEqual(model.getLineContent(lineNumber), expected, message);
        model.undo();
    }
    test('issue microsoft/monaco-editor#443: Indentation of a single row deletes selected text in some cases', () => {
        const model = createTextModel([
            'Hello world!',
            'another line'
        ].join('\n'), undefined, {
            insertSpaces: false
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 13)]);
            // Check that indenting maintains the selection start at column 1
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 1, 1, 14));
        });
    });
    test('Bug 9121: Auto indent + undo + redo is funky', () => {
        const model = createTextModel([
            ''
        ].join('\n'), undefined, {
            insertSpaces: false,
            trimAutoWhitespace: false
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n', 'assert1');
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t', 'assert2');
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\n\t', 'assert3');
            viewModel.type('x');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\n\tx', 'assert4');
            CoreNavigationCommands.CursorLeft.runCoreEditorCommand(viewModel, {});
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\n\tx', 'assert5');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\nx', 'assert6');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\tx', 'assert7');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert8');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x', 'assert9');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert10');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\nx', 'assert11');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\n\tx', 'assert12');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\nx', 'assert13');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert14');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x', 'assert15');
        });
    });
    test('issue #23539: Setting model EOL isn\'t undoable', () => {
        withTestCodeEditor([
            'Hello',
            'world'
        ], {}, (editor, viewModel) => {
            const model = editor.getModel();
            assertCursor(viewModel, new Position(1, 1));
            model.setEOL(0 /* EndOfLineSequence.LF */);
            assert.strictEqual(model.getValue(), 'Hello\nworld');
            model.pushEOL(1 /* EndOfLineSequence.CRLF */);
            assert.strictEqual(model.getValue(), 'Hello\r\nworld');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), 'Hello\nworld');
        });
    });
    test('issue #47733: Undo mangles unicode characters', () => {
        const languageId = 'myMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            surroundingPairs: [{ open: '%', close: '%' }]
        }));
        const model = createTextModel('\'👁\'', languageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 1, 1, 2));
            viewModel.type('%', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '%\'%👁\'', 'assert1');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\'👁\'', 'assert2');
        });
    });
    test('issue #46208: Allow empty selections in the undo/redo stack', () => {
        const model = createTextModel('');
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('Hello', 'keyboard');
            viewModel.type(' ', 'keyboard');
            viewModel.type('world', 'keyboard');
            viewModel.type(' ', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'Hello world ');
            assertCursor(viewModel, new Position(1, 13));
            moveLeft(editor, viewModel);
            moveRight(editor, viewModel);
            model.pushEditOperations([], [EditOperation.replaceMove(new Range(1, 12, 1, 13), '')], () => []);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world ');
            assertCursor(viewModel, new Selection(1, 13, 1, 13));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello');
            assertCursor(viewModel, new Position(1, 6));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '');
            assertCursor(viewModel, new Position(1, 1));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello');
            assertCursor(viewModel, new Position(1, 6));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world ');
            assertCursor(viewModel, new Position(1, 13));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
        });
    });
    test('bug #16815:Shift+Tab doesn\'t go back to tabstop', () => {
        const languageId = setupOnEnterLanguage(IndentAction.IndentOutdent);
        const model = createTextModel([
            '     function baz() {'
        ].join('\n'), languageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 6, false);
            assertCursor(viewModel, new Selection(1, 6, 1, 6));
            CoreEditingCommands.Outdent.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    function baz() {');
            assertCursor(viewModel, new Selection(1, 5, 1, 5));
        });
    });
    test('Bug #18293:[regression][editor] Can\'t outdent whitespace line', () => {
        const model = createTextModel([
            '      '
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Selection(1, 7, 1, 7));
            CoreEditingCommands.Outdent.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    ');
            assertCursor(viewModel, new Selection(1, 5, 1, 5));
        });
    });
    test('issue #95591: Unindenting moves cursor to beginning of line', () => {
        const model = createTextModel([
            '        '
        ].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 9, false);
            assertCursor(viewModel, new Selection(1, 9, 1, 9));
            CoreEditingCommands.Outdent.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    ');
            assertCursor(viewModel, new Selection(1, 5, 1, 5));
        });
    });
    test('Bug #16657: [editor] Tab on empty line of zero indentation moves cursor to position (1,1)', () => {
        const model = createTextModel([
            'function baz() {',
            '\tfunction hello() { // something here',
            '\t',
            '',
            '\t}',
            '}',
            ''
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 7, 1, false);
            assertCursor(viewModel, new Selection(7, 1, 7, 1));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(7), '\t');
            assertCursor(viewModel, new Selection(7, 2, 7, 2));
        });
    });
    test('bug #16740: [editor] Cut line doesn\'t quite cut the last line', () => {
        // Part 1 => there is text on the last line
        withTestCodeEditor([
            'asdasd',
            'qwerty'
        ], {}, (editor, viewModel) => {
            const model = editor.getModel();
            moveTo(editor, viewModel, 2, 1, false);
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            viewModel.cut('keyboard');
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), 'asdasd');
        });
        // Part 2 => there is no text on the last line
        withTestCodeEditor([
            'asdasd',
            ''
        ], {}, (editor, viewModel) => {
            const model = editor.getModel();
            moveTo(editor, viewModel, 2, 1, false);
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            viewModel.cut('keyboard');
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), 'asdasd');
            viewModel.cut('keyboard');
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), '');
        });
    });
    test('issue #128602: When cutting multiple lines (ctrl x), the last line will not be erased', () => {
        withTestCodeEditor([
            'a1',
            'a2',
            'a3'
        ], {}, (editor, viewModel) => {
            const model = editor.getModel();
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 1),
                new Selection(2, 1, 2, 1),
                new Selection(3, 1, 3, 1),
            ]);
            viewModel.cut('keyboard');
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), '');
        });
    });
    test('Bug #11476: Double bracket surrounding + undo is broken', () => {
        usingCursor({
            text: [
                'hello'
            ],
            languageId: surroundingLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 3, false);
            moveTo(editor, viewModel, 1, 5, true);
            assertCursor(viewModel, new Selection(1, 3, 1, 5));
            viewModel.type('(', 'keyboard');
            assertCursor(viewModel, new Selection(1, 4, 1, 6));
            viewModel.type('(', 'keyboard');
            assertCursor(viewModel, new Selection(1, 5, 1, 7));
        });
    });
    test('issue #1140: Backspace stops prematurely', () => {
        const model = createTextModel([
            'function baz() {',
            '  return 1;',
            '};'
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            moveTo(editor, viewModel, 1, 14, true);
            assertCursor(viewModel, new Selection(3, 2, 1, 14));
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assertCursor(viewModel, new Selection(1, 14, 1, 14));
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), 'function baz(;');
        });
    });
    test('issue #10212: Pasting entire line does not replace selection', () => {
        usingCursor({
            text: [
                'line1',
                'line2'
            ],
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 1, false);
            moveTo(editor, viewModel, 2, 6, true);
            viewModel.paste('line1\n', true);
            assert.strictEqual(model.getLineContent(1), 'line1');
            assert.strictEqual(model.getLineContent(2), 'line1');
            assert.strictEqual(model.getLineContent(3), '');
        });
    });
    test('issue #74722: Pasting whole line does not replace selection', () => {
        usingCursor({
            text: [
                'line1',
                'line sel 2',
                'line3'
            ],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 6, 2, 9)]);
            viewModel.paste('line1\n', true);
            assert.strictEqual(model.getLineContent(1), 'line1');
            assert.strictEqual(model.getLineContent(2), 'line line1');
            assert.strictEqual(model.getLineContent(3), ' 2');
            assert.strictEqual(model.getLineContent(4), 'line3');
        });
    });
    test('issue #4996: Multiple cursor paste pastes contents of all cursors', () => {
        usingCursor({
            text: [
                'line1',
                'line2',
                'line3'
            ],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
            viewModel.paste('a\nb\nc\nd', false, [
                'a\nb',
                'c\nd'
            ]);
            assert.strictEqual(model.getValue(), [
                'a',
                'bline1',
                'c',
                'dline2',
                'line3'
            ].join('\n'));
        });
    });
    test('issue #16155: Paste into multiple cursors has edge case when number of lines equals number of cursors - 1', () => {
        usingCursor({
            text: [
                'test',
                'test',
                'test',
                'test'
            ],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
            ]);
            viewModel.paste('aaa\nbbb\nccc\n', false, null);
            assert.strictEqual(model.getValue(), [
                'aaa',
                'bbb',
                'ccc',
                '',
                'aaa',
                'bbb',
                'ccc',
                '',
                'aaa',
                'bbb',
                'ccc',
                '',
                'aaa',
                'bbb',
                'ccc',
                '',
            ].join('\n'));
        });
    });
    test('issue #43722: Multiline paste doesn\'t work anymore', () => {
        usingCursor({
            text: [
                'test',
                'test',
                'test',
                'test'
            ],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
            ]);
            viewModel.paste('aaa\r\nbbb\r\nccc\r\nddd\r\n', false, null);
            assert.strictEqual(model.getValue(), [
                'aaa',
                'bbb',
                'ccc',
                'ddd',
            ].join('\n'));
        });
    });
    test('issue #46440: (1) Pasting a multi-line selection pastes entire selection into every insertion point', () => {
        usingCursor({
            text: [
                'line1',
                'line2',
                'line3'
            ],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1), new Selection(3, 1, 3, 1)]);
            viewModel.paste('a\nb\nc', false, null);
            assert.strictEqual(model.getValue(), [
                'aline1',
                'bline2',
                'cline3'
            ].join('\n'));
        });
    });
    test('issue #46440: (2) Pasting a multi-line selection pastes entire selection into every insertion point', () => {
        usingCursor({
            text: [
                'line1',
                'line2',
                'line3'
            ],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1), new Selection(3, 1, 3, 1)]);
            viewModel.paste('a\nb\nc\n', false, null);
            assert.strictEqual(model.getValue(), [
                'aline1',
                'bline2',
                'cline3'
            ].join('\n'));
        });
    });
    test('issue #3071: Investigate why undo stack gets corrupted', () => {
        const model = createTextModel([
            'some lines',
            'and more lines',
            'just some text',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 1, false);
            moveTo(editor, viewModel, 3, 4, true);
            let isFirst = true;
            const disposable = model.onDidChangeContent(() => {
                if (isFirst) {
                    isFirst = false;
                    viewModel.type('\t', 'keyboard');
                }
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), [
                '\t just some text'
            ].join('\n'), '001');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), [
                '    some lines',
                '    and more lines',
                '    just some text',
            ].join('\n'), '002');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), [
                'some lines',
                'and more lines',
                'just some text',
            ].join('\n'), '003');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), [
                'some lines',
                'and more lines',
                'just some text',
            ].join('\n'), '004');
            disposable.dispose();
        });
    });
    test('issue #12950: Cannot Double Click To Insert Emoji Using OSX Emoji Panel', () => {
        usingCursor({
            text: [
                'some lines',
                'and more lines',
                'just some text',
            ],
            languageId: null
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 1, false);
            viewModel.type('😍', 'keyboard');
            assert.strictEqual(model.getValue(), [
                'some lines',
                'and more lines',
                '😍just some text',
            ].join('\n'));
        });
    });
    test('issue #3463: pressing tab adds spaces, but not as many as for a tab', () => {
        const model = createTextModel([
            'function a() {',
            '\tvar a = {',
            '\t\tx: 3',
            '\t};',
            '}',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(3), '\t    \tx: 3');
        });
    });
    test('issue #4312: trying to type a tab character over a sequence of spaces results in unexpected behaviour', () => {
        const model = createTextModel([
            'var foo = 123;       // this is a comment',
            'var bar = 4;       // another comment'
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 15, false);
            moveTo(editor, viewModel, 1, 22, true);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'var foo = 123;\t// this is a comment');
        });
    });
    test('issue #832: word right', () => {
        usingCursor({
            text: [
                '   /* Just some   more   text a+= 3 +5-3 + 7 */  '
            ],
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 1, false);
            function assertWordRight(col, expectedCol) {
                const args = {
                    position: {
                        lineNumber: 1,
                        column: col
                    }
                };
                if (col === 1) {
                    CoreNavigationCommands.WordSelect.runCoreEditorCommand(viewModel, args);
                }
                else {
                    CoreNavigationCommands.WordSelectDrag.runCoreEditorCommand(viewModel, args);
                }
                assert.strictEqual(viewModel.getSelection().startColumn, 1, 'TEST FOR ' + col);
                assert.strictEqual(viewModel.getSelection().endColumn, expectedCol, 'TEST FOR ' + col);
            }
            assertWordRight(1, '   '.length + 1);
            assertWordRight(2, '   '.length + 1);
            assertWordRight(3, '   '.length + 1);
            assertWordRight(4, '   '.length + 1);
            assertWordRight(5, '   /'.length + 1);
            assertWordRight(6, '   /*'.length + 1);
            assertWordRight(7, '   /* '.length + 1);
            assertWordRight(8, '   /* Just'.length + 1);
            assertWordRight(9, '   /* Just'.length + 1);
            assertWordRight(10, '   /* Just'.length + 1);
            assertWordRight(11, '   /* Just'.length + 1);
            assertWordRight(12, '   /* Just '.length + 1);
            assertWordRight(13, '   /* Just some'.length + 1);
            assertWordRight(14, '   /* Just some'.length + 1);
            assertWordRight(15, '   /* Just some'.length + 1);
            assertWordRight(16, '   /* Just some'.length + 1);
            assertWordRight(17, '   /* Just some '.length + 1);
            assertWordRight(18, '   /* Just some  '.length + 1);
            assertWordRight(19, '   /* Just some   '.length + 1);
            assertWordRight(20, '   /* Just some   more'.length + 1);
            assertWordRight(21, '   /* Just some   more'.length + 1);
            assertWordRight(22, '   /* Just some   more'.length + 1);
            assertWordRight(23, '   /* Just some   more'.length + 1);
            assertWordRight(24, '   /* Just some   more '.length + 1);
            assertWordRight(25, '   /* Just some   more  '.length + 1);
            assertWordRight(26, '   /* Just some   more   '.length + 1);
            assertWordRight(27, '   /* Just some   more   text'.length + 1);
            assertWordRight(28, '   /* Just some   more   text'.length + 1);
            assertWordRight(29, '   /* Just some   more   text'.length + 1);
            assertWordRight(30, '   /* Just some   more   text'.length + 1);
            assertWordRight(31, '   /* Just some   more   text '.length + 1);
            assertWordRight(32, '   /* Just some   more   text a'.length + 1);
            assertWordRight(33, '   /* Just some   more   text a+'.length + 1);
            assertWordRight(34, '   /* Just some   more   text a+='.length + 1);
            assertWordRight(35, '   /* Just some   more   text a+= '.length + 1);
            assertWordRight(36, '   /* Just some   more   text a+= 3'.length + 1);
            assertWordRight(37, '   /* Just some   more   text a+= 3 '.length + 1);
            assertWordRight(38, '   /* Just some   more   text a+= 3 +'.length + 1);
            assertWordRight(39, '   /* Just some   more   text a+= 3 +5'.length + 1);
            assertWordRight(40, '   /* Just some   more   text a+= 3 +5-'.length + 1);
            assertWordRight(41, '   /* Just some   more   text a+= 3 +5-3'.length + 1);
            assertWordRight(42, '   /* Just some   more   text a+= 3 +5-3 '.length + 1);
            assertWordRight(43, '   /* Just some   more   text a+= 3 +5-3 +'.length + 1);
            assertWordRight(44, '   /* Just some   more   text a+= 3 +5-3 + '.length + 1);
            assertWordRight(45, '   /* Just some   more   text a+= 3 +5-3 + 7'.length + 1);
            assertWordRight(46, '   /* Just some   more   text a+= 3 +5-3 + 7 '.length + 1);
            assertWordRight(47, '   /* Just some   more   text a+= 3 +5-3 + 7 *'.length + 1);
            assertWordRight(48, '   /* Just some   more   text a+= 3 +5-3 + 7 */'.length + 1);
            assertWordRight(49, '   /* Just some   more   text a+= 3 +5-3 + 7 */ '.length + 1);
            assertWordRight(50, '   /* Just some   more   text a+= 3 +5-3 + 7 */  '.length + 1);
        });
    });
    test('issue #33788: Wrong cursor position when double click to select a word', () => {
        const model = createTextModel([
            'Just some text'
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.WordSelect.runCoreEditorCommand(viewModel, { position: new Position(1, 8) });
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 6, 1, 10));
            CoreNavigationCommands.WordSelectDrag.runCoreEditorCommand(viewModel, { position: new Position(1, 8) });
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 6, 1, 10));
        });
    });
    test('issue #12887: Double-click highlighting separating white space', () => {
        const model = createTextModel([
            'abc def'
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.WordSelect.runCoreEditorCommand(viewModel, { position: new Position(1, 5) });
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 5, 1, 8));
        });
    });
    test('issue #9675: Undo/Redo adds a stop in between CHN Characters', () => {
        withTestCodeEditor([], {}, (editor, viewModel) => {
            const model = editor.getModel();
            assertCursor(viewModel, new Position(1, 1));
            // Typing sennsei in Japanese - Hiragana
            viewModel.type('ｓ', 'keyboard');
            viewModel.compositionType('せ', 1, 0, 0);
            viewModel.compositionType('せｎ', 1, 0, 0);
            viewModel.compositionType('せん', 2, 0, 0);
            viewModel.compositionType('せんｓ', 2, 0, 0);
            viewModel.compositionType('せんせ', 3, 0, 0);
            viewModel.compositionType('せんせ', 3, 0, 0);
            viewModel.compositionType('せんせい', 3, 0, 0);
            viewModel.compositionType('せんせい', 4, 0, 0);
            viewModel.compositionType('せんせい', 4, 0, 0);
            viewModel.compositionType('せんせい', 4, 0, 0);
            assert.strictEqual(model.getLineContent(1), 'せんせい');
            assertCursor(viewModel, new Position(1, 5));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '');
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('issue #23983: Calling model.setEOL does not reset cursor position', () => {
        usingCursor({
            text: [
                'first line',
                'second line'
            ]
        }, (editor, model, viewModel) => {
            model.setEOL(1 /* EndOfLineSequence.CRLF */);
            viewModel.setSelections('test', [new Selection(2, 2, 2, 2)]);
            model.setEOL(0 /* EndOfLineSequence.LF */);
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
        });
    });
    test('issue #23983: Calling model.setValue() resets cursor position', () => {
        usingCursor({
            text: [
                'first line',
                'second line'
            ]
        }, (editor, model, viewModel) => {
            model.setEOL(1 /* EndOfLineSequence.CRLF */);
            viewModel.setSelections('test', [new Selection(2, 2, 2, 2)]);
            model.setValue([
                'different first line',
                'different second line',
                'new third line'
            ].join('\n'));
            assertCursor(viewModel, new Selection(1, 1, 1, 1));
        });
    });
    test('issue #36740: wordwrap creates an extra step / character at the wrapping point', () => {
        // a single model line => 4 view lines
        withTestCodeEditor([
            [
                'Lorem ipsum ',
                'dolor sit amet ',
                'consectetur ',
                'adipiscing elit',
            ].join('')
        ], { wordWrap: 'wordWrapColumn', wordWrapColumn: 16 }, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 7, 1, 7)]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 9, 1, 9));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 10, 1, 10));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 11, 1, 11));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 13, 1, 13));
            // moving to view line 2
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 14, 1, 14));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 13, 1, 13));
            // moving back to view line 1
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
        });
    });
    test('issue #110376: multiple selections with wordwrap behave differently', () => {
        // a single model line => 4 view lines
        withTestCodeEditor([
            [
                'just a sentence. just a ',
                'sentence. just a sentence.',
            ].join('')
        ], { wordWrap: 'wordWrapColumn', wordWrapColumn: 25 }, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 16),
                new Selection(1, 18, 1, 33),
                new Selection(1, 35, 1, 50),
            ]);
            moveLeft(editor, viewModel);
            assertCursor(viewModel, [
                new Selection(1, 1, 1, 1),
                new Selection(1, 18, 1, 18),
                new Selection(1, 35, 1, 35),
            ]);
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 16),
                new Selection(1, 18, 1, 33),
                new Selection(1, 35, 1, 50),
            ]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, [
                new Selection(1, 16, 1, 16),
                new Selection(1, 33, 1, 33),
                new Selection(1, 50, 1, 50),
            ]);
        });
    });
    test('issue #98320: Multi-Cursor, Wrap lines and cursorSelectRight ==> cursors out of sync', () => {
        // a single model line => 4 view lines
        withTestCodeEditor([
            [
                'lorem_ipsum-1993x11x13',
                'dolor_sit_amet-1998x04x27',
                'consectetur-2007x10x08',
                'adipiscing-2012x07x27',
                'elit-2015x02x27',
            ].join('\n')
        ], { wordWrap: 'wordWrapColumn', wordWrapColumn: 16 }, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 13, 1, 13),
                new Selection(2, 16, 2, 16),
                new Selection(3, 13, 3, 13),
                new Selection(4, 12, 4, 12),
                new Selection(5, 6, 5, 6),
            ]);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 13),
                new Selection(2, 16, 2, 16),
                new Selection(3, 13, 3, 13),
                new Selection(4, 12, 4, 12),
                new Selection(5, 6, 5, 6),
            ]);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 14),
                new Selection(2, 16, 2, 17),
                new Selection(3, 13, 3, 14),
                new Selection(4, 12, 4, 13),
                new Selection(5, 6, 5, 7),
            ]);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 15),
                new Selection(2, 16, 2, 18),
                new Selection(3, 13, 3, 15),
                new Selection(4, 12, 4, 14),
                new Selection(5, 6, 5, 8),
            ]);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 16),
                new Selection(2, 16, 2, 19),
                new Selection(3, 13, 3, 16),
                new Selection(4, 12, 4, 15),
                new Selection(5, 6, 5, 9),
            ]);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 17),
                new Selection(2, 16, 2, 20),
                new Selection(3, 13, 3, 17),
                new Selection(4, 12, 4, 16),
                new Selection(5, 6, 5, 10),
            ]);
        });
    });
    test('issue #41573 - delete across multiple lines does not shrink the selection when word wraps', () => {
        withTestCodeEditor([
            'Authorization: \'Bearer pHKRfCTFSnGxs6akKlb9ddIXcca0sIUSZJutPHYqz7vEeHdMTMh0SGN0IGU3a0n59DXjTLRsj5EJ2u33qLNIFi9fk5XF8pK39PndLYUZhPt4QvHGLScgSkK0L4gwzkzMloTQPpKhqiikiIOvyNNSpd2o8j29NnOmdTUOKi9DVt74PD2ohKxyOrWZ6oZprTkb3eKajcpnS0LABKfaw2rmv4\','
        ].join('\n'), { wordWrap: 'wordWrapColumn', wordWrapColumn: 100 }, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 43, false);
            moveTo(editor, viewModel, 1, 147, true);
            assertCursor(viewModel, new Selection(1, 43, 1, 147));
            editor.getModel().applyEdits([{
                    range: new Range(1, 1, 1, 43),
                    text: ''
                }]);
            assertCursor(viewModel, new Selection(1, 1, 1, 105));
        });
    });
    test('issue #22717: Moving text cursor cause an incorrect position in Chinese', () => {
        // a single model line => 4 view lines
        withTestCodeEditor([
            [
                '一二三四五六七八九十',
                '12345678901234567890',
            ].join('\n')
        ], {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(2, 10, 2, 10));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(2, 11, 2, 11));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 6, 1, 6));
        });
    });
    test('issue #112301: new stickyTabStops feature interferes with word wrap', () => {
        withTestCodeEditor([
            [
                'function hello() {',
                '        console.log(`this is a long console message`)',
                '}',
            ].join('\n')
        ], { wordWrap: 'wordWrapColumn', wordWrapColumn: 32, stickyTabStops: true }, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(2, 31, 2, 31)
            ]);
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 32));
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 33));
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 34));
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 33));
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 32));
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 31));
        });
    });
    test('issue #44805: Should not be able to undo in readonly editor', () => {
        const model = createTextModel([
            ''
        ].join('\n'));
        withTestCodeEditor(model, { readOnly: true }, (editor, viewModel) => {
            model.pushEditOperations([new Selection(1, 1, 1, 1)], [{
                    range: new Range(1, 1, 1, 1),
                    text: 'Hello world!'
                }], () => [new Selection(1, 1, 1, 1)]);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'Hello world!');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'Hello world!');
        });
    });
    test('issue #46314: ViewModel is out of sync with Model!', () => {
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                return new EncodedTokenizationResult(new Uint32Array(0), state);
            }
        };
        const LANGUAGE_ID = 'modelModeTest1';
        const languageRegistration = TokenizationRegistry.register(LANGUAGE_ID, tokenizationSupport);
        const model = createTextModel('Just text', LANGUAGE_ID);
        withTestCodeEditor(model, {}, (editor1, cursor1) => {
            withTestCodeEditor(model, {}, (editor2, cursor2) => {
                const disposable = editor1.onDidChangeCursorPosition(() => {
                    model.tokenization.tokenizeIfCheap(1);
                });
                model.applyEdits([{ range: new Range(1, 1, 1, 1), text: '-' }]);
                disposable.dispose();
            });
        });
        languageRegistration.dispose();
        model.dispose();
    });
    test('issue #37967: problem replacing consecutive characters', () => {
        const model = createTextModel([
            'const a = "foo";',
            'const b = ""'
        ].join('\n'));
        withTestCodeEditor(model, { multiCursorMergeOverlapping: false }, (editor, viewModel) => {
            editor.setSelections([
                new Selection(1, 12, 1, 12),
                new Selection(1, 16, 1, 16),
                new Selection(2, 12, 2, 12),
                new Selection(2, 13, 2, 13),
            ]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assertCursor(viewModel, [
                new Selection(1, 11, 1, 11),
                new Selection(1, 14, 1, 14),
                new Selection(2, 11, 2, 11),
                new Selection(2, 11, 2, 11),
            ]);
            viewModel.type('\'', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'const a = \'foo\';');
            assert.strictEqual(model.getLineContent(2), 'const b = \'\'');
        });
    });
    test('issue #15761: Cursor doesn\'t move in a redo operation', () => {
        const model = createTextModel([
            'hello'
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([
                new Selection(1, 4, 1, 4)
            ]);
            editor.executeEdits('test', [{
                    range: new Range(1, 1, 1, 1),
                    text: '*',
                    forceMoveMarkers: true
                }]);
            assertCursor(viewModel, [
                new Selection(1, 5, 1, 5),
            ]);
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 4),
            ]);
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assertCursor(viewModel, [
                new Selection(1, 5, 1, 5),
            ]);
        });
    });
    test('issue #42783: API Calls with Undo Leave Cursor in Wrong Position', () => {
        const model = createTextModel([
            'ab'
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([
                new Selection(1, 1, 1, 1)
            ]);
            editor.executeEdits('test', [{
                    range: new Range(1, 1, 1, 3),
                    text: ''
                }]);
            assertCursor(viewModel, [
                new Selection(1, 1, 1, 1),
            ]);
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assertCursor(viewModel, [
                new Selection(1, 1, 1, 1),
            ]);
            editor.executeEdits('test', [{
                    range: new Range(1, 1, 1, 2),
                    text: ''
                }]);
            assertCursor(viewModel, [
                new Selection(1, 1, 1, 1),
            ]);
        });
    });
    test('issue #85712: Paste line moves cursor to start of current line rather than start of next line', () => {
        const model = createTextModel([
            'abc123',
            ''
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([
                new Selection(2, 1, 2, 1)
            ]);
            viewModel.paste('something\n', true);
            assert.strictEqual(model.getValue(), [
                'abc123',
                'something',
                ''
            ].join('\n'));
            assertCursor(viewModel, new Position(3, 1));
        });
    });
    test('issue #84897: Left delete behavior in some languages is changed', () => {
        const model = createTextModel([
            'สวัสดี'
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([
                new Selection(1, 7, 1, 7)
            ]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวัสด');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวัส');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวั');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สว');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ส');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '');
        });
    });
    test('issue #122914: Left delete behavior in some languages is changed (useTabStops: false)', () => {
        const model = createTextModel([
            'สวัสดี'
        ].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            editor.setSelections([
                new Selection(1, 7, 1, 7)
            ]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวัสด');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวัส');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวั');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สว');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ส');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '');
        });
    });
    test('issue #99629: Emoji modifiers in text treated separately when using backspace', () => {
        const model = createTextModel([
            '👶🏾'
        ].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            const len = model.getValueLength();
            editor.setSelections([
                new Selection(1, 1 + len, 1, 1 + len)
            ]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '');
        });
    });
    test('issue #99629: Emoji modifiers in text treated separately when using backspace (ZWJ sequence)', () => {
        const model = createTextModel([
            '👨‍👩🏽‍👧‍👦'
        ].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            const len = model.getValueLength();
            editor.setSelections([
                new Selection(1, 1 + len, 1, 1 + len)
            ]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '👨‍👩🏽‍👧');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '👨‍👩🏽');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '👨');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '');
        });
    });
    test('issue #105730: move left behaves differently for multiple cursors', () => {
        const model = createTextModel('asdfghjkl, asdfghjkl, asdfghjkl, ');
        withTestCodeEditor(model, {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 24
        }, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 10, 1, 12),
                new Selection(1, 21, 1, 23),
                new Selection(1, 32, 1, 34)
            ]);
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, [
                new Selection(1, 10, 1, 10),
                new Selection(1, 21, 1, 21),
                new Selection(1, 32, 1, 32)
            ]);
            viewModel.setSelections('test', [
                new Selection(1, 10, 1, 12),
                new Selection(1, 21, 1, 23),
                new Selection(1, 32, 1, 34)
            ]);
            moveLeft(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 10, 1, 11),
                new Selection(1, 21, 1, 22),
                new Selection(1, 32, 1, 33)
            ]);
        });
    });
    test('issue #105730: move right should always skip wrap point', () => {
        const model = createTextModel('asdfghjkl, asdfghjkl, asdfghjkl, \nasdfghjkl,');
        withTestCodeEditor(model, {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 24
        }, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 22, 1, 22)
            ]);
            moveRight(editor, viewModel, false);
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, [
                new Selection(1, 24, 1, 24),
            ]);
            viewModel.setSelections('test', [
                new Selection(1, 22, 1, 22)
            ]);
            moveRight(editor, viewModel, true);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 22, 1, 24),
            ]);
        });
    });
    test('issue #123178: sticky tab in consecutive wrapped lines', () => {
        const model = createTextModel('    aaaa        aaaa', undefined, { tabSize: 4 });
        withTestCodeEditor(model, {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 8,
            stickyTabStops: true,
        }, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 9, 1, 9)
            ]);
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, [
                new Selection(1, 10, 1, 10),
            ]);
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, [
                new Selection(1, 9, 1, 9),
            ]);
        });
    });
    test('Cursor honors insertSpaces configuration on new line', () => {
        usingCursor({
            text: [
                '    \tMy First Line\t ',
                '\tMy Second Line',
                '    Third Line',
                '',
                '1'
            ]
        }, (editor, model, viewModel) => {
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, { position: new Position(1, 21), source: 'keyboard' });
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    \tMy First Line\t ');
            assert.strictEqual(model.getLineContent(2), '        ');
        });
    });
    test('Cursor honors insertSpaces configuration on tab', () => {
        const model = createTextModel([
            '    \tMy First Line\t ',
            'My Second Line123',
            '    Third Line',
            '',
            '1'
        ].join('\n'), undefined, {
            tabSize: 13,
            indentSize: 13,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            // Tab on column 1
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, { position: new Position(2, 1) });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '             My Second Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 2
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, { position: new Position(2, 2) });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'M            y Second Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 3
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, { position: new Position(2, 3) });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My            Second Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 4
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, { position: new Position(2, 4) });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My           Second Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 5
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, { position: new Position(2, 5) });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My S         econd Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 5
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, { position: new Position(2, 5) });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My S         econd Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 13
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, { position: new Position(2, 13) });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My Second Li ne123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 14
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, { position: new Position(2, 14) });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My Second Lin             e123');
        });
    });
    test('Enter auto-indents with insertSpaces setting 1', () => {
        const languageId = setupOnEnterLanguage(IndentAction.Indent);
        usingCursor({
            text: [
                '\thello'
            ],
            languageId: languageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Selection(1, 7, 1, 7));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(2 /* EndOfLinePreference.CRLF */), '\thello\r\n        ');
        });
    });
    test('Enter auto-indents with insertSpaces setting 2', () => {
        const languageId = setupOnEnterLanguage(IndentAction.None);
        usingCursor({
            text: [
                '\thello'
            ],
            languageId: languageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Selection(1, 7, 1, 7));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(2 /* EndOfLinePreference.CRLF */), '\thello\r\n    ');
        });
    });
    test('Enter auto-indents with insertSpaces setting 3', () => {
        const languageId = setupOnEnterLanguage(IndentAction.IndentOutdent);
        usingCursor({
            text: [
                '\thell()'
            ],
            languageId: languageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Selection(1, 7, 1, 7));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(2 /* EndOfLinePreference.CRLF */), '\thell(\r\n        \r\n    )');
        });
    });
    test('issue #148256: Pressing Enter creates line with bad indent with insertSpaces: true', () => {
        usingCursor({
            text: [
                '  \t'
            ],
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 4, false);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), '  \t\n    ');
        });
    });
    test('issue #148256: Pressing Enter creates line with bad indent with insertSpaces: false', () => {
        usingCursor({
            text: [
                '  \t'
            ]
        }, (editor, model, viewModel) => {
            model.updateOptions({
                insertSpaces: false
            });
            moveTo(editor, viewModel, 1, 4, false);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), '  \t\n\t');
        });
    });
    test('removeAutoWhitespace off', () => {
        usingCursor({
            text: [
                '    some  line abc  '
            ],
            modelOpts: {
                trimAutoWhitespace: false
            }
        }, (editor, model, viewModel) => {
            // Move cursor to the end, verify that we do not trim whitespaces if line has values
            moveTo(editor, viewModel, 1, model.getLineContent(1).length + 1);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '    ');
            // Try to enter again, we should trimmed previous line
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '    ');
            assert.strictEqual(model.getLineContent(3), '    ');
        });
    });
    test('removeAutoWhitespace on: removes only whitespace the cursor added 1', () => {
        usingCursor({
            text: [
                '    '
            ]
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, model.getLineContent(1).length + 1);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.strictEqual(model.getLineContent(2), '    ');
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), '    ');
        });
    });
    test('issue #115033: indent and appendText', () => {
        const languageId = 'onEnterMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            onEnterRules: [{
                    beforeText: /.*/,
                    action: {
                        indentAction: IndentAction.Indent,
                        appendText: 'x'
                    }
                }]
        }));
        usingCursor({
            text: [
                'text'
            ],
            languageId: languageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 5);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'text');
            assert.strictEqual(model.getLineContent(2), '    x');
            assertCursor(viewModel, new Position(2, 6));
        });
    });
    test('issue #6862: Editor removes auto inserted indentation when formatting on type', () => {
        const languageId = setupOnEnterLanguage(IndentAction.IndentOutdent);
        usingCursor({
            text: [
                'function foo (params: string) {}'
            ],
            languageId: languageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 32);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'function foo (params: string) {');
            assert.strictEqual(model.getLineContent(2), '    ');
            assert.strictEqual(model.getLineContent(3), '}');
            class TestCommand {
                constructor() {
                    this._selectionId = null;
                }
                getEditOperations(model, builder) {
                    builder.addEditOperation(new Range(1, 13, 1, 14), '');
                    this._selectionId = builder.trackSelection(viewModel.getSelection());
                }
                computeCursorState(model, helper) {
                    return helper.getTrackedSelection(this._selectionId);
                }
            }
            viewModel.executeCommand(new TestCommand(), 'autoFormat');
            assert.strictEqual(model.getLineContent(1), 'function foo(params: string) {');
            assert.strictEqual(model.getLineContent(2), '    ');
            assert.strictEqual(model.getLineContent(3), '}');
        });
    });
    test('removeAutoWhitespace on: removes only whitespace the cursor added 2', () => {
        const languageId = 'testLang';
        const registration = languageService.registerLanguage({ id: languageId });
        const model = createTextModel([
            '    if (a) {',
            '        ',
            '',
            '',
            '    }'
        ].join('\n'), languageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 1);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    if (a) {');
            assert.strictEqual(model.getLineContent(2), '        ');
            assert.strictEqual(model.getLineContent(3), '    ');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '    }');
            moveTo(editor, viewModel, 4, 1);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    if (a) {');
            assert.strictEqual(model.getLineContent(2), '        ');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), '    ');
            assert.strictEqual(model.getLineContent(5), '    }');
            moveTo(editor, viewModel, 5, model.getLineMaxColumn(5));
            viewModel.type('something', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    if (a) {');
            assert.strictEqual(model.getLineContent(2), '        ');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '    }something');
        });
        registration.dispose();
    });
    test('removeAutoWhitespace on: test 1', () => {
        const model = createTextModel([
            '    some  line abc  '
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            // Move cursor to the end, verify that we do not trim whitespaces if line has values
            moveTo(editor, viewModel, 1, model.getLineContent(1).length + 1);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '    ');
            // Try to enter again, we should trimmed previous line
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), '    ');
            // More whitespaces
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), '        ');
            // Enter and verify that trimmed again
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), '        ');
            // Trimmed if we will keep only text
            moveTo(editor, viewModel, 1, 5);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.strictEqual(model.getLineContent(2), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '');
            // Trimmed if we will keep only text by selection
            moveTo(editor, viewModel, 2, 5);
            moveTo(editor, viewModel, 3, 1, true);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.strictEqual(model.getLineContent(2), '    ');
            assert.strictEqual(model.getLineContent(3), '    ');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '');
        });
    });
    test('issue #15118: remove auto whitespace when pasting entire line', () => {
        const model = createTextModel([
            '    function f() {',
            '        // I\'m gonna copy this line',
            '        return 3;',
            '    }',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, model.getLineMaxColumn(3));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), [
                '    function f() {',
                '        // I\'m gonna copy this line',
                '        return 3;',
                '        ',
                '    }',
            ].join('\n'));
            assertCursor(viewModel, new Position(4, model.getLineMaxColumn(4)));
            viewModel.paste('        // I\'m gonna copy this line\n', true);
            assert.strictEqual(model.getValue(), [
                '    function f() {',
                '        // I\'m gonna copy this line',
                '        return 3;',
                '        // I\'m gonna copy this line',
                '',
                '    }',
            ].join('\n'));
            assertCursor(viewModel, new Position(5, 1));
        });
    });
    test('issue #40695: maintain cursor position when copying lines using ctrl+c, ctrl+v', () => {
        const model = createTextModel([
            '    function f() {',
            '        // I\'m gonna copy this line',
            '        // Another line',
            '        return 3;',
            '    }',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([new Selection(4, 10, 4, 10)]);
            viewModel.paste('        // I\'m gonna copy this line\n', true);
            assert.strictEqual(model.getValue(), [
                '    function f() {',
                '        // I\'m gonna copy this line',
                '        // Another line',
                '        // I\'m gonna copy this line',
                '        return 3;',
                '    }',
            ].join('\n'));
            assertCursor(viewModel, new Position(5, 10));
        });
    });
    test('UseTabStops is off', () => {
        const model = createTextModel([
            '    x',
            '        a    ',
            '    '
        ].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            // DeleteLeft removes just one whitespace
            moveTo(editor, viewModel, 2, 9);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '       a    ');
        });
    });
    test('Backspace removes whitespaces with tab size', () => {
        const model = createTextModel([
            ' \t \t     x',
            '        a    ',
            '    '
        ].join('\n'));
        withTestCodeEditor(model, { useTabStops: true }, (editor, viewModel) => {
            // DeleteLeft does not remove tab size, because some text exists before
            moveTo(editor, viewModel, 2, model.getLineContent(2).length + 1);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '        a   ');
            // DeleteLeft removes tab size = 4
            moveTo(editor, viewModel, 2, 9);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '    a   ');
            // DeleteLeft removes tab size = 4
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'a   ');
            // Undo DeleteLeft - get us back to original indentation
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '        a   ');
            // Nothing is broken when cursor is in (1,1)
            moveTo(editor, viewModel, 1, 1);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), ' \t \t     x');
            // DeleteLeft stops at tab stops even in mixed whitespace case
            moveTo(editor, viewModel, 1, 10);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), ' \t \t    x');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), ' \t \tx');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), ' \tx');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'x');
            // DeleteLeft on last line
            moveTo(editor, viewModel, 3, model.getLineContent(3).length + 1);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(3), '');
            // DeleteLeft with removing new line symbol
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x\n        a   ');
            // In case of selection DeleteLeft only deletes selected text
            moveTo(editor, viewModel, 2, 3);
            moveTo(editor, viewModel, 2, 4, true);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '       a   ');
        });
    });
    test('PR #5423: Auto indent + undo + redo is funky', () => {
        const model = createTextModel([
            ''
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n', 'assert1');
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t', 'assert2');
            viewModel.type('y', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty', 'assert2');
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\n\t', 'assert3');
            viewModel.type('x');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\n\tx', 'assert4');
            CoreNavigationCommands.CursorLeft.runCoreEditorCommand(viewModel, {});
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\n\tx', 'assert5');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\nx', 'assert6');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\tyx', 'assert7');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\tx', 'assert8');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert9');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x', 'assert10');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert11');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\nx', 'assert12');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\n\tx', 'assert13');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\nx', 'assert14');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert15');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x', 'assert16');
        });
    });
    test('issue #90973: Undo brings back model alternative version', () => {
        const model = createTextModel([
            ''
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            const beforeVersion = model.getVersionId();
            const beforeAltVersion = model.getAlternativeVersionId();
            viewModel.type('Hello', 'keyboard');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            const afterVersion = model.getVersionId();
            const afterAltVersion = model.getAlternativeVersionId();
            assert.notStrictEqual(beforeVersion, afterVersion);
            assert.strictEqual(beforeAltVersion, afterAltVersion);
        });
    });
    test('Enter honors increaseIndentPattern', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\tif (true) {'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 12, false);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            moveTo(editor, viewModel, 3, 13, false);
            assertCursor(viewModel, new Selection(3, 13, 3, 13));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
        });
    });
    test('Type honors decreaseIndentPattern', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\t'
            ],
            languageId: indentRulesLanguageId,
            editorOpts: { autoIndent: 'full' }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 2, false);
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            viewModel.type('}', 'keyboard');
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            assert.strictEqual(model.getLineContent(2), '}', '001');
        });
    });
    test('Enter honors unIndentedLinePattern', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\t\t\treturn true'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 15, false);
            assertCursor(viewModel, new Selection(2, 15, 2, 15));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
        });
    });
    test('Enter honors indentNextLinePattern', () => {
        usingCursor({
            text: [
                'if (true)',
                '\treturn true;',
                'if (true)',
                '\t\t\t\treturn true'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 14, false);
            assertCursor(viewModel, new Selection(2, 14, 2, 14));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(3, 1, 3, 1));
            moveTo(editor, viewModel, 5, 16, false);
            assertCursor(viewModel, new Selection(5, 16, 5, 16));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(6, 2, 6, 2));
        });
    });
    test('Enter honors indentNextLinePattern 2', () => {
        const model = createTextModel([
            'if (true)',
            '\tif (true)'
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, { autoIndent: 'full' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 2, 11, false);
            assertCursor(viewModel, new Selection(2, 11, 2, 11));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('console.log();', 'keyboard');
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
        });
    });
    test('Enter honors intential indent', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\tif (true) {',
                'return true;',
                '}}'
            ],
            languageId: indentRulesLanguageId,
            editorOpts: { autoIndent: 'full' }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 13, false);
            assertCursor(viewModel, new Selection(3, 13, 3, 13));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            assert.strictEqual(model.getLineContent(3), 'return true;', '001');
        });
    });
    test('Enter supports selection 1', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\tif (true) {',
                '\t\treturn true;',
                '\t}a}'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 4, 3, false);
            moveTo(editor, viewModel, 4, 4, true);
            assertCursor(viewModel, new Selection(4, 3, 4, 4));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(5, 1, 5, 1));
            assert.strictEqual(model.getLineContent(4), '\t}', '001');
        });
    });
    test('Enter supports selection 2', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\tif (true) {'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 12, false);
            moveTo(editor, viewModel, 2, 13, true);
            assertCursor(viewModel, new Selection(2, 12, 2, 13));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
        });
    });
    test('Enter honors tabSize and insertSpaces 1', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\tif (true) {'
            ],
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 12, false);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(2, 5, 2, 5));
            model.tokenization.forceTokenization(model.getLineCount());
            moveTo(editor, viewModel, 3, 13, false);
            assertCursor(viewModel, new Selection(3, 13, 3, 13));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 9, 4, 9));
        });
    });
    test('Enter honors tabSize and insertSpaces 2', () => {
        usingCursor({
            text: [
                'if (true) {',
                '    if (true) {'
            ],
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 12, false);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 5, 2, 5));
            moveTo(editor, viewModel, 3, 16, false);
            assertCursor(viewModel, new Selection(3, 16, 3, 16));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(3), '    if (true) {');
            assertCursor(viewModel, new Selection(4, 9, 4, 9));
        });
    });
    test('Enter honors tabSize and insertSpaces 3', () => {
        usingCursor({
            text: [
                'if (true) {',
                '    if (true) {'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 12, false);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            moveTo(editor, viewModel, 3, 16, false);
            assertCursor(viewModel, new Selection(3, 16, 3, 16));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(3), '    if (true) {');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
        });
    });
    test('Enter supports intentional indentation', () => {
        usingCursor({
            text: [
                '\tif (true) {',
                '\t\tswitch(true) {',
                '\t\t\tcase true:',
                '\t\t\t\tbreak;',
                '\t\t}',
                '\t}'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 5, 4, false);
            assertCursor(viewModel, new Selection(5, 4, 5, 4));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(5), '\t\t}');
            assertCursor(viewModel, new Selection(6, 3, 6, 3));
        });
    });
    test('Enter should not adjust cursor position when press enter in the middle of a line 1', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\tif (true) {',
                '\t\treturn true;',
                '\t}a}'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 9, false);
            assertCursor(viewModel, new Selection(3, 9, 3, 9));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            assert.strictEqual(model.getLineContent(4), '\t\t true;', '001');
        });
    });
    test('Enter should not adjust cursor position when press enter in the middle of a line 2', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\tif (true) {',
                '\t\treturn true;',
                '\t}a}'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 3, false);
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            assert.strictEqual(model.getLineContent(4), '\t\treturn true;', '001');
        });
    });
    test('Enter should not adjust cursor position when press enter in the middle of a line 3', () => {
        usingCursor({
            text: [
                'if (true) {',
                '  if (true) {',
                '    return true;',
                '  }a}'
            ],
            languageId: indentRulesLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 11, false);
            assertCursor(viewModel, new Selection(3, 11, 3, 11));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 5, 4, 5));
            assert.strictEqual(model.getLineContent(4), '     true;', '001');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 1', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\tif (true) {',
                '\t\treturn true;',
                '\t}a}'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 2, 4, 2));
            assert.strictEqual(model.getLineContent(4), '\t\treturn true;', '001');
            moveTo(editor, viewModel, 4, 1, false);
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(5, 1, 5, 1));
            assert.strictEqual(model.getLineContent(5), '\t\treturn true;', '002');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 2', () => {
        usingCursor({
            text: [
                '\tif (true) {',
                '\t\tif (true) {',
                '\t    \treturn true;',
                '\t\t}a}'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 4, false);
            assertCursor(viewModel, new Selection(3, 4, 3, 4));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            assert.strictEqual(model.getLineContent(4), '\t\t\treturn true;', '001');
            moveTo(editor, viewModel, 4, 1, false);
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(5, 1, 5, 1));
            assert.strictEqual(model.getLineContent(5), '\t\t\treturn true;', '002');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 3', () => {
        usingCursor({
            text: [
                'if (true) {',
                '  if (true) {',
                '    return true;',
                '}a}'
            ],
            languageId: indentRulesLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 2, 4, 2));
            assert.strictEqual(model.getLineContent(4), '    return true;', '001');
            moveTo(editor, viewModel, 4, 3, false);
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(5, 3, 5, 3));
            assert.strictEqual(model.getLineContent(5), '    return true;', '002');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 4', () => {
        usingCursor({
            text: [
                'if (true) {',
                '  if (true) {',
                '\t  return true;',
                '}a}',
                '',
                'if (true) {',
                '  if (true) {',
                '\t  return true;',
                '}a}'
            ],
            languageId: indentRulesLanguageId,
            modelOpts: {
                tabSize: 2,
                indentSize: 2
            }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 3, false);
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 4, 4, 4));
            assert.strictEqual(model.getLineContent(4), '    return true;', '001');
            moveTo(editor, viewModel, 9, 4, false);
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(10, 5, 10, 5));
            assert.strictEqual(model.getLineContent(10), '    return true;', '001');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 5', () => {
        usingCursor({
            text: [
                'if (true) {',
                '  if (true) {',
                '    return true;',
                '    return true;',
                ''
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { tabSize: 2 }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 5, false);
            moveTo(editor, viewModel, 4, 3, true);
            assertCursor(viewModel, new Selection(3, 5, 4, 3));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            assert.strictEqual(model.getLineContent(4), '    return true;', '001');
        });
    });
    test('issue microsoft/monaco-editor#108 part 1/2: Auto indentation on Enter with selection is half broken', () => {
        usingCursor({
            text: [
                'function baz() {',
                '\tvar x = 1;',
                '\t\t\t\t\t\t\treturn x;',
                '}'
            ],
            modelOpts: {
                insertSpaces: false,
            },
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 8, false);
            moveTo(editor, viewModel, 2, 12, true);
            assertCursor(viewModel, new Selection(3, 8, 2, 12));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(3), '\treturn x;');
            assertCursor(viewModel, new Position(3, 2));
        });
    });
    test('issue microsoft/monaco-editor#108 part 2/2: Auto indentation on Enter with selection is half broken', () => {
        usingCursor({
            text: [
                'function baz() {',
                '\tvar x = 1;',
                '\t\t\t\t\t\t\treturn x;',
                '}'
            ],
            modelOpts: {
                insertSpaces: false,
            },
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 12, false);
            moveTo(editor, viewModel, 3, 8, true);
            assertCursor(viewModel, new Selection(2, 12, 3, 8));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(3), '\treturn x;');
            assertCursor(viewModel, new Position(3, 2));
        });
    });
    test('onEnter works if there are no indentation rules', () => {
        usingCursor({
            text: [
                '<?',
                '\tif (true) {',
                '\t\techo $hi;',
                '\t\techo $bye;',
                '\t}',
                '?>'
            ],
            modelOpts: { insertSpaces: false }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 5, 3, false);
            assertCursor(viewModel, new Selection(5, 3, 5, 3));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(6), '\t');
            assertCursor(viewModel, new Selection(6, 2, 6, 2));
            assert.strictEqual(model.getLineContent(5), '\t}');
        });
    });
    test('onEnter works if there are no indentation rules 2', () => {
        usingCursor({
            text: [
                '	if (5)',
                '		return 5;',
                '	'
            ],
            modelOpts: { insertSpaces: false }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 2, 4, 2));
            assert.strictEqual(model.getLineContent(4), '\t');
        });
    });
    test('bug #16543: Tab should indent to correct indentation spot immediately', () => {
        const model = createTextModel([
            'function baz() {',
            '\tfunction hello() { // something here',
            '\t',
            '',
            '\t}',
            '}'
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 1, false);
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t');
        });
    });
    test('bug #2938 (1): When pressing Tab on white-space only lines, indent straight to the right spot (similar to empty lines)', () => {
        const model = createTextModel([
            '\tfunction baz() {',
            '\t\tfunction hello() { // something here',
            '\t\t',
            '\t',
            '\t\t}',
            '\t}'
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 2, false);
            assertCursor(viewModel, new Selection(4, 2, 4, 2));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t\t');
        });
    });
    test('bug #2938 (2): When pressing Tab on white-space only lines, indent straight to the right spot (similar to empty lines)', () => {
        const model = createTextModel([
            '\tfunction baz() {',
            '\t\tfunction hello() { // something here',
            '\t\t',
            '    ',
            '\t\t}',
            '\t}'
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 1, false);
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t\t');
        });
    });
    test('bug #2938 (3): When pressing Tab on white-space only lines, indent straight to the right spot (similar to empty lines)', () => {
        const model = createTextModel([
            '\tfunction baz() {',
            '\t\tfunction hello() { // something here',
            '\t\t',
            '\t\t\t',
            '\t\t}',
            '\t}'
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 3, false);
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t\t\t');
        });
    });
    test('bug #2938 (4): When pressing Tab on white-space only lines, indent straight to the right spot (similar to empty lines)', () => {
        const model = createTextModel([
            '\tfunction baz() {',
            '\t\tfunction hello() { // something here',
            '\t\t',
            '\t\t\t\t',
            '\t\t}',
            '\t}'
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 4, false);
            assertCursor(viewModel, new Selection(4, 4, 4, 4));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t\t\t\t');
        });
    });
    test('bug #31015: When pressing Tab on lines and Enter rules are avail, indent straight to the right spotTab', () => {
        const onEnterLanguageId = setupOnEnterLanguage(IndentAction.Indent);
        const model = createTextModel([
            '    if (a) {',
            '        ',
            '',
            '',
            '    }'
        ].join('\n'), onEnterLanguageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 1);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    if (a) {');
            assert.strictEqual(model.getLineContent(2), '        ');
            assert.strictEqual(model.getLineContent(3), '        ');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '    }');
        });
    });
    test('type honors indentation rules: ruby keywords', () => {
        const rubyLanguageId = setupIndentRulesLanguage('ruby', {
            increaseIndentPattern: /^\s*((begin|class|def|else|elsif|ensure|for|if|module|rescue|unless|until|when|while)|(.*\sdo\b))\b[^\{;]*$/,
            decreaseIndentPattern: /^\s*([}\]]([,)]?\s*(#|$)|\.[a-zA-Z_]\w*\b)|(end|rescue|ensure|else|elsif|when)\b)/
        });
        const model = createTextModel([
            'class Greeter',
            '  def initialize(name)',
            '    @name = name',
            '    en'
        ].join('\n'), rubyLanguageId);
        withTestCodeEditor(model, { autoIndent: 'full' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 7, false);
            assertCursor(viewModel, new Selection(4, 7, 4, 7));
            viewModel.type('d', 'keyboard');
            assert.strictEqual(model.getLineContent(4), '  end');
        });
    });
    test('Auto indent on type: increaseIndentPattern has higher priority than decreaseIndent when inheriting', () => {
        usingCursor({
            text: [
                '\tif (true) {',
                '\t\tconsole.log();',
                '\t} else if {',
                '\t\tconsole.log()',
                '\t}'
            ],
            languageId: indentRulesLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 5, 3, false);
            assertCursor(viewModel, new Selection(5, 3, 5, 3));
            viewModel.type('e', 'keyboard');
            assertCursor(viewModel, new Selection(5, 4, 5, 4));
            assert.strictEqual(model.getLineContent(5), '\t}e', 'This line should not decrease indent');
        });
    });
    test('type honors users indentation adjustment', () => {
        usingCursor({
            text: [
                '\tif (true ||',
                '\t ) {',
                '\t}',
                'if (true ||',
                ') {',
                '}'
            ],
            languageId: indentRulesLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 3, false);
            assertCursor(viewModel, new Selection(2, 3, 2, 3));
            viewModel.type(' ', 'keyboard');
            assertCursor(viewModel, new Selection(2, 4, 2, 4));
            assert.strictEqual(model.getLineContent(2), '\t  ) {', 'This line should not decrease indent');
        });
    });
    test('bug 29972: if a line is line comment, open bracket should not indent next line', () => {
        usingCursor({
            text: [
                'if (true) {',
                '\t// {',
                '\t\t'
            ],
            languageId: indentRulesLanguageId,
            editorOpts: { autoIndent: 'full' }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 3, false);
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('}', 'keyboard');
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
            assert.strictEqual(model.getLineContent(3), '}');
        });
    });
    test('issue #38261: TAB key results in bizarre indentation in C++ mode ', () => {
        const languageId = 'indentRulesMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            indentationRules: {
                increaseIndentPattern: new RegExp("(^.*\\{[^}]*$)"),
                decreaseIndentPattern: new RegExp("^\\s*\\}")
            }
        }));
        const model = createTextModel([
            'int main() {',
            '  return 0;',
            '}',
            '',
            'bool Foo::bar(const string &a,',
            '              const string &b) {',
            '  foo();',
            '',
            ')',
        ].join('\n'), languageId, {
            tabSize: 2,
            indentSize: 2
        });
        withTestCodeEditor(model, { autoIndent: 'advanced' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 8, 1, false);
            assertCursor(viewModel, new Selection(8, 1, 8, 1));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), [
                'int main() {',
                '  return 0;',
                '}',
                '',
                'bool Foo::bar(const string &a,',
                '              const string &b) {',
                '  foo();',
                '  ',
                ')',
            ].join('\n'));
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(8, 3, 8, 3));
        });
    });
    test('issue #57197: indent rules regex should be stateless', () => {
        const languageId = setupIndentRulesLanguage('lang', {
            decreaseIndentPattern: /^\s*}$/gm,
            increaseIndentPattern: /^(?![^\S\n]*(?!--|––|——)(?:[-❍❑■⬜□☐▪▫–—≡→›✘xX✔✓☑+]|\[[ xX+-]?\])\s[^\n]*)[^\S\n]*(.+:)[^\S\n]*(?:(?=@[^\s*~(]+(?::\/\/[^\s*~(:]+)?(?:\([^)]*\))?)|$)/gm,
        });
        usingCursor({
            text: [
                'Project:',
            ],
            languageId: languageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' }
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 9, false);
            assertCursor(viewModel, new Selection(1, 9, 1, 9));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            moveTo(editor, viewModel, 1, 9, false);
            assertCursor(viewModel, new Selection(1, 9, 1, 9));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
        });
    });
    test('typing in json', () => {
        const languageId = 'indentRulesMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            indentationRules: {
                increaseIndentPattern: new RegExp("({+(?=([^\"]*\"[^\"]*\")*[^\"}]*$))|(\\[+(?=([^\"]*\"[^\"]*\")*[^\"\\]]*$))"),
                decreaseIndentPattern: new RegExp("^\\s*[}\\]],?\\s*$")
            }
        }));
        const model = createTextModel([
            '{',
            '  "scripts: {"',
            '    "watch": "a {"',
            '    "build{": "b"',
            '    "tasks": []',
            '    "tasks": ["a"]',
            '  "}"',
            '"}"'
        ].join('\n'), languageId, {
            tabSize: 2,
            indentSize: 2
        });
        withTestCodeEditor(model, { autoIndent: 'full' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 19, false);
            assertCursor(viewModel, new Selection(3, 19, 3, 19));
            viewModel.type('\n', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(4), '    ');
            moveTo(editor, viewModel, 5, 18, false);
            assertCursor(viewModel, new Selection(5, 18, 5, 18));
            viewModel.type('\n', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(6), '    ');
            moveTo(editor, viewModel, 7, 15, false);
            assertCursor(viewModel, new Selection(7, 15, 7, 15));
            viewModel.type('\n', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(8), '      ');
            assert.deepStrictEqual(model.getLineContent(9), '    ]');
            moveTo(editor, viewModel, 10, 18, false);
            assertCursor(viewModel, new Selection(10, 18, 10, 18));
            viewModel.type('\n', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(11), '    ]');
        });
    });
    test('issue #111128: Multicursor `Enter` issue with indentation', () => {
        const model = createTextModel('    let a, b, c;', indentRulesLanguageId, { detectIndentation: false, insertSpaces: false, tabSize: 4 });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([
                new Selection(1, 11, 1, 11),
                new Selection(1, 14, 1, 14),
            ]);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), '    let a,\n\t b,\n\t c;');
        });
    });
    test('issue #122714: tabSize=1 prevent typing a string matching decreaseIndentPattern in an empty file', () => {
        const latextLanguageId = setupIndentRulesLanguage('latex', {
            increaseIndentPattern: new RegExp('\\\\begin{(?!document)([^}]*)}(?!.*\\\\end{\\1})'),
            decreaseIndentPattern: new RegExp('^\\s*\\\\end{(?!document)')
        });
        const model = createTextModel('\\end', latextLanguageId, { tabSize: 1 });
        withTestCodeEditor(model, { autoIndent: 'full' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 5, false);
            assertCursor(viewModel, new Selection(1, 5, 1, 5));
            viewModel.type('{', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '\\end{}');
        });
    });
    test('ElectricCharacter - does nothing if no electric char', () => {
        usingCursor({
            text: [
                '  if (a) {',
                ''
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            viewModel.type('*', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '*');
        });
    });
    test('ElectricCharacter - indents in order to match bracket', () => {
        usingCursor({
            text: [
                '  if (a) {',
                ''
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  }');
        });
    });
    test('ElectricCharacter - unindents in order to match bracket', () => {
        usingCursor({
            text: [
                '  if (a) {',
                '    '
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 5);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  }');
        });
    });
    test('ElectricCharacter - matches with correct bracket', () => {
        usingCursor({
            text: [
                '  if (a) {',
                '    if (b) {',
                '    }',
                '    '
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 4, 1);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(4), '  }    ');
        });
    });
    test('ElectricCharacter - does nothing if bracket does not match', () => {
        usingCursor({
            text: [
                '  if (a) {',
                '    if (b) {',
                '    }',
                '  }  '
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 4, 6);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(4), '  }  }');
        });
    });
    test('ElectricCharacter - matches bracket even in line with content', () => {
        usingCursor({
            text: [
                '  if (a) {',
                '// hello'
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  }// hello');
        });
    });
    test('ElectricCharacter - is no-op if bracket is lined up', () => {
        usingCursor({
            text: [
                '  if (a) {',
                '  '
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 3);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  }');
        });
    });
    test('ElectricCharacter - is no-op if there is non-whitespace text before', () => {
        usingCursor({
            text: [
                '  if (a) {',
                'a'
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 2);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), 'a}');
        });
    });
    test('ElectricCharacter - is no-op if pairs are all matched before', () => {
        usingCursor({
            text: [
                'foo(() => {',
                '  ( 1 + 2 ) ',
                '})'
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 13);
            viewModel.type('*', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  ( 1 + 2 ) *');
        });
    });
    test('ElectricCharacter - is no-op if matching bracket is on the same line', () => {
        usingCursor({
            text: [
                '(div',
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 5);
            let changeText = null;
            const disposable = model.onDidChangeContent(e => {
                changeText = e.changes[0].text;
            });
            viewModel.type(')', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(1), '(div)');
            assert.deepStrictEqual(changeText, ')');
            disposable.dispose();
        });
    });
    test('ElectricCharacter - is no-op if the line has other content', () => {
        usingCursor({
            text: [
                'Math.max(',
                '\t2',
                '\t3'
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            viewModel.type(')', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(3), '\t3)');
        });
    });
    test('ElectricCharacter - appends text', () => {
        usingCursor({
            text: [
                '  if (a) {',
                '/*'
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 3);
            viewModel.type('*', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '/** */');
        });
    });
    test('ElectricCharacter - appends text 2', () => {
        usingCursor({
            text: [
                '  if (a) {',
                '  /*'
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 5);
            viewModel.type('*', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  /** */');
        });
    });
    test('ElectricCharacter - issue #23711: Replacing selected text with )]} fails to delete old text with backwards-dragged selection', () => {
        usingCursor({
            text: [
                '{',
                'word'
            ],
            languageId: electricCharLanguageId
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 5);
            moveTo(editor, viewModel, 2, 1, true);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '}');
        });
    });
    test('issue #61070: backtick (`) should auto-close after a word character', () => {
        usingCursor({
            text: ['const markup = highlight'],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            model.tokenization.forceTokenization(1);
            assertType(editor, model, viewModel, 1, 25, '`', '``', `auto closes \` @ (1, 25)`);
        });
    });
    test('issue #132912: quotes should not auto-close if they are closing a string', () => {
        setupAutoClosingLanguageTokenization();
        const model = createTextModel('const t2 = `something ${t1}', autoClosingLanguageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            const model = viewModel.model;
            model.tokenization.forceTokenization(1);
            assertType(editor, model, viewModel, 1, 28, '`', '`', `does not auto close \` @ (1, 28)`);
        });
    });
    test('autoClosingPairs - open parens: default', () => {
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                'var c = \'asd\';',
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                'var h = { a: \'value\' };',
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var| a| |=| [|]|;|',
                'var| b| |=| |`asd|`|;|',
                'var| c| |=| |\'asd|\'|;|',
                'var| d| |=| |"asd|"|;|',
                'var| e| |=| /*3*/|	3|;|',
                'var| f| |=| /**| 3| */3|;|',
                'var| g| |=| (3+5|)|;|',
                'var| h| |=| {| a|:| |\'value|\'| |}|;|',
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - open parens: whitespace', () => {
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                'var c = \'asd\';',
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                'var h = { a: \'value\' };',
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'beforeWhitespace'
            }
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var| a| =| [|];|',
                'var| b| =| `asd`;|',
                'var| c| =| \'asd\';|',
                'var| d| =| "asd";|',
                'var| e| =| /*3*/|	3;|',
                'var| f| =| /**| 3| */3;|',
                'var| g| =| (3+5|);|',
                'var| h| =| {| a:| \'value\'| |};|',
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - open parens disabled/enabled open quotes enabled/disabled', () => {
        usingCursor({
            text: [
                'var a = [];',
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'beforeWhitespace',
                autoClosingQuotes: 'never'
            }
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var| a| =| [|];|',
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                    assertType(editor, model, viewModel, lineNumber, column, '\'', '\'', `does not auto close @ (${lineNumber}, ${column})`);
                }
            }
        });
        usingCursor({
            text: [
                'var b = [];',
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'never',
                autoClosingQuotes: 'beforeWhitespace'
            }
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var b =| [|];|',
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '\'', '\'\'', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '\'', '\'', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                    assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                }
            }
        });
    });
    test('autoClosingPairs - configurable open parens', () => {
        setAutoClosingLanguageEnabledSet('abc');
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                'var c = \'asd\';',
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                'var h = { a: \'value\' };',
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'languageDefined'
            }
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'v|ar |a = [|];|',
                'v|ar |b = `|asd`;|',
                'v|ar |c = \'|asd\';|',
                'v|ar d = "|asd";|',
                'v|ar e = /*3*/	3;|',
                'v|ar f = /** 3| */3;|',
                'v|ar g = (3+5|);|',
                'v|ar h = { |a: \'v|alue\' |};|',
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - auto-pairing can be disabled', () => {
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                'var c = \'asd\';',
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                'var h = { a: \'value\' };',
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'never',
                autoClosingQuotes: 'never'
            }
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var a = [];',
                'var b = `asd`;',
                'var c = \'asd\';',
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                'var h = { a: \'value\' };',
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                        assertType(editor, model, viewModel, lineNumber, column, '"', '""', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                        assertType(editor, model, viewModel, lineNumber, column, '"', '"', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - auto wrapping is configurable', () => {
        usingCursor({
            text: [
                'var a = asd'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 4),
                new Selection(1, 9, 1, 12),
            ]);
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), '`var` a = `asd`');
            // type a (
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getValue(), '`(var)` a = `(asd)`');
        });
        usingCursor({
            text: [
                'var a = asd'
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoSurround: 'never'
            }
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 4),
            ]);
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), '` a = asd');
        });
        usingCursor({
            text: [
                'var a = asd'
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoSurround: 'quotes'
            }
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 4),
            ]);
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), '`var` a = asd');
            // type a (
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getValue(), '`(` a = asd');
        });
        usingCursor({
            text: [
                'var a = asd'
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoSurround: 'brackets'
            }
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 4),
            ]);
            // type a (
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getValue(), '(var) a = asd');
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), '(`) a = asd');
        });
    });
    test('autoClosingPairs - quote', () => {
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                'var c = \'asd\';',
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                'var h = { a: \'value\' };',
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var a |=| [|]|;|',
                'var b |=| `asd`|;|',
                'var c |=| \'asd\'|;|',
                'var d |=| "asd"|;|',
                'var e |=| /*3*/|	3;|',
                'var f |=| /**| 3 */3;|',
                'var g |=| (3+5)|;|',
                'var h |=| {| a:| \'value\'| |}|;|',
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '\'', '\'\'', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else if (autoCloseColumns[column] === 2 /* AutoClosingColumnType.Special2 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '\'', '', `over types @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '\'', '\'', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - multi-character autoclose', () => {
        usingCursor({
            text: [
                '',
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            model.setValue('begi');
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.type('n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'beginend');
            model.setValue('/*');
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('*', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '/** */');
        });
    });
    test('autoClosingPairs - doc comments can be turned off', () => {
        usingCursor({
            text: [
                '',
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingComments: 'never'
            }
        }, (editor, model, viewModel) => {
            model.setValue('/*');
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('*', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '/**');
        });
    });
    test('issue #72177: multi-character autoclose with conflicting patterns', () => {
        const languageId = 'autoClosingModeMultiChar';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            autoClosingPairs: [
                { open: '(', close: ')' },
                { open: '(*', close: '*)' },
                { open: '<@', close: '@>' },
                { open: '<@@', close: '@@>' },
            ],
        }));
        usingCursor({
            text: [
                '',
            ],
            languageId: languageId
        }, (editor, model, viewModel) => {
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '()');
            viewModel.type('*', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '(**)', `doesn't add entire close when already closed substring is there`);
            model.setValue('(');
            viewModel.setSelections('test', [new Selection(1, 2, 1, 2)]);
            viewModel.type('*', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '(**)', `does add entire close if not already there`);
            model.setValue('');
            viewModel.type('<@', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<@@>');
            viewModel.type('@', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<@@@@>', `autocloses when before multi-character closing brace`);
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<@@()@@>', `autocloses when before multi-character closing brace`);
        });
    });
    test('issue #55314: Do not auto-close when ending with open', () => {
        const languageId = 'myElectricMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '\'', close: '\'', notIn: ['string', 'comment'] },
                { open: '\"', close: '\"', notIn: ['string'] },
                { open: 'B\"', close: '\"', notIn: ['string', 'comment'] },
                { open: '`', close: '`', notIn: ['string', 'comment'] },
                { open: '/**', close: ' */', notIn: ['string'] }
            ],
        }));
        usingCursor({
            text: [
                'little goat',
                'little LAMB',
                'little sheep',
                'Big LAMB'
            ],
            languageId: languageId
        }, (editor, model, viewModel) => {
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 1, 4, '"', '"', `does not double quote when ending with open`);
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 2, 4, '"', '"', `does not double quote when ending with open`);
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 3, 4, '"', '"', `does not double quote when ending with open`);
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 4, 2, '"', '"', `does not double quote when ending with open`);
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 4, 3, '"', '"', `does not double quote when ending with open`);
        });
    });
    test('issue #27937: Trying to add an item to the front of a list is cumbersome', () => {
        usingCursor({
            text: [
                'var arr = ["b", "c"];'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertType(editor, model, viewModel, 1, 12, '"', '"', `does not over type and will not auto close`);
        });
    });
    test('issue #25658 - Do not auto-close single/double quotes after word characters', () => {
        usingCursor({
            text: [
                '',
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            function typeCharacters(viewModel, chars) {
                for (let i = 0, len = chars.length; i < len; i++) {
                    viewModel.type(chars[i], 'keyboard');
                }
            }
            // First gif
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste1 = teste\' ok');
            assert.strictEqual(model.getLineContent(1), 'teste1 = teste\' ok');
            viewModel.setSelections('test', [new Selection(1, 1000, 1, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste2 = teste \'ok');
            assert.strictEqual(model.getLineContent(2), 'teste2 = teste \'ok\'');
            viewModel.setSelections('test', [new Selection(2, 1000, 2, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste3 = teste" ok');
            assert.strictEqual(model.getLineContent(3), 'teste3 = teste" ok');
            viewModel.setSelections('test', [new Selection(3, 1000, 3, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste4 = teste "ok');
            assert.strictEqual(model.getLineContent(4), 'teste4 = teste "ok"');
            // Second gif
            viewModel.setSelections('test', [new Selection(4, 1000, 4, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste \'');
            assert.strictEqual(model.getLineContent(5), 'teste \'\'');
            viewModel.setSelections('test', [new Selection(5, 1000, 5, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste "');
            assert.strictEqual(model.getLineContent(6), 'teste ""');
            viewModel.setSelections('test', [new Selection(6, 1000, 6, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste\'');
            assert.strictEqual(model.getLineContent(7), 'teste\'');
            viewModel.setSelections('test', [new Selection(7, 1000, 7, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste"');
            assert.strictEqual(model.getLineContent(8), 'teste"');
        });
    });
    test('issue #37315 - overtypes only those characters that it inserted', () => {
        usingCursor({
            text: [
                '',
                'y=();'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type('asd', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(asd)');
            // overtype!
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(asd)');
            // do not overtype!
            viewModel.setSelections('test', [new Selection(2, 4, 2, 4)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(2), 'y=());');
        });
    });
    test('issue #37315 - stops overtyping once cursor leaves area', () => {
        usingCursor({
            text: [
                '',
                'y=();'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=())');
        });
    });
    test('issue #37315 - it overtypes only once', () => {
        usingCursor({
            text: [
                '',
                'y=();'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.setSelections('test', [new Selection(1, 4, 1, 4)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=())');
        });
    });
    test('issue #37315 - it can remember multiple auto-closed instances', () => {
        usingCursor({
            text: [
                '',
                'y=();'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(())');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(())');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(())');
        });
    });
    test('issue #118270 - auto closing deletes only those characters that it inserted', () => {
        usingCursor({
            text: [
                '',
                'y=();'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type('asd', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(asd)');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'x=()');
            // delete closing char!
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'x=');
            // do not delete closing char!
            viewModel.setSelections('test', [new Selection(2, 4, 2, 4)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'y=);');
        });
    });
    test('issue #78527 - does not close quote on odd count', () => {
        usingCursor({
            text: [
                'std::cout << \'"\' << entryMap'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 29, 1, 29)]);
            viewModel.type('[', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'std::cout << \'"\' << entryMap[]');
            viewModel.type('"', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'std::cout << \'"\' << entryMap[""]');
            viewModel.type('a', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'std::cout << \'"\' << entryMap["a"]');
            viewModel.type('"', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'std::cout << \'"\' << entryMap["a"]');
            viewModel.type(']', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'std::cout << \'"\' << entryMap["a"]');
        });
    });
    test('issue #85983 - editor.autoClosingBrackets: beforeWhitespace is incorrect for Python', () => {
        const languageId = 'pythonMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '\"', close: '\"', notIn: ['string'] },
                { open: 'r\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'R\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'u\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'U\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'f\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'F\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'b\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'B\"', close: '\"', notIn: ['string', 'comment'] },
                { open: '\'', close: '\'', notIn: ['string', 'comment'] },
                { open: 'r\'', close: '\'', notIn: ['string', 'comment'] },
                { open: 'R\'', close: '\'', notIn: ['string', 'comment'] },
                { open: 'u\'', close: '\'', notIn: ['string', 'comment'] },
                { open: 'U\'', close: '\'', notIn: ['string', 'comment'] },
                { open: 'f\'', close: '\'', notIn: ['string', 'comment'] },
                { open: 'F\'', close: '\'', notIn: ['string', 'comment'] },
                { open: 'b\'', close: '\'', notIn: ['string', 'comment'] },
                { open: 'B\'', close: '\'', notIn: ['string', 'comment'] },
                { open: '`', close: '`', notIn: ['string'] }
            ],
        }));
        usingCursor({
            text: [
                'foo\'hello\''
            ],
            editorOpts: {
                autoClosingBrackets: 'beforeWhitespace'
            },
            languageId: languageId
        }, (editor, model, viewModel) => {
            assertType(editor, model, viewModel, 1, 4, '(', '(', `does not auto close @ (1, 4)`);
        });
    });
    test('issue #78975 - Parentheses swallowing does not work when parentheses are inserted by autocomplete', () => {
        usingCursor({
            text: [
                '<div id'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 8, 1, 8)]);
            viewModel.executeEdits('snippet', [{ range: new Range(1, 6, 1, 8), text: 'id=""' }], () => [new Selection(1, 10, 1, 10)]);
            assert.strictEqual(model.getLineContent(1), '<div id=""');
            viewModel.type('a', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<div id="a"');
            viewModel.type('"', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<div id="a"');
        });
    });
    test('issue #78833 - Add config to use old brackets/quotes overtyping', () => {
        usingCursor({
            text: [
                '',
                'y=();'
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingOvertype: 'always'
            }
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.setSelections('test', [new Selection(1, 4, 1, 4)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.setSelections('test', [new Selection(2, 4, 2, 4)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(2), 'y=();');
        });
    });
    test('issue #15825: accents on mac US intl keyboard', () => {
        usingCursor({
            text: [],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            // Typing ` + e on the mac US intl kb layout
            viewModel.startComposition();
            viewModel.type('`', 'keyboard');
            viewModel.compositionType('è', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), 'è');
        });
    });
    test('issue #90016: allow accents on mac US intl keyboard to surround selection', () => {
        usingCursor({
            text: [
                'test'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 5)]);
            // Typing ` + e on the mac US intl kb layout
            viewModel.startComposition();
            viewModel.type('\'', 'keyboard');
            viewModel.compositionType('\'', 1, 0, 0, 'keyboard');
            viewModel.compositionType('\'', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), '\'test\'');
        });
    });
    test('issue #53357: Over typing ignores characters after backslash', () => {
        usingCursor({
            text: [
                'console.log();'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 13, 1, 13)]);
            viewModel.type('\'', 'keyboard');
            assert.strictEqual(model.getValue(), 'console.log(\'\');');
            viewModel.type('it', 'keyboard');
            assert.strictEqual(model.getValue(), 'console.log(\'it\');');
            viewModel.type('\\', 'keyboard');
            assert.strictEqual(model.getValue(), 'console.log(\'it\\\');');
            viewModel.type('\'', 'keyboard');
            assert.strictEqual(model.getValue(), 'console.log(\'it\\\'\');');
        });
    });
    test('issue #84998: Overtyping Brackets doesn\'t work after backslash', () => {
        usingCursor({
            text: [
                ''
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1)]);
            viewModel.type('\\', 'keyboard');
            assert.strictEqual(model.getValue(), '\\');
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getValue(), '\\()');
            viewModel.type('abc', 'keyboard');
            assert.strictEqual(model.getValue(), '\\(abc)');
            viewModel.type('\\', 'keyboard');
            assert.strictEqual(model.getValue(), '\\(abc\\)');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getValue(), '\\(abc\\)');
        });
    });
    test('issue #2773: Accents (´`¨^, others?) are inserted in the wrong position (Mac)', () => {
        usingCursor({
            text: [
                'hello',
                'world'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            // Typing ` and pressing shift+down on the mac US intl kb layout
            // Here we're just replaying what the cursor gets
            viewModel.startComposition();
            viewModel.type('`', 'keyboard');
            moveDown(editor, viewModel, true);
            viewModel.compositionType('`', 1, 0, 0, 'keyboard');
            viewModel.compositionType('`', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), '`hello\nworld');
            assertCursor(viewModel, new Selection(1, 2, 2, 2));
        });
    });
    test('issue #26820: auto close quotes when not used as accents', () => {
        usingCursor({
            text: [
                ''
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            // on the mac US intl kb layout
            // Typing ' + space
            viewModel.startComposition();
            viewModel.type('\'', 'keyboard');
            viewModel.compositionType('\'', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), '\'\'');
            // Typing one more ' + space
            viewModel.startComposition();
            viewModel.type('\'', 'keyboard');
            viewModel.compositionType('\'', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), '\'\'');
            // Typing ' as a closing tag
            model.setValue('\'abc');
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.startComposition();
            viewModel.type('\'', 'keyboard');
            viewModel.compositionType('\'', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), '\'abc\'');
            // quotes before the newly added character are all paired.
            model.setValue('\'abc\'def ');
            viewModel.setSelections('test', [new Selection(1, 10, 1, 10)]);
            viewModel.startComposition();
            viewModel.type('\'', 'keyboard');
            viewModel.compositionType('\'', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), '\'abc\'def \'\'');
            // No auto closing if there is non-whitespace character after the cursor
            model.setValue('abc');
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1)]);
            viewModel.startComposition();
            viewModel.type('\'', 'keyboard');
            viewModel.compositionType('\'', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            // No auto closing if it's after a word.
            model.setValue('abc');
            viewModel.setSelections('test', [new Selection(1, 4, 1, 4)]);
            viewModel.startComposition();
            viewModel.type('\'', 'keyboard');
            viewModel.compositionType('\'', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), 'abc\'');
        });
    });
    test('issue #144690: Quotes do not overtype when using US Intl PC keyboard layout', () => {
        usingCursor({
            text: [
                ''
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            // Pressing ' + ' + ;
            viewModel.startComposition();
            viewModel.type(`'`, 'keyboard');
            viewModel.compositionType(`'`, 1, 0, 0, 'keyboard');
            viewModel.compositionType(`'`, 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            viewModel.startComposition();
            viewModel.type(`'`, 'keyboard');
            viewModel.compositionType(`';`, 1, 0, 0, 'keyboard');
            viewModel.compositionType(`';`, 2, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), `'';`);
        });
    });
    test('issue #144693: Typing a quote using US Intl PC keyboard layout always surrounds words', () => {
        usingCursor({
            text: [
                'const hello = 3;'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 7, 1, 12)]);
            // Pressing ' + e
            viewModel.startComposition();
            viewModel.type(`'`, 'keyboard');
            viewModel.compositionType(`é`, 1, 0, 0, 'keyboard');
            viewModel.compositionType(`é`, 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), `const é = 3;`);
        });
    });
    test('issue #82701: auto close does not execute when IME is canceled via backspace', () => {
        usingCursor({
            text: [
                '{}'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 2, 1, 2)]);
            // Typing a + backspace
            viewModel.startComposition();
            viewModel.type('a', 'keyboard');
            viewModel.compositionType('', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), '{}');
        });
    });
    test('issue #20891: All cursors should do the same thing', () => {
        usingCursor({
            text: [
                'var a = asd'
            ],
            languageId: autoClosingLanguageId
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 9, 1, 9),
                new Selection(1, 12, 1, 12),
            ]);
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), 'var a = `asd`');
        });
    });
    test('issue #41825: Special handling of quotes in surrounding pairs', () => {
        const languageId = 'myMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            surroundingPairs: [
                { open: '"', close: '"' },
                { open: '\'', close: '\'' },
            ]
        }));
        const model = createTextModel('var x = \'hi\';', languageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([
                new Selection(1, 9, 1, 10),
                new Selection(1, 12, 1, 13)
            ]);
            viewModel.type('"', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'var x = "hi";', 'assert1');
            editor.setSelections([
                new Selection(1, 9, 1, 10),
                new Selection(1, 12, 1, 13)
            ]);
            viewModel.type('\'', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'var x = \'hi\';', 'assert2');
        });
    });
    test('All cursors should do the same thing when deleting left', () => {
        const model = createTextModel([
            'var a = ()'
        ].join('\n'), autoClosingLanguageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 4, 1, 4),
                new Selection(1, 10, 1, 10),
            ]);
            // delete left
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), 'va a = )');
        });
    });
    test('issue #7100: Mouse word selection is strange when non-word character is at the end of line', () => {
        const model = createTextModel([
            'before.a',
            'before',
            'hello:',
            'there:',
            'this is strange:',
            'here',
            'it',
            'is',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.WordSelect.runEditorCommand(null, editor, {
                position: new Position(3, 7)
            });
            assertCursor(viewModel, new Selection(3, 7, 3, 7));
            CoreNavigationCommands.WordSelectDrag.runEditorCommand(null, editor, {
                position: new Position(4, 7)
            });
            assertCursor(viewModel, new Selection(3, 7, 4, 7));
        });
    });
    test('issue #112039: shift-continuing a double/triple-click and drag selection does not remember its starting mode', () => {
        const model = createTextModel([
            'just some text',
            'and another line',
            'and another one',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.WordSelect.runEditorCommand(null, editor, {
                position: new Position(2, 6)
            });
            CoreNavigationCommands.MoveToSelect.runEditorCommand(null, editor, {
                position: new Position(1, 8),
            });
            assertCursor(viewModel, new Selection(2, 12, 1, 6));
        });
    });
    test('issue #158236: Shift click selection does not work on line number indicator', () => {
        const model = createTextModel([
            'just some text',
            'and another line',
            'and another one',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.MoveTo.runEditorCommand(null, editor, {
                position: new Position(3, 5)
            });
            CoreNavigationCommands.LineSelectDrag.runEditorCommand(null, editor, {
                position: new Position(2, 1)
            });
            assertCursor(viewModel, new Selection(3, 5, 2, 1));
        });
    });
    test('issue #111513: Text gets automatically selected when typing at the same location in another editor', () => {
        const model = createTextModel([
            'just',
            '',
            'some text',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor1, viewModel1) => {
            editor1.setSelections([
                new Selection(2, 1, 2, 1)
            ]);
            withTestCodeEditor(model, {}, (editor2, viewModel2) => {
                editor2.setSelections([
                    new Selection(2, 1, 2, 1)
                ]);
                viewModel2.type('e', 'keyboard');
                assertCursor(viewModel2, new Position(2, 2));
                assertCursor(viewModel1, new Position(2, 2));
            });
        });
    });
});
suite('Undo stops', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('there is an undo stop between typing and deleting left', () => {
        const model = createTextModel([
            'A  line',
            'Another line',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('first', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A fir line');
            assertCursor(viewModel, new Selection(1, 6, 1, 6));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A  line');
            assertCursor(viewModel, new Selection(1, 3, 1, 3));
        });
        model.dispose();
    });
    test('there is an undo stop between typing and deleting right', () => {
        const model = createTextModel([
            'A  line',
            'Another line',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('first', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A firstine');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A  line');
            assertCursor(viewModel, new Selection(1, 3, 1, 3));
        });
        model.dispose();
    });
    test('there is an undo stop between deleting left and typing', () => {
        const model = createTextModel([
            'A  line',
            'Another line',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 8, 2, 8)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), ' line');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            viewModel.type('Second', 'keyboard');
            assert.strictEqual(model.getLineContent(2), 'Second line');
            assertCursor(viewModel, new Selection(2, 7, 2, 7));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), ' line');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another line');
            assertCursor(viewModel, new Selection(2, 8, 2, 8));
        });
        model.dispose();
    });
    test('there is an undo stop between deleting left and deleting right', () => {
        const model = createTextModel([
            'A  line',
            'Another line',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 8, 2, 8)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), ' line');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), ' line');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another line');
            assertCursor(viewModel, new Selection(2, 8, 2, 8));
        });
        model.dispose();
    });
    test('there is an undo stop between deleting right and typing', () => {
        const model = createTextModel([
            'A  line',
            'Another line',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 9, 2, 9)]);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another ');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            viewModel.type('text', 'keyboard');
            assert.strictEqual(model.getLineContent(2), 'Another text');
            assertCursor(viewModel, new Selection(2, 13, 2, 13));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another ');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another line');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
        });
        model.dispose();
    });
    test('there is an undo stop between deleting right and deleting left', () => {
        const model = createTextModel([
            'A  line',
            'Another line',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 9, 2, 9)]);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another ');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'An');
            assertCursor(viewModel, new Selection(2, 3, 2, 3));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another ');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another line');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
        });
        model.dispose();
    });
    test('inserts undo stop when typing space', () => {
        const model = createTextModel([
            'A  line',
            'Another line',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('first and interesting', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'A first and interesting line');
            assertCursor(viewModel, new Selection(1, 24, 1, 24));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A first and line');
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A  line');
            assertCursor(viewModel, new Selection(1, 3, 1, 3));
        });
        model.dispose();
    });
    test('can undo typing and EOL change in one undo stop', () => {
        const model = createTextModel([
            'A  line',
            'Another line',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('first', 'keyboard');
            assert.strictEqual(model.getValue(), 'A first line\nAnother line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            model.pushEOL(1 /* EndOfLineSequence.CRLF */);
            assert.strictEqual(model.getValue(), 'A first line\r\nAnother line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), 'A  line\nAnother line');
            assertCursor(viewModel, new Selection(1, 3, 1, 3));
        });
        model.dispose();
    });
    test('issue #93585: Undo multi cursor edit corrupts document', () => {
        const model = createTextModel([
            'hello world',
            'hello world',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(2, 7, 2, 12),
                new Selection(1, 7, 1, 12),
            ]);
            viewModel.type('no', 'keyboard');
            assert.strictEqual(model.getValue(), 'hello no\nhello no');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), 'hello world\nhello world');
        });
        model.dispose();
    });
    test('there is a single undo stop for consecutive whitespaces', () => {
        const model = createTextModel([
            ''
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('a', 'keyboard');
            viewModel.type('b', 'keyboard');
            viewModel.type(' ', 'keyboard');
            viewModel.type(' ', 'keyboard');
            viewModel.type('c', 'keyboard');
            viewModel.type('d', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab  cd', 'assert1');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab  ', 'assert2');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab', 'assert3');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '', 'assert4');
        });
        model.dispose();
    });
    test('there is no undo stop after a single whitespace', () => {
        const model = createTextModel([
            ''
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('a', 'keyboard');
            viewModel.type('b', 'keyboard');
            viewModel.type(' ', 'keyboard');
            viewModel.type('c', 'keyboard');
            viewModel.type('d', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab cd', 'assert1');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab', 'assert3');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '', 'assert4');
        });
        model.dispose();
    });
});
suite('Overtype Mode', () => {
    setup(() => {
        InputMode.setInputMode('overtype');
    });
    teardown(() => {
        InputMode.setInputMode('insert');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('simple type', () => {
        const model = createTextModel([
            '123456789',
            '123456789',
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('a', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), [
                '12a456789',
                '123456789',
            ].join('\n'), 'assert1');
            viewModel.setSelections('test', [new Selection(1, 9, 1, 9)]);
            viewModel.type('bbb', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), [
                '12a45678bbb',
                '123456789',
            ].join('\n'), 'assert2');
        });
        model.dispose();
    });
    test('multi-line selection type', () => {
        const model = createTextModel([
            '123456789',
            '123456789',
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 2, 3)]);
            viewModel.type('cc', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), [
                '1234cc456789',
            ].join('\n'), 'assert1');
        });
        model.dispose();
    });
    test('simple paste', () => {
        const model = createTextModel([
            '123456789',
            '123456789',
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.paste('cc', false);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), [
                '1234cc789',
                '123456789',
            ].join('\n'), 'assert1');
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.paste('dddddddd', false);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), [
                '1234dddddddd',
                '123456789',
            ].join('\n'), 'assert2');
        });
        model.dispose();
    });
    test('multi-line selection paste', () => {
        const model = createTextModel([
            '123456789',
            '123456789',
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 2, 3)]);
            viewModel.paste('cc', false);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), [
                '1234cc456789',
            ].join('\n'), 'assert1');
        });
        model.dispose();
    });
    test('paste multi-line text', () => {
        const model = createTextModel([
            '123456789',
            '123456789',
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.paste([
                'aaaaaaa',
                'bbbbbbb'
            ].join('\n'), false);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), [
                '1234aaaaaaa',
                'bbbbbbb',
                '123456789',
            ].join('\n'), 'assert1');
        });
        model.dispose();
    });
    test('composition type', () => {
        const model = createTextModel([
            '123456789',
            '123456789',
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.startComposition();
            viewModel.compositionType('セ', 0, 0, 0, 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), [
                '1234セ56789',
                '123456789',
            ].join('\n'), 'assert1');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), [
                '1234セ6789',
                '123456789',
            ].join('\n'), 'assert1');
        });
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9jb250cm9sbGVyL2N1cnNvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSTlELE9BQU8sRUFBRSx5QkFBeUIsRUFBZ0Msb0JBQW9CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM3SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFtQixNQUFNLG9EQUFvRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHL0QsT0FBTyxFQUF1RCx3QkFBd0IsRUFBRSx5QkFBeUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFN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LE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM3QixNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzdCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM3QixNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzdCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDM0MsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNqQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FB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LENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxvQkFBb0I7SUFFcEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDcEIsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTVDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU1QyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDbkMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTVDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2hDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuRCxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNoQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2REFBNkQsRUFBRSxHQUFHLEVBQUU7UUFDeEUsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLGVBQWUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDbkMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNELGVBQWUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDbkMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNELE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1FBQ2hFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM3QixTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3RCxzRUFBc0U7WUFDdEUsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFNUMsc0VBQXNFO1lBQ3RFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENB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QUFDLENBQUMsQ0FBQztZQUM3RCxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzdCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTVDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFNUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0QsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENB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QVEsZ0NBQXdCLEVBQUUsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRTNFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRTlFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRWxGLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRXBGLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRWxGLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRTlFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFX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Q0FBQyxDQUFDLENBQUM7WUFFckQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzNELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFN0MsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFNUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFNUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFNUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzNELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFN0MsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzVELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFN0MsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzNELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFN0MsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzNELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FB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V0FBVyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxXQUFXLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDeEYsQ0FBQztZQUVELGVBQWUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxlQUFlLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEMsZUFBZSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN4QyxlQUFlLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDNUMsZUFBZSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzVDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM3QyxlQUFlLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDN0MsZUFBZSxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzlDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2xELGVBQWUsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2xELGVBQWUsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2xELGVBQWUsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2xELGVBQWUsQ0FBQyxFQUFFLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ25ELGVBQWUsQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3BELGVBQWUsQ0FBQyxFQUFFLEVBQUUsb0JBQW9CLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JELGVBQWUsQ0FBQyxFQUFFLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pELGVBQWUsQ0FBQyxFQUFFLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pELGVBQWUsQ0FBQyxFQUFFLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pELGVBQWUsQ0FBQyxFQUFFLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pELGVBQWUsQ0FBQyxFQUFFLEVBQUUseUJBQXlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzFELGVBQWUsQ0FBQyxFQUFFLEVBQUUsMEJBQTBCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzNELGVBQWUsQ0FBQyxFQUFFLEVBQUUsMkJBQTJCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFD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QUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTdELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXJELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXJELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXJELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXJELHdCQUF3QjtZQUN4QixTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzdC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QUMsQ0FBQztZQUNuQyxZQUFZLENBQUMsU0FBUyxFQUFFO2dCQUN2QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QixDQUFDLENBQUM7WUFFSCxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNuQyxZQUFZLENBQUMsU0FBUyxFQUFFO2dCQUN2QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QixDQUFDLENBQUM7WUFFSCxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNuQyxZQUFZLENBQUMsU0FBUyxFQUFFO2dCQUN2QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7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S0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRS9FLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRTdFLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRTVFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRTlFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRW5GLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRXJGLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1B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RSxVQUFVLEVBQUUsTUFBTSxFQUFFO1NBQ2xDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQy9CLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2pDLEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDM0QsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25ELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2pDLEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDM0QsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzNC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SSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDMUQsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUMxRCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQzFELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDMUQsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUMxRCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQzFELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDMUQsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUN6RCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQzFELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMs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QUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDaEMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDaEMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDaEMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDaEMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDaEMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFaEYsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFOUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFNUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0UsQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsT0FBTyxFQUFFLENB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