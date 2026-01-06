/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { GitHubOAuthService, OAuthState } from '../../common/githubOAuthService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';

suite('GitHubOAuthService', () => {
	const disposables = new DisposableStore();

	ensureNoDisposablesAreLeakedInTestSuite();

	let storageService: IStorageService;
	let service: GitHubOAuthService;

class MockStorageService implements IStorageService {
		readonly _serviceBrand = undefined;
		private storage = new Map<string, string>();

		get(key: string, scope: StorageScope, fallbackValue: string): string;
		get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined;
		get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
			return this.storage.get(key) ?? fallbackValue;
		}

		getBoolean(key: string, scope: StorageScope, fallbackValue: boolean): boolean;
		getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined;
		getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
			const value = this.storage.get(key);
			return value !== undefined ? value === 'true' : fallbackValue;
		}

		getNumber(key: string, scope: StorageScope, fallbackValue: number): number;
		getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined;
		getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
			const value = this.storage.get(key);
			return value !== undefined ? parseInt(value, 10) : fallbackValue;
		}

		getObject<T extends object>(key: string, scope: StorageScope, fallbackValue: T): T;
		getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined;
		getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined {
			return fallbackValue;
		}

		store(key: string, value: string | boolean | number | undefined | null, scope: StorageScope, target: StorageTarget): void {
			if (value === undefined || value === null) {
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

		onDidChangeValue(scope: StorageScope, key: string | undefined, disposable: DisposableStore): any {
			return { dispose: () => { } };
		}

		onDidChangeTarget = { dispose: () => { } } as any;
		onWillSaveState = { dispose: () => { } } as any;

		isNew(scope: StorageScope): boolean { return false; }
		flush(reason?: number): Promise<void> { return Promise.resolve(); }
		switch(): Promise<void> { return Promise.resolve(); }
		hasScope(scope: any): boolean { return true; }
		storeAll(entries: Array<{ key: string; value: any; scope: StorageScope; target: StorageTarget }>, external: boolean): void { }
		log(): Promise<void> { return Promise.resolve(); }
		async optimize(scope: StorageScope): Promise<void> { }
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
			const storedState = storageService.get('ainative.oauth.github.state', StorageScope.APPLICATION);

			assert.strictEqual(storedState, result.state, 'State should be stored in storage');
		});

		test('should emit onDidInitiateOAuth event', async () => {
			let eventFired = false;
			let eventState: OAuthState | undefined;

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

			await assert.rejects(
				() => service.handleCallback('valid_code', 'invalid_state'),
				/Invalid state token/,
				'Should reject with invalid state'
			);
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
			}) as Response;

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
			}) as Response;

			await service.handleCallback('valid_code', state);

			const storedState = storageService.get('ainative.oauth.github.state', StorageScope.APPLICATION);
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
			}) as Response;

			let eventFired = false;
			let eventResult: any;

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
			}) as Response;

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

			const storedState = storageService.get('ainative.oauth.github.state', StorageScope.APPLICATION);
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
			}) as Response;

			await service.handleCallback('valid_code', state);

			assert.strictEqual(service.isOAuthInProgress(), false, 'OAuth should not be in progress after completion');
		});
	});
});
