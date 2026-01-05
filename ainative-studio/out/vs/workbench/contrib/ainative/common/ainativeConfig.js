/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
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
function parseBool(value, defaultValue) {
    if (value === undefined || value === '') {
        return defaultValue;
    }
    return value.toLowerCase() === 'true' || value === '1';
}
/**
 * Parse integer environment variable
 */
function parseInt(value, defaultValue) {
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
export function getAINativeConfig() {
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
        tokenStorageProvider: process.env['TOKEN_STORAGE_PROVIDER'] || DEFAULT_CONFIG.tokenStorageProvider,
        sessionTimeout: parseInt(process.env['SESSION_TIMEOUT'], DEFAULT_CONFIG.sessionTimeout),
        sessionCheckInterval: parseInt(process.env['SESSION_CHECK_INTERVAL'], DEFAULT_CONFIG.sessionCheckInterval),
        logLevel: process.env['LOG_LEVEL'] || DEFAULT_CONFIG.logLevel,
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
export function validateConfig(config) {
    const errors = [];
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
export function getValidatedConfig() {
    const config = getAINativeConfig();
    const errors = validateConfig(config);
    if (errors.length > 0) {
        throw new Error(`Invalid AINative configuration:\n${errors.join('\n')}`);
    }
    return config;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVDb25maWcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9haW5hdGl2ZUNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXVFaEc7O0dBRUc7QUFDSCxNQUFNLGNBQWMsR0FBbUI7SUFDdEMsVUFBVSxFQUFFLDZCQUE2QjtJQUN6QyxVQUFVLEVBQUUsS0FBSztJQUNqQixVQUFVLEVBQUUsSUFBSTtJQUNoQixjQUFjLEVBQUUsSUFBSTtJQUNwQixpQkFBaUIsRUFBRSxJQUFJO0lBQ3ZCLFdBQVcsRUFBRSxZQUFZO0lBQ3pCLGVBQWUsRUFBRSxzQkFBc0I7SUFDdkMsb0JBQW9CLEVBQUUsdUJBQXVCO0lBQzdDLGNBQWMsRUFBRSxPQUFPLEVBQUUsYUFBYTtJQUN0QyxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsV0FBVztJQUN4QyxRQUFRLEVBQUUsTUFBTTtJQUNoQixpQkFBaUIsRUFBRSxLQUFLO0lBQ3hCLFlBQVksRUFBRSxJQUFJO0lBQ2xCLGlCQUFpQixFQUFFLEtBQUs7SUFDeEIsd0JBQXdCLEVBQUUsS0FBSztJQUMvQixlQUFlLEVBQUUsS0FBSztJQUN0QixxQkFBcUIsRUFBRSxDQUFDO0lBQ3hCLGdCQUFnQixFQUFFLENBQUM7SUFDbkIsVUFBVSxFQUFFLElBQUk7Q0FDaEIsQ0FBQztBQUVGOztHQUVHO0FBQ0gsU0FBUyxTQUFTLENBQUMsS0FBeUIsRUFBRSxZQUFxQjtJQUNsRSxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQ3pDLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxNQUFNLElBQUksS0FBSyxL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