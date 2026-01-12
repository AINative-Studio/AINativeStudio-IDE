/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Example 1: Basic Domain Validation
 *
 * Before making any API calls, validate that the URL is from a whitelisted domain.
 * This provides immediate feedback to users without hitting the backend.
 */
export function exampleDomainValidation(webFetchService) {
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
export function exampleGetToolSchema(webFetchService) {
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
export async function exampleSearchDocumentation(webFetchService) {
    // Search with default domains
    const results1 = await webFetchService.searchDocumentation('async functions');
    console.log(`Found ${results1.length} search suggestions`);
    results1.forEach((result) => {
        console.log(`- ${result.domain}`);
        console.log(`  Search URL: ${result.suggested_search_url}`);
        console.log(`  Direct URL: ${result.direct_url}`);
    });
    // Search specific domains
    const customDomains = ['docs.docker.com', 'kubernetes.io'];
    const results2 = await webFetchService.searchDocumentation('container orchestration', customDomains);
    console.log(`\nCustom domain search found ${results2.length} results`);
}
/**
 * Example 4: Process Tool Results from Backend
 *
 * After the backend executes the web_fetch tool, process the results
 * to display to the user and cache for future use.
 */
export function exampleProcessToolResult(webFetchService) {
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
    const result = {
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
export function exampleCacheManagement(webFetchService) {
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
export async function exampleErrorHandling(webFetchService) {
    try {
        // This will fail - domain not whitelisted
        await webFetchService.fetchDocumentation('https://malicious-site.com/docs');
    }
    catch (error) {
        const webFetchError = error;
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
export async function exampleChatIntegration(webFetchService, managedChatAPI // IManagedChatAPIService
) {
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
export function exampleWhitelistedDomains(webFetchService) {
    const domains = webFetchService.getWhitelistedDomains();
    console.log(`Total whitelisted domains: ${domains.length}`);
    console.log('\nSupported documentation sources:');
    // Group by category for better display
    const categories = {
        'Python & Data Science': domains.filter(d => d.includes('python') || d.includes('numpy') || d.includes('pandas') ||
            d.includes('pytorch') || d.includes('tensorflow')),
        'JavaScript & Web': domains.filter(d => d.includes('mozilla') || d.includes('nodejs') || d.includes('react') ||
            d.includes('vue') || d.includes('angular')),
        'DevOps & Cloud': domains.filter(d => d.includes('docker') || d.includes('kubernetes') || d.includes('aws') ||
            d.includes('google.com') || d.includes('microsoft')),
        'AI & ML': domains.filter(d => d.includes('anthropic') || d.includes('openai') || d.includes('huggingface'))
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
export function examplePreValidation(webFetchService, url) {
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
export async function exampleStreaming(webFetchService, managedChatAPI) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRmV0Y2hTZXJ2aWNlRXhhbXBsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3dlYkZldGNoU2VydmljZUV4YW1wbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFZaEc7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsZUFBaUM7SUFDeEUsYUFBYTtJQUNiLE1BQU0sU0FBUyxHQUFHO1FBQ2pCLDJDQUEyQztRQUMzQyx5REFBeUQ7UUFDekQsMkNBQTJDO1FBQzNDLCtDQUErQztLQUMvQyxDQUFDO0lBRUYsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN2QixJQUFJLGVBQWUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILHdDQUF3QztJQUN4QyxNQUFNLFdBQVcsR0FBRztRQUNuQiwwQkFBMEI7UUFDMUIsNEJBQTRCO0tBQzVCLENBQUM7SUFFRixXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3pCLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcscUJBQXFCLENBQUMsQ0FBQztRQUM1QyxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsZUFBaUM7SUFDckUsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLGFB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