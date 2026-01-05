/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * AINative Configuration Service
 *
 * Provides centralized configuration management for AINative authentication and API integration.
 * Supports environment-specific configurations and runtime configuration overrides.
 */

export interface AINativeConfig {
	/** Base URL for AINative API endpoints */
	apiBaseUrl: string;

	/** API request timeout in milliseconds */
	apiTimeout: number;

	/** Enable/disable authentication system */
	enableAuth: boolean;

	/** Enable/disable AI model integration */
	enableAIModels: boolean;

	/** Enable/disable community marketplace */
	enableMarketplace: boolean;

	/** Current environment (development, production, test) */
	environment: 'development' | 'production' | 'test';

	/** Encryption key identifier for token storage */
	encryptionKeyId: string;

	/** Token storage provider */
	tokenStorageProvider: 'electron-safe-storage' | 'keychain' | 'memory';

	/** Session timeout in milliseconds */
	sessionTimeout: number;

	/** Session check interval in milliseconds */
	sessionCheckInterval: number;

	/** Log level */
	logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';

	/** Enable verbose authentication logging */
	enableAuthLogging: boolean;

	/** Enforce HTTPS for all API calls */
	enforceHttps: boolean;

	/** Enable certificate pinning */
	enableCertPinning: boolean;

	/** Certificate fingerprint for pinning */
	certFingerprint?: string;

	/** Allow insecure connections (development only) */
	allowInsecureConnections: boolean;

	/** Development mode flag */
	developmentMode: boolean;

	/** Maximum concurrent API requests */
	maxConcurrentRequests: number;

	/** Maximum retry attempts for failed requests */
	maxRetryAttempts: number;

