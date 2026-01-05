/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TokenService } from '../../common/tokenService.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
/**
 * Mock encryption service for testing
 */
class MockEncryptionService {
    async encrypt(value) {
        // Simple mock encryption (reverse string + prefix)
        return 'encrypted_' + value.split('').reverse().join('');
    }
    async decrypt(value) {
        // Simple mock decryption (remove prefix + reverse)
        if (!value.startsWith('encrypted_')) {
            throw new Error('Invalid encrypted value');
        }
        return value.substring(10).split('').reverse().join('');
    }
    isEncryptionAvailable() {
        return Promise.resolve(true);
    }
    async setUsePlainTextEncryption() {
        // Mock implementation - no-op
    }
    async getKeyStorageProvider() {
        return "basic_text" /* KnownStorageProvider.basicText */;
    }
    getKeyType() {
        return Promise.resolve('mock');
    }
}
/**
 * Mock storage service for testing
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this.onDidChangeValue = () => ({ dispose: () => { } });
        this.onDidChangeTarget = () => ({ dispose: () => { } });
        this.onWillSaveState = () => ({ dispose: () => { } });
    }
    getObject(key, scope, fallbackValue) {
        const value = this.storage.get(key);
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
    storeAll() { }
    optimize() { return Promise.resolve(); }
    get(key, scope, fallbackValue) {
        return this.storage.get(this._makeKey(key, scope)) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.get(key, scope, "Should match expected value");
        return value !== undefined ? value === 'true' : !!fallbackValue;
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope, "Should match expected value");
        return value !== undefined ? parseInt(value, 10) : (fallbackValue ?? 0);
    }
    store(key, value, scope, target) {
        if (value === undefined || value === null) {
            this.remove(key, scope);
        }
        else {
            this.storage.set(this._makeKey(key, scope), String(value));
        }
    }
    remove(key, scope) {
        this.storage.delete(this._makeKey(key, scope));
    }
    keys(scope, target) {
        return Array.from(this.storage.keys())
            .filter(k => k.startsWith(`${scope}:`))
            .map(k => k.substring(scope.toString().length + 1));
    }
    logStorage() { }
    migrate() { return Promise.resolve(); }
    isNew(scope) { return false; }
    flush() { return Promise.resolve(); }
    log() { }
    switch() { return Promise.resolve(); }
    hasScope() { return true; }
    _makeKey(key, scope) {
        return `${scope}:${key}`;
    }
}
/**
 * Create a test JWT token
 */
