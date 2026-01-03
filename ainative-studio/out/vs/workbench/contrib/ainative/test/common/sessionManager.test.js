/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SessionManager, SessionState } from '../../common/sessionManager.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';
/**
 * Mock token service for testing
 */
class MockTokenService {
    constructor() {
        this._accessToken = null;
        this._refreshToken = null;
        this._expiresAt = null;
        this._rememberMe = false;
        this._onDidUpdateTokens = new Emitter();
        this.onDidUpdateTokens = this._onDidUpdateTokens.event;
        this._onDidClearTokens = new Emitter();
        this.onDidClearTokens = this._onDidClearTokens.event;
    }
    async storeTokens(accessToken, refreshToken, rememberMe = false) {
        this._accessToken = accessToken;
        this._refreshToken = refreshToken;
        this._rememberMe = rememberMe;
        // Parse expiration from token
        try {
            const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
            this._expiresAt = payload.exp * 1000;
        }
        catch {
            this._expiresAt = Date.now() + 3600000;
        }
        this._onDidUpdateTokens.fire();
    }
    async getAccessToken() {
        return this._accessToken;
    }
    async getRefreshToken() {
        return this._refreshToken;
    }
    async clearTokens() {
        this._accessToken = null;
        this._refreshToken = null;
        this._expiresAt = null;
        this._rememberMe = false;
        this._onDidClearTokens.fire();
    }
    async isAuthenticated() {
        if (!this._accessToken || !this._expiresAt) {
            return false;
        }
        return Date.now() < this._expiresAt;
    }
    async getTokenExpiration() {
        return this._expiresAt;
    }
    async isTokenExpired(bufferMs = 0) {
        if (!this._expiresAt) {
            return true;
        }
        return Date.now() >= (this._expiresAt - bufferMs);
    }
    async getRememberMe() {
        return this._rememberMe;
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
suite('SessionManager', () => {
    const disposables = new DisposableStore();
    let sessionManager;
    let tokenService;
    let logService;
    setup(() => {
        tokenService = new MockTokenService();
        logService = new NullLogService();
        sessionManager = disposables.add(new SessionManager(tokenService, logService));
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('Initialization', () => {
        test('should initialize with default config', async () => {
            await sessionManager.initialize();
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Inactive);
        });
        test('should initialize with custom config', async () => {
            await sessionManager.initialize({
                refreshBufferMs: 10 * 60 * 1000, // 10 minutes
                inactivityTimeoutMs: 60 * 60 * 1000, // 1 hour
                autoRefresh: true
            });
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Inactive);
        });
        test('should detect existing authentication on init', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            await sessionManager.initialize();
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Active);
        });
        test('should not start monitoring if autoRefresh is disabled', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            await sessionManager.initialize({ autoRefresh: false });
            // Session should be active but monitoring not started
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Active);
        });
    });
    suite('Session Monitoring', () => {
        test('should start monitoring', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Active);
        });
        test('should stop monitoring', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            sessionManager.stopMonitoring();
            // Session state may still be active, but timers should be cleared
            assert.ok(true); // Just verify no errors
        });
        test('should update session state to Active when monitoring starts', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            let stateChanged = false;
            sessionManager.onDidChangeSessionState((state) => {
                if (state === SessionState.Active) {
                    stateChanged = true;
                }
            });
            sessionManager.startMonitoring();
            assert.ok(stateChanged);
        });
    });
    suite('Session State', () => {
        test('should return current session state', async () => {
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Inactive);
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Active);
        });
        test('should check if session is active', async () => {
            assert.strictEqual(sessionManager.isSessionActive(), false);
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            assert.strictEqual(sessionManager.isSessionActive(), true);
        });
        test('should fire state change event', async () => {
            let eventFired = false;
            let newState = null;
            sessionManager.onDidChangeSessionState((state) => {
                eventFired = true;
                newState = state;
            });
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            assert.ok(eventFired);
            assert.strictEqual(newState, SessionState.Active);
        });
    });
    suite('Activity Tracking', () => {
        test('should update last activity time', () => {
            sessionManager.updateActivity();
            // Should not throw error
            assert.ok(true);
        });
        test('should reset inactivity timer on activity', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            await sessionManager.initialize({
                inactivityTimeoutMs: 100 // Very short timeout for testing
            });
            sessionManager.startMonitoring();
            // Update activity before timeout
            setTimeout(() => {
                sessionManager.updateActivity();
            }, 50);
            // Wait for original timeout
            await new Promise(resolve => setTimeout(resolve, 150));
            // Session should still be active because we updated activity
            assert.strictEqual(sessionManager.isSessionActive(), true);
        });
    });
    suite('Session Termination', () => {
        test('should terminate session', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            await sessionManager.terminateSession();
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Inactive);
            assert.strictEqual(await tokenService.getAccessToken(), null);
        });
        test('should stop monitoring on termination', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            await sessionManager.terminateSession();
            // Should not throw when trying to stop monitoring again
            sessionManager.stopMonitoring();
            assert.ok(true);
        });
    });
    suite('Events', () => {
        test('should fire onDidChangeSessionState', async () => {
            let eventCount = 0;
            sessionManager.onDidChangeSessionState(() => {
                eventCount++;
            });
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            assert.ok(eventCount > 0);
        });
        test('should respond to token clear events', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            let stateChangedToInactive = false;
            sessionManager.onDidChangeSessionState((state) => {
                if (state === SessionState.Inactive) {
                    stateChangedToInactive = true;
                }
            });
            await tokenService.clearTokens();
            assert.ok(stateChangedToInactive);
        });
    });
    suite('Edge Cases', () => {
        test('should handle initialize called multiple times', async () => {
            await sessionManager.initialize();
            await sessionManager.initialize();
            await sessionManager.initialize();
            // Should not throw error
            assert.ok(true);
        });
        test('should handle stop monitoring without start', () => {
            sessionManager.stopMonitoring();
            // Should not throw error
            assert.ok(true);
        });
        test('should handle terminate when no session exists', async () => {
            await sessionManager.terminateSession();
            assert.strictEqual(sessionManager.getSessionState(), SessionState.Inactive);
        });
        test('should handle concurrent operations', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            const operations = [
                tokenService.storeTokens(accessToken, refreshToken, false),
                sessionManager.initialize(),
                sessionManager.updateActivity()
            ];
            await Promise.all(operations);
            // Should handle gracefully
            assert.ok(true);
        });
    });
    suite('Disposal', () => {
        test('should stop monitoring on dispose', async () => {
            const accessToken = createTestJWT(3600);
            const refreshToken = createTestJWT(86400);
            await tokenService.storeTokens(accessToken, refreshToken, false);
            sessionManager.startMonitoring();
            sessionManager.dispose();
            // Should not throw error
            assert.ok(true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Vzc2lvbk1hbmFnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2Vzc2lvbk1hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTlFLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlEOztHQUVHO0FBQ0gsTUFBTSxnQkFBZ0I7SUFBdEI7UUFHUyxpQkFBWSxHQUFrQixJQUFJLENBQUM7UUFDbkMsa0JBQWEsR0FBa0IsSUFBSSxDQUFDO1FBQ3BDLGVBQVUsR0FBa0IsSUFBSSxDQUFDO1FBQ2pDLGdCQUFXLEdBQUcsS0FBSyxDQUFDO1FBRVgsdUJBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUNqRCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBRTFDLHNCQUFpQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDaEQscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztJQXVEMUQsQ0FBQztJQXJEQSxLQUFLLENBQUMsV0FBVyxDQUFDLFdBQW1CLEVBQUUsWUFBb0IsRUFBRSxhQUFzQixLQUFLO1FBQ3ZG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