/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * WebFetchService Usage Examples
 *
 * This file demonstrates how to use the WebFetchService for documentation retrieval
 * in the AINative Studio IDE. The service provides client-side validation and caching,
 * while actual documentation fetching happens server-side via the managed chat API.
 */

import { IWebFetchService, DocumentationResult, SearchResult, WebFetchError } from './webFetchService.js';

/**
 * Example 1: Basic Domain Validation
 *
 * Before making any API calls, validate that the URL is from a whitelisted domain.
 * This provides immediate feedback to users without hitting the backend.
 */
export function exampleDomainValidation(webFetchService: IWebFetchService): void {
	// Valid URLs
	const validUrls = [
		'https://docs.python.org/3/library/os.html',
		'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
		'https://reactjs.org/docs/hooks-intro.html',
		'https://docs.docker.com/engine/reference/run/'
	];

	validUrls.forEach(url => {
		if (webFetchService.validateDomain(url)) {
			console.log(`✓ ${url} is whitelisted`);
		}
	});

	// Invalid URLs - these will be rejected
	const invalidUrls = [
		'https://example.com/docs',
		'https://malicious-site.com'
	];

	invalidUrls.forEach(url => {
		if (!webFetchService.validateDomain(url)) {
			console.log(`✗ ${url} is not whitelisted`);
		}
	});
}

/**
 * Example 2: Get Tool Schema for Managed Chat API
 *
 * When sending a chat completion request that needs documentation access,
 * include the web_fetch tool schema in your request.
 */
export function exampleGetToolSchema(webFetchService: IWebFetchService): void {
	const toolSchema = webFetchService.getToolSchema();

	console.log('Tool Name:', toolSchema.name); // 'web_fetch'
	console.log('Description:', toolSchema.description);
	console.log('Operations:', toolSchema.input_schema.properties.operation.enum);
	// ['fetch_url', 'fetch_documentation', 'search_docs']

	// Use this schema when calling managedChatAPIService:
	/*
	const response = await managedChatAPIService.sendChatCompletion({
		messages: [{
			role: 'user',
			content: 'Show me the Python os.path documentation'
		}],
		tools: [webFetchService.getToolSchema()],
		preferred_model: 'llama-3.3-70b-instruct'
	});
	*/
}

/**
 * Example 3: Search Documentation
 *
 * Generate search suggestions for documentation queries.
 * This is useful for helping users find relevant documentation pages.
 */
export async function exampleSearchDocumentation(webFetchService: IWebFetchService): Promise<void> {
	// Search with default domains
	const results1 = await webFetchService.searchDocumentation('async functions');

	console.log(`Found ${results1.length} search suggestions`);
	results1.forEach((result: SearchResult) => {
		console.log(`- ${result.domain}`);
		console.log(`  Search URL: ${result.suggested_search_url}`);
		console.log(`  Direct URL: ${result.direct_url}`);
	});

	// Search specific domains
	const customDomains = ['docs.docker.com', 'kubernetes.io'];
	const results2 = await webFetchService.searchDocumentation(
		'container orchestration',
		customDomains
	);

	console.log(`\nCustom domain search found ${results2.length} results`);
}

/**
 * Example 4: Process Tool Results from Backend
 *
 * After the backend executes the web_fetch tool, process the results
 * to display to the user and cache for future use.
 */
export function exampleProcessToolResult(webFetchService: IWebFetchService): void {
	// Simulate backend tool execution result
	const backendToolOutput = {
		url: 'https://docs.python.org/3/library/os.html',
		title: 'os — Miscellaneous operating system interfaces',
		content: '# os — Miscellaneous operating system interfaces\n\nThis module provides...',
		content_type: 'text/html',
		format: 'markdown',
		length: 1234,
		truncated: false,
		status_code: 200
	};

	// Note: processToolResult would be called internally by the service
	// when receiving tool results from the backend. This is just an example
	// of what the result structure would look like.
	const result: DocumentationResult = {
		url: backendToolOutput.url,
		title: backendToolOutput.title,
		content: backendToolOutput.content,
		contentType: backendToolOutput.content_type,
		sizeBytes: backendToolOutput.length,
		fetchedAt: new Date(),
		cached: false,
		truncated: backendToolOutput.truncated
	};

	// Display to user
	console.log('Title:', result.title);
	console.log('Content length:', result.sizeBytes, 'bytes');
	console.log('Fetched at:', result.fetchedAt);
	console.log('Cached:', result.cached);
	console.log('Content preview:', result.content.substring(0, 100) + '...');

	// Result is now cached for 1 hour
	const stats = webFetchService.getCacheStats();
	console.log(`Cache stats: ${stats.entries} entries, ${stats.size} bytes`);
}

/**
 * Example 5: Cache Management
 *
 * The service automatically caches results for 1 hour.
 * You can manually manage the cache as needed.
 */
export function exampleCacheManagement(webFetchService: IWebFetchService): void {
	// Get cache statistics
	const stats = webFetchService.getCacheStats();
	console.log(`Cache has ${stats.entries} entries totaling ${stats.size} bytes`);

	// Clear specific URL from cache
	webFetchService.clearCache('https://docs.python.org/3/library/os.html');
	console.log('Cleared specific URL from cache');

	// Clear all cache
	webFetchService.clearCache();
	console.log('Cleared all cache');

	// Cache is automatically cleaned up every 10 minutes
	// Expired entries (older than 1 hour) are removed
}

