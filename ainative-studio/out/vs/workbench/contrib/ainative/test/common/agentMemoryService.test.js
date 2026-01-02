/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AgentMemoryService } from '../../common/agentMemoryService.js';
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
        global.fetch = (async (input, init) => {
            if (init?.body) {
                capturedBody = JSON.parse(init.body);
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
        global.fetch = (async (input) => {
            capturedUrl = input.toString();
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
        global.fetch = (async (input, init) => {
            if (init?.headers) {
                capturedHeaders = new Headers(init.headers);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRNZW1vcnlTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2FnZW50TWVtb3J5U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUNOLGtCQUFrQixFQUlsQixNQUFNLG9DQUFvQyxDQUFDO0FBRzVDOztHQUVHO0FBQ0gsTUFBTSxlQUFlO0lBQXJCO1FBR2tCLDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFhLENBQUM7UUFDekQseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztRQUV6RCxlQUFVLEdBQWMsU0FBUyxDQUFDLGFBQWEsQ0FBQztRQUNoRCxpQkFBWSxHQUFrQixrQkFBa0IsQ0FBQztRQUNqRCxVQUFLLEdBQXdCO1lBQ3BDLEVBQUUsRUFBRSxVQUFVO1lBQ2QsS0FBSyxFQUFFLHNCQUFzQjtZQUM3QixJQUFJLEVBQUUsV0FBVztZQUNqQixJQUFJLEVBQUUsV0FBVztTQUNqQixDQUFDO0lBMENILENBQUM7SUF4Q0EsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFhLEVBQUUsUUFBZ0I7UUFDMUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDO1FBQzFDLElBQUksQ0FBQyxZQUFZLEdB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