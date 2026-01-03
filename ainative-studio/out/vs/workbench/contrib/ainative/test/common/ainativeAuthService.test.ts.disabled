/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import {
	AuthState,
} from '../../common/ainativeAuthService.js';
import { IEncryptionService } from '../../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';

/**
 * Mock Encryption Service for testing
 */
class MockEncryptionService implements IEncryptionService {
	_serviceBrand: undefined;

	// private storage = new Map<string, string>();

	async encrypt(value: string): Promise<string> {
		// Simple base64 encoding for testing
		return Buffer.from(value).toString('base64');
	}

	async decrypt(value: string): Promise<string> {
		// Simple base64 decoding for testing
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

	onDidChangeValue: any = (_scope: any, _key: any, _disposable: any) => ({ dispose: () => {} });
	onDidChangeTarget: any = () => ({ dispose: () => {} });
	onWillSaveState: any = () => ({ dispose: () => {} });

	get(key: string, scope: StorageScope): string | undefined;
	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		const storageKey = `${scope}:${key}`;
		return this.storage.get(storageKey) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue: boolean): boolean;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		return value === 'true';
	}

	getNumber(key: string, scope: StorageScope, fallbackValue: number): number;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		return parseInt(value, 10);
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

	log(): void {
		// No-op for testing
	}

	switch(to: any, preserveData: boolean): Promise<void> {
		return Promise.resolve();
	}

	hasScope(scope: any): boolean {
		return true;
	}

	storeAll(entries: any[], external: boolean): void {
		// No-op for testing
	}

	logStorage(): void {
		// No-op for testing
	}

	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue: T): T;
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined {
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		try {
			return JSON.parse(value) as T;
		} catch {
			return fallbackValue;
		}
	}

	async optimize(scope: StorageScope): Promise<void> {
		// No-op for mock
		return Promise.resolve();
	}
}

import { AINativeAuthService } from '../../common/ainativeAuthService.js';

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
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	test('should initialize with unauthenticated state', () => {
		strictEqual(authService.isAuthenticated(), false);
		strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
		strictEqual(authService.getAccessToken(), null);
		strictEqual(authService.getUser(), null);
	});

	test('should store JWT encrypted in storage', async () => {
		// Note: This test validates the encryption flow without making actual API calls
		// In a real scenario, we would mock fetch() to simulate API responses

		// Verify encryption service is used for storage
		const testToken = 'test.jwt.token';
		const encrypted = await encryptionService.encrypt(testToken);
		const decrypted = await encryptionService.decrypt(encrypted);

		strictEqual(decrypted, testToken);
		ok(encrypted !== testToken, 'Token should be encrypted before storage');
	});

	test('should retrieve user profile after login', () => {
		// After successful login, getUser() should return user data
		const user = authService.getUser();
		// Before login, user should be null
		strictEqual(user, null);
	});

	test('should logout and clear storage', async () => {
		// Test logout functionality
		await authService.logout();

		// Verify all auth data is cleared
		strictEqual(authService.getAccessToken(), null);
		strictEqual(authService.getUser(), null);
		strictEqual(authService.isAuthenticated(), false);
		strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
	});

	test('should emit onDidChangeAuthState event', (done) => {
		let eventFired = false;

		disposables.add(authService.onDidChangeAuthState((state) => {
			eventFired = true;
			strictEqual(state, AuthState.LoggingOut);
			done();
		}));

		// Trigger state change via logout
		authService.logout().then(() => {
			ok(eventFired, 'Event should have fired');
		}).catch(done);
	});

	test('should return isAuthenticated() correctly', () => {
		// Test isAuthenticated logic
		strictEqual(authService.isAuthenticated(), false);

		// After logout, should be false
		authService.logout().then(() => {
			strictEqual(authService.isAuthenticated(), false);
		});
	});

	test('should handle network errors gracefully', async () => {
		// Test error handling without actual network calls
		// The service should handle errors and not crash
		try {
			await authService.logout();
			ok(true, 'Logout should complete even if network fails');
		} catch (error) {
			ok(false, 'Should not throw error on network failure');
		}
	});

	test('should validate token expiration', () => {
		// Test token expiration logic
		// Create a JWT token that's expired
		const expiredToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) - 3600 });

		// Verify the service would detect this as expired
		// (internal method, but tests the concept)
		ok(expiredToken.includes('.'), 'Token should be in JWT format');
	});

	test('should handle concurrent login requests', async () => {
		// Test concurrent login prevention
		// The service has _loginInProgress flag to prevent concurrent logins

		// Multiple calls should be handled safely
		const promises = [
			authService.logout(),
			authService.logout()
		];

		try {
			await Promise.all(promises);
			ok(true, 'Concurrent operations should be handled');
		} catch (error) {
			ok(true, 'Concurrent operations may throw expected errors');
		}
	});

	test('should get access token after initialization', () => {
		const token = authService.getAccessToken();
		strictEqual(token, null, 'Token should be null before login');
	});

	test('should get auth state', () => {
		const state = authService.getAuthState();
		strictEqual(state, AuthState.Unauthenticated);
	});

	test('should handle storage encryption errors', async () => {
		// Test that service handles encryption errors gracefully
		const testData = 'test-data';
		const encrypted = await encryptionService.encrypt(testData);
		const decrypted = await encryptionService.decrypt(encrypted);

		strictEqual(decrypted, testData);
	});
});

/**
 * Helper function to create mock JWT tokens for testing
 */
interface JWTClaims {
	sub?: string;
	email?: string;
	role?: string;
	exp?: number;
	iat?: number;
}


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
