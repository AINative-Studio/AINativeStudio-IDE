/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhMjU2VmVyaWZpY2F0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VwZGF0ZS90ZXN0L2NvbW1vbi9zaGEyNTZWZXJpZmljYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO0lBRWxELHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxPQUFlLENBQUM7SUFFcEIsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE9BQU8sR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzVCLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN0RCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSDs7T0FFRztJQUNILFNB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