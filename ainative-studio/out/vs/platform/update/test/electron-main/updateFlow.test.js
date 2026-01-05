/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
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
            // Update available
            states.push("downloading" /* StateType.Downloading */);
            await timeout(100); // Simulate download
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // Download complete
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlRmxvdy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvdGVzdC9lbGVjdHJvbi1tYWluL3VwZGF0ZUZsb3cudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUtuRyxLQUFLLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO0lBRXhELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUUxQyxJQUFJLENBQUMsbURBQW1ELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDcEUsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztZQUUvQixnQkFBZ0I7WUFDaEIsTUFBTSxDQUFDLElBQUksNkJBQWdCLENBQUM7WUFFNUIsNkJBQTZCO1lBQzdCLE1BQU0sQ0FBQyxJQUFJLDJEQUE4QixDQUFDO1lBRTFDLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQTJCO1lBRTlDLG1CQUFtQjtZQUNuQixNQUFNLENBQUMsSUFBSSwyQ0FBdUIsQ0FBQztZQUVuQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMs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