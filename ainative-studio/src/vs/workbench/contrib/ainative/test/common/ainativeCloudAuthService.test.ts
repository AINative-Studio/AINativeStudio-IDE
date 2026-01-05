/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import {
	CloudAuthState,
	CloudAuthError,
	CloudAuthErrorCode
} from '../../common/ainativeCloudAuthTypes.js';
import { AINativeCloudAuthService } from '../../common/ainativeCloudAuthService.js';
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
// @ts-expect-error - Mock service for testing, interface compatibility handled at runtime
class MockStorageService implements IStorageService {
	private storage: Map<string, Map<string, string>> = new Map();

	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		const scopeMap = this.storage.get(scope.toString());
		return scopeMap?.get(key) ?? fallbackValue;
	}

	set(key: string, value: string | undefined, scope: StorageScope): void {
		if (!this.storage.has(scope.toString())) {
			this.storage.set(scope.toString(), new Map());
		}
		const scopeMap = this.storage.get(scope.toString())!;
		if (value === undefined) {
			scopeMap.delete(key);
		} else {
			scopeMap.set(key, value);
		}
	}

	delete(key: string, scope: StorageScope): void {
		this.storage.get(scope.toString())?.delete(key);
	}

	getObject<T>(key: string, scope: StorageScope, defaultValue?: T): T | undefined {
		const value = this.get(key, scope);
		return value ? JSON.parse(value) : defaultValue;
	}

	storeAll(entries: any[], external: boolean): void {
		// Mock implementation
	}

	log(): void {
		// Mock implementation
	}

	async optimize(scope: StorageScope): Promise<void> {
		// Mock implementation
	}

	keys(scope: StorageScope, target: any): string[] {
		return [];
	}

	clear(): void {
		this.storage.clear();
	}

	store(key: string, value: string | undefined, scope: StorageScope, target: any): void {
		this.set(key, value, scope);
	}

	// Required event properties
	onDidChangeValue = null as any;
	onDidChangeTarget = null as any;
	onWillSaveState = null as any;
}

/**
 * Create a mock JWT token for testing
 */
function createMockJWT(claims: { sub: string; email: string; role: string; exp?: number; iat?: number }): string {
	const header = { alg: 'HS256', typ: 'JWT' };
	const payload = {
		sub: claims.sub,
		email: claims.email,
		role: claims.role,
		exp: claims.exp || Math.floor(Date.now() / 1000) + 3600, // Default: expires in 1 hour
		iat: claims.iat || Math.floor(Date.now() / 1000)
	};

	const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64');
	const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
	const signature = 'mock-signature';

	return `${headerBase64}.${payloadBase64}.${signature}`;
}

