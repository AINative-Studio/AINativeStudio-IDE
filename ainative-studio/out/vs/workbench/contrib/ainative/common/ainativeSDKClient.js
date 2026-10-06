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
     *
     * Endpoint confirmed live (422 on empty body) in docs/api/BACKEND_CONTRACT_NOTES.md (#143).
     */
    async register(username, email, password, name) {
        return this._makeRequest('/api/v1/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, name })
        });
    }
    /**
     * Login with email and password
     *
     * Endpoint confirmed live (422 on empty body) in docs/api/BACKEND_CONTRACT_NOTES.md (#143).
     * The previous '/v1/auth/login-json' path does not match the confirmed contract and has
     * been corrected to the documented '/api/v1/auth/login'.
     */
    async login(email, password) {
        return this._makeRequest('/api/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }
    /**
     * Logout and blacklist token
     */
    async logout(accessToken) {
        return this._makeRequest('/api/v1/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
    }
    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        return this._makeRequest('/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${refreshToken}` }
        });
    }
    /**
     * Get current user info
     *
     * Endpoint confirmed live (401) in docs/api/BACKEND_CONTRACT_NOTES.md (#143) as
     * '/api/v1/users/me' -- note this is '/users/me', not '/auth/me'.
     */
    async getCurrentUser(accessToken) {
        return this._makeRequest('/api/v1/users/me', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
    }
    /**
     * Request password reset
     */
    async forgotPassword(email) {
        return this._makeRequest('/api/v1/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        return this._makeRequest('/api/v1/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, new_password: newPassword })
        });
    }
    /**
     * Change password for authenticated user
     *
     * NOTE: this sub-path is not in the set of endpoints independently verified by #143's
     * live probing (docs/api/BACKEND_CONTRACT_NOTES.md section 3 only confirms login,
     * register, refresh, logout, users/me, forgot-password, and reset-password). Updated to
     * the '/api/v1/...' prefix for consistency with the confirmed auth routes, but treat the
     * exact path as unverified until confirmed against the backend.
     */
    async changePassword(accessToken, currentPassword, newPassword) {
        return this._makeRequest('/api/v1/auth/change-password', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
    }
    /**
     * Verify JWT token
     *
     * NOTE: unverified sub-path, see changePassword() comment above.
     */
    async verifyToken(token) {
        return this._makeRequest('/api/v1/auth/verify-token', {
            method: 'POST',
            body: JSON.stringify({ token })
        });
    }
    /**
     * Resend email verification
     *
     * NOTE: unverified sub-path, see changePassword() comment above.
     */
    async resendEmailVerification(email) {
        return this._makeRequest('/api/v1/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
    /**
     * Verify email with token
     *
     * NOTE: unverified sub-path, see changePassword() comment above.
     */
    async verifyEmail(token) {
        return this._makeRequest('/api/v1/auth/verify-email', {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVTREtDbGllbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9haW5hdGl2ZVNES0NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixFQU1sQixNQUFNLDZCQUE2QixDQUFDO0FBV3JDOztHQUVHO0FBQ0gsTUFBTSxjQUFjLEdBQXNCO0lBQ3pDLE9BQU8sRUFBRSw2QkFBNkI7SUFDdEMsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhO0lBQzdCLFdBQVcsRUFBRTtRQUNaLFVBQVUsRUFBRSxDQUFDO1FBQ2IsY0FBYyxFQUFFLElBQUk7UUFDcEIsVUFBVSxFQUFFLEtBQUs7UUFDakIsaUJBQWlCLEVBQUUsQ0FBQztLQUNwQjtDQUNELENBQUM7QUFFRjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBSTdCLFlBQVksTUFBbUM7UUFGdkMsdUJBQWtCLEdBQVcsQ0FBQyxDQUFDO1FBR3RDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO0lBQ2hELENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFnQixFQUFFLEtBQWEsRUFBRSxRQUFnQixFQUFFLElBQWE7UUFDOUUsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUE2Qyx1QkFBdUIsRUFBRTtZQUM3RixNQUFNLEVBQUUsTUFBTTtZQUNkLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7U0FDekQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJ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