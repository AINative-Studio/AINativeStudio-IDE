/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Integration tests for WebFetchService
 * Tests documentation fetching, caching, domain validation, and search functionality
 */

import * as assert from 'assert';
import { WebFetchService, IWebFetchService, WebFetchErrorCode } from '../../common/webFetchService.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';

suite('WebFetchService - Integration Tests', () => {

	let webFetchService: IWebFetchService;

	setup(() => {
		webFetchService = new WebFetchService();
	});

	teardown(() => {
		if (webFetchService instanceof Disposable) {
			webFetchService.dispose();
		}
	});

	suite('Domain Validation', () => {

		test('should validate whitelisted domains', () => {
			const validUrls = [
				'https://docs.python.org/3/library/os.html',
				'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
				'https://nodejs.org/api/fs.html',
				'https://reactjs.org/docs/getting-started.html',
				'https://docs.anthropic.com/claude/reference',
				'https://platform.openai.com/docs/api-reference'
			];

			for (const url of validUrls) {
				assert.strictEqual(
					webFetchService.validateDomain(url),
					true,
					`Expected ${url} to be valid`
				);
			}
		});

		test('should reject non-whitelisted domains', () => {
			const invalidUrls = [
				'https://example.com/docs',
				'https://malicious-site.com/api',
				'https://random-blog.net/tutorial',
				'http://localhost:3000/docs'
			];

			for (const url of invalidUrls) {
				assert.strictEqual(
					webFetchService.validateDomain(url),
					false,
					`Expected ${url} to be invalid`
				);
			}
		});

		test('should handle malformed URLs gracefully', () => {
			const malformedUrls = [
				'not-a-url',
				'ftp://docs.python.org',
				'javascript:alert(1)',
				''
			];

			for (const url of malformedUrls) {
				assert.strictEqual(webFetchService.validateDomain(url), false);
			}
		});

		test('should support all major documentation sites', () => {
			const documentationSites = [
				'https://docs.python.org',
				'https://numpy.org',
				'https://pandas.pydata.org',
				'https://matplotlib.org',
				'https://scikit-learn.org',
				'https://pytorch.org',
				'https://tensorflow.org',
				'https://developer.mozilla.org',
				'https://nodejs.org',
				'https://reactjs.org',
				'https://vuejs.org',
				'https://angular.io',
				'https://docs.djangoproject.com',
				'https://flask.palletsprojects.com',
				'https://fastapi.tiangolo.com',
				'https://docs.docker.com',
				'https://kubernetes.io',
				'https://docs.aws.amazon.com',
				'https://cloud.google.com',
				'https://docs.microsoft.com',
				'https://docs.github.com',
				'https://strapi.io',
				'https://docs.anthropic.com',
				'https://platform.openai.com',
				'https://huggingface.co',
				'https://docs.langchain.com'
			];

			for (const site of documentationSites) {
				assert.strictEqual(
					webFetchService.validateDomain(site),
					true,
					`Expected ${site} to be whitelisted`
				);
			}
		});
	});

	suite('Whitelisted Domains List', () => {

		test('should return complete list of whitelisted domains', () => {
			const domains = webFetchService.getWhitelistedDomains();

			assert.ok(Array.isArray(domains));
			assert.ok(domains.length > 50, 'Should have 60+ whitelisted domains');
			assert.ok(domains.includes('docs.python.org'));
			assert.ok(domains.includes('developer.mozilla.org'));
			assert.ok(domains.includes('docs.anthropic.com'));
		});

		test('should not mutate internal whitelist', () => {
			const domains1 = webFetchService.getWhitelistedDomains();
			const domains2 = webFetchService.getWhitelistedDomains();

			assert.notStrictEqual(domains1, domains2, 'Should return a copy');

			domains1.push('evil-domain.com');

			const domains3 = webFetchService.getWhitelistedDomains();
			assert.ok(!domains3.includes('evil-domain.com'));
		});
	});

	suite('Documentation Search', () => {

		test('should generate search suggestions for query', async () => {
			const results = await webFetchService.searchDocumentation('react hooks');

			assert.ok(Array.isArray(results));
			assert.ok(results.length > 0);
			assert.ok(results.length <= 5, 'Should limit to 5 results');

			const firstResult = results[0];
			assert.ok(firstResult.domain);
			assert.ok(firstResult.suggested_search_url);
			assert.ok(firstResult.direct_url);
			assert.ok(firstResult.suggested_search_url.includes('react%20hooks'));
		});

		test('should search specific domains', async () => {
			const results = await webFetchService.searchDocumentation(
				'numpy array',
				['numpy.org', 'docs.python.org']
			);

			assert.ok(results.length <= 2);
			assert.ok(results.every(r => r.domain === 'numpy.org' || r.domain === 'docs.python.org'));
		});

		test('should return empty array for empty query', async () => {
			const results = await webFetchService.searchDocumentation('');

			assert.strictEqual(results.length, 0);
		});

		test('should filter out non-whitelisted domains', async () => {
			const results = await webFetchService.searchDocumentation(
				'test',
				['evil-site.com', 'docs.python.org', 'malicious.net']
			);

			assert.ok(results.length <= 1);
			assert.ok(results.every(r => r.domain === 'docs.python.org'));
		});

		test('should generate correct Google search URLs', async () => {
			const results = await webFetchService.searchDocumentation(
				'array manipulation',
				['numpy.org']
			);

			assert.strictEqual(results.length, 1);
			assert.ok(results[0].suggested_search_url.includes('site:numpy.org'));
			assert.ok(results[0].suggested_search_url.includes('array+manipulation'));
		});
	});

	suite('Fetch Documentation', () => {

		test('should reject non-whitelisted domain', async () => {
			try {
				await webFetchService.fetchDocumentation('https://evil-site.com/docs');
				assert.fail('Should have thrown error');
			} catch (error: any) {
				assert.strictEqual(error.code, WebFetchErrorCode.DomainNotWhitelisted);
				assert.ok(error.message.includes('not whitelisted'));
			}
		});

		test('should reject invalid URL format', async () => {
			try {
				await webFetchService.fetchDocumentation('not-a-url');
				assert.fail('Should have thrown error');
			} catch (error: any) {
				assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
			}
		});

		test('should reject non-HTTP protocols', async () => {
			const invalidProtocols = [
				'ftp://docs.python.org/index.html',
				'file:///etc/passwd',
				'javascript:alert(1)'
			];

			for (const url of invalidProtocols) {
				try {
					await webFetchService.fetchDocumentation(url);
					assert.fail(`Should have rejected ${url}`);
				} catch (error: any) {
					assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
				}
			}
		});

		test('should validate whitelisted domain before fetch', async () => {
			// This should pass validation but throw because actual fetching
			// must be done via managedChatAPIService
			try {
				await webFetchService.fetchDocumentation('https://docs.python.org/3/library/os.html');
				assert.fail('Should have thrown error about using managedChatAPIService');
			} catch (error: any) {
				assert.ok(error.message.includes('managedChatAPIService'));
			}
		});
	});

	suite('Cache Management', () => {

		test('should start with empty cache', () => {
			const stats = webFetchService.getCacheStats();

			assert.strictEqual(stats.entries, 0);
			assert.strictEqual(stats.size, 0);
		});

		test('should allow clearing entire cache', () => {
			webFetchService.clearCache();

			const stats = webFetchService.getCacheStats();
			assert.strictEqual(stats.entries, 0);
		});

		test('should allow clearing specific URL', () => {
			const url = 'https://docs.python.org/3/library/os.html';

			webFetchService.clearCache(url);

			const stats = webFetchService.getCacheStats();
			assert.strictEqual(stats.entries, 0);
		});
	});

	suite('Tool Schema', () => {

		test('should provide correct tool schema for LLM', () => {
			const schema = webFetchService.getToolSchema();

			assert.strictEqual(schema.name, 'web_fetch');
			assert.ok(schema.description);
			assert.strictEqual(schema.input_schema.type, 'object');
			assert.ok(schema.input_schema.properties.url);
			assert.ok(schema.input_schema.required.includes('url'));
		});

		test('should include parse_format option in schema', () => {
			const schema = webFetchService.getToolSchema();

			assert.ok(schema.input_schema.properties.parse_format);
			assert.ok(schema.input_schema.properties.parse_format.enum);
			assert.ok(schema.input_schema.properties.parse_format.enum.includes('markdown'));
			assert.ok(schema.input_schema.properties.parse_format.enum.includes('html'));
			assert.ok(schema.input_schema.properties.parse_format.enum.includes('text'));
		});

		test('should include max_length option in schema', () => {
			const schema = webFetchService.getToolSchema();

			assert.ok(schema.input_schema.properties.max_length);
			assert.strictEqual(schema.input_schema.properties.max_length.type, 'integer');
		});
	});

	suite('URL Parsing', () => {

		test('should correctly parse valid URLs', () => {
			const urls = [
				'https://docs.python.org/3/library/os.html',
				'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference',
				'https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback'
			];

			for (const url of urls) {
				assert.strictEqual(webFetchService.validateDomain(url), true);
			}
		});

		test('should handle URLs with query parameters', () => {
			const url = 'https://docs.python.org/3/library/os.html?highlight=path#os.path.join';
			assert.strictEqual(webFetchService.validateDomain(url), true);
		});

		test('should handle URLs with fragments', () => {
			const url = 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API#concepts_and_usage';
			assert.strictEqual(webFetchService.validateDomain(url), true);
		});

		test('should handle URLs with ports', () => {
			// Port should be preserved in domain check
			const url = 'https://docs.python.org:443/3/library/os.html';
			assert.strictEqual(webFetchService.validateDomain(url), true);
		});
	});

	suite('Integration with Managed Chat API', () => {

		test('should provide tool schema compatible with managed API', () => {
			const schema = webFetchService.getToolSchema();

			// Verify schema structure matches what managedChatAPIService expects
			assert.strictEqual(typeof schema.name, 'string');
			assert.strictEqual(typeof schema.description, 'string');
			assert.strictEqual(schema.input_schema.type, 'object');
			assert.ok(typeof schema.input_schema.properties === 'object');
			assert.ok(Array.isArray(schema.input_schema.required));
		});

		test('should validate domains that will be sent to managed API', () => {
			// All these should pass validation before being sent to API
			const urlsToFetch = [
				'https://docs.anthropic.com/claude/reference/messages_post',
				'https://platform.openai.com/docs/api-reference/chat',
				'https://docs.python.org/3/library/asyncio.html'
			];

			for (const url of urlsToFetch) {
				assert.strictEqual(
					webFetchService.validateDomain(url),
					true,
					`URL should be valid for managed API: ${url}`
				);
			}
		});
	});

	suite('Error Messages', () => {

		test('should provide helpful error messages', async () => {
			try {
				await webFetchService.fetchDocumentation('https://evil-site.com/docs');
				assert.fail('Should have thrown error');
			} catch (error: any) {
				assert.ok(error.message.includes('not whitelisted'));
				assert.ok(error.message.includes('evil-site.com'));
			}
		});

		test('should include URL in error details', async () => {
			const testUrl = 'https://malicious.com/api';

			try {
				await webFetchService.fetchDocumentation(testUrl);
				assert.fail('Should have thrown error');
			} catch (error: any) {
				assert.strictEqual(error.url, testUrl);
			}
		});
	});

	suite('Security', () => {

		test('should block javascript protocol', async () => {
			try {
				await webFetchService.fetchDocumentation('javascript:alert(1)');
				assert.fail('Should have blocked javascript protocol');
			} catch (error: any) {
				assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
			}
		});

		test('should block file protocol', async () => {
			try {
				await webFetchService.fetchDocumentation('file:///etc/passwd');
				assert.fail('Should have blocked file protocol');
			} catch (error: any) {
				assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
			}
		});

		test('should block data URLs', async () => {
			try {
				await webFetchService.fetchDocumentation('data:text/html,<script>alert(1)</script>');
				assert.fail('Should have blocked data URL');
			} catch (error: any) {
				assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
			}
		});

		test('should only allow trusted documentation domains', () => {
			const untrustedDomains = [
				'https://random-blog.com',
				'https://untrusted-site.net',
				'https://malware-site.com'
			];

			for (const domain of untrustedDomains) {
				assert.strictEqual(
					webFetchService.validateDomain(domain),
					false,
					`Should reject untrusted domain: ${domain}`
				);
			}
		});
	});

	suite('Documentation Sources Coverage', () => {

		test('should support Python ecosystem', () => {
			const pythonSources = [
				'https://docs.python.org',
				'https://numpy.org',
				'https://pandas.pydata.org',
				'https://matplotlib.org',
				'https://scikit-learn.org',
				'https://pytorch.org',
				'https://tensorflow.org'
			];

			for (const source of pythonSources) {
				assert.strictEqual(webFetchService.validateDomain(source), true);
			}
		});

		test('should support JavaScript ecosystem', () => {
			const jsSources = [
				'https://developer.mozilla.org',
				'https://nodejs.org',
				'https://reactjs.org',
				'https://vuejs.org',
				'https://angular.io',
				'https://nextjs.org'
			];

			for (const source of jsSources) {
				assert.strictEqual(webFetchService.validateDomain(source), true);
			}
		});

		test('should support backend frameworks', () => {
			const backendSources = [
				'https://docs.djangoproject.com',
				'https://flask.palletsprojects.com',
				'https://fastapi.tiangolo.com',
				'https://expressjs.com',
				'https://nestjs.com'
			];

			for (const source of backendSources) {
				assert.strictEqual(webFetchService.validateDomain(source), true);
			}
		});

		test('should support cloud providers', () => {
			const cloudSources = [
				'https://docs.aws.amazon.com',
				'https://cloud.google.com',
				'https://learn.microsoft.com',
				'https://docs.docker.com',
				'https://kubernetes.io'
			];

			for (const source of cloudSources) {
				assert.strictEqual(webFetchService.validateDomain(source), true);
			}
		});

		test('should support AI/ML documentation', () => {
			const aiSources = [
				'https://docs.anthropic.com',
				'https://platform.openai.com',
				'https://docs.cohere.ai',
				'https://huggingface.co',
				'https://docs.langchain.com'
			];

			for (const source of aiSources) {
				assert.strictEqual(webFetchService.validateDomain(source), true);
			}
		});
	});
});
