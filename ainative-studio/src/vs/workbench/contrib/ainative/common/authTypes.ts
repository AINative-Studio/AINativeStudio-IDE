/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Token storage types and interfaces
 */

/**
 * Storage target for tokens
 */
export enum TokenStorageTarget {
	/**
	 * Store in memory only (lost on restart)
	 */
	Memory = 'memory',

	/**
	 * Store in persistent storage (survives restart)
	 */
	Persistent = 'persistent',

	/**
	 * Store in secure system keychain (most secure)
	 */
	Keychain = 'keychain'
}

/**
 * Token metadata
 */
export interface TokenMetadata {
	/**
	 * Token creation timestamp
	 */
	readonly createdAt: number;

	/**
	 * Token expiration timestamp
	 */
	readonly expiresAt: number;

	/**
	 * Token issuer
	 */
	readonly issuer?: string;

	/**
	 * Token audience
	 */
	readonly audience?: string;

	/**
	 * Custom metadata
	 */
	readonly custom?: Record<string, any>;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
	/**
	 * Whether token is valid
	 */
	readonly valid: boolean;

	/**
	 * Validation error message
	 */
	readonly error?: string;

	/**
	 * Token metadata
	 */
	readonly metadata?: TokenMetadata;
}

/**
 * Session information
 */
export interface SessionInfo {
	/**
	 * Session ID
	 */
	readonly id: string;

	/**
	 * User ID
	 */
	readonly userId: string;

	/**
	 * Session creation time
	 */
	readonly createdAt: number;

	/**
	 * Last activity time
	 */
	readonly lastActivityAt: number;

	/**
	 * Session expiration time
	 */
	readonly expiresAt: number;

	/**
	 * Whether session should persist across restarts
	 */
	readonly persistent: boolean;

	/**
	 * Session metadata
	 */
	readonly metadata?: Record<string, any>;
}

/**
 * Authentication provider types
 */
export enum AuthProvider {
	/**
	 * Email/password authentication
	 */
	EmailPassword = 'email_password',

	/**
	 * GitHub OAuth
	 */
	GitHub = 'github',

	/**
	 * Google OAuth
	 */
	Google = 'google',

	/**
	 * Microsoft OAuth
	 */
	Microsoft = 'microsoft',

	/**
	 * API key authentication
	 */
	APIKey = 'api_key'
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
	/**
	 * Authentication provider
	 */
	readonly provider: AuthProvider;

	/**
	 * Email (for email/password)
	 */
	readonly email?: string;

	/**
	 * Password (for email/password)
	 */
	readonly password?: string;

	/**
	 * OAuth code (for OAuth providers)
	 */
	readonly code?: string;

	/**
	 * OAuth state (for OAuth providers)
	 */
	readonly state?: string;

	/**
	 * API key (for API key auth)
	 */
	readonly apiKey?: string;

	/**
	 * Remember me flag
	 */
	readonly rememberMe?: boolean;
}

/**
 * Token pair (access + refresh)
 */
export interface TokenPair {
	/**
	 * Access token (short-lived)
	 */
	readonly accessToken: string;

	/**
	 * Refresh token (long-lived)
	 */
	readonly refreshToken: string;

	/**
	 * Token type (usually "Bearer")
	 */
	readonly tokenType?: string;

	/**
	 * Expires in (seconds)
	 */
	readonly expiresIn?: number;
}

/**
 * Authentication event types
 */
export enum AuthEventType {
	/**
	 * User logged in
	 */
	Login = 'login',

	/**
	 * User logged out
	 */
	Logout = 'logout',

	/**
	 * Token refreshed
	 */
	TokenRefresh = 'token_refresh',

	/**
	 * Session expired
	 */
	SessionExpired = 'session_expired',

	/**
	 * Authentication error
	 */
	AuthError = 'auth_error'
}

/**
 * Authentication event
 */
export interface AuthEvent {
	/**
	 * Event type
	 */
	readonly type: AuthEventType;

