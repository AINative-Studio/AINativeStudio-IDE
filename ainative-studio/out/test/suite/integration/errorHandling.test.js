/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../vs/base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../vs/base/test/common/utils.js';
import { AINativeAuthService, AuthState, AINativeAuthError, AINativeAuthErrorCode } from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
import { Emitter } from '../../../vs/base/common/event.js';
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
        this._onDidChangeValue = new Emitter();
        this._onDidChangeTarget = new Emitter();
        this._onWillSaveState = new Emitter();
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this.onWillSaveState = this._onWillSaveState.event;
    }
    setShouldThrowOnStore(value) {
        this.shouldThrowOnStore = value;
    }
    setShouldThrowOnGet(value) {
        this.shouldThrowOnGet = value;
    }
    onDidChangeValue(scope, key, disposable) {
        return this._onDidChangeValue.event;
    }
    get(key, scope, fallbackValue) {
        if (this.shouldThrowOnGet) {
            throw new Error('Storage get failed');
        }
        const storageKey = `${scope}:${key}`;
        return this.storage.get(storageKey) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const value = this.get(key, scope, undefined);
        if (value === undefined) {
            return fallbackValue;
        }
        return value === 'true';
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope, undefined);
        if (value === undefined) {
            return fallbackValue;
        }
        return parseInt(value, 10);
    }
    getObject(key, scope, fallbackValue) {
        const value = this.get(key, scope, undefined);
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
    storeAll(entries, external) {
        for (const entry of entries) {
            this.store(entry.key, entry.value, entry.scope, entry.target);
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
    log() {
        // No-op for testing
    }
    hasScope(scope) {
        return true;
    }
    switch(to, preserveData) {
        return Promise.resolve();
    }
    isNew(scope) {
        return false;
    }
    optimize(scope) {
        return Promise.resolve();
    }
    flush() {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JIYW5kbGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ0ZXN0L3N1aXRlL2ludGVncmF0aW9uL2Vycm9ySGFuZGxpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixTQUFTLEVBQ1QsaUJBQWlCLEVBQ2pCLHFCQUFxQixFQUNyQixNQUFNLHNFQUFzRSxDQUFDO0FBSTlFLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUlsRTs7R0FFRztBQUNILE1BQU0scUJBQXFCO0lBQTNCO1FBRVMseUJBQW9CLEdBQUcsS0FBSyxDQUFDO1FBQzdCLHlCQUFvQixHQUFHLEtBQUssQ0FBQztJQW1DdEMsQ0FBQztJQWpDQSx1QkFBdUIsQ0FBQyxLQUFjO1FBQ3JDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUM7SUFDbkMsQ0FBQztJQUVELHVCQUF1QixDQUFDLEtBQWM7UUFDckMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQztJQUNuQyxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFhO1FBQzFCLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsUUFB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