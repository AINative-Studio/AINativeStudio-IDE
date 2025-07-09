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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHNNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3BhcmFtZXRlckhpbnRzL3Rlc3QvYnJvd3Nlci9wYXJhbWV0ZXJIaW50c01vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeEYsT0FBTyxLQUFLLFNBQVMsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFN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