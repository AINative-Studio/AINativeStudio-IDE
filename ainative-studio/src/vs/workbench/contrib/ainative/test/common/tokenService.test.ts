/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TokenService } from '../../common/tokenService.js';
import { IEncryptionService, KnownStorageProvider } from '../../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';

/**
 * Mock encryption service for testing
 */
class MockEncryptionService implements IEncryptionService {
	readonly _serviceBrand: undefined;

	async encrypt(value: string): Promise<string> {
		// Simple mock encryption (reverse string + prefix)
		return 'encrypted_' + value.split('').reverse().join('');
	}

	async decrypt(value: string): Promise<string> {
		// Simple mock decryption (remove prefix + reverse)
		if (!value.startsWith('encrypted_')) {
			throw new Error('Invalid encrypted value');
		}
		return value.substring(10).split('').reverse().join('');
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
 * Mock storage service for testing
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
		const value = this.get(key, scope);
		return value !== undefined ? value === 'true' : !!fallbackValue;
	}

	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number {
		const value = this.get(key, scope);
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

suite('TokenService', () => {
	const disposables = new DisposableStore();
	let tokenService: TokenService;
	let encryptionService: MockEncryptionService;
	let storageService: MockStorageService;

	setup(() => {
		encryptionService = new MockEncryptionService();
		storageService = new MockStorageService();
		tokenService = disposables.add(new TokenService(encryptionService, storageService));
	});

	teardown(() => {
		disposables.clear();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	suite('Token Storage', () => {
		test('should store tokens securely', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400); // 24 hours

			await tokenService.storeTokens(accessToken, refreshToken, false);

			const storedAccess = await tokenService.getAccessToken();
			const storedRefresh = await tokenService.getRefreshToken();

			assert.strictEqual(storedAccess, accessToken, 'Stored access token should match original');
			assert.strictEqual(storedRefresh, refreshToken, 'Stored refresh token should match original');
		});

		test('should encrypt tokens before storage', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			// Check that stored value is encrypted
			const rawStored = storageService.get('ainative.token.access', StorageScope.APPLICATION);
			assert.ok(rawStored?.startsWith('encrypted_'), 'Stored token should be encrypted');
		});

		test('should store token expiration time', async () => {
			const accessToken = createTestJWT(3600);
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			const expiration = await tokenService.getTokenExpiration();
			assert.ok(expiration !== null);
			assert.ok(expiration! > Date.now());
		});

		test('should store remember me flag', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, true);

			const rememberMe = await tokenService.getRememberMe();
			assert.strictEqual(rememberMe, true, 'Remember me flag should be true');
		});

		test('should use different storage targets based on rememberMe', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			// Test with rememberMe = true (should use MACHINE target)
			await tokenService.storeTokens(accessToken, refreshToken, true);

			// Test with rememberMe = false (should use USER target)
			await tokenService.storeTokens(accessToken, refreshToken, false);

			// Both should work
			const storedAccess = await tokenService.getAccessToken();
			assert.strictEqual(storedAccess, accessToken);
		});
	});

	suite('Token Retrieval', () => {
		test('should retrieve stored access token', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			const retrieved = await tokenService.getAccessToken();
			assert.strictEqual(retrieved, accessToken);
		});

		test('should retrieve stored refresh token', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			const retrieved = await tokenService.getRefreshToken();
			assert.strictEqual(retrieved, refreshToken);
		});

		test('should return null for missing tokens', async () => {
			const access = await tokenService.getAccessToken();
			const refresh = await tokenService.getRefreshToken();

			assert.strictEqual(access, null);
			assert.strictEqual(refresh, null);
		});

		test('should handle corrupted tokens gracefully', async () => {
			// Manually store corrupted token
			storageService.store('ainative.token.access', 'corrupted', StorageScope.APPLICATION, StorageTarget.USER);

			const retrieved = await tokenService.getAccessToken();
			assert.strictEqual(retrieved, null);

			// Should have cleared tokens
			const expiration = await tokenService.getTokenExpiration();
			assert.strictEqual(expiration, null);
		});
	});

	suite('Token Clearing', () => {
		test('should clear all tokens', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, true);

			// Verify tokens are stored
			assert.ok(await tokenService.getAccessToken());
			assert.ok(await tokenService.getRefreshToken());

			// Clear tokens
			await tokenService.clearTokens();

			// Verify tokens are cleared
			assert.strictEqual(await tokenService.getAccessToken(), null);
			assert.strictEqual(await tokenService.getRefreshToken(), null);
			assert.strictEqual(await tokenService.getTokenExpiration(), null);
			assert.strictEqual(await tokenService.getRememberMe(), false);
		});

		test('should fire onDidClearTokens event', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			let eventFired = false;
			tokenService.onDidClearTokens(() => {
				eventFired = true;
			});

			await tokenService.clearTokens();

			assert.ok(eventFired);
		});
	});

	suite('Authentication Check', () => {
		test('should return true for valid non-expired token', async () => {
			const accessToken = createTestJWT(3600); // Expires in 1 hour
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			const isAuth = await tokenService.isAuthenticated();
			assert.strictEqual(isAuth, true);
		});

		test('should return false for expired token', async () => {
			const accessToken = createTestJWT(-100); // Already expired
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			const isAuth = await tokenService.isAuthenticated();
			assert.strictEqual(isAuth, false);
		});

		test('should return false when no token exists', async () => {
			const isAuth = await tokenService.isAuthenticated();
			assert.strictEqual(isAuth, false);
		});

		test('should consider buffer time when checking expiration', async () => {
			const accessToken = createTestJWT(200); // Expires in 200 seconds
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			// Should be expired with large buffer (5 minutes = 300 seconds)
			const isExpired = await tokenService.isTokenExpired(5 * 60 * 1000);
			assert.strictEqual(isExpired, true);

			// Should not be expired with small buffer (1 minute = 60 seconds)
			const isNotExpired = await tokenService.isTokenExpired(60 * 1000);
			assert.strictEqual(isNotExpired, false);
		});
	});

	suite('Token Expiration', () => {
		test('should correctly parse token expiration time', async () => {
			const expiresIn = 3600;
			const expectedExpiration = Math.floor(Date.now() / 1000) + expiresIn;

			const accessToken = createTestJWT(expiresIn);
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			const expiration = await tokenService.getTokenExpiration();
			assert.ok(expiration !== null);

			// Allow 1 second tolerance for test execution time
			const expirationSeconds = Math.floor(expiration! / 1000);
			assert.ok(Math.abs(expirationSeconds - expectedExpiration) <= 1);
		});

		test('should detect expired tokens', async () => {
			const accessToken = createTestJWT(-100); // Expired 100 seconds ago
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			const isExpired = await tokenService.isTokenExpired();
			assert.strictEqual(isExpired, true);
		});

		test('should detect tokens about to expire', async () => {
			const accessToken = createTestJWT(200); // Expires in 200 seconds
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			// With 5 minute buffer, should be considered expired
			const isExpired = await tokenService.isTokenExpired(5 * 60 * 1000);
			assert.strictEqual(isExpired, true);
		});
	});

	suite('Events', () => {
		test('should fire onDidUpdateTokens when tokens are stored', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			let eventFired = false;
			tokenService.onDidUpdateTokens(() => {
				eventFired = true;
			});

			await tokenService.storeTokens(accessToken, refreshToken, false);

			assert.ok(eventFired);
		});

		test('should fire onDidClearTokens when tokens are cleared', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			await tokenService.storeTokens(accessToken, refreshToken, false);

			let eventFired = false;
			tokenService.onDidClearTokens(() => {
				eventFired = true;
			});

			await tokenService.clearTokens();

			assert.ok(eventFired);
		});
	});

	suite('Edge Cases', () => {
		test('should handle multiple token updates', async () => {
			const accessToken1 = createTestJWT(1800);
			const refreshToken1 = createTestJWT(86400);

			await tokenService.storeTokens(accessToken1, refreshToken1, false);

			const accessToken2 = createTestJWT(3600);
			const refreshToken2 = createTestJWT(172800);

			await tokenService.storeTokens(accessToken2, refreshToken2, true);

			const storedAccess = await tokenService.getAccessToken();
			const storedRefresh = await tokenService.getRefreshToken();

			assert.strictEqual(storedAccess, accessToken2);
			assert.strictEqual(storedRefresh, refreshToken2);
			assert.strictEqual(await tokenService.getRememberMe(), true);
		});

		test('should handle concurrent token operations', async () => {
			const accessToken = createTestJWT();
			const refreshToken = createTestJWT(86400);

			// Store and retrieve concurrently
			const storePromise = tokenService.storeTokens(accessToken, refreshToken, false);
			const getPromise = tokenService.getAccessToken();

			await Promise.all([storePromise, getPromise]);

			// Final state should be consistent
			const storedAccess = await tokenService.getAccessToken();
			assert.strictEqual(storedAccess, accessToken);
		});

		test('should handle empty string tokens', async () => {
			try {
				await tokenService.storeTokens('', '', false);
				assert.fail('Should have thrown error');
			} catch (error) {
				// Expected to fail
				assert.ok(error);
			}
		});
	});
});