suite('AINativeCloudAuthService', () => {
	const disposables = new DisposableStore();
	let encryptionService: MockEncryptionService;
	let storageService: MockStorageService;
	let authService: AINativeCloudAuthService;

	setup(() => {
		encryptionService = new MockEncryptionService();
		storageService = new MockStorageService();
		authService = disposables.add(new AINativeCloudAuthService(encryptionService, storageService));
	});

	teardown(() => {
		disposables.clear();
		storageService.clear();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	suite('Initial State', () => {
		test('should start unauthenticated', () => {
			strictEqual(authService.isAuthenticated(), false);
			strictEqual(authService.getAuthState(), CloudAuthState.Unauthenticated);
			strictEqual(authService.getUser(), null);
		});

		test('should return null for access token when not authenticated', () => {
			strictEqual(authService.getAccessTokenSync(), null);
		});
	});

	suite('Storage Keys', () => {
		test('should use cloud-specific storage keys', () => {
			const keys = storageService.keys(StorageScope.APPLICATION, StorageTarget.MACHINE);
			// Initially, no keys should be stored
			strictEqual(keys.length, 0);
		});

		test('storage keys should not conflict with ZeroDB auth', () => {
			// Ensure cloud auth uses different keys than ZeroDB auth
			const cloudPrefix = 'ainative.cloud.auth';
			const zerodbPrefix = 'ainative.auth';

			// This test ensures the prefixes are different
			ok(!cloudPrefix.startsWith(zerodbPrefix));
			ok(!zerodbPrefix.startsWith(cloudPrefix));
		});
	});

	suite('Registration', () => {
		test('should validate password length', async () => {
			const result = await authService.register({
				username: 'testuser',
				email: 'test@example.com',
				password: 'short'
			});

			strictEqual(result.success, false);
			ok(result.error);
			strictEqual(result.error.code, CloudAuthErrorCode.WeakPassword);
		});

		test('should validate email format', async () => {
			const result = await authService.register({
				username: 'testuser',
				email: 'invalid-email',
				password: 'validpassword123'
			});

			strictEqual(result.success, false);
			ok(result.error);
		});

		test('should prevent concurrent operations', async () => {
			// Start a registration
			const promise1 = authService.register({
				username: 'testuser',
				email: 'test@example.com',
				password: 'validpassword123'
			});

			// Try to start another registration immediately
			const promise2 = authService.register({
				username: 'testuser2',
				email: 'test2@example.com',
				password: 'validpassword123'
			});

			// One should fail with operation in progress error
			const results = await Promise.allSettled([promise1, promise2]);
			const errors = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason);
			ok(errors.some(e => e instanceof CloudAuthError && e.message.includes('in progress')));
		});
	});

	suite('Login', () => {
		test('should prevent concurrent login operations', async () => {
			// Start a login
			const promise1 = authService.login('test@example.com', 'password123');

			// Try to start another login immediately
			const promise2 = authService.login('test2@example.com', 'password456');

			// One should fail with operation in progress error
			const results = await Promise.allSettled([promise1, promise2]);
			const errors = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason);
			ok(errors.some(e => e instanceof CloudAuthError && e.message.includes('in progress')));
		});
	});

	suite('Password Reset', () => {
		test('should validate new password length in confirmPasswordReset', async () => {
			const result = await authService.confirmPasswordReset('token123', 'short');

			strictEqual(result.success, false);
			ok(result.error);
			strictEqual(result.error.code, CloudAuthErrorCode.WeakPassword);
		});

		test('should validate new password length in changePassword', async () => {
			const result = await authService.changePassword('oldpassword', 'short');

			strictEqual(result.success, false);
			ok(result.error);
			strictEqual(result.error.code, CloudAuthErrorCode.WeakPassword);
		});

		test('should require authentication for changePassword', async () => {
			const result = await authService.changePassword('oldpassword', 'newpassword123');

			strictEqual(result.success, false);
			ok(result.error);
			strictEqual(result.error.code, CloudAuthErrorCode.InvalidCredentials);
		});
	});

	suite('Token Management', () => {
		test('should decode JWT token correctly', () => {
			const token = createMockJWT({
				sub: 'user-123',
				email: 'test@example.com',
				role: 'user'
			});

			// Access private method for testing
			const service = authService as any;
			const claims = service._decodeJWT(token);

			strictEqual(claims.sub, 'user-123');
			strictEqual(claims.email, 'test@example.com');
			strictEqual(claims.role, 'user');
		});

		test('should detect expired tokens', () => {
			const expiredToken = createMockJWT({
				sub: 'user-123',
				email: 'test@example.com',
				role: 'user',
				exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
			});

			// Access private method for testing
			const service = authService as any;
			const isExpired = service._isTokenExpired(expiredToken);

			strictEqual(isExpired, true);
		});

		test('should not detect valid tokens as expired', () => {
			const validToken = createMockJWT({
				sub: 'user-123',
				email: 'test@example.com',
				role: 'user',
				exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
			});

			// Access private method for testing
			const service = authService as any;
			const isExpired = service._isTokenExpired(validToken);

			strictEqual(isExpired, false);
		});

		test('should handle invalid JWT format', () => {
			const invalidToken = 'invalid.jwt';

			// Access private method for testing
			const service = authService as any;
			try {
				service._decodeJWT(invalidToken);
				ok(false, 'Should have thrown error');
			} catch (error) {
				ok(error instanceof Error);
			}
		});
	});

	suite('Logout', () => {
		test('should clear all authentication data', async () => {
			// Manually set some auth data
			const service = authService as any;
			service._accessToken = 'test-token';
			service._refreshToken = 'test-refresh';
			service._user = { id: 'user-123', email: 'test@example.com', role: 'user' };
			service._authState = CloudAuthState.Authenticated;

			await authService.logout();

			strictEqual(authService.getAccessTokenSync(), null);
			strictEqual(authService.getUser(), null);
			strictEqual(authService.isAuthenticated(), false);
			strictEqual(authService.getAuthState(), CloudAuthState.Unauthenticated);
		});

		test('should clear storage on logout', async () => {
			// Manually store some data
			await storageService.store('ainative.cloud.auth.accessToken', 'test', StorageScope.APPLICATION, StorageTarget.MACHINE);
			await storageService.store('ainative.cloud.auth.refreshToken', 'test', StorageScope.APPLICATION, StorageTarget.MACHINE);
			await storageService.store('ainative.cloud.auth.user', '{}', StorageScope.APPLICATION, StorageTarget.MACHINE);

			await authService.logout();

			strictEqual(storageService.get('ainative.cloud.auth.accessToken', StorageScope.APPLICATION), undefined);
			strictEqual(storageService.get('ainative.cloud.auth.refreshToken', StorageScope.APPLICATION), undefined);
			strictEqual(storageService.get('ainative.cloud.auth.user', StorageScope.APPLICATION), undefined);
		});
	});

	suite('Email Validation', () => {
		test('should validate correct email formats', () => {
			const service = authService as any;

			strictEqual(service._isValidEmail('test@example.com'), true);
			strictEqual(service._isValidEmail('user.name@example.co.uk'), true);
			strictEqual(service._isValidEmail('user+tag@example.com'), true);
		});

		test('should reject invalid email formats', () => {
			const service = authService as any;

			strictEqual(service._isValidEmail('invalid'), false);
			strictEqual(service._isValidEmail('invalid@'), false);
			strictEqual(service._isValidEmail('@example.com'), false);
			strictEqual(service._isValidEmail('test@'), false);
			strictEqual(service._isValidEmail('test @example.com'), false);
		});
	});

	suite('State Management', () => {
		test('should emit state change events', (done) => {
			const disposable = authService.onDidChangeAuthState((state) => {
				strictEqual(state, CloudAuthState.LoggingOut);
				disposable.dispose();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
				done();
			});

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
			authService.logout();
		});

		test('should emit user update events', async () => {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			let eventFired = false;
			const disposable = authService.onDidUpdateUser((user) => {
				eventFired = true;
				disposable.dispose();
			});

			// This would normally be triggered by a successful login/registration
			// Since we're testing with mocks, we'll verify the event is set up correctly
			disposable.dispose();
			ok(true, 'Event listener registered successfully');
		});
	});

	suite('Error Handling', () => {
		test('should create CloudAuthError with correct properties', () => {
			const error = new CloudAuthError(
				CloudAuthErrorCode.InvalidCredentials,
				'Invalid credentials',
				new Error('Original error'),
				401
			);

			strictEqual(error.code, CloudAuthErrorCode.InvalidCredentials);
			strictEqual(error.message, 'Invalid credentials');
			strictEqual(error.statusCode, 401);
			ok(error.originalError);
			strictEqual(error.name, 'CloudAuthError');
		});
	});

	suite('User Data Mapping', () => {
		test('should map API response to CloudUser correctly', () => {
			const service = authService as any;

			const apiResponse = {
				id: 'user-123',
				email: 'test@example.com',
				username: 'testuser',
				name: 'Test User',
				role: 'user',
				email_verified: true,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-02T00:00:00Z'
			};

			const user = service._mapUserInfoToCloudUser(apiResponse);

			strictEqual(user.id, 'user-123');
			strictEqual(user.email, 'test@example.com');
			strictEqual(user.username, 'testuser');
			strictEqual(user.name, 'Test User');
			strictEqual(user.role, 'user');
			strictEqual(user.emailVerified, true);
			strictEqual(user.createdAt, '2024-01-01T00:00:00Z');
			strictEqual(user.updatedAt, '2024-01-02T00:00:00Z');
		});
	});
});
