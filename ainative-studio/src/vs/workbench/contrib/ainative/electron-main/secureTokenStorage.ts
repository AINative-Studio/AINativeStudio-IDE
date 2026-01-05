/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { IEncryptionMainService } from '../../../../platform/encryption/common/encryptionService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

/**
 * Service for secure token storage using Electron's safeStorage API
 *
 * This service provides encrypted storage for authentication tokens using the platform's
 * native encryption mechanisms (Keychain on macOS, DPAPI on Windows, libsecret on Linux).
 *
 * Security features:
 * - Tokens are encrypted at rest using OS-level encryption
 * - Encryption keys are managed by the operating system
 * - Tokens are never stored in plain text
 * - Memory is cleared after token operations
 */

export const ISecureTokenStorage = createDecorator<ISecureTokenStorage>('secureTokenStorage');

export interface ISecureTokenStorage {
	readonly _serviceBrand: undefined;

	/**
	 * Store a token securely
	 * @param key Unique identifier for the token
	 * @param token Token value to store
	 * @returns Promise that resolves when token is stored
	 */
	storeToken(key: string, token: string): Promise<void>;

	/**
	 * Retrieve a token
	 * @param key Unique identifier for the token
	 * @returns Promise that resolves with the token, or null if not found
	 */
	getToken(key: string): Promise<string | null>;

	/**
	 * Delete a token
	 * @param key Unique identifier for the token
	 * @returns Promise that resolves with true if deleted, false if not found
	 */
	deleteToken(key: string): Promise<boolean>;

	/**
	 * Check if a token exists
	 * @param key Unique identifier for the token
	 * @returns Promise that resolves with true if token exists
	 */
	hasToken(key: string): Promise<boolean>;

	/**
	 * Clear all stored tokens
	 * @returns Promise that resolves when all tokens are cleared
	 */
	clearAllTokens(): Promise<void>;

	/**
	 * Check if encryption is available
	 * @returns Promise that resolves with true if encryption is available
	 */
	isEncryptionAvailable(): Promise<boolean>;
}

export class SecureTokenStorage implements ISecureTokenStorage {
	readonly _serviceBrand: undefined;

	private readonly storagePrefix = 'ainative.token.';
	private readonly tokenRegistry = new Set<string>();
	private readonly tokenCache = new Map<string, string>();

	constructor(
		@IEncryptionMainService private readonly encryptionService: IEncryptionMainService,
		@ILogService private readonly logService: ILogService
	) {
		this.logService.trace('[SecureTokenStorage] Initialized');
	}

	async storeToken(key: string, token: string): Promise<void> {
		try {
			this.logService.trace(`[SecureTokenStorage] Storing token for key: ${key}`);

			// Validate inputs
			if (!key || key.trim().length === 0) {
				throw new Error('Token key cannot be empty');
			}
			if (!token || token.trim().length === 0) {
				throw new Error('Token value cannot be empty');
			}

			// Check if encryption is available
			const encryptionAvailable = await this.encryptionService.isEncryptionAvailable();
			if (!encryptionAvailable) {
				this.logService.error('[SecureTokenStorage] Encryption is not available');
				throw new Error('Encryption is not available on this system');
			}

			// Encrypt the token
			const encryptedToken = await this.encryptionService.encrypt(token);

			// Store in memory cache with prefixed key
			const storageKey = this.getStorageKey(key);
			this.tokenCache.set(storageKey, encryptedToken);
			this.tokenRegistry.add(key);

			this.logService.trace(`[SecureTokenStorage] Token stored successfully for key: ${key}`);
		} catch (error) {
			this.logService.error(`[SecureTokenStorage] Failed to store token for key: ${key}`, error);
			throw error;
		}
	}

	async getToken(key: string): Promise<string | null> {
		try {
			this.logService.trace(`[SecureTokenStorage] Retrieving token for key: ${key}`);

			const storageKey = this.getStorageKey(key);
			const encryptedToken = this.tokenCache.get(storageKey);

			if (!encryptedToken) {
				this.logService.trace(`[SecureTokenStorage] Token not found for key: ${key}`);
				return null;
			}

			// Decrypt the token
			const token = await this.encryptionService.decrypt(encryptedToken);

			this.logService.trace(`[SecureTokenStorage] Token retrieved successfully for key: ${key}`);
			return token;
		} catch (error) {
			this.logService.error(`[SecureTokenStorage] Failed to retrieve token for key: ${key}`, error);
			return null;
		}
	}

