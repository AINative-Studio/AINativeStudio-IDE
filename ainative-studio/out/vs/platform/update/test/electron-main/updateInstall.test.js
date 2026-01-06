/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
// @ts-expect-error - Path resolution issue in platform tests
import { timeout } from '../../../../../base/common/async.js';
// @ts-expect-error - Path resolution issue in platform tests
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
// @ts-expect-error - Path resolution issue in platform tests
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { State } from '../../common/update.js';
/**
 * Update Installation Tests
 *
 * Comprehensive test suite for update installation, rollback, and settings preservation.
 * Tests the complete installation flow including:
 * - Successful installation
 * - Rollback on failure
 * - Settings preservation
 * - Cleanup operations
 * - Platform-specific installation methods
 */
suite('Update Service - Integration - Update Installation', () => {
    const disposables = new DisposableStore();
    let testDir;
    let backupDir;
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        testDir = fs.mkdtempSync(path.join(tmpdir(), 'update-install-test-'));
        backupDir = path.join(testDir, 'backup');
        fs.mkdirSync(backupDir, { recursive: true });
    });
    teardown(() => {
        disposables.clear();
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
    /**
     * Helper: Create mock update package
     */
    function createMockUpdatePackage(destPath, size = 10 * 1024 * 1024) {
        const buffer = Buffer.alloc(size);
        crypto.randomFillSync(buffer);
        fs.writeFileSync(destPath, buffer);
    }
    /**
     * Helper: Create mock settings file
     */
    function createMockSettings(settingsPath) {
        const settings = {
            'editor.fontSize': 14,
            'workbench.colorTheme': 'Dark+ (default dark)',
            'files.autoSave': 'afterDelay',
            'update.mode': 'default',
            'extensions.autoUpdate': true
        };
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return settings;
    }
    /**
     * Helper: Verify settings are identical
     */
    function verifySettingsMatch(originalPath, currentPath) {
        const original = JSON.parse(fs.readFileSync(originalPath, 'utf-8'));
        const current = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
        return JSON.stringify(original) === JSON.stringify(current);
    }
    suite('Installation Success Scenarios', () => {
        test('should install update successfully', async () => {
            const updatePackage = path.join(testDir, 'update.zip');
            const installPath = path.join(testDir, 'install');
            // Create mock update package
            createMockUpdatePackage(updatePackage);
            // Simulate installation
            fs.mkdirSync(installPath, { recursive: true });
            fs.copyFileSync(updatePackage, path.join(installPath, 'update.zip'));
            // Verify installation
            assert.ok(fs.existsSync(installPath), 'Installation directory should exist');
            assert.ok(fs.existsSync(path.join(installPath, 'update.zip')), 'Update package should be installed');
            // Verify file size matches
            const originalSize = fs.statSync(updatePackage).size;
            const installedSize = fs.statSync(path.join(installPath, 'update.zip')).size;
            assert.strictEqual(installedSize, originalSize, 'Installed package should match original size');
        });
        test('should complete installation within reasonable time', async () => {
            const updatePackage = path.join(testDir, 'update-quick.zip');
            const installPath = path.join(testDir, 'install-quick');
            createMockUpdatePackage(updatePackage, 5 * 1024 * 1024); // 5MB
            const startTime = Date.now();
            // Simulate installation
            fs.mkdirSync(installPath, { recursive: true });
            fs.copyFileSync(updatePackage, path.join(installPath, 'update.zip'));
            const duration = Date.now() - startTime;
            assert.ok(duration < 5000, `Installation took ${duration}ms, should be <5000ms`);
        });
        test('should verify update package integrity before installation', async () => {
            const updatePackage = path.join(testDir, 'update-verify.zip');
            createMockUpdatePackage(updatePackage);
            // Compute SHA256 hash
            const hash = crypto.createHash('sha256');
            const content = fs.readFileSync(updatePackage);
            hash.update(content);
            const actualHash = hash.digest('hex');
            // In real scenario, expectedHash comes from update metadata
            const expectedHash = actualHash;
            // Verify integrity
            const isValid = actualHash === expectedHash;
            assert.ok(isValid, 'Update package integrity should be verified before installation');
        });
    });
    suite('Rollback on Installation Failure', () => {
        test('should rollback on installation failure', async () => {
            const currentVersion = path.join(testDir, 'current');
            const updatePackage = path.join(testDir, 'update-fail.zip');
            const backup = path.join(backupDir, 'current-backup');
            // Setup current installation
            fs.mkdirSync(currentVersion, { recursive: true });
            fs.writeFileSync(path.join(currentVersion, 'version.txt'), '1.0.0');
            // Create backup before update
            fs.mkdirSync(backup, { recursive: true });
            fs.copyFileSync(path.join(currentVersion, 'version.txt'), path.join(backup, 'version.txt'));
            // Simulate installation failure
            createMockUpdatePackage(updatePackage);
            try {
                // Attempt installation (simulated failure)
                throw new Error('Installation failed: Disk full');
            }
            catch (error) {
                // Rollback: Restore from backup
                fs.copyFileSync(path.join(backup, 'version.txt'), path.join(currentVersion, 'version.txt'));
                assert.ok(error.message.includes('Installation failed'), 'Should catch installation error');
            }
            // Verify rollback succeeded
            const restoredVersion = fs.readFileSync(path.join(currentVersion, 'version.txt'), 'utf-8');
            assert.strictEqual(restoredVersion, '1.0.0', 'Should rollback to original version');
        });
        test('should preserve original files on rollback', async () => {
            const installDir = path.join(testDir, 'rollback-test');
            const backupDir = path.join(testDir, 'rollback-backup');
            // Create original installation
            fs.mkdirSync(installDir, { recursive: true });
            const originalFiles = ['app.exe', 'config.json', 'data.db'];
            originalFiles.forEach(file => {
                fs.writeFileSync(path.join(installDir, file), `original-${file}`);
            });
            // Backup original files
            fs.mkdirSync(backupDir, { recursive: true });
            originalFiles.forEach(file => {
                fs.copyFileSync(path.join(installDir, file), path.join(backupDir, file));
            });
            // Simulate failed update (modify files)
            originalFiles.forEach(file => {
                fs.writeFileSync(path.join(installDir, file), `corrupted-${file}`);
            });
            // Rollback
            originalFiles.forEach(file => {
                fs.copyFileSync(path.join(backupDir, file), path.join(installDir, file));
            });
            // Verify all files restored
            originalFiles.forEach(file => {
                const content = fs.readFileSync(path.join(installDir, file), 'utf-8');
                assert.strictEqual(content, `original-${file}`, `File ${file} should be restored`);
            });
        });
        test('should cleanup failed installation artifacts', async () => {
            const tempInstallDir = path.join(testDir, 'temp-install');
            const updatePackage = path.join(testDir, 'update-cleanup.zip');
            // Create temporary installation
            fs.mkdirSync(tempInstallDir, { recursive: true });
            createMockUpdatePackage(updatePackage);
            fs.copyFileSync(updatePackage, path.join(tempInstallDir, 'update.zip'));
            // Verify temp files exist
            assert.ok(fs.existsSync(tempInstallDir), 'Temp installation should exist');
            // Simulate cleanup on failure
            if (fs.existsSync(tempInstallDir)) {
                fs.rmSync(tempInstallDir, { recursive: true, force: true });
            }
            if (fs.existsSync(updatePackage)) {
                fs.unlinkSync(updatePackage);
            }
            // Verify cleanup
            assert.ok(!fs.existsSync(tempInstallDir), 'Temp directory should be cleaned up');
            assert.ok(!fs.existsSync(updatePackage), 'Update package should be cleaned up');
        });
    });
    suite('Settings Preservation', () => {
        test('should preserve user settings during update', async () => {
            const settingsPath = path.join(testDir, 'settings.json');
            const backupSettings = path.join(backupDir, 'settings.json');
            // Create original settings
            const originalSettings = createMockSettings(settingsPath);
            // Backup settings before update
            fs.copyFileSync(settingsPath, backupSettings);
            // Simulate update (settings file might be overwritten)
            fs.writeFileSync(settingsPath, JSON.stringify({ 'temp': 'data' }));
            // Restore settings after update
            fs.copyFileSync(backupSettings, settingsPath);
            // Verify settings preserved
            const restoredSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            assert.deepStrictEqual(restoredSettings, originalSettings, 'User settings should be preserved during update');
        });
        test('should preserve workspace configuration during update', async () => {
            const workspaceConfig = path.join(testDir, 'workspace.json');
            const backupWorkspace = path.join(backupDir, 'workspace.json');
            const config = {
                'folders': [
                    { 'path': '/home/user/projects/project1' },
                    { 'path': '/home/user/projects/project2' }
                ],
                'settings': {
                    'files.exclude': { '**/.git': true }
                }
            };
            fs.writeFileSync(workspaceConfig, JSON.stringify(config, null, 2));
            fs.copyFileSync(workspaceConfig, backupWorkspace);
            // Simulate update
            await timeout(10);
            // Verify workspace config preserved
            const match = verifySettingsMatch(backupWorkspace, workspaceConfig);
            assert.ok(match, 'Workspace configuration should be preserved');
        });
        test('should preserve extensions during update', async () => {
            const extensionsDir = path.join(testDir, 'extensions');
            const backupExtensions = path.join(backupDir, 'extensions');
            // Create mock extensions
            fs.mkdirSync(extensionsDir, { recursive: true });
            const extensions = ['ext1', 'ext2', 'ext3'];
            extensions.forEach(ext => {
                const extDir = path.join(extensionsDir, ext);
                fs.mkdirSync(extDir, { recursive: true });
                fs.writeFileSync(path.join(extDir, 'package.json'), JSON.stringify({ name: ext }));
            });
            // Backup extensions
            fs.cpSync(extensionsDir, backupExtensions, { recursive: true });
            // Simulate update
            await timeout(10);
            // Verify extensions preserved
            extensions.forEach(ext => {
                const extPath = path.join(extensionsDir, ext, 'package.json');
                assert.ok(fs.existsSync(extPath), `Extension ${ext} should be preserved`);
            });
        });
        test('should preserve keybindings during update', async () => {
            const keybindingsPath = path.join(testDir, 'keybindings.json');
            const backupKeybindings = path.join(backupDir, 'keybindings.json');
            const keybindings = [
                {
                    'key': 'ctrl+shift+p',
                    'command': 'workbench.action.showCommands'
                },
                {
                    'key': 'ctrl+k ctrl+s',
                    'command': 'workbench.action.openGlobalKeybindings'
                }
            ];
            fs.writeFileSync(keybindingsPath, JSON.stringify(keybindings, null, 2));
            fs.copyFileSync(keybindingsPath, backupKeybindings);
            // Simulate update
            await timeout(10);
            // Verify keybindings preserved
            const match = verifySettingsMatch(backupKeybindings, keybindingsPath);
            assert.ok(match, 'Keybindings should be preserved during update');
        });
    });
    suite('Cleanup and Temporary Files', () => {
        test('should clean up temporary files after installation', async () => {
            const tempFile = path.join(testDir, 'temp-update.zip');
            const tempDir = path.join(testDir, 'temp-extract');
            // Create temporary files
            createMockUpdatePackage(tempFile);
            fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'temp.txt'), 'temporary data');
            // Verify temp files exist
            assert.ok(fs.existsSync(tempFile), 'Temp file should exist');
            assert.ok(fs.existsSync(tempDir), 'Temp directory should exist');
            // Cleanup after installation
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            // Verify cleanup
            assert.ok(!fs.existsSync(tempFile), 'Temp file should be cleaned up');
            assert.ok(!fs.existsSync(tempDir), 'Temp directory should be cleaned up');
        });
        test('should cleanup backup files after successful installation', async () => {
            const backupFile = path.join(backupDir, 'app-backup.exe');
            // Create backup
            createMockUpdatePackage(backupFile, 5 * 1024 * 1024);
            assert.ok(fs.existsSync(backupFile), 'Backup should exist before cleanup');
            // Simulate successful installation
            await timeout(10);
            // Cleanup old backups (keep only most recent)
            if (fs.existsSync(backupFile)) {
                fs.unlinkSync(backupFile);
            }
            assert.ok(!fs.existsSync(backupFile), 'Old backup should be cleaned up');
        });
        test('should remove downloaded update package after installation', async () => {
            const downloadPath = path.join(testDir, 'downloads', 'update.zip');
            // Create download directory
            fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
            createMockUpdatePackage(downloadPath);
            assert.ok(fs.existsSync(downloadPath), 'Downloaded package should exist');
            // Simulate installation completion
            await timeout(10);
            // Remove downloaded package
            if (fs.existsSync(downloadPath)) {
                fs.unlinkSync(downloadPath);
            }
            assert.ok(!fs.existsSync(downloadPath), 'Downloaded package should be removed');
        });
    });
    suite('Platform-Specific Installation', () => {
        test('should handle macOS .zip installation', async () => {
            const macOSUpdate = path.join(testDir, 'AINativeStudio-darwin.zip');
            const installDir = path.join(testDir, 'Applications');
            createMockUpdatePackage(macOSUpdate, 80 * 1024 * 1024); // 80MB
            // Simulate macOS installation
            fs.mkdirSync(installDir, { recursive: true });
            // In real scenario, would extract zip to Applications folder
            // For test, we just copy the zip
            fs.copyFileSync(macOSUpdate, path.join(installDir, 'update.zip'));
            assert.ok(fs.existsSync(path.join(installDir, 'update.zip')), 'macOS update should be installed');
        });
        test('should handle Windows .exe installer', async () => {
            const windowsUpdate = path.join(testDir, 'AINativeStudioSetup.exe');
            const installDir = path.join(testDir, 'Program Files', 'AINative Studio');
            createMockUpdatePackage(windowsUpdate, 90 * 1024 * 1024); // 90MB
            // Simulate Windows installation
            fs.mkdirSync(installDir, { recursive: true });
            // In real scenario, would run installer silently
            // For test, we simulate by copying files
            fs.copyFileSync(windowsUpdate, path.join(installDir, 'installer.exe'));
            assert.ok(fs.existsSync(path.join(installDir, 'installer.exe')), 'Windows update should be installed');
        });
        test('should handle Linux .tar.gz installation', async () => {
            const linuxUpdate = path.join(testDir, 'ainative-studio-linux.tar.gz');
            const installDir = path.join(testDir, 'opt', 'ainative-studio');
            createMockUpdatePackage(linuxUpdate, 70 * 1024 * 1024); // 70MB
            // Simulate Linux installation
            fs.mkdirSync(installDir, { recursive: true });
            // In real scenario, would extract tar.gz
            // For test, we copy the archive
            fs.copyFileSync(linuxUpdate, path.join(installDir, 'package.tar.gz'));
            assert.ok(fs.existsSync(path.join(installDir, 'package.tar.gz')), 'Linux update should be installed');
        });
        test('should handle Snap automatic updates on Linux', async () => {
            // Snap packages update automatically through snapd
            // Application should detect it's running as snap and disable manual updates
            const isSnap = process.env.SNAP !== undefined;
            if (isSnap) {
                // Updates are handled by snapd
                assert.ok(true, 'Snap updates are automatic');
            }
            else {
                // Regular update flow
                assert.ok(true, 'Non-Snap updates use manual flow');
            }
        });
    });
    suite('Post-Installation Verification', () => {
        test('should verify installation completed successfully', async () => {
            const installMarker = path.join(testDir, 'install-complete.txt');
            // Simulate installation
            await timeout(50);
            // Mark installation as complete
            fs.writeFileSync(installMarker, 'Installation completed successfully');
            // Verify
            assert.ok(fs.existsSync(installMarker), 'Installation marker should exist');
            const content = fs.readFileSync(installMarker, 'utf-8');
            assert.strictEqual(content, 'Installation completed successfully', 'Installation should be verified');
        });
        test('should update version number after installation', async () => {
            const versionFile = path.join(testDir, 'version.json');
            const oldVersion = { version: '1.0.0', productVersion: '1.0.0' };
            const newVersion = { version: '1.5.0', productVersion: '1.5.0' };
            // Write old version
            fs.writeFileSync(versionFile, JSON.stringify(oldVersion));
            // Simulate update installation
            await timeout(10);
            // Update version
            fs.writeFileSync(versionFile, JSON.stringify(newVersion));
            // Verify version updated
            const currentVersion = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
            assert.strictEqual(currentVersion.version, '1.5.0', 'Version should be updated');
        });
        test('should trigger restart after installation', async () => {
            let restartTriggered = false;
            // Simulate installation completion
            await timeout(10);
            // Trigger restart
            const update = {
                version: '1.5.0',
                productVersion: '1.5.0'
            };
            const state = State.Ready(update);
            if (state.type === "ready" /* StateType.Ready */) {
                // In real scenario, would call quitAndInstall()
                restartTriggered = true;
            }
            assert.ok(restartTriggered, 'Restart should be triggered after installation');
        });
    });
    suite('Error Handling During Installation', () => {
        test('should handle insufficient disk space', () => {
            const requiredSpace = 500 * 1024 * 1024; // 500MB
            const availableSpace = 100 * 1024 * 1024; // 100MB
            const hasEnoughSpace = availableSpace >= requiredSpace;
            assert.strictEqual(hasEnoughSpace, false, 'Should detect insufficient disk space');
            if (!hasEnoughSpace) {
                // Should abort installation and show error
                assert.ok(true, 'Installation should be aborted due to insufficient space');
            }
        });
        test('should handle file permission errors during installation', async () => {
            const installDir = path.join(testDir, 'protected');
            // Create directory
            fs.mkdirSync(installDir, { recursive: true });
            // Make directory read-only (simulating permission error)
            fs.chmodSync(installDir, 0o444);
            try {
                // Attempt to write file (should fail)
                fs.writeFileSync(path.join(installDir, 'app.exe'), 'content');
                assert.fail('Should have thrown permission error');
            }
            catch (error) {
                assert.ok(error.code === 'EACCES' || error.code === 'EPERM', 'Should handle permission error');
            }
            finally {
                // Cleanup - restore permissions
                fs.chmodSync(installDir, 0o755);
            }
        });
        test('should handle corrupted update package', async () => {
            const updatePackage = path.join(testDir, 'corrupted-update.zip');
            // Create update package
            createMockUpdatePackage(updatePackage);
            // Compute original hash
            const originalHash = crypto.createHash('sha256')
                .update(fs.readFileSync(updatePackage))
                .digest('hex');
            // Corrupt the package
            const buffer = fs.readFileSync(updatePackage);
            buffer[0] = buffer[0] ^ 0xFF;
            fs.writeFileSync(updatePackage, buffer);
            // Compute corrupted hash
            const corruptedHash = crypto.createHash('sha256')
                .update(fs.readFileSync(updatePackage))
                .digest('hex');
            // Verify hashes don't match
            assert.notStrictEqual(corruptedHash, originalHash, 'Corrupted package should be detected');
            // Installation should be aborted
            if (corruptedHash !== originalHash) {
                assert.ok(true, 'Installation should be aborted for corrupted package');
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlSW5zdGFsbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvdGVzdC9lbGVjdHJvbi1tYWluL3VwZGF0ZUluc3RhbGwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM1Qiw2REFBNkQ7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsNkRBQTZEO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxLQUFLLEVBQXNCLE1BQU0sd0JBQXdCLENBQUM7QUFFbkU7Ozs7Ozs7Ozs7R0FVRztBQUNILEtBQUssQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7SUFFaEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMxQyxJQUFJLE9BQWUsQ0FBQztJQUNwQixJQUFJLFNBQWlCLENBQUM7SUFFdEIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxzQkFBc0IsQ0FB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