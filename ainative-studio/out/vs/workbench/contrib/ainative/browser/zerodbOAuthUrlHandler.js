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
var ZeroDBOAuthUrlHandler_1;
import { IURLService } from '../../../../platform/url/common/url.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IZeroDBOAuthService } from '../common/zerodbOAuthService.js';
import { IAINativeAuthService } from '../common/ainativeAuthService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
/**
 * Handles ZeroDB OAuth callback URLs
 * Supports multiple providers: Google, GitHub, AINative
 * Format: ainativestudio://auth/callback/{provider}?code=xxx&state=yyy
 */
let ZeroDBOAuthUrlHandler = class ZeroDBOAuthUrlHandler extends Disposable {
    static { ZeroDBOAuthUrlHandler_1 = this; }
    static { this.ID = 'workbench.contrib.zerodbOAuthUrlHandler'; }
    static { this.STORAGE_KEY_JWT = 'ainative.auth.jwt'; }
    static { this.STORAGE_KEY_REFRESH_TOKEN = 'ainative.auth.refreshToken'; }
    static { this.STORAGE_KEY_USER = 'ainative.auth.user'; }
    constructor(logService, zerodbOAuthService, _ainativeAuthService, encryptionService, storageService, notificationService, urlService) {
        super();
        this.logService = logService;
        this.zerodbOAuthService = zerodbOAuthService;
        this._ainativeAuthService = _ainativeAuthService;
        this.encryptionService = encryptionService;
        this.storageService = storageService;
        this.notificationService = notificationService;
        // Register this handler with the URL service
        this._register(urlService.registerHandler(this));
        this.logService.info('[ZeroDBOAuthUrlHandler] Registered OAuth URL handler');
    }
    /**
     * Handle incoming URLs
     */
    async handleURL(uri) {
        this.logService.trace('[ZeroDBOAuthUrlHandler] Received URL:', uri.toString());
        // Check if this is an OAuth callback
        // Format: ainativestudio://auth/callback/{provider}
        if (uri.authority !== 'auth' || !uri.path.startsWith('/callback/')) {
            this.logService.trace('[ZeroDBOAuthUrlHandler] Not an OAuth callback URL');
            return false;
        }
        // Extract provider from path
        const pathParts = uri.path.split('/');
        const provider = pathParts[pathParts.length - 1];
        if (!provider) {
            this.logService.error('[ZeroDBOAuthUrlHandler] Missing provider in callback URL');
            return false;
        }
        // Parse query parameters
        const query = new URLSearchParams(uri.query);
        const code = query.get('code');
        const state = query.get('state');
        const error = query.get('error') ?? undefined;
        const errorDescription = query.get('error_description') ?? undefined;
        // Validate required parameters
        if (!code && !error) {
            this.logService.error('[ZeroDBOAuthUrlHandler] Missing code or error parameter');
            this.notificationService.notify({
                severity: Severity.Error,
                message: 'OAuth callback missing required parameters'
            });
            return false;
        }
        if (!state) {
            this.logService.error('[ZeroDBOAuthUrlHandler] Missing state parameter');
            this.notificationService.notify({
                severity: Severity.Error,
                message: 'OAuth callback missing state parameter - security check failed'
            });
            return false;
        }
        this.logService.info(`[ZeroDBOAuthUrlHandler] Processing OAuth callback for provider: ${provider}`);
        try {
            // Build callback parameters
            const callbackParams = {
                code: code || '',
                state,
                error,
                errorDescription
            };
            // Handle the OAuth callback
            const result = await this.zerodbOAuthService.handleCallback(callbackParams);
            if (result.success && result.accessToken && result.refreshToken && result.user) {
                this.logService.info('[ZeroDBOAuthUrlHandler] OAuth successful, storing tokens');
                // Store tokens and user data using encryption
                await this._storeAuthData(result.accessToken, result.refreshToken, result.user);
                // Show success notification
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: `Successfully authenticated with ${provider}`
                });
                this.logService.info('[ZeroDBOAuthUrlHandler] OAuth authentication completed successfully');
            }
            else {
                // OAuth failed
                const errorMsg = result.error || 'Unknown OAuth error';
                this.logService.error('[ZeroDBOAuthUrlHandler] OAuth failed:', errorMsg);
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: `Authentication failed: ${errorMsg}`
                });
            }
            return true;
        }
        catch (error) {
            this.logService.error('[ZeroDBOAuthUrlHandler] Error handling OAuth callback:', error);
            this.notificationService.notify({
                severity: Severity.Error,
                message: 'An error occurred during authentication'
            });
            return false;
        }
    }
    /**
     * Store authentication data securely
     */
    async _storeAuthData(accessToken, refreshToken, user) {
        try {
            // Encrypt and store access token
            const encryptedJwt = await this.encryptionService.encrypt(accessToken);
            this.storageService.store(ZeroDBOAuthUrlHandler_1.STORAGE_KEY_JWT, encryptedJwt, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Encrypt and store refresh token
            const encryptedRefreshToken = await this.encryptionService.encrypt(refreshToken);
            this.storageService.store(ZeroDBOAuthUrlHandler_1.STORAGE_KEY_REFRESH_TOKEN, encryptedRefreshToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Store user data (not sensitive, no encryption needed)
            this.storageService.store(ZeroDBOAuthUrlHandler_1.STORAGE_KEY_USER, JSON.stringify(user), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.logService.info('[ZeroDBOAuthUrlHandler] Auth data stored successfully');
        }
        catch (error) {
            this.logService.error('[ZeroDBOAuthUrlHandler] Failed to store auth data:', error);
            throw error;
        }
    }
};
ZeroDBOAuthUrlHandler = ZeroDBOAuthUrlHandler_1 = __decorate([
    __param(0, ILogService),
    __param(1, IZeroDBOAuthService),
    __param(2, IAINativeAuthService),
    __param(3, IEncryptionService),
    __param(4, IStorageService),
    __param(5, INotificationService),
    __param(6, IURLService)
], ZeroDBOAuthUrlHandler);
export { ZeroDBOAuthUrlHandler };
// Register as workbench contribution
registerWorkbenchContribution2(ZeroDBOAuthUrlHandler.ID, ZeroDBOAuthUrlHandler, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemVyb2RiT0F1dGhVcmxIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL3plcm9kYk9BdXRoVXJsSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFlLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQXVCLE1BQU0saUNBQWlDLENBQUM7QUFDM0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5Rzs7OztHQUlHO0FBQ0ksSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVOzthQUVwQyxPQUFFLEdBQUcseUNBQXlDLEFBQTVDLENBQTZDO2FBRXZDLG9CQUFlLEdBQUcsbUJBQW1CLEFBQXRCLENBQXVCO2FBQ3RDLDhCQUF5QixHQUFHLDRCQUE0QixBQUEvQixDQUFnQzthQUN6RCxxQkFBZ0IsR0FBRyxvQkFBb0IsQUFBdkIsQ0FBd0I7SUFFaEUsWUFDK0IsVUFBdUIsRUFDZixrQkFBdUMsRUFF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