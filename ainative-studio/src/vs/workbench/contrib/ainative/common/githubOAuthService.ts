/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { AINativeUser } from './ainativeAuthService.js';

export const IGitHubOAuthService = createDecorator<IGitHubOAuthService>('githubOAuthService');

/**
 * OAuth state containing state token and timestamp
 */
export interface OAuthState {
	readonly state: string;
	readonly timestamp: number;
}

/**
 * OAuth result from callback
 */
export interface OAuthResult {
	readonly success: boolean;
	readonly token?: string;
	readonly refreshToken?: string;
	readonly user?: AINativeUser;
	readonly error?: string;
}

/**
 * GitHub OAuth service interface
 */
export interface IGitHubOAuthService {
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
	 * Initiate GitHub OAuth flow
	 * @returns Auth URL and state token
	 */
	initiateOAuthFlow(): Promise<{ authUrl: string; state: string }>;

	/**
	 * Handle OAuth callback
	 * @param code Authorization code from GitHub
	 * @param state State token to validate
	 * @returns OAuth result with token and user data
	 */
	handleCallback(code: string, state: string): Promise<OAuthResult>;

	/**
	 * Cancel ongoing OAuth flow
	 */
	cancelOAuthFlow(): void;

	/**
	 * Check if OAuth flow is in progress
	 * @returns true if OAuth is in progress
	 */
	isOAuthInProgress(): boolean;
}

/**
 * GitHubOAuthService implementation
 */
export class GitHubOAuthService extends Disposable implements IGitHubOAuthService {
	readonly _serviceBrand: undefined;

	private static readonly OAUTH_ENDPOINT = 'https://github.com/login/oauth/authorize';
	private static readonly CLIENT_ID = 'Ov23liU7x20VoRInkAiq';
	private static readonly REDIRECT_URI = 'ainativestudio://auth/github/callback';
	private static readonly SCOPE = 'read:user,user:email';
	private static readonly API_BASE = 'https://api.ainative.studio';

	private static readonly STORAGE_KEY_STATE = 'ainative.oauth.github.state';
	private static readonly STORAGE_KEY_TIMESTAMP = 'ainative.oauth.github.timestamp';
	private static readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

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
		const array = new Uint8Array(16);
		crypto.getRandomValues(array);
		return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Initiate GitHub OAuth flow
	 */
	async initiateOAuthFlow(): Promise<{ authUrl: string; state: string }> {
		// Generate CSRF state token
		const state = this._generateState();
		const timestamp = Date.now();

		// Build GitHub OAuth URL
		const params = new URLSearchParams({
			client_id: GitHubOAuthService.CLIENT_ID,
			redirect_uri: GitHubOAuthService.REDIRECT_URI,
			state,
			scope: GitHubOAuthService.SCOPE
		});

		const authUrl = `${GitHubOAuthService.OAUTH_ENDPOINT}?${params.toString()}`;

		// Store state and timestamp in storage
		this.storageService.store(
			GitHubOAuthService.STORAGE_KEY_STATE,
			state,
			StorageScope.APPLICATION,
			StorageTarget.MACHINE
		);

		this.storageService.store(
			GitHubOAuthService.STORAGE_KEY_TIMESTAMP,
			timestamp,
			StorageScope.APPLICATION,
			StorageTarget.MACHINE
		);

		// Emit event
		this._onDidInitiateOAuth.fire({ state, timestamp });

		console.log('[GitHubOAuthService] OAuth flow initiated');

		return { authUrl, state };
	}

	/**
	 * Handle OAuth callback
	 */
	async handleCallback(code: string, state: string): Promise<OAuthResult> {
		try {
			// Validate state token
			const storedState = this.storageService.get(
				GitHubOAuthService.STORAGE_KEY_STATE,
				StorageScope.APPLICATION
			);

			const storedTimestamp = this.storageService.getNumber(
				GitHubOAuthService.STORAGE_KEY_TIMESTAMP,
				StorageScope.APPLICATION,
				0
			);

			if (!storedState || storedState !== state) {
				const result: OAuthResult = {
					success: false,
					error: 'Invalid state token - CSRF protection failed'
				};
				this._onDidCompleteAuth.fire(result);
				return result;
			}

			// Check state expiry
			if (Date.now() - storedTimestamp > GitHubOAuthService.STATE_EXPIRY_MS) {
				const result: OAuthResult = {
					success: false,
					error: 'OAuth state expired - please try again'
				};
				this._onDidCompleteAuth.fire(result);
				return result;
			}

			// Exchange code for access token via AINative backend
			const response = await fetch(`${GitHubOAuthService.API_BASE}/v1/auth/github/callback`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ code, state })
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => response.statusText);
				const result: OAuthResult = {
					success: false,
					error: `Authentication failed: ${errorText}`
				};
				this._onDidCompleteAuth.fire(result);
				return result;
			}

			const data = await response.json();

			// Clear stored state
			this._clearState();

			const result: OAuthResult = {
				success: true,
				token: data.access_token,
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

			this._onDidCompleteAuth.fire(result);

			console.log('[GitHubOAuthService] OAuth callback successful');

			return result;

		} catch (error) {
			console.error('[GitHubOAuthService] OAuth callback failed:', error);

			const result: OAuthResult = {
				success: false,
				error: error instanceof Error ? error.message : 'Network error occurred'
			};

			this._onDidCompleteAuth.fire(result);
			return result;
		}
	}

	/**
	 * Cancel ongoing OAuth flow
	 */
	cancelOAuthFlow(): void {
		this._clearState();
		this._onDidCancelOAuth.fire();
		console.log('[GitHubOAuthService] OAuth flow cancelled');
	}

	/**
	 * Check if OAuth flow is in progress
	 */
	isOAuthInProgress(): boolean {
		const storedState = this.storageService.get(
			GitHubOAuthService.STORAGE_KEY_STATE,
			StorageScope.APPLICATION
		);

		const storedTimestamp = this.storageService.getNumber(
			GitHubOAuthService.STORAGE_KEY_TIMESTAMP,
			StorageScope.APPLICATION,
			0
		);

		if (!storedState || !storedTimestamp) {
			return false;
		}

		// Check if state has expired
		if (Date.now() - storedTimestamp > GitHubOAuthService.STATE_EXPIRY_MS) {
			this._clearState();
			return false;
		}

		return true;
	}

	/**
	 * Clear stored OAuth state
	 */
	private _clearState(): void {
		this.storageService.remove(
			GitHubOAuthService.STORAGE_KEY_STATE,
			StorageScope.APPLICATION
		);

		this.storageService.remove(
			GitHubOAuthService.STORAGE_KEY_TIMESTAMP,
			StorageScope.APPLICATION
		);
	}
}
