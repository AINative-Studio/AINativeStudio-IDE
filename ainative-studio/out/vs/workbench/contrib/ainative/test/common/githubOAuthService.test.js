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
            this.onDidChangeValue = (_scope, _key, _disposable) => ({ dispose: () => { } });
            this.onDidChangeTarget = () => ({ dispose: () => { } });
            this.onWillSaveState = () => ({ dispose: () => { } });
        }
        get(key, scope, fallbackValue) {
            return this.storage.get(key) ?? fallbackValue;
        }
        getBoolean(key, scope, fallbackValue) {
            const value = this.storage.get(key);
            if (value === undefined) {
                return fallbackValue;
            }
            return value === 'true';
        }
        getNumber(key, scope, fallbackValue) {
            const value = this.storage.get(key);
            if (value === undefined) {
                return fallbackValue;
            }
            return parseInt(value, 10);
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
        logStorage() { }
        storeAll(entries, external) { }
        log() { }
        migrate() { return Promise.resolve(); }
        isNew(scope) { return false; }
        flush(reason) { return Promise.resolve(); }
        switch(to, preserveData) { return Promise.resolve(); }
        hasScope(scope) { return true; }
        async optimize(scope) { return Promise.resolve(); }
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
            const { state: _state } = await service.initiateOAuthFlow();
            await assert.rejects(() => service.handleCallback('valid_code', 'invalid_state'), /Invalid state token/, 'Should reject with invalid state');
        });
        test('should accept valid state token', async () => {
            const { state: _state } = await service.initiateOAuthFlow();
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
            const result = await service.handleCallback('valid_code', _state);
            assert.ok(result.success, 'Callback should succeed with valid state');
            assert.strictEqual(result.token, 'test_token', 'Should return access token');
            assert.strictEqual(result.user?.email, 'test@example.com', 'Should return user data');
        });
        test('should clear state after successful callback', async () => {
            const { state: _state } = await service.initiateOAuthFlow();
            global.fetch = async () => ({
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    access_token: 'test_token',
                    user: { id: '123', email: 'test@example.com', role: 'user' }
                })
            });
            await service.handleCallback('valid_code', _state);
            const storedState = storageService.get('ainative.oauth.github.state', -1 /* StorageScope.APPLICATION */);
            assert.strictEqual(storedState, undefined, 'State should be cleared after successful callback');
        });
        test('should emit onDidCompleteAuth event on success', async () => {
            const { state: _state } = await service.initiateOAuthFlow();
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
            await service.handleCallback('valid_code', _state);
            assert.ok(eventFired, 'Event should be fired');
            assert.ok(eventResult.success, 'Event should contain success result');
        });
        test('should handle backend errors', async () => {
            const { state: _state } = await service.initiateOAuthFlow();
            global.fetch = async () => ({
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            });
            const result = await service.handleCallback('invalid_code', _state);
            assert.strictEqual(result.success, false, 'Should return failure result');
            assert.ok(result.error, 'Should include error message');
        });
        test('should handle network errors', async () => {
            const { state: _state } = await service.initiateOAuthFlow();
            global.fetch = async () => {
                throw new Error('Network error');
            };
            const result = await service.handleCallback('valid_code', _state);
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
            const { state: _state } = await service.initiateOAuthFlow();
            global.fetch = async () => ({
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    access_token: 'test_token',
                    user: { id: '123', email: 'test@example.com', role: 'user' }
                })
            });
            await service.handleCallback('valid_code', _state);
            assert.strictEqual(service.isOAuthInProgress(), false, 'OAuth should not be in progress after completion');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViT0F1dGhTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2dpdGh1Yk9BdXRoU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBYyxNQUFNLG9DQUFvQyxDQUFDO0FBRXBGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLGNBQStCLENBQUM7SUFDcEMsSUFBSSxPQUEyQixDQUFDO0lBRWhDLE1BQU0sa0JBQWtCO1FBQXhCO1lBQ1Usa0JBQWEsR0FBRyxTQUFTLENBQUM7WUFDM0IsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBMEQ1QyxxQkFBZ0IsR0FBUSxDQUFDLE1BQVcsRUFBRSxJQUFTLEVBQUUsV0FBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQy9GLHNCQUFpQixHQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN4RCxvQkFBZSxHQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFB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