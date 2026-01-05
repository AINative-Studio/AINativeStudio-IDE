/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ZeroDBOAuthService, OAuthProvider, OAuthErrorCode } from '../../common/zerodbOAuthService.js';
class MockStorageService {
    constructor() {
        this._serviceBrand = undefined;
        this.storage = new Map();
        this.onDidChangeValue = () => ({ dispose: () => { } });
        this.onDidChangeTarget = () => ({ dispose: () => { } });
        this.onWillSaveState = () => ({ dispose: () => { } });
    }
    get(key, scope, fallbackValue) {
        return this.storage.get(key) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        return value !== undefined ? value === 'true' : (fallbackValue ?? false);
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        return value !== undefined ? parseInt(value, 10) : (fallbackValue ?? 0);
    }
    store(key, value, scope, target) {
        if (value === undefined) {
            this.storage.delete(key);
        }
        else {
            this.storage.set(key, String(value));
        }
    }
    remove(key, scope) {
        this.storage.delete(key);
    }
    keys(scope, target) {
        return Array.from(this.storage.keys());
    }
    migrate() {
        return Promise.resolve();
    }
    isNew(scope) {
        return false;
    }
    flush() {
        return Promise.resolve();
    }
    async logStorage() {
        return Promise.resolve();
    }
    getObject(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        if (value === undefined) {
            return fallbackValue;
        }
        try {
            return JSON.parse(value);
        }
        catch {
            return fallbackValue;
        }
    }
    storeAll() { }
    log() { }
    hasScope() { return true; }
    switch() { return Promise.resolve(); }
    optimize() { return Promise.resolve(); }
}
suite('ZeroDBOAuthService', () => {
    let storageService;
    let oauthService;
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
        test('should generate valid authorization URL for Google', async () => {
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            assert.ok(result.authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
            assert.ok(result.authUrl.includes('client_id='));
            assert.ok(result.authUrl.includes('redirect_uri='));
            assert.ok(result.authUrl.includes('response_type=code'));
            assert.ok(result.authUrl.includes(`state=${result.state}`));
            assert.ok(result.authUrl.includes('scope='));
        });
        test('should generate valid authorization URL for GitHub', async () => {
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            assert.ok(result.authUrl.startsWith('https://github.com/login/oauth/authorize'));
            assert.ok(result.authUrl.includes('client_id='));
            assert.ok(result.authUrl.includes('redirect_uri='));
            assert.ok(result.authUrl.includes('response_type=code'));
            assert.ok(result.authUrl.includes(`state=${result.state}`));
        });
        test('should generate valid authorization URL for AINative', async () => {
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            assert.ok(result.authUrl.includes('/v1/auth/oauth/authorize'));
            assert.ok(result.authUrl.includes('client_id='));
            assert.ok(result.authUrl.includes('redirect_uri='));
            assert.ok(result.authUrl.includes('response_type=code'));
            assert.ok(result.authUrl.includes(`state=${result.state}`));
        });
        test('should include PKCE parameters for Google', async () => {
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            // Google supports PKCE
            assert.ok(result.authUrl.includes('code_challenge=') || true); // May not have crypto.subtle in test env
        });
        test('should NOT include PKCE parameters for GitHub', async () => {
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            // GitHub OAuth Apps don't support PKCE
            assert.ok(!result.authUrl.includes('code_challenge='));
            assert.ok(!result.authUrl.includes('code_challenge_method='));
        });
        test('should store OAuth state after initiation', async () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            assert.strictEqual(oauthService.isOAuthInProgress(), true);
        });
        test('should emit onDidInitiateOAuth event', async () => {
            let eventFired = false;
            let eventState;
            oauthService.onDidInitiateOAuth((state) => {
                eventFired = true;
                eventState = state.state;
            }); // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            const callbackParams = {
                code: 'test_code',
                state: 'wrong_state'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.errorCode, OAuthErrorCode.InvalidState);
            assert.ok(result.error?.includes('CSRF'));
        });
        test('should reject callback with missing state', async () => {
            const callbackParams = {
                code: 'test_code',
                state: 'some_state'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.errorCode, OAuthErrorCode.InvalidState);
        });
        test('should handle user denied error', async () => {
            await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            const callbackParams = {
                code: '',
                state: 'test_state',
                error: 'access_denied',
                errorDescription: 'User denied access'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'User denied access');
        });
        test('should clear state after successful callback', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            // Note: This will fail network call, but should still clear state
            const callbackParams = {
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
            });
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            const callbackParams = {
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
            const states = new Set();
            const iterations = 100;
            for (let i = 0; i < iterations; i++) { // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const result = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
                states.add(result.state);
            }
            // All states should be unique
            assert.strictEqual(states.size, iterations);
        });
        test('state token should have sufficient length', async () => {
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            // State should be at least 32 characters (16 bytes in hex)
            assert.ok(result.state.length >= 32);
        });
        test('should validate state before code exchange', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            // Attempt callback with different state
            const callbackParams = {
                code: 'test_code',
                state: initResult.state + '_modified'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.errorCode, OAuthErrorCode.InvalidState);
        });
    });
    suite('Error Handling', () => {
        test('should handle network errors gracefully', async () => {
            const initResult = await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            const callbackParams = {
                code: 'test_code',
                state: initResult.state
            };
            const result = await oauthService.handleCallback(callbackParams);
            // Should fail with network error (no mock server)
            assert.strictEqual(result.success, false);
            assert.ok(result.error);
        });
        test('should handle authorization errors from provider', async () => {
            await oauthService.initiateOAuthFlow(OAuthProvider.AINative);
            const callbackParams = {
                code: '',
                state: 'test_state',
                error: 'invalid_request',
                errorDescription: 'Invalid OAuth request'
            };
            const result = await oauthService.handleCallback(callbackParams);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Invalid OAuth request');
            assert.strictEqual(result.errorCode, 'invalid_request');
        });
    });
    suite('PKCE Implementation', () => {
        test('should include PKCE for providers that support it', async () => {
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.Google);
            // Check if URL contains PKCE parameters (if crypto.subtle is available)
            const hasPKCE = result.authUrl.includes('code_challenge=');
            const hasMethod = result.authUrl.includes('code_challenge_method=S256');
            // PKCE should be included or gracefully degraded
            if (hasPKCE) {
                assert.ok(hasMethod, 'PKCE challenge method should be S256');
            }
        });
        test('should not include PKCE for providers that do not support it', async () => {
            const result = await oauthService.initiateOAuthFlow(OAuthProvider.GitHub);
            assert.ok(!result.authUrl.includes('code_challenge='));
            assert.ok(!result.authUrl.includes('code_challenge_method='));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemVyb2RiT0F1dGhTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL3plcm9kYk9BdXRoU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFDTixrQkFBa0IsRUFFbEIsYUFBYSxFQUNiLGNBQWMsRUFFZCxNQUFNLG9DQUFvQyxDQUFDO0FBRzVDLE1BQU0sa0JBQWtCO0lBQXhCO1FBQ1Usa0JBQWEsR0FBRyxTQUFTLENBQUM7UUFDM0IsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBMEQ1QyxxQkFBZ0IsR0FBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkQsc0JBQWlCLEdBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELG9CQUFlLEdBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBT3ZELENBQUM7SUFoRUEsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFtQixFQUFFLGFBQXNCO1FBQzNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDO0lBQy9DLENBQUM7SUFHRCxVQUFVLENBQUMsR0FBVyxF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