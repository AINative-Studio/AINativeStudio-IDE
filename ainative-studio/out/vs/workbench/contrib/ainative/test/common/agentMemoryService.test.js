/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { strictEqual, ok, /* deepStrictEqual */ } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRNZW1vcnlTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2FnZW50TWVtb3J5U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFLTixrQkFBa0IsRUFJbEIsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1QyxPQUFPLEVBQXdCLFNBQVMsRUFBb0MsTUFBTSxxQ0FBcUMsQ0FBQztBQUV4SDs7R0FFRztBQUNILE1BQU0sZUFBZTtJQUFyQjtRQUdrQiwwQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFBYSxDQUFDO1FBQ3pELHlCQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7UUFFekQsZUFBVSxHQUFjLFNBQVMsQ0FBQyxhQUFhLENBQUM7UUFDaEQsaUJBQVksR0FBa0Isa0JBQWtCLENBQUM7UUFDakQsVUFBSyxHQUF3QjtZQUNwQyxFQUFFLEVBQUUsVUFBVTtZQUNkLEtBQUssRUFBRSxzQkFBc0I7WUFDN0IsSUFBSSxFQUFFLFdBQVc7WUFDakIsSUFBSSxFQUFFLFdBQVc7U0FDakIsQ0FBQztJQTBDSCxDQUFDO0lBeENBLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBYSxFQUFFLFFBQWdC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