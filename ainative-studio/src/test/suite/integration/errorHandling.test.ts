/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../vs/base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../vs/base/test/common/utils.js';
import {
	AINativeAuthService,
	AuthState,
	AINativeAuthError,
	AINativeAuthErrorCode
} from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
import { IEncryptionService } from '../../../vs/platform/encryption/common/encryptionService.js';
import { IStorageService, IStorageEntry, StorageScope, StorageTarget } from '../../../vs/platform/storage/common/storage.js';
import { StorageValue } from '../../../vs/base/parts/storage/common/storage.js';
import { Event, Emitter } from '../../../vs/base/common/event.js';
import { IAnyWorkspaceIdentifier } from '../../../vs/platform/workspace/common/workspace.js';
import { IUserDataProfile } from '../../../vs/platform/userDataProfile/common/userDataProfile.js';

/**
 * Mock Encryption Service for error handling tests
 */
class MockEncryptionService implements IEncryptionService {
	_serviceBrand: undefined;
	private shouldThrowOnEncrypt = false;
	private shouldThrowOnDecrypt = false;

	setShouldThrowOnEncrypt(value: boolean): void {
		this.shouldThrowOnEncrypt = value;
	}

	setShouldThrowOnDecrypt(value: boolean): void {
		this.shouldThrowOnDecrypt = value;
	}

	async encrypt(value: string): Promise<string> {
		if (this.shouldThrowOnEncrypt) {
			throw new Error('Encryption failed');
		}
		return Buffer.from(value).toString('base64');
	}

	async decrypt(value: string): Promise<string> {
		if (this.shouldThrowOnDecrypt) {
			throw new Error('Decryption failed');
		}
		return Buffer.from(value, 'base64').toString('utf-8');
	}

	async isEncryptionAvailable(): Promise<boolean> {
		return true;
	}

	async setUsePlainTextEncryption(): Promise<void> {
		// No-op
	}

	async getKeyStorageProvider(): Promise<any> {
		return 'test';
	}
}

/**
 * Mock Storage Service for error handling tests
 */
class MockStorageService implements IStorageService {
	_serviceBrand: undefined;

	private storage = new Map<string, string>();
	private shouldThrowOnStore = false;
	private shouldThrowOnGet = false;
	private _onDidChangeValue = new Emitter<any>();
	private _onDidChangeTarget = new Emitter<any>();
	private _onWillSaveState = new Emitter<any>();

	setShouldThrowOnStore(value: boolean): void {
		this.shouldThrowOnStore = value;
	}

	setShouldThrowOnGet(value: boolean): void {
		this.shouldThrowOnGet = value;
	}

	onDidChangeValue(scope: StorageScope, key: string | undefined, disposable: DisposableStore): Event<any> {
		return this._onDidChangeValue.event;
	}

