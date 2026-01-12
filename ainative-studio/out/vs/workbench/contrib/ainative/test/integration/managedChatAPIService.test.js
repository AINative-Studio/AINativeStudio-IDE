/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Integration tests for ManagedChatAPIService
 * Tests the entire flow of API communication, JWT authentication, error handling, and retry logic
 */
import * as assert from 'assert';
import { ManagedChatAPIService, ManagedChatAPIError } from '../../common/managedChatAPIService.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
/**
 * Mock authentication service for testing
 */
class MockAuthService {
    constructor() {
        this._accessToken = 'mock_access_token';
        this._shouldFailRefresh = false;
        this._onDidChangeAuthState = { event: () => ({ dispose: () => { } }) };
        // Mock events
        this.onDidChangeAuthState = this._onDidChangeAuthState.event;
        // Stub other methods
        this.onDidUpdateUser = () => ({ dispose: () => { } });
    }
    async getAccessToken() {
        return this._accessToken;
    }
    async refreshToken() {
        if (this._shouldFailRefresh) {
            throw new Error('Token refresh failed');
        }
        this._accessToken = 'new_mock_access_token';
        return this._accessToken;
    }
    isAuthenticated() {
        return this._accessToken !== null;
    }
    setAccessToken(token) {
        this._accessToken = token;
    }
    setShouldFailRefresh(shouldFail) {
        this._shouldFailRefresh = shouldFail;
    }
    async register() { return { success: true }; }
    async login() { return { success: true }; }
    async logout() { }
    async requestPasswordReset() { return { success: true }; }
    async confirmPasswordReset() { return { success: true }; }
    async changePassword() { return { success: true }; }
    async validateToken() { return { valid: true }; }
    getAccessTokenSync() { return this._accessToken; }
    async getCurrentUser() { return null; }
    getUser() { return null; }
    getAuthState() { return this._accessToken ? 'authenticated' : 'unauthenticated'; }
    async resendEmailVerification() { return { success: true }; }
    async verifyEmail() { return { success: true }; }
}
/**
 * Mock fetch function for testing
 */
