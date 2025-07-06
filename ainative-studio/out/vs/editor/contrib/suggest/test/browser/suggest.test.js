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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci9zdWdnZXN0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBb0IsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHbkcsS0FBSyxDQUFDLFNBQVMsRUFBRTtJQUNoQixJQUFJLEtBQWdCLENBQUM7SUFDckIsSUFBSSxZQUF5QixDQUFDO0lBQzlCLElBQUksUUFBeUQsQ0FBQztJQUU5RCxLQUFLLENBQUM7UUFDTCxRQUFRLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQ3pDLEtBQUssR0FBRyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDOUYsWUFBWSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVB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