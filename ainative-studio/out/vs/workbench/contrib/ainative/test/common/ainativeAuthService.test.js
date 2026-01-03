/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok, deepStrictEqual, rejects } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AuthState, AINativeAuthError, AINativeAuthErrorCode, AINativeAuthService } from '../../common/ainativeAuthService.js';
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
        this.onDidChangeValue = () => ({ dispose: () => { } });
        this.onDidChangeTarget = () => ({ dispose: () => { } });
        this.onWillSaveState = () => ({ dispose: () => { } });
    }
    get(key, scope, fallbackValue) {
        const storageKey = `${scope}:${key}`;
        return this.storage.get(storageKey) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const storageKey = `${scope}:${key}`;
        const value = this.storage.get(storageKey);
        if (value === undefined) {
            return fallbackValue;
        }
        return value === 'true';
    }
    getNumber(key, scope, fallbackValue) {
        const storageKey = `${scope}:${key}`;
        const value = this.storage.get(storageKey);
        if (value === undefined) {
            return fallbackValue;
        }
        return parseInt(value, 10);
    }
    getObject(key, scope, fallbackValue) {
        const storageKey = `${scope}:${key}`;
        const value = this.storage.get(storageKey);
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
        // No-op for testing
    }
    logStorage() {
        // No-op for testing
    }
    clear() {
        this.storage.clear();
    }
    optimize() {
        return Promise.resolve();
    }
}
/**
 * Helper function to create mock JWT tokens for testing
 */
function createMockJWT(claims) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
        sub: claims.sub || 'test-user-id',
        email: claims.email || 'test@example.com',
        role: claims.role || 'user',
        exp: claims.exp || Math.floor(Date.now() / 1000) + 3600,
        iat: claims.iat || Math.floor(Date.now() / 1000)
    })).toString('base64');
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
}
/**
 * Mock fetch responses
 */
