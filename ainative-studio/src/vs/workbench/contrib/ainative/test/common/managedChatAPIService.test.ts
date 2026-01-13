/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ManagedChatAPIService, ManagedChatAPIError, ChatRequest, ChatResponse } from '../../common/managedChatAPIService.js';
import { IAINativeCloudAuthService, CloudAuthState, CloudUser } from '../../common/ainativeCloudAuthTypes.js';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';

/**
 * Mock AINativeCloudAuthService for testing
 */
class MockAINativeCloudAuthService implements IAINativeCloudAuthService {
	readonly _serviceBrand: undefined;

	onDidChangeAuthState: Event<CloudAuthState> = Event.None;
	onDidUpdateUser: Event<CloudUser> = Event.None;

	private _accessToken: string | null = 'mock-access-token';
	private _refreshCount = 0;

	constructor(private shouldFail: boolean = false) { }

	async getAccessToken(): Promise<string | null> {
		if (this.shouldFail) {
			return null;
		}
		return this._accessToken;
	}

	getAccessTokenSync(): string | null {
		return this._accessToken;
	}

	async refreshToken(): Promise<string> {
		this._refreshCount++;
		this._accessToken = `mock-refreshed-token-${this._refreshCount}`;
		return this._accessToken;
	}

	getRefreshCount(): number {
		return this._refreshCount;
	}

	// Stub methods (not used in tests)
	async register(): Promise<any> { return { success: false }; }
	async login(): Promise<any> { return { success: false }; }
	async logout(): Promise<void> { }
	async requestPasswordReset(): Promise<any> { return { success: false }; }
	async confirmPasswordReset(): Promise<any> { return { success: false }; }
	async changePassword(): Promise<any> { return { success: false }; }
	async validateToken(): Promise<any> { return { valid: false }; }
	async getCurrentUser(): Promise<CloudUser | null> { return null; }
	getUser(): CloudUser | null { return null; }
	isAuthenticated(): boolean { return true; }
	getAuthState(): CloudAuthState { return CloudAuthState.Authenticated; }
	async resendEmailVerification(): Promise<any> { return { success: false }; }
	async verifyEmail(): Promise<any> { return { success: false }; }
}

/**
 * Mock fetch function for testing
 */
class FetchMock {
	private responses: Map<string, any> = new Map();
	private callCount = 0;

	setResponse(url: string, response: any): void {
		this.responses.set(url, response);
	}

	async fetch(url: string, options?: RequestInit): Promise<Response> {
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

	private createResponse(status: number, data: any): Response {
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
		} as Response;
	}

	reset(): void {
		this.responses.clear();
		this.callCount = 0;
	}

	getCallCount(): number {
		return this.callCount;
	}
}

