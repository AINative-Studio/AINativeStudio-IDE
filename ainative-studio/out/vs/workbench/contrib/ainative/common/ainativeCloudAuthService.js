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
var AINativeCloudAuthService_1;
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IAINativeCloudAuthService, CloudAuthState, CloudAuthError, CloudAuthErrorCode } from './ainativeCloudAuthTypes.js';
import { AINativeSDKClient } from './ainativeSDKClient.js';
/**
 * AINativeCloudAuthService implementation
 * Handles cloud authentication with encrypted storage and automatic token refresh
 *
 * This service is separate from the ZeroDB authentication service (ainativeAuthService)
 * and uses different storage keys to avoid conflicts.
 */
let AINativeCloudAuthService = class AINativeCloudAuthService extends Disposable {
    static { AINativeCloudAuthService_1 = this; }
    // Storage keys - prefixed with 'cloud' to avoid conflicts with ZeroDB auth
    static { this.STORAGE_KEY_ACCESS_TOKEN = 'ainative.cloud.auth.accessToken'; }
    static { this.STORAGE_KEY_REFRESH_TOKEN = 'ainative.cloud.auth.refreshToken'; }
    static { this.STORAGE_KEY_USER = 'ainative.cloud.auth.user'; }
    constructor(encryptionService, storageService) {
        super();
        this.encryptionService = encryptionService;
        this.storageService = storageService;
        this._onDidChangeAuthState = this._register(new Emitter());
        this.onDidChangeAuthState = this._onDidChangeAuthState.event;
        this._onDidUpdateUser = this._register(new Emitter());
        this.onDidUpdateUser = this._onDidUpdateUser.event;
        this._authState = CloudAuthState.Unauthenticated;
        this._accessToken = null;
        this._refreshToken = null;
        this._user = null;
        this._operationInProgress = false;
        this._apiClient = new AINativeSDKClient();
        this._loadFromStorage();
    }
    /**
     * Load authentication state from encrypted storage
     */
    async _loadFromStorage() {
        try {
            // Load encrypted access token
            const encryptedAccessToken = this.storageService.get(AINativeCloudAuthService_1.STORAGE_KEY_ACCESS_TOKEN, -1 /* StorageScope.APPLICATION */);
            if (encryptedAccessToken) {
                this._accessToken = await this.encryptionService.decrypt(encryptedAccessToken);
            }
            // Load encrypted refresh token
            const encryptedRefreshToken = this.storageService.get(AINativeCloudAuthService_1.STORAGE_KEY_REFRESH_TOKEN, -1 /* StorageScope.APPLICATION */);
            if (encryptedRefreshToken) {
                this._refreshToken = await this.encryptionService.decrypt(encryptedRefreshToken);
            }
            // Load user data
            const userData = this.storageService.get(AINativeCloudAuthService_1.STORAGE_KEY_USER, -1 /* StorageScope.APPLICATION */);
            if (userData) {
                this._user = JSON.parse(userData);
            }
            // Update auth state
            if (this._accessToken && this._user) {
                // Check if token is expired
                if (this._isTokenExpired(this._accessToken)) {
                    // Try to refresh token
                    if (this._refreshToken) {
                        try {
                            await this.refreshToken();
                        }
                        catch {
                            // Refresh failed, mark as unauthenticated
                            this._authState = CloudAuthState.Unauthenticated;
                            this._clearAuthData();
                        }
                    }
                    else {
                        this._authState = CloudAuthState.Unauthenticated;
                        this._clearAuthData();
                    }
                }
                else {
                    this._authState = CloudAuthState.Authenticated;
                    this._onDidChangeAuthState.fire(this._authState);
                }
            }
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Failed to load from storage:', error);
            this._authState = CloudAuthState.Unauthenticated;
        }
    }
    /**
     * Register a new user account
     */
    async register(request) {
        this._ensureNotInProgress();
        this._operationInProgress = true;
        this._authState = CloudAuthState.Registering;
        this._onDidChangeAuthState.fire(this._authState);
        try {
            // Validate password strength (min 8 characters)
            if (request.password.length < 8) {
                const error = new CloudAuthError(CloudAuthErrorCode.WeakPassword, 'Password must be at least 8 characters long');
                return { success: false, error };
            }
            // Validate email format
            if (!this._isValidEmail(request.email)) {
                const error = new CloudAuthError(CloudAuthErrorCode.UnknownError, 'Invalid email format');
                return { success: false, error };
            }
            const response = await this._apiClient.register(request.username, request.email, request.password, request.name);
            // Store tokens and user data
            this._accessToken = response.data.access_token;
            this._refreshToken = response.data.refresh_token || null;
            this._user = this._mapUserInfoToCloudUser(response.data.user);
            // Persist to encrypted storage
            await this._saveToStorage();
            // Update auth state
            this._authState = CloudAuthState.Authenticated;
            this._onDidChangeAuthState.fire(this._authState);
            this._onDidUpdateUser.fire(this._user);
            console.log('[AINativeCloudAuthService] Registration successful for:', request.email);
            return {
                success: true,
                accessToken: this._accessToken,
                refreshToken: this._refreshToken || undefined,
                user: this._user,
                requiresEmailVerification: !this._user.emailVerified
            };
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Registration failed:', error);
            // Update auth state back to unauthenticated
            this._authState = CloudAuthState.Unauthenticated;
            this._onDidChangeAuthState.fire(this._authState);
            if (error instanceof CloudAuthError) {
                return { success: false, error };
            }
            const authError = new CloudAuthError(CloudAuthErrorCode.RegistrationFailed, 'Registration failed', error);
            return { success: false, error: authError };
        }
        finally {
            this._operationInProgress = false;
        }
    }
    /**
     * Login with email and password
     */
    async login(email, password) {
        this._ensureNotInProgress();
        this._operationInProgress = true;
        try {
            const response = await this._apiClient.login(email, password);
            // Store tokens and user data
            this._accessToken = response.data.access_token;
            this._refreshToken = response.data.refresh_token || null;
            this._user = this._mapUserInfoToCloudUser(response.data.user);
            // Persist to encrypted storage
            await this._saveToStorage();
            // Update auth state
            this._authState = CloudAuthState.Authenticated;
            this._onDidChangeAuthState.fire(this._authState);
            this._onDidUpdateUser.fire(this._user);
            console.log('[AINativeCloudAuthService] Login successful for:', email);
            return {
                success: true,
                accessToken: this._accessToken,
                refreshToken: this._refreshToken || undefined,
                user: this._user
            };
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Login failed:', error);
            if (error instanceof CloudAuthError) {
                return { success: false, error };
            }
            const authError = new CloudAuthError(CloudAuthErrorCode.NetworkError, 'Login failed', error);
            return { success: false, error: authError };
        }
        finally {
            this._operationInProgress = false;
        }
    }
    /**
     * Logout and blacklist token
     */
    async logout() {
        this._authState = CloudAuthState.LoggingOut;
        this._onDidChangeAuthState.fire(this._authState);
        try {
            if (this._accessToken) {
                // Call backend to blacklist token
                await this._apiClient.logout(this._accessToken);
            }
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Logout API call failed:', error);
            // Continue with local logout even if backend call fails
        }
        // Clear local state and storage
        this._clearAuthData();
        // Update auth state
        this._authState = CloudAuthState.Unauthenticated;
        this._onDidChangeAuthState.fire(this._authState);
        console.log('[AINativeCloudAuthService] Logout successful');
    }
    /**
     * Request password reset email
     */
    async requestPasswordReset(email) {
        this._authState = CloudAuthState.ResettingPassword;
        this._onDidChangeAuthState.fire(this._authState);
        try {
            const response = await this._apiClient.forgotPassword(email);
            this._authState = this._accessToken ? CloudAuthState.Authenticated : CloudAuthState.Unauthenticated;
            this._onDidChangeAuthState.fire(this._authState);
            return {
                success: true,
                message: response.data.message
            };
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Password reset request failed:', error);
            this._authState = this._accessToken ? CloudAuthState.Authenticated : CloudAuthState.Unauthenticated;
            this._onDidChangeAuthState.fire(this._authState);
            if (error instanceof CloudAuthError) {
                return { success: false, error };
            }
            const authError = new CloudAuthError(CloudAuthErrorCode.PasswordResetFailed, 'Failed to request password reset', error);
            return { success: false, error: authError };
        }
    }
    /**
     * Confirm password reset with token
     */
    async confirmPasswordReset(token, newPassword) {
        // Validate password strength
        if (newPassword.length < 8) {
            const error = new CloudAuthError(CloudAuthErrorCode.WeakPassword, 'Password must be at least 8 characters long');
            return { success: false, error };
        }
        this._authState = CloudAuthState.ResettingPassword;
        this._onDidChangeAuthState.fire(this._authState);
        try {
            const response = await this._apiClient.resetPassword(token, newPassword);
            this._authState = this._accessToken ? CloudAuthState.Authenticated : CloudAuthState.Unauthenticated;
            this._onDidChangeAuthState.fire(this._authState);
            return {
                success: true,
                message: response.data.message
            };
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Password reset confirmation failed:', error);
            this._authState = this._accessToken ? CloudAuthState.Authenticated : CloudAuthState.Unauthenticated;
            this._onDidChangeAuthState.fire(this._authState);
            if (error instanceof CloudAuthError) {
                return { success: false, error };
            }
            const authError = new CloudAuthError(CloudAuthErrorCode.PasswordResetFailed, 'Failed to reset password', error);
            return { success: false, error: authError };
        }
    }
    /**
     * Change password for authenticated user
     */
    async changePassword(currentPassword, newPassword) {
        if (!this._accessToken) {
            const error = new CloudAuthError(CloudAuthErrorCode.InvalidCredentials, 'Not authenticated');
            return { success: false, error };
        }
        // Validate password strength
        if (newPassword.length < 8) {
            const error = new CloudAuthError(CloudAuthErrorCode.WeakPassword, 'Password must be at least 8 characters long');
            return { success: false, error };
        }
        try {
            const response = await this._apiClient.changePassword(this._accessToken, currentPassword, newPassword);
            return {
                success: true,
                message: response.data.message
            };
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Password change failed:', error);
            if (error instanceof CloudAuthError) {
                return { success: false, error };
            }
            const authError = new CloudAuthError(CloudAuthErrorCode.PasswordResetFailed, 'Failed to change password', error);
            return { success: false, error: authError };
        }
    }
    /**
     * Refresh expired access token
     */
    async refreshToken() {
        if (!this._refreshToken) {
            throw new CloudAuthError(CloudAuthErrorCode.TokenRefreshFailed, 'No refresh token available');
        }
        this._authState = CloudAuthState.Refreshing;
        this._onDidChangeAuthState.fire(this._authState);
        try {
            const response = await this._apiClient.refreshToken(this._refreshToken);
            this._accessToken = response.data.access_token;
            // Update refresh token if provided
            if (response.data.refresh_token) {
                this._refreshToken = response.data.refresh_token;
            }
            // Update storage
            await this._saveToStorage();
            // Update auth state
            this._authState = CloudAuthState.Authenticated;
            this._onDidChangeAuthState.fire(this._authState);
            console.log('[AINativeCloudAuthService] Token refresh successful');
            return this._accessToken;
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Token refresh failed:', error);
            // Clear auth state on refresh failure
            this._clearAuthData();
            this._authState = CloudAuthState.Unauthenticated;
            this._onDidChangeAuthState.fire(this._authState);
            if (error instanceof CloudAuthError) {
                throw error;
            }
            throw new CloudAuthError(CloudAuthErrorCode.TokenRefreshFailed, 'Failed to refresh token', error);
        }
    }
    /**
     * Validate a JWT token
     */
    async validateToken(token) {
        try {
            const response = await this._apiClient.verifyToken(token);
            if (response.data.valid && response.data.user) {
                return {
                    valid: true,
                    userId: response.data.user.id,
                    email: response.data.user.email,
                    role: response.data.user.role,
                    expiresAt: response.data.exp
                };
            }
            return {
                valid: false,
                error: 'Token is invalid'
            };
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Token validation failed:', error);
            return {
                valid: false,
                error: error instanceof CloudAuthError ? error.message : 'Token validation failed'
            };
        }
    }
    /**
     * Get current access token (refreshes if expired)
     */
    async getAccessToken() {
        if (!this._accessToken) {
            return null;
        }
        // Check if token is expired and refresh if needed
        if (this._isTokenExpired(this._accessToken)) {
            if (this._refreshToken) {
                try {
                    return await this.refreshToken();
                }
                catch (error) {
                    console.error('[AINativeCloudAuthService] Auto-refresh failed:', error);
                    return null;
                }
            }
            return null;
        }
        return this._accessToken;
    }
    /**
     * Get current access token (without auto-refresh)
     */
    getAccessTokenSync() {
        return this._accessToken;
    }
    /**
     * Get current user profile (fetches from API if needed)
     */
    async getCurrentUser() {
        if (!this._accessToken) {
            return null;
        }
        // Return cached user if available
        if (this._user) {
            return this._user;
        }
        // Fetch user from API
        try {
            const response = await this._apiClient.getCurrentUser(this._accessToken);
            this._user = this._mapUserInfoToCloudUser(response.data);
            // Update storage
            await this._saveToStorage();
            this._onDidUpdateUser.fire(this._user);
            return this._user;
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Failed to fetch user:', error);
            return null;
        }
    }
    /**
     * Get cached user profile (synchronous)
     */
    getUser() {
        return this._user;
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this._authState === CloudAuthState.Authenticated && this._accessToken !== null;
    }
    /**
     * Get current authentication state
     */
    getAuthState() {
        return this._authState;
    }
    /**
     * Request email verification resend
     */
    async resendEmailVerification(email) {
        try {
            const response = await this._apiClient.resendEmailVerification(email);
            return {
                success: true,
                message: response.data.message
            };
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Resend verification failed:', error);
            if (error instanceof CloudAuthError) {
                return { success: false, error };
            }
            const authError = new CloudAuthError(CloudAuthErrorCode.UnknownError, 'Failed to resend verification email', error);
            return { success: false, error: authError };
        }
    }
    /**
     * Verify email with token
     */
    async verifyEmail(token) {
        try {
            const response = await this._apiClient.verifyEmail(token);
            // Update user data if authenticated
            if (this._user) {
                this._user = { ...this._user, emailVerified: true };
                await this._saveToStorage();
                this._onDidUpdateUser.fire(this._user);
            }
            return {
                success: true,
                message: response.data.message
            };
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Email verification failed:', error);
            if (error instanceof CloudAuthError) {
                return { success: false, error };
            }
            const authError = new CloudAuthError(CloudAuthErrorCode.UnknownError, 'Failed to verify email', error);
            return { success: false, error: authError };
        }
    }
    /**
     * Save tokens and user data to encrypted storage
     */
    async _saveToStorage() {
        try {
            if (this._accessToken) {
                const encryptedAccessToken = await this.encryptionService.encrypt(this._accessToken);
                this.storageService.store(AINativeCloudAuthService_1.STORAGE_KEY_ACCESS_TOKEN, encryptedAccessToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
            if (this._refreshToken) {
                const encryptedRefreshToken = await this.encryptionService.encrypt(this._refreshToken);
                this.storageService.store(AINativeCloudAuthService_1.STORAGE_KEY_REFRESH_TOKEN, encryptedRefreshToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
            if (this._user) {
                this.storageService.store(AINativeCloudAuthService_1.STORAGE_KEY_USER, JSON.stringify(this._user), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
        }
        catch (error) {
            console.error('[AINativeCloudAuthService] Failed to save to storage:', error);
            throw new CloudAuthError(CloudAuthErrorCode.UnknownError, 'Failed to save authentication data', error);
        }
    }
    /**
     * Clear all authentication data
     */
    _clearAuthData() {
        this._accessToken = null;
        this._refreshToken = null;
        this._user = null;
        // Clear storage
        this.storageService.remove(AINativeCloudAuthService_1.STORAGE_KEY_ACCESS_TOKEN, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(AINativeCloudAuthService_1.STORAGE_KEY_REFRESH_TOKEN, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(AINativeCloudAuthService_1.STORAGE_KEY_USER, -1 /* StorageScope.APPLICATION */);
    }
    /**
     * Check if JWT token is expired (with 5-minute buffer)
     */
    _isTokenExpired(token) {
        try {
            const claims = this._decodeJWT(token);
            const now = Math.floor(Date.now() / 1000);
            const buffer = 300; // 5 minutes
            return claims.exp < (now + buffer);
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
     * Map API UserInfoResponse to CloudUser
     */
    _mapUserInfoToCloudUser(userInfo) {
        return {
            id: userInfo.id,
            email: userInfo.email,
            username: userInfo.username,
            name: userInfo.name,
            role: userInfo.role,
            emailVerified: userInfo.email_verified,
            createdAt: userInfo.created_at,
            updatedAt: userInfo.updated_at
        };
    }
    /**
     * Validate email format
     */
    _isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Ensure no operation is in progress
     */
    _ensureNotInProgress() {
        if (this._operationInProgress) {
            throw new CloudAuthError(CloudAuthErrorCode.UnknownError, 'Authentication operation already in progress');
        }
    }
};
AINativeCloudAuthService = AINativeCloudAuthService_1 = __decorate([
    __param(0, IEncryptionService),
    __param(1, IStorageService)
], AINativeCloudAuthService);
export { AINativeCloudAuthService };
// Register service with VS Code dependency injection
registerSingleton(IAINativeCloudAuthService, AINativeCloudAuthService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVDbG91ZEF1dGhTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vYWluYXRpdmVDbG91ZEF1dGhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsY0FBYyxFQUNkLGNBQWMsRUFDZCxrQkFBa0IsRUFRbEIsTUFBTSw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUUzRDs7Ozs7O0dBTUc7QUFDSSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7O0lBR3ZELDJFQUEyRTthQUNuRCw2QkFBd0IsR0FBRyxpQ0FBaUMsQUFBcEMsQ0FBcUM7YUFDN0QsOEJBQXlCLEdBQUcsa0NBQWtDLEFBQXJDLENBQXNDO2FBQy9ELHFCQUFnQixHQUFHLDBCQUEwQixBQUE3QixDQUE4QjtJQWdCdEUsWUFDcUIsaUJBQXNELEVBQ3pELGNBQWdEO1FBRWpFLEtBQUssRUFBRSxDQUFDO1FBSDZCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDeEMsbUJBQWMsR0FBZCxjQUFjLENBQWlC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