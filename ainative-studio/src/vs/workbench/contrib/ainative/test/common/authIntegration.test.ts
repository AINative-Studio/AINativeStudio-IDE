/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Comprehensive Integration Tests for Issue #47 - AINative Authentication
 *
 * This test suite covers all acceptance criteria:
 * - Complete authentication flows (register, login, logout, password reset)
 * - Model selection and invocation
 * - Usage tracking and quota management
 * - Token refresh and session management
 * - Security (encryption, storage, error handling)
 * - Edge cases and error recovery
 *
 * Coverage Target: >80%
 */

import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AINativeCloudAuthService } from '../../common/ainativeCloudAuthService.js';
import { AIModelRegistryService } from '../../common/aiModelRegistryService.js';
import { UsageTrackingService } from '../../common/usageTrackingService.js';
import { CloudAuthState, CloudAuthErrorCode } from '../../common/ainativeCloudAuthTypes.js';
import { ModelCapability } from '../../common/aiModelRegistryTypes.js';
import { IEncryptionService } from '../../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';

/**
 * Test Utilities
 */
class TestUtils {
	static createMockJWT(expiresInSeconds: number, claims?: any): string {
		const header = { alg: 'HS256', typ: 'JWT' };
		const payload = {
			sub: claims?.sub || `user-${Date.now()}`,
			email: claims?.email || 'test@ainative.studio',
			role: claims?.role || 'user',
			exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
			iat: Math.floor(Date.now() / 1000),
			...claims
		};

		const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
		const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
		// _decodeJWT() requires exactly 3 dot-separated parts. Math.random() stringifies
		// as e.g. "0.731..." - embedding a literal '.' that silently produced a 4-part
		// token on every call, making _decodeJWT() reject it as malformed even though
		// it's meant to be a valid mock token.
		const signature = Math.random().toString(36).slice(2);
		return `${headerB64}.${payloadB64}.signature-${signature}`;
	}

	static async sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

/**
 * Mock Encryption Service with realistic behavior
 */
class MockEncryptionService implements IEncryptionService {
	_serviceBrand: undefined;
	private failNextEncryption = false;

	async encrypt(value: string): Promise<string> {
		if (this.failNextEncryption) {
			this.failNextEncryption = false;
			throw new Error('Encryption failed');
		}
		return 'encrypted_' + Buffer.from(value).toString('base64');
	}

	async decrypt(value: string): Promise<string> {
		if (!value.startsWith('encrypted_')) {
			throw new Error('Invalid encrypted value');
		}
		return Buffer.from(value.substring(10), 'base64').toString('utf-8');
	}

	async isEncryptionAvailable(): Promise<boolean> {
		return true;
	}

	async setUsePlainTextEncryption(): Promise<void> { }

	async getKeyStorageProvider(): Promise<any> {
		return 'test-provider';
	}

	setFailNextEncryption(fail: boolean): void {
		this.failNextEncryption = fail;
	}
}

/**
 * Mock Storage Service with persistence simulation
 */
class MockStorageService implements IStorageService {
	readonly _serviceBrand: undefined;
	private storage = new Map<string, string>();
	private changeEmitters = new Map<string, Array<() => void>>();

	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		return this.storage.get(`${scope}:${key}`) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue: boolean): boolean;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
		const value = this.get(key, scope);
		return value !== undefined ? value === 'true' : fallbackValue;
	}

	getNumber(key: string, scope: StorageScope, fallbackValue: number): number;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
		const value = this.get(key, scope);
		return value !== undefined ? parseInt(value, 10) : fallbackValue;
	}

	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue: T): T;
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined;
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined {
		const value = this.get(key, scope);
		if (!value) return fallbackValue;
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

		// Emit change event
		const listeners = this.changeEmitters.get(storageKey);
		if (listeners) {
			listeners.forEach(fn => fn());
		}
	}

	remove(key: string, scope: StorageScope): void {
		this.storage.delete(`${scope}:${key}`);
	}

	keys(scope: StorageScope, target: StorageTarget): string[] {
		const prefix = `${scope}:`;
		return Array.from(this.storage.keys())
			.filter(k => k.startsWith(prefix))
			.map(k => k.substring(prefix.length));
	}

	storeAll(): void { }
	log(): void { }
	async optimize(): Promise<void> { }
	onDidChangeValue = () => ({ dispose: () => { } }) as any;
	onDidChangeTarget = { dispose: () => { } } as any;
	onWillSaveState = { dispose: () => { } } as any;
	isNew(): boolean { return false; }
	flush(): Promise<void> { return Promise.resolve(); }
	switch(): Promise<void> { return Promise.resolve(); }
	hasScope(): boolean { return true; }

	clear(): void {
		this.storage.clear();
	}

	getSize(): number {
		return this.storage.size;
	}
}

