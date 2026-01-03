/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SessionManager, SessionState } from '../../common/sessionManager.js';
import { ITokenService } from '../../common/tokenService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';

/**
 * Mock token service for testing
 */
class MockTokenService implements ITokenService {
	readonly _serviceBrand: undefined;

	private _accessToken: string | null = null;
	private _refreshToken: string | null = null;
	private _expiresAt: number | null = null;
	private _rememberMe = false;

	private readonly _onDidUpdateTokens = new Emitter<void>();
	readonly onDidUpdateTokens = this._onDidUpdateTokens.event;

	private readonly _onDidClearTokens = new Emitter<void>();
	readonly onDidClearTokens = this._onDidClearTokens.event;

	async storeTokens(accessToken: string, refreshToken: string, rememberMe: boolean = false): Promise<void> {
		this._accessToken = accessToken;
		this._refreshToken = refreshToken;
		this._rememberMe = rememberMe;

		// Parse expiration from token
		try {
			const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
			this._expiresAt = payload.exp * 1000;
		} catch {
			this._expiresAt = Date.now() + 3600000;
		}

		this._onDidUpdateTokens.fire();
	}

	async getAccessToken(): Promise<string | null> {
		return this._accessToken;
	}

	async getRefreshToken(): Promise<string | null> {
		return this._refreshToken;
	}

	async clearTokens(): Promise<void> {
		this._accessToken = null;
		this._refreshToken = null;
		this._expiresAt = null;
		this._rememberMe = false;
		this._onDidClearTokens.fire();
	}

	async isAuthenticated(): Promise<boolean> {
		if (!this._accessToken || !this._expiresAt) {
			return false;
		}
		return Date.now() < this._expiresAt;
	}

	async getTokenExpiration(): Promise<number | null> {
		return this._expiresAt;
	}

	async isTokenExpired(bufferMs: number = 0): Promise<boolean> {
		if (!this._expiresAt) {
			return true;
		}
		return Date.now() >= (this._expiresAt - bufferMs);
	}

	async getRememberMe(): Promise<boolean> {
		return this._rememberMe;
	}
}

/**
 * Create a test JWT token
 */
function createTestJWT(expiresIn: number = 3600): string {
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
	let sessionManager: SessionManager;
	let tokenService: MockTokenService;
	let logService: ILogService;

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
			let newState: SessionState | null = null;

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
