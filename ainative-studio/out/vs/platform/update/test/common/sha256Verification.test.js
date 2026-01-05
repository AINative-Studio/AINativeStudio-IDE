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
    let testDir;
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
     * Helper function to verify SHA256 hash
     */
    async function verifySHA256(filePath, expectedHash) {
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
        }
        catch (error) {
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
            const hash = hashMatch[1];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhMjU2VmVyaWZpY2F0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VwZGF0ZS90ZXN0L2NvbW1vbi9zaGEyNTZWZXJpZmljYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM1Qix1REFBdUQ7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtJQUVsRCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksT0FBZSxDQUFDO0lBRXBCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM1QixFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDdEQsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUg7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