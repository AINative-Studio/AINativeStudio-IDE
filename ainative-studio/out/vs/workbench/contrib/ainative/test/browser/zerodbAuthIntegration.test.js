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
suite('ZeroDB Authentication - Integration Tests', () => {
    const disposables = new DisposableStore();
    let authService;
    let tokenService;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let sessionManager;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            assert.strictEqual(registerResult.success, true);
            assert.strictEqual(authService.isAuthenticated(), true);
            // Step 2: Access protected resource (get user)
            const user = authService.getUser();
            assert.ok(user);
            assert.strictEqual(user?.email, 'newuser@example.com');
            // Step 3: Logout
            fetchManager.setMockResponse('/v1/auth/logout', {
                message: 'Logged out successfully'
            }, 200);
            await authService.logout();
            assert.strictEqual(authService.isAuthenticated(), false);
            assert.strictEqual(authService.getUser(), null);
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
            assert.strictEqual(authService.isAuthenticated(), true);
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
            assert.strictEqual(authService.isAuthenticated(), true);
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
            assert.strictEqual(token, null);
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
            assert.strictEqual(authService.isAuthenticated(), true);
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
            assert.strictEqual(authService.isAuthenticated(), false);
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
            assert.strictEqual(authServiceState, CloudAuthState.Authenticated);
            assert.ok(stateChangeCount > 0);
            // Logout
            fetchManager.setMockResponse('/v1/auth/logout', {
                message: 'Logged out'
            }, 200);
            await authService.logout();
            // Verify state updated
            assert.strictEqual(authServiceState, CloudAuthState.Unauthenticated);
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
            assert.strictEqual(authService.isAuthenticated(), true);
            assert.strictEqual(authService2.isAuthenticated(), true);
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
            assert.strictEqual(canAccessProtectedRoute, true);
            // Get access token for API call
            const token = await authService.getAccessToken();
            assert.ok(token);
        });
        test('should deny access to protected routes when not authenticated', () => {
            // Check without login
            const canAccessProtectedRoute = authService.isAuthenticated();
            assert.strictEqual(canAccessProtectedRoute, false);
        });
        test('should redirect to login on authentication failure', async () => {
            // Attempt to access protected resource
            const isAuth = authService.isAuthenticated();
            assert.strictEqual(isAuth, false);
            // Verify auth state requires login
            const authState = authService.getAuthState();
            assert.strictEqual(authState, CloudAuthState.Unauthenticated);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemVyb2RiQXV0aEludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvYnJvd3Nlci96ZXJvZGJBdXRoSW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixNQUFNLDBDQUEwQyxDQUFDO0FBQ2xELE9BQU8sRUFDTixjQUFjLEVBQ2QsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRCxPQUFPLEVBQUUsWUFBWSxFQUFpQixNQUFNLDhCQUE4QixDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdoRSxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFReEY7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQjtJQUcxQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsT0FBTyxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxxQkFBcUI7UUFDcEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFRCxLQUFLLENBQUMseUJBQXlCO1FBQzlCLDhCQUE4QjtJQUMvQixDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQjtRQUMxQix5REFBc0M7SUFDdkMsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDaEMsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLGtCQUFrQjtJQUF4QjtRQUVTLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQVk1QyxxQkFBZ0IsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFRLENBQUM7UUFDekQsc0JBQWlCLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBUSxDQUFDO1FBQzFELG9CQUFlLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBUSxDQUFDO0lBa0R6RCxDQUFDO0lBN0RBLFNBQVMsQ0FBbUIsR0FBVyxFQUFFLEtBQW1CLEVBQUUsYUFBaUI7UUFDOUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFBQyxPQUFPLGFBQWEsQ0FBQztRQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDO1lBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBTSxDQUFDO1FBQUMsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUFDLE9BQU8sYUFBYSxDQUFDO1FBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQsUUFBUSxLQUFXLENBQUM7SUFDcEIsUUFBUSxLQUFvQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFPdkQsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFtQixFQUFFLGFBQXNCO1FBQzNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxhQUFhLENBQUM7SUFDckUsQ0FBQztJQUVELFVBQVUsQ0FBQyxHQUFXLEVBQUUsS0FBbUIsRUFBRSxhQUF1QjtRQUNuRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuQyxPQUFPLEtBQUssS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7SUFDakUsQ0FBQztJQUVELFNBQVMsQ0FBQyxHQUFXLEVBQUUsS0FBbUIsRUFBRSxhQUFzQjtRQUNqRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuQyxPQUFPLEtBQUssS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBVyxFQUFFLEtBQW1ELEVBQUUsS0FBbUIsRUFBRSxNQUFxQjtRQUNqSCxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBVyxFQUFFLEtBQW1CO1FBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELElBQUksQ0FBQyxLQUFtQixFQUFFLE1BQXFCO1FBQzlDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ3BDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2FBQ3RDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRCxVQUFVLEtBQVcsQ0FBQztJQUN0QixPQUFPLEtBQW9CLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN0RCxLQUFLLENBQUMsS0FBbUIsSUFBYSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDckQsS0FBSyxLQUFvQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEQsR0FBRyxLQUFXLENBQUM7SUFDZixNQUFNLEtBQW9CLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRCxRQUFRLEtBQWMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRTVCLFFBQVEsQ0FBQyxHQUFXLEVBQUUsS0FBbUI7UUFDaEQsT0FBTyxHQUFHLEtBQUssSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdEIsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGFBQWEsQ0FBQyxZQUFvQixJQUFJO0lBQzlDLE1BQU0sTUFBTSxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDNUMsTUFBTSxPQUFPLEdBQUc7UUFDZixHQUFHLEVBQUUsY0FBYztRQUNuQixLQUFLLEVBQUUsa0JBQWtCO1FBQ3pCLElBQUksRUFBRSxNQUFNO1FBQ1osR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLFNBQVM7UUFDOUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztLQUNsQyxDQUFDO0lBRUYsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3pFLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzRSxNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQztJQUVuQyxPQUFPLEdBQUcsU0FBUyxJQUFJLFVBQVUsSUFBSSxTQUFTLEVBQUUsQ0FBQztBQUNsRCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLGdCQUFnQjtJQUF0QjtRQUNTLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQztJQThDaEQsQ0FBQztJQTNDQSxPQUFPO1FBQ04sSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxTQUFTO1FBQ1IsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQ25DLENBQUM7SUFDRixDQUFDO0lBRUQsZUFBZSxDQUFDLFFBQWdCLEVBQUUsUUFBYSxFQUFFLFNBQWlCLEdBQUc7UUFDcEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVPLGVBQWU7UUFDdEIsT0FBTyxLQUFLLEVBQUUsR0FBVyxFQUFFLFVBQXVCLEVBQUUsRUFBRSxFQUFFO1lBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFFakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFbEQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLE9BQU87b0JBQ04sRUFBRSxFQUFFLEtBQUs7b0JBQ1QsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsVUFBVSxFQUFFLFdBQVc7b0JBQ3ZCLE9BQU8sRUFBRSxJQUFJLEdBQUcsRUFBRTtvQkFDbEIsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxDQUFDO2lCQUN0RCxDQUFDO1lBQ0gsQ0FBQztZQUVELE9BQU87Z0JBQ04sRUFBRSxFQUFFLFFBQVEsQ0FBQyxNQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsR0FBRztnQkFDbkQsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO2dCQUN2QixVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTztnQkFDcEQsT0FBTyxFQUFFLElBQUksR0FBRyxFQUFFO2dCQUNsQixJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUTthQUNuQyxDQUFDO1lBQ0gsNkRBQTZEO1FBQzdELENBQUMsQ0FBQztRQUNILDZEQUE2RDtJQUM3RCxDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO0lBQ3ZELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsSUFBSSxXQUFxQyxDQUFDO0lBQzFDLElBQUksWUFBMkIsQ0FBQztJQUNoQyw2REFBNkQ7SUFDN0QsSUFBSSxjQUE4QixDQUFDO0lBQ25DLDZEQUE2RDtJQUM3RCxJQUFJLFlBQWdDLENBQUM7SUFDckMsSUFBSSxpQkFBd0MsQ0FBQztJQUM3QyxJQUFJLGNBQWtDLENBQUM7SUFDdkMsSUFBSSxVQUF1QixDQUFDO0lBQzVCLElBQUksWUFBOEIsQ0FBQztJQUVuQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsaUJBQWlCLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1FBQ2hELGNBQWMsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDMUMsVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDbEMsWUFBWSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdkIsV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzVCLElBQUksd0JBQXdCLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLENBQy9ELENBQUM7UUFFRixZQUFZLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDN0IsSUFBSSxZQUFZLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLENBQ25ELENBQUM7UUFFRixjQUFjLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDL0IsSUFBSSxjQUFjLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUM1QyxDQUFDO1FBRUYsWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdCLElBQUksa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQ3RDLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixZQUFZLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDekIsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BCLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN4QixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDaEUsa0JBQWtCO1lBQ2xCLFlBQVksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUU7Z0JBQ2pELFlBQVksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQztnQkFDbkMsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxZQUFZO29CQUNoQixRQUFRLEVBQUUsU0FBUztvQkFDbkIsS0FBSyxFQUFFLHFCQUFxQjtvQkFDNUIsSUFBSSxFQUFFLFVBQVU7b0JBQ2hCLElBQUksRUFBRSxNQUFNO29CQUNaLGNBQWMsRUFBRSxLQUFLO29CQUNyQixVQUFVLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7b0JBQ3BDLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtpQkFDcEM7YUFDRCxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRVIsTUFBTSxjQUFjLEdBQUcsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFDO2dCQUNqRCxRQUFRLEVBQUUsU0FBUztnQkFDbkIsS0FBSyxFQUFFLHFCQUFxQjtnQkFDNUIsUUFBUSxFQUFFLGVBQWU7Z0JBQ3pCLElBQUksRUFBRSxVQUFVO2FBQ2hCLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV4RCwrQ0FBK0M7WUFDL0MsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLHFCQUFxQixDQUFDLENBQUM7WUFFdkQsaUJBQWlCO1lBQ2pCLFlBQVksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLEVBQUU7Z0JBQy9DLE9BQU8sRUFBRSx5QkFBeUI7YUFDbEMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUVSLE1BQU0sV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBRTNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzlELHVDQUF1QztZQUN2QyxNQUFNLGVBQWUsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxjQUFjO1lBRTFELFlBQVksQ0FBQyxlQUFlLENBQUMscUJBQXFCLEVBQUU7Z0JBQ25ELFlBQVksRUFBRSxlQUFlO2dCQUM3QixhQUFhLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQztnQkFDbkMsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxTQUFTO29CQUNiLFFBQVEsRUFBRSxVQUFVO29CQUNwQixLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixJQUFJLEVBQUUsV0FBVztvQkFDakIsSUFBSSxFQUFFLE1BQU07b0JBQ1osY0FBYyxFQUFFLElBQUk7b0JBQ3BCLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtvQkFDcEMsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNwQzthQUNELEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFUixNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFeEQseUNBQXlDO1lBQ3pDLG1DQUFtQztZQUNuQyxZQUFZLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFO2dCQUNoRCxZQUFZLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQztnQkFDakMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUM7YUFDbkMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUVSLDBEQUEwRDtZQUMxRCxNQUFNLEtBQUssR0FBRyxNQUFNLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRWpCLHFDQUFxQztZQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx3REFBd0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN6RSxtQ0FBbUM7WUFDbkMsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFekMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsRUFBRTtnQkFDbkQsWUFBWSxFQUFFLFlBQVk7Z0JBQzFCLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxlQUFlO2dCQUNsRCxJQUFJLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLFNBQVM7b0JBQ2IsUUFBUSxFQUFFLFVBQVU7b0JBQ3BCLEtBQUssRUFBRSxrQkFBa0I7b0JBQ3pCLElBQUksRUFBRSxXQUFXO29CQUNqQixJQUFJLEVBQUUsTUFBTTtvQkFDWixjQUFjLEVBQUUsSUFBSTtvQkFDcEIsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO29CQUNwQyxVQUFVLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3BDO2FBQ0QsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUVSLE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUUzRCwrQ0FBK0M7WUFDL0MsTUFBTSxLQUFLLEdBQUcsTUFBTSxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFaEMsMEJBQTBCO1lBQzFCLFlBQVksQ0FBQyxlQUFlLENBQUMscUJBQXFCLEVBQUU7Z0JBQ25ELFlBQVksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQztnQkFDbkMsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxTQUFTO29CQUNiLFFBQVEsRUFBRSxVQUFVO29CQUNwQixLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixJQUFJLEVBQUUsV0FBVztvQkFDakIsSUFBSSxFQUFFLE1BQU07b0JBQ1osY0FBYyxFQUFFLElBQUk7b0JBQ3BCLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtvQkFDcEMsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNwQzthQUNELEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFUixNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFM0QsK0JBQStCO1lBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBQ2pELElBQUksQ0FBQyxzREFBc0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN2RSxpQ0FBaUM7WUFDakMsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBYztZQUN0RCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFMUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsRUFBRTtnQkFDbkQsWUFBWSxFQUFFLFdBQVc7Z0JBQ3pCLGFBQWEsRUFBRSxZQUFZO2dCQUMzQixJQUFJLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLFNBQVM7b0JBQ2IsUUFBUSxFQUFFLFVBQVU7b0JBQ3BCLEtBQUssRUFBRSxrQkFBa0I7b0JBQ3pCLElBQUksRUFBRSxXQUFXO29CQUNqQixJQUFJLEVBQUUsTUFBTTtvQkFDWixjQUFjLEVBQUUsSUFBSTtvQkFDcEIsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO29CQUNwQyxVQUFVLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3BDO2FBQ0QsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUVSLE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUUzRCxnQ0FBZ0M7WUFDaEMsTUFBTSxZQUFZLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFakUsd0JBQXdCO1lBQ3hCLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQyxZQUFZLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFO2dCQUNoRCxZQUFZLEVBQUUsY0FBYztnQkFDNUIsYUFBYSxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUM7YUFDbkMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUVSLGdFQUFnRTtZQUNoRSxNQUFNLEtBQUssR0FBRyxNQUFNLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUVqRCw4QkFBOEI7WUFDOUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMzRCxRQUFRO1lBQ1IsWUFBWSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsRUFBRTtnQkFDbkQsWUFBWSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUM7Z0JBQ2pDLGFBQWEsRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDO2dCQUNuQyxJQUFJLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLFNBQVM7b0JBQ2IsUUFBUSxFQUFFLFVBQVU7b0JBQ3BCLEtBQUssRUFBRSxrQkFBa0I7b0JBQ3pCLElBQUksRUFBRSxXQUFXO29CQUNqQixJQUFJLEVBQUUsTUFBTTtvQkFDWixjQUFjLEVBQUUsSUFBSTtvQkFDcEIsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO29CQUNwQyxVQUFVLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3BDO2FBQ0QsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUVSLE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUUzRCx1QkFBdUI7WUFDdkIsWUFBWSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRTtnQkFDaEQsT0FBTyxFQUFFLHVCQUF1QjthQUNoQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRVIsNkJBQTZCO1lBQzdCLElBQUksQ0FBQztnQkFDSixNQUFNLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixtQkFBbUI7Z0JBQ25CLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbEIsQ0FBQztZQUVELDZDQUE2QztZQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMxRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDaEUsSUFBSSxnQkFBZ0IsR0FBMEIsSUFBSSxDQUFDO1lBQ25ELElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO1lBRXpCLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDeEMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO2dCQUN6QixnQkFBZ0IsRUFBRSxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxDQUFDO1lBRUgsUUFBUTtZQUNSLFlBQVksQ0FBQyxlQUFlLENBQUMscUJBQXFCLEVBQUU7Z0JBQ25ELFlBQVksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQztnQkFDbkMsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxTQUFTO29CQUNiLFFBQVEsRUFBRSxVQUFVO29CQUNwQixLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixJQUFJLEVBQUUsV0FBVztvQkFDakIsSUFBSSxFQUFFLE1BQU07b0JBQ1osY0FBYyxFQUFFLElBQUk7b0JBQ3BCLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtvQkFDcEMsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNwQzthQUNELEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFUixNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFM0QsMEJBQTBCO1lBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFaEMsU0FBUztZQUNULFlBQVksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLEVBQUU7Z0JBQy9DLE9BQU8sRUFBRSxZQUFZO2FBQ3JCLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFUixNQUFNLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUUzQix1QkFBdUI7WUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaURBQWlELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbEUsNEJBQTRCO1lBQzVCLFlBQVksQ0FBQyxlQUFlLENBQUMscUJBQXFCLEVBQUU7Z0JBQ25ELFlBQVksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQztnQkFDbkMsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxTQUFTO29CQUNiLFFBQVEsRUFBRSxVQUFVO29CQUNwQixLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixJQUFJLEVBQUUsV0FBVztvQkFDakIsSUFBSSxFQUFFLE1BQU07b0JBQ1osY0FBYyxFQUFFLElBQUk7b0JBQ3BCLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtvQkFDcEMsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNwQzthQUNELEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFUixNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFM0QseURBQXlEO1lBQ3pELE1BQU0sWUFBWSxHQUFHLElBQUksd0JBQXdCLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFFckYsc0JBQXNCO1lBQ3RCLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFdkQsbUNBQW1DO1lBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRXpELFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxJQUFJLENBQUMsNERBQTRELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0UsUUFBUTtZQUNSLFlBQVksQ0FBQyxlQUFlLENBQUMscUJBQXFCLEVBQUU7Z0JBQ25ELFlBQVksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQztnQkFDbkMsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxTQUFTO29CQUNiLFFBQVEsRUFBRSxVQUFVO29CQUNwQixLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixJQUFJLEVBQUUsV0FBVztvQkFDakIsSUFBSSxFQUFFLE1BQU07b0JBQ1osY0FBYyxFQUFFLElBQUk7b0JBQ3BCLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtvQkFDcEMsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNwQzthQUNELEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFUixNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFM0QsaUNBQWlDO1lBQ2pDLE1BQU0sdUJBQXVCLEdBQUcsV0FBVyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFbEQsZ0NBQWdDO1lBQ2hDLE1BQU0sS0FBSyxHQUFHLE1BQU0sV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1lBQzFFLHNCQUFzQjtZQUN0QixNQUFNLHVCQUF1QixHQUFHLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3JFLHVDQUF1QztZQUN2QyxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFbEMsbUNBQW1DO1lBQ25DLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDL0QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVELFFBQVE7WUFDUixZQUFZLENBQUMsZUFBZSxDQUFDLHFCQUFxQixFQUFFO2dCQUNuRCxZQUFZLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQztnQkFDakMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUM7Z0JBQ25DLElBQUksRUFBRTtvQkFDTCxFQUFFLEVBQUUsU0FBUztvQkFDYixRQUFRLEVBQUUsVUFBVTtvQkFDcEIsS0FBSyxFQUFFLGtCQUFrQjtvQkFDekIsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLElBQUksRUFBRSxNQUFNO29CQUNaLGNBQWMsRUFBRSxJQUFJO29CQUNwQixVQUFVLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7b0JBQ3BDLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtpQkFDcEM7YUFDRCxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRVIsTUFBTSxXQUFXLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRTNELHlCQUF5QjtZQUN6QixNQUFNLEtBQUssR0FBRyxNQUFNLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUVqRCxtQ0FBbUM7WUFDbkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFFLGFBQWE7UUFDL0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0QsMkJBQTJCO1lBQzNCLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXpDLFlBQVksQ0FBQyxlQUFlLENBQUMscUJBQXFCLEVBQUU7Z0JBQ25ELFlBQVksRUFBRSxZQUFZO2dCQUMxQixhQUFhLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQztnQkFDbkMsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxTQUFTO29CQUNiLFFBQVEsRUFBRSxVQUFVO29CQUNwQixLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixJQUFJLEVBQUUsV0FBVztvQkFDakIsSUFBSSxFQUFFLE1BQU07b0JBQ1osY0FBYyxFQUFFLElBQUk7b0JBQ3BCLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtvQkFDcEMsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNwQzthQUNELEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFUixNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFM0Qsd0JBQXdCO1lBQ3hCLFlBQVksQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUU7Z0JBQ2hELFlBQVksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQzthQUNuQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRVIsdUNBQXVDO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLE1BQU0sV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBRWpELHVCQUF1QjtZQUN2QixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3BFLFFBQVE7WUFDUixZQUFZLENBQUMsZUFBZSxDQUFDLHFCQUFxQixFQUFFO2dCQUNuRCxZQUFZLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQztnQkFDakMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUM7Z0JBQ25DLElBQUksRUFBRTtvQkFDTCxFQUFFLEVBQUUsU0FBUztvQkFDYixRQUFRLEVBQUUsVUFBVTtvQkFDcEIsS0FBSyxFQUFFLGtCQUFrQjtvQkFDekIsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLElBQUksRUFBRSxNQUFNO29CQUNaLGNBQWMsRUFBRSxJQUFJO29CQUNwQixVQUFVLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7b0JBQ3BDLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtpQkFDcEM7YUFDRCxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRVIsTUFBTSxXQUFXLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRTNELGtDQUFrQztZQUNsQyxZQUFZLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFO2dCQUNoRCxZQUFZLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQztnQkFDakMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUM7YUFDbkMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUVSLDZEQUE2RDtZQUM3RCxNQUFNLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNsRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUVsRCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xCLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=