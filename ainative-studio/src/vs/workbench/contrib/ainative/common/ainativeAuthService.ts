/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IAINativeAuthService = createDecorator<IAINativeAuthService>('ainativeAuthService');

/**
 * Authentication state enum
 */
export enum AuthState {
	Authenticated = 'authenticated',
	Unauthenticated = 'unauthenticated',
	Refreshing = 'refreshing',
	LoggingOut = 'loggingOut'
}

/**
 * Error codes for authentication errors
 */
export enum AINativeAuthErrorCode {
	InvalidCredentials = 'INVALID_CREDENTIALS',
	NetworkError = 'NETWORK_ERROR',
	TokenExpired = 'TOKEN_EXPIRED',
	TokenRefreshFailed = 'TOKEN_REFRESH_FAILED',
	LogoutFailed = 'LOGOUT_FAILED',
	UnknownError = 'UNKNOWN_ERROR'
}

/**
 * Custom error class for authentication errors
 */
export class AINativeAuthError extends Error {
	constructor(
		public readonly code: AINativeAuthErrorCode,
		message: string,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'AINativeAuthError';
	}
}

/**
 * User profile data
 */
export interface AINativeUser {
	readonly id: string;
	readonly email: string;
	readonly name?: string;
	readonly role: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
}

/**
 * Authentication result from login
 */
export interface AINativeAuthResult {
	readonly success: boolean;
	readonly accessToken?: string;
	readonly refreshToken?: string;
	readonly user?: AINativeUser;
	readonly error?: AINativeAuthError;
}

/**
 * JWT Token claims
 */
export interface JWTClaims {
	readonly sub: string;
	readonly email: string;
	readonly role: string;
	readonly exp: number;
	readonly iat: number;
}

/**
 * Main authentication service interface
 */
export interface IAINativeAuthService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when authentication state changes
	 */
	readonly onDidChangeAuthState: Event<AuthState>;

	/**
	 * Login with email and password
	 * @param email User email
	 * @param password User password
	 * @returns Authentication result with token and user data
	 */
	login(email: string, password: string): Promise<AINativeAuthResult>;

	/**
	 * Logout current user and blacklist token
	 */
	logout(): Promise<void>;

	/**
	 * Refresh expired access token
	 * @returns New access token
	 */
	refreshToken(): Promise<string>;

	/**
	 * Get current access token
	 * @returns Access token or null if not authenticated
	 */
	getAccessToken(): string | null;

	/**
	 * Get current user profile
	 * @returns User data or null if not authenticated
	 */
	getUser(): AINativeUser | null;

	/**
	 * Check if user is authenticated
	 * @returns true if user has valid token
	 */
	isAuthenticated(): boolean;

	/**
	 * Get current authentication state
	 * @returns Current auth state
	 */
	getAuthState(): AuthState;
}

import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';

/**
 * AINativeAuthService implementation
 * Handles JWT authentication with encrypted storage and automatic token refresh
 */
export class AINativeAuthService extends Disposable implements IAINativeAuthService {
	readonly _serviceBrand: undefined;

	private static readonly API_BASE = 'https://api.ainative.studio';
	private static readonly STORAGE_KEY_JWT = 'ainative.auth.jwt';
	private static readonly STORAGE_KEY_REFRESH_TOKEN = 'ainative.auth.refreshToken';
	private static readonly STORAGE_KEY_USER = 'ainative.auth.user';

	private readonly _onDidChangeAuthState = this._register(new Emitter<AuthState>());
	readonly onDidChangeAuthState = this._onDidChangeAuthState.event;

	private _authState: AuthState = AuthState.Unauthenticated;
	private _accessToken: string | null = null;
	private _refreshToken: string | null = null;
	private _user: AINativeUser | null = null;
	private _loginInProgress = false;

	constructor(
		@IEncryptionService private readonly encryptionService: IEncryptionService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
		this._loadFromStorage();
	}

