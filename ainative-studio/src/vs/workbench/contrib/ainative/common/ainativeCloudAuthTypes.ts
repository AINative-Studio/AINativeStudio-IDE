/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IAINativeCloudAuthService = createDecorator<IAINativeCloudAuthService>('ainativeCloudAuthService');

/**
 * Authentication state for cloud service
 */
export enum CloudAuthState {
	Authenticated = 'authenticated',
	Unauthenticated = 'unauthenticated',
	Refreshing = 'refreshing',
	Registering = 'registering',
	LoggingOut = 'loggingOut',
	ResettingPassword = 'resettingPassword'
}

/**
 * Error codes for cloud authentication errors
 */
export enum CloudAuthErrorCode {
	InvalidCredentials = 'INVALID_CREDENTIALS',
	NetworkError = 'NETWORK_ERROR',
	TokenExpired = 'TOKEN_EXPIRED',
	TokenRefreshFailed = 'TOKEN_REFRESH_FAILED',
	LogoutFailed = 'LOGOUT_FAILED',
	RegistrationFailed = 'REGISTRATION_FAILED',
	PasswordResetFailed = 'PASSWORD_RESET_FAILED',
	EmailAlreadyExists = 'EMAIL_ALREADY_EXISTS',
	WeakPassword = 'WEAK_PASSWORD',
	RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
	UnknownError = 'UNKNOWN_ERROR'
}

/**
 * Custom error class for cloud authentication errors
 */
export class CloudAuthError extends Error {
	constructor(
		public readonly code: CloudAuthErrorCode,
		message: string,
		public readonly originalError?: Error,
		public readonly statusCode?: number
	) {
		super(message);
		this.name = 'CloudAuthError';
	}
}

/**
 * User profile data from cloud API
 */
export interface CloudUser {
	readonly id: string;
	readonly email: string;
	readonly username?: string;
	readonly name?: string;
	readonly role: string;
	readonly emailVerified?: boolean;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly metadata?: Record<string, any>;
}

/**
 * Registration request data
 */
export interface RegistrationRequest {
	readonly username: string;
	readonly email: string;
	readonly password: string;
	readonly name?: string;
}

/**
 * Registration result
 */
export interface RegistrationResult {
	readonly success: boolean;
	readonly accessToken?: string;
	readonly refreshToken?: string;
	readonly user?: CloudUser;
	readonly error?: CloudAuthError;
	readonly requiresEmailVerification?: boolean;
}

/**
 * Authentication result from login
 */
export interface CloudAuthResult {
	readonly success: boolean;
	readonly accessToken?: string;
	readonly refreshToken?: string;
	readonly user?: CloudUser;
	readonly error?: CloudAuthError;
}

/**
 * Password reset request result
 */
export interface PasswordResetResult {
	readonly success: boolean;
	readonly error?: CloudAuthError;
	readonly message?: string;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
	readonly valid: boolean;
	readonly userId?: string;
	readonly email?: string;
	readonly role?: string;
	readonly expiresAt?: number;
	readonly error?: string;
}

/**
 * JWT token claims
 */
export interface JWTClaims {
	readonly sub: string;
	readonly email: string;
	readonly role: string;
	readonly exp: number;
	readonly iat: number;
	readonly username?: string;
	readonly name?: string;
}

/**
 * API response for token operations
 */
export interface TokenResponse {
	readonly access_token: string;
	readonly refresh_token?: string;
	readonly token_type: string;
	readonly expires_in?: number;
}

/**
 * API response for user info
 */
export interface UserInfoResponse {
	readonly id: string;
	readonly email: string;
	readonly username?: string;
	readonly name?: string;
	readonly role: string;
	readonly email_verified?: boolean;
	readonly created_at?: string;
	readonly updated_at?: string;
}

/**
 * API response for generic messages
 */
export interface MessageResponse {
	readonly message: string;
	readonly success?: boolean;
}

/**
 * API validation error response
 */
export interface ValidationError {
	readonly detail: Array<{
		readonly loc: string[];
		readonly msg: string;
		readonly type: string;
	}>;
}

/**
 * Retry configuration for network requests
 */
export interface RetryConfig {
	readonly maxRetries: number;
	readonly initialDelayMs: number;
	readonly maxDelayMs: number;
	readonly backoffMultiplier: number;
}

/**
 * Main cloud authentication service interface
 */
export interface IAINativeCloudAuthService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when authentication state changes
	 */
	readonly onDidChangeAuthState: Event<CloudAuthState>;

	/**
	 * Event fired when user data is updated
	 */
	readonly onDidUpdateUser: Event<CloudUser>;

	/**
	 * Register a new user account
	 * @param request Registration data (username, email, password)
	 * @returns Registration result with token and user data
	 */
	register(request: RegistrationRequest): Promise<RegistrationResult>;

	/**
	 * Login with email and password
	 * @param email User email
	 * @param password User password
	 * @returns Authentication result with token and user data
	 */
	login(email: string, password: string): Promise<CloudAuthResult>;

	/**
	 * Logout current user and blacklist token
	 */
	logout(): Promise<void>;

	/**
	 * Request password reset email
	 * @param email User email
	 * @returns Result indicating if email was sent
	 */
	requestPasswordReset(email: string): Promise<PasswordResetResult>;

	/**
	 * Confirm password reset with token
	 * @param token Reset token from email
	 * @param newPassword New password (min 8 characters)
	 * @returns Result indicating if password was reset
	 */
	confirmPasswordReset(token: string, newPassword: string): Promise<PasswordResetResult>;

	/**
	 * Change password for authenticated user
	 * @param currentPassword Current password
	 * @param newPassword New password (min 8 characters)
	 * @returns Result indicating if password was changed
	 */
	changePassword(currentPassword: string, newPassword: string): Promise<PasswordResetResult>;

	/**
	 * Refresh expired access token
	 * @returns New access token
	 */
	refreshToken(): Promise<string>;

	/**
	 * Validate a JWT token
	 * @param token JWT token to validate
	 * @returns Validation result with token claims
	 */
	validateToken(token: string): Promise<TokenValidationResult>;

	/**
	 * Get current access token (refreshes if expired)
	 * @returns Access token or null if not authenticated
	 */
	getAccessToken(): Promise<string | null>;

	/**
	 * Get current access token (without auto-refresh)
	 * @returns Access token or null if not authenticated
	 */
	getAccessTokenSync(): string | null;

	/**
	 * Get current user profile
	 * @returns User data or null if not authenticated
	 */
	getCurrentUser(): Promise<CloudUser | null>;

	/**
	 * Get cached user profile (synchronous)
	 * @returns User data or null if not authenticated
	 */
	getUser(): CloudUser | null;

	/**
	 * Check if user is authenticated
	 * @returns true if user has valid token
	 */
	isAuthenticated(): boolean;

	/**
	 * Get current authentication state
	 * @returns Current auth state
	 */
	getAuthState(): CloudAuthState;

	/**
	 * Request email verification resend
	 * @param email User email
	 * @returns Result indicating if email was sent
	 */
	resendEmailVerification(email: string): Promise<PasswordResetResult>;

	/**
	 * Verify email with token
	 * @param token Verification token from email
	 * @returns Result indicating if email was verified
	 */
	verifyEmail(token: string): Promise<PasswordResetResult>;
}
