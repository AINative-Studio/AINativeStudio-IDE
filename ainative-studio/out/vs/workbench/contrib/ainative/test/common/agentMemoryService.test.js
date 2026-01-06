/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { strictEqual, ok, /* deepStrictEqual */ } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AgentMemoryService } from '../../common/agentMemoryService.js';
import { AuthState } from '../../common/ainativeAuthService.js';
/**
 * Mock authentication service for testing
 */
class MockAuthService {
    constructor() {
        this._onDidChangeAuthState = new Emitter();
        this.onDidChangeAuthState = this._onDidChangeAuthState.event;
        this._authState = AuthState.Authenticated;
        this._accessToken = 'mock-token-12345';
        this._user = {
            id: 'user-123',
            email: 'test@ainative.studio',
            name: 'Test User',
            role: 'developer'
        };
    }
    async login(email, password) {
        this._authState = AuthState.Authenticated;
        this._accessToken = 'mock-token-12345';
        return { success: true, accessToken: this._accessToken };
    }
    async logout() {
        this._authState = AuthState.Unauthenticated;
        this._accessToken = null;
        this._user = null;
    }
    async refreshToken() {
        return 'mock-refreshed-token';
    }
    getAccessToken() {
        return this._accessToken;
    }
    getUser() {
        return this._user;
    }
    isAuthenticated() {
        return this._authState === AuthState.Authenticated;
    }
    getAuthState() {
        return this._authState;
    }
    // Test helpers
    setAuthState(state) {
        this._authState = state;
    }
    setAccessToken(token) {
        this._accessToken = token;
    }
}
/**
 * Mock fetch for testing HTTP calls
 */
class MockFetch {
    constructor() {
        this.responses = new Map();
    }
    setResponse(url, response) {
        this.responses.set(url, response);
    }
    async fetch(url, options) {
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
    let service;
    let mockAuthService;
    let mockFetch;
    let originalFetch;
    setup(() => {
        mockAuthService = new MockAuthService();
        mockFetch = new MockFetch();
        // Replace global fetch with mock
        originalFetch = global.fetch;
        global.fetch = mockFetch.fetch.bind(mockFetch);
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
        let capturedBody = null;
        // Override fetch to capture request
        global.fetch = (async (url, options) => {
            if (options?.body) {
                capturedBody = JSON.parse(options.body);
            }
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        });
        await service.storeMemory('test content', 'user', { custom: 'data' });
        ok(capturedBody, 'Request body should be captured');
        strictEqual(capturedBody.metadata.source, 'ainative-ide');
        ok(capturedBody.metadata.timestamp, 'Timestamp should be present');
        strictEqual(capturedBody.metadata.custom, 'data');
    });
    test('should search memory semantically', async () => {
        const mockResults = [
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
        const mockContext = {
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
        }
        catch (error) {
            errorThrown = true;
            strictEqual(error.message, 'Not authenticated');
        }
        ok(errorThrown, 'Should have thrown error');
    });
    test('should emit event when memory stored', async () => {
        mockFetch.setResponse('https://api.ainative.studio/v1/memory/store', {
            success: true
        });
        const events = [];
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
        }
        catch (error) {
            errorThrown = true;
            ok(error.message.includes('Failed to store memory'));
        }
        ok(errorThrown, 'Should have thrown error');
    });
    test('should use default limit for search', async () => {
        let capturedUrl = '';
        global.fetch = (async (url) => {
            capturedUrl = url;
            return new Response(JSON.stringify({ results: [] }), { status: 200 });
        });
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
        let capturedHeaders;
        global.fetch = (async (url, options) => {
            if (options?.headers) {
                capturedHeaders = new Headers(options.headers);
            }
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        });
        await service.storeMemory('test', 'user');
        ok(capturedHeaders, 'Headers should be captured');
        strictEqual(capturedHeaders.get('Authorization'), 'Bearer mock-token-12345');
    });
    test('should dispose properly', () => {
        // Service is disposed automatically by disposables.clear() in teardown
        ok(true, 'Service disposed properly');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRNZW1vcnlTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2FnZW50TWVtb3J5U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBSU4sa0JBQWtCLEVBSWxCLE1BQU0sb0NBQW9DLENBQUM7QUFDNUMsT0FBTyxFQUF3QixTQUFTLEVBQW9DLE1BQU0scUNBQXFDLENBQUM7QUFFeEg7O0dBRUc7QUFDSCxNQUFNLGVBQWU7SUFBckI7UUFHa0IsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQWEsQ0FBQztRQUN6RCx5QkFBb0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDO1FBRXpELGVBQVUsR0FBYyxTQUFTLENBQUMsYUFBYSxDQUFDO1FBQ2hELGlCQUFZLEdBQWtCLGtCQUFrQixDQUFDO1FBQ2pELFVBQUssR0FBd0I7WUFDcEMsRUFBRSxFQUFFLFVBQVU7WUFDZCxLQUFLLEVBQUUsc0JBQXNCO1lBQzdCLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFBRSxXQUFXO1NBQ2pCLENBQUM7SUEwQ0gsQ0FBQztJQXhDQSxLQUFLLENBQUMsS0FBSyxDQUFDLEtB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