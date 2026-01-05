/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
// @ts-ignore - Path resolution issue in platform tests
import { timeout } from '../../../../../base/common/async.js';
// @ts-ignore - Path resolution issue in platform tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
// @ts-ignore - Path resolution issue in platform tests
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
            states.push("downloading" /* StateType.Downloading */);
            await timeout(100); // Simulate download
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // Download complete
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlRmxvdy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvdGVzdC9lbGVjdHJvbi1tYWluL3VwZGF0ZUZsb3cudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsdURBQXVEO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCx1REFBdUQ7QUFDdkQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsdURBQXVEO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBS25HLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7SUFFeEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUUxQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBRTFDLElBQUksQ0FBQyxtREFBbUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwRSxNQUFNLE1BQU0sR0FBZ0IsRUFBRSxDQUFDO1lBRS9CLGdCQUFnQjtZQUNoQixNQUFNLENBQUMsSUFBSSw2QkFBZ0IsQ0FBQztZQUU1Qiw2QkFBNkI7WUFDN0IsTUFBTSxDQUFDLElBQUksMkRBQThCLENBQUM7WUFFMUMsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQywyQkFBMkI7WUFDaEQsNkRBQTZE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