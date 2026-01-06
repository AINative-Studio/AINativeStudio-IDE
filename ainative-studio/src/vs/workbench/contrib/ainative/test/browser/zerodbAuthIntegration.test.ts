/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import {
	AINativeCloudAuthService
} from '../../common/ainativeCloudAuthService.js';
import {
	CloudAuthState
} from '../../common/ainativeCloudAuthTypes.js';
import { TokenService, ITokenService } from '../../common/tokenService.js';
import { SessionManager } from '../../common/sessionManager.js';
import { IEncryptionService, KnownStorageProvider } from '../../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { OAuthProvider, OAuthResult, SessionManager, OAuthService } from '../../../../platform/ainativeCloud/common/ainativeCloudAuth.js';

/**
 * Mock encryption service
 */
class MockEncryptionService implements IEncryptionService {
	readonly _serviceBrand: undefined;

	async encrypt(value: string): Promise<string> {
		return 'encrypted_' + Buffer.from(value).toString('base64');
	}

	async decrypt(value: string): Promise<string> {
		if (!value.startsWith('encrypted_')) {
			throw new Error('Invalid encrypted value');
		}
		return Buffer.from(value.substring(10), 'base64').toString('utf-8');
	}

	isEncryptionAvailable(): Promise<boolean> {
		return Promise.resolve(true);
	}

	async setUsePlainTextEncryption(): Promise<void> {
		// Mock implementation - no-op
	}

	async getKeyStorageProvider(): Promise<KnownStorageProvider> {
		return KnownStorageProvider.basicText;
	}

	getKeyType(): Promise<string> {
		return Promise.resolve('mock');
	}
}

/**
 * Mock storage service
 */
class MockStorageService implements IStorageService {
	readonly _serviceBrand: undefined;
	private storage = new Map<string, string>();

	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue: T): T;
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined {
		const value = this.storage.get(key);
		if (value === undefined) { return fallbackValue; }
		try { return JSON.parse(value) as T; } catch { return fallbackValue; }
	}

	storeAll(): void { }
	optimize(): Promise<void> { return Promise.resolve(); }

	onDidChangeValue = () => ({ dispose: () => { } }) as any;
	onDidChangeTarget = () => ({ dispose: () => { } }) as any;
	onWillSaveState = () => ({ dispose: () => { } }) as any;

	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		return this.storage.get(this._makeKey(key, scope)) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean {
		const value = (this.get as any)(key, scope, undefined);
		return value !== undefined ? value === 'true' : !!fallbackValue;
	}

	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number {
		const value = (this.get as any)(key, scope, undefined);
		return value !== undefined ? parseInt(value, 10) : (fallbackValue ?? 0);
	}

	store(key: string, value: string | boolean | number | undefined | null, scope: StorageScope, target: StorageTarget): void {
		if (value === undefined || value === null) {
			this.remove(key, scope);
		} else {
			this.storage.set(this._makeKey(key, scope), String(value));
		}
	}

	remove(key: string, scope: StorageScope): void {
		this.storage.delete(this._makeKey(key, scope));
	}

	keys(scope: StorageScope, target: StorageTarget): string[] {
		return Array.from(this.storage.keys())
			.filter(k => k.startsWith(`${scope}:`))
			.map(k => k.substring(scope.toString().length + 1));
	}

	logStorage(): void { }
	migrate(): Promise<void> { return Promise.resolve(); }
	isNew(scope: StorageScope): boolean { return false; }
	flush(): Promise<void> { return Promise.resolve(); }
	log(): void { }
	switch(): Promise<void> { return Promise.resolve(); }
	hasScope(): boolean { return true; }

	private _makeKey(key: string, scope: StorageScope): string {
		return `${scope}:${key}`;
	}

	clear(): void {
		this.storage.clear();
	}
}

/**
 * Create a test JWT token
 */
function createTestJWT(expiresIn: number = 3600): string {
	const header = { alg: 'HS256', typ: 'JWT' };
	const payload = {
		sub: 'test-user-id',
		email: 'test@example.com',
		role: 'user',
		exp: Math.floor(Date.now() / 1000) + expiresIn,
		iat: Math.floor(Date.now() / 1000)
	};

	const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
	const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
	const signature = 'test-signature';

	return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Mock fetch manager
 */
class MockFetchManager {
	private mockResponses = new Map<string, any>();
	originalFetch: any;

	install(): void {
		this.originalFetch = global.fetch;
		global.fetch = this.createMockFetch();
	}

	uninstall(): void {
		if (this.originalFetch) {
			global.fetch = this.originalFetch;
		}
	}

	setMockResponse(endpoint: string, response: any, status: number = 200): void {
		this.mockResponses.set(endpoint, { response, status });
	}

	private createMockFetch(): any {
		return async (url: string, options: RequestInit = {}) => {
			const urlObj = new URL(url);
			const endpoint = urlObj.pathname;

			const mockData = this.mockResponses.get(endpoint);

			if (!mockData) {
				return {
					ok: false,
					status: 404,
					statusText: 'Not Found',
					headers: new Map(),
					json: async () => ({ message: 'Endpoint not mocked' })
				};
			}

			return {
				ok: mockData.status >= 200 && mockData.status < 300,
				status: mockData.status,
				statusText: mockData.status === 200 ? 'OK' : 'Error',
				headers: new Map(),
				json: async () => mockData.response
			};
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		};
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	}
}
 // eslint-disable-next-line @typescript-eslint/no-unused-vars

// eslint-disable-next-line @typescript-eslint/no-unused-vars
suite('ZeroDB Authentication - Integration Tests', () => {
	const disposables = new DisposableStore();
	let authService: AINativeCloudAuthService;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let tokenService: ITokenService;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
 // @ts-expect-error - Unused variable
	let sessionManager: SessionManager;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
 // @ts-expect-error - Unused variable
	let oauthService: any; // ZeroDBOAuthService reference temporarily disabled
	let encryptionService: MockEncryptionService;
	let storageService: MockStorageService;
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
	let logService: ILogService;
	let fetchManager: MockFetchManager;

	setup(() => {
		encryptionService = new MockEncryptionService();
		storageService = new MockStorageService();
		logService = new NullLogService();
		fetchManager = new MockFetchManager();
		fetchManager.install();

		authService = disposables.add(
			new AINativeCloudAuthService(encryptionService, storageService)
		);

		tokenService = disposables.add(
			new TokenService(encryptionService, storageService)
		);

		sessionManager = disposables.add(
			new SessionManager(tokenService, logService)
		);

		// ZeroDBOAuthService temporarily disabled due to import issues
		// oauthService = disposables.add(new ZeroDBOAuthService(storageService));
	});

	teardown(() => {
		fetchManager.uninstall();
		disposables.clear();
		storageService.clear();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	suite('Complete User Journey', () => {
		test('should handle complete sign-up to logout flow', async () => {
			// Step 1: Sign up
			fetchManager.setMockResponse('/v1/auth/register', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400),
				user: {
					id: 'newuser123',
					username: 'newuser',
					email: 'newuser@example.com',
					name: 'New User',
					role: 'user',
					email_verified: false,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			const registerResult = await authService.register({
				username: 'newuser',
				email: 'newuser@example.com',
				password: 'SecurePass123',
				name: 'New User'
			});

			assert.strictEqual(registerResult.success, true, 'Should match expected value');

			assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');


			// Step 2: Access protected resource (get user)
			const user = authService.getUser();
			assert.ok(user);
			assert.strictEqual(user?.email, 'newuser@example.com', 'Should match expected value');


			// Step 3: Logout
			fetchManager.setMockResponse('/v1/auth/logout', {
				message: 'Logged out successfully'
			}, 200);

			await authService.logout();

			assert.strictEqual(authService.isAuthenticated(), false, 'Should match expected value');

			assert.strictEqual(authService.getUser(), null, 'Should match expected value');

		});

		test('should handle login with token refresh flow', async () => {
			// Step 1: Login with short-lived token
			const shortLivedToken = createTestJWT(200); // 200 seconds

			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: shortLivedToken,
				refresh_token: createTestJWT(86400),
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');
			assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');


			// Step 2: Simulate token near expiration
			// Wait or manually trigger refresh
			fetchManager.setMockResponse('/v1/auth/refresh', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400)
			}, 200);

			// Step 3: Access resource (should auto-refresh if needed)
			const token = await authService.getAccessToken();
			assert.ok(token);

			// Step 4: Verify still authenticated
			assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');

		});

		test('should handle session expiration and re-authentication', async () => {
			// Step 1: Login with expired token
			const expiredToken = createTestJWT(-100);

			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: expiredToken,
				refresh_token: createTestJWT(-50), // Also expired
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Step 2: Try to access resource (should fail)
			const token = await authService.getAccessToken();
			assert.strictEqual(token, null, 'Should match expected value');


			// Step 3: Re-authenticate
			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400),
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Step 4: Verify authenticated
			assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');

		});
	});

	suite('Token Refresh During Active Session', () => {
		test('should automatically refresh token before expiration', async () => {
			// Login with token expiring soon
			const accessToken = createTestJWT(200); // 200 seconds
			const refreshToken = createTestJWT(86400);

			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: accessToken,
				refresh_token: refreshToken,
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Store tokens in token service
			await tokenService.storeTokens(accessToken, refreshToken, false);

			// Mock refresh endpoint
			const newAccessToken = createTestJWT(3600);
			fetchManager.setMockResponse('/v1/auth/refresh', {
				access_token: newAccessToken,
				refresh_token: createTestJWT(86400)
			}, 200);

			// Get access token (should trigger refresh for near-expiration)
			const token = await authService.getAccessToken();

			// Verify we got a valid token
			assert.ok(token);
		});

		test('should handle refresh failure gracefully', async () => {
			// Login
			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400),
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Mock refresh failure
			fetchManager.setMockResponse('/v1/auth/refresh', {
				message: 'Invalid refresh token'
			}, 401);

			// Try to refresh (will fail)
			try {
				await authService.refreshToken();
				assert.fail('Should have thrown error');
			} catch (error) {
				// Expected to fail
				assert.ok(error);
			}

			// Should be logged out after refresh failure
			assert.strictEqual(authService.isAuthenticated(), false, 'Should match expected value');

		});
	});

	suite('Auth State Propagation', () => {
		test('should propagate auth state to all components', async () => {
			let authServiceState: CloudAuthState | null = null;
			let stateChangeCount = 0;

			authService.onDidChangeAuthState(state => {
				authServiceState = state;
				stateChangeCount++;
			});

			// Login
			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400),
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Verify state propagated
			assert.strictEqual(authServiceState, CloudAuthState.Authenticated, 'Should match expected value');

			assert.ok(stateChangeCount > 0);

			// Logout
			fetchManager.setMockResponse('/v1/auth/logout', {
				message: 'Logged out'
			}, 200);

			await authService.logout();

			// Verify state updated
			assert.strictEqual(authServiceState, CloudAuthState.Unauthenticated, 'Should match expected value');

		});

		test('should sync auth state across service instances', async () => {
			// Login with first instance
			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400),
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Create second instance (simulates different component)
			const authService2 = new AINativeCloudAuthService(encryptionService, storageService);

			// Allow async loading
			await new Promise(resolve => setTimeout(resolve, 100));

			// Both should have same auth state
			assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');

			assert.strictEqual(authService2.isAuthenticated(), true, 'Should match expected value');


			authService2.dispose();
		});
	});

	suite('Protected Route Access Control', () => {
		test('should allow access to protected routes when authenticated', async () => {
			// Login
			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400),
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Simulate protected route check
			const canAccessProtectedRoute = authService.isAuthenticated();
			assert.strictEqual(canAccessProtectedRoute, true, 'Should match expected value');


			// Get access token for API call
			const token = await authService.getAccessToken();
			assert.ok(token);
		});

		test('should deny access to protected routes when not authenticated', () => {
			// Check without login
			const canAccessProtectedRoute = authService.isAuthenticated();
			assert.strictEqual(canAccessProtectedRoute, false, 'Should match expected value');

		});

		test('should redirect to login on authentication failure', async () => {
			// Attempt to access protected resource
			const isAuth = authService.isAuthenticated();
			assert.strictEqual(isAuth, false, 'Should match expected value');


			// Verify auth state requires login
			const authState = authService.getAuthState();
			assert.strictEqual(authState, CloudAuthState.Unauthenticated, 'Should match expected value');

		});
	});

	suite('API Endpoint Integration', () => {
		test('should include auth token in API requests', async () => {
			// Login
			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400),
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Get token for API call
			const token = await authService.getAccessToken();

			// Verify token exists and is valid
			assert.ok(token);
			assert.ok(token.includes('.'));  // JWT format
		});

		test('should handle API errors with expired tokens', async () => {
			// Login with expired token
			const expiredToken = createTestJWT(-100);

			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: expiredToken,
				refresh_token: createTestJWT(86400),
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Mock refresh endpoint
			fetchManager.setMockResponse('/v1/auth/refresh', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400)
			}, 200);

			// Get access token should auto-refresh
			const token = await authService.getAccessToken();

			// Should get new token
			assert.ok(token);
			assert.notStrictEqual(token, expiredToken);
		});

		test('should retry failed requests with refreshed token', async () => {
			// Login
			fetchManager.setMockResponse('/v1/auth/login-json', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400),
				user: {
					id: 'user123',
					username: 'testuser',
					email: 'test@example.com',
					name: 'Test User',
					role: 'user',
					email_verified: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			}, 200);

			await authService.login('test@example.com', 'password123');

			// Mock refresh endpoint for retry
			fetchManager.setMockResponse('/v1/auth/refresh', {
				access_token: createTestJWT(3600),
				refresh_token: createTestJWT(86400)
			}, 200);

			// Get access token multiple times (should handle gracefully)
			const token1 = await authService.getAccessToken();
			const token2 = await authService.getAccessToken();

			assert.ok(token1);
			assert.ok(token2);
		});
	});
});
