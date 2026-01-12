/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Integration tests for WebFetchService
 * Tests documentation fetching, caching, domain validation, and search functionality
 */
import * as assert from 'assert';
import { WebFetchService, WebFetchErrorCode } from '../../common/webFetchService.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
suite('WebFetchService - Integration Tests', () => {
    let webFetchService;
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
                assert.strictEqual(webFetchService.validateDomain(url), true, `Expected ${url} to be valid`);
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
                assert.strictEqual(webFetchService.validateDomain(url), false, `Expected ${url} to be invalid`);
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
                assert.strictEqual(webFetchService.validateDomain(site), true, `Expected ${site} to be whitelisted`);
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
            const results = await webFetchService.searchDocumentation('numpy array', ['numpy.org', 'docs.python.org']);
            assert.ok(results.length <= 2);
            assert.ok(results.every(r => r.domain === 'numpy.org' || r.domain === 'docs.python.org'));
        });
        test('should return empty array for empty query', async () => {
            const results = await webFetchService.searchDocumentation('');
            assert.strictEqual(results.length, 0);
        });
        test('should filter out non-whitelisted domains', async () => {
            const results = await webFetchService.searchDocumentation('test', ['evil-site.com', 'docs.python.org', 'malicious.net']);
            assert.ok(results.length <= 1);
            assert.ok(results.every(r => r.domain === 'docs.python.org'));
        });
        test('should generate correct Google search URLs', async () => {
            const results = await webFetchService.searchDocumentation('array manipulation', ['numpy.org']);
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
            }
            catch (error) {
                assert.strictEqual(error.code, WebFetchErrorCode.DomainNotWhitelisted);
                assert.ok(error.message.includes('not whitelisted'));
            }
        });
        test('should reject invalid URL format', async () => {
            try {
                await webFetchService.fetchDocumentation('not-a-url');
                assert.fail('Should have thrown error');
            }
            catch (error) {
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
                }
                catch (error) {
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
            }
            catch (error) {
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
                assert.strictEqual(webFetchService.validateDomain(url), true, `URL should be valid for managed API: ${url}`);
            }
        });
    });
    suite('Error Messages', () => {
        test('should provide helpful error messages', async () => {
            try {
                await webFetchService.fetchDocumentation('https://evil-site.com/docs');
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error.message.includes('not whitelisted'));
                assert.ok(error.message.includes('evil-site.com'));
            }
        });
        test('should include URL in error details', async () => {
            const testUrl = 'https://malicious.com/api';
            try {
                await webFetchService.fetchDocumentation(testUrl);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.strictEqual(error.url, testUrl);
            }
        });
    });
    suite('Security', () => {
        test('should block javascript protocol', async () => {
            try {
                await webFetchService.fetchDocumentation('javascript:alert(1)');
                assert.fail('Should have blocked javascript protocol');
            }
            catch (error) {
                assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
            }
        });
        test('should block file protocol', async () => {
            try {
                await webFetchService.fetchDocumentation('file:///etc/passwd');
                assert.fail('Should have blocked file protocol');
            }
            catch (error) {
                assert.strictEqual(error.code, WebFetchErrorCode.InvalidUrl);
            }
        });
        test('should block data URLs', async () => {
            try {
                await webFetchService.fetchDocumentation('data:text/html,<script>alert(1)</script>');
                assert.fail('Should have blocked data URL');
            }
            catch (error) {
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
                assert.strictEqual(webFetchService.validateDomain(domain), false, `Should reject untrusted domain: ${domain}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRmV0Y2hTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvaW50ZWdyYXRpb24vd2ViRmV0Y2hTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7OztHQUdHO0FBRUgsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLGVBQWUsRUFBb0IsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFckUsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUVqRCxJQUFJLGVBQWlDLENBQUM7SUFFdEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLElBQUksZUFBZSxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQzNDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBRS9CLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7WUFDaEQsTUFBTSxTQUFTLEdBQUc7Z0JBQ2pCLDJDQUEyQztnQkFDM0MseURBQXlEO2dCQUN6RCxnQ0FBZ0M7Z0JBQ2hDLCtDQUErQztnQkFDL0MsNkNBQTZDO2dCQUM3QyxnREFBZ0Q7YUFDaEQsQ0FBQztZQUVGLEtBQUssTUFBTSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGVBQWUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQ25DLElBQUksRUFDSixZQUFZLEdBQUcsY0FBYyxDQUM3QixDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtZQUNsRCxNQUFNLFdBQVcsR0FBRztnQkFDbkIsMEJBQTBCO2dCQUMxQixnQ0FBZ0M7Z0JBQ2hDLGtDQUFrQztnQkFDbEMsNEJBQTRCO2FBQzVCLENBQUM7WUFFRixLQUFLLE1BQU0sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUMvQixNQUFNLENBQUMsV0FBVyxDQUNqQixlQUFlLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUNuQyxLQUFLLEVBQ0wsWUFBWSxHQUFHLGdCQUFnQixDQUMvQixDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtZQUNwRCxNQUFNLGFBQWEsR0FBRztnQkFDckIsV0FBVztnQkFDWCx1QkFBdUI7Z0JBQ3ZCLHFCQUFxQjtnQkFDckIsRUFBRTthQUNGLENBQUM7WUFFRixLQUFLLE1BQU0sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtZQUN6RCxNQUFNLGtCQUFrQixHQUFHO2dCQUMxQix5QkFBeUI7Z0JBQ3pCLG1CQUFtQjtnQkFDbkIsMkJBQTJCO2dCQUMzQix3QkFBd0I7Z0JBQ3hCLDBCQUEwQjtnQkFDMUIscUJBQXFCO2dCQUNyQix3QkFBd0I7Z0JBQ3hCLCtCQUErQjtnQkFDL0Isb0JBQW9CO2dCQUNwQixxQkFBcUI7Z0JBQ3JCLG1CQUFtQjtnQkFDbkIsb0JBQW9CO2dCQUNwQixnQ0FBZ0M7Z0JBQ2hDLG1DQUFtQztnQkFDbkMsOEJBQThCO2dCQUM5Qix5QkFBeUI7Z0JBQ3pCLHVCQUF1QjtnQkFDdkIsNkJBQTZCO2dCQUM3QiwwQkFBMEI7Z0JBQzFCLDRCQUE0QjtnQkFDNUIseUJBQXlCO2dCQUN6QixtQkFBbUI7Z0JBQ25CLDRCQUE0QjtnQkFDNUIsNkJBQTZCO2dCQUM3Qix3QkFBd0I7Z0JBQ3hCLDRCQUE0QjthQUM1QixDQUFDO1lBRUYsS0FBSyxNQUFNLElBQUksSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dCQUN2QyxNQUFNLENBQUMsV0FBVyxDQUNqQixlQUFlLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUNwQyxJQUFJLEVBQ0osWUFBWSxJQUFJLG9CQUFvQixDQUNwQyxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBRXRDLElBQUksQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7WUFDL0QsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFFeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztZQUNyRCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtZQUNqRCxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUN6RCxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUV6RCxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztZQUVsRSxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFakMsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDekQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBRWxDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMvRCxNQUFNLE9BQU8sR0FBRyxNQUFNLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUV6RSxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDOUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBRTVELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QixNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pELE1BQU0sT0FBTyxHQUFHLE1BQU0sZUFBZSxDQUFDLG1CQUFtQixDQUN4RCxhQUFhLEVBQ2IsQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FDaEMsQ0FBQztZQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUMzRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCxNQUFNLE9BQU8sR0FBRyxNQUFNLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUU5RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxlQUFlLENBQUMsbUJBQW1CLENBQ3hELE1BQU0sRUFDTixDQUFDLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FDckQsQ0FBQztZQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUMvRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxNQUFNLE9BQU8sR0FBRyxNQUFNLGVBQWUsQ0FBQyxtQkFBbUIsQ0FDeEQsb0JBQW9CLEVBQ3BCLENBQUMsV0FBVyxDQUFDLENBQ2IsQ0FBQztZQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFDM0UsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFFakMsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3ZELElBQUksQ0FBQztnQkFDSixNQUFNLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO2dCQUN2RSxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDekMsQ0FBQztZQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUN2RSxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztZQUN0RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbkQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sZUFBZSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUN0RCxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDekMsQ0FBQztZQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM5RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbkQsTUFBTSxnQkFBZ0IsR0FBRztnQkFDeEIsa0NBQWtDO2dCQUNsQyxvQkFBb0I7Z0JBQ3BCLHFCQUFxQjthQUNyQixDQUFDO1lBRUYsS0FBSyxNQUFNLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUM7b0JBQ0osTUFBTSxlQUFlLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzlDLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLENBQUM7Z0JBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztvQkFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM5RCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2xFLGdFQUFnRTtZQUNoRSx5Q0FBeUM7WUFDekMsSUFBSSxDQUFDO2dCQUNKLE1BQU0sZUFBZSxDQUFDLGtCQUFrQixDQUFDLDJDQUEyQyxDQUFDLENBQUM7Z0JBQ3RGLE1BQU0sQ0FBQyxJQUFJLENBQUMsNERBQTRELENBQUMsQ0FBQztZQUMzRSxDQUFDO1lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7WUFDNUQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBRTlCLElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7WUFDMUMsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1lBQy9DLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUU3QixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtZQUMvQyxNQUFNLEdBQUcsR0FBRywyQ0FBMkMsQ0FBQztZQUV4RCxlQUFlLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRWhDLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBRXpCLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7WUFDdkQsTUFBTSxNQUFNLEdBQUcsZUFBZSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7WUFDekQsTUFBTSxNQUFNLEdBQUcsZUFBZSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBRS9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDdkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2pGLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM3RSxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1lBQ3ZELE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvRSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFFekIsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtZQUM5QyxNQUFNLElBQUksR0FBRztnQkFDWiwyQ0FBMkM7Z0JBQzNDLG1FQUFtRTtnQkFDbkUscUVBQXFFO2FBQ3JFLENBQUM7WUFFRixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0QsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtZQUNyRCxNQUFNLEdBQUcsR0FBRyx1RUFBdUUsQ0FBQztZQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0QsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1lBQzlDLE1BQU0sR0FBRyxHQUFHLCtFQUErRSxDQUFDO1lBQzVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7WUFDMUMsMkNBQTJDO1lBQzNDLE1BQU0sR0FBRyxHQUFHLCtDQUErQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUUvQyxJQUFJLENBQUMsd0RBQXdELEVBQUUsR0FBRyxFQUFFO1lBQ25FLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUUvQyxxRUFBcUU7WUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLEtBQUssUUFBUSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN4RCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywwREFBMEQsRUFBRSxHQUFHLEVBQUU7WUFDckUsNERBQTREO1lBQzVELE1BQU0sV0FBVyxHQUFHO2dCQUNuQiwyREFBMkQ7Z0JBQzNELHFEQUFxRDtnQkFDckQsZ0RBQWdEO2FBQ2hELENBQUM7WUFFRixLQUFLLE1BQU0sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUMvQixNQUFNLENBQUMsV0FBVyxDQUNqQixlQUFlLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUNuQyxJQUFJLEVBQ0osd0NBQXdDLEdBQUcsRUFBRSxDQUM3QyxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBRTVCLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN4RCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxlQUFlLENBQUMsa0JBQWtCLENBQUMsNEJBQTRCLENBQUMsQ0FBQztnQkFDdkUsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7WUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO2dCQUNyQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQ3BELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN0RCxNQUFNLE9BQU8sR0FBRywyQkFBMkIsQ0FBQztZQUU1QyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxlQUFlLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3hDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFFdEIsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ25ELElBQUksQ0FBQztnQkFDSixNQUFNLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNoRSxNQUFNLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7WUFDeEQsQ0FBQztZQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM5RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0MsSUFBSSxDQUFDO2dCQUNKLE1BQU0sZUFBZSxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQy9ELE1BQU0sQ0FBQyxJQUFJLENBQUMsbUNBQW1DLENBQUMsQ0FBQztZQUNsRCxDQUFDO1lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN6QyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxlQUFlLENBQUMsa0JBQWtCLENBQUMsMENBQTBDLENBQUMsQ0FBQztnQkFDckYsTUFBTSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQzdDLENBQUM7WUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO2dCQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDOUQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtZQUM1RCxNQUFNLGdCQUFnQixHQUFHO2dCQUN4Qix5QkFBeUI7Z0JBQ3pCLDRCQUE0QjtnQkFDNUIsMEJBQTBCO2FBQzFCLENBQUM7WUFFRixLQUFLLE1BQU0sTUFBTSxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQ3RDLEtBQUssRUFDTCxtQ0FBbUMsTUFBTSxFQUFFLENBQzNDLENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFFNUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtZQUM1QyxNQUFNLGFBQWEsR0FBRztnQkFDckIseUJBQXlCO2dCQUN6QixtQkFBbUI7Z0JBQ25CLDJCQUEyQjtnQkFDM0Isd0JBQXdCO2dCQUN4QiwwQkFBMEI7Z0JBQzFCLHFCQUFxQjtnQkFDckIsd0JBQXdCO2FBQ3hCLENBQUM7WUFFRixLQUFLLE1BQU0sTUFBTSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtZQUNoRCxNQUFNLFNBQVMsR0FBRztnQkFDakIsK0JBQStCO2dCQUMvQixvQkFBb0I7Z0JBQ3BCLHFCQUFxQjtnQkFDckIsbUJBQW1CO2dCQUNuQixvQkFBb0I7Z0JBQ3BCLG9CQUFvQjthQUNwQixDQUFDO1lBRUYsS0FBSyxNQUFNLE1BQU0sSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2xFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7WUFDOUMsTUFBTSxjQUFjLEdBQUc7Z0JBQ3RCLGdDQUFnQztnQkFDaEMsbUNBQW1DO2dCQUNuQyw4QkFBOEI7Z0JBQzlCLHVCQUF1QjtnQkFDdkIsb0JBQW9CO2FBQ3BCLENBQUM7WUFFRixLQUFLLE1BQU0sTUFBTSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtZQUMzQyxNQUFNLFlBQVksR0FBRztnQkFDcEIsNkJBQTZCO2dCQUM3QiwwQkFBMEI7Z0JBQzFCLDZCQUE2QjtnQkFDN0IseUJBQXlCO2dCQUN6Qix1QkFBdUI7YUFDdkIsQ0FBQztZQUVGLEtBQUssTUFBTSxNQUFNLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsRSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1lBQy9DLE1BQU0sU0FBUyxHQUFHO2dCQUNqQiw0QkFBNEI7Z0JBQzVCLDZCQUE2QjtnQkFDN0Isd0JBQXdCO2dCQUN4Qix3QkFBd0I7Z0JBQ3hCLDRCQUE0QjthQUM1QixDQUFDO1lBRUYsS0FBSyxNQUFNLE1BQU0sSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2xFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==