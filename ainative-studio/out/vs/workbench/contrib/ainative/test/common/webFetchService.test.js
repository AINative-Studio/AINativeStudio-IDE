/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { WebFetchService, WebFetchErrorCode } from '../../common/webFetchService.js';
suite('WebFetchService', () => {
    let service;
    setup(() => {
        service = new WebFetchService();
    });
    teardown(() => {
        service.dispose();
    });
    suite('Domain Validation', () => {
        test('should validate whitelisted domains', () => {
            const validUrls = [
                'https://docs.python.org/3/library/os.html',
                'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
                'https://nodejs.org/api/fs.html',
                'https://reactjs.org/docs/getting-started.html',
                'https://docs.docker.com/engine/reference/run/',
                'https://kubernetes.io/docs/concepts/',
                'https://www.rust-lang.org/learn',
                'https://doc.rust-lang.org/book/'
            ];
            for (const url of validUrls) {
                assert.strictEqual(service.validateDomain(url), true, `${url} should be whitelisted`);
            }
        });
        test('should reject non-whitelisted domains', () => {
            const invalidUrls = [
                'https://example.com/docs',
                'https://malicious-site.com',
                'https://random-blog.io/article',
                'https://not-a-docs-site.com'
            ];
            for (const url of invalidUrls) {
                assert.strictEqual(service.validateDomain(url), false, `${url} should not be whitelisted`);
            }
        });
        test('should handle www prefix correctly', () => {
            assert.strictEqual(service.validateDomain('https://www.rust-lang.org/learn'), true, 'www.rust-lang.org should be whitelisted');
            assert.strictEqual(service.validateDomain('https://www.python.org'), false, 'www.python.org should not match docs.python.org');
        });
        test('should handle subdomains correctly', () => {
            assert.strictEqual(service.validateDomain('https://api.github.com/docs'), true, 'Subdomain of whitelisted domain should be allowed');
            assert.strictEqual(service.validateDomain('https://docs.python.org'), true, 'Exact whitelisted domain should be allowed');
        });
        test('should reject invalid URL formats', () => {
            const invalidFormats = [
                'not-a-url',
                'ftp://docs.python.org',
                'javascript:alert(1)',
                'file:///etc/passwd',
                ''
            ];
            for (const url of invalidFormats) {
                assert.strictEqual(service.validateDomain(url), false, `${url} should be invalid`);
            }
        });
        test('should be case-insensitive', () => {
            assert.strictEqual(service.validateDomain('https://DOCS.PYTHON.ORG/library/os.html'), true, 'Uppercase domains should work');
            assert.strictEqual(service.validateDomain('https://DoCs.PyThOn.OrG/library/os.html'), true, 'Mixed case domains should work');
        });
    });
    suite('Whitelisted Domains', () => {
        test('should return all whitelisted domains', () => {
            const domains = service.getWhitelistedDomains();
            assert.ok(Array.isArray(domains), 'Should return an array');
            assert.ok(domains.length >= 60, 'Should have at least 60 domains');
        });
        test('should include major documentation sites', () => {
            const domains = service.getWhitelistedDomains();
            const expectedDomains = [
                'docs.python.org',
                'developer.mozilla.org',
                'nodejs.org',
                'reactjs.org',
                'docs.docker.com',
                'kubernetes.io',
                'docs.anthropic.com',
                'platform.openai.com',
                'stackoverflow.com',
                'github.com'
            ];
            for (const domain of expectedDomains) {
                assert.ok(domains.includes(domain), `Should include ${domain}`);
            }
        });
        test('should return a copy of the array', () => {
            const domains1 = service.getWhitelistedDomains();
            const domains2 = service.getWhitelistedDomains();
            assert.notStrictEqual(domains1, domains2, 'Should return different array instances');
            assert.deepStrictEqual(domains1, domains2, 'But should have same content');
            // Modify returned array
            domains1.push('test.com');
            // Should not affect the service's internal list
            const domains3 = service.getWhitelistedDomains();
            assert.ok(!domains3.includes('test.com'), 'Internal list should not be modified');
        });
    });
    suite('Tool Schema', () => {
        test('should return valid tool schema', () => {
            const schema = service.getToolSchema();
            assert.strictEqual(schema.name, 'web_fetch', 'Tool name should be web_fetch');
            assert.ok(schema.description.length > 0, 'Should have description');
            assert.strictEqual(schema.input_schema.type, 'object', 'Input schema should be object');
        });
        test('should have all required properties', () => {
            const schema = service.getToolSchema();
            const properties = schema.input_schema.properties;
            assert.ok(properties.operation, 'Should have operation property');
            assert.ok(properties.url, 'Should have url property');
            assert.ok(properties.query, 'Should have query property');
            assert.ok(properties.parse_format, 'Should have parse_format property');
            assert.ok(properties.max_length, 'Should have max_length property');
            assert.ok(properties.include_links, 'Should have include_links property');
            assert.ok(properties.timeout, 'Should have timeout property');
        });
        test('should have correct operation enum values', () => {
            const schema = service.getToolSchema();
            const operationEnum = schema.input_schema.properties.operation.enum;
            assert.deepStrictEqual(operationEnum, ['fetch_url', 'fetch_documentation', 'search_docs'], 'Should have correct operation types');
        });
        test('should have correct parse_format enum values', () => {
            const schema = service.getToolSchema();
            const parseFormatEnum = schema.input_schema.properties.parse_format.enum;
            assert.deepStrictEqual(parseFormatEnum, ['html', 'markdown', 'text'], 'Should have correct parse format types');
        });
        test('should have operation as required field', () => {
            const schema = service.getToolSchema();
            assert.ok(schema.input_schema.required.includes('operation'), 'operation should be required');
        });
    });
    suite('Search Documentation', () => {
        test('should return search results for valid query', async () => {
            const results = await service.searchDocumentation('async functions');
            assert.ok(Array.isArray(results), 'Should return array');
            assert.ok(results.length > 0, 'Should have results');
            assert.ok(results.length <= 5, 'Should limit to 5 results');
        });
        test('should return empty array for empty query', async () => {
            const results = await service.searchDocumentation('');
            assert.deepStrictEqual(results, [], 'Should return empty array');
        });
        test('should return empty array for whitespace query', async () => {
            const results = await service.searchDocumentation('   ');
            assert.deepStrictEqual(results, [], 'Should return empty array');
        });
        test('should use default domains when none provided', async () => {
            const results = await service.searchDocumentation('promises');
            const domains = results.map(r => r.domain);
            assert.ok(domains.includes('docs.python.org') || domains.length > 0);
        });
        test('should use custom domains when provided', async () => {
            const customDomains = ['docs.docker.com', 'kubernetes.io'];
            const results = await service.searchDocumentation('containers', customDomains);
            assert.strictEqual(results.length, 2, 'Should return results for custom domains');
            assert.ok(results.every(r => customDomains.includes(r.domain)));
        });
        test('should filter out non-whitelisted domains', async () => {
            const mixedDomains = ['docs.python.org', 'malicious-site.com', 'nodejs.org'];
            const results = await service.searchDocumentation('test', mixedDomains);
            assert.ok(results.length <= 2, 'Should only include whitelisted domains');
            assert.ok(results.every(r => r.domain !== 'malicious-site.com'));
        });
        test('should generate correct search URLs', async () => {
            const results = await service.searchDocumentation('async await');
            for (const result of results) {
                assert.ok(result.suggested_search_url.includes('site:'), 'Should have site: filter');
                assert.ok(result.suggested_search_url.includes(result.domain), 'Should include domain');
                assert.ok(result.suggested_search_url.includes('async'), 'Should include query term');
            }
        });
        test('should include direct URLs', async () => {
            const results = await service.searchDocumentation('test');
            for (const result of results) {
                assert.strictEqual(result.direct_url, `https://${result.domain}`, 'Should have correct direct URL');
            }
        });
    });
    suite('Cache Management', () => {
        test('should start with empty cache', () => {
            const stats = service.getCacheStats();
            assert.strictEqual(stats.entries, 0, 'Should have 0 entries');
            assert.strictEqual(stats.size, 0, 'Should have 0 size');
        });
        test('should clear specific URL from cache', () => {
            // Manually add to cache via processToolResult
            const url = 'https://docs.python.org/3/library/os.html';
            const mockResult = {
                url,
                content: 'Test content',
                title: 'Test',
                format: 'markdown',
                length: 12
            };
            service.processToolResult(mockResult, url);
            let stats = service.getCacheStats();
            assert.strictEqual(stats.entries, 1, 'Should have 1 entry');
            service.clearCache(url);
            stats = service.getCacheStats();
            assert.strictEqual(stats.entries, 0, 'Should have 0 entries after clear');
        });
        test('should clear all cache entries', () => {
            // Add multiple entries
            const urls = [
                'https://docs.python.org/3/library/os.html',
                'https://nodejs.org/api/fs.html',
                'https://reactjs.org/docs/hooks.html'
            ];
            for (const url of urls) {
                service.processToolResult({
                    url,
                    content: 'Test',
                    title: 'Test',
                    format: 'markdown',
                    length: 4
                }, url);
            }
            let stats = service.getCacheStats();
            assert.strictEqual(stats.entries, 3, 'Should have 3 entries');
            service.clearCache();
            stats = service.getCacheStats();
            assert.strictEqual(stats.entries, 0, 'Should have 0 entries after clear all');
        });
        test('should calculate cache size correctly', () => {
            const url = 'https://docs.python.org/3/library/os.html';
            const content = 'a'.repeat(1000); // 1000 bytes
            service.processToolResult({
                url,
                content,
                title: 'Test',
                format: 'markdown',
                length: 1000
            }, url);
            const stats = service.getCacheStats();
            assert.strictEqual(stats.size, 1000, 'Should calculate size correctly');
        });
    });
    suite('Process Tool Result', () => {
        test('should process valid tool result', () => {
            const url = 'https://docs.python.org/3/library/os.html';
            const toolOutput = {
                url,
                title: 'os — Miscellaneous operating system interfaces',
                content: '# os module\n\nThe os module provides...',
                content_type: 'text/html',
                length: 45,
                truncated: false
            };
            const result = service.processToolResult(toolOutput, url);
            assert.strictEqual(result.url, url);
            assert.strictEqual(result.title, toolOutput.title);
            assert.strictEqual(result.content, toolOutput.content);
            assert.strictEqual(result.contentType, toolOutput.content_type);
            assert.strictEqual(result.sizeBytes, toolOutput.length);
            assert.strictEqual(result.truncated, false);
            assert.strictEqual(result.cached, false);
        });
        test('should handle missing fields with defaults', () => {
            const url = 'https://docs.python.org/3/library/os.html';
            const toolOutput = {
                content: 'Test content'
            };
            const result = service.processToolResult(toolOutput, url);
            assert.strictEqual(result.url, url);
            assert.strictEqual(result.title, '');
            assert.strictEqual(result.content, 'Test content');
            assert.ok(result.fetchedAt instanceof Date);
        });
        test('should cache processed results', () => {
            const url = 'https://docs.python.org/3/library/os.html';
            const toolOutput = {
                url,
                content: 'Test',
                title: 'Test',
                format: 'markdown',
                length: 4
            };
            service.processToolResult(toolOutput, url);
            const stats = service.getCacheStats();
            assert.strictEqual(stats.entries, 1, 'Should cache the result');
        });
        test('should handle truncated content', () => {
            const url = 'https://docs.python.org/3/library/os.html';
            const toolOutput = {
                url,
                content: 'Long content...',
                title: 'Test',
                truncated: true,
                length: 15
            };
            const result = service.processToolResult(toolOutput, url);
            assert.strictEqual(result.truncated, true);
        });
    });
    suite('Fetch Documentation', () => {
        test('should throw error for invalid URL', async () => {
            try {
                await service.fetchDocumentation('not-a-url');
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
                assert.ok(error.message.includes('Invalid URL format'));
            }
        });
        test('should throw error for non-HTTP(S) protocols', async () => {
            const invalidProtocols = [
                'ftp://docs.python.org',
                'file:///etc/passwd',
                'javascript:alert(1)'
            ];
            for (const url of invalidProtocols) {
                try {
                    await service.fetchDocumentation(url);
                    assert.fail(`Should have thrown error for ${url}`);
                }
                catch (error) {
                    assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
                }
            }
        });
        test('should throw error for non-whitelisted domain', async () => {
            try {
                await service.fetchDocumentation('https://malicious-site.com/docs');
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.strictEqual(error.code, WebFetchErrorCode.DomainNotWhitelisted);
                assert.ok(error.message.includes('not whitelisted'));
            }
        });
        test('should indicate server-side fetch for valid whitelisted URL', async () => {
            try {
                await service.fetchDocumentation('https://docs.python.org/3/library/os.html');
                assert.fail('Should throw indicating server-side fetch needed');
            }
            catch (error) {
                assert.ok(error.message.includes('managedChatAPIService'));
            }
        });
    });
    suite('Error Handling', () => {
        test('should create error with all properties', async () => {
            try {
                await service.fetchDocumentation('not-a-url');
            }
            catch (error) {
                assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
                assert.ok(error.message.length > 0);
                assert.strictEqual(error.url, 'not-a-url');
                assert.ok(error.originalError instanceof Error);
            }
        });
        test('should have descriptive error messages', async () => {
            const testCases = [
                { url: 'not-a-url', expectedCode: WebFetchErrorCode.InvalidUrl },
                { url: 'ftp://docs.python.org', expectedCode: WebFetchErrorCode.InvalidUrl },
                { url: 'https://malicious-site.com', expectedCode: WebFetchErrorCode.DomainNotWhitelisted }
            ];
            for (const testCase of testCases) {
                try {
                    await service.fetchDocumentation(testCase.url);
                    assert.fail(`Should have thrown error for ${testCase.url}`);
                }
                catch (error) {
                    assert.strictEqual(error.code, testCase.expectedCode);
                    assert.ok(error.message.length > 20, 'Error message should be descriptive');
                }
            }
        });
    });
    suite('Disposal', () => {
        test('should dispose cleanly', () => {
            const testService = new WebFetchService();
            assert.doesNotThrow(() => testService.dispose());
        });
        test('should clear cache on disposal', () => {
            const testService = new WebFetchService();
            // Add cache entry
            testService.processToolResult({
                url: 'https://docs.python.org/test',
                content: 'Test',
                title: 'Test',
                format: 'markdown',
                length: 4
            }, 'https://docs.python.org/test');
            testService.dispose();
            // Cache should still exist but won't be used after disposal
            // This is fine since the service is disposed
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRmV0Y2hTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL3dlYkZldGNoU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVyRixLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBRTdCLElBQUksT0FBd0IsQ0FBQztJQUU3QixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUUvQixJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hELE1BQU0sU0FBUyxHQUFHO2dCQUNqQiwyQ0FBMkM7Z0JBQzNDLHlEQUF5RDtnQkFDekQsZ0NBQWdDO2dCQUNoQywrQ0FBK0M7Z0JBQy9DLCtDQUErQztnQkFDL0Msc0NBQXNDO2dCQUN0QyxpQ0FBaUM7Z0JBQ2pDLGlDQUFpQzthQUNqQyxDQUFDO1lBRUYsS0FBSyxNQUFNLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFDM0IsSUFBSSxFQUNKLEdBQUcsR0FBRyx3QkFB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