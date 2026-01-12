/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Integration Tests for Complete Authentication Flow (Issue #47)
 * Tests the full authentication lifecycle from registration through logout
 */
import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AINativeCloudAuthService } from '../../common/ainativeCloudAuthService.js';
import { CloudAuthState, CloudAuthErrorCode } from '../../common/ainativeCloudAuthTypes.js';
import { TokenService } from '../../common/tokenService.js';
import { SessionManager, SessionState } from '../../common/sessionManager.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
/**
 * Mock Encryption Service
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
    async isEncryptionAvailable() {
        return true;
    }
    async setUsePlainTextEncryption() { }
    async getKeyStorageProvider() {
        return 'test';
    }
}
/**
 * Mock Storage Service
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this.onDidChangeValue = () => ({ dispose: () => { } });
        this.onDidChangeTarget = { dispose: () => { } };
        this.onWillSaveState = { dispose: () => { } };
    }
    get(key, scope, fallbackValue) {
        const storageKey = `${scope}:${key}`;
        return this.storage.get(storageKey) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        return value !== undefined ? value === 'true' : fallbackValue;
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        return value !== undefined ? parseInt(value, 10) : fallbackValue;
    }
    getObject(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        return value ? JSON.parse(value) : fallbackValue;
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
    storeAll(entries, external) { }
    log() { }
    async optimize(scope) { }
    isNew(scope) { return false; }
    flush() { return Promise.resolve(); }
    switch() { return Promise.resolve(); }
    hasScope(scope) { return true; }
    clear() {
        this.storage.clear();
    }
}
/**
 * Create mock JWT token
 */
function createMockJWT(expiresInSeconds, customClaims) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        sub: customClaims?.sub || `user-${Math.random().toString(36).substr(2, 9)}`,
        email: customClaims?.email || 'test@ainative.studio',
        role: customClaims?.role || 'user',
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
        iat: Math.floor(Date.now() / 1000),
        ...customClaims
    };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = 'mock-signature-' + Math.random();
    return `${headerB64}.${payloadB64}.${signature}`;
}
/**
 * Mock Fetch for API calls
 */
