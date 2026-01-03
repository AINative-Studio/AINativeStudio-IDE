/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { AINativeUser } from './ainativeAuthService.js';

export const IZeroDBOAuthService = createDecorator<IZeroDBOAuthService>('zerodbOAuthService');

/**
 * Supported OAuth providers
 */
export enum OAuthProvider {
	Google = 'google',
	GitHub = 'github',
	AINative = 'ainative'
}

/**
 * OAuth configuration for a provider
 */
export interface OAuthProviderConfig {
	readonly provider: OAuthProvider;
	readonly clientId: string;
	readonly redirectUri: string;
	readonly scope: string[];
	readonly authorizationEndpoint: string;
	readonly tokenEndpoint: string;
	readonly supportsPKCE: boolean;
}

/**
 * OAuth state stored during flow
 */
export interface OAuthState {
	readonly state: string;
	readonly codeVerifier?: string; // For PKCE
	readonly provider: OAuthProvider;
	readonly timestamp: number;
	readonly returnUrl?: string;
}

/**
 * PKCE (Proof Key for Code Exchange) data
 */
export interface PKCEData {
	readonly verifier: string;
	readonly challenge: string;
}

/**
 * OAuth callback parameters from authorization server
 */
export interface OAuthCallbackParams {
	readonly code: string;
	readonly state: string;
	readonly error?: string;
	readonly errorDescription?: string;
}

/**
 * OAuth result from callback
 */
export interface OAuthResult {
	readonly success: boolean;
	readonly accessToken?: string;
	readonly refreshToken?: string;
	readonly user?: AINativeUser;
	readonly error?: string;
	readonly errorCode?: string;
}

/**
 * OAuth error codes
 */
export enum OAuthErrorCode {
	InvalidState = 'invalid_state',
	StateExpired = 'state_expired',
	UserDenied = 'access_denied',
	InvalidCode = 'invalid_code',
	CodeExchangeFailed = 'code_exchange_failed',
	NetworkError = 'network_error',
	UnsupportedProvider = 'unsupported_provider',
	PKCENotSupported = 'pkce_not_supported',
	UnknownError = 'unknown_error'
}

/**
 * Custom OAuth error class
 */
export class OAuthError extends Error {
	constructor(
		public readonly code: OAuthErrorCode,
		message: string,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'OAuthError';
	}
}

/**
 * ZeroDB OAuth service interface
 */
export interface IZeroDBOAuthService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when OAuth flow is initiated
	 */
	readonly onDidInitiateOAuth: Event<OAuthState>;

	/**
	 * Event fired when OAuth flow is completed
	 */
	readonly onDidCompleteAuth: Event<OAuthResult>;

	/**
	 * Event fired when OAuth flow is cancelled
	 */
	readonly onDidCancelOAuth: Event<void>;

	/**
	 * Initiate OAuth flow for specified provider
	 * @param provider OAuth provider to use
	 * @param returnUrl Optional URL to return to after authentication
	 * @returns Authorization URL and state token
	 */
	initiateOAuthFlow(provider: OAuthProvider, returnUrl?: string): Promise<{ authUrl: string; state: string }>;

	/**
	 * Handle OAuth callback
	 * @param params Callback parameters from authorization server
	 * @returns OAuth result with token and user data
	 */
	handleCallback(params: OAuthCallbackParams): Promise<OAuthResult>;

	/**
	 * Cancel ongoing OAuth flow
	 */
	cancelOAuthFlow(): void;

	/**
	 * Check if OAuth flow is in progress
	 * @returns true if OAuth is in progress
	 */
	isOAuthInProgress(): boolean;

	/**
	 * Get provider configuration
	 * @param provider OAuth provider
	 * @returns Provider configuration
	 */
	getProviderConfig(provider: OAuthProvider): OAuthProviderConfig;
}

/**
 * ZeroDBOAuthService implementation
 * Implements OAuth 2.0 authorization code flow with PKCE support
 */
export class ZeroDBOAuthService extends Disposable implements IZeroDBOAuthService {
	readonly _serviceBrand: undefined;

	private static readonly API_BASE = 'https://api.ainative.studio';
	private static readonly REDIRECT_URI_BASE = 'ainativestudio://auth/callback';
	private static readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

	private static readonly STORAGE_KEY_STATE = 'ainative.oauth.zerodb.state';
	private static readonly STORAGE_KEY_VERIFIER = 'ainative.oauth.zerodb.verifier';
	private static readonly STORAGE_KEY_PROVIDER = 'ainative.oauth.zerodb.provider';
	private static readonly STORAGE_KEY_TIMESTAMP = 'ainative.oauth.zerodb.timestamp';
	private static readonly STORAGE_KEY_RETURN_URL = 'ainative.oauth.zerodb.returnUrl';

