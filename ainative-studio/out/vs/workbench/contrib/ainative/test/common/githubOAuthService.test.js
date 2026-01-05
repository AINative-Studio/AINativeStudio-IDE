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
        logStorage() { }
        migrate() { return Promise.resolve(); }
        isNew(scope) { return false; }
        flush(reason) { return Promise.resolve(); }
        switch() { return Promise.resolve(); }
        hasScope(scope) { return true; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViT0F1dGhTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2dpdGh1Yk9BdXRoU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBYyxNQUFNLG9DQUFvQyxDQUFDO0FBRXBGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLGNBQStCLENBQUM7SUFDcEMsSUFBSSxPQUEyQixDQUFDO0lBRWhDLE1BQU0sa0JBQWtCO1FBQXhCO1lBQ1Usa0JBQWEsR0FBRyxTQUFTLENBQUM7WUFDM0IsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBZ0M1QyxxQkFBZ0IsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEQsc0JBQWlCLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELG9CQUFlLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFD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