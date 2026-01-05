# AINative Cloud Authentication - Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-04
**Target:** Production Deployment

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Security Setup](#security-setup)
5. [Service Architecture](#service-architecture)
6. [Deployment Steps](#deployment-steps)
7. [Verification](#verification)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

---

## Overview

AINative Cloud Authentication provides secure user authentication and authorization for AINative Studio IDE with the following features:

- **JWT-based authentication** with access and refresh tokens
- **Encrypted token storage** using platform-native encryption
- **Automatic token refresh** to maintain seamless user sessions
- **AI Model Registry integration** for cloud-based AI model access
- **Usage tracking and quota management**
- **Multi-environment support** (development, staging, production)

### Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                   AINative Studio IDE                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ Cloud Auth Service   │  │ Model Registry       │         │
│  │ - Login/Logout       │  │ - List Models        │         │
│  │ - Token Management   │  │ - Invoke Models      │         │
│  │ - User Profile       │  │ - Stream Responses   │         │
│  └──────────┬───────────┘  └──────────┬───────────┘         │
│             │                         │                      │
│             └─────────┬───────────────┘                      │
│                       │                                      │
│              ┌────────▼─────────┐                            │
│              │  AINative SDK    │                            │
│              │  - HTTP Client   │                            │
│              │  - Retry Logic   │                            │
│              │  - Error Handler │                            │
│              └────────┬─────────┘                            │
└───────────────────────┼──────────────────────────────────────┘
                        │ HTTPS
                        │
               ┌────────▼─────────┐
               │  AINative Cloud  │
               │  API             │
               │  - Auth Endpoints│
               │  - Model API     │
               │  - Usage API     │
               └──────────────────┘
```

---

## Prerequisites

### System Requirements

- **Node.js:** v18.x or higher
- **npm:** v9.x or higher
- **Operating System:** macOS, Windows 10/11, or Linux
- **Internet Connection:** Required for cloud API access
- **Platform Encryption:** Available (Keychain/Credential Manager/libsecret)

### Dependencies

All required dependencies are already included in `package.json`:

```json
{
  "@ainative/sdk": "^1.0.3",
  "typescript": "^5.x",
  "electron": "^34.3.2"
}
```

### Access Requirements

- **Production API Access:** Ensure `https://api.ainative.studio` is accessible
- **Firewall Rules:** Allow outbound HTTPS (port 443)
- **SSL/TLS:** System must trust standard CA certificates
- **DNS:** Proper DNS resolution for `api.ainative.studio`

---

## Environment Configuration

### 1. Environment Files

Copy and configure the appropriate environment file:

```bash
# For development
cp .env.example .env.development

# For production
cp .env.example .env.production

# For testing
cp .env.example .env.test
```

### 2. Required Configuration

Edit your environment file with the following settings:

#### Production Configuration (`.env.production`)

```bash
# API Configuration
AINATIVE_API_BASE_URL=https://api.ainative.studio
AINATIVE_API_TIMEOUT=30000

# Environment
NODE_ENV=production

# Security
ENCRYPTION_KEY_ID=ainative-auth-tokens-prod
TOKEN_STORAGE_PROVIDER=electron-safe-storage

# Session Configuration
SESSION_TIMEOUT=1800000                # 30 minutes
SESSION_CHECK_INTERVAL=60000           # 60 seconds

# Feature Flags
ENABLE_AINATIVE_AUTH=true
ENABLE_AINATIVE_CLOUD=true
ENABLE_AI_MODELS=true
ENABLE_MARKETPLACE=true

# Cloud Sync
AINATIVE_SYNC_INTERVAL=300000          # 5 minutes
ENABLE_AUTO_SYNC=true

# Logging
LOG_LEVEL=error
ENABLE_AUTH_LOGGING=false

# Network Security
ENFORCE_HTTPS=true
ENABLE_CERT_PINNING=true               # REQUIRED for production
ALLOW_INSECURE_CONNECTIONS=false

# IMPORTANT: Replace with actual production certificate fingerprint
CERT_FINGERPRINT=<SHA256_FINGERPRINT_HERE>

# Development Settings
DEVELOPMENT_MODE=false

# Performance
MAX_CONCURRENT_REQUESTS=5
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY=2000
```

#### Development Configuration (`.env.development`)

```bash
# API Configuration
AINATIVE_API_BASE_URL=https://api-dev.ainative.studio  # Dev API
AINATIVE_API_TIMEOUT=30000

# Environment
NODE_ENV=development

# Security
ENCRYPTION_KEY_ID=ainative-auth-tokens-dev
TOKEN_STORAGE_PROVIDER=electron-safe-storage

# Session Configuration
SESSION_TIMEOUT=3600000                # 60 minutes (longer for dev)
SESSION_CHECK_INTERVAL=60000

# Feature Flags
ENABLE_AINATIVE_AUTH=true
ENABLE_AINATIVE_CLOUD=true
ENABLE_AI_MODELS=true
ENABLE_MARKETPLACE=true

# Cloud Sync
AINATIVE_SYNC_INTERVAL=300000
ENABLE_AUTO_SYNC=true

# Logging
LOG_LEVEL=debug                        # Verbose logging for dev
ENABLE_AUTH_LOGGING=true              # Enable auth flow logging

# Network Security
ENFORCE_HTTPS=true
ENABLE_CERT_PINNING=false             # Disabled for dev
ALLOW_INSECURE_CONNECTIONS=false

# Development Settings
DEVELOPMENT_MODE=true

# Performance
MAX_CONCURRENT_REQUESTS=5
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY=1000
```

### 3. Environment Variables Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AINATIVE_API_BASE_URL` | string | `https://api.ainative.studio` | Base URL for AINative Cloud API |
| `AINATIVE_API_TIMEOUT` | number | `30000` | Request timeout in milliseconds |
| `NODE_ENV` | string | `production` | Environment mode |
| `ENCRYPTION_KEY_ID` | string | `ainative-auth-tokens-prod` | Encryption key identifier |
| `TOKEN_STORAGE_PROVIDER` | string | `electron-safe-storage` | Storage provider for tokens |
| `SESSION_TIMEOUT` | number | `1800000` | Session timeout (30 min) |
| `SESSION_CHECK_INTERVAL` | number | `60000` | Session check interval (60 sec) |
| `ENABLE_AINATIVE_CLOUD` | boolean | `true` | Enable cloud authentication |
| `AINATIVE_SYNC_INTERVAL` | number | `300000` | Cloud sync interval (5 min) |
| `ENABLE_AUTO_SYNC` | boolean | `true` | Auto-sync usage statistics |
| `LOG_LEVEL` | string | `error` | Logging level (trace/debug/info/warn/error) |
| `ENABLE_AUTH_LOGGING` | boolean | `false` | Enable auth flow logging |
| `ENFORCE_HTTPS` | boolean | `true` | Enforce HTTPS for API calls |
| `ENABLE_CERT_PINNING` | boolean | `true` | Enable certificate pinning |
| `CERT_FINGERPRINT` | string | - | SHA256 certificate fingerprint |
| `ALLOW_INSECURE_CONNECTIONS` | boolean | `false` | Allow HTTP connections (DEV ONLY) |
| `DEVELOPMENT_MODE` | boolean | `false` | Enable development features |
| `MAX_CONCURRENT_REQUESTS` | number | `5` | Max concurrent API requests |
| `MAX_RETRY_ATTEMPTS` | number | `3` | Max retry attempts for failed requests |
| `RETRY_DELAY` | number | `2000` | Retry delay in milliseconds |

---

## Security Setup

### 1. Certificate Pinning (REQUIRED for Production)

Certificate pinning prevents man-in-the-middle attacks by validating the server's SSL certificate.

#### Obtain Certificate Fingerprint

```bash
# Method 1: Using OpenSSL
echo | openssl s_client -servername api.ainative.studio \
  -connect api.ainative.studio:443 2>/dev/null | \
  openssl x509 -fingerprint -sha256 -noout | \
  cut -d'=' -f2

# Method 2: Using Node.js
node -e "
const tls = require('tls');
const socket = tls.connect(443, 'api.ainative.studio', () => {
  const cert = socket.getPeerCertificate();
  console.log(cert.fingerprint256);
  socket.end();
});
"
```

#### Configure Certificate Fingerprint

Update `.env.production`:

```bash
ENABLE_CERT_PINNING=true
CERT_FINGERPRINT=AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90
```

### 2. Token Storage Verification

Verify platform-native encryption is available:

```bash
# macOS: Verify Keychain access
security find-generic-password -s "ainative-auth-tokens-prod" 2>&1

# Windows: Verify Credential Manager
cmdkey /list | findstr ainative

# Linux: Verify libsecret
secret-tool search service ainative
```

### 3. Network Security

Verify HTTPS enforcement:

```bash
# Test API connectivity
curl -I https://api.ainative.studio/health

# Should return 200 OK with valid SSL certificate
```

### 4. Security Checklist

Before deploying to production, verify:

- [ ] Certificate fingerprint configured in `.env.production`
- [ ] Certificate pinning enabled (`ENABLE_CERT_PINNING=true`)
- [ ] HTTPS enforcement enabled (`ENFORCE_HTTPS=true`)
- [ ] Insecure connections disabled (`ALLOW_INSECURE_CONNECTIONS=false`)
- [ ] Production logging level set (`LOG_LEVEL=error`)
- [ ] Auth logging disabled (`ENABLE_AUTH_LOGGING=false`)
- [ ] Development mode disabled (`DEVELOPMENT_MODE=false`)
- [ ] Platform encryption available and tested
- [ ] Firewall rules allow HTTPS to API
- [ ] DNS resolution working for `api.ainative.studio`

---

## Service Architecture

### Registered Services

The following services are automatically registered via dependency injection:

#### 1. AINativeCloudAuthService

**Location:** `src/vs/workbench/contrib/ainative/common/ainativeCloudAuthService.ts`

**Registration:**
```typescript
registerSingleton(IAINativeCloudAuthService, AINativeCloudAuthService, InstantiationType.Eager);
```

**Responsibilities:**
- User authentication (login, logout, registration)
- Token management (refresh, validation)
- Password reset and email verification
- Secure token storage using IEncryptionService

**Key Methods:**
- `login(email, password): Promise<CloudAuthResult>`
- `logout(): Promise<void>`
- `register(request): Promise<RegistrationResult>`
- `refreshToken(): Promise<string>`
- `getAccessToken(): Promise<string | null>`
- `getCurrentUser(): Promise<CloudUser | null>`

#### 2. AIModelRegistryService

**Location:** `src/vs/workbench/contrib/ainative/common/aiModelRegistryService.ts`

**Registration:**
```typescript
registerSingleton(IAIModelRegistryService, AIModelRegistryService, InstantiationType.Delayed);
```

**Responsibilities:**
- List and search AI models from cloud registry
- Model selection and configuration
- Model invocation (standard and streaming)
- Usage statistics and quota management

**Key Methods:**
- `listModels(filters?): Promise<AIModel[]>`
- `getModel(modelId): Promise<AIModel>`
- `selectModel(modelId, projectId): Promise<void>`
- `invokeModel(request): Promise<ModelResponse>`
- `streamModel(request, onChunk): Promise<void>`
- `getUsageStats(): Promise<UsageStats>`
- `getQuota(): Promise<QuotaInfo>`

#### 3. UsageTrackingService

**Location:** `src/vs/workbench/contrib/ainative/common/usageTrackingService.ts`

**Registration:**
```typescript
registerSingleton(IUsageTrackingService, UsageTrackingService, InstantiationType.Delayed);
```

**Responsibilities:**
- Track model usage (tokens, costs)
- Calculate usage costs
- Monitor quotas and limits
- Sync usage data with cloud API
- Local usage caching

**Key Methods:**
- `trackUsage(modelId, inputTokens, outputTokens): Promise<void>`
- `getUsage(period?): Promise<AggregatedUsage>`
- `getQuotaStatus(): Promise<QuotaStatus>`
- `calculateCost(modelId, inputTokens, outputTokens): Promise<CostCalculation>`
- `syncWithCloud(): Promise<void>`

### Service Dependencies

```
AINativeCloudAuthService
    ├── IEncryptionService (platform encryption)
    └── IStorageService (persistent storage)

AIModelRegistryService
    ├── IAINativeCloudAuthService (authentication)
    ├── IStorageService (model config storage)
    └── IUsageTrackingService (usage tracking)

UsageTrackingService
    ├── IAINativeCloudAuthService (authentication)
    ├── IAIModelRegistryService (model pricing)
    └── IStorageService (usage records)
```

---

## Deployment Steps

### Step 1: Pre-Deployment Verification

```bash
# Navigate to project directory
cd /Users/aideveloper/AINativeStudio-IDE/ainative-studio

# Verify dependencies
npm list @ainative/sdk
# Should show: @ainative/sdk@1.0.3

# Verify TypeScript compilation
npm run compile

# Run tests
npm run test-node
```

### Step 2: Environment Configuration

```bash
# Copy production environment file
cp .env.example .env.production

# Edit production configuration
nano .env.production

# IMPORTANT: Set certificate fingerprint
# CERT_FINGERPRINT=<actual_fingerprint>
```

### Step 3: Build Application

```bash
# Development build (for testing)
npm run watch

# Production build (platform-specific)
# macOS Apple Silicon
npm run gulp vscode-darwin-arm64

# Windows x64
npm run gulp vscode-win32-x64

# Linux x64
npm run gulp vscode-linux-x64
```

Build time: ~25-30 minutes per platform

### Step 4: Security Verification

```bash
# Verify HTTPS enforcement
grep "ENFORCE_HTTPS=true" .env.production

# Verify certificate pinning
grep "ENABLE_CERT_PINNING=true" .env.production

# Verify no dev mode
grep "DEVELOPMENT_MODE=false" .env.production

# Verify logging level
grep "LOG_LEVEL=error" .env.production
```

### Step 5: Deployment

#### Manual Deployment

```bash
# Copy built application to deployment location
cp -r ../VSCode-darwin-arm64/ /Applications/AINativeStudio.app

# Set proper permissions
chmod -R 755 /Applications/AINativeStudio.app

# Launch application
open /Applications/AINativeStudio.app
```

#### Automated Deployment (CI/CD)

See `.github/workflows/release.yml` for automated build and release process.

```bash
# Tag release
git tag v1.0.0

# Push tag to trigger release workflow
git push origin v1.0.0
```

GitHub Actions will:
1. Build all platforms
2. Create GitHub release
3. Upload platform artifacts

---

## Verification

### Post-Deployment Checks

#### 1. Service Registration Verification

Open the application and check the developer console:

```javascript
// In developer tools console
// Verify services are registered
console.log('Auth Service:', window.require('vs/platform/instantiation/common/extensions').getSingleton('ainativeCloudAuthService'));
```

Expected: Service instance should be available

#### 2. Authentication Flow Test

1. **Launch Application**
   - Open AINative Studio IDE
   - Navigate to Settings → AINative Cloud

2. **Test Login**
   ```
   Email: test@example.com
   Password: TestPassword123!
   ```

3. **Verify Token Storage**
   - macOS: Check Keychain Access for "ainative-auth-tokens-prod"
   - Windows: Check Credential Manager
   - Linux: Use `secret-tool search service ainative`

4. **Test API Calls**
   - List AI models
   - Invoke a model
   - Check usage statistics

#### 3. Security Verification

```bash
# Check logs for token exposure (should be clean)
grep -i "token" ~/.ainativestudio/logs/*.log

# Verify HTTPS in logs
grep "https://api.ainative.studio" ~/.ainativestudio/logs/*.log

# Verify no HTTP fallback
! grep "http://api.ainative.studio" ~/.ainativestudio/logs/*.log
```

#### 4. Error Handling Test

1. **Network Failure**
   - Disconnect internet
   - Attempt login
   - Should show user-friendly error, not stack trace

2. **Invalid Credentials**
   - Login with wrong password
   - Should show "Invalid credentials" message

3. **Token Expiration**
   - Wait for token expiration (or manually expire)
   - Make API call
   - Should auto-refresh token

### Success Criteria

- [ ] Application launches without errors
- [ ] Login flow completes successfully
- [ ] Tokens are encrypted in storage
- [ ] All API calls use HTTPS
- [ ] Certificate pinning active (if configured)
- [ ] No tokens in logs
- [ ] Error messages are user-friendly
- [ ] Auto token refresh works
- [ ] Logout clears all tokens
- [ ] Model registry accessible
- [ ] Usage tracking functional

---

## Monitoring

### Application Logs

Logs are stored in:
- **macOS:** `~/Library/Application Support/AINativeStudio/logs/`
- **Windows:** `%APPDATA%\AINativeStudio\logs\`
- **Linux:** `~/.config/AINativeStudio/logs/`

### Key Log Patterns

```bash
# Monitor authentication events
tail -f ~/.config/AINativeStudio/logs/main.log | grep "AINativeCloudAuthService"

# Monitor API calls
tail -f ~/.config/AINativeStudio/logs/main.log | grep "AIModelRegistryService"

# Monitor errors
tail -f ~/.config/AINativeStudio/logs/main.log | grep "ERROR"
```

### Metrics to Monitor

1. **Authentication Metrics**
   - Login success rate
   - Login failure reasons
   - Token refresh frequency
   - Session duration

2. **API Performance**
   - API response times
   - API error rates
   - Retry attempts
   - Rate limit hits

3. **Usage Metrics**
   - Model invocations per user
   - Token usage
   - Quota consumption
   - Cost per user

### Alerting

Set up alerts for:
- High authentication failure rate (>5%)
- Elevated API error rate (>1%)
- Quota exceeded warnings
- Certificate expiration (30 days before)
- Unusual usage patterns

---

## Troubleshooting

### Common Issues

#### Issue 1: Login Fails with "Network Error"

**Symptoms:**
- Login button shows "Network Error"
- Console shows `Failed to fetch`

**Diagnosis:**
```bash
# Test API connectivity
curl -I https://api.ainative.studio/v1/health

# Check DNS resolution
nslookup api.ainative.studio

# Verify firewall
sudo lsof -i :443 | grep AINative
```

**Solutions:**
1. Verify internet connection
2. Check firewall allows HTTPS outbound
3. Verify API URL in `.env.production`
4. Check for proxy/VPN interference

#### Issue 2: Certificate Pinning Failure

**Symptoms:**
- Login fails with "Certificate validation failed"
- Console shows certificate mismatch

**Diagnosis:**
```bash
# Get current certificate fingerprint
openssl s_client -servername api.ainative.studio \
  -connect api.ainative.studio:443 2>/dev/null | \
  openssl x509 -fingerprint -sha256 -noout
```

**Solutions:**
1. Update `CERT_FINGERPRINT` in `.env.production`
2. Verify certificate hasn't been rotated
3. Temporarily disable pinning for testing: `ENABLE_CERT_PINNING=false`

#### Issue 3: Token Storage Fails

**Symptoms:**
- Login succeeds but tokens not persisted
- Re-login required on every restart

**Diagnosis:**
```bash
# macOS: Check Keychain access
security find-generic-password -s "ainative-auth-tokens-prod"

# Check encryption service logs
grep "EncryptionService" ~/.config/AINativeStudio/logs/main.log
```

**Solutions:**
1. Grant Keychain access to application (macOS)
2. Enable Credential Manager (Windows)
3. Install libsecret (Linux): `sudo apt install libsecret-1-0`
4. Verify `TOKEN_STORAGE_PROVIDER=electron-safe-storage`

#### Issue 4: Token Refresh Fails

**Symptoms:**
- Session expires unexpectedly
- "Token expired" errors

**Diagnosis:**
```bash
# Check token refresh logs
grep "Token refresh" ~/.config/AINativeStudio/logs/main.log
```

**Solutions:**
1. Verify refresh token is stored
2. Check system clock synchronization
3. Verify API `/v1/auth/refresh` endpoint is accessible
4. Re-login to obtain new tokens

#### Issue 5: Usage Tracking Not Syncing

**Symptoms:**
- Usage statistics not updating
- Quota warnings not appearing

**Diagnosis:**
```bash
# Check sync logs
grep "UsageTrackingService" ~/.config/AINativeStudio/logs/main.log | grep "sync"
```

**Solutions:**
1. Verify `ENABLE_AUTO_SYNC=true`
2. Check `AINATIVE_SYNC_INTERVAL` is reasonable
3. Verify authenticated status
4. Manually trigger sync via developer console

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# .env.development (temporary)
LOG_LEVEL=debug
ENABLE_AUTH_LOGGING=true
DEVELOPMENT_MODE=true
```

Restart application and check logs for detailed information.

### Getting Help

For additional support:

1. **Documentation:** Check `/docs/` directory
2. **Security Review:** See `docs/SECURITY_REVIEW.md`
3. **GitHub Issues:** Submit issue with logs (sanitize sensitive data)
4. **Support Email:** support@ainative.studio

---

## Rollback Procedures

### Emergency Rollback

If critical issues are discovered post-deployment:

#### Step 1: Disable Cloud Authentication

```bash
# Quick disable via environment
echo "ENABLE_AINATIVE_CLOUD=false" >> .env.production

# Restart application
```

#### Step 2: Revert to Previous Build

```bash
# Restore previous application bundle
cp -r /backup/AINativeStudio-v0.9.9.app /Applications/AINativeStudio.app

# Or revert git tag
git checkout v0.9.9
npm run gulp vscode-darwin-arm64
```

#### Step 3: Clear User Data (if needed)

```bash
# WARNING: This clears all user tokens and settings

# macOS
rm -rf ~/Library/Application\ Support/AINativeStudio/
rm -rf ~/Library/Caches/AINativeStudio/

# Windows
rd /s /q %APPDATA%\AINativeStudio
rd /s /q %LOCALAPPDATA%\AINativeStudio

# Linux
rm -rf ~/.config/AINativeStudio/
rm -rf ~/.cache/AINativeStudio/
```

#### Step 4: Notify Users

Prepare user communication:
- Describe the issue
- Explain rollback action
- Provide timeline for fix
- Offer support contact

### Gradual Rollout

For safer deployment:

1. **Canary Deployment** (5% of users)
2. **Monitor for 24 hours**
3. **Expand to 25% if stable**
4. **Monitor for 48 hours**
5. **Full rollout to 100%**

Use feature flag to control rollout:

```bash
# .env.production (gradual rollout)
ENABLE_AINATIVE_CLOUD=true
CLOUD_AUTH_ROLLOUT_PERCENTAGE=5  # Start with 5%
```

---

## Change Log

### Version 1.0.0 (2026-01-04)

**Initial Release**
- AINative Cloud Authentication
- AI Model Registry integration
- Usage tracking and quota management
- Encrypted token storage
- Automatic token refresh
- Multi-environment support

**Security Features**
- JWT-based authentication
- Platform-native token encryption
- HTTPS enforcement
- Certificate pinning support
- Secure session management

**Services**
- AINativeCloudAuthService
- AIModelRegistryService
- UsageTrackingService

---

## Appendix

### A. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/auth/register` | POST | User registration |
| `/v1/auth/login-json` | POST | User login |
| `/v1/auth/logout` | POST | User logout |
| `/v1/auth/refresh` | POST | Token refresh |
| `/v1/auth/me` | GET | Get current user |
| `/v1/auth/forgot-password` | POST | Password reset request |
| `/v1/auth/reset-password` | POST | Password reset confirm |
| `/v1/auth/change-password` | POST | Change password |
| `/v1/auth/verify-token` | POST | Validate token |
| `/v1/auth/verify-email` | POST | Email verification |
| `/v1/models/list` | GET | List AI models |
| `/v1/models/invoke` | POST | Invoke model |
| `/v1/usage/stats` | GET | Usage statistics |
| `/v1/usage/quota` | GET | Quota information |

### B. Storage Keys

| Key | Scope | Purpose |
|-----|-------|---------|
| `ainative.cloud.auth.accessToken` | Application | Encrypted access token |
| `ainative.cloud.auth.refreshToken` | Application | Encrypted refresh token |
| `ainative.cloud.auth.user` | Application | User profile data |
| `ainative.usage.records` | Application | Local usage records |
| `ainative.usage.lastSync` | Application | Last cloud sync timestamp |

### C. Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_CREDENTIALS` | Login failed | Check email/password |
| `NETWORK_ERROR` | Network failure | Check connectivity |
| `TOKEN_EXPIRED` | Token expired | Auto-refresh or re-login |
| `TOKEN_REFRESH_FAILED` | Refresh failed | Re-login required |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `QUOTA_EXCEEDED` | Usage quota exceeded | Upgrade plan or wait |
| `EMAIL_ALREADY_EXISTS` | Duplicate registration | Use different email |
| `WEAK_PASSWORD` | Password too weak | Use stronger password |

---

**Document Version:** 1.0.0
**Author:** DevOps Team
**Contact:** devops@ainative.studio
**Last Review:** 2026-01-04
