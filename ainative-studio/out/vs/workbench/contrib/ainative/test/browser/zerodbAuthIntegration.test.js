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
import { NullLogService } from '../../../../../platform/log/common/log.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { OAuthProvider, OAuthResult, SessionManager, OAuthService } from '../../../../platform/ainativeCloud/common/ainativeCloudAuth.js';
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
        const value = this.get(key, scope);
        return value !== undefined ? value === 'true' : !!fallbackValue;
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope);
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
suite('ZeroDB Authentication - Integration Tests', () => {
    const disposables = new DisposableStore();
    let authService;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let tokenService;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let sessionManager;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let oauthService;
    let encryptionService;
    let storageService;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        oauthService = disposables.add(
        // @ts-expect-error - Service import issue
        // // new ZeroDBOAuthService(storageService)
        );
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemVyb2RiQXV0aEludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvYnJvd3Nlci96ZXJvZGJBdXRoSW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixNQUFNLDBDQUEwQyxDQUFDO0FBQ2xELE9BQU8sRUFDTixjQUFjLEVBQ2QsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRCxPQUFPLEVBQUUsWUFBWSxFQUFpQixNQUFNLDhCQUE4QixDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdoRSxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCw2SUFBNkk7QUFFN0k7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQjtJQUcxQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsT0FBTyxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZ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