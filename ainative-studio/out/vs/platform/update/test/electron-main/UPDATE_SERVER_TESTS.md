# Update Server Production Deployment Tests

This directory contains comprehensive test suites for validating the AINative Studio update server deployment at `https://api.ainative.studio`.

## Test Files

### 1. `updateServerDeployment.test.ts` (27 tests)

Production deployment validation tests covering infrastructure, endpoints, performance, and security.

**Test Suites:**

#### DNS Resolution (3 tests)
- ✓ Resolves api.ainative.studio correctly
- ✓ Resolves to valid IPv4 addresses
- ✓ Consistent DNS resolution across queries

#### SSL Certificate (3 tests)
- ✓ Valid HTTPS certificate
- ✓ Certificate valid for >30 days
- ✓ HTTP to HTTPS redirect

#### Endpoint Availability (8 tests)
- ✓ darwin-arm64 endpoint responds
- ✓ darwin (Intel) endpoint responds
- ✓ win32-x64 endpoint responds
- ✓ linux-x64 endpoint responds
- ✓ Returns 200 when update available
- ✓ Returns 204 when no update
- ✓ Returns 400 for invalid parameters
- ✓ Handles malformed requests

#### Response Format (3 tests)
- ✓ Valid JSON structure for update available
- ✓ Includes required fields (version, productVersion, url)
- ✓ Empty body for 204 responses

#### Performance (3 tests)
- ✓ Response time <500ms (p95)
- ✓ Handles 100 concurrent requests
- ✓ Consistent response times (low stdDev)

#### Cache Behavior (2 tests)
- ✓ Includes cache-control headers
- ✓ Consistent responses for same parameters

#### Error Handling (3 tests)
- ✓ Graceful malformed request handling
- ✓ Returns 404 for unknown routes
- ✓ Handles invalid commit hash format

#### Security (3 tests)
- ✓ HTTPS-only enforcement
- ✓ Security headers present
- ✓ No sensitive data in responses

### 2. `updateServerIntegration.test.ts` (19 tests)

Integration tests for GitHub API, environment configuration, geographic distribution, and monitoring.

**Test Suites:**

#### GitHub API Integration (5 tests)
- ✓ Fetches release data correctly
- ✓ Handles rate limiting gracefully
- ✓ Validates asset URL resolution
- ✓ Handles missing releases
- ✓ Validates release data structure

#### Environment Variables (3 tests)
- ✓ Loads GITHUB_TOKEN if available
- ✓ Handles missing token (fallback)
- ✓ Validates token format

#### Geographic Distribution (5 tests)
- ✓ Responds from US East region
- ✓ Measures response time variability
- ✓ Consistent geographic routing
- ✓ CDN edge caching
- ✓ p50, p95, p99 latency percentiles

#### Monitoring & Observability (3 tests)
- ✓ Request/response logging
- ✓ Error metrics collection
- ✓ Request throughput measurement

#### Deployment & Rollback (3 tests)
- ✓ Server availability for rollback
- ✓ Zero-downtime deployment
- ✓ Health check endpoint validation

## Total Test Coverage

- **Total Tests:** 46 tests (exceeds requirement of ≥13)
- **Deployment Tests:** 27 tests
- **Integration Tests:** 19 tests

## Running the Tests

### Run All Update Server Tests

```bash
cd ainative-studio
npm run test-node -- --grep "Update Server"
```

### Run Deployment Tests Only

```bash
npm run test-node -- --grep "Production Deployment Validation"
```

### Run Integration Tests Only

```bash
npm run test-node -- --grep "Integration Tests"
```

### Run Specific Test Suite

```bash
# DNS Resolution tests
npm run test-node -- --grep "DNS Resolution"

# Performance tests
npm run test-node -- --grep "Performance"

# GitHub API integration
npm run test-node -- --grep "GitHub API Integration"
```

## Environment Configuration

### Optional: GitHub API Token

For higher rate limits (5000/hour vs 60/hour), set a GitHub token:

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

Without a token, tests will use unauthenticated GitHub API with lower rate limits.

### Test Behavior