	/**
	 * Load authentication state from encrypted storage
	 */
	private async _loadFromStorage(): Promise<void> {
		try {
			// Load encrypted JWT
			const encryptedJwt = this.storageService.get(
				AINativeAuthService.STORAGE_KEY_JWT,
				StorageScope.APPLICATION
			);

			if (encryptedJwt) {
				this._accessToken = await this.encryptionService.decrypt(encryptedJwt);
			}

			// Load encrypted refresh token
			const encryptedRefreshToken = this.storageService.get(
				AINativeAuthService.STORAGE_KEY_REFRESH_TOKEN,
				StorageScope.APPLICATION
			);

			if (encryptedRefreshToken) {
				this._refreshToken = await this.encryptionService.decrypt(encryptedRefreshToken);
			}

			// Load user data
			const userData = this.storageService.get(
				AINativeAuthService.STORAGE_KEY_USER,
				StorageScope.APPLICATION
			);

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
				} else {
					this._authState = AuthState.Authenticated;
				}
			}
		} catch (error) {
			console.error('[AINativeAuthService] Failed to load from storage:', error);
			this._authState = AuthState.Unauthenticated;
		}
	}

	/**
	 * Check if JWT token is expired
	 */
	private _isTokenExpired(token: string): boolean {
		try {
			const claims = this._decodeJWT(token);
			const now = Math.floor(Date.now() / 1000);
			return claims.exp < now;
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
	 * Login with email and password
	 */
	async login(email: string, password: string): Promise<AINativeAuthResult> {
		// Prevent concurrent login requests
		if (this._loginInProgress) {
			throw new AINativeAuthError(
				AINativeAuthErrorCode.UnknownError,
				'Login already in progress'
			);
		}

		this._loginInProgress = true;

		try {
			const response = await fetch(`${AINativeAuthService.API_BASE}/v1/auth/login-json`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
			});

			if (!response.ok) {
				if (response.status === 401) {
					const error = new AINativeAuthError(
						AINativeAuthErrorCode.InvalidCredentials,
						'Invalid email or password'
					);
					return { success: false, error };
				}

				throw new AINativeAuthError(
					AINativeAuthErrorCode.NetworkError,
					`HTTP ${response.status}: ${response.statusText}`
				);
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
				accessToken: this._accessToken,
				refreshToken: this._refreshToken,
				user: this._user,
			};

		} catch (error) {
			console.error('[AINativeAuthService] Login failed:', error);

			if (error instanceof AINativeAuthError) {
				return { success: false, error };
			}

			const authError = new AINativeAuthError(
				AINativeAuthErrorCode.NetworkError,
				'Network request failed',
				error as Error
			);
			return { success: false, error: authError };
		} finally {
			this._loginInProgress = false;
		}
	}

	/**
	 * Logout and blacklist token
	 */
	async logout(): Promise<void> {
		this._authState = AuthState.LoggingOut;
		this._onDidChangeAuthState.fire(this._authState);

		try {
			if (this._accessToken) {
				// Call backend to blacklist token
				await fetch(`${AINativeAuthService.API_BASE}/v1/auth/logout`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${this._accessToken}`,
						'Content-Type': 'application/json',
					},
				});
			}
		} catch (error) {
			console.error('[AINativeAuthService] Logout API call failed:', error);
			// Continue with local logout even if backend call fails
		}

		// Clear local state
		this._accessToken = null;
		this._refreshToken = null;
		this._user = null;

		// Clear storage
		this.storageService.remove(AINativeAuthService.STORAGE_KEY_JWT, StorageScope.APPLICATION);
		this.storageService.remove(AINativeAuthService.STORAGE_KEY_REFRESH_TOKEN, StorageScope.APPLICATION);
		this.storageService.remove(AINativeAuthService.STORAGE_KEY_USER, StorageScope.APPLICATION);

		// Update auth state
		this._authState = AuthState.Unauthenticated;
		this._onDidChangeAuthState.fire(this._authState);

		console.log('[AINativeAuthService] Logout successful');
	}

	/**
	 * Refresh expired access token
	 */
	async refreshToken(): Promise<string> {
		if (!this._refreshToken) {
			throw new AINativeAuthError(
				AINativeAuthErrorCode.TokenRefreshFailed,
				'No refresh token available'
			);
		}

		this._authState = AuthState.Refreshing;
		this._onDidChangeAuthState.fire(this._authState);

		try {
			const response = await fetch(`${AINativeAuthService.API_BASE}/v1/auth/refresh`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this._refreshToken}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new AINativeAuthError(
					AINativeAuthErrorCode.TokenRefreshFailed,
					`HTTP ${response.status}: ${response.statusText}`
				);
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

		} catch (error) {
			console.error('[AINativeAuthService] Token refresh failed:', error);

			// Clear auth state on refresh failure
			this._authState = AuthState.Unauthenticated;
			this._onDidChangeAuthState.fire(this._authState);

			if (error instanceof AINativeAuthError) {
				throw error;
			}

			throw new AINativeAuthError(
				AINativeAuthErrorCode.TokenRefreshFailed,
				'Failed to refresh token',
				error as Error
			);
		}
	}

	/**
	 * Save tokens and user data to encrypted storage
	 */
	private async _saveToStorage(): Promise<void> {
		try {
			if (this._accessToken) {
				const encryptedJwt = await this.encryptionService.encrypt(this._accessToken);
				this.storageService.store(
					AINativeAuthService.STORAGE_KEY_JWT,
					encryptedJwt,
					StorageScope.APPLICATION,
					StorageTarget.MACHINE
				);
			}

			if (this._refreshToken) {
				const encryptedRefreshToken = await this.encryptionService.encrypt(this._refreshToken);
				this.storageService.store(
					AINativeAuthService.STORAGE_KEY_REFRESH_TOKEN,
					encryptedRefreshToken,
					StorageScope.APPLICATION,
					StorageTarget.MACHINE
				);
			}

			if (this._user) {
				this.storageService.store(
					AINativeAuthService.STORAGE_KEY_USER,
					JSON.stringify(this._user),
					StorageScope.APPLICATION,
					StorageTarget.MACHINE
				);
			}
		} catch (error) {
			console.error('[AINativeAuthService] Failed to save to storage:', error);
			throw new AINativeAuthError(
				AINativeAuthErrorCode.UnknownError,
				'Failed to save authentication data',
				error as Error
			);
		}
	}

	/**
	 * Get current access token
	 */
	getAccessToken(): string | null {
		return this._accessToken;
	}

	/**
	 * Get current user profile
	 */
	getUser(): AINativeUser | null {
		return this._user;
	}

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean {
		return this._authState === AuthState.Authenticated && this._accessToken !== null;
	}

	/**
	 * Get current authentication state
	 */
	getAuthState(): AuthState {
		return this._authState;
	}
}
