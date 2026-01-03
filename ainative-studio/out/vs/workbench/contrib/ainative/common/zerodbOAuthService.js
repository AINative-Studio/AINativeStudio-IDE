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
var ZeroDBOAuthService_1;
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export const IZeroDBOAuthService = createDecorator('zerodbOAuthService');
/**
 * Supported OAuth providers
 */
export var OAuthProvider;
(function (OAuthProvider) {
    OAuthProvider["Google"] = "google";
    OAuthProvider["GitHub"] = "github";
    OAuthProvider["AINative"] = "ainative";
})(OAuthProvider || (OAuthProvider = {}));
/**
 * OAuth error codes
 */
export var OAuthErrorCode;
(function (OAuthErrorCode) {
    OAuthErrorCode["InvalidState"] = "invalid_state";
    OAuthErrorCode["StateExpired"] = "state_expired";
    OAuthErrorCode["UserDenied"] = "access_denied";
    OAuthErrorCode["InvalidCode"] = "invalid_code";
    OAuthErrorCode["CodeExchangeFailed"] = "code_exchange_failed";
    OAuthErrorCode["NetworkError"] = "network_error";
    OAuthErrorCode["UnsupportedProvider"] = "unsupported_provider";
    OAuthErrorCode["PKCENotSupported"] = "pkce_not_supported";
    OAuthErrorCode["UnknownError"] = "unknown_error";
})(OAuthErrorCode || (OAuthErrorCode = {}));
/**
 * Custom OAuth error class
 */
export class OAuthError extends Error {
    constructor(code, message, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'OAuthError';
    }
}
/**
 * ZeroDBOAuthService implementation
 * Implements OAuth 2.0 authorization code flow with PKCE support
 */
