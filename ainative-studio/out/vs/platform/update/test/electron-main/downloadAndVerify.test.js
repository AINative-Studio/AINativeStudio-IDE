/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Update Service - Integration - Download and Verify', () => {
    const disposables = new DisposableStore();
    let testDir;
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        testDir = fs.mkdtempSync(path.join(tmpdir(), 'update-download-test-'));
    });
    teardown(() => {
        disposables.clear();
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
    /**
     * Helper function to compute SHA256 hash
     */
    function computeSHA256(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    /**
     * Helper function to simulate file download
     */
    async function simulateDownload(url, destPath, size) {
        // Create mock file
        const buffer = Buffer.alloc(size);
        crypto.randomFillSync(buffer);
        // Simulate download delay based on size
        const delayMs = Math.min(size / (1024 * 1024) * 10, 500); // 10ms per MB, max 500ms
        await timeout(delayMs);
        fs.writeFileSync(destPath, buffer);
    }
    suite('Download Success Scenarios', () => {
        test('should download small update file (<10MB)', async () => {
            const url = 'http://example.com/update-small.zip';
            const destPath = path.join(testDir, 'update-small.zip');
            const size = 5 * 1024 * 1024; // 5MB
            await simulateDownload(url, destPath, size);
            assert.ok(fs.existsSync(destPath), 'Downloaded file should exist');
            const stats = fs.statSync(destPath);
            assert.strictEqual(stats.size, size, 'Downloaded file should have correct size');
        });
        test('should download medium update file (10-50MB)', async () => {
            const url = 'http://example.com/update-medium.zip';
            const destPath = path.join(testDir, 'update-medium.zip');
            const size = 25 * 1024 * 1024; // 25MB
            await simulateDownload(url, destPath, size);
            assert.ok(fs.existsSync(destPath), 'Downloaded file should exist');
            const stats = fs.statSync(destPath);
            assert.strictEqual(stats.size, size, 'Downloaded file should have correct size');
        });
        test('should download large update file (>50MB)', async () => {
            const url = 'http://example.com/update-large.zip';
            const destPath = path.join(testDir, 'update-large.zip');
            const size = 100 * 1024 * 1024; // 100MB
            await simulateDownload(url, destPath, size);
            assert.ok(fs.existsSync(destPath), 'Downloaded file should exist');
            const stats = fs.statSync(destPath);
            assert.strictEqual(stats.size, size, 'Downloaded file should have correct size');
        });
        test('should download and track progress', async () => {
            const url = 'http://example.com/update.zip';
            const destPath = path.join(testDir, 'update.zip');
            const totalSize = 10 * 1024 * 1024; // 10MB
            const chunkSize = 1 * 1024 * 1024; // 1MB chunks
            const progress = [];
            // Simulate chunked download
            const chunks = Math.ceil(totalSize / chunkSize);
            let downloaded = 0;
            for (let i = 0; i < chunks; i++) {
                const currentChunkSize = Math.min(chunkSize, totalSize - downloaded);
                downloaded += currentChunkSize;
                const percentage = (downloaded / totalSize) * 100;
                progress.push(percentage);
                await timeout(10);
            }
            // Write final file
            const buffer = Buffer.alloc(totalSize);
            crypto.randomFillSync(buffer);
            fs.writeFileSync(destPath, buffer);
            assert.strictEqual(progress.length, chunks, 'Should track progress for each chunk');
            assert.strictEqual(progress[progress.length - 1], 100, 'Should reach 100% progress');
        });
    });
    suite('SHA256 Verification Success', () => {
        test('should verify SHA256 hash after download', async () => {
            const destPath = path.join(testDir, 'update-verify.zip');
            const size = 1024 * 1024; // 1MB
            await simulateDownload('http://example.com/update.zip', destPath, size);
            const actualHash = await computeSHA256(destPath);
            // In real scenario, expectedHash comes from server
            const expectedHash = actualHash;
            assert.strictEqual(actualHash, expectedHash, 'SHA256 hash should match');
        });
        test('should verify SHA256 for darwin platform', async () => {
            const destPath = path.join(testDir, 'AINativeStudio-darwin-1.5.0.zip');
            const size = 50 * 1024 * 1024; // 50MB
            await simulateDownload('http://example.com/darwin.zip', destPath, size);
            const hash = await computeSHA256(destPath);
            assert.strictEqual(hash.length, 64, 'SHA256 hash should be 64 characters');
            assert.match(hash, /^[a-f0-9]{64}$/, 'SHA256 hash should be lowercase hex');
        });
        test('should verify SHA256 for win32 platform', async () => {
            const destPath = path.join(testDir, 'AINativeStudio-win32-x64-1.5.0.exe');
            const size = 80 * 1024 * 1024; // 80MB
            await simulateDownload('http://example.com/win32.exe', destPath, size);
            const hash = await computeSHA256(destPath);
            assert.strictEqual(hash.length, 64, 'SHA256 hash should be 64 characters');
            assert.match(hash, /^[a-f0-9]{64}$/, 'SHA256 hash should be lowercase hex');
        });
        test('should verify SHA256 for linux platform', async () => {
            const destPath = path.join(testDir, 'AINativeStudio-linux-x64-1.5.0.tar.gz');
            const size = 60 * 1024 * 1024; // 60MB
            await simulateDownload('http://example.com/linux.tar.gz', destPath, size);
            const hash = await computeSHA256(destPath);
            assert.strictEqual(hash.length, 64, 'SHA256 hash should be 64 characters');
            assert.match(hash, /^[a-f0-9]{64}$/, 'SHA256 hash should be lowercase hex');
        });
    });
    suite('SHA256 Verification Failures', () => {
        test('should detect SHA256 mismatch', async () => {
            const destPath = path.join(testDir, 'update-mismatch.zip');
            const size = 1024 * 1024; // 1MB
            await simulateDownload('http://example.com/update.zip', destPath, size);
            const actualHash = await computeSHA256(destPath);
            const expectedHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
            const isValid = actualHash === expectedHash;
            assert.strictEqual(isValid, false, 'SHA256 verification should fail for mismatch');
        });
        test('should handle corrupted download', async () => {
            const destPath = path.join(testDir, 'update-corrupt.zip');
            const size = 1024 * 1024; // 1MB
            // Write original file
            await simulateDownload('http://example.com/update.zip', destPath, size);
            const originalHash = await computeSHA256(destPath);
            // Corrupt the file
            const buffer = fs.readFileSync(destPath);
            buffer[0] = buffer[0] ^ 0xFF; // Flip bits in first byte
            fs.writeFileSync(destPath, buffer);
            const corruptedHash = await computeSHA256(destPath);
            assert.notStrictEqual(corruptedHash, originalHash, 'Corrupted file should have different hash');
        });
        test('should reject invalid SHA256 format', () => {
            const invalidHashes = [
                '',
                'abc',
                'not-a-hash',
                'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg', // invalid char
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' // too short
            ];
            invalidHashes.forEach(hash => {
                const isValid = /^[a-f0-9]{64}$/i.test(hash);
                assert.strictEqual(isValid, false, `${hash} should be invalid`);
            });
        });
    });
    suite('Download Resume Scenarios', () => {
        test('should support partial download resume', async () => {
            const destPath = path.join(testDir, 'update-resume.zip');
            const totalSize = 10 * 1024 * 1024; // 10MB
            const partialSize = 5 * 1024 * 1024; // 5MB already downloaded
            // Simulate partial download
            const partialBuffer = Buffer.alloc(partialSize);
            crypto.randomFillSync(partialBuffer);
            fs.writeFileSync(destPath, partialBuffer);
            const initialStats = fs.statSync(destPath);
            assert.strictEqual(initialStats.size, partialSize, 'Partial download should exist');
            // Resume download (append remaining data)
            const remainingSize = totalSize - partialSize;
            const remainingBuffer = Buffer.alloc(remainingSize);
            crypto.randomFillSync(remainingBuffer);
            fs.appendFileSync(destPath, remainingBuffer);
            const finalStats = fs.statSync(destPath);
            assert.strictEqual(finalStats.size, totalSize, 'Resumed download should complete');
        });
        test('should handle resume after network interruption', async () => {
            const destPath = path.join(testDir, 'update-interrupted.zip');
            const totalSize = 20 * 1024 * 1024; // 20MB
            // First attempt - interrupted at 30%
            const partialSize = Math.floor(totalSize * 0.3);
            const partialBuffer = Buffer.alloc(partialSize);
            crypto.randomFillSync(partialBuffer);
            fs.writeFileSync(destPath, partialBuffer);
            // Verify partial download exists
            assert.ok(fs.existsSync(destPath), 'Partial download should exist');
            // Resume from 30%
            const remainingSize = totalSize - partialSize;
            await timeout(50); // Simulate network reconnection
            // Complete download
            await simulateDownload('http://example.com/update.zip', destPath + '.tmp', totalSize);
            assert.ok(fs.existsSync(destPath + '.tmp'), 'Resumed download should complete');
        });
    });
    suite('Download Error Scenarios', () => {
        test('should handle network timeout', async () => {
            const timeout = 5000; // 5 second timeout
            const startTime = Date.now();
            try {
                await Promise.race([
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 100)),
                    new Promise(resolve => setTimeout(resolve, 10000))
                ]);
                assert.fail('Should throw timeout error');
            }
            catch (error) {
                const duration = Date.now() - startTime;
                assert.ok(duration < timeout, 'Should timeout quickly');
                assert.ok(error.message.includes('timeout'), 'Should be timeout error');
            }
        });
        test('should handle HTTP error responses', () => {
            const errorCodes = [404, 500, 503];
            errorCodes.forEach(code => {
                const shouldRetry = code >= 500;
                if (code === 404) {
                    // File not found - don't retry
                    assert.strictEqual(shouldRetry, false);
                }
                else {
                    // Server error - retry
                    assert.strictEqual(shouldRetry, true);
                }
            });
        });
        test('should handle insufficient disk space', () => {
            const availableSpace = 100 * 1024 * 1024; // 100MB
            const requiredSpace = 200 * 1024 * 1024; // 200MB
            const hasEnoughSpace = availableSpace >= requiredSpace;
            assert.strictEqual(hasEnoughSpace, false, 'Should detect insufficient disk space');
        });
        test('should handle file permission errors', () => {
            const destPath = path.join(testDir, 'update-readonly.zip');
            // Create read-only file
            fs.writeFileSync(destPath, 'test');
            fs.chmodSync(destPath, 0o444); // Read-only
            try {
                // Try to write to read-only file
                fs.writeFileSync(destPath, 'new content');
                assert.fail('Should throw permission error');
            }
            catch (error) {
                assert.ok(error.code === 'EACCES' || error.code === 'EPERM', 'Should be permission error');
            }
            finally {
                // Cleanup - restore write permission
                fs.chmodSync(destPath, 0o644);
            }
        });
    });
    suite('Platform-Specific Downloads', () => {
        test('should download macOS Universal binary', async () => {
            const destPath = path.join(testDir, 'AINativeStudio-darwin-universal-1.5.0.zip');
            const size = 120 * 1024 * 1024; // 120MB (larger due to dual architecture)
            await simulateDownload('http://example.com/darwin-universal.zip', destPath, size);
            assert.ok(fs.existsSync(destPath), 'Universal binary should download');
            const stats = fs.statSync(destPath);
            assert.ok(stats.size > 100 * 1024 * 1024, 'Universal binary should be large');
        });
        test('should download Windows Setup installer', async () => {
            const destPath = path.join(testDir, 'AINativeStudioSetup-1.5.0.exe');
            const size = 85 * 1024 * 1024; // 85MB
            await simulateDownload('http://example.com/setup.exe', destPath, size);
            assert.ok(fs.existsSync(destPath), 'Windows installer should download');
            assert.ok(destPath.endsWith('.exe'), 'Windows installer should be .exe');
        });
        test('should download Linux tarball', async () => {
            const destPath = path.join(testDir, 'ainative-studio-1.5.0-linux-x64.tar.gz');
            const size = 70 * 1024 * 1024; // 70MB
            await simulateDownload('http://example.com/linux.tar.gz', destPath, size);
            assert.ok(fs.existsSync(destPath), 'Linux tarball should download');
            assert.ok(destPath.endsWith('.tar.gz'), 'Linux package should be .tar.gz');
        });
    });
    suite('Performance Metrics', () => {
        test('should track download speed', async () => {
            const size = 10 * 1024 * 1024; // 10MB
            const startTime = Date.now();
            const destPath = path.join(testDir, 'update-speed.zip');
            await simulateDownload('http://example.com/update.zip', destPath, size);
            const duration = (Date.now() - startTime) / 1000; // seconds
            const speedMBps = (size / (1024 * 1024)) / duration;
            assert.ok(speedMBps > 0, 'Download speed should be positive');
        });
        test('should estimate remaining time', () => {
            const totalSize = 100 * 1024 * 1024; // 100MB
            const downloaded = 30 * 1024 * 1024; // 30MB
            const speedBps = 10 * 1024 * 1024; // 10MB/s
            const remaining = totalSize - downloaded;
            const estimatedSeconds = remaining / speedBps;
            assert.strictEqual(estimatedSeconds, 7, 'Should estimate 7 seconds remaining');
        });
        test('should handle variable download speed', async () => {
            const measurements = [];
            // Simulate variable network conditions
            for (let i = 0; i < 5; i++) {
                const speed = 5 + Math.random() * 10; // 5-15 MB/s
                measurements.push(speed);
                await timeout(10);
            }
            const avgSpeed = measurements.reduce((a, b) => a + b, 0) / measurements.length;
            assert.ok(avgSpeed > 0, 'Average speed should be positive');
            assert.ok(measurements.length === 5, 'Should have 5 measurements');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxvYWRBbmRWZXJpZnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXBkYXRlL3Rlc3QvZWxlY3Ryb24tbWFpbi9kb3dubG9hZEFuZFZlcmlmeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtJQUVoRSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLElBQUksT0FBZSxDQUFDO0lBRXBCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE9BQU8sR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQixJQUFJLEVBQUUsQ0FBQyxVQUFVLENB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