	/**
	 * Event timestamp
	 */
	readonly timestamp: number;

	/**
	 * User ID (if applicable)
	 */
	readonly userId?: string;

	/**
	 * Event metadata
	 */
	readonly metadata?: Record<string, any>;

	/**
	 * Error (if applicable)
	 */
	readonly error?: Error;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
	/**
	 * Enable CSRF protection
	 */
	readonly enableCSRF?: boolean;

	/**
	 * Enable XSS protection
	 */
	readonly enableXSS?: boolean;

	/**
	 * Token encryption enabled
	 */
	readonly encryptTokens?: boolean;

	/**
	 * Require HTTPS
	 */
	readonly requireHTTPS?: boolean;

	/**
	 * Max login attempts before lockout
	 */
	readonly maxLoginAttempts?: number;

	/**
	 * Lockout duration (milliseconds)
	 */
	readonly lockoutDuration?: number;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	/**
	 * Max requests per window
	 */
	readonly maxRequests: number;

	/**
	 * Time window (milliseconds)
	 */
	readonly windowMs: number;

	/**
	 * Skip successful requests
	 */
	readonly skipSuccessfulRequests?: boolean;

	/**
	 * Skip failed requests
	 */
	readonly skipFailedRequests?: boolean;
}

/**
 * Token refresh strategy
 */
export enum RefreshStrategy {
	/**
	 * Refresh on demand (when token expires)
	 */
	OnDemand = 'on_demand',

	/**
	 * Refresh proactively (before token expires)
	 */
	Proactive = 'proactive',

	/**
	 * Refresh on activity (when user is active)
	 */
	OnActivity = 'on_activity'
}

/**
 * Token refresh configuration
 */
export interface RefreshConfig {
	/**
	 * Refresh strategy
	 */
	readonly strategy: RefreshStrategy;

	/**
	 * Buffer time before expiration (milliseconds)
	 */
	readonly bufferMs?: number;

	/**
	 * Max retry attempts
	 */
	readonly maxRetries?: number;

	/**
	 * Retry delay (milliseconds)
	 */
	readonly retryDelayMs?: number;
}

/**
 * Authentication metrics
 */
export interface AuthMetrics {
	/**
	 * Total login attempts
	 */
	readonly loginAttempts: number;

	/**
	 * Successful logins
	 */
	readonly successfulLogins: number;

	/**
	 * Failed logins
	 */
	readonly failedLogins: number;

	/**
	 * Token refreshes
	 */
	readonly tokenRefreshes: number;

	/**
	 * Session expirations
	 */
	readonly sessionExpirations: number;

	/**
	 * Average session duration (milliseconds)
	 */
	readonly avgSessionDuration: number;
}

/**
 * Cookie configuration for token storage
 */
export interface CookieConfig {
	/**
	 * Cookie name
	 */
	readonly name: string;

	/**
	 * HttpOnly flag
	 */
	readonly httpOnly: boolean;

	/**
	 * Secure flag (HTTPS only)
	 */
	readonly secure: boolean;

	/**
	 * SameSite policy
	 */
	readonly sameSite: 'strict' | 'lax' | 'none';

	/**
	 * Cookie domain
	 */
	readonly domain?: string;

	/**
	 * Cookie path
	 */
	readonly path?: string;

	/**
	 * Max age (seconds)
	 */
	readonly maxAge?: number;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
	/**
	 * Client ID
	 */
	readonly clientId: string;

	/**
	 * Client secret (server-side only)
	 */
	readonly clientSecret?: string;

	/**
	 * Authorization URL
	 */
	readonly authorizationUrl: string;

	/**
	 * Token URL
	 */
	readonly tokenUrl: string;

	/**
	 * Redirect URI
	 */
	readonly redirectUri: string;

	/**
	 * Scopes
	 */
	readonly scopes: string[];

	/**
	 * State parameter
	 */
	readonly state?: string;
}
