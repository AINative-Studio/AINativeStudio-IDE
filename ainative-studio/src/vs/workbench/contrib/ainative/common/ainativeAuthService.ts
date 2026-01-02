/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';

/**
 * Service identifier for the AINative authentication service
 */
export const IAINativeAuthService = createDecorator<IAINativeAuthService>('ainativeAuthService');

/**
 * Result returned from authentication operations
 */
export interface AuthResult {
	/**
	 * Whether the authentication operation was successful
	 */
	success: boolean;

	/**
	 * The authenticated user, if successful
	 */
	user?: User;

	/**
	 * JWT access token for API requests
	 */
	token?: string;

	/**
	 * Refresh token for obtaining new access tokens
	 */
	refreshToken?: string;

	/**
	 * Error message if authentication failed
	 */
	error?: string;
}

/**
 * Represents an authenticated user
 */
export interface User {
	/**
	 * Unique user identifier
	 */
	id: string;

	/**
	 * User's email address
	 */
	email: string;

	/**
	 * User's display name
	 */
	name: string;

	/**
	 * Optional avatar URL
	 */
	avatar?: string;
}

/**
 * Current authentication state
 */
export interface AuthState {
	/**
	 * Whether a user is currently authenticated
	 */
	isAuthenticated: boolean;

	/**
	 * The currently authenticated user, or null if not authenticated
	 */
	user: User | null;
}

/**
 * Custom error class for authentication failures
 */
export class AuthenticationError extends Error {
	/**
	 * Error code for categorizing authentication failures
	 */
	public readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = 'AuthenticationError';
		this.code = code;
	}
}

/**
 * Error codes for authentication failures
 */
export enum AuthErrorCode {
	INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
	NETWORK_ERROR = 'NETWORK_ERROR',
	TOKEN_EXPIRED = 'TOKEN_EXPIRED',
	UNAUTHORIZED = 'UNAUTHORIZED',
	SERVER_ERROR = 'SERVER_ERROR',
	INVALID_TOKEN = 'INVALID_TOKEN',
	REFRESH_FAILED = 'REFRESH_FAILED'
}

/**
 * Service for managing AINative Studio authentication
 *
 * API Endpoints:
 * - POST https://api.ainative.studio/v1/auth/login-json - Email/password authentication
 * - POST https://api.ainative.studio/v1/auth/logout - Invalidate current session
 * - POST https://api.ainative.studio/v1/auth/refresh - Refresh access token
 * - GET https://api.ainative.studio/v1/auth/me - Get current user profile
 *
 * Dependencies:
 * - IEncryptionService: Secure token storage and encryption
 * - IStorageService: Persist user data and auth state
 * - Emitter: Event notifications for auth state changes
 */
export interface IAINativeAuthService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when authentication state changes
	 * Listeners receive the new AuthState
	 */
	readonly onDidChangeAuthState: Event<AuthState>;

	/**
	 * Authenticate a user with email and password
	 *
	 * @param email User's email address
	 * @param password User's password
	 * @returns Promise resolving to authentication result
	 * @throws AuthenticationError if authentication fails
	 */
	login(email: string, password: string): Promise<AuthResult>;

	/**
	 * Log out the current user
	 * Clears all stored tokens and user data
	 *
	 * @returns Promise that resolves when logout is complete
	 */
	logout(): Promise<void>;

	/**
	 * Refresh the current access token using the refresh token
	 * Automatically called when access token expires
	 *
	 * @returns Promise that resolves when token is refreshed
	 * @throws AuthenticationError if refresh fails
	 */
	refreshToken(): Promise<void>;

	/**
	 * Get the currently authenticated user
	 * Returns cached user if available, otherwise fetches from API
	 *
	 * @returns Promise resolving to the current user or null if not authenticated
	 */
	getCurrentUser(): Promise<User | null>;

	/**
	 * Check if a user is currently authenticated
	 *
	 * @returns true if user is authenticated with valid token
	 */
	isAuthenticated(): boolean;

	/**
	 * Get the current access token for API requests
	 *
	 * @returns The JWT access token or null if not authenticated
	 */
	getAuthToken(): string | null;
}
