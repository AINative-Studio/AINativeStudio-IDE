/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CryptoService, JWTUtils } from '../../common/crypto.js';
suite('CryptoService', () => {
    let cryptoService;
    setup(() => {
        cryptoService = new CryptoService();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('Random String Generation', () => {
        test('should generate random string of correct length', () => {
            const length = 32;
            const randomString = cryptoService.generateRandomString(length);
            assert.strictEqual(randomString.length, length);
        });
        test('should generate unique strings', () => {
            const string1 = cryptoService.generateRandomString(32);
            const string2 = cryptoService.generateRandomString(32);
            assert.notStrictEqual(string1, string2);
        });
        test('should generate strings with valid characters', () => {
            const randomString = cryptoService.generateRandomString(100);
            const validChars = /^[A-Za-z0-9\-._~]+$/;
            assert.ok(validChars.test(randomString));
        });
        test('should handle different lengths', () => {
            const lengths = [1, 8, 16, 32, 64, 128];
            for (const length of lengths) {
                const randomString = cryptoService.generateRandomString(length);
                assert.strictEqual(randomString.length, length);
            }
        });
    });
    suite('Hashing', () => {
        test('should generate consistent hash for same input', async () => {
            const data = 'test-data-12345';
            const hash1 = await cryptoService.hash(data);
            const hash2 = await cryptoService.hash(data);
            assert.strictEqual(hash1, hash2);
        });
        test('should generate different hashes for different inputs', async () => {
            const data1 = 'test-data-1';
            const data2 = 'test-data-2';
            const hash1 = await cryptoService.hash(data1);
            const hash2 = await cryptoService.hash(data2);
            assert.notStrictEqual(hash1, hash2);
        });
        test('should generate hexadecimal hash', async () => {
            const data = 'test-data';
            const hash = await cryptoService.hash(data);
            const hexPattern = /^[0-9a-f]+$/;
            assert.ok(hexPattern.test(hash));
        });
        test('should generate SHA-256 hash (64 characters)', async () => {
            const data = 'test-data';
            const hash = await cryptoService.hash(data);
            // SHA-256 produces 64 hex characters
            assert.strictEqual(hash.length, 64);
        });
    });
    suite('Hash Verification', () => {
        test('should verify correct hash', async () => {
            const data = 'test-data-12345';
            const hash = await cryptoService.hash(data);
            const isValid = await cryptoService.verifyHash(data, hash);
            assert.strictEqual(isValid, true);
        });
        test('should reject incorrect hash', async () => {
            const data = 'test-data';
            const wrongHash = await cryptoService.hash('different-data');
            const isValid = await cryptoService.verifyHash(data, wrongHash);
            assert.strictEqual(isValid, false);
        });
        test('should reject tampered hash', async () => {
            const data = 'test-data';
            const hash = await cryptoService.hash(data);
            // Tamper with hash
            const tamperedHash = 'a' + hash.substring(1);
            const isValid = await cryptoService.verifyHash(data, tamperedHash);
            assert.strictEqual(isValid, false);
        });
    });
    suite('CSRF Token', () => {
        test('should generate CSRF token', () => {
            const token = cryptoService.generateCSRFToken();
            assert.ok(token);
            assert.strictEqual(typeof token, 'string');
            assert.ok(token.length > 0);
        });
        test('should generate unique CSRF tokens', () => {
            const token1 = cryptoService.generateCSRFToken();
            const token2 = cryptoService.generateCSRFToken();
            assert.notStrictEqual(token1, token2);
        });
        test('should verify valid CSRF token', () => {
            const token = cryptoService.generateCSRFToken();
            const isValid = cryptoService.verifyCSRFToken(token);
            assert.strictEqual(isValid, true);
        });
        test('should reject invalid CSRF token', () => {
            const isValid = cryptoService.verifyCSRFToken('invalid-token');
            assert.strictEqual(isValid, false);
        });
        test('should reject used token after expiration', async () => {
            // Create new crypto service with short timeout for testing
            const testCrypto = new CryptoService();
            testCrypto._csrfTokenTimeout = 100; // 100ms timeout
            const token = testCrypto.generateCSRFToken();
            // Wait for token to expire
            await new Promise(resolve => setTimeout(resolve, 150));
            const isValid = testCrypto.verifyCSRFToken(token);
            assert.strictEqual(isValid, false);
        });
    });
});
suite('JWTUtils', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Create a test JWT token
     */
    function createTestJWT(expiresIn = 3600) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const payload = {
            sub: 'test-user-id',
            email: 'test@example.com',
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + expiresIn,
            iat: Math.floor(Date.now() / 1000)
        };
        const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
        const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
        const signature = 'test-signature';
        return `${headerB64}.${payloadB64}.${signature}`;
    }
    suite('JWT Decoding', () => {
        test('should decode valid JWT token', () => {
            const token = createTestJWT();
            const payload = JWTUtils.decode(token);
            assert.ok(payload);
            assert.strictEqual(payload.sub, 'test-user-id');
            assert.strictEqual(payload.email, 'test@example.com');
        });
        test('should throw error for invalid JWT format', () => {
            const invalidToken = 'not.a.valid.jwt.token';
            assert.throws(() => {
                JWTUtils.decode(invalidToken);
            }, /Invalid JWT token format/);
        });
        test('should throw error for malformed JWT', () => {
            const malformedToken = 'header.payload';
            assert.throws(() => {
                JWTUtils.decode(malformedToken);
            }, /Invalid JWT token format/);
        });
    });
    suite('JWT Expiration', () => {
        test('should detect non-expired token', () => {
            const token = createTestJWT(3600); // Expires in 1 hour
            const isExpired = JWTUtils.isExpired(token);
            assert.strictEqual(isExpired, false);
        });
        test('should detect expired token', () => {
            const token = createTestJWT(-100); // Expired 100 seconds ago
            const isExpired = JWTUtils.isExpired(token);
            assert.strictEqual(isExpired, true);
        });
        test('should consider buffer time', () => {
            const token = createTestJWT(200); // Expires in 200 seconds
            // Without buffer, should not be expired
            const isExpiredNoBuffer = JWTUtils.isExpired(token, 0);
            assert.strictEqual(isExpiredNoBuffer, false);
            // With 300 second buffer, should be considered expired
            const isExpiredWithBuffer = JWTUtils.isExpired(token, 300);
            assert.strictEqual(isExpiredWithBuffer, true);
        });
        test('should get expiration time', () => {
            const expiresIn = 3600;
            const token = createTestJWT(expiresIn);
            const expiration = JWTUtils.getExpiration(token);
            assert.ok(expiration !== null);
            const expectedExpiration = Math.floor(Date.now() / 1000) + expiresIn;
            const expirationSeconds = Math.floor(expiration / 1000);
            // Allow 1 second tolerance
            assert.ok(Math.abs(expirationSeconds - expectedExpiration) <= 1);
        });
        test('should return null for invalid token expiration', () => {
            const invalidToken = 'invalid.token.here';
            const expiration = JWTUtils.getExpiration(invalidToken);
            assert.strictEqual(expiration, null);
        });
    });
    suite('JWT Claims', () => {
        test('should extract claims from token', () => {
            const token = createTestJWT();
            const claims = JWTUtils.getClaims(token);
            assert.strictEqual(claims.sub, 'test-user-id');
            assert.strictEqual(claims.email, 'test@example.com');
            assert.strictEqual(claims.role, 'user');
            assert.ok(claims.exp);
            assert.ok(claims.iat);
        });
        test('should extract custom claims', () => {
            const header = { alg: 'HS256', typ: 'JWT' };
            const payload = {
                sub: 'user-123',
                customField: 'custom-value',
                permissions: ['read', 'write']
            };
            const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
            const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
            const token = `${headerB64}.${payloadB64}.signature`;
            const claims = JWTUtils.getClaims(token);
            assert.strictEqual(claims.customField, 'custom-value');
            assert.deepStrictEqual(claims.permissions, ['read', 'write']);
        });
    });
    suite('JWT Validation', () => {
        test('should validate correct JWT structure', () => {
            const token = createTestJWT();
            const isValid = JWTUtils.isValidStructure(token);
            assert.strictEqual(isValid, true);
        });
        test('should reject token with wrong number of parts', () => {
            const invalidToken = 'header.payload';
            const isValid = JWTUtils.isValidStructure(invalidToken);
            assert.strictEqual(isValid, false);
        });
        test('should reject token with too many parts', () => {
            const invalidToken = 'header.payload.signature.extra';
            const isValid = JWTUtils.isValidStructure(invalidToken);
            assert.strictEqual(isValid, false);
        });
        test('should reject token with invalid base64', () => {
            const invalidToken = 'not-base64.also-not-base64.still-not-base64';
            const isValid = JWTUtils.isValidStructure(invalidToken);
            assert.strictEqual(isValid, false);
        });
    });
    suite('Edge Cases', () => {
        test('should handle token with minimal payload', () => {
            const header = { alg: 'HS256', typ: 'JWT' };
            const payload = { sub: 'user' };
            const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
            const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
            const token = `${headerB64}.${payloadB64}.sig`;
            const claims = JWTUtils.getClaims(token);
            assert.strictEqual(claims.sub, 'user');
        });
        test('should handle token with nested objects', () => {
            const header = { alg: 'HS256', typ: 'JWT' };
            const payload = {
                sub: 'user',
                metadata: {
                    nested: {
                        deeply: 'value'
                    }
                }
            };
            const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
            const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
            const token = `${headerB64}.${payloadB64}.sig`;
            const claims = JWTUtils.getClaims(token);
            assert.strictEqual(claims.metadata.nested.deeply, 'value');
        });
        test('should handle token with special characters', () => {
            const header = { alg: 'HS256', typ: 'JWT' };
            const payload = {
                sub: 'user@example.com',
                name: 'User Name (Special)'
            };
            const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
            const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
            const token = `${headerB64}.${payloadB64}.sig`;
            const claims = JWTUtils.getClaims(token);
            assert.strictEqual(claims.sub, 'user@example.com');
            assert.strictEqual(claims.name, 'User Name (Special)');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3J5cHRvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL2NyeXB0by50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFakUsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsSUFBSSxhQUE0QixDQUFDO0lBRWpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixhQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztJQUNyQyxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1lBQzVELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztZQUNsQixNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtZQUMzQyxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLG9CQUFv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