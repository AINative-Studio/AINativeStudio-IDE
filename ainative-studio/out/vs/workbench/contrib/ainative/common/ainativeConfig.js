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
 * This module is shared with the renderer process, where `process` is not defined
 * (the renderer is sandboxed - see this repo's Security Architecture notes). There is
 * no way to pass OS environment variables into a sandboxed renderer directly, so in
 * that context this always falls back to DEFAULT_CONFIG; only a real Node/electron-main
 * context can meaningfully read process.env here.
 *
 * @returns {AINativeConfig} Configuration object
 */
export function getAINativeConfig() {
    if (typeof process === 'undefined' || !process.env) {
        return { ...DEFAULT_CONFIG };
    }
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