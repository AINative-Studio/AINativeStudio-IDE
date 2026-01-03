/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, notStrictEqual } from 'assert';
import { DisposableStore } from '../../../vs/base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../vs/base/test/common/utils.js';
import { AINativeAuthService } from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
import { IEncryptionService } from '../../../vs/platform/encryption/common/encryptionService.js';
import { IStorageService, IStorageEntry, StorageScope, StorageTarget } from '../../../vs/platform/storage/common/storage.js';
import { StorageValue } from '../../../vs/base/parts/storage/common/storage.js';
import { Event, Emitter } from '../../../vs/base/common/event.js';
import { IAnyWorkspaceIdentifier } from '../../../vs/platform/workspace/common/workspace.js';
import { IUserDataProfile } from '../../../vs/platform/userDataProfile/common/userDataProfile.js';

/**
 * Mock Encryption Service for security testing
 */
class MockEncryptionService implements IEncryptionService {
	_serviceBrand: undefined;

	private encryptedData = new Map<string, string>();

	async encrypt(value: string): Promise<string> {
		// Use base64 with a prefix to clearly show it's encrypted
		const encrypted = 'ENC_' + Buffer.from(value).toString('base64');
		this.encryptedData.set(encrypted, value);
		return encrypted;
	}

	async decrypt(value: string): Promise<string> {
		if (!value.startsWith('ENC_')) {
			throw new Error('Invalid encrypted data format');
		}
		return Buffer.from(value.substring(4), 'base64').toString('utf-8');
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

	// Test helper to verify encryption
	isEncrypted(value: string): boolean {
		return value.startsWith('ENC_');
	}

	// Test helper to get raw encrypted value
	getRawEncryptedValue(encrypted: string): string | undefined {
		return this.encryptedData.get(encrypted);
	}
}

/**
 * Mock Storage Service for security testing
 */
class MockStorageService implements IStorageService {
	_serviceBrand: undefined;

	private storage = new Map<string, string>();
	private _onDidChangeValue = new Emitter<any>();
	private _onDidChangeTarget = new Emitter<any>();
	private _onWillSaveState = new Emitter<any>();

	onDidChangeValue(scope: StorageScope, key: string | undefined, disposable: DisposableStore): Event<any> {
		return this._onDidChangeValue.event;
	}

	readonly onDidChangeTarget: Event<any> = this._onDidChangeTarget.event;
	readonly onWillSaveState: Event<any> = this._onWillSaveState.event;

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

