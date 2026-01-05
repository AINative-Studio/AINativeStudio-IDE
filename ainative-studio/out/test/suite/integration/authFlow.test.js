/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok, notStrictEqual } from 'assert';
import { DisposableStore } from '../../../vs/base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../vs/base/test/common/utils.js';
import { AINativeAuthService, AuthState } from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
import { Emitter } from '../../../vs/base/common/event.js';
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
        this._onDidChangeValue = new Emitter();
        this._onDidChangeTarget = new Emitter();
        this._onWillSaveState = new Emitter();
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this.onWillSaveState = this._onWillSaveState.event;
    }
    onDidChangeValue(scope, key, disposable) {
        return this._onDidChangeValue.event;
    }
    get(key, scope, fallbackValue) {
        const storageKey = `${scope}:${key}`;
        return this.storage.get(storageKey) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        return value === 'true';
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        return parseInt(value, 10);
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
    store(key, value, scope, target) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aEZsb3cudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidGVzdC9zdWl0ZS9pbnRlZ3JhdGlvbi9hdXRoRmxvdy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBSXRILE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUlsRTs7R0FFRztBQUNILE1BQU0scUJBQXFCO0lBRzFCLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUI7UUFDMUIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsS0FBSyxDQUFDLHlCQUF5QjtRQUM5QixRQUFRO0lBQ1QsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUI7UUFDMUIsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sa0JB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