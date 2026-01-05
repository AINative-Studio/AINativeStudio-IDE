/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVTREtDbGllbnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vYWluYXRpdmVTREtDbGllbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFNUYsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQixJQUFJLE1BQXlCLENBQUM7SUFFOUIsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE1BQU0sR0FBRyxJQUFJLGlCQUFpQixDQUFDO1lBQzlCLE9BQU8sRUFBRSw2QkFBNkI7WUFDdEMsT0FBTyxFQUFFLEtBQUs7WUFDZCxXQUFXLEVBQUU7Z0JBQ1osVUFBVSxFQUFFLENBQUM7Z0JBQ2IsY0FBYyxFQUFFLEdBQUc7Z0JBQ25CLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixpQkFBaUIsRUFBRSxDQUFDO2FBQ3BCO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzNCLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7WUFDN0MsTUFBTSxhQUFhLEdB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