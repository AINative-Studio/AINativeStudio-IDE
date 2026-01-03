/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';

export const ITokenService = createDecorator<ITokenService>('tokenService');

/**
 * Token data structure
 */
export interface TokenData {
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresAt: number;
	readonly rememberMe: boolean;
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
	readonly success: boolean;
	readonly accessToken?: string;
	readonly refreshToken?: string;
	readonly error?: Error;
}

/**
 * Token service interface for secure token storage and management
 */
export interface ITokenService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when tokens are updated
	 */
	readonly onDidUpdateTokens: Event<void>;

	/**
	 * Event fired when tokens are cleared
	 */
	readonly onDidClearTokens: Event<void>;

	/**
	 * Store authentication tokens securely
	 * @param accessToken JWT access token
	 * @param refreshToken JWT refresh token
	 * @param rememberMe Whether to persist session across browser restarts
	 */
	storeTokens(accessToken: string, refreshToken: string, rememberMe?: boolean): Promise<void>;

	/**
	 * Get the current access token
	 * @returns Access token or null if not available
	 */
	getAccessToken(): Promise<string | null>;

	/**
	 * Get the current refresh token
	 * @returns Refresh token or null if not available
	 */
	getRefreshToken(): Promise<string | null>;

	/**
	 * Clear all stored tokens
	 */
	clearTokens(): Promise<void>;

	/**
	 * Check if user is authenticated (has valid tokens)
	 * @returns true if authenticated with non-expired token
	 */
	isAuthenticated(): Promise<boolean>;

	/**
	 * Get token expiration time
	 * @returns Expiration timestamp in milliseconds, or null if no token
	 */
	getTokenExpiration(): Promise<number | null>;

	/**
	 * Check if token is expired or about to expire
	 * @param bufferMs Buffer time in milliseconds before expiration
	 * @returns true if token is expired or will expire within buffer time
	 */
	isTokenExpired(bufferMs?: number): Promise<boolean>;

	/**
	 * Get "remember me" flag
	 * @returns true if session should persist
	 */
	getRememberMe(): Promise<boolean>;
}

/**
 * Token service implementation
 * Handles secure storage of JWT tokens with encryption
 */
export class TokenService extends Disposable implements ITokenService {
	readonly _serviceBrand: undefined;

	private static readonly ACCESS_TOKEN_KEY = 'ainative.token.access';
	private static readonly REFRESH_TOKEN_KEY = 'ainative.token.refresh';
	private static readonly TOKEN_EXPIRY_KEY = 'ainative.token.expiry';
	private static readonly REMEMBER_ME_KEY = 'ainative.token.rememberMe';

	private readonly _onDidUpdateTokens = this._register(new Emitter<void>());
	readonly onDidUpdateTokens = this._onDidUpdateTokens.event;

	private readonly _onDidClearTokens = this._register(new Emitter<void>());
	readonly onDidClearTokens = this._onDidClearTokens.event;

	constructor(
		@IEncryptionService private readonly encryptionService: IEncryptionService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
	}

	/**
	 * Store tokens securely with encryption
	 */
	async storeTokens(accessToken: string, refreshToken: string, rememberMe: boolean = false): Promise<void> {
		try {
			// Decode JWT to get expiration time
			const expiresAt = this._getTokenExpiration(accessToken);

			// Encrypt tokens
			const encryptedAccess = await this.encryptionService.encrypt(accessToken);
			const encryptedRefresh = await this.encryptionService.encrypt(refreshToken);

			// Determine storage target based on rememberMe
			const target = rememberMe ? StorageTarget.MACHINE : StorageTarget.USER;

			// Store encrypted tokens
			this.storageService.store(
				TokenService.ACCESS_TOKEN_KEY,
				encryptedAccess,
				StorageScope.APPLICATION,
				target
			);

			this.storageService.store(
				TokenService.REFRESH_TOKEN_KEY,
				encryptedRefresh,
				StorageScope.APPLICATION,
				target
			);

			// Store metadata
			this.storageService.store(
				TokenService.TOKEN_EXPIRY_KEY,
				expiresAt.toString(),
				StorageScope.APPLICATION,
				target
			);

			this.storageService.store(
				TokenService.REMEMBER_ME_KEY,
				rememberMe.toString(),
				StorageScope.APPLICATION,
				target
			);

			console.log('[TokenService] Tokens stored successfully', {
				expiresAt: new Date(expiresAt).toISOString(),
				rememberMe
			});

			this._onDidUpdateTokens.fire();

		} catch (error) {
			console.error('[TokenService] Failed to store tokens:', error);
			throw new Error('Token storage failed');
		}
	}

