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
export const IAINativeAuthService = createDecorator('ainativeAuthService');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVBdXRoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL2FpbmF0aXZlQXV0aFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU3RixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUM7QUFFakc7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxTQUtYO0FBTEQsV0FBWSxTQUFTO0lBQ3BCLDRDQUErQixDQUFBO0lBQy9CLGdEQUFtQyxDQUFBO0lBQ25DLHNDQUF5QixDQUFBO0lBQ3pCLHNDQUF5QixDQUFBO0FBQzFCLENBQUMsRUFMVyxTQUFTLEtBQVQsU0FBUyxRQUtwQjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVkscUJBT1g7QUFQRCxXQUFZLHFCQUFxQjtJQUNoQyxtRUFBMEMsQ0FBQTtJQUMxQyx1REFBOEIsQ0FBQTtJQUM5Qix1REFBOEIsQ0FBQTtJQUM5QixvRUFBMkMsQ0FBQTtJQUMzQyx1REFBOEIsQ0FBQTtJQUM5Qix1REFBOEIsQ0FBQTtBQUMvQixDQUFDLEVBUFcscUJBQXFCLEtBQXJCLHFCQUFxQixRQU9oQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFrQixTQUFRLEtBQUs7SUFDM0MsWUFDaUIsSUFBMkIsRUFDM0MsT0FBZSxFQUNDLGFBQXFCO1FBRXJDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUpDLFNBQUksR0FBSixJQUFJLENBQXVCO1FBRTNCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBR3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsbUJBQW1CLENBQUM7SUFDakMsQ0FBQztDQUNEO0FBMkZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5Rzs7O0dBR0c7QUFDSSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7O2FBRzFCLGFBQVEsR0FBRyw2QkFBNkIsQUFBaEMsQ0FBaUM7YUFDekMsb0JBQWUsR0FBRyxtQkFBbUIsQUFBdEIsQ0FBdUI7YUFDdEMsOEJBQXlCLEdBQUcsNEJBQTRCLEFBQS9CLENBQWdDO2FBQ3pELHFCQUFnQixHQUFHLG9CQUFvQixBQUF2QixDQUF3QjtJQVdoRSxZQUNxQixpQkFBc0QsRUFDekQsY0FBZ0Q7UUFFakUsS0FBSyxFQUFFLENBQUM7UUFINkIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN4QyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFYakQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBYSxDQUFDLENBQUM7UUFDekUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztRQUV6RCxlQUFVLEdBQWMsU0FBUyxDQUFDLGVBQWUsQ0FBQztRQUNsRCxpQkFBWSxHQUFrQixJQUFJLENBQUM7UUFDbkMsa0JBQWEsR0FBa0IsSUFBSSxDQUFDO1FBQ3BDLFVBQUssR0FBd0IsSUFBSSxDQUFDO1FBQ2xDLHFCQUFnQixHQUFHLEtBQUssQ0FBQztRQU9oQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsZ0JBQWdCO1FBQzdCLElBQUksQ0FBQztZQUNKLHFCQUFxQjtZQUNyQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDM0MscUJBQW1CLENBQUMsZUFBZSxvQ0FFbkMsQ0FBQztZQUVGLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hFLENBQUM7WUFFRCwrQkFBK0I7WUFDL0IsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDcEQscUJBQW1CLENBQUMseUJBQXlCLG9DQUU3QyxDQUFDO1lBRUYsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2xGLENBQUM7WUFFRCxpQkFBaUI7WUFDakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ3ZDLHFCQUFtQixDQUFDLGdCQUFnQixvQ0FFcEMsQ0FBQztZQUVGLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ25DLENBQUM7WUFFRCxvQkFBb0I7WUFDcEIsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckMsNEJBQTRCO2dCQUM1QixJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7b0JBQzdDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUNuQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDO2dCQUMzQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0RBQW9ELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFDO1FBQzdDLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxlQUFlLENBQUMsS0FBYTtRQUNwQyxJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzFDLE9BQU8sTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDekIsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLFVBQVUsQ0FBQyxLQUFhO1FBQy9CLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQWMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQWEsRUFBRSxRQUFnQjtRQUMxQyxvQ0FBb0M7UUFDcEMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixNQUFNLElBQUksaUJBQWlCLENBQzFCLHFCQUFxQixDQUFDLFlBQVksRUFDbEMsMkJBQTJCLENBQzNCLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztRQUU3QixJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLHFCQUFtQixDQUFDLFFBQVEscUJBQXFCLEVBQUU7Z0JBQ2xGLE1BQU0sRUFBRSxNQUFNO2dCQUNkLE9BQU8sRUFBRTtvQkFDUixjQUFjLEVBQUUsa0JBQWtCO2lCQUNsQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQzthQUN6QyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNsQixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQzdCLE1BQU0sS0FBSyxHQUFHLElBQUksaUJBQWlCLENBQ2xDLHFCQUFxQixDQUFDLGtCQUFrQixFQUN4QywyQkFBMkIsQ0FDM0IsQ0FBQztvQkFDRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztnQkFDbEMsQ0FBQztnQkFFRCxNQUFNLElBQUksaUJBQWlCLENBQzFCLHFCQUFxQixDQUFDLFlBQVksRUFDbEMsUUFBUSxRQUFRLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FDakQsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVuQyw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztZQUN4QyxJQUFJLENBQUMsS0FBSyxHQUFHO2dCQUNaLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUs7Z0JBQ3RCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQ3BCLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVU7Z0JBQy9CLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVU7YUFDL0IsQ0FBQztZQUVGLCtCQUErQjtZQUMvQixNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUU1QixvQkFBb0I7WUFDcEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDO1lBQzFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRWpELE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFbEUsT0FBTztnQkFDTixPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVksSUFBSSxTQUFTO2dCQUMzQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsSUFBSSxTQUFTO2dCQUM3QyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssSUFBSSxTQUFTO2FBQzdCLENBQUM7UUFFSCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRTVELElBQUksS0FBSyxZQUFZLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3hDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ2xDLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGlCQUFpQixDQUN0QyxxQkFBcUIsQ0FBQyxZQUFZLEVBQ2xDLHdCQUF3QixFQUN4QixLQUFjLENBQ2QsQ0FBQztZQUNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUM3QyxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsTUFBTTtRQUNYLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQztRQUN2QyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUM7WUFDSixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdkIsa0NBQWtDO2dCQUNsQyxNQUFNLEtBQUssQ0FBQyxHQUFHLHFCQUFtQixDQUFDLFFBQVEsaUJBQWlCLEVBQUU7b0JBQzdELE1BQU0sRUFBRSxNQUFNO29CQUNkLE9BQU8sRUFBRTt3QkFDUixlQUFlLEVBQUUsVUFBVSxJQUFJLENBQUMsWUFBWSxFQUFFO3dCQUM5QyxjQUFjLEVBQUUsa0JBQWtCO3FCQUNsQztpQkFDRCxDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN0RSx3REFBd0Q7UUFDekQsQ0FBQztRQUVELG9CQUFvQjtRQUNwQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUN6QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUVsQixnQkFBZ0I7UUFDaEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMscUJBQW1CLENBQUMsZUFBZSxvQ0FBMkIsQ0FBQztRQUMxRixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxxQkFBbUIsQ0FBQyx5QkFBeUIsb0NBQTJCLENBQUM7UUFDcEcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMscUJBQW1CLENBQUMsZ0JBQWdCLG9DQUEyQixDQUFDO1FBRTNGLG9CQUFvQjtRQUNwQixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUM7UUFDNUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxZQUFZO1FBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsTUFBTSxJQUFJLGlCQUFpQixDQUMxQixxQkFBcUIsQ0FBQyxrQkFBa0IsRUFDeEMsNEJBQTRCLENBQzVCLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRWpELElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcscUJBQW1CLENBQUMsUUFBUSxrQkFBa0IsRUFBRTtnQkFDL0UsTUFBTSxFQUFFLE1BQU07Z0JBQ2QsT0FBTyxFQUFFO29CQUNSLGVBQWUsRUFBRSxVQUFVLElBQUksQ0FBQyxhQUFhLEVBQUU7b0JBQy9DLGNBQWMsRUFBRSxrQkFBa0I7aUJBQ2xDO2FBQ0QsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDbEIsTUFBTSxJQUFJLGlCQUFpQixDQUMxQixxQkFBcUIsQ0FBQyxrQkFBa0IsRUFDeEMsUUFBUSxRQUFRLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FDakQsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7WUFFdEMsaUJBQWlCO1lBQ2pCLE1BQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBRTVCLG9CQUFvQjtZQUNwQixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUM7WUFDMUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1lBRTlELE9BQU8sSUFBSSxDQUFDLFlBQWEsQ0FBQztRQUUzQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRXBFLHNDQUFzQztZQUN0QyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUM7WUFDNUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFakQsSUFBSSxLQUFLLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxLQUFLLENBQUM7WUFDYixDQUFDO1lBRUQsTUFBTSxJQUFJLGlCQUFpQixDQUMxQixxQkFBcUIsQ0FBQyxrQkFBa0IsRUFDeEMseUJBQXlCLEVBQ3pCLEtBQWMsQ0FDZCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxjQUFjO1FBQzNCLElBQUksQ0FBQztZQUNKLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN2QixNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUM3RSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIscUJBQW1CLENBQUMsZUFBZSxFQUNuQyxZQUFZLG1FQUdaLENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3hCLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDdkYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLHFCQUFtQixDQUFDLHlCQUF5QixFQUM3QyxxQkFBcUIsbUVBR3JCLENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixxQkFBbUIsQ0FBQyxnQkFBZ0IsRUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLG1FQUcxQixDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0RBQWtELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDekUsTUFBTSxJQUFJLGlCQUFpQixDQUMxQixxQkFBcUIsQ0FBQyxZQUFZLEVBQ2xDLG9DQUFvQyxFQUNwQyxLQUFjLENBQ2QsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZUFBZTtRQUNkLE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDO0lBQ2xGLENBQUM7SUFFRDs7T0FFRztJQUNILFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQzs7QUF6V1csbUJBQW1CO0lBa0I3QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0dBbkJMLG1CQUFtQixDQTBXL0IifQ==