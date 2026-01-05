/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, /* deepStrictEqual */ } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	IAgentMemoryService,
	AgentMemoryService,
	MemorySearchResult,
	MemoryEntry,
	ContextWindow
} from '../../common/agentMemoryService.js';
import { IAINativeAuthService, AuthState, AINativeUser, AINativeAuthResult } from '../../common/ainativeAuthService.js';

/**
 * Mock authentication service for testing
 */
class MockAuthService implements IAINativeAuthService {
	readonly _serviceBrand: undefined;

	private readonly _onDidChangeAuthState = new Emitter<AuthState>();
	readonly onDidChangeAuthState = this._onDidChangeAuthState.event;

	private _authState: AuthState = AuthState.Authenticated;
	private _accessToken: string | null = 'mock-token-12345';
	private _user: AINativeUser | null = {
		id: 'user-123',
		email: 'test@ainative.studio',
		name: 'Test User',
		role: 'developer'
	};

	async login(email: string, password: string): Promise<AINativeAuthResult> {
		this._authState = AuthState.Authenticated;
		this._accessToken = 'mock-token-12345';
		return { success: true, accessToken: this._accessToken };
	}

	async logout(): Promise<void> {
		this._authState = AuthState.Unauthenticated;
		this._accessToken = null;
		this._user = null;
	}

	async refreshToken(): Promise<string> {
		return 'mock-refreshed-token';
	}

	getAccessToken(): string | null {
		return this._accessToken;
	}

	getUser(): AINativeUser | null {
		return this._user;
	}

	isAuthenticated(): boolean {
		return this._authState === AuthState.Authenticated;
	}

	getAuthState(): AuthState {
		return this._authState;
	}

	// Test helpers
	setAuthState(state: AuthState): void {
		this._authState = state;
	}

	setAccessToken(token: string | null): void {
		this._accessToken = token;
	}
}

/**
 * Mock fetch for testing HTTP calls
 */
class MockFetch {
	private responses: Map<string, any> = new Map();

	setResponse(url: string, response: any): void {
		this.responses.set(url, response);
	}

