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
var AINativeAuthService_1;
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export const IAINativeSessionAuthService = createDecorator('ainativeAuthService');
/**
 * Authentication state enum
 */
export var AuthState;
(function (AuthState) {
    AuthState["Authenticated"] = "authenticated";
    AuthState["Unauthenticated"] = "unauthenticated";
    AuthState["Refreshing"] = "refreshing";
    AuthState["LoggingOut"] = "loggingOut";
})(AuthState || (AuthState = {}));
/**
 * Error codes for authentication errors
 */
export var AINativeAuthErrorCode;
(function (AINativeAuthErrorCode) {
    AINativeAuthErrorCode["InvalidCredentials"] = "INVALID_CREDENTIALS";
    AINativeAuthErrorCode["NetworkError"] = "NETWORK_ERROR";
    AINativeAuthErrorCode["TokenExpired"] = "TOKEN_EXPIRED";
    AINativeAuthErrorCode["TokenRefreshFailed"] = "TOKEN_REFRESH_FAILED";
    AINativeAuthErrorCode["LogoutFailed"] = "LOGOUT_FAILED";
    AINativeAuthErrorCode["UnknownError"] = "UNKNOWN_ERROR";
})(AINativeAuthErrorCode || (AINativeAuthErrorCode = {}));
/**
 * Custom error class for authentication errors
 */
export class AINativeAuthError extends Error {
    constructor(code, message, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'AINativeAuthError';
    }
}
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
/**
 * AINativeAuthService implementation
 * Handles JWT authentication with encrypted storage and automatic token refresh
 */