suite('ManagedChatAPIService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();
	let service: ManagedChatAPIService;
	let mockAuthService: MockAINativeCloudAuthService;
	let fetchMock: FetchMock;
	let originalFetch: typeof fetch;

	setup(() => {
		mockAuthService = new MockAINativeCloudAuthService();
		service = disposables.add(new ManagedChatAPIService(mockAuthService));
		fetchMock = new FetchMock();
		originalFetch = global.fetch;
		global.fetch = fetchMock.fetch.bind(fetchMock) as any;
	});

	teardown(() => {
		global.fetch = originalFetch;
		fetchMock.reset();
	});

	suite('sendChatCompletion', () => {
		test('should send chat completion request successfully', async () => {
			const mockResponse: ChatResponse = {
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

			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/chat/completions',
				{ statusCode: 200, data: mockResponse }
			);

			const request: ChatRequest = {
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
			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/chat/completions',
				{
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
				}
			);

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Hello' }]
			};

			try {
				await service.sendChatCompletion(request);
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof ManagedChatAPIError);
				assert.strictEqual(error.statusCode, 402);
				assert.ok(error.isInsufficientCredits());
				assert.strictEqual(error.getUpgradeURL(), 'https://www.ainative.studio/pricing');
			}
		});

		test('should handle model not available error (403)', async () => {
			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/chat/completions',
				{
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
				}
			);

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Hello' }],
				preferred_model: 'claude-opus-4'
			};

			try {
				await service.sendChatCompletion(request);
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof ManagedChatAPIError);
				assert.strictEqual(error.statusCode, 403);
				assert.ok(error.isModelNotAvailable());
			}
		});

		test('should retry on rate limiting (429)', async () => {
			const mockResponse: ChatResponse = {
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
			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/chat/completions',
				{ statusCode: 429, data: mockResponse }
			);

			// After retries, set success response
			setTimeout(() => {
				fetchMock.setResponse(
					'https://api.ainative.studio/api/v1/managed/chat/completions',
					{ statusCode: 200, data: mockResponse }
				);
			}, 100);

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Hello' }]
			};

			const response = await service.sendChatCompletion(request);

			assert.ok(fetchMock.getCallCount() >= 1);
			assert.strictEqual(response.choices[0].message.content, 'Success after retry');
		});

		test('should handle authentication error and refresh token', async () => {
			const mockResponse: ChatResponse = {
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
			fetchMock.fetch = async (url: string, options?: RequestInit) => {
				callCount++;
				if (callCount === 1) {
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
					} as Response;
				}
				return originalFetch(url, options);
			};

			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/chat/completions',
				{ statusCode: 200, data: mockResponse }
			);

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Hello' }]
			};

			const response = await service.sendChatCompletion(request);

			assert.strictEqual(mockAuthService.getRefreshCount(), 1);
			assert.strictEqual(response.choices[0].message.content, 'Success after token refresh');
		});

		test('should throw error if not authenticated', async () => {
			const unauthenticatedService = disposables.add(
				new ManagedChatAPIService(new MockAINativeCloudAuthService(true))
			);

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Hello' }]
			};

			try {
				await unauthenticatedService.sendChatCompletion(request);
				assert.fail('Should have thrown error');
			} catch (error) {
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

			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/usage?period=monthly',
				{ statusCode: 200, data: mockUsage }
			);

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

			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/usage/history?days=30',
				{ statusCode: 200, data: mockHistory }
			);

			const history = await service.getUsageHistory(30);

			assert.strictEqual(history.history.length, 2);
			assert.strictEqual(history.history[0].date, '2026-01-05');
			assert.strictEqual(history.history[0].requests, 25);
		});

		test('should validate days parameter', async () => {
			try {
				await service.getUsageHistory(400);
				assert.fail('Should have thrown error');
			} catch (error) {
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

			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/models?period=monthly',
				{ statusCode: 200, data: mockDistribution }
			);

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

			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/estimate',
				{ statusCode: 200, data: mockEstimate }
			);

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

			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/usage?period=monthly',
				{ statusCode: 200, data: mockUsage }
			);

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

			fetchMock.setResponse(
				'https://api.ainative.studio/api/v1/managed/usage?period=monthly',
				{ statusCode: 200, data: mockUsage }
			);

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
			const error = new ManagedChatAPIError(
				402,
				'insufficient_credits',
				'Insufficient credits',
				{ upgrade_url: 'https://www.ainative.studio/pricing' }
			);
			assert.strictEqual(error.getUpgradeURL(), 'https://www.ainative.studio/pricing');
		});
	});

	suite('sendStreamingChatCompletion', () => {
		/**
		 * Create a mock streaming response using ReadableStream
		 */
		function createStreamingResponse(events: string[]): Response {
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
			} as Response;
		}

		test('should stream text chunks successfully', async () => {
			const events = [
				'data: {"type":"chunk","delta":"Hello","index":0}',
				'data: {"type":"chunk","delta":" world","index":1}',
				'data: {"type":"done","finish_reason":"stop"}',
				'data: [DONE]'
			];

			global.fetch = async () => createStreamingResponse(events);

			const receivedEvents: any[] = [];
			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Hi' }],
				stream: true
			};

			await service.sendStreamingChatCompletion(
				request,
				(event) => {
					receivedEvents.push(event);
				}
			);

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

			const receivedEvents: any[] = [];
			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Search for something' }],
				stream: true
			};

			await service.sendStreamingChatCompletion(
				request,
				(event) => {
					receivedEvents.push(event);
				}
			);

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

			const receivedEvents: any[] = [];
			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Analyze this' }],
				stream: true
			};

			await service.sendStreamingChatCompletion(
				request,
				(event) => {
					receivedEvents.push(event);
				}
			);

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

			const receivedEvents: any[] = [];
			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Tell me a story' }],
				stream: true
			};

			const { abort } = await service.sendStreamingChatCompletion(
				request,
				(event) => {
					receivedEvents.push(event);
				}
			);

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
				} as Response;
			};

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Hello' }],
				stream: true
			};

			let errorReceived = false;
			await service.sendStreamingChatCompletion(
				request,
				() => { },
				(error) => {
					errorReceived = true;
					assert.ok(error instanceof ManagedChatAPIError);
				}
			);

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

			const receivedEvents: any[] = [];
			let errorCount = 0;

			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: true
			};

			await service.sendStreamingChatCompletion(
				request,
				(event) => {
					receivedEvents.push(event);
				},
				() => {
					errorCount++;
				}
			);

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
					} as Response;
				}
				// Second call succeeds
				return createStreamingResponse([
					'data: {"type":"chunk","delta":"Success after refresh","index":0}',
					'data: [DONE]'
				]);
			};

			const receivedEvents: any[] = [];
			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: true
			};

			await service.sendStreamingChatCompletion(
				request,
				(event) => {
					receivedEvents.push(event);
				}
			);

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

			const receivedEvents: any[] = [];
			const request: ChatRequest = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: true
			};

			await service.sendStreamingChatCompletion(
				request,
				(event) => {
					receivedEvents.push(event);
				}
			);

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
