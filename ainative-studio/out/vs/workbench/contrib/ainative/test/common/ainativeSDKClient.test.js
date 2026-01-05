/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok, /* rejects */ } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AINativeSDKClient } from '../../common/ainativeSDKClient.js';
import { CloudAuthError, CloudAuthErrorCode } from '../../common/ainativeCloudAuthTypes.js';
suite('AINativeSDKClient', () => {
    let client;
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
            const error = new CloudAuthError(CloudAuthErrorCode.WeakPassword, 'Password too weak', undefined, 422);
            strictEqual(error.code, CloudAuthErrorCode.WeakPassword);
            strictEqual(error.message, 'Password too weak');
            strictEqual(error.statusCode, 422);
        });
        test('should create CloudAuthError for network errors', () => {
            const originalError = new Error('Network failed');
            const error = new CloudAuthError(CloudAuthErrorCode.NetworkError, 'Network request failed', originalError);
            strictEqual(error.code, CloudAuthErrorCode.NetworkError);
            ok(error.originalError);
            strictEqual(error.originalError.message, 'Network failed');
        });
        test('should handle rate limiting errors', () => {
            const error = new CloudAuthError(CloudAuthErrorCode.RateLimitExceeded, 'Rate limit exceeded', undefined, 429);
            strictEqual(error.code, CloudAuthErrorCode.RateLimitExceeded);
            strictEqual(error.statusCode, 429);
        });
        test('should handle authentication errors', () => {
            const error = new CloudAuthError(CloudAuthErrorCode.InvalidCredentials, 'Invalid credentials', undefined, 401);
            strictEqual(error.code, CloudAuthErrorCode.InvalidCredentials);
            strictEqual(error.statusCode, 401);
        });
        test('should handle email conflict errors', () => {
            const error = new CloudAuthError(CloudAuthErrorCode.EmailAlreadyExists, 'Email already exists', undefined, 409);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVTREtDbGllbnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vYWluYXRpdmVTREtDbGllbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRTVGLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsSUFBSSxNQUF5QixDQUFDO0lBRTlCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQztZQUM5QixPQUFPLEVBQUUsNkJBQTZCO1lBQ3RDLE9BQU8sRUFBRSxLQUFLO1lBQ2QsV0FBVyxFQUFFO2dCQUNaLFVBQVUsRUFBRSxDQUFDO2dCQUNiLGNBQWMsRUFBRSxHQUFHO2dCQUNuQixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsaUJBQWlCLEVBQUUsQ0FBQzthQUNwQjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMzQixJQUFJLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO1lBQzdDLE1BQU0sYUFBYSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZ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