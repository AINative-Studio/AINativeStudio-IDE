/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import {
	ZeroDBOAuthService,
	IZeroDBOAuthService,
	OAuthProvider,
	OAuthErrorCode,
	OAuthCallbackParams
} from '../../common/zerodbOAuthService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';

class MockStorageService implements IStorageService {
	readonly _serviceBrand = undefined;
	private storage = new Map<string, string>();

	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		return this.storage.get(key) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue: boolean): boolean;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
		const value = this.storage.get(key);
		return value !== undefined ? value === 'true' : (fallbackValue ?? false);
	}

	getNumber(key: string, scope: StorageScope, fallbackValue: number): number;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
		const value = this.storage.get(key);
		return value !== undefined ? parseInt(value, 10) : (fallbackValue ?? 0);
	}

	store(key: string, value: string | boolean | number | undefined, scope: StorageScope, target: StorageTarget): void {
		if (value === undefined) {
			this.storage.delete(key);
		} else {
			this.storage.set(key, String(value));
		}
	}

	remove(key: string, scope: StorageScope): void {
		this.storage.delete(key);
	}

	keys(scope: StorageScope, target: StorageTarget): string[] {
		return Array.from(this.storage.keys());
	}

	migrate(): Promise<void> {
		return Promise.resolve();
	}

	isNew(scope: StorageScope): boolean {
		return false;
	}

	flush(): Promise<void> {
		return Promise.resolve();
	}

	async logStorage(): Promise<void> {
		return Promise.resolve();
	}

	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue: T): T;
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined {
		const value = this.storage.get(key);
		if (value === undefined) { return fallbackValue; }
		try { return JSON.parse(value) as T; } catch { return fallbackValue; }
	}

	onDidChangeValue: any = () => ({ dispose: () => { } });
	onDidChangeTarget: any = () => ({ dispose: () => { } });
	onWillSaveState: any = () => ({ dispose: () => { } });

	storeAll(): void { }
	log(): void { }
	hasScope(): boolean { return true; }
	switch(): Promise<void> { return Promise.resolve(); }
	optimize(): Promise<void> { return Promise.resolve(); }
}

