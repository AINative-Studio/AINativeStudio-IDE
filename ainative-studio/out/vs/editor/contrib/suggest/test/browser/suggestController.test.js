/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { IEditorWorkerService } from '../../../../common/services/editorWorker.js';
import { SnippetController2 } from '../../../snippet/browser/snippetController2.js';
import { SuggestController } from '../../browser/suggestController.js';
import { ISuggestMemoryService } from '../../browser/suggestMemory.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { MockKeybindingService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { InMemoryStorageService, IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { DeleteLinesAction } from '../../../linesOperations/browser/linesOperations.js';
suite('SuggestController', function () {
    const disposables = new DisposableStore();
    let controller;
    let editor;
    let model;
    const languageFeaturesService = new LanguageFeaturesService();
    teardown(function () {
        disposables.clear();
    });
    // ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        const serviceCollection = new ServiceCollection([ILanguageFeaturesService, languageFeaturesService], [ITelemetryService, NullTelemetryService], [ILogService, new NullLogService()], [IStorageService, disposables.add(new InMemoryStorageService())], [IKeybindingService, new MockKeybindingService()], [IEditorWorkerService, new class extends mock() {
                computeWordRanges() {
                    return Promise.resolve({});
                }
            }], [ISuggestMemoryService, new class extends mock() {
                memorize() { }
                select() { return 0; }
            }], [IMenuService, new class extends mock() {
                createMenu() {
                    return new class extends mock() {
                        constructor() {
                            super(...arguments);
                            this.onDidChange = Event.None;
                        }
                        dispose() { }
                    };
                }
            }], [ILabelService, new class extends mock() {
            }], [IWorkspaceContextService, new class extends mock() {
            }], [IEnvironmentService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.isBuilt = true;
                    this.isExtensionDevelopment = false;
                }
            }]);
        model = disposables.add(createTextModel('', undefined, undefined, URI.from({ scheme: 'test-ctrl', path: '/path.tst' })));
        editor = disposables.add(createTestCodeEditor(model, { serviceCollection }));
        editor.registerAndInstantiateContribution(SnippetController2.ID, SnippetController2);
        controller = editor.registerAndInstantiateContribution(SuggestController.ID, SuggestController);
    });
    test('postfix completion reports incorrect position #86984', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'let ${1:name} = foo$0',
                            insertTextRules: 4 /* CompletionItemInsertTextRule.InsertAsSnippet */,
                            range: { startLineNumber: 1, startColumn: 9, endLineNumber: 1, endColumn: 11 },
                            additionalTextEdits: [{
                                    text: '',
                                    range: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 9 }
                                }]
                        }]
                };
            }
        }));
        editor.setValue('    foo.le');
        editor.setSelection(new Selection(1, 11, 1, 11));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        assert.strictEqual(editor.getValue(), '    let name = foo');
    });
    test('use additionalTextEdits sync when possible', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos),
                            additionalTextEdits: [{
                                    text: 'I came sync',
                                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }
                                }]
                        }]
                };
            },
            async resolveCompletionItem(item) {
                return item;
            }
        }));
        editor.setValue('hello\nhallo');
        editor.setSelection(new Selection(2, 6, 2, 6));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'I came synchello\nhallohello');
    });
    test('resolve additionalTextEdits async when needed', async function () {
        let resolveCallCount = 0;
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos)
                        }]
                };
            },
            async resolveCompletionItem(item) {
                resolveCallCount += 1;
                await timeout(10);
                item.additionalTextEdits = [{
                        text: 'I came late',
                        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }
                    }];
                return item;
            }
        }));
        editor.setValue('hello\nhallo');
        editor.setSelection(new Selection(2, 6, 2, 6));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'hello\nhallohello');
        assert.strictEqual(resolveCallCount, 1);
        // additional edits happened after a litte wait
        await timeout(20);
        assert.strictEqual(editor.getValue(), 'I came latehello\nhallohello');
        // single undo stop
        editor.getModel()?.undo();
        assert.strictEqual(editor.getValue(), 'hello\nhallo');
    });
    test('resolve additionalTextEdits async when needed (typing)', async function () {
        let resolveCallCount = 0;
        let resolve = () => { };
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos)
                        }]
                };
            },
            async resolveCompletionItem(item) {
                resolveCallCount += 1;
                await new Promise(_resolve => resolve = _resolve);
                item.additionalTextEdits = [{
                        text: 'I came late',
                        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }
                    }];
                return item;
            }
        }));
        editor.setValue('hello\nhallo');
        editor.setSelection(new Selection(2, 6, 2, 6));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'hello\nhallohello');
        assert.strictEqual(resolveCallCount, 1);
        // additional edits happened after a litte wait
        assert.ok(editor.getSelection()?.equalsSelection(new Selection(2, 11, 2, 11)));
        editor.trigger('test', 'type', { text: 'TYPING' });
        assert.strictEqual(editor.getValue(), 'hello\nhallohelloTYPING');
        resolve();
        await timeout(10);
        assert.strictEqual(editor.getValue(), 'I came latehello\nhallohelloTYPING');
        assert.ok(editor.getSelection()?.equalsSelection(new Selection(2, 17, 2, 17)));
    });
    // additional edit come late and are AFTER the selection -> cancel
    test('resolve additionalTextEdits async when needed (simple conflict)', async function () {
        let resolveCallCount = 0;
        let resolve = () => { };
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos)
                        }]
                };
            },
            async resolveCompletionItem(item) {
                resolveCallCount += 1;
                await new Promise(_resolve => resolve = _resolve);
                item.additionalTextEdits = [{
                        text: 'I came late',
                        range: { startLineNumber: 1, startColumn: 6, endLineNumber: 1, endColumn: 6 }
                    }];
                return item;
            }
        }));
        editor.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'hello');
        assert.strictEqual(resolveCallCount, 1);
        resolve();
        await timeout(10);
        assert.strictEqual(editor.getValue(), 'hello');
    });
    // additional edit come late and are AFTER the position at which the user typed -> cancelled
    test('resolve additionalTextEdits async when needed (conflict)', async function () {
        let resolveCallCount = 0;
        let resolve = () => { };
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos)
                        }]
                };
            },
            async resolveCompletionItem(item) {
                resolveCallCount += 1;
                await new Promise(_resolve => resolve = _resolve);
                item.additionalTextEdits = [{
                        text: 'I came late',
                        range: { startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 2 }
                    }];
                return item;
            }
        }));
        editor.setValue('hello\nhallo');
        editor.setSelection(new Selection(2, 6, 2, 6));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'hello\nhallohello');
        assert.strictEqual(resolveCallCount, 1);
        // additional edits happened after a litte wait
        editor.setSelection(new Selection(1, 1, 1, 1));
        editor.trigger('test', 'type', { text: 'TYPING' });
        assert.strictEqual(editor.getValue(), 'TYPINGhello\nhallohello');
        resolve();
        await timeout(10);
        assert.strictEqual(editor.getValue(), 'TYPINGhello\nhallohello');
        assert.ok(editor.getSelection()?.equalsSelection(new Selection(1, 7, 1, 7)));
    });
    test('resolve additionalTextEdits async when needed (cancel)', async function () {
        const resolve = [];
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos)
                        }, {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hallo',
                            range: Range.fromPositions(pos)
                        }]
                };
            },
            async resolveCompletionItem(item) {
                await new Promise(_resolve => resolve.push(_resolve));
                item.additionalTextEdits = [{
                        text: 'additionalTextEdits',
                        range: { startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 2 }
                    }];
                return item;
            }
        }));
        editor.setValue('abc');
        editor.setSelection(new Selection(1, 1, 1, 1));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(true, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'helloabc');
        // next
        controller.acceptNextSuggestion();
        // resolve additional edits (MUST be cancelled)
        resolve.forEach(fn => fn);
        resolve.length = 0;
        await timeout(10);
        // next suggestion used
        assert.strictEqual(editor.getValue(), 'halloabc');
    });
    test('Completion edits are applied inconsistently when additionalTextEdits and textEdit start at the same offset #143888', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'MyClassName',
                            insertText: 'MyClassName',
                            range: Range.fromPositions(pos),
                            additionalTextEdits: [{
                                    range: Range.fromPositions(pos),
                                    text: 'import "my_class.txt";\n'
                                }]
                        }]
                };
            }
        }));
        editor.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(true, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'import "my_class.txt";\nMyClassName');
    });
    test('Pressing enter on autocomplete should always apply the selected dropdown completion, not a different, hidden one #161883', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                const word = doc.getWordUntilPosition(pos);
                const range = new Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn);
                return {
                    suggestions: [{
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'filterBankSize',
                            insertText: 'filterBankSize',
                            sortText: 'a',
                            range
                        }, {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'filter',
                            insertText: 'filter',
                            sortText: 'b',
                            range
                        }]
                };
            }
        }));
        editor.setValue('filte');
        editor.setSelection(new Selection(1, 6, 1, 6));
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        const { completionModel } = await p1;
        assert.strictEqual(completionModel.items.length, 2);
        const [first, second] = completionModel.items;
        assert.strictEqual(first.textLabel, 'filterBankSize');
        assert.strictEqual(second.textLabel, 'filter');
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 6, 1, 6));
        editor.trigger('keyboard', 'type', { text: 'r' }); // now filter "overtakes" filterBankSize because it is fully matched
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 7, 1, 7));
        controller.acceptSelectedSuggestion(false, false);
        assert.strictEqual(editor.getValue(), 'filter');
    });
    test('Fast autocomple typing selects the previous autocomplete suggestion, #71795', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                const word = doc.getWordUntilPosition(pos);
                const range = new Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn);
                return {
                    suggestions: [{
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'false',
                            insertText: 'false',
                            range
                        }, {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'float',
                            insertText: 'float',
                            range
                        }, {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'for',
                            insertText: 'for',
                            range
                        }, {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'foreach',
                            insertText: 'foreach',
                            range
                        }]
                };
            }
        }));
        editor.setValue('f');
        editor.setSelection(new Selection(1, 2, 1, 2));
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        const { completionModel } = await p1;
        assert.strictEqual(completionModel.items.length, 4);
        const [first, second, third, fourth] = completionModel.items;
        assert.strictEqual(first.textLabel, 'false');
        assert.strictEqual(second.textLabel, 'float');
        assert.strictEqual(third.textLabel, 'for');
        assert.strictEqual(fourth.textLabel, 'foreach');
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 2, 1, 2));
        editor.trigger('keyboard', 'type', { text: 'o' }); // filters`false` and `float`
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 3, 1, 3));
        controller.acceptSelectedSuggestion(false, false);
        assert.strictEqual(editor.getValue(), 'for');
    });
    test.skip('Suggest widget gets orphaned in editor #187779', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                const word = doc.getLineContent(pos.lineNumber);
                const range = new Range(pos.lineNumber, 1, pos.lineNumber, pos.column);
                return {
                    suggestions: [{
                            kind: 18 /* CompletionItemKind.Text */,
                            label: word,
                            insertText: word,
                            range
                        }]
                };
            }
        }));
        editor.setValue(`console.log(example.)\nconsole.log(EXAMPLE.not)`);
        editor.setSelection(new Selection(1, 21, 1, 21));
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        const p2 = Event.toPromise(controller.model.onDidCancel);
        new DeleteLinesAction().run(null, editor);
        await p2;
    });
    test('Ranges where additionalTextEdits are applied are not appropriate when characters are typed #177591', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'aaa',
                            insertText: 'aaa',
                            range: Range.fromPositions(pos),
                            additionalTextEdits: [{
                                    range: Range.fromPositions(pos.delta(0, 10)),
                                    text: 'aaa'
                                }]
                        }]
                };
            }
        }));
        { // PART1 - no typing
            editor.setValue(`123456789123456789`);
            editor.setSelection(new Selection(1, 1, 1, 1));
            const p1 = Event.toPromise(controller.model.onDidSuggest);
            controller.triggerSuggest();
            const e = await p1;
            assert.strictEqual(e.completionModel.items.length, 1);
            assert.strictEqual(e.completionModel.items[0].textLabel, 'aaa');
            controller.acceptSelectedSuggestion(false, false);
            assert.strictEqual(editor.getValue(), 'aaa1234567891aaa23456789');
        }
        { // PART2 - typing
            editor.setValue(`123456789123456789`);
            editor.setSelection(new Selection(1, 1, 1, 1));
            const p1 = Event.toPromise(controller.model.onDidSuggest);
            controller.triggerSuggest();
            const e = await p1;
            assert.strictEqual(e.completionModel.items.length, 1);
            assert.strictEqual(e.completionModel.items[0].textLabel, 'aaa');
            editor.trigger('keyboard', 'type', { text: 'aa' });
            controller.acceptSelectedSuggestion(false, false);
            assert.strictEqual(editor.getValue(), 'aaa1234567891aaa23456789');
        }
    });
    test.skip('[Bug] "No suggestions" persists while typing if the completion helper is set to return an empty list for empty content#3557', async function () {
        let requestCount = 0;
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                requestCount += 1;
                if (requestCount === 1) {
                    return undefined;
                }
                return {
                    suggestions: [{
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'foo',
                            insertText: 'foo',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column)
                        }],
                };
            }
        }));
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        const e1 = await p1;
        assert.strictEqual(e1.completionModel.items.length, 0);
        assert.strictEqual(requestCount, 1);
        const p2 = Event.toPromise(controller.model.onDidSuggest);
        editor.trigger('keyboard', 'type', { text: 'f' });
        const e2 = await p2;
        assert.strictEqual(e2.completionModel.items.length, 1);
        assert.strictEqual(requestCount, 2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci9zdWdnZXN0Q29udHJvbGxlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLDRDQUE0QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQVMsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxF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