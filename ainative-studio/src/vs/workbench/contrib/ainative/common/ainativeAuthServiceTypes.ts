/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Narrow token-supplier port for AINative Cloud API callers.
 *
 * This is deliberately NOT the DI user-session service
 * (`IAINativeSessionAuthService` in `ainativeAuthService.ts`). It is a
 * structural interface — no `_serviceBrand` — so that callers which cannot
 * reach the workbench instantiation service (notably the electron-main LLM
 * dispatcher) can satisfy it with a plain object. Consumers only ever need a
 * bearer token, a way to refresh it, and a liveness check; they must not reach
 * into login/logout or user-profile concerns.
 */
export interface IAINativeAuthTokenProvider {
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
