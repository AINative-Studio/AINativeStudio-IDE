/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { CloudAuthError, CloudAuthErrorCode } from './ainativeCloudAuthTypes.js';
/**
 * Default configuration for API client
 */
const DEFAULT_CONFIG = {
    baseUrl: 'https://api.ainative.studio',
    timeout: 30000, // 30 seconds
    retryConfig: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2
    }
};
/**
 * SDK client wrapper for AINative API
 * Handles HTTP requests with retry logic, error handling, and rate limiting
 */
export class AINativeSDKClient {
    constructor(config) {
        this.rateLimitResetTime = 0;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Register a new user
     */
    async register(username, email, password, name) {
        return this._makeRequest('/v1/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, name })
        });
    }
    /**
     * Login with email and password
     */
    async login(email, password) {
        return this._makeRequest('/v1/auth/login-json', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }
    /**
     * Logout and blacklist token
     */
    async logout(accessToken) {
        return this._makeRequest('/v1/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
    }
    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        return this._makeRequest('/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${refreshToken}` }
        });
    }
    /**
     * Get current user info
     */
    async getCurrentUser(accessToken) {
        return this._makeRequest('/v1/auth/me', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
    }
    /**
     * Request password reset
     */
    async forgotPassword(email) {
        return this._makeRequest('/v1/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        return this._makeRequest('/v1/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, new_password: newPassword })
        });
    }
    /**
     * Change password for authenticated user
     */
    async changePassword(accessToken, currentPassword, newPassword) {
        return this._makeRequest('/v1/auth/change-password', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
    }
    /**
     * Verify JWT token
     */
    async verifyToken(token) {
        return this._makeRequest('/v1/auth/verify-token', {
            method: 'POST',
            body: JSON.stringify({ token })
        });
    }
    /**
     * Resend email verification
     */
    async resendEmailVerification(email) {
        return this._makeRequest('/v1/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
    /**
     * Verify email with token
     */
    async verifyEmail(token) {
        return this._makeRequest('/v1/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ token })
        });
    }
    /**
     * Make HTTP request with retry logic and error handling
     */
    async _makeRequest(endpoint, options, retryCount = 0) {
        // Check rate limiting
        if (this.rateLimitResetTime > Date.now()) {
            const waitTime = this.rateLimitResetTime - Date.now();
            throw new CloudAuthError(CloudAuthErrorCode.RateLimitExceeded, `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`, undefined, 429);
        }
        const url = `${this.config.baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                this.rateLimitResetTime = Date.now() + (retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000);
                throw new CloudAuthError(CloudAuthErrorCode.RateLimitExceeded, 'Rate limit exceeded', undefined, 429);
            }
            // Handle successful responses
            if (response.ok) {
                const data = await response.json();
                return { data };
            }
            // Handle error responses
            await this._handleErrorResponse(response, retryCount, endpoint, options);
            // This line should never be reached due to _handleErrorResponse throwing
            throw new CloudAuthError(CloudAuthErrorCode.UnknownError, 'Unexpected error');
        }
        catch (error) {
            clearTimeout(timeoutId);
            // Re-throw CloudAuthError
            if (error instanceof CloudAuthError) {
                throw error;
            }
            // Handle timeout
            if (error instanceof Error && error.name === 'AbortError') {
                if (this._shouldRetry(retryCount)) {
                    return this._retryRequest(endpoint, options, retryCount);
                }
                throw new CloudAuthError(CloudAuthErrorCode.NetworkError, 'Request timeout', error);
            }
            // Handle network errors
            if (this._shouldRetry(retryCount)) {
                return this._retryRequest(endpoint, options, retryCount);
            }
            throw new CloudAuthError(CloudAuthErrorCode.NetworkError, 'Network request failed', error);
        }
    }
    /**
     * Handle error responses from API
     */
    async _handleErrorResponse(response, retryCount, endpoint, options) {
        const statusCode = response.status;
        let errorMessage = `HTTP ${statusCode}: ${response.statusText}`;
        let errorCode = CloudAuthErrorCode.UnknownError;
        try {
            const errorData = await response.json();
            // Handle validation errors
            if (statusCode === 422 && this._isValidationError(errorData)) {
                const validationError = errorData;
                const messages = validationError.detail.map(d => d.msg).join(', ');
                errorMessage = `Validation error: ${messages}`;
                errorCode = CloudAuthErrorCode.UnknownError;
            }
            // Handle generic message responses
            else if ('message' in errorData) {
                errorMessage = errorData.message;
            }
            // Handle detail field
            else if ('detail' in errorData && typeof errorData.detail === 'string') {
                errorMessage = errorData.detail;
            }
            // Map status codes to error codes
            switch (statusCode) {
                case 401:
                    errorCode = CloudAuthErrorCode.InvalidCredentials;
                    break;
                case 409:
                    errorCode = CloudAuthErrorCode.EmailAlreadyExists;
                    errorMessage = 'Email already exists';
                    break;
                case 429:
                    errorCode = CloudAuthErrorCode.RateLimitExceeded;
                    break;
                case 500:
                case 502:
                case 503:
                case 504:
                    // Retry server errors
                    if (this._shouldRetry(retryCount)) {
                        return this._retryRequest(endpoint, options, retryCount);
                    }
                    errorCode = CloudAuthErrorCode.NetworkError;
                    break;
            }
        }
        catch {
            // Could not parse error response, use default message
        }
        throw new CloudAuthError(errorCode, errorMessage, undefined, statusCode);
    }
    /**
     * Check if error response is a validation error
     */
    _isValidationError(data) {
        return data && Array.isArray(data.detail) && data.detail.length > 0 && 'msg' in data.detail[0];
    }
    /**
     * Check if request should be retried
     */
    _shouldRetry(retryCount) {
        return retryCount < this.config.retryConfig.maxRetries;
    }
    /**
     * Retry request with exponential backoff
     */
    async _retryRequest(endpoint, options, retryCount) {
        const delay = Math.min(this.config.retryConfig.initialDelayMs * Math.pow(this.config.retryConfig.backoffMultiplier, retryCount), this.config.retryConfig.maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._makeRequest(endpoint, options, retryCount + 1);
    }
    /**
     * Update base URL (useful for testing)
     */
    setBaseUrl(baseUrl) {
        this.config.baseUrl = baseUrl;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVTREtDbGllbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9haW5hdGl2ZVNES0NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixFQU1sQixNQUFNLDZCQUE2QixDQUFDO0FBV3JDOztHQUVHO0FBQ0gsTUFBTSxjQUFjLEdBQXNCO0lBQ3pDLE9BQU8sRUFBRSw2QkFBNkI7SUFDdEMsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhO0lBQzdCLFdBQVcsRUFBRTtRQUNaLFVBQVUsRUFBRSxDQUFDO1FBQ2IsY0FBYyxFQUFFLElBQUk7UUFDcEIsVUFBVSxFQUFFLEtBQUs7UUFDakIsaUJBQWlCLEVBQUUsQ0FBQztLQUNwQjtDQUNELENBQUM7QUFFRjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBSTdCLFlBQVksTUFBbUM7UUFGdkMsdUJBQWtCLEdBQVcsQ0FBQyxDQUFDO1FBR3RDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO0lBQ2hELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBZ0IsRUFBRSxLQUFhLEVBQUUsUUFBZ0IsRUFBRSxJQUFhO1FBQzlFLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBNkMsbUJBQW1CLEVBQUU7WUFDekYsTUFBTSxFQUFFLE1BQU07WUFDZCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDO1NBQ3pELENBQUMsQ0FBQztJQUNKLENBQUM7SUFF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