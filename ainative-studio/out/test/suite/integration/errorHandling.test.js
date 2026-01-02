/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../vs/base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../vs/base/test/common/utils.js';
import { AINativeAuthService, AINativeAuthError, AINativeAuthErrorCode } from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
/**
 * Mock Encryption Service for error handling tests
 */
class MockEncryptionService {
    constructor() {
        this.shouldThrowOnEncrypt = false;
        this.shouldThrowOnDecrypt = false;
    }
    setShouldThrowOnEncrypt(value) {
        this.shouldThrowOnEncrypt = value;
    }
    setShouldThrowOnDecrypt(value) {
        this.shouldThrowOnDecrypt = value;
    }
    async encrypt(value) {
        if (this.shouldThrowOnEncrypt) {
            throw new Error('Encryption failed');
        }
        return Buffer.from(value).toString('base64');
    }
    async decrypt(value) {
        if (this.shouldThrowOnDecrypt) {
            throw new Error('Decryption failed');
        }
        return Buffer.from(value, 'base64').toString('utf-8');
    }
    async isEncryptionAvailable() {
        return true;
    }
    async setUsePlainTextEncryption() {
        // No-op
    }
    async getKeyStorageProvider() {
        return 'test';
    }
}
/**
 * Mock Storage Service for error handling tests
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this.shouldThrowOnStore = false;
        this.shouldThrowOnGet = false;
        this.onDidChangeValue = (_scope, _key, _disposable) => ({ dispose: () => { } });
        this.onDidChangeTarget = () => ({ dispose: () => { } });
        this.onWillSaveState = () => ({ dispose: () => { } });
    }
    setShouldThrowOnStore(value) {
        this.shouldThrowOnStore = value;
    }
    setShouldThrowOnGet(value) {
        this.shouldThrowOnGet = value;
    }
    get(key, scope, fallbackValue) {
        if (this.shouldThrowOnGet) {
            throw new Error('Storage get failed');
        }
        const storageKey = `${scope}:${key}`;
        return this.storage.get(storageKey) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        return value === 'true';
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        return parseInt(value, 10);
    }
    store(key, value, scope, target) {
        if (this.shouldThrowOnStore) {
            throw new Error('Storage store failed');
        }
        const storageKey = `${scope}:${key}`;
        if (value === undefined || value === null) {
            this.storage.delete(storageKey);
        }
        else {
            this.storage.set(storageKey, String(value));
        }
    }
    remove(key, scope) {
        const storageKey = `${scope}:${key}`;
        this.storage.delete(storageKey);
    }
    keys(scope, target) {
        const prefix = `${scope}:`;
        return Array.from(this.storage.keys())
            .filter(key => key.startsWith(prefix))
            .map(key => key.substring(prefix.length));
    }
    migrate() {
        return Promise.resolve();
    }
    isNew(scope) {
        return false;
    }
    flush() {
        return Promise.resolve();
    }
    log() {
        return Promise.resolve();
    }
    switch() {
        return Promise.resolve();
    }
    hasScope() {
        return true;
    }
    storeAll() {
        // No-op
    }
    logStorage() {
        // No-op
    }
    getObject(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        try {
            return JSON.parse(value);
        }
        catch {
            return fallbackValue;
        }
    }
    async optimize(scope) {
        // No-op for mock
        return Promise.resolve();
    }
}
suite('Integration - Error Handling and Retry Logic', () => {
    const disposables = new DisposableStore();
    let encryptionService;
    let storageService;
    let authService;
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
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
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
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
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
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
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('ainative.auth.user', 'invalid-json{', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Create new service instance
        const newAuthService = new AINativeAuthService(encryptionService, storageService);
        disposables.add(newAuthService);
        // Wait for async load
        await new Promise(resolve => setTimeout(resolve, 100));
        // Should handle JSON parse error gracefully
        strictEqual(newAuthService.isAuthenticated(), false);
    });
    test('should handle auth state transitions correctly on errors', async () => {
        const stateChanges = [];
        disposables.add(authService.onDidChangeAuthState((state) => {
            stateChanges.push(state);
        }));
        // Try to refresh without refresh token (will fail)
        try {
            await authService.refreshToken();
        }
        catch {
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
        }
        catch { }
        await authService.logout(); // Should work
        try {
            await authService.refreshToken(); // Still no refresh token
        }
        catch { }
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
function createMockJWT(claims) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64');
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JIYW5kbGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ0ZXN0L3N1aXRlL2ludGVncmF0aW9uL2Vycm9ySGFuZGxpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUNOLG1CQUFtQixFQUVuQixpQkFBaUIsRUFDakIscUJBQXFCLEVBQ3JCLE1BQU0sc0VBQXNFLENBQUM7QUFJOUU7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQjtJQUEzQjtRQUVTLHlCQUFvQixHQUFHLEtBQUssQ0FBQztRQUM3Qix5QkFBb0IsR0FBRyxLQUFLLENBQUM7SUFtQ3RDLENBQUM7SUFqQ0EsdUJBQXVCLENBQUMsS0FBYztRQUNyQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO0lBQ25DLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxLQUFjO1FBQ3JDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUM7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQixJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8s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