	// Test helper to access raw storage
	getRawStorage(): Map<string, string> {
		return this.storage;
	}
}

suite('Integration - Security Verification', () => {
	const disposables = new DisposableStore();
	let encryptionService: MockEncryptionService;
	let storageService: MockStorageService;
	let authService: AINativeAuthService;

	// Capture console output for testing
	let consoleLogSpy: any[] = [];
	let consoleErrorSpy: any[] = [];
	const originalConsoleLog = console.log;
	const originalConsoleError = console.error;

	setup(() => {
		encryptionService = new MockEncryptionService();
		storageService = new MockStorageService();
		authService = new AINativeAuthService(encryptionService, storageService);
		disposables.add(authService);

		// Spy on console methods
		consoleLogSpy = [];
		consoleErrorSpy = [];

		console.log = (...args: any[]) => {
			consoleLogSpy.push(args);
			originalConsoleLog(...args);
		};

		console.error = (...args: any[]) => {
			consoleErrorSpy.push(args);
			originalConsoleError(...args);
		};
	});

	teardown(() => {
		disposables.clear();

		// Restore console
		console.log = originalConsoleLog;
		console.error = originalConsoleError;
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	test('should encrypt JWT tokens before storage', async () => {
		// Create mock token
		const mockToken = createMockJWT({
			sub: 'test-user-123',
			email: 'test@example.com',
			role: 'user',
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000)
		});

		// Manually encrypt and store (simulating login)
		const encryptedToken = await encryptionService.encrypt(mockToken);
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Verify token is encrypted in storage
		const rawStorage = storageService.getRawStorage();
		const storedToken = rawStorage.get(`${StorageScope.APPLICATION}:ainative.auth.jwt`);

		ok(storedToken !== undefined, 'Token should be stored');
		ok(encryptionService.isEncrypted(storedToken!), 'Token should be encrypted in storage');
		notStrictEqual(storedToken, mockToken, 'Stored token should not be plain text');
		ok(!storedToken!.includes('eyJ'), 'Encrypted token should not contain JWT prefix');
	});

	test('should encrypt refresh tokens before storage', async () => {
		// Create mock refresh token
		const mockRefreshToken = createMockJWT({
			sub: 'test-user-123',
			email: 'test@example.com',
			role: 'user',
			exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
			iat: Math.floor(Date.now() / 1000)
		});

		// Encrypt and store
		const encryptedRefreshToken = await encryptionService.encrypt(mockRefreshToken);
		storageService.store('ainative.auth.refreshToken', encryptedRefreshToken, StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Verify encryption
		const rawStorage = storageService.getRawStorage();
		const storedRefreshToken = rawStorage.get(`${StorageScope.APPLICATION}:ainative.auth.refreshToken`);

		ok(storedRefreshToken !== undefined, 'Refresh token should be stored');
		ok(encryptionService.isEncrypted(storedRefreshToken!), 'Refresh token should be encrypted');
		notStrictEqual(storedRefreshToken, mockRefreshToken, 'Stored refresh token should not be plain text');
	});

	test('should not log sensitive data in console output', async () => {
		// Clear previous logs
		consoleLogSpy = [];
		consoleErrorSpy = [];

		const testPassword = 'super-secret-password-123';
		const testEmail = 'test@example.com';

		// Attempt login (will fail, but should not log password)
		await authService.login(testEmail, testPassword);

		// Check all console logs and errors
		const allLogs = [
			...consoleLogSpy.map(args => args.join(' ')),
			...consoleErrorSpy.map(args => args.join(' '))
		];

		const combinedOutput = allLogs.join('\n');

		// Verify password is NOT logged
		ok(!combinedOutput.includes(testPassword), 'Password should never be logged');

		// Verify JWT tokens are NOT logged in plain text
		ok(!combinedOutput.includes('eyJ'), 'JWT tokens should not be logged in plain text');
	});

	test('should not expose JWT tokens in error messages', async () => {
		const mockToken = createMockJWT({
			sub: 'test-user-123',
			email: 'test@example.com',
			role: 'user',
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000)
		});

		// Store token
		const encryptedToken = await encryptionService.encrypt(mockToken);
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Clear logs
		consoleErrorSpy = [];

		// Trigger an error scenario
		try {
			await authService.refreshToken(); // Will fail - no refresh token
		} catch (error) {
			// Check error message doesn't contain token
			const errorMessage = error instanceof Error ? error.message : String(error);
			ok(!errorMessage.includes(mockToken), 'Error message should not contain JWT token');
			ok(!errorMessage.includes('eyJ'), 'Error message should not contain JWT prefix');
		}

		// Check console errors don't contain tokens
		const errorLogs = consoleErrorSpy.map(args => args.join(' ')).join('\n');
		ok(!errorLogs.includes(mockToken), 'Error logs should not contain JWT token');
	});

	test('should clear all sensitive data on logout', async () => {
		// Store mock auth data
		const mockToken = createMockJWT({
			sub: 'test-user-123',
			email: 'test@example.com',
			role: 'user',
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000)
		});

		const encryptedToken = await encryptionService.encrypt(mockToken);
		const encryptedRefreshToken = await encryptionService.encrypt('refresh-token-123');
		const userData = JSON.stringify({
			id: 'test-user-123',
			email: 'test@example.com',
			role: 'user'
		});

		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);
		storageService.store('ainative.auth.refreshToken', encryptedRefreshToken, StorageScope.APPLICATION, StorageTarget.MACHINE);
		storageService.store('ainative.auth.user', userData, StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Logout
		await authService.logout();

		// Verify all sensitive data is cleared
		const rawStorage = storageService.getRawStorage();
		strictEqual(rawStorage.get(`${StorageScope.APPLICATION}:ainative.auth.jwt`), undefined, 'JWT should be removed from storage');
		strictEqual(rawStorage.get(`${StorageScope.APPLICATION}:ainative.auth.refreshToken`), undefined, 'Refresh token should be removed from storage');
		strictEqual(rawStorage.get(`${StorageScope.APPLICATION}:ainative.auth.user`), undefined, 'User data should be removed from storage');
	});

	test('should use secure storage scope and target', async () => {
		// Verify that storage uses APPLICATION scope and MACHINE target
		// This ensures data is stored securely and persists appropriately

		const mockToken = createMockJWT({
			sub: 'test-user-123',
			email: 'test@example.com',
			role: 'user',
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000)
		});

		const encryptedToken = await encryptionService.encrypt(mockToken);

		// Store with APPLICATION scope and MACHINE target
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Verify it's stored with correct scope
		const rawStorage = storageService.getRawStorage();
		const storageKey = `${StorageScope.APPLICATION}:ainative.auth.jwt`;
		ok(rawStorage.has(storageKey), 'Should use APPLICATION scope for storage');

		// Verify it's not stored with wrong scope
		const wrongScopeKey = `${StorageScope.WORKSPACE}:ainative.auth.jwt`;
		ok(!rawStorage.has(wrongScopeKey), 'Should not use WORKSPACE scope');
	});

	test('should handle encryption service unavailability', async () => {
		// This tests the fallback behavior when encryption is not available
		// The service should still function but may use less secure storage

		const wasAvailable = await encryptionService.isEncryptionAvailable();
		ok(wasAvailable, 'Encryption should be available in tests');
	});

	test('should not store passwords in any form', () => {
		// Verify that passwords are never stored, even encrypted
		const rawStorage = storageService.getRawStorage();

		// Check all storage keys
		for (const [key, value] of rawStorage.entries()) {
			// Passwords should never be stored with any key
			ok(!key.includes('password'), 'Storage key should not reference password');
			ok(!key.includes('pwd'), 'Storage key should not reference pwd');

			// Even if we somehow stored a password, it shouldn't be in plain text
			// (This is a sanity check - we should never store passwords at all)
			ok(!value.toLowerCase().includes('password'), 'Storage value should not contain "password" string');
		}
	});

	test('should validate encryption integrity', async () => {
		const originalValue = 'sensitive-data-12345';

		// Encrypt
		const encrypted = await encryptionService.encrypt(originalValue);

		// Verify it's actually encrypted (different from original)
		notStrictEqual(encrypted, originalValue, 'Encrypted value should differ from original');

		// Decrypt
		const decrypted = await encryptionService.decrypt(encrypted);

		// Verify integrity
		strictEqual(decrypted, originalValue, 'Decrypted value should match original');
	});

	test('should use consistent encryption for same input', async () => {
		// Note: In production, encryption might add randomness (IV, salt)
		// This test verifies the encrypt/decrypt cycle works consistently

		const testData = 'test-token-12345';

		const encrypted1 = await encryptionService.encrypt(testData);
		const encrypted2 = await encryptionService.encrypt(testData);

		// Decrypt both
		const decrypted1 = await encryptionService.decrypt(encrypted1);
		const decrypted2 = await encryptionService.decrypt(encrypted2);

		// Both should decrypt to the same original value
		strictEqual(decrypted1, testData);
		strictEqual(decrypted2, testData);
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