let AINativeAuthService = class AINativeAuthService extends Disposable {
    static { AINativeAuthService_1 = this; }
    static { this.API_BASE = 'https://api.ainative.studio'; }
    static { this.STORAGE_KEY_JWT = 'ainative.auth.jwt'; }
    static { this.STORAGE_KEY_REFRESH_TOKEN = 'ainative.auth.refreshToken'; }
    static { this.STORAGE_KEY_USER = 'ainative.auth.user'; }
    constructor(encryptionService, storageService) {
        super();
        this.encryptionService = encryptionService;
        this.storageService = storageService;
        this._onDidChangeAuthState = this._register(new Emitter());
        this.onDidChangeAuthState = this._onDidChangeAuthState.event;
        this._authState = AuthState.Unauthenticated;
        this._accessToken = null;
        this._refreshToken = null;
        this._user = null;
        this._loginInProgress = false;
        this._loadFromStorage();
    }
    /**
     * Load authentication state from encrypted storage
     */
    async _loadFromStorage() {
        try {
            // Load encrypted JWT
            const encryptedJwt = this.storageService.get(AINativeAuthService_1.STORAGE_KEY_JWT, -1 /* StorageScope.APPLICATION */);
            if (encryptedJwt) {
                this._accessToken = await this.encryptionService.decrypt(encryptedJwt);
            }
            // Load encrypted refresh token
            const encryptedRefreshToken = this.storageService.get(AINativeAuthService_1.STORAGE_KEY_REFRESH_TOKEN, -1 /* StorageScope.APPLICATION */);
            if (encryptedRefreshToken) {
                this._refreshToken = await this.encryptionService.decrypt(encryptedRefreshToken);
            }
            // Load user data
            const userData = this.storageService.get(AINativeAuthService_1.STORAGE_KEY_USER, -1 /* StorageScope.APPLICATION */);
            if (userData) {
                this._user = JSON.parse(userData);
            }
            // Update auth state
            if (this._accessToken && this._user) {
                // Check if token is expired
                if (this._isTokenExpired(this._accessToken)) {
                    this._authState = AuthState.Unauthenticated;
                    this._accessToken = null;
                    this._user = null;
                }
                else {
                    this._authState = AuthState.Authenticated;
                }
            }
        }
        catch (error) {
            console.error('[AINativeAuthService] Failed to load from storage:', error);
            this._authState = AuthState.Unauthenticated;
        }
    }
    /**
     * Check if JWT token is expired
     */
    _isTokenExpired(token) {
        try {
            const claims = this._decodeJWT(token);
            const now = Math.floor(Date.now() / 1000);
            return claims.exp < now;
        }
        catch {
            return true;
        }
    }
    /**
     * Decode JWT token to extract claims
     */
    _decodeJWT(token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT token format');
        }
        const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
        return JSON.parse(payload);
    }
    /**
     * Login with email and password
     */
    async login(email, password) {
        // Prevent concurrent login requests
        if (this._loginInProgress) {
            throw new AINativeAuthError(AINativeAuthErrorCode.UnknownError, 'Login already in progress');
        }
        this._loginInProgress = true;
        try {
            const response = await fetch(`${AINativeAuthService_1.API_BASE}/v1/auth/login-json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            if (!response.ok) {
                if (response.status === 401) {
                    const error = new AINativeAuthError(AINativeAuthErrorCode.InvalidCredentials, 'Invalid email or password');
                    return { success: false, error };
                }
                throw new AINativeAuthError(AINativeAuthErrorCode.NetworkError, `HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            // Store tokens and user data
            this._accessToken = data.access_token;
            this._refreshToken = data.refresh_token;
            this._user = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                role: data.user.role,
                createdAt: data.user.created_at,
                updatedAt: data.user.updated_at,
            };
            // Persist to encrypted storage
            await this._saveToStorage();
            // Update auth state
            this._authState = AuthState.Authenticated;
            this._onDidChangeAuthState.fire(this._authState);
            console.log('[AINativeAuthService] Login successful for:', email);
            return {
                success: true,
                accessToken: this._accessToken ?? undefined,
                refreshToken: this._refreshToken ?? undefined,
                user: this._user ?? undefined,
            };
        }
        catch (error) {
            console.error('[AINativeAuthService] Login failed:', error);
            if (error instanceof AINativeAuthError) {
                return { success: false, error };
            }
            const authError = new AINativeAuthError(AINativeAuthErrorCode.NetworkError, 'Network request failed', error);
            return { success: false, error: authError };
        }
        finally {
            this._loginInProgress = false;
        }
    }
    /**
     * Logout and blacklist token
     */
    async logout() {
        this._authState = AuthState.LoggingOut;
        this._onDidChangeAuthState.fire(this._authState);
        try {
            if (this._accessToken) {
                // Call backend to blacklist token
                await fetch(`${AINativeAuthService_1.API_BASE}/v1/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this._accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        }
        catch (error) {
            console.error('[AINativeAuthService] Logout API call failed:', error);
            // Continue with local logout even if backend call fails
        }
        // Clear local state
        this._accessToken = null;
        this._refreshToken = null;
        this._user = null;
        // Clear storage
        this.storageService.remove(AINativeAuthService_1.STORAGE_KEY_JWT, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(AINativeAuthService_1.STORAGE_KEY_REFRESH_TOKEN, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(AINativeAuthService_1.STORAGE_KEY_USER, -1 /* StorageScope.APPLICATION */);
        // Update auth state
        this._authState = AuthState.Unauthenticated;
        this._onDidChangeAuthState.fire(this._authState);
        console.log('[AINativeAuthService] Logout successful');
    }
    /**
     * Refresh expired access token
     */
    async refreshToken() {
        if (!this._refreshToken) {
            throw new AINativeAuthError(AINativeAuthErrorCode.TokenRefreshFailed, 'No refresh token available');
        }
        this._authState = AuthState.Refreshing;
        this._onDidChangeAuthState.fire(this._authState);
        try {
            const response = await fetch(`${AINativeAuthService_1.API_BASE}/v1/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this._refreshToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new AINativeAuthError(AINativeAuthErrorCode.TokenRefreshFailed, `HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            this._accessToken = data.access_token;
            // Update storage
            await this._saveToStorage();
            // Update auth state
            this._authState = AuthState.Authenticated;
            this._onDidChangeAuthState.fire(this._authState);
            console.log('[AINativeAuthService] Token refresh successful');
            return this._accessToken;
        }
        catch (error) {
            console.error('[AINativeAuthService] Token refresh failed:', error);
            // Clear auth state on refresh failure
            this._authState = AuthState.Unauthenticated;
            this._onDidChangeAuthState.fire(this._authState);
            if (error instanceof AINativeAuthError) {
                throw error;
            }
            throw new AINativeAuthError(AINativeAuthErrorCode.TokenRefreshFailed, 'Failed to refresh token', error);
        }
    }
    /**
     * Save tokens and user data to encrypted storage
     */
    async _saveToStorage() {
        try {
            if (this._accessToken) {
                const encryptedJwt = await this.encryptionService.encrypt(this._accessToken);
                this.storageService.store(AINativeAuthService_1.STORAGE_KEY_JWT, encryptedJwt, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
            if (this._refreshToken) {
                const encryptedRefreshToken = await this.encryptionService.encrypt(this._refreshToken);
                this.storageService.store(AINativeAuthService_1.STORAGE_KEY_REFRESH_TOKEN, encryptedRefreshToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
            if (this._user) {
                this.storageService.store(AINativeAuthService_1.STORAGE_KEY_USER, JSON.stringify(this._user), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
        }
        catch (error) {
            console.error('[AINativeAuthService] Failed to save to storage:', error);
            throw new AINativeAuthError(AINativeAuthErrorCode.UnknownError, 'Failed to save authentication data', error);
        }
    }
    /**
     * Get current access token
     */
    getAccessToken() {
        return this._accessToken;
    }
    /**
     * Get current user profile
     */
    getUser() {
        return this._user;
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this._authState === AuthState.Authenticated && this._accessToken !== null;
    }
    /**
     * Get current authentication state
     */
    getAuthState() {
        return this._authState;
    }
};
AINativeAuthService = AINativeAuthService_1 = __decorate([
    __param(0, IEncryptionService),
    __param(1, IStorageService)
], AINativeAuthService);
export { AINativeAuthService };
registerSingleton(IAINativeSessionAuthService, AINativeAuthService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVBdXRoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL2FpbmF0aXZlQXV0aFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFFL0csTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUE4QixxQkFBcUIsQ0FBQyxDQUFDO0FBRS9HOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksU0FLWDtBQUxELFdBQVksU0FBUztJQUNwQiw0Q0FBK0IsQ0FBQTtJQUMvQixnREFBbUMsQ0FBQTtJQUNuQyxzQ0FBeUIsQ0FBQTtJQUN6QixzQ0FBeUIsQ0FBQTtBQUMxQixDQUFDLEVBTFcsU0FBUyxLQUFULFNBQVMsUUFLcEI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLHFCQU9YO0FBUEQsV0FBWSxxQkFBcUI7SUFDaEMsbUVBQTBDLENBQUE7SUFDMUMsdURBQThCLENBQUE7SUFDOUIsdURBQThCLENBQUE7SUFDOUIsb0VBQTJDLENBQUE7SUFDM0MsdURBQThCLENBQUE7SUFDOUIsdURBQThCLENBQUE7QUFDL0IsQ0FBQyxFQVBXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFPaEM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxLQUFLO0lBQzNDLFlBQ2lCLElBQTJCLEVBQzNDLE9BQWUsRUFDQyxhQUFxQjtRQUVyQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFKQyxTQUFJLEdBQUosSUFBSSxDQUF1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