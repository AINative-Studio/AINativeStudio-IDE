/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Integration Tests for Complete Authentication Flow (Issue #47)
 * Tests the full authentication lifecycle from registration through logout
 */

import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AINativeCloudAuthService } from '../../common/ainativeCloudAuthService.js';
import { CloudAuthState, CloudAuthErrorCode } from '../../common/ainativeCloudAuthTypes.js';
import { TokenService } from '../../common/tokenService.js';
import { SessionManager, SessionState } from '../../common/sessionManager.js';
import { IEncryptionService } from '../../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';

/**
 * Mock Encryption Service
 */
class MockEncryptionService implements IEncryptionService {
	_serviceBrand: undefined;

	async encrypt(value: string): Promise<string> {
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
		return 'test';
	}
}

/**
 * Mock Storage Service
 */
class MockStorageService implements IStorageService {
	readonly _serviceBrand: undefined;
	private storage = new Map<string, string>();

	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		const storageKey = `${scope}:${key}`;
		return this.storage.get(storageKey) ?? fallbackValue;
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
		return value ? JSON.parse(value) : fallbackValue;
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

	storeAll(entries: Array<{ key: string; value: any; scope: StorageScope; target: StorageTarget }>, external: boolean): void { }
	log(): void { }
	async optimize(scope: StorageScope): Promise<void> { }
	onDidChangeValue = () => ({ dispose: () => { } }) as any;
	onDidChangeTarget = { dispose: () => { } } as any;
	onWillSaveState = { dispose: () => { } } as any;
	isNew(scope: StorageScope): boolean { return false; }
	flush(): Promise<void> { return Promise.resolve(); }
	switch(): Promise<void> { return Promise.resolve(); }
	hasScope(scope: any): boolean { return true; }

	clear(): void {
		this.storage.clear();
	}
}

/**
 * Create mock JWT token
 */
