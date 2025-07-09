/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { CamelCaseAction, PascalCaseAction, DeleteAllLeftAction, DeleteAllRightAction, DeleteDuplicateLinesAction, DeleteLinesAction, IndentLinesAction, InsertLineAfterAction, InsertLineBeforeAction, JoinLinesAction, KebabCaseAction, LowerCaseAction, SnakeCaseAction, SortLinesAscendingAction, SortLinesDescendingAction, TitleCaseAction, TransposeAction, UpperCaseAction } from '../../browser/linesOperations.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
function assertSelection(editor, expected) {
    if (!Array.isArray(expected)) {
        expected = [expected];
    }
    assert.deepStrictEqual(editor.getSelections(), expected);
}
function executeAction(action, editor) {
    action.run(null, editor, undefined);
}
suite('Editor Contrib - Line Operations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('SortLinesAscendingAction', () => {
        test('should sort selected lines in ascending order', function () {
            withTestCodeEditor([
                'omicron',
                'beta',
                'alpha'
            ], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesAscendingAction = new SortLinesAscendingAction();
                editor.setSelection(new Selection(1, 1, 3, 5));
                executeAction(sortLinesAscendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'alpha',
                    'beta',
                    'omicron'
                ]);
                assertSelection(editor, new Selection(1, 1, 3, 7));
            });
        });
        test('should sort lines in ascending order', function () {
            withTestCodeEditor([
                'omicron',
                'beta',
                'alpha'
            ], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesAscendingAction = new SortLinesAscendingAction();
                executeAction(sortLinesAscendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'alpha',
                    'beta',
                    'omicron'
                ]);
            });
        });
        test('should sort multiple selections in ascending order', function () {
            withTestCodeEditor([
                'omicron',
                'beta',
                'alpha',
                '',
                'omicron',
                'beta',
                'alpha'
            ], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesAscendingAction = new SortLinesAscendingAction();
                editor.setSelections([new Selection(1, 1, 3, 5), new Selection(5, 1, 7, 5)]);
                executeAction(sortLinesAscendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'alpha',
                    'beta',
                    'omicron',
                    '',
                    'alpha',
                    'beta',
                    'omicron'
                ]);
                const expectedSelections = [
                    new Selection(1, 1, 3, 7),
                    new Selection(5, 1, 7, 7)
                ];
                editor.getSelections().forEach((actualSelection, index) => {
                    assert.deepStrictEqual(actualSelection.toString(), expectedSelections[index].toString());
                });
            });
        });
    });
    suite('SortLinesDescendingAction', () => {
        test('should sort selected lines in descending order', function () {
            withTestCodeEditor([
                'alpha',
                'beta',
                'omicron'
            ], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesDescendingAction = new SortLinesDescendingAction();
                editor.setSelection(new Selection(1, 1, 3, 7));
                executeAction(sortLinesDescendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'omicron',
                    'beta',
                    'alpha'
                ]);
                assertSelection(editor, new Selection(1, 1, 3, 5));
            });
        });
        test('should sort multiple selections in descending order', function () {
            withTestCodeEditor([
                'alpha',
                'beta',
                'omicron',
                '',
                'alpha',
                'beta',
                'omicron'
            ], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesDescendingAction = new SortLinesDescendingAction();
                editor.setSelections([new Selection(1, 1, 3, 7), new Selection(5, 1, 7, 7)]);
                executeAction(sortLinesDescendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'omicron',
                    'beta',
                    'alpha',
                    '',
                    'omicron',
                    'beta',
                    'alpha'
                ]);
                const expectedSelections = [
                    new Selection(1, 1, 3, 5),
                    new Selection(5, 1, 7, 5)
                ];
                editor.getSelections().forEach((actualSelection, index) => {
                    assert.deepStrictEqual(actualSelection.toString(), expectedSelections[index].toString());
                });
            });
        });
    });
    suite('DeleteDuplicateLinesAction', () => {
        test('should remove duplicate lines within selection', function () {
            withTestCodeEditor([
                'alpha',
                'beta',
                'beta',
                'beta',
                'alpha',
                'omicron',
            ], {}, (editor) => {
                const model = editor.getModel();
                const deleteDuplicateLinesAction = new DeleteDuplicateLinesAction();
                editor.setSelection(new Selection(1, 3, 6, 4));
                executeAction(deleteDuplicateLinesAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'alpha',
                    'beta',
                    'omicron',
                ]);
                assertSelection(editor, new Selection(1, 1, 3, 7));
            });
        });
        test('should remove duplicate lines', function () {
            withTestCodeEditor([
                'alpha',
                'beta',
                'beta',
                'beta',
                'alpha',
                'omicron',
            ], {}, (editor) => {
                const model = editor.getModel();
                const deleteDuplicateLinesAction = new DeleteDuplicateLinesAction();
                executeAction(deleteDuplicateLinesAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'alpha',
                    'beta',
                    'omicron',
                ]);
                assert.ok(editor.getSelection().isEmpty());
            });
        });
        test('should remove duplicate lines in multiple selections', function () {
            withTestCodeEditor([
                'alpha',
                'beta',
                'beta',
                'omicron',
                '',
                'alpha',
                'alpha',
                'beta'
            ], {}, (editor) => {
                const model = editor.getModel();
                const deleteDuplicateLinesAction = new DeleteDuplicateLinesAction();
                editor.setSelections([new Selection(1, 2, 4, 3), new Selection(6, 2, 8, 3)]);
                executeAction(deleteDuplicateLinesAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'alpha',
                    'beta',
                    'omicron',
                    '',
                    'alpha',
                    'beta'
                ]);
                const expectedSelections = [
                    new Selection(1, 1, 3, 7),
                    new Selection(5, 1, 6, 4)
                ];
                editor.getSelections().forEach((actualSelection, index) => {
                    assert.deepStrictEqual(actualSelection.toString(), expectedSelections[index].toString());
                });
            });
        });
    });
    suite('DeleteAllLeftAction', () => {
        test('should delete to the left of the cursor', function () {
            withTestCodeEditor([
                'one',
                'two',
                'three'
            ], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                editor.setSelection(new Selection(1, 2, 1, 2));
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(1), 'ne');
                editor.setSelections([new Selection(2, 2, 2, 2), new Selection(3, 2, 3, 2)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(2), 'wo');
                assert.strictEqual(model.getLineContent(3), 'hree');
            });
        });
        test('should jump to the previous line when on first column', function () {
            withTestCodeEditor([
                'one',
                'two',
                'three'
            ], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                editor.setSelection(new Selection(2, 1, 2, 1));
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(1), 'onetwo');
                editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLinesContent()[0], 'onetwothree');
                assert.strictEqual(model.getLinesContent().length, 1);
                editor.setSelection(new Selection(1, 1, 1, 1));
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLinesContent()[0], 'onetwothree');
            });
        });
        test('should keep deleting lines in multi cursor mode', function () {
            withTestCodeEditor([
                'hi my name is Carlos Matos',
                'BCC',
                'waso waso waso',
                'my wife doesnt believe in me',
                'nonononono',
                'bitconneeeect'
            ], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                const beforeSecondWasoSelection = new Selection(3, 5, 3, 5);
                const endOfBCCSelection = new Selection(2, 4, 2, 4);
                const endOfNonono = new Selection(5, 11, 5, 11);
                editor.setSelections([beforeSecondWasoSelection, endOfBCCSelection, endOfNonono]);
                executeAction(deleteAllLeftAction, editor);
                let selections = editor.getSelections();
                assert.strictEqual(model.getLineContent(2), '');
                assert.strictEqual(model.getLineContent(3), ' waso waso');
                assert.strictEqual(model.getLineContent(5), '');
                assert.deepStrictEqual([
                    selections[0].startLineNumber,
                    selections[0].startColumn,
                    selections[0].endLineNumber,
                    selections[0].endColumn
                ], [3, 1, 3, 1]);
                assert.deepStrictEqual([
                    selections[1].startLineNumber,
                    selections[1].startColumn,
                    selections[1].endLineNumber,
                    selections[1].endColumn
                ], [2, 1, 2, 1]);
                assert.deepStrictEqual([
                    selections[2].startLineNumber,
                    selections[2].startColumn,
                    selections[2].endLineNumber,
                    selections[2].endColumn
                ], [5, 1, 5, 1]);
                executeAction(deleteAllLeftAction, editor);
                selections = editor.getSelections();
                assert.strictEqual(model.getLineContent(1), 'hi my name is Carlos Matos waso waso');
                assert.strictEqual(selections.length, 2);
                assert.deepStrictEqual([
                    selections[0].startLineNumber,
                    selections[0].startColumn,
                    selections[0].endLineNumber,
                    selections[0].endColumn
                ], [1, 27, 1, 27]);
                assert.deepStrictEqual([
                    selections[1].startLineNumber,
                    selections[1].startColumn,
                    selections[1].endLineNumber,
                    selections[1].endColumn
                ], [2, 29, 2, 29]);
            });
        });
        test('should work in multi cursor mode', function () {
            withTestCodeEditor([
                'hello',
                'world',
                'hello world',
                'hello',
                'bonjour',
                'hola',
                'world',
                'hello world',
            ], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                editor.setSelections([new Selection(1, 2, 1, 2), new Selection(1, 4, 1, 4)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(1), 'lo');
                editor.setSelections([new Selection(2, 2, 2, 2), new Selection(2, 4, 2, 5)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(2), 'd');
                editor.setSelections([new Selection(3, 2, 3, 5), new Selection(3, 7, 3, 7)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(3), 'world');
                editor.setSelections([new Selection(4, 3, 4, 3), new Selection(4, 5, 5, 4)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(4), 'jour');
                editor.setSelections([new Selection(5, 3, 6, 3), new Selection(6, 5, 7, 5), new Selection(7, 7, 7, 7)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(5), 'world');
            });
        });
        test('issue #36234: should push undo stop', () => {
            withTestCodeEditor([
                'one',
                'two',
                'three'
            ], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'Typing some text here on line ' });
                assert.strictEqual(model.getLineContent(1), 'Typing some text here on line one');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 31, 1, 31));
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(1), 'one');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 1, 1));
                CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
                assert.strictEqual(model.getLineContent(1), 'Typing some text here on line one');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 31, 1, 31));
            });
        });
    });
    suite('JoinLinesAction', () => {
        test('should join lines and insert space if necessary', function () {
            withTestCodeEditor([
                'hello',
                'world',
                'hello ',
                'world',
                'hello		',
                '	world',
                'hello   ',
                '	world',
                '',
                '',
                'hello world'
            ], {}, (editor) => {
                const model = editor.getModel();
                const joinLinesAction = new JoinLinesAction();
                editor.setSelection(new Selection(1, 2, 1, 2));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(1), 'hello world');
                assertSelection(editor, new Selection(1, 6, 1, 6));
                editor.setSelection(new Selection(2, 2, 2, 2));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(2), 'hello world');
                assertSelection(editor, new Selection(2, 7, 2, 7));
                editor.setSelection(new Selection(3, 2, 3, 2));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(3), 'hello world');
                assertSelection(editor, new Selection(3, 7, 3, 7));
                editor.setSelection(new Selection(4, 2, 5, 3));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(4), 'hello world');
                assertSelection(editor, new Selection(4, 2, 4, 8));
                editor.setSelection(new Selection(5, 1, 7, 3));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(5), 'hello world');
                assertSelection(editor, new Selection(5, 1, 5, 3));
            });
        });
        test('#50471 Join lines at the end of document', function () {
            withTestCodeEditor([
                'hello',
                'world'
            ], {}, (editor) => {
                const model = editor.getModel();
                const joinLinesAction = new JoinLinesAction();
                editor.setSelection(new Selection(2, 1, 2, 1));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(1), 'hello');
                assert.strictEqual(model.getLineContent(2), 'world');
                assertSelection(editor, new Selection(2, 6, 2, 6));
            });
        });
        test('should work in multi cursor mode', function () {
            withTestCodeEditor([
                'hello',
                'world',
                'hello ',
                'world',
                'hello		',
                '	world',
                'hello   ',
                '	world',
                '',
                '',
                'hello world'
            ], {}, (editor) => {
                const model = editor.getModel();
                const joinLinesAction = new JoinLinesAction();
                editor.setSelections([
                    /** primary cursor */
                    new Selection(5, 2, 5, 2),
                    new Selection(1, 2, 1, 2),
                    new Selection(3, 2, 4, 2),
                    new Selection(5, 4, 6, 3),
                    new Selection(7, 5, 8, 4),
                    new Selection(10, 1, 10, 1)
                ]);
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLinesContent().join('\n'), 'hello world\nhello world\nhello world\nhello world\n\nhello world');
                assertSelection(editor, [
                    /** primary cursor */
                    new Selection(3, 4, 3, 8),
                    new Selection(1, 6, 1, 6),
                    new Selection(2, 2, 2, 8),
                    new Selection(4, 5, 4, 9),
                    new Selection(6, 1, 6, 1)
                ]);
            });
        });
        test('should push undo stop', function () {
            withTestCodeEditor([
                'hello',
                'world'
            ], {}, (editor) => {
                const model = editor.getModel();
                const joinLinesAction = new JoinLinesAction();
                editor.setSelection(new Selection(1, 6, 1, 6));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' my dear' });
                assert.strictEqual(model.getLineContent(1), 'hello my dear');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 14, 1, 14));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(1), 'hello my dear world');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 14, 1, 14));
                CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
                assert.strictEqual(model.getLineContent(1), 'hello my dear');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 14, 1, 14));
            });
        });
    });
    test('transpose', () => {
        withTestCodeEditor([
            'hello world',
            '',
            '',
            '   ',
        ], {}, (editor) => {
            const model = editor.getModel();
            const transposeAction = new TransposeAction();
            editor.setSelection(new Selection(1, 1, 1, 1));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hello world');
            assertSelection(editor, new Selection(1, 2, 1, 2));
            editor.setSelection(new Selection(1, 6, 1, 6));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hell oworld');
            assertSelection(editor, new Selection(1, 7, 1, 7));
            editor.setSelection(new Selection(1, 12, 1, 12));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hell oworl');
            assertSelection(editor, new Selection(2, 2, 2, 2));
            editor.setSelection(new Selection(3, 1, 3, 1));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(3), '');
            assertSelection(editor, new Selection(4, 1, 4, 1));
            editor.setSelection(new Selection(4, 2, 4, 2));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(4), '   ');
            assertSelection(editor, new Selection(4, 3, 4, 3));
        });
        // fix #16633
        withTestCodeEditor([
            '',
            '',
            'hello',
            'world',
            '',
            'hello world',
            '',
            'hello world'
        ], {}, (editor) => {
            const model = editor.getModel();
            const transposeAction = new TransposeAction();
            editor.setSelection(new Selection(1, 1, 1, 1));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(2), '');
            assertSelection(editor, new Selection(2, 1, 2, 1));
            editor.setSelection(new Selection(3, 6, 3, 6));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(4), 'oworld');
            assertSelection(editor, new Selection(4, 2, 4, 2));
            editor.setSelection(new Selection(6, 12, 6, 12));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(7), 'd');
            assertSelection(editor, new Selection(7, 2, 7, 2));
            editor.setSelection(new Selection(8, 12, 8, 12));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(8), 'hello world');
            assertSelection(editor, new Selection(8, 12, 8, 12));
        });
    });
    test('toggle case', function () {
        withTestCodeEditor([
            'hello world',
            'öçşğü',
            'parseHTMLString',
            'getElementById',
            'insertHTML',
            'PascalCase',
            'CSSSelectorsList',
            'iD',
            'tEST',
            'öçşÖÇŞğüĞÜ',
            'audioConverter.convertM4AToMP3();',
            'snake_case',
            'Capital_Snake_Case',
            `function helloWorld() {
				return someGlobalObject.printHelloWorld("en", "utf-8");
				}
				helloWorld();`.replace(/^\s+/gm, ''),
            `'JavaScript'`,
            'parseHTML4String',
            '_accessor: ServicesAccessor'
        ], {}, (editor) => {
            const model = editor.getModel();
            const uppercaseAction = new UpperCaseAction();
            const lowercaseAction = new LowerCaseAction();
            const titlecaseAction = new TitleCaseAction();
            const snakecaseAction = new SnakeCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'HELLO WORLD');
            assertSelection(editor, new Selection(1, 1, 1, 12));
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hello world');
            assertSelection(editor, new Selection(1, 1, 1, 12));
            editor.setSelection(new Selection(1, 3, 1, 3));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'HELLO world');
            assertSelection(editor, new Selection(1, 3, 1, 3));
            editor.setSelection(new Selection(1, 4, 1, 4));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hello world');
            assertSelection(editor, new Selection(1, 4, 1, 4));
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'Hello World');
            assertSelection(editor, new Selection(1, 1, 1, 12));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'ÖÇŞĞÜ');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'öçşğü');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'Öçşğü');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(3, 1, 3, 16));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'parse_html_string');
            assertSelection(editor, new Selection(3, 1, 3, 18));
            editor.setSelection(new Selection(4, 1, 4, 15));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'get_element_by_id');
            assertSelection(editor, new Selection(4, 1, 4, 18));
            editor.setSelection(new Selection(5, 1, 5, 11));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'insert_html');
            assertSelection(editor, new Selection(5, 1, 5, 12));
            editor.setSelection(new Selection(6, 1, 6, 11));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'pascal_case');
            assertSelection(editor, new Selection(6, 1, 6, 12));
            editor.setSelection(new Selection(7, 1, 7, 17));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(7), 'css_selectors_list');
            assertSelection(editor, new Selection(7, 1, 7, 19));
            editor.setSelection(new Selection(8, 1, 8, 3));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(8), 'i_d');
            assertSelection(editor, new Selection(8, 1, 8, 4));
            editor.setSelection(new Selection(9, 1, 9, 5));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(9), 't_est');
            assertSelection(editor, new Selection(9, 1, 9, 6));
            editor.setSelection(new Selection(10, 1, 10, 11));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(10), 'öçş_öç_şğü_ğü');
            assertSelection(editor, new Selection(10, 1, 10, 14));
            editor.setSelection(new Selection(11, 1, 11, 34));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(11), 'audio_converter.convert_m4a_to_mp3();');
            assertSelection(editor, new Selection(11, 1, 11, 38));
            editor.setSelection(new Selection(12, 1, 12, 11));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(12), 'snake_case');
            assertSelection(editor, new Selection(12, 1, 12, 11));
            editor.setSelection(new Selection(13, 1, 13, 19));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(13), 'capital_snake_case');
            assertSelection(editor, new Selection(13, 1, 13, 19));
            editor.setSelection(new Selection(14, 1, 17, 14));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getValueInRange(new Selection(14, 1, 17, 15)), `function hello_world() {
					return some_global_object.print_hello_world("en", "utf-8");
				}
				hello_world();`.replace(/^\s+/gm, ''));
            assertSelection(editor, new Selection(14, 1, 17, 15));
            editor.setSelection(new Selection(18, 1, 18, 13));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(18), `'java_script'`);
            assertSelection(editor, new Selection(18, 1, 18, 14));
            editor.setSelection(new Selection(19, 1, 19, 17));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(19), 'parse_html4_string');
            assertSelection(editor, new Selection(19, 1, 19, 19));
            editor.setSelection(new Selection(20, 1, 20, 28));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(20), '_accessor: services_accessor');
            assertSelection(editor, new Selection(20, 1, 20, 29));
        });
        withTestCodeEditor([
            'foO baR BaZ',
            'foO\'baR\'BaZ',
            'foO[baR]BaZ',
            'foO`baR~BaZ',
            'foO^baR%BaZ',
            'foO$baR!BaZ',
            '\'physician\'s assistant\''
        ], {}, (editor) => {
            const model = editor.getModel();
            const titlecaseAction = new TitleCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'Foo Bar Baz');
            editor.setSelection(new Selection(2, 1, 2, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'Foo\'bar\'baz');
            editor.setSelection(new Selection(3, 1, 3, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'Foo[Bar]Baz');
            editor.setSelection(new Selection(4, 1, 4, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'Foo`Bar~Baz');
            editor.setSelection(new Selection(5, 1, 5, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'Foo^Bar%Baz');
            editor.setSelection(new Selection(6, 1, 6, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'Foo$Bar!Baz');
            editor.setSelection(new Selection(7, 1, 7, 23));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(7), '\'Physician\'s Assistant\'');
        });
        withTestCodeEditor([
            'camel from words',
            'from_snake_case',
            'from-kebab-case',
            'alreadyCamel',
            'ReTain_any_CAPitalization',
            'my_var.test_function()',
            'öçş_öç_şğü_ğü'
        ], {}, (editor) => {
            const model = editor.getModel();
            const camelcaseAction = new CamelCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 18));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'camelFromWords');
            editor.setSelection(new Selection(2, 1, 2, 15));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'fromSnakeCase');
            editor.setSelection(new Selection(3, 1, 3, 15));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'fromKebabCase');
            editor.setSelection(new Selection(4, 1, 4, 12));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'alreadyCamel');
            editor.setSelection(new Selection(5, 1, 5, 26));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'ReTainAnyCAPitalization');
            editor.setSelection(new Selection(6, 1, 6, 23));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'myVar.testFunction()');
            editor.setSelection(new Selection(7, 1, 7, 14));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(7), 'öçşÖçŞğüĞü');
        });
        withTestCodeEditor([
            '',
            '   '
        ], {}, (editor) => {
            const model = editor.getModel();
            const uppercaseAction = new UpperCaseAction();
            const lowercaseAction = new LowerCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 1));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), '');
            assertSelection(editor, new Selection(1, 1, 1, 1));
            editor.setSelection(new Selection(1, 1, 1, 1));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), '');
            assertSelection(editor, new Selection(1, 1, 1, 1));
            editor.setSelection(new Selection(2, 2, 2, 2));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(2), '   ');
            assertSelection(editor, new Selection(2, 2, 2, 2));
            editor.setSelection(new Selection(2, 2, 2, 2));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(2), '   ');
            assertSelection(editor, new Selection(2, 2, 2, 2));
        });
        withTestCodeEditor([
            'hello world',
            'öçşğü',
            'parseHTMLString',
            'getElementById',
            'PascalCase',
            'öçşÖÇŞğüĞÜ',
            'audioConverter.convertM4AToMP3();',
            'Capital_Snake_Case',
            'parseHTML4String',
            '_accessor: ServicesAccessor',
            'Kebab-Case',
        ], {}, (editor) => {
            const model = editor.getModel();
            const kebabCaseAction = new KebabCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hello world');
            assertSelection(editor, new Selection(1, 1, 1, 12));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'öçşğü');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(3, 1, 3, 16));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'parse-html-string');
            assertSelection(editor, new Selection(3, 1, 3, 18));
            editor.setSelection(new Selection(4, 1, 4, 15));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'get-element-by-id');
            assertSelection(editor, new Selection(4, 1, 4, 18));
            editor.setSelection(new Selection(5, 1, 5, 11));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'pascal-case');
            assertSelection(editor, new Selection(5, 1, 5, 12));
            editor.setSelection(new Selection(6, 1, 6, 11));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'öçş-öç-şğü-ğü');
            assertSelection(editor, new Selection(6, 1, 6, 14));
            editor.setSelection(new Selection(7, 1, 7, 34));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(7), 'audio-converter.convert-m4a-to-mp3();');
            assertSelection(editor, new Selection(7, 1, 7, 38));
            editor.setSelection(new Selection(8, 1, 8, 19));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(8), 'capital-snake-case');
            assertSelection(editor, new Selection(8, 1, 8, 19));
            editor.setSelection(new Selection(9, 1, 9, 17));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(9), 'parse-html4-string');
            assertSelection(editor, new Selection(9, 1, 9, 19));
            editor.setSelection(new Selection(10, 1, 10, 28));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(10), '_accessor: services-accessor');
            assertSelection(editor, new Selection(10, 1, 10, 29));
            editor.setSelection(new Selection(11, 1, 11, 11));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(11), 'kebab-case');
            assertSelection(editor, new Selection(11, 1, 11, 11));
        });
        withTestCodeEditor([
            'hello world',
            'öçşğü',
            'parseHTMLString',
            'getElementById',
            'PascalCase',
            'öçşÖÇŞğüĞÜ',
            'audioConverter.convertM4AToMP3();',
            'Capital_Snake_Case',
            'parseHTML4String',
            'Kebab-Case',
        ], {}, (editor) => {
            const model = editor.getModel();
            const pascalCaseAction = new PascalCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'HelloWorld');
            assertSelection(editor, new Selection(1, 1, 1, 11));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'Öçşğü');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(3, 1, 3, 16));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'ParseHTMLString');
            assertSelection(editor, new Selection(3, 1, 3, 16));
            editor.setSelection(new Selection(4, 1, 4, 15));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'GetElementById');
            assertSelection(editor, new Selection(4, 1, 4, 15));
            editor.setSelection(new Selection(5, 1, 5, 11));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'PascalCase');
            assertSelection(editor, new Selection(5, 1, 5, 11));
            editor.setSelection(new Selection(6, 1, 6, 11));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'ÖçşÖÇŞğüĞÜ');
            assertSelection(editor, new Selection(6, 1, 6, 11));
            editor.setSelection(new Selection(7, 1, 7, 34));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(7), 'AudioConverter.ConvertM4AToMP3();');
            assertSelection(editor, new Selection(7, 1, 7, 34));
            editor.setSelection(new Selection(8, 1, 8, 19));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(8), 'CapitalSnakeCase');
            assertSelection(editor, new Selection(8, 1, 8, 17));
            editor.setSelection(new Selection(9, 1, 9, 17));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(9), 'ParseHTML4String');
            assertSelection(editor, new Selection(9, 1, 9, 17));
            editor.setSelection(new Selection(10, 1, 10, 11));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(10), 'KebabCase');
            assertSelection(editor, new Selection(10, 1, 10, 10));
        });
    });
    suite('DeleteAllRightAction', () => {
        test('should be noop on empty', () => {
            withTestCodeEditor([''], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
                editor.setSelection(new Selection(1, 1, 1, 1));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
                editor.setSelections([new Selection(1, 1, 1, 1), new Selection(1, 1, 1, 1), new Selection(1, 1, 1, 1)]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
            });
        });
        test('should delete selected range', () => {
            withTestCodeEditor([
                'hello',
                'world'
            ], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelection(new Selection(1, 2, 1, 5));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['ho', 'world']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 2, 1, 2)]);
                editor.setSelection(new Selection(1, 1, 2, 4));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['ld']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
                editor.setSelection(new Selection(1, 1, 1, 3));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
            });
        });
        test('should delete to the right of the cursor', () => {
            withTestCodeEditor([
                'hello',
                'world'
            ], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelection(new Selection(1, 3, 1, 3));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he', 'world']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 3, 1, 3)]);
                editor.setSelection(new Selection(2, 1, 2, 1));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he', '']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(2, 1, 2, 1)]);
            });
        });
        test('should join two lines, if at the end of the line', () => {
            withTestCodeEditor([
                'hello',
                'world'
            ], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelection(new Selection(1, 6, 1, 6));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['helloworld']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
                editor.setSelection(new Selection(1, 6, 1, 6));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hello']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
                editor.setSelection(new Selection(1, 6, 1, 6));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hello']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
            });
        });
        test('should work with multiple cursors', () => {
            withTestCodeEditor([
                'hello',
                'there',
                'world'
            ], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelections([
                    new Selection(1, 3, 1, 3),
                    new Selection(1, 6, 1, 6),
                    new Selection(3, 4, 3, 4),
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hethere', 'wor']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(2, 4, 2, 4)
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he', 'wor']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(2, 4, 2, 4)
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hewor']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(1, 6, 1, 6)
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3)
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3)
                ]);
            });
        });
        test('should work with undo/redo', () => {
            withTestCodeEditor([
                'hello',
                'there',
                'world'
            ], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelections([
                    new Selection(1, 3, 1, 3),
                    new Selection(1, 6, 1, 6),
                    new Selection(3, 4, 3, 4),
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hethere', 'wor']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(2, 4, 2, 4)
                ]);
                CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(1, 6, 1, 6),
                    new Selection(3, 4, 3, 4)
                ]);
                CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(2, 4, 2, 4)
                ]);
            });
        });
    });
    test('InsertLineBeforeAction', () => {
        function testInsertLineBefore(lineNumber, column, callback) {
            const TEXT = [
                'First line',
                'Second line',
                'Third line'
            ];
            withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
                editor.setPosition(new Position(lineNumber, column));
                const insertLineBeforeAction = new InsertLineBeforeAction();
                executeAction(insertLineBeforeAction, editor);
                callback(editor.getModel(), viewModel);
            });
        }
        testInsertLineBefore(1, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 1, 1, 1));
            assert.strictEqual(model.getLineContent(1), '');
            assert.strictEqual(model.getLineContent(2), 'First line');
            assert.strictEqual(model.getLineContent(3), 'Second line');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
        testInsertLineBefore(2, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(2, 1, 2, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), 'Second line');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
        testInsertLineBefore(3, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(3, 1, 3, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), 'Second line');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
    });
    test('InsertLineAfterAction', () => {
        function testInsertLineAfter(lineNumber, column, callback) {
            const TEXT = [
                'First line',
                'Second line',
                'Third line'
            ];
            withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
                editor.setPosition(new Position(lineNumber, column));
                const insertLineAfterAction = new InsertLineAfterAction();
                executeAction(insertLineAfterAction, editor);
                callback(editor.getModel(), viewModel);
            });
        }
        testInsertLineAfter(1, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(2, 1, 2, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), 'Second line');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
        testInsertLineAfter(2, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(3, 1, 3, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), 'Second line');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
        testInsertLineAfter(3, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(4, 1, 4, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), 'Second line');
            assert.strictEqual(model.getLineContent(3), 'Third line');
            assert.strictEqual(model.getLineContent(4), '');
        });
    });
    test('Bug 18276:[editor] Indentation broken when selection is empty', () => {
        const model = createTextModel([
            'function baz() {'
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor) => {
            const indentLinesAction = new IndentLinesAction();
            editor.setPosition(new Position(1, 2));
            executeAction(indentLinesAction, editor);
            assert.strictEqual(model.getLineContent(1), '\tfunction baz() {');
            assert.deepStrictEqual(editor.getSelection(), new Selection(1, 3, 1, 3));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '\tf\tunction baz() {');
        });
        model.dispose();
    });
    test('issue #80736: Indenting while the cursor is at the start of a line of text causes the added spaces or tab to be selected', () => {
        const model = createTextModel([
            'Some text'
        ].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor) => {
            const indentLinesAction = new IndentLinesAction();
            editor.setPosition(new Position(1, 1));
            executeAction(indentLinesAction, editor);
            assert.strictEqual(model.getLineContent(1), '\tSome text');
            assert.deepStrictEqual(editor.getSelection(), new Selection(1, 2, 1, 2));
        });
        model.dispose();
    });
    test('Indenting on empty line should move cursor', () => {
        const model = createTextModel([
            ''
        ].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor) => {
            const indentLinesAction = new IndentLinesAction();
            editor.setPosition(new Position(1, 1));
            executeAction(indentLinesAction, editor);
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.deepStrictEqual(editor.getSelection(), new Selection(1, 5, 1, 5));
        });
        model.dispose();
    });
    test('issue #62112: Delete line does not work properly when multiple cursors are on line', () => {
        const TEXT = [
            'a',
            'foo boo',
            'too',
            'c',
        ];
        withTestCodeEditor(TEXT, {}, (editor) => {
            editor.setSelections([
                new Selection(2, 4, 2, 4),
                new Selection(2, 8, 2, 8),
                new Selection(3, 4, 3, 4),
            ]);
            const deleteLinesAction = new DeleteLinesAction();
            executeAction(deleteLinesAction, editor);
            assert.strictEqual(editor.getValue(), 'a\nc');
        });
    });
    function testDeleteLinesCommand(initialText, _initialSelections, resultingText, _resultingSelections) {
        const initialSelections = Array.isArray(_initialSelections) ? _initialSelections : [_initialSelections];
        const resultingSelections = Array.isArray(_resultingSelections) ? _resultingSelections : [_resultingSelections];
        withTestCodeEditor(initialText, {}, (editor) => {
            editor.setSelections(initialSelections);
            const deleteLinesAction = new DeleteLinesAction();
            executeAction(deleteLinesAction, editor);
            assert.strictEqual(editor.getValue(), resultingText.join('\n'));
            assert.deepStrictEqual(editor.getSelections(), resultingSelections);
        });
    }
    test('empty selection in middle of lines', function () {
        testDeleteLinesCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 3, 2, 3), [
            'first',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 3, 2, 3));
    });
    test('empty selection at top of lines', function () {
        testDeleteLinesCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 5, 1, 5), [
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 5, 1, 5));
    });
    test('empty selection at end of lines', function () {
        testDeleteLinesCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(5, 2, 5, 2), [
            'first',
            'second line',
            'third line',
            'fourth line'
        ], new Selection(4, 2, 4, 2));
    });
    test('with selection in middle of lines', function () {
        testDeleteLinesCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(3, 3, 2, 2), [
            'first',
            'fourth line',
            'fifth'
        ], new Selection(2, 2, 2, 2));
    });
    test('with selection at top of lines', function () {
        testDeleteLinesCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 4, 1, 5), [
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 5, 1, 5));
    });
    test('with selection at end of lines', function () {
        testDeleteLinesCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(5, 1, 5, 2), [
            'first',
            'second line',
            'third line',
            'fourth line'
        ], new Selection(4, 2, 4, 2));
    });
    test('with full line selection in middle of lines', function () {
        testDeleteLinesCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(4, 1, 2, 1), [
            'first',
            'fourth line',
            'fifth'
        ], new Selection(2, 1, 2, 1));
    });
    test('with full line selection at top of lines', function () {
        testDeleteLinesCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 1, 1, 5), [
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 5, 1, 5));
    });
    test('with full line selection at end of lines', function () {
        testDeleteLinesCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(4, 1, 5, 2), [
            'first',
            'second line',
            'third line'
        ], new Selection(3, 2, 3, 2));
    });
    test('multicursor 1', function () {
        testDeleteLinesCommand([
            'class P {',
            '',
            '    getA() {',
            '        if (true) {',
            '            return "a";',
            '        }',
            '    }',
            '',
            '    getB() {',
            '        if (true) {',
            '            return "b";',
            '        }',
            '    }',
            '',
            '    getC() {',
            '        if (true) {',
            '            return "c";',
            '        }',
            '    }',
            '}',
        ], [
            new Selection(4, 1, 5, 1),
            new Selection(10, 1, 11, 1),
            new Selection(16, 1, 17, 1),
        ], [
            'class P {',
            '',
            '    getA() {',
            '            return "a";',
            '        }',
            '    }',
            '',
            '    getB() {',
            '            return "b";',
            '        }',
            '    }',
            '',
            '    getC() {',
            '            return "c";',
            '        }',
            '    }',
            '}',
        ], [
            new Selection(4, 1, 4, 1),
            new Selection(9, 1, 9, 1),
            new Selection(14, 1, 14, 1),
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNPcGVyYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbGluZXNPcGVyYXRpb25zL3Rlc3QvYnJvd3Nlci9saW5lc09wZXJhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUlqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLDBCQUEwQixFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSx3QkFBd0IsRUFBRSx5QkFBeUIsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdaLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUzRSxTQUFTLGVBQWUsQ0FBQyxNQUFtQixFQUFFLFFBQWlDO0lBQzlFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDOUIsUUFBUSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzFELENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxNQUFvQixFQUFFLE1BQW1CO0lBQy9ELE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRUQsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtJQUU5Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsSUFBSSxDQUFDLCtDQUErQyxFQUFFO1lBQ3JELGtCQUFrQixDQUNqQjtnQkFDQyxTQUFTO2dCQUNULE1BQU07Z0JBQ04sT0FBTzthQUNQLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztnQkFDakMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7Z0JBRWhFLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0MsYUFBYSxDQUFDLHdCQUF3QixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsRUFBRTtvQkFDL0MsT0FBTztvQkFDUCxNQUFNO29CQUNOLFNBQVM7aUJBQ1QsQ0FBQyxDQUFDO2dCQUNILGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFO1lBQzVDLGtCQUFrQixDQUNqQjtnQkFDQyxTQUFTO2dCQUNULE1BQU07Z0JBQ04sT0FBTzthQUNQLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztnQkFDakMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7Z0JBRWhFLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEVBQUU7b0JBQy9DLE9BQU87b0JBQ1AsTUFBTTtvQkFDTixTQUFTO2lCQUNULENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsb0RBQW9ELEVBQUU7WUFDMUQsa0JBQWtCLENBQ2pCO2dCQUNDLFNBQVM7Z0JBQ1QsTUFBTTtnQkFDTixPQUFPO2dCQUNQLEVBQUU7Z0JBQ0YsU0FBUztnQkFDVCxNQUFNO2dCQUNOLE9BQU87YUFDUCxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7Z0JBQ2pDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO2dCQUVoRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxhQUFhLENBQUMsd0JBQXdCLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFO29CQUMvQyxPQUFPO29CQUNQLE1BQU07b0JBQ04sU0FBUztvQkFDVCxFQUFFO29CQUNGLE9BQU87b0JBQ1AsTUFBTTtvQkFDTixTQUFTO2lCQUNULENBQUMsQ0FBQztnQkFDSCxNQUFNLGtCQUFrQixHQUFHO29CQUMxQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDekIsQ0FBQztnQkFDRixNQUFNLENBQUMsYUFBYSxFQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxFQUFFO29CQUMxRCxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsSUFBSSxDQUFDLGdEQUFnRCxFQUFFO1lBQ3RELGtCQUFrQixDQUNqQjtnQkFDQyxPQUFPO2dCQUNQLE1BQU07Z0JBQ04sU0FBUzthQUNULEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztnQkFDakMsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLHlCQUF5QixFQUFFLENBQUM7Z0JBRWxFLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0MsYUFBYSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsRUFBRTtvQkFDL0MsU0FBUztvQkFDVCxNQUFNO29CQUNOLE9BQU87aUJBQ1AsQ0FBQyxDQUFDO2dCQUNILGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFEQUFxRCxFQUFFO1lBQzNELGtCQUFrQixDQUNqQjtnQkFDQyxPQUFPO2dCQUNQLE1BQU07Z0JBQ04sU0FBUztnQkFDVCxFQUFFO2dCQUNGLE9BQU87Z0JBQ1AsTUFBTTtnQkFDTixTQUFTO2FBQ1QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDakIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO2dCQUNqQyxNQUFNLHlCQUF5QixHQUFHLElBQUkseUJBQXlCLEVBQUUsQ0FBQztnQkFFbEUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0UsYUFBYSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsRUFBRTtvQkFDL0MsU0FBUztvQkFDVCxNQUFNO29CQUNOLE9BQU87b0JBQ1AsRUFBRTtvQkFDRixTQUFTO29CQUNULE1BQU07b0JBQ04sT0FBTztpQkFDUCxDQUFDLENBQUM7Z0JBQ0gsTUFBTSxrQkFBa0IsR0FBRztvQkFDMUIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN6QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ3pCLENBQUM7Z0JBQ0YsTUFBTSxDQUFDLGFBQWEsRUFBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDMUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDMUYsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLElBQUksQ0FBQyxnREFBZ0QsRUFBRTtZQUN0RCxrQkFBa0IsQ0FDakI7Z0JBQ0MsT0FBTztnQkFDUCxNQUFNO2dCQUNOLE1BQU07Z0JBQ04sTUFBTTtnQkFDTixPQUFPO2dCQUNQLFNBQVM7YUFDVCxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7Z0JBQ2pDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO2dCQUVwRSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLGFBQWEsQ0FBQywwQkFBMEIsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEVBQUU7b0JBQy9DLE9BQU87b0JBQ1AsTUFBTTtvQkFDTixTQUFTO2lCQUNULENBQUMsQ0FBQztnQkFDSCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywrQkFBK0IsRUFBRTtZQUNyQyxrQkFBa0IsQ0FDakI7Z0JBQ0MsT0FBTztnQkFDUCxNQUFNO2dCQUNOLE1BQU07Z0JBQ04sTUFBTTtnQkFDTixPQUFPO2dCQUNQLFNBQVM7YUFDVCxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7Z0JBQ2pDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO2dCQUVwRSxhQUFhLENBQUMsMEJBQTBCLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFO29CQUMvQyxPQUFPO29CQUNQLE1BQU07b0JBQ04sU0FBUztpQkFDVCxDQUFDLENBQUM7Z0JBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUM1QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHNEQUFzRCxFQUFFO1lBQzVELGtCQUFrQixDQUNqQjtnQkFDQyxPQUFPO2dCQUNQLE1BQU07Z0JBQ04sTUFBTTtnQkFDTixTQUFTO2dCQUNULEVBQUU7Z0JBQ0YsT0FBTztnQkFDUCxPQUFPO2dCQUNQLE1BQU07YUFDTixFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7Z0JBQ2pDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO2dCQUVwRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxhQUFhLENBQUMsMEJBQTBCLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFO29CQUMvQyxPQUFPO29CQUNQLE1BQU07b0JBQ04sU0FBUztvQkFDVCxFQUFFO29CQUNGLE9BQU87b0JBQ1AsTUFBTTtpQkFDTixDQUFDLENBQUM7Z0JBQ0gsTUFBTSxrQkFBa0IsR0FBRztvQkFDMUIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN6QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ3pCLENBQUM7Z0JBQ0YsTUFBTSxDQUFDLGFBQWEsRUFBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDMUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDMUYsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFHSCxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLElBQUksQ0FBQyx5Q0FBeUMsRUFBRTtZQUMvQyxrQkFBa0IsQ0FDakI7Z0JBQ0MsS0FBSztnQkFDTCxLQUFLO2dCQUNMLE9BQU87YUFDUCxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7Z0JBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUV0RCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUVsRCxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxhQUFhLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdURBQXVELEVBQUU7WUFDN0Qsa0JBQWtCLENBQ2pCO2dCQUNDLEtBQUs7Z0JBQ0wsS0FBSztnQkFDTCxPQUFPO2FBQ1AsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDakIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO2dCQUNqQyxNQUFNLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztnQkFFdEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFFdEQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0UsYUFBYSxDQUFDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUV0RCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDL0QsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxpREFBaUQsRUFBRTtZQUN2RCxrQkFBa0IsQ0FDakI7Z0JBQ0MsNEJBQTRCO2dCQUM1QixLQUFLO2dCQUNMLGdCQUFnQjtnQkFDaEIsOEJBQThCO2dCQUM5QixZQUFZO2dCQUNaLGVBQWU7YUFDZixFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7Z0JBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUV0RCxNQUFNLHlCQUF5QixHQUFHLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLGlCQUFpQixHQUFHLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLFdBQVcsR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFFaEQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLHlCQUF5QixFQUFFLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBRWxGLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRyxDQUFDO2dCQUV6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUVoRCxNQUFNLENBQUMsZUFBZSxDQUFDO29CQUN0QixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZTtvQkFDN0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVc7b0JBQ3pCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhO29CQUMzQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztpQkFDdkIsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRWpCLE1BQU0sQ0FBQyxlQUFlLENBQUM7b0JBQ3RCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlO29CQUM3QixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVztvQkFDekIsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWE7b0JBQzNCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2lCQUN2QixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFakIsTUFBTSxDQUFDLGVBQWUsQ0FBQztvQkFDdEIsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWU7b0JBQzdCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXO29CQUN6QixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYTtvQkFDM0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7aUJBQ3ZCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVqQixhQUFhLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzNDLFVBQVUsR0FBRyxNQUFNLENBQUMsYUFBYSxFQUFHLENBQUM7Z0JBRXJDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO2dCQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRXpDLE1BQU0sQ0FBQyxlQUFlLENBQUM7b0JBQ3RCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlO29CQUM3QixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVztvQkFDekIsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWE7b0JBQzNCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2lCQUN2QixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFbkIsTUFBTSxDQUFDLGVBQWUsQ0FBQztvQkFDdEIsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWU7b0JBQzdCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXO29CQUN6QixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYTtvQkFDM0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7aUJBQ3ZCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0NBQWtDLEVBQUU7WUFDeEMsa0JBQWtCLENBQ2pCO2dCQUNDLE9BQU87Z0JBQ1AsT0FBTztnQkFDUCxhQUFhO2dCQUNiLE9BQU87Z0JBQ1AsU0FBUztnQkFDVCxNQUFNO2dCQUNOLE9BQU87Z0JBQ1AsYUFBYTthQUNiLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztnQkFDakMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7Z0JBRXRELE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdFLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUVsRCxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxhQUFhLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFFakQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0UsYUFBYSxDQUFDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBRXJELE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdFLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUVwRCxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4RyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN0RCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtZQUNoRCxrQkFBa0IsQ0FDakI7Z0JBQ0MsS0FBSztnQkFDTCxLQUFLO2dCQUNMLE9BQU87YUFDUCxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7Z0JBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUV0RCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQyxDQUFDO2dCQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUNBQW1DLENBQUMsQ0FBQztnQkFDakYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFM0UsYUFBYSxDQUFDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRXpFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUNBQW1DLENBQUMsQ0FBQztnQkFDakYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1RSxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLElBQUksQ0FBQyxpREFBaUQsRUFBRTtZQUN2RCxrQkFBa0IsQ0FDakI7Z0JBQ0MsT0FBTztnQkFDUCxPQUFPO2dCQUNQLFFBQVE7Z0JBQ1IsT0FBTztnQkFDUCxTQUFTO2dCQUNULFFBQVE7Z0JBQ1IsVUFBVTtnQkFDVixRQUFRO2dCQUNSLEVBQUU7Z0JBQ0YsRUFBRTtnQkFDRixhQUFhO2FBQ2IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDakIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO2dCQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUU5QyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMENBQTBDLEVBQUU7WUFDaEQsa0JBQWtCLENBQ2pCO2dCQUNDLE9BQU87Z0JBQ1AsT0FBTzthQUNQLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztnQkFDakMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFFOUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDckQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0NBQWtDLEVBQUU7WUFDeEMsa0JBQWtCLENBQ2pCO2dCQUNDLE9BQU87Z0JBQ1AsT0FBTztnQkFDUCxRQUFRO2dCQUNSLE9BQU87Z0JBQ1AsU0FBUztnQkFDVCxRQUFRO2dCQUNSLFVBQVU7Z0JBQ1YsUUFBUTtnQkFDUixFQUFFO2dCQUNGLEVBQUU7Z0JBQ0YsYUFBYTthQUNiLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztnQkFDakMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFFOUMsTUFBTSxDQUFDLGFBQWEsQ0FBQztvQkFDcEIscUJBQXFCO29CQUNyQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDekIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN6QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDekIsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUMzQixDQUFDLENBQUM7Z0JBRUgsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLG1FQUFtRSxDQUFDLENBQUM7Z0JBQzVILGVBQWUsQ0FBQyxNQUFNLEVBQUU7b0JBQ3ZCLHFCQUFxQjtvQkFDckIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN6QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDekIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN6QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ3pCLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUU7WUFDN0Isa0JBQWtCLENBQ2pCO2dCQUNDLE9BQU87Z0JBQ1AsT0FBTzthQUNQLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztnQkFDakMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFFOUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7Z0JBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztnQkFDN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFM0UsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLENBQUM7Z0JBQ25FLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRTNFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7Z0JBQzdELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUUsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFDdEIsa0JBQWtCLENBQ2pCO1lBQ0MsYUFBYTtZQUNiLEVBQUU7WUFDRixFQUFFO1lBQ0YsS0FBSztTQUNMLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDakIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBQ2pDLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFFOUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzNELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUMxRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbkQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FDRCxDQUFDO1FBRUYsYUFBYTtRQUNiLGtCQUFrQixDQUNqQjtZQUNDLEVBQUU7WUFDRixFQUFFO1lBQ0YsT0FBTztZQUNQLE9BQU87WUFDUCxFQUFFO1lBQ0YsYUFBYTtZQUNiLEVBQUU7WUFDRixhQUFhO1NBQ2IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNqQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUU5QyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN0RCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2pELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2pELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDakQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ25CLGtCQUFrQixDQUNqQjtZQUNDLGFBQWE7WUFDYixPQUFPO1lBQ1AsaUJBQWlCO1lBQ2pCLGdCQUFnQjtZQUNoQixZQUFZO1lBQ1osWUFBWTtZQUNaLGtCQUFrQjtZQUNsQixJQUFJO1lBQ0osTUFBTTtZQUNOLFlBQVk7WUFDWixtQ0FBbUM7WUFDbkMsWUFBWTtZQUNaLG9CQUFvQjtZQUNwQjs7O2tCQUdjLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDcEMsY0FBYztZQUNkLGtCQUFrQjtZQUNsQiw2QkFBNkI7U0FDN0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNqQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUM5QyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFDOUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUU5QyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXBELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMzRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFcEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzNELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMzRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFcEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDckQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNyRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUM7WUFDakUsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXBELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2pFLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVwRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXBELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMzRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFcEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDbEUsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXBELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNuRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDOUQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXRELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1lBQ3RGLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV0RCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDM0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXRELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQ25FLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV0RCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTs7O21CQUd6RCxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN2QyxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFdEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQzlELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV0RCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUNuRSxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFdEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxFQUFFLDhCQUE4QixDQUFDLENBQUM7WUFDN0UsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELENBQUMsQ0FDRCxDQUFDO1FBRUYsa0JBQWtCLENBQ2pCO1lBQ0MsYUFBYTtZQUNiLGVBQWU7WUFDZixhQUFhO1lBQ2IsYUFBYTtZQUNiLGFBQWE7WUFDYixhQUFhO1lBQ2IsNEJBQTRCO1NBQzVCLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDakIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBQ2pDLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFFOUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRTNELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUU3RCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFM0QsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRTNELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUUzRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFM0QsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdB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