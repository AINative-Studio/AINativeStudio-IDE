/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import {
	IAINativeAuthService,
	AuthResult,
	User,
	AuthState,
	AuthenticationError,
	AuthErrorCode
} from './ainativeAuthService.js';

/**
 * Storage keys for authentication data
 */
const enum StorageKeys {
	JWT_TOKEN = 'ainative.auth.jwt',
	REFRESH_TOKEN = 'ainative.auth.refreshToken',
	USER_DATA = 'ainative.auth.user'
}

/**
 * API endpoints for authentication
 */
const enum AuthEndpoints {
	BASE_URL = 'https://api.ainative.studio/v1/auth',
	LOGIN = '/login-json',
	LOGOUT = '/logout',
	REFRESH = '/refresh',
	ME = '/me'
}

/**
 * Implementation of the AINative authentication service
 * Manages user authentication, token storage, and session state
 */
export class AINativeAuthService extends Disposable implements IAINativeAuthService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeAuthState = this._register(new Emitter<AuthState>());
	public readonly onDidChangeAuthState: Event<AuthState> = this._onDidChangeAuthState.event;

	private _currentUser: User | null = null;
	private _jwtToken: string | null = null;
	private _refreshToken: string | null = null;
	private _isAuthenticated: boolean = false;
	private _isLoggingIn: boolean = false;

	constructor(
		@IEncryptionService private readonly encryptionService: IEncryptionService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
		this._loadStoredAuth();
	}

	/**
	 * Load authentication data from storage on service initialization
	 */
	private async _loadStoredAuth(): Promise<void> {
		try {
			// Load encrypted tokens
			const encryptedJwt = this.storageService.get(StorageKeys.JWT_TOKEN, StorageScope.APPLICATION);
			const encryptedRefresh = this.storageService.get(StorageKeys.REFRESH_TOKEN, StorageScope.APPLICATION);
			const userDataJson = this.storageService.get(StorageKeys.USER_DATA, StorageScope.APPLICATION);

			if (encryptedJwt && encryptedRefresh && userDataJson) {
				// Decrypt tokens
				this._jwtToken = await this.encryptionService.decrypt(encryptedJwt);
				this._refreshToken = await this.encryptionService.decrypt(encryptedRefresh);
				this._currentUser = JSON.parse(userDataJson);

				// Check if token is still valid
				if (this._isTokenValid(this._jwtToken)) {
					this._isAuthenticated = true;
					this._fireAuthStateChange();
				} else {
					// Token expired, try to refresh
					await this.refreshToken().catch(() => {
						// Refresh failed, clear auth state
						this._clearAuthState();
					});
				}
			}
		} catch (error) {
			console.error('Failed to load stored authentication:', error);
			this._clearAuthState();
		}
	}

	/**
	 * Check if a JWT token is valid (not expired)
	 */
	private _isTokenValid(token: string): boolean {
		try {
			const payload = this._decodeJwt(token);
			const expirationTime = payload.exp * 1000; // Convert to milliseconds
			return Date.now() < expirationTime;
		} catch {
			return false;
		}
	}

	/**
	 * Decode JWT token to extract claims
	 */
	private _decodeJwt(token: string): any {
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
	public async login(email: string, password: string): Promise<AuthResult> {
		// Prevent concurrent login attempts
		if (this._isLoggingIn) {
			throw new AuthenticationError('Login already in progress', AuthErrorCode.SERVER_ERROR);
		}

		this._isLoggingIn = true;

		try {
			const response = await fetch(`${AuthEndpoints.BASE_URL}${AuthEndpoints.LOGIN}`, {
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

			this.storageService.store(StorageKeys.JWT_TOKEN, encryptedJwt, StorageScope.APPLICATION, StorageTarget.MACHINE);
			this.storageService.store(StorageKeys.REFRESH_TOKEN, encryptedRefresh, StorageScope.APPLICATION, StorageTarget.MACHINE);
			this.storageService.store(StorageKeys.USER_DATA, JSON.stringify(data.user), StorageScope.APPLICATION, StorageTarget.MACHINE);

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

		} catch (error) {
			if (error instanceof AuthenticationError) {
				throw error;
			}

			// Network or other errors
			throw new AuthenticationError(
				error instanceof Error ? error.message : 'Login failed',
				AuthErrorCode.NETWORK_ERROR
			);
		} finally {
			this._isLoggingIn = false;
		}
	}

	/**
	 * Log out the current user
	 */
	public async logout(): Promise<void> {
		try {
			// Call logout endpoint if authenticated
			if (this._jwtToken) {
				await fetch(`${AuthEndpoints.BASE_URL}${AuthEndpoints.LOGOUT}`, {
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
		} finally {
			// Always clear local auth state
			this._clearAuthState();
			this._fireAuthStateChange();
		}
	}

	/**
	 * Refresh the access token using the refresh token
	 */
	public async refreshToken(): Promise<void> {
		if (!this._refreshToken) {
			throw new AuthenticationError('No refresh token available', AuthErrorCode.REFRESH_FAILED);
		}

		try {
			const response = await fetch(`${AuthEndpoints.BASE_URL}${AuthEndpoints.REFRESH}`, {
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
			this.storageService.store(StorageKeys.JWT_TOKEN, encryptedJwt, StorageScope.APPLICATION, StorageTarget.MACHINE);

			this._jwtToken = data.token;
			this._fireAuthStateChange();

		} catch (error) {
			if (error instanceof AuthenticationError) {
				throw error;
			}

			throw new AuthenticationError(
				error instanceof Error ? error.message : 'Token refresh failed',
				AuthErrorCode.NETWORK_ERROR
			);
		}
	}

	/**
	 * Get the currently authenticated user
	 */
	public async getCurrentUser(): Promise<User | null> {
		// Return cached user if available
		if (this._currentUser) {
			return this._currentUser;
		}

		// If authenticated but no cached user, fetch from API
		if (this._isAuthenticated && this._jwtToken) {
			try {
				const response = await fetch(`${AuthEndpoints.BASE_URL}${AuthEndpoints.ME}`, {
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
				this.storageService.store(StorageKeys.USER_DATA, JSON.stringify(user), StorageScope.APPLICATION, StorageTarget.MACHINE);

				return user;
			} catch (error) {
				console.error('Failed to fetch current user:', error);
				return null;
			}
		}

		return null;
	}

	/**
	 * Check if user is authenticated
	 */
	public isAuthenticated(): boolean {
		return this._isAuthenticated && this._jwtToken !== null;
	}

	/**
	 * Get the current auth token
	 */
	public getAuthToken(): string | null {
		return this._jwtToken;
	}

	/**
	 * Get the cached user synchronously
	 */
	public getUser(): User | null {
		return this._currentUser;
	}

	/**
	 * Get the current authentication state synchronously
	 */
	public getAuthState(): AuthState {
		return {
			isAuthenticated: this._isAuthenticated,
			user: this._currentUser
		};
	}

	/**
	 * Clear authentication state
	 */
	private _clearAuthState(): void {
		this._jwtToken = null;
		this._refreshToken = null;
		this._currentUser = null;
		this._isAuthenticated = false;

		// Clear storage
		this.storageService.remove(StorageKeys.JWT_TOKEN, StorageScope.APPLICATION);
		this.storageService.remove(StorageKeys.REFRESH_TOKEN, StorageScope.APPLICATION);
		this.storageService.remove(StorageKeys.USER_DATA, StorageScope.APPLICATION);
	}

	/**
	 * Fire authentication state change event
	 */
	private _fireAuthStateChange(): void {
		this._onDidChangeAuthState.fire({
			isAuthenticated: this._isAuthenticated,
			user: this._currentUser
		});
	}

	override dispose(): void {
		super.dispose();
	}
}

// Register service as singleton
registerSingleton(IAINativeAuthService, AINativeAuthService, InstantiationType.Delayed);
