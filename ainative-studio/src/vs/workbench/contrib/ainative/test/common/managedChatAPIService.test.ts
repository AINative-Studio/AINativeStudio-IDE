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
			text: async () => JSON.stringify(data)
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
					return fetchMock['createResponse'](401, {
						error: { code: 'token_expired', message: 'Token expired' }
					});
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
});
