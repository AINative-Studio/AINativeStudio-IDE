/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { CommonFindController } from '../../../find/browser/findController.js';
import { AddSelectionToNextFindMatchAction, InsertCursorAbove, InsertCursorBelow, MultiCursorSelectionController, SelectHighlightsAction } from '../../browser/multicursor.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IStorageService, InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
suite('Multicursor', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #26393: Multiple cursors + Word wrap', () => {
        withTestCodeEditor([
            'a'.repeat(20),
            'a'.repeat(20),
        ], { wordWrap: 'wordWrapColumn', wordWrapColumn: 10 }, (editor, viewModel) => {
            const addCursorDownAction = new InsertCursorBelow();
            addCursorDownAction.run(null, editor, {});
            assert.strictEqual(viewModel.getCursorStates().length, 2);
            assert.strictEqual(viewModel.getCursorStates()[0].viewState.position.lineNumber, 1);
            assert.strictEqual(viewModel.getCursorStates()[1].viewState.position.lineNumber, 3);
            editor.setPosition({ lineNumber: 4, column: 1 });
            const addCursorUpAction = new InsertCursorAbove();
            addCursorUpAction.run(null, editor, {});
            assert.strictEqual(viewModel.getCursorStates().length, 2);
            assert.strictEqual(viewModel.getCursorStates()[0].viewState.position.lineNumber, 4);
            assert.strictEqual(viewModel.getCursorStates()[1].viewState.position.lineNumber, 2);
        });
    });
    test('issue #2205: Multi-cursor pastes in reverse order', () => {
        withTestCodeEditor([
            'abc',
            'def'
        ], {}, (editor, viewModel) => {
            const addCursorUpAction = new InsertCursorAbove();
            editor.setSelection(new Selection(2, 1, 2, 1));
            addCursorUpAction.run(null, editor, {});
            assert.strictEqual(viewModel.getSelections().length, 2);
            editor.trigger('test', "paste" /* Handler.Paste */, {
                text: '1\n2',
                multicursorText: [
                    '1',
                    '2'
                ]
            });
            assert.strictEqual(editor.getModel().getLineContent(1), '1abc');
            assert.strictEqual(editor.getModel().getLineContent(2), '2def');
        });
    });
    test('issue #1336: Insert cursor below on last line adds a cursor to the end of the current line', () => {
        withTestCodeEditor([
            'abc'
        ], {}, (editor, viewModel) => {
            const addCursorDownAction = new InsertCursorBelow();
            addCursorDownAction.run(null, editor, {});
            assert.strictEqual(viewModel.getSelections().length, 1);
        });
    });
});
function fromRange(rng) {
    return [rng.startLineNumber, rng.startColumn, rng.endLineNumber, rng.endColumn];
}
suite('Multicursor selection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const serviceCollection = new ServiceCollection();
    serviceCollection.set(IStorageService, new InMemoryStorageService());
    test('issue #8817: Cursor position changes when you cancel multicursor', () => {
        withTestCodeEditor([
            'var x = (3 * 5)',
            'var y = (3 * 5)',
            'var z = (3 * 5)',
        ], { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const selectHighlightsAction = new SelectHighlightsAction();
            editor.setSelection(new Selection(2, 9, 2, 16));
            selectHighlightsAction.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [2, 9, 2, 16],
                [1, 9, 1, 16],
                [3, 9, 3, 16],
            ]);
            editor.trigger('test', 'removeSecondaryCursors', null);
            assert.deepStrictEqual(fromRange(editor.getSelection()), [2, 9, 2, 16]);
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    test('issue #5400: "Select All Occurrences of Find Match" does not select all if find uses regex', () => {
        withTestCodeEditor([
            'something',
            'someething',
            'someeething',
            'nothing'
        ], { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const selectHighlightsAction = new SelectHighlightsAction();
            editor.setSelection(new Selection(1, 1, 1, 1));
            findController.getState().change({ searchString: 'some+thing', isRegex: true, isRevealed: true }, false);
            selectHighlightsAction.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [1, 1, 1, 10],
                [2, 1, 2, 11],
                [3, 1, 3, 12],
            ]);
            assert.strictEqual(findController.getState().searchString, 'some+thing');
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    test('AddSelectionToNextFindMatchAction can work with multiline', () => {
        withTestCodeEditor([
            '',
            'qwe',
            'rty',
            '',
            'qwe',
            '',
            'rty',
            'qwe',
            'rty'
        ], { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const addSelectionToNextFindMatch = new AddSelectionToNextFindMatchAction();
            editor.setSelection(new Selection(2, 1, 3, 4));
            addSelectionToNextFindMatch.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [2, 1, 3, 4],
                [8, 1, 9, 4]
            ]);
            editor.trigger('test', 'removeSecondaryCursors', null);
            assert.deepStrictEqual(fromRange(editor.getSelection()), [2, 1, 3, 4]);
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    test('issue #6661: AddSelectionToNextFindMatchAction can work with touching ranges', () => {
        withTestCodeEditor([
            'abcabc',
            'abc',
            'abcabc',
        ], { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const addSelectionToNextFindMatch = new AddSelectionToNextFindMatchAction();
            editor.setSelection(new Selection(1, 1, 1, 4));
            addSelectionToNextFindMatch.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [1, 1, 1, 4],
                [1, 4, 1, 7]
            ]);
            addSelectionToNextFindMatch.run(null, editor);
            addSelectionToNextFindMatch.run(null, editor);
            addSelectionToNextFindMatch.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [1, 1, 1, 4],
                [1, 4, 1, 7],
                [2, 1, 2, 4],
                [3, 1, 3, 4],
                [3, 4, 3, 7]
            ]);
            editor.trigger('test', "type" /* Handler.Type */, { text: 'z' });
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [1, 2, 1, 2],
                [1, 3, 1, 3],
                [2, 2, 2, 2],
                [3, 2, 3, 2],
                [3, 3, 3, 3]
            ]);
            assert.strictEqual(editor.getValue(), [
                'zz',
                'z',
                'zz',
            ].join('\n'));
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    test('issue #23541: Multiline Ctrl+D does not work in CRLF files', () => {
        withTestCodeEditor([
            '',
            'qwe',
            'rty',
            '',
            'qwe',
            '',
            'rty',
            'qwe',
            'rty'
        ], { serviceCollection: serviceCollection }, (editor) => {
            editor.getModel().setEOL(1 /* EndOfLineSequence.CRLF */);
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const addSelectionToNextFindMatch = new AddSelectionToNextFindMatchAction();
            editor.setSelection(new Selection(2, 1, 3, 4));
            addSelectionToNextFindMatch.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [2, 1, 3, 4],
                [8, 1, 9, 4]
            ]);
            editor.trigger('test', 'removeSecondaryCursors', null);
            assert.deepStrictEqual(fromRange(editor.getSelection()), [2, 1, 3, 4]);
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    function testMulticursor(text, callback) {
        withTestCodeEditor(text, { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            callback(editor, findController);
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    }
    function testAddSelectionToNextFindMatchAction(text, callback) {
        testMulticursor(text, (editor, findController) => {
            const action = new AddSelectionToNextFindMatchAction();
            callback(editor, action, findController);
        });
    }
    test('AddSelectionToNextFindMatchAction starting with single collapsed selection', () => {
        const text = [
            'abc pizza',
            'abc house',
            'abc bar'
        ];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([
                new Selection(1, 2, 1, 2),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
        });
    });
    test('AddSelectionToNextFindMatchAction starting with two selections, one being collapsed 1)', () => {
        const text = [
            'abc pizza',
            'abc house',
            'abc bar'
        ];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([
                new Selection(1, 1, 1, 4),
                new Selection(2, 2, 2, 2),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
        });
    });
    test('AddSelectionToNextFindMatchAction starting with two selections, one being collapsed 2)', () => {
        const text = [
            'abc pizza',
            'abc house',
            'abc bar'
        ];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([
                new Selection(1, 2, 1, 2),
                new Selection(2, 1, 2, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
        });
    });
    test('AddSelectionToNextFindMatchAction starting with all collapsed selections', () => {
        const text = [
            'abc pizza',
            'abc house',
            'abc bar'
        ];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([
                new Selection(1, 2, 1, 2),
                new Selection(2, 2, 2, 2),
                new Selection(3, 1, 3, 1),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
        });
    });
    test('AddSelectionToNextFindMatchAction starting with all collapsed selections on different words', () => {
        const text = [
            'abc pizza',
            'abc house',
            'abc bar'
        ];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([
                new Selection(1, 6, 1, 6),
                new Selection(2, 6, 2, 6),
                new Selection(3, 6, 3, 6),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 5, 1, 10),
                new Selection(2, 5, 2, 10),
                new Selection(3, 5, 3, 8),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 5, 1, 10),
                new Selection(2, 5, 2, 10),
                new Selection(3, 5, 3, 8),
            ]);
        });
    });
    test('issue #20651: AddSelectionToNextFindMatchAction case insensitive', () => {
        const text = [
            'test',
            'testte',
            'Test',
            'testte',
            'test'
        ];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([
                new Selection(1, 1, 1, 5),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
                new Selection(5, 1, 5, 5),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
                new Selection(5, 1, 5, 5),
            ]);
        });
    });
    suite('Find state disassociation', () => {
        const text = [
            'app',
            'apples',
            'whatsapp',
            'app',
            'App',
            ' app'
        ];
        test('enters mode', () => {
            testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
                editor.setSelections([
                    new Selection(1, 2, 1, 2),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                    new Selection(6, 2, 6, 5),
                ]);
            });
        });
        test('leaves mode when selection changes', () => {
            testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
                editor.setSelections([
                    new Selection(1, 2, 1, 2),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                ]);
                // change selection
                editor.setSelections([
                    new Selection(1, 1, 1, 4),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(2, 1, 2, 4),
                ]);
            });
        });
        test('Select Highlights respects mode ', () => {
            testMulticursor(text, (editor, findController) => {
                const action = new SelectHighlightsAction();
                editor.setSelections([
                    new Selection(1, 2, 1, 2),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                    new Selection(6, 2, 6, 5),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                    new Selection(6, 2, 6, 5),
                ]);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGljdXJzb3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9tdWx0aWN1cnNvci90ZXN0L2Jyb3dzZXIvbXVsdGljdXJzb3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSw4QkFBOEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9LLE9BQU8sRUFBbUIsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFNUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFFekIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELGtCQUFrQixDQUFDO1lBQ2xCLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2QsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7U0FDZCxFQUFFLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFB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