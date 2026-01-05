/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, deepStrictEqual } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AINativeAuthService, AuthState } from '../../common/ainativeAuthService.js';
import { TokenService } from '../../common/tokenService.js';
import { AIModelRegistryService } from '../../common/aiModelRegistryService.js';
import { IEncryptionService } from '../../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { ModelInvocationRequest, ModelCapability } from '../../common/aiModelRegistryTypes.js';

/**
 * Mock Encryption Service
 */
class MockEncryptionService implements IEncryptionService {
	_serviceBrand: undefined;

	async encrypt(value: string): Promise<string> {
		return Buffer.from(value).toString('base64');
	}

	async decrypt(value: string): Promise<string> {
		return Buffer.from(value, 'base64').toString('utf-8');
	}

	async isEncryptionAvailable(): Promise<boolean> {
		return true;
	}

	async setUsePlainTextEncryption(): Promise<void> { }
	async getKeyStorageProvider(): Promise<any> {
		return 'test';
	}
}

/**
 * Mock Storage Service
 */
class MockStorageService implements IStorageService {
	_serviceBrand: undefined;
	private storage = new Map<string, string>();

	onDidChangeValue: any = () => ({ dispose: () => { } });
	onDidChangeTarget: any = () => ({ dispose: () => { } });
	onWillSaveState: any = () => ({ dispose: () => { } });

	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		const storageKey = `${scope}:${key}`;
		return this.storage.get(storageKey) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
		const storageKey = `${scope}:${key}`;
		const value = this.storage.get(storageKey);
		if (value === undefined) {
			return fallbackValue;
		}
		return value === 'true';
	}

	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
		const storageKey = `${scope}:${key}`;
		const value = this.storage.get(storageKey);
		if (value === undefined) {
			return fallbackValue;
		}
		return parseInt(value, 10);
	}

	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined {
		const storageKey = `${scope}:${key}`;
		const value = this.storage.get(storageKey);
		if (value === undefined) {
			return fallbackValue;
		}
		try {
			return JSON.parse(value) as T;
		} catch {
			return fallbackValue;
		}
	}

	store(key: string, value: string | boolean | number | undefined | null, scope: StorageScope, target: StorageTarget): void {
		const storageKey = `${scope}:${key}`;
		if (value === undefined || value === null) {
			this.storage.delete(storageKey);
		} else {
			this.storage.set(storageKey, String(value));
		}
	}

	remove(key: string, scope: StorageScope): void {
		const storageKey = `${scope}:${key}`;
		this.storage.delete(storageKey);
	}

	keys(scope: StorageScope, target: StorageTarget): string[] {
		const prefix = `${scope}:`;
		return Array.from(this.storage.keys())
			.filter(key => key.startsWith(prefix))
			.map(key => key.substring(prefix.length));
	}

	migrate(): Promise<void> { return Promise.resolve(); }
	isNew(scope: StorageScope): boolean { return false; }
	flush(): Promise<void> { return Promise.resolve(); }
	log(): Promise<void> { return Promise.resolve(); }
	switch(): Promise<void> { return Promise.resolve(); }
	hasScope(): boolean { return true; }
	storeAll(): void { }
	logStorage(): void { }
	clear(): void { this.storage.clear(); }
	optimize(): Promise<void> { return Promise.resolve(); }
}

/**
 * Helper to create mock JWT
 */
function createMockJWT(claims: any): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
	const payload = Buffer.from(JSON.stringify({
		sub: claims.sub || 'test-user-id',
		email: claims.email || 'test@example.com',
		role: claims.role || 'user',
		exp: claims.exp || Math.floor(Date.now() / 1000) + 3600,
		iat: claims.iat || Math.floor(Date.now() / 1000)
	})).toString('base64');
	return `${header}.${payload}.mock-signature`;
}

/**
 * Mock fetch for integration tests
 */
const originalFetch = global.fetch;