	// Provider configurations
	private readonly providerConfigs: Map<OAuthProvider, OAuthProviderConfig> = new Map([
		[OAuthProvider.Google, {
			provider: OAuthProvider.Google,
			clientId: process.env.AINATIVE_GOOGLE_CLIENT_ID || '',
			redirectUri: `${ZeroDBOAuthService.REDIRECT_URI_BASE}/google`,
			scope: ['openid', 'profile', 'email'],
			authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
			tokenEndpoint: 'https://oauth2.googleapis.com/token',
			supportsPKCE: true
		}],
		[OAuthProvider.GitHub, {
			provider: OAuthProvider.GitHub,
			clientId: process.env.AINATIVE_GITHUB_CLIENT_ID || 'Ov23liU7x20VoRInkAiq',
			redirectUri: `${ZeroDBOAuthService.REDIRECT_URI_BASE}/github`,
			scope: ['read:user', 'user:email'],
			authorizationEndpoint: 'https://github.com/login/oauth/authorize',
			tokenEndpoint: 'https://github.com/login/oauth/access_token',
			supportsPKCE: false // GitHub doesn't support PKCE for OAuth Apps
		}],
		[OAuthProvider.AINative, {
			provider: OAuthProvider.AINative,
			clientId: process.env.AINATIVE_CLIENT_ID || '',
			redirectUri: `${ZeroDBOAuthService.REDIRECT_URI_BASE}/ainative`,
			scope: ['openid', 'profile', 'email', 'zerodb'],
			authorizationEndpoint: `${ZeroDBOAuthService.API_BASE}/v1/auth/oauth/authorize`,
			tokenEndpoint: `${ZeroDBOAuthService.API_BASE}/v1/auth/oauth/token`,
			supportsPKCE: true
		}]
	]);

	private readonly _onDidInitiateOAuth = this._register(new Emitter<OAuthState>());
	readonly onDidInitiateOAuth = this._onDidInitiateOAuth.event;

	private readonly _onDidCompleteAuth = this._register(new Emitter<OAuthResult>());
	readonly onDidCompleteAuth = this._onDidCompleteAuth.event;

	private readonly _onDidCancelOAuth = this._register(new Emitter<void>());
	readonly onDidCancelOAuth = this._onDidCancelOAuth.event;

	constructor(
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
	}