	async deleteToken(key: string): Promise<boolean> {
		try {
			this.logService.trace(`[SecureTokenStorage] Deleting token for key: ${key}`);

			const storageKey = this.getStorageKey(key);
			const existed = this.tokenCache.delete(storageKey);
			this.tokenRegistry.delete(key);

			this.logService.trace(`[SecureTokenStorage] Token deleted for key: ${key}, existed: ${existed}`);
			return existed;
		} catch (error) {
			this.logService.error(`[SecureTokenStorage] Failed to delete token for key: ${key}`, error);
			return false;
		}
	}

	async hasToken(key: string): Promise<boolean> {
		const storageKey = this.getStorageKey(key);
		return this.tokenCache.has(storageKey);
	}

	async clearAllTokens(): Promise<void> {
		try {
			this.logService.trace('[SecureTokenStorage] Clearing all tokens');

			// Clear all tokens from cache
			for (const key of this.tokenRegistry) {
				const storageKey = this.getStorageKey(key);
				this.tokenCache.delete(storageKey);
			}

			this.tokenRegistry.clear();
			this.logService.trace('[SecureTokenStorage] All tokens cleared');
		} catch (error) {
			this.logService.error('[SecureTokenStorage] Failed to clear all tokens', error);
			throw error;
		}
	}

	async isEncryptionAvailable(): Promise<boolean> {
		return this.encryptionService.isEncryptionAvailable();
	}

	/**
	 * Get storage key with prefix
	 */
	private getStorageKey(key: string): string {
		return `${this.storagePrefix}${key}`;
	}
}

/**
 * Token storage for specific token types
 */
export class AINativeTokenStorage {
	private static readonly ACCESS_TOKEN_KEY = 'access_token';
	private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
	private static readonly ID_TOKEN_KEY = 'id_token';
	private static readonly USER_INFO_KEY = 'user_info';

	constructor(
		private readonly storage: ISecureTokenStorage,
		private readonly logService: ILogService
	) { }

	/**
	 * Store access token
	 */
	async storeAccessToken(token: string): Promise<void> {
		await this.storage.storeToken(AINativeTokenStorage.ACCESS_TOKEN_KEY, token);
		this.logService.info('[AINativeTokenStorage] Access token stored');
	}

	/**
	 * Get access token
	 */
	async getAccessToken(): Promise<string | null> {
		return this.storage.getToken(AINativeTokenStorage.ACCESS_TOKEN_KEY);
	}

	/**
	 * Store refresh token
	 */
	async storeRefreshToken(token: string): Promise<void> {
		await this.storage.storeToken(AINativeTokenStorage.REFRESH_TOKEN_KEY, token);
		this.logService.info('[AINativeTokenStorage] Refresh token stored');
	}

	/**
	 * Get refresh token
	 */
	async getRefreshToken(): Promise<string | null> {
		return this.storage.getToken(AINativeTokenStorage.REFRESH_TOKEN_KEY);
	}

	/**
	 * Store ID token
	 */
	async storeIdToken(token: string): Promise<void> {
		await this.storage.storeToken(AINativeTokenStorage.ID_TOKEN_KEY, token);
		this.logService.info('[AINativeTokenStorage] ID token stored');
	}

	/**
	 * Get ID token
	 */
	async getIdToken(): Promise<string | null> {
		return this.storage.getToken(AINativeTokenStorage.ID_TOKEN_KEY);
	}

	/**
	 * Store user info
	 */
	async storeUserInfo(userInfo: any): Promise<void> {
		const userInfoString = JSON.stringify(userInfo);
		await this.storage.storeToken(AINativeTokenStorage.USER_INFO_KEY, userInfoString);
		this.logService.info('[AINativeTokenStorage] User info stored');
	}

	/**
	 * Get user info
	 */
	async getUserInfo(): Promise<any | null> {
		const userInfoString = await this.storage.getToken(AINativeTokenStorage.USER_INFO_KEY);
		if (!userInfoString) {
			return null;
		}
		try {
			return JSON.parse(userInfoString);
		} catch (error) {
			this.logService.error('[AINativeTokenStorage] Failed to parse user info', error);
			return null;
		}
	}

	/**
	 * Clear all authentication data
	 */
	async clearAuthData(): Promise<void> {
		await this.storage.deleteToken(AINativeTokenStorage.ACCESS_TOKEN_KEY);
		await this.storage.deleteToken(AINativeTokenStorage.REFRESH_TOKEN_KEY);
		await this.storage.deleteToken(AINativeTokenStorage.ID_TOKEN_KEY);
		await this.storage.deleteToken(AINativeTokenStorage.USER_INFO_KEY);
		this.logService.info('[AINativeTokenStorage] All auth data cleared');
	}

	/**
	 * Check if user is authenticated
	 */
	async isAuthenticated(): Promise<boolean> {
		const accessToken = await this.getAccessToken();
		return accessToken !== null && accessToken.length > 0;
	}
}