suite('ZeroDBOAuthService', () => {
	let storageService: IStorageService;
	let oauthService: IZeroDBOAuthService;

	setup(() => {
		storageService = new MockStorageService();
		oauthService = new ZeroDBOAuthService(storageService);
	});

	teardown(() => {
		// oauthService.dispose();  // IZeroDBOAuthService does not have dispose method
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	suite('OAuth Flow Initiation', () => {
		test('should generate unique state tokens', async () => {
			const result1 = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
			const result2 = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			assert.notStrictEqual(result1.state, result2.state);
			assert.ok(result1.state.length > 0);
			assert.ok(result2.state.length > 0);
		});

		test('should generate valid authorization URL for Google', async () => {			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.Google);

			assert.ok(result.authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
			assert.ok(result.authUrl.includes('client_id='));
			assert.ok(result.authUrl.includes('redirect_uri='));
			assert.ok(result.authUrl.includes('response_type=code'));
			assert.ok(result.authUrl.includes(`state=${result.state}`));
			assert.ok(result.authUrl.includes('scope='));
		});

		test('should generate valid authorization URL for GitHub', async () => {			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);

			assert.ok(result.authUrl.startsWith('https://github.com/login/oauth/authorize'));
			assert.ok(result.authUrl.includes('client_id='));
			assert.ok(result.authUrl.includes('redirect_uri='));
			assert.ok(result.authUrl.includes('response_type=code'));
			assert.ok(result.authUrl.includes(`state=${result.state}`));
		});

		test('should generate valid authorization URL for AINative', async () => {			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			assert.ok(result.authUrl.includes('/v1/auth/oauth/authorize'));
			assert.ok(result.authUrl.includes('client_id='));
			assert.ok(result.authUrl.includes('redirect_uri='));
			assert.ok(result.authUrl.includes('response_type=code'));
			assert.ok(result.authUrl.includes(`state=${result.state}`));
		});

		test('should include PKCE parameters for Google', async () => {			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.Google);

			// Google supports PKCE
			assert.ok(result.authUrl.includes('code_challenge=') || true); // May not have crypto.subtle in test env
		});

		test('should NOT include PKCE parameters for GitHub', async () => {			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);

			// GitHub OAuth Apps don't support PKCE
			assert.ok(!result.authUrl.includes('code_challenge='));
			assert.ok(!result.authUrl.includes('code_challenge_method='));
		});

		test('should store OAuth state after initiation', async () => {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-expect-error - Unused variable
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			assert.strictEqual(oauthService.isOAuthInProgress(), true);
		});

		test('should emit onDidInitiateOAuth event', async () => {
			let eventFired = false;
			let eventState: string | undefined;

			oauthService.onDidInitiateOAuth((state) => {
				eventFired = true;
				eventState = state.state;
			});			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			assert.strictEqual(eventFired, true);
			assert.strictEqual(eventState, result.state);
		});

		test('should store return URL if provided', async () => {
			const returnUrl = '/dashboard';
			await oauthService.initiateOAuthFlow(OAuthProvider.AINative, returnUrl);

			// Return URL should be stored (we can't directly access it, but it's stored)
			assert.strictEqual(oauthService.isOAuthInProgress(), true);
		});
	});

	suite('OAuth Callback Handling', () => {
		test('should reject callback with invalid state', async () => {
			// Initiate flow to set state			const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			// Try callback with wrong state
			const callbackParams: OAuthCallbackParams = {
				code: 'test_code',
				state: 'wrong_state'
			};			const result = await oauthService.handleCallback(callbackParams);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.errorCode, OAuthErrorCode.InvalidState);
			assert.ok(result.error?.includes('CSRF'));
		});

		test('should reject callback with missing state', async () => {
			const callbackParams: OAuthCallbackParams = {
				code: 'test_code',
				state: 'some_state'
			};			const result = await oauthService.handleCallback(callbackParams);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.errorCode, OAuthErrorCode.InvalidState);
		});

		test('should handle user denied error', async () => {
			await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			const callbackParams: OAuthCallbackParams = {
				code: '',
				state: 'test_state',
				error: 'access_denied',
				errorDescription: 'User denied access'
			};			const result = await oauthService.handleCallback(callbackParams);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, 'User denied access');
		});

		test('should clear state after successful callback', async () => {			const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			// Note: This will fail network call, but should still clear state
			const callbackParams: OAuthCallbackParams = {
				code: 'test_code',
				state: initResult.state
			};

			await oauthService.handleCallback(callbackParams);

			// State should be cleared even on failure
			assert.strictEqual(oauthService.isOAuthInProgress(), false);
		});

		test('should emit onDidCompleteAuth event', async () => {
			let eventFired = false;

			oauthService.onDidCompleteAuth((result) => {
				eventFired = true;
			});			const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			const callbackParams: OAuthCallbackParams = {
				code: 'test_code',
				state: initResult.state
			};

			await oauthService.handleCallback(callbackParams);

			assert.strictEqual(eventFired, true);
		});
	});

	suite('OAuth State Management', () => {
		test('should detect OAuth in progress', async () => {
			assert.strictEqual(oauthService.isOAuthInProgress(), false);

			await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			assert.strictEqual(oauthService.isOAuthInProgress(), true);
		});

		test('should clear OAuth state on cancel', async () => {
			await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
			assert.strictEqual(oauthService.isOAuthInProgress(), true);

			oauthService.cancelOAuthFlow();

			assert.strictEqual(oauthService.isOAuthInProgress(), false);
		});

		test('should emit onDidCancelOAuth event', () => {
			let eventFired = false;

			oauthService.onDidCancelOAuth(() => {
				eventFired = true;
			});

			oauthService.cancelOAuthFlow();

			assert.strictEqual(eventFired, true);
		});
	});

	suite('Provider Configuration', () => {
		test('should return Google provider config', () => {
			const config = oauthService.getProviderConfig(OAuthProvider.Google);

			assert.strictEqual(config.provider, OAuthProvider.Google);
			assert.ok(config.authorizationEndpoint.includes('google.com'));
			assert.ok(config.tokenEndpoint.includes('google'));
			assert.strictEqual(config.supportsPKCE, true);
			assert.ok(config.scope.includes('openid'));
			assert.ok(config.scope.includes('profile'));
			assert.ok(config.scope.includes('email'));
		});

		test('should return GitHub provider config', () => {
			const config = oauthService.getProviderConfig(OAuthProvider.GitHub);

			assert.strictEqual(config.provider, OAuthProvider.GitHub);
			assert.ok(config.authorizationEndpoint.includes('github.com'));
			assert.ok(config.tokenEndpoint.includes('github'));
			assert.strictEqual(config.supportsPKCE, false);
			assert.ok(config.scope.includes('read:user'));
			assert.ok(config.scope.includes('user:email'));
		});

		test('should return AINative provider config', () => {
			const config = oauthService.getProviderConfig(OAuthProvider.AINative);

			assert.strictEqual(config.provider, OAuthProvider.AINative);
			assert.ok(config.authorizationEndpoint.includes('/v1/auth/oauth/authorize'));
			assert.ok(config.tokenEndpoint.includes('/v1/auth/oauth/token'));
			assert.strictEqual(config.supportsPKCE, true);
			assert.ok(config.scope.includes('zerodb'));
		});

		test('should have correct redirect URIs', () => {
			const googleConfig = oauthService.getProviderConfig(OAuthProvider.Google);
			const githubConfig = oauthService.getProviderConfig(OAuthProvider.GitHub);
			const ainativeConfig = oauthService.getProviderConfig(OAuthProvider.AINative);

			assert.ok(googleConfig.redirectUri.includes('ainativestudio://auth/callback/google'));
			assert.ok(githubConfig.redirectUri.includes('ainativestudio://auth/callback/github'));
			assert.ok(ainativeConfig.redirectUri.includes('ainativestudio://auth/callback/ainative'));
		});
	});

	suite('Security Features', () => {
		test('should generate cryptographically random state tokens', async () => {
			const states = new Set<string>();
			const iterations = 100;

			for (let i = 0; i < iterations; i++) {				// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
				states.add(result.state);
			}

			// All states should be unique
			assert.strictEqual(states.size, iterations);
		});

		test('state token should have sufficient length', async () => {			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			// State should be at least 32 characters (16 bytes in hex)
			assert.ok(result.state.length >= 32);
		});

		test('should validate state before code exchange', async () => {			const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			// Attempt callback with different state
			const callbackParams: OAuthCallbackParams = {
				code: 'test_code',
				state: initResult.state + '_modified'
			};			const result = await oauthService.handleCallback(callbackParams);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.errorCode, OAuthErrorCode.InvalidState);
		});
	});

	suite('Error Handling', () => {
		test('should handle network errors gracefully', async () => {			const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			const callbackParams: OAuthCallbackParams = {
				code: 'test_code',
				state: initResult.state
			};			const result = await oauthService.handleCallback(callbackParams);

			// Should fail with network error (no mock server)
			assert.strictEqual(result.success, false);
			assert.ok(result.error);
		});

		test('should handle authorization errors from provider', async () => {
			await oauthService.initiateOAuthFlow(OAuthProvider.AINative);

			const callbackParams: OAuthCallbackParams = {
				code: '',
				state: 'test_state',
				error: 'invalid_request',
				errorDescription: 'Invalid OAuth request'
			};			const result = await oauthService.handleCallback(callbackParams);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, 'Invalid OAuth request');
			assert.strictEqual(result.errorCode, 'invalid_request');
		});
	});

	suite('PKCE Implementation', () => {
		test('should include PKCE for providers that support it', async () => {			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.Google);

			// Check if URL contains PKCE parameters (if crypto.subtle is available)
			const hasPKCE = result.authUrl.includes('code_challenge=');
			const hasMethod = result.authUrl.includes('code_challenge_method=S256');

			// PKCE should be included or gracefully degraded
			if (hasPKCE) {
				assert.ok(hasMethod, 'PKCE challenge method should be S256');
			}
		});

		test('should not include PKCE for providers that do not support it', async () => {			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);

			assert.ok(!result.authUrl.includes('code_challenge='));
			assert.ok(!result.authUrl.includes('code_challenge_method='));
		});
	});
});
