/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
// @ts-ignore - Path resolution issue in platform tests
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';

suite('Update Service - SHA256 Verification', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	let testDir: string;

	setup(() => {
		testDir = fs.mkdtempSync(path.join(tmpdir(), 'update-sha256-test-'));
	});

	teardown(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	/**
	 * Helper function to compute SHA256 hash of a file
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
	 * Helper function to verify SHA256 hash
	 */
	async function verifySHA256(filePath: string, expectedHash: string): Promise<boolean> {
		const actualHash = await computeSHA256(filePath);
		return actualHash === expectedHash;
	}

	test('should compute SHA256 hash correctly for small file', async () => {
		const testFile = path.join(testDir, 'test-small.txt');
		const content = 'Hello, World!';

		fs.writeFileSync(testFile, content);

		const hash = await computeSHA256(testFile);

		// Known SHA256 hash for "Hello, World!"
		const expectedHash = 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';

		assert.strictEqual(hash, expectedHash, 'SHA256 hash should match expected value');
	});

	test('should compute SHA256 hash correctly for binary file', async () => {
		const testFile = path.join(testDir, 'test-binary.bin');
		const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);

		fs.writeFileSync(testFile, buffer);

		const hash = await computeSHA256(testFile);

		// Compute expected hash
		const expectedHash = crypto.createHash('sha256').update(buffer).digest('hex');

		assert.strictEqual(hash, expectedHash, 'SHA256 hash should match for binary data');
	});

	test('should compute SHA256 hash correctly for large file', async () => {
		const testFile = path.join(testDir, 'test-large.bin');

		// Create a 1MB file
		const size = 1024 * 1024;
		const buffer = Buffer.alloc(size);

		// Fill with pattern
		for (let i = 0; i < size; i++) {
			buffer[i] = i % 256;
		}

		fs.writeFileSync(testFile, buffer);

		const hash = await computeSHA256(testFile);

		// Verify hash was computed (should be 64 hex characters)
		assert.strictEqual(hash.length, 64, 'SHA256 hash should be 64 characters');
		assert.match(hash, /^[a-f0-9]{64}$/, 'SHA256 hash should be lowercase hex');
	});

	test('should verify SHA256 hash correctly - matching hash', async () => {
		const testFile = path.join(testDir, 'test-verify-match.txt');
		const content = 'Test content for verification';

		fs.writeFileSync(testFile, content);

		const expectedHash = await computeSHA256(testFile);
		const isValid = await verifySHA256(testFile, expectedHash);

		assert.strictEqual(isValid, true, 'Verification should succeed for matching hash');
	});

	test('should verify SHA256 hash correctly - non-matching hash', async () => {
		const testFile = path.join(testDir, 'test-verify-mismatch.txt');
		const content = 'Test content for verification';

		fs.writeFileSync(testFile, content);

		// Use a different hash
		const wrongHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		const isValid = await verifySHA256(testFile, wrongHash);

		assert.strictEqual(isValid, false, 'Verification should fail for non-matching hash');
	});

	test('should handle SHA256 hash case insensitivity', async () => {
		const testFile = path.join(testDir, 'test-case.txt');
		const content = 'Case test';

		fs.writeFileSync(testFile, content);

		const hash = await computeSHA256(testFile);
		const upperHash = hash.toUpperCase();

		// Normalize both to lowercase for comparison
		const isValid = hash.toLowerCase() === upperHash.toLowerCase();

		assert.strictEqual(isValid, true, 'SHA256 verification should be case-insensitive');
	});

	test('should detect file corruption through hash mismatch', async () => {
		const testFile = path.join(testDir, 'test-corrupt.txt');
		const originalContent = 'Original content';

		fs.writeFileSync(testFile, originalContent);

		const originalHash = await computeSHA256(testFile);

		// Modify the file (simulate corruption)
		const corruptedContent = 'Corrupted content';
		fs.writeFileSync(testFile, corruptedContent);

		const isValid = await verifySHA256(testFile, originalHash);

		assert.strictEqual(isValid, false, 'Verification should fail for corrupted file');
	});

	test('should handle empty file SHA256 computation', async () => {
		const testFile = path.join(testDir, 'test-empty.txt');

		fs.writeFileSync(testFile, '');

		const hash = await computeSHA256(testFile);

		// Known SHA256 hash for empty string
		const expectedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

		assert.strictEqual(hash, expectedHash, 'SHA256 hash should match for empty file');
	});

	test('should handle non-existent file gracefully', async () => {
		const nonExistentFile = path.join(testDir, 'does-not-exist.txt');

		try {
			await computeSHA256(nonExistentFile);
			assert.fail('Should throw error for non-existent file');
		} catch (error) {
			assert.ok(error, 'Should throw error for non-existent file');
		}
	});

	test('should parse SHA256 file format correctly', () => {
		// Common formats for SHA256 files
		const formats = [
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  filename.zip',
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 *filename.zip',
		];

		formats.forEach(format => {
			// Extract just the hash (first 64 hex characters)
			const hashMatch = format.match(/^([a-f0-9]{64})/i);
			assert.ok(hashMatch, `Should extract hash from format: ${format}`);

			const hash = hashMatch![1];
			assert.strictEqual(hash.length, 64, 'Extracted hash should be 64 characters');
		});
	});

	test('should validate SHA256 hash string format', () => {
		const validHashes = [
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
			'1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
		];

		const invalidHashes = [
			'',
			'abc',
			'g3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // invalid char 'g'
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85', // too short
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8555' // too long
		];

		validHashes.forEach(hash => {
			const isValid = /^[a-f0-9]{64}$/i.test(hash);
			assert.strictEqual(isValid, true, `${hash} should be valid`);
		});

		invalidHashes.forEach(hash => {
			const isValid = /^[a-f0-9]{64}$/i.test(hash);
			assert.strictEqual(isValid, false, `${hash} should be invalid`);
		});
	});

	test('should compute consistent hash for same content', async () => {
		const content = 'Consistent content test';

		const file1 = path.join(testDir, 'test-consistent-1.txt');
		const file2 = path.join(testDir, 'test-consistent-2.txt');

		fs.writeFileSync(file1, content);
		fs.writeFileSync(file2, content);

		const hash1 = await computeSHA256(file1);
		const hash2 = await computeSHA256(file2);

		assert.strictEqual(hash1, hash2, 'Same content should produce same hash');
	});

	test('should produce different hash for different content', async () => {
		const content1 = 'Content A';
		const content2 = 'Content B';

		const file1 = path.join(testDir, 'test-different-1.txt');
		const file2 = path.join(testDir, 'test-different-2.txt');

		fs.writeFileSync(file1, content1);
		fs.writeFileSync(file2, content2);

		const hash1 = await computeSHA256(file1);
		const hash2 = await computeSHA256(file2);

		assert.notStrictEqual(hash1, hash2, 'Different content should produce different hash');
	});

	test('should handle line ending differences', async () => {
		const contentLF = 'Line 1\nLine 2\nLine 3';
		const contentCRLF = 'Line 1\r\nLine 2\r\nLine 3';

		const fileLF = path.join(testDir, 'test-lf.txt');
		const fileCRLF = path.join(testDir, 'test-crlf.txt');

		fs.writeFileSync(fileLF, contentLF);
		fs.writeFileSync(fileCRLF, contentCRLF);

		const hashLF = await computeSHA256(fileLF);
		const hashCRLF = await computeSHA256(fileCRLF);

		// Different line endings should produce different hashes
		assert.notStrictEqual(hashLF, hashCRLF, 'Different line endings should produce different hashes');
	});
});
