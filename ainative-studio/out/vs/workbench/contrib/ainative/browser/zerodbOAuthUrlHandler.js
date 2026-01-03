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
    constructor(logService, zerodbOAuthService, ainativeAuthService, encryptionService, storageService, notificationService, urlService) {
        super();
        this.logService = logService;
        this.zerodbOAuthService = zerodbOAuthService;
        this.ainativeAuthService = ainativeAuthService;
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
        const error = query.get('error');
        const errorDescription = query.get('error_description');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemVyb2RiT0F1dGhVcmxIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL3plcm9kYk9BdXRoVXJsSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFlLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQXVCLE1BQU0saUNBQWlDLENBQUM7QUFDM0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5Rzs7OztHQUlHO0FBQ0ksSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVOzthQUVwQyxPQUFFLEdBQUcseUNBQXlDLEFBQTVDLENBQTZDO2FBRXZDLG9CQUFlLEdBQUcsbUJBQW1CLEFBQXRCLENBQXVCO2FBQ3RDLDhCQUF5QixHQUFHLDRCQUE0QixBQUEvQixDQUFnQzthQUN6RCxxQkFBZ0IsR0FBRyxvQkFBb0IsQUFBdkIsQ0FBd0I7SUFFaEUsWUFDK0IsVUFBdUIsRUFDZixrQkFBdUMsRUFD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