let ZeroDBOAuthService = class ZeroDBOAuthService extends Disposable {
    static { ZeroDBOAuthService_1 = this; }
    static { this.API_BASE = 'https://api.ainative.studio'; }
    static { this.REDIRECT_URI_BASE = 'ainativestudio://auth/callback'; }
    static { this.STATE_EXPIRY_MS = 10 * 60 * 1000; } // 10 minutes
    static { this.STORAGE_KEY_STATE = 'ainative.oauth.zerodb.state'; }
    static { this.STORAGE_KEY_VERIFIER = 'ainative.oauth.zerodb.verifier'; }
    static { this.STORAGE_KEY_PROVIDER = 'ainative.oauth.zerodb.provider'; }
    static { this.STORAGE_KEY_TIMESTAMP = 'ainative.oauth.zerodb.timestamp'; }
    static { this.STORAGE_KEY_RETURN_URL = 'ainative.oauth.zerodb.returnUrl'; }
    constructor(storageService) {
        super();
        this.storageService = storageService;
        // Provider configurations
        this.providerConfigs = new Map([
            [OAuthProvider.Google, {
                    provider: OAuthProvider.Google,
                    clientId: process.env.AINATIVE_GOOGLE_CLIENT_ID || '',
                    redirectUri: `${ZeroDBOAuthService_1.REDIRECT_URI_BASE}/google`,
                    scope: ['openid', 'profile', 'email'],
                    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                    tokenEndpoint: 'https://oauth2.googleapis.com/token',
                    supportsPKCE: true
                }],
            [OAuthProvider.GitHub, {
                    provider: OAuthProvider.GitHub,
                    clientId: process.env.AINATIVE_GITHUB_CLIENT_ID || 'Ov23liU7x20VoRInkAiq',
                    redirectUri: `${ZeroDBOAuthService_1.REDIRECT_URI_BASE}/github`,
                    scope: ['read:user', 'user:email'],
                    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
                    tokenEndpoint: 'https://github.com/login/oauth/access_token',
                    supportsPKCE: false // GitHub doesn't support PKCE for OAuth Apps
                }],
            [OAuthProvider.AINative, {
                    provider: OAuthProvider.AINative,
                    clientId: process.env.AINATIVE_CLIENT_ID || '',
                    redirectUri: `${ZeroDBOAuthService_1.REDIRECT_URI_BASE}/ainative`,
                    scope: ['openid', 'profile', 'email', 'zerodb'],
                    authorizationEndpoint: `${ZeroDBOAuthService_1.API_BASE}/v1/auth/oauth/authorize`,
                    tokenEndpoint: `${ZeroDBOAuthService_1.API_BASE}/v1/auth/oauth/token`,
                    supportsPKCE: true
                }]
        ]);
        this._onDidInitiateOAuth = this._register(new Emitter());
        this.onDidInitiateOAuth = this._onDidInitiateOAuth.event;
        this._onDidCompleteAuth = this._register(new Emitter());
        this.onDidCompleteAuth = this._onDidCompleteAuth.event;
        this._onDidCancelOAuth = this._register(new Emitter());
        this.onDidCancelOAuth = this._onDidCancelOAuth.event;
    }
    /**
     * Generate cryptographically secure random state token
     */
    _generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    /**
     * Generate PKCE code verifier and challenge
     * Uses SHA-256 for code challenge as per RFC 7636
     */
    async _generatePKCE() {
        // Check if crypto.subtle is available (required for PKCE)
        if (typeof crypto === 'undefined' || !crypto.subtle) {
            console.warn('[ZeroDBOAuthService] crypto.subtle not available, PKCE disabled');
            return null;
        }
        try {
            // Generate code verifier (43-128 characters, base64url encoded)
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const verifier = this._base64URLEncode(array);
            // Generate code challenge (SHA-256 hash of verifier)
            const encoder = new TextEncoder();
            const data = encoder.encode(verifier);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const challenge = this._base64URLEncode(new Uint8Array(hashBuffer));
            return { verifier, challenge };
        }
        catch (error) {
            console.error('[ZeroDBOAuthService] Failed to generate PKCE:', error);
            return null;
        }
    }
    /**
     * Base64URL encode bytes (URL-safe base64 without padding)
     */
    _base64URLEncode(bytes) {
        const base64 = btoa(String.fromCharCode(...bytes));
        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
    /**
     * Build authorization URL with parameters
     */
    _buildAuthorizationUrl(config, state, pkceData) {
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            state,
            scope: config.scope.join(' ')
        });
        // Add PKCE parameters if available and supported
        if (pkceData && config.supportsPKCE) {
            params.append('code_challenge', pkceData.challenge);
            params.append('code_challenge_method', 'S256');
        }
        return `${config.authorizationEndpoint}?${params.toString()}`;
    }
    /**
     * Initiate OAuth flow for specified provider
     */
    async initiateOAuthFlow(provider, returnUrl) {
        // Get provider configuration
        const config = this.providerConfigs.get(provider);
        if (!config) {
            throw new OAuthError(OAuthErrorCode.UnsupportedProvider, `Unsupported OAuth provider: ${provider}`);
        }
        // Validate client ID is configured
        if (!config.clientId) {
            throw new OAuthError(OAuthErrorCode.UnsupportedProvider, `OAuth client ID not configured for provider: ${provider}`);
        }
        // Generate CSRF state token
        const state = this._generateState();
        const timestamp = Date.now();
        // Generate PKCE code verifier and challenge (if supported)
        let pkceData = null;
        if (config.supportsPKCE) {
            pkceData = await this._generatePKCE();
            if (!pkceData) {
                console.warn('[ZeroDBOAuthService] PKCE generation failed, continuing without PKCE');
            }
        }
        // Build authorization URL
        const authUrl = this._buildAuthorizationUrl(config, state, pkceData);
        // Store OAuth state
        this.storageService.store(ZeroDBOAuthService_1.STORAGE_KEY_STATE, state, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this.storageService.store(ZeroDBOAuthService_1.STORAGE_KEY_PROVIDER, provider, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this.storageService.store(ZeroDBOAuthService_1.STORAGE_KEY_TIMESTAMP, timestamp, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        if (pkceData) {
            this.storageService.store(ZeroDBOAuthService_1.STORAGE_KEY_VERIFIER, pkceData.verifier, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        if (returnUrl) {
            this.storageService.store(ZeroDBOAuthService_1.STORAGE_KEY_RETURN_URL, returnUrl, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        // Emit event
        const oauthState = {
            state,
            codeVerifier: pkceData?.verifier,
            provider,
            timestamp,
            returnUrl
        };
        this._onDidInitiateOAuth.fire(oauthState);
        console.log(`[ZeroDBOAuthService] OAuth flow initiated for provider: ${provider}`);
        return { authUrl, state };
    }
    /**
     * Handle OAuth callback
     */
    async handleCallback(params) {
        try {
            // Check for errors from authorization server
            if (params.error) {
                const errorCode = params.error;
                const errorMessage = params.errorDescription || params.error;
                const result = {
                    success: false,
                    error: errorMessage,
                    errorCode: errorCode
                };
                this._onDidCompleteAuth.fire(result);
                this._clearState();
                return result;
            }
            // Retrieve stored OAuth state
            const storedState = this.storageService.get(ZeroDBOAuthService_1.STORAGE_KEY_STATE, -1 /* StorageScope.APPLICATION */);
            const storedProvider = this.storageService.get(ZeroDBOAuthService_1.STORAGE_KEY_PROVIDER, -1 /* StorageScope.APPLICATION */);
            const storedTimestamp = this.storageService.getNumber(ZeroDBOAuthService_1.STORAGE_KEY_TIMESTAMP, -1 /* StorageScope.APPLICATION */, 0);
            const storedVerifier = this.storageService.get(ZeroDBOAuthService_1.STORAGE_KEY_VERIFIER, -1 /* StorageScope.APPLICATION */);
            // Validate state token (CSRF protection)
            if (!storedState || storedState !== params.state) {
                const result = {
                    success: false,
                    error: 'Invalid state token - CSRF protection failed',
                    errorCode: OAuthErrorCode.InvalidState
                };
                this._onDidCompleteAuth.fire(result);
                this._clearState();
                return result;
            }
            // Check state expiry
            if (Date.now() - storedTimestamp > ZeroDBOAuthService_1.STATE_EXPIRY_MS) {
                const result = {
                    success: false,
                    error: 'OAuth state expired - please try again',
                    errorCode: OAuthErrorCode.StateExpired
                };
                this._onDidCompleteAuth.fire(result);
                this._clearState();
                return result;
            }
            // Validate provider
            if (!storedProvider) {
                const result = {
                    success: false,
                    error: 'OAuth provider not found in state',
                    errorCode: OAuthErrorCode.UnknownError
                };
                this._onDidCompleteAuth.fire(result);
                this._clearState();
                return result;
            }
            // Exchange authorization code for access token
            const tokenResult = await this._exchangeCode(params.code, storedProvider, storedVerifier);
            // Clear stored state
            this._clearState();
            // Fire completion event
            this._onDidCompleteAuth.fire(tokenResult);
            if (tokenResult.success) {
                console.log(`[ZeroDBOAuthService] OAuth callback successful for provider: ${storedProvider}`);
            }
            else {
                console.error('[ZeroDBOAuthService] OAuth callback failed:', tokenResult.error);
            }
            return tokenResult;
        }
        catch (error) {
            console.error('[ZeroDBOAuthService] OAuth callback failed:', error);
            const result = {
                success: false,
                error: error instanceof Error ? error.message : 'OAuth callback failed',
                errorCode: OAuthErrorCode.UnknownError
            };
            this._onDidCompleteAuth.fire(result);
            this._clearState();
            return result;
        }
    }
    /**
     * Exchange authorization code for access token
     */
    async _exchangeCode(code, provider, codeVerifier) {
        try {
            // Exchange code via AINative backend (acts as OAuth proxy)
            // This is more secure than doing it directly in the client
            const response = await fetch(`${ZeroDBOAuthService_1.API_BASE}/v1/auth/oauth/${provider}/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code,
                    code_verifier: codeVerifier
                })
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                return {
                    success: false,
                    error: `Token exchange failed: ${errorText}`,
                    errorCode: OAuthErrorCode.CodeExchangeFailed
                };
            }
            const data = await response.json();
            return {
                success: true,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    role: data.user.role,
                    createdAt: data.user.created_at,
                    updatedAt: data.user.updated_at
                }
            };
        }
        catch (error) {
            console.error('[ZeroDBOAuthService] Code exchange failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error during token exchange',
                errorCode: OAuthErrorCode.NetworkError
            };
        }
    }
    /**
     * Cancel ongoing OAuth flow
     */
    cancelOAuthFlow() {
        this._clearState();
        this._onDidCancelOAuth.fire();
        console.log('[ZeroDBOAuthService] OAuth flow cancelled');
    }
    /**
     * Check if OAuth flow is in progress
     */
    isOAuthInProgress() {
        const storedState = this.storageService.get(ZeroDBOAuthService_1.STORAGE_KEY_STATE, -1 /* StorageScope.APPLICATION */);
        const storedTimestamp = this.storageService.getNumber(ZeroDBOAuthService_1.STORAGE_KEY_TIMESTAMP, -1 /* StorageScope.APPLICATION */, 0);
        if (!storedState || !storedTimestamp) {
            return false;
        }
        // Check if state has expired
        if (Date.now() - storedTimestamp > ZeroDBOAuthService_1.STATE_EXPIRY_MS) {
            this._clearState();
            return false;
        }
        return true;
    }
    /**
     * Get provider configuration
     */
    getProviderConfig(provider) {
        const config = this.providerConfigs.get(provider);
        if (!config) {
            throw new OAuthError(OAuthErrorCode.UnsupportedProvider, `Unsupported OAuth provider: ${provider}`);
        }
        return config;
    }
    /**
     * Clear stored OAuth state
     */
    _clearState() {
        this.storageService.remove(ZeroDBOAuthService_1.STORAGE_KEY_STATE, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(ZeroDBOAuthService_1.STORAGE_KEY_PROVIDER, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(ZeroDBOAuthService_1.STORAGE_KEY_TIMESTAMP, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(ZeroDBOAuthService_1.STORAGE_KEY_VERIFIER, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(ZeroDBOAuthService_1.STORAGE_KEY_RETURN_URL, -1 /* StorageScope.APPLICATION */);
    }
};
ZeroDBOAuthService = ZeroDBOAuthService_1 = __decorate([
    __param(0, IStorageService)
], ZeroDBOAuthService);
export { ZeroDBOAuthService };
// Register service as singleton
registerSingleton(IZeroDBOAuthService, ZeroDBOAuthService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemVyb2RiT0F1dGhTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vemVyb2RiT0F1dGhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUcvRyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUM7QUFFOUY7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxhQUlYO0FBSkQsV0FBWSxhQUFhO0lBQ3hCLGtDQUFpQixDQUFBO0lBQ2pCLGtDQUFpQixDQUFBO0lBQ2pCLHNDQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFKVyxhQUFhLEtBQWIsYUFBYSxRQUl4QjtBQXdERDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGNBVVg7QUFWRCxXQUFZLGNBQWM7SUFDekIsZ0RBQThCLENBQUE7SUFDOUIsZ0RBQThCLENBQUE7SUFDOUIsOENBQTRCLENBQUE7SUFDNUIsOENBQTRCLENBQUE7SUFDNUIsNkRBQTJDLENBQUE7SUFDM0MsZ0RBQThCLENBQUE7SUFDOUIsOERBQTRDLENBQUE7SUFDNUMseURBQXVDLENBQUE7SUFDdkMsZ0RBQThCLENBQUE7QUFDL0IsQ0FBQyxFQVZXLGNB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