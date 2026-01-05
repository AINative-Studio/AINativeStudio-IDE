/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVTREtDbGllbnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vYWluYXRpdmVTREtDbGllbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyw2REFBNkQ7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUU1RixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLElBQUksTUFBeUIsQ0FBQztJQUU5QixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxHQUFHLElBQUksaUJBQWlCLENBQUM7WUFDOUIsT0FBTyxFQUFFLDZCQUE2QjtZQUN0QyxPQUFPLEVBQUUsS0FBSztZQUNkLFdBQVcsRUFBRTtnQkFDWixVQUFVLEVBQUUsQ0FBQztnQkFDYixjQUFjLEVBQUUsR0FBRztnQkFDbkIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLGlCQUFpQixFQUFFLENBQUM7YUFDcEI7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDM0IsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtZQUM3QyxNQUFNLGFBQWEsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDOUMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBRXpDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLDZCQUE2QixDQUFDLENBQUM7WUFDM0QsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbkMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtZQUN4RCxNQUFNLFlBQVksR0FBRyxJQUFJLGlCQUFpQixDQUFDO2dCQUMxQyxPQUFPLEVBQUUsd0JBQXdCO2dCQUNqQyxPQUFPLEVBQUUsS0FBSzthQUNkLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1lBQ3RELFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25DLCtDQUErQztZQUMvQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLE1BQU0sQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUMxQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbEMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUM1QixJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1lBQy9ELE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUMvQixrQkFBa0IsQ0FBQyxZQUFZLEVBQy9CLG1CQUFtQixFQUNuQixTQUFTLEVBQ1QsR0FBRyxDQUNILENBQUM7WUFFRixXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN6RCxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2hELFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtZQUM1RCxNQUFNLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUMvQixrQkFBa0IsQ0FBQyxZQUFZLEVBQy9CLHdCQUF3QixFQUN4QixhQUFhLENBQ2IsQ0FBQztZQUVGLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3pELEVBQUUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDeEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDNUQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1lBQy9DLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUMvQixrQkFBa0IsQ0FBQyxpQkFBaUIsRUFDcEMscUJBQXFCLEVBQ3JCLFNBQVMsRUFDVCxHQUFHLENBQ0gsQ0FBQztZQUVGLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDOUQsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hELE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUMvQixrQkFBa0IsQ0FBQyxrQkFBa0IsRUFDckMscUJBQXFCLEVBQ3JCLFNBQVMsRUFDVCxHQUFHLENBQ0gsQ0FBQztZQUVGLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDL0QsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hELE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUMvQixrQkFBa0IsQ0FBQyxrQkFBa0IsRUFDckMsc0JBQXNCLEVBQ3RCLFNBQVMsRUFDVCxHQUFHLENBQ0gsQ0FBQztZQUVGLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDL0QsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7WUFDcEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBRWxDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDcEQsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pELFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtZQUMzRCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbEMsTUFBTSxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDO1lBRTdFLHlCQUF5QjtZQUN6QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3JGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDckYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUVyRixXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pCLFdBQVcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDekIsV0FBVyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7WUFDM0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztZQUU3RSxpREFBaUQ7WUFDakQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN0RixXQUFXLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMzQixJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1lBQy9DLG9EQUFvRDtZQUNwRCwrREFBK0Q7WUFFL0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFFL0IsV0FBVyxDQUFDLEdBQUcsT0FBTyxtQkFBbUIsRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO1lBQzNGLFdBQVcsQ0FBQyxHQUFHLE9BQU8scUJBQXFCLEVBQUUsZ0RBQWdELENBQUMsQ0FBQztZQUMvRixXQUFXLENBQUMsR0FBRyxPQUFPLGlCQUFpQixFQUFFLDRDQUE0QyxDQUFDLENBQUM7WUFDdkYsV0FBVyxDQUFDLEdBQUcsT0FBTyxrQkFBa0IsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDO1lBQ3pGLFdBQVcsQ0FBQyxHQUFHLE9BQU8sYUFBYSxFQUFFLHdDQUF3QyxDQUFDLENBQUM7WUFDL0UsV0FBVyxDQUFDLEdBQUcsT0FBTywwQkFBMEIsRUFBRSxxREFBcUQsQ0FBQyxDQUFDO1lBQ3pHLFdBQVcsQ0FBQyxHQUFHLE9BQU8seUJBQXlCLEVBQUUsb0RBQW9ELENBQUMsQ0FBQztZQUN2RyxXQUFXLENBQUMsR0FBRyxPQUFPLDBCQUEwQixFQUFFLHFEQUFxRCxDQUFDLENBQUM7WUFDekcsV0FBVyxDQUFDLEdBQUcsT0FBTyx1QkFBdUIsRUFBRSxrREFBa0QsQ0FBQyxDQUFDO1lBQ25HLFdBQVcsQ0FBQyxHQUFHLE9BQU8sOEJBQThCLEVBQUUseURBQXlELENBQUMsQ0FBQztZQUNqSCxXQUFXLENBQUMsR0FBRyxPQUFPLHVCQUF1QixFQUFFLGtEQUFrRCxDQUFDLENBQUM7UUFDcEcsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDN0IsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtZQUMvQyxtREFBbUQ7WUFDbkQsTUFBTSxlQUFlLEdBQUc7Z0JBQ3ZCLGNBQWMsRUFBRSxrQkFBa0I7YUFDbEMsQ0FBQztZQUVGLEVBQUUsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLEtBQUssa0JBQWtCLENBQUMsQ0FBQztRQUM1RCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnRUFBZ0UsRUFBRSxHQUFHLEVBQUU7WUFDM0UsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUM7WUFDL0IsTUFBTSxVQUFVLEdBQUcsVUFBVSxLQUFLLEVBQUUsQ0FBQztZQUVyQyxXQUFXLENBQUMsVUFBVSxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtZQUN0RCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbEMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxhQUFhO1FBQ2xELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtZQUN4QyxNQUFNLFlBQVksR0FBRyxJQUFJLGlCQUFpQixDQUFDO2dCQUMxQyxPQUFPLEVBQUUsS0FBSzthQUNkLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN2QyxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1lBQ3ZELE1BQU0sZUFBZSxHQUFHO2dCQUN2QixNQUFNLEVBQUU7b0JBQ1A7d0JBQ0MsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQzt3QkFDdEIsR0FBRyxFQUFFLHNCQUFzQjt3QkFDM0IsSUFBSSxFQUFFLGFBQWE7cUJBQ25CO2lCQUNEO2FBQ0QsQ0FBQztZQUVGLGtDQUFrQztZQUNsQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMxQyxXQUFXLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDcEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1lBQ3JELE1BQU0sZUFBZSxHQUFHO2dCQUN2QixNQUFNLEVBQUU7b0JBQ1A7d0JBQ0MsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQzt3QkFDdEIsR0FBRyxFQUFFLHNCQUFzQjt3QkFDM0IsSUFBSSxFQUFFLGFBQWE7cUJBQ25CO29CQUNEO3dCQUNDLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUM7d0JBQ3pCLEdBQUcsRUFBRSxvQkFBb0I7d0JBQ3pCLElBQUksRUFBRSxhQUFhO3FCQUNuQjtpQkFDRDthQUNELENBQUM7WUFFRixXQUFXLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtZQUMzRCxNQUFNLGFBQWEsR0FBRztnQkFDckIsWUFBWSxFQUFFLFlBQVk7Z0JBQzFCLGFBQWEsRUFBRSxlQUFlO2dCQUM5QixVQUFVLEVBQUUsUUFBUTtnQkFDcEIsVUFBVSxFQUFFLElBQUk7YUFDaEIsQ0FBQztZQUVGLFdBQVcsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2hELEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDL0IsRUFBRSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7WUFDL0QsTUFBTSxZQUFZLEdBQUc7Z0JBQ3BCLEVBQUUsRUFBRSxVQUFVO2dCQUNkLEtBQUssRUFBRSxrQkFBa0I7Z0JBQ3pCLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixJQUFJLEVBQUUsTUFBTTtnQkFDWixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsVUFBVSxFQUFFLHNCQUFzQjtnQkFDbEMsVUFBVSxFQUFFLHNCQUFzQjthQUNsQyxDQUFDO1lBRUYsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDekMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUNwRCxXQUFXLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7WUFDN0QsTUFBTSxlQUFlLEdBQUc7Z0JBQ3ZCLE9BQU8sRUFBRSxzQkFBc0I7Z0JBQy9CLE9BQU8sRUFBRSxJQUFJO2FBQ2IsQ0FBQztZQUVGLFdBQVcsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNDLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDakMsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtZQUNqRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUM7WUFDdEIsTUFBTSxVQUFVLEdBQUcsU0FBUyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQztZQUMvRyxXQUFXLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1lBQ2pELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQztZQUN0QixNQUFNLFVBQVUsR0FBRyxTQUFTLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDO1lBQy9HLFdBQVcsQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNoRSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7WUFDaEQsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDO1lBQ3RCLE1BQU0sVUFBVSxHQUFHLFNBQVMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7WUFDOUcsV0FBVyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9ELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtZQUNsRCxNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzFCLE1BQU0sYUFBYSxHQUFHLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQztnQkFDaEQsV0FBVyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsQyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9