	/**
	 * Generate cryptographically secure random state token
	 */
	private _generateState(): string {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Generate PKCE code verifier and challenge
	 * Uses SHA-256 for code challenge as per RFC 7636
	 */
	private async _generatePKCE(): Promise<PKCEData | null> {
		// Check if crypto.subtle is available (required for PKCE)
		if (typeof crypto === 'undefined' || !crypto.subtle) {
			console.warn('[ZeroDBOAuthService] crypto.subtle not available, PKCE disabled');
			return null;
		}

		try {
			// Generate code verifier (43-128 characters, base64url encoded)
			const array = new Uint8Array(32);
			crypto.getRandomValues(array);
			const verifier = this._base64URLEncode(array);

			// Generate code challenge (SHA-256 hash of verifier)
			const encoder = new TextEncoder();
			const data = encoder.encode(verifier);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			const challenge = this._base64URLEncode(new Uint8Array(hashBuffer));

			return { verifier, challenge };
		} catch (error) {
			console.error('[ZeroDBOAuthService] Failed to generate PKCE:', error);
			return null;
		}
	}

	/**
	 * Base64URL encode bytes (URL-safe base64 without padding)
	 */
	private _base64URLEncode(bytes: Uint8Array): string {
		const base64 = btoa(String.fromCharCode(...bytes));
		return base64
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	/**
	 * Build authorization URL with parameters
	 */
	private _buildAuthorizationUrl(
		config: OAuthProviderConfig,
		state: string,
		pkceData: PKCEData | null
	): string {
		const params = new URLSearchParams({
			client_id: config.clientId,
			redirect_uri: config.redirectUri,
			response_type: 'code',
			state,
			scope: config.scope.join(' ')
		});

		// Add PKCE parameters if available and supported
		if (pkceData && config.supportsPKCE) {
			params.append('code_challenge', pkceData.challenge);
			params.append('code_challenge_method', 'S256');
		}

		return `${config.authorizationEndpoint}?${params.toString()}`;
	}

	/**
	 * Initiate OAuth flow for specified provider
	 */
	async initiateOAuthFlow(
		provider: OAuthProvider,
		returnUrl?: string
	): Promise<{ authUrl: string; state: string }> {
		// Get provider configuration
		const config = this.providerConfigs.get(provider);
		if (!config) {
			throw new OAuthError(
				OAuthErrorCode.UnsupportedProvider,
				`Unsupported OAuth provider: ${provider}`
			);
		}

		// Validate client ID is configured
		if (!config.clientId) {
			throw new OAuthError(
				OAuthErrorCode.UnsupportedProvider,
				`OAuth client ID not configured for provider: ${provider}`
			);
		}

		// Generate CSRF state token
		const state = this._generateState();
		const timestamp = Date.now();

		// Generate PKCE code verifier and challenge (if supported)
		let pkceData: PKCEData | null = null;
		if (config.supportsPKCE) {
			pkceData = await this._generatePKCE();
			if (!pkceData) {
				console.warn('[ZeroDBOAuthService] PKCE generation failed, continuing without PKCE');
			}
		}

		// Build authorization URL
		const authUrl = this._buildAuthorizationUrl(config, state, pkceData);

		// Store OAuth state
		this.storageService.store(
			ZeroDBOAuthService.STORAGE_KEY_STATE,
			state,
			StorageScope.APPLICATION,
			StorageTarget.MACHINE
		);

		this.storageService.store(
			ZeroDBOAuthService.STORAGE_KEY_PROVIDER,
			provider,
			StorageScope.APPLICATION,
			StorageTarget.MACHINE
		);

		this.storageService.store(
			ZeroDBOAuthService.STORAGE_KEY_TIMESTAMP,
			timestamp,
			StorageScope.APPLICATION,
			StorageTarget.MACHINE
		);

		if (pkceData) {
			this.storageService.store(
				ZeroDBOAuthService.STORAGE_KEY_VERIFIER,
				pkceData.verifier,
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);
		}

		if (returnUrl) {
			this.storageService.store(
				ZeroDBOAuthService.STORAGE_KEY_RETURN_URL,
				returnUrl,
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);
		}

		// Emit event
		const oauthState: OAuthState = {
			state,
			codeVerifier: pkceData?.verifier,
			provider,
			timestamp,
			returnUrl
		};
		this._onDidInitiateOAuth.fire(oauthState);

		console.log(`[ZeroDBOAuthService] OAuth flow initiated for provider: ${provider}`);

		return { authUrl, state };
	}

	/**
	 * Handle OAuth callback
	 */
	async handleCallback(params: OAuthCallbackParams): Promise<OAuthResult> {
		try {
			// Check for errors from authorization server
			if (params.error) {
				const errorCode = params.error as OAuthErrorCode;
				const errorMessage = params.errorDescription || params.error;

				const result: OAuthResult = {
					success: false,
					error: errorMessage,
					errorCode: errorCode
				};

				this._onDidCompleteAuth.fire(result);
				this._clearState();

				return result;
			}

			// Retrieve stored OAuth state
			const storedState = this.storageService.get(
				ZeroDBOAuthService.STORAGE_KEY_STATE,
				StorageScope.APPLICATION
			);

			const storedProvider = this.storageService.get(
				ZeroDBOAuthService.STORAGE_KEY_PROVIDER,
				StorageScope.APPLICATION
			) as OAuthProvider | undefined;

			const storedTimestamp = this.storageService.getNumber(
				ZeroDBOAuthService.STORAGE_KEY_TIMESTAMP,
				StorageScope.APPLICATION,
				0
			);

			const storedVerifier = this.storageService.get(
				ZeroDBOAuthService.STORAGE_KEY_VERIFIER,
				StorageScope.APPLICATION
			);

			// Validate state token (CSRF protection)
			if (!storedState || storedState !== params.state) {
				const result: OAuthResult = {
					success: false,
					error: 'Invalid state token - CSRF protection failed',
					errorCode: OAuthErrorCode.InvalidState
				};
				this._onDidCompleteAuth.fire(result);
				this._clearState();
				return result;
			}

			// Check state expiry
			if (Date.now() - storedTimestamp > ZeroDBOAuthService.STATE_EXPIRY_MS) {
				const result: OAuthResult = {
					success: false,
					error: 'OAuth state expired - please try again',
					errorCode: OAuthErrorCode.StateExpired
				};
				this._onDidCompleteAuth.fire(result);
				this._clearState();
				return result;
			}

			// Validate provider
			if (!storedProvider) {
				const result: OAuthResult = {
					success: false,
					error: 'OAuth provider not found in state',
					errorCode: OAuthErrorCode.UnknownError
				};
				this._onDidCompleteAuth.fire(result);
				this._clearState();
				return result;
			}

			// Exchange authorization code for access token
			const tokenResult = await this._exchangeCode(
				params.code,
				storedProvider,
				storedVerifier
			);

			// Clear stored state
			this._clearState();

			// Fire completion event
			this._onDidCompleteAuth.fire(tokenResult);

			if (tokenResult.success) {
				console.log(`[ZeroDBOAuthService] OAuth callback successful for provider: ${storedProvider}`);
			} else {
				console.error('[ZeroDBOAuthService] OAuth callback failed:', tokenResult.error);
			}

			return tokenResult;

		} catch (error) {
			console.error('[ZeroDBOAuthService] OAuth callback failed:', error);

			const result: OAuthResult = {
				success: false,
				error: error instanceof Error ? error.message : 'OAuth callback failed',
				errorCode: OAuthErrorCode.UnknownError
			};

			this._onDidCompleteAuth.fire(result);
			this._clearState();

			return result;
		}
	}

	/**
	 * Exchange authorization code for access token
	 */
	private async _exchangeCode(
		code: string,
		provider: OAuthProvider,
		codeVerifier?: string
	): Promise<OAuthResult> {
		try {
			// Exchange code via AINative backend (acts as OAuth proxy)
			// This is more secure than doing it directly in the client
			const response = await fetch(`${ZeroDBOAuthService.API_BASE}/v1/auth/oauth/${provider}/callback`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					code,
					code_verifier: codeVerifier
				})
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => response.statusText);
				return {
					success: false,
					error: `Token exchange failed: ${errorText}`,
					errorCode: OAuthErrorCode.CodeExchangeFailed
				};
			}

			const data = await response.json();

			return {
				success: true,
				accessToken: data.access_token,
				refreshToken: data.refresh_token,
				user: {
					id: data.user.id,
					email: data.user.email,
					name: data.user.name,
					role: data.user.role,
					createdAt: data.user.created_at,
					updatedAt: data.user.updated_at
				}
			};

		} catch (error) {
			console.error('[ZeroDBOAuthService] Code exchange failed:', error);

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Network error during token exchange',
				errorCode: OAuthErrorCode.NetworkError
			};
		}
	}

	/**
	 * Cancel ongoing OAuth flow
	 */
	cancelOAuthFlow(): void {
		this._clearState();
		this._onDidCancelOAuth.fire();
		console.log('[ZeroDBOAuthService] OAuth flow cancelled');
	}

	/**
	 * Check if OAuth flow is in progress
	 */
	isOAuthInProgress(): boolean {
		const storedState = this.storageService.get(
			ZeroDBOAuthService.STORAGE_KEY_STATE,
			StorageScope.APPLICATION
		);

		const storedTimestamp = this.storageService.getNumber(
			ZeroDBOAuthService.STORAGE_KEY_TIMESTAMP,
			StorageScope.APPLICATION,
			0
		);

		if (!storedState || !storedTimestamp) {
			return false;
		}

		// Check if state has expired
		if (Date.now() - storedTimestamp > ZeroDBOAuthService.STATE_EXPIRY_MS) {
			this._clearState();
			return false;
		}

		return true;
	}

	/**
	 * Get provider configuration
	 */
	getProviderConfig(provider: OAuthProvider): OAuthProviderConfig {
		const config = this.providerConfigs.get(provider);
		if (!config) {
			throw new OAuthError(
				OAuthErrorCode.UnsupportedProvider,
				`Unsupported OAuth provider: ${provider}`
			);
		}
		return config;
	}

	/**
	 * Clear stored OAuth state
	 */
	private _clearState(): void {
		this.storageService.remove(
			ZeroDBOAuthService.STORAGE_KEY_STATE,
			StorageScope.APPLICATION
		);

		this.storageService.remove(
			ZeroDBOAuthService.STORAGE_KEY_PROVIDER,
			StorageScope.APPLICATION
		);

		this.storageService.remove(
			ZeroDBOAuthService.STORAGE_KEY_TIMESTAMP,
			StorageScope.APPLICATION
		);

		this.storageService.remove(
			ZeroDBOAuthService.STORAGE_KEY_VERIFIER,
			StorageScope.APPLICATION
		);

		this.storageService.remove(
			ZeroDBOAuthService.STORAGE_KEY_RETURN_URL,
			StorageScope.APPLICATION
		);
	}
}

// Register service as singleton
registerSingleton(IZeroDBOAuthService, ZeroDBOAuthService, InstantiationType.Delayed);