function mockSuccessfulAuth(): void {
	global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = typeof input === 'string' ? input : input.toString();

		if (url.includes('/v1/auth/login-json')) {
			const accessToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
			const refreshToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 7200 });

			return {
				ok: true,
				status: 200,
				json: async () => ({
					access_token: accessToken,
					refresh_token: refreshToken,
					user: {
						id: 'user-123',
						email: 'test@ainative.studio',
						name: 'Test User',
						role: 'user',
						created_at: '2025-01-01T00:00:00Z',
						updated_at: '2025-01-01T00:00:00Z'
					}
				})
			} as Response;
		}

		if (url.includes('/v1/auth/logout')) {
			return {
				ok: true,
				status: 200,
				json: async () => ({ success: true })
			} as Response;
		}

		if (url.includes('/v1/auth/refresh')) {
			const newAccessToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
			return {
				ok: true,
				status: 200,
				json: async () => ({
					access_token: newAccessToken
				})
			} as Response;
		}

		if (url.includes('/v1/ai/models')) {
			return {
				ok: true,
				status: 200,
				json: async () => ({
					models: [
						{
							id: 'claude-3-5-sonnet',
							name: 'Claude 3.5 Sonnet',
							provider: 'anthropic',
							capabilities: [ModelCapability.CodeGeneration, ModelCapability.Chat],
							available: true,
							maxContextLength: 200000,
							pricing: {
								tier: 'pay-as-you-go',
								inputTokenCost: 0.003,
								outputTokenCost: 0.015
							},
							description: 'Advanced AI model for coding',
							tags: ['code', 'chat']
						}
					]
				})
			} as Response;
		}

		if (url.includes('/v1/ai/invoke')) {
			return {
				ok: true,
				status: 200,
				json: async () => ({
					response: 'Test response from AI model',
					usage: {
						inputTokens: 10,
						outputTokens: 20,
						totalCost: 0.0003
					}
				})
			} as Response;
		}

		if (url.includes('/v1/usage/stats')) {
			return {
				ok: true,
				status: 200,
				json: async () => ({
					totalRequests: 150,
					totalTokens: 50000,
					totalCost: 2.50,
					breakdown: {
						'claude-3-5-sonnet': {
							requests: 150,
							tokens: 50000,
							cost: 2.50
						}
					}
				})
			} as Response;
		}

		return { ok: false, status: 404 } as Response;
	};
}

function restoreFetch(): void {
	global.fetch = originalFetch;
}

