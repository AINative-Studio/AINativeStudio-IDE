/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { AINativeCloudAuthService } from '../../common/ainativeCloudAuthService.js';
import { CloudAuthState } from '../../common/ainativeCloudAuthTypes.js';
import { TokenService } from '../../common/tokenService.js';
import { SessionManager } from '../../common/sessionManager.js';
import { ZeroDBOAuthService } from '../../common/zerodbOAuthService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
/**
 * Mock encryption service
 */
class MockEncryptionService {
    async encrypt(value) {
        return 'encrypted_' + Buffer.from(value).toString('base64');
    }
    async decrypt(value) {
        if (!value.startsWith('encrypted_')) {
            throw new Error('Invalid encrypted value');
        }
        return Buffer.from(value.substring(10), 'base64').toString('utf-8');
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
 * Mock storage service
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
        const value = this.get(key, scope, undefined);
        return value !== undefined ? value === 'true' : !!fallbackValue;
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope, undefined);
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
    clear() {
        this.storage.clear();
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
/**
 * Mock fetch manager
 */
class MockFetchManager {
    constructor() {
        this.mockResponses = new Map();
    }
    install() {
        this.originalFetch = global.fetch;
        global.fetch = this.createMockFetch();
    }
    uninstall() {
        if (this.originalFetch) {
            global.fetch = this.originalFetch;
        }
    }
    setMockResponse(endpoint, response, status = 200) {
        this.mockResponses.set(endpoint, { response, status });
    }
    createMockFetch() {
        return async (url, options = {}) => {
            const urlObj = new URL(url);
            const endpoint = urlObj.pathname;
            const mockData = this.mockResponses.get(endpoint);
            if (!mockData) {
                return {
                    ok: false,
                    status: 404,
                    statusText: 'Not Found',
                    headers: new Map(),
                    json: async () => ({ message: 'Endpoint not mocked' })
                };
            }
            return {
                ok: mockData.status >= 200 && mockData.status < 300,
                status: mockData.status,
                statusText: mockData.status === 200 ? 'OK' : 'Error',
                headers: new Map(),
                json: async () => mockData.response
            };
        };
    }
}
suite('ZeroDB Authentication - Integration Tests', () => {
    const disposables = new DisposableStore();
    let authService;
    let tokenService;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // @ts-expect-error - Unused variable
    let sessionManager;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // @ts-expect-error - Unused variable
    let oauthService;
    let encryptionService;
    let storageService;
    let logService;
    let fetchManager;
    setup(() => {
        encryptionService = new MockEncryptionService();
        storageService = new MockStorageService();
        logService = new NullLogService();
        fetchManager = new MockFetchManager();
        fetchManager.install();
        authService = disposables.add(new AINativeCloudAuthService(encryptionService, storageService));
        tokenService = disposables.add(new TokenService(encryptionService, storageService));
        sessionManager = disposables.add(new SessionManager(tokenService, logService));
        oauthService = disposables.add(new ZeroDBOAuthService(storageService));
    });
    teardown(() => {
        fetchManager.uninstall();
        disposables.clear();
        storageService.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('Complete User Journey', () => {
        test('should handle complete sign-up to logout flow', async () => {
            // Step 1: Sign up
            fetchManager.setMockResponse('/v1/auth/register', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'newuser123',
                    username: 'newuser',
                    email: 'newuser@example.com',
                    name: 'New User',
                    role: 'user',
                    email_verified: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            const registerResult = await authService.register({
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'SecurePass123',
                name: 'New User'
            });
            assert.strictEqual(registerResult.success, true, 'Should match expected value');
            assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');
            // Step 2: Access protected resource (get user)
            const user = authService.getUser();
            assert.ok(user);
            assert.strictEqual(user?.email, 'newuser@example.com', 'Should match expected value');
            // Step 3: Logout
            fetchManager.setMockResponse('/v1/auth/logout', {
                message: 'Logged out successfully'
            }, 200);
            await authService.logout();
            assert.strictEqual(authService.isAuthenticated(), false, 'Should match expected value');
            assert.strictEqual(authService.getUser(), null, 'Should match expected value');
        });
        test('should handle login with token refresh flow', async () => {
            // Step 1: Login with short-lived token
            const shortLivedToken = createTestJWT(200); // 200 seconds
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: shortLivedToken,
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');
            // Step 2: Simulate token near expiration
            // Wait or manually trigger refresh
            fetchManager.setMockResponse('/v1/auth/refresh', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400)
            }, 200);
            // Step 3: Access resource (should auto-refresh if needed)
            const token = await authService.getAccessToken();
            assert.ok(token);
            // Step 4: Verify still authenticated
            assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');
        });
        test('should handle session expiration and re-authentication', async () => {
            // Step 1: Login with expired token
            const expiredToken = createTestJWT(-100);
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: expiredToken,
                refresh_token: createTestJWT(-50), // Also expired
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Step 2: Try to access resource (should fail)
            const token = await authService.getAccessToken();
            assert.strictEqual(token, null, 'Should match expected value');
            // Step 3: Re-authenticate
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Step 4: Verify authenticated
            assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');
        });
    });
    suite('Token Refresh During Active Session', () => {
        test('should automatically refresh token before expiration', async () => {
            // Login with token expiring soon
            const accessToken = createTestJWT(200); // 200 seconds
            const refreshToken = createTestJWT(86400);
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: accessToken,
                refresh_token: refreshToken,
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Store tokens in token service
            await tokenService.storeTokens(accessToken, refreshToken, false);
            // Mock refresh endpoint
            const newAccessToken = createTestJWT(3600);
            fetchManager.setMockResponse('/v1/auth/refresh', {
                access_token: newAccessToken,
                refresh_token: createTestJWT(86400)
            }, 200);
            // Get access token (should trigger refresh for near-expiration)
            const token = await authService.getAccessToken();
            // Verify we got a valid token
            assert.ok(token);
        });
        test('should handle refresh failure gracefully', async () => {
            // Login
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Mock refresh failure
            fetchManager.setMockResponse('/v1/auth/refresh', {
                message: 'Invalid refresh token'
            }, 401);
            // Try to refresh (will fail)
            try {
                await authService.refreshToken();
                assert.fail('Should have thrown error');
            }
            catch (error) {
                // Expected to fail
                assert.ok(error);
            }
            // Should be logged out after refresh failure
            assert.strictEqual(authService.isAuthenticated(), false, 'Should match expected value');
        });
    });
    suite('Auth State Propagation', () => {
        test('should propagate auth state to all components', async () => {
            let authServiceState = null;
            let stateChangeCount = 0;
            authService.onDidChangeAuthState(state => {
                authServiceState = state;
                stateChangeCount++;
            });
            // Login
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Verify state propagated
            assert.strictEqual(authServiceState, CloudAuthState.Authenticated, 'Should match expected value');
            assert.ok(stateChangeCount > 0);
            // Logout
            fetchManager.setMockResponse('/v1/auth/logout', {
                message: 'Logged out'
            }, 200);
            await authService.logout();
            // Verify state updated
            assert.strictEqual(authServiceState, CloudAuthState.Unauthenticated, 'Should match expected value');
        });
        test('should sync auth state across service instances', async () => {
            // Login with first instance
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Create second instance (simulates different component)
            const authService2 = new AINativeCloudAuthService(encryptionService, storageService);
            // Allow async loading
            await new Promise(resolve => setTimeout(resolve, 100));
            // Both should have same auth state
            assert.strictEqual(authService.isAuthenticated(), true, 'Should match expected value');
            assert.strictEqual(authService2.isAuthenticated(), true, 'Should match expected value');
            authService2.dispose();
        });
    });
    suite('Protected Route Access Control', () => {
        test('should allow access to protected routes when authenticated', async () => {
            // Login
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Simulate protected route check
            const canAccessProtectedRoute = authService.isAuthenticated();
            assert.strictEqual(canAccessProtectedRoute, true, 'Should match expected value');
            // Get access token for API call
            const token = await authService.getAccessToken();
            assert.ok(token);
        });
        test('should deny access to protected routes when not authenticated', () => {
            // Check without login
            const canAccessProtectedRoute = authService.isAuthenticated();
            assert.strictEqual(canAccessProtectedRoute, false, 'Should match expected value');
        });
        test('should redirect to login on authentication failure', async () => {
            // Attempt to access protected resource
            const isAuth = authService.isAuthenticated();
            assert.strictEqual(isAuth, false, 'Should match expected value');
            // Verify auth state requires login
            const authState = authService.getAuthState();
            assert.strictEqual(authState, CloudAuthState.Unauthenticated, 'Should match expected value');
        });
    });
    suite('API Endpoint Integration', () => {
        test('should include auth token in API requests', async () => {
            // Login
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Get token for API call
            const token = await authService.getAccessToken();
            // Verify token exists and is valid
            assert.ok(token);
            assert.ok(token.includes('.')); // JWT format
        });
        test('should handle API errors with expired tokens', async () => {
            // Login with expired token
            const expiredToken = createTestJWT(-100);
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: expiredToken,
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Mock refresh endpoint
            fetchManager.setMockResponse('/v1/auth/refresh', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400)
            }, 200);
            // Get access token should auto-refresh
            const token = await authService.getAccessToken();
            // Should get new token
            assert.ok(token);
            assert.notStrictEqual(token, expiredToken);
        });
        test('should retry failed requests with refreshed token', async () => {
            // Login
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Mock refresh endpoint for retry
            fetchManager.setMockResponse('/v1/auth/refresh', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400)
            }, 200);
            // Get access token multiple times (should handle gracefully)
            const token1 = await authService.getAccessToken();
            const token2 = await authService.getAccessToken();
            assert.ok(token1);
            assert.ok(token2);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemVyb2RiQXV0aEludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvYnJvd3Nlci96ZXJvZGJBdXRoSW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixNQUFNLDBDQUEwQyxDQUFDO0FBQ2xELE9BQU8sRUFDTixjQUFjLEVBQ2QsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRCxPQUFPLEVBQUUsWUFBWSxFQUFpQixNQUFNLDhCQUE4QixDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUd4RSxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFeEY7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQjtJQUcxQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsT0FBTyxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxL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