/**
 * Example 6: Error Handling
 *
 * The service provides detailed error information for various failure scenarios.
 */
export async function exampleErrorHandling(webFetchService: IWebFetchService): Promise<void> {
	try {
		// This will fail - domain not whitelisted
		await webFetchService.fetchDocumentation('https://malicious-site.com/docs');
	} catch (error) {
		const webFetchError = error as WebFetchError;
		console.error('Error code:', webFetchError.code); // 'DOMAIN_NOT_WHITELISTED'
		console.error('Error message:', webFetchError.message);
		console.error('Failed URL:', webFetchError.url);

		// Handle different error types
		switch (webFetchError.code) {
			case 'DOMAIN_NOT_WHITELISTED':
				console.log('Please use a trusted documentation source');
				break;
			case 'INVALID_URL':
				console.log('Invalid URL format');
				break;
			case 'NETWORK_ERROR':
				console.log('Network request failed');
				break;
		}
	}
}

/**
 * Example 7: Integration with Chat Thread Service
 *
 * This shows how to integrate WebFetchService with the chat system.
 */
export async function exampleChatIntegration(
	webFetchService: IWebFetchService,
	managedChatAPI: any // IManagedChatAPIService
): Promise<void> {
	// User asks about documentation
	const userMessage = 'Can you explain the Python os.path module?';

	// Check if we should include web_fetch tool
	const needsDocumentation = userMessage.toLowerCase().includes('documentation') ||
		userMessage.toLowerCase().includes('python') ||
		userMessage.toLowerCase().includes('explain');

	const tools = [];
	if (needsDocumentation) {
		tools.push(webFetchService.getToolSchema());
	}

	// Send to managed chat API
	const response = await managedChatAPI.sendChatCompletion({
		messages: [{ role: 'user', content: userMessage }],
		tools: tools.length > 0 ? tools : undefined,
		preferred_model: 'llama-3.3-70b-instruct',
		stream: false
	});

	// The backend will automatically:
	// 1. Recognize the need for documentation
	// 2. Call the web_fetch tool with appropriate URL
	// 3. Return the formatted response with documentation context

	console.log('Assistant response:', response.choices[0].message.content);
	console.log('Credits consumed:', response.credits_consumed);
}

/**
 * Example 8: Whitelisted Domains List
 *
 * Get the full list of whitelisted domains for display in UI.
 */
export function exampleWhitelistedDomains(webFetchService: IWebFetchService): void {
	const domains = webFetchService.getWhitelistedDomains();

	console.log(`Total whitelisted domains: ${domains.length}`);
	console.log('\nSupported documentation sources:');

	// Group by category for better display
	const categories = {
		'Python & Data Science': domains.filter(d =>
			d.includes('python') || d.includes('numpy') || d.includes('pandas') ||
			d.includes('pytorch') || d.includes('tensorflow')
		),
		'JavaScript & Web': domains.filter(d =>
			d.includes('mozilla') || d.includes('nodejs') || d.includes('react') ||
			d.includes('vue') || d.includes('angular')
		),
		'DevOps & Cloud': domains.filter(d =>
			d.includes('docker') || d.includes('kubernetes') || d.includes('aws') ||
			d.includes('google.com') || d.includes('microsoft')
		),
		'AI & ML': domains.filter(d =>
			d.includes('anthropic') || d.includes('openai') || d.includes('huggingface')
		)
	};

	Object.entries(categories).forEach(([category, categoryDomains]) => {
		console.log(`\n${category}:`);
		categoryDomains.slice(0, 5).forEach(domain => {
			console.log(`  - ${domain}`);
		});
		if (categoryDomains.length > 5) {
			console.log(`  ... and ${categoryDomains.length - 5} more`);
		}
	});
}

/**
 * Example 9: Validation Before API Call
 *
 * Always validate URLs before making expensive API calls.
 * This provides immediate user feedback and prevents unnecessary requests.
 */
export function examplePreValidation(webFetchService: IWebFetchService, url: string): boolean {
	// Quick validation checks
	if (!url || url.trim().length === 0) {
		console.error('URL is required');
		return false;
	}

	// Validate domain
	if (!webFetchService.validateDomain(url)) {
		const domains = webFetchService.getWhitelistedDomains();
		console.error(`URL domain is not whitelisted. Supported domains include:`, domains.slice(0, 10));
		return false;
	}

	// Validation passed
	console.log('URL validation passed:', url);
	return true;
}

/**
 * Example 10: Streaming with Documentation Context
 *
 * Use streaming to show real-time tool execution progress.
 */
export async function exampleStreaming(
	webFetchService: IWebFetchService,
	managedChatAPI: any
): Promise<void> {
	await managedChatAPI.sendChatCompletion({
		messages: [{
			role: 'user',
			content: 'Explain React hooks with examples from the official docs'
		}],
		tools: [webFetchService.getToolSchema()],
		preferred_model: 'llama-3.3-70b-instruct',
		stream: true // Enable streaming
	});

	// The streaming response will show:
	// 1. "Fetching documentation from reactjs.org..."
	// 2. "Processing React hooks documentation..."
	// 3. Final formatted response with examples

	console.log('Streaming response with tool execution progress');
}
