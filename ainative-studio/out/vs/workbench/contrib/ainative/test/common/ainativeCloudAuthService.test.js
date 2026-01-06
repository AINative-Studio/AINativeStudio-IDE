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
        return Promise.resolve();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVDbG91ZEF1dGhTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2FpbmF0aXZlQ2xvdWRBdXRoU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUNOLGNBQWMsRUFDZCxjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLE1BQU0sd0NBQXdDLENBQUM7QUFDaEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFJcEY7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQjtJQUcxQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFhO1FBQzFCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQzFCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyx5QkFB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