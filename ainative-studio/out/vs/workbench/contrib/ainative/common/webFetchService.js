/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Service identifier for dependency injection
 */
export const IWebFetchService = createDecorator('webFetchService');
/**
 * Error codes for web fetch operations
 */
export var WebFetchErrorCode;
(function (WebFetchErrorCode) {
    WebFetchErrorCode["DomainNotWhitelisted"] = "DOMAIN_NOT_WHITELISTED";
    WebFetchErrorCode["FetchFailed"] = "FETCH_FAILED";
    WebFetchErrorCode["NetworkError"] = "NETWORK_ERROR";
    WebFetchErrorCode["InvalidUrl"] = "INVALID_URL";
    WebFetchErrorCode["Timeout"] = "TIMEOUT";
    WebFetchErrorCode["UnknownError"] = "UNKNOWN_ERROR";
})(WebFetchErrorCode || (WebFetchErrorCode = {}));
/**
 * Web fetch service implementation
 * Provides documentation retrieval capabilities with domain whitelisting,
 * caching, and tool schema generation for LLM tool calling.
 *
 * Key features:
 * - Domain whitelist validation (60+ trusted documentation sites)
 * - Local caching with TTL (1 hour default)
 * - Tool schema generation for managed chat API
 * - HTML to Markdown conversion (server-side)
 * - Error handling with user-friendly messages
 */
