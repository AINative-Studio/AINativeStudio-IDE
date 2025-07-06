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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvc3VnZ2VzdENvbnRyb2xsZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hGLE9B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