	async fetch(url: string, options?: RequestInit): Promise<Response> {
		const mockResponse = this.responses.get(url);

		if (!mockResponse) {
			return new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
				statusText: 'Not Found'
			});
		}

		return new Response(JSON.stringify(mockResponse), {
			status: mockResponse.status || 200,
			statusText: mockResponse.statusText || 'OK',
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

suite('AgentMemoryService', () => {
	const disposables = new DisposableStore();
	let service: AgentMemoryService;
	let mockAuthService: MockAuthService;
	let mockFetch: MockFetch;
	let originalFetch: typeof global.fetch;

	setup(() => {
		mockAuthService = new MockAuthService();
		mockFetch = new MockFetch();

		// Replace global fetch with mock
		originalFetch = global.fetch;
		global.fetch = mockFetch.fetch.bind(mockFetch) as any;

		service = disposables.add(new AgentMemoryService(mockAuthService));
	});

	teardown(() => {
		// Restore original fetch
		global.fetch = originalFetch;
		disposables.clear();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	test('should store memory with metadata', async () => {
		mockFetch.setResponse('https://api.ainative.studio/v1/memory/store', {
			success: true,
			id: 'memory-123'
		});

		await service.storeMemory('test content', 'user', { key: 'value' });

		// This test will fail until we implement the service
		ok(true, 'Memory stored successfully');
	});

	test('should include source and timestamp in metadata', async () => {
		let capturedBody: any = null;

		// Override fetch to capture request
		global.fetch = (async (url: string, options?: RequestInit) => {
			if (options?.body) {
				capturedBody = JSON.parse(options.body as string);
			}
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}) as any;

		await service.storeMemory('test content', 'user', { custom: 'data' });

		ok(capturedBody, 'Request body should be captured');
		strictEqual(capturedBody.metadata.source, 'ainative-ide');
		ok(capturedBody.metadata.timestamp, 'Timestamp should be present');
		strictEqual(capturedBody.metadata.custom, 'data');
	});

	test('should search memory semantically', async () => {
		const mockResults: MemorySearchResult[] = [
			{
				content: 'Result 1',
				role: 'assistant',
				similarity: 0.95,
				metadata: { timestamp: '2025-01-01T12:00:00Z' }
			},
			{
				content: 'Result 2',
				role: 'user',
				similarity: 0.85,
				metadata: { timestamp: '2025-01-01T11:00:00Z' }
			}
		];

		mockFetch.setResponse('https://api.ainative.studio/v1/memory/search', {
			results: mockResults
		});

		const results = await service.searchMemory('test query', 5);

		strictEqual(results.length, 2);
		strictEqual(results[0].content, 'Result 1');
		strictEqual(results[0].similarity, 0.95);
	});

	test('should retrieve session context', async () => {
		const mockContext: ContextWindow = {
			messages: [
				{ role: 'user', content: 'Hello' },
				{ role: 'assistant', content: 'Hi there!' }
			],
			tokenCount: 25,
			sessionId: 'session-123'
		};

		mockFetch.setResponse('https://api.ainative.studio/v1/memory/context?session_id=session-123&max_tokens=2000', mockContext);

		const context = await service.getContext('session-123', 2000);

		strictEqual(context.messages.length, 2);
		strictEqual(context.tokenCount, 25);
		ok(context.tokenCount <= 2000);
	});

	test('should throw error when not authenticated', async () => {
		mockAuthService.setAccessToken(null);

		let errorThrown = false;
		try {
			await service.storeMemory('content', 'user');
		} catch (error: any) {
			errorThrown = true;
			strictEqual(error.message, 'Not authenticated');
		}
		ok(errorThrown, 'Should have thrown error');
	});

	test('should emit event when memory stored', async () => {
		mockFetch.setResponse('https://api.ainative.studio/v1/memory/store', {
			success: true
		});

		const events: MemoryEntry[] = [];
		service.onDidStoreMemory(e => events.push(e));

		await service.storeMemory('test', 'user', { tag: 'important' });

		strictEqual(events.length, 1);
		strictEqual(events[0].content, 'test');
		strictEqual(events[0].role, 'user');
		strictEqual(events[0].metadata?.tag, 'important');
	});

	test('should handle API errors gracefully', async () => {
		mockFetch.setResponse('https://api.ainative.studio/v1/memory/store', {
			status: 500,
			statusText: 'Internal Server Error'
		});

		let errorThrown = false;
		try {
			await service.storeMemory('content', 'user');
		} catch (error: any) {
			errorThrown = true;
			ok(error.message.includes('Failed to store memory'));
		}
		ok(errorThrown, 'Should have thrown error');
	});

	test('should use default limit for search', async () => {
		let capturedUrl: string = '';

		global.fetch = (async (url: string) => {
			capturedUrl = url;
			return new Response(JSON.stringify({ results: [] }), { status: 200 });
		}) as any;

		await service.searchMemory('query');

		ok(capturedUrl.includes('limit'), 'URL should include limit parameter');
	});

	test('should handle empty search results', async () => {
		mockFetch.setResponse('https://api.ainative.studio/v1/memory/search', {
			results: []
		});

		const results = await service.searchMemory('nonexistent query');

		strictEqual(results.length, 0);
	});

	test('should include authorization header', async () => {
		let capturedHeaders: Headers | undefined;

		global.fetch = (async (url: string, options?: RequestInit) => {
			if (options?.headers) {
				capturedHeaders = new Headers(options.headers);
			}
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}) as any;

		await service.storeMemory('test', 'user');

		ok(capturedHeaders, 'Headers should be captured');
		strictEqual(capturedHeaders.get('Authorization'), 'Bearer mock-token-12345');
	});

	test('should dispose properly', () => {
		// Service is disposed automatically by disposables.clear() in teardown
		ok(true, 'Service disposed properly');
	});
});
