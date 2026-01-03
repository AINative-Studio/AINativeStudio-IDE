/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, notStrictEqual } from 'assert';
import { DisposableStore } from '../../../vs/base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../vs/base/test/common/utils.js';
import { AINativeAuthService, AuthState } from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
import { IEncryptionService } from '../../../vs/platform/encryption/common/encryptionService.js';
import { IStorageService, IStorageEntry, StorageScope, StorageTarget } from '../../../vs/platform/storage/common/storage.js';
import { StorageValue } from '../../../vs/base/parts/storage/common/storage.js';
import { Event, Emitter } from '../../../vs/base/common/event.js';
import { IAnyWorkspaceIdentifier } from '../../../vs/platform/workspace/common/workspace.js';
import { IUserDataProfile } from '../../../vs/platform/userDataProfile/common/userDataProfile.js';

/**
 * Mock Encryption Service for integration testing
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
		// No-op
	}

	async getKeyStorageProvider(): Promise<any> {
		return 'test';
	}
}

/**
 * Mock Storage Service for integration testing
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
}

suite('Integration - Full Authentication Flow', () => {
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

	test('should complete full authentication lifecycle', async () => {
		// Step 1: Initial state should be unauthenticated
		strictEqual(authService.isAuthenticated(), false);
		strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
		strictEqual(authService.getAccessToken(), null);
		strictEqual(authService.getUser(), null);

		// Step 2: Verify state transitions
		let stateChanges: AuthState[] = [];
		disposables.add(authService.onDidChangeAuthState((state) => {
			stateChanges.push(state);
		}));

		// Step 3: Logout (should handle even if not logged in)
		await authService.logout();
		ok(stateChanges.includes(AuthState.LoggingOut), 'Should transition to LoggingOut state');
		ok(stateChanges.includes(AuthState.Unauthenticated), 'Should return to Unauthenticated state');

		// Step 4: Verify storage is clear after logout
		strictEqual(authService.getAccessToken(), null);
		strictEqual(authService.getUser(), null);
		strictEqual(authService.isAuthenticated(), false);
	});

	test('should handle storage persistence across instances', async () => {
		// Create mock token data
		const mockToken = createMockJWT({
			sub: 'test-user-123',
			email: 'test@example.com',
			role: 'user',
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000)
		});

		const mockUser = {
			id: 'test-user-123',
			email: 'test@example.com',
			name: 'Test User',
			role: 'user'
		};

		// Manually store encrypted data (simulating a previous login)
		const encryptedToken = await encryptionService.encrypt(mockToken);
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);
		storageService.store('ainative.auth.user', JSON.stringify(mockUser), StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Create new auth service instance (simulating app restart)
		const newAuthService = new AINativeAuthService(encryptionService, storageService);
		disposables.add(newAuthService);

		// Wait for async load from storage
		await new Promise(resolve => setTimeout(resolve, 100));

		// Verify state was restored
		strictEqual(newAuthService.isAuthenticated(), true, 'Should restore authenticated state');
		notStrictEqual(newAuthService.getAccessToken(), null, 'Should restore access token');
		notStrictEqual(newAuthService.getUser(), null, 'Should restore user data');
		strictEqual(newAuthService.getUser()?.email, 'test@example.com', 'Should restore correct user email');
	});

	test('should handle concurrent operations gracefully', async () => {
		// Test that multiple concurrent operations don't cause race conditions
		const logoutPromises = [
			authService.logout(),
			authService.logout(),
			authService.logout()
		];

		// All operations should complete without throwing
		await Promise.all(logoutPromises);

		// Final state should be consistent
		strictEqual(authService.isAuthenticated(), false);
		strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
	});

	test('should validate token expiration on load', async () => {
		// Create an expired token
		const expiredToken = createMockJWT({
			sub: 'test-user-123',
			email: 'test@example.com',
			role: 'user',
			exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
			iat: Math.floor(Date.now() / 1000) - 7200
		});

		const mockUser = {
			id: 'test-user-123',
			email: 'test@example.com',
			role: 'user'
		};

		// Store expired token
		const encryptedToken = await encryptionService.encrypt(expiredToken);
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);
		storageService.store('ainative.auth.user', JSON.stringify(mockUser), StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Create new auth service instance
		const newAuthService = new AINativeAuthService(encryptionService, storageService);
		disposables.add(newAuthService);

		// Wait for async load
		await new Promise(resolve => setTimeout(resolve, 100));

		// Should detect expired token and clear auth state
		strictEqual(newAuthService.isAuthenticated(), false, 'Should not be authenticated with expired token');
		strictEqual(newAuthService.getAuthState(), AuthState.Unauthenticated, 'Should be in unauthenticated state');
	});

	test('should emit auth state change events correctly', async () => {
		const stateChanges: AuthState[] = [];

		disposables.add(authService.onDidChangeAuthState((state) => {
			stateChanges.push(state);
		}));

		// Trigger logout
		await authService.logout();

		// Verify events were fired in correct order
		ok(stateChanges.length > 0, 'Should emit at least one state change event');
		ok(stateChanges.includes(AuthState.LoggingOut), 'Should emit LoggingOut state');
		strictEqual(stateChanges[stateChanges.length - 1], AuthState.Unauthenticated, 'Final state should be Unauthenticated');
	});

	test('should handle missing storage keys gracefully', () => {
		// Verify service handles missing storage without crashing
		strictEqual(authService.isAuthenticated(), false);
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
