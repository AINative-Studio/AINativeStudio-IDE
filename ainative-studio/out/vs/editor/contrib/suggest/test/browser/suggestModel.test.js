var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { EditOperation } from '../../../../common/core/editOperation.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../../common/languages/nullTokenize.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { SnippetController2 } from '../../../snippet/browser/snippetController2.js';
import { SuggestController } from '../../browser/suggestController.js';
import { ISuggestMemoryService } from '../../browser/suggestMemory.js';
import { LineContext, SuggestModel } from '../../browser/suggestModel.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createModelServices, createTextModel, instantiateTextModel } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { MockKeybindingService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { InMemoryStorageService, IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { getSnippetSuggestSupport, setSnippetSuggestSupport } from '../../browser/suggest.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
function createMockEditor(model, languageFeaturesService) {
    const storeService = new InMemoryStorageService();
    const editor = createTestCodeEditor(model, {
        serviceCollection: new ServiceCollection([ILanguageFeaturesService, languageFeaturesService], [ITelemetryService, NullTelemetryService], [IStorageService, storeService], [IKeybindingService, new MockKeybindingService()], [ISuggestMemoryService, new class {
                memorize() {
                }
                select() {
                    return -1;
                }
            }], [ILabelService, new class extends mock() {
            }], [IWorkspaceContextService, new class extends mock() {
            }], [IEnvironmentService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.isBuilt = true;
                    this.isExtensionDevelopment = false;
                }
            }]),
    });
    const ctrl = editor.registerAndInstantiateContribution(SnippetController2.ID, SnippetController2);
    editor.hasWidgetFocus = () => true;
    editor.registerDisposable(ctrl);
    editor.registerDisposable(storeService);
    return editor;
}
suite('SuggestModel - Context', function () {
    const OUTER_LANGUAGE_ID = 'outerMode';
    const INNER_LANGUAGE_ID = 'innerMode';
    let OuterMode = class OuterMode extends Disposable {
        constructor(languageService, languageConfigurationService) {
            super();
            this.languageId = OUTER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {}));
            this._register(TokenizationRegistry.register(this.languageId, {
                getInitialState: () => NullState,
                tokenize: undefined,
                tokenizeEncoded: (line, hasEOL, state) => {
                    const tokensArr = [];
                    let prevLanguageId = undefined;
                    for (let i = 0; i < line.length; i++) {
                        const languageId = (line.charAt(i) === 'x' ? INNER_LANGUAGE_ID : OUTER_LANGUAGE_ID);
                        const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
                        if (prevLanguageId !== languageId) {
                            tokensArr.push(i);
                            tokensArr.push((encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */));
                        }
                        prevLanguageId = languageId;
                    }
                    const tokens = new Uint32Array(tokensArr.length);
                    for (let i = 0; i < tokens.length; i++) {
                        tokens[i] = tokensArr[i];
                    }
                    return new EncodedTokenizationResult(tokens, state);
                }
            }));
        }
    };
    OuterMode = __decorate([
        __param(0, ILanguageService),
        __param(1, ILanguageConfigurationService)
    ], OuterMode);
    let InnerMode = class InnerMode extends Disposable {
        constructor(languageService, languageConfigurationService) {
            super();
            this.languageId = INNER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {}));
        }
    };
    InnerMode = __decorate([
        __param(0, ILanguageService),
        __param(1, ILanguageConfigurationService)
    ], InnerMode);
    const assertAutoTrigger = (model, offset, expected, message) => {
        const pos = model.getPositionAt(offset);
        const editor = createMockEditor(model, new LanguageFeaturesService());
        editor.setPosition(pos);
        assert.strictEqual(LineContext.shouldAutoTrigger(editor), expected, message);
        editor.dispose();
    };
    let disposables;
    setup(() => {
        disposables = new DisposableStore();
    });
    teardown(function () {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Context - shouldAutoTrigger', function () {
        const model = createTextModel('Das Pferd frisst keinen Gurkensalat - Philipp Reis 1861.\nWer hat\'s erfunden?');
        disposables.add(model);
        assertAutoTrigger(model, 3, true, 'end of word, Das|');
        assertAutoTrigger(model, 4, false, 'no word Das |');
        assertAutoTrigger(model, 1, true, 'typing a single character before a word: D|as');
        assertAutoTrigger(model, 55, false, 'number, 1861|');
        model.dispose();
    });
    test('shouldAutoTrigger at embedded language boundaries', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const outerMode = disposables.add(instantiationService.createInstance(OuterMode));
        disposables.add(instantiationService.createInstance(InnerMode));
        const model = disposables.add(instantiateTextModel(instantiationService, 'a<xx>a<x>', outerMode.languageId));
        assertAutoTrigger(model, 1, true, 'a|<x — should trigger at end of word');
        assertAutoTrigger(model, 2, false, 'a<|x — should NOT trigger at start of word');
        assertAutoTrigger(model, 3, true, 'a<x|x —  should trigger after typing a single character before a word');
        assertAutoTrigger(model, 4, true, 'a<xx|> — should trigger at boundary between languages');
        assertAutoTrigger(model, 5, false, 'a<xx>|a — should NOT trigger at start of word');
        assertAutoTrigger(model, 6, true, 'a<xx>a|< — should trigger at end of word');
        assertAutoTrigger(model, 8, true, 'a<xx>a<x|> — should trigger at end of word at boundary');
        disposables.dispose();
    });
});
suite('SuggestModel - TriggerAndCancelOracle', function () {
    function getDefaultSuggestRange(model, position) {
        const wordUntil = model.getWordUntilPosition(position);
        return new Range(position.lineNumber, wordUntil.startColumn, position.lineNumber, wordUntil.endColumn);
    }
    const alwaysEmptySupport = {
        _debugDisplayName: 'test',
        provideCompletionItems(doc, pos) {
            return {
                incomplete: false,
                suggestions: []
            };
        }
    };
    const alwaysSomethingSupport = {
        _debugDisplayName: 'test',
        provideCompletionItems(doc, pos) {
            return {
                incomplete: false,
                suggestions: [{
                        label: doc.getWordUntilPosition(pos).word,
                        kind: 9 /* CompletionItemKind.Property */,
                        insertText: 'foofoo',
                        range: getDefaultSuggestRange(doc, pos)
                    }]
            };
        }
    };
    let disposables;
    let model;
    const languageFeaturesService = new LanguageFeaturesService();
    const registry = languageFeaturesService.completionProvider;
    setup(function () {
        disposables = new DisposableStore();
        model = createTextModel('abc def', undefined, undefined, URI.parse('test:somefile.ttt'));
        disposables.add(model);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function withOracle(callback) {
        return new Promise((resolve, reject) => {
            const editor = createMockEditor(model, languageFeaturesService);
            const oracle = editor.invokeWithinContext(accessor => accessor.get(IInstantiationService).createInstance(SuggestModel, editor));
            disposables.add(oracle);
            disposables.add(editor);
            try {
                resolve(callback(oracle, editor));
            }
            catch (err) {
                reject(err);
            }
        });
    }
    function assertEvent(event, action, assert) {
        return new Promise((resolve, reject) => {
            const sub = event(e => {
                sub.dispose();
                try {
                    resolve(assert(e));
                }
                catch (err) {
                    reject(err);
                }
            });
            try {
                action();
            }
            catch (err) {
                sub.dispose();
                reject(err);
            }
        });
    }
    test('events - cancel/trigger', function () {
        return withOracle(model => {
            return Promise.all([
                assertEvent(model.onDidTrigger, function () {
                    model.trigger({ auto: true });
                }, function (event) {
                    assert.strictEqual(event.auto, true);
                    return assertEvent(model.onDidCancel, function () {
                        model.cancel();
                    }, function (event) {
                        assert.strictEqual(event.retrigger, false);
                    });
                }),
                assertEvent(model.onDidTrigger, function () {
                    model.trigger({ auto: true });
                }, function (event) {
                    assert.strictEqual(event.auto, true);
                }),
                assertEvent(model.onDidTrigger, function () {
                    model.trigger({ auto: false });
                }, function (event) {
                    assert.strictEqual(event.auto, false);
                })
            ]);
        });
    });
    test('events - suggest/empty', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysEmptySupport));
        return withOracle(model => {
            return Promise.all([
                assertEvent(model.onDidCancel, function () {
                    model.trigger({ auto: true });
                }, function (event) {
                    assert.strictEqual(event.retrigger, false);
                }),
                assertEvent(model.onDidSuggest, function () {
                    model.trigger({ auto: false });
                }, function (event) {
                    assert.strictEqual(event.triggerOptions.auto, false);
                    assert.strictEqual(event.isFrozen, false);
                    assert.strictEqual(event.completionModel.items.length, 0);
                })
            ]);
        });
    });
    test('trigger - on type', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 4 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'd' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.provider, alwaysSomethingSupport);
            });
        });
    });
    test('#17400: Keep filtering suggestModel.ts after space', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [{
                            label: 'My Table',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'My Table',
                            range: getDefaultSuggestRange(doc, pos)
                        }]
                };
            }
        }));
        model.setValue('');
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                // make sure completionModel starts here!
                model.trigger({ auto: true });
            }, event => {
                return assertEvent(model.onDidSuggest, () => {
                    editor.setPosition({ lineNumber: 1, column: 1 });
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'My' });
                }, event => {
                    assert.strictEqual(event.triggerOptions.auto, true);
                    assert.strictEqual(event.completionModel.items.length, 1);
                    const [first] = event.completionModel.items;
                    assert.strictEqual(first.completion.label, 'My Table');
                    return assertEvent(model.onDidSuggest, () => {
                        editor.setPosition({ lineNumber: 1, column: 3 });
                        editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
                    }, event => {
                        assert.strictEqual(event.triggerOptions.auto, true);
                        assert.strictEqual(event.completionModel.items.length, 1);
                        const [first] = event.completionModel.items;
                        assert.strictEqual(first.completion.label, 'My Table');
                    });
                });
            });
        });
    });
    test('#21484: Trigger character always force a new completion session', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [{
                            label: 'foo.bar',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foo.bar',
                            range: Range.fromPositions(pos.with(undefined, 1), pos)
                        }]
                };
            }
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['.'],
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [{
                            label: 'boom',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'boom',
                            range: Range.fromPositions(pos.delta(0, doc.getLineContent(pos.lineNumber)[pos.column - 2] === '.' ? 0 : -1), pos)
                        }]
                };
            }
        }));
        model.setValue('');
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 1 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'foo' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.completion.label, 'foo.bar');
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: '.' });
            }, event => {
                // SYNC
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.completion.label, 'foo.bar');
            });
            await assertEvent(model.onDidSuggest, () => {
                // nothing -> triggered by the trigger character typing (see above)
            }, event => {
                // ASYNC
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                const [first, second] = event.completionModel.items;
                assert.strictEqual(first.completion.label, 'foo.bar');
                assert.strictEqual(second.completion.label, 'boom');
            });
        });
    });
    test('Intellisense Completion doesn\'t respect space after equal sign (.html file), #29353 [1/2]', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle((model, editor) => {
            editor.getModel().setValue('fo');
            editor.setPosition({ lineNumber: 1, column: 3 });
            return assertEvent(model.onDidSuggest, () => {
                model.trigger({ auto: false });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.isFrozen, false);
                assert.strictEqual(event.completionModel.items.length, 1);
                return assertEvent(model.onDidCancel, () => {
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: '+' });
                }, event => {
                    assert.strictEqual(event.retrigger, false);
                });
            });
        });
    });
    test('Intellisense Completion doesn\'t respect space after equal sign (.html file), #29353 [2/2]', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle((model, editor) => {
            editor.getModel().setValue('fo');
            editor.setPosition({ lineNumber: 1, column: 3 });
            return assertEvent(model.onDidSuggest, () => {
                model.trigger({ auto: false });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.isFrozen, false);
                assert.strictEqual(event.completionModel.items.length, 1);
                return assertEvent(model.onDidCancel, () => {
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
                }, event => {
                    assert.strictEqual(event.retrigger, false);
                });
            });
        });
    });
    test('Incomplete suggestion results cause re-triggering when typing w/o further context, #28400 (1/2)', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [{
                            label: 'foo',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foo',
                            range: Range.fromPositions(pos.with(undefined, 1), pos)
                        }]
                };
            }
        }));
        return withOracle((model, editor) => {
            editor.getModel().setValue('foo');
            editor.setPosition({ lineNumber: 1, column: 4 });
            return assertEvent(model.onDidSuggest, () => {
                model.trigger({ auto: false });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.completionModel.getIncompleteProvider().size, 1);
                assert.strictEqual(event.completionModel.items.length, 1);
                return assertEvent(model.onDidCancel, () => {
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: ';' });
                }, event => {
                    assert.strictEqual(event.retrigger, false);
                });
            });
        });
    });
    test('Incomplete suggestion results cause re-triggering when typing w/o further context, #28400 (2/2)', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [{
                            label: 'foo;',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foo',
                            range: Range.fromPositions(pos.with(undefined, 1), pos)
                        }]
                };
            }
        }));
        return withOracle((model, editor) => {
            editor.getModel().setValue('foo');
            editor.setPosition({ lineNumber: 1, column: 4 });
            return assertEvent(model.onDidSuggest, () => {
                model.trigger({ auto: false });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.completionModel.getIncompleteProvider().size, 1);
                assert.strictEqual(event.completionModel.items.length, 1);
                return assertEvent(model.onDidSuggest, () => {
                    // while we cancel incrementally enriching the set of
                    // completions we still filter against those that we have
                    // until now
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: ';' });
                }, event => {
                    assert.strictEqual(event.triggerOptions.auto, false);
                    assert.strictEqual(event.completionModel.getIncompleteProvider().size, 1);
                    assert.strictEqual(event.completionModel.items.length, 1);
                });
            });
        });
    });
    test('Trigger character is provided in suggest context', function () {
        let triggerCharacter = '';
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['.'],
            provideCompletionItems(doc, pos, context) {
                assert.strictEqual(context.triggerKind, 1 /* CompletionTriggerKind.TriggerCharacter */);
                triggerCharacter = context.triggerCharacter;
                return {
                    incomplete: false,
                    suggestions: [
                        {
                            label: 'foo.bar',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foo.bar',
                            range: Range.fromPositions(pos.with(undefined, 1), pos)
                        }
                    ]
                };
            }
        }));
        model.setValue('');
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 1 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'foo.' });
            }, event => {
                assert.strictEqual(triggerCharacter, '.');
            });
        });
    });
    test('Mac press and hold accent character insertion does not update suggestions, #35269', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [{
                            label: 'abc',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'abc',
                            range: Range.fromPositions(pos.with(undefined, 1), pos)
                        }, {
                            label: 'äbc',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'äbc',
                            range: Range.fromPositions(pos.with(undefined, 1), pos)
                        }]
                };
            }
        }));
        model.setValue('');
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 1 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'a' });
            }, event => {
                assert.strictEqual(event.completionModel.items.length, 1);
                assert.strictEqual(event.completionModel.items[0].completion.label, 'abc');
                return assertEvent(model.onDidSuggest, () => {
                    editor.executeEdits('test', [EditOperation.replace(new Range(1, 1, 1, 2), 'ä')]);
                }, event => {
                    // suggest model changed to äbc
                    assert.strictEqual(event.completionModel.items.length, 1);
                    assert.strictEqual(event.completionModel.items[0].completion.label, 'äbc');
                });
            });
        });
    });
    test('Backspace should not always cancel code completion, #36491', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 4 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'd' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.provider, alwaysSomethingSupport);
            });
            await assertEvent(model.onDidSuggest, () => {
                CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.provider, alwaysSomethingSupport);
            });
        });
    });
    test('Text changes for completion CodeAction are affected by the completion #39893', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [{
                            label: 'bar',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'bar',
                            range: Range.fromPositions(pos.delta(0, -2), pos),
                            additionalTextEdits: [{
                                    text: ', bar',
                                    range: { startLineNumber: 1, endLineNumber: 1, startColumn: 17, endColumn: 17 }
                                }]
                        }]
                };
            }
        }));
        model.setValue('ba; import { foo } from "./b"');
        return withOracle(async (sugget, editor) => {
            class TestCtrl extends SuggestController {
                _insertSuggestion_publicForTest(item, flags = 0) {
                    super._insertSuggestion(item, flags);
                }
            }
            const ctrl = editor.registerAndInstantiateContribution(TestCtrl.ID, TestCtrl);
            editor.registerAndInstantiateContribution(SnippetController2.ID, SnippetController2);
            await assertEvent(sugget.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 3 });
                sugget.trigger({ auto: false });
            }, event => {
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.completion.label, 'bar');
                ctrl._insertSuggestion_publicForTest({ item: first, index: 0, model: event.completionModel });
            });
            assert.strictEqual(model.getValue(), 'bar; import { foo, bar } from "./b"');
        });
    });
    test('Completion unexpectedly triggers on second keypress of an edit group in a snippet #43523', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                editor.setValue('d');
                editor.setSelection(new Selection(1, 1, 1, 2));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'e' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.provider, alwaysSomethingSupport);
            });
        });
    });
    test('Fails to render completion details #47988', function () {
        let disposeA = 0;
        let disposeB = 0;
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [{
                            kind: 23 /* CompletionItemKind.Folder */,
                            label: 'CompleteNot',
                            insertText: 'Incomplete',
                            sortText: 'a',
                            range: getDefaultSuggestRange(doc, pos)
                        }],
                    dispose() { disposeA += 1; }
                };
            }
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [{
                            kind: 23 /* CompletionItemKind.Folder */,
                            label: 'Complete',
                            insertText: 'Complete',
                            sortText: 'z',
                            range: getDefaultSuggestRange(doc, pos)
                        }],
                    dispose() { disposeB += 1; }
                };
            },
            resolveCompletionItem(item) {
                return item;
            },
        }));
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'c' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(disposeA, 0);
                assert.strictEqual(disposeB, 0);
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'o' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                // clean up
                model.clear();
                assert.strictEqual(disposeA, 2); // provide got called two times!
                assert.strictEqual(disposeB, 1);
            });
        });
    });
    test('Trigger (full) completions when (incomplete) completions are already active #99504', function () {
        let countA = 0;
        let countB = 0;
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                countA += 1;
                return {
                    incomplete: false, // doesn't matter if incomplete or not
                    suggestions: [{
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'Z aaa',
                            insertText: 'Z aaa',
                            range: new Range(1, 1, pos.lineNumber, pos.column)
                        }],
                };
            }
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                countB += 1;
                if (!doc.getWordUntilPosition(pos).word.startsWith('a')) {
                    return;
                }
                return {
                    incomplete: false,
                    suggestions: [{
                            kind: 23 /* CompletionItemKind.Folder */,
                            label: 'aaa',
                            insertText: 'aaa',
                            range: getDefaultSuggestRange(doc, pos)
                        }],
                };
            },
        }));
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'Z' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'Z aaa');
            });
            await assertEvent(model.onDidSuggest, () => {
                // started another word: Z a|
                // item should be: Z aaa, aaa
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' a' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'Z aaa');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'aaa');
                assert.strictEqual(countA, 1); // should we keep the suggestions from the "active" provider?, Yes! See: #106573
                assert.strictEqual(countB, 2);
            });
        });
    });
    test('registerCompletionItemProvider with letters as trigger characters block other completion items to show up #127815', async function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'AAAA',
                            insertText: 'WordTriggerA',
                            range: new Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column)
                        }],
                };
            }
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['a', '.'],
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'AAAA',
                            insertText: 'AutoTriggerA',
                            range: new Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column)
                        }],
                };
            },
        }));
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: '.' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
            });
            editor.getModel().setValue('');
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'a' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
            });
        });
    });
    test('Unexpected suggest scoring #167242', async function () {
        disposables.add(registry.register('*', {
            // word-based
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                const word = doc.getWordUntilPosition(pos);
                return {
                    suggestions: [{
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'pull',
                            insertText: 'pull',
                            range: new Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn)
                        }],
                };
            }
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            // JSON-based
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [{
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'git.pull',
                            insertText: 'git.pull',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column)
                        }],
                };
            },
        }));
        return withOracle(async function (model, editor) {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('gi');
                editor.setSelection(new Selection(1, 3, 1, 3));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 't' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'git.pull');
            });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: '.' });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'p' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'git.pull');
            });
        });
    });
    test('Completion list closes unexpectedly when typing a digit after a word separator #169390', function () {
        const requestCounts = [0, 0];
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                requestCounts[0] += 1;
                return {
                    suggestions: [{
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'foo-20',
                            insertText: 'foo-20',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column)
                        }, {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'foo-hello',
                            insertText: 'foo-hello',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column)
                        }],
                };
            }
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['2'],
            provideCompletionItems(doc, pos, ctx) {
                requestCounts[1] += 1;
                if (ctx.triggerKind !== 1 /* CompletionTriggerKind.TriggerCharacter */) {
                    return;
                }
                return {
                    suggestions: [{
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'foo-210',
                            insertText: 'foo-210',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column)
                        }],
                };
            },
        }));
        return withOracle(async function (model, editor) {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('foo');
                editor.setSelection(new Selection(1, 4, 1, 4));
                model.trigger({ auto: false });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'foo-20');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'foo-hello');
            });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: '-' });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: '2' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'foo-20');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'foo-210');
                assert.deepStrictEqual(requestCounts, [1, 2]);
            });
        });
    });
    test('Set refilter-flag, keep triggerKind', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['.'],
            provideCompletionItems(doc, pos, ctx) {
                return {
                    suggestions: [{
                            label: doc.getWordUntilPosition(pos).word || 'hello',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foofoo',
                            range: getDefaultSuggestRange(doc, pos)
                        }]
                };
            },
        }));
        return withOracle(async function (model, editor) {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('foo');
                editor.setSelection(new Selection(1, 4, 1, 4));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'o' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.triggerOptions.triggerCharacter, undefined);
                assert.strictEqual(event.triggerOptions.triggerKind, undefined);
                assert.strictEqual(event.completionModel.items.length, 1);
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: '.' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.triggerOptions.refilter, undefined);
                assert.strictEqual(event.triggerOptions.triggerCharacter, '.');
                assert.strictEqual(event.triggerOptions.triggerKind, 1 /* CompletionTriggerKind.TriggerCharacter */);
                assert.strictEqual(event.completionModel.items.length, 1);
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'h' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.triggerOptions.refilter, true);
                assert.strictEqual(event.triggerOptions.triggerCharacter, '.');
                assert.strictEqual(event.triggerOptions.triggerKind, 1 /* CompletionTriggerKind.TriggerCharacter */);
                assert.strictEqual(event.completionModel.items.length, 1);
            });
        });
    });
    test('Snippets gone from IntelliSense #173244', function () {
        const snippetProvider = {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos, ctx) {
                return {
                    suggestions: [{
                            label: 'log',
                            kind: 27 /* CompletionItemKind.Snippet */,
                            insertText: 'log',
                            range: getDefaultSuggestRange(doc, pos)
                        }]
                };
            }
        };
        const old = setSnippetSuggestSupport(snippetProvider);
        disposables.add(toDisposable(() => {
            if (getSnippetSuggestSupport() === snippetProvider) {
                setSnippetSuggestSupport(old);
            }
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['.'],
            provideCompletionItems(doc, pos, ctx) {
                return {
                    suggestions: [{
                            label: 'locals',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'locals',
                            range: getDefaultSuggestRange(doc, pos)
                        }],
                    incomplete: true
                };
            },
        }));
        return withOracle(async function (model, editor) {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'l' });
            }, event => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.triggerOptions.triggerCharacter, undefined);
                assert.strictEqual(event.triggerOptions.triggerKind, undefined);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'locals');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'log');
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'o' });
            }, event => {
                assert.strictEqual(event.triggerOptions.triggerKind, 2 /* CompletionTriggerKind.TriggerForIncompleteCompletions */);
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'locals');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'log');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvc3VnZ2VzdE1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJakUsT0FBTyxFQUFxRix5QkFBeUIsRUFBVSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTdMLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUduRyxTQUFTLGdCQUFnQixDQUFDLEtBQWdCLEVBQUUsdUJBQWlEO0lBRTVGLE1BQU0sWUFBWSxHQUFHLElBQUksc0JBQXNCLEVBQUUsQ0FBQztJQUNsRCxNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUU7UUFDMUMsaUJBQWlCLEVBQUUsSUFBSSxpQkFBaUIsQ0FDdkMsQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsQ0FBQyxFQUNuRCxDQUFDLGlCQUFpQixFQUFFLG9CQUFvQixDQUFDLEVBQ3pDLENBQUMsZUFBZSxFQUFFLFlBQVksQ0FBQyxFQUMvQixDQUFDLGtCQUFrQixFQUFFLElBQUkscUJBQXFCLEVBQUUsQ0FBQyxFQUNqRCxDQUFDLHFCQUFxQixFQUFFLElBQUk7Z0JBRTNCLFFBQVE7Z0JBQ1IsQ0FBQztnQkFDRCxNQUFNO29CQUNMLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsQ0FBQzthQUNELENBQUMsRUFDRixDQUFDLGFBQWEsRUFBRSxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQWlCO2FBQUksQ0FBQyxFQUM1RCxDQUFDLHdCQUF3QixFQUFFLElBQUksS0FBTSxTQUFRLElBQUksRUFBNEI7YUFBSSxDQUFDLEVBQ2xGLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUF1QjtnQkFBekM7O29CQUNoQixZQUFPLEdBQVksSUFBSSxDQUFDO29CQUN4QiwyQkFBc0IsR0FBWSxLQUFLLENBQUM7Z0JBQ2xELENBQUM7YUFBQSxDQUFDLENBQ0Y7S0FDRCxDQUFDLENBQUM7SUFDSCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsa0NBQWtDLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDbEcsTUFBTSxDQUFDLGNBQWMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFFbkMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4QyxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxLQUFLLENBQUMsd0JBQXdCLEVBQUU7SUFDL0IsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUM7SUFDdEMsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUM7SUFFdEMsSUFBTSxTQUFTLEdBQWYsTUFBTSxTQUFVLFNBQVEsVUFBVTtRQUVqQyxZQUNtQixlQUFpQyxFQUNwQiw0QkFBMkQ7WUFFMUYsS0FBSyxFQUFFLENBQUM7WUFMTyxlQUFVLEdBQUcsaUJBQWlCLENBQUM7WUFNOUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxRSxJQUFJLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFM0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDN0QsZUFBZSxFQUFFLEdBQVcsRUFBRSxDQUFDLFNBQVM7Z0JBQ3hDLFFBQVEsRUFBRSxTQUFVO2dCQUNwQixlQUFlLEVBQUUsQ0FBQyxJQUFZLEVBQUUsTUFBZSxFQUFFLEtBQWEsRUFBNkIsRUFBRTtvQkFDNUYsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO29CQUMvQixJQUFJLGNBQWMsR0FBdUIsU0FBUyxDQUFDO29CQUNuRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUN0QyxNQUFNLFVBQVUsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQzt3QkFDcEYsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUN2RixJQUFJLGNBQWMsS0FBSyxVQUFVLEVBQUUsQ0FBQzs0QkFDbkMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDbEIsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQiw0Q0FBb0MsQ0FBQyxDQUFDLENBQUM7d0JBQ3pFLENBQUM7d0JBQ0QsY0FBYyxHQUFHLFVBQVUsQ0FBQztvQkFDN0IsQ0FBQztvQkFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ2pELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0JBQ3hDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzFCLENBQUM7b0JBQ0QsT0FBTyxJQUFJLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDckQsQ0FBQzthQUNELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUNELENBQUE7SUFsQ0ssU0FBUztRQUdaLFdBQUEsZ0JBQWdCLENBQUE7UUFDaEIsV0FBQSw2QkFBNkIsQ0FBQTtPQUoxQixTQUFTLENBa0NkO0lBRUQsSUFBTSxTQUFTLEdBQWYsTUFBTSxTQUFVLFNBQVEsVUFBVTtRQUVqQyxZQUNtQixlQUFpQyxFQUNwQiw0QkFBMkQ7WUFFMUYsS0FBSyxFQUFFLENBQUM7WUFMTyxlQUFVLEdBQUcsaUJBQWlCLENBQUM7WUFNOUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxRSxJQUFJLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUUsQ0FBQztLQUNELENBQUE7SUFWSyxTQUFTO1FBR1osV0FBQSxnQkFBZ0IsQ0FBQTtRQUNoQixXQUFBLDZCQUE2QixDQUFBO09BSjFCLFNBQVMsQ0FVZDtJQUVELE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxLQUFnQixFQUFFLE1BQWMsRUFBRSxRQUFpQixFQUFFLE9BQWdCLEVBQVEsRUFBRTtRQUN6RyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM3RSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbEIsQ0FBQyxDQUFDO0lBRUYsSUFBSSxXQUE0QixDQUFDO0lBRWpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUNyQyxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQztRQUNSLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1FBQ25DLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxnRkFBZ0YsQ0FBQyxDQUFDO1FBQ2hILFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkIsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUN2RCxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwRCxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSwrQ0FBK0MsQ0FBQyxDQUFDO1FBQ25GLGlCQUFpQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7UUFDOUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxNQUFNLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlELE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbEYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUVoRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUU3RyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO1FBQzFFLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLDRDQUE0QyxDQUFDLENBQUM7UUFDakYsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsdUVBQXVFLENBQUMsQ0FBQztRQUMzRyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSx1REFBdUQsQ0FBQyxDQUFDO1FBQzNGLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLCtDQUErQyxDQUFDLENBQUM7UUFDcEYsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsMENBQTBDLENBQUMsQ0FBQztRQUM5RSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSx3REFBd0QsQ0FBQyxDQUFDO1FBRTVGLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsS0FBSyxDQUFDLHVDQUF1QyxFQUFFO0lBRzlDLFNBQVMsc0JBQXNCLENBQUMsS0FBaUIsRUFBRSxRQUFrQjtRQUNwRSxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkQsT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDeEcsQ0FBQztJQUVELE1BQU0sa0JBQWtCLEdBQTJCO1FBQ2xELGlCQUFpQixFQUFFLE1BQU07UUFDekIsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUc7WUFDOUIsT0FBTztnQkFDTixVQUFVLEVBQUUsS0FBSztnQkFDakIsV0FBVyxFQUFFLEVBQUU7YUFDZixDQUFDO1FBQ0gsQ0FBQztLQUNELENBQUM7SUFFRixNQUFNLHNCQUFzQixHQUEyQjtRQUN0RCxpQkFBaUIsRUFBRSxNQUFNO1FBQ3pCLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHO1lBQzlCLE9BQU87Z0JBQ04sVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLFdBQVcsRUFBRSxDQUFDO3dCQUNiLEtBQUssRUFBRSxHQUFHLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSTt3QkFDekMsSUFBSSxxQ0FBNkI7d0JBQ2pDLFVBQVUsRUFBRSxRQUFRO3dCQUNwQixLQUFLLEVBQUUsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztxQkFDdkMsQ0FBQzthQUNGLENBQUM7UUFDSCxDQUFDO0tBQ0QsQ0FBQztJQUVGLElBQUksV0FBNEIsQ0FBQztJQUNqQyxJQUFJLEtBQWdCLENBQUM7SUFDckIsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7SUFDOUQsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUMsa0JBQWtCLENBQUM7SUFFNUQsS0FBSyxDQUFDO1FBQ0wsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUN6RixXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxVQUFVLENBQUMsUUFBK0Q7UUFFbEYsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN0QyxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztZQUNoRSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hJLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV4QixJQUFJLENBQUM7Z0JBQ0osT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNuQyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsU0FBUyxXQUFXLENBQUksS0FBZSxFQUFFLE1BQWlCLEVBQUUsTUFBcUI7UUFDaEYsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN0QyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3JCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUM7b0JBQ0osT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixDQUFDO2dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNiLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQztnQkFDSixNQUFNLEVBQUUsQ0FBQztZQUNWLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1FBQy9CLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBRXpCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFFbEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUU7b0JBQy9CLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDL0IsQ0FBQyxFQUFFLFVBQVUsS0FBSztvQkFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUVyQyxPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFO3dCQUNyQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2hCLENBQUMsRUFBRSxVQUFVLEtBQUs7d0JBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDNUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQyxDQUFDO2dCQUVGLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFO29CQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQy9CLENBQUMsRUFBRSxVQUFVLEtBQUs7b0JBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDO2dCQUVGLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFO29CQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQ2hDLENBQUMsRUFBRSxVQUFVLEtBQUs7b0JBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDdkMsQ0FBQyxDQUFDO2FBQ0YsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUdILElBQUksQ0FBQyx3QkFBd0IsRUFBRTtRQUU5QixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBRTNFLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDbEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUU7b0JBQzlCLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDL0IsQ0FBQyxFQUFFLFVBQVUsS0FBSztvQkFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUM1QyxDQUFDLENBQUM7Z0JBQ0YsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUU7b0JBQy9CLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDaEMsQ0FBQyxFQUFFLFVBQVUsS0FBSztvQkFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0QsQ0FBQyxDQUFDO2FBQ0YsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQkFBbUIsRUFBRTtRQUV6QixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO1FBRS9FLE9BQU8sVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ25DLE9BQU8sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLDZCQUFnQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBRXpELENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO2dCQUU1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztZQUM1RCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0RBQW9ELEVBQUU7UUFFMUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3JELGlCQUFpQixFQUFFLE1BQU07WUFDekIsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUc7Z0JBQzlCLE9BQU87b0JBQ04sVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLFdBQVcsRUFBRSxDQUFDOzRCQUNiLEtBQUssRUFBRSxVQUFVOzRCQUNqQixJQUFJLHFDQUE2Qjs0QkFDakMsVUFBVSxFQUFFLFVBQVU7NEJBQ3RCLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO3lCQUN2QyxDQUFDO2lCQUNGLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRW5CLE9BQU8sVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBRW5DLE9BQU8sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMzQyx5Q0FBeUM7Z0JBQ3pDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMvQixDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBRVYsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7b0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNqRCxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBRTFELENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtvQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDMUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO29CQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO29CQUV2RCxPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTt3QkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ2pELE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztvQkFFekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO3dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUMxRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7d0JBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7b0JBQ3hELENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlFQUFpRSxFQUFFO1FBRXZFLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNyRCxpQkFBaUIsRUFBRSxNQUFNO1lBQ3pCLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHO2dCQUM5QixPQUFPO29CQUNOLFVBQVUsRUFBRSxLQUFLO29CQUNqQixXQUFXLEVBQUUsQ0FBQzs0QkFDYixLQUFLLEVBQUUsU0FBUzs0QkFDaEIsSUFBSSxxQ0FBNkI7NEJBQ2pDLFVBQVUsRUFBRSxTQUFTOzRCQUNyQixLQUFLLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7eUJBQ3ZELENBQUM7aUJBQ0YsQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNyRCxpQkFBaUIsRUFBRSxNQUFNO1lBQ3pCLGlCQUFpQixFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ3hCLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHO2dCQUM5QixPQUFPO29CQUNOLFVBQVUsRUFBRSxLQUFLO29CQUNqQixXQUFXLEVBQUUsQ0FBQzs0QkFDYixLQUFLLEVBQUUsTUFBTTs0QkFDYixJQUFJLHFDQUE2Qjs0QkFDakMsVUFBVSxFQUFFLE1BQU07NEJBQ2xCLEtBQUssRUFBRSxLQUFLLENBQUMsYUFBYSxDQUN6QixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRixHQUFHLENBQ0g7eUJBQ0QsQ0FBQztpQkFDRixDQUFDO1lBQ0gsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO1FBRUosS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVuQixPQUFPLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBRXpDLE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLDZCQUFnQixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBRTNELENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRXZELENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQzFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUV6RCxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ1YsT0FBTztnQkFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZELENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQzFDLG1FQUFtRTtZQUVwRSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ1YsUUFBUTtnQkFDUixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNyRCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNEZBQTRGLEVBQUU7UUFFbEcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUUvRSxPQUFPLFVBQVUsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUVuQyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRWpELE9BQU8sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMzQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDaEMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRTFELE9BQU8sV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO29CQUMxQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ3pELENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtvQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzVDLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRGQUE0RixFQUFFO1FBRWxHLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7UUFFL0UsT0FBTyxVQUFVLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFFbkMsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVqRCxPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDM0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUxRCxPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtvQkFDMUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLDZCQUFnQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO2dCQUN6RCxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7b0JBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUM1QyxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpR0FBaUcsRUFBRTtRQUV2RyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckQsaUJBQWlCLEVBQUUsTUFBTTtZQUN6QixzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRztnQkFDOUIsT0FBTztvQkFDTixVQUFVLEVBQUUsSUFBSTtvQkFDaEIsV0FBVyxFQUFFLENBQUM7NEJBQ2IsS0FBSyxFQUFFLEtBQUs7NEJBQ1osSUFBSSxxQ0FBNkI7NEJBQ2pDLFVBQVUsRUFBRSxLQUFLOzRCQUNqQixLQUFLLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7eUJBQ3ZELENBQUM7aUJBQ0YsQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLE9BQU8sVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBRW5DLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFakQsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQzNDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNoQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLHFCQUFxQixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFMUQsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7b0JBQzFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO29CQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDNUMsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUdBQWlHLEVBQUU7UUFFdkcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3JELGlCQUFpQixFQUFFLE1BQU07WUFDekIsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUc7Z0JBQzlCLE9BQU87b0JBQ04sVUFBVSxFQUFFLElBQUk7b0JBQ2hCLFdBQVcsRUFBRSxDQUFDOzRCQUNiLEtBQUssRUFBRSxNQUFNOzRCQUNiLElBQUkscUNBQTZCOzRCQUNqQyxVQUFVLEVBQUUsS0FBSzs0QkFDakIsS0FBSyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO3lCQUN2RCxDQUFDO2lCQUNGLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLFVBQVUsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUVuQyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRWpELE9BQU8sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMzQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDaEMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRTFELE9BQU8sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO29CQUMzQyxxREFBcUQ7b0JBQ3JELHlEQUF5RDtvQkFDekQsWUFBWTtvQkFDWixNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ3pELENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtvQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUzRCxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrREFBa0QsRUFBRTtRQUN4RCxJQUFJLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztRQUMxQixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckQsaUJBQWlCLEVBQUUsTUFBTTtZQUN6QixpQkFBaUIsRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUN4QixzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU87Z0JBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsaURBQXlDLENBQUM7Z0JBQ2hGLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxnQkFBaUIsQ0FBQztnQkFDN0MsT0FBTztvQkFDTixVQUFVLEVBQUUsS0FBSztvQkFDakIsV0FBVyxFQUFFO3dCQUNaOzRCQUNDLEtBQUssRUFBRSxTQUFTOzRCQUNoQixJQUFJLHFDQUE2Qjs0QkFDakMsVUFBVSxFQUFFLFNBQVM7NEJBQ3JCLEtBQUssRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQzt5QkFDdkQ7cUJBQ0Q7aUJBQ0QsQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbkIsT0FBTyxVQUFVLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFFbkMsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDNUQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDM0MsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1GQUFtRixFQUFFO1FBQ3pGLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNyRCxpQkFBaUIsRUFBRSxNQUFNO1lBQ3pCLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHO2dCQUM5QixPQUFPO29CQUNOLFVBQVUsRUFBRSxJQUFJO29CQUNoQixXQUFXLEVBQUUsQ0FBQzs0QkFDYixLQUFLLEVBQUUsS0FBSzs0QkFDWixJQUFJLHFDQUE2Qjs0QkFDakMsVUFBVSxFQUFFLEtBQUs7NEJBQ2pCLEtBQUssRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQzt5QkFDdkQsRUFBRTs0QkFDRixLQUFLLEVBQUUsS0FBSzs0QkFDWixJQUFJLHFDQUE2Qjs0QkFDakMsVUFBVSxFQUFFLEtBQUs7NEJBQ2pCLEtBQUssRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQzt5QkFDdkQsQ0FBQztpQkFDRixDQUFDO1lBQ0gsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO1FBRUosS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuQixPQUFPLFVBQVUsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUVuQyxPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2pELE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUN6RCxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFFM0UsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7b0JBQzNDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRWxGLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtvQkFDViwrQkFBK0I7b0JBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBRTVFLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDREQUE0RCxFQUFFO1FBQ2xFLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7UUFFL0UsT0FBTyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN6QyxNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2pELE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUV6RCxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztnQkFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFDNUQsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDMUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFckUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7Z0JBRTVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw4RUFBOEUsRUFBRTtRQUNwRixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckQsaUJBQWlCLEVBQUUsTUFBTTtZQUN6QixzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRztnQkFDOUIsT0FBTztvQkFDTixVQUFVLEVBQUUsSUFBSTtvQkFDaEIsV0FBVyxFQUFFLENBQUM7NEJBQ2IsS0FBSyxFQUFFLEtBQUs7NEJBQ1osSUFBSSxxQ0FBNkI7NEJBQ2pDLFVBQVUsRUFBRSxLQUFLOzRCQUNqQixLQUFLLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQzs0QkFDakQsbUJBQW1CLEVBQUUsQ0FBQztvQ0FDckIsSUFBSSxFQUFFLE9BQU87b0NBQ2IsS0FBSyxFQUFFLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtpQ0FDL0UsQ0FBQzt5QkFDRixDQUFDO2lCQUNGLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixLQUFLLENBQUMsUUFBUSxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFFaEQsT0FBTyxVQUFVLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMxQyxNQUFNLFFBQVMsU0FBUSxpQkFBaUI7Z0JBQ3ZDLCtCQUErQixDQUFDLElBQXlCLEVBQUUsUUFBZ0IsQ0FBQztvQkFDM0UsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDdEMsQ0FBQzthQUNEO1lBQ0QsTUFBTSxJQUFJLEdBQWEsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDeEYsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBRXJGLE1BQU0sV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2pDLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFFVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUVsRCxJQUFJLENBQUMsK0JBQStCLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO1lBQy9GLENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUNoQixxQ0FBcUMsQ0FDckMsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMEZBQTBGLEVBQUU7UUFFaEcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUUvRSxPQUFPLFVBQVUsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNuQyxPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDM0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7Z0JBRTVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUdILElBQUksQ0FBQywyQ0FBMkMsRUFBRTtRQUVqRCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDakIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBRWpCLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNyRCxpQkFBaUIsRUFBRSxNQUFNO1lBQ3pCLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHO2dCQUM5QixPQUFPO29CQUNOLFVBQVUsRUFBRSxJQUFJO29CQUNoQixXQUFXLEVBQUUsQ0FBQzs0QkFDYixJQUFJLG9DQUEyQjs0QkFDL0IsS0FBSyxFQUFFLGFBQWE7NEJBQ3BCLFVBQVUsRUFBRSxZQUFZOzRCQUN4QixRQUFRLEVBQUUsR0FBRzs0QkFDYixLQUFLLEVBQUUsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQzt5QkFDdkMsQ0FBQztvQkFDRixPQUFPLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQzVCLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFDSixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckQsaUJBQWlCLEVBQUUsTUFBTTtZQUN6QixzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRztnQkFDOUIsT0FBTztvQkFDTixVQUFVLEVBQUUsS0FBSztvQkFDakIsV0FBVyxFQUFFLENBQUM7NEJBQ2IsSUFBSSxvQ0FBMkI7NEJBQy9CLEtBQUssRUFBRSxVQUFVOzRCQUNqQixVQUFVLEVBQUUsVUFBVTs0QkFDdEIsUUFBUSxFQUFFLEdBQUc7NEJBQ2IsS0FBSyxFQUFFLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7eUJBQ3ZDLENBQUM7b0JBQ0YsT0FBTyxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUM1QixDQUFDO1lBQ0gsQ0FBQztZQUNELHFCQUFxQixDQUFDLElBQUk7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUV6QyxNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDakMsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLDZCQUFnQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFMUQsV0FBVztnQkFDWCxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0M7Z0JBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLENBQUMsQ0FBQyxDQUFDO1FBRUosQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUdILElBQUksQ0FBQyxvRkFBb0YsRUFBRTtRQUUxRixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFFZixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckQsaUJBQWlCLEVBQUUsTUFBTTtZQUN6QixzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRztnQkFDOUIsTUFBTSxJQUFJLENBQUMsQ0FBQztnQkFDWixPQUFPO29CQUNOLFVBQVUsRUFBRSxLQUFLLEVBQUUsc0NBQXNDO29CQUN6RCxXQUFXLEVBQUUsQ0FBQzs0QkFDYixJQUFJLGtDQUEwQjs0QkFDOUIsS0FBSyxFQUFFLE9BQU87NEJBQ2QsVUFBVSxFQUFFLE9BQU87NEJBQ25CLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQzt5QkFDbEQsQ0FBQztpQkFDRixDQUFDO1lBQ0gsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO1FBQ0osV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3JELGlCQUFpQixFQUFFLE1BQU07WUFDekIsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUc7Z0JBQzlCLE1BQU0sSUFBSSxDQUFDLENBQUM7Z0JBQ1osSUFBSSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3pELE9BQU87Z0JBQ1IsQ0FBQztnQkFDRCxPQUFPO29CQUNOLFVBQVUsRUFBRSxLQUFLO29CQUNqQixXQUFXLEVBQUUsQ0FBQzs0QkFDYixJQUFJLG9DQUEyQjs0QkFDL0IsS0FBSyxFQUFFLEtBQUs7NEJBQ1osVUFBVSxFQUFFLEtBQUs7NEJBQ2pCLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO3lCQUN2QyxDQUFDO2lCQUNGLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBRXpDLE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMxQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNwQixNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUV6RCxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZFLENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQzFDLDZCQUE2QjtnQkFDN0IsNkJBQTZCO2dCQUM3QixNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDMUQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBRXBFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0ZBQWdGO2dCQUMvRyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvQixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUhBQW1ILEVBQUUsS0FBSztRQUU5SCxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckQsaUJBQWlCLEVBQUUsTUFBTTtZQUN6QixzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRztnQkFDOUIsT0FBTztvQkFDTixXQUFXLEVBQUUsQ0FBQzs0QkFDYixJQUFJLGtDQUEwQjs0QkFDOUIsS0FBSyxFQUFFLE1BQU07NEJBQ2IsVUFBVSxFQUFFLGNBQWM7NEJBQzFCLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDO3lCQUN4RSxDQUFDO2lCQUNGLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFDSixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckQsaUJBQWlCLEVBQUUsTUFBTTtZQUN6QixpQkFBaUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDN0Isc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUc7Z0JBQzlCLE9BQU87b0JBQ04sV0FBVyxFQUFFLENBQUM7NEJBQ2IsSUFBSSxrQ0FBMEI7NEJBQzlCLEtBQUssRUFBRSxNQUFNOzRCQUNiLFVBQVUsRUFBRSxjQUFjOzRCQUMxQixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQzt5QkFDeEUsQ0FBQztpQkFDRixDQUFDO1lBQ0gsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUV6QyxNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUMsQ0FBQyxDQUFDO1lBR0gsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUUvQixNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLO1FBQy9DLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDdEMsYUFBYTtZQUNiLGlCQUFpQixFQUFFLE1BQU07WUFDekIsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUc7Z0JBQzlCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0MsT0FBTztvQkFDTixXQUFXLEVBQUUsQ0FBQzs0QkFDYixJQUFJLGtDQUF5Qjs0QkFDN0IsS0FBSyxFQUFFLE1BQU07NEJBQ2IsVUFBVSxFQUFFLE1BQU07NEJBQ2xCLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO3lCQUNsRixDQUFDO2lCQUNGLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFDSixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckQsYUFBYTtZQUNiLGlCQUFpQixFQUFFLE1BQU07WUFDekIsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUc7Z0JBQzlCLE9BQU87b0JBQ04sV0FBVyxFQUFFLENBQUM7NEJBQ2IsSUFBSSxrQ0FBMEI7NEJBQzlCLEtBQUssRUFBRSxVQUFVOzRCQUNqQixVQUFVLEVBQUUsVUFBVTs0QkFDdEIsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQzt5QkFDL0QsQ0FBQztpQkFDRixDQUFDO1lBQ0gsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxVQUFVLENBQUMsS0FBSyxXQUFXLEtBQUssRUFBRSxNQUFNO1lBRTlDLE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMxQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUV6RCxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzFFLENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLDZCQUFnQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBRXhELE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMxQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUMxRSxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0ZBQXdGLEVBQUU7UUFFOUYsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3JELGlCQUFpQixFQUFFLE1BQU07WUFFekIsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUc7Z0JBQzlCLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RCLE9BQU87b0JBQ04sV0FBVyxFQUFFLENBQUM7NEJBQ2IsSUFBSSxrQ0FBeUI7NEJBQzdCLEtBQUssRUFBRSxRQUFROzRCQUNmLFVBQVUsRUFBRSxRQUFROzRCQUNwQixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDO3lCQUMvRCxFQUFFOzRCQUNGLElBQUksa0NBQXlCOzRCQUM3QixLQUFLLEVBQUUsV0FBVzs0QkFDbEIsVUFBVSxFQUFFLFdBQVc7NEJBQ3ZCLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUM7eUJBQy9ELENBQUM7aUJBQ0YsQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUNKLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNyRCxpQkFBaUIsRUFBRSxNQUFNO1lBQ3pCLGlCQUFpQixFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ3hCLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRztnQkFDbkMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEIsSUFBSSxHQUFHLENBQUMsV0FBVyxtREFBMkMsRUFBRSxDQUFDO29CQUNoRSxPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsT0FBTztvQkFDTixXQUFXLEVBQUUsQ0FBQzs0QkFDYixJQUFJLGtDQUEwQjs0QkFDOUIsS0FBSyxFQUFFLFNBQVM7NEJBQ2hCLFVBQVUsRUFBRSxTQUFTOzRCQUNyQixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDO3lCQUMvRCxDQUFDO2lCQUNGLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLFVBQVUsQ0FBQyxLQUFLLFdBQVcsS0FBSyxFQUFFLE1BQU07WUFFOUMsTUFBTSxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQzFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3ZCLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBRWhDLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzNFLENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLDZCQUFnQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBR3hELE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMxQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFO1FBRTNDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNyRCxpQkFBaUIsRUFBRSxNQUFNO1lBQ3pCLGlCQUFpQixFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ3hCLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRztnQkFDbkMsT0FBTztvQkFDTixXQUFXLEVBQUUsQ0FBQzs0QkFDYixLQUFLLEVBQUUsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxPQUFPOzRCQUNwRCxJQUFJLHFDQUE2Qjs0QkFDakMsVUFBVSxFQUFFLFFBQVE7NEJBQ3BCLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO3lCQUN2QyxDQUFDO2lCQUNGLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLFVBQVUsQ0FBQyxLQUFLLFdBQVcsS0FBSyxFQUFFLE1BQU07WUFFOUMsTUFBTSxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQzFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3ZCLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0MsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLDZCQUFnQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBR3pELENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7Z0JBQzFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUV6RCxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsV0FBVyxpREFBeUMsQ0FBQztnQkFDN0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0QsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLDZCQUFnQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBRXpELENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDVixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxXQUFXLGlEQUF5QyxDQUFDO2dCQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUNBQXlDLEVBQUU7UUFFL0MsTUFBTSxlQUFlLEdBQTJCO1lBQy9DLGlCQUFpQixFQUFFLE1BQU07WUFDekIsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO2dCQUNuQyxPQUFPO29CQUNOLFdBQVcsRUFBRSxDQUFDOzRCQUNiLEtBQUssRUFBRSxLQUFLOzRCQUNaLElBQUkscUNBQTRCOzRCQUNoQyxVQUFVLEVBQUUsS0FBSzs0QkFDakIsS0FBSyxFQUFFLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7eUJBQ3ZDLENBQUM7aUJBQ0YsQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDO1FBQ0YsTUFBTSxHQUFHLEdBQUcsd0JBQXdCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFdEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2pDLElBQUksd0JBQXdCLEVBQUUsS0FBSyxlQUFlLEVBQUUsQ0FBQztnQkFDcEQsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckQsaUJBQWlCLEVBQUUsTUFBTTtZQUN6QixpQkFBaUIsRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUN4QixzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7Z0JBQ25DLE9BQU87b0JBQ04sV0FBVyxFQUFFLENBQUM7NEJBQ2IsS0FBSyxFQUFFLFFBQVE7NEJBQ2YsSUFBSSxxQ0FBNkI7NEJBQ2pDLFVBQVUsRUFBRSxRQUFROzRCQUNwQixLQUFLLEVBQUUsc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQzt5QkFDdkMsQ0FBQztvQkFDRixVQUFVLEVBQUUsSUFBSTtpQkFDaEIsQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLE9BQU8sVUFBVSxDQUFDLEtBQUssV0FBVyxLQUFLLEVBQUUsTUFBTTtZQUU5QyxNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFHekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyRSxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO2dCQUMxQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFekQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxXQUFXLGdFQUF3RCxDQUFDO2dCQUM1RyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3JFLENBQUMsQ0FBQyxDQUFDO1FBRUosQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=