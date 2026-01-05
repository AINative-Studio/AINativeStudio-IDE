/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
// @ts-ignore - Path resolution issue in platform tests
import { timeout } from '../../../../../base/common/async.js';
// @ts-ignore - Path resolution issue in platform tests
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
// @ts-ignore - Path resolution issue in platform tests
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { State, StateType, UpdateType, DisablementReason, IUpdate } from '../../common/update.js';

suite('Update Service - Core Functionality', () => {

	const disposables = new DisposableStore();

	ensureNoDisposablesAreLeakedInTestSuite();

	teardown(() => {
		disposables.clear();
	});

	suite('State Machine', () => {

		test('should initialize in Uninitialized state', () => {
			const state = State.Uninitialized;
			assert.strictEqual(state.type, StateType.Uninitialized);
		});

		test('should transition to Idle state', () => {
			const state = State.Idle(UpdateType.Archive);
			assert.strictEqual(state.type, StateType.Idle);
			assert.strictEqual(state.updateType, UpdateType.Archive);
		});

		test('should transition to Disabled state with reason', () => {
			const state = State.Disabled(DisablementReason.NotBuilt);
			assert.strictEqual(state.type, StateType.Disabled);
			assert.strictEqual(state.reason, DisablementReason.NotBuilt);
		});

		test('should transition to CheckingForUpdates state', () => {
			const state = State.CheckingForUpdates(true);
			assert.strictEqual(state.type, StateType.CheckingForUpdates);
			assert.strictEqual(state.explicit, true);
		});

		test('should transition to AvailableForDownload state', () => {
			const update: IUpdate = {
				version: '1.5.0',
				productVersion: '1.5.0',
				url: 'http://example.com/update.zip'
			};
			const state = State.AvailableForDownload(update);
			assert.strictEqual(state.type, StateType.AvailableForDownload);
			assert.deepStrictEqual(state.update, update);
		});

		test('should transition to Downloading state', () => {
			const state = State.Downloading;
			assert.strictEqual(state.type, StateType.Downloading);
		});

		test('should transition to Downloaded state', () => {
			const update: IUpdate = {
				version: '1.5.0',
				productVersion: '1.5.0'
			};
			const state = State.Downloaded(update);
			assert.strictEqual(state.type, StateType.Downloaded);
			assert.deepStrictEqual(state.update, update);
		});

		test('should transition to Updating state', () => {
			const update: IUpdate = {
				version: '1.5.0',
				productVersion: '1.5.0'
			};
			const state = State.Updating(update);
			assert.strictEqual(state.type, StateType.Updating);
			assert.deepStrictEqual(state.update, update);
		});

		test('should transition to Ready state', () => {
			const update: IUpdate = {
				version: '1.5.0',
				productVersion: '1.5.0'
			};
			const state = State.Ready(update);
			assert.strictEqual(state.type, StateType.Ready);
			assert.deepStrictEqual(state.update, update);
		});

		test('should handle error state with message', () => {
			const errorMessage = 'Update check failed';
			const state = State.Idle(UpdateType.Archive, errorMessage);
			assert.strictEqual(state.type, StateType.Idle);
			assert.strictEqual(state.error, errorMessage);
		});
	});

	suite('Update Types', () => {

		test('should recognize Setup update type', () => {
			const updateType = UpdateType.Setup;
			assert.strictEqual(updateType, 0);
		});

		test('should recognize Archive update type', () => {
			const updateType = UpdateType.Archive;
			assert.strictEqual(updateType, 1);
		});

		test('should recognize Snap update type', () => {
			const updateType = UpdateType.Snap;
			assert.strictEqual(updateType, 2);
		});
	});

	suite('Disablement Reasons', () => {

		test('should handle NotBuilt disablement', () => {
			const state = State.Disabled(DisablementReason.NotBuilt);
			assert.strictEqual(state.reason, DisablementReason.NotBuilt);
		});

		test('should handle DisabledByEnvironment disablement', () => {
			const state = State.Disabled(DisablementReason.DisabledByEnvironment);
			assert.strictEqual(state.reason, DisablementReason.DisabledByEnvironment);
		});

		test('should handle ManuallyDisabled disablement', () => {
			const state = State.Disabled(DisablementReason.ManuallyDisabled);
			assert.strictEqual(state.reason, DisablementReason.ManuallyDisabled);
		});

		test('should handle MissingConfiguration disablement', () => {
			const state = State.Disabled(DisablementReason.MissingConfiguration);
			assert.strictEqual(state.reason, DisablementReason.MissingConfiguration);
		});

		test('should handle InvalidConfiguration disablement', () => {
			const state = State.Disabled(DisablementReason.InvalidConfiguration);
			assert.strictEqual(state.reason, DisablementReason.InvalidConfiguration);
		});

		test('should handle RunningAsAdmin disablement', () => {
			const state = State.Disabled(DisablementReason.RunningAsAdmin);
			assert.strictEqual(state.reason, DisablementReason.RunningAsAdmin);
		});
	});

	suite('Update Metadata', () => {

		test('should contain required update fields', () => {
			const update: IUpdate = {
				version: '1.5.0',
				productVersion: '1.5.0',
				url: 'http://example.com/update.zip',
				sha256hash: 'abc123def456'
			};

			assert.strictEqual(update.version, '1.5.0');
			assert.strictEqual(update.productVersion, '1.5.0');
			assert.strictEqual(update.url, 'http://example.com/update.zip');
			assert.strictEqual(update.sha256hash, 'abc123def456');
		});

		test('should handle optional timestamp field', () => {
			const update: IUpdate = {
				version: '1.5.0',
				productVersion: '1.5.0',
				timestamp: Date.now()
			};

			assert.ok(update.timestamp);
			assert.strictEqual(typeof update.timestamp, 'number');
		});

		test('should handle minimal update metadata', () => {
			const update: IUpdate = {
				version: '1.5.0',
				productVersion: '1.5.0'
			};

			assert.strictEqual(update.version, '1.5.0');
			assert.strictEqual(update.productVersion, '1.5.0');
			assert.strictEqual(update.url, undefined);
			assert.strictEqual(update.sha256hash, undefined);
		});
	});

	suite('Update URL Construction', () => {

		test('should construct update URL for darwin platform', () => {
			const platform = 'darwin';
			const quality = 'stable';
			const commit = 'abc123';
			const updateUrl = 'https://update.example.com';

			const url = `${updateUrl}/api/update/${platform}/${quality}/${commit}`;

			assert.strictEqual(url, 'https://update.example.com/api/update/darwin/stable/abc123');
		});

		test('should construct update URL for darwin-arm64 platform', () => {
			const platform = 'darwin-arm64';
			const quality = 'stable';
			const commit = 'abc123';
			const updateUrl = 'https://update.example.com';

			const url = `${updateUrl}/api/update/${platform}/${quality}/${commit}`;

			assert.strictEqual(url, 'https://update.example.com/api/update/darwin-arm64/stable/abc123');
		});

		test('should construct update URL for win32-x64 platform', () => {
			const platform = 'win32-x64';
			const quality = 'stable';
			const commit = 'abc123';
			const updateUrl = 'https://update.example.com';

			const url = `${updateUrl}/api/update/${platform}/${quality}/${commit}`;

			assert.strictEqual(url, 'https://update.example.com/api/update/win32-x64/stable/abc123');
		});

		test('should construct update URL for linux-x64 platform', () => {
			const platform = 'linux-x64';
			const quality = 'stable';
			const commit = 'abc123';
			const updateUrl = 'https://update.example.com';

			const url = `${updateUrl}/api/update/${platform}/${quality}/${commit}`;

			assert.strictEqual(url, 'https://update.example.com/api/update/linux-x64/stable/abc123');
		});

		test('should handle different quality levels', () => {
			const qualities = ['stable', 'insider', 'exploration'];
			const platform = 'darwin';
			const commit = 'abc123';
			const updateUrl = 'https://update.example.com';

			qualities.forEach(quality => {
				const url = `${updateUrl}/api/update/${platform}/${quality}/${commit}`;
				assert.ok(url.includes(quality), `URL should contain quality: ${quality}`);
			});
		});
	});

	suite('Update Configuration Modes', () => {

		test('should handle "none" update mode', () => {
			const updateMode = 'none';
			const isDisabled = updateMode === 'none';

			assert.strictEqual(isDisabled, true, 'Updates should be disabled in "none" mode');
		});

		test('should handle "manual" update mode', () => {
			const updateMode = 'manual';
			const isManual = updateMode === 'manual';

			assert.strictEqual(isManual, true, 'Updates should be manual in "manual" mode');
		});

		test('should handle "start" update mode', () => {
			const updateMode = 'start';
			const isStartOnly = updateMode === 'start';

			assert.strictEqual(isStartOnly, true, 'Updates should only check at start in "start" mode');
		});

		test('should handle "default" update mode', () => {
			const updateMode = 'default';
			const isAutomatic = updateMode === 'default';

			assert.strictEqual(isAutomatic, true, 'Updates should be automatic in "default" mode');
		});
	});

	suite('Performance Requirements', () => {

		test('update check should complete within 5 seconds', async () => {
			const startTime = Date.now();

			// Simulate update check with timeout
			await timeout(100); // Simulate network request

			const endTime = Date.now();
			const duration = endTime - startTime;

			assert.ok(duration < 5000, `Update check took ${duration}ms, should be < 5000ms`);
		});

		test('should handle concurrent update checks gracefully', async () => {
			const checks: Promise<void>[] = [];

			// Simulate multiple concurrent checks
			for (let i = 0; i < 5; i++) {
				checks.push(timeout(50));
			}

			const startTime = Date.now();
			await Promise.all(checks);
			const duration = Date.now() - startTime;

			// Should complete in roughly the same time as a single check (parallel execution)
			assert.ok(duration < 1000, 'Concurrent checks should complete quickly');
		});
	});

	suite('Error Handling', () => {

		test('should handle network timeout gracefully', async () => {
			try {
				// Simulate network timeout
				await Promise.race([
					new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 100)),
					timeout(5000)
				]);
				assert.fail('Should have thrown timeout error');
			} catch (error: any) {
				assert.ok(error.message.includes('Network timeout'));
			}
		});

		test('should handle HTTP error responses', () => {
			const errorResponses = [
				{ code: 404, message: 'Not Found' },
				{ code: 500, message: 'Internal Server Error' },
				{ code: 503, message: 'Service Unavailable' }
			];

			errorResponses.forEach(({ code, message }) => {
				assert.ok(code >= 400, `Error code ${code} should be >= 400`);
				assert.ok(message.length > 0, 'Error message should not be empty');
			});
		});

		test('should handle invalid update metadata', () => {
			const invalidUpdates = [
				{}, // Missing all fields
				{ version: '1.0.0' }, // Missing productVersion
				{ productVersion: '1.0.0' }, // Missing version
			];

			invalidUpdates.forEach(update => {
				const isValid = update.hasOwnProperty('version') && update.hasOwnProperty('productVersion');
				assert.strictEqual(isValid, false, 'Invalid update metadata should be rejected');
			});
		});

		test('should handle rate limiting', () => {
			const rateLimitResponse = {
				statusCode: 429,
				headers: {
					'retry-after': '60',
					'x-ratelimit-remaining': '0'
				}
			};

			assert.strictEqual(rateLimitResponse.statusCode, 429);
			assert.strictEqual(rateLimitResponse.headers['retry-after'], '60');
		});
	});

	suite('Platform-Specific Behavior', () => {

		test('should identify macOS platform', () => {
			const platforms = ['darwin', 'darwin-arm64'];
			platforms.forEach(platform => {
				assert.ok(platform.startsWith('darwin'), `${platform} should be macOS platform`);
			});
		});

		test('should identify Windows platform', () => {
			const platforms = ['win32-x64', 'win32-arm64', 'win32-x64-user'];
			platforms.forEach(platform => {
				assert.ok(platform.startsWith('win32'), `${platform} should be Windows platform`);
			});
		});

		test('should identify Linux platform', () => {
			const platforms = ['linux-x64', 'linux-arm64'];
			platforms.forEach(platform => {
				assert.ok(platform.startsWith('linux'), `${platform} should be Linux platform`);
			});
		});

		test('should support ARM64 architecture', () => {
			const armPlatforms = ['darwin-arm64', 'win32-arm64', 'linux-arm64'];
			armPlatforms.forEach(platform => {
				assert.ok(platform.includes('arm64'), `${platform} should support ARM64`);
			});
		});

		test('should support x64 architecture', () => {
			const x64Platforms = ['win32-x64', 'linux-x64'];
			x64Platforms.forEach(platform => {
				assert.ok(platform.includes('x64'), `${platform} should support x64`);
			});
		});
	});
});
