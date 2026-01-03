/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CryptoService, JWTUtils } from '../../common/crypto.js';

suite('CryptoService', () => {
	let cryptoService: CryptoService;

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
			(testCrypto as any)._csrfTokenTimeout = 100; // 100ms timeout

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
	function createTestJWT(expiresIn: number = 3600): string {
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
			const expirationSeconds = Math.floor(expiration! / 1000);

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
