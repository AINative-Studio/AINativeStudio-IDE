/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { sendLLMMessageToProviderImplementation } from '../../electron-main/llmMessage/sendLLMMessage.impl.js';
import { defaultSettingsOfProvider } from '../../common/ainativeSettingsTypes.js';
/**
 * Tests for the `ainativeCloud` entry of the provider dispatcher
 * (`sendAINativeCloudChat`), which replaced the TASK-006 stub in issue #144.
 *
 * The contract under test (see docs/api/BACKEND_CONTRACT_NOTES.md):
 *  - the API key comes from `settingsOfProvider.ainativeCloud.apiKey` and is
 *    sent as the `X-API-Key` header,
 *  - the target endpoint is `POST /api/v1/chat/completions`,
 *  - SSE `choices[].delta.content` chunks reach `onText` and the accumulated
 *    text reaches `onFinalMessage`.
 */
const API_KEY = 'sk_test_key_144';
const settingsWithApiKey = (apiKey) => ({
    ...defaultSettingsOfProvider,
    ainativeCloud: {
        ...defaultSettingsOfProvider.ainativeCloud,
        apiKey,
    },
});
/**
 * Install a `global.fetch` that records the request and replays `sseLines` as a
 * streaming SSE body, mirroring the mocking style used by the other AINative
 * integration tests.
 */
const mockFetchWithSSE = (sseLines, captured) => {
    global.fetch = async (input, init) => {
        const headers = {};
        for (const [k, v] of Object.entries((init?.headers ?? {}))) {
            headers[k] = v;
        }
        captured.push({
            url: input.toString(),
            headers,
            body: init?.body ? JSON.parse(init.body) : undefined,
        });
        const encoder = new TextEncoder();
        const body = new ReadableStream({
            start(controller) {
                for (const line of sseLines) {
                    controller.enqueue(encoder.encode(line));
                }
                controller.close();
            }
        });
        return new Response(body, { status: 200, statusText: 'OK' });
    };
};
const userMessage = (content) => ({ role: 'user', content });
suite('sendAINativeCloudChat (ainativeCloud dispatcher entry)', () => {
    const originalFetch = global.fetch;
    teardown(() => {
        global.fetch = originalFetch;
    });
    const sendChat = sendLLMMessageToProviderImplementation.ainativeCloud.sendChat;
    const baseParams = (overrides = {}) => ({
        messages: [userMessage('Hello')],
        onText: (() => { }),
        onFinalMessage: (() => { }),
        onError: (() => { }),
        providerName: 'ainativeCloud',
        settingsOfProvider: settingsWithApiKey(API_KEY),
        modelSelectionOptions: undefined,
        overridesOfModel: undefined,
        modelName: 'claude-sonnet-4-5',
        _setAborter: () => { },
        separateSystemMessage: undefined,
        chatMode: null,
        mcpTools: undefined,
        ...overrides,
    });
    test('sends the settings API key as X-API-Key to /api/v1/chat/completions', async () => {
        const captured = [];
        mockFetchWithSSE(['data: [DONE]\n\n'], captured);
        await sendChat(baseParams({ onFinalMessage: () => { } }));
        assert.strictEqual(captured.length, 1, 'should have issued exactly one request');
        assert.ok(captured[0].url.endsWith('/api/v1/chat/completions'), `expected the confirmed chat endpoint, got ${captured[0].url}`);
        assert.strictEqual(captured[0].headers['X-API-Key'], API_KEY, 'settings apiKey should be sent as X-API-Key');
        assert.strictEqual(captured[0].headers['Authorization'], undefined, 'should not send a bearer token when an API key is set');
        assert.strictEqual(captured[0].body.stream, true, 'should request a streaming response');
        assert.strictEqual(captured[0].body.model, 'claude-sonnet-4-5');
    });
    test('streams SSE deltas through onText and resolves onFinalMessage', async () => {
        const captured = [];
        mockFetchWithSSE([
            'data: {"object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n',
            'data: {"object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" world"}}]}\n\n',
            'data: [DONE]\n\n',
        ], captured);
        const textUpdates = [];
        let finalText = null;
        let errorMessage = null;
        await sendChat(baseParams({
            onText: ({ fullText }) => { textUpdates.push(fullText); },
            onFinalMessage: ({ fullText }) => { finalText = fullText; },
            onError: ({ message }) => { errorMessage = message; },
        }));
        assert.strictEqual(errorMessage, null, `should not error, got: ${errorMessage}`);
        assert.deepStrictEqual(textUpdates, ['Hello', 'Hello world'], 'onText should receive cumulative text per delta');
        assert.strictEqual(finalText, 'Hello world', 'onFinalMessage should receive the accumulated text');
    });
    test('reports the API-key error (not the removed TASK-006 message) when no key is configured', async () => {
        const captured = [];
        mockFetchWithSSE(['data: [DONE]\n\n'], captured);
        let errorMessage = null;
        let finalCalled = false;
        await sendChat(baseParams({
            settingsOfProvider: settingsWithApiKey(''),
            onFinalMessage: () => { finalCalled = true; },
            onError: ({ message }) => { errorMessage = message; },
        }));
        assert.strictEqual(finalCalled, false, 'should not produce a final message without a credential');
        assert.ok(errorMessage, 'should report an error when no API key is configured');
        assert.ok(!/TASK-006/.test(errorMessage), 'the stale TASK-006 message must be gone');
        assert.ok(/API key/i.test(errorMessage), `error should point the user at the API key setting, got: ${errorMessage}`);
        assert.strictEqual(captured.length, 0, 'should not hit the network without a credential');
    });
    test('registers an aborter that cancels the in-flight request', async () => {
        const captured = [];
        mockFetchWithSSE(['data: [DONE]\n\n'], captured);
        let aborter = null;
        await sendChat(baseParams({
            _setAborter: (fn) => { aborter = fn; },
        }));
        assert.ok(aborter, '_setAborter should have been called with an abort function');
        // Calling it after completion must be a no-op rather than a throw.
        assert.doesNotThrow(() => aborter());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZEFJTmF0aXZlQ2xvdWRDaGF0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvZWxlY3Ryb24tbWFpbi9zZW5kQUlOYXRpdmVDbG91ZENoYXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUUxRixPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUseUJBQXlCLEVBQXNCLE1BQU0sdUNBQXVDLENBQUM7QUFHdEc7Ozs7Ozs7Ozs7R0FVRztBQUVILE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDO0FBRWxDLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxNQUFjLEVBQXNCLEVBQUUsQ0FBQyxDQUFDO0lBQ25FLEdBQUcseUJBQXlCO0lBQzVCLGFBQWEsRUFBRTtRQUNkLEdBQUcseUJBQXlCLENBQUMsYUFBYTtRQUMxQyxNQUFNO0tBQ047Q0FDRCxDQUFDLENBQUM7QUFTSDs7OztHQUlHO0FBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFFBQWtCLEVBQUUsUUFBMkIsRUFBRSxFQUFFO0lBQzVFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxFQUFFLEtBQXdCLEVBQUUsSUFBa0IsRUFBcUIsRUFBRTtRQUN4RixNQUFNLE9BQU8sR0FBMkIsRUFBRSxDQUFDO1FBQzNDLEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sSUFBSSxFQUFFLENBQTJCLENBQUMsRUFBRSxDQUFDO1lBQ3RGLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxD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