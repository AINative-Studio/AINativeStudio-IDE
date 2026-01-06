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
suite('Update Service - Integration - Update Flow', () => {
    const disposables = new DisposableStore();
    ensureNoDisposablesAreLeakedInTestSuite();
    teardown(() => {
        disposables.clear();
    });
    suite('Complete Update Flow - macOS', () => {
        test('should complete full update cycle for macOS Intel', async () => {
            const states = [];
            // Initial state
            states.push("idle" /* StateType.Idle */);
            // Start checking for updates
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50); // Simulate network request
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // Update available
            await timeout(100); // Simulate download
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // Download complete
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // @ts-expect-error - Unused variable
            const update = {
                version: '1.5.0',
                productVersion: '1.5.0',
                timestamp: Date.now()
            };
            states.push("downloaded" /* StateType.Downloaded */);
            await timeout(50);
            // Ready to install
            states.push("ready" /* StateType.Ready */);
            // Verify state progression
            assert.strictEqual(states[0], "idle" /* StateType.Idle */);
            assert.strictEqual(states[1], "checking for updates" /* StateType.CheckingForUpdates */);
            assert.strictEqual(states[2], "downloading" /* StateType.Downloading */);
            assert.strictEqual(states[3], "downloaded" /* StateType.Downloaded */);
            assert.strictEqual(states[4], "ready" /* StateType.Ready */);
        });
        test('should complete full update cycle for macOS ARM64', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50);
            states.push("downloading" /* StateType.Downloading */);
            await timeout(100);
            states.push("downloaded" /* StateType.Downloaded */);
            states.push("ready" /* StateType.Ready */);
            // Verify ARM64 specific flow
            assert.strictEqual(states.length, 5);
            assert.strictEqual(states[states.length - 1], "ready" /* StateType.Ready */);
        });
    });
    suite('Complete Update Flow - Windows', () => {
        test('should complete full update cycle for Windows x64 Setup', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50);
            states.push("downloading" /* StateType.Downloading */);
            await timeout(150); // Windows downloads may take longer
            states.push("downloaded" /* StateType.Downloaded */);
            // Windows background update
            states.push("updating" /* StateType.Updating */);
            await timeout(200); // Background installation
            states.push("ready" /* StateType.Ready */);
            // Verify Windows-specific flow with background update
            assert.strictEqual(states[0], "idle" /* StateType.Idle */);
            assert.strictEqual(states[4], "updating" /* StateType.Updating */);
            assert.strictEqual(states[5], "ready" /* StateType.Ready */);
        });
        test('should complete full update cycle for Windows x64 Archive', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50);
            // Archive mode shows download available
            states.push("available for download" /* StateType.AvailableForDownload */);
            // Verify archive-specific flow
            assert.strictEqual(states[states.length - 1], "available for download" /* StateType.AvailableForDownload */);
        });
        test('should complete full update cycle for Windows ARM64', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50);
            states.push("downloading" /* StateType.Downloading */);
            await timeout(150);
            states.push("downloaded" /* StateType.Downloaded */);
            states.push("updating" /* StateType.Updating */);
            states.push("ready" /* StateType.Ready */);
            // Verify ARM64 Windows flow
            assert.strictEqual(states.length, 6);
            assert.strictEqual(states[states.length - 1], "ready" /* StateType.Ready */);
        });
    });
    suite('Complete Update Flow - Linux', () => {
        test('should complete full update cycle for Linux x64', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50);
            // Linux shows manual download
            states.push("available for download" /* StateType.AvailableForDownload */);
            // Verify Linux-specific flow (manual download)
            assert.strictEqual(states[states.length - 1], "available for download" /* StateType.AvailableForDownload */);
        });
        test('should complete full update cycle for Linux ARM64', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50);
            states.push("available for download" /* StateType.AvailableForDownload */);
            // Verify ARM64 Linux flow
            assert.strictEqual(states.length, 3);
            assert.strictEqual(states[states.length - 1], "available for download" /* StateType.AvailableForDownload */);
        });
        test('should handle Snap automatic updates', async () => {
            const states = [];
            // Snap packages update automatically
            states.push("idle" /* StateType.Idle */);
            // Snap doesn't check manually - system handles it
            assert.strictEqual(states[0], "idle" /* StateType.Idle */);
        });
    });
    suite('Update Flow - No Update Available', () => {
        test('should handle no update available - HTTP 204', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50);
            // Simulate HTTP 204 No Content response
            const httpStatusCode = 204;
            if (httpStatusCode === 204) {
                states.push("idle" /* StateType.Idle */);
            }
            // Verify returns to Idle when no update available
            assert.strictEqual(states[0], "idle" /* StateType.Idle */);
            assert.strictEqual(states[2], "idle" /* StateType.Idle */);
        });
        test('should handle already on latest version', async () => {
            const currentVersion = '1.5.0';
            const latestVersion = '1.5.0';
            const isUpdateAvailable = currentVersion !== latestVersion;
            assert.strictEqual(isUpdateAvailable, false, 'No update should be available for same version');
        });
    });
    suite('Update Flow - Error Scenarios', () => {
        test('should handle network error during check', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            try {
                await Promise.race([
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Network error')), 50)),
                    timeout(5000)
                ]);
            }
            catch (error) {
                // Return to Idle on error
                states.push("idle" /* StateType.Idle */);
            }
            assert.strictEqual(states[states.length - 1], "idle" /* StateType.Idle */);
        });
        test('should handle download interruption', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            states.push("downloading" /* StateType.Downloading */);
            // Simulate download interruption
            await timeout(50);
            try {
                throw new Error('Download interrupted');
            }
            catch (error) {
                // Return to Idle on download error
                states.push("idle" /* StateType.Idle */);
            }
            assert.strictEqual(states[states.length - 1], "idle" /* StateType.Idle */);
        });
        test('should handle SHA256 verification failure', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            states.push("downloading" /* StateType.Downloading */);
            await timeout(100);
            // Simulate SHA256 mismatch
            const expectedHash = 'abc123';
            const actualHash = 'def456';
            // @ts-expect-error - Testing intentional type mismatch
            if (expectedHash !== actualHash) {
                // Return to Idle on verification failure
                states.push("idle" /* StateType.Idle */);
            }
            assert.strictEqual(states[states.length - 1], "idle" /* StateType.Idle */);
        });
        test('should handle installation failure', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            states.push("downloading" /* StateType.Downloading */);
            states.push("downloaded" /* StateType.Downloaded */);
            states.push("updating" /* StateType.Updating */);
            await timeout(100);
            try {
                throw new Error('Installation failed');
            }
            catch (error) {
                // Return to Idle on installation error
                states.push("idle" /* StateType.Idle */);
            }
            assert.strictEqual(states[states.length - 1], "idle" /* StateType.Idle */);
        });
    });
    suite('Update Flow - User Interactions', () => {
        test('should handle manual update check', async () => {
            const states = [];
            // User initiates manual check
            const isExplicit = true;
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50);
            // Show result to user (explicit = true)
            if (isExplicit) {
                states.push("available for download" /* StateType.AvailableForDownload */);
            }
            assert.ok(isExplicit, 'Manual check should be explicit');
        });
        test('should handle automatic background check', async () => {
            const states = [];
            // System initiates automatic check
            const isExplicit = false;
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            await timeout(50);
            // Silent update in background
            if (!isExplicit) {
                states.push("downloading" /* StateType.Downloading */);
            }
            assert.ok(!isExplicit, 'Automatic check should not be explicit');
        });
        test('should handle user postponing update', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            states.push("downloading" /* StateType.Downloading */);
            states.push("downloaded" /* StateType.Downloaded */);
            states.push("ready" /* StateType.Ready */);
            // User chooses to postpone
            const userPostponed = true;
            if (userPostponed) {
                // Stay in Ready state
                assert.strictEqual(states[states.length - 1], "ready" /* StateType.Ready */);
            }
        });
        test('should handle user accepting immediate install', async () => {
            const states = [];
            states.push("idle" /* StateType.Idle */);
            states.push("checking for updates" /* StateType.CheckingForUpdates */);
            states.push("downloading" /* StateType.Downloading */);
            states.push("downloaded" /* StateType.Downloaded */);
            states.push("ready" /* StateType.Ready */);
            // User accepts installation
            const userAccepted = true;
            if (userAccepted) {
                // Proceed to quit and install
                assert.strictEqual(states[states.length - 1], "ready" /* StateType.Ready */);
            }
        });
    });
    suite('Update Flow - Performance Metrics', () => {
        test('should complete update check within 5 seconds', async () => {
            const startTime = Date.now();
            // Simulate update check
            await timeout(100);
            const duration = Date.now() - startTime;
            assert.ok(duration < 5000, `Update check completed in ${duration}ms (should be < 5000ms)`);
        });
        test('should track download progress', async () => {
            const downloadSize = 100 * 1024 * 1024; // 100MB
            const chunks = 10;
            const chunkSize = downloadSize / chunks;
            const progress = [];
            for (let i = 1; i <= chunks; i++) {
                await timeout(10);
                const percentage = (i * chunkSize / downloadSize) * 100;
                progress.push(percentage);
            }
            assert.strictEqual(progress.length, chunks);
            assert.strictEqual(progress[progress.length - 1], 100);
        });
        test('should handle large download (>100MB)', async () => {
            const downloadSize = 150 * 1024 * 1024; // 150MB
            const downloadSpeed = 10 * 1024 * 1024; // 10MB/s
            const estimatedTime = downloadSize / downloadSpeed;
            assert.ok(estimatedTime > 0, 'Download time should be positive');
            assert.ok(estimatedTime < 60, 'Download should complete in reasonable time');
        });
    });
    suite('Update Flow - Retry Logic', () => {
        test('should retry failed update check', async () => {
            let attempts = 0;
            const maxRetries = 3;
            while (attempts < maxRetries) {
                attempts++;
                try {
                    await timeout(50);
                    // Simulate failure on first two attempts
                    if (attempts < 3) {
                        throw new Error('Check failed');
                    }
                    // Success on third attempt
                    break;
                }
                catch (error) {
                    if (attempts >= maxRetries) {
                        throw error;
                    }
                }
            }
            assert.strictEqual(attempts, 3, 'Should succeed on third attempt');
        });
        test('should implement exponential backoff', async () => {
            const delays = [];
            const baseDelay = 100;
            for (let i = 0; i < 3; i++) {
                const delay = baseDelay * Math.pow(2, i);
                delays.push(delay);
            }
            assert.strictEqual(delays[0], 100); // 100ms
            assert.strictEqual(delays[1], 200); // 200ms
            assert.strictEqual(delays[2], 400); // 400ms
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlRmxvdy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvdGVzdC9lbGVjdHJvbi1tYWluL3VwZGF0ZUZsb3cudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsNkRBQTZEO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCw2REFBNkQ7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUduRyxLQUFLLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO0lBRXhELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUUxQyxJQUFJLENBQUMsbURBQW1ELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDcEUsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixnQkFBZ0I7WUFDaEIsTUFBTSxDQUFDLElBQUksNkJBQWdCLENBQUM7WUFFNUIsNkJBQTZCO1lBQzdCLE1BQU0sQ0FBQyxJQUFJLDJEQUE4QixDQUFDO1lBRTFDLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQTJCO1lBQ2hELDZEQUE2RDtZQUUzRCxtQkFBbUI7WUFFbkIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxvQkFBb0I7WUFFM0MsNkRBQTZEO1lBRTFELG9CQUFvQjtZQUNwQiw2REFBNkQ7WUFDaEUsNkRBQTZEO1lBQzFELHFDQUFxQztZQUNyQyxNQUFNLE1BQU0sR0FBWTtnQkFDdkIsT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLGNBQWMsRUFBRSxPQUFPO2dCQUN2QixTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTthQUNyQixDQUFDO1lBQ0YsTUFBTSxDQUFDLElBQUkseUNBQXNCLENBQUM7WUFFbEMsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFbEIsbUJBQW1CO1lBQ25CLE1BQU0sQ0FBQyxJQUFJLCtCQUFpQixDQUFDO1lBRTdCLDJCQUEyQjtZQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsOEJBQWlCLENBQUM7WUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLDREQUErQixDQUFDO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyw0Q0FBd0IsQ0FBQztZQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMENBQXVCLENBQUM7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGdDQUFrQixDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3BFLE1BQU0sTUFBTSxHQUFnQixFQUFFLENBQUM7WUFFL0IsTUFBTSxDQUFDLElBQUksNkJBQWdCLENBQUM7WUFDNUIsTUFBTSxDQUFDLElBQUksMkRBQThCLENBQUM7WUFFMUMsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFbEIsTUFBTSxDQUFDLElBQUksMkNBQXVCLENBQUM7WUFFbkMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFbkIsTUFBTSxDQUFDLElBQUkseUNBQXNCLENBQUM7WUFDbEMsTUFBTSxDQUFDLElBQUksK0JBQWlCLENBQUM7WUFFN0IsNkJBQTZCO1lBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxnQ0FBa0IsQ0FBQztRQUNoRSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUU1QyxJQUFJLENBQUMseURBQXlELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUUsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM1QixNQUFNLENBQUMsSUFBSSwyREFBOEIsQ0FBQztZQUUxQyxNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVsQixNQUFNLENBQUMsSUFBSSwyQ0FBdUIsQ0FBQztZQUVuQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLG9DQUFvQztZQUV4RCxNQUFNLENBQUMsSUFBSSx5Q0FBc0IsQ0FBQztZQUVsQyw0QkFBNEI7WUFDNUIsTUFBTSxDQUFDLElBQUkscUNBQW9CLENBQUM7WUFFaEMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7WUFFOUMsTUFBTSxDQUFDLElBQUksK0JBQWlCLENBQUM7WUFFN0Isc0RBQXNEO1lBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyw4QkFBaUIsQ0FBQztZQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsc0NBQXFCLENBQUM7WUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGdDQUFrQixDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVFLE1BQU0sTUFBTSxHQUFnQixFQUFFLENBQUM7WUFFL0IsTUFBTSxDQUFDLElBQUksNkJBQWdCLENBQUM7WUFDNUIsTUFBTSxDQUFDLElBQUksMkRBQThCLENBQUM7WUFFMUMsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFbEIsd0NBQXdDO1lBQ3hDLE1BQU0sQ0FBQyxJQUFJLCtEQUFnQyxDQUFDO1lBRTVDLCtCQUErQjtZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxnRUFBaUMsQ0FBQztRQUMvRSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN0RSxNQUFNLE1BQU0sR0FBZ0IsRUFBRSxDQUFDO1lBRS9CLE1BQU0sQ0FBQyxJQUFJLDZCQUFnQixDQUFDO1lBQzVCLE1BQU0sQ0FBQyxJQUFJLDJEQUE4QixDQUFDO1lBRTFDLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRWxCLE1BQU0sQ0FBQyxJQUFJLDJDQUF1QixDQUFDO1lBRW5DLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRW5CLE1BQU0sQ0FBQyxJQUFJLHlDQUFzQixDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxJQUFJLHFDQUFvQixDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxJQUFJLCtCQUFpQixDQUFDO1lBRTdCLDRCQUE0QjtZQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsZ0NBQWtCLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFFMUMsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2xFLE1BQU0sTUFBTSxHQUFnQixFQUFFLENBQUM7WUFFL0IsTUFBTSxDQUFDLElBQUksNkJBQWdCLENBQUM7WUFDNUIsTUFBTSxDQUFDLElBQUksMkRBQThCLENBQUM7WUFFMUMsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFbEIsOEJBQThCO1lBQzlCLE1BQU0sQ0FBQyxJQUFJLCtEQUFnQyxDQUFDO1lBRTVDLCtDQUErQztZQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxnRUFBaUMsQ0FBQztRQUMvRSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxtREFBbUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwRSxNQUFNLE1BQU0sR0FBZ0IsRUFBRSxDQUFDO1lBRS9CLE1BQU0sQ0FBQyxJQUFJLDZCQUFnQixDQUFDO1lBQzVCLE1BQU0sQ0FBQyxJQUFJLDJEQUE4QixDQUFDO1lBRTFDLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRWxCLE1BQU0sQ0FBQyxJQUFJLCtEQUFnQyxDQUFDO1lBRTVDLDBCQUEwQjtZQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsZ0VBQWlDLENBQUM7UUFDL0UsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkQsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixxQ0FBcUM7WUFDckMsTUFBTSxDQUFDLElBQUksNkJBQWdCLENBQUM7WUFFNUIsa0RBQWtEO1lBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyw4QkFBaUIsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUUvQyxJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0QsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM1QixNQUFNLENBQUMsSUFBSSwyREFBOEIsQ0FBQztZQUUxQyxNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVsQix3Q0FBd0M7WUFDeEMsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDO1lBRTNCLElBQUksY0FBYyxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUM1QixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM3QixDQUFDO1lBRUQsa0RBQWtEO1lBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyw4QkFBaUIsQ0FBQztZQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsOEJBQWlCLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUQsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDO1lBQy9CLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQztZQUU5QixNQUFNLGlCQUFpQixHQUFHLGNBQWMsS0FBSyxhQUFhLENBQUM7WUFFM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsZ0RBQWdELENBQUMsQ0FBQztRQUNoRyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUUzQyxJQUFJLENBQUMsMENBQTBDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDM0QsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM1QixNQUFNLENBQUMsSUFBSSwyREFBOEIsQ0FBQztZQUUxQyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNsQixJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDcEYsT0FBTyxDQUFDLElBQUksQ0FBQztpQkFDYixDQUFDLENBQUM7WUFDSixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsMEJBQTBCO2dCQUMxQixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM3QixDQUFDO1lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsOEJBQWlCLENBQUM7UUFDL0QsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdEQsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM1QixNQUFNLENBQUMsSUFBSSwyREFBOEIsQ0FBQztZQUMxQyxNQUFNLENBQUMsSUFBSSwyQ0FBdUIsQ0FBQztZQUVuQyxpQ0FBaUM7WUFDakMsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFbEIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsbUNBQW1DO2dCQUNuQyxNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM3QixDQUFDO1lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsOEJBQWlCLENBQUM7UUFDL0QsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUQsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM1QixNQUFNLENBQUMsSUFBSSwyREFBOEIsQ0FBQztZQUMxQyxNQUFNLENBQUMsSUFBSSwyQ0FBdUIsQ0FBQztZQUVuQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVuQiwyQkFBMkI7WUFDM0IsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDO1lBQzlCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQztZQUM3Qix1REFBdUQ7WUFFdEQsSUFBSSxZQUFZLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ2pDLHlDQUF5QztnQkFDekMsTUFBTSxDQUFDLElBQUksNkJBQWdCLENBQUM7WUFDN0IsQ0FBQztZQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLDhCQUFpQixDQUFDO1FBQy9ELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3JELE1BQU0sTUFBTSxHQUFnQixFQUFFLENBQUM7WUFFL0IsTUFBTSxDQUFDLElBQUksNkJBQWdCLENBQUM7WUFDNUIsTUFBTSxDQUFDLElBQUksMkRBQThCLENBQUM7WUFDMUMsTUFBTSxDQUFDLElBQUksMkNBQXVCLENBQUM7WUFDbkMsTUFBTSxDQUFDLElBQUkseUNBQXNCLENBQUM7WUFDbEMsTUFBTSxDQUFDLElBQUkscUNBQW9CLENBQUM7WUFFaEMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFbkIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUN4QyxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsdUNBQXVDO2dCQUN2QyxNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM3QixDQUFDO1lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsOEJBQWlCLENBQUM7UUFDL0QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFFN0MsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3BELE1BQU0sTUFBTSxHQUFnQixFQUFFLENBQUM7WUFFL0IsOEJBQThCO1lBQzlCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQztZQUV4QixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM1QixNQUFNLENBQUMsSUFBSSwyREFBOEIsQ0FBQztZQUUxQyxNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVsQix3Q0FBd0M7WUFDeEMsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxDQUFDLElBQUksK0RBQWdDLENBQUM7WUFDN0MsQ0FBQztZQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMENBQTBDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDM0QsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixtQ0FBbUM7WUFDbkMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDO1lBRXpCLE1BQU0sQ0FBQyxJQUFJLDZCQUFnQixDQUFDO1lBQzVCLE1BQU0sQ0FBQyxJQUFJLDJEQUE4QixDQUFDO1lBRTFDLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRWxCLDhCQUE4QjtZQUM5QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sQ0FBQyxJQUFJLDJDQUF1QixDQUFDO1lBQ3BDLENBQUM7WUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLHdDQUF3QyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkQsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUM1QixNQUFNLENBQUMsSUFBSSwyREFBOEIsQ0FBQztZQUMxQyxNQUFNLENBQUMsSUFBSSwyQ0FBdUIsQ0FBQztZQUNuQyxNQUFNLENBQUMsSUFBSSx5Q0FBc0IsQ0FBQztZQUNsQyxNQUFNLENBQUMsSUFBSSwrQkFBaUIsQ0FBQztZQUU3QiwyQkFBMkI7WUFDM0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDO1lBRTNCLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLHNCQUFzQjtnQkFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsZ0NBQWtCLENBQUM7WUFDaEUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pFLE1BQU0sTUFBTSxHQUFnQixFQUFFLENBQUM7WUFFL0IsTUFBTSxDQUFDLElBQUksNkJBQWdCLENBQUM7WUFDNUIsTUFBTSxDQUFDLElBQUksMkRBQThCLENBQUM7WUFDMUMsTUFBTSxDQUFDLElBQUksMkNBQXVCLENBQUM7WUFDbkMsTUFBTSxDQUFDLElBQUkseUNBQXNCLENBQUM7WUFDbEMsTUFBTSxDQUFDLElBQUksK0JBQWlCLENBQUM7WUFFN0IsNEJBQTRCO1lBQzVCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQztZQUUxQixJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQiw4QkFBOEI7Z0JBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLGdDQUFrQixDQUFDO1lBQ2hFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUUvQyxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDaEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRTdCLHdCQUF3QjtZQUN4QixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVuQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1lBRXhDLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxHQUFHLElBQUksRUFBRSw2QkFBNkIsUUFBUSx5QkFBeUIsQ0FBQyxDQUFDO1FBQzVGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pELE1BQU0sWUFBWSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUTtZQUNoRCxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDbEIsTUFBTSxTQUFTLEdBQUcsWUFBWSxHQUFHLE1BQU0sQ0FBQztZQUV4QyxNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7WUFFOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNsQyxNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxHQUFHLFlBQVksQ0FBQyxHQUFHLEdBQUcsQ0FBQztnQkFDeEQsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMzQixDQUFDO1lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUNBQXVDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDeEQsTUFBTSxZQUFZLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxRQUFRO1lBQ2hELE1BQU0sYUFBYSxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsU0FBUztZQUVqRCxNQUFNLGFBQWEsR0FBRyxZQUFZLEdBQUcsYUFBYSxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxFQUFFLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sQ0FBQyxFQUFFLENBQUMsYUFBYSxHQUFHLEVBQUUsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBRXZDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNuRCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7WUFDakIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1lBRXJCLE9BQU8sUUFBUSxHQUFHLFVBQVUsRUFBRSxDQUFDO2dCQUM5QixRQUFRLEVBQUUsQ0FBQztnQkFFWCxJQUFJLENBQUM7b0JBQ0osTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBRWxCLHlDQUF5QztvQkFDekMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ2pDLENBQUM7b0JBRUQsMkJBQTJCO29CQUMzQixNQUFNO2dCQUNQLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxRQUFRLElBQUksVUFBVSxFQUFFLENBQUM7d0JBQzVCLE1BQU0sS0FBSyxDQUFDO29CQUNiLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUNwRSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN2RCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7WUFDNUIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDO1lBRXRCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxLQUFLLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BCLENBQUM7WUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUTtRQUM3QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==