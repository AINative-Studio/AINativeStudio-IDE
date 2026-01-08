/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';

/**
 * Service identifier for dependency injection
 */
export const IWebFetchService = createDecorator<IWebFetchService>('webFetchService');

/**
 * Error codes for web fetch operations
 */
export enum WebFetchErrorCode {
	DomainNotWhitelisted = 'DOMAIN_NOT_WHITELISTED',
	FetchFailed = 'FETCH_FAILED',
	NetworkError = 'NETWORK_ERROR',
	InvalidUrl = 'INVALID_URL',
	Timeout = 'TIMEOUT',
	UnknownError = 'UNKNOWN_ERROR'
}

/**
 * Web fetch error details
 */
export interface WebFetchError {
	code: WebFetchErrorCode;
	message: string;
	url: string;
	statusCode?: number;
	originalError?: Error;
}

/**
 * Documentation retrieval result
 */
export interface DocumentationResult {
	url: string;
	title: string;
	content: string; // Markdown format
	contentType: string;
	sizeBytes: number;
	fetchedAt: Date;
	cached: boolean;
	truncated?: boolean;
}

/**
 * Tool definition for LLM tool calling
 */
export interface ToolDefinition {
	name: string;
	description: string;
	input_schema: {
		type: 'object';
		properties: Record<string, any>;
		required: string[];
	};
}

/**
 * Cache entry for documentation results
 */
interface CacheEntry {
	data: DocumentationResult;
	expires: number;
}

/**
 * Search result from documentation search
 */
export interface SearchResult {
	domain: string;
	suggested_search_url: string;
	direct_url: string;
}

/**
 * Web fetch service interface for documentation retrieval
 */
export interface IWebFetchService {
	readonly _serviceBrand: undefined;

	/**
	 * Fetch documentation from a URL
	 * @param url - URL to fetch documentation from
	 * @param options - Optional fetch options (parse format, max length, etc.)
	 * @returns Promise with documentation result or error
	 */
	fetchDocumentation(url: string, options?: FetchOptions): Promise<DocumentationResult>;

	/**
	 * Search documentation with a query
	 * @param query - Search query
	 * @param domains - Optional list of domains to search
	 * @returns Promise with search suggestions
	 */
	searchDocumentation(query: string, domains?: string[]): Promise<SearchResult[]>;

	/**
	 * Validate if a domain is whitelisted
	 * @param url - URL to validate
	 * @returns True if domain is whitelisted, false otherwise
	 */
	validateDomain(url: string): boolean;

	/**
	 * Get list of whitelisted domains
	 * @returns Array of whitelisted domain strings
	 */
	getWhitelistedDomains(): string[];

	/**
	 * Get tool schema for LLM tool calling
	 * @returns Tool definition for web_fetch tool
	 */
	getToolSchema(): ToolDefinition;

	/**
	 * Clear cache for a specific URL or all cached entries
	 * @param url - Optional URL to clear, if not provided clears all
	 */
	clearCache(url?: string): void;

	/**
	 * Get cache statistics
	 * @returns Object with cache stats
	 */
	getCacheStats(): { size: number; entries: number };
}

/**
 * Fetch options for documentation retrieval
 */
export interface FetchOptions {
	parseFormat?: 'html' | 'markdown' | 'text';
	maxLength?: number;
	includeLinks?: boolean;
	timeout?: number;
}

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
export class WebFetchService extends Disposable implements IWebFetchService {

	readonly _serviceBrand: undefined;

	/**
	 * Whitelisted documentation domains (60+ trusted sources)
	 * Only URLs from these domains can be fetched
	 */
	private readonly WHITELISTED_DOMAINS = [
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
	private cache: Map<string, CacheEntry> = new Map();

	/**
	 * Cache TTL in milliseconds (1 hour)
	 */
	private readonly CACHE_TTL_MS = 60 * 60 * 1000;

	/**
	 * Default fetch timeout in milliseconds
	 */
	private readonly DEFAULT_TIMEOUT_MS = 30000;

	/**
	 * Maximum content length in characters
	 */
	private readonly DEFAULT_MAX_LENGTH = 10000;

	constructor() {
		super();

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
	async fetchDocumentation(url: string, options?: FetchOptions): Promise<DocumentationResult> {
		// Validate URL format
		let parsedUrl: URL;
		try {
			parsedUrl = new URL(url);
		} catch (error) {
			throw this._createError(
				WebFetchErrorCode.InvalidUrl,
				`Invalid URL format: ${url}`,
				url,
				error as Error
			);
		}

		// Only allow HTTP and HTTPS protocols
		if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
			throw this._createError(
				WebFetchErrorCode.InvalidUrl,
				`Only HTTP and HTTPS protocols are allowed. Got: ${parsedUrl.protocol}`,
				url
			);
		}

		// Check domain whitelist
		if (!this.validateDomain(url)) {
			throw this._createError(
				WebFetchErrorCode.DomainNotWhitelisted,
				`Domain ${parsedUrl.hostname} is not whitelisted. Only trusted documentation sources are allowed.`,
				url
			);
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
	async searchDocumentation(query: string, domains?: string[]): Promise<SearchResult[]> {
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
		const results: SearchResult[] = [];
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
	validateDomain(url: string): boolean {
		try {
			const parsed = new URL(url);
			return this._isDomainWhitelisted(parsed.hostname);
		} catch {
			return false;
		}
	}

	/**
	 * Get list of whitelisted domains
	 */
	getWhitelistedDomains(): string[] {
		return [...this.WHITELISTED_DOMAINS];
	}

	/**
	 * Get tool schema for LLM tool calling
	 */
	getToolSchema(): ToolDefinition {
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
	clearCache(url?: string): void {
		if (url) {
			this.cache.delete(url);
		} else {
			this.cache.clear();
		}
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; entries: number } {
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
	private _isDomainWhitelisted(hostname: string): boolean {
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
	private _getCached(url: string): DocumentationResult | null {
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
	private _setCached(url: string, data: DocumentationResult): void {
		this.cache.set(url, {
			data: { ...data, cached: false },
			expires: Date.now() + this.CACHE_TTL_MS
		});
	}

	/**
	 * Clean up expired cache entries
	 */
	private _cleanupExpiredCache(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

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
	private _createError(
		code: WebFetchErrorCode,
		message: string,
		url: string,
		originalError?: Error
	): WebFetchError {
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
	processToolResult(toolOutput: any, url: string): DocumentationResult {
		const result: DocumentationResult = {
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
registerSingleton(IWebFetchService, WebFetchService, InstantiationType.Eager);
