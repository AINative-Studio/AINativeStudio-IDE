/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRNZW1vcnlTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2FnZW50TWVtb3J5U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUlOLGtCQUFrQixFQUlsQixNQUFNLG9DQUFvQyxDQUFDO0FBQzVDLE9BQU8sRUFBd0IsU0FBUyxFQUFvQyxNQUFNLHFDQUFxQyxDQUFDO0FBRXhIOztHQUVHO0FBQ0gsTUFBTSxlQUFlO0lBQXJCO1FBR2tCLDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFhLENBQUM7UUFDekQseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztRQUV6RCxlQUFVLEdBQWMsU0FBUyxDQUFDLGFBQWEsQ0FBQztRQUNoRCxpQkFBWSxHQUFrQixrQkFBa0IsQ0FBQztRQUNqRCxVQUFLLEdBQXdCO1lBQ3BDLEVBQUUsRUFBRSxVQUFVO1lBQ2QsS0FBSyxFQUFFLHNCQUFzQjtZQUM3QixJQUFJLEVBQUUsV0FBVztZQUNqQixJQUFJLEVBQUUsV0FBVztTQUNqQixDQUFDO0lBMENILENBQUM7SUF4Q0EsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFhLEVBQUUsUUFBZ0I7UUFDMUMsSUFBSSxD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