function createTestJWT(expiresIn = 3600) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
        exp: Math.floor(Date.now() / 1000) + expiresIn,
        iat: Math.floor(Date.now() / 1000)
    };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = 'test-signature';
    return `${headerB64}.${payloadB64}.${signature}`;
}
suite('TokenService', () => {
    const disposables = new DisposableStore();
    let tokenService;
    let encryptionService;
    let storageService;
    setup(() => {
        encryptionService = new MockEncryptionService();
        storageService = new MockStorageService();
        tokenService = disposables.add(new TokenService(encryptionService, storageService));
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('Token Storage', () => {
        test('should store tokens securely', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400); // 24 hours
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const storedAccess = await tokenService.getAccessToken();
            const storedRefresh = await tokenService.getRefreshToken();
            assert.strictEqual(storedAccess, accessToken, 'Stored access token should match original');
            assert.strictEqual(storedRefresh, refreshToken, 'Stored refresh token should match original');
        });
        test('should encrypt tokens before storage', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            // Check that stored value is encrypted
            const rawStored = storageService.get('ainative.token.access', -1 /* StorageScope.APPLICATION */, "Should match expected value");
            assert.ok(rawStored?.startsWith('encrypted_'), 'Stored token should be encrypted');
        });
        test('should store token expiration time', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const expiration = await tokenService.getTokenExpiration();
            assert.ok(expiration !== null);
            assert.ok(expiration > Date.now());
        });
        test('should store remember me flag', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            const rememberMe = await tokenService.getRememberMe();
            assert.strictEqual(rememberMe, true, 'Remember me flag should be true');
        });
        test('should use different storage targets based on rememberMe', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            // Test with rememberMe = true (should use MACHINE target)
            await tokenService.storeTokens(accessToken, refreshToken, true);
            // Test with rememberMe = false (should use USER target)
            await tokenService.storeTokens(accessToken, refreshToken, false);
            // Both should work
            const storedAccess = await tokenService.getAccessToken();
            assert.strictEqual(storedAccess, accessToken);
        });
    });
    suite('Token Retrieval', () => {
        test('should retrieve stored access token', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const retrieved = await tokenService.getAccessToken();
            assert.strictEqual(retrieved, accessToken);
        });
        test('should retrieve stored refresh token', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const retrieved = await tokenService.getRefreshToken();
            assert.strictEqual(retrieved, refreshToken);
        });
        test('should return null for missing tokens', async () => {
            const access = await tokenService.getAccessToken();
            const refresh = await tokenService.getRefreshToken();
            assert.strictEqual(access, null);
            assert.strictEqual(refresh, null);
        });
        test('should handle corrupted tokens gracefully', async () => {
            // Manually store corrupted token
            storageService.store('ainative.token.access', 'corrupted', -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            const retrieved = await tokenService.getAccessToken();
            assert.strictEqual(retrieved, null);
            // Should have cleared tokens
            const expiration = await tokenService.getTokenExpiration();
            assert.strictEqual(expiration, null);
        });
    });
    suite('Token Clearing', () => {
        test('should clear all tokens', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            // Verify tokens are stored
            assert.ok(await tokenService.getAccessToken());
            assert.ok(await tokenService.getRefreshToken());
            // Clear tokens
            await tokenService.clearTokens();
            // Verify tokens are cleared
            assert.strictEqual(await tokenService.getAccessToken(), null);
            assert.strictEqual(await tokenService.getRefreshToken(), null);
            assert.strictEqual(await tokenService.getTokenExpiration(), null);
            assert.strictEqual(await tokenService.getRememberMe(), false);
        });
        test('should fire onDidClearTokens event', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            let eventFired = false;
            tokenService.onDidClearTokens(() => {
                eventFired = true;
            });
            await tokenService.clearTokens();
            assert.ok(eventFired);
        });
    });
    suite('Authentication Check', () => {
        test('should return true for valid non-expired token', async () => {
            const accessToken = createTestJWT(3600); // Expires in 1 hour
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const isAuth = await tokenService.isAuthenticated();
            assert.strictEqual(isAuth, true);
        });
        test('should return false for expired token', async () => {
            const accessToken = createTestJWT(-100); // Already expired
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const isAuth = await tokenService.isAuthenticated();
            assert.strictEqual(isAuth, false);
        });
        test('should return false when no token exists', async () => {
            const isAuth = await tokenService.isAuthenticated();
            assert.strictEqual(isAuth, false);
        });
        test('should consider buffer time when checking expiration', async () => {
            const accessToken = createTestJWT(200); // Expires in 200 seconds
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            // Should be expired with large buffer (5 minutes = 300 seconds)
            const isExpired = await tokenService.isTokenExpired(5 * 60 * 1000);
            assert.strictEqual(isExpired, true);
            // Should not be expired with small buffer (1 minute = 60 seconds)
            const isNotExpired = await tokenService.isTokenExpired(60 * 1000);
            assert.strictEqual(isNotExpired, false);
        });
    });
    suite('Token Expiration', () => {
        test('should correctly parse token expiration time', async () => {
            const expiresIn = 3600;
            const expectedExpiration = Math.floor(Date.now() / 1000) + expiresIn;
            const accessToken = createTestJWT(expiresIn);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const expiration = await tokenService.getTokenExpiration();
            assert.ok(expiration !== null);
            // Allow 1 second tolerance for test execution time
            const expirationSeconds = Math.floor(expiration / 1000);
            assert.ok(Math.abs(expirationSeconds - expectedExpiration) <= 1);
        });
        test('should detect expired tokens', async () => {
            const accessToken = createTestJWT(-100); // Expired 100 seconds ago
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const isExpired = await tokenService.isTokenExpired();
            assert.strictEqual(isExpired, true);
        });
        test('should detect tokens about to expire', async () => {
            const accessToken = createTestJWT(200); // Expires in 200 seconds
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            // With 5 minute buffer, should be considered expired
            const isExpired = await tokenService.isTokenExpired(5 * 60 * 1000);
            assert.strictEqual(isExpired, true);
        });
    });
    suite('Events', () => {
        test('should fire onDidUpdateTokens when tokens are stored', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            let eventFired = false;
            tokenService.onDidUpdateTokens(() => {
                eventFired = true;
            });
            await tokenService.storeTokens(accessToken, refreshToken, false);
            assert.ok(eventFired);
        });
        test('should fire onDidClearTokens when tokens are cleared', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            let eventFired = false;
            tokenService.onDidClearTokens(() => {
                eventFired = true;
            });
            await tokenService.clearTokens();
            assert.ok(eventFired);
        });
    });
    suite('Edge Cases', () => {
        test('should handle multiple token updates', async () => {
            const accessToken1 = createTestJWT(1800);
            const refreshToken1 = createTestJWT(86400);
            await tokenService.storeTokens(accessToken1, refreshToken1, false);
            const accessToken2 = createTestJWT(3600);
            const refreshToken2 = createTestJWT(172800);
            await tokenService.storeTokens(accessToken2, refreshToken2, true);
            const storedAccess = await tokenService.getAccessToken();
            const storedRefresh = await tokenService.getRefreshToken();
            assert.strictEqual(storedAccess, accessToken2);
            assert.strictEqual(storedRefresh, refreshToken2);
            assert.strictEqual(await tokenService.getRememberMe(), true);
        });
        test('should handle concurrent token operations', async () => {
            const accessToken = createTestJWT();
            const refreshToken = createTestJWT(86400);
            // Store and retrieve concurrently
            const storePromise = tokenService.storeTokens(accessToken, refreshToken, false);
            const getPromise = tokenService.getAccessToken();
            await Promise.all([storePromise, getPromise]);
            // Final state should be consistent
            const storedAccess = await tokenService.getAccessToken();
            assert.strictEqual(storedAccess, accessToken);
        });
        test('should handle empty string tokens', async () => {
            try {
                await tokenService.storeTokens('', '', false);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                // Expected to fail
                assert.ok(error);
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL3Rva2VuU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUc1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFMUU7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQjtJQUcxQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsbURBQW1EO1FBQ25ELE9BQU8sWUFBWSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQscUJBQXFCO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FB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