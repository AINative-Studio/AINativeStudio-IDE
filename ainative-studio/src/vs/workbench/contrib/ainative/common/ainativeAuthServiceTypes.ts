/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Authentication service interface for AINative Cloud
 * This service handles JWT token management and refresh logic
 */
export interface IAINativeAuthService {
	/**
	 * Get current valid JWT token
	 * Automatically refreshes if expired
	 * @returns JWT token or null if not authenticated
	 */
	getToken(): Promise<string | null>;

	/**
	 * Force token refresh
	 * @returns New JWT token or null if refresh fails
	 */
	refreshToken(): Promise<string | null>;

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): Promise<boolean>;
}