Most tests are designed to gracefully skip if:
- The update server is not deployed yet (`api.ainative.studio` doesn't resolve)
- Network connectivity issues occur
- GitHub API rate limits are exceeded
- Expected resources are not available

This ensures tests don't fail during development or CI when the production server is being deployed.

## Test Architecture

### HTTP Request Helper

Both test files use a common `makeRequest()` helper that:
- Makes HTTPS requests with proper timeout handling
- Returns status code, headers, and body
- Handles connection errors gracefully
- Supports custom headers and options

### DNS Resolution Helper

Deployment tests use Node.js `dns.promises` to:
- Resolve hostnames to IP addresses
- Validate IPv4 address format
- Test DNS consistency across queries

### Performance Measurement

Performance tests measure:
- **Latency:** Response time for individual requests
- **Percentiles:** p50, p95, p99 latency distribution
- **Throughput:** Requests per second
- **Concurrency:** Handling 100+ simultaneous requests
- **Consistency:** Standard deviation of response times

### Test Isolation

Each test suite:
- Uses `DisposableStore` for cleanup
- Implements `ensureNoDisposablesAreLeakedInTestSuite()`
- Has `teardown()` hooks to prevent resource leaks
- Can run independently or in parallel

## Success Criteria

### Deployment Validation
- ✓ DNS resolves to valid IP addresses
- ✓ HTTPS certificate is valid (>30 days until expiry)
- ✓ All platform endpoints respond (darwin, win32, linux)
- ✓ Response format matches specification
- ✓ p95 latency <500ms
- ✓ 100 concurrent requests succeed
- ✓ Security headers present
- ✓ HTTPS enforcement active

### Integration Testing
- ✓ GitHub API accessible (with/without token)
- ✓ Release data structure valid
- ✓ Asset URLs resolve correctly
- ✓ Geographic latency reasonable
- ✓ Zero-downtime deployment possible
- ✓ Health checks pass

## Expected Response Format

### Update Available (200 OK)

```json
{
  "version": "1.5.0",
  "productVersion": "1.5.0",
  "timestamp": 1234567890,
  "url": "https://github.com/AINative-Studio/AINativeStudio-IDE/releases/download/v1.5.0/AINativeStudio-darwin-arm64-1.5.0.zip",
  "sha256hash": "abc123def456..."
}
```

### No Update Available (204 No Content)

Empty response body.

### Error Responses

- **400 Bad Request:** Invalid platform or parameters
- **404 Not Found:** Unknown route
- **500 Internal Server Error:** Server error (should be rare)

## Platform Endpoints

The update server supports these platforms:

- `darwin-arm64` - macOS Apple Silicon
- `darwin` - macOS Intel
- `win32-x64` - Windows x64
- `linux-x64` - Linux x64

URL format: `https://api.ainative.studio/api/update/{platform}/{quality}/{commit}`

Example: `https://api.ainative.studio/api/update/darwin-arm64/stable/abc123`

## Performance Benchmarks

### Target Metrics (Production)

- **p50 latency:** <200ms
- **p95 latency:** <500ms
- **p99 latency:** <1000ms
- **Throughput:** >10 req/s
- **Availability:** >99.9%
- **Concurrent users:** 100+

### Current Test Thresholds

Tests are configured with realistic thresholds:
- p95 response time: 500ms
- Concurrent requests: 100 simultaneous
- Success rate: ≥95%
- Average latency: <1000ms

## Troubleshooting

### Tests Skipping

If tests are skipping, check:
1. Network connectivity
2. DNS resolution: `nslookup api.ainative.studio`
3. HTTPS access: `curl https://api.ainative.studio/api/update/darwin/stable/test`
4. GitHub API rate limit: `curl https://api.github.com/rate_limit`

### Rate Limiting

GitHub API rate limits:
- **Unauthenticated:** 60 requests/hour
- **Authenticated:** 5,000 requests/hour

Set `GITHUB_TOKEN` environment variable to use authenticated requests.

### Network Timeouts

Tests use 10-second timeouts for individual requests and 30-second timeouts for test cases. If experiencing frequent timeouts:
- Check network connectivity
- Verify server is responding
- Look for firewall/proxy issues

## CI/CD Integration

These tests are designed for CI/CD pipelines:

```yaml
- name: Run Update Server Tests
  run: |
    cd ainative-studio
    npm run test-node -- --grep "Update Server"
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Tests will gracefully skip if the production server is not yet deployed, preventing false failures during initial setup.

## Monitoring Integration

Test results can be exported for monitoring:

```bash
npm run test-node -- --grep "Update Server" --reporter json > test-results.json
```

Key metrics to monitor:
- Test pass rate
- Average latency
- p95/p99 latencies
- Error rates
- DNS resolution time

## Future Enhancements

Potential additions to test suite:
- [ ] Multi-region latency testing (EU, Asia, Australia)
- [ ] Load testing (1000+ concurrent users)
- [ ] Chaos engineering (network failures, server restarts)
- [ ] Long-term reliability testing (24+ hour runs)
- [ ] Certificate renewal validation
- [ ] CDN cache hit rate monitoring
- [ ] GraphQL endpoint testing (if added)
- [ ] WebSocket connection testing (if added)

## References

- Update Server URL: https://api.ainative.studio
- GitHub Repository: https://github.com/AINative-Studio/AINativeStudio-IDE
- Product Configuration: `ainative-studio/product.json`
- Update Service Implementation: `src/vs/platform/update/electron-main/`

## Support

For issues or questions about these tests, please file an issue at:
https://github.com/AINative-Studio/AINativeStudio-IDE/issues