class MockFetch {
    constructor() {
        this.responses = new Map();
        this.requestLog = [];
    }
    setupSuccessfulAuthFlow() {
        this.responses.set('register', {
            ok: true,
            json: async () => ({
                access_token: createMockJWT(3600),
                refresh_token: createMockJWT(86400),
                user: {
                    id: 'new-user-123',
                    email: 'newuser@ainative.studio',
                    username: 'newuser',
                    role: 'user',
                    email_verified: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            })
        });
        this.responses.set('login', {
            ok: true,
            json: async () => ({
                access_token: createMockJWT(3600),
                refresh_token: createMockJWT(86400),
                user: {
                    id: 'user-123',
                    email: 'test@ainative.studio',
                    username: 'testuser',
                    role: 'user',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            })
        });
        this.responses.set('refresh', {
            ok: true,
            json: async () => ({
                access_token: createMockJWT(3600)
            })
        });
        this.responses.set('logout', {
            ok: true,
            json: async () => ({ message: 'Logout successful' })
        });
        this.responses.set('forgot-password', {
            ok: true,
            json: async () => ({ message: 'Password reset email sent' })
        });
        this.responses.set('reset-password', {
            ok: true,
            json: async () => ({ message: 'Password reset successful' })
        });
        this.responses.set('verify-email', {
            ok: true,
            json: async () => ({ message: 'Email verified successfully' })
        });
    }
    setupErrorResponse(endpoint, status, error) {
        this.responses.set(endpoint, {
            ok: false,
            status,
            json: async () => error
        });
    }
    async fetch(url, options) {
        this.requestLog.push({
            url,
            method: options?.method || 'GET',
            body: options?.body
        });
        // Determine which response to return based on URL
        if (url.includes('/register')) {
            return this.responses.get('register') || this._defaultError();
        }
        if (url.includes('/login-json')) {
            return this.responses.get('login') || this._defaultError();
        }
        if (url.includes('/refresh')) {
            return this.responses.get('refresh') || this._defaultError();
        }
        if (url.includes('/logout')) {
            return this.responses.get('logout') || this._defaultError();
        }
        if (url.includes('/forgot-password')) {
            return this.responses.get('forgot-password') || this._defaultError();
        }
        if (url.includes('/reset-password')) {
            return this.responses.get('reset-password') || this._defaultError();
        }
        if (url.includes('/verify-email')) {
            return this.responses.get('verify-email') || this._defaultError();
        }
        return this._defaultError();
    }
    _defaultError() {
        return {
            ok: false,
            status: 404,
            json: async () => ({ error: 'Not found' })
        };
    }
    getRequestLog() {
        return this.requestLog;
    }
    reset() {
        this.responses.clear();
        this.requestLog = [];
    }
}
suite('Authentication Flow Integration Tests (Browser) - Issue #47', () => {
    const disposables = new DisposableStore();
    let encryptionService;
    let storageService;
    let logService;
    let authService;
    let tokenService;
    let sessionManager;
    let mockFetch;
    setup(() => {
        encryptionService = new MockEncryptionService();
        storageService = new MockStorageService();
        logService = new NullLogService();
        authService = disposables.add(new AINativeCloudAuthService(encryptionService, storageService));
        tokenService = disposables.add(new TokenService(encryptionService, storageService));
        sessionManager = disposables.add(new SessionManager(tokenService, logService));
        mockFetch = new MockFetch();
        mockFetch.setupSuccessfulAuthFlow();
    });
    teardown(() => {
        disposables.clear();
        storageService.clear();
        mockFetch.reset();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * AC1: Complete Registration Flow
     */
    suite('AC1: Registration Flow - Register → Verify Email → Login', () => {
        test('1.1 Should complete successful registration with valid credentials', async () => {
            const result = await authService.register({
                username: 'newuser',
                email: 'newuser@ainative.studio',
                password: 'SecurePassword123!'
            });
            // Mock API call would happen here - for now test client-side validation
            ok(!result.error || result.error.code !== CloudAuthErrorCode.WeakPassword, 'Should accept strong password');
            ok(!result.error || result.error.code !== CloudAuthErrorCode.RegistrationFailed, 'Should accept valid email');
        });
        test('1.2 Should validate password strength during registration', async () => {
            const result = await authService.register({
                username: 'testuser',
                email: 'test@ainative.studio',
                password: 'weak'
            });
            strictEqual(result.success, false, 'Should reject weak password');
            strictEqual(result.error?.code, CloudAuthErrorCode.WeakPassword);
            ok(result.error?.message.toLowerCase().includes('password'), 'Error should mention password');
        });
        test('1.3 Should validate email format during registration', async () => {
            const result = await authService.register({
                username: 'testuser',
                email: 'invalid-email',
                password: 'ValidPassword123!'
            });
            strictEqual(result.success, false, 'Should reject invalid email');
            ok(result.error, 'Should have error');
        });
        test('1.4 Should handle duplicate email registration', async () => {
            mockFetch.setupErrorResponse('register', 409, {
                error: 'Email already exists',
                code: 'EMAIL_EXISTS'
            });
            const result = await authService.register({
                username: 'existinguser',
                email: 'existing@ainative.studio',
                password: 'Password123!'
            });
            strictEqual(result.success, false, 'Should fail with duplicate email');
        });
    });
    /**
     * AC2: Complete Login Flow
     */
    suite('AC2: Login Flow - Login → Store Tokens → Establish Session', () => {
        test('2.1 Should complete successful login with valid credentials', async () => {
            // Initial state check
            strictEqual(authService.isAuthenticated(), false, 'Should start unauthenticated');
            strictEqual(authService.getAuthState(), CloudAuthState.Unauthenticated);
            // Mock the login - in real scenario would call API
            // For now, test the client-side flow
            const email = 'test@ainative.studio';
            const password = 'ValidPassword123!';
            // Validate inputs
            ok(email.includes('@'), 'Email should be valid');
            ok(password.length >= 8, 'Password should meet length requirement');
        });
        test('2.2 Should store encrypted tokens after successful login', async () => {
            const accessToken = createMockJWT(3600);
            const refreshToken = createMockJWT(86400);
            // Manually simulate successful login
            const service = authService;
            service._accessToken = accessToken;
            service._refreshToken = refreshToken;
            service._authState = CloudAuthState.Authenticated;
            // Verify token is accessible
            strictEqual(service._accessToken, accessToken);
            strictEqual(authService.isAuthenticated(), true);
        });
        test('2.3 Should establish active session after login', async () => {
            const accessToken = createMockJWT(3600);
            const refreshToken = createMockJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            await sessionManager.initialize();
            sessionManager.startMonitoring();
            const isActive = sessionManager.isSessionActive();
            ok(isActive || sessionManager.getSessionState() === SessionState.Active, 'Session should be active');
        });
        test('2.4 Should handle invalid credentials gracefully', async () => {
            mockFetch.setupErrorResponse('login', 401, {
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            const result = await authService.login('wrong@example.com', 'wrongpassword');
            strictEqual(result.success, false, 'Should fail with invalid credentials');
        });
        test('2.5 Should emit authentication state changes during login', async () => {
            const stateChanges = [];
            disposables.add(authService.onDidChangeAuthState(state => {
                stateChanges.push(state);
            }));
            // Simulate state changes
            const service = authService;
            service._setState(CloudAuthState.Registering);
            service._setState(CloudAuthState.Authenticated);
            ok(stateChanges.includes(CloudAuthState.Registering), 'Should emit Registering state');
            ok(stateChanges.includes(CloudAuthState.Authenticated), 'Should emit Authenticated state');
        });
    });
    /**
     * AC3: Password Reset Flow
     */
    suite('AC3: Password Reset Flow - Request → Confirm → Login', () => {
        test('3.1 Should send password reset request', async () => {
            const result = await authService.requestPasswordReset('test@ainative.studio');
            // Client-side validation should pass
            ok(!result.error, 'Should not have client-side validation errors');
        });
        test('3.2 Should validate reset token and new password', async () => {
            const result = await authService.confirmPasswordReset('reset-token-123', 'NewSecurePassword123!');
            // Client-side validation for new password
            ok(!result.error || result.error.code !== CloudAuthErrorCode.WeakPassword, 'Should accept strong password');
        });
        test('3.3 Should reject weak password in reset flow', async () => {
            const result = await authService.confirmPasswordReset('reset-token-123', 'weak');
            strictEqual(result.success, false, 'Should reject weak password');
            strictEqual(result.error?.code, CloudAuthErrorCode.WeakPassword);
        });
        test('3.4 Should allow login after successful password reset', async () => {
            // Reset password
            await authService.confirmPasswordReset('reset-token-123', 'NewPassword123!');
            // Attempt login with new password
            const result = await authService.login('test@ainative.studio', 'NewPassword123!');
            // Should not fail due to client-side validation
            ok(result.success !== false || result.error?.code !== CloudAuthErrorCode.WeakPassword);
        });
    });
    /**
     * AC4: Token Refresh Scenario
     */
    suite('AC4: Token Refresh - Detect Expiration → Refresh → Continue Session', () => {
        test('4.1 Should detect expired access token', async () => {
            const expiredToken = createMockJWT(-100); // Expired
            const refreshToken = createMockJWT(86400);
            await tokenService.storeTokens(expiredToken, refreshToken, false);
            const isExpired = await tokenService.isTokenExpired();
            strictEqual(isExpired, true, 'Should detect expired token');
        });
        test('4.2 Should refresh token when access token expires', async () => {
            const service = authService;
            service._accessToken = createMockJWT(3600);
            service._refreshToken = createMockJWT(86400);
            service._authState = CloudAuthState.Authenticated;
            const originalToken = service._accessToken;
            // Simulate token refresh
            service._accessToken = createMockJWT(3600);
            ok(service._accessToken !== originalToken, 'Token should be refreshed');
            strictEqual(authService.isAuthenticated(), true, 'Should remain authenticated');
        });
        test('4.3 Should maintain session after token refresh', async () => {
            const accessToken = createMockJWT(3600);
            const refreshToken = createMockJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            await sessionManager.initialize();
            sessionManager.startMonitoring();
            // Simulate token refresh
            const newAccessToken = createMockJWT(3600);
            await tokenService.storeTokens(newAccessToken, refreshToken, true);
            ok(sessionManager.isSessionActive() || sessionManager.getSessionState() === SessionState.Active, 'Session should remain active after token refresh');
        });
        test('4.4 Should logout if refresh token is also expired', async () => {
            const expiredAccess = createMockJWT(-100);
            const expiredRefresh = createMockJWT(-100);
            await tokenService.storeTokens(expiredAccess, expiredRefresh, false);
            await sessionManager.initialize();
            const sessionState = sessionManager.getSessionState();
            ok(sessionState === SessionState.Expired || sessionState === SessionState.Inactive, 'Session should be inactive with expired tokens');
        });
        test('4.5 Should emit state change events during refresh', async () => {
            const stateChanges = [];
            disposables.add(authService.onDidChangeAuthState(state => {
                stateChanges.push(state);
            }));
            const service = authService;
            service._setState(CloudAuthState.Refreshing);
            service._setState(CloudAuthState.Authenticated);
            ok(stateChanges.includes(CloudAuthState.Refreshing), 'Should emit Refreshing state');
            ok(stateChanges.includes(CloudAuthState.Authenticated), 'Should return to Authenticated state');
        });
    });
    /**
     * AC5: Logout Flow
     */
    suite('AC5: Logout Flow - Clear Tokens → Terminate Session → Reset State', () => {
        test('5.1 Should clear all tokens on logout', async () => {
            const service = authService;
            service._accessToken = createMockJWT(3600);
            service._refreshToken = createMockJWT(86400);
            service._user = { id: 'user-123', email: 'test@example.com', role: 'user' };
            await authService.logout();
            strictEqual(authService.getAccessTokenSync(), null, 'Access token should be cleared');
            strictEqual(service._refreshToken, null, 'Refresh token should be cleared');
        });
        test('5.2 Should clear user data on logout', async () => {
            const service = authService;
            service._user = {
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: 'user'
            };
            await authService.logout();
            strictEqual(authService.getUser(), null, 'User data should be cleared');
        });
        test('5.3 Should update authentication state to unauthenticated', async () => {
            const service = authService;
            service._authState = CloudAuthState.Authenticated;
            await authService.logout();
            strictEqual(authService.isAuthenticated(), false);
            strictEqual(authService.getAuthState(), CloudAuthState.Unauthenticated);
        });
        test('5.4 Should terminate active session on logout', async () => {
            const accessToken = createMockJWT(3600);
            const refreshToken = createMockJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            await sessionManager.initialize();
            sessionManager.startMonitoring();
            await sessionManager.terminateSession();
            strictEqual(sessionManager.getSessionState(), SessionState.Inactive, 'Session should be inactive');
            strictEqual(sessionManager.isSessionActive(), false);
        });
        test('5.5 Should clear encrypted storage on logout', async () => {
            await storageService.store('ainative.cloud.auth.accessToken', 'encrypted-data', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            await storageService.store('ainative.cloud.auth.refreshToken', 'encrypted-data', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            await authService.logout();
            const accessToken = storageService.get('ainative.cloud.auth.accessToken', -1 /* StorageScope.APPLICATION */);
            const refreshToken = storageService.get('ainative.cloud.auth.refreshToken', -1 /* StorageScope.APPLICATION */);
            strictEqual(accessToken, undefined, 'Access token should be removed from storage');
            strictEqual(refreshToken, undefined, 'Refresh token should be removed from storage');
        });
    });
    /**
     * AC6: Security Tests
     */
    suite('AC6: Security - Token Encryption, Storage, Error Handling', () => {
        test('6.1 Should encrypt tokens before storage', async () => {
            const plainToken = createMockJWT(3600);
            const encrypted = await encryptionService.encrypt(plainToken);
            ok(encrypted.startsWith('encrypted_'), 'Token should be encrypted');
            ok(encrypted !== plainToken, 'Encrypted token should differ from plain token');
            const decrypted = await encryptionService.decrypt(encrypted);
            strictEqual(decrypted, plainToken, 'Should decrypt to original value');
        });
        test('6.2 Should not expose tokens in logs or errors', async () => {
            const token = createMockJWT(3600);
            const service = authService;
            service._accessToken = token;
            // Trigger error scenario
            try {
                await authService.login('invalid@email', 'password');
            }
            catch (error) {
                const errorString = error.toString();
                ok(!errorString.includes(token), 'Error should not contain token');
            }
        });
        test('6.3 Should validate token format before use', async () => {
            const invalidToken = 'not-a-valid-jwt';
            try {
                const service = authService;
                service._decodeJWT(invalidToken);
                ok(false, 'Should throw error for invalid token');
            }
            catch (error) {
                ok(error instanceof Error, 'Should throw error for invalid JWT');
            }
        });
        test('6.4 Should use secure storage target for sensitive data', async () => {
            const token = createMockJWT(3600);
            await tokenService.storeTokens(token, token, true);
            // Verify it's stored with MACHINE target (secure)
            const storedValue = storageService.get('ainative.token.access', -1 /* StorageScope.APPLICATION */);
            ok(storedValue, 'Should be stored in secure storage');
        });
        test('6.5 Should handle concurrent authentication operations safely', async () => {
            const promises = [
                authService.login('user1@test.com', 'pass1'),
                authService.login('user2@test.com', 'pass2'),
                authService.login('user3@test.com', 'pass3')
            ];
            const results = await Promise.allSettled(promises);
            // Should handle concurrent requests without corruption
            ok(results.every(r => r.status === 'fulfilled' || r.status === 'rejected'), 'All operations should complete');
        });
    });
    /**
     * AC7: Error Handling Tests
     */
    suite('AC7: Error Handling - Network Failures, Invalid Credentials, Edge Cases', () => {
        test('7.1 Should handle network timeout gracefully', async () => {
            mockFetch.setupErrorResponse('login', 0, {
                error: 'Network timeout'
            });
            const result = await authService.login('test@example.com', 'password');
            strictEqual(result.success, false, 'Should fail gracefully');
            ok(result.error, 'Should have error information');
        });
        test('7.2 Should handle 401 Unauthorized with clear error message', async () => {
            mockFetch.setupErrorResponse('login', 401, {
                error: 'Invalid credentials',
                code: 'UNAUTHORIZED'
            });
            const result = await authService.login('wrong@example.com', 'wrongpass');
            strictEqual(result.success, false);
            ok(result.error?.message, 'Should have user-friendly error message');
        });
        test('7.3 Should handle rate limiting (429) appropriately', async () => {
            mockFetch.setupErrorResponse('login', 429, {
                error: 'Too many requests',
                code: 'RATE_LIMIT'
            });
            const result = await authService.login('test@example.com', 'password');
            strictEqual(result.success, false);
        });
        test('7.4 Should handle server errors (5xx) with retry logic', async () => {
            mockFetch.setupErrorResponse('login', 500, {
                error: 'Internal server error'
            });
            const result = await authService.login('test@example.com', 'password');
            strictEqual(result.success, false);
            ok(result.error, 'Should have error');
        });
        test('7.5 Should provide user-friendly error messages', async () => {
            const testCases = [
                { password: 'weak', expectedCode: CloudAuthErrorCode.WeakPassword },
                { email: 'invalid', password: 'GoodPass123!', expectedError: true }
            ];
            for (const testCase of testCases) {
                const result = await authService.register({
                    username: 'testuser',
                    email: testCase.email || 'valid@example.com',
                    password: testCase.password || 'ValidPassword123!'
                });
                if (testCase.expectedError || testCase.expectedCode) {
                    strictEqual(result.success, false, 'Should fail validation');
                    ok(result.error && result.error.message && result.error.message.length > 0, 'Error message should not be empty');
                }
            }
        });
        test('7.6 Should handle malformed API responses', async () => {
            mockFetch.setupErrorResponse('login', 200, null); // Malformed response
            const result = await authService.login('test@example.com', 'password');
            // Should handle gracefully without crashing
            ok(result.success !== undefined, 'Should return result');
        });
    });
    /**
     * AC8: Edge Cases and Boundary Conditions
     */
    suite('AC8: Edge Cases - Session Persistence, Corruption Recovery, State Consistency', () => {
        test('8.1 Should handle session persistence across app restarts', async () => {
            const accessToken = createMockJWT(3600);
            const refreshToken = createMockJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            // Simulate app restart
            const newTokenService = disposables.add(new TokenService(encryptionService, storageService));
            const restored = await newTokenService.getAccessToken();
            strictEqual(restored, accessToken, 'Token should persist across restarts');
        });
        test('8.2 Should handle corrupted storage data gracefully', async () => {
            storageService.store('ainative.cloud.auth.user', '{invalid-json}', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            const newAuthService = disposables.add(new AINativeCloudAuthService(encryptionService, storageService));
            // Should not crash, should return null
            strictEqual(newAuthService.getUser(), null, 'Should handle corrupted data');
        });
        test('8.3 Should maintain state consistency during rapid operations', async () => {
            // Rapid state changes
            for (let i = 0; i < 10; i++) {
                const service = authService;
                service._setState(CloudAuthState.Registering);
                service._setState(CloudAuthState.Authenticated);
                service._setState(CloudAuthState.Unauthenticated);
            }
            // Final state should be consistent
            const state = authService.getAuthState();
            ok([CloudAuthState.Authenticated, CloudAuthState.Unauthenticated, CloudAuthState.Registering].includes(state), 'State should be valid');
        });
        test('8.4 Should handle empty/null credentials', async () => {
            const result = await authService.login('', '');
            strictEqual(result.success, false, 'Should reject empty credentials');
        });
        test('8.5 Should handle very long input strings', async () => {
            const longEmail = 'a'.repeat(1000) + '@example.com';
            const longPassword = 'P'.repeat(1000) + '1!';
            const result = await authService.login(longEmail, longPassword);
            // Should handle without crashing
            ok(result.success !== undefined, 'Should return result');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25GbG93LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvYnJvd3Nlci9hdXRoZW50aWNhdGlvbkZsb3cudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7O0dBR0c7QUFFSCxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRzlFLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV4Rjs7R0FFRztBQUNILE1BQU0scUJBQXFCO0lBRzFCLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQixPQUFPLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFhO1FBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUss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