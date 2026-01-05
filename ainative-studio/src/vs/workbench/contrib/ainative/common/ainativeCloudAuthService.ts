/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import {
	IAINativeCloudAuthService,
	CloudAuthState,
	CloudAuthError,
	CloudAuthErrorCode,
	CloudUser,
	CloudAuthResult,
	RegistrationRequest,
	RegistrationResult,
	PasswordResetResult,
	TokenValidationResult,
	JWTClaims
} from './ainativeCloudAuthTypes.js';
import { AINativeSDKClient } from './ainativeSDKClient.js';

/**
 * AINativeCloudAuthService implementation
 * Handles cloud authentication with encrypted storage and automatic token refresh
 *
 * This service is separate from the ZeroDB authentication service (ainativeAuthService)
 * and uses different storage keys to avoid conflicts.
 */
export class AINativeCloudAuthService extends Disposable implements IAINativeCloudAuthService {
	readonly _serviceBrand: undefined;

	// Storage keys - prefixed with 'cloud' to avoid conflicts with ZeroDB auth
	private static readonly STORAGE_KEY_ACCESS_TOKEN = 'ainative.cloud.auth.accessToken';
	private static readonly STORAGE_KEY_REFRESH_TOKEN = 'ainative.cloud.auth.refreshToken';
	private static readonly STORAGE_KEY_USER = 'ainative.cloud.auth.user';

	private readonly _onDidChangeAuthState = this._register(new Emitter<CloudAuthState>());
	readonly onDidChangeAuthState = this._onDidChangeAuthState.event;

	private readonly _onDidUpdateUser = this._register(new Emitter<CloudUser>());
	readonly onDidUpdateUser = this._onDidUpdateUser.event;

	private _authState: CloudAuthState = CloudAuthState.Unauthenticated;
	private _accessToken: string | null = null;
	private _refreshToken: string | null = null;
	private _user: CloudUser | null = null;
	private _operationInProgress = false;

	private readonly _apiClient: AINativeSDKClient;

	constructor(
		@IEncryptionService private readonly encryptionService: IEncryptionService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
		this._apiClient = new AINativeSDKClient();
		this._loadFromStorage();
	}

