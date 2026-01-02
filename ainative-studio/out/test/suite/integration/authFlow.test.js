/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok, notStrictEqual } from 'assert';
import { DisposableStore } from '../../../vs/base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../vs/base/test/common/utils.js';
import { AINativeAuthService } from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
/**
 * Mock Encryption Service for integration testing
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
        // No-op
    }
    async getKeyStorageProvider() {
        return 'test';
    }
}
/**
 * Mock Storage Service for integration testing
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this.onDidChangeValue = (_scope, _key, _disposable) => ({ dispose: () => { } });
        this.onDidChangeTarget = () => ({ dispose: () => { } });
        this.onWillSaveState = () => ({ dispose: () => { } });
    }
    get(key, scope, fallbackValue) {
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
suite('Integration - Full Authentication Flow', () => {
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
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should complete full authentication lifecycle', async () => {
        // Step 1: Initial state should be unauthenticated
        strictEqual(authService.isAuthenticated(), false);
        strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
        strictEqual(authService.getAccessToken(), null);
        strictEqual(authService.getUser(), null);
        // Step 2: Verify state transitions
        let stateChanges = [];
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
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('ainative.auth.user', JSON.stringify(mockUser), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
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
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('ainative.auth.user', JSON.stringify(mockUser), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
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
        const stateChanges = [];
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
function createMockJWT(claims) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64');
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aEZsb3cudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidGVzdC9zdWl0ZS9pbnRlZ3JhdGlvbi9hdXRoRmxvdy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFhLE1BQU0sc0VBQXNFLENBQUM7QUFJdEg7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQjtJQUcxQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFhO1FBQzFCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQzFCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyx5QkFBeUI7UUFDOUIsUUFBUTtJQUNULENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQzFCLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLGtCQUFrQjtJQUF4QjtRQUdTLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUU1Qyxx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