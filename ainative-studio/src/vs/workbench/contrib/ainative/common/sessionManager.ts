/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ITokenService, TokenRefreshResult } from './tokenService.js';
import { ILogService } from '../../../../platform/log/common/log.js';

export const ISessionManager = createDecorator<ISessionManager>('sessionManager');

/**
 * Session state enum
 */
export enum SessionState {
	Active = 'active',
	Inactive = 'inactive',
	Refreshing = 'refreshing',
	Expired = 'expired'
}

/**
 * Session timeout configuration
 */
export interface SessionConfig {
	/**
	 * Time before token expiration to trigger refresh (in milliseconds)
	 * Default: 5 minutes
	 */
	readonly refreshBufferMs?: number;

	/**
	 * Inactivity timeout (in milliseconds)
	 * Default: 30 minutes
	 */
	readonly inactivityTimeoutMs?: number;

	/**
	 * Enable automatic token refresh
	 * Default: true
	 */
	readonly autoRefresh?: boolean;
}

/**
 * Session manager interface for handling token lifecycle
 */
export interface ISessionManager {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when session state changes
	 */
	readonly onDidChangeSessionState: Event<SessionState>;

	/**
	 * Event fired when session expires
	 */
	readonly onDidExpireSession: Event<void>;

	/**
	 * Event fired when token is refreshed
	 */
	readonly onDidRefreshToken: Event<void>;

	/**
	 * Initialize session manager and start automatic refresh
	 */
	initialize(config?: SessionConfig): Promise<void>;

	/**
	 * Start monitoring session and token expiration
	 */
	startMonitoring(): void;

	/**
	 * Stop monitoring session
	 */
	stopMonitoring(): void;

	/**
	 * Manually trigger token refresh
	 * @returns Refresh result with new tokens or error
	 */
	refreshToken(): Promise<TokenRefreshResult>;

	/**
	 * Update last activity timestamp
	 */
	updateActivity(): void;

	/**
	 * Get current session state
	 */
	getSessionState(): SessionState;

	/**
	 * Check if session is active
	 */
	isSessionActive(): boolean;

	/**
	 * Terminate current session
	 */
	terminateSession(): Promise<void>;
}

/**
 * Session manager implementation
 * Handles automatic token refresh and session timeout
 */
export class SessionManager extends Disposable implements ISessionManager {
	readonly _serviceBrand: undefined;

	private static readonly API_BASE = 'https://api.ainative.studio';
	private static readonly DEFAULT_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
	private static readonly DEFAULT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

	private readonly _onDidChangeSessionState = this._register(new Emitter<SessionState>());
	readonly onDidChangeSessionState = this._onDidChangeSessionState.event;

	private readonly _onDidExpireSession = this._register(new Emitter<void>());
	readonly onDidExpireSession = this._onDidExpireSession.event;

	private readonly _onDidRefreshToken = this._register(new Emitter<void>());
	readonly onDidRefreshToken = this._onDidRefreshToken.event;

	private _sessionState: SessionState = SessionState.Inactive;
	private _config: Required<SessionConfig>;
	private _refreshTimer: NodeJS.Timeout | null = null;
	private _inactivityTimer: NodeJS.Timeout | null = null;
	private _lastActivityTime: number = Date.now();
	private _isRefreshing = false;

	constructor(
		@ITokenService private readonly tokenService: ITokenService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		// Default configuration
		this._config = {
			refreshBufferMs: SessionManager.DEFAULT_REFRESH_BUFFER_MS,
			inactivityTimeoutMs: SessionManager.DEFAULT_INACTIVITY_TIMEOUT_MS,
			autoRefresh: true
		};

		// Listen to token changes
		this._register(this.tokenService.onDidUpdateTokens(() => {
			this._scheduleTokenRefresh();
		}));

		this._register(this.tokenService.onDidClearTokens(() => {
			this._updateSessionState(SessionState.Inactive);
			this.stopMonitoring();
		}));
	}

	/**
	 * Initialize session manager
	 */
	async initialize(config?: SessionConfig): Promise<void> {
		// Merge with default config
		if (config) {
			this._config = {
				refreshBufferMs: config.refreshBufferMs ?? this._config.refreshBufferMs,
				inactivityTimeoutMs: config.inactivityTimeoutMs ?? this._config.inactivityTimeoutMs,
				autoRefresh: config.autoRefresh ?? this._config.autoRefresh
			};
		}

		this.logService.info('[SessionManager] Initialized with config:', this._config);

		// Check if we have existing tokens
		const isAuthenticated = await this.tokenService.isAuthenticated();
		if (isAuthenticated) {
			this._updateSessionState(SessionState.Active);
			if (this._config.autoRefresh) {
				this.startMonitoring();
			}
		}
	}

	/**
	 * Start monitoring session
	 */
	startMonitoring(): void {
		this.logService.info('[SessionManager] Starting session monitoring');

		// Schedule token refresh
		this._scheduleTokenRefresh();

		// Schedule inactivity check
		this._scheduleInactivityCheck();

		this._updateSessionState(SessionState.Active);
	}

