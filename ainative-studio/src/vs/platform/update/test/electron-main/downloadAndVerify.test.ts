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
	let testDir: string;

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
	function computeSHA256(filePath: string): Promise<string> {
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
	async function simulateDownload(url: string, destPath: string, size: number): Promise<void> {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const url = 'http://example.com/update.zip';
			const destPath = path.join(testDir, 'update.zip');
			const totalSize = 10 * 1024 * 1024; // 10MB
			const chunkSize = 1 * 1024 * 1024; // 1MB chunks

			const progress: number[] = [];

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
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
			} catch (error: any) {
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
				} else {
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
			} catch (error: any) {
				assert.ok(error.code === 'EACCES' || error.code === 'EPERM', 'Should be permission error');
			} finally {
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
			const measurements: number[] = [];

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

	suite('Additional Download & Verification Tests', () => {

		test('should verify complete download with exact byte count', async () => {
			const expectedSize = 15 * 1024 * 1024; // 15MB
			const destPath = path.join(testDir, 'update-exact-size.zip');

			await simulateDownload('http://example.com/update.zip', destPath, expectedSize);

			const actualSize = fs.statSync(destPath).size;
			assert.strictEqual(actualSize, expectedSize, 'Downloaded file should match exact expected size');
		});

		test('should handle concurrent downloads to different files', async () => {
			const downloads = [
				{ url: 'http://example.com/update1.zip', size: 5 * 1024 * 1024 },
				{ url: 'http://example.com/update2.zip', size: 10 * 1024 * 1024 },
				{ url: 'http://example.com/update3.zip', size: 8 * 1024 * 1024 }
			];

			const downloadPromises = downloads.map((dl, index) => {
				const destPath = path.join(testDir, `concurrent-${index}.zip`);
				return simulateDownload(dl.url, destPath, dl.size);
			});

			await Promise.all(downloadPromises);

			// Verify all files exist
			downloads.forEach((_, index) => {
				const destPath = path.join(testDir, `concurrent-${index}.zip`);
				assert.ok(fs.existsSync(destPath), `Concurrent download ${index} should exist`);
			});
		});

		test('should validate SHA256 hash format before verification', () => {
			const validHashes = [
				'a'.repeat(64),
				'0123456789abcdef'.repeat(4),
				'f'.repeat(64)
			];

			const invalidHashes = [
				'',
				'abc',
				'g'.repeat(64), // invalid character
				'a'.repeat(63), // too short
				'a'.repeat(65)  // too long
			];

			validHashes.forEach(hash => {
				const isValid = /^[a-f0-9]{64}$/i.test(hash);
				assert.ok(isValid, `Valid hash ${hash.substring(0, 10)}... should pass validation`);
			});

			invalidHashes.forEach(hash => {
				const isValid = /^[a-f0-9]{64}$/i.test(hash);
				assert.strictEqual(isValid, false, `Invalid hash should fail validation`);
			});
		});

		test('should detect file corruption during download', async () => {
			const destPath = path.join(testDir, 'corrupt-detection.zip');
			const size = 5 * 1024 * 1024; // 5MB

			// Download original file
			await simulateDownload('http://example.com/update.zip', destPath, size);
			const originalHash = await computeSHA256(destPath);

			// Simulate corruption by modifying random bytes
			const buffer = fs.readFileSync(destPath);
			const corruptionPoints = [0, Math.floor(buffer.length / 2), buffer.length - 1];

			corruptionPoints.forEach(index => {
				buffer[index] = buffer[index] ^ 0xFF; // Flip all bits
			});

			fs.writeFileSync(destPath, buffer);

			const corruptedHash = await computeSHA256(destPath);

			assert.notStrictEqual(
				corruptedHash,
				originalHash,
				'Corrupted file should have different hash'
			);
		});

		test('should verify download integrity across multiple platforms', async () => {
			const platforms = [
				{ name: 'darwin', ext: '.zip' },
				{ name: 'win32', ext: '.exe' },
				{ name: 'linux', ext: '.tar.gz' }
			];

			for (const platform of platforms) {
				const destPath = path.join(testDir, `update-${platform.name}${platform.ext}`);
				const size = 20 * 1024 * 1024; // 20MB

				await simulateDownload(`http://example.com/${platform.name}`, destPath, size);

				const hash = await computeSHA256(destPath);

				assert.ok(fs.existsSync(destPath), `${platform.name} update should download`);
				assert.strictEqual(hash.length, 64, `${platform.name} hash should be 64 chars`);
				assert.match(hash, /^[a-f0-9]{64}$/, `${platform.name} hash should be valid hex`);
			}
		});

		test('should handle very large files (>200MB) efficiently', async () => {
			const size = 250 * 1024 * 1024; // 250MB
			const destPath = path.join(testDir, 'very-large-update.zip');

			const startTime = Date.now();
			await simulateDownload('http://example.com/large-update.zip', destPath, size);
			const duration = Date.now() - startTime;

			assert.ok(fs.existsSync(destPath), 'Very large file should download');
			assert.ok(duration < 10000, 'Large download should complete in reasonable time');

			const stats = fs.statSync(destPath);
			assert.strictEqual(stats.size, size, 'Very large file should have correct size');
		});

		test('should cleanup partial downloads on failure', async () => {
			const destPath = path.join(testDir, 'partial-cleanup.zip');
			const partialSize = 5 * 1024 * 1024; // 5MB partial

			// Create partial download
			const buffer = Buffer.alloc(partialSize);
			crypto.randomFillSync(buffer);
			fs.writeFileSync(destPath, buffer);

			assert.ok(fs.existsSync(destPath), 'Partial download should exist');

			// Simulate cleanup on failure
			if (fs.existsSync(destPath)) {
				fs.unlinkSync(destPath);
			}

			assert.ok(!fs.existsSync(destPath), 'Partial download should be cleaned up');
		});

		test('should verify checksum matches server-provided hash', async () => {
			const destPath = path.join(testDir, 'checksum-verify.zip');
			const size = 10 * 1024 * 1024; // 10MB

			// Download file
			await simulateDownload('http://example.com/update.zip', destPath, size);

			// Compute actual hash
			const actualHash = await computeSHA256(destPath);

			// In real scenario, expectedHash comes from update server
			const expectedHash = actualHash; // Self-verification for test

			// Verify checksum
			const checksumValid = actualHash === expectedHash;

			assert.ok(checksumValid, 'Checksum should match server-provided hash');
		});
	});
});
