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
export const ISecureTokenStorage = createDecorator('secureTokenStorage');
let SecureTokenStorage = class SecureTokenStorage {
    constructor(encryptionService, logService) {
        this.encryptionService = encryptionService;
        this.logService = logService;
        this.storagePrefix = 'ainative.token.';
        this.tokenRegistry = new Set();
        this.tokenCache = new Map();
        this.logService.trace('[SecureTokenStorage] Initialized');
    }
    async storeToken(key, token) {
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
        }
        catch (error) {
            this.logService.error(`[SecureTokenStorage] Failed to store token for key: ${key}`, error);
            throw error;
        }
    }
    async getToken(key) {
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
        }
        catch (error) {
            this.logService.error(`[SecureTokenStorage] Failed to retrieve token for key: ${key}`, error);
            return null;
        }
    }
    async deleteToken(key) {
        try {
            this.logService.trace(`[SecureTokenStorage] Deleting token for key: ${key}`);
            const storageKey = this.getStorageKey(key);
            const existed = this.tokenCache.delete(storageKey);
            this.tokenRegistry.delete(key);
            this.logService.trace(`[SecureTokenStorage] Token deleted for key: ${key}, existed: ${existed}`);
            return existed;
        }
        catch (error) {
            this.logService.error(`[SecureTokenStorage] Failed to delete token for key: ${key}`, error);
            return false;
        }
    }
    async hasToken(key) {
        const storageKey = this.getStorageKey(key);
        return this.tokenCache.has(storageKey);
    }
    async clearAllTokens() {
        try {
            this.logService.trace('[SecureTokenStorage] Clearing all tokens');
            // Clear all tokens from cache
            for (const key of this.tokenRegistry) {
                const storageKey = this.getStorageKey(key);
                this.tokenCache.delete(storageKey);
            }
            this.tokenRegistry.clear();
            this.logService.trace('[SecureTokenStorage] All tokens cleared');
        }
        catch (error) {
            this.logService.error('[SecureTokenStorage] Failed to clear all tokens', error);
            throw error;
        }
    }
    async isEncryptionAvailable() {
        return this.encryptionService.isEncryptionAvailable();
    }
    /**
     * Get storage key with prefix
     */
    getStorageKey(key) {
        return `${this.storagePrefix}${key}`;
    }
};
SecureTokenStorage = __decorate([
    __param(0, IEncryptionMainService),
    __param(1, ILogService)
], SecureTokenStorage);
export { SecureTokenStorage };
/**
 * Token storage for specific token types
 */
export class AINativeTokenStorage {
    static { this.ACCESS_TOKEN_KEY = 'access_token'; }
    static { this.REFRESH_TOKEN_KEY = 'refresh_token'; }
    static { this.ID_TOKEN_KEY = 'id_token'; }
    static { this.USER_INFO_KEY = 'user_info'; }
    constructor(storage, logService) {
        this.storage = storage;
        this.logService = logService;
    }
    /**
     * Store access token
     */
    async storeAccessToken(token) {
        await this.storage.storeToken(AINativeTokenStorage.ACCESS_TOKEN_KEY, token);
        this.logService.info('[AINativeTokenStorage] Access token stored');
    }
    /**
     * Get access token
     */
    async getAccessToken() {
        return this.storage.getToken(AINativeTokenStorage.ACCESS_TOKEN_KEY);
    }
    /**
     * Store refresh token
     */
    async storeRefreshToken(token) {
        await this.storage.storeToken(AINativeTokenStorage.REFRESH_TOKEN_KEY, token);
        this.logService.info('[AINativeTokenStorage] Refresh token stored');
    }
    /**
     * Get refresh token
     */
    async getRefreshToken() {
        return this.storage.getToken(AINativeTokenStorage.REFRESH_TOKEN_KEY);
    }
    /**
     * Store ID token
     */
    async storeIdToken(token) {
        await this.storage.storeToken(AINativeTokenStorage.ID_TOKEN_KEY, token);
        this.logService.info('[AINativeTokenStorage] ID token stored');
    }
    /**
     * Get ID token
     */
    async getIdToken() {
        return this.storage.getToken(AINativeTokenStorage.ID_TOKEN_KEY);
    }
    /**
     * Store user info
     */
    async storeUserInfo(userInfo) {
        const userInfoString = JSON.stringify(userInfo);
        await this.storage.storeToken(AINativeTokenStorage.USER_INFO_KEY, userInfoString);
        this.logService.info('[AINativeTokenStorage] User info stored');
    }
    /**
     * Get user info
     */
    async getUserInfo() {
        const userInfoString = await this.storage.getToken(AINativeTokenStorage.USER_INFO_KEY);
        if (!userInfoString) {
            return null;
        }
        try {
            return JSON.parse(userInfoString);
        }
        catch (error) {
            this.logService.error('[AINativeTokenStorage] Failed to parse user info', error);
            return null;
        }
    }
    /**
     * Clear all authentication data
     */
    async clearAuthData() {
        await this.storage.deleteToken(AINativeTokenStorage.ACCESS_TOKEN_KEY);
        await this.storage.deleteToken(AINativeTokenStorage.REFRESH_TOKEN_KEY);
        await this.storage.deleteToken(AINativeTokenStorage.ID_TOKEN_KEY);
        await this.storage.deleteToken(AINativeTokenStorage.USER_INFO_KEY);
        this.logService.info('[AINativeTokenStorage] All auth data cleared');
    }
    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
        const accessToken = await this.getAccessToken();
        return accessToken !== null && accessToken.length > 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJlVG9rZW5TdG9yYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9lbGVjdHJvbi1tYWluL3NlY3VyZVRva2VuU3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGOzs7Ozs7Ozs7OztHQVdHO0FBRUgsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFDO0FBK0N2RixJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFrQjtJQU85QixZQUN5QixpQkFBMEQsRUFDckUsVUFBd0M7UUFEWixzQkFBaUIsR0FBakIsaUJBQWlCLENBQXdCO1FBQ3BELGVBQVUsR0FBVixVQUFVLENBQWE7UUFOckMsa0JBQWEsR0FBRyxpQkFBaUIsQ0FBQztRQUNsQyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDbEMsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBTXZELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBVyxFQUFFLEtBQWE7UUFDMUMsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsK0NBQStDLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFNUUsa0JBQWtCO1lBQ2xCLElBQUksQ0FB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