	/**
	 * Stop monitoring session
	 */
	stopMonitoring(): void {
		this.logService.info('[SessionManager] Stopping session monitoring');

		// Clear timers
		if (this._refreshTimer) {
			clearTimeout(this._refreshTimer);
			this._refreshTimer = null;
		}

		if (this._inactivityTimer) {
			clearTimeout(this._inactivityTimer);
			this._inactivityTimer = null;
		}
	}

	/**
	 * Refresh access token using refresh token
	 */
	async refreshToken(): Promise<TokenRefreshResult> {
		if (this._isRefreshing) {
			this.logService.warn('[SessionManager] Token refresh already in progress');
			return {
				success: false,
				error: new Error('Token refresh already in progress')
			};
		}

		this._isRefreshing = true;
		this._updateSessionState(SessionState.Refreshing);

		try {
			const refreshToken = await this.tokenService.getRefreshToken();
			if (!refreshToken) {
				throw new Error('No refresh token available');
			}

			this.logService.info('[SessionManager] Refreshing access token');

			const response = await fetch(`${SessionManager.API_BASE}/v1/auth/refresh`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${refreshToken}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`Token refresh failed: HTTP ${response.status}`);
			}

			const data = await response.json();
			const rememberMe = await this.tokenService.getRememberMe();

			// Store new tokens
			await this.tokenService.storeTokens(
				data.access_token,
				data.refresh_token || refreshToken,
				rememberMe
			);

			this._updateSessionState(SessionState.Active);
			this._onDidRefreshToken.fire();

			this.logService.info('[SessionManager] Token refresh successful');

			// Schedule next refresh
			this._scheduleTokenRefresh();

			return {
				success: true,
				accessToken: data.access_token,
				refreshToken: data.refresh_token || refreshToken
			};

		} catch (error) {
			this.logService.error('[SessionManager] Token refresh failed:', error);

			// Clear tokens and expire session
			await this.tokenService.clearTokens();
			this._updateSessionState(SessionState.Expired);
			this._onDidExpireSession.fire();

			return {
				success: false,
				error: error as Error
			};

		} finally {
			this._isRefreshing = false;
		}
	}

	/**
	 * Update last activity timestamp
	 */
	updateActivity(): void {
		this._lastActivityTime = Date.now();

		// Reset inactivity timer
		this._scheduleInactivityCheck();
	}

	/**
	 * Get current session state
	 */
	getSessionState(): SessionState {
		return this._sessionState;
	}

	/**
	 * Check if session is active
	 */
	isSessionActive(): boolean {
		return this._sessionState === SessionState.Active;
	}

	/**
	 * Terminate current session
	 */
	async terminateSession(): Promise<void> {
		this.logService.info('[SessionManager] Terminating session');

		this.stopMonitoring();
		await this.tokenService.clearTokens();
		this._updateSessionState(SessionState.Inactive);
	}

	/**
	 * Schedule automatic token refresh
	 */
	private _scheduleTokenRefresh(): void {
		// Clear existing timer
		if (this._refreshTimer) {
			clearTimeout(this._refreshTimer);
			this._refreshTimer = null;
		}

		// Get token expiration
		this.tokenService.getTokenExpiration().then(expiresAt => {
			if (!expiresAt) {
				return;
			}

			// Calculate when to refresh (buffer time before expiration)
			const refreshTime = expiresAt - Date.now() - this._config.refreshBufferMs;

			if (refreshTime <= 0) {
				// Token already expired or about to expire, refresh now
				this.logService.warn('[SessionManager] Token expired or expiring soon, refreshing now');
				this.refreshToken();
			} else {
				// Schedule refresh
				this.logService.info('[SessionManager] Scheduling token refresh in', refreshTime, 'ms');
				this._refreshTimer = setTimeout(() => {
					this.refreshToken();
				}, refreshTime);
			}
		});
	}

	/**
	 * Schedule inactivity check
	 */
	private _scheduleInactivityCheck(): void {
		// Clear existing timer
		if (this._inactivityTimer) {
			clearTimeout(this._inactivityTimer);
			this._inactivityTimer = null;
		}

		// Calculate time until inactivity timeout
		const timeSinceLastActivity = Date.now() - this._lastActivityTime;
		const timeUntilTimeout = this._config.inactivityTimeoutMs - timeSinceLastActivity;

		if (timeUntilTimeout <= 0) {
			// Already inactive
			this.logService.warn('[SessionManager] Session inactive, terminating');
			this.terminateSession();
			this._onDidExpireSession.fire();
		} else {
			// Schedule inactivity check
			this._inactivityTimer = setTimeout(() => {
				this.logService.warn('[SessionManager] Session inactive, terminating');
				this.terminateSession();
				this._onDidExpireSession.fire();
			}, timeUntilTimeout);
		}
	}

	/**
	 * Update session state and fire event
	 */
	private _updateSessionState(state: SessionState): void {
		if (this._sessionState !== state) {
			this._sessionState = state;
			this._onDidChangeSessionState.fire(state);
			this.logService.info('[SessionManager] Session state changed to:', state);
		}
	}

	override dispose(): void {
		this.stopMonitoring();
		super.dispose();
	}
}