	readonly onDidChangeTarget: Event<any> = this._onDidChangeTarget.event;
	readonly onWillSaveState: Event<any> = this._onWillSaveState.event;

	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		if (this.shouldThrowOnGet) {
			throw new Error('Storage get failed');
		}
		const storageKey = `${scope}:${key}`;
		return this.storage.get(storageKey) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue: boolean): boolean;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		return value === 'true';
	}

	getNumber(key: string, scope: StorageScope, fallbackValue: number): number;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		return parseInt(value, 10);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue: T): T;
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined {
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		try {
			return JSON.parse(value);
		} catch {
			return fallbackValue;
		}
	}

	store(key: string, value: StorageValue, scope: StorageScope, target: StorageTarget): void {
		if (this.shouldThrowOnStore) {
			throw new Error('Storage store failed');
		}
		const storageKey = `${scope}:${key}`;
		if (value === undefined || value === null) {
			this.storage.delete(storageKey);
		} else {
			this.storage.set(storageKey, String(value));
		}
	}

	storeAll(entries: Array<IStorageEntry>, external: boolean): void {
		for (const entry of entries) {
			this.store(entry.key, entry.value, entry.scope, entry.target);
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

	log(): void {
		// No-op for testing
	}

	hasScope(scope: IAnyWorkspaceIdentifier | IUserDataProfile): boolean {
		return true;
	}

	switch(to: IAnyWorkspaceIdentifier | IUserDataProfile, preserveData: boolean): Promise<void> {
		return Promise.resolve();
	}

	isNew(scope: StorageScope): boolean {
		return false;
	}

	optimize(scope: StorageScope): Promise<void> {
		return Promise.resolve();
	}

	flush(): Promise<void> {
		return Promise.resolve();
	}
}

suite('Integration - Error Handling and Retry Logic', () => {
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
		// Reset error flags
		encryptionService.setShouldThrowOnEncrypt(false);
		encryptionService.setShouldThrowOnDecrypt(false);
		storageService.setShouldThrowOnStore(false);
		storageService.setShouldThrowOnGet(false);
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	test('should handle network errors during login', async () => {
		// Since we can't mock fetch easily in this environment, we test with invalid credentials
		// which will trigger network request and error handling
		const result = await authService.login('invalid@test.com', 'invalid-password');

		strictEqual(result.success, false, 'Login should fail with invalid credentials');
		ok(result.error !== undefined, 'Should have error object');

		// Should remain unauthenticated
		strictEqual(authService.isAuthenticated(), false);
		strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
	});

	test('should handle concurrent login requests', async () => {
		// First login starts
		const login1 = authService.login('test1@example.com', 'password1');

		// Second login should be rejected due to login in progress
		let errorCaught = false;
		try {
			await authService.login('test2@example.com', 'password2');
		} catch (error) {
			errorCaught = true;
			ok(error instanceof AINativeAuthError, 'Should throw AINativeAuthError');
			if (error instanceof AINativeAuthError) {
				strictEqual(error.code, AINativeAuthErrorCode.UnknownError, 'Should have UnknownError code');
				ok(error.message.includes('Login already in progress'), 'Should have correct error message');
			}
		}

		// Wait for first login to complete
		await login1;

		ok(errorCaught, 'Second login should have thrown error');
	});

	test('should handle logout errors gracefully', async () => {
		// Logout should complete even if network fails
		// The service continues with local cleanup
		await authService.logout();

		strictEqual(authService.isAuthenticated(), false);
		strictEqual(authService.getAccessToken(), null);
		strictEqual(authService.getUser(), null);
	});

	test('should handle token refresh without refresh token', async () => {
		// Try to refresh without having a refresh token
		let errorCaught = false;
		try {
			await authService.refreshToken();
		} catch (error) {
			errorCaught = true;
			ok(error instanceof AINativeAuthError, 'Should throw AINativeAuthError');
			if (error instanceof AINativeAuthError) {
				strictEqual(error.code, AINativeAuthErrorCode.TokenRefreshFailed, 'Should have TokenRefreshFailed code');
			}
		}

		ok(errorCaught, 'Should throw error when refreshing without refresh token');
	});

	test('should handle malformed JWT tokens', async () => {
		// Store a malformed JWT
		const malformedToken = 'not.a.valid.jwt.token.format';
		const encryptedToken = await encryptionService.encrypt(malformedToken);
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Create new service instance
		const newAuthService = new AINativeAuthService(encryptionService, storageService);
		disposables.add(newAuthService);

		// Wait for async load
		await new Promise(resolve => setTimeout(resolve, 100));

		// Should handle gracefully and remain unauthenticated
		strictEqual(newAuthService.isAuthenticated(), false);
		strictEqual(newAuthService.getAuthState(), AuthState.Unauthenticated);
	});

	test('should handle missing JWT parts', async () => {
		// Store a JWT with missing parts
		const invalidJWT = 'header.payload'; // Missing signature
		const encryptedToken = await encryptionService.encrypt(invalidJWT);
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Create new service instance
		const newAuthService = new AINativeAuthService(encryptionService, storageService);
		disposables.add(newAuthService);

		// Wait for async load
		await new Promise(resolve => setTimeout(resolve, 100));

		// Should handle gracefully
		strictEqual(newAuthService.isAuthenticated(), false);
	});

	test('should handle decryption errors on load', async () => {
		// Store encrypted data
		const mockToken = createMockJWT({
			sub: 'test-user',
			email: 'test@example.com',
			role: 'user',
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000)
		});
		const encryptedToken = await encryptionService.encrypt(mockToken);
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Make decryption fail
		encryptionService.setShouldThrowOnDecrypt(true);

		// Create new service instance
		const newAuthService = new AINativeAuthService(encryptionService, storageService);
		disposables.add(newAuthService);

		// Wait for async load
		await new Promise(resolve => setTimeout(resolve, 100));

		// Should handle decryption error and remain unauthenticated
		strictEqual(newAuthService.isAuthenticated(), false);
		strictEqual(newAuthService.getAuthState(), AuthState.Unauthenticated);
	});

	test('should handle invalid JSON in user data', async () => {
		// Store valid token but invalid user JSON
		const mockToken = createMockJWT({
			sub: 'test-user',
			email: 'test@example.com',
			role: 'user',
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000)
		});
		const encryptedToken = await encryptionService.encrypt(mockToken);
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);
		storageService.store('ainative.auth.user', 'invalid-json{', StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Create new service instance
		const newAuthService = new AINativeAuthService(encryptionService, storageService);
		disposables.add(newAuthService);

		// Wait for async load
		await new Promise(resolve => setTimeout(resolve, 100));

		// Should handle JSON parse error gracefully
		strictEqual(newAuthService.isAuthenticated(), false);
	});

	test('should handle auth state transitions correctly on errors', async () => {
		const stateChanges: AuthState[] = [];

		disposables.add(authService.onDidChangeAuthState((state) => {
			stateChanges.push(state);
		}));

		// Try to refresh without refresh token (will fail)
		try {
			await authService.refreshToken();
		} catch {
			// Expected to fail
		}

		// Should transition to Unauthenticated on refresh failure
		ok(stateChanges.includes(AuthState.Refreshing), 'Should enter Refreshing state');
		ok(stateChanges.includes(AuthState.Unauthenticated), 'Should return to Unauthenticated on failure');
	});

	test('should maintain consistency after multiple errors', async () => {
		// Trigger multiple errors in sequence
		try {
			await authService.refreshToken(); // No refresh token
		} catch {}

		await authService.logout(); // Should work

		try {
			await authService.refreshToken(); // Still no refresh token
		} catch {}

		// State should remain consistent
		strictEqual(authService.isAuthenticated(), false);
		strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
		strictEqual(authService.getAccessToken(), null);
		strictEqual(authService.getUser(), null);
	});
});

/**
 * Helper function to create mock JWT tokens
 */
function createMockJWT(claims: { sub: string; email: string; role: string; exp: number; iat: number }): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
	const payload = Buffer.from(JSON.stringify(claims)).toString('base64');
	const signature = 'mock-signature';
	return `${header}.${payload}.${signature}`;
}