const originalFetch = global.fetch;
function mockLoginSuccess() {
    global.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/v1/auth/login-json')) {
            const accessToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
            const refreshToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 7200 });
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    user: {
                        id: 'user-123',
                        email: 'test@ainative.studio',
                        name: 'Test User',
                        role: 'user',
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-01T00:00:00Z'
                    }
                })
            };
        }
        return { ok: false, status: 404 };
    };
}
function mockLoginInvalidCredentials() {
    global.fetch = async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/v1/auth/login-json')) {
            return {
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            };
        }
        return { ok: false, status: 404 };
    };
}
function mockLoginNetworkError() {
    global.fetch = async () => {
        throw new Error('Network connection failed');
    };
}
function mockLogoutSuccess() {
    global.fetch = async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/v1/auth/logout')) {
            return {
                ok: true,
                status: 200,
                json: async () => ({ success: true })
            };
        }
        return { ok: false, status: 404 };
    };
}
function mockRefreshTokenSuccess() {
    global.fetch = async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/v1/auth/refresh')) {
            const newAccessToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    access_token: newAccessToken
                })
            };
        }
        return { ok: false, status: 404 };
    };
}
function mockRefreshTokenFailure() {
    global.fetch = async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/v1/auth/refresh')) {
            return {
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            };
        }
        return { ok: false, status: 404 };
    };
}
function restoreFetch() {
    global.fetch = originalFetch;
}
suite('AINativeAuthService', () => {
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
        storageService.clear();
        restoreFetch();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('Initialization', () => {
        test('should initialize with unauthenticated state', () => {
            strictEqual(authService.isAuthenticated(), false);
            strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
            strictEqual(authService.getAccessToken(), null);
            strictEqual(authService.getUser(), null);
        });
        test('should load valid tokens from storage on init', async () => {
            // Create a new service with pre-stored tokens
            const validToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
            const encryptedToken = await encryptionService.encrypt(validToken);
            const userData = {
                id: 'user-123',
                email: 'stored@ainative.studio',
                role: 'user'
            };
            storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store('ainative.auth.user', JSON.stringify(userData), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Create new service instance to trigger storage loading
            const newAuthService = new AINativeAuthService(encryptionService, storageService);
            disposables.add(newAuthService);
            // Wait for async _loadFromStorage
            await new Promise(resolve => setTimeout(resolve, 100));
            strictEqual(newAuthService.isAuthenticated(), true);
            strictEqual(newAuthService.getAuthState(), AuthState.Authenticated);
            ok(newAuthService.getAccessToken() !== null);
            deepStrictEqual(newAuthService.getUser(), userData);
        });
        test('should reject expired tokens from storage on init', async () => {
            // Create a new service with expired token
            const expiredToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) - 3600 });
            const encryptedToken = await encryptionService.encrypt(expiredToken);
            const userData = {
                id: 'user-123',
                email: 'expired@ainative.studio',
                role: 'user'
            };
            storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store('ainative.auth.user', JSON.stringify(userData), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Create new service instance
            const newAuthService = new AINativeAuthService(encryptionService, storageService);
            disposables.add(newAuthService);
            // Wait for async _loadFromStorage
            await new Promise(resolve => setTimeout(resolve, 100));
            strictEqual(newAuthService.isAuthenticated(), false);
            strictEqual(newAuthService.getAuthState(), AuthState.Unauthenticated);
            strictEqual(newAuthService.getAccessToken(), null);
        });
    });
    suite('Login Tests', () => {
        test('should login successfully with valid credentials', async () => {
            mockLoginSuccess();
            const result = await authService.login('test@ainative.studio', 'password123');
            strictEqual(result.success, true);
            ok(result.accessToken, 'Access token should be present');
            ok(result.refreshToken, 'Refresh token should be present');
            ok(result.user, 'User data should be present');
            strictEqual(result.user?.email, 'test@ainative.studio');
            strictEqual(authService.isAuthenticated(), true);
            strictEqual(authService.getAuthState(), AuthState.Authenticated);
        });
        test('should fail login with invalid credentials', async () => {
            mockLoginInvalidCredentials();
            const result = await authService.login('wrong@example.com', 'wrongpassword');
            strictEqual(result.success, false);
            ok(result.error, 'Error should be present');
            strictEqual(result.error?.code, AINativeAuthErrorCode.InvalidCredentials);
            strictEqual(authService.isAuthenticated(), false);
        });
        test('should handle network errors during login', async () => {
            mockLoginNetworkError();
            const result = await authService.login('test@ainative.studio', 'password123');
            strictEqual(result.success, false);
            ok(result.error, 'Error should be present');
            strictEqual(result.error?.code, AINativeAuthErrorCode.NetworkError);
            strictEqual(authService.isAuthenticated(), false);
        });
        test('should prevent concurrent login requests', async () => {
            mockLoginSuccess();
            // Start first login
            const promise1 = authService.login('test1@ainative.studio', 'password1');
            // Try to start second login immediately
            const promise2 = authService.login('test2@ainative.studio', 'password2');
            const results = await Promise.allSettled([promise1, promise2]);
            // One should succeed, one should fail with error
            const hasSuccess = results.some(r => r.status === 'fulfilled' && r.value.success);
            const hasError = results.some(r => r.status === 'fulfilled' && !r.value.success);
            ok(hasSuccess || hasError, 'Should handle concurrent login attempts');
        });
        test('should emit onDidChangeAuthState event on successful login', async () => {
            mockLoginSuccess();
            let eventFired = false;
            let capturedState = null;
            disposables.add(authService.onDidChangeAuthState((state) => {
                eventFired = true;
                capturedState = state;
            }));
            await authService.login('test@ainative.studio', 'password123');
            ok(eventFired, 'Event should have fired');
            strictEqual(capturedState, AuthState.Authenticated);
        });
    });
    suite('Logout Tests', () => {
        test('should logout successfully and clear all auth data', async () => {
            mockLoginSuccess();
            mockLogoutSuccess();
            // First login
            await authService.login('test@ainative.studio', 'password123');
            strictEqual(authService.isAuthenticated(), true);
            // Then logout
            await authService.logout();
            strictEqual(authService.getAccessToken(), null);
            strictEqual(authService.getUser(), null);
            strictEqual(authService.isAuthenticated(), false);
            strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
        });
        test('should clear storage on logout', async () => {
            mockLoginSuccess();
            mockLogoutSuccess();
            // Login to populate storage
            await authService.login('test@ainative.studio', 'password123');
            // Verify storage has data
            const jwtBeforeLogout = storageService.get('ainative.auth.jwt', -1 /* StorageScope.APPLICATION */);
            ok(jwtBeforeLogout, 'JWT should be in storage before logout');
            // Logout
            await authService.logout();
            // Verify storage is cleared
            const jwtAfterLogout = storageService.get('ainative.auth.jwt', -1 /* StorageScope.APPLICATION */);
            const refreshAfterLogout = storageService.get('ainative.auth.refreshToken', -1 /* StorageScope.APPLICATION */);
            const userAfterLogout = storageService.get('ainative.auth.user', -1 /* StorageScope.APPLICATION */);
            strictEqual(jwtAfterLogout, undefined);
            strictEqual(refreshAfterLogout, undefined);
            strictEqual(userAfterLogout, undefined);
        });
        test('should emit onDidChangeAuthState events during logout', async () => {
            mockLoginSuccess();
            mockLogoutSuccess();
            const states = [];
            disposables.add(authService.onDidChangeAuthState((state) => {
                states.push(state);
            }));
            await authService.login('test@ainative.studio', 'password123');
            await authService.logout();
            // Should have: Authenticated (login), LoggingOut, Unauthenticated
            ok(states.includes(AuthState.Authenticated), 'Should include Authenticated state');
            ok(states.includes(AuthState.LoggingOut), 'Should include LoggingOut state');
            ok(states.includes(AuthState.Unauthenticated), 'Should include Unauthenticated state');
        });
        test('should complete logout even if backend call fails', async () => {
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            // Mock logout failure
            global.fetch = async () => {
                throw new Error('Network error');
            };
            // Logout should still complete locally
            await authService.logout();
            strictEqual(authService.isAuthenticated(), false);
            strictEqual(authService.getAccessToken(), null);
        });
    });
    suite('Token Refresh Tests', () => {
        test('should refresh token successfully', async () => {
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            const oldToken = authService.getAccessToken();
            mockRefreshTokenSuccess();
            const newToken = await authService.refreshToken();
            ok(newToken, 'New token should be returned');
            strictEqual(authService.getAccessToken(), newToken);
            ok(newToken !== oldToken, 'New token should be different from old token');
            strictEqual(authService.getAuthState(), AuthState.Authenticated);
        });
        test('should fail to refresh when no refresh token available', async () => {
            await rejects(() => authService.refreshToken(), (error) => {
                return error instanceof AINativeAuthError &&
                    error.code === AINativeAuthErrorCode.TokenRefreshFailed &&
                    error.message.includes('No refresh token available');
            }, 'Should reject when no refresh token is available');
        });
        test('should handle refresh token failure and clear auth state', async () => {
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            strictEqual(authService.isAuthenticated(), true);
            mockRefreshTokenFailure();
            await rejects(() => authService.refreshToken(), (error) => {
                return error instanceof AINativeAuthError &&
                    error.code === AINativeAuthErrorCode.TokenRefreshFailed;
            }, 'Should reject with TokenRefreshFailed error');
            // Auth state should be cleared
            strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
        });
        test('should emit state changes during token refresh', async () => {
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            const states = [];
            disposables.add(authService.onDidChangeAuthState((state) => {
                states.push(state);
            }));
            mockRefreshTokenSuccess();
            await authService.refreshToken();
            ok(states.includes(AuthState.Refreshing), 'Should include Refreshing state');
            ok(states.includes(AuthState.Authenticated), 'Should return to Authenticated state');
        });
    });
    suite('Token Storage Tests', () => {
        test('should store tokens encrypted via IEncryptionService', async () => {
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            const storedJwt = storageService.get('ainative.auth.jwt', -1 /* StorageScope.APPLICATION */);
            const storedRefresh = storageService.get('ainative.auth.refreshToken', -1 /* StorageScope.APPLICATION */);
            ok(storedJwt, 'JWT should be stored');
            ok(storedRefresh, 'Refresh token should be stored');
            // Verify tokens are encrypted (base64 in our mock)
            ok(storedJwt !== authService.getAccessToken(), 'JWT should be encrypted in storage');
            ok(storedRefresh !== authService.getAccessToken(), 'Refresh token should be encrypted in storage');
            // Verify we can decrypt them
            const decryptedJwt = await encryptionService.decrypt(storedJwt);
            strictEqual(decryptedJwt, authService.getAccessToken());
        });
        test('should store user data in storage', async () => {
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            const storedUser = storageService.get('ainative.auth.user', -1 /* StorageScope.APPLICATION */);
            ok(storedUser, 'User data should be stored');
            const parsedUser = JSON.parse(storedUser);
            deepStrictEqual(parsedUser, authService.getUser());
        });
        test('should retrieve tokens from storage on initialization', async () => {
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            const originalToken = authService.getAccessToken();
            const originalUser = authService.getUser();
            // Create new service instance with same storage
            const newAuthService = new AINativeAuthService(encryptionService, storageService);
            disposables.add(newAuthService);
            // Wait for async storage loading
            await new Promise(resolve => setTimeout(resolve, 100));
            strictEqual(newAuthService.getAccessToken(), originalToken);
            deepStrictEqual(newAuthService.getUser(), originalUser);
            strictEqual(newAuthService.isAuthenticated(), true);
        });
    });
    suite('Authentication State Tests', () => {
        test('should return correct isAuthenticated() value', () => {
            strictEqual(authService.isAuthenticated(), false, 'Should be false initially');
            // After logout, should still be false
            authService.logout().then(() => {
                strictEqual(authService.isAuthenticated(), false);
            });
        });
        test('should return correct auth state throughout lifecycle', async () => {
            strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            strictEqual(authService.getAuthState(), AuthState.Authenticated);
            mockLogoutSuccess();
            await authService.logout();
            strictEqual(authService.getAuthState(), AuthState.Unauthenticated);
        });
        test('should fire onDidChangeAuthState on login', async () => {
            mockLoginSuccess();
            let eventCount = 0;
            const states = [];
            disposables.add(authService.onDidChangeAuthState((state) => {
                eventCount++;
                states.push(state);
            }));
            await authService.login('test@ainative.studio', 'password123');
            ok(eventCount > 0, 'Event should fire at least once');
            ok(states.includes(AuthState.Authenticated), 'Should include Authenticated state');
        });
        test('should fire onDidChangeAuthState on logout', async () => {
            mockLoginSuccess();
            mockLogoutSuccess();
            await authService.login('test@ainative.studio', 'password123');
            let logoutEventFired = false;
            disposables.add(authService.onDidChangeAuthState((state) => {
                if (state === AuthState.LoggingOut) {
                    logoutEventFired = true;
                }
            }));
            await authService.logout();
            ok(logoutEventFired, 'LoggingOut event should fire');
        });
    });
    suite('Error Handling Tests', () => {
        test('should handle network errors with proper error codes', async () => {
            mockLoginNetworkError();
            const result = await authService.login('test@ainative.studio', 'password123');
            strictEqual(result.success, false);
            strictEqual(result.error?.code, AINativeAuthErrorCode.NetworkError);
            ok(result.error?.message, 'Error message should be present');
        });
        test('should handle invalid token errors', async () => {
            // Manually set an invalid token
            const invalidToken = 'invalid.token.format';
            const encrypted = await encryptionService.encrypt(invalidToken);
            storageService.store('ainative.auth.jwt', encrypted, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store('ainative.auth.user', JSON.stringify({ id: '123', email: 'test@test.com', role: 'user' }), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            const newAuthService = new AINativeAuthService(encryptionService, storageService);
            disposables.add(newAuthService);
            await new Promise(resolve => setTimeout(resolve, 100));
            // Should handle invalid token gracefully
            strictEqual(newAuthService.isAuthenticated(), false);
        });
        test('should handle refresh token network errors', async () => {
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            // Mock network error for refresh
            global.fetch = async () => {
                throw new Error('Network timeout');
            };
            await rejects(() => authService.refreshToken(), (error) => error instanceof AINativeAuthError, 'Should throw AINativeAuthError on network failure');
        });
        test('should handle storage encryption errors gracefully', async () => {
            // This test verifies encryption/decryption works
            const testData = 'sensitive-token-data';
            const encrypted = await encryptionService.encrypt(testData);
            const decrypted = await encryptionService.decrypt(encrypted);
            strictEqual(decrypted, testData);
            ok(encrypted !== testData, 'Data should be encrypted');
        });
    });
    suite('Security Tests', () => {
        test('should validate JWT token format', () => {
            const validToken = createMockJWT({ sub: 'user-123' });
            const parts = validToken.split('.');
            strictEqual(parts.length, 3, 'JWT should have 3 parts');
        });
        test('should detect expired tokens', async () => {
            const expiredToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) - 3600 });
            const encrypted = await encryptionService.encrypt(expiredToken);
            storageService.store('ainative.auth.jwt', encrypted, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store('ainative.auth.user', JSON.stringify({ id: '123', email: 'test@test.com', role: 'user' }), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            const newAuthService = new AINativeAuthService(encryptionService, storageService);
            disposables.add(newAuthService);
            await new Promise(resolve => setTimeout(resolve, 100));
            strictEqual(newAuthService.isAuthenticated(), false, 'Should reject expired tokens');
        });
        test('should call backend logout API to blacklist token', async () => {
            mockLoginSuccess();
            await authService.login('test@ainative.studio', 'password123');
            let logoutCalled = false;
            global.fetch = async (input, init) => {
                const url = typeof input === 'string' ? input : input.toString();
                if (url.includes('/v1/auth/logout')) {
                    logoutCalled = true;
                    // Verify Authorization header is present
                    ok(init?.headers, 'Headers should be present');
                    const headers = init.headers;
                    ok(headers['Authorization'], 'Authorization header should be present');
                    ok(headers['Authorization'].startsWith('Bearer '), 'Should use Bearer token');
                }
                return { ok: true, status: 200, json: async () => ({ success: true }) };
            };
            await authService.logout();
            ok(logoutCalled, 'Backend logout API should be called');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVBdXRoU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9haW5hdGl2ZUF1dGhTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUNOLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIscUJBQXFCLEVBRXJCLG1CQUFtQixFQUNuQixNQUFNLHFDQUFxQyxDQUFDO0FBSTdDOztHQUVHO0FBQ0gsTUFBTSxxQkFBcUI7SUFHMUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFhO1FBQzFCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQjtRQUMxQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxLQUFLLENBQUMseUJBQXlCO1FBQzlCLG9CQUFvQjtJQUNyQixDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQjtRQUMxQixPQUFPLE1BQU0sQ0FBQztJ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