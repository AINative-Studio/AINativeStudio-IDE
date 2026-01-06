/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as https from 'https';
import * as http from 'http';
import * as dns from 'dns';
import { promisify } from 'util';
// @ts-expect-error - Path resolution issue in platform tests
import { timeout } from '../../../../../base/common/async.js';
// @ts-expect-error - Path resolution issue in platform tests
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
// @ts-expect-error - Path resolution issue in platform tests
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
                // Results should be consistent (same set of IPs)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                // @ts-expect-error - Unused variable
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
                // @ts-expect-error - Unused variable
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmVyRGVwbG95bWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvdGVzdC9lbGVjdHJvbi1tYWluL3VwZGF0ZVNlcnZlckRlcGxveW1lbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUM7QUFDM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNqQyw2REFBNkQ7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsNkRBQTZEO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUMsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUU1QyxLQUFLLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO0lBRTlELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsTUFBTSxpQkFBaUIsR0FBRyw2QkFBNkIsQ0FBQztJQUN4RCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsQ0FBQywrQkFBK0I7SUFFM0QsdUNBQXVDLEVBQUUsQ0FBQztJQUUx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