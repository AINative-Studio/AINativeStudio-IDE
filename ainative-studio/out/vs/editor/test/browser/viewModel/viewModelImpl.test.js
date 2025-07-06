/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { ViewEventHandler } from '../../../common/viewEventHandler.js';
import { testViewModel } from './testViewModel.js';
suite('ViewModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #21073: SplitLinesCollection: attempt to access a \'newer\' model', () => {
        const text = [''];
        const opts = {
            lineNumbersMinChars: 1
        };
        testViewModel(text, opts, (viewModel, model) => {
            assert.strictEqual(viewModel.getLineCount(), 1);
            viewModel.setViewport(1, 1, 1);
            model.applyEdits([{
                    range: new Range(1, 1, 1, 1),
                    text: [
                        'line01',
                        'line02',
                        'line03',
                        'line04',
                        'line05',
                        'line06',
                        'line07',
                        'line08',
                        'line09',
                        'line10',
                    ].join('\n')
                }]);
            assert.strictEqual(viewModel.getLineCount(), 10);
        });
    });
    test('issue #44805: SplitLinesCollection: attempt to access a \'newer\' model', () => {
        const text = [''];
        testViewModel(text, {}, (viewModel, model) => {
            assert.strictEqual(viewModel.getLineCount(), 1);
            model.pushEditOperations([], [{
                    range: new Range(1, 1, 1, 1),
                    text: '\ninsert1'
                }], () => ([]));
            model.pushEditOperations([], [{
                    range: new Range(1, 1, 1, 1),
                    text: '\ninsert2'
                }], () => ([]));
            model.pushEditOperations([], [{
                    range: new Range(1, 1, 1, 1),
                    text: '\ninsert3'
                }], () => ([]));
            const viewLineCount = [];
            viewLineCount.push(viewModel.getLineCount());
            const eventHandler = new class extends ViewEventHandler {
                handleEvents(events) {
                    // Access the view model
                    viewLineCount.push(viewModel.getLineCount());
                }
            };
            viewModel.addViewEventHandler(eventHandler);
            model.undo();
            viewLineCount.push(viewModel.getLineCount());
            assert.deepStrictEqual(viewLineCount, [4, 1, 1, 1, 1]);
            viewModel.removeViewEventHandler(eventHandler);
            eventHandler.dispose();
        });
    });
    test('issue #44805: No visible lines via API call', () => {
        const text = [
            'line1',
            'line2',
            'line3'
        ];
        testViewModel(text, {}, (viewModel, model) => {
            assert.strictEqual(viewModel.getLineCount(), 3);
            viewModel.setHiddenAreas([new Range(1, 1, 3, 1)]);
            assert.ok(viewModel.getVisibleRanges() !== null);
        });
    });
    test('issue #44805: No visible lines via undoing', () => {
        const text = [
            ''
        ];
        testViewModel(text, {}, (viewModel, model) => {
            assert.strictEqual(viewModel.getLineCount(), 1);
            model.pushEditOperations([], [{
                    range: new Range(1, 1, 1, 1),
                    text: 'line1\nline2\nline3'
                }], () => ([]));
            viewModel.setHiddenAreas([new Range(1, 1, 1, 1)]);
            assert.strictEqual(viewModel.getLineCount(), 2);
            model.undo();
            assert.ok(viewModel.getVisibleRanges() !== null);
        });
    });
    function assertGetPlainTextToCopy(text, ranges, emptySelectionClipboard, expected) {
        testViewModel(text, {}, (viewModel, model) => {
            const actual = viewModel.getPlainTextToCopy(ranges, emptySelectionClipboard, false);
            assert.deepStrictEqual(actual, expected);
        });
    }
    const USUAL_TEXT = [
        '',
        'line2',
        'line3',
        'line4',
        ''
    ];
    test('getPlainTextToCopy 0/1', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 2)
        ], false, '');
    });
    test('getPlainTextToCopy 0/1 - emptySelectionClipboard', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 2)
        ], true, 'line2\n');
    });
    test('getPlainTextToCopy 1/1', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 6)
        ], false, 'ine2');
    });
    test('getPlainTextToCopy 1/1 - emptySelectionClipboard', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 6)
        ], true, 'ine2');
    });
    test('getPlainTextToCopy 0/2', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 2),
            new Range(3, 2, 3, 2),
        ], false, '');
    });
    test('getPlainTextToCopy 0/2 - emptySelectionClipboard', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 2),
            new Range(3, 2, 3, 2),
        ], true, 'line2\nline3\n');
    });
    test('getPlainTextToCopy 1/2', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 6),
            new Range(3, 2, 3, 2),
        ], false, 'ine2');
    });
    test('getPlainTextToCopy 1/2 - emptySelectionClipboard', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 6),
            new Range(3, 2, 3, 2),
        ], true, ['ine2', 'line3']);
    });
    test('getPlainTextToCopy 2/2', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 6),
            new Range(3, 2, 3, 6),
        ], false, ['ine2', 'ine3']);
    });
    test('getPlainTextToCopy 2/2 reversed', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(3, 2, 3, 6),
            new Range(2, 2, 2, 6),
        ], false, ['ine2', 'ine3']);
    });
    test('getPlainTextToCopy 0/3 - emptySelectionClipboard', () => {
        assertGetPlainTextToCopy(USUAL_TEXT, [
            new Range(2, 2, 2, 2),
            new Range(2, 3, 2, 3),
            new Range(3, 2, 3, 2),
        ], true, 'line2\nline3\n');
    });
    test('issue #22688 - always use CRLF for clipboard on Windows', () => {
        testViewModel(USUAL_TEXT, {}, (viewModel, model) => {
            model.setEOL(0 /* EndOfLineSequence.LF */);
            const actual = viewModel.getPlainTextToCopy([new Range(2, 1, 5, 1)], true, true);
            assert.deepStrictEqual(actual, 'line2\r\nline3\r\nline4\r\n');
        });
    });
    test('issue #40926: Incorrect spacing when inserting new line after multiple folded blocks of code', () => {
        testViewModel([
            'foo = {',
            '    foobar: function() {',
            '        this.foobar();',
            '    },',
            '    foobar: function() {',
            '        this.foobar();',
            '    },',
            '    foobar: function() {',
            '        this.foobar();',
            '    },',
            '}',
        ], {}, (viewModel, model) => {
            viewModel.setHiddenAreas([
                new Range(3, 1, 3, 1),
                new Range(6, 1, 6, 1),
                new Range(9, 1, 9, 1),
            ]);
            model.applyEdits([
                { range: new Range(4, 7, 4, 7), text: '\n    ' },
                { range: new Range(7, 7, 7, 7), text: '\n    ' },
                { range: new Range(10, 7, 10, 7), text: '\n    ' }
            ]);
            assert.strictEqual(viewModel.getLineCount(), 11);
        });
    });
    test('normalizePosition with multiple touching injected text', () => {
        testViewModel([
            'just some text'
        ], {}, (viewModel, model) => {
            model.deltaDecorations([], [
                {
                    range: new Range(1, 8, 1, 8),
                    options: {
                        description: 'test',
                        before: {
                            content: 'bar'
                        },
                        showIfCollapsed: true
                    }
                },
                {
                    range: new Range(1, 8, 1, 8),
                    options: {
                        description: 'test',
                        before: {
                            content: 'bz'
                        },
                        showIfCollapsed: true
                    }
                },
            ]);
            // just sobarbzme text
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 8), 2 /* PositionAffinity.None */), new Position(1, 8));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 9), 2 /* PositionAffinity.None */), new Position(1, 8));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 11), 2 /* PositionAffinity.None */), new Position(1, 11));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 12), 2 /* PositionAffinity.None */), new Position(1, 11));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 13), 2 /* PositionAffinity.None */), new Position(1, 13));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 8), 0 /* PositionAffinity.Left */), new Position(1, 8));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 9), 0 /* PositionAffinity.Left */), new Position(1, 8));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 11), 0 /* PositionAffinity.Left */), new Position(1, 8));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 12), 0 /* PositionAffinity.Left */), new Position(1, 8));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 13), 0 /* PositionAffinity.Left */), new Position(1, 8));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 8), 1 /* PositionAffinity.Right */), new Position(1, 13));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 9), 1 /* PositionAffinity.Right */), new Position(1, 13));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 11), 1 /* PositionAffinity.Right */), new Position(1, 13));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 12), 1 /* PositionAffinity.Right */), new Position(1, 13));
            assert.deepStrictEqual(viewModel.normalizePosition(new Position(1, 13), 1 /* PositionAffinity.Right */), new Position(1, 13));
        });
    });
    test('issue #193262: Incorrect implementation of modifyPosition', () => {
        testViewModel([
            'just some text'
        ], {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 5
        }, (viewModel, model) => {
            assert.deepStrictEqual(new Position(3, 1), viewModel.modifyPosition(new Position(3, 2), -1));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsSW1wbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3ZpZXdNb2RlbC92aWV3TW9kZWxJbXBsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRW5ELEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBRXZCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHlFQUF5RSxFQUFFLEdBQUcsRUFBRTtRQUNwRixNQUFNLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sSUFBSSxHQUFHO1lBQ1osbUJBQW1CLEVBQUUsQ0FBQztTQUN0QixDQUFDO1FBQ0YsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFaEQsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRS9CLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztv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