	/** Retry delay in milliseconds */
	retryDelay: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AINativeConfig = {
	apiBaseUrl: 'https://api.ainative.studio',
	apiTimeout: 30000,
	enableAuth: true,
	enableAIModels: true,
	enableMarketplace: true,
	environment: 'production',
	encryptionKeyId: 'ainative-auth-tokens',
	tokenStorageProvider: 'electron-safe-storage',
	sessionTimeout: 1800000, // 30 minutes
	sessionCheckInterval: 60000, // 1 minute
	logLevel: 'info',
	enableAuthLogging: false,
	enforceHttps: true,
	enableCertPinning: false,
	allowInsecureConnections: false,
	developmentMode: false,
	maxConcurrentRequests: 5,
	maxRetryAttempts: 3,
	retryDelay: 1000
};

/**
 * Parse boolean environment variable
 */
function parseBool(value: string | undefined, defaultValue: boolean): boolean {
	if (value === undefined || value === '') {
		return defaultValue;
	}
	return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse integer environment variable
 */
function parseInt(value: string | undefined, defaultValue: number): number {
	if (value === undefined || value === '') {
		return defaultValue;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get AINative configuration from environment variables
 *
 * Configuration is loaded from environment variables with fallback to defaults.
 * Environment variables are prefixed with AINATIVE_ or are standard variables like NODE_ENV.
 *
 * @returns {AINativeConfig} Configuration object
 */
export function getAINativeConfig(): AINativeConfig {
	const nodeEnv = process.env['NODE_ENV'] || 'production';
	const environment = nodeEnv === 'development' ? 'development' :
		nodeEnv === 'test' ? 'test' : 'production';

	return {
		apiBaseUrl: process.env['AINATIVE_API_BASE_URL'] || DEFAULT_CONFIG.apiBaseUrl,
		apiTimeout: parseInt(process.env['AINATIVE_API_TIMEOUT'], DEFAULT_CONFIG.apiTimeout),
		enableAuth: parseBool(process.env['ENABLE_AINATIVE_AUTH'], DEFAULT_CONFIG.enableAuth),
		enableAIModels: parseBool(process.env['ENABLE_AI_MODELS'], DEFAULT_CONFIG.enableAIModels),
		enableMarketplace: parseBool(process.env['ENABLE_MARKETPLACE'], DEFAULT_CONFIG.enableMarketplace),
		environment,
		encryptionKeyId: process.env['ENCRYPTION_KEY_ID'] || DEFAULT_CONFIG.encryptionKeyId,
		tokenStorageProvider: (process.env['TOKEN_STORAGE_PROVIDER'] as any) || DEFAULT_CONFIG.tokenStorageProvider,
		sessionTimeout: parseInt(process.env['SESSION_TIMEOUT'], DEFAULT_CONFIG.sessionTimeout),
		sessionCheckInterval: parseInt(process.env['SESSION_CHECK_INTERVAL'], DEFAULT_CONFIG.sessionCheckInterval),
		logLevel: (process.env['LOG_LEVEL'] as any) || DEFAULT_CONFIG.logLevel,
		enableAuthLogging: parseBool(process.env['ENABLE_AUTH_LOGGING'], DEFAULT_CONFIG.enableAuthLogging),
		enforceHttps: parseBool(process.env['ENFORCE_HTTPS'], DEFAULT_CONFIG.enforceHttps),
		enableCertPinning: parseBool(process.env['ENABLE_CERT_PINNING'], DEFAULT_CONFIG.enableCertPinning),
		certFingerprint: process.env['CERT_FINGERPRINT'],
		allowInsecureConnections: parseBool(process.env['ALLOW_INSECURE_CONNECTIONS'], DEFAULT_CONFIG.allowInsecureConnections),
		developmentMode: parseBool(process.env['DEVELOPMENT_MODE'], environment === 'development'),
		maxConcurrentRequests: parseInt(process.env['MAX_CONCURRENT_REQUESTS'], DEFAULT_CONFIG.maxConcurrentRequests),
		maxRetryAttempts: parseInt(process.env['MAX_RETRY_ATTEMPTS'], DEFAULT_CONFIG.maxRetryAttempts),
		retryDelay: parseInt(process.env['RETRY_DELAY'], DEFAULT_CONFIG.retryDelay)
	};
}

/**
 * Validate configuration for security issues
 *
 * @param config Configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateConfig(config: AINativeConfig): string[] {
	const errors: string[] = [];

	// Production security checks
	if (config.environment === 'production') {
		if (config.allowInsecureConnections) {
			errors.push('Insecure connections cannot be allowed in production');
		}
		if (!config.enforceHttps) {
			errors.push('HTTPS enforcement must be enabled in production');
		}
		if (config.enableCertPinning && !config.certFingerprint) {
			errors.push('Certificate pinning is enabled but no fingerprint is configured');
		}
		if (config.developmentMode) {
			errors.push('Development mode cannot be enabled in production');
		}
		if (config.logLevel === 'trace' || config.logLevel === 'debug') {
			errors.push('Verbose logging should not be enabled in production');
		}
	}

	// General security checks
	if (!config.apiBaseUrl.startsWith('https://') && config.enforceHttps) {
		errors.push('API base URL must use HTTPS when HTTPS enforcement is enabled');
	}

	if (config.sessionTimeout < 60000) {
		errors.push('Session timeout must be at least 60 seconds');
	}

	if (config.apiTimeout < 1000) {
		errors.push('API timeout must be at least 1000ms');
	}

	// Token storage validation
	if (config.environment === 'production' && config.tokenStorageProvider === 'memory') {
		errors.push('Memory storage cannot be used for tokens in production');
	}

	return errors;
}

/**
 * Get configuration with validation
 *
 * @throws Error if configuration is invalid
 * @returns {AINativeConfig} Validated configuration
 */
export function getValidatedConfig(): AINativeConfig {
	const config = getAINativeConfig();
	const errors = validateConfig(config);

	if (errors.length > 0) {
		throw new Error(`Invalid AINative configuration:\n${errors.join('\n')}`);
	}

	return config;
}