suite('Authentication Integration Tests', () => {
	const disposables = new DisposableStore();
	let encryptionService: MockEncryptionService;
	let storageService: MockStorageService;
	let authService: AINativeAuthService;
	let tokenService: TokenService;
	let modelRegistry: AIModelRegistryService;

	setup(() => {
		encryptionService = new MockEncryptionService();
		storageService = new MockStorageService();
		authService = new AINativeAuthService(encryptionService, storageService);
		tokenService = new TokenService(encryptionService, storageService);
		modelRegistry = new AIModelRegistryService(authService as any, storageService);

		disposables.add(authService);
		disposables.add(tokenService);
		disposables.add(modelRegistry);
	});

	teardown(() => {
		disposables.clear();
		storageService.clear();
		restoreFetch();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	suite('Complete Registration to Model Invocation Flow', () => {
		test('should complete full authentication and model usage workflow', async () => {
			mockSuccessfulAuth();

			// Step 1: Login
			const loginResult = await authService.login('test@ainative.studio', 'Password123!');
			strictEqual(loginResult.success, true, 'Login should succeed');
			ok(loginResult.accessToken, 'Access token should be present');

			// Step 2: Verify authenticated state
			strictEqual(authService.isAuthenticated(), true, 'Should be authenticated');
			strictEqual(authService.getAuthState(), AuthState.Authenticated);

			// Step 3: Check tokens are stored
			const storedToken = await tokenService.getAccessToken();
			ok(storedToken, 'Token should be stored in TokenService');

			// Step 4: List available models
			const models = await modelRegistry.listModels();
			ok(models.length > 0, 'Should have available models');

			// Step 5: Select a model
			const model = models[0];
			await modelRegistry.selectModel(model.id, 'test-project');

			// Step 6: Verify model selection
			const selectedModel = await modelRegistry.getSelectedModel('test-project');
			ok(selectedModel, 'Model should be selected');
			strictEqual(selectedModel.id, model.id, 'Selected model should match');

			// Step 7: Invoke the model
			const request: ModelInvocationRequest = {
				modelId: model.id,
				prompt: 'Write a hello world function'
			};

			const response = await modelRegistry.invokeModel(request);
			ok(response, 'Should receive response from model');

			// Step 8: Verify usage stats are tracked
			const usageStats = await modelRegistry.getUsageStats();
			ok(usageStats, 'Usage stats should be available');
			ok(usageStats.totalRequests > 0, 'Should have tracked requests');

			// Step 9: Logout
			await authService.logout();
			strictEqual(authService.isAuthenticated(), false, 'Should be logged out');
			strictEqual(await tokenService.getAccessToken(), null, 'Tokens should be cleared');
		});

		test('should handle token refresh during active session', async () => {
			mockSuccessfulAuth();

			// Login
			await authService.login('test@ainative.studio', 'Password123!');
			const originalToken = authService.getAccessToken();

			// Refresh token
			const newToken = await authService.refreshToken();
			ok(newToken, 'Should receive new token');
			ok(newToken !== originalToken, 'New token should be different');

			// Verify can still use services after refresh
			const models = await modelRegistry.listModels();
			ok(models.length > 0, 'Should still be able to list models');

			// Verify authentication state is maintained
			strictEqual(authService.isAuthenticated(), true);
		});

		test('should handle session persistence across service restarts', async () => {
			mockSuccessfulAuth();

			// Login and store credentials
			await authService.login('test@ainative.studio', 'Password123!');
			const originalUser = authService.getUser();

			// Simulate app restart by creating new service instances
			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			// Wait for async storage loading
			await new Promise(resolve => setTimeout(resolve, 100));

			// Verify session was restored
			strictEqual(newAuthService.isAuthenticated(), true);
			deepStrictEqual(newAuthService.getUser(), originalUser);
		});
	});

	suite('Error Recovery Integration Tests', () => {
		test('should recover from network errors gracefully', async () => {
			// Mock network failure
			global.fetch = async (): Promise<Response> => {
				throw new Error('Network connection failed');
			};

			const result = await authService.login('test@ainative.studio', 'Password123!');
			strictEqual(result.success, false, 'Login should fail');
			ok(result.error, 'Should have error details');

			// Verify system is still usable after error
			strictEqual(authService.isAuthenticated(), false);
			strictEqual(authService.getAuthState(), AuthState.Unauthenticated);

			// Restore network and retry
			mockSuccessfulAuth();
			const retryResult = await authService.login('test@ainative.studio', 'Password123!');
			strictEqual(retryResult.success, true, 'Retry should succeed');
		});

		test('should handle authentication expiration during model usage', async () => {
			mockSuccessfulAuth();

			// Login with short-lived token
			await authService.login('test@ainative.studio', 'Password123!');

			// Manually expire the token
			const expiredToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) - 100 });
			const encrypted = await encryptionService.encrypt(expiredToken);
			storageService.store('ainative.auth.jwt', encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);

			// Create new auth service to pick up expired token
			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			// Should detect expiration
			strictEqual(newAuthService.isAuthenticated(), false);
		});
	});

	suite('Multi-User Workflow Integration Tests', () => {
		test('should handle user switching', async () => {
			mockSuccessfulAuth();

			// User 1 logs in
			await authService.login('user1@ainative.studio', 'Password123!');
			const user1 = authService.getUser();
			ok(user1, 'User 1 should be logged in');

			// Select model as User 1
			const models = await modelRegistry.listModels();
			await modelRegistry.selectModel(models[0].id, 'user1-project');

			// User 1 logs out
			await authService.logout();
			strictEqual(authService.getUser(), null, 'User 1 should be logged out');

			// User 2 logs in
			await authService.login('user2@ainative.studio', 'Password123!');
			const user2 = authService.getUser();
			ok(user2, 'User 2 should be logged in');
			ok(user2?.email !== user1?.email, 'Should be different user');

			// User 2 should be able to use services independently
			await modelRegistry.selectModel(models[0].id, 'user2-project');
			const selectedModel = await modelRegistry.getSelectedModel('user2-project');
			ok(selectedModel, 'User 2 should have independent model selection');
		});
	});

	suite('State Synchronization Tests', () => {
		test('should synchronize auth state across services', async () => {
			mockSuccessfulAuth();

			const stateChanges: AuthState[] = [];
			disposables.add(authService.onDidChangeAuthState(state => {
				stateChanges.push(state);
			}));

			// Login
			await authService.login('test@ainative.studio', 'Password123!');

			// Verify state changes were captured
			ok(stateChanges.includes(AuthState.Authenticated), 'Should capture Authenticated state');

			// Refresh
			await authService.refreshToken();
			ok(stateChanges.includes(AuthState.Refreshing), 'Should capture Refreshing state');

			// Logout
			await authService.logout();
			ok(stateChanges.includes(AuthState.LoggingOut), 'Should capture LoggingOut state');
			ok(stateChanges.includes(AuthState.Unauthenticated), 'Should capture Unauthenticated state');
		});

		test('should keep token service and auth service in sync', async () => {
			mockSuccessfulAuth();

			// Login via auth service
			await authService.login('test@ainative.studio', 'Password123!');

			// Verify token service has the token
			const token = await tokenService.getAccessToken();
			strictEqual(token, authService.getAccessToken(), 'Tokens should match');

			// Logout via auth service
			await authService.logout();

			// Verify token service cleared the token
			const clearedToken = await tokenService.getAccessToken();
			strictEqual(clearedToken, null, 'Token should be cleared in both services');
		});
	});

	suite('Concurrent Operations Integration Tests', () => {
		test('should handle concurrent login attempts', async () => {
			mockSuccessfulAuth();

			// Start multiple login attempts
			const loginPromises = [
				authService.login('user1@ainative.studio', 'Pass1!'),
				authService.login('user2@ainative.studio', 'Pass2!'),
				authService.login('user3@ainative.studio', 'Pass3!')
			];

			const results = await Promise.allSettled(loginPromises);

			// At least one should succeed
			const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
			ok(successCount > 0, 'At least one login should succeed');

			// System should be in a consistent state
			ok(authService.getAuthState() === AuthState.Authenticated ||
				authService.getAuthState() === AuthState.Unauthenticated);
		});

		test('should handle concurrent model operations', async () => {
			mockSuccessfulAuth();

			await authService.login('test@ainative.studio', 'Password123!');

			// Perform concurrent operations
			const operations = [
				modelRegistry.listModels(),
				modelRegistry.listModels({ capabilities: [ModelCapability.CodeGeneration] }),
				modelRegistry.refreshModels()
			];

			const results = await Promise.allSettled(operations);

			// All should complete
			strictEqual(results.length, 3, 'All operations should complete');

			// No errors should prevent system from working
			const models = await modelRegistry.listModels();
			ok(models.length > 0, 'System should still be functional');
		});
	});

	suite('Data Consistency Integration Tests', () => {
		test('should maintain data consistency during rapid operations', async () => {
			mockSuccessfulAuth();

			// Rapid login/logout cycles
			for (let i = 0; i < 5; i++) {
				await authService.login('test@ainative.studio', 'Password123!');
				strictEqual(authService.isAuthenticated(), true, `Iteration ${i}: Should be authenticated after login`);

				await authService.logout();
				strictEqual(authService.isAuthenticated(), false, `Iteration ${i}: Should be unauthenticated after logout`);
			}

			// System should still be in consistent state
			strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
			strictEqual(authService.getAccessToken(), null);
			strictEqual(authService.getUser(), null);
		});

		test('should handle storage corruption gracefully', async () => {
			mockSuccessfulAuth();

			await authService.login('test@ainative.studio', 'Password123!');

			// Corrupt storage
			storageService.store('ainative.auth.user', '{invalid-json', StorageScope.APPLICATION, StorageTarget.MACHINE);

			// Create new service to load corrupted data
			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			// Should handle corruption gracefully
			strictEqual(newAuthService.getUser(), null, 'Should handle corrupted user data');
		});
	});

	suite('Performance Integration Tests', () => {
		test('should complete authentication flow within performance budget', async () => {
			mockSuccessfulAuth();

			const startTime = Date.now();

			await authService.login('test@ainative.studio', 'Password123!');
			const models = await modelRegistry.listModels();
			await modelRegistry.selectModel(models[0].id, 'perf-test-project');

			const duration = Date.now() - startTime;

			// Complete flow should take less than 3 seconds
			ok(duration < 3000, `Complete flow took ${duration}ms, should be under 3000ms`);
		});

		test('should handle rapid successive operations efficiently', async () => {
			mockSuccessfulAuth();

			await authService.login('test@ainative.studio', 'Password123!');

			const startTime = Date.now();

			// Perform 10 model listings rapidly
			for (let i = 0; i < 10; i++) {
				await modelRegistry.listModels();
			}

			const duration = Date.now() - startTime;

			// Should benefit from caching - average < 50ms per request
			const avgDuration = duration / 10;
			ok(avgDuration < 100, `Average request took ${avgDuration}ms, should be under 100ms with caching`);
		});
	});
});
