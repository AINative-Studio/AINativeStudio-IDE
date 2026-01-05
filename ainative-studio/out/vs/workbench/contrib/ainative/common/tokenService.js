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
var TokenService_1;
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const ITokenService = createDecorator('tokenService');
/**
 * Token service implementation
 * Handles secure storage of JWT tokens with encryption
 */
let TokenService = class TokenService extends Disposable {
    static { TokenService_1 = this; }
    static { this.ACCESS_TOKEN_KEY = 'ainative.token.access'; }
    static { this.REFRESH_TOKEN_KEY = 'ainative.token.refresh'; }
    static { this.TOKEN_EXPIRY_KEY = 'ainative.token.expiry'; }
    static { this.REMEMBER_ME_KEY = 'ainative.token.rememberMe'; }
    constructor(encryptionService, storageService) {
        super();
        this.encryptionService = encryptionService;
        this.storageService = storageService;
        this._onDidUpdateTokens = this._register(new Emitter());
        this.onDidUpdateTokens = this._onDidUpdateTokens.event;
        this._onDidClearTokens = this._register(new Emitter());
        this.onDidClearTokens = this._onDidClearTokens.event;
    }
    /**
     * Store tokens securely with encryption
     */
    async storeTokens(accessToken, refreshToken, rememberMe = false) {
        try {
            // Decode JWT to get expiration time
            const expiresAt = this._getTokenExpiration(accessToken);
            // Encrypt tokens
            const encryptedAccess = await this.encryptionService.encrypt(accessToken);
            const encryptedRefresh = await this.encryptionService.encrypt(refreshToken);
            // Determine storage target based on rememberMe
            const target = rememberMe ? 1 /* StorageTarget.MACHINE */ : 0 /* StorageTarget.USER */;
            // Store encrypted tokens
            this.storageService.store(TokenService_1.ACCESS_TOKEN_KEY, encryptedAccess, -1 /* StorageScope.APPLICATION */, target);
            this.storageService.store(TokenService_1.REFRESH_TOKEN_KEY, encryptedRefresh, -1 /* StorageScope.APPLICATION */, target);
            // Store metadata
            this.storageService.store(TokenService_1.TOKEN_EXPIRY_KEY, expiresAt.toString(), -1 /* StorageScope.APPLICATION */, target);
            this.storageService.store(TokenService_1.REMEMBER_ME_KEY, rememberMe.toString(), -1 /* StorageScope.APPLICATION */, target);
            console.log('[TokenService] Tokens stored successfully', {
                expiresAt: new Date(expiresAt).toISOString(),
                rememberMe
            });
            this._onDidUpdateTokens.fire();
        }
        catch (error) {
            console.error('[TokenService] Failed to store tokens:', error);
            throw new Error('Token storage failed');
        }
    }
    /**
     * Get access token
     */
    async getAccessToken() {
        try {
            const encrypted = this.storageService.get(TokenService_1.ACCESS_TOKEN_KEY, -1 /* StorageScope.APPLICATION */);
            if (!encrypted) {
                return null;
            }
            return await this.encryptionService.decrypt(encrypted);
        }
        catch (error) {
            console.error('[TokenService] Failed to get access token:', error);
            // Token corrupted, clear it
            await this.clearTokens();
            return null;
        }
    }
    /**
     * Get refresh token
     */
    async getRefreshToken() {
        try {
            const encrypted = this.storageService.get(TokenService_1.REFRESH_TOKEN_KEY, -1 /* StorageScope.APPLICATION */);
            if (!encrypted) {
                return null;
            }
            return await this.encryptionService.decrypt(encrypted);
        }
        catch (error) {
            console.error('[TokenService] Failed to get refresh token:', error);
            await this.clearTokens();
            return null;
        }
    }
    /**
     * Clear all tokens
     */
    async clearTokens() {
        this.storageService.remove(TokenService_1.ACCESS_TOKEN_KEY, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(TokenService_1.REFRESH_TOKEN_KEY, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(TokenService_1.TOKEN_EXPIRY_KEY, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(TokenService_1.REMEMBER_ME_KEY, -1 /* StorageScope.APPLICATION */);
        console.log('[TokenService] Tokens cleared');
        this._onDidClearTokens.fire();
    }
    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
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
    async getTokenExpiration() {
        const expiryStr = this.storageService.get(TokenService_1.TOKEN_EXPIRY_KEY, -1 /* StorageScope.APPLICATION */);
        if (!expiryStr) {
            return null;
        }
        return parseInt(expiryStr, 10);
    }
    /**
     * Check if token is expired
     * @param bufferMs Buffer time before expiration (default 5 minutes)
     */
    async isTokenExpired(bufferMs = 5 * 60 * 1000) {
        const expiresAt = await this.getTokenExpiration();
        if (!expiresAt) {
            return true;
        }
        return Date.now() >= (expiresAt - bufferMs);
    }
    /**
     * Get remember me flag
     */
    async getRememberMe() {
        const rememberMeStr = this.storageService.get(TokenService_1.REMEMBER_ME_KEY, -1 /* StorageScope.APPLICATION */);
        return rememberMeStr === 'true';
    }
    /**
     * Decode JWT and extract expiration time
     * @param token JWT token
     * @returns Expiration timestamp in milliseconds
     */
    _getTokenExpiration(token) {
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
            return payload.exp * 1000; // Convert to milliseconds
        }
        catch {
            // Default to 1 hour if can't decode
            return Date.now() + (60 * 60 * 1000);
        }
    }
};
TokenService = TokenService_1 = __decorate([
    __param(0, IEncryptionService),
    __param(1, IStorageService)
], TokenService);
export { TokenService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vdG9rZW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRTlHLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQWdCLGNBQWMsQ0FBQyxDQUFDO0FBeUY1RTs7O0dBR0c7QUFDSSxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFhLFNBQVEsVUFBVTs7YUFHbkIscUJBQWdCLEdBQUcsdUJBQXVCLEFBQTFCLENBQTJCO2FBQzNDLHNCQUFpQixHQUFHLHdCQUF3QixBQUEzQixDQUE0QjthQUM3QyxxQkFBZ0IsR0FBRyx1QkFBdUIsQUFBMUIsQ0FBMkI7YUFDM0Msb0JBQWUsR0FBRywyQkFBMkIsQUFBOUIsQ0FBK0I7SUFRdEUsWUFDcUIsaUJBQXNELEVBQ3pELGNBQWdEO1FBRWpFLEtBQUssRUFBRSxDQUFDO1FBSDZCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDeEMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBUmpELHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ2pFLHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFFMUMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDaEUscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztJQU96RCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsV0FBVyxDQUFDLFdBQW1CLEVBQUUsWUFBb0IsRUFBRSxhQUFzQixLQUFLO1FBQ3ZGLElBQUksQ0FBQztZQUNKLG9DQUFvQztZQUNwQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFeEQsaUJBQWlCO1lBQ2pCLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMxRSxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUU1RSwrQ0FBK0M7WUFDL0MsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLENBQUMsK0JBQXVCLENBQUMsMkJBQW1CLENBQUM7WUFFdkUseUJBQXlCO1lBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixjQUFZLENBQUMsZ0JBQWdCLEVBQzdCLGVBQWUscUNBRWYsTUFBTSxDQUNOLENBQUM7WUFFRixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsY0FBWSxDQUFDLGlCQUFpQixFQUM5QixnQkFBZ0IscUNBRWhCLE1BQU0sQ0FDTixDQUFDO1lBRUYsaUJBQWlCO1lBQ2pCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixjQUFZLENBQUMsZ0JBQWdCLEVBQzdCLFNBQVMsQ0FBQyxRQUFRLEVBQUUscUNBRXBCLE1BQU0sQ0FDTixDQUFDO1lBRUYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLGNBQVksQ0FBQyxlQUFlLEVBQzVCLFVBQVUsQ0FBQyxRQUFRLEVBQUUscUNBRXJCLE1BQU0sQ0FDTixDQUFDO1lBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsRUFBRTtnQkFDeEQsU0FBUyxFQUFFLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRTtnQkFDNUMsVUFBVTthQUNWLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVoQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUN6QyxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGNBQWM7UUFDbkIsSUFBSSxDQUFDO1lBQ0osTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ3hDLGNBQVksQ0FBQyxnQkFBZ0Isb0NBRTdCLENBQUM7WUFFRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUVELE9BQU8sTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXhELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsNENBQTRDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbkUsNEJBQTRCO1lBQzVCLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxlQUFlO1FBQ3BCLElBQUksQ0FBQztZQUNKLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUN4QyxjQUFZLENBQUMsaUJBQWlCLG9DQUU5QixDQUFDO1lBRUYsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFFRCxPQUFPLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUV4RCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXO1FBQ2hCLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQVksQ0FBQyxnQkFBZ0Isb0NBQTJCLENBQUM7UUFDcEYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBWSxDQUFDLGlCQUFpQixvQ0FBMkIsQ0FBQztRQUNyRixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFZLENBQUMsZ0JBQWdCLG9DQUEyQixDQUFDO1FBQ3BGLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQVksQ0FBQyxlQUFlLG9DQUEyQixDQUFDO1FBRW5GLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGVBQWU7UUFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzVDLE9BQU8sQ0FBQyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGtCQUFrQjtRQUN2QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDeEMsY0FBWSxDQUFDLGdCQUFnQixvQ0FFN0IsQ0FBQztRQUVGLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQUMsV0FBbUIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJO1FBQ3BELE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxhQUFhO1FBQ2xCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUM1QyxjQUFZLENBQUMsZUFBZSxvQ0FFNUIsQ0FBQztRQUVGLE9BQU8sYUFBYSxLQUFLLE1BQU0sQ0FBQztJQUNqQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLG1CQUFtQixDQUFDLEtBQWE7UUFDeEMsSUFBSSxDQUFDO1lBQ0osTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDekYsT0FBTyxPQUFPLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLDBCQUEwQjtRQUN0RCxDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1Isb0NBQW9DO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUN0QyxDQUFDO0lBQ0YsQ0FBQzs7QUEvTVcsWUFBWTtJQWV0QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0dBaEJMLFlBQVksQ0FnTnhCIn0=