	/**
	 * Load authentication state from encrypted storage
	 */
	private async _loadFromStorage(): Promise<void> {
		try {
			// Load encrypted access token
			const encryptedAccessToken = this.storageService.get(
				AINativeCloudAuthService.STORAGE_KEY_ACCESS_TOKEN,
				StorageScope.APPLICATION
			);

			if (encryptedAccessToken) {
				this._accessToken = await this.encryptionService.decrypt(encryptedAccessToken);
			}

			// Load encrypted refresh token
			const encryptedRefreshToken = this.storageService.get(
				AINativeCloudAuthService.STORAGE_KEY_REFRESH_TOKEN,
				StorageScope.APPLICATION
			);

			if (encryptedRefreshToken) {
				this._refreshToken = await this.encryptionService.decrypt(encryptedRefreshToken);
			}

			// Load user data
			const userData = this.storageService.get(
				AINativeCloudAuthService.STORAGE_KEY_USER,
				StorageScope.APPLICATION
			);

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
						} catch {
							// Refresh failed, mark as unauthenticated
							this._authState = CloudAuthState.Unauthenticated;
							this._clearAuthData();
						}
					} else {
						this._authState = CloudAuthState.Unauthenticated;
						this._clearAuthData();
					}
				} else {
					this._authState = CloudAuthState.Authenticated;
					this._onDidChangeAuthState.fire(this._authState);
				}
			}
		} catch (error) {
			console.error('[AINativeCloudAuthService] Failed to load from storage:', error);
			this._authState = CloudAuthState.Unauthenticated;
		}
	}

	/**
	 * Register a new user account
	 */
	async register(request: RegistrationRequest): Promise<RegistrationResult> {
		this._ensureNotInProgress();
		this._operationInProgress = true;
		this._authState = CloudAuthState.Registering;
		this._onDidChangeAuthState.fire(this._authState);

		try {
			// Validate password strength (min 8 characters)
			if (request.password.length < 8) {
				const error = new CloudAuthError(
					CloudAuthErrorCode.WeakPassword,
					'Password must be at least 8 characters long'
				);
				return { success: false, error };
			}

			// Validate email format
			if (!this._isValidEmail(request.email)) {
				const error = new CloudAuthError(
					CloudAuthErrorCode.UnknownError,
					'Invalid email format'
				);
				return { success: false, error };
			}

			const response = await this._apiClient.register(
				request.username,
				request.email,
				request.password,
				request.name
			);

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

		} catch (error) {
			console.error('[AINativeCloudAuthService] Registration failed:', error);

			// Update auth state back to unauthenticated
			this._authState = CloudAuthState.Unauthenticated;
			this._onDidChangeAuthState.fire(this._authState);

			if (error instanceof CloudAuthError) {
				return { success: false, error };
			}

			const authError = new CloudAuthError(
				CloudAuthErrorCode.RegistrationFailed,
				'Registration failed',
				error as Error
			);
			return { success: false, error: authError };
		} finally {
			this._operationInProgress = false;
		}
	}

	/**
	 * Login with email and password
	 */
	async login(email: string, password: string): Promise<CloudAuthResult> {
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

		} catch (error) {
			console.error('[AINativeCloudAuthService] Login failed:', error);

			if (error instanceof CloudAuthError) {
				return { success: false, error };
			}

			const authError = new CloudAuthError(
				CloudAuthErrorCode.NetworkError,
				'Login failed',
				error as Error
			);
			return { success: false, error: authError };
		} finally {
			this._operationInProgress = false;
		}
	}

	/**
	 * Logout and blacklist token
	 */
	async logout(): Promise<void> {
		this._authState = CloudAuthState.LoggingOut;
		this._onDidChangeAuthState.fire(this._authState);

		try {
			if (this._accessToken) {
				// Call backend to blacklist token
				await this._apiClient.logout(this._accessToken);
			}
		} catch (error) {
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
	async requestPasswordReset(email: string): Promise<PasswordResetResult> {
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

		} catch (error) {
			console.error('[AINativeCloudAuthService] Password reset request failed:', error);

			this._authState = this._accessToken ? CloudAuthState.Authenticated : CloudAuthState.Unauthenticated;
			this._onDidChangeAuthState.fire(this._authState);

			if (error instanceof CloudAuthError) {
				return { success: false, error };
			}

			const authError = new CloudAuthError(
				CloudAuthErrorCode.PasswordResetFailed,
				'Failed to request password reset',
				error as Error
			);
			return { success: false, error: authError };
		}
	}

	/**
	 * Confirm password reset with token
	 */
	async confirmPasswordReset(token: string, newPassword: string): Promise<PasswordResetResult> {
		// Validate password strength
		if (newPassword.length < 8) {
			const error = new CloudAuthError(
				CloudAuthErrorCode.WeakPassword,
				'Password must be at least 8 characters long'
			);
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

		} catch (error) {
			console.error('[AINativeCloudAuthService] Password reset confirmation failed:', error);

			this._authState = this._accessToken ? CloudAuthState.Authenticated : CloudAuthState.Unauthenticated;
			this._onDidChangeAuthState.fire(this._authState);

			if (error instanceof CloudAuthError) {
				return { success: false, error };
			}

			const authError = new CloudAuthError(
				CloudAuthErrorCode.PasswordResetFailed,
				'Failed to reset password',
				error as Error
			);
			return { success: false, error: authError };
		}
	}

	/**
	 * Change password for authenticated user
	 */
	async changePassword(currentPassword: string, newPassword: string): Promise<PasswordResetResult> {
		if (!this._accessToken) {
			const error = new CloudAuthError(
				CloudAuthErrorCode.InvalidCredentials,
				'Not authenticated'
			);
			return { success: false, error };
		}

		// Validate password strength
		if (newPassword.length < 8) {
			const error = new CloudAuthError(
				CloudAuthErrorCode.WeakPassword,
				'Password must be at least 8 characters long'
			);
			return { success: false, error };
		}

		try {
			const response = await this._apiClient.changePassword(
				this._accessToken,
				currentPassword,
				newPassword
			);

			return {
				success: true,
				message: response.data.message
			};

		} catch (error) {
			console.error('[AINativeCloudAuthService] Password change failed:', error);

			if (error instanceof CloudAuthError) {
				return { success: false, error };
			}

			const authError = new CloudAuthError(
				CloudAuthErrorCode.PasswordResetFailed,
				'Failed to change password',
				error as Error
			);
			return { success: false, error: authError };
		}
	}

	/**
	 * Refresh expired access token
	 */
	async refreshToken(): Promise<string> {
		if (!this._refreshToken) {
			throw new CloudAuthError(
				CloudAuthErrorCode.TokenRefreshFailed,
				'No refresh token available'
			);
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

		} catch (error) {
			console.error('[AINativeCloudAuthService] Token refresh failed:', error);

			// Clear auth state on refresh failure
			this._clearAuthData();
			this._authState = CloudAuthState.Unauthenticated;
			this._onDidChangeAuthState.fire(this._authState);

			if (error instanceof CloudAuthError) {
				throw error;
			}

			throw new CloudAuthError(
				CloudAuthErrorCode.TokenRefreshFailed,
				'Failed to refresh token',
				error as Error
			);
		}
	}

	/**
	 * Validate a JWT token
	 */
	async validateToken(token: string): Promise<TokenValidationResult> {
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

		} catch (error) {
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
	async getAccessToken(): Promise<string | null> {
		if (!this._accessToken) {
			return null;
		}

		// Check if token is expired and refresh if needed
		if (this._isTokenExpired(this._accessToken)) {
			if (this._refreshToken) {
				try {
					return await this.refreshToken();
				} catch (error) {
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
	getAccessTokenSync(): string | null {
		return this._accessToken;
	}

	/**
	 * Get current user profile (fetches from API if needed)
	 */
	async getCurrentUser(): Promise<CloudUser | null> {
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

		} catch (error) {
			console.error('[AINativeCloudAuthService] Failed to fetch user:', error);
			return null;
		}
	}

	/**
	 * Get cached user profile (synchronous)
	 */
	getUser(): CloudUser | null {
		return this._user;
	}

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean {
		return this._authState === CloudAuthState.Authenticated && this._accessToken !== null;
	}

	/**
	 * Get current authentication state
	 */
	getAuthState(): CloudAuthState {
		return this._authState;
	}

	/**
	 * Request email verification resend
	 */
	async resendEmailVerification(email: string): Promise<PasswordResetResult> {
		try {
			const response = await this._apiClient.resendEmailVerification(email);

			return {
				success: true,
				message: response.data.message
			};

		} catch (error) {
			console.error('[AINativeCloudAuthService] Resend verification failed:', error);

			if (error instanceof CloudAuthError) {
				return { success: false, error };
			}

			const authError = new CloudAuthError(
				CloudAuthErrorCode.UnknownError,
				'Failed to resend verification email',
				error as Error
			);
			return { success: false, error: authError };
		}
	}

	/**
	 * Verify email with token
	 */
	async verifyEmail(token: string): Promise<PasswordResetResult> {
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

		} catch (error) {
			console.error('[AINativeCloudAuthService] Email verification failed:', error);

			if (error instanceof CloudAuthError) {
				return { success: false, error };
			}

			const authError = new CloudAuthError(
				CloudAuthErrorCode.UnknownError,
				'Failed to verify email',
				error as Error
			);
			return { success: false, error: authError };
		}
	}

	/**
	 * Save tokens and user data to encrypted storage
	 */
	private async _saveToStorage(): Promise<void> {
		try {
			if (this._accessToken) {
				const encryptedAccessToken = await this.encryptionService.encrypt(this._accessToken);
				this.storageService.store(
					AINativeCloudAuthService.STORAGE_KEY_ACCESS_TOKEN,
					encryptedAccessToken,
					StorageScope.APPLICATION,
					StorageTarget.MACHINE
				);
			}

			if (this._refreshToken) {
				const encryptedRefreshToken = await this.encryptionService.encrypt(this._refreshToken);
				this.storageService.store(
					AINativeCloudAuthService.STORAGE_KEY_REFRESH_TOKEN,
					encryptedRefreshToken,
					StorageScope.APPLICATION,
					StorageTarget.MACHINE
				);
			}

			if (this._user) {
				this.storageService.store(
					AINativeCloudAuthService.STORAGE_KEY_USER,
					JSON.stringify(this._user),
					StorageScope.APPLICATION,
					StorageTarget.MACHINE
				);
			}
		} catch (error) {
			console.error('[AINativeCloudAuthService] Failed to save to storage:', error);
			throw new CloudAuthError(
				CloudAuthErrorCode.UnknownError,
				'Failed to save authentication data',
				error as Error
			);
		}
	}

	/**
	 * Clear all authentication data
	 */
	private _clearAuthData(): void {
		this._accessToken = null;
		this._refreshToken = null;
		this._user = null;

		// Clear storage
		this.storageService.remove(AINativeCloudAuthService.STORAGE_KEY_ACCESS_TOKEN, StorageScope.APPLICATION);
		this.storageService.remove(AINativeCloudAuthService.STORAGE_KEY_REFRESH_TOKEN, StorageScope.APPLICATION);
		this.storageService.remove(AINativeCloudAuthService.STORAGE_KEY_USER, StorageScope.APPLICATION);
	}

	/**
	 * Check if JWT token is expired (with 5-minute buffer)
	 */
	private _isTokenExpired(token: string): boolean {
		try {
			const claims = this._decodeJWT(token);
			const now = Math.floor(Date.now() / 1000);
			const buffer = 300; // 5 minutes
			return claims.exp < (now + buffer);
		} catch {
			return true;
		}
	}

	/**
	 * Decode JWT token to extract claims
	 */
	private _decodeJWT(token: string): JWTClaims {
		const parts = token.split('.');
		if (parts.length !== 3) {
			throw new Error('Invalid JWT token format');
		}

		const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
		return JSON.parse(payload) as JWTClaims;
	}

	/**
	 * Map API UserInfoResponse to CloudUser
	 */
	private _mapUserInfoToCloudUser(userInfo: any): CloudUser {
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
	private _isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	/**
	 * Ensure no operation is in progress
	 */
	private _ensureNotInProgress(): void {
		if (this._operationInProgress) {
			throw new CloudAuthError(
				CloudAuthErrorCode.UnknownError,
				'Authentication operation already in progress'
			);
		}
	}
}

// Register service with VS Code dependency injection
registerSingleton(IAINativeCloudAuthService, AINativeCloudAuthService, InstantiationType.Eager);
