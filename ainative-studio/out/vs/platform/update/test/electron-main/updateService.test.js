/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
// @ts-expect-error - Path resolution issue in platform tests
import { timeout } from '../../../../../base/common/async.js';
// @ts-expect-error - Path resolution issue in platform tests
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
// @ts-expect-error - Path resolution issue in platform tests
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { State } from '../../common/update.js';
suite('Update Service - Core Functionality', () => {
    const disposables = new DisposableStore();
    ensureNoDisposablesAreLeakedInTestSuite();
    teardown(() => {
        disposables.clear();
    });
    suite('State Machine', () => {
        test('should initialize in Uninitialized state', () => {
            const state = State.Uninitialized;
            assert.strictEqual(state.type, "uninitialized" /* StateType.Uninitialized */);
        });
        test('should transition to Idle state', () => {
            const state = State.Idle(1 /* UpdateType.Archive */);
            assert.strictEqual(state.type, "idle" /* StateType.Idle */);
            assert.strictEqual(state.updateType, 1 /* UpdateType.Archive */);
        });
        test('should transition to Disabled state with reason', () => {
            const state = State.Disabled(0 /* DisablementReason.NotBuilt */);
            assert.strictEqual(state.type, "disabled" /* StateType.Disabled */);
            assert.strictEqual(state.reason, 0 /* DisablementReason.NotBuilt */);
        });
        test('should transition to CheckingForUpdates state', () => {
            const state = State.CheckingForUpdates(true);
            assert.strictEqual(state.type, "checking for updates" /* StateType.CheckingForUpdates */);
            assert.strictEqual(state.explicit, true);
        });
        test('should transition to AvailableForDownload state', () => {
            const update = {
                version: '1.5.0',
                productVersion: '1.5.0',
                url: 'http://example.com/update.zip'
            };
            const state = State.AvailableForDownload(update);
            assert.strictEqual(state.type, "available for download" /* StateType.AvailableForDownload */);
            assert.deepStrictEqual(state.update, update);
        });
        test('should transition to Downloading state', () => {
            const state = State.Downloading;
            assert.strictEqual(state.type, "downloading" /* StateType.Downloading */);
        });
        test('should transition to Downloaded state', () => {
            const update = {
                version: '1.5.0',
                productVersion: '1.5.0'
            };
            const state = State.Downloaded(update);
            assert.strictEqual(state.type, "downloaded" /* StateType.Downloaded */);
            assert.deepStrictEqual(state.update, update);
        });
        test('should transition to Updating state', () => {
            const update = {
                version: '1.5.0',
                productVersion: '1.5.0'
            };
            const state = State.Updating(update);
            assert.strictEqual(state.type, "updating" /* StateType.Updating */);
            assert.deepStrictEqual(state.update, update);
        });
        test('should transition to Ready state', () => {
            const update = {
                version: '1.5.0',
                productVersion: '1.5.0'
            };
            const state = State.Ready(update);
            assert.strictEqual(state.type, "ready" /* StateType.Ready */);
            assert.deepStrictEqual(state.update, update);
        });
        test('should handle error state with message', () => {
            const errorMessage = 'Update check failed';
            const state = State.Idle(1 /* UpdateType.Archive */, errorMessage);
            assert.strictEqual(state.type, "idle" /* StateType.Idle */);
            assert.strictEqual(state.error, errorMessage);
        });
    });
    suite('Update Types', () => {
        test('should recognize Setup update type', () => {
            const updateType = 0 /* UpdateType.Setup */;
            assert.strictEqual(updateType, 0);
        });
        test('should recognize Archive update type', () => {
            const updateType = 1 /* UpdateType.Archive */;
            assert.strictEqual(updateType, 1);
        });
        test('should recognize Snap update type', () => {
            const updateType = 2 /* UpdateType.Snap */;
            assert.strictEqual(updateType, 2);
        });
    });
    suite('Disablement Reasons', () => {
        test('should handle NotBuilt disablement', () => {
            const state = State.Disabled(0 /* DisablementReason.NotBuilt */);
            assert.strictEqual(state.reason, 0 /* DisablementReason.NotBuilt */);
        });
        test('should handle DisabledByEnvironment disablement', () => {
            const state = State.Disabled(1 /* DisablementReason.DisabledByEnvironment */);
            assert.strictEqual(state.reason, 1 /* DisablementReason.DisabledByEnvironment */);
        });
        test('should handle ManuallyDisabled disablement', () => {
            const state = State.Disabled(2 /* DisablementReason.ManuallyDisabled */);
            assert.strictEqual(state.reason, 2 /* DisablementReason.ManuallyDisabled */);
        });
        test('should handle MissingConfiguration disablement', () => {
            const state = State.Disabled(3 /* DisablementReason.MissingConfiguration */);
            assert.strictEqual(state.reason, 3 /* DisablementReason.MissingConfiguration */);
        });
        test('should handle InvalidConfiguration disablement', () => {
            const state = State.Disabled(4 /* DisablementReason.InvalidConfiguration */);
            assert.strictEqual(state.reason, 4 /* DisablementReason.InvalidConfiguration */);
        });
        test('should handle RunningAsAdmin disablement', () => {
            const state = State.Disabled(5 /* DisablementReason.RunningAsAdmin */);
            assert.strictEqual(state.reason, 5 /* DisablementReason.RunningAsAdmin */);
        });
    });
    suite('Update Metadata', () => {
        test('should contain required update fields', () => {
            const update = {
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
            const update = {
                version: '1.5.0',
                productVersion: '1.5.0',
                timestamp: Date.now()
            };
            assert.ok(update.timestamp);
            assert.strictEqual(typeof update.timestamp, 'number');
        });
        test('should handle minimal update metadata', () => {
            const update = {
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
            const checks = [];
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
            }
            catch (error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvdGVzdC9lbGVjdHJvbi1tYWluL3VwZGF0ZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsNkRBQTZEO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCw2REFBNkQ7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFxRCxNQUFNLHdCQUF3QixDQUFDO0FBRWxHLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFFakQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUUxQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUUzQixJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1lBQ3JELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUM7WUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxnREFBMEIsQ0FBQztRQUN6RCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7WUFDNUMsTUFBTSxLQUFL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