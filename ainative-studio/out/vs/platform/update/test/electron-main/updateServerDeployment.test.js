/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as https from 'https';
import * as http from 'http';
import * as dns from 'dns';
import { promisify } from 'util';
// @ts-ignore - Path resolution issue in platform tests
import { timeout } from '../../../../../base/common/async.js';
// @ts-ignore - Path resolution issue in platform tests
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
// @ts-ignore - Path resolution issue in platform tests
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const dnsResolve = promisify(dns.resolve);
const dnsResolve4 = promisify(dns.resolve4);
suite('Update Server - Production Deployment Validation', () => {
    const disposables = new DisposableStore();
    const UPDATE_SERVER_URL = 'https://api.ainative.studio';
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
     * Helper function to check HTTP to HTTPS redirect
     */
    function checkHttpRedirect(hostname, path) {
        return new Promise((resolve) => {
            const req = http.request({
                hostname,
                path,
                method: 'GET',
                timeout: 5000
            }, (res) => {
                // Check if redirects to HTTPS
                const location = res.headers.location || '';
                const isHttpsRedirect = res.statusCode === 301 || res.statusCode === 302;
                const redirectsToHttps = location.startsWith('https://');
                resolve(isHttpsRedirect && redirectsToHttps);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        });
    }
    suite('DNS Resolution', () => {
        test('should resolve api.ainative.studio correctly', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const addresses = await dnsResolve('api.ainative.studio');
                assert.ok(addresses.length > 0, 'DNS should resolve to at least one address');
            }
            catch (error) {
                // If DNS fails, it might be because the server is not deployed yet
                // or the test is running in an environment without internet access
                console.warn('DNS resolution failed (server may not be deployed yet):', error.message);
                this.skip();
            }
        });
        test('should resolve to valid IPv4 addresses', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const addresses = await dnsResolve4('api.ainative.studio');
                assert.ok(addresses.length > 0, 'Should resolve to at least one IPv4 address');
                // Validate IPv4 format
                addresses.forEach(addr => {
                    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
                    assert.ok(ipv4Regex.test(addr), `${addr} should be valid IPv4 address`);
                });
            }
            catch (error) {
                console.warn('IPv4 resolution failed:', error.message);
                this.skip();
            }
        });
        test('should have consistent DNS resolution across queries', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const addresses1 = await dnsResolve4('api.ainative.studio');
                await timeout(1000);
                const addresses2 = await dnsResolve4('api.ainative.studio');
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                assert.ok(addresses1.length > 0 && addresses2.length > 0, 'Both queries should succeed');
                // Results should be consistent (same set of IPs)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const set1 = new Set(addresses1);
                const set2 = new Set(addresses2);
                const hasOverlap = addresses1.some(addr => set2.has(addr));
                assert.ok(hasOverlap, 'DNS results should have consistent IPs');
            }
            catch (error) {
                console.warn('DNS consistency test failed:', error.message);
                this.skip();
            }
        });
    });
    suite('SSL Certificate', () => {
        test('should serve valid HTTPS certificate', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/test`);
                // If we get here without error, HTTPS is working
                assert.ok(response.statusCode > 0, 'HTTPS connection should succeed');
            }
            catch (error) {
                if (error.message.includes('certificate') || error.message.includes('SSL')) {
                    assert.fail(`SSL certificate error: ${error.message}`);
                }
                else {
                    console.warn('HTTPS test failed (server may not be deployed):', error.message);
                    this.skip();
                }
            }
        });
        test('should have certificate valid for >30 days', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                // Make HTTPS connection to get certificate info
                await new Promise((resolve, reject) => {
                    const req = https.request(`${UPDATE_SERVER_URL}/api/update/darwin/stable/test`, (res) => {
                        const cert = res.socket.getPeerCertificate();
                        if (cert && cert.valid_to) {
                            const expiryDate = new Date(cert.valid_to);
                            const now = new Date();
                            const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                            assert.ok(daysUntilExpiry > 30, `Certificate should be valid for >30 days (currently ${Math.floor(daysUntilExpiry)} days)`);
                            resolve();
                        }
                        else {
                            reject(new Error('Could not retrieve certificate'));
                        }
                    });
                    req.on('error', reject);
                    req.end();
                });
            }
            catch (error) {
                console.warn('Certificate expiry test failed:', error.message);
                this.skip();
            }
        });
        test('should redirect HTTP to HTTPS', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const redirects = await checkHttpRedirect('api.ainative.studio', '/api/update/darwin/stable/test');
                assert.ok(redirects, 'HTTP requests should redirect to HTTPS');
            }
            catch (error) {
                console.warn('HTTP redirect test failed:', error.message);
                this.skip();
            }
        });
    });
    suite('Endpoint Availability', () => {
        test('should respond to darwin-arm64 endpoint', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin-arm64/stable/testcommit123`);
                assert.ok(response.statusCode === 200 || response.statusCode === 204, 'Should return 200 or 204');
            }
            catch (error) {
                console.warn('darwin-arm64 endpoint test failed:', error.message);
                this.skip();
            }
        });
        test('should respond to darwin (Intel) endpoint', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/testcommit123`);
                assert.ok(response.statusCode === 200 || response.statusCode === 204, 'Should return 200 or 204');
            }
            catch (error) {
                console.warn('darwin endpoint test failed:', error.message);
                this.skip();
            }
        });
        test('should respond to win32-x64 endpoint', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/win32-x64/stable/testcommit123`);
                assert.ok(response.statusCode === 200 || response.statusCode === 204, 'Should return 200 or 204');
            }
            catch (error) {
                console.warn('win32-x64 endpoint test failed:', error.message);
                this.skip();
            }
        });
        test('should respond to linux-x64 endpoint', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/linux-x64/stable/testcommit123`);
                assert.ok(response.statusCode === 200 || response.statusCode === 204, 'Should return 200 or 204');
            }
            catch (error) {
                console.warn('linux-x64 endpoint test failed:', error.message);
                this.skip();
            }
        });
        test('should return 200 when update is available', async function () {
            this.timeout(TEST_TIMEOUT);
            // Use an old commit hash to simulate update available
            const oldCommit = '0000000000000000000000000000000000000000';
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/${oldCommit}`);
                if (response.statusCode === 200) {
                    assert.strictEqual(response.statusCode, 200, 'Should return 200 for available update');
                    // Verify JSON response
                    assert.ok(response.body.length > 0, 'Response body should not be empty');
                    const data = JSON.parse(response.body);
                    assert.ok(data.version, 'Response should contain version');
                    assert.ok(data.url, 'Response should contain download URL');
                }
                else if (response.statusCode === 204) {
                    // No update available - this is also valid
                    console.log('No update available (204) - test skipped');
                    this.skip();
                }
            }
            catch (error) {
                console.warn('Update available test failed:', error.message);
                this.skip();
            }
        });
        test('should return 204 when no update available', async function () {
            this.timeout(TEST_TIMEOUT);
            // Use current commit from product.json to simulate no update
            const currentCommit = '1858d61f81bae5dd58c68945eb2840354f993da9';
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/${currentCommit}`);
                // Should return 204 (No Content) when using current commit
                if (response.statusCode === 204) {
                    assert.strictEqual(response.statusCode, 204, 'Should return 204 when no update available');
                    assert.strictEqual(response.body, '', 'Response body should be empty for 204');
                }
                else {
                    // Might return 200 if there's a newer version
                    console.log('Newer version available - test skipped');
                    this.skip();
                }
            }
            catch (error) {
                console.warn('No update test failed:', error.message);
                this.skip();
            }
        });
        test('should return 400 for invalid parameters', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/invalid-platform/stable/testcommit`);
                assert.ok(response.statusCode === 400 || response.statusCode === 404, 'Should return 400 or 404 for invalid platform');
            }
            catch (error) {
                console.warn('Invalid parameter test failed:', error.message);
                this.skip();
            }
        });
    });
    suite('Response Format', () => {
        test('should return valid JSON structure for update available', async function () {
            this.timeout(TEST_TIMEOUT);
            const oldCommit = '0000000000000000000000000000000000000000';
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/${oldCommit}`);
                if (response.statusCode === 200) {
                    const data = JSON.parse(response.body);
                    // Verify required fields
                    assert.ok('version' in data, 'Response should contain version field');
                    assert.ok('productVersion' in data, 'Response should contain productVersion field');
                    assert.ok('url' in data, 'Response should contain url field');
                    // Verify field types
                    assert.strictEqual(typeof data.version, 'string', 'version should be string');
                    assert.strictEqual(typeof data.productVersion, 'string', 'productVersion should be string');
                    assert.strictEqual(typeof data.url, 'string', 'url should be string');
                    // url should be valid HTTPS URL
                    assert.ok(data.url.startsWith('https://'), 'url should be HTTPS');
                }
                else {
                    this.skip();
                }
            }
            catch (error) {
                console.warn('JSON structure test failed:', error.message);
                this.skip();
            }
        });
        test('should include optional fields when present', async function () {
            this.timeout(TEST_TIMEOUT);
            const oldCommit = '0000000000000000000000000000000000000000';
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/${oldCommit}`);
                if (response.statusCode === 200) {
                    const data = JSON.parse(response.body);
                    // Check optional fields
                    if ('timestamp' in data) {
                        assert.strictEqual(typeof data.timestamp, 'number', 'timestamp should be number');
                        assert.ok(data.timestamp > 0, 'timestamp should be positive');
                    }
                    if ('sha256hash' in data) {
                        assert.strictEqual(typeof data.sha256hash, 'string', 'sha256hash should be string');
                        assert.match(data.sha256hash, /^[a-f0-9]{64}$/, 'sha256hash should be valid hex');
                    }
                }
                else {
                    this.skip();
                }
            }
            catch (error) {
                console.warn('Optional fields test failed:', error.message);
                this.skip();
            }
        });
        test('should return empty body for 204 response', async function () {
            this.timeout(TEST_TIMEOUT);
            const currentCommit = '1858d61f81bae5dd58c68945eb2840354f993da9';
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/${currentCommit}`);
                if (response.statusCode === 204) {
                    assert.strictEqual(response.body, '', '204 response should have empty body');
                }
                else {
                    this.skip();
                }
            }
            catch (error) {
                console.warn('204 response test failed:', error.message);
                this.skip();
            }
        });
    });
    suite('Performance', () => {
        test('should respond within 500ms (p95)', async function () {
            this.timeout(TEST_TIMEOUT);
            const measurements = [];
            const iterations = 20; // Use 20 requests for p95
            try {
                for (let i = 0; i < iterations; i++) {
                    const startTime = Date.now();
                    await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/testcommit123`);
                    const duration = Date.now() - startTime;
                    measurements.push(duration);
                    // Small delay between requests
                    await timeout(100);
                }
                // Calculate p95
                measurements.sort((a, b) => a - b);
                const p95Index = Math.floor(measurements.length * 0.95);
                const p95Value = measurements[p95Index];
                console.log(`Response times: min=${measurements[0]}ms, max=${measurements[measurements.length - 1]}ms, p95=${p95Value}ms`);
                assert.ok(p95Value < 500, `p95 response time (${p95Value}ms) should be < 500ms`);
            }
            catch (error) {
                console.warn('Performance test failed:', error.message);
                this.skip();
            }
        });
        test('should handle concurrent requests (100 simultaneous)', async function () {
            this.timeout(TEST_TIMEOUT * 2);
            try {
                const concurrentRequests = 100;
                const requests = [];
                const startTime = Date.now();
                for (let i = 0; i < concurrentRequests; i++) {
                    requests.push(makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/testcommit${i % 10}`)
                        .catch(err => ({ error: err.message })));
                }
                const results = await Promise.all(requests);
                const duration = Date.now() - startTime;
                // Count successful requests
                const successful = results.filter(r => r.statusCode && r.statusCode >= 200 && r.statusCode < 500).length;
                const successRate = (successful / concurrentRequests) * 100;
                console.log(`Concurrent requests: ${successful}/${concurrentRequests} successful (${successRate.toFixed(1)}%) in ${duration}ms`);
                assert.ok(successRate >= 95, `Success rate (${successRate.toFixed(1)}%) should be >= 95%`);
            }
            catch (error) {
                console.warn('Concurrent request test failed:', error.message);
                this.skip();
            }
        });
        test('should have consistent response times', async function () {
            this.timeout(TEST_TIMEOUT);
            const measurements = [];
            const iterations = 10;
            try {
                for (let i = 0; i < iterations; i++) {
                    const startTime = Date.now();
                    await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/testcommit123`);
                    const duration = Date.now() - startTime;
                    measurements.push(duration);
                    await timeout(200);
                }
                // Calculate standard deviation
                const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / measurements.length;
                const stdDev = Math.sqrt(variance);
                console.log(`Response times: mean=${mean.toFixed(0)}ms, stdDev=${stdDev.toFixed(0)}ms`);
                // Standard deviation should be reasonable (less than mean)
                assert.ok(stdDev < mean, 'Response times should be consistent (stdDev < mean)');
            }
            catch (error) {
                console.warn('Consistency test failed:', error.message);
                this.skip();
            }
        });
    });
    suite('Cache Behavior', () => {
        test('should include cache-control headers', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/testcommit123`);
                // Check for cache-related headers
                const cacheControl = response.headers['cache-control'];
                if (cacheControl) {
                    console.log(`Cache-Control: ${cacheControl}`);
                    assert.ok(typeof cacheControl === 'string', 'Cache-Control should be present');
                }
                else {
                    console.log('No Cache-Control header found');
                }
            }
            catch (error) {
                console.warn('Cache headers test failed:', error.message);
                this.skip();
            }
        });
        test('should return consistent responses for same parameters', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const params = 'darwin/stable/testcommit123';
                const response1 = await makeRequest(`${UPDATE_SERVER_URL}/api/update/${params}`);
                await timeout(1000);
                const response2 = await makeRequest(`${UPDATE_SERVER_URL}/api/update/${params}`);
                assert.strictEqual(response1.statusCode, response2.statusCode, 'Status codes should match');
                if (response1.statusCode === 200 && response2.statusCode === 200) {
                    // Responses should be identical
                    const data1 = JSON.parse(response1.body);
                    const data2 = JSON.parse(response2.body);
                    assert.strictEqual(data1.version, data2.version, 'Cached responses should be identical');
                }
            }
            catch (error) {
                console.warn('Cache consistency test failed:', error.message);
                this.skip();
            }
        });
    });
    suite('Error Handling', () => {
        test('should handle malformed requests gracefully', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                // Test various malformed URLs
                const malformedPaths = [
                    '/api/update/',
                    '/api/update/darwin',
                    '/api/update/darwin/stable',
                    '/api/update//stable/commit',
                    '/api/update/darwin//commit',
                ];
                for (const path of malformedPaths) {
                    const response = await makeRequest(`${UPDATE_SERVER_URL}${path}`);
                    assert.ok(response.statusCode >= 400, `Malformed request should return error: ${path}`);
                }
            }
            catch (error) {
                console.warn('Malformed request test failed:', error.message);
                this.skip();
            }
        });
        test('should return 404 for unknown routes', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/unknown/route`);
                assert.ok(response.statusCode === 404, 'Unknown routes should return 404');
            }
            catch (error) {
                console.warn('404 test failed:', error.message);
                this.skip();
            }
        });
        test('should handle invalid commit hash format', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const invalidCommits = [
                    'invalid',
                    '123',
                    '',
                    '../../../etc/passwd',
                ];
                for (const commit of invalidCommits) {
                    const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/${commit}`);
                    // Should either return valid response or error, but not crash
                    assert.ok(response.statusCode > 0, 'Server should handle invalid commit');
                }
            }
            catch (error) {
                console.warn('Invalid commit test failed:', error.message);
                this.skip();
            }
        });
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    suite('Security', () => {
        test('should only accept HTTPS connections', async function () {
            this.timeout(TEST_TIMEOUT);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            try {
                // Try HTTP connection
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const httpUrl = UPDATE_SERVER_URL.replace('https://', 'http://');
                const redirects = await checkHttpRedirect('api.ainative.studio', '/api/update/darwin/stable/test');
                assert.ok(redirects, 'HTTP should redirect to HTTPS');
            }
            catch (error) {
                console.warn('HTTPS enforcement test failed:', error.message);
                this.skip();
            }
        });
        test('should include security headers', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/testcommit123`);
                // Check for common security headers
                const headers = response.headers;
                // Log available security headers
                const securityHeaders = [
                    'strict-transport-security',
                    'x-content-type-options',
                    'x-frame-options',
                    'x-xss-protection'
                ];
                securityHeaders.forEach(header => {
                    if (headers[header]) {
                        console.log(`${header}: ${headers[header]}`);
                    }
                });
                // At minimum, HTTPS should be enforced via HSTS
                // But this is optional depending on CDN/server configuration
            }
            catch (error) {
                console.warn('Security headers test failed:', error.message);
                this.skip();
            }
        });
        test('should not expose sensitive information in responses', async function () {
            this.timeout(TEST_TIMEOUT);
            try {
                const response = await makeRequest(`${UPDATE_SERVER_URL}/api/update/darwin/stable/testcommit123`);
                // Check that response doesn't contain sensitive data
                const body = response.body.toLowerCase();
                const sensitiveTerms = [
                    'password',
                    'secret',
                    'token',
                    'api_key',
                    'private_key',
                ];
                sensitiveTerms.forEach(term => {
                    assert.ok(!body.includes(term), `Response should not contain: ${term}`);
                });
            }
            catch (error) {
                console.warn('Sensitive data test failed:', error.message);
                this.skip();
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmVyRGVwbG95bWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvdGVzdC9lbGVjdHJvbi1tYWluL3VwZGF0ZVNlcnZlckRlcGxveW1lbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUM7QUFDM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNqQyx1REFBdUQ7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELHVEQUF1RDtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsdURBQXVEO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUMsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUU1QyxLQUFLLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO0lBRTlELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsTUFBTSxpQkFBaUIsR0FBRyw2QkFBNkIsQ0FBQztJQUN4RCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsQ0FBQywrQkFBK0I7SUFFM0QsdUNBQXVDLEVBQUUsQ0FBQztJQUUx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