/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ManagedChatAPIService, ManagedChatAPIError } from '../../common/managedChatAPIService.js';
import { CloudAuthState } from '../../common/ainativeCloudAuthTypes.js';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
/**
 * Mock AINativeCloudAuthService for testing
 */
class MockAINativeCloudAuthService {
    constructor(shouldFail = false) {
        this.shouldFail = shouldFail;
        this.onDidChangeAuthState = Event.None;
        this.onDidUpdateUser = Event.None;
        this._accessToken = 'mock-access-token';
        this._refreshCount = 0;
    }
    async getAccessToken() {
        if (this.shouldFail) {
            return null;
        }
        return this._accessToken;
    }
    getAccessTokenSync() {
        return this._accessToken;
    }
    async refreshToken() {
        this._refreshCount++;
        this._accessToken = `mock-refreshed-token-${this._refreshCount}`;
        return this._accessToken;
    }
    getRefreshCount() {
        return this._refreshCount;
    }
    // Stub methods (not used in tests)
    async register() { return { success: false }; }
    async login() { return { success: false }; }
    async logout() { }
    async requestPasswordReset() { return { success: false }; }
    async confirmPasswordReset() { return { success: false }; }
    async changePassword() { return { success: false }; }
    async validateToken() { return { valid: false }; }
    async getCurrentUser() { return null; }
    getUser() { return null; }
    isAuthenticated() { return true; }
    getAuthState() { return CloudAuthState.Authenticated; }
    async resendEmailVerification() { return { success: false }; }
    async verifyEmail() { return { success: false }; }
}
/**
 * Mock fetch function for testing
 */