	/**
	 * Get access token
	 */
	async getAccessToken(): Promise<string | null> {
		try {
			const encrypted = this.storageService.get(
				TokenService.ACCESS_TOKEN_KEY,
				StorageScope.APPLICATION
			);

			if (!encrypted) {
				return null;
			}

			return await this.encryptionService.decrypt(encrypted);

		} catch (error) {
			console.error('[TokenService] Failed to get access token:', error);
			// Token corrupted, clear it
			await this.clearTokens();
			return null;
		}
	}

	/**
	 * Get refresh token
	 */
	async getRefreshToken(): Promise<string | null> {
		try {
			const encrypted = this.storageService.get(
				TokenService.REFRESH_TOKEN_KEY,
				StorageScope.APPLICATION
			);

			if (!encrypted) {
				return null;
			}

			return await this.encryptionService.decrypt(encrypted);

		} catch (error) {
			console.error('[TokenService] Failed to get refresh token:', error);
			await this.clearTokens();
			return null;
		}
	}

	/**
	 * Clear all tokens
	 */
	async clearTokens(): Promise<void> {
		this.storageService.remove(TokenService.ACCESS_TOKEN_KEY, StorageScope.APPLICATION);
		this.storageService.remove(TokenService.REFRESH_TOKEN_KEY, StorageScope.APPLICATION);
		this.storageService.remove(TokenService.TOKEN_EXPIRY_KEY, StorageScope.APPLICATION);
		this.storageService.remove(TokenService.REMEMBER_ME_KEY, StorageScope.APPLICATION);

		console.log('[TokenService] Tokens cleared');
		this._onDidClearTokens.fire();
	}

	/**
	 * Check if user is authenticated
	 */
	async isAuthenticated(): Promise<boolean> {
		const token = await this.getAccessToken();
		if (!token) {
			return false;
		}

		// Check if token is expired
		const expired = await this.isTokenExpired();
		return !expired;
	}

	/**
	 * Get token expiration time
	 */
	async getTokenExpiration(): Promise<number | null> {
		const expiryStr = this.storageService.get(
			TokenService.TOKEN_EXPIRY_KEY,
			StorageScope.APPLICATION
		);

		if (!expiryStr) {
			return null;
		}

		return parseInt(expiryStr, 10);
	}

	/**
	 * Check if token is expired
	 * @param bufferMs Buffer time before expiration (default 5 minutes)
	 */
	async isTokenExpired(bufferMs: number = 5 * 60 * 1000): Promise<boolean> {
		const expiresAt = await this.getTokenExpiration();
		if (!expiresAt) {
			return true;
		}

		return Date.now() >= (expiresAt - bufferMs);
	}

	/**
	 * Get remember me flag
	 */
	async getRememberMe(): Promise<boolean> {
		const rememberMeStr = this.storageService.get(
			TokenService.REMEMBER_ME_KEY,
			StorageScope.APPLICATION
		);

		return rememberMeStr === 'true';
	}

	/**
	 * Decode JWT and extract expiration time
	 * @param token JWT token
	 * @returns Expiration timestamp in milliseconds
	 */
	private _getTokenExpiration(token: string): number {
		try {
			const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
			return payload.exp * 1000; // Convert to milliseconds
		} catch {
			// Default to 1 hour if can't decode
			return Date.now() + (60 * 60 * 1000);
		}
	}
}
