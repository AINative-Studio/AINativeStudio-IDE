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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbnRyb2xsZXIvY3Vyc29yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFJOUQsT0FBTyxFQUFFLHlCQUF5QixFQUFnQyxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxZQUFZLEVBQW1CLE1BQU0sb0RBQW9ELENBQUM7QUFDbkcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDM0csT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUcvRCxPQUFPLEVBQXVELHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLGtCQUFrQixFQUFFLE1BQU0s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Q0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsc0JBQXNCO0lBRXRCLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM3QixRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM3QixRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkQsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25ELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2xDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRCxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkQsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM3QixNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILG9CQUFvQjtJQUVwQixJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUNwQixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDN0IsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFNUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTVDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDN0IsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFNUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDaEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2hDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN2QyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDN0IsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZEQUE2RCxFQUFFLEdBQUcsRUFBRTtRQUN4RSxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDN0IsZUFBZSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNuQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNuQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0QsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0QsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0QsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0QsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0QsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDaEUsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdELHNFQUFzRTtZQUN0RSxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU1QyxzRUFBc0U7WUFDdEUsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FB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QUMsQ0FBQyxDQUFDO1lBQzdELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFNUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0QsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM3QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU1QyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3RCxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FB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Q0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDbkYsWUFBWSxDQUFDLFNBQVMsRUFBRTtnQkFDdkIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzFCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzFCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2FBQzFCLENBQUMsQ0FBQztZQUVILDZCQUE2QjtZQUM3QixzQkFBc0IsQ0FBQyx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDbkYsWUFBWSxDQUFDLFNBQVMsRUFBRTtnQkFDdkIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzFCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVB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USxnQ0FBd0IsRUFBRSxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFM0UsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFOUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFbEYsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFcEYsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFbEYsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFOUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcs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QUFDLENBQUMsQ0FBQztZQUVyRCxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUU3QyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDckQsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU1QyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEQsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU1QyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDckQsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU1QyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUU3QyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDNUQsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUU3QyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUU3QyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFD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QUcsQ0FBQyxDQUFDLENBQUM7WUFDOUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEQsZUFBZSxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEQsZUFBZSxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEQsZUFBZSxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEQsZUFBZSxDQUFDLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbkQsZUFBZSxDQUFDLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDcEQsZUFBZSxDQUFDLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckQsZUFBZSxDQUFDLEVBQUUsRUFBRSx3QkFBd0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekQsZUFBZSxDQUFDLEVBQUUsRUFBRSx3QkFBd0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekQsZUFBZSxDQUFDLEVBQUUsRUFBRSx3QkFBd0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekQsZUFBZSxDQUFDLEVBQUUsRUFBRSx3QkFBd0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekQsZUFBZSxDQUFDLEVBQUUsRUFBRSx5QkFBeUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUQsZUFBZSxDQUFDLEVBQUUsRUFBRSwwQkFBMEIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0QsZUFBZSxDQUFDLEVBQUUsRUFBRSwyQkFBMkIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDNUQsZUFBZSxDQUFDLEVBQUUsRUFBRSwrQkFBK0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEUsZUFBZSxDQUFDLEVBQUUsRUFBRSwrQkFBK0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEUsZUFBZSxDQUFDLEVBQUUsRUFBRSwrQkFBK0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEUsZUFBZSxDQUFDLEVBQUUsRUFBRSwrQkFBK0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEUsZUFBZSxDQUFDLEVBQUUsRUFBRSxnQ0FBZ0MsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakUsZUFBZSxDQUFDLEVBQUUsRUFBRSxpQ0FBaUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEUsZUFBZSxDQUFDLEVBQUUsRUFBRSxrQ0FBa0MsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbkUsZUFBZSxDQUFDLEVBQUUsRUFBRSxtQ0FBbUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDcEUsZUFBZSxDQUFDLEVBQUUsRUFBRSxvQ0FBb0MsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckUsZUFBZSxDQUFDLEVBQUUsRUFBRSxxQ0FBcUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEUsZUFBZSxDQUFDLEVBQUUsRUFBRSxzQ0FBc0MsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdkUsZUFBZSxDQUFDLEVBQUUsRUFBRSx1Q0FBdUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDeEUsZUFBZSxDQUFDLEVBQUUsRUFBRSx3Q0FBd0MsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekUsZUFBZSxDQUFDLEVBQUUsRUFBRSx5Q0FBeUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUUsZUFBZSxDQUFDLEVB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QUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFN0QsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM3QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkQsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM3QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkQsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM3QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFckQsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM3QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFckQsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM3QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFckQsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM3QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFckQsd0JBQXdCO1lBQ3hCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXJELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXJELDZCQUE2QjtZQUM3QixRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFFQUFxRSxFQUFFLEdBQUcsRUFBRTtRQUNoRixzQ0FBc0M7UUFDdEMsa0JBQWtCLENBQUM7WUFDbEI7Z0JBQ0MsMEJBQTBCO2dCQUMxQiw0QkFBNEI7YUFDNUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1NBQ1YsRUFBRSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDNUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7Z0JBQy9CLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7YUFDM0IsQ0FBQyxDQUFDO1lBRUgsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFO2dCQUN2QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2FBQzNCLENBQUMsQ0FBQztZQUVILFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO2dCQUMvQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzFCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2FBQzNCLENBQUMsQ0FBQztZQUVILFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLFNBQVMsRUFBRTtnQkFDdkIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzthQUMzQixDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNGQUFzRixFQUFFLEdBQUcsRUFBRTtRQUNqRyxzQ0FBc0M7UUFDdEMsa0JBQWtCLENBQUM7WUFDbEI7Z0JBQ0Msd0JBQXdCO2dCQUN4QiwyQkFBMkI7Z0JBQzNCLHdCQUF3QjtnQkFDeEIsdUJBQXVCO2dCQUN2QixpQkFBaUI7YUFDakIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ1osRUFBRSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDNUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7Z0JBQy9CLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3pCLENBQUMsQ0FBQztZQUNILFlBQVksQ0FBQyxTQUFTLEVBQUU7Z0JBQ3ZCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3pCLENBQUMsQ0FBQztZQUVILFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ25DLFlBQVksQ0FBQyxTQUFTLEVBQUU7Z0JBQ3ZCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3pCLENBQUMsQ0FBQztZQUVILFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ25DLFlBQVksQ0FBQyxTQUFTLEVBQUU7Z0JBQ3ZCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3pCLENBQUMsQ0FBQztZQUVILFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ25DLFlBQVksQ0FBQyxTQUFTLEVBQUU7Z0JBQ3ZCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztn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QUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFL0UsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFN0UsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFNUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFOUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFbkYsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFckYsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsTUFB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LFVBQVUsRUFBRSxNQUFNLEVBQUU7U0FDbEMsRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDL0IsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2QyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDakMsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztZQUMzRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkQsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2QyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDakMsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztZQUMzRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0Is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LEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUMxRCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQzFELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDMUQsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUMxRCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQzFELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDMUQsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUMxRCxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQ3pELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDMUQsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxF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QUUsRUFBRTtZQUNuRCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNoQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNoQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNoQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNoQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNoQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUVoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUVoRixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUU5RSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUU1RSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMzRSxDQUFDLENBQUMsQ0FBQztRQUVILEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FB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