class FetchMock {
    constructor() {
        this.responses = new Map();
        this.callCount = 0;
    }
    setResponse(url, response) {
        this.responses.set(url, response);
    }
    async fetch(url, options) {
        this.callCount++;
        const mockResponse = this.responses.get(url);
        if (!mockResponse) {
            return this.createResponse(404, { error: { code: 'not_found', message: 'Endpoint not found' } });
        }
        // Handle rate limiting simulation
        if (mockResponse.statusCode === 429 && this.callCount < 3) {
            return this.createResponse(429, { error: { code: 'rate_limited', message: 'Too many requests' } });
        }
        return this.createResponse(mockResponse.statusCode || 200, mockResponse.data);
    }
    createResponse(status, data) {
        return {
            ok: status >= 200 && status < 300,
            status,
            json: async () => data,
            headers: new Headers(),
            body: null,
            bodyUsed: false,
            redirected: false,
            statusText: '',
            type: 'basic',
            url: '',
            clone: () => this.createResponse(status, data),
            arrayBuffer: async () => new ArrayBuffer(0),
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            text: async () => JSON.stringify(data),
            bytes: async () => new Uint8Array()
        };
    }
    reset() {
        this.responses.clear();
        this.callCount = 0;
    }
    getCallCount() {
        return this.callCount;
    }
}
suite('ManagedChatAPIService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    let mockAuthService;
    let fetchMock;
    let originalFetch;
    setup(() => {
        mockAuthService = new MockAINativeCloudAuthService();
        service = disposables.add(new ManagedChatAPIService(mockAuthService));
        fetchMock = new FetchMock();
        originalFetch = global.fetch;
        global.fetch = fetchMock.fetch.bind(fetchMock);
    });
    teardown(() => {
        global.fetch = originalFetch;
        fetchMock.reset();
    });
    suite('sendChatCompletion', () => {
        test('should send chat completion request successfully', async () => {
            const mockResponse = {
                id: 'chatcmpl-abc123',
                model: 'llama-3.3-70b-instruct',
                provider: 'meta',
                created: 1704592800,
                choices: [{
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'Hello! How can I help you?'
                        },
                        finish_reason: 'stop'
                    }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 8,
                    total_tokens: 18
                },
                credits_consumed: 0.51,
                credits_remaining: 999.49,
                plan_tier: 'basic',
                finish_reason: 'stop'
            };
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/chat/completions', { statusCode: 200, data: mockResponse });
            const request = {
                messages: [
                    { role: 'user', content: 'Hello' }
                ],
                preferred_model: 'llama-3.3-70b-instruct'
            };
            const response = await service.sendChatCompletion(request);
            assert.strictEqual(response.id, 'chatcmpl-abc123');
            assert.strictEqual(response.model, 'llama-3.3-70b-instruct');
            assert.strictEqual(response.credits_consumed, 0.51);
            assert.strictEqual(response.choices[0].message.content, 'Hello! How can I help you?');
        });
        test('should handle insufficient credits error (402)', async () => {
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/chat/completions', {
                statusCode: 402,
                data: {
                    error: {
                        code: 'insufficient_credits',
                        message: 'Insufficient credits',
                        details: {
                            credits_required: 0.5,
                            upgrade_url: 'https://www.ainative.studio/pricing'
                        }
                    }
                }
            });
            const request = {
                messages: [{ role: 'user', content: 'Hello' }]
            };
            try {
                await service.sendChatCompletion(request);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof ManagedChatAPIError);
                assert.strictEqual(error.statusCode, 402);
                assert.ok(error.isInsufficientCredits());
                assert.strictEqual(error.getUpgradeURL(), 'https://www.ainative.studio/pricing');
            }
        });
        test('should handle model not available error (403)', async () => {
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/chat/completions', {
                statusCode: 403,
                data: {
                    error: {
                        code: 'model_not_available',
                        message: 'Model not available for your plan',
                        details: {
                            upgrade_url: 'https://www.ainative.studio/pricing'
                        }
                    }
                }
            });
            const request = {
                messages: [{ role: 'user', content: 'Hello' }],
                preferred_model: 'claude-opus-4'
            };
            try {
                await service.sendChatCompletion(request);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof ManagedChatAPIError);
                assert.strictEqual(error.statusCode, 403);
                assert.ok(error.isModelNotAvailable());
            }
        });
        test('should retry on rate limiting (429)', async () => {
            const mockResponse = {
                id: 'chatcmpl-retry',
                model: 'llama-3.3-70b-instruct',
                provider: 'meta',
                created: 1704592800,
                choices: [{
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'Success after retry'
                        },
                        finish_reason: 'stop'
                    }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15
                },
                credits_consumed: 0.51,
                credits_remaining: 999.49,
                plan_tier: 'basic',
                finish_reason: 'stop'
            };
            // First 2 calls return 429, 3rd succeeds
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/chat/completions', { statusCode: 429, data: mockResponse });
            // After retries, set success response
            setTimeout(() => {
                fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/chat/completions', { statusCode: 200, data: mockResponse });
            }, 100);
            const request = {
                messages: [{ role: 'user', content: 'Hello' }]
            };
            const response = await service.sendChatCompletion(request);
            assert.ok(fetchMock.getCallCount() >= 1);
            assert.strictEqual(response.choices[0].message.content, 'Success after retry');
        });
        test('should handle authentication error and refresh token', async () => {
            const mockResponse = {
                id: 'chatcmpl-auth',
                model: 'llama-3.3-70b-instruct',
                provider: 'meta',
                created: 1704592800,
                choices: [{
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'Success after token refresh'
                        },
                        finish_reason: 'stop'
                    }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15
                },
                credits_consumed: 0.51,
                credits_remaining: 999.49,
                plan_tier: 'basic',
                finish_reason: 'stop'
            };
            // First call returns 401, second succeeds
            let callCount = 0;
            const originalFetch = fetchMock.fetch.bind(fetchMock);
            fetchMock.fetch = async (url, options) => {
                callCount++;
                if (callCount === 1) {
                    return fetchMock['createResponse'](401, {
                        error: { code: 'token_expired', message: 'Token expired' }
                    });
                }
                return originalFetch(url, options);
            };
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/chat/completions', { statusCode: 200, data: mockResponse });
            const request = {
                messages: [{ role: 'user', content: 'Hello' }]
            };
            const response = await service.sendChatCompletion(request);
            assert.strictEqual(mockAuthService.getRefreshCount(), 1);
            assert.strictEqual(response.choices[0].message.content, 'Success after token refresh');
        });
        test('should throw error if not authenticated', async () => {
            const unauthenticatedService = disposables.add(new ManagedChatAPIService(new MockAINativeCloudAuthService(true)));
            const request = {
                messages: [{ role: 'user', content: 'Hello' }]
            };
            try {
                await unauthenticatedService.sendChatCompletion(request);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof ManagedChatAPIError);
                assert.strictEqual(error.statusCode, 401);
                assert.strictEqual(error.code, 'not_authenticated');
            }
        });
    });
    suite('getUserUsage', () => {
        test('should get current usage statistics', async () => {
            const mockUsage = {
                period: 'monthly',
                credits_used: 350.0,
                credits_remaining: 650.0,
                requests_count: 145,
                total_tokens: 125000,
                models_used: {
                    'llama-3.3-70b-instruct': 100,
                    'llama-3.3-8b-instruct': 45
                }
            };
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/usage?period=monthly', { statusCode: 200, data: mockUsage });
            const usage = await service.getUserUsage('monthly');
            assert.strictEqual(usage.period, 'monthly');
            assert.strictEqual(usage.credits_used, 350.0);
            assert.strictEqual(usage.credits_remaining, 650.0);
            assert.strictEqual(usage.requests_count, 145);
        });
    });
    suite('getUsageHistory', () => {
        test('should get usage history', async () => {
            const mockHistory = {
                history: [
                    { date: '2026-01-05', requests: 25, credits_used: 18.5, tokens: 15000 },
                    { date: '2026-01-04', requests: 30, credits_used: 22.0, tokens: 18000 }
                ]
            };
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/usage/history?days=30', { statusCode: 200, data: mockHistory });
            const history = await service.getUsageHistory(30);
            assert.strictEqual(history.history.length, 2);
            assert.strictEqual(history.history[0].date, '2026-01-05');
            assert.strictEqual(history.history[0].requests, 25);
        });
        test('should validate days parameter', async () => {
            try {
                await service.getUsageHistory(400);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('between 1 and 365'));
            }
        });
    });
    suite('getModelDistribution', () => {
        test('should get model distribution statistics', async () => {
            const mockDistribution = {
                total_requests: 145,
                models: [
                    { model: 'llama-3.3-70b-instruct', requests: 100, percentage: 69.0 },
                    { model: 'llama-3.3-8b-instruct', requests: 45, percentage: 31.0 }
                ]
            };
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/models?period=monthly', { statusCode: 200, data: mockDistribution });
            const distribution = await service.getModelDistribution('monthly');
            assert.strictEqual(distribution.total_requests, 145);
            assert.strictEqual(distribution.models.length, 2);
            assert.strictEqual(distribution.models[0].model, 'llama-3.3-70b-instruct');
        });
    });
    suite('estimateCost', () => {
        test('should estimate cost for a request', async () => {
            const mockEstimate = {
                model: 'llama-3.3-70b-instruct',
                estimated_tokens: 2500,
                estimated_credits: 0.625,
                credits_available: 1000,
                can_afford: true
            };
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/estimate', { statusCode: 200, data: mockEstimate });
            const estimate = await service.estimateCost('llama-3.3-70b-instruct', 2500);
            assert.strictEqual(estimate.model, 'llama-3.3-70b-instruct');
            assert.strictEqual(estimate.estimated_tokens, 2500);
            assert.strictEqual(estimate.estimated_credits, 0.625);
            assert.strictEqual(estimate.can_afford, true);
        });
    });
    suite('checkCreditsAvailable', () => {
        test('should return true if sufficient credits', async () => {
            const mockUsage = {
                period: 'monthly',
                credits_used: 350.0,
                credits_remaining: 650.0,
                requests_count: 145,
                total_tokens: 125000,
                models_used: {}
            };
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/usage?period=monthly', { statusCode: 200, data: mockUsage });
            const hasCredits = await service.checkCreditsAvailable(100);
            assert.strictEqual(hasCredits, true);
        });
        test('should return false if insufficient credits', async () => {
            const mockUsage = {
                period: 'monthly',
                credits_used: 950.0,
                credits_remaining: 50.0,
                requests_count: 145,
                total_tokens: 125000,
                models_used: {}
            };
            fetchMock.setResponse('https://api.ainative.studio/api/v1/managed/usage?period=monthly', { statusCode: 200, data: mockUsage });
            const hasCredits = await service.checkCreditsAvailable(100);
            assert.strictEqual(hasCredits, false);
        });
    });
    suite('ManagedChatAPIError', () => {
        test('should detect insufficient credits error', () => {
            const error = new ManagedChatAPIError(402, 'insufficient_credits', 'Insufficient credits');
            assert.ok(error.isInsufficientCredits());
            assert.ok(!error.isModelNotAvailable());
            assert.ok(!error.isRateLimited());
            assert.ok(!error.isAuthError());
        });
        test('should detect model not available error', () => {
            const error = new ManagedChatAPIError(403, 'model_not_available', 'Model not available');
            assert.ok(!error.isInsufficientCredits());
            assert.ok(error.isModelNotAvailable());
            assert.ok(!error.isRateLimited());
            assert.ok(!error.isAuthError());
        });
        test('should detect rate limit error', () => {
            const error = new ManagedChatAPIError(429, 'rate_limited', 'Rate limited');
            assert.ok(!error.isInsufficientCredits());
            assert.ok(!error.isModelNotAvailable());
            assert.ok(error.isRateLimited());
            assert.ok(!error.isAuthError());
        });
        test('should detect auth error', () => {
            const error = new ManagedChatAPIError(401, 'token_expired', 'Token expired');
            assert.ok(!error.isInsufficientCredits());
            assert.ok(!error.isModelNotAvailable());
            assert.ok(!error.isRateLimited());
            assert.ok(error.isAuthError());
        });
        test('should extract upgrade URL from details', () => {
            const error = new ManagedChatAPIError(402, 'insufficient_credits', 'Insufficient credits', { upgrade_url: 'https://www.ainative.studio/pricing' });
            assert.strictEqual(error.getUpgradeURL(), 'https://www.ainative.studio/pricing');
        });
    });
    suite('sendStreamingChatCompletion', () => {
        /**
         * Create a mock streaming response using ReadableStream
         */
        function createStreamingResponse(events) {
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    for (const event of events) {
                        controller.enqueue(encoder.encode(event + '\n'));
                        // Small delay to simulate network latency
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                    controller.close();
                }
            });
            return {
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'text/event-stream' }),
                body: stream,
                json: async () => ({}),
                text: async () => '',
                arrayBuffer: async () => new ArrayBuffer(0),
                blob: async () => new Blob(),
                formData: async () => new FormData(),
                bytes: async () => new Uint8Array(),
                clone: () => createStreamingResponse(events),
                bodyUsed: false,
                redirected: false,
                statusText: 'OK',
                type: 'basic',
                url: ''
            };
        }
        test('should stream text chunks successfully', async () => {
            const events = [
                'data: {"type":"chunk","delta":"Hello","index":0}',
                'data: {"type":"chunk","delta":" world","index":1}',
                'data: {"type":"done","finish_reason":"stop"}',
                'data: [DONE]'
            ];
            global.fetch = async () => createStreamingResponse(events);
            const receivedEvents = [];
            const request = {
                messages: [{ role: 'user', content: 'Hi' }],
                stream: true
            };
            await service.sendStreamingChatCompletion(request, (event) => {
                receivedEvents.push(event);
            });
            // Wait for streaming to complete
            await new Promise(resolve => setTimeout(resolve, 200));
            assert.strictEqual(receivedEvents.length, 3);
            assert.strictEqual(receivedEvents[0].type, 'chunk');
            assert.strictEqual(receivedEvents[0].delta, 'Hello');
            assert.strictEqual(receivedEvents[1].type, 'chunk');
            assert.strictEqual(receivedEvents[1].delta, ' world');
            assert.strictEqual(receivedEvents[2].type, 'done');
        });
        test('should handle tool execution events', async () => {
            const events = [
                'data: {"type":"chunk","delta":"Let me search for that","index":0}',
                'data: {"type":"tool_start","tool_name":"web_fetch","tool_id":"tool-123","parameters":{"url":"https://example.com"}}',
                'data: {"type":"tool_progress","tool_id":"tool-123","progress":50,"message":"Fetching URL..."}',
                'data: {"type":"tool_complete","tool_id":"tool-123","result":"Success","success":true}',
                'data: {"type":"chunk","delta":"Here is what I found","index":1}',
                'data: {"type":"done","finish_reason":"stop"}',
                'data: [DONE]'
            ];
            global.fetch = async () => createStreamingResponse(events);
            const receivedEvents = [];
            const request = {
                messages: [{ role: 'user', content: 'Search for something' }],
                stream: true
            };
            await service.sendStreamingChatCompletion(request, (event) => {
                receivedEvents.push(event);
            });
            await new Promise(resolve => setTimeout(resolve, 200));
            assert.ok(receivedEvents.some(e => e.type === 'tool_start'));
            assert.ok(receivedEvents.some(e => e.type === 'tool_progress'));
            assert.ok(receivedEvents.some(e => e.type === 'tool_complete'));
            const toolStart = receivedEvents.find(e => e.type === 'tool_start');
            assert.strictEqual(toolStart.tool_name, 'web_fetch');
            assert.strictEqual(toolStart.tool_id, 'tool-123');
        });
        test('should handle thinking/reasoning events', async () => {
            const events = [
                'data: {"type":"thinking","content":"I need to analyze this request..."}',
                'data: {"type":"chunk","delta":"Based on my analysis","index":0}',
                'data: {"type":"done","finish_reason":"stop"}',
                'data: [DONE]'
            ];
            global.fetch = async () => createStreamingResponse(events);
            const receivedEvents = [];
            const request = {
                messages: [{ role: 'user', content: 'Analyze this' }],
                stream: true
            };
            await service.sendStreamingChatCompletion(request, (event) => {
                receivedEvents.push(event);
            });
            await new Promise(resolve => setTimeout(resolve, 200));
            const thinkingEvent = receivedEvents.find(e => e.type === 'thinking');
            assert.ok(thinkingEvent);
            assert.strictEqual(thinkingEvent.content, 'I need to analyze this request...');
        });
        test('should handle stream abortion', async () => {
            const events = [
                'data: {"type":"chunk","delta":"This is a long","index":0}',
                'data: {"type":"chunk","delta":" response that","index":1}',
                'data: {"type":"chunk","delta":" will be interrupted","index":2}',
            ];
            // Create a stream that never completes
            global.fetch = async () => createStreamingResponse(events);
            const receivedEvents = [];
            const request = {
                messages: [{ role: 'user', content: 'Tell me a story' }],
                stream: true
            };
            const { abort } = await service.sendStreamingChatCompletion(request, (event) => {
                receivedEvents.push(event);
            });
            // Wait a bit for some events to arrive
            await new Promise(resolve => setTimeout(resolve, 50));
            // Abort the stream
            abort();
            // Wait to ensure no more events come through
            const eventCountBeforeWait = receivedEvents.length;
            await new Promise(resolve => setTimeout(resolve, 100));
            const eventCountAfterWait = receivedEvents.length;
            // Event count should not increase after abort
            assert.strictEqual(eventCountBeforeWait, eventCountAfterWait);
        });
        test('should handle streaming errors', async () => {
            global.fetch = async () => {
                return {
                    ok: false,
                    status: 500,
                    json: async () => ({
                        error: {
                            code: 'internal_error',
                            message: 'Internal server error'
                        }
                    }),
                    headers: new Headers(),
                    body: null,
                    bodyUsed: false,
                    redirected: false,
                    statusText: 'Internal Server Error',
                    type: 'basic',
                    url: '',
                    clone: () => { throw new Error('Cannot clone'); },
                    arrayBuffer: async () => new ArrayBuffer(0),
                    blob: async () => new Blob(),
                    formData: async () => new FormData(),
                    text: async () => '',
                    bytes: async () => new Uint8Array()
                };
            };
            const request = {
                messages: [{ role: 'user', content: 'Hello' }],
                stream: true
            };
            let errorReceived = false;
            await service.sendStreamingChatCompletion(request, () => { }, (error) => {
                errorReceived = true;
                assert.ok(error instanceof ManagedChatAPIError);
            });
            await new Promise(resolve => setTimeout(resolve, 100));
            assert.ok(errorReceived, 'Error callback should have been called');
        });
        test('should handle malformed SSE events gracefully', async () => {
            const events = [
                'data: {"type":"chunk","delta":"Valid event","index":0}',
                'data: {invalid json}', // Malformed JSON
                'data: {"type":"chunk","delta":"Another valid event","index":1}',
                'data: [DONE]'
            ];
            global.fetch = async () => createStreamingResponse(events);
            const receivedEvents = [];
            let errorCount = 0;
            const request = {
                messages: [{ role: 'user', content: 'Test' }],
                stream: true
            };
            await service.sendStreamingChatCompletion(request, (event) => {
                receivedEvents.push(event);
            }, () => {
                errorCount++;
            });
            await new Promise(resolve => setTimeout(resolve, 200));
            // Should still receive valid events despite malformed ones
            assert.ok(receivedEvents.length >= 2);
            assert.strictEqual(receivedEvents[0].delta, 'Valid event');
        });
        test('should handle token refresh during streaming', async () => {
            let callCount = 0;
            global.fetch = async () => {
                callCount++;
                if (callCount === 1) {
                    // First call returns 401
                    return {
                        ok: false,
                        status: 401,
                        json: async () => ({
                            error: { code: 'token_expired', message: 'Token expired' }
                        }),
                        headers: new Headers(),
                        body: null,
                        bodyUsed: false,
                        redirected: false,
                        statusText: 'Unauthorized',
                        type: 'basic',
                        url: '',
                        clone: () => { throw new Error('Cannot clone'); },
                        arrayBuffer: async () => new ArrayBuffer(0),
                        blob: async () => new Blob(),
                        formData: async () => new FormData(),
                        text: async () => '',
                        bytes: async () => new Uint8Array()
                    };
                }
                // Second call succeeds
                return createStreamingResponse([
                    'data: {"type":"chunk","delta":"Success after refresh","index":0}',
                    'data: [DONE]'
                ]);
            };
            const receivedEvents = [];
            const request = {
                messages: [{ role: 'user', content: 'Test' }],
                stream: true
            };
            await service.sendStreamingChatCompletion(request, (event) => {
                receivedEvents.push(event);
            });
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for retry
            assert.strictEqual(mockAuthService.getRefreshCount(), 1);
            assert.ok(receivedEvents.length > 0);
        });
        test('should handle done event with usage statistics', async () => {
            const events = [
                'data: {"type":"chunk","delta":"Response text","index":0}',
                `data: {"type":"done","finish_reason":"stop","usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15},"credits_consumed":0.5,"credits_remaining":999.5}`,
                'data: [DONE]'
            ];
            global.fetch = async () => createStreamingResponse(events);
            const receivedEvents = [];
            const request = {
                messages: [{ role: 'user', content: 'Test' }],
                stream: true
            };
            await service.sendStreamingChatCompletion(request, (event) => {
                receivedEvents.push(event);
            });
            await new Promise(resolve => setTimeout(resolve, 200));
            const doneEvent = receivedEvents.find(e => e.type === 'done');
            assert.ok(doneEvent);
            assert.strictEqual(doneEvent.finish_reason, 'stop');
            assert.ok(doneEvent.usage);
            assert.strictEqual(doneEvent.usage.total_tokens, 15);
            assert.strictEqual(doneEvent.credits_consumed, 0.5);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlZENoYXRBUElTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL21hbmFnZWRDaGF0QVBJU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBNkIsTUFBTSx1Q0FBdUMsQ0FBQztBQUM5SCxPQUFPLEVBQTZCLGNBQWMsRUFBYSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRzs7R0FFRztBQUNILE1BQU0sNEJBQTRCO0lBU2pDLFlBQW9CLGFBQXNCLEtBQUs7UUFBM0IsZUFBVSxHQUFWLFVBQVUsQ0FBaUI7UUFOL0MseUJBQW9CLEdBQTBCLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDekQsb0JBQWUsR0FBcUIsS0FBSyxDQUFDLElBQUksQ0FBQztRQUV2QyxpQkFBWSxHQUFrQixtQkFBbUIsQ0FBQztRQUNsRCxrQkFBYSxHQUFHLENBQUMsQ0FBQztJQUV5QixDQUFDO0lBRXBELEtBQUssQ0FBQyxjQUFjO1FBQ25CLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0lBRUQsS0FBSyxD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