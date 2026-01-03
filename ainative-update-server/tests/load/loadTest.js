/**
 * Load Testing: Update Server
 *
 * Performance testing for update server endpoint
 * Requirements: 100 req/s sustained, p95 < 500ms
 */

const autocannon = require('autocannon');
const express = require('express');
const nock = require('nock');
const handler = require('../../index');

// Create test server
const app = express();
app.all('*', handler);

const PORT = 3001;
let server;

// Mock GitHub API responses for load testing
function setupMocks() {
  const mockReleaseData = {
    tag_name: 'v1.5.0',
    name: 'Release 1.5.0',
    published_at: '2024-01-15T10:00:00Z',
    html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
    assets: [
      {
        name: 'ainative-studio-darwin-arm64.zip',
        browser_download_url: 'https://github.com/.../ainative-studio-darwin-arm64.zip',
        size: 150000000,
        content_type: 'application/zip'
      },
      {
        name: 'ainative-studio-darwin-arm64.zip.sha256',
        browser_download_url: 'https://example.com/hash.sha256',
        size: 128,
        content_type: 'text/plain'
      }
    ]
  };

  const validHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  // Persistent mock for load testing
  nock('https://api.github.com')
    .persist()
    .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
    .reply(200, mockReleaseData);

  nock('https://example.com')
    .persist()
    .get('/hash.sha256')
    .reply(200, validHash);
}

async function runLoadTest() {
  console.log('\n=== AINative Update Server Load Test ===\n');
  console.log('Test Configuration:');
  console.log('- Target: 100 requests/second');
  console.log('- Duration: 30 seconds');
  console.log('- Target p95: < 500ms');
  console.log('- Endpoint: /api/update/darwin-arm64/stable/v1.4.0\n');

  // Setup mocks
  setupMocks();

  // Start server
  server = app.listen(PORT, () => {
    console.log(`Test server listening on port ${PORT}\n`);
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Run load test
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url: `http://localhost:${PORT}/api/update/darwin-arm64/stable/v1.4.0`,
      connections: 10,         // Number of concurrent connections
      pipelining: 1,           // Number of pipelined requests
      duration: 30,            // Test duration in seconds
      amount: 3000,            // Total number of requests (100 req/s * 30s)
      timeout: 10,             // Request timeout in seconds
      method: 'GET',
      headers: {
        'User-Agent': 'AINative-LoadTest/1.0'
      }
    }, (err, result) => {
      if (err) {
        console.error('Load test failed:', err);
        cleanup();
        reject(err);
        return;
      }

      // Print results
      console.log('\n=== Load Test Results ===\n');
      console.log('Request Statistics:');
      console.log(`- Total requests: ${result.requests.total}`);
      console.log(`- Requests/sec: ${result.requests.average.toFixed(2)}`);
      console.log(`- Total duration: ${(result.duration / 1000).toFixed(2)}s`);
      console.log(`- Total data transferred: ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB`);

      console.log('\nLatency Statistics:');
      console.log(`- Mean: ${result.latency.mean.toFixed(2)}ms`);
      console.log(`- Median (p50): ${result.latency.p50.toFixed(2)}ms`);
      console.log(`- p75: ${result.latency.p75.toFixed(2)}ms`);
      console.log(`- p90: ${result.latency.p90.toFixed(2)}ms`);
      console.log(`- p95: ${result.latency.p95.toFixed(2)}ms`);
      console.log(`- p99: ${result.latency.p99.toFixed(2)}ms`);
      console.log(`- Max: ${result.latency.max.toFixed(2)}ms`);

      console.log('\nError Statistics:');
      console.log(`- Errors: ${result.errors || 0}`);
      console.log(`- Timeouts: ${result.timeouts || 0}`);
      console.log(`- Non-2xx responses: ${result.non2xx || 0}`);

      console.log('\nHTTP Status Codes:');
      if (result['2xx']) console.log(`- 2xx: ${result['2xx']}`);
      if (result['3xx']) console.log(`- 3xx: ${result['3xx']}`);
      if (result['4xx']) console.log(`- 4xx: ${result['4xx']}`);
      if (result['5xx']) console.log(`- 5xx: ${result['5xx']}`);

      // Evaluate performance criteria
      console.log('\n=== Performance Evaluation ===\n');

      const reqPerSec = result.requests.average;
      const p95Latency = result.latency.p95;
      const errorRate = (result.errors || 0) / result.requests.total * 100;

      let passed = true;

      // Check requests per second
      if (reqPerSec >= 100) {
        console.log(`✓ PASS: Requests/sec (${reqPerSec.toFixed(2)}) meets target (≥100)`);
      } else {
        console.log(`✗ FAIL: Requests/sec (${reqPerSec.toFixed(2)}) below target (≥100)`);
        passed = false;
      }

      // Check p95 latency
      if (p95Latency < 500) {
        console.log(`✓ PASS: p95 latency (${p95Latency.toFixed(2)}ms) meets target (<500ms)`);
      } else {
        console.log(`✗ FAIL: p95 latency (${p95Latency.toFixed(2)}ms) exceeds target (<500ms)`);
        passed = false;
      }

      // Check error rate
      if (errorRate === 0) {
        console.log(`✓ PASS: No errors (0%)`);
      } else if (errorRate < 1) {
        console.log(`✓ PASS: Error rate (${errorRate.toFixed(2)}%) is acceptable (<1%)`);
      } else {
        console.log(`✗ FAIL: Error rate (${errorRate.toFixed(2)}%) is too high (≥1%)`);
        passed = false;
      }

      console.log('\n' + '='.repeat(50) + '\n');

      if (passed) {
        console.log('🎉 All performance criteria met!\n');
      } else {
        console.log('⚠️  Some performance criteria not met.\n');
      }

      cleanup();
      resolve({ passed, result });
    });

    // Track progress
    instance.on('response', () => {
      // Optional: could log progress here
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

function cleanup() {
  nock.cleanAll();
  if (server) {
    server.close();
    console.log('Test server closed\n');
  }
}

// Run the test if executed directly
if (require.main === module) {
  runLoadTest()
    .then(({ passed }) => {
      process.exit(passed ? 0 : 1);
    })
    .catch(err => {
      console.error('Load test error:', err);
      cleanup();
      process.exit(1);
    });
}

module.exports = { runLoadTest };
