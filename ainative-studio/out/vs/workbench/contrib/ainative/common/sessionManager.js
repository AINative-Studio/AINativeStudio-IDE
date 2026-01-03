/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SessionManager_1;
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { ITokenService } from './tokenService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
export const ISessionManager = createDecorator('sessionManager');
/**
 * Session state enum
 */
export var SessionState;
(function (SessionState) {
    SessionState["Active"] = "active";
    SessionState["Inactive"] = "inactive";
    SessionState["Refreshing"] = "refreshing";
    SessionState["Expired"] = "expired";
})(SessionState || (SessionState = {}));
/**
 * Session manager implementation
 * Handles automatic token refresh and session timeout
 */
let SessionManager = class SessionManager extends Disposable {
    static { SessionManager_1 = this; }
    static { this.API_BASE = 'https://api.ainative.studio'; }
    static { this.DEFAULT_REFRESH_BUFFER_MS = 5 * 60 * 1000; } // 5 minutes
    static { this.DEFAULT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; } // 30 minutes
    constructor(tokenService, logService) {
        super();
        this.tokenService = tokenService;
        this.logService = logService;
        this._onDidChangeSessionState = this._register(new Emitter());
        this.onDidChangeSessionState = this._onDidChangeSessionState.event;
        this._onDidExpireSession = this._register(new Emitter());
        this.onDidExpireSession = this._onDidExpireSession.event;
        this._onDidRefreshToken = this._register(new Emitter());
        this.onDidRefreshToken = this._onDidRefreshToken.event;
        this._sessionState = SessionState.Inactive;
        this._refreshTimer = null;
        this._inactivityTimer = null;
        this._lastActivityTime = Date.now();
        this._isRefreshing = false;
        // Default configuration
        this._config = {
            refreshBufferMs: SessionManager_1.DEFAULT_REFRESH_BUFFER_MS,
            inactivityTimeoutMs: SessionManager_1.DEFAULT_INACTIVITY_TIMEOUT_MS,
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
    async initialize(config) {
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
    startMonitoring() {
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
    stopMonitoring() {
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
    async refreshToken() {
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
            const response = await fetch(`${SessionManager_1.API_BASE}/v1/auth/refresh`, {
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
            await this.tokenService.storeTokens(data.access_token, data.refresh_token || refreshToken, rememberMe);
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
        }
        catch (error) {
            this.logService.error('[SessionManager] Token refresh failed:', error);
            // Clear tokens and expire session
            await this.tokenService.clearTokens();
            this._updateSessionState(SessionState.Expired);
            this._onDidExpireSession.fire();
            return {
                success: false,
                error: error
            };
        }
        finally {
            this._isRefreshing = false;
        }
    }
    /**
     * Update last activity timestamp
     */
    updateActivity() {
        this._lastActivityTime = Date.now();
        // Reset inactivity timer
        this._scheduleInactivityCheck();
    }
    /**
     * Get current session state
     */
    getSessionState() {
        return this._sessionState;
    }
    /**
     * Check if session is active
     */
    isSessionActive() {
        return this._sessionState === SessionState.Active;
    }
    /**
     * Terminate current session
     */
    async terminateSession() {
        this.logService.info('[SessionManager] Terminating session');
        this.stopMonitoring();
        await this.tokenService.clearTokens();
        this._updateSessionState(SessionState.Inactive);
    }
    /**
     * Schedule automatic token refresh
     */
    _scheduleTokenRefresh() {
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
            }
            else {
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
    _scheduleInactivityCheck() {
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
        }
        else {
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
    _updateSessionState(state) {
        if (this._sessionState !== state) {
            this._sessionState = state;
            this._onDidChangeSessionState.fire(state);
            this.logService.info('[SessionManager] Session state changed to:', state);
        }
    }
    dispose() {
        this.stopMonitoring();
        super.dispose();
    }
};
SessionManager = SessionManager_1 = __decorate([
    __param(0, ITokenService),
    __param(1, ILogService)
], SessionManager);
export { SessionManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Vzc2lvbk1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9zZXNzaW9uTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBc0IsTUFBTSxtQkFBbUIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckUsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsZ0JBQWdCLENBQUMsQ0FBQztBQUVsRjs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLFlBS1g7QUFMRCxXQUFZLFlBQVk7SUFDdkIsaUNBQWlCLENBQUE7SUFDakIscUNBQXFCLENBQUE7SUFDckIseUNBQXlCLENBQUE7SUFDekIsbUNBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQUxXLFlBQVksS0FBWixZQUFZLFFBS3ZCO0FBd0ZEOzs7R0FHRztBQUNJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVOzthQUdyQixhQUFRLEdBQUcsNkJBQTZCLEFBQWhDLENBQWlDO2FBQ3pDLDhCQUF5QixHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxBQUFoQixDQUFpQixHQUFDLFlBQVk7YUFDdkQsa0NBQTZCLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLEFBQWpCLENBQWtCLEdBQUMsYUFBYTtJQWtCckYs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