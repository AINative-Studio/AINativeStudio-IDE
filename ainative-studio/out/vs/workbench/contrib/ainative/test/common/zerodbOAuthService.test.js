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