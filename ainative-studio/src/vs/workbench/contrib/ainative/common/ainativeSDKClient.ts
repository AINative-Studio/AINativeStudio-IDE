/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import {
	CloudAuthError,
	CloudAuthErrorCode,
	RetryConfig,
	TokenResponse,
	UserInfoResponse,
	MessageResponse,
	ValidationError
} from './ainativeCloudAuthTypes.js';

/**
 * Configuration for the AINative API client
 */
export interface AINativeAPIConfig {
	readonly baseUrl: string;
	readonly timeout: number;
	readonly retryConfig: RetryConfig;
}

/**
 * Default configuration for API client
 */
const DEFAULT_CONFIG: AINativeAPIConfig = {
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
	private readonly config: AINativeAPIConfig;
	private rateLimitResetTime: number = 0;

	constructor(config?: Partial<AINativeAPIConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Register a new user
	 *
	 * Endpoint confirmed live (422 on empty body) in docs/api/BACKEND_CONTRACT_NOTES.md (#143).
	 */
	async register(username: string, email: string, password: string, name?: string): Promise<{ data: TokenResponse & { user: UserInfoResponse } }> {
		return this._makeRequest<TokenResponse & { user: UserInfoResponse }>('/api/v1/auth/register', {
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
	async login(email: string, password: string): Promise<{ data: TokenResponse & { user: UserInfoResponse } }> {
		return this._makeRequest<TokenResponse & { user: UserInfoResponse }>('/api/v1/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password })
		});
	}

	/**
	 * Logout and blacklist token
	 */
	async logout(accessToken: string): Promise<{ data: MessageResponse }> {
		return this._makeRequest<MessageResponse>('/api/v1/auth/logout', {
			method: 'POST',
			headers: { 'Authorization': `Bearer ${accessToken}` }
		});
	}

	/**
	 * Refresh access token
	 */
	async refreshToken(refreshToken: string): Promise<{ data: TokenResponse }> {
		return this._makeRequest<TokenResponse>('/api/v1/auth/refresh', {
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
	async getCurrentUser(accessToken: string): Promise<{ data: UserInfoResponse }> {
		return this._makeRequest<UserInfoResponse>('/api/v1/users/me', {
			method: 'GET',
			headers: { 'Authorization': `Bearer ${accessToken}` }
		});
	}

	/**
	 * Request password reset
	 */
	async forgotPassword(email: string): Promise<{ data: MessageResponse }> {
		return this._makeRequest<MessageResponse>('/api/v1/auth/forgot-password', {
			method: 'POST',
			body: JSON.stringify({ email })
		});
	}

	/**
	 * Reset password with token
	 */
	async resetPassword(token: string, newPassword: string): Promise<{ data: MessageResponse }> {
		return this._makeRequest<MessageResponse>('/api/v1/auth/reset-password', {
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
	async changePassword(accessToken: string, currentPassword: string, newPassword: string): Promise<{ data: MessageResponse }> {
		return this._makeRequest<MessageResponse>('/api/v1/auth/change-password', {
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
	async verifyToken(token: string): Promise<{ data: { valid: boolean; user?: UserInfoResponse; exp?: number } }> {
		return this._makeRequest<{ valid: boolean; user?: UserInfoResponse; exp?: number }>('/api/v1/auth/verify-token', {
			method: 'POST',
			body: JSON.stringify({ token })
		});
	}

	/**
	 * Resend email verification
	 *
	 * NOTE: unverified sub-path, see changePassword() comment above.
	 */
	async resendEmailVerification(email: string): Promise<{ data: MessageResponse }> {
		return this._makeRequest<MessageResponse>('/api/v1/auth/resend-verification', {
			method: 'POST',
			body: JSON.stringify({ email })
		});
	}

	/**
	 * Verify email with token
	 *
	 * NOTE: unverified sub-path, see changePassword() comment above.
	 */
	async verifyEmail(token: string): Promise<{ data: MessageResponse }> {
		return this._makeRequest<MessageResponse>('/api/v1/auth/verify-email', {
			method: 'POST',
			body: JSON.stringify({ token })
		});
	}

	/**
	 * Make HTTP request with retry logic and error handling
	 */
	private async _makeRequest<T>(
		endpoint: string,
		options: RequestInit,
		retryCount: number = 0
	): Promise<{ data: T }> {
		// Check rate limiting
		if (this.rateLimitResetTime > Date.now()) {
			const waitTime = this.rateLimitResetTime - Date.now();
			throw new CloudAuthError(
				CloudAuthErrorCode.RateLimitExceeded,
				`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
				undefined,
				429
			);
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
				throw new CloudAuthError(
					CloudAuthErrorCode.RateLimitExceeded,
					'Rate limit exceeded',
					undefined,
					429
				);
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

		} catch (error) {
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
				throw new CloudAuthError(
					CloudAuthErrorCode.NetworkError,
					'Request timeout',
					error as Error
				);
			}

			// Handle network errors
			if (this._shouldRetry(retryCount)) {
				return this._retryRequest(endpoint, options, retryCount);
			}

			throw new CloudAuthError(
				CloudAuthErrorCode.NetworkError,
				'Network request failed',
				error as Error
			);
		}
	}

	/**
	 * Handle error responses from API
	 */
	private async _handleErrorResponse(
		response: Response,
		retryCount: number,
		endpoint: string,
		options: RequestInit
	): Promise<never> {
		const statusCode = response.status;
		let errorMessage = `HTTP ${statusCode}: ${response.statusText}`;
		let errorCode = CloudAuthErrorCode.UnknownError;

		try {
			const errorData = await response.json();

			// Handle validation errors
			if (statusCode === 422 && this._isValidationError(errorData)) {
				const validationError = errorData as ValidationError;
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
						return this._retryRequest(endpoint, options, retryCount) as never;
					}
					errorCode = CloudAuthErrorCode.NetworkError;
					break;
			}
		} catch {
			// Could not parse error response, use default message
		}

		throw new CloudAuthError(errorCode, errorMessage, undefined, statusCode);
	}

	/**
	 * Check if error response is a validation error
	 */
	private _isValidationError(data: any): data is ValidationError {
		return data && Array.isArray(data.detail) && data.detail.length > 0 && 'msg' in data.detail[0];
	}

	/**
	 * Check if request should be retried
	 */
	private _shouldRetry(retryCount: number): boolean {
		return retryCount < this.config.retryConfig.maxRetries;
	}

	/**
	 * Retry request with exponential backoff
	 */
	private async _retryRequest<T>(
		endpoint: string,
		options: RequestInit,
		retryCount: number
	): Promise<{ data: T }> {
		const delay = Math.min(
			this.config.retryConfig.initialDelayMs * Math.pow(this.config.retryConfig.backoffMultiplier, retryCount),
			this.config.retryConfig.maxDelayMs
		);

		await new Promise(resolve => setTimeout(resolve, delay));
		return this._makeRequest<T>(endpoint, options, retryCount + 1);
	}

	/**
	 * Update base URL (useful for testing)
	 */
	setBaseUrl(baseUrl: string): void {
		(this.config as any).baseUrl = baseUrl;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): AINativeAPIConfig {
		return { ...this.config };
	}
}
