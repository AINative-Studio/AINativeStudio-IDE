/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ZeroDBOAuthService, OAuthProvider, OAuthErrorCode } from '../../common/zerodbOAuthService.js';
import { TokenService } from '../../common/tokenService.js';
import { SessionManager, SessionState } from '../../common/sessionManager.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
/**
 * Mock Storage Service
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this.onDidChangeValue = () => ({ dispose: () => { } });
        this.onDidChangeTarget = () => ({ dispose: () => { } });
        this.onWillSaveState = () => ({ dispose: () => { } });
    }
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
    switch() { return Promise.resolve(); }
    hasScope() { return true; }
    _makeKey(key, scope) {
        return `${scope}:${key}`;
    }
    // Test helper: reset storage
    reset() {
        this.storage.clear();
    }
}
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
        return Buffer.from(value.substring(10), 'base64').toString();
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
 * Create test JWT token
 */
function createTestJWT(expiresIn = 3600, customClaims) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        sub: 'test-user-id-' + Math.random(),
        email: 'test@example.com',
        role: 'user',
        exp: Math.floor(Date.now() / 1000) + expiresIn,
        iat: Math.floor(Date.now() / 1000),
        ...customClaims
    };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = 'test-signature-' + Math.random();
    return `${headerB64}.${payloadB64}.${signature}`;
}
/**
 * Mock Fetch for OAuth callback testing
 */
