/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { GitHubOAuthService } from '../../common/githubOAuthService.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('GitHubOAuthService', () => {
    const disposables = new DisposableStore();
    ensureNoDisposablesAreLeakedInTestSuite();
    let storageService;
    let service;
    class MockStorageService {
        constructor() {
            this._serviceBrand = undefined;
            this.storage = new Map();
            this.onDidChangeTarget = { dispose: () => { } };
            this.onWillSaveState = { dispose: () => { } };
        }
        get(key, scope, fallbackValue) {
            return this.storage.get(key) ?? fallbackValue;
        }
        getBoolean(key, scope, fallbackValue) {
            const value = this.storage.get(key);
            return value !== undefined ? value === 'true' : fallbackValue;
        }
        getNumber(key, scope, fallbackValue) {
            const value = this.storage.get(key);
            return value !== undefined ? parseInt(value, 10) : fallbackValue;
        }
        getObject(key, scope, fallbackValue) {
            return fallbackValue;
        }
        store(key, value, scope, target) {
            if (value === undefined || value === null) {
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
        onDidChangeValue(scope, key, disposable) {
            return { dispose: () => { } };
        }
        isNew(scope) { return false; }
        flush(reason) { return Promise.resolve(); }
        switch() { return Promise.resolve(); }
        hasScope(scope) { return true; }
        storeAll(entries, external) { }
        log() { }
        async optimize(scope) { }
    }
    setup(() => {
        storageService = new MockStorageService();
        service = disposables.add(new GitHubOAuthService(storageService));
    });
    teardown(() => {
        disposables.clear();
    });
    suite('initiateOAuthFlow', () => {
        test('should generate auth URL with correct parameters', async () => {
            const result = await service.initiateOAuthFlow();
            assert.ok(result.authUrl, 'Auth URL should be defined');
            assert.ok(result.state, 'State token should be defined');
            assert.ok(result.authUrl.includes('github.com/login/oauth/authorize'), 'URL should point to GitHub OAuth');
            assert.ok(result.authUrl.includes('client_id=Ov23liU7x20VoRInkAiq'), 'URL should include client ID');
            assert.ok(result.authUrl.includes('redirect_uri='), 'URL should include redirect URI');
            assert.ok(result.authUrl.includes(`state=${result.state}`), 'URL should include state token');
            assert.ok(result.authUrl.includes('scope='), 'URL should include scope');
        });
        test('should generate unique state tokens', async () => {
            const result1 = await service.initiateOAuthFlow();
            const result2 = await service.initiateOAuthFlow();
            assert.notStrictEqual(result1.state, result2.state, 'State tokens should be unique');
            assert.strictEqual(result1.state.length, 32, 'State token should be 32 characters');
            assert.strictEqual(result2.state.length, 32, 'State token should be 32 characters');
        });
        test('should store state token in storage', async () => {
            const result = await service.initiateOAuthFlow();
            const storedState = storageService.get('ainative.oauth.github.state', -1 /* StorageScope.APPLICATION */);
            assert.strictEqual(storedState, result.state, 'State should be stored in storage');
        });
        test('should emit onDidInitiateOAuth event', async () => {
            let eventFired = false;
            let eventState;
            service.onDidInitiateOAuth(state => {
                eventFired = true;
                eventState = state;
            });
            const result = await service.initiateOAuthFlow();
            assert.ok(eventFired, 'Event should be fired');
            assert.strictEqual(eventState?.state, result.state, 'Event should contain state token');
        });
    });
    suite('handleCallback', () => {
        test('should validate state token', async () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // @ts-expect-error - Unused variable
            const { state } = await service.initiateOAuthFlow();
            await assert.rejects(() => service.handleCallback('valid_code', 'invalid_state'), /Invalid state token/, 'Should reject with invalid state');
        });
        test('should accept valid state token', async () => {
            const { state } = await service.initiateOAuthFlow();
            // Mock successful backend response
            global.fetch = async () => ({
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    access_token: 'test_token',
                    refresh_token: 'test_refresh',
                    user: {
                        id: '123',
                        email: 'test@example.com',
                        name: 'Test User',
                        role: 'user'
                    }
                })
            });
            const result = await service.handleCallback('valid_code', state);
            assert.ok(result.success, 'Callback should succeed with valid state');
            assert.strictEqual(result.token, 'test_token', 'Should return access token');
            assert.strictEqual(result.user?.email, 'test@example.com', 'Should return user data');
        });
        test('should clear state after successful callback', async () => {
            const { state } = await service.initiateOAuthFlow();
            global.fetch = async () => ({
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    access_token: 'test_token',
                    user: { id: '123', email: 'test@example.com', role: 'user' }
                })
            });
            await service.handleCallback('valid_code', state);
            const storedState = storageService.get('ainative.oauth.github.state', -1 /* StorageScope.APPLICATION */);
            assert.strictEqual(storedState, undefined, 'State should be cleared after successful callback');
        });
        test('should emit onDidCompleteAuth event on success', async () => {
            const { state } = await service.initiateOAuthFlow();
            global.fetch = async () => ({
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    access_token: 'test_token',
                    user: { id: '123', email: 'test@example.com', role: 'user' }
                })
            });
            let eventFired = false;
            let eventResult;
            service.onDidCompleteAuth(result => {
                eventFired = true;
                eventResult = result;
            });
            await service.handleCallback('valid_code', state);
            assert.ok(eventFired, 'Event should be fired');
            assert.ok(eventResult.success, 'Event should contain success result');
        });
        test('should handle backend errors', async () => {
            const { state } = await service.initiateOAuthFlow();
            global.fetch = async () => ({
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            });
            const result = await service.handleCallback('invalid_code', state);
            assert.strictEqual(result.success, false, 'Should return failure result');
            assert.ok(result.error, 'Should include error message');
        });
        test('should handle network errors', async () => {
            const { state } = await service.initiateOAuthFlow();
            global.fetch = async () => {
                throw new Error('Network error');
            };
            const result = await service.handleCallback('valid_code', state);
            assert.strictEqual(result.success, false, 'Should return failure result');
            assert.ok(result.error?.includes('Network'), 'Should include network error message');
        });
    });
    suite('cancelOAuthFlow', () => {
        test('should clear stored state', async () => {
            await service.initiateOAuthFlow();
            service.cancelOAuthFlow();
            const storedState = storageService.get('ainative.oauth.github.state', -1 /* StorageScope.APPLICATION */);
            assert.strictEqual(storedState, undefined, 'State should be cleared');
        });
        test('should emit onDidCancelOAuth event', async () => {
            await service.initiateOAuthFlow();
            let eventFired = false;
            service.onDidCancelOAuth(() => {
                eventFired = true;
            });
            service.cancelOAuthFlow();
            assert.ok(eventFired, 'Event should be fired');
        });
    });
    suite('isOAuthInProgress', () => {
        test('should return false initially', () => {
            assert.strictEqual(service.isOAuthInProgress(), false, 'OAuth should not be in progress initially');
        });
        test('should return true after initiating flow', async () => {
            await service.initiateOAuthFlow();
            assert.strictEqual(service.isOAuthInProgress(), true, 'OAuth should be in progress');
        });
        test('should return false after completing flow', async () => {
            const { state } = await service.initiateOAuthFlow();
            global.fetch = async () => ({
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    access_token: 'test_token',
                    user: { id: '123', email: 'test@example.com', role: 'user' }
                })
            });
            await service.handleCallback('valid_code', state);
            assert.strictEqual(service.isOAuthInProgress(), false, 'OAuth should not be in progress after completion');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViT0F1dGhTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2dpdGh1Yk9BdXRoU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBYyxNQUFNLG9DQUFvQyxDQUFDO0FBRXBGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLGNBQStCLENBQUM7SUFDcEMsSUFBSSxPQUEyQixDQUFDO0lBRWpDLE1BQU0sa0JBQWtCO1FBQXhCO1lBQ1csa0JBQWEsR0FBRyxTQUFTLENBQUM7WUFDM0IsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBZ0Q1QyxzQkFBaUIsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQVMsQ0FBQztZQUNsRCxvQkFBZSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBUyxDQUFDO1FBU2pELENBQUM7UUF0REEsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFtQixFQUFFLGFBQXNCO1lBQzNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDO1FB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