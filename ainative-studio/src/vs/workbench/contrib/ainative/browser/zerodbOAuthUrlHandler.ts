/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { IURLHandler, IURLService } from '../../../../platform/url/common/url.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IZeroDBOAuthService, OAuthCallbackParams } from '../common/zerodbOAuthService.js';
import { IAINativeAuthService } from '../common/ainativeAuthService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';

/**
 * Handles ZeroDB OAuth callback URLs
 * Supports multiple providers: Google, GitHub, AINative
 * Format: ainativestudio://auth/callback/{provider}?code=xxx&state=yyy
 */
export class ZeroDBOAuthUrlHandler extends Disposable implements IURLHandler, IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.zerodbOAuthUrlHandler';

	private static readonly STORAGE_KEY_JWT = 'ainative.auth.jwt';
	private static readonly STORAGE_KEY_REFRESH_TOKEN = 'ainative.auth.refreshToken';
	private static readonly STORAGE_KEY_USER = 'ainative.auth.user';

	constructor(
		@ILogService private readonly logService: ILogService,
		@IZeroDBOAuthService private readonly zerodbOAuthService: IZeroDBOAuthService,
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore - used by protocol handler
			@IAINativeAuthService private readonly _ainativeAuthService: IAINativeAuthService,
		@IEncryptionService private readonly encryptionService: IEncryptionService,
		@IStorageService private readonly storageService: IStorageService,
		@INotificationService private readonly notificationService: INotificationService,
		@IURLService urlService: IURLService
	) {
		super();

		// Register this handler with the URL service
		this._register(urlService.registerHandler(this));

		this.logService.info('[ZeroDBOAuthUrlHandler] Registered OAuth URL handler');
	}

	/**
	 * Handle incoming URLs
	 */
	async handleURL(uri: URI): Promise<boolean> {
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
			const callbackParams: OAuthCallbackParams = {
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
			} else {
				// OAuth failed
				const errorMsg = result.error || 'Unknown OAuth error';
				this.logService.error('[ZeroDBOAuthUrlHandler] OAuth failed:', errorMsg);

				this.notificationService.notify({
					severity: Severity.Error,
					message: `Authentication failed: ${errorMsg}`
				});
			}

			return true;

		} catch (error) {
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
	private async _storeAuthData(
		accessToken: string,
		refreshToken: string,
		user: any
	): Promise<void> {
		try {
			// Encrypt and store access token
			const encryptedJwt = await this.encryptionService.encrypt(accessToken);
			this.storageService.store(
				ZeroDBOAuthUrlHandler.STORAGE_KEY_JWT,
				encryptedJwt,
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);

			// Encrypt and store refresh token
			const encryptedRefreshToken = await this.encryptionService.encrypt(refreshToken);
			this.storageService.store(
				ZeroDBOAuthUrlHandler.STORAGE_KEY_REFRESH_TOKEN,
				encryptedRefreshToken,
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);

			// Store user data (not sensitive, no encryption needed)
			this.storageService.store(
				ZeroDBOAuthUrlHandler.STORAGE_KEY_USER,
				JSON.stringify(user),
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);

			this.logService.info('[ZeroDBOAuthUrlHandler] Auth data stored successfully');

		} catch (error) {
			this.logService.error('[ZeroDBOAuthUrlHandler] Failed to store auth data:', error);
			throw error;
		}
	}
}

// Register as workbench contribution
registerWorkbenchContribution2(
	ZeroDBOAuthUrlHandler.ID,
	ZeroDBOAuthUrlHandler,
	WorkbenchPhase.Eventually
);
