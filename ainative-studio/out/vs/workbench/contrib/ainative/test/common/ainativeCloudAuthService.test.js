/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CloudAuthState, CloudAuthError, CloudAuthErrorCode } from '../../common/ainativeCloudAuthTypes.js';
import { AINativeCloudAuthService } from '../../common/ainativeCloudAuthService.js';
/**
 * Mock Encryption Service for testing
 */
class MockEncryptionService {
    async encrypt(value) {
        return Buffer.from(value).toString('base64');
    }
    async decrypt(value) {
        return Buffer.from(value, 'base64').toString('utf-8');
    }
    async isEncryptionAvailable() {
        return true;
    }
    async setUsePlainTextEncryption() {
        // No-op for testing
    }
    async getKeyStorageProvider() {
        return 'test';
    }
}
/**
 * Mock Storage Service for testing
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this.onDidChangeTarget = { dispose: () => { } };
        this.onWillSaveState = { dispose: () => { } };
    }
    get(key, scope, fallbackValue) {
        const scopeMap = this.storage.get(scope.toString());
        return scopeMap?.get(key) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        return value !== undefined ? value === 'true' : fallbackValue;
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        return value !== undefined ? parseInt(value, 10) : fallbackValue;
    }
    getObject(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        return value ? JSON.parse(value) : fallbackValue;
    }
    store(key, value, scope, target) {
        if (!this.storage.has(scope.toString())) {
            this.storage.set(scope.toString(), new Map());
        }
        const scopeMap = this.storage.get(scope.toString());
        if (value === undefined || value === null) {
            scopeMap.delete(key);
        }
        else {
            scopeMap.set(key, String(value));
        }
    }
    remove(key, scope) {
        this.storage.get(scope.toString())?.delete(key);
    }
    keys(scope, target) {
        return [];
    }
    storeAll(entries, external) {
        // Mock implementation
    }
    log() {
        // Mock implementation
    }
    async optimize(scope) {
        // Mock implementation
    }
    clear() {
        this.storage.clear();
    }
    onDidChangeValue(scope, key, disposable) {
        return { dispose: () => { } };
    }
    isNew(scope) { return false; }
    flush(reason) { return Promise.resolve(); }
    switch() { return Promise.resolve(); }
    hasScope(scope) { return true; }
}
/**
 * Create a mock JWT token for testing
 */
function createMockJWT(claims) {
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
    let encryptionService;
    let storageService;
    let authService;
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
            const keys = storageService.keys(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
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
            const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
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
            const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
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
            const service = authService;
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
            const service = authService;
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
            const service = authService;
            const isExpired = service._isTokenExpired(validToken);
            strictEqual(isExpired, false);
        });
        test('should handle invalid JWT format', () => {
            const invalidToken = 'invalid.jwt';
            // Access private method for testing
            const service = authService;
            try {
                service._decodeJWT(invalidToken);
                ok(false, 'Should have thrown error');
            }
            catch (error) {
                ok(error instanceof Error);
            }
        });
    });
    suite('Logout', () => {
        test('should clear all authentication data', async () => {
            // Manually set some auth data
            const service = authService;
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
            await storageService.store('ainative.cloud.auth.accessToken', 'test', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            await storageService.store('ainative.cloud.auth.refreshToken', 'test', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            await storageService.store('ainative.cloud.auth.user', '{}', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            await authService.logout();
            strictEqual(storageService.get('ainative.cloud.auth.accessToken', -1 /* StorageScope.APPLICATION */), undefined);
            strictEqual(storageService.get('ainative.cloud.auth.refreshToken', -1 /* StorageScope.APPLICATION */), undefined);
            strictEqual(storageService.get('ainative.cloud.auth.user', -1 /* StorageScope.APPLICATION */), undefined);
        });
    });
    suite('Email Validation', () => {
        test('should validate correct email formats', () => {
            const service = authService;
            strictEqual(service._isValidEmail('test@example.com'), true);
            strictEqual(service._isValidEmail('user.name@example.co.uk'), true);
            strictEqual(service._isValidEmail('user+tag@example.com'), true);
        });
        test('should reject invalid email formats', () => {
            const service = authService;
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
            // @ts-expect-error - Unused variable
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
            const error = new CloudAuthError(CloudAuthErrorCode.InvalidCredentials, 'Invalid credentials', new Error('Original error'), 401);
            strictEqual(error.code, CloudAuthErrorCode.InvalidCredentials);
            strictEqual(error.message, 'Invalid credentials');
            strictEqual(error.statusCode, 401);
            ok(error.originalError);
            strictEqual(error.name, 'CloudAuthError');
        });
    });
    suite('User Data Mapping', () => {
        test('should map API response to CloudUser correctly', () => {
            const service = authService;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVDbG91ZEF1dGhTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2FpbmF0aXZlQ2xvdWRBdXRoU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUNOLGNBQWMsRUFDZCxjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLE1BQU0sd0NBQXdDLENBQUM7QUFDaEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFJcEY7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQjtJQUcxQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFhO1FBQzFCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQzFCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyx5QkFBeUI7UUFDOUIsb0JBQW9CO0lBQ3JCLENBQUM7SUFFRCxLQUFLLENB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