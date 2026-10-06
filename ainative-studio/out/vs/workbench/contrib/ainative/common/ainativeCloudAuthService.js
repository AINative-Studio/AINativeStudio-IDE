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
 * This service is separate from the ZeroDB session authentication service
 * (`IAINativeSessionAuthService` in ainativeAuthService.ts) and uses different
 * storage keys to avoid conflicts.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVDbG91ZEF1dGhTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vYWluYXRpdmVDbG91ZEF1dGhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsY0FBYyxFQUNkLGNBQWMsRUFDZCxrQkFBa0IsRUFRbEIsTUFBTSw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUUzRDs7Ozs7OztHQU9HO0FBQ0ksSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVOztJQUd2RCwyRUFBMkU7YUFDbkQsNkJBQXdCLEdBQUcsaUNBQWlDLEFBQXBDLENBQXFDO2FBQzdELDhCQUF5QixHQUFHLGtDQUFrQyxBQUFyQyxDQUFzQzthQUMvRCxxQkFBZ0IsR0FBRywwQkFBMEIsQUFBN0IsQ0FBOEI7SUFnQnRFLFlBQ3FCLGlCQUFzRCxFQUN6RCxjQUFnRDtRQUVqRSxLQUFLLEVBQUUsQ0FBQztRQUg2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3hDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQWhCakQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBa0IsQ0FBQyxDQUFDO1FBQzlFLHlCQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7UUFFaEQscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBYSxDQUFDLENBQUM7UUFDcEUsb0JBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FBRS9DLGVBQVUsR0FBbUIsY0FBYyxDQUFDLGVBQWUsQ0FBQztRQUM1RCxpQkFBWSxHQUFrQixJQUFJLENBQUM7UUFDbkMsa0JBQWEsR0FBa0IsSUFBSSxDQUFDO1FBQ3BDLFVBQUssR0FBcUIsSUFBSSxDQUFDO1FBQy9CLHlCQUFvQixHQUFHLEtBQUssQ0FBQztRQVNwQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUMxQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsZ0JBQWdCO1FBQzdCLElBQUksQ0FBQztZQUNKLDhCQUE4QjtZQUM5QixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUNuRCwwQkFBd0IsQ0FBQyx3QkFBd0Isb0NBRWpELENBQUM7WUFFRixJQUFJLG9CQUFvQixFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDaEYsQ0FBQztZQUVELCtCQUErQjtZQUMvQixNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUNwRCwwQkFBd0IsQ0FBQyx5QkFBeUIsb0NBRWxELENBQUM7WUFFRixJQUFJLHFCQUFxQixFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDbEYsQ0FBQztZQUVELGlCQUFpQjtZQUNqQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDdkMsMEJBQXdCLENBQUMsZ0JBQWdCLG9DQUV6QyxDQUFDO1lBRUYsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbkMsQ0FBQztZQUVELG9CQUFvQjtZQUNwQixJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNyQyw0QkFBNEI7Z0JBQzVCLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztvQkFDN0MsdUJBQXVCO29CQUN2QixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDeEIsSUFBSSxDQUFDOzRCQUNKLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO3dCQUMzQixDQUFDO3dCQUFDLE1BQU0sQ0FBQzs0QkFDUiwwQ0FBMEM7NEJBQzFDLElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLGVBQWUsQ0FBQzs0QkFDakQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO3dCQUN2QixDQUFDO29CQUNGLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLENBQUMsVUFBVSxHQUFHLGNBQWMsQ0FBQyxlQUFlLENBQUM7d0JBQ2pELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDdkIsQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDO29CQUMvQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDbEQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLHlEQUF5RCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hGLElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLGVBQWUsQ0FBQztRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUE0QjtRQUMxQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQztRQUM3QyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUM7WUFDSixnREFBZ0Q7WUFDaEQsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQy9CLGtCQUFrQixDQUFDLFlBQVksRUFDL0IsNkNBQTZDLENBQzdDLENBQUM7Z0JBQ0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDbEMsQ0FBQztZQUVELHdCQUF3QjtZQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQy9CLGtCQUFrQixDQUFDLFlBQVksRUFDL0Isc0JBQXNCLENBQ3RCLENBQUM7Z0JBQ0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDbEMsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQzlDLE9BQU8sQ0FBQyxRQUFRLEVBQ2hCLE9BQU8sQ0FBQyxLQUFLLEVBQ2IsT0FBTyxDQUFDLFFBQVEsRUFDaEIsT0FBTyxDQUFDLElBQUksQ0FDWixDQUFDO1lBRUYsNkJBQTZCO1lBQzdCLElBQUksQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDL0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUM7WUFDekQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUU5RCwrQkFBK0I7WUFDL0IsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFNUIsb0JBQW9CO1lBQ3BCLElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQztZQUMvQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHlEQUF5RCxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV0RixPQUFPO2dCQUNOLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWTtnQkFDOUIsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLElBQUksU0FBUztnQkFDN0MsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNoQix5QkFBeUIsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYTthQUNwRCxDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxpREFBaUQsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUV4RSw0Q0FBNEM7WUFDNUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUMsZUFBZSxDQUFDO1lBQ2pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRWpELElBQUksS0FBSyxZQUFZLGNBQWMsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUNsQyxDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxjQUFjLENBQ25DLGtCQUFrQixDQUFDLGtCQUFrQixFQUNyQyxxQkFBcUIsRUFDckIsS0FBYyxDQUNkLENBQUM7WUFDRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUM7UUFDN0MsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQztRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFhLEVBQUUsUUFBZ0I7UUFDMUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQztRQUVqQyxJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUU5RCw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUMvQyxJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQztZQUN6RCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTlELCtCQUErQjtZQUMvQixNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUU1QixvQkFBb0I7WUFDcEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDO1lBQy9DLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0RBQWtELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFdkUsT0FBTztnQkFDTixPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVk7Z0JBQzlCLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxJQUFJLFNBQVM7Z0JBQzdDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSzthQUNoQixDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUVqRSxJQUFJLEtBQUssWUFBWSxjQUFjLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDbEMsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUNuQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQy9CLGNBQWMsRUFDZCxLQUFjLENBQ2QsQ0FBQztZQUNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUM3QyxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO1FBQ25DLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsTUFBTTtRQUNYLElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQztRQUM1QyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUM7WUFDSixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdkIsa0NBQWtDO2dCQUNsQyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNqRCxDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxvREFBb0QsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzRSx3REFBd0Q7UUFDekQsQ0FBQztRQUVELGdDQUFnQztRQUNoQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFdEIsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLGVBQWUsQ0FBQztRQUNqRCxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVqRCxPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEtBQWE7UUFDdkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUMsaUJBQWlCLENBQUM7UUFDbkQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFakQsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUU3RCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUM7WUFDcEcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFakQsT0FBTztnQkFDTixPQUFPLEVBQUUsSUFBSTtnQkFDYixPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPO2FBQzlCLENBQUM7UUFFSCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRWxGLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQztZQUNwRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVqRCxJQUFJLEtBQUssWUFBWSxjQUFjLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDbEMsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUNuQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFDdEMsa0NBQWtDLEVBQ2xDLEtBQWMsQ0FDZCxDQUFDO1lBQ0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDO1FBQzdDLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBYSxFQUFFLFdBQW1CO1FBQzVELDZCQUE2QjtRQUM3QixJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQy9CLGtCQUFrQixDQUFDLFlBQVksRUFDL0IsNkNBQTZDLENBQzdDLENBQUM7WUFDRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUNsQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUMsaUJBQWlCLENBQUM7UUFDbkQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFakQsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFFekUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDO1lBQ3BHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRWpELE9BQU87Z0JBQ04sT0FBTyxFQUFFLElBQUk7Z0JBQ2IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTzthQUM5QixDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxnRUFBZ0UsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUV2RixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUM7WUFDcEcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFakQsSUFBSSxLQUFLLFlBQVksY0FBYyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ2xDLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGNBQWMsQ0FDbkMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQ3RDLDBCQUEwQixFQUMxQixLQUFjLENBQ2QsQ0FBQztZQUNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUM3QyxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGNBQWMsQ0FBQyxlQUF1QixFQUFFLFdBQW1CO1FBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQy9CLGtCQUFrQixDQUFDLGtCQUFrQixFQUNyQyxtQkFBbUIsQ0FDbkIsQ0FBQztZQUNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ2xDLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUMvQixrQkFBa0IsQ0FBQyxZQUFZLEVBQy9CLDZDQUE2QyxDQUM3QyxDQUFDO1lBQ0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDbEMsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQ3BELElBQUksQ0FBQyxZQUFZLEVBQ2pCLGVBQWUsRUFDZixXQUFXLENBQ1gsQ0FBQztZQUVGLE9BQU87Z0JBQ04sT0FBTyxFQUFFLElBQUk7Z0JBQ2IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTzthQUM5QixDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxvREFBb0QsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUUzRSxJQUFJLEtBQUssWUFBWSxjQUFjLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDbEMsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUNuQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFDdEMsMkJBQTJCLEVBQzNCLEtBQWMsQ0FDZCxDQUFDO1lBQ0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDO1FBQzdDLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsWUFBWTtRQUNqQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxjQUFjLENBQ3ZCLGtCQUFrQixDQUFDLGtCQUFrQixFQUNyQyw0QkFBNEIsQ0FDNUIsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUM7UUFDNUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFakQsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDeEUsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUUvQyxtQ0FBbUM7WUFDbkMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO1lBQ2xELENBQUM7WUFFRCxpQkFBaUI7WUFDakIsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFNUIsb0JBQW9CO1lBQ3BCLElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQztZQUMvQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVqRCxPQUFPLENBQUMsR0FBRyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7WUFFbkUsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBRTFCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0RBQWtELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFekUsc0NBQXNDO1lBQ3RDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsVUFBVSxHQUFHLGNBQWMsQ0FBQyxlQUFlLENBQUM7WUFDakQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFakQsSUFBSSxLQUFLLFlBQVksY0FBYyxFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sS0FBSyxDQUFDO1lBQ2IsQ0FBQztZQUVELE1BQU0sSUFBSSxjQUFjLENBQ3ZCLGtCQUFrQixDQUFDLGtCQUFrQixFQUNyQyx5QkFBeUIsRUFDekIsS0FBYyxDQUNkLENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFhO1FBQ2hDLElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFMUQsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMvQyxPQUFPO29CQUNOLEtBQUssRUFBRSxJQUFJO29CQUNYLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUM3QixLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSztvQkFDL0IsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7b0JBQzdCLFNBQVMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUc7aUJBQzVCLENBQUM7WUFDSCxDQUFDO1lBRUQsT0FBTztnQkFDTixLQUFLLEVBQUUsS0FBSztnQkFDWixLQUFLLEVBQUUsa0JBQWtCO2FBQ3pCLENBQUM7UUFFSCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVFLE9BQU87Z0JBQ04sS0FBSyxFQUFFLEtBQUs7Z0JBQ1osS0FBSyxFQUFFLEtBQUssWUFBWSxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHlCQUF5QjthQUNsRixDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxjQUFjO1FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUM3QyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDO29CQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ2xDLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxpREFBaUQsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDeEUsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsa0JBQWtCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsY0FBYztRQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDbkIsQ0FBQztRQUVELHNCQUFzQjtRQUN0QixJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN6RSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFekQsaUJBQWlCO1lBQ2pCLE1BQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBRTVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztRQUVuQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLGtEQUFrRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pFLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZUFBZTtRQUNkLE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxjQUFjLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDO0lBQ3ZGLENBQUM7SUFFRDs7T0FFRztJQUNILFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEtBQWE7UUFDMUMsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXRFLE9BQU87Z0JBQ04sT0FBTyxFQUFFLElBQUk7Z0JBQ2IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTzthQUM5QixDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyx3REFBd0QsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUUvRSxJQUFJLEtBQUssWUFBWSxjQUFjLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDbEMsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUNuQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQy9CLHFDQUFxQyxFQUNyQyxLQUFjLENBQ2QsQ0FBQztZQUNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUM3QyxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFhO1FBQzlCLElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFMUQsb0NBQW9DO1lBQ3BDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQztnQkFDcEQsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3hDLENBQUM7WUFFRCxPQUFPO2dCQUNOLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU87YUFDOUIsQ0FBQztRQUVILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsdURBQXVELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFOUUsSUFBSSxLQUFLLFlBQVksY0FBYyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ2xDLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGNBQWMsQ0FDbkMsa0JBQWtCLENBQUMsWUFBWSxFQUMvQix3QkFBd0IsRUFDeEIsS0FBYyxDQUNkLENBQUM7WUFDRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUM7UUFDN0MsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxjQUFjO1FBQzNCLElBQUksQ0FBQztZQUNKLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN2QixNQUFNLG9CQUFvQixHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3JGLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QiwwQkFBd0IsQ0FBQyx3QkFBd0IsRUFDakQsb0JBQW9CLG1FQUdwQixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUN4QixNQUFNLHFCQUFxQixHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ3ZGLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QiwwQkFBd0IsQ0FBQyx5QkFBeUIsRUFDbEQscUJBQXFCLG1FQUdyQixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsMEJBQXdCLENBQUMsZ0JBQWdCLEVBQ3pDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtRUFHMUIsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLHVEQUF1RCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzlFLE1BQU0sSUFBSSxjQUFjLENBQ3ZCLGtCQUFrQixDQUFDLFlBQVksRUFDL0Isb0NBQW9DLEVBQ3BDLEtBQWMsQ0FDZCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLGNBQWM7UUFDckIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDekIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFFbEIsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLDBCQUF3QixDQUFDLHdCQUF3QixvQ0FBMkIsQ0FBQztRQUN4RyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQywwQkFBd0IsQ0FBQyx5QkFBeUIsb0NBQTJCLENBQUM7UUFDekcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsMEJBQXdCLENBQUMsZ0JBQWdCLG9DQUEyQixDQUFDO0lBQ2pHLENBQUM7SUFFRDs7T0FFRztJQUNLLGVBQWUsQ0FBQyxLQUFhO1FBQ3BDLElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDMUMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsWUFBWTtZQUNoQyxPQUFPLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLFVBQVUsQ0FBQyxLQUFhO1FBQy9CLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQWMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSyx1QkFBdUIsQ0FBQyxRQUFhO1FBQzVDLE9BQU87WUFDTixFQUFFLEVBQUUsUUFBUSxDQUFDLEVBQUU7WUFDZixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7WUFDckIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRO1lBQzNCLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtZQUNuQixJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxjQUFjO1lBQ3RDLFNBQVMsRUFBRSxRQUFRLENBQUMsVUFBVTtZQUM5QixTQUFTLEVBQUUsUUFBUSxDQUFDLFVBQVU7U0FDOUIsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLGFBQWEsQ0FBQyxLQUFhO1FBQ2xDLE1BQU0sVUFBVSxHQUFHLDRCQUE0QixDQUFDO1FBQ2hELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxvQkFBb0I7UUFDM0IsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMvQixNQUFNLElBQUksY0FBYyxDQUN2QixrQkFBa0IsQ0FBQyxZQUFZLEVBQy9CLDhDQUE4QyxDQUM5QyxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7O0FBM3RCVyx3QkFBd0I7SUF1QmxDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxlQUFlLENBQUE7R0F4Qkwsd0JBQXdCLENBNHRCcEM7O0FBRUQscURBQXFEO0FBQ3JELGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixrQ0FBMEIsQ0FBQyJ9