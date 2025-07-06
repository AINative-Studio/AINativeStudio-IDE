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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbGFuZ3VhZ2VNb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNwRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQTBDLDJCQUEyQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUksT0FBTyxFQUFxQix3QkFBd0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBRWhILEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtJQUV2QixJQUFJLGNBQXFDLENBQUM7SUFFMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUNwQyxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFFM0MsS0FBSyxDQUFDO1FBRUws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