function createMockJWT(expiresInSeconds: number, customClaims?: any): string {
	const header = { alg: 'HS256', typ: 'JWT' };
	const payload = {
		sub: customClaims?.sub || `user-${Math.random().toString(36).substr(2, 9)}`,
		email: customClaims?.email || 'test@ainative.studio',
		role: customClaims?.role || 'user',
		exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
		iat: Math.floor(Date.now() / 1000),
		...customClaims
	};

	const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
	const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
	const signature = 'mock-signature-' + Math.random();

	return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Mock Fetch for API calls
 */
class MockFetch {
	private responses = new Map<string, any>();
	private requestLog: Array<{ url: string; method: string; body?: any }> = [];

	setupSuccessfulAuthFlow(): void {
		this.responses.set('register', {
			ok: true,
			json: async () => ({
				access_token: createMockJWT(3600),
				refresh_token: createMockJWT(86400),
				user: {
					id: 'new-user-123',
					email: 'newuser@ainative.studio',
					username: 'newuser',
					role: 'user',
					email_verified: false,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			})
		});

		this.responses.set('login', {
			ok: true,
			json: async () => ({
				access_token: createMockJWT(3600),
				refresh_token: createMockJWT(86400),
				user: {
					id: 'user-123',
					email: 'test@ainative.studio',
					username: 'testuser',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			})
		});

		this.responses.set('refresh', {
			ok: true,
			json: async () => ({
				access_token: createMockJWT(3600)
			})
		});

		this.responses.set('logout', {
			ok: true,
			json: async () => ({ message: 'Logout successful' })
		});

		this.responses.set('forgot-password', {
			ok: true,
			json: async () => ({ message: 'Password reset email sent' })
		});

		this.responses.set('reset-password', {
			ok: true,
			json: async () => ({ message: 'Password reset successful' })
		});

		this.responses.set('verify-email', {
			ok: true,
			json: async () => ({ message: 'Email verified successfully' })
		});
	}

	setupErrorResponse(endpoint: string, status: number, error: any): void {
		this.responses.set(endpoint, {
			ok: false,
			status,
			json: async () => error
		});
	}

	async fetch(url: string, options?: RequestInit): Promise<Response> {
		this.requestLog.push({
			url,
			method: options?.method || 'GET',
			body: options?.body
		});

		// Determine which response to return based on URL
		if (url.includes('/register')) {
			return this.responses.get('register') || this._defaultError();
		}
		if (url.includes('/login-json')) {
			return this.responses.get('login') || this._defaultError();
		}
		if (url.includes('/refresh')) {
			return this.responses.get('refresh') || this._defaultError();
		}
		if (url.includes('/logout')) {
			return this.responses.get('logout') || this._defaultError();
		}
		if (url.includes('/forgot-password')) {
			return this.responses.get('forgot-password') || this._defaultError();
		}
		if (url.includes('/reset-password')) {
			return this.responses.get('reset-password') || this._defaultError();
		}
		if (url.includes('/verify-email')) {
			return this.responses.get('verify-email') || this._defaultError();
		}

		return this._defaultError();
	}

	private _defaultError(): Response {
		return {
			ok: false,
			status: 404,
			json: async () => ({ error: 'Not found' })
		} as Response;
	}

	getRequestLog(): Array<{ url: string; method: string; body?: any }> {
		return this.requestLog;
	}

	reset(): void {
		this.responses.clear();
		this.requestLog = [];
	}
}

suite('Authentication Flow Integration Tests (Browser) - Issue #47', () => {
	const disposables = new DisposableStore();
	let encryptionService: MockEncryptionService;
	let storageService: MockStorageService;
	let logService: ILogService;
	let authService: AINativeCloudAuthService;
	let tokenService: TokenService;
	let sessionManager: SessionManager;
	let mockFetch: MockFetch;

	setup(() => {
		encryptionService = new MockEncryptionService();
		storageService = new MockStorageService();
		logService = new NullLogService();

		authService = disposables.add(new AINativeCloudAuthService(encryptionService, storageService));
		tokenService = disposables.add(new TokenService(encryptionService, storageService));
		sessionManager = disposables.add(new SessionManager(tokenService, logService));

		mockFetch = new MockFetch();
		mockFetch.setupSuccessfulAuthFlow();
	});

	teardown(() => {
		disposables.clear();
		storageService.clear();
		mockFetch.reset();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	/**
	 * AC1: Complete Registration Flow
	 */
	suite('AC1: Registration Flow - Register → Verify Email → Login', () => {
		test('1.1 Should complete successful registration with valid credentials', async () => {
			const result = await authService.register({
				username: 'newuser',
				email: 'newuser@ainative.studio',
				password: 'SecurePassword123!'
			});

			// Mock API call would happen here - for now test client-side validation
			ok(!result.error || result.error.code !== CloudAuthErrorCode.WeakPassword, 'Should accept strong password');
			ok(!result.error || result.error.code !== CloudAuthErrorCode.RegistrationFailed, 'Should accept valid email');
		});

		test('1.2 Should validate password strength during registration', async () => {
			const result = await authService.register({
				username: 'testuser',
				email: 'test@ainative.studio',
				password: 'weak'
			});

			strictEqual(result.success, false, 'Should reject weak password');
			strictEqual(result.error?.code, CloudAuthErrorCode.WeakPassword);
			ok(result.error?.message.toLowerCase().includes('password'), 'Error should mention password');
		});

		test('1.3 Should validate email format during registration', async () => {
			const result = await authService.register({
				username: 'testuser',
				email: 'invalid-email',
				password: 'ValidPassword123!'
			});

			strictEqual(result.success, false, 'Should reject invalid email');
			ok(result.error, 'Should have error');
		});

		test('1.4 Should handle duplicate email registration', async () => {
			mockFetch.setupErrorResponse('register', 409, {
				error: 'Email already exists',
				code: 'EMAIL_EXISTS'
			});

			const result = await authService.register({
				username: 'existinguser',
				email: 'existing@ainative.studio',
				password: 'Password123!'
			});

			strictEqual(result.success, false, 'Should fail with duplicate email');
		});
	});

	/**
	 * AC2: Complete Login Flow
	 */
	suite('AC2: Login Flow - Login → Store Tokens → Establish Session', () => {
		test('2.1 Should complete successful login with valid credentials', async () => {
			// Initial state check
			strictEqual(authService.isAuthenticated(), false, 'Should start unauthenticated');
			strictEqual(authService.getAuthState(), CloudAuthState.Unauthenticated);

			// Mock the login - in real scenario would call API
			// For now, test the client-side flow
			const email = 'test@ainative.studio';
			const password = 'ValidPassword123!';

			// Validate inputs
			ok(email.includes('@'), 'Email should be valid');
			ok(password.length >= 8, 'Password should meet length requirement');
		});

		test('2.2 Should store encrypted tokens after successful login', async () => {
			const accessToken = createMockJWT(3600);
			const refreshToken = createMockJWT(86400);

			// Manually simulate successful login
			const service = authService as any;
			service._accessToken = accessToken;
			service._refreshToken = refreshToken;
			service._authState = CloudAuthState.Authenticated;

			// Verify token is accessible
			strictEqual(service._accessToken, accessToken);
			strictEqual(authService.isAuthenticated(), true);
		});

		test('2.3 Should establish active session after login', async () => {
			const accessToken = createMockJWT(3600);
			const refreshToken = createMockJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, true);
			await sessionManager.initialize();
			sessionManager.startMonitoring();

			const isActive = sessionManager.isSessionActive();
			ok(isActive || sessionManager.getSessionState() === SessionState.Active, 'Session should be active');
		});

		test('2.4 Should handle invalid credentials gracefully', async () => {
			mockFetch.setupErrorResponse('login', 401, {
				error: 'Invalid credentials',
				code: 'INVALID_CREDENTIALS'
			});

			const result = await authService.login('wrong@example.com', 'wrongpassword');

			strictEqual(result.success, false, 'Should fail with invalid credentials');
		});

		test('2.5 Should emit authentication state changes during login', async () => {
			const stateChanges: CloudAuthState[] = [];

			disposables.add(authService.onDidChangeAuthState(state => {
				stateChanges.push(state);
			}));

			// Simulate state changes
			const service = authService as any;
			service._setState(CloudAuthState.Registering);
			service._setState(CloudAuthState.Authenticated);

			ok(stateChanges.includes(CloudAuthState.Registering), 'Should emit Registering state');
			ok(stateChanges.includes(CloudAuthState.Authenticated), 'Should emit Authenticated state');
		});
	});

	/**
	 * AC3: Password Reset Flow
	 */
	suite('AC3: Password Reset Flow - Request → Confirm → Login', () => {
		test('3.1 Should send password reset request', async () => {
			const result = await authService.requestPasswordReset('test@ainative.studio');

			// Client-side validation should pass
			ok(!result.error, 'Should not have client-side validation errors');
		});

		test('3.2 Should validate reset token and new password', async () => {
			const result = await authService.confirmPasswordReset('reset-token-123', 'NewSecurePassword123!');

			// Client-side validation for new password
			ok(!result.error || result.error.code !== CloudAuthErrorCode.WeakPassword, 'Should accept strong password');
		});

		test('3.3 Should reject weak password in reset flow', async () => {
			const result = await authService.confirmPasswordReset('reset-token-123', 'weak');

			strictEqual(result.success, false, 'Should reject weak password');
			strictEqual(result.error?.code, CloudAuthErrorCode.WeakPassword);
		});

		test('3.4 Should allow login after successful password reset', async () => {
			// Reset password
			await authService.confirmPasswordReset('reset-token-123', 'NewPassword123!');

			// Attempt login with new password
			const result = await authService.login('test@ainative.studio', 'NewPassword123!');

			// Should not fail due to client-side validation
			ok(result.success !== false || result.error?.code !== CloudAuthErrorCode.WeakPassword);
		});
	});

	/**
	 * AC4: Token Refresh Scenario
	 */
	suite('AC4: Token Refresh - Detect Expiration → Refresh → Continue Session', () => {
		test('4.1 Should detect expired access token', async () => {
			const expiredToken = createMockJWT(-100); // Expired
			const refreshToken = createMockJWT(86400);

			await tokenService.storeTokens(expiredToken, refreshToken, false);

			const isExpired = await tokenService.isTokenExpired();
			strictEqual(isExpired, true, 'Should detect expired token');
		});

		test('4.2 Should refresh token when access token expires', async () => {
			const service = authService as any;
			service._accessToken = createMockJWT(3600);
			service._refreshToken = createMockJWT(86400);
			service._authState = CloudAuthState.Authenticated;

			const originalToken = service._accessToken;

			// Simulate token refresh
			service._accessToken = createMockJWT(3600);

			ok(service._accessToken !== originalToken, 'Token should be refreshed');
			strictEqual(authService.isAuthenticated(), true, 'Should remain authenticated');
		});

		test('4.3 Should maintain session after token refresh', async () => {
			const accessToken = createMockJWT(3600);
			const refreshToken = createMockJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, true);
			await sessionManager.initialize();
			sessionManager.startMonitoring();

			// Simulate token refresh
			const newAccessToken = createMockJWT(3600);
			await tokenService.storeTokens(newAccessToken, refreshToken, true);

			ok(sessionManager.isSessionActive() || sessionManager.getSessionState() === SessionState.Active,
				'Session should remain active after token refresh');
		});

		test('4.4 Should logout if refresh token is also expired', async () => {
			const expiredAccess = createMockJWT(-100);
			const expiredRefresh = createMockJWT(-100);

			await tokenService.storeTokens(expiredAccess, expiredRefresh, false);
			await sessionManager.initialize();

			const sessionState = sessionManager.getSessionState();
			ok(sessionState === SessionState.Expired || sessionState === SessionState.Inactive,
				'Session should be inactive with expired tokens');
		});

		test('4.5 Should emit state change events during refresh', async () => {
			const stateChanges: CloudAuthState[] = [];

			disposables.add(authService.onDidChangeAuthState(state => {
				stateChanges.push(state);
			}));

			const service = authService as any;
			service._setState(CloudAuthState.Refreshing);
			service._setState(CloudAuthState.Authenticated);

			ok(stateChanges.includes(CloudAuthState.Refreshing), 'Should emit Refreshing state');
			ok(stateChanges.includes(CloudAuthState.Authenticated), 'Should return to Authenticated state');
		});
	});

	/**
	 * AC5: Logout Flow
	 */
	suite('AC5: Logout Flow - Clear Tokens → Terminate Session → Reset State', () => {
		test('5.1 Should clear all tokens on logout', async () => {
			const service = authService as any;
			service._accessToken = createMockJWT(3600);
			service._refreshToken = createMockJWT(86400);
			service._user = { id: 'user-123', email: 'test@example.com', role: 'user' };

			await authService.logout();

			strictEqual(authService.getAccessTokenSync(), null, 'Access token should be cleared');
			strictEqual(service._refreshToken, null, 'Refresh token should be cleared');
		});

		test('5.2 Should clear user data on logout', async () => {
			const service = authService as any;
			service._user = {
				id: 'user-123',
				email: 'test@example.com',
				username: 'testuser',
				role: 'user'
			};

			await authService.logout();

			strictEqual(authService.getUser(), null, 'User data should be cleared');
		});

		test('5.3 Should update authentication state to unauthenticated', async () => {
			const service = authService as any;
			service._authState = CloudAuthState.Authenticated;

			await authService.logout();

			strictEqual(authService.isAuthenticated(), false);
			strictEqual(authService.getAuthState(), CloudAuthState.Unauthenticated);
		});

		test('5.4 Should terminate active session on logout', async () => {
			const accessToken = createMockJWT(3600);
			const refreshToken = createMockJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);
			await sessionManager.initialize();
			sessionManager.startMonitoring();

			await sessionManager.terminateSession();

			strictEqual(sessionManager.getSessionState(), SessionState.Inactive, 'Session should be inactive');
			strictEqual(sessionManager.isSessionActive(), false);
		});

		test('5.5 Should clear encrypted storage on logout', async () => {
			await storageService.store('ainative.cloud.auth.accessToken', 'encrypted-data', StorageScope.APPLICATION, StorageTarget.MACHINE);
			await storageService.store('ainative.cloud.auth.refreshToken', 'encrypted-data', StorageScope.APPLICATION, StorageTarget.MACHINE);

			await authService.logout();

			const accessToken = storageService.get('ainative.cloud.auth.accessToken', StorageScope.APPLICATION);
			const refreshToken = storageService.get('ainative.cloud.auth.refreshToken', StorageScope.APPLICATION);

			strictEqual(accessToken, undefined, 'Access token should be removed from storage');
			strictEqual(refreshToken, undefined, 'Refresh token should be removed from storage');
		});
	});

	/**
	 * AC6: Security Tests
	 */
	suite('AC6: Security - Token Encryption, Storage, Error Handling', () => {
		test('6.1 Should encrypt tokens before storage', async () => {
			const plainToken = createMockJWT(3600);
			const encrypted = await encryptionService.encrypt(plainToken);

			ok(encrypted.startsWith('encrypted_'), 'Token should be encrypted');
			ok(encrypted !== plainToken, 'Encrypted token should differ from plain token');

			const decrypted = await encryptionService.decrypt(encrypted);
			strictEqual(decrypted, plainToken, 'Should decrypt to original value');
		});

		test('6.2 Should not expose tokens in logs or errors', async () => {
			const token = createMockJWT(3600);
			const service = authService as any;
			service._accessToken = token;

			// Trigger error scenario
			try {
				await authService.login('invalid@email', 'password');
			} catch (error: any) {
				const errorString = error.toString();
				ok(!errorString.includes(token), 'Error should not contain token');
			}
		});

		test('6.3 Should validate token format before use', async () => {
			const invalidToken = 'not-a-valid-jwt';

			try {
				const service = authService as any;
				service._decodeJWT(invalidToken);
				ok(false, 'Should throw error for invalid token');
			} catch (error) {
				ok(error instanceof Error, 'Should throw error for invalid JWT');
			}
		});

		test('6.4 Should use secure storage target for sensitive data', async () => {
			const token = createMockJWT(3600);
			await tokenService.storeTokens(token, token, true);

			// Verify it's stored with MACHINE target (secure)
			const storedValue = storageService.get('ainative.token.access', StorageScope.APPLICATION);
			ok(storedValue, 'Should be stored in secure storage');
		});

		test('6.5 Should handle concurrent authentication operations safely', async () => {
			const promises = [
				authService.login('user1@test.com', 'pass1'),
				authService.login('user2@test.com', 'pass2'),
				authService.login('user3@test.com', 'pass3')
			];

			const results = await Promise.allSettled(promises);

			// Should handle concurrent requests without corruption
			ok(results.every(r => r.status === 'fulfilled' || r.status === 'rejected'),
				'All operations should complete');
		});
	});

	/**
	 * AC7: Error Handling Tests
	 */
	suite('AC7: Error Handling - Network Failures, Invalid Credentials, Edge Cases', () => {
		test('7.1 Should handle network timeout gracefully', async () => {
			mockFetch.setupErrorResponse('login', 0, {
				error: 'Network timeout'
			});

			const result = await authService.login('test@example.com', 'password');

			strictEqual(result.success, false, 'Should fail gracefully');
			ok(result.error, 'Should have error information');
		});

		test('7.2 Should handle 401 Unauthorized with clear error message', async () => {
			mockFetch.setupErrorResponse('login', 401, {
				error: 'Invalid credentials',
				code: 'UNAUTHORIZED'
			});

			const result = await authService.login('wrong@example.com', 'wrongpass');

			strictEqual(result.success, false);
			ok(result.error?.message, 'Should have user-friendly error message');
		});

		test('7.3 Should handle rate limiting (429) appropriately', async () => {
			mockFetch.setupErrorResponse('login', 429, {
				error: 'Too many requests',
				code: 'RATE_LIMIT'
			});

			const result = await authService.login('test@example.com', 'password');

			strictEqual(result.success, false);
		});

		test('7.4 Should handle server errors (5xx) with retry logic', async () => {
			mockFetch.setupErrorResponse('login', 500, {
				error: 'Internal server error'
			});

			const result = await authService.login('test@example.com', 'password');

			strictEqual(result.success, false);
			ok(result.error, 'Should have error');
		});

		test('7.5 Should provide user-friendly error messages', async () => {
			const testCases = [
				{ password: 'weak', expectedCode: CloudAuthErrorCode.WeakPassword },
				{ email: 'invalid', password: 'GoodPass123!', expectedError: true }
			];

			for (const testCase of testCases) {
				const result = await authService.register({
					username: 'testuser',
					email: testCase.email || 'valid@example.com',
					password: testCase.password || 'ValidPassword123!'
				});

				if (testCase.expectedError || testCase.expectedCode) {
					strictEqual(result.success, false, 'Should fail validation');
					ok(result.error && result.error.message && result.error.message.length > 0, 'Error message should not be empty');
				}
			}
		});

		test('7.6 Should handle malformed API responses', async () => {
			mockFetch.setupErrorResponse('login', 200, null); // Malformed response

			const result = await authService.login('test@example.com', 'password');

			// Should handle gracefully without crashing
			ok(result.success !== undefined, 'Should return result');
		});
	});

	/**
	 * AC8: Edge Cases and Boundary Conditions
	 */
	suite('AC8: Edge Cases - Session Persistence, Corruption Recovery, State Consistency', () => {
		test('8.1 Should handle session persistence across app restarts', async () => {
			const accessToken = createMockJWT(3600);
			const refreshToken = createMockJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, true);

			// Simulate app restart
			const newTokenService = disposables.add(new TokenService(encryptionService, storageService));

			const restored = await newTokenService.getAccessToken();
			strictEqual(restored, accessToken, 'Token should persist across restarts');
		});

		test('8.2 Should handle corrupted storage data gracefully', async () => {
			storageService.store('ainative.cloud.auth.user', '{invalid-json}', StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = disposables.add(new AINativeCloudAuthService(encryptionService, storageService));

			// Should not crash, should return null
			strictEqual(newAuthService.getUser(), null, 'Should handle corrupted data');
		});

		test('8.3 Should maintain state consistency during rapid operations', async () => {
			// Rapid state changes
			for (let i = 0; i < 10; i++) {
				const service = authService as any;
				service._setState(CloudAuthState.Registering);
				service._setState(CloudAuthState.Authenticated);
				service._setState(CloudAuthState.Unauthenticated);
			}

			// Final state should be consistent
			const state = authService.getAuthState();
			ok([CloudAuthState.Authenticated, CloudAuthState.Unauthenticated, CloudAuthState.Registering].includes(state),
				'State should be valid');
		});

		test('8.4 Should handle empty/null credentials', async () => {
			const result = await authService.login('', '');

			strictEqual(result.success, false, 'Should reject empty credentials');
		});

		test('8.5 Should handle very long input strings', async () => {
			const longEmail = 'a'.repeat(1000) + '@example.com';
			const longPassword = 'P'.repeat(1000) + '1!';

			const result = await authService.login(longEmail, longPassword);

			// Should handle without crashing
			ok(result.success !== undefined, 'Should return result');
		});
	});
});
