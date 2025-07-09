/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { CompletionOptions, provideSuggestionItems } from '../../browser/suggest.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Suggest', function () {
    let model;
    let registration;
    let registry;
    setup(function () {
        registry = new LanguageFeatureRegistry();
        model = createTextModel('FOO\nbar\BAR\nfoo', undefined, undefined, URI.parse('foo:bar/path'));
        registration = registry.register({ pattern: 'bar/path', scheme: 'foo' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(_doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [{
                            label: 'aaa',
                            kind: 27 /* CompletionItemKind.Snippet */,
                            insertText: 'aaa',
                            range: Range.fromPositions(pos)
                        }, {
                            label: 'zzz',
                            kind: 27 /* CompletionItemKind.Snippet */,
                            insertText: 'zzz',
                            range: Range.fromPositions(pos)
                        }, {
                            label: 'fff',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'fff',
                            range: Range.fromPositions(pos)
                        }]
                };
            }
        });
    });
    teardown(() => {
        registration.dispose();
        model.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('sort - snippet inline', async function () {
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(1 /* SnippetSortOrder.Inline */));
        assert.strictEqual(items.length, 3);
        assert.strictEqual(items[0].completion.label, 'aaa');
        assert.strictEqual(items[1].completion.label, 'fff');
        assert.strictEqual(items[2].completion.label, 'zzz');
        disposable.dispose();
    });
    test('sort - snippet top', async function () {
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(0 /* SnippetSortOrder.Top */));
        assert.strictEqual(items.length, 3);
        assert.strictEqual(items[0].completion.label, 'aaa');
        assert.strictEqual(items[1].completion.label, 'zzz');
        assert.strictEqual(items[2].completion.label, 'fff');
        disposable.dispose();
    });
    test('sort - snippet bottom', async function () {
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(2 /* SnippetSortOrder.Bottom */));
        assert.strictEqual(items.length, 3);
        assert.strictEqual(items[0].completion.label, 'fff');
        assert.strictEqual(items[1].completion.label, 'aaa');
        assert.strictEqual(items[2].completion.label, 'zzz');
        disposable.dispose();
    });
    test('sort - snippet none', async function () {
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(undefined, new Set().add(27 /* CompletionItemKind.Snippet */)));
        assert.strictEqual(items.length, 1);
        assert.strictEqual(items[0].completion.label, 'fff');
        disposable.dispose();
    });
    test('only from', function (callback) {
        const foo = {
            triggerCharacters: [],
            provideCompletionItems() {
                return {
                    currentWord: '',
                    incomplete: false,
                    suggestions: [{
                            label: 'jjj',
                            type: 'property',
                            insertText: 'jjj'
                        }]
                };
            }
        };
        const registration = registry.register({ pattern: 'bar/path', scheme: 'foo' }, foo);
        provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(undefined, undefined, new Set().add(foo))).then(({ items, disposable }) => {
            registration.dispose();
            assert.strictEqual(items.length, 1);
            assert.ok(items[0].provider === foo);
            disposable.dispose();
            callback();
        });
    });
    test('Ctrl+space completions stopped working with the latest Insiders, #97650', async function () {
        const foo = new class {
            constructor() {
                this._debugDisplayName = 'test';
                this.triggerCharacters = [];
            }
            provideCompletionItems() {
                return {
                    suggestions: [{
                            label: 'one',
                            kind: 5 /* CompletionItemKind.Class */,
                            insertText: 'one',
                            range: {
                                insert: new Range(0, 0, 0, 0),
                                replace: new Range(0, 0, 0, 10)
                            }
                        }, {
                            label: 'two',
                            kind: 5 /* CompletionItemKind.Class */,
                            insertText: 'two',
                            range: {
                                insert: new Range(0, 0, 0, 0),
                                replace: new Range(0, 1, 0, 10)
                            }
                        }]
                };
            }
        };
        const registration = registry.register({ pattern: 'bar/path', scheme: 'foo' }, foo);
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(0, 0), new CompletionOptions(undefined, undefined, new Set().add(foo)));
        registration.dispose();
        assert.strictEqual(items.length, 2);
        const [a, b] = items;
        assert.strictEqual(a.completion.label, 'one');
        assert.strictEqual(a.isInvalid, false);
        assert.strictEqual(b.completion.label, 'two');
        assert.strictEqual(b.isInvalid, true);
        disposable.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL3N1Z2dlc3QudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHNCQUFzQixFQUFvQixNQUFNLDBCQUEwQixDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUduRyxLQUFLLENBQUMsU0FBUyxFQUFFO0lBQ2hCLElBQUksS0FBZ0IsQ0FBQztJQUNyQixJQUFJLFlBQXlCLENBQUM7SUFDOUIsSUFBSSxRQUF5RCxDQUFDO0lBRTlELEtBQUssQ0FBQztRQUNMLFFBQVEsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDekMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUM5RixZQUFZLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxF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