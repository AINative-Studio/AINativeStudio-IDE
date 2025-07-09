/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncIterableSource, DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { languageModelExtensionPoint, LanguageModelsService } from '../../common/languageModels.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../../services/extensions/common/extensionsRegistry.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
suite('LanguageModels', function () {
    let languageModels;
    const store = new DisposableStore();
    const activationEvents = new Set();
    setup(function () {
        languageModels = new LanguageModelsService(new class extends mock() {
            activateByEvent(name) {
                activationEvents.add(name);
                return Promise.resolve();
            }
        }, new NullLogService(), new MockContextKeyService());
        const ext = ExtensionsRegistry.getExtensionPoints().find(e => e.name === languageModelExtensionPoint.name);
        ext.acceptUsers([{
                description: { ...nullExtensionDescription, enabledApiProposals: ['chatProvider'] },
                value: { vendor: 'test-vendor' },
                collector: null
            }]);
        store.add(languageModels.registerLanguageModelChat('1', {
            metadata: {
                extension: nullExtensionDescription.identifier,
                name: 'Pretty Name',
                vendor: 'test-vendor',
                family: 'test-family',
                version: 'test-version',
                id: 'test-id',
                maxInputTokens: 100,
                maxOutputTokens: 100,
            },
            sendChatRequest: async () => {
                throw new Error();
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
        store.add(languageModels.registerLanguageModelChat('12', {
            metadata: {
                extension: nullExtensionDescription.identifier,
                name: 'Pretty Name',
                vendor: 'test-vendor',
                family: 'test2-family',
                version: 'test2-version',
                id: 'test-id',
                maxInputTokens: 100,
                maxOutputTokens: 100,
            },
            sendChatRequest: async () => {
                throw new Error();
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
    });
    teardown(function () {
        languageModels.dispose();
        activationEvents.clear();
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty selector returns all', async function () {
        const result1 = await languageModels.selectLanguageModels({});
        assert.deepStrictEqual(result1.length, 2);
        assert.deepStrictEqual(result1[0], '1');
        assert.deepStrictEqual(result1[1], '12');
    });
    test('no warning that a matching model was not found #213716', async function () {
        const result1 = await languageModels.selectLanguageModels({ vendor: 'test-vendor' });
        assert.deepStrictEqual(result1.length, 2);
        const result2 = await languageModels.selectLanguageModels({ vendor: 'test-vendor', family: 'FAKE' });
        assert.deepStrictEqual(result2.length, 0);
    });
    test('sendChatRequest returns a response-stream', async function () {
        store.add(languageModels.registerLanguageModelChat('actual', {
            metadata: {
                extension: nullExtensionDescription.identifier,
                name: 'Pretty Name',
                vendor: 'test-vendor',
                family: 'actual-family',
                version: 'actual-version',
                id: 'actual-lm',
                maxInputTokens: 100,
                maxOutputTokens: 100,
            },
            sendChatRequest: async (messages, _from, _options, token) => {
                // const message = messages.at(-1);
                const defer = new DeferredPromise();
                const stream = new AsyncIterableSource();
                (async () => {
                    while (!token.isCancellationRequested) {
                        stream.emitOne({ index: 0, part: { type: 'text', value: Date.now().toString() } });
                        await timeout(10);
                    }
                    defer.complete(undefined);
                })();
                return {
                    stream: stream.asyncIterable,
                    result: defer.p
                };
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
        const models = await languageModels.selectLanguageModels({ id: 'actual-lm' });
        assert.ok(models.length === 1);
        const first = models[0];
        const cts = new CancellationTokenSource();
        const request = await languageModels.sendChatRequest(first, nullExtensionDescription.identifier, [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: 'hello' }] }], {}, cts.token);
        assert.ok(request);
        cts.dispose(true);
        await request.result;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL2xhbmd1YWdlTW9kZWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDcEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUEwQywyQkFBMkIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVJLE9BQU8sRUFBcUIsd0JBQXdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUVoSCxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7SUFFdkIsSUFBSSxjQUFxQyxDQUFDO0lBRTFDLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDcEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRTNDLEtBQUssQ0FBQztRQUVM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