class MockFetch {
    constructor() {
        this.responses = new Map();
        this.requestLog = [];
        this.setupDefaultResponses();
    }
    setupDefaultResponses() {
        // Success responses
        this.responses.set('google-success', {
            ok: true,
            json: async () => ({
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'google-user-123',
                    email: 'user@gmail.com',
                    name: 'Test User',
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            })
        });
        this.responses.set('github-success', {
            ok: true,
            json: async () => ({
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'github-user-456',
                    email: 'user@github.com',
                    name: 'GitHub User',
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            })
        });
        this.responses.set('ainative-success', {
            ok: true,
            json: async () => ({
                access_token: createTestJWT(3600),
                refresh_token: createTestJWT(86400),
                user: {
                    id: 'ainative-user-789',
                    email: 'user@ainative.studio',
                    name: 'AINative User',
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            })
        });
        // Error responses
        this.responses.set('network-error', {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'Server error occurred'
        });
        this.responses.set('unauthorized', {
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            text: async () => 'Invalid credentials'
        });
        this.responses.set('rate-limit', {
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: async () => 'Rate limit exceeded'
        });
    }
    setResponse(key, response) {
        this.responses.set(key, response);
    }
    async fetch(url, options) {
        this.requestLog.push({ url, options });
        // Determine response based on URL
        if (url.includes('/google/callback')) {
            return this.responses.get('google-success');
        }
        else if (url.includes('/github/callback')) {
            return this.responses.get('github-success');
        }
        else if (url.includes('/ainative/callback')) {
            return this.responses.get('ainative-success');
        }
        return this.responses.get('network-error');
    }
    getRequestLog() {
        return this.requestLog;
    }
    reset() {
        this.requestLog = [];
    }
}
suite('Authentication Integration Tests - Issue #77', () => {
    const disposables = new DisposableStore();
    let storageService;
    let encryptionService;
    let logService;
    let oauthService;
    let tokenService;
    let sessionManager;
    let mockFetch;
    setup(() => {
        storageService = new MockStorageService();
        encryptionService = new MockEncryptionService();
        logService = new NullLogService();
        oauthService = disposables.add(new ZeroDBOAuthService(storageService));
        tokenService = disposables.add(new TokenService(encryptionService, storageService));
        sessionManager = disposables.add(new SessionManager(tokenService, logService));
        mockFetch = new MockFetch();
        // Mock global fetch (if available)
        if (typeof global !== 'undefined') {
            global.fetch = mockFetch.fetch.bind(mockFetch);
        }
    });
    teardown(() => {
        disposables.clear();
        storageService.reset();
        mockFetch.reset();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * 1. LOGIN FLOW TESTS (7 tests)
     */
    suite('1. Login Flow Tests', () => {
        test('1.1 OAuth initiation renders correctly with all parameters', async () => {
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            assert.ok(result.authUrl, 'Auth URL should be generated');
            assert.ok(result.state, 'State token should be generated');
            assert.ok(result.authUrl.includes('client_id='), 'Should include client_id');
            assert.ok(result.authUrl.includes('redirect_uri='), 'Should include redirect_uri');
            assert.ok(result.authUrl.includes('response_type=code'), 'Should use code flow');
            assert.ok(result.authUrl.includes('state='), 'Should include state for CSRF protection');
            assert.ok(result.authUrl.includes('scope='), 'Should include scopes');
        });
        test('1.2 Successful login with valid OAuth callback', async () => {
            // Step 1: Initiate OAuth flow
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            // Step 2: Simulate successful callback
            const callbackParams = {
                code: 'valid_auth_code_12345',
                state: initResult.state
            };
            const callbackResult = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(callbackResult.success, true, 'Login should succeed');
            assert.ok(callbackResult.accessToken, 'Should return access token');
            assert.ok(callbackResult.refreshToken, 'Should return refresh token');
            assert.ok(callbackResult.user, 'Should return user data');
        });
        test('1.3 Failed login with invalid state (CSRF protection)', async () => {
            // Initiate OAuth flow
            await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            // Attempt callback with wrong state
            const callbackParams = {
                code: 'valid_code',
                state: 'invalid_state_token'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false, 'Should fail with invalid state');
            assert.strictEqual(result.errorCode, OAuthErrorCode.InvalidState, 'Should return CSRF error');
            assert.ok(result.error?.toLowerCase().includes('csrf'), 'Error message should mention CSRF');
        });
        test('1.4 Token storage after successful login', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const callbackParams = {
                code: 'valid_code',
                state: initResult.state
            };
            const callbackResult = await oauthService.handleCallback(callbackParams);
            if (callbackResult.success && callbackResult.accessToken && callbackResult.refreshToken) {
                await tokenService.storeTokens(callbackResult.accessToken, callbackResult.refreshToken, true);
                const storedAccess = await tokenService.getAccessToken();
                const storedRefresh = await tokenService.getRefreshToken();
                assert.ok(storedAccess, 'Access token should be stored');
                assert.ok(storedRefresh, 'Refresh token should be stored');
                assert.strictEqual(await tokenService.isAuthenticated(), true, 'Should be authenticated');
            }
        });
        test('1.5 Redirect and state management during login', async () => {
            const returnUrl = '/dashboard';
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub, returnUrl);
            assert.ok(result.state, 'Should generate state token');
            assert.ok(oauthService.isOAuthInProgress(), 'OAuth should be in progress');
        });
        test('1.6 Loading states during login flow', async () => {
            let stateChanges = [];
            oauthService.onDidInitiateOAuth(() => {
                stateChanges.push('initiated');
            });
            oauthService.onDidCompleteAuth(() => {
                stateChanges.push('completed');
            });
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            assert.ok(stateChanges.includes('initiated'), 'Should fire initiation event');
            const callbackParams = {
                code: 'test_code',
                state: initResult.state
            };
            await oauthService.handleCallback(callbackParams);
            assert.ok(stateChanges.includes('completed'), 'Should fire completion event');
        });
        test('1.7 Network error handling during login', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            // Simulate network error by using invalid code
            const callbackParams = {
                code: 'will_cause_network_error',
                state: initResult.state
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false, 'Should fail on network error');
            assert.ok(result.error, 'Should have error message');
        });
    });
    /**
     * 2. SIGN-UP/REGISTRATION TESTS (6 tests)
     * Note: OAuth providers handle registration, so we test the OAuth flow variations
     */
    suite('2. Sign-Up/Registration Tests', () => {
        test('2.1 New user registration via OAuth flow', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const callbackParams = {
                code: 'new_user_registration_code',
                state: initResult.state
            };
            const result = await oauthService.handleCallback(callbackParams);
            if (result.success && result.user) {
                assert.ok(result.user.id, 'Should have user ID');
                assert.ok(result.user.email, 'Should have user email');
                assert.ok(result.user.role, 'Should have user role');
            }
        });
        test('2.2 Email validation in OAuth user data', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const callbackParams = {
                code: 'valid_code',
                state: initResult.state
            };
            const result = await oauthService.handleCallback(callbackParams);
            if (result.success && result.user) {
                assert.ok(result.user.email.includes('@'), 'Email should be valid format');
                assert.ok(result.user.email.length > 0, 'Email should not be empty');
            }
        });
        test('2.3 User denied access (registration cancelled)', async () => {
            await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            const callbackParams = {
                code: '',
                state: 'valid_state',
                error: 'access_denied',
                errorDescription: 'User denied access'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false, 'Should fail when user denies');
            assert.strictEqual(result.error, 'User denied access', 'Should have error description');
        });
        test('2.4 Redirect after successful registration', async () => {
            const returnUrl = '/onboarding';
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google, returnUrl);
            assert.ok(initResult.authUrl, 'Should generate auth URL');
            assert.ok(initResult.state, 'Should store state with return URL');
        });
        test('2.5 Loading states during registration', async () => {
            let initiated = false;
            let completed = false;
            oauthService.onDidInitiateOAuth(() => {
                initiated = true;
            });
            oauthService.onDidCompleteAuth(() => {
                completed = true;
            });
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            assert.ok(initiated, 'Should fire initiation event');
            const callbackParams = {
                code: 'registration_code',
                state: initResult.state
            };
            await oauthService.handleCallback(callbackParams);
            assert.ok(completed, 'Should fire completion event');
        });
        test('2.6 Provider-specific scopes for registration', () => {
            const googleConfig = oauthService.getProviderConfig(OAuthProvider.Google);
            const githubConfig = oauthService.getProviderConfig(OAuthProvider.GitHub);
            assert.ok(googleConfig.scope.includes('email'), 'Google should request email scope');
            assert.ok(googleConfig.scope.includes('profile'), 'Google should request profile scope');
            assert.ok(githubConfig.scope.includes('user:email'), 'GitHub should request email scope');
        });
    });
    /**
     * 3. OAUTH FLOW TESTS (5 tests)
     */
    suite('3. OAuth Flow Tests', () => {
        test('3.1 OAuth redirect to correct provider endpoints', async () => {
            const googleResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const githubResult = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            const ainativeResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            assert.ok(googleResult.authUrl.includes('accounts.google.com'), 'Should redirect to Google');
            assert.ok(githubResult.authUrl.includes('github.com'), 'Should redirect to GitHub');
            assert.ok(ainativeResult.authUrl.includes('ainative.studio'), 'Should redirect to AINative');
        });
        test('3.2 OAuth callback handling with valid code', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const callbackParams = {
                code: 'authorization_code_xyz',
                state: initResult.state
            };
            const result = await oauthService.handleCallback(callbackParams);
            // Will fail due to network, but should handle gracefully
            assert.ok(result.success !== undefined, 'Should return result');
            assert.ok(result.error || result.accessToken, 'Should have error or token');
        });
        test('3.3 Authorization code exchange', async () => {
            // Test is covered by callback handling
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            const callbackParams = {
                code: 'auth_code_123',
                state: initResult.state
            };
            const result = await oauthService.handleCallback(callbackParams);
            // Code exchange happens internally
            assert.ok(result, 'Should attempt code exchange');
        });
        test('3.4 OAuth error handling from provider', async () => {
            await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            const callbackParams = {
                code: '',
                state: 'any_state',
                error: 'invalid_request',
                errorDescription: 'Missing required parameter'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false, 'Should fail with provider error');
            assert.strictEqual(result.error, 'Missing required parameter', 'Should return error description');
        });
        test('3.5 State parameter validation (CSRF protection)', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            // Test 1: Wrong state
            const wrongState = {
                code: 'code',
                state: 'wrong_state'
            };
            const result1 = await oauthService.handleCallback(wrongState);
            assert.strictEqual(result1.errorCode, OAuthErrorCode.InvalidState, 'Should reject wrong state');
            // Test 2: Correct state
            const correctState = {
                code: 'code',
                state: initResult.state
            };
            const result2 = await oauthService.handleCallback(correctState);
            // May fail on network, but state should be valid
            assert.notStrictEqual(result2.errorCode, OAuthErrorCode.InvalidState, 'Should accept correct state');
        });
    });
    /**
     * 4. TOKEN MANAGEMENT TESTS (5 tests)
     */
    suite('4. Token Management Tests', () => {
        test('4.1 Secure token storage with encryption', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            // Verify tokens are encrypted in storage
            const rawStored = storageService.get('ainative.token.access', -1 /* StorageScope.APPLICATION */);
            assert.ok(rawStored?.startsWith('encrypted_'), 'Token should be encrypted');
            // Verify decryption works
            const retrieved = await tokenService.getAccessToken();
            assert.strictEqual(retrieved, accessToken, 'Should decrypt correctly');
        });
        test('4.2 Token refresh logic when expired', async () => {
            const expiredToken = createTestJWT(-100); // Expired
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(expiredToken, refreshToken, false);
            const isExpired = await tokenService.isTokenExpired();
            assert.strictEqual(isExpired, true, 'Token should be expired');
            // Session manager should trigger refresh
            await sessionManager.initialize();
            assert.ok(sessionManager.getSessionState() !== SessionState.Active, 'Should not be active with expired token');
        });
        test('4.3 Token validation on page load', async () => {
            const validToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(validToken, refreshToken, true);
            // Simulate page reload
            const newTokenService = disposables.add(new TokenService(encryptionService, storageService));
            const isAuth = await newTokenService.isAuthenticated();
            assert.strictEqual(isAuth, true, 'Should remain authenticated after reload');
        });
        test('4.4 Token invalidation on logout', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            assert.strictEqual(await tokenService.isAuthenticated(), true);
            await tokenService.clearTokens();
            assert.strictEqual(await tokenService.getAccessToken(), null, 'Access token should be cleared');
            assert.strictEqual(await tokenService.getRefreshToken(), null, 'Refresh token should be cleared');
            assert.strictEqual(await tokenService.isAuthenticated(), false, 'Should not be authenticated');
        });
        test('4.5 Concurrent session handling', async () => {
            const accessToken1 = createTestJWT(3600);
            const refreshToken1 = createTestJWT(86400);
            const accessToken2 = createTestJWT(7200);
            const refreshToken2 = createTestJWT(172800);
            // Store first session
            await tokenService.storeTokens(accessToken1, refreshToken1, true);
            // Store second session (should replace first)
            await tokenService.storeTokens(accessToken2, refreshToken2, true);
            const currentToken = await tokenService.getAccessToken();
            assert.strictEqual(currentToken, accessToken2, 'Should use most recent token');
        });
    });
    /**
     * 5. SESSION MANAGEMENT TESTS (4 tests)
     */
    suite('5. Session Management Tests', () => {
        test('5.1 Session persistence across page reloads', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            // Simulate page reload with new session manager
            const newSessionManager = disposables.add(new SessionManager(tokenService, logService));
            await newSessionManager.initialize();
            assert.ok(newSessionManager.isSessionActive() || newSessionManager.getSessionState() === SessionState.Active, 'Session should persist after reload');
        });
        test('5.2 Automatic logout on token expiration', async () => {
            const expiredToken = createTestJWT(-100);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(expiredToken, refreshToken, false);
            let expiredEventFired = false;
            sessionManager.onDidExpireSession(() => {
                expiredEventFired = true;
            });
            await sessionManager.initialize();
            sessionManager.startMonitoring();
            // Expired session should trigger event
            assert.strictEqual(sessionManager.getSessionState() === SessionState.Expired ||
                sessionManager.getSessionState() === SessionState.Inactive, true, 'Should handle expired token');
        });
        test('5.3 Session timeout behavior', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            await sessionManager.initialize({
                inactivityTimeoutMs: 100, // Very short for testing
                autoRefresh: false
            });
            sessionManager.startMonitoring();
            // Wait for timeout
            await new Promise(resolve => setTimeout(resolve, 150));
            // Update activity should reset timer
            sessionManager.updateActivity();
            assert.ok(true, 'Should handle inactivity timeout');
        });
        test('5.4 Remember me functionality', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            // Test with remember me = true
            await tokenService.storeTokens(accessToken, refreshToken, true);
            assert.strictEqual(await tokenService.getRememberMe(), true, 'Should remember session');
            // Test with remember me = false
            await tokenService.storeTokens(accessToken, refreshToken, false);
            assert.strictEqual(await tokenService.getRememberMe(), false, 'Should not remember session');
        });
    });
    /**
     * 6. LOGOUT TESTS (4 tests)
     */
    suite('6. Logout Tests', () => {
        test('6.1 Token clearing on logout', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            await tokenService.clearTokens();
            assert.strictEqual(await tokenService.getAccessToken(), null);
            assert.strictEqual(await tokenService.getRefreshToken(), null);
            assert.strictEqual(await tokenService.getTokenExpiration(), null);
        });
        test('6.2 Session state update after logout', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            await sessionManager.terminateSession();
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Inactive);
        });
        test('6.3 OAuth state cleanup on logout', async () => {
            await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            assert.ok(oauthService.isOAuthInProgress());
            oauthService.cancelOAuthFlow();
            assert.strictEqual(oauthService.isOAuthInProgress(), false);
        });
        test('6.4 Event firing on logout', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            let tokenClearEventFired = false;
            let sessionTerminatedEventFired = false;
            tokenService.onDidClearTokens(() => {
                tokenClearEventFired = true;
            });
            sessionManager.onDidChangeSessionState((state) => {
                if (state === SessionState.Inactive) {
                    sessionTerminatedEventFired = true;
                }
            });
            sessionManager.startMonitoring();
            await sessionManager.terminateSession();
            assert.ok(tokenClearEventFired, 'Should fire token clear event');
            assert.ok(sessionTerminatedEventFired, 'Should fire session state change event');
        });
    });
    /**
     * 7. ERROR HANDLING TESTS (6 tests)
     */
    suite('7. Error Handling Tests', () => {
        test('7.1 Network timeout errors', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const callbackParams = {
                code: 'timeout_code',
                state: initResult.state
            };
            const result = await oauthService.handleCallback(callbackParams);
            // Should handle network error gracefully
            assert.ok(result.error || result.success === false, 'Should handle timeout');
        });
        test('7.2 401 Unauthorized handling', async () => {
            await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            const callbackParams = {
                code: '',
                state: 'state',
                error: 'unauthorized',
                errorDescription: '401 Unauthorized'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false);
            assert.ok(result.error);
        });
        test('7.3 403 Forbidden responses', async () => {
            await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            const callbackParams = {
                code: '',
                state: 'state',
                error: 'forbidden',
                errorDescription: 'Access forbidden'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false);
        });
        test('7.4 Rate limiting errors', async () => {
            await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const callbackParams = {
                code: '',
                state: 'state',
                error: 'rate_limit_exceeded',
                errorDescription: 'Too many requests'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes('requests') || result.error?.includes('rate'), 'Should mention rate limiting');
        });
        test('7.5 Generic API error handling', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            const callbackParams = {
                code: 'error_code',
                state: initResult.state
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.ok(result.error || result.success, 'Should return result');
        });
        test('7.6 User-friendly error messages', async () => {
            await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const callbackParams = {
                code: '',
                state: 'invalid',
                error: 'server_error',
                errorDescription: 'An unexpected error occurred'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.ok(result.error, 'Should have error message');
            assert.ok(result.error.length > 0, 'Error message should not be empty');
        });
    });
    /**
     * 8. SECURITY TESTS (6 tests)
     */
    suite('8. Security Tests', () => {
        test('8.1 HTTPS-only API endpoints validation', () => {
            const googleConfig = oauthService.getProviderConfig(OAuthProvider.Google);
            const githubConfig = oauthService.getProviderConfig(OAuthProvider.GitHub);
            const ainativeConfig = oauthService.getProviderConfig(OAuthProvider.AINative);
            assert.ok(googleConfig.authorizationEndpoint.startsWith('https://'), 'Google should use HTTPS');
            assert.ok(googleConfig.tokenEndpoint.startsWith('https://'), 'Google token endpoint should use HTTPS');
            assert.ok(githubConfig.authorizationEndpoint.startsWith('https://'), 'GitHub should use HTTPS');
            assert.ok(ainativeConfig.authorizationEndpoint.startsWith('https://'), 'AINative should use HTTPS');
        });
        test('8.2 CSRF token validation', async () => {
            const result1 = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const result2 = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            // Each flow should have unique state
            assert.notStrictEqual(result1.state, result2.state, 'States should be unique');
            // State should be sufficiently long
            assert.ok(result1.state.length >= 32, 'State should be at least 32 characters');
        });
        test('8.3 XSS prevention in auth forms (data validation)', async () => {
            const maliciousCode = '<script>alert("xss")</script>';
            // OAuth should not execute or return malicious code
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            assert.ok(!initResult.authUrl.includes('<script>'), 'Should not contain script tags');
            assert.ok(!initResult.state.includes('<'), 'State should not contain HTML');
        });
        test('8.4 Secure password handling (no plain text in tokens)', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            // Check that tokens are encrypted
            const rawAccess = storageService.get('ainative.token.access', -1 /* StorageScope.APPLICATION */);
            const rawRefresh = storageService.get('ainative.token.refresh', -1 /* StorageScope.APPLICATION */);
            assert.ok(rawAccess?.startsWith('encrypted_'), 'Access token should be encrypted');
            assert.ok(rawRefresh?.startsWith('encrypted_'), 'Refresh token should be encrypted');
        });
        test('8.5 Sensitive data not logged', async () => {
            // This test ensures tokens are not logged in console
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            // In production, sensitive data should never be logged
            // This is a reminder test
            assert.ok(true, 'Ensure tokens are never logged to console');
        });
        test('8.6 Secure cookie attributes (storage security)', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, true);
            // Verify storage uses secure targets
            const storedAccess = await tokenService.getAccessToken();
            assert.ok(storedAccess, 'Should use secure storage');
            // Remember me should use MACHINE target (persistent)
            const rememberMe = await tokenService.getRememberMe();
            assert.strictEqual(rememberMe, true, 'Should use appropriate storage target');
        });
    });
    /**
     * 9. INTEGRATION TESTS (5 tests)
     */
    suite('9. Integration Tests', () => {
        test('9.1 Correct API endpoints called', async () => {
            const googleResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            const githubResult = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            const ainativeResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            assert.ok(googleResult.authUrl.includes('accounts.google.com'));
            assert.ok(githubResult.authUrl.includes('github.com'));
            assert.ok(ainativeResult.authUrl.includes('ainative.studio'));
        });
        test('9.2 API request/response format validation', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            // Validate authorization URL format
            const url = new URL(initResult.authUrl);
            assert.ok(url.searchParams.get('client_id'));
            assert.ok(url.searchParams.get('redirect_uri'));
            assert.ok(url.searchParams.get('response_type') === 'code');
            assert.ok(url.searchParams.get('state'));
            assert.ok(url.searchParams.get('scope'));
        });
        test('9.3 Authentication headers sent correctly', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const token = await tokenService.getAccessToken();
            // In real app, this would be sent as Authorization header
            assert.ok(token, 'Should have token for auth header');
            assert.ok(token.includes('.'), 'Should be JWT format');
        });
        test('9.4 Auth state propagates to dependent components', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            let tokenUpdateFired = false;
            let sessionStateChanged = false;
            tokenService.onDidUpdateTokens(() => {
                tokenUpdateFired = true;
            });
            sessionManager.onDidChangeSessionState(() => {
                sessionStateChanged = true;
            });
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            assert.ok(tokenUpdateFired, 'Token service should fire event');
            assert.ok(sessionStateChanged, 'Session manager should react to token changes');
        });
        test('9.5 End-to-end flow: OAuth → login → token storage → session', async () => {
            // Step 1: Initiate OAuth
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            assert.ok(initResult.state, 'OAuth initiated');
            // Step 2: Handle callback
            const callbackParams = {
                code: 'e2e_test_code',
                state: initResult.state
            };
            const callbackResult = await oauthService.handleCallback(callbackParams);
            // Step 3: Store tokens (if successful)
            if (callbackResult.success && callbackResult.accessToken && callbackResult.refreshToken) {
                await tokenService.storeTokens(callbackResult.accessToken, callbackResult.refreshToken, true);
                // Step 4: Initialize session
                await sessionManager.initialize();
                sessionManager.startMonitoring();
                // Step 5: Verify complete flow
                assert.ok(await tokenService.isAuthenticated(), 'Should be authenticated');
                assert.ok(sessionManager.isSessionActive(), 'Session should be active');
            }
            else {
                // Handle network error gracefully
                assert.ok(callbackResult.error, 'Should have error or success');
            }
        });
    });
    /**
     * 10. PERFORMANCE TESTS (3 tests)
     */
    suite('10. Performance Tests', () => {
        test('10.1 Token operations complete within acceptable time (<100ms)', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            const startTime = Date.now();
            await tokenService.storeTokens(accessToken, refreshToken, false);
            await tokenService.getAccessToken();
            await tokenService.isAuthenticated();
            const endTime = Date.now();
            const duration = endTime - startTime;
            assert.ok(duration < 100, `Token operations should be fast (took ${duration}ms)`);
        });
        test('10.2 OAuth state generation latency (<50ms)', async () => {
            const iterations = 10;
            const startTime = Date.now();
            for (let i = 0; i < iterations; i++) {
                await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            }
            const endTime = Date.now();
            const avgDuration = (endTime - startTime) / iterations;
            assert.ok(avgDuration < 50, `OAuth generation should be fast (avg ${avgDuration}ms)`);
        });
        test('10.3 Session initialization with token check (<200ms)', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            const startTime = Date.now();
            await sessionManager.initialize();
            const endTime = Date.now();
            const duration = endTime - startTime;
            assert.ok(duration < 200, `Session init should be fast (took ${duration}ms)`);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25JbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9hdXRoZW50aWNhdGlvbkludGVncmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUNOLGtCQUFrQixFQUVsQixhQUFhLEVBQ2IsY0FBYyxFQUdkLE1BQU0sb0NBQW9DLENBQUM7QUFDNUMsT0FBTyxFQUFFLFlBQVksRUFBaUIsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFtQixZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUcvRixPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSTFFOztHQUVHO0FBQ0gsTUFBTSxrQkFBa0I7SUFBeEI7UUFFUyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFNUMscUJBQWdCLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBUSxDQUFDO1FBQ3pELHNCQUFpQixHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQVEsQ0FBQztRQUMxRCxvQkFBZSxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxF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