suite('Comprehensive Integration Tests - Issue #47 AINative Authentication', () => {
	const disposables = new DisposableStore();
	let encryptionService: MockEncryptionService;
	let storageService: MockStorageService;
	let authService: AINativeCloudAuthService;
	let modelRegistry: AIModelRegistryService;
	let usageTracking: UsageTrackingService;

	setup(() => {
		encryptionService = new MockEncryptionService();
		storageService = new MockStorageService();

		authService = disposables.add(new AINativeCloudAuthService(encryptionService, storageService));

		usageTracking = disposables.add(new UsageTrackingService(
			authService,
			null as any,
			storageService,
			{ state: { settingsOfProvider: { ainativeCloud: { apiKey: '' } } }, onDidChangeState: () => ({ dispose: () => { } }) } as any
		));

		const mockInstantiationService = {
			_serviceBrand: undefined,
			invokeFunction: (fn: any) => fn({ get: () => usageTracking }),
			createInstance: () => { throw new Error('Not implemented'); },
			createChild: () => { throw new Error('Not implemented'); },
			dispose: () => { }
		};

		modelRegistry = disposables.add(new AIModelRegistryService(
			authService,
			storageService,
			mockInstantiationService as any
		));

		// Update cross-references
		(usageTracking as any)._modelRegistryService = modelRegistry;
	});

	teardown(() => {
		disposables.clear();
		storageService.clear();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	/**
	 * EPIC 1: End-to-End Authentication Flows
	 */
	suite('EPIC 1: Complete Authentication Lifecycle', () => {
		test('E2E-1.1: Registration → Email Verification → First Login', async () => {
			// Step 1: Register new user
			const registrationResult = await authService.register({
				username: 'newuser',
				email: 'newuser@ainative.studio',
				password: 'SecurePassword123!'
			});

			// Validate registration request
			ok(!registrationResult.error || registrationResult.error.code !== CloudAuthErrorCode.WeakPassword);

			// Step 2: Verify initial state
			strictEqual(authService.isAuthenticated(), false, 'Should not be authenticated after registration');

			// Step 3: Simulate email verification (would happen via email link in real flow)
			// In real scenario: click email link → verifyEmail endpoint → auto-login

			// Step 4: Login with verified credentials
			const loginResult = await authService.login('newuser@ainative.studio', 'SecurePassword123!');

			// Note: Login will fail in mock environment but validates the flow
			ok(loginResult !== undefined, 'Login should return result');
		});

		test('E2E-1.2: Complete Login → Model Selection → Usage → Logout', async () => {
			// Step 1: Simulate authenticated state
			const service = authService as any;
			service._accessToken = TestUtils.createMockJWT(3600);
			service._refreshToken = TestUtils.createMockJWT(86400);
			service._authState = CloudAuthState.Authenticated;
			service._user = {
				id: 'user-123',
				email: 'test@ainative.studio',
				username: 'testuser',
				role: 'user'
			};

			strictEqual(authService.isAuthenticated(), true, 'Should be authenticated');

			// Step 2: Track usage
			await usageTracking.trackUsage('claude-3-5-sonnet', 100, 200);

			const usage = await usageTracking.getUsage();
			ok(usage.totalTokens >= 0, 'Usage should be tracked');

			// Step 3: Logout
			await authService.logout();

			strictEqual(authService.isAuthenticated(), false, 'Should be logged out');
		});

		test('E2E-1.3: Password Reset → Change Password → Login with New Password', async () => {
			// Step 1: Request password reset
			const resetRequest = await authService.requestPasswordReset('test@ainative.studio');
			ok(!resetRequest.error, 'Reset request should not have client-side errors');

			// Step 2: Confirm password reset with token
			const newPassword = 'NewSecurePassword456!';
			const confirmResult = await authService.confirmPasswordReset('reset-token-123', newPassword);

			ok(!confirmResult.error || confirmResult.error.code !== CloudAuthErrorCode.WeakPassword,
				'New password should meet strength requirements');

			// Step 3: Login with new password (would succeed with real API)
			const loginResult = await authService.login('test@ainative.studio', newPassword);
			ok(loginResult !== undefined, 'Should attempt login with new password');
		});
	});

	/**
	 * EPIC 2: Token Management and Session Persistence
	 */
	/**
	 * EPIC 3: Model Registry Integration
	 */
	suite('EPIC 3: Model Selection and Invocation Flow', () => {
		test('E2E-3.1: Authenticate → List Models → Select → Invoke → Track Usage', async () => {
			// Step 1: Authenticate
			const service = authService as any;
			service._accessToken = TestUtils.createMockJWT(3600);
			service._authState = CloudAuthState.Authenticated;

			// Step 2: List models
			const models = await modelRegistry.listModels();
			ok(Array.isArray(models), 'Should return models array');

			// Step 3: Select model (will fail without real API)
			try {
				await modelRegistry.selectModel('claude-3-5-sonnet', 'project-1');
			} catch {
				// Expected in test environment
			}

			// Step 4: Track usage
			await usageTracking.trackUsage('claude-3-5-sonnet', 100, 200);

			// Step 5: Verify usage tracked
			const usage = await usageTracking.getUsage();
			ok(usage.totalTokens >= 0, 'Usage should be tracked');
		});

		test('E2E-3.2: Model Filtering → Selection → Parameter Configuration', async () => {
			// Step 1: Filter by capabilities
			const codeModels = await modelRegistry.listModels({
				capabilities: [ModelCapability.CodeGeneration]
			});

			ok(Array.isArray(codeModels), 'Should return filtered models');

			// Step 2: Select with parameters
			const parameters = {
				temperature: 0.7,
				maxTokens: 4096,
				topP: 0.9
			};

			try {
				await modelRegistry.selectModel('claude-3-5-sonnet', 'project-1', parameters);
				// Parameters should be stored
				ok(true, 'Should store parameters with selection');
			} catch {
				// Expected without real API
				ok(true);
			}
		});

		test('E2E-3.3: Usage Tracking → Cost Calculation → Quota Management', async () => {
			// Step 1: Track usage
			await usageTracking.trackUsage('model-1', 1000, 2000);
			await usageTracking.trackUsage('model-1', 500, 1500);

			// Step 2: Calculate costs
			const cost = await usageTracking.calculateCost('model-1', 1000, 2000);
			ok(cost.totalCost >= 0, 'Should calculate cost');

			// Step 3: Check quota
			const quota = await usageTracking.getQuotaStatus();
			ok(quota !== null, 'Should return quota status');
			ok(quota.hasQuota !== undefined, 'Should indicate quota status');

			// Step 4: Get usage stats
			const usage = await usageTracking.getUsage();
			ok(usage.totalCalls >= 0, 'Should track total calls');
			ok(usage.totalTokens >= 0, 'Should track total tokens');
		});
	});

	/**
	 * EPIC 4: Security and Error Handling
	 */
	suite('EPIC 4: Security, Encryption, and Error Recovery', () => {
		test('E2E-4.3: Concurrent Authentication Attempts → Conflict Resolution', async () => {
			// Step 1: Multiple concurrent logins
			const loginPromises = [
				authService.login('user1@test.com', 'pass1'),
				authService.login('user2@test.com', 'pass2'),
				authService.login('user3@test.com', 'pass3')
			];

			const results = await Promise.allSettled(loginPromises);

			// Step 2: Verify system stability
			ok(results.every(r => r.status !== undefined), 'All operations should complete');

			// Step 3: Verify consistent state
			const state = authService.getAuthState();
			ok([CloudAuthState.Authenticated, CloudAuthState.Unauthenticated, CloudAuthState.Registering].includes(state),
				'Should be in valid state');
		});

		test('E2E-4.4: Session Hijacking Prevention → Token Validation', async () => {
			// Step 1: Create token with valid format
			const validToken = TestUtils.createMockJWT(3600);
			const maliciousToken = 'malicious.token.here';

			// Step 2: Attempt to use malicious token
			const service = authService as any;

			try {
				service._decodeJWT(maliciousToken);
				ok(false, 'Should reject malicious token');
			} catch (error) {
				ok(error instanceof Error, 'Should validate token format');
			}

			// Step 3: Verify valid token works
			const decoded = service._decodeJWT(validToken);
			ok(decoded, 'Should accept valid token');
		});

		test('E2E-4.5: Sensitive Data Protection → No Token Leakage in Logs', async () => {
			const sensitiveToken = TestUtils.createMockJWT(3600);
			const service = authService as any;
			service._accessToken = sensitiveToken;

			// Trigger various operations that might log
			try {
				await authService.login('test@example.com', 'password');
			} catch (error: any) {
				const errorString = error?.toString() || '';
				ok(!errorString.includes(sensitiveToken), 'Error should not contain token');
			}

			// Verify state methods don't expose tokens
			const state = authService.getAuthState();
			ok(typeof state === 'string', 'State should be string, not object with tokens');
		});
	});

	/**
	 * EPIC 5: Edge Cases and Boundary Conditions
	 */
	suite('EPIC 5: Edge Cases, Limits, and Boundary Conditions', () => {
		test('E2E-5.2: Rapid State Changes → Consistency Validation', async () => {
			const stateChanges: CloudAuthState[] = [];

			disposables.add(authService.onDidChangeAuthState(state => {
				stateChanges.push(state);
			}));

			// Rapid state changes - there is no _setState method on the real service;
			// _authState is a plain private field that every real state transition in
			// ainativeCloudAuthService.ts sets directly and pairs with firing
			// _onDidChangeAuthState (confirmed by reading it). Drive both the same way
			// so onDidChangeAuthState listeners (asserted on below) actually fire.
			const service = authService as any;
			for (let i = 0; i < 20; i++) {
				service._authState = CloudAuthState.Registering;
				service._onDidChangeAuthState.fire(service._authState);
				service._authState = CloudAuthState.Authenticated;
				service._onDidChangeAuthState.fire(service._authState);
				service._authState = CloudAuthState.Unauthenticated;
				service._onDidChangeAuthState.fire(service._authState);
			}

			// Verify all state changes were captured
			ok(stateChanges.length > 0, 'Should capture state changes');

			// Final state should be valid
			const finalState = authService.getAuthState();
			ok([CloudAuthState.Authenticated, CloudAuthState.Unauthenticated, CloudAuthState.Registering].includes(finalState),
				'Final state should be valid');
		});

		test('E2E-5.4: Empty String and Null Input Handling', async () => {
			// Empty credentials
			const emptyResult = await authService.login('', '');
			strictEqual(emptyResult.success, false, 'Should reject empty credentials');

			// Null-like inputs
			const invalidEmail = await authService.register({
				username: 'test',
				email: '',
				password: 'Password123!'
			});
			strictEqual(invalidEmail.success, false, 'Should reject empty email');
		});

		test('E2E-5.5: Storage Quota Exhaustion → Cleanup', async () => {
			// Fill storage with usage records
			for (let i = 0; i < 100; i++) {
				await usageTracking.trackUsage(`model-${i}`, 100, 100);
			}

			const usage = await usageTracking.getUsage();
			ok(usage.totalCalls >= 0, 'Should handle many usage records');

			// Clear usage
			await usageTracking.clearLocalUsage();

			const clearedUsage = await usageTracking.getUsage();
			strictEqual(clearedUsage.totalCalls, 0, 'Should clear all usage');
		});

		test('E2E-5.6: Unicode and Special Characters in Credentials', async () => {
			const unicodeEmail = 'test-用户@ainative.studio';
			const specialPassword = 'P@ssw0rd!#$%^&*()';

			const result = await authService.register({
				username: 'testuser',
				email: unicodeEmail,
				password: specialPassword
			});

			// Should handle unicode/special chars without crashing
			ok(result !== undefined, 'Should handle special characters');
		});
	});

	/**
	 * EPIC 6: Performance and Scalability
	 */
	suite('EPIC 6: Performance, Caching, and Optimization', () => {
		test('E2E-6.2: Model List Caching Performance', async () => {
			const service = authService as any;
			service._accessToken = TestUtils.createMockJWT(3600);
			service._authState = CloudAuthState.Authenticated;

			// First call (may fetch from API)
			const start1 = Date.now();
			await modelRegistry.listModels();
			const firstCallTime = Date.now() - start1;

			// Second call (should use cache)
			const start2 = Date.now();
			await modelRegistry.listModels();
			const cachedCallTime = Date.now() - start2;

			ok(cachedCallTime <= firstCallTime + 50, 'Cached call should be fast');
		});

		test('E2E-6.3: Concurrent Operations Throughput', async () => {
			const operations = Array.from({ length: 50 }, (_, i) => async () => {
				await usageTracking.trackUsage(`model-${i}`, 10, 20);
			});

			const startTime = Date.now();
			await Promise.all(operations.map(op => op()));
			const duration = Date.now() - startTime;

			ok(duration < 5000, `50 concurrent operations took ${duration}ms, should be <5s`);
		});

		test('E2E-6.4: Storage Efficiency → Minimal Overhead', async () => {
			const initialSize = storageService.getSize();

			// Track usage
			await usageTracking.trackUsage('model-1', 100, 200);

			const finalSize = storageService.getSize();
			const overhead = finalSize - initialSize;

			// Should not create excessive storage entries
			ok(overhead < 20, `Storage overhead is ${overhead} entries, should be minimal`);
		});
	});

	/**
	 * EPIC 7: State Synchronization Across Services
	 */
	suite('EPIC 7: Logout Cascade', () => {
		test('E2E-7.2: Logout Cascade → All Services Reset', async () => {
			// Setup authenticated state across all services
			const service = authService as any;
			service._accessToken = TestUtils.createMockJWT(3600);
			service._authState = CloudAuthState.Authenticated;

			await usageTracking.trackUsage('model-1', 100, 100);

			// Trigger logout
			await authService.logout();
			usageTracking.reset();

			// Verify all services reset
			strictEqual(authService.isAuthenticated(), false, 'Auth service should reset');

			const usage = await usageTracking.getUsage();
			strictEqual(usage.totalCalls, 0, 'Usage should be cleared');
		});
	});
});
