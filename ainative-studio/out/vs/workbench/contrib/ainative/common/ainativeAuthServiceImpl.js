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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IAINativeAuthService, AuthenticationError, AuthErrorCode } from './ainativeAuthService.js';
/**
 * Storage keys for authentication data
 */
var StorageKeys;
(function (StorageKeys) {
    StorageKeys["JWT_TOKEN"] = "ainative.auth.jwt";
    StorageKeys["REFRESH_TOKEN"] = "ainative.auth.refreshToken";
    StorageKeys["USER_DATA"] = "ainative.auth.user";
})(StorageKeys || (StorageKeys = {}));
/**
 * API endpoints for authentication
 */
var AuthEndpoints;
(function (AuthEndpoints) {
    AuthEndpoints["BASE_URL"] = "https://api.ainative.studio/v1/auth";
    AuthEndpoints["LOGIN"] = "/login-json";
    AuthEndpoints["LOGOUT"] = "/logout";
    AuthEndpoints["REFRESH"] = "/refresh";
    AuthEndpoints["ME"] = "/me";
})(AuthEndpoints || (AuthEndpoints = {}));
/**
 * Implementation of the AINative authentication service
 * Manages user authentication, token storage, and session state
 */
let AINativeAuthService = class AINativeAuthService extends Disposable {
    constructor(encryptionService, storageService) {
        super();
        this.encryptionService = encryptionService;
        this.storageService = storageService;
        this._onDidChangeAuthState = this._register(new Emitter());
        this.onDidChangeAuthState = this._onDidChangeAuthState.event;
        this._currentUser = null;
        this._jwtToken = null;
        this._refreshToken = null;
        this._isAuthenticated = false;
        this._isLoggingIn = false;
        this._loadStoredAuth();
    }
    /**
     * Load authentication data from storage on service initialization
     */
    async _loadStoredAuth() {
        try {
            // Load encrypted tokens
            const encryptedJwt = this.storageService.get("ainative.auth.jwt" /* StorageKeys.JWT_TOKEN */, -1 /* StorageScope.APPLICATION */);
            const encryptedRefresh = this.storageService.get("ainative.auth.refreshToken" /* StorageKeys.REFRESH_TOKEN */, -1 /* StorageScope.APPLICATION */);
            const userDataJson = this.storageService.get("ainative.auth.user" /* StorageKeys.USER_DATA */, -1 /* StorageScope.APPLICATION */);
            if (encryptedJwt && encryptedRefresh && userDataJson) {
                // Decrypt tokens
                this._jwtToken = await this.encryptionService.decrypt(encryptedJwt);
                this._refreshToken = await this.encryptionService.decrypt(encryptedRefresh);
                this._currentUser = JSON.parse(userDataJson);
                // Check if token is still valid
                if (this._isTokenValid(this._jwtToken)) {
                    this._isAuthenticated = true;
                    this._fireAuthStateChange();
                }
                else {
                    // Token expired, try to refresh
                    await this.refreshToken().catch(() => {
                        // Refresh failed, clear auth state
                        this._clearAuthState();
                    });
                }
            }
        }
        catch (error) {
            console.error('Failed to load stored authentication:', error);
            this._clearAuthState();
        }
    }
    /**
     * Check if a JWT token is valid (not expired)
     */
    _isTokenValid(token) {
        try {
            const payload = this._decodeJwt(token);
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            return Date.now() < expirationTime;
        }
        catch {
            return false;
        }
    }
    /**
     * Decode JWT token to extract claims
     */
    _decodeJwt(token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT token format');
        }
        const payload = parts[1];
        const decoded = Buffer.from(payload, 'base64').toString('utf8');
        return JSON.parse(decoded);
    }
    /**
     * Authenticate user with email and password
     */
    async login(email, password) {
        // Prevent concurrent login attempts
        if (this._isLoggingIn) {
            throw new AuthenticationError('Login already in progress', AuthErrorCode.SERVER_ERROR);
        }
        this._isLoggingIn = true;
        try {
            const response = await fetch(`${"https://api.ainative.studio/v1/auth" /* AuthEndpoints.BASE_URL */}${"/login-json" /* AuthEndpoints.LOGIN */}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            if (!response.ok) {
                if (response.status === 401) {
                    throw new AuthenticationError('Invalid email or password', AuthErrorCode.INVALID_CREDENTIALS);
                }
                throw new AuthenticationError(`Login failed: ${response.statusText}`, AuthErrorCode.SERVER_ERROR);
            }
            const data = await response.json();
            // Store tokens securely
            const encryptedJwt = await this.encryptionService.encrypt(data.token);
            const encryptedRefresh = await this.encryptionService.encrypt(data.refreshToken);
            this.storageService.store("ainative.auth.jwt" /* StorageKeys.JWT_TOKEN */, encryptedJwt, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store("ainative.auth.refreshToken" /* StorageKeys.REFRESH_TOKEN */, encryptedRefresh, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store("ainative.auth.user" /* StorageKeys.USER_DATA */, JSON.stringify(data.user), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Update in-memory state
            this._jwtToken = data.token;
            this._refreshToken = data.refreshToken;
            this._currentUser = data.user;
            this._isAuthenticated = true;
            // Fire auth state change event
            this._fireAuthStateChange();
            return {
                success: true,
                user: data.user,
                token: data.token,
                refreshToken: data.refreshToken
            };
        }
        catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }
            // Network or other errors
            throw new AuthenticationError(error instanceof Error ? error.message : 'Login failed', AuthErrorCode.NETWORK_ERROR);
        }
        finally {
            this._isLoggingIn = false;
        }
    }
    /**
     * Log out the current user
     */
    async logout() {
        try {
            // Call logout endpoint if authenticated
            if (this._jwtToken) {
                await fetch(`${"https://api.ainative.studio/v1/auth" /* AuthEndpoints.BASE_URL */}${"/logout" /* AuthEndpoints.LOGOUT */}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this._jwtToken}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(error => {
                    // Log error but continue with local logout
                    console.warn('Logout API call failed:', error);
                });
            }
        }
        finally {
            // Always clear local auth state
            this._clearAuthState();
            this._fireAuthStateChange();
        }
    }
    /**
     * Refresh the access token using the refresh token
     */
    async refreshToken() {
        if (!this._refreshToken) {
            throw new AuthenticationError('No refresh token available', AuthErrorCode.REFRESH_FAILED);
        }
        try {
            const response = await fetch(`${"https://api.ainative.studio/v1/auth" /* AuthEndpoints.BASE_URL */}${"/refresh" /* AuthEndpoints.REFRESH */}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: this._refreshToken
                })
            });
            if (!response.ok) {
                if (response.status === 401) {
                    throw new AuthenticationError('Refresh token expired', AuthErrorCode.TOKEN_EXPIRED);
                }
                throw new AuthenticationError('Token refresh failed', AuthErrorCode.REFRESH_FAILED);
            }
            const data = await response.json();
            // Update stored JWT token
            const encryptedJwt = await this.encryptionService.encrypt(data.token);
            this.storageService.store("ainative.auth.jwt" /* StorageKeys.JWT_TOKEN */, encryptedJwt, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this._jwtToken = data.token;
            this._fireAuthStateChange();
        }
        catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError(error instanceof Error ? error.message : 'Token refresh failed', AuthErrorCode.NETWORK_ERROR);
        }
    }
    /**
     * Get the currently authenticated user
     */
    async getCurrentUser() {
        // Return cached user if available
        if (this._currentUser) {
            return this._currentUser;
        }
        // If authenticated but no cached user, fetch from API
        if (this._isAuthenticated && this._jwtToken) {
            try {
                const response = await fetch(`${"https://api.ainative.studio/v1/auth" /* AuthEndpoints.BASE_URL */}${"/me" /* AuthEndpoints.ME */}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this._jwtToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new AuthenticationError('Failed to fetch user profile', AuthErrorCode.SERVER_ERROR);
                }
                const user = await response.json();
                this._currentUser = user;
                this.storageService.store("ainative.auth.user" /* StorageKeys.USER_DATA */, JSON.stringify(user), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                return user;
            }
            catch (error) {
                console.error('Failed to fetch current user:', error);
                return null;
            }
        }
        return null;
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this._isAuthenticated && this._jwtToken !== null;
    }
    /**
     * Get the current auth token
     */
    getAuthToken() {
        return this._jwtToken;
    }
    /**
     * Clear authentication state
     */
    _clearAuthState() {
        this._jwtToken = null;
        this._refreshToken = null;
        this._currentUser = null;
        this._isAuthenticated = false;
        // Clear storage
        this.storageService.remove("ainative.auth.jwt" /* StorageKeys.JWT_TOKEN */, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove("ainative.auth.refreshToken" /* StorageKeys.REFRESH_TOKEN */, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove("ainative.auth.user" /* StorageKeys.USER_DATA */, -1 /* StorageScope.APPLICATION */);
    }
    /**
     * Fire authentication state change event
     */
    _fireAuthStateChange() {
        this._onDidChangeAuthState.fire({
            isAuthenticated: this._isAuthenticated,
            user: this._currentUser
        });
    }
    dispose() {
        super.dispose();
    }
};
AINativeAuthService = __decorate([
    __param(0, IEncryptionService),
    __param(1, IStorageService)
], AINativeAuthService);
export { AINativeAuthService };
// Register service as singleton
registerSingleton(IAINativeAuthService, AINativeAuthService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVBdXRoU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9haW5hdGl2ZUF1dGhTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFDTixvQkFBb0IsRUFJcEIsbUJBQW1CLEVBQ25CLGFBQWEsRUFDYixNQUFNLDBCQUEwQixDQUFDO0FBRWxDOztHQUVHO0FBQ0gsSUFBVyxXQUlWO0FBSkQsV0FBVyxXQUFXO0lBQ3JCLDhDQUErQixDQUFBO0lBQy9CLDJEQUE0QyxDQUFBO0lBQzVDLCtDQUFnQyxDQUFBO0FBQ2pDLENBQUMsRUFKVSxXQUFXLEtBQVgsV0FBVyxRQUlyQjtBQUVEOztHQUVHO0FBQ0gsSUFBVyxhQU1WO0FBTkQsV0FBVyxhQUFhO0lBQ3ZCLGlFQUFnRCxDQUFBO0lBQ2hELHNDQUFxQixDQUFBO0lBQ3JCLG1DQUFrQixDQUFBO0lBQ2xCLHFDQUFvQixDQUFBO0lBQ3BCLDJCQUFVLENBQUE7QUFDWCxDQUFDLEVBTlUsYUFBYSxLQUFiLGFBQWEsUUFNdkI7QUFFRDs7O0dBR0c7QUFDSSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7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