let mockFetchResponses = [];
let mockFetchCallCount = 0;
const originalFetch = global.fetch;
function setupMockFetch() {
    mockFetchCallCount = 0;
    global.fetch = async (url, init) => {
        mockFetchCallCount++;
        const responseConfig = mockFetchResponses[mockFetchCallCount - 1] || { status: 200, body: {} };
        const response = {
            ok: responseConfig.status >= 200 && responseConfig.status < 300,
            status: responseConfig.status,
            statusText: responseConfig.status === 200 ? 'OK' : 'Error',
            headers: new Map(Object.entries(responseConfig.headers || {})),
            json: async () => responseConfig.body,
            body: null
        };
        return Promise.resolve(response);
    };
}
function teardownMockFetch() {
    global.fetch = originalFetch;
    mockFetchResponses = [];
    mockFetchCallCount = 0;
}
suite('ManagedChatAPIService - Integration Tests', () => {
    let authService;
    let chatAPIService;
    setup(() => {
        authService = new MockAuthService();
        chatAPIService = new ManagedChatAPIService(authService);
        setupMockFetch();
    });
    teardown(() => {
        teardownMockFetch();
        if (chatAPIService instanceof Disposable) {
            chatAPIService.dispose();
        }
    });
    suite('Authentication Flow', () => {
        test('should successfully send chat completion with valid token', async () => {
            mockFetchResponses = [{
                    status: 200,
                    body: {
                        id: 'chatcmpl-123',
                        model: 'llama-3.3-70b-instruct',
                        provider: 'groq',
                        created: Date.now(),
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
                        credits_consumed: 0.05,
                        credits_remaining: 999.95,
                        plan_tier: 'free',
                        finish_reason: 'stop'
                    }
                }];
            const request = {
                messages: [{ role: 'user', content: 'Hello' }],
                stream: false
            };
            const response = await chatAPIService.sendChatCompletion(request);
            assert.strictEqual(mockFetchCallCount, 1);
            assert.strictEqual(response.id, 'chatcmpl-123');
            assert.strictEqual(response.choices[0].message.content, 'Hello! How can I help you?');
            assert.strictEqual(response.credits_consumed, 0.05);
        });
        test('should handle 401 error and retry with refreshed token', async () => {
            mockFetchResponses = [
                {
                    status: 401,
                    body: {
                        error: {
                            code: 'token_expired',
                            message: 'Access token has expired'
                        }
                    }
                },
                {
                    status: 200,
                    body: {
                        id: 'chatcmpl-456',
                        model: 'llama-3.3-70b-instruct',
                        provider: 'groq',
                        created: Date.now(),
                        choices: [{
                                index: 0,
                                message: {
                                    role: 'assistant',
                                    content: 'Token refreshed successfully'
                                },
                                finish_reason: 'stop'
                            }],
                        usage: {
                            prompt_tokens: 10,
                            completion_tokens: 5,
                            total_tokens: 15
                        },
                        credits_consumed: 0.03,
                        credits_remaining: 999.92,
                        plan_tier: 'free',
                        finish_reason: 'stop'
                    }
                }
            ];
            const request = {
                messages: [{ role: 'user', content: 'Test' }],
                stream: false
            };
            const response = await chatAPIService.sendChatCompletion(request);
            assert.strictEqual(mockFetchCallCount, 2);
            assert.strictEqual(response.choices[0].message.content, 'Token refreshed successfully');
        });
        test('should throw error when not authenticated', async () => {
            authService.setAccessToken(null);
            const request = {
                messages: [{ role: 'user', content: 'Test' }],
                stream: false
            };
            try {
                await chatAPIService.sendChatCompletion(request);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof ManagedChatAPIError);
                assert.strictEqual(error.statusCode, 401);
                assert.ok(error.isAuthError());
            }
        });
    });
    suite('Error Handling', () => {
        test('should handle insufficient credits error (402)', async () => {
            mockFetchResponses = [{
                    status: 402,
                    body: {
                        error: {
                            code: 'insufficient_credits',
                            message: 'You have insufficient credits to make this request',
                            details: {
                                credits_required: 1.5,
                                credits_available: 0.5,
                                upgrade_url: 'https://ainative.studio/upgrade'
                            }
                        }
                    }
                }];
            const request = {
                messages: [{ role: 'user', content: 'Test' }],
                stream: false
            };
            try {
                await chatAPIService.sendChatCompletion(request);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof ManagedChatAPIError);
                assert.strictEqual(error.statusCode, 402);
                assert.ok(error.isInsufficientCredits());
                assert.strictEqual(error.getUpgradeURL(), 'https://ainative.studio/upgrade');
            }
        });
        test('should handle rate limiting (429) with exponential backoff', async () => {
            mockFetchResponses = [
                { status: 429, body: { error: { code: 'rate_limit', message: 'Too many requests' } } },
                { status: 429, body: { error: { code: 'rate_limit', message: 'Too many requests' } } },
                {
                    status: 200,
                    body: {
                        id: 'chatcmpl-789',
                        model: 'llama-3.3-70b-instruct',
                        provider: 'groq',
                        created: Date.now(),
                        choices: [{
                                index: 0,
                                message: { role: 'assistant', content: 'Success after retries' },
                                finish_reason: 'stop'
                            }],
                        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
                        credits_consumed: 0.03,
                        credits_remaining: 999.89,
                        plan_tier: 'free',
                        finish_reason: 'stop'
                    }
                }
            ];
            const request = {
                messages: [{ role: 'user', content: 'Test' }],
                stream: false
            };
            const startTime = Date.now();
            const response = await chatAPIService.sendChatCompletion(request);
            const elapsed = Date.now() - startTime;
            assert.strictEqual(mockFetchCallCount, 3);
            assert.strictEqual(response.choices[0].message.content, 'Success after retries');
            // Should have waited at least 1000ms + 2000ms = 3000ms
            assert.ok(elapsed >= 3000, `Expected at least 3000ms elapsed, got ${elapsed}ms`);
        });
        test('should handle model not available error (403)', async () => {
            mockFetchResponses = [{
                    status: 403,
                    body: {
                        error: {
                            code: 'model_not_available',
                            message: 'Model is not available for your plan tier'
                        }
                    }
                }];
            const request = {
                messages: [{ role: 'user', content: 'Test' }],
                stream: false
            };
            try {
                await chatAPIService.sendChatCompletion(request);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof ManagedChatAPIError);
                assert.ok(error.isModelNotAvailable());
            }
        });
        test('should handle network errors gracefully', async () => {
            // Override fetch to simulate network error
            global.fetch = async () => {
                throw new Error('Network error: ECONNREFUSED');
            };
            const request = {
                messages: [{ role: 'user', content: 'Test' }],
                stream: false
            };
            try {
                await chatAPIService.sendChatCompletion(request);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof ManagedChatAPIError);
                assert.strictEqual(error.code, 'network_error');
            }
        });
    });
    suite('Tool Calling', () => {
        test('should send chat completion with tool definitions', async () => {
            mockFetchResponses = [{
                    status: 200,
                    body: {
                        id: 'chatcmpl-tool-123',
                        model: 'llama-3.3-70b-instruct',
                        provider: 'groq',
                        created: Date.now(),
                        choices: [{
                                index: 0,
                                message: {
                                    role: 'assistant',
                                    content: '',
                                    tool_calls: [{
                                            id: 'call_123',
                                            type: 'function',
                                            function: {
                                                name: 'code_intelligence',
                                                arguments: '{"operation":"analyze_complexity","code":"def foo(): pass","language":"python"}'
                                            }
                                        }]
                                },
                                finish_reason: 'tool_calls'
                            }],
                        usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
                        credits_consumed: 0.2,
                        credits_remaining: 999.8,
                        plan_tier: 'free',
                        finish_reason: 'tool_calls'
                    }
                }];
            const request = {
                messages: [{ role: 'user', content: 'Analyze this code complexity' }],
                tools: [{
                        name: 'code_intelligence',
                        description: 'Analyze code complexity',
                        input_schema: {
                            type: 'object',
                            properties: {
                                operation: { type: 'string' },
                                code: { type: 'string' },
                                language: { type: 'string' }
                            },
                            required: ['operation', 'code', 'language']
                        }
                    }],
                stream: false
            };
            const response = await chatAPIService.sendChatCompletion(request);
            assert.strictEqual(response.choices[0].finish_reason, 'tool_calls');
            assert.ok(response.choices[0].message.tool_calls);
            assert.strictEqual(response.choices[0].message.tool_calls[0].function.name, 'code_intelligence');
        });
        test('should handle tool result responses', async () => {
            mockFetchResponses = [{
                    status: 200,
                    body: {
                        id: 'chatcmpl-tool-result-123',
                        model: 'llama-3.3-70b-instruct',
                        provider: 'groq',
                        created: Date.now(),
                        choices: [{
                                index: 0,
                                message: {
                                    role: 'assistant',
                                    content: 'The code has a cyclomatic complexity of 2.'
                                },
                                finish_reason: 'stop'
                            }],
                        usage: { prompt_tokens: 100, completion_tokens: 15, total_tokens: 115 },
                        credits_consumed: 0.3,
                        credits_remaining: 999.5,
                        plan_tier: 'free',
                        finish_reason: 'stop'
                    }
                }];
            const request = {
                messages: [
                    { role: 'user', content: 'Analyze this code' },
                    {
                        role: 'assistant',
                        content: '',
                        tool_calls: [{
                                id: 'call_123',
                                type: 'function',
                                function: {
                                    name: 'code_intelligence',
                                    arguments: '{"operation":"analyze_complexity","code":"def foo(): pass","language":"python"}'
                                }
                            }]
                    },
                    {
                        role: 'tool',
                        content: '{"averageComplexity": 2}',
                        tool_call_id: 'call_123'
                    }
                ],
                stream: false
            };
            const response = await chatAPIService.sendChatCompletion(request);
            assert.strictEqual(response.choices[0].message.content, 'The code has a cyclomatic complexity of 2.');
        });
    });
    suite('Usage Statistics', () => {
        test('should retrieve user usage statistics', async () => {
            mockFetchResponses = [{
                    status: 200,
                    body: {
                        period: 'monthly',
                        credits_used: 10.5,
                        credits_remaining: 989.5,
                        requests_count: 150,
                        total_tokens: 50000,
                        models_used: {
                            'llama-3.3-70b-instruct': 100,
                            'gpt-4o-mini': 50
                        }
                    }
                }];
            const usage = await chatAPIService.getUserUsage('monthly');
            assert.strictEqual(usage.period, 'monthly');
            assert.strictEqual(usage.credits_used, 10.5);
            assert.strictEqual(usage.requests_count, 150);
            assert.strictEqual(usage.models_used['llama-3.3-70b-instruct'], 100);
        });
        test('should retrieve usage history', async () => {
            mockFetchResponses = [{
                    status: 200,
                    body: {
                        history: [
                            { date: '2026-01-08', requests: 50, credits_used: 2.5, tokens: 10000 },
                            { date: '2026-01-07', requests: 45, credits_used: 2.2, tokens: 9000 }
                        ]
                    }
                }];
            const history = await chatAPIService.getUsageHistory(7);
            assert.strictEqual(history.history.length, 2);
            assert.strictEqual(history.history[0].date, '2026-01-08');
            assert.strictEqual(history.history[0].credits_used, 2.5);
        });
        test('should retrieve model distribution', async () => {
            mockFetchResponses = [{
                    status: 200,
                    body: {
                        total_requests: 200,
                        models: [
                            { model: 'llama-3.3-70b-instruct', requests: 150, percentage: 75 },
                            { model: 'gpt-4o-mini', requests: 50, percentage: 25 }
                        ]
                    }
                }];
            const distribution = await chatAPIService.getModelDistribution('monthly');
            assert.strictEqual(distribution.total_requests, 200);
            assert.strictEqual(distribution.models[0].model, 'llama-3.3-70b-instruct');
            assert.strictEqual(distribution.models[0].percentage, 75);
        });
        test('should estimate cost for request', async () => {
            mockFetchResponses = [{
                    status: 200,
                    body: {
                        model: 'llama-3.3-70b-instruct',
                        estimated_tokens: 1000,
                        estimated_credits: 0.5,
                        credits_available: 999.5,
                        can_afford: true
                    }
                }];
            const estimate = await chatAPIService.estimateCost('llama-3.3-70b-instruct', 1000);
            assert.strictEqual(estimate.estimated_credits, 0.5);
            assert.strictEqual(estimate.can_afford, true);
        });
        test('should check credits availability', async () => {
            mockFetchResponses = [{
                    status: 200,
                    body: {
                        period: 'monthly',
                        credits_used: 10.5,
                        credits_remaining: 989.5,
                        requests_count: 150,
                        total_tokens: 50000,
                        models_used: {}
                    }
                }];
            const canAfford = await chatAPIService.checkCreditsAvailable(50.0);
            assert.strictEqual(canAfford, true);
        });
    });
    suite('Streaming', () => {
        test('should handle streaming chat completion', async () => {
            // Mock SSE stream
            const mockStream = `data: {"delta":{"content":"Hello"}}\n\ndata: {"delta":{"content":" world"}}\n\ndata: [DONE]\n\n`;
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(mockStream));
                    controller.close();
                }
            });
            global.fetch = async () => {
                return {
                    ok: true,
                    status: 200,
                    body: stream
                };
            };
            const events = [];
            const request = {
                messages: [{ role: 'user', content: 'Test streaming' }],
                stream: true
            };
            await chatAPIService.sendStreamingChatCompletion(request, (event) => {
                events.push(event);
            });
            assert.strictEqual(events.length, 2);
            assert.strictEqual(events[0].delta.content, 'Hello');
            assert.strictEqual(events[1].delta.content, ' world');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlZENoYXRBUElTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvaW50ZWdyYXRpb24vbWFuYWdlZENoYXRBUElTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7OztHQUdHO0FBRUgsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLHFCQUFxQixFQUEwQixtQkFBbUIsRUFBZSxNQUFNLHVDQUF1QyxDQUFDO0FBRXhJLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRTs7R0FFRztBQUNILE1BQU0sZUFBZTtJQUFyQjtRQUdTLGlCQUFZLEdBQWtCLG1CQUFtQixDQUFDO1FBQ2xELHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUMzQiwwQkFBcUIsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUUxRSxjQUFjO1FBQ0wseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztRQTBCakUscUJBQXFCO1FBQ3JCLG9CQUFlLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBUSxDQUFDO0lBY3pELENBQUM7SUF2Q0EsS0FBSyxDQUFDLGNBQWM7UUFDbkIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWTtRQUNqQixJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyx1QkFBdUIsQ0FBQztRQUM1QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDO0lBQ25DLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBb0I7UUFDbEMsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7SUFDM0IsQ0FBQztJQUVELG9CQUFvQixDQUFDLFVBQW1CO1FBQ3ZDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxVQUFVLENBQUM7SUFDdEMsQ0FBQztJQUlELEtBQUssQ0FBQyxRQUFRLEtBQW1CLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVELEtBQUssQ0FBQyxLQUFLLEtBQW1CLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3pELEtBQUssQ0FBQyxNQUFNLEtBQW9CLENBQUM7SUFDakMsS0FBSyxDQUFDLG9CQUFvQixLQUFtQixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4RSxLQUFLLENBQUMsb0JBQW9CLEtBQW1CLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLEtBQUssQ0FBQyxjQUFjLEtBQW1CLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLEtBQUssQ0FBQyxhQUFhLEtBQW1CLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELGtCQUFrQixLQUFvQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLEtBQUssQ0FBQyxjQUFjLEtBQW1CLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNyRCxPQUFPLEtBQVUsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9CLFlBQVksS0FBVSxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0lBQ3ZGLEtBQUssQ0FBQyx1QkFBdUIsS0FBbUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0UsS0FBSyxDQUFDLFdBQVcsS0FBbUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDL0Q7QUFFRDs7R0FFRztBQUNILElBQUksa0JBQWtCLEdBQTJFLEVBQUUsQ0FBQztBQUNwRyxJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQztBQUUzQixNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO0FBRW5DLFNBQVMsY0FBYztJQUN0QixrQkFBa0IsR0FBRyxDQUFDLENBQUM7SUFDdkIsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLEVBQUUsR0FBc0IsRUFBRSxJQUFrQixFQUFxQixFQUFFO1FBQ3RGLGtCQUFrQixFQUFFLENBQUM7UUFFckIsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUUvRixNQUFNLFFBQVEsR0FBRztZQUNoQixFQUFFLEVBQUUsY0FBYyxDQUFDLE1BQU0sSUFBSSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxHQUFHO1lBQy9ELE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTTtZQUM3QixVQUFVLEVBQUUsY0FBYyxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTztZQUMxRCxPQUFPLEVBQUUsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzlELElBQUksRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJO1lBQ3JDLElBQUksRUFBRSxJQUFJO1NBQ2EsQ0FBQztRQUV6QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsaUJBQWlCO0lBQ3pCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDO0lBQzdCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztJQUN4QixrQkFBa0IsR0FBRyxDQUFDLENBQUM7QUFDeEIsQ0FBQztBQUVELEtBQUssQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7SUFFdkQsSUFBSSxXQUE0QixDQUFDO0lBQ2pDLElBQUksY0FBc0MsQ0FBQztJQUUzQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsY0FBYyxHQUFHLElBQUkscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDeEQsY0FBYyxFQUFFLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsaUJBQWlCLEVBQUUsQ0FBQztRQUNwQixJQUFJLGNBQWMsWUFBWSxVQUFVLEVBQUUsQ0FBQztZQUMxQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUVqQyxJQUFJLENBQUMsMkRBQTJELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUUsa0JBQWtCLEdBQUcsQ0FBQztvQkFDckIsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsSUFBSSxFQUFFO3dCQUNMLEVBQUUsRUFBRSxjQUFjO3dCQUNsQixLQUFLLEVBQUUsd0JBQXdCO3dCQUMvQixRQUFRLEVBQUUsTUFBTTt3QkFDaEIsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7d0JBQ25CLE9BQU8sRUFBRSxDQUFDO2dDQUNULEtBQUssRUFBRSxDQUFDO2dDQUNSLE9BQU8sRUFBRTtvQ0FDUixJQUFJLEVBQUUsV0FBVztvQ0FDakIsT0FBTyxFQUFFLDRCQUE0QjtpQ0FDckM7Z0NBQ0QsYUFBYSxFQUFFLE1BQU07NkJBQ3JCLENBQUM7d0JBQ0YsS0FBSyxFQUFFOzRCQUNOLGFBQWEsRUFBRSxFQUFFOzRCQUNqQixpQkFBaUIsRUFBRSxDQUFDOzRCQUNwQixZQUFZLEVBQUUsRUFBRTt5QkFDaEI7d0JBQ0QsZ0JBQWdCLEVBQUUsSUFBSTt3QkFDdEIsaUJBQWlCLEVBQUUsTUFBTTt3QkFDekIsU0FBUyxFQUFFLE1BQU07d0JBQ2pCLGFBQWEsRUFBRSxNQUFNO3FCQUNyQjtpQkFDRCxDQUFDLENBQUM7WUFFSCxNQUFNLE9BQU8sR0FBZ0I7Z0JBQzVCLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQzlDLE1BQU0sRUFBRSxLQUFLO2FBQ2IsQ0FBQztZQUVGLE1BQU0sUUFBUSxHQUFHLE1BQU0sY0FBYyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWxFLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLDRCQUE0QixDQUFDLENBQUM7WUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsd0RBQXdELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDekUsa0JBQWtCLEdBQUc7Z0JBQ3BCO29CQUNDLE1BQU0sRUFBRSxHQUFHO29CQUNYLElBQUksRUFBRTt3QkFDTCxLQUFLLEVBQUU7NEJBQ04sSUFBSSxFQUFFLGVBQWU7NEJBQ3JCLE9BQU8sRUFBRSwwQkFBMEI7eUJBQ25DO3FCQUNEO2lCQUNEO2dCQUNEO29CQUNDLE1BQU0sRUFBRSxHQUFHO29CQUNYLElBQUksRUFBRTt3QkFDTCxFQUFFLEVBQUUsY0FBYzt3QkFDbEIsS0FBSyxFQUFFLHdCQUF3Qjt3QkFDL0IsUUFBUSxFQUFFLE1BQU07d0JBQ2hCLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO3dCQUNuQixPQUFPLEVBQUUsQ0FBQztnQ0FDVCxLQUFLLEVBQUUsQ0FBQztnQ0FDUixPQUFPLEVBQUU7b0NBQ1IsSUFBSSxFQUFFLFdBQVc7b0NBQ2pCLE9BQU8sRUFBRSw4QkFBOEI7aUNBQ3ZDO2dDQUNELGFBQWEsRUFBRSxNQUFNOzZCQUNyQixDQUFDO3dCQUNGLEtBQUssRUFBRTs0QkFDTixhQUFhLEVBQUUsRUFBRTs0QkFDakIsaUJBQWlCLEVBQUUsQ0FBQzs0QkFDcEIsWUFBWSxFQUFFLEVBQUU7eUJBQ2hCO3dCQUNELGdCQUFnQixFQUFFLElBQUk7d0JBQ3RCLGlCQUFpQixFQUFFLE1BQU07d0JBQ3pCLFNBQVMsRUFBRSxNQUFNO3dCQUNqQixhQUFhLEVBQUUsTUFBTTtxQkFDckI7aUJBQ0Q7YUFDRCxDQUFDO1lBRUYsTUFBTSxPQUFPLEdBQWdCO2dCQUM1QixRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO2dCQUM3QyxNQUFNLEVBQUUsS0FBSzthQUNiLENBQUM7WUFFRixNQUFNLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVsRSxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLDhCQUE4QixDQUFDLENBQUM7UUFDekYsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUQsV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVqQyxNQUFNLE9BQU8sR0FBZ0I7Z0JBQzVCLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzdDLE1BQU0sRUFBRSxLQUFLO2FBQ2IsQ0FBQztZQUVGLElBQUksQ0FBQztnQkFDSixNQUFNLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDakQsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFFLEtBQTZCLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNuRSxNQUFNLENBQUMsRUFBRSxDQUFFLEtBQTZCLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUN6RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFFNUIsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pFLGtCQUFrQixHQUFHLENBQUM7b0JBQ3JCLE1BQU0sRUFBRSxHQUFHO29CQUNYLElBQUksRUFBRTt3QkFDTCxLQUFLLEVBQUU7NEJBQ04sSUFBSSxFQUFFLHNCQUFzQjs0QkFDNUIsT0FBTyxFQUFFLG9EQUFvRDs0QkFDN0QsT0FBTyxFQUFFO2dDQUNSLGdCQUFnQixFQUFFLEdBQUc7Z0NBQ3JCLGlCQUFpQixFQUFFLEdBQUc7Z0NBQ3RCLFdBQVcsRUFBRSxpQ0FBaUM7NkJBQzlDO3lCQUNEO3FCQUNEO2lCQUNELENBQUMsQ0FBQztZQUVILE1BQU0sT0FBTyxHQUFnQjtnQkFDNUIsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztnQkFDN0MsTUFBTSxFQUFFLEtBQUs7YUFDYixDQUFDO1lBRUYsSUFBSSxDQUFDO2dCQUNKLE1BQU0sY0FBYyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDekMsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUUsS0FBNkIsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ25FLE1BQU0sQ0FBQyxFQUFFLENBQUUsS0FBNkIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUM7Z0JBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUUsS0FBNkIsQ0FBQyxhQUFhLEVBQUUsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1lBQ3ZHLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw0REFBNEQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RSxrQkFBa0IsR0FBRztnQkFDcEIsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLEVBQUUsRUFBRTtnQkFDdEYsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLEVBQUUsRUFBRTtnQkFDdEY7b0JBQ0MsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsSUFBSSxFQUFFO3dCQUNMLEVBQUUsRUFBRSxjQUFjO3dCQUNsQixLQUFLLEVBQUUsd0JBQXdCO3dCQUMvQixRQUFRLEVBQUUsTUFBTTt3QkFDaEIsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7d0JBQ25CLE9BQU8sRUFBRSxDQUFDO2dDQUNULEtBQUssRUFBRSxDQUFDO2dDQUNSLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFO2dDQUNoRSxhQUFhLEVBQUUsTUFBTTs2QkFDckIsQ0FBQzt3QkFDRixLQUFLLEVBQUUsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsRUFBRSxFQUFFO3dCQUNwRSxnQkFBZ0IsRUFBRSxJQUFJO3dCQUN0QixpQkFBaUIsRUFBRSxNQUFNO3dCQUN6QixTQUFTLEVBQUUsTUFBTTt3QkFDakIsYUFBYSxFQUFFLE1BQU07cUJBQ3JCO2lCQUNEO2FBQ0QsQ0FBQztZQUVGLE1BQU0sT0FBTyxHQUFnQjtnQkFDNUIsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztnQkFDN0MsTUFBTSxFQUFFLEtBQUs7YUFDYixDQUFDO1lBRUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzdCLE1BQU0sUUFBUSxHQUFHLE1BQU0sY0FBYyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7WUFFdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1lBQ2pGLHVEQUF1RDtZQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUUseUNBQXlDLE9BQU8sSUFBSSxDQUFDLENBQUM7UUFDbEYsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDaEUsa0JBQWtCLEdBQUcsQ0FBQztvQkFDckIsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsSUFBSSxFQUFFO3dCQUNMLEtBQUssRUFBRTs0QkFDTixJQUFJLEVBQUUscUJBQXFCOzRCQUMzQixPQUFPLEVBQUUsMkNBQTJDO3lCQUNwRDtxQkFDRDtpQkFDRCxDQUFDLENBQUM7WUFFSCxNQUFNLE9BQU8sR0FBZ0I7Z0JBQzVCLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzdDLE1BQU0sRUFBRSxLQUFLO2FBQ2IsQ0FBQztZQUVGLElBQUksQ0FBQztnQkFDSixNQUFNLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDakQsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNoRCxNQUFNLENBQUMsRUFBRSxDQUFFLEtBQTZCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMxRCwyQ0FBMkM7WUFDM0MsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLElBQUksRUFBRTtnQkFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1lBQ2hELENBQUMsQ0FBQztZQUVGLE1BQU0sT0FBTyxHQUFnQjtnQkFDNUIsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztnQkFDN0MsTUFBTSxFQUFFLEtBQUs7YUFDYixDQUFDO1lBRUYsSUFBSSxDQUFDO2dCQUNKLE1BQU0sY0FBYyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDekMsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUUsS0FBNkIsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDMUUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUUxQixJQUFJLENBQUMsbURBQW1ELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDcEUsa0JBQWtCLEdBQUcsQ0FBQztvQkFDckIsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsSUFBSSxFQUFFO3dCQUNMLEVBQUUsRUFBRSxtQkFBbUI7d0JBQ3ZCLEtBQUssRUFBRSx3QkFBd0I7d0JBQy9CLFFBQVEsRUFBRSxNQUFNO3dCQUNoQixPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTt3QkFDbkIsT0FBTyxFQUFFLENBQUM7Z0NBQ1QsS0FBSyxFQUFFLENBQUM7Z0NBQ1IsT0FBTyxFQUFFO29DQUNSLElBQUksRUFBRSxXQUFXO29DQUNqQixPQUFPLEVBQUUsRUFBRTtvQ0FDWCxVQUFVLEVBQUUsQ0FBQzs0Q0FDWixFQUFFLEVBQUUsVUFBVTs0Q0FDZCxJQUFJLEVBQUUsVUFBVTs0Q0FDaEIsUUFBUSxFQUFFO2dEQUNULElBQUksRUFBRSxtQkFBbUI7Z0RBQ3pCLFNBQVMsRUFBRSxpRkFBaUY7NkNBQzVGO3lDQUNELENBQUM7aUNBQ0Y7Z0NBQ0QsYUFBYSxFQUFFLFlBQVk7NkJBQzNCLENBQUM7d0JBQ0YsS0FBSyxFQUFFLEVBQUUsYUFBYSxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRTt3QkFDckUsZ0JBQWdCLEVBQUUsR0FBRzt3QkFDckIsaUJBQWlCLEVBQUUsS0FBSzt3QkFDeEIsU0FBUyxFQUFFLE1BQU07d0JBQ2pCLGFBQWEsRUFBRSxZQUFZO3FCQUMzQjtpQkFDRCxDQUFDLENBQUM7WUFFSCxNQUFNLE9BQU8sR0FBZ0I7Z0JBQzVCLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsQ0FBQztnQkFDckUsS0FBSyxFQUFFLENBQUM7d0JBQ1AsSUFBSSxFQUFFLG1CQUFtQjt3QkFDekIsV0FBVyxFQUFFLHlCQUF5Qjt3QkFDdEMsWUFBWSxFQUFFOzRCQUNiLElBQUksRUFBRSxRQUFROzRCQUNkLFVBQVUsRUFBRTtnQ0FDWCxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO2dDQUM3QixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO2dDQUN4QixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFOzZCQUM1Qjs0QkFDRCxRQUFRLEVBQUUsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQzt5QkFDM0M7cUJBQ0QsQ0FBQztnQkFDRixNQUFNLEVBQUUsS0FBSzthQUNiLENBQUM7WUFFRixNQUFNLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ25HLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RELGtCQUFrQixHQUFHLENBQUM7b0JBQ3JCLE1BQU0sRUFBRSxHQUFHO29CQUNYLElBQUksRUFBRTt3QkFDTCxFQUFFLEVBQUUsMEJBQTBCO3dCQUM5QixLQUFLLEVBQUUsd0JBQXdCO3dCQUMvQixRQUFRLEVBQUUsTUFBTTt3QkFDaEIsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7d0JBQ25CLE9BQU8sRUFBRSxDQUFDO2dDQUNULEtBQUssRUFBRSxDQUFDO2dDQUNSLE9BQU8sRUFBRTtvQ0FDUixJQUFJLEVBQUUsV0FBVztvQ0FDakIsT0FBTyxFQUFFLDRDQUE0QztpQ0FDckQ7Z0NBQ0QsYUFBYSxFQUFFLE1BQU07NkJBQ3JCLENBQUM7d0JBQ0YsS0FBSyxFQUFFLEVBQUUsYUFBYSxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRTt3QkFDdkUsZ0JBQWdCLEVBQUUsR0FBRzt3QkFDckIsaUJBQWlCLEVBQUUsS0FBSzt3QkFDeEIsU0FBUyxFQUFFLE1BQU07d0JBQ2pCLGFBQWEsRUFBRSxNQUFNO3FCQUNyQjtpQkFDRCxDQUFDLENBQUM7WUFFSCxNQUFNLE9BQU8sR0FBZ0I7Z0JBQzVCLFFBQVEsRUFBRTtvQkFDVCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFO29CQUM5Qzt3QkFDQyxJQUFJLEVBQUUsV0FBVzt3QkFDakIsT0FBTyxFQUFFLEVBQUU7d0JBQ1gsVUFBVSxFQUFFLENBQUM7Z0NBQ1osRUFBRSxFQUFFLFVBQVU7Z0NBQ2QsSUFBSSxFQUFFLFVBQVU7Z0NBQ2hCLFFBQVEsRUFBRTtvQ0FDVCxJQUFJLEVBQUUsbUJBQW1CO29DQUN6QixTQUFTLEVBQUUsaUZBQWlGO2lDQUM1Rjs2QkFDRCxDQUFDO3FCQUNGO29CQUNEO3dCQUNDLElBQUksRUFBRSxNQUFNO3dCQUNaLE9BQU8sRUFBRSwwQkFBMEI7d0JBQ25DLFlBQVksRUFBRSxVQUFVO3FCQUN4QjtpQkFDRDtnQkFDRCxNQUFNLEVBQUUsS0FBSzthQUNiLENBQUM7WUFFRixNQUFNLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSw0Q0FBNEMsQ0FBQyxDQUFDO1FBQ3ZHLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBRTlCLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN4RCxrQkFBa0IsR0FBRyxDQUFDO29CQUNyQixNQUFNLEVBQUUsR0FBRztvQkFDWCxJQUFJLEVBQUU7d0JBQ0wsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLFlBQVksRUFBRSxJQUFJO3dCQUNsQixpQkFBaUIsRUFBRSxLQUFLO3dCQUN4QixjQUFjLEVBQUUsR0FBRzt3QkFDbkIsWUFBWSxFQUFFLEtBQUs7d0JBQ25CLFdBQVcsRUFBRTs0QkFDWix3QkFBd0IsRUFBRSxHQUFHOzRCQUM3QixhQUFhLEVBQUUsRUFBRTt5QkFDakI7cUJBQ0Q7aUJBQ0QsQ0FBQyxDQUFDO1lBRUgsTUFBTSxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3RFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2hELGtCQUFrQixHQUFHLENBQUM7b0JBQ3JCLE1BQU0sRUFBRSxHQUFHO29CQUNYLElBQUksRUFBRTt3QkFDTCxPQUFPLEVBQUU7NEJBQ1IsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFOzRCQUN0RSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7eUJBQ3JFO3FCQUNEO2lCQUNELENBQUMsQ0FBQztZQUVILE1BQU0sT0FBTyxHQUFHLE1BQU0sY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNyRCxrQkFBa0IsR0FBRyxDQUFDO29CQUNyQixNQUFNLEVBQUUsR0FBRztvQkFDWCxJQUFJLEVBQUU7d0JBQ0wsY0FBYyxFQUFFLEdBQUc7d0JBQ25CLE1BQU0sRUFBRTs0QkFDUCxFQUFFLEtBQUssRUFBRSx3QkFBd0IsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUU7NEJBQ2xFLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUU7eUJBQ3REO3FCQUNEO2lCQUNELENBQUMsQ0FBQztZQUVILE1BQU0sWUFBWSxHQUFHLE1BQU0sY0FBYyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLHdCQUF3QixDQUFDLENBQUM7WUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNuRCxrQkFBa0IsR0FBRyxDQUFDO29CQUNyQixNQUFNLEVBQUUsR0FBRztvQkFDWCxJQUFJLEVBQUU7d0JBQ0wsS0FBSyxFQUFFLHdCQUF3Qjt3QkFDL0IsZ0JBQWdCLEVBQUUsSUFBSTt3QkFDdEIsaUJBQWlCLEVBQUUsR0FBRzt3QkFDdEIsaUJBQWlCLEVBQUUsS0FBSzt3QkFDeEIsVUFBVSxFQUFFLElBQUk7cUJBQ2hCO2lCQUNELENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sY0FBYyxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUVuRixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDcEQsa0JBQWtCLEdBQUcsQ0FBQztvQkFDckIsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsSUFBSSxFQUFFO3dCQUNMLE1BQU0sRUFBRSxTQUFTO3dCQUNqQixZQUFZLEVBQUUsSUFBSTt3QkFDbEIsaUJBQWlCLEVBQUUsS0FBSzt3QkFDeEIsY0FBYyxFQUFFLEdBQUc7d0JBQ25CLFlBQVksRUFBRSxLQUFLO3dCQUNuQixXQUFXLEVBQUUsRUFBRTtxQkFDZjtpQkFDRCxDQUFDLENBQUM7WUFFSCxNQUFNLFNBQVMsR0FBRyxNQUFNLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVuRSxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFFdkIsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzFELGtCQUFrQjtZQUNsQixNQUFNLFVBQVUsR0FBRyxpR0FBaUcsQ0FBQztZQUNySCxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksY0FBYyxDQUFDO2dCQUNqQyxLQUFLLENBQUMsVUFBVTtvQkFDZixVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDL0MsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNwQixDQUFDO2FBQ0QsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLElBQXVCLEVBQUU7Z0JBQzVDLE9BQU87b0JBQ04sRUFBRSxFQUFFLElBQUk7b0JBQ1IsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsSUFBSSxFQUFFLE1BQWE7aUJBQ1AsQ0FBQztZQUNmLENBQUMsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztZQUN6QixNQUFNLE9BQU8sR0FBZ0I7Z0JBQzVCLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdkQsTUFBTSxFQUFFLElBQUk7YUFDWixDQUFDO1lBRUYsTUFBTSxjQUFjLENBQUMsMkJBQTJCLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ25FLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEIsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9