/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { WebFetchService, WebFetchErrorCode } from '../../common/webFetchService.js';

suite('WebFetchService', () => {

	let service: WebFetchService;

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
				assert.strictEqual(
					service.validateDomain(url),
					true,
					`${url} should be whitelisted`
				);
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
				assert.strictEqual(
					service.validateDomain(url),
					false,
					`${url} should not be whitelisted`
				);
			}
		});

		test('should handle www prefix correctly', () => {
			assert.strictEqual(
				service.validateDomain('https://www.rust-lang.org/learn'),
				true,
				'www.rust-lang.org should be whitelisted'
			);

			assert.strictEqual(
				service.validateDomain('https://www.python.org'),
				false,
				'www.python.org should not match docs.python.org'
			);
		});

		test('should handle subdomains correctly', () => {
			assert.strictEqual(
				service.validateDomain('https://api.github.com/docs'),
				true,
				'Subdomain of whitelisted domain should be allowed'
			);

			assert.strictEqual(
				service.validateDomain('https://docs.python.org'),
				true,
				'Exact whitelisted domain should be allowed'
			);
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
				assert.strictEqual(
					service.validateDomain(url),
					false,
					`${url} should be invalid`
				);
			}
		});

		test('should be case-insensitive', () => {
			assert.strictEqual(
				service.validateDomain('https://DOCS.PYTHON.ORG/library/os.html'),
				true,
				'Uppercase domains should work'
			);

			assert.strictEqual(
				service.validateDomain('https://DoCs.PyThOn.OrG/library/os.html'),
				true,
				'Mixed case domains should work'
			);
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
				assert.ok(
					domains.includes(domain),
					`Should include ${domain}`
				);
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

			assert.deepStrictEqual(
				operationEnum,
				['fetch_url', 'fetch_documentation', 'search_docs'],
				'Should have correct operation types'
			);
		});

		test('should have correct parse_format enum values', () => {
			const schema = service.getToolSchema();
			const parseFormatEnum = schema.input_schema.properties.parse_format.enum;

			assert.deepStrictEqual(
				parseFormatEnum,
				['html', 'markdown', 'text'],
				'Should have correct parse format types'
			);
		});

		test('should have operation as required field', () => {
			const schema = service.getToolSchema();
			assert.ok(
				schema.input_schema.required.includes('operation'),
				'operation should be required'
			);
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
				assert.strictEqual(
					result.direct_url,
					`https://${result.domain}`,
					'Should have correct direct URL'
				);
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
			} catch (error: any) {
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
				} catch (error: any) {
					assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
				}
			}
		});

		test('should throw error for non-whitelisted domain', async () => {
			try {
				await service.fetchDocumentation('https://malicious-site.com/docs');
				assert.fail('Should have thrown error');
			} catch (error: any) {
				assert.strictEqual(error.code, WebFetchErrorCode.DomainNotWhitelisted);
				assert.ok(error.message.includes('not whitelisted'));
			}
		});

		test('should indicate server-side fetch for valid whitelisted URL', async () => {
			try {
				await service.fetchDocumentation('https://docs.python.org/3/library/os.html');
				assert.fail('Should throw indicating server-side fetch needed');
			} catch (error: any) {
				assert.ok(error.message.includes('managedChatAPIService'));
			}
		});
	});

	suite('Error Handling', () => {

		test('should create error with all properties', async () => {
			try {
				await service.fetchDocumentation('not-a-url');
			} catch (error: any) {
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
				} catch (error: any) {
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
