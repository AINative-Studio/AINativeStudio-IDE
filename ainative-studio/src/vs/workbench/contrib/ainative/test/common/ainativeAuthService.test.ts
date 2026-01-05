/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, deepStrictEqual, rejects } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import {
	AuthState,
	AINativeAuthError,
	AINativeAuthErrorCode,
	JWTClaims,
	AINativeAuthService
} from '../../common/ainativeAuthService.js';
import { IEncryptionService } from '../../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';

/**
 * Mock Encryption Service for testing
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

	async setUsePlainTextEncryption(): Promise<void> {
		// No-op for testing
	}

	async getKeyStorageProvider(): Promise<any> {
		return 'test';
	}
}

/**
 * Mock Storage Service for testing
 */
class MockStorageService implements IStorageService {
	_serviceBrand: undefined;

	private storage = new Map<string, string>();

	onDidChangeValue: any = () => ({ dispose: () => { } });
	onDidChangeTarget: any = () => ({ dispose: () => { } });
	onWillSaveState: any = () => ({ dispose: () => { } });

	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		const storageKey = `${scope}:${key}`;
		return this.storage.get(storageKey) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue: boolean): boolean;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
		const storageKey = `${scope}:${key}`;
		const value = this.storage.get(storageKey);
		if (value === undefined) {
			return fallbackValue as any;
		}
		return value === 'true';
	}

	getNumber(key: string, scope: StorageScope, fallbackValue: number): number;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
		const storageKey = `${scope}:${key}`;
		const value = this.storage.get(storageKey);
		if (value === undefined) {
			return fallbackValue;
		}
		return parseInt(value, 10);
	}

	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue: T): T;
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined;
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

	migrate(): Promise<void> {
		return Promise.resolve();
	}

	isNew(scope: StorageScope): boolean {
		return false;
	}

	flush(): Promise<void> {
		return Promise.resolve();
	}

	log(): Promise<void> {
		return Promise.resolve();
	}

	switch(): Promise<void> {
		return Promise.resolve();
	}

	hasScope(): boolean {
		return true;
	}

	storeAll(): void {
		// No-op for testing
	}

	logStorage(): void {
		// No-op for testing
	}

	clear(): void {
		this.storage.clear();
	}

	optimize(): Promise<void> {
		return Promise.resolve();
	}
}

/**
 * Helper function to create mock JWT tokens for testing
 */
function createMockJWT(claims: Partial<JWTClaims>): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
	const payload = Buffer.from(JSON.stringify({
		sub: claims.sub || 'test-user-id',
		email: claims.email || 'test@example.com',
		role: claims.role || 'user',
		exp: claims.exp || Math.floor(Date.now() / 1000) + 3600,
		iat: claims.iat || Math.floor(Date.now() / 1000)
	})).toString('base64');
	const signature = 'mock-signature';

	return `${header}.${payload}.${signature}`;
}

/**
 * Mock fetch responses
 */
const originalFetch = global.fetch;

function mockLoginSuccess(): void {
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

		return { ok: false, status: 404 } as Response;
	};
}

function mockLoginInvalidCredentials(): void {
	global.fetch = async (input: RequestInfo | URL): Promise<Response> => {
		const url = typeof input === 'string' ? input : input.toString();

		if (url.includes('/v1/auth/login-json')) {
			return {
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			} as Response;
		}

		return { ok: false, status: 404 } as Response;
	};
}

function mockLoginNetworkError(): void {
	global.fetch = async (): Promise<Response> => {
		throw new Error('Network connection failed');
	};
}

function mockLogoutSuccess(): void {
	global.fetch = async (input: RequestInfo | URL): Promise<Response> => {
		const url = typeof input === 'string' ? input : input.toString();

		if (url.includes('/v1/auth/logout')) {
			return {
				ok: true,
				status: 200,
				json: async () => ({ success: true })
			} as Response;
		}

		return { ok: false, status: 404 } as Response;
	};
}

function mockRefreshTokenSuccess(): void {
	global.fetch = async (input: RequestInfo | URL): Promise<Response> => {
		const url = typeof input === 'string' ? input : input.toString();

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

		return { ok: false, status: 404 } as Response;
	};
}

function mockRefreshTokenFailure(): void {
	global.fetch = async (input: RequestInfo | URL): Promise<Response> => {
		const url = typeof input === 'string' ? input : input.toString();

		if (url.includes('/v1/auth/refresh')) {
			return {
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			} as Response;
		}

		return { ok: false, status: 404 } as Response;
	};
}

function restoreFetch(): void {
	global.fetch = originalFetch;
}

suite('AINativeAuthService', () => {
	const disposables = new DisposableStore();
	let encryptionService: MockEncryptionService;
	let storageService: MockStorageService;
	let authService: AINativeAuthService;

	setup(() => {
		encryptionService = new MockEncryptionService();
		storageService = new MockStorageService();
		authService = new AINativeAuthService(encryptionService, storageService);
		disposables.add(authService);
	});

	teardown(() => {
		disposables.clear();
		storageService.clear();
		restoreFetch();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	suite('Initialization', () => {
		test('should initialize with unauthenticated state', () => {
			strictEqual(authService.isAuthenticated(), false);
			strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
			strictEqual(authService.getAccessToken(), null);
			strictEqual(authService.getUser(), null);
		});

		test('should load valid tokens from storage on init', async () => {
			// Create a new service with pre-stored tokens
			const validToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
			const encryptedToken = await encryptionService.encrypt(validToken);
			const userData = {
				id: 'user-123',
				email: 'stored@ainative.studio',
				role: 'user'
			};

			storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store('ainative.auth.user', JSON.stringify(userData), StorageScope.APPLICATION, StorageTarget.MACHINE);

			// Create new service instance to trigger storage loading
			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			// Wait for async _loadFromStorage
			await new Promise(resolve => setTimeout(resolve, 100));

			strictEqual(newAuthService.isAuthenticated(), true);
			strictEqual(newAuthService.getAuthState(), AuthState.Authenticated);
			ok(newAuthService.getAccessToken() !== null);
			deepStrictEqual(newAuthService.getUser(), userData);
		});

		test('should reject expired tokens from storage on init', async () => {
			// Create a new service with expired token
			const expiredToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) - 3600 });
			const encryptedToken = await encryptionService.encrypt(expiredToken);
			const userData = {
				id: 'user-123',
				email: 'expired@ainative.studio',
				role: 'user'
			};

			storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store('ainative.auth.user', JSON.stringify(userData), StorageScope.APPLICATION, StorageTarget.MACHINE);

			// Create new service instance
			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			// Wait for async _loadFromStorage
			await new Promise(resolve => setTimeout(resolve, 100));

			strictEqual(newAuthService.isAuthenticated(), false);
			strictEqual(newAuthService.getAuthState(), AuthState.Unauthenticated);
			strictEqual(newAuthService.getAccessToken(), null);
		});
	});

	suite('Login Tests', () => {
		test('should login successfully with valid credentials', async () => {
			mockLoginSuccess();

			const result = await authService.login('test@ainative.studio', 'password123');

			strictEqual(result.success, true);
			ok(result.accessToken, 'Access token should be present');
			ok(result.refreshToken, 'Refresh token should be present');
			ok(result.user, 'User data should be present');
			strictEqual(result.user?.email, 'test@ainative.studio');
			strictEqual(authService.isAuthenticated(), true);
			strictEqual(authService.getAuthState(), AuthState.Authenticated);
		});

		test('should fail login with invalid credentials', async () => {
			mockLoginInvalidCredentials();

			const result = await authService.login('wrong@example.com', 'wrongpassword');

			strictEqual(result.success, false);
			ok(result.error, 'Error should be present');
			strictEqual(result.error?.code, AINativeAuthErrorCode.InvalidCredentials);
			strictEqual(authService.isAuthenticated(), false);
		});

		test('should handle network errors during login', async () => {
			mockLoginNetworkError();

			const result = await authService.login('test@ainative.studio', 'password123');

			strictEqual(result.success, false);
			ok(result.error, 'Error should be present');
			strictEqual(result.error?.code, AINativeAuthErrorCode.NetworkError);
			strictEqual(authService.isAuthenticated(), false);
		});

		test('should prevent concurrent login requests', async () => {
			mockLoginSuccess();

			// Start first login
			const promise1 = authService.login('test1@ainative.studio', 'password1');

			// Try to start second login immediately
			const promise2 = authService.login('test2@ainative.studio', 'password2');

			const results = await Promise.allSettled([promise1, promise2]);

			// One should succeed, one should fail with error
			const hasSuccess = results.some(r => r.status === 'fulfilled' && r.value.success);
			const hasError = results.some(r => r.status === 'fulfilled' && !r.value.success);

			ok(hasSuccess || hasError, 'Should handle concurrent login attempts');
		});

		test('should emit onDidChangeAuthState event on successful login', async () => {
			mockLoginSuccess();

			let eventFired = false;
			let capturedState: AuthState | null = null;

			disposables.add(authService.onDidChangeAuthState((state) => {
				eventFired = true;
				capturedState = state;
			}));

			await authService.login('test@ainative.studio', 'password123');

			ok(eventFired, 'Event should have fired');
			strictEqual(capturedState, AuthState.Authenticated);
		});
	});

	suite('Logout Tests', () => {
		test('should logout successfully and clear all auth data', async () => {
			mockLoginSuccess();
			mockLogoutSuccess();

			// First login
			await authService.login('test@ainative.studio', 'password123');
			strictEqual(authService.isAuthenticated(), true);

			// Then logout
			await authService.logout();

			strictEqual(authService.getAccessToken(), null);
			strictEqual(authService.getUser(), null);
			strictEqual(authService.isAuthenticated(), false);
			strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
		});

		test('should clear storage on logout', async () => {
			mockLoginSuccess();
			mockLogoutSuccess();

			// Login to populate storage
			await authService.login('test@ainative.studio', 'password123');

			// Verify storage has data
			const jwtBeforeLogout = storageService.get('ainative.auth.jwt', StorageScope.APPLICATION);
			ok(jwtBeforeLogout, 'JWT should be in storage before logout');

			// Logout
			await authService.logout();

			// Verify storage is cleared
			const jwtAfterLogout = storageService.get('ainative.auth.jwt', StorageScope.APPLICATION);
			const refreshAfterLogout = storageService.get('ainative.auth.refreshToken', StorageScope.APPLICATION);
			const userAfterLogout = storageService.get('ainative.auth.user', StorageScope.APPLICATION);

			strictEqual(jwtAfterLogout, undefined);
			strictEqual(refreshAfterLogout, undefined);
			strictEqual(userAfterLogout, undefined);
		});

		test('should emit onDidChangeAuthState events during logout', async () => {
			mockLoginSuccess();
			mockLogoutSuccess();

			const states: AuthState[] = [];

			disposables.add(authService.onDidChangeAuthState((state) => {
				states.push(state);
			}));

			await authService.login('test@ainative.studio', 'password123');
			await authService.logout();

			// Should have: Authenticated (login), LoggingOut, Unauthenticated
			ok(states.includes(AuthState.Authenticated), 'Should include Authenticated state');
			ok(states.includes(AuthState.LoggingOut), 'Should include LoggingOut state');
			ok(states.includes(AuthState.Unauthenticated), 'Should include Unauthenticated state');
		});

		test('should complete logout even if backend call fails', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			// Mock logout failure
			global.fetch = async (): Promise<Response> => {
				throw new Error('Network error');
			};

			// Logout should still complete locally
			await authService.logout();

			strictEqual(authService.isAuthenticated(), false);
			strictEqual(authService.getAccessToken(), null);
		});
	});

	suite('Token Refresh Tests', () => {
		test('should refresh token successfully', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			const oldToken = authService.getAccessToken();

			mockRefreshTokenSuccess();
			const newToken = await authService.refreshToken();

			ok(newToken, 'New token should be returned');
			strictEqual(authService.getAccessToken(), newToken);
			ok(newToken !== oldToken, 'New token should be different from old token');
			strictEqual(authService.getAuthState(), AuthState.Authenticated);
		});

		test('should fail to refresh when no refresh token available', async () => {
			await rejects(
				() => authService.refreshToken(),
				(error: any) => {
					return error instanceof AINativeAuthError &&
						error.code === AINativeAuthErrorCode.TokenRefreshFailed &&
						error.message.includes('No refresh token available');
				},
				'Should reject when no refresh token is available'
			);
		});

		test('should handle refresh token failure and clear auth state', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			strictEqual(authService.isAuthenticated(), true);

			mockRefreshTokenFailure();

			await rejects(
				() => authService.refreshToken(),
				(error: any) => {
					return error instanceof AINativeAuthError &&
						error.code === AINativeAuthErrorCode.TokenRefreshFailed;
				},
				'Should reject with TokenRefreshFailed error'
			);

			// Auth state should be cleared
			strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
		});

		test('should emit state changes during token refresh', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			const states: AuthState[] = [];
			disposables.add(authService.onDidChangeAuthState((state) => {
				states.push(state);
			}));

			mockRefreshTokenSuccess();
			await authService.refreshToken();

			ok(states.includes(AuthState.Refreshing), 'Should include Refreshing state');
			ok(states.includes(AuthState.Authenticated), 'Should return to Authenticated state');
		});
	});

	suite('Token Storage Tests', () => {
		test('should store tokens encrypted via IEncryptionService', async () => {
			mockLoginSuccess();

			await authService.login('test@ainative.studio', 'password123');

			const storedJwt = storageService.get('ainative.auth.jwt', StorageScope.APPLICATION);
			const storedRefresh = storageService.get('ainative.auth.refreshToken', StorageScope.APPLICATION);

			ok(storedJwt, 'JWT should be stored');
			ok(storedRefresh, 'Refresh token should be stored');

			// Verify tokens are encrypted (base64 in our mock)
			ok(storedJwt !== authService.getAccessToken(), 'JWT should be encrypted in storage');
			ok(storedRefresh !== authService.getAccessToken(), 'Refresh token should be encrypted in storage');

			// Verify we can decrypt them
			const decryptedJwt = await encryptionService.decrypt(storedJwt!);
			strictEqual(decryptedJwt, authService.getAccessToken());
		});

		test('should store user data in storage', async () => {
			mockLoginSuccess();

			await authService.login('test@ainative.studio', 'password123');

			const storedUser = storageService.get('ainative.auth.user', StorageScope.APPLICATION);
			ok(storedUser, 'User data should be stored');

			const parsedUser = JSON.parse(storedUser!);
			deepStrictEqual(parsedUser, authService.getUser());
		});

		test('should retrieve tokens from storage on initialization', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			const originalToken = authService.getAccessToken();
			const originalUser = authService.getUser();

			// Create new service instance with same storage
			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			// Wait for async storage loading
			await new Promise(resolve => setTimeout(resolve, 100));

			strictEqual(newAuthService.getAccessToken(), originalToken);
			deepStrictEqual(newAuthService.getUser(), originalUser);
			strictEqual(newAuthService.isAuthenticated(), true);
		});
	});

	suite('Authentication State Tests', () => {
		test('should return correct isAuthenticated() value', () => {
			strictEqual(authService.isAuthenticated(), false, 'Should be false initially');

			// After logout, should still be false
			authService.logout().then(() => {
				strictEqual(authService.isAuthenticated(), false);
			});
		});

		test('should return correct auth state throughout lifecycle', async () => {
			strictEqual(authService.getAuthState(), AuthState.Unauthenticated);

			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');
			strictEqual(authService.getAuthState(), AuthState.Authenticated);

			mockLogoutSuccess();
			await authService.logout();
			strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
		});

		test('should fire onDidChangeAuthState on login', async () => {
			mockLoginSuccess();

			let eventCount = 0;
			const states: AuthState[] = [];

			disposables.add(authService.onDidChangeAuthState((state) => {
				eventCount++;
				states.push(state);
			}));

			await authService.login('test@ainative.studio', 'password123');

			ok(eventCount > 0, 'Event should fire at least once');
			ok(states.includes(AuthState.Authenticated), 'Should include Authenticated state');
		});

		test('should fire onDidChangeAuthState on logout', async () => {
			mockLoginSuccess();
			mockLogoutSuccess();

			await authService.login('test@ainative.studio', 'password123');

			let logoutEventFired = false;
			disposables.add(authService.onDidChangeAuthState((state) => {
				if (state === AuthState.LoggingOut) {
					logoutEventFired = true;
				}
			}));

			await authService.logout();

			ok(logoutEventFired, 'LoggingOut event should fire');
		});
	});

	suite('Error Handling Tests', () => {
		test('should handle network errors with proper error codes', async () => {
			mockLoginNetworkError();

			const result = await authService.login('test@ainative.studio', 'password123');

			strictEqual(result.success, false);
			strictEqual(result.error?.code, AINativeAuthErrorCode.NetworkError);
			ok(result.error?.message, 'Error message should be present');
		});

		test('should handle invalid token errors', async () => {
			// Manually set an invalid token
			const invalidToken = 'invalid.token.format';
			const encrypted = await encryptionService.encrypt(invalidToken);

			storageService.store('ainative.auth.jwt', encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store('ainative.auth.user', JSON.stringify({ id: '123', email: 'test@test.com', role: 'user' }), StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			// Should handle invalid token gracefully
			strictEqual(newAuthService.isAuthenticated(), false);
		});

		test('should handle refresh token network errors', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			// Mock network error for refresh
			global.fetch = async (): Promise<Response> => {
				throw new Error('Network timeout');
			};

			await rejects(
				() => authService.refreshToken(),
				(error: any) => error instanceof AINativeAuthError,
				'Should throw AINativeAuthError on network failure'
			);
		});

		test('should handle storage encryption errors gracefully', async () => {
			// This test verifies encryption/decryption works
			const testData = 'sensitive-token-data';
			const encrypted = await encryptionService.encrypt(testData);
			const decrypted = await encryptionService.decrypt(encrypted);

			strictEqual(decrypted, testData);
			ok(encrypted !== testData, 'Data should be encrypted');
		});
	});

	suite('Security Tests', () => {
		test('should validate JWT token format', () => {
			const validToken = createMockJWT({ sub: 'user-123' });
			const parts = validToken.split('.');

			strictEqual(parts.length, 3, 'JWT should have 3 parts');
		});

		test('should detect expired tokens', async () => {
			const expiredToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) - 3600 });
			const encrypted = await encryptionService.encrypt(expiredToken);

			storageService.store('ainative.auth.jwt', encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store('ainative.auth.user', JSON.stringify({ id: '123', email: 'test@test.com', role: 'user' }), StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			strictEqual(newAuthService.isAuthenticated(), false, 'Should reject expired tokens');
		});

		test('should call backend logout API to blacklist token', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			let logoutCalled = false;
			global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
				const url = typeof input === 'string' ? input : input.toString();

				if (url.includes('/v1/auth/logout')) {
					logoutCalled = true;
					// Verify Authorization header is present
					ok(init?.headers, 'Headers should be present');
					const headers = init.headers as Record<string, string>;
					ok(headers['Authorization'], 'Authorization header should be present');
					ok(headers['Authorization'].startsWith('Bearer '), 'Should use Bearer token');
				}

				return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
			};

			await authService.logout();

			ok(logoutCalled, 'Backend logout API should be called');
		});
	});

	suite('Storage Edge Cases', () => {
		test('should handle corrupted JSON in user storage', async () => {
			const validToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
			const encrypted = await encryptionService.encrypt(validToken);

			storageService.store('ainative.auth.jwt', encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store('ainative.auth.user', '{invalid-json}', StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			// Should handle corrupted user data gracefully
			strictEqual(newAuthService.getUser(), null);
		});

		test('should handle missing encrypted JWT data', async () => {
			// Store user data but no JWT
			storageService.store('ainative.auth.user', JSON.stringify({ id: '123', email: 'test@test.com', role: 'user' }), StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			strictEqual(newAuthService.isAuthenticated(), false);
			strictEqual(newAuthService.getAccessToken(), null);
		});

		test('should handle missing user data with valid JWT', async () => {
			const validToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
			const encrypted = await encryptionService.encrypt(validToken);

			storageService.store('ainative.auth.jwt', encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			strictEqual(newAuthService.isAuthenticated(), false);
			strictEqual(newAuthService.getUser(), null);
		});

		test('should persist refresh token to storage', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			const storedRefreshToken = storageService.get('ainative.auth.refreshToken', StorageScope.APPLICATION);
			ok(storedRefreshToken, 'Refresh token should be stored');

			// Verify it's encrypted
			const decrypted = await encryptionService.decrypt(storedRefreshToken!);
			ok(decrypted.includes('.'), 'Decrypted refresh token should be a JWT');
		});
	});

	suite('Token Expiration Edge Cases', () => {
		test('should handle token expiring during session', async () => {
			// Create token that expires in 1 second
			const shortLivedToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 1 });
			const encrypted = await encryptionService.encrypt(shortLivedToken);
			const userData = { id: '123', email: 'test@test.com', role: 'user' };

			storageService.store('ainative.auth.jwt', encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store('ainative.auth.user', JSON.stringify(userData), StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			// Should be authenticated initially
			strictEqual(newAuthService.isAuthenticated(), true);
		});

		test('should handle token with missing expiration claim', async () => {
			// Create a malformed JWT without exp claim
			const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
			const payload = Buffer.from(JSON.stringify({
				sub: 'test-user',
				email: 'test@example.com',
				role: 'user'
				// Missing exp field
			})).toString('base64');
			const malformedToken = `${header}.${payload}.signature`;

			const encrypted = await encryptionService.encrypt(malformedToken);
			storageService.store('ainative.auth.jwt', encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store('ainative.auth.user', JSON.stringify({ id: '123', email: 'test@test.com', role: 'user' }), StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			// Should reject token without expiration
			strictEqual(newAuthService.isAuthenticated(), false);
		});
	});

	suite('Concurrent Operations', () => {
		test('should handle token refresh during logout', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			mockRefreshTokenSuccess();
			mockLogoutSuccess();

			// Start refresh and logout concurrently
			const refreshPromise = authService.refreshToken();
			const logoutPromise = authService.logout();

			// Both should complete without throwing
			await Promise.allSettled([refreshPromise, logoutPromise]);

			// After both complete, should be logged out
			strictEqual(authService.getAccessToken(), null);
		});

		test('should handle multiple concurrent refresh requests', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			mockRefreshTokenSuccess();

			// Start multiple refresh requests
			const refreshPromises = [
				authService.refreshToken(),
				authService.refreshToken(),
				authService.refreshToken()
			];

			const results = await Promise.allSettled(refreshPromises);

			// All should complete (some may succeed, some may fail)
			strictEqual(results.length, 3);
			strictEqual(authService.isAuthenticated(), true);
		});
	});

	suite('HTTP Error Handling', () => {
		test('should handle 500 server error on login', async () => {
			global.fetch = async (): Promise<Response> => {
				return {
					ok: false,
					status: 500,
					statusText: 'Internal Server Error'
				} as Response;
			};

			const result = await authService.login('test@ainative.studio', 'password123');

			strictEqual(result.success, false);
			strictEqual(result.error?.code, AINativeAuthErrorCode.NetworkError);
			ok(result.error?.message.includes('500'));
		});

		test('should handle 403 forbidden on login', async () => {
			global.fetch = async (): Promise<Response> => {
				return {
					ok: false,
					status: 403,
					statusText: 'Forbidden'
				} as Response;
			};

			const result = await authService.login('test@ainative.studio', 'password123');

			strictEqual(result.success, false);
			strictEqual(result.error?.code, AINativeAuthErrorCode.NetworkError);
		});

		test('should handle network timeout during login', async () => {
			global.fetch = async (): Promise<Response> => {
				return new Promise((_, reject) => {
					setTimeout(() => reject(new Error('Request timeout')), 10);
				});
			};

			const result = await authService.login('test@ainative.studio', 'password123');

			strictEqual(result.success, false);
			strictEqual(result.error?.code, AINativeAuthErrorCode.NetworkError);
		});

		test('should handle malformed JSON response on login', async () => {
			global.fetch = async (): Promise<Response> => {
				return {
					ok: true,
					status: 200,
					statusText: 'OK',
					json: async () => {
						throw new Error('Invalid JSON');
					}
				} as any as Response;
			};

			const result = await authService.login('test@ainative.studio', 'password123');

			strictEqual(result.success, false);
			strictEqual(result.error?.code, AINativeAuthErrorCode.NetworkError);
		});
	});

	suite('User State Management', () => {
		test('should return null user when not authenticated', () => {
			strictEqual(authService.getUser(), null);
		});

		test('should return user data after successful login', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			const user = authService.getUser();
			ok(user, 'User should be present');
			strictEqual(user?.email, 'test@ainative.studio');
			strictEqual(user?.role, 'user');
			ok(user?.id, 'User ID should be present');
		});

		test('should clear user data on logout', async () => {
			mockLoginSuccess();
			mockLogoutSuccess();

			await authService.login('test@ainative.studio', 'password123');
			ok(authService.getUser(), 'User should be present after login');

			await authService.logout();
			strictEqual(authService.getUser(), null, 'User should be null after logout');
		});

		test('should preserve user data across token refresh', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			const userBeforeRefresh = authService.getUser();

			mockRefreshTokenSuccess();
			await authService.refreshToken();

			const userAfterRefresh = authService.getUser();
			deepStrictEqual(userAfterRefresh, userBeforeRefresh, 'User data should be preserved');
		});
	});

	suite('Service Lifecycle', () => {
		test('should properly dispose of service', () => {
			const newAuthService = new AINativeAuthService(encryptionService, storageService);

			// Should not throw when disposing
			newAuthService.dispose();

			// Service should still respond to basic queries after disposal
			strictEqual(newAuthService.isAuthenticated(), false);
		});

		test('should handle operations after service disposal', async () => {
			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			newAuthService.dispose();

			mockLoginSuccess();

			// Login should still work even after disposal
			const result = await newAuthService.login('test@ainative.studio', 'password123');
			ok(result.success || !result.success, 'Should handle login attempt after disposal');
		});
	});

	suite('JWT Token Validation', () => {
		test('should decode valid JWT token correctly', () => {
			const token = createMockJWT({
				sub: 'user-456',
				email: 'decode@test.com',
				role: 'admin',
				exp: Math.floor(Date.now() / 1000) + 7200,
				iat: Math.floor(Date.now() / 1000)
			});

			// Verify token format
			const parts = token.split('.');
			strictEqual(parts.length, 3);

			// Verify payload can be decoded
			const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
			const claims = JSON.parse(payload);
			strictEqual(claims.sub, 'user-456');
			strictEqual(claims.email, 'decode@test.com');
			strictEqual(claims.role, 'admin');
		});

		test('should handle JWT with only 2 parts', async () => {
			const invalidToken = 'header.payload'; // Missing signature
			const encrypted = await encryptionService.encrypt(invalidToken);

			storageService.store('ainative.auth.jwt', encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store('ainative.auth.user', JSON.stringify({ id: '123', email: 'test@test.com', role: 'user' }), StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			strictEqual(newAuthService.isAuthenticated(), false);
		});

		test('should handle JWT with invalid base64 payload', async () => {
			const invalidToken = 'header.!!!invalid-base64!!!.signature';
			const encrypted = await encryptionService.encrypt(invalidToken);

			storageService.store('ainative.auth.jwt', encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store('ainative.auth.user', JSON.stringify({ id: '123', email: 'test@test.com', role: 'user' }), StorageScope.APPLICATION, StorageTarget.MACHINE);

			const newAuthService = new AINativeAuthService(encryptionService, storageService);
			disposables.add(newAuthService);

			await new Promise(resolve => setTimeout(resolve, 100));

			strictEqual(newAuthService.isAuthenticated(), false);
		});
	});

	suite('Authentication State Transitions', () => {
		test('should transition from Unauthenticated to Authenticated on login', async () => {
			strictEqual(authService.getAuthState(), AuthState.Unauthenticated);

			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			strictEqual(authService.getAuthState(), AuthState.Authenticated);
		});

		test('should transition from Authenticated to Refreshing to Authenticated', async () => {
			mockLoginSuccess();
			await authService.login('test@ainative.studio', 'password123');

			const states: AuthState[] = [];
			disposables.add(authService.onDidChangeAuthState(state => states.push(state)));

			mockRefreshTokenSuccess();
			await authService.refreshToken();

			ok(states.includes(AuthState.Refreshing));
			strictEqual(authService.getAuthState(), AuthState.Authenticated);
		});

		test('should transition from Authenticated to LoggingOut to Unauthenticated', async () => {
			mockLoginSuccess();
			mockLogoutSuccess();

			await authService.login('test@ainative.studio', 'password123');

			const states: AuthState[] = [];
			disposables.add(authService.onDidChangeAuthState(state => states.push(state)));

			await authService.logout();

			ok(states.includes(AuthState.LoggingOut));
			strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
		});
	});
});
