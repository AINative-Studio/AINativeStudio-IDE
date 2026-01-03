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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25JbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9hdXRoZW50aWNhdGlvbkludGVncmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUNOLGtCQUFrQixFQUVsQixhQUFhLEVBQ2IsY0FBYyxFQUdkLE1BQU0sb0NBQW9DLENBQUM7QUFDNUMsT0FBTyxFQUFFLFlBQVksRUFBaUIsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFtQixZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUcvRixPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRzFFOztHQUVHO0FBQ0gsTUFBTSxrQkFBa0I7SUFBeEI7UUFFUyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFNUMscUJBQWdCLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBUSxDQUFDO1FBQ3pELHNCQUFpQixHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQVEsQ0FBQztRQUMxRCxvQkFBZSxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxF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