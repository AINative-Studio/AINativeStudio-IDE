/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { promiseWithResolvers } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import * as languages from '../../../../common/languages.js';
import { ParameterHintsModel } from '../../browser/parameterHintsModel.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { InMemoryStorageService, IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
const mockFile = URI.parse('test:somefile.ttt');
const mockFileSelector = { scheme: 'test' };
const emptySigHelp = {
    signatures: [{
            label: 'none',
            parameters: []
        }],
    activeParameter: 0,
    activeSignature: 0
};
const emptySigHelpResult = {
    value: emptySigHelp,
    dispose: () => { }
};
suite('ParameterHintsModel', () => {
    const disposables = new DisposableStore();
    let registry;
    setup(() => {
        disposables.clear();
        registry = new LanguageFeatureRegistry();
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createMockEditor(fileContents) {
        const textModel = disposables.add(createTextModel(fileContents, undefined, undefined, mockFile));
        const editor = disposables.add(createTestCodeEditor(textModel, {
            serviceCollection: new ServiceCollection([ITelemetryService, NullTelemetryService], [IStorageService, disposables.add(new InMemoryStorageService())])
        }));
        return editor;
    }
    function getNextHint(model) {
        return new Promise(resolve => {
            const sub = disposables.add(model.onChangedHints(e => {
                sub.dispose();
                return resolve(e ? { value: e, dispose: () => { } } : undefined);
            }));
        });
    }
    test('Provider should get trigger character on type', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const triggerChar = '(';
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry));
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                assert.strictEqual(context.triggerCharacter, triggerChar);
                done();
                return undefined;
            }
        }));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            await donePromise;
        });
    });
    test('Provider should be retriggered if already active', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const triggerChar = '(';
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                ++invokeCount;
                try {
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        assert.strictEqual(context.isRetrigger, false);
                        assert.strictEqual(context.activeSignatureHelp, undefined);
                        // Retrigger
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar }), 0);
                    }
                    else {
                        assert.strictEqual(invokeCount, 2);
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.isRetrigger, true);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        assert.strictEqual(context.activeSignatureHelp, emptySigHelp);
                        done();
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        }));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            await donePromise;
        });
    });
    test('Provider should not be retriggered if previous help is canceled first', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const triggerChar = '(';
        const editor = createMockEditor('');
        const hintModel = disposables.add(new ParameterHintsModel(editor, registry));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        assert.strictEqual(context.isRetrigger, false);
                        assert.strictEqual(context.activeSignatureHelp, undefined);
                        // Cancel and retrigger
                        hintModel.cancel();
                        editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
                    }
                    else {
                        assert.strictEqual(invokeCount, 2);
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        assert.strictEqual(context.isRetrigger, true);
                        assert.strictEqual(context.activeSignatureHelp, undefined);
                        done();
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        }));
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            return donePromise;
        });
    });
    test('Provider should get last trigger character when triggered multiple times and only be invoked once', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry, 5));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = ['a', 'b', 'c'];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                    assert.strictEqual(context.isRetrigger, false);
                    assert.strictEqual(context.triggerCharacter, 'c');
                    // Give some time to allow for later triggers
                    setTimeout(() => {
                        assert.strictEqual(invokeCount, 1);
                        done();
                    }, 50);
                    return undefined;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        }));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'a' });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'b' });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'c' });
            await donePromise;
        });
    });
    test('Provider should be retriggered if already active', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry, 5));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = ['a', 'b'];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, 'a');
                        // retrigger after delay for widget to show up
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'b' }), 50);
                    }
                    else if (invokeCount === 2) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.ok(context.isRetrigger);
                        assert.strictEqual(context.triggerCharacter, 'b');
                        done();
                    }
                    else {
                        assert.fail('Unexpected invoke');
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        }));
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'a' });
            return donePromise;
        });
    });
    test('Should cancel existing request when new request comes in', async () => {
        const editor = createMockEditor('abc def');
        const hintsModel = disposables.add(new ParameterHintsModel(editor, registry));
        let didRequestCancellationOf = -1;
        let invokeCount = 0;
        const longRunningProvider = new class {
            constructor() {
                this.signatureHelpTriggerCharacters = [];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, token) {
                try {
                    const count = invokeCount++;
                    disposables.add(token.onCancellationRequested(() => { didRequestCancellationOf = count; }));
                    // retrigger on first request
                    if (count === 0) {
                        hintsModel.trigger({ triggerKind: languages.SignatureHelpTriggerKind.Invoke }, 0);
                    }
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve({
                                value: {
                                    signatures: [{
                                            label: '' + count,
                                            parameters: []
                                        }],
                                    activeParameter: 0,
                                    activeSignature: 0
                                },
                                dispose: () => { }
                            });
                        }, 100);
                    });
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        };
        disposables.add(registry.register(mockFileSelector, longRunningProvider));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            hintsModel.trigger({ triggerKind: languages.SignatureHelpTriggerKind.Invoke }, 0);
            assert.strictEqual(-1, didRequestCancellationOf);
            return new Promise((resolve, reject) => disposables.add(hintsModel.onChangedHints(newParamterHints => {
                try {
                    assert.strictEqual(0, didRequestCancellationOf);
                    assert.strictEqual('1', newParamterHints.signatures[0].label);
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            })));
        });
    });
    test('Provider should be retriggered by retrigger character', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const triggerChar = 'a';
        const retriggerChar = 'b';
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry, 5));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [retriggerChar];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        // retrigger after delay for widget to show up
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: retriggerChar }), 50);
                    }
                    else if (invokeCount === 2) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.ok(context.isRetrigger);
                        assert.strictEqual(context.triggerCharacter, retriggerChar);
                        done();
                    }
                    else {
                        assert.fail('Unexpected invoke');
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        }));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            // This should not trigger anything
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: retriggerChar });
            // But a trigger character should
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            return donePromise;
        });
    });
    test('should use first result from multiple providers', async () => {
        const triggerChar = 'a';
        const firstProviderId = 'firstProvider';
        const secondProviderId = 'secondProvider';
        const paramterLabel = 'parameter';
        const editor = createMockEditor('');
        const model = disposables.add(new ParameterHintsModel(editor, registry, 5));
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            async provideSignatureHelp(_model, _position, _token, context) {
                try {
                    if (!context.isRetrigger) {
                        // retrigger after delay for widget to show up
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar }), 50);
                        return {
                            value: {
                                activeParameter: 0,
                                activeSignature: 0,
                                signatures: [{
                                        label: firstProviderId,
                                        parameters: [
                                            { label: paramterLabel }
                                        ]
                                    }]
                            },
                            dispose: () => { }
                        };
                    }
                    return undefined;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        }));
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            async provideSignatureHelp(_model, _position, _token, context) {
                if (context.isRetrigger) {
                    return {
                        value: {
                            activeParameter: 0,
                            activeSignature: context.activeSignatureHelp ? context.activeSignatureHelp.activeSignature + 1 : 0,
                            signatures: [{
                                    label: secondProviderId,
                                    parameters: context.activeSignatureHelp ? context.activeSignatureHelp.signatures[0].parameters : []
                                }]
                        },
                        dispose: () => { }
                    };
                }
                return undefined;
            }
        }));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            const firstHint = (await getNextHint(model)).value;
            assert.strictEqual(firstHint.signatures[0].label, firstProviderId);
            assert.strictEqual(firstHint.activeSignature, 0);
            assert.strictEqual(firstHint.signatures[0].parameters[0].label, paramterLabel);
            const secondHint = (await getNextHint(model)).value;
            assert.strictEqual(secondHint.signatures[0].label, secondProviderId);
            assert.strictEqual(secondHint.activeSignature, 1);
            assert.strictEqual(secondHint.signatures[0].parameters[0].label, paramterLabel);
        });
    });
    test('Quick typing should use the first trigger character', async () => {
        const editor = createMockEditor('');
        const model = disposables.add(new ParameterHintsModel(editor, registry, 50));
        const triggerCharacter = 'a';
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerCharacter];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerCharacter);
                    }
                    else {
                        assert.fail('Unexpected invoke');
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        }));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerCharacter });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'x' });
            await getNextHint(model);
        });
    });
    test('Retrigger while a pending resolve is still going on should preserve last active signature #96702', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const editor = createMockEditor('');
        const model = disposables.add(new ParameterHintsModel(editor, registry, 50));
        const triggerCharacter = 'a';
        const retriggerCharacter = 'b';
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerCharacter];
                this.signatureHelpRetriggerCharacters = [retriggerCharacter];
            }
            async provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerCharacter);
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: retriggerCharacter }), 50);
                    }
                    else if (invokeCount === 2) {
                        // Trigger again while we wait for resolve to take place
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: retriggerCharacter }), 50);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    else if (invokeCount === 3) {
                        // Make sure that in a retrigger during a pending resolve, we still have the old active signature.
                        assert.strictEqual(context.activeSignatureHelp, emptySigHelp);
                        done();
                    }
                    else {
                        assert.fail('Unexpected invoke');
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    done(err);
                    throw err;
                }
            }
        }));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerCharacter });
            await getNextHint(model);
            await getNextHint(model);
            await donePromise;
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHNNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9wYXJhbWV0ZXJIaW50cy90ZXN0L2Jyb3dzZXIvcGFyYW1ldGVySGludHNNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR25HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3hGLE9BQU8sS0FBSyxTQUFTLE1BQU0saUNBQWlDLENBQUM7QUFFN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUs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