export class WebFetchService extends Disposable {
    // Note: These constants are defined for reference but not currently used
    // as the actual fetching happens server-side via the managed chat API
    // private readonly DEFAULT_TIMEOUT_MS = 30000;
    // private readonly DEFAULT_MAX_LENGTH = 10000;
    constructor() {
        super();
        /**
         * Whitelisted documentation domains (60+ trusted sources)
         * Only URLs from these domains can be fetched
         */
        this.WHITELISTED_DOMAINS = [
            // Python & Data Science
            'docs.python.org',
            'numpy.org',
            'pandas.pydata.org',
            'matplotlib.org',
            'scikit-learn.org',
            'pytorch.org',
            'tensorflow.org',
            'docs.scipy.org',
            'jupyter.org',
            // JavaScript & Web
            'developer.mozilla.org',
            'nodejs.org',
            'docs.npmjs.com',
            'reactjs.org',
            'react.dev',
            'vuejs.org',
            'angular.io',
            'svelte.dev',
            'nextjs.org',
            'webpack.js.org',
            // Backend Frameworks
            'docs.djangoproject.com',
            'flask.palletsprojects.com',
            'fastapi.tiangolo.com',
            'docs.sqlalchemy.org',
            'expressjs.com',
            'nestjs.com',
            'spring.io',
            // Databases
            'postgresql.org',
            'dev.mysql.com',
            'mongodb.com',
            'redis.io',
            'cassandra.apache.org',
            'docs.influxdata.com',
            // DevOps & Cloud
            'docs.docker.com',
            'kubernetes.io',
            'docs.aws.amazon.com',
            'cloud.google.com',
            'learn.microsoft.com',
            'docs.github.com',
            'about.gitlab.com',
            'circleci.com',
            // CMS & Tools
            'strapi.io',
            'wordpress.org',
            'drupal.org',
            // AI & ML
            'docs.anthropic.com',
            'platform.openai.com',
            'docs.cohere.ai',
            'huggingface.co',
            'docs.langchain.com',
            // Developer Resources
            'github.com',
            'gitlab.com',
            'stackoverflow.com',
            'docs.microsoft.com',
            'apple.com',
            // Academic
            'arxiv.org',
            'scholar.google.com',
            'wikipedia.org',
            'en.wikipedia.org',
            // Programming Languages
            'go.dev',
            'rust-lang.org',
            'www.rust-lang.org',
            'doc.rust-lang.org',
            'kotlinlang.org',
            'swift.org',
            'typescriptlang.org',
            'www.typescriptlang.org'
        ];
        /**
         * Local cache with TTL
         */
        this.cache = new Map();
        /**
         * Cache TTL in milliseconds (1 hour)
         */
        this.CACHE_TTL_MS = 60 * 60 * 1000;
        // Start cache cleanup interval (every 10 minutes)
        const cleanupInterval = setInterval(() => {
            this._cleanupExpiredCache();
        }, 10 * 60 * 1000);
        // Clean up interval on disposal
        this._register({
            dispose: () => clearInterval(cleanupInterval)
        });
    }
    /**
     * Fetch documentation from a URL
     * Note: This is a client-side validation and preparation method.
     * The actual fetching happens server-side via the managed chat API.
     */
    async fetchDocumentation(url, options) {
        // Validate URL format
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        }
        catch (error) {
            throw this._createError(WebFetchErrorCode.InvalidUrl, `Invalid URL format: ${url}`, url, error);
        }
        // Only allow HTTP and HTTPS protocols
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            throw this._createError(WebFetchErrorCode.InvalidUrl, `Only HTTP and HTTPS protocols are allowed. Got: ${parsedUrl.protocol}`, url);
        }
        // Check domain whitelist
        if (!this.validateDomain(url)) {
            throw this._createError(WebFetchErrorCode.DomainNotWhitelisted, `Domain ${parsedUrl.hostname} is not whitelisted. Only trusted documentation sources are allowed.`, url);
        }
        // Check cache first
        const cached = this._getCached(url);
        if (cached) {
            return cached;
        }
        // In a real implementation, this would call the managed chat API with the web_fetch tool
        // For now, we'll return a mock result since the actual fetching happens server-side
        // through the tool calling mechanism in managedChatAPIService
        // This method is primarily for validation and cache management
        // The actual fetch will be done by calling managedChatAPI.sendChatCompletion() with
        // the web_fetch tool included in the tools array
        throw new Error('fetchDocumentation must be called via managedChatAPIService with web_fetch tool');
    }
    /**
     * Search documentation with a query
     * Returns suggested search URLs for whitelisted domains
     */
    async searchDocumentation(query, domains) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        // Use provided domains or default set
        const searchDomains = domains && domains.length > 0
            ? domains
            : [
                'docs.python.org',
                'developer.mozilla.org',
                'nodejs.org',
                'reactjs.org',
                'stackoverflow.com'
            ];
        // Generate search suggestions
        const results = [];
        for (const domain of searchDomains.slice(0, 5)) { // Limit to 5 domains
            if (this._isDomainWhitelisted(domain)) {
                results.push({
                    domain,
                    suggested_search_url: `https://www.google.com/search?q=site:${domain}+${encodeURIComponent(query)}`,
                    direct_url: `https://${domain}`
                });
            }
        }
        return results;
    }
    /**
     * Validate if a domain is whitelisted
     */
    validateDomain(url) {
        try {
            const parsed = new URL(url);
            return this._isDomainWhitelisted(parsed.hostname);
        }
        catch {
            return false;
        }
    }
    /**
     * Get list of whitelisted domains
     */
    getWhitelistedDomains() {
        return [...this.WHITELISTED_DOMAINS];
    }
    /**
     * Get tool schema for LLM tool calling
     */
    getToolSchema() {
        return {
            name: 'web_fetch',
            description: 'Fetch documentation and API references from whitelisted web sources. Converts HTML to readable markdown. Only works with trusted documentation domains like docs.python.org, developer.mozilla.org, reactjs.org, etc.',
            input_schema: {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['fetch_url', 'fetch_documentation', 'search_docs'],
                        description: 'Operation to perform: fetch_url (basic fetch), fetch_documentation (enhanced with main content extraction), search_docs (generate search suggestions)'
                    },
                    url: {
                        type: 'string',
                        format: 'uri',
                        description: 'URL to fetch (required for fetch_url and fetch_documentation operations)'
                    },
                    query: {
                        type: 'string',
                        description: 'Search query (required for search_docs operation)'
                    },
                    domains: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'List of domains to search (optional for search_docs)'
                    },
                    parse_format: {
                        type: 'string',
                        enum: ['html', 'markdown', 'text'],
                        default: 'markdown',
                        description: 'Output format for the content'
                    },
                    max_length: {
                        type: 'integer',
                        default: 10000,
                        description: 'Maximum content length in characters'
                    },
                    include_links: {
                        type: 'boolean',
                        default: true,
                        description: 'Include links in markdown output'
                    },
                    timeout: {
                        type: 'number',
                        default: 30.0,
                        description: 'Request timeout in seconds'
                    }
                },
                required: ['operation']
            }
        };
    }
    /**
     * Clear cache for a specific URL or all cached entries
     */
    clearCache(url) {
        if (url) {
            this.cache.delete(url);
        }
        else {
            this.cache.clear();
        }
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        let totalSize = 0;
        for (const entry of this.cache.values()) {
            totalSize += entry.data.sizeBytes;
        }
        return {
            size: totalSize,
            entries: this.cache.size
        };
    }
    /**
     * Check if a domain is whitelisted
     */
    _isDomainWhitelisted(hostname) {
        const domain = hostname.toLowerCase();
        // Remove www. prefix for comparison
        const domainWithoutWww = domain.startsWith('www.') ? domain.slice(4) : domain;
        // Check if domain or any parent domain is whitelisted
        for (const safeDomain of this.WHITELISTED_DOMAINS) {
            if (domainWithoutWww === safeDomain || domainWithoutWww.endsWith(`.${safeDomain}`)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get cached documentation result
     */
    _getCached(url) {
        const entry = this.cache.get(url);
        if (!entry) {
            return null;
        }
        // Check if expired
        if (Date.now() > entry.expires) {
            this.cache.delete(url);
            return null;
        }
        // Mark as cached
        return { ...entry.data, cached: true };
    }
    /**
     * Set cached documentation result
     */
    _setCached(url, data) {
        this.cache.set(url, {
            data: { ...data, cached: false },
            expires: Date.now() + this.CACHE_TTL_MS
        });
    }
    /**
     * Clean up expired cache entries
     */
    _cleanupExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expires) {
                expiredKeys.push(key);
            }
        }
        for (const key of expiredKeys) {
            this.cache.delete(key);
        }
    }
    /**
     * Create a web fetch error
     */
    _createError(code, message, url, originalError) {
        return {
            code,
            message,
            url,
            originalError
        };
    }
    /**
     * Process tool result from managed chat API
     * This method would be called after receiving a response from the backend
     * that used the web_fetch tool
     */
    processToolResult(toolOutput, url) {
        const result = {
            url: toolOutput.url || url,
            title: toolOutput.title || '',
            content: toolOutput.content || '',
            contentType: toolOutput.content_type || toolOutput.format || 'text/html',
            sizeBytes: toolOutput.length || toolOutput.content?.length || 0,
            fetchedAt: new Date(),
            cached: false,
            truncated: toolOutput.truncated || false
        };
        // Cache the result
        this._setCached(url, result);
        return result;
    }
}
/**
 * Register the service with dependency injection
 */
registerSingleton(IWebFetchService, WebFetchService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRmV0Y2hTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vd2ViRmV0Y2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFtQixpQkFBaUIsQ0FBQyxDQUFDO0FBRXJGOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksaUJBT1g7QUFQRCxXQUFZLGlCQUFpQjtJQUM1QixvRUFBK0MsQ0FBQTtJQUMvQyxpREFBNEIsQ0FBQTtJQUM1QixtREFBOEIsQ0FBQTtJQUM5QiwrQ0FBMEIsQ0FBQTtJQUMxQix3Q0FBbUIsQ0FBQTtJQUNuQixtREFBOEIsQ0FBQTtBQUMvQixDQUFDLEVBUFcsaUJBQWlCLEtBQWpCLGlCQUFpQixRQU81QjtBQXlIRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7SUF5RzlDLHlFQUF5RTtJQUN6RSxzRUFBc0U7SUFDdEUsK0NBQStDO0lBQy9DLCtDQUErQztJQUUvQztRQUNDLEtBQUssRUFBRSxDQUFDO1FBM0dUOzs7V0FHRztRQUNjLHdCQUFtQixHQUFHO1lBQ3RDLHdCQUF3QjtZQUN4QixpQkFBaUI7WUFDakIsV0FBVztZQUNYLG1CQUFtQjtZQUNuQixnQkFBZ0I7WUFDaEIsa0JBQWtCO1lBQ2xCLGFBQWE7WUFDYixnQkFBZ0I7WUFD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