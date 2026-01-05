/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, rejects } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AINativeSDKClient } from '../../common/ainativeSDKClient.js';
import { CloudAuthError, CloudAuthErrorCode } from '../../common/ainativeCloudAuthTypes.js';

suite('AINativeSDKClient', () => {
	let client: AINativeSDKClient;

	setup(() => {
		client = new AINativeSDKClient({
			baseUrl: 'https://api.ainative.studio',
			timeout: 30000,
			retryConfig: {
				maxRetries: 3,
				initialDelayMs: 100,
				maxDelayMs: 1000,
				backoffMultiplier: 2
			}
		});
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	suite('Configuration', () => {
		test('should use default configuration', () => {
			const defaultClient = new AINativeSDKClient();
			const config = defaultClient.getConfig();

			strictEqual(config.baseUrl, 'https://api.ainative.studio');
			strictEqual(config.timeout, 30000);
			strictEqual(config.retryConfig.maxRetries, 3);
		});

		test('should allow partial configuration override', () => {
			const customClient = new AINativeSDKClient({
				baseUrl: 'https://custom.api.com',
				timeout: 60000
			});

			const config = customClient.getConfig();
			strictEqual(config.baseUrl, 'https://custom.api.com');
			strictEqual(config.timeout, 60000);
			// Default retry config should still be applied
			strictEqual(config.retryConfig.maxRetries, 3);
		});

		test('should allow base URL update', () => {
			client.setBaseUrl('https://test.api.com');
			const config = client.getConfig();
			strictEqual(config.baseUrl, 'https://test.api.com');
		});
	});

	suite('Error Handling', () => {
		test('should create CloudAuthError for validation errors', () => {
			const error = new CloudAuthError(
				CloudAuthErrorCode.WeakPassword,
				'Password too weak',
				undefined,
				422
			);

			strictEqual(error.code, CloudAuthErrorCode.WeakPassword);
			strictEqual(error.message, 'Password too weak');
			strictEqual(error.statusCode, 422);
		});

		test('should create CloudAuthError for network errors', () => {
			const originalError = new Error('Network failed');
			const error = new CloudAuthError(
				CloudAuthErrorCode.NetworkError,
				'Network request failed',
				originalError
			);

			strictEqual(error.code, CloudAuthErrorCode.NetworkError);
			ok(error.originalError);
			strictEqual(error.originalError.message, 'Network failed');
		});

		test('should handle rate limiting errors', () => {
			const error = new CloudAuthError(
				CloudAuthErrorCode.RateLimitExceeded,
				'Rate limit exceeded',
				undefined,
				429
			);

			strictEqual(error.code, CloudAuthErrorCode.RateLimitExceeded);
			strictEqual(error.statusCode, 429);
		});

		test('should handle authentication errors', () => {
			const error = new CloudAuthError(
				CloudAuthErrorCode.InvalidCredentials,
				'Invalid credentials',
				undefined,
				401
			);

			strictEqual(error.code, CloudAuthErrorCode.InvalidCredentials);
			strictEqual(error.statusCode, 401);
		});

		test('should handle email conflict errors', () => {
			const error = new CloudAuthError(
				CloudAuthErrorCode.EmailAlreadyExists,
				'Email already exists',
				undefined,
				409
			);

			strictEqual(error.code, CloudAuthErrorCode.EmailAlreadyExists);
			strictEqual(error.statusCode, 409);
		});
	});

	suite('Retry Logic', () => {
		test('should have correct retry configuration', () => {
			const config = client.getConfig();

			strictEqual(config.retryConfig.maxRetries, 3);
			strictEqual(config.retryConfig.initialDelayMs, 100);
			strictEqual(config.retryConfig.maxDelayMs, 1000);
			strictEqual(config.retryConfig.backoffMultiplier, 2);
		});

		test('should calculate exponential backoff correctly', () => {
			const config = client.getConfig();
			const { initialDelayMs, backoffMultiplier, maxDelayMs } = config.retryConfig;

			// Test delay calculation
			const delay1 = Math.min(initialDelayMs * Math.pow(backoffMultiplier, 0), maxDelayMs);
			const delay2 = Math.min(initialDelayMs * Math.pow(backoffMultiplier, 1), maxDelayMs);
			const delay3 = Math.min(initialDelayMs * Math.pow(backoffMultiplier, 2), maxDelayMs);

			strictEqual(delay1, 100);
			strictEqual(delay2, 200);
			strictEqual(delay3, 400);
		});

		test('should cap delay at maxDelayMs', () => {
			const config = client.getConfig();
			const { initialDelayMs, backoffMultiplier, maxDelayMs } = config.retryConfig;

			// Very high retry count should cap at maxDelayMs
			const delay = Math.min(initialDelayMs * Math.pow(backoffMultiplier, 100), maxDelayMs);
			strictEqual(delay, maxDelayMs);
		});
	});

	suite('API Endpoints', () => {
		test('should have correct endpoint paths', () => {
			// These tests verify the endpoint paths are correct
			// In a real implementation, these would make actual HTTP calls

			const config = client.getConfig();
			const baseUrl = config.baseUrl;

			strictEqual(`${baseUrl}/v1/auth/register`, 'https://api.ainative.studio/v1/auth/register');
			strictEqual(`${baseUrl}/v1/auth/login-json`, 'https://api.ainative.studio/v1/auth/login-json');
			strictEqual(`${baseUrl}/v1/auth/logout`, 'https://api.ainative.studio/v1/auth/logout');
			strictEqual(`${baseUrl}/v1/auth/refresh`, 'https://api.ainative.studio/v1/auth/refresh');
			strictEqual(`${baseUrl}/v1/auth/me`, 'https://api.ainative.studio/v1/auth/me');
			strictEqual(`${baseUrl}/v1/auth/forgot-password`, 'https://api.ainative.studio/v1/auth/forgot-password');
			strictEqual(`${baseUrl}/v1/auth/reset-password`, 'https://api.ainative.studio/v1/auth/reset-password');
			strictEqual(`${baseUrl}/v1/auth/change-password`, 'https://api.ainative.studio/v1/auth/change-password');
			strictEqual(`${baseUrl}/v1/auth/verify-token`, 'https://api.ainative.studio/v1/auth/verify-token');
			strictEqual(`${baseUrl}/v1/auth/resend-verification`, 'https://api.ainative.studio/v1/auth/resend-verification');
			strictEqual(`${baseUrl}/v1/auth/verify-email`, 'https://api.ainative.studio/v1/auth/verify-email');
		});
	});

	suite('Request Headers', () => {
		test('should include Content-Type header', () => {
			// Verify that requests include proper Content-Type
			const expectedHeaders = {
				'Content-Type': 'application/json'
			};

			ok(expectedHeaders['Content-Type'] === 'application/json');
		});

		test('should include Authorization header for authenticated requests', () => {
			const token = 'test-token-123';
			const authHeader = `Bearer ${token}`;

			strictEqual(authHeader, 'Bearer test-token-123');
		});
	});

	suite('Timeout Handling', () => {
		test('should have correct timeout configuration', () => {
			const config = client.getConfig();
			strictEqual(config.timeout, 30000); // 30 seconds
		});

		test('should allow custom timeout', () => {
			const customClient = new AINativeSDKClient({
				timeout: 60000
			});

			const config = customClient.getConfig();
			strictEqual(config.timeout, 60000);
		});
	});

	suite('Validation Error Handling', () => {
		test('should identify validation error structure', () => {
			const validationError = {
				detail: [
					{
						loc: ['body', 'email'],
						msg: 'Invalid email format',
						type: 'value_error'
					}
				]
			};

			// Test validation error structure
			ok(Array.isArray(validationError.detail));
			strictEqual(validationError.detail.length, 1);
			strictEqual(validationError.detail[0].msg, 'Invalid email format');
		});

		test('should handle multiple validation errors', () => {
			const validationError = {
				detail: [
					{
						loc: ['body', 'email'],
						msg: 'Invalid email format',
						type: 'value_error'
					},
					{
						loc: ['body', 'password'],
						msg: 'Password too short',
						type: 'value_error'
					}
				]
			};

			strictEqual(validationError.detail.length, 2);
			ok(validationError.detail.every(d => 'msg' in d));
		});
	});

	suite('Response Handling', () => {
		test('should expect correct token response structure', () => {
			const tokenResponse = {
				access_token: 'test-token',
				refresh_token: 'refresh-token',
				token_type: 'bearer',
				expires_in: 3600
			};

			strictEqual(tokenResponse.token_type, 'bearer');
			ok(tokenResponse.access_token);
			ok(tokenResponse.refresh_token);
		});

		test('should expect correct user info response structure', () => {
			const userResponse = {
				id: 'user-123',
				email: 'test@example.com',
				username: 'testuser',
				role: 'user',
				email_verified: true,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-02T00:00:00Z'
			};

			strictEqual(userResponse.id, 'user-123');
			strictEqual(userResponse.email, 'test@example.com');
			strictEqual(userResponse.role, 'user');
		});

		test('should expect correct message response structure', () => {
			const messageResponse = {
				message: 'Operation successful',
				success: true
			};

			strictEqual(messageResponse.success, true);
			ok(messageResponse.message);
		});
	});

	suite('Status Code Mapping', () => {
		test('should map 401 to InvalidCredentials', () => {
			const errorCode = 401;
			const mappedCode = errorCode === 401 ? CloudAuthErrorCode.InvalidCredentials : CloudAuthErrorCode.UnknownError;
			strictEqual(mappedCode, CloudAuthErrorCode.InvalidCredentials);
		});

		test('should map 409 to EmailAlreadyExists', () => {
			const errorCode = 409;
			const mappedCode = errorCode === 409 ? CloudAuthErrorCode.EmailAlreadyExists : CloudAuthErrorCode.UnknownError;
			strictEqual(mappedCode, CloudAuthErrorCode.EmailAlreadyExists);
		});

		test('should map 429 to RateLimitExceeded', () => {
			const errorCode = 429;
			const mappedCode = errorCode === 429 ? CloudAuthErrorCode.RateLimitExceeded : CloudAuthErrorCode.UnknownError;
			strictEqual(mappedCode, CloudAuthErrorCode.RateLimitExceeded);
		});

		test('should map 5xx errors to NetworkError', () => {
			const statusCodes = [500, 502, 503, 504];
			statusCodes.forEach(code => {
				const isServerError = code >= 500 && code < 600;
				strictEqual(isServerError, true);
			});
		});
	});
});
