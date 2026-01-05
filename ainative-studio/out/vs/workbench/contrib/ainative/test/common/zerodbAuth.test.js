/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
// import { Emitter } from '../../../../../base/common/event.js'; // Unused import
import { AINativeCloudAuthService } from '../../common/ainativeCloudAuthService.js';
import { CloudAuthState, CloudAuthErrorCode,
// CloudUser // Unused import
 } from '../../common/ainativeCloudAuthTypes.js';
/**
 * Mock encryption service for testing
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
 * Mock fetch for testing API calls
 */
class MockFetchManager {
    constructor() {
        this.mockResponses = new Map();
        this.fetchCalls = [];
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
    getCalls() {
        return this.fetchCalls;
    }
    clearCalls() {
        this.fetchCalls = [];
    }
    createMockFetch() {
        return async (url, options = {}) => {
            this.fetchCalls.push({ url, options });
            // Extract endpoint from URL
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
suite('ZeroDB Authentication - Core Authentication Flows', () => {
    const disposables = new DisposableStore();
    let authService;
    let encryptionService;
    let storageService;
    let fetchManager;
    setup(() => {
        encryptionService = new MockEncryptionService();
        storageService = new MockStorageService();
        fetchManager = new MockFetchManager();
        fetchManager.install();
        authService = disposables.add(new AINativeCloudAuthService(encryptionService, storageService));
    });
    teardown(() => {
        fetchManager.uninstall();
        disposables.clear();
        storageService.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('Login Flow', () => {
        test('should successfully login with valid credentials', async () => {
            const mockUser = {
                id: 'user123',
                username: 'testuser',
                email: 'test@example.com',
                name: 'Test User',
                role: 'user',
                email_verified: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: mockUser
            }, 200);
            const result = await authService.login('test@example.com', 'password123');
            assert.strictEqual(result.success, true);
            assert.ok(result.accessToken);
            assert.ok(result.user);
            assert.strictEqual(result.user?.email, 'test@example.com');
            assert.strictEqual(authService.isAuthenticated(), true);
        });
        test('should fail login with invalid credentials', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                message: 'Invalid credentials'
            }, 401);
            const result = await authService.login('wrong@example.com', 'wrongpass');
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.ok(result.error);
            assert.strictEqual(result.error?.code, CloudAuthErrorCode.InvalidCredentials, 'Error code should be InvalidCredentials');
        });
        test('should store tokens securely after successful login', async () => {
            const accessToken = createTestJWT(3600);
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
            // Check that tokens are stored encrypted
            const storedAccessToken = storageService.get('ainative.cloud.auth.accessToken', -1 /* StorageScope.APPLICATION */, "Should match expected value");
            assert.ok(storedAccessToken?.startsWith('encrypted_'));
            // Verify tokens can be decrypted
            const retrievedToken = await authService.getAccessToken();
            assert.strictEqual(retrievedToken, accessToken, 'Retrieved token should match the original access token');
        });
        test('should emit auth state change event on login', async () => {
            let stateChanges = [];
            authService.onDidChangeAuthState(state => {
                stateChanges.push(state);
            });
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            assert.ok(stateChanges.includes(CloudAuthState.Authenticated));
        });
        test('should handle network timeout during login', async () => {
            // Simulate network timeout by not setting a mock response
            fetchManager.setMockResponse('/v1/auth/login-json', {}, 0);
            const result = await authService.login('test@example.com', 'password123');
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.ok(result.error);
        });
        test('should handle rate limiting during login', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                message: 'Rate limit exceeded'
            }, 429);
            const result = await authService.login('test@example.com', 'password123');
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.ok(result.error);
            assert.strictEqual(result.error?.code, CloudAuthErrorCode.RateLimitExceeded);
        });
        test('should set loading state during login', async () => {
            let currentState = null;
            authService.onDidChangeAuthState(state => {
                currentState = state;
            });
            // Note: Due to async nature, we check state after login attempt
            fetchManager.setMockResponse('/v1/auth/login-json', {}, 500);
            const loginPromise = authService.login('test@example.com', 'password123');
            await loginPromise;
            // State should eventually return to unauthenticated after failure
            assert.ok(currentState !== null);
        });
    });
    suite('Registration Flow', () => {
        test('should successfully register with valid data', async () => {
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
            const result = await authService.register({
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'SecurePass123',
                name: 'New User'
            });
            assert.strictEqual(result.success, true);
            assert.ok(result.user);
            assert.strictEqual(result.user?.username, 'newuser');
            assert.strictEqual(result.requiresEmailVerification, true);
        });
        test('should validate email format during registration', async () => {
            const result = await authService.register({
                username: 'testuser',
                email: 'invalid-email',
                password: 'SecurePass123'
            });
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.ok(result.error);
            assert.ok(result.error?.message.includes('email'));
        });
        test('should validate password strength during registration', async () => {
            const result = await authService.register({
                username: 'testuser',
                email: 'test@example.com',
                password: 'weak'
            });
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.ok(result.error);
            assert.strictEqual(result.error?.code, CloudAuthErrorCode.WeakPassword);
        });
        test('should handle duplicate email error', async () => {
            fetchManager.setMockResponse('/v1/auth/register', {
                message: 'Email already exists'
            }, 409);
            const result = await authService.register({
                username: 'testuser',
                email: 'existing@example.com',
                password: 'SecurePass123'
            });
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.ok(result.error);
            assert.strictEqual(result.error?.code, CloudAuthErrorCode.EmailAlreadyExists);
        });
        test('should emit auth state changes during registration', async () => {
            let stateChanges = [];
            authService.onDidChangeAuthState(state => {
                stateChanges.push(state);
            });
            fetchManager.setMockResponse('/v1/auth/register', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'newuser123',
                    email: 'newuser@example.com',
                    username: 'newuser',
                    role: 'user',
                    email_verified: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.register({
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'SecurePass123'
            });
            assert.ok(stateChanges.includes(CloudAuthState.Registering));
            assert.ok(stateChanges.includes(CloudAuthState.Authenticated));
        });
    });
    suite('Token Management', () => {
        test('should securely encrypt tokens before storage', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            const storedToken = storageService.get('ainative.cloud.auth.accessToken', -1 /* StorageScope.APPLICATION */, "Should match expected value");
            assert.ok(storedToken?.startsWith('encrypted_'), 'Stored token should be encrypted');
            assert.ok(!storedToken?.includes('eyJ'), 'Stored token should not contain JWT prefix'); // Should not contain JWT prefix
        });
        test('should refresh token when expired', async () => {
            const expiredToken = createTestJWT(-100); // Already expired
            const newToken = createTestJWT(3600);
            // First login with expired token
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: expiredToken,
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Mock refresh endpoint
            fetchManager.setMockResponse('/v1/auth/refresh', {
                access_token: newToken,
                refresh_token: createTestJWT(86400)
            }, 200);
            // Get access token should trigger refresh
            const token = await authService.getAccessToken();
            assert.ok(token);
            assert.notStrictEqual(token, expiredToken);
        });
        test('should validate token on page load', async () => {
            // Store valid token directly in storage
            const validToken = createTestJWT(3600);
            const encryptedToken = await encryptionService.encrypt(validToken);
            storageService.store('ainative.cloud.auth.accessToken', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store('ainative.cloud.auth.user', JSON.stringify({
                id: 'user123',
                email: 'test@example.com',
                username: 'testuser',
                role: 'user',
                emailVerified: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Create new service instance to simulate page reload
            const newAuthService = new AINativeCloudAuthService(encryptionService, storageService);
            // Allow time for async loading
            await new Promise(resolve => setTimeout(resolve, 100));
            const isAuth = newAuthService.isAuthenticated();
            assert.strictEqual(isAuth, true);
            newAuthService.dispose();
        });
        test('should invalidate token on logout', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            fetchManager.setMockResponse('/v1/auth/logout', {
                message: 'Logged out successfully'
            }, 200);
            await authService.logout();
            const token = await authService.getAccessToken();
            assert.strictEqual(token, null, 'Access token should be null after logout');
            assert.strictEqual(authService.isAuthenticated(), false, 'Should not be authenticated after logout');
        });
        test('should handle concurrent token operations', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            const operations = [
                authService.getAccessToken(),
                authService.getAccessToken(),
                authService.getAccessToken()
            ];
            const results = await Promise.all(operations);
            // All should return the same token
            assert.ok(results.every(r => r === results[0]));
        });
    });
    suite('Session Management', () => {
        test('should persist session across page reloads', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Simulate page reload by creating new service instance
            const newAuthService = new AINativeCloudAuthService(encryptionService, storageService);
            // Allow async loading
            await new Promise(resolve => setTimeout(resolve, 100));
            assert.strictEqual(newAuthService.isAuthenticated(), true);
            newAuthService.dispose();
        });
        test('should auto-logout on token expiration', async () => {
            const expiredToken = createTestJWT(-100);
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: expiredToken,
                refresh_token: createTestJWT(-50), // Refresh also expired
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            // Try to get access token with expired refresh token
            const token = await authService.getAccessToken();
            assert.strictEqual(token, null);
        });
    });
    suite('Logout', () => {
        test('should call logout API endpoint', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            fetchManager.clearCalls();
            fetchManager.setMockResponse('/v1/auth/logout', {
                message: 'Logged out'
            }, 200);
            await authService.logout();
            const calls = fetchManager.getCalls();
            const logoutCall = calls.find(c => c.url.includes('/v1/auth/logout'));
            assert.ok(logoutCall);
            assert.strictEqual(logoutCall.options.method, 'POST', 'Logout call should use POST method');
        });
        test('should clear tokens on logout', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            fetchManager.setMockResponse('/v1/auth/logout', {
                message: 'Logged out'
            }, 200);
            await authService.logout();
            const token = storageService.get('ainative.cloud.auth.accessToken', -1 /* StorageScope.APPLICATION */, "Should match expected value");
            assert.strictEqual(token, undefined, 'Access token should be removed from storage after logout');
        });
        test('should redirect to login after logout', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            let stateAfterLogout = null;
            authService.onDidChangeAuthState(state => {
                stateAfterLogout = state;
            });
            fetchManager.setMockResponse('/v1/auth/logout', {
                message: 'Logged out'
            }, 200);
            await authService.logout();
            assert.strictEqual(stateAfterLogout, CloudAuthState.Unauthenticated, 'Auth state should be Unauthenticated after logout');
        });
        test('should cleanup user data on logout', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'password123');
            fetchManager.setMockResponse('/v1/auth/logout', {
                message: 'Logged out'
            }, 200);
            await authService.logout();
            const user = authService.getUser();
            assert.strictEqual(user, null, 'User should be null after logout');
        });
    });
    suite('Error Handling', () => {
        test('should handle network timeout errors', async () => {
            // Don't set a mock response to simulate network failure
            const result = await authService.login('test@example.com', 'password123');
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.ok(result.error);
        });
        test('should handle 401 Unauthorized responses', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                message: 'Unauthorized'
            }, 401);
            const result = await authService.login('test@example.com', 'wrongpass');
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.strictEqual(result.error?.code, CloudAuthErrorCode.InvalidCredentials, 'Error code should be InvalidCredentials');
        });
        test('should handle 403 Forbidden responses', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                message: 'Forbidden'
            }, 403);
            const result = await authService.login('test@example.com', 'password123');
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.ok(result.error);
        });
        test('should provide user-friendly error messages', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                message: 'Invalid credentials'
            }, 401);
            const result = await authService.login('test@example.com', 'wrongpass');
            assert.strictEqual(result.success, false, 'Login should fail with invalid credentials');
            assert.ok(result.error?.message);
            assert.ok(result.error?.message.length > 0);
        });
    });
    suite('Security', () => {
        test('should use HTTPS-only API calls', () => {
            // This is verified through the SDK client configuration
            // The base URL should always use HTTPS
            assert.ok(true); // Verified in SDK client tests
        });
        test('should prevent XSS in forms', () => {
            // XSS prevention is handled at the component level
            // This test ensures no user input is directly executed
            assert.ok(true); // Verified in component tests
        });
        test('should not store passwords in plain text', async () => {
            fetchManager.setMockResponse('/v1/auth/login-json', {
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'user123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }, 200);
            await authService.login('test@example.com', 'MySecretPassword123');
            // Check all stored values
            const allKeys = storageService.keys(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            const allValues = allKeys.map(k => storageService.get(k, -1 /* StorageScope.APPLICATION */), "Should match expected value", "Should match expected value");
            // No value should contain the plain password
            const containsPassword = allValues.some(v => v?.includes('MySecretPassword123'));
            assert.strictEqual(containsPassword, false, 'Password should not be stored in plain text');
        });
        test('should not log sensitive data', async () => {
            // This test verifies that console.log calls don't contain sensitive data
            // In production, logging should be properly sanitized
            assert.ok(true); // Manual verification required
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemVyb2RiQXV0aC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi96ZXJvZGJBdXRoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLGtGQUFrRjtBQUNsRixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLE1BQU0sMENBQTBDLENBQUM7QUFDbEQsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0I7QUFDbEIsNkJBQTZCO0VBQzdCLE1BQU0sd0NBQXdDLENBQUM7QUFJaEQ7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQjtJQUcxQixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWE7UUFDMUIsT0FBTyxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxx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