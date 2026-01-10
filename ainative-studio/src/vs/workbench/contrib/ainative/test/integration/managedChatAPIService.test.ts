/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Integration tests for ManagedChatAPIService
 * Tests the entire flow of API communication, JWT authentication, error handling, and retry logic
 */

import * as assert from 'assert';
import { ManagedChatAPIService, IManagedChatAPIService, ManagedChatAPIError, ChatRequest } from '../../common/managedChatAPIService.js';
import { IAINativeCloudAuthService } from '../../common/ainativeCloudAuthTypes.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';

/**
 * Mock authentication service for testing
 */
class MockAuthService implements IAINativeCloudAuthService {
	readonly _serviceBrand: undefined;

	private _accessToken: string | null = 'mock_access_token';
	private _shouldFailRefresh = false;
	private _onDidChangeAuthState = { event: () => ({ dispose: () => { } }) };

	// Mock events
	readonly onDidChangeAuthState = this._onDidChangeAuthState.event;

	async getAccessToken(): Promise<string | null> {
		return this._accessToken;
	}

	async refreshToken(): Promise<string> {
		if (this._shouldFailRefresh) {
			throw new Error('Token refresh failed');
		}
		this._accessToken = 'new_mock_access_token';
		return this._accessToken;
	}

	isAuthenticated(): boolean {
		return this._accessToken !== null;
	}

	setAccessToken(token: string | null): void {
		this._accessToken = token;
	}

	setShouldFailRefresh(shouldFail: boolean): void {
		this._shouldFailRefresh = shouldFail;
	}

	// Stub other methods
	onDidUpdateUser = () => ({ dispose: () => { } }) as any;
	async register(): Promise<any> { return { success: true }; }
	async login(): Promise<any> { return { success: true }; }
	async logout(): Promise<void> { }
	async requestPasswordReset(): Promise<any> { return { success: true }; }
	async confirmPasswordReset(): Promise<any> { return { success: true }; }
	async changePassword(): Promise<any> { return { success: true }; }
	async validateToken(): Promise<any> { return { valid: true }; }
	getAccessTokenSync(): string | null { return this._accessToken; }
	async getCurrentUser(): Promise<any> { return null; }
	getUser(): any { return null; }
	getAuthState(): any { return this._accessToken ? 'authenticated' : 'unauthenticated'; }
	async resendEmailVerification(): Promise<any> { return { success: true }; }
	async verifyEmail(): Promise<any> { return { success: true }; }
}

/**
 * Mock fetch function for testing
 */
let mockFetchResponses: Array<{ status: number; body: any; headers?: Record<string, string> }> = [];
let mockFetchCallCount = 0;

const originalFetch = global.fetch;

function setupMockFetch() {
	mockFetchCallCount = 0;
	global.fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		mockFetchCallCount++;

		const responseConfig = mockFetchResponses[mockFetchCallCount - 1] || { status: 200, body: {} };

		const response = {
			ok: responseConfig.status >= 200 && responseConfig.status < 300,
			status: responseConfig.status,
			statusText: responseConfig.status === 200 ? 'OK' : 'Error',
			headers: new Map(Object.entries(responseConfig.headers || {})),
			json: async () => responseConfig.body,
			body: null
		} as unknown as Response;

		return Promise.resolve(response);
	};
}

function teardownMockFetch() {
	global.fetch = originalFetch;
	mockFetchResponses = [];
	mockFetchCallCount = 0;
}

suite('ManagedChatAPIService - Integration Tests', () => {

	let authService: MockAuthService;
	let chatAPIService: IManagedChatAPIService;

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

			const request: ChatRequest = {
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

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: false
			};

			const response = await chatAPIService.sendChatCompletion(request);

			assert.strictEqual(mockFetchCallCount, 2);
			assert.strictEqual(response.choices[0].message.content, 'Token refreshed successfully');
		});

		test('should throw error when not authenticated', async () => {
			authService.setAccessToken(null);

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: false
			};

			try {
				await chatAPIService.sendChatCompletion(request);
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof ManagedChatAPIError);
				assert.strictEqual((error as ManagedChatAPIError).statusCode, 401);
				assert.ok((error as ManagedChatAPIError).isAuthError());
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

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: false
			};

			try {
				await chatAPIService.sendChatCompletion(request);
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof ManagedChatAPIError);
				assert.strictEqual((error as ManagedChatAPIError).statusCode, 402);
				assert.ok((error as ManagedChatAPIError).isInsufficientCredits());
				assert.strictEqual((error as ManagedChatAPIError).getUpgradeURL(), 'https://ainative.studio/upgrade');
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

			const request: ChatRequest = {
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

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: false
			};

			try {
				await chatAPIService.sendChatCompletion(request);
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof ManagedChatAPIError);
				assert.ok((error as ManagedChatAPIError).isModelNotAvailable());
			}
		});

		test('should handle network errors gracefully', async () => {
			// Override fetch to simulate network error
			global.fetch = async () => {
				throw new Error('Network error: ECONNREFUSED');
			};

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: false
			};

			try {
				await chatAPIService.sendChatCompletion(request);
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof ManagedChatAPIError);
				assert.strictEqual((error as ManagedChatAPIError).code, 'network_error');
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

			const request: ChatRequest = {
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
			assert.strictEqual(response.choices[0].message.tool_calls![0].function.name, 'code_intelligence');
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

			const request: ChatRequest = {
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

			global.fetch = async (): Promise<Response> => {
				return {
					ok: true,
					status: 200,
					body: stream as any
				} as Response;
			};

			const events: any[] = [];
			const request: ChatRequest = {
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
