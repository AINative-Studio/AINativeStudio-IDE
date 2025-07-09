/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isFirefox } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { CursorWordAccessibilityLeft, CursorWordAccessibilityLeftSelect, CursorWordAccessibilityRight, CursorWordAccessibilityRightSelect, CursorWordEndLeft, CursorWordEndLeftSelect, CursorWordEndRight, CursorWordEndRightSelect, CursorWordLeft, CursorWordLeftSelect, CursorWordRight, CursorWordRightSelect, CursorWordStartLeft, CursorWordStartLeftSelect, CursorWordStartRight, CursorWordStartRightSelect, DeleteInsideWord, DeleteWordEndLeft, DeleteWordEndRight, DeleteWordLeft, DeleteWordRight, DeleteWordStartLeft, DeleteWordStartRight } from '../../browser/wordOperations.js';
import { deserializePipePositions, serializePipePositions, testRepeatedActionAndExtractPositions } from './wordTestUtils.js';
import { createCodeEditorServices, instantiateTestCodeEditor, withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { instantiateTextModel } from '../../../../test/common/testTextModel.js';
suite('WordOperations', () => {
    const _cursorWordStartLeft = new CursorWordStartLeft();
    const _cursorWordEndLeft = new CursorWordEndLeft();
    const _cursorWordLeft = new CursorWordLeft();
    const _cursorWordStartLeftSelect = new CursorWordStartLeftSelect();
    const _cursorWordEndLeftSelect = new CursorWordEndLeftSelect();
    const _cursorWordLeftSelect = new CursorWordLeftSelect();
    const _cursorWordStartRight = new CursorWordStartRight();
    const _cursorWordEndRight = new CursorWordEndRight();
    const _cursorWordRight = new CursorWordRight();
    const _cursorWordStartRightSelect = new CursorWordStartRightSelect();
    const _cursorWordEndRightSelect = new CursorWordEndRightSelect();
    const _cursorWordRightSelect = new CursorWordRightSelect();
    const _cursorWordAccessibilityLeft = new CursorWordAccessibilityLeft();
    const _cursorWordAccessibilityLeftSelect = new CursorWordAccessibilityLeftSelect();
    const _cursorWordAccessibilityRight = new CursorWordAccessibilityRight();
    const _cursorWordAccessibilityRightSelect = new CursorWordAccessibilityRightSelect();
    const _deleteWordLeft = new DeleteWordLeft();
    const _deleteWordStartLeft = new DeleteWordStartLeft();
    const _deleteWordEndLeft = new DeleteWordEndLeft();
    const _deleteWordRight = new DeleteWordRight();
    const _deleteWordStartRight = new DeleteWordStartRight();
    const _deleteWordEndRight = new DeleteWordEndRight();
    const _deleteInsideWord = new DeleteInsideWord();
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createCodeEditorServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        languageService = instantiationService.get(ILanguageService);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function runEditorCommand(editor, command) {
        instantiationService.invokeFunction((accessor) => {
            command.runEditorCommand(accessor, editor, null);
        });
    }
    function cursorWordLeft(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordLeftSelect : _cursorWordLeft);
    }
    function cursorWordAccessibilityLeft(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordAccessibilityLeft : _cursorWordAccessibilityLeftSelect);
    }
    function cursorWordAccessibilityRight(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordAccessibilityRightSelect : _cursorWordAccessibilityRight);
    }
    function cursorWordStartLeft(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordStartLeftSelect : _cursorWordStartLeft);
    }
    function cursorWordEndLeft(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordEndLeftSelect : _cursorWordEndLeft);
    }
    function cursorWordRight(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordRightSelect : _cursorWordRight);
    }
    function moveWordEndRight(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordEndRightSelect : _cursorWordEndRight);
    }
    function moveWordStartRight(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordStartRightSelect : _cursorWordStartRight);
    }
    function deleteWordLeft(editor) {
        runEditorCommand(editor, _deleteWordLeft);
    }
    function deleteWordStartLeft(editor) {
        runEditorCommand(editor, _deleteWordStartLeft);
    }
    function deleteWordEndLeft(editor) {
        runEditorCommand(editor, _deleteWordEndLeft);
    }
    function deleteWordRight(editor) {
        runEditorCommand(editor, _deleteWordRight);
    }
    function deleteWordStartRight(editor) {
        runEditorCommand(editor, _deleteWordStartRight);
    }
    function deleteWordEndRight(editor) {
        runEditorCommand(editor, _deleteWordEndRight);
    }
    function deleteInsideWord(editor) {
        _deleteInsideWord.run(null, editor, null);
    }
    test('cursorWordLeft - simple', () => {
        const EXPECTED = [
            '|    \t|My |First |Line\t ',
            '|\t|My |Second |Line',
            '|    |Third |Line🐶',
            '|',
            '|1',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordLeft - with selection', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor) => {
            editor.setPosition(new Position(5, 2));
            cursorWordLeft(editor, true);
            assert.deepStrictEqual(editor.getSelection(), new Selection(5, 2, 5, 1));
        });
    });
    test('cursorWordLeft - issue #832', () => {
        const EXPECTED = ['|   |/* |Just |some   |more   |text |a|+= |3 |+|5-|3 |+ |7 |*/  '].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordLeft - issue #48046: Word selection doesn\'t work as usual', () => {
        const EXPECTED = [
            '|deep.|object.|property',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 21), ed => cursorWordLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordLeft - Recognize words', function () {
        if (isFirefox) {
            // https://github.com/microsoft/vscode/issues/219843
            return this.skip();
        }
        const EXPECTED = [
            '|/* |これ|は|テスト|です |/*',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordLeft(ed, true), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)), {
            wordSegmenterLocales: 'ja'
        });
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordLeft - Does not recognize words', () => {
        const EXPECTED = [
            '|/* |これはテストです |/*',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordLeft(ed, true), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)), {
            wordSegmenterLocales: ''
        });
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordLeft - issue #169904: cursors out of sync', () => {
        const text = [
            '.grid1 {',
            '  display: grid;',
            '  grid-template-columns:',
            '    [full-start] minmax(1em, 1fr)',
            '    [main-start] minmax(0, 40em) [main-end]',
            '    minmax(1em, 1fr) [full-end];',
            '}',
            '.grid2 {',
            '  display: grid;',
            '  grid-template-columns:',
            '    [full-start] minmax(1em, 1fr)',
            '    [main-start] minmax(0, 40em) [main-end] minmax(1em, 1fr) [full-end];',
            '}',
        ];
        withTestCodeEditor(text, {}, (editor) => {
            editor.setSelections([
                new Selection(5, 44, 5, 44),
                new Selection(6, 32, 6, 32),
                new Selection(12, 44, 12, 44),
                new Selection(12, 72, 12, 72),
            ]);
            cursorWordLeft(editor, false);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(5, 43, 5, 43),
                new Selection(6, 31, 6, 31),
                new Selection(12, 43, 12, 43),
                new Selection(12, 71, 12, 71),
            ]);
        });
    });
    test('cursorWordLeftSelect - issue #74369: cursorWordLeft and cursorWordLeftSelect do not behave consistently', () => {
        const EXPECTED = [
            '|this.|is.|a.|test',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 15), ed => cursorWordLeft(ed, true), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordStartLeft', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = ['|   |/* |Just |some   |more   |text |a|+= |3 |+|5|-|3 |+ |7 |*/  '].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordStartLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordStartLeft - issue #51119: regression makes VS compatibility impossible', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = ['|this|.|is|.|a|.|test'].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordStartLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #51275 - cursorWordStartLeft does not push undo/redo stack element', () => {
        function type(viewModel, text) {
            for (let i = 0; i < text.length; i++) {
                viewModel.type(text.charAt(i), 'keyboard');
            }
        }
        withTestCodeEditor('', {}, (editor, viewModel) => {
            type(viewModel, 'foo bar baz');
            assert.strictEqual(editor.getValue(), 'foo bar baz');
            cursorWordStartLeft(editor);
            cursorWordStartLeft(editor);
            type(viewModel, 'q');
            assert.strictEqual(editor.getValue(), 'foo qbar baz');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(editor.getValue(), 'foo bar baz');
        });
    });
    test('cursorWordEndLeft', () => {
        const EXPECTED = ['|   /*| Just| some|   more|   text| a|+=| 3| +|5|-|3| +| 7| */|  '].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordEndLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - simple', () => {
        const EXPECTED = [
            '    \tMy| First| Line|\t |',
            '\tMy| Second| Line|',
            '    Third| Line🐶|',
            '|',
            '1|',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(5, 2)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - selection', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            editor.setPosition(new Position(1, 1));
            cursorWordRight(editor, true);
            assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 1, 8));
        });
    });
    test('cursorWordRight - issue #832', () => {
        const EXPECTED = [
            '   /*| Just| some|   more|   text| a|+=| 3| +5|-3| +| 7| */|  |',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 50)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - issue #41199', () => {
        const EXPECTED = [
            'console|.log|(err|)|',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 17)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - Recognize words', function () {
        if (isFirefox) {
            // https://github.com/microsoft/vscode/issues/219843
            return this.skip();
        }
        const EXPECTED = [
            '/*| これ|は|テスト|です|/*|',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 14)), {
            wordSegmenterLocales: 'ja'
        });
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - Does not recognize words', () => {
        const EXPECTED = [
            '/*| これはテストです|/*|',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 14)), {
            wordSegmenterLocales: ''
        });
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('moveWordEndRight', () => {
        const EXPECTED = [
            '   /*| Just| some|   more|   text| a|+=| 3| +5|-3| +| 7| */|  |',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => moveWordEndRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 50)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('moveWordStartRight', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = [
            '   |/* |Just |some   |more   |text |a|+= |3 |+|5|-|3 |+ |7 |*/  |',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => moveWordStartRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 50)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #51119: cursorWordStartRight regression makes VS compatibility impossible', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = ['this|.|is|.|a|.|test|'].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => moveWordStartRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 15)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #64810: cursorWordStartRight skips first word after newline', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = ['Hello |World|', '|Hei |mailman|'].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => moveWordStartRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(2, 12)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordAccessibilityLeft', () => {
        const EXPECTED = ['|   /* |Just |some   |more   |text |a+= |3 +|5-|3 + |7 */  '].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), ed => cursorWordAccessibilityLeft(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordAccessibilityRight', () => {
        const EXPECTED = ['   /* |Just |some   |more   |text |a+= |3 +|5-|3 + |7 */  |'].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => cursorWordAccessibilityRight(ed), ed => ed.getPosition(), ed => ed.getPosition().equals(new Position(1, 50)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordLeft for non-empty selection', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setSelection(new Selection(3, 7, 3, 9));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(3), '    Thd Line🐶');
            assert.deepStrictEqual(editor.getPosition(), new Position(3, 7));
        });
    });
    test('deleteWordLeft for cursor at beginning of document', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 1));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(1), '    \tMy First Line\t ');
            assert.deepStrictEqual(editor.getPosition(), new Position(1, 1));
        });
    });
    test('deleteWordLeft for cursor at end of whitespace', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(3, 11));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(3), '    Line🐶');
            assert.deepStrictEqual(editor.getPosition(), new Position(3, 5));
        });
    });
    test('deleteWordLeft for cursor just behind a word', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 11));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(2), '\tMy  Line');
            assert.deepStrictEqual(editor.getPosition(), new Position(2, 5));
        });
    });
    test('deleteWordLeft for cursor inside of a word', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 12));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(1), '    \tMy st Line\t ');
            assert.deepStrictEqual(editor.getPosition(), new Position(1, 9));
        });
    });
    test('deleteWordRight for non-empty selection', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setSelection(new Selection(3, 7, 3, 9));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(3), '    Thd Line🐶');
            assert.deepStrictEqual(editor.getPosition(), new Position(3, 7));
        });
    });
    test('deleteWordRight for cursor at end of document', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(5, 3));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(5), '1');
            assert.deepStrictEqual(editor.getPosition(), new Position(5, 2));
        });
    });
    test('deleteWordRight for cursor at beggining of whitespace', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(3, 1));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(3), 'Third Line🐶');
            assert.deepStrictEqual(editor.getPosition(), new Position(3, 1));
        });
    });
    test('deleteWordRight for cursor just before a word', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 5));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(2), '\tMy  Line');
            assert.deepStrictEqual(editor.getPosition(), new Position(2, 5));
        });
    });
    test('deleteWordRight for cursor inside of a word', () => {
        withTestCodeEditor([
            '    \tMy First Line\t ',
            '\tMy Second Line',
            '    Third Line🐶',
            '',
            '1',
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 11));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(1), '    \tMy Fi Line\t ');
            assert.deepStrictEqual(editor.getPosition(), new Position(1, 11));
        });
    });
    test('deleteWordLeft - issue #832', () => {
        const EXPECTED = [
            '|   |/* |Just |some |text |a|+= |3 |+|5 |*/|  ',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 10000), ed => deleteWordLeft(ed), ed => ed.getPosition(), ed => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordStartLeft', () => {
        const EXPECTED = [
            '|   |/* |Just |some |text |a|+= |3 |+|5 |*/  ',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 10000), ed => deleteWordStartLeft(ed), ed => ed.getPosition(), ed => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordEndLeft', () => {
        const EXPECTED = [
            '|   /*| Just| some| text| a|+=| 3| +|5| */|  ',
        ].join('\n');
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 10000), ed => deleteWordEndLeft(ed), ed => ed.getPosition(), ed => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordLeft - issue #24947', () => {
        withTestCodeEditor([
            '{',
            '}'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(1), '{}');
        });
        withTestCodeEditor([
            '{',
            '}'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteWordStartLeft(editor);
            assert.strictEqual(model.getLineContent(1), '{}');
        });
        withTestCodeEditor([
            '{',
            '}'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteWordEndLeft(editor);
            assert.strictEqual(model.getLineContent(1), '{}');
        });
    });
    test('deleteWordRight - issue #832', () => {
        const EXPECTED = '   |/*| Just| some| text| a|+=| 3| +|5|-|3| */|  |';
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => deleteWordRight(ed), ed => new Position(1, text.length - ed.getValue().length + 1), ed => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordRight - issue #3882', () => {
        withTestCodeEditor([
            'public void Add( int x,',
            '                 int y )'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 24));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(1), 'public void Add( int x,int y )', '001');
        });
    });
    test('deleteWordStartRight - issue #3882', () => {
        withTestCodeEditor([
            'public void Add( int x,',
            '                 int y )'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 24));
            deleteWordStartRight(editor);
            assert.strictEqual(model.getLineContent(1), 'public void Add( int x,int y )', '001');
        });
    });
    test('deleteWordEndRight - issue #3882', () => {
        withTestCodeEditor([
            'public void Add( int x,',
            '                 int y )'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 24));
            deleteWordEndRight(editor);
            assert.strictEqual(model.getLineContent(1), 'public void Add( int x,int y )', '001');
        });
    });
    test('deleteWordStartRight', () => {
        const EXPECTED = '   |/* |Just |some |text |a|+= |3 |+|5|-|3 |*/  |';
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => deleteWordStartRight(ed), ed => new Position(1, text.length - ed.getValue().length + 1), ed => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordEndRight', () => {
        const EXPECTED = '   /*| Just| some| text| a|+=| 3| +|5|-|3| */|  |';
        const [text,] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), ed => deleteWordEndRight(ed), ed => new Position(1, text.length - ed.getValue().length + 1), ed => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordRight - issue #3882 (1): Ctrl+Delete removing entire line when used at the end of line', () => {
        withTestCodeEditor([
            'A line with text.',
            '   And another one'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 18));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(1), 'A line with text.And another one', '001');
        });
    });
    test('deleteWordLeft - issue #3882 (2): Ctrl+Delete removing entire line when used at the end of line', () => {
        withTestCodeEditor([
            'A line with text.',
            '   And another one'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(1), 'A line with text.   And another one', '001');
        });
    });
    test('deleteWordLeft - issue #91855: Matching (quote, bracket, paren) doesn\'t get deleted when hitting Ctrl+Backspace', () => {
        const languageId = 'myTestMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            autoClosingPairs: [
                { open: '\"', close: '\"' }
            ]
        }));
        const model = disposables.add(instantiateTextModel(instantiationService, 'a ""', languageId));
        const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model, { autoClosingDelete: 'always' }));
        editor.setPosition(new Position(1, 4));
        deleteWordLeft(editor);
        assert.strictEqual(model.getLineContent(1), 'a ');
    });
    test('deleteInsideWord - empty line', () => {
        withTestCodeEditor([
            'Line1',
            '',
            'Line2'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'Line1\nLine2');
        });
    });
    test('deleteInsideWord - in whitespace 1', () => {
        withTestCodeEditor([
            'Just  some text.'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 6));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'Justsome text.');
        });
    });
    test('deleteInsideWord - in whitespace 2', () => {
        withTestCodeEditor([
            'Just     some text.'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 6));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'Justsome text.');
        });
    });
    test('deleteInsideWord - in whitespace 3', () => {
        withTestCodeEditor([
            'Just     "some text.'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 6));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'Just"some text.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '"some text.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'some text.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'text.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
        });
    });
    test('deleteInsideWord - in non-words', () => {
        withTestCodeEditor([
            'x=3+4+5+6'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 7));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x=3+45+6');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x=3++6');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x=36');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x=');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
        });
    });
    test('deleteInsideWord - in words 1', () => {
        withTestCodeEditor([
            'This is interesting'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 7));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'This interesting');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'This');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
        });
    });
    test('deleteInsideWord - in words 2', () => {
        withTestCodeEditor([
            'This  is  interesting'
        ], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 7));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'This  interesting');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'This');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZE9wZXJhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi93b3JkT3BlcmF0aW9ucy90ZXN0L2Jyb3dzZXIvd29yZE9wZXJhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUcxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxpQ0FBaUMsRUFBRSw0QkFBNEIsRUFBRSxrQ0FBa0MsRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRSx3QkFBd0IsRUFBRSxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLG9CQUFvQixFQUFFLDBCQUEwQixFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsa0IsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHNCQUFzQixFQUFFLHFDQUFxQyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDN0gsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHaEYsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUU1QixNQUFNLG9CQUFvQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztJQUN2RCxNQUFNLGtCQUFrQixHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztJQUNuRCxNQUFNLGVBQWUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO0lBQzdDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSx5QkFBeUIsRUFBRSxDQUFDO0lBQ25FLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO0lBQy9ELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO0lBQ3pELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO0lBQ3pELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO0lBQ3JELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMvQyxNQUFNLDJCQUEyQixHQUFHLElBQUksMEJBQTBCLEVBQUUsQ0FBQztJQUNyRSxNQUFNLHlCQUF5QixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztJQUNqRSxNQUFNLHNCQUFzQixHQUFHLElBQUkscUJBQXFCLEVBQUUsQ0FBQztJQUMzRCxNQUFNLDRCQUE0QixHQUFHLElBQUksMkJBQTJCLEVBQUUsQ0FBQztJQUN2RSxNQUFNLGtDQUFrQyxHQUFHLElBQUksaUNBQWlDLEVBQUUsQ0FBQztJQUNuRixNQUFNLDZCQUE2QixHQUFHLElBQUksNEJBQTRCLEVBQUUsQ0FBQztJQUN6RSxNQUFNLG1DQUFtQyxHQUFHLElBQUksa0NBQWtDLEVBQUUsQ0FBQztJQUNyRixNQUFNLGVBQWUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO0lBQzdDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0lBQ3ZELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO0lBQ25ELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMvQyxNQUFNLHFCQUFxQixHQUFHLElBQUksb0JBQW9CLEVBQUUsQ0FBQztJQUN6RCxNQUFNLG1CQUFtQixHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztJQUNyRCxNQUFNLGlCQUFpQixHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztJQUVqRCxJQUFJLFdBQTRCLENBQUM7SUFDakMsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLDRCQUEyRCxDQUFDO0lBQ2hFLElBQUksZUFBaUMsQ0FBQztJQUV0QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsb0JBQW9CLEdBQUcsd0JBQXdCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDN0QsNEJBQTRCLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDdkYsZUFBZSxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzlELENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFtQixFQUFFLE9BQXNCO1FBQ3BFLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ2hELE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELFNBQVMsY0FBYyxDQUFDLE1BQW1CLEVBQUUsa0JBQTJCLEtBQUs7UUFDNUUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFDRCxTQUFTLDJCQUEyQixDQUFDLE1BQW1CLEVBQUUsa0JBQTJCLEtBQUs7UUFDekYsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7SUFDL0csQ0FBQztJQUNELFNBQVMsNEJBQTRCLENBQUMsTUFBbUIsRUFBRSxrQkFBMkIsS0FBSztRQUMxRixnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUNqSCxDQUFDO0lBQ0QsU0FBUyxtQkFBbUIsQ0FBQyxNQUFtQixFQUFFLGtCQUEyQixLQUFLO1FBQ2pGLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQy9GLENBQUM7SUFDRCxTQUFTLGlCQUFpQixDQUFDLE1BQW1CLEVBQUUsa0JBQTJCLEtBQUs7UUFDL0UsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDM0YsQ0FBQztJQUNELFNBQVMsZUFBZSxDQUFDLE1BQW1CLEVBQUUsa0JBQTJCLEtBQUs7UUFDN0UsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUNELFNBQVMsZ0JBQWdCLENBQUMsTUFBbUIsRUFBRSxrQkFBMkIsS0FBSztRQUM5RSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUM3RixDQUFDO0lBQ0QsU0FBUyxrQkFBa0IsQ0FBQyxNQUFtQixFQUFFLGtCQUEyQixLQUFLO1FBQ2hGLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFDRCxTQUFTLGNBQWMsQ0FBQyxNQUFtQjtRQUMxQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUNELFNBQVMsbUJBQW1CLENBQUMsTUFBbUI7UUFDL0MsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUNELFNBQVMsaUJBQWlCLENBQUMsTUFBbUI7UUFDN0MsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUNELFNBQVMsZUFBZSxDQUFDLE1BQW1CO1FBQzNDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxTQUFTLG9CQUFvQixDQUFDLE1BQW1CO1FBQ2hELGdCQUFnQixDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFDRCxTQUFTLGtCQUFrQixDQUFDLE1BQW1CO1FBQzlDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFDRCxTQUFTLGdCQUFnQixDQUFDLE1BQW1CO1FBQzVDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLDRCQUE0QjtZQUM1QixzQkFBc0I7WUFDdEIscUJBQXFCO1lBQ3JCLEdBQUc7WUFDSCxJQUFJO1NBQ0osQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3hCLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxFQUN4QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNsRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxrQkFBa0IsQ0FBQztZQUNsQix3QkFBd0I7WUFDeEIsa0JBQWtCO1lBQ2xCLGtCQUFrQjtZQUNsQixFQUFFO1lBQ0YsR0FBRztTQUNILEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QyxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3hCLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxFQUN4QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNsRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNFQUFzRSxFQUFFLEdBQUcsRUFBRTtRQUNqRixNQUFNLFFBQVEsR0FBRztZQUNoQix5QkFBeUI7U0FDekIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ25CLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxFQUN4QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNsRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFO1FBQ3hDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixvREFBb0Q7WUFDcEQsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHO1lBQ2hCLHNCQUFzQjtTQUN0QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDeEIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUM5QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUNsRDtZQUNDLG9CQUFvQixFQUFFLElBQUk7U0FDMUIsQ0FDRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtRQUN0RCxNQUFNLFFBQVEsR0FBRztZQUNoQixtQkFBbUI7U0FDbkIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3hCLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFDOUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3ZCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDbEQ7WUFDQyxvQkFBb0IsRUFBRSxFQUFFO1NBQ3hCLENBQ0QsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDaEUsTUFBTSxJQUFJLEdBQUc7WUFDWixVQUFVO1lBQ1Ysa0JBQWtCO1lBQ2xCLDBCQUEwQjtZQUMxQixtQ0FBbUM7WUFDbkMsNkNBQTZDO1lBQzdDLGtDQUFrQztZQUNsQyxHQUFHO1lBQ0gsVUFBVTtZQUNWLGtCQUFrQjtZQUNsQiwwQkFBMEI7WUFDMUIsbUNBQW1DO1lBQ25DLDBFQUEwRTtZQUMxRSxHQUFHO1NBQ0gsQ0FBQztRQUNGLGtCQUFrQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUN2QyxNQUFNLENBQUMsYUFBYSxDQUFDO2dCQUNwQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUM3QixJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7YUFDN0IsQ0FBQyxDQUFDO1lBQ0gsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM5QixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsRUFBRTtnQkFDOUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO2FBQzdCLENBQUMsQ0FBQztRQUVKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUdBQXlHLEVBQUUsR0FBRyxFQUFFO1FBQ3BILE1BQU0sUUFBUSxHQUFHO1lBQ2hCLG9CQUFvQjtTQUNwQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDbkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUM5QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNsRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNoQyw0RUFBNEU7UUFDNUUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxtRUFBbUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3hCLEVBQUUsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLEVBQzdCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN2QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ2xELENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0ZBQWtGLEVBQUUsR0FBRyxFQUFFO1FBQzdGLDRFQUE0RTtRQUM1RSxNQUFNLFFBQVEsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDeEIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsRUFDN0IsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3ZCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDbEQsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwRUFBMEUsRUFBRSxHQUFHLEVBQUU7UUFDckYsU0FBUyxJQUFJLENBQUMsU0FBb0IsRUFBRSxJQUFZO1lBQy9DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM1QyxDQUFDO1FBQ0YsQ0FBQztRQUVELGtCQUFrQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUVyRCxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QixJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBRXRELG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sUUFBUSxHQUFHLENBQUMsbUVBQW1FLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEcsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUN4QixFQUFFLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxFQUMzQixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNsRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLFFBQVEsR0FBRztZQUNoQiw0QkFBNEI7WUFDNUIscUJBQXFCO1lBQ3JCLG9CQUFvQjtZQUNwQixHQUFHO1lBQ0gsSUFBSTtTQUNKLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2IsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQixFQUFFLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsRUFDekIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3ZCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDbEQsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsa0JBQWtCLENBQUM7WUFDbEIsd0JBQXdCO1lBQ3hCLGtCQUFrQjtZQUNsQixrQkFBa0I7WUFDbEIsRUFBRTtZQUNGLEdBQUc7U0FDSCxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxNQUFNLFFBQVEsR0FBRztZQUNoQixpRUFBaUU7U0FDakUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLEVBQUUsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUN6QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNuRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxNQUFNLFFBQVEsR0FBRztZQUNoQixzQkFBc0I7U0FDdEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLEVBQUUsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUN6QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNuRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1DQUFtQyxFQUFFO1FBQ3pDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixvREFBb0Q7WUFDcEQsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHO1lBQ2hCLHFCQUFxQjtTQUNyQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQ3pCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN2QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ25EO1lBQ0Msb0JBQW9CLEVBQUUsSUFBSTtTQUMxQixDQUNELENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELE1BQU0sUUFBUSxHQUFHO1lBQ2hCLGtCQUFrQjtTQUNsQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQ3pCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN2QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ25EO1lBQ0Msb0JBQW9CLEVBQUUsRUFBRTtTQUN4QixDQUNELENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLGlFQUFpRTtTQUNqRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsRUFDMUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3ZCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FDbkQsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsNEVBQTRFO1FBQzVFLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLG1FQUFtRTtTQUNuRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsRUFDNUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3ZCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FDbkQsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpRkFBaUYsRUFBRSxHQUFHLEVBQUU7UUFDNUYsNEVBQTRFO1FBQzVFLE1BQU0sUUFBUSxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQixFQUFFLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxFQUM1QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNuRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1FQUFtRSxFQUFFLEdBQUcsRUFBRTtRQUM5RSw0RUFBNEU7UUFDNUUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQixFQUFFLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxFQUM1QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNuRCxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxNQUFNLFFBQVEsR0FBRyxDQUFDLDZEQUE2RCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVGLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDeEIsRUFBRSxDQUFDLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUMsRUFDckMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3ZCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDbEQsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxRQUFRLEdBQUcsQ0FBQyw2REFBNkQsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1RixNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLEVBQUUsQ0FBQyxFQUFFLENBQUMsNEJBQTRCLENBQUMsRUFBRSxDQUFDLEVBQ3RDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN2QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQ25ELENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1FBQ25ELGtCQUFrQixDQUFDO1lBQ2xCLHdCQUF3QjtZQUN4QixrQkFBa0I7WUFDbEIsa0JBQWtCO1lBQ2xCLEVBQUU7WUFDRixHQUFHO1NBQ0gsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7UUFDL0Qsa0JBQWtCLENBQUM7WUFDbEIsd0JBQXdCO1lBQ3hCLGtCQUFrQjtZQUNsQixrQkFBa0I7WUFDbEIsRUFBRTtZQUNGLEdBQUc7U0FDSCxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLHdCQUF3QixDQUFDLENBQUM7WUFDdEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUU7UUFDM0Qsa0JBQWtCLENBQUM7WUFDbEIsd0JBQXdCO1lBQ3hCLGtCQUFrQjtZQUNsQixrQkFBa0I7WUFDbEIsRUFBRTtZQUNGLEdBQUc7U0FDSCxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzFELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFO1FBQ3pELGtCQUFrQixDQUFDO1lBQ2xCLHdCQUF3QjtZQUN4QixrQkFBa0I7WUFDbEIsa0JBQWtCO1lBQ2xCLEVBQUU7WUFDRixHQUFHO1NBQ0gsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDeEMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUMxRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtRQUN2RCxrQkFBa0IsQ0FBQztZQUNsQix3QkFBd0I7WUFDeEIsa0JBQWtCO1lBQ2xCLGtCQUFrQjtZQUNsQixFQUFFO1lBQ0YsR0FBRztTQUNILEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUscUJBQXFCLENBQUMsQ0FBQztZQUNuRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtRQUNwRCxrQkFBa0IsQ0FBQztZQUNsQix3QkFBd0I7WUFDeEIsa0JBQWtCO1lBQ2xCLGtCQUFrQjtZQUNsQixFQUFFO1lBQ0YsR0FBRztTQUNILEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1FBQzFELGtCQUFrQixDQUFDO1lBQ2xCLHdCQUF3QjtZQUN4QixrQkFBa0I7WUFDbEIsa0JBQWtCO1lBQ2xCLEVBQUU7WUFDRixHQUFHO1NBQ0gsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEdBQUcsRUFBRTtRQUNsRSxrQkFBa0IsQ0FBQztZQUNsQix3QkFBd0I7WUFDeEIsa0JBQWtCO1lBQ2xCLGtCQUFrQjtZQUNsQixFQUFFO1lBQ0YsR0FBRztTQUNILEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7UUFDMUQsa0JBQWtCLENBQUM7WUFDbEIsd0JBQXdCO1lBQ3hCLGtCQUFrQjtZQUNsQixrQkFBa0I7WUFDbEIsRUFBRTtZQUNGLEdBQUc7U0FDSCxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzFELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1FBQ3hELGtCQUFrQixDQUFDO1lBQ2xCLHdCQUF3QjtZQUN4QixrQkFBa0I7WUFDbEIsa0JBQWtCO1lBQ2xCLEVBQUU7WUFDRixHQUFHO1NBQ0gsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDeEMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLGdEQUFnRDtTQUNoRCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFDekIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQ3hCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN2QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNoQyxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxNQUFNLFFBQVEsR0FBRztZQUNoQiwrQ0FBK0M7U0FDL0MsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQ3pCLEVBQUUsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLEVBQzdCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN2QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNoQyxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLFFBQVEsR0FBRztZQUNoQiwrQ0FBK0M7U0FDL0MsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQ3pCLEVBQUUsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLEVBQzNCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN2QixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNoQyxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUMxQyxrQkFBa0IsQ0FBQztZQUNsQixHQUFHO1lBQ0gsR0FBRztTQUNILEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRSxDQUFDLENBQUMsQ0FBQztRQUVILGtCQUFrQixDQUFDO1lBQ2xCLEdBQUc7WUFDSCxHQUFHO1NBQ0gsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEYsQ0FBQyxDQUFDLENBQUM7UUFFSCxrQkFBa0IsQ0FBQztZQUNsQixHQUFHO1lBQ0gsR0FBRztTQUNILEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLG9EQUFvRCxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQ3pCLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFDN0QsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FDaEMsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsa0JBQWtCLENBQUM7WUFDbEIseUJBQXlCO1lBQ3pCLDBCQUEwQjtTQUMxQixFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0csQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0Msa0JBQWtCLENBQUM7WUFDbEIseUJBQXlCO1lBQ3pCLDBCQUEwQjtTQUMxQixFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQ0FBZ0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUM3QyxrQkFBa0IsQ0FBQztZQUNsQix5QkFBeUI7WUFDekIsMEJBQTBCO1NBQzFCLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGdDQUFnQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLG1EQUFtRCxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsRUFDOUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUM3RCxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNoQyxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLFFBQVEsR0FBRyxtREFBbUQsQ0FBQztRQUNyRSxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLEVBQUUsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLEVBQzVCLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFDN0QsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FDaEMsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrR0FBa0csRUFBRSxHQUFHLEVBQUU7UUFDN0csa0JBQWtCLENBQUM7WUFDbEIsbUJBQW1CO1lBQ25CLG9CQUFvQjtTQUNwQixFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsa0NBQWtDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakgsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpR0FBaUcsRUFBRSxHQUFHLEVBQUU7UUFDNUcsa0JBQWtCLENBQUM7WUFDbEIsbUJBQW1CO1lBQ25CLG9CQUFvQjtTQUNwQixFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUscUNBQXFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkgsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrSEFBa0gsRUFBRSxHQUFHLEVBQUU7UUFDN0gsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDO1FBRWhDLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RSxXQUFXLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUU7WUFDakUsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO2FBQzNCO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXhILE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsa0JBQWtCLENBQUM7WUFDbEIsT0FBTztZQUNQLEVBQUU7WUFDRixPQUFPO1NBQ1AsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0Msa0JBQWtCLENBQUM7WUFDbEIsa0JBQWtCO1NBQ2xCLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0Msa0JBQWtCLENBQUM7WUFDbEIscUJBQXFCO1NBQ3JCLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0Msa0JBQWtCLENBQUM7WUFDbEIsc0JBQXNCO1NBQ3RCLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDeEQsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDcEQsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDbkQsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDOUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDMUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDekMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsa0JBQWtCLENBQUM7WUFDbEIsV0FBVztTQUNYLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2pELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQy9DLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzdDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQzFDLGtCQUFrQixDQUFDO1lBQ2xCLHFCQUFxQjtTQUNyQixFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQ3pELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzdDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQzFDLGtCQUFrQixDQUFDO1lBQ2xCLHVCQUF1QjtTQUN2QixFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBQzFELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzdDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9