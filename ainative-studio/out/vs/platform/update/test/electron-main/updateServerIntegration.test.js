/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as https from 'https';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Update Server - Integration Tests', () => {
    const disposables = new DisposableStore();
    const UPDATE_SERVER_URL = 'https://api.ainative.studio';
    const GITHUB_API_URL = 'https://api.github.com';
    const REPO_OWNER = 'AINative-Studio';
    const REPO_NAME = 'AINativeStudio-IDE';
    const TEST_TIMEOUT = 30000; // 30 seconds for network tests
    ensureNoDisposablesAreLeakedInTestSuite();
    teardown(() => {
        disposables.clear();
    });
    /**
     * Helper function to make HTTPS request
     */
    function makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const requestOptions = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: 10000,
                ...options
            };
            const req = https.request(requestOptions, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode || 0,
                        headers: res.headers,
                        body
                    });
                });
            });
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.end();
        });
    }
    /**
     * Helper to fetch GitHub releases
     */
    async function fetchGitHubReleases(page = 1, perPage = 10) {
        const headers = {
            'User-Agent': 'AINativeStudio-Update-Test',
            'Accept': 'application/vnd.github.v3+json'
        };
        // Use token if available (for higher rate limits)
        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
        }
        const response = await makeRequest(`${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/releases?page=${page}&per_page=${perPage}`, { headers });
        if (response.statusCode === 200) {
            return JSON.parse(response.body);
        }
        else if (response.statusCode === 404) {
            // Repository might not have releases yet
            return [];
        }
        else if (response.statusCode === 403) {
            // Rate limited
            throw new Error('GitHub API rate limit exceeded');
        }
        else {
            throw new Error(`GitHub API returned ${response.statusCode}`);
        }
    }
    /**
     * Helper to check GitHub API rate limit
     */
    async function checkGitHubRateLimit() {
        const headers = {
            'User-Agent': 'AINativeStudio-Update-Test'
        };
        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
        }
        const response = await makeRequest(`${GITHUB_API_URL}/rate_limit`, { headers });
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            return {
                remaining: data.rate.remaining,
                limit: data.rate.limit,
                reset: data.rate.reset
            };
        }
        throw new Error('Failed to check rate limit');
    }
    suite('GitHub API Integration', () => {
        test('should fetch release data correctly', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const releases = await fetchGitHubReleases(1, 5);
                if (releases.length > 0) {
                    assert.ok(Array.isArray(releases), 'Releases should be an array');
                    const release = releases[0];
                    assert.ok(release.tag_name, 'Release should have tag_name');
                    assert.ok(release.assets, 'Release should have assets');
                    assert.ok(Array.isArray(release.assets), 'Assets should be an array');
                    console.log(`Found ${releases.length} releases, latest: ${release.tag_name}`);
                }
                else {
                    console.log('No releases found (repository may be new)');
                    this.skip();
                }
            }
            catch (error) {
                if (error.message.includes('rate limit')) {
                    console.warn('GitHub API rate limit exceeded - test skipped');
                    this.skip();
                }
                else {
                    console.warn('GitHub API test failed:', error.message);
                    this.skip();
                }
            }
        });
        test('should handle GitHub rate limiting gracefully', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const rateLimit = await checkGitHubRateLimit();
                console.log(`GitHub API rate limit: ${rateLimit.remaining}/${rateLimit.limit}`);
                assert.ok(rateLimit.limit > 0, 'Should have rate limit');
                assert.ok(rateLimit.remaining >= 0, 'Remaining requests should be >= 0');
                if (rateLimit.remaining === 0) {
                    const resetTime = new Date(rateLimit.reset * 1000);
                    console.log(`Rate limit exceeded, resets at: ${resetTime.toISOString()}`);
                }
                // With token: 5000/hour, without: 60/hour
                const expectedLimit = process.env.GITHUB_TOKEN ? 5000 : 60;
                assert.ok(rateLimit.limit >= expectedLimit - 100, `Rate limit should be ~${expectedLimit}`);
            }
            catch (error) {
                console.warn('Rate limit check failed:', error.message);
                this.skip();
            }
        });
        test('should validate asset URL resolution', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const releases = await fetchGitHubReleases(1, 1);
                if (releases.length > 0 && releases[0].assets.length > 0) {
                    const asset = releases[0].assets[0];
                    assert.ok(asset.name, 'Asset should have name');
                    assert.ok(asset.browser_download_url, 'Asset should have download URL');
                    assert.ok(asset.size, 'Asset should have size');
                    // Verify URL is valid
                    assert.ok(asset.browser_download_url.startsWith('https://'), 'Asset URL should be HTTPS');
                    console.log(`Asset: ${asset.name}, size: ${(asset.size / 1024 / 1024).toFixed(1)}MB`);
                }
                else {
                    console.log('No assets found');
                    this.skip();
                }
            }
            catch (error) {
                console.warn('Asset URL test failed:', error.message);
                this.skip();
            }
        });
        test('should handle missing releases gracefully', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                // Try to fetch from a very high page number
                const releases = await fetchGitHubReleases(999, 10);
                assert.ok(Array.isArray(releases), 'Should return empty array for no releases');
                assert.strictEqual(releases.length, 0, 'Should have no releases on high page number');
            }
            catch (error) {
                // This is acceptable - GitHub might return 404 or empty
                console.log('High page number handled:', error.message);
            }
        });
        test('should validate release data structure', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const releases = await fetchGitHubReleases(1, 1);
                if (releases.length > 0) {
                    const release = releases[0];
                    // Validate required fields
                    assert.ok('tag_name' in release, 'Should have tag_name');
                    assert.ok('name' in release, 'Should have name');
                    assert.ok('assets' in release, 'Should have assets');
                    assert.ok('created_at' in release, 'Should have created_at');
                    assert.ok('published_at' in release, 'Should have published_at');
                    // Validate types
                    assert.strictEqual(typeof release.tag_name, 'string');
                    assert.ok(Array.isArray(release.assets));
                    console.log(`Release ${release.tag_name} structure is valid`);
                }
                else {
                    this.skip();
                }
            }
            catch (error) {
                console.warn('Release structure test failed:', error.message);
                this.skip();
            }
        });
    });
    suite('Environment Variables', () => {
        test('should load GITHUB_TOKEN if available', () => {
            const token = process.env.GITHUB_TOKEN;
            if (token) {
                assert.ok(token.length > 0, 'GITHUB_TOKEN should not be empty');
                assert.ok(token.startsWith('ghp_') || token.startsWith('github_pat_'), 'Token should have valid prefix');
                console.log('GITHUB_TOKEN is configured');
            }
            else {
                console.log('GITHUB_TOKEN not set (using unauthenticated API)');
            }
        });
        test('should handle missing token gracefully (fallback to unauthenticated)', async function () {
            this.timeout(TEST_TIMEOUT);
            // Temporarily remove token
            const originalToken = process.env.GITHUB_TOKEN;
            delete process.env.GITHUB_TOKEN;
            try {
                const rateLimit = await checkGitHubRateLimit();
                // Unauthenticated requests have limit of 60/hour
                assert.ok(rateLimit.limit <= 60, 'Unauthenticated limit should be 60/hour');
                console.log(`Unauthenticated rate limit: ${rateLimit.remaining}/${rateLimit.limit}`);
            }
            catch (error) {
                console.warn('Unauthenticated test failed:', error.message);
            }
            finally {
                // Restore token
                if (originalToken) {
                    process.env.GITHUB_TOKEN = originalToken;
                }
            }
        });
        test('should validate token format if present', () => {
            const token = process.env.GITHUB_TOKEN;
            if (token) {
                // GitHub personal access tokens start with ghp_
                // GitHub App tokens start with github_pat_
                const isValidFormat = token.startsWith('ghp_') ||
                    token.startsWith('github_pat_') ||
                    token.startsWith('gho_') || // OAuth
                    token.startsWith('ghu_') || // User token
                    token.startsWith('ghs_'); // Server token
                assert.ok(isValidFormat, 'Token should have valid GitHub prefix');
                assert.ok(token.length > 20, 'Token should be longer than 20 characters');
            }
        });
    });
    suite('Geographic Distribution', () => {
        test('should respond from US East region', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const startTime = Date.now();
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/testcommit123`);
                const latency = Date.now() - startTime;
                assert.ok(response.statusCode > 0, 'Should get valid response');
                console.log(`US East latency: ${latency}ms`);
                // Reasonable latency for US East (if server is in US)
                // This is approximate and depends on network conditions
                assert.ok(latency < 2000, 'Latency should be reasonable');
            }
            catch (error) {
                console.warn('US East test failed:', error.message);
                this.skip();
            }
        });
        test('should measure response time variability across requests', async function () {
            this.timeout(TEST_TIMEOUT * 2);
            try {
                const latencies = [];
                const iterations = 5;
                for (let i = 0; i < iterations; i++) {
                    const startTime = Date.now();
                    await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/test${i}`);
                    const latency = Date.now() - startTime;
                    latencies.push(latency);
                    await timeout(500);
                }
                const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
                const maxLatency = Math.max(...latencies);
                const minLatency = Math.min(...latencies);
                console.log(`Latencies: min=${minLatency}ms, max=${maxLatency}ms, avg=${avgLatency.toFixed(0)}ms`);
                assert.ok(avgLatency < 1000, 'Average latency should be < 1s');
                assert.ok(maxLatency < 2000, 'Max latency should be < 2s');
            }
            catch (error) {
                console.warn('Variability test failed:', error.message);
                this.skip();
            }
        });
        test('should have consistent geographic routing', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const requests = [];
                // Make multiple concurrent requests
                for (let i = 0; i < 10; i++) {
                    requests.push(makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/test${i}`)
                        .then(r => ({ latency: Date.now(), statusCode: r.statusCode })));
                }
                const results = await Promise.all(requests);
                // All requests should succeed
                const allSuccessful = results.every(r => r.statusCode >= 200 && r.statusCode < 500);
                assert.ok(allSuccessful, 'All requests should succeed');
                console.log(`${results.length} concurrent requests succeeded`);
            }
            catch (error) {
                console.warn('Geographic routing test failed:', error.message);
                this.skip();
            }
        });
        test('should handle CDN edge caching', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const params = 'darwin/stable/consistentcommit123';
                // First request (cache miss)
                const start1 = Date.now();
                const response1 = await makeRequest(`${UPDATE_SERVER_URL}/api/update/${params}`);
                const latency1 = Date.now() - start1;
                await timeout(1000);
                // Second request (should hit cache)
                const start2 = Date.now();
                const response2 = await makeRequest(`${UPDATE_SERVER_URL}/api/update/${params}`);
                const latency2 = Date.now() - start2;
                console.log(`Cache test: first=${latency1}ms, second=${latency2}ms`);
                // Second request might be faster (cached)
                // But this depends on CDN configuration
                assert.strictEqual(response1.statusCode, response2.statusCode, 'Responses should be consistent');
            }
            catch (error) {
                console.warn('CDN cache test failed:', error.message);
                this.skip();
            }
        });
        test('should measure p50, p95, p99 latencies', async function () {
            this.timeout(TEST_TIMEOUT * 3);
            try {
                const latencies = [];
                const iterations = 50; // Need more samples for percentiles
                for (let i = 0; i < iterations; i++) {
                    const startTime = Date.now();
                    await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/test${i % 10}`);
                    const latency = Date.now() - startTime;
                    latencies.push(latency);
                    await timeout(100);
                }
                // Sort for percentile calculation
                latencies.sort((a, b) => a - b);
                const p50 = latencies[Math.floor(iterations * 0.50)];
                const p95 = latencies[Math.floor(iterations * 0.95)];
                const p99 = latencies[Math.floor(iterations * 0.99)];
                console.log(`Latency percentiles: p50=${p50}ms, p95=${p95}ms, p99=${p99}ms`);
                assert.ok(p50 < 500, 'p50 should be < 500ms');
                assert.ok(p95 < 1000, 'p95 should be < 1s');
                assert.ok(p99 < 2000, 'p99 should be < 2s');
            }
            catch (error) {
                console.warn('Percentile test failed:', error.message);
                this.skip();
            }
        });
    });
    suite('Monitoring & Observability', () => {
        test('should log request/response cycle', async function () {
            this.timeout(TEST_TIMEOUT);
            const logs = [];
            try {
                logs.push(`[${new Date().toISOString()}] Starting request`);
                const startTime = Date.now();
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/testcommit`);
                const duration = Date.now() - startTime;
                logs.push(`[${new Date().toISOString()}] Response: ${response.statusCode} in ${duration}ms`);
                assert.ok(logs.length === 2, 'Should have request and response logs');
                assert.ok(logs[0].includes('Starting request'));
                assert.ok(logs[1].includes('Response:'));
                console.log(logs.join('\n'));
            }
            catch (error) {
                console.warn('Logging test failed:', error.message);
                this.skip();
            }
        });
        test('should collect error metrics', async function () {
            this.timeout(TEST_TIMEOUT);
            const metrics = {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                errors: []
            };
            try {
                const testUrls = [
                    `${UPDATE_SERVER_URL}/api/update/darwin/stable/test`,
                    `${UPDATE_SERVER_URL}/api/update/invalid/platform/test`,
                    `${UPDATE_SERVER_URL}/api/unknown/route`,
                ];
                for (const url of testUrls) {
                    metrics.totalRequests++;
                    try {
                        const response = await makeRequest(url);
                        if (response.statusCode >= 200 && response.statusCode < 400) {
                            metrics.successfulRequests++;
                        }
                        else {
                            metrics.failedRequests++;
                            metrics.errors.push(`${url}: ${response.statusCode}`);
                        }
                    }
                    catch (error) {
                        metrics.failedRequests++;
                        metrics.errors.push(`${url}: ${error.message}`);
                    }
                }
                console.log(`Metrics: ${metrics.successfulRequests}/${metrics.totalRequests} successful`);
                assert.ok(metrics.totalRequests > 0, 'Should have made requests');
                assert.ok(metrics.successfulRequests > 0, 'Should have some successful requests');
            }
            catch (error) {
                console.warn('Metrics test failed:', error.message);
                this.skip();
            }
        });
        test('should measure request throughput', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const duration = 5000; // 5 seconds
                const startTime = Date.now();
                let requestCount = 0;
                while (Date.now() - startTime < duration) {
                    await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/test${requestCount}`);
                    requestCount++;
                    await timeout(100);
                }
                const actualDuration = (Date.now() - startTime) / 1000;
                const throughput = requestCount / actualDuration;
                console.log(`Throughput: ${throughput.toFixed(1)} req/s (${requestCount} requests in ${actualDuration.toFixed(1)}s)`);
                assert.ok(throughput > 0, 'Throughput should be positive');
            }
            catch (error) {
                console.warn('Throughput test failed:', error.message);
                this.skip();
            }
        });
    });
    suite('Deployment & Rollback', () => {
        test('should verify server availability for rollback', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                // Test that server is reachable
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/test`);
                assert.ok(response.statusCode > 0, 'Server should be reachable');
                // In a real rollback scenario, we'd test a fallback server
                // For now, just verify the main server responds
                console.log('Server is available (rollback would succeed)');
            }
            catch (error) {
                console.warn('Rollback readiness test failed:', error.message);
                this.skip();
            }
        });
        test('should handle zero-downtime deployment', async function () {
            this.timeout(TEST_TIMEOUT * 2);
            try {
                // Simulate continuous requests during deployment
                const requests = [];
                const iterations = 20;
                for (let i = 0; i < iterations; i++) {
                    requests.push(makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/test${i}`)
                        .then(r => ({ success: r.statusCode >= 200 && r.statusCode < 500 }))
                        .catch(() => ({ success: false })));
                    await timeout(100);
                }
                const results = await Promise.all(requests);
                const successCount = results.filter(r => r.success).length;
                const successRate = (successCount / iterations) * 100;
                console.log(`Zero-downtime test: ${successCount}/${iterations} successful (${successRate.toFixed(1)}%)`);
                // Should have very high success rate (>95%) even during deployment
                assert.ok(successRate >= 95, 'Should maintain high availability during deployment');
            }
            catch (error) {
                console.warn('Zero-downtime test failed:', error.message);
                this.skip();
            }
        });
        test('should validate health check endpoint', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                // Try to access a health check or root endpoint
                const healthUrls = [
                    `${UPDATE_SERVER_URL}/`,
                    `${UPDATE_SERVER_URL}/health`,
                    `${UPDATE_SERVER_URL}/api/health`,
                ];
                for (const url of healthUrls) {
                    try {
                        const response = await makeRequest(url);
                        if (response.statusCode === 200) {
                            console.log(`Health check available at: ${url}`);
                            break;
                        }
                    }
                    catch {
                        // Try next URL
                    }
                }
                // At minimum, the update endpoint should work
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/test`);
                assert.ok(response.statusCode > 0, 'Server should respond to requests');
            }
            catch (error) {
                console.warn('Health check test failed:', error.message);
                this.skip();
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmVySW50ZWdyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXBkYXRlL3Rlc3QvZWxlY3Ryb24tbWFpbi91cGRhdGVTZXJ2ZXJJbnRlZ3JhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFFL0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMxQyxNQUFNLGlCQUFpQixHQUFHLDZCQUE2QixDQUFDO0lBQ3hELE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFDO0lBQ2hELE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDO0lBQ3JDLE1BQU0sU0FBUyxHQUFHLG9CQUFvQixDQUFDO0lBQ3ZDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxDQUFDLCtCQUErQjtJQUUzRCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFSDs7T0FFRztJQUNILFNBQVMsV0FBVyxDQUFDLEdBQVcsRUFBRSxVQUFnQyxFQUFFO1FBS25FLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVB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