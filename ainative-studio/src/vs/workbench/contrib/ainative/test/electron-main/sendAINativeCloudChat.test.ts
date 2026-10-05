/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { sendLLMMessageToProviderImplementation } from '../../electron-main/llmMessage/sendLLMMessage.impl.js';
import { defaultSettingsOfProvider, SettingsOfProvider } from '../../common/ainativeSettingsTypes.js';
import { LLMChatMessage, OnText, OnFinalMessage, OnError } from '../../common/sendLLMMessageTypes.js';

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

const settingsWithApiKey = (apiKey: string): SettingsOfProvider => ({
	...defaultSettingsOfProvider,
	ainativeCloud: {
		...defaultSettingsOfProvider.ainativeCloud,
		apiKey,
	},
});

/** Capture of what the dispatcher actually put on the wire. */
type CapturedRequest = {
	url: string;
	headers: Record<string, string>;
	body: any;
};

/**
 * Install a `global.fetch` that records the request and replays `sseLines` as a
 * streaming SSE body, mirroring the mocking style used by the other AINative
 * integration tests.
 */
const mockFetchWithSSE = (sseLines: string[], captured: CapturedRequest[]) => {
	global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const headers: Record<string, string> = {};
		for (const [k, v] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
			headers[k] = v;
		}
		captured.push({
			url: input.toString(),
			headers,
			body: init?.body ? JSON.parse(init.body as string) : undefined,
		});

		const encoder = new TextEncoder();
		const body = new ReadableStream<Uint8Array>({
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

const userMessage = (content: string): LLMChatMessage => ({ role: 'user', content });

suite('sendAINativeCloudChat (ainativeCloud dispatcher entry)', () => {

	const originalFetch = global.fetch;

	teardown(() => {
		global.fetch = originalFetch;
	});

	const sendChat = sendLLMMessageToProviderImplementation.ainativeCloud.sendChat;

	const baseParams = (overrides: Partial<Parameters<typeof sendChat>[0]> = {}) => ({
		messages: [userMessage('Hello')],
		onText: (() => { }) as OnText,
		onFinalMessage: (() => { }) as OnFinalMessage,
		onError: (() => { }) as OnError,
		providerName: 'ainativeCloud' as const,
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
		const captured: CapturedRequest[] = [];
		mockFetchWithSSE(['data: [DONE]\n\n'], captured);

		await sendChat(baseParams({ onFinalMessage: () => { } }));

		assert.strictEqual(captured.length, 1, 'should have issued exactly one request');
		assert.ok(
			captured[0].url.endsWith('/api/v1/chat/completions'),
			`expected the confirmed chat endpoint, got ${captured[0].url}`
		);
		assert.strictEqual(captured[0].headers['X-API-Key'], API_KEY, 'settings apiKey should be sent as X-API-Key');
		assert.strictEqual(captured[0].headers['Authorization'], undefined, 'should not send a bearer token when an API key is set');
		assert.strictEqual(captured[0].body.stream, true, 'should request a streaming response');
		assert.strictEqual(captured[0].body.model, 'claude-sonnet-4-5');
	});

	test('streams SSE deltas through onText and resolves onFinalMessage', async () => {
		const captured: CapturedRequest[] = [];
		mockFetchWithSSE([
			'data: {"object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n',
			'data: {"object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" world"}}]}\n\n',
			'data: [DONE]\n\n',
		], captured);

		const textUpdates: string[] = [];
		let finalText: string | null = null;
		let errorMessage: string | null = null;

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
		const captured: CapturedRequest[] = [];
		mockFetchWithSSE(['data: [DONE]\n\n'], captured);

		let errorMessage: string | null = null;
		let finalCalled = false;

		await sendChat(baseParams({
			settingsOfProvider: settingsWithApiKey(''),
			onFinalMessage: () => { finalCalled = true; },
			onError: ({ message }) => { errorMessage = message; },
		}));

		assert.strictEqual(finalCalled, false, 'should not produce a final message without a credential');
		assert.ok(errorMessage, 'should report an error when no API key is configured');
		assert.ok(
			!/TASK-006/.test(errorMessage!),
			'the stale TASK-006 message must be gone'
		);
		assert.ok(
			/API key/i.test(errorMessage!),
			`error should point the user at the API key setting, got: ${errorMessage}`
		);
		assert.strictEqual(captured.length, 0, 'should not hit the network without a credential');
	});

	test('registers an aborter that cancels the in-flight request', async () => {
		const captured: CapturedRequest[] = [];
		mockFetchWithSSE(['data: [DONE]\n\n'], captured);

		let aborter: (() => void) | null = null;

		await sendChat(baseParams({
			_setAborter: (fn: () => void) => { aborter = fn; },
		}));

		assert.ok(aborter, '_setAborter should have been called with an abort function');
		// Calling it after completion must be a no-op rather than a throw.
		assert.doesNotThrow(() => aborter!());
	});
});
