# AINativeStudio-IDE: Antigravity OAuth & Auto-Updates Implementation Plan

**Document Version:** 1.0
**Date:** January 1, 2026
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Antigravity OAuth Authentication](#antigravity-oauth-authentication)
4. [Google CLI Authentication Alternative](#google-cli-authentication-alternative)
5. [Auto-Update System Configuration](#auto-update-system-configuration)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Technical Architecture](#technical-architecture)
8. [Security Considerations](#security-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)

---

## Executive Summary

This document outlines the implementation plan for two critical features for AINativeStudio-IDE:

1. **Antigravity OAuth Integration**: Enable authentication against Google's Antigravity IDE to access premium models (gemini-3-pro-high, claude-opus-4-5-thinking) using Google credentials and rate limits
2. **Auto-Update System**: Configure and deploy a production-ready auto-update mechanism for pushing IDE updates to users

### Key Decisions

**For Antigravity Authentication:**
- **RECOMMENDED: Hybrid Approach** - Support both Antigravity OAuth AND Google CLI authentication
- **Rationale**: Maximum flexibility for users while leveraging existing infrastructure

**For Auto-Updates:**
- **REQUIRED: Update Server Infrastructure** - Deploy update server at api.ainative.studio/api/update
- **RECOMMENDED: Leverage GitHub Releases** - Use existing GitHub Actions for builds + custom update endpoint

---

## Current State Analysis

### Existing Authentication System

AINativeStudio-IDE currently implements:

1. **AINative Cloud Authentication** (JWT-based)
   - Location: `ainative-studio/src/vs/workbench/contrib/ainative/common/ainativeAuthService.ts`
   - Endpoints: https://api.ainative.studio/v1/auth/login-json, /v1/auth/refresh
   - Features: Email/password login, token refresh, encrypted storage

2. **GitHub OAuth Authentication**
   - Location: `ainative-studio/src/vs/workbench/contrib/ainative/common/githubOAuthService.ts`
   - Endpoints: https://github.com/login/oauth/authorize
   - Features: CSRF protection, state validation, 10-minute expiry window
   - Callback: `ainativestudio://auth/github/callback`

3. **API Key Storage**
   - Location: `ainative-studio/src/vs/workbench/contrib/ainative/common/ainativeSettingsService.ts`
   - Encryption: IEncryptionService (OS-level encryption)
   - Supported Providers: Anthropic, OpenAI, Google Gemini, Mistral, Groq, xAI, etc.

### Existing Update System

AINativeStudio-IDE inherits VS Code's comprehensive update infrastructure:

1. **Platform-Specific Services**
   - macOS: `updateService.darwin.ts` (Squirrel.Mac via Electron autoUpdater)
   - Windows: `updateService.win32.ts` (Setup.exe with SHA256 verification)
   - Linux: `updateService.linux.ts` (Manual download)
   - Snap: `updateService.snap.ts` (Snap daemon integration)

2. **Update Flow**
   - State Machine: Uninitialized → Idle → Checking → Available → Downloading → Downloaded → Ready
   - IPC Communication: Main process (updates) ↔ Renderer process (UI notifications)
   - Configuration: `update.mode` setting (none, manual, start, default)

3. **AINative-Specific Wrappers**
   - `ainativeUpdateService.ts`: Browser-side IPC proxy
   - `ainativeUpdateMainService.ts`: Main process logic with GitHub API fallback
   - Auto-check: Every 3 hours (configurable)

### Missing Components

**For Antigravity Auth:**
- ❌ Antigravity OAuth service
- ❌ Google Cloud CLI integration
- ❌ Antigravity model provider implementation
- ❌ Token refresh mechanism for Antigravity
- ❌ UI for Antigravity authentication

**For Auto-Updates:**
- ❌ Update server endpoint (product.json: `updateUrl` is undefined)
- ❌ Update server implementation
- ❌ Release artifact hosting
- ❌ Version comparison logic on server
- ❌ Update metadata generation

---

## Antigravity OAuth Authentication

### Overview

Google's Antigravity IDE provides access to premium AI models through Google Cloud credentials:
- **Models**: gemini-3-pro-high, claude-opus-4-5-thinking, gemini-3-flash, etc.
- **Benefits**: Antigravity rate limits, dual quota system (Antigravity + Gemini CLI)
- **Existing Solutions**: opencode-google-antigravity-auth, antigravity-claude-proxy

### Architecture Design

#### Option 1: Direct Antigravity OAuth (Recommended)

**Flow:**
```
1. User clicks "Sign in with Google (Antigravity)"
2. IDE initiates OAuth flow with local callback listener (http://localhost:36742/oauth-callback)
3. User authenticates in browser with Google account
4. OAuth callback returns authorization code
5. IDE exchanges code for Antigravity access token
6. Token stored encrypted in ainative.oauth.antigravity.token
7. Auto-refresh on 401 responses
```

**Implementation Files:**

1. **Service Interface**
   - Path: `ainative-studio/src/vs/workbench/contrib/ainative/common/antigravityOAuthService.ts`
   - Interface: `IAntigravityOAuthService`
   - Methods:
     - `initiateOAuthFlow(): Promise<void>`
     - `handleCallback(code: string, state: string): Promise<AntigravityAuthResult>`
     - `refreshToken(): Promise<string>`
     - `getAccessToken(): Promise<string | null>`
     - `logout(): Promise<void>`

2. **OAuth Configuration**
   ```typescript
   const ANTIGRAVITY_OAUTH_CONFIG = {
     authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
     tokenEndpoint: 'https://oauth2.googleapis.com/token',
     scopes: [
       'https://www.googleapis.com/auth/cloud-platform',
       'openid',
       'email',
       'profile'
     ],
     redirectUri: 'ainativestudio://auth/antigravity/callback',
     clientId: '<OBTAIN_FROM_GOOGLE_CLOUD_CONSOLE>',
     // Note: Desktop apps use PKCE (Proof Key for Code Exchange) instead of client secret
   };
   ```

3. **Model Provider**
   - Path: `ainative-studio/src/vs/workbench/contrib/ainative/electron-main/llmMessage/providers/antigravityProvider.ts`
   - API Endpoint: Antigravity's Cloud Code API (to be discovered via reverse engineering or documentation)
   - Request Format: Convert Anthropic format → Google Generative AI format with Cloud Code wrapping
   - Response Format: Convert back to Anthropic format, preserving thinking/streaming

4. **URL Handler**
   - Path: `ainative-studio/src/vs/workbench/contrib/ainative/browser/antigravityOAuthUrlHandler.ts`
   - Protocol: `ainativestudio://auth/antigravity/callback`
   - Validation: CSRF state token, 10-minute expiry

5. **Settings Integration**
   - Add to `defaultProviderSettings`:
     ```typescript
     antigravity: {
       authMethod: 'oauth' | 'cli',
       oauthToken: '',  // Encrypted
       cliPath: '/usr/local/bin/gcloud',  // For CLI method
     }
     ```

#### Option 2: Proxy via antigravity-claude-proxy (Simpler, Less Flexible)

**Flow:**
```
1. User installs antigravity-claude-proxy globally: npm install -g antigravity-claude-proxy
2. User runs: antigravity-claude-proxy start (runs on http://localhost:8080)
3. User authenticates via proxy: antigravity-claude-proxy accounts add
4. AINativeStudio-IDE configures OpenAI-compatible provider:
   - Base URL: http://localhost:8080
   - API Key: "test" (dummy value)
   - Model: claude-opus-4-5-thinking
```

**Pros:**
- No custom OAuth implementation needed
- Leverages existing openAI-compatible provider code
- Multi-account load balancing built-in

**Cons:**
- External dependency (requires npm package)
- Extra process running
- Less integrated UX

### Implementation Steps

#### Phase 1: Service Infrastructure (Week 1)

1. **Create Antigravity OAuth Service**
   ```bash
   # Files to create:
   ainative-studio/src/vs/workbench/contrib/ainative/common/antigravityOAuthService.ts
   ainative-studio/src/vs/workbench/contrib/ainative/browser/antigravityOAuthUrlHandler.ts
   ```

2. **Register Service**
   - Location: End of `antigravityOAuthService.ts`
   ```typescript
   registerSingleton(IAntigravityOAuthService, AntigravityOAuthService, InstantiationType.Delayed);
   ```

3. **Register URL Handler**
   - Location: `antigravityOAuthUrlHandler.ts`
   ```typescript
   registerWorkbenchContribution2(
     AntigravityOAuthUrlHandler.ID,
     AntigravityOAuthUrlHandler,
     WorkbenchPhase.Eventually
   );
   ```

4. **Update product.json**
   ```json
   {
     "urlProtocol": "ainativestudio",
     "linkProtectionTrustedDomains": [
       "https://accounts.google.com",
       "https://oauth2.googleapis.com"
     ]
   }
   ```

#### Phase 2: Model Provider (Week 2)

1. **Create Antigravity Provider**
   ```bash
   ainative-studio/src/vs/workbench/contrib/ainative/electron-main/llmMessage/providers/antigravityProvider.ts
   ```

2. **Implement Request Transformation**
   - Input: Anthropic-format messages
   - Output: Google Generative AI format with Cloud Code wrapping
   - Headers: Include OAuth token, thinking headers

3. **Implement Response Streaming**
   - Parse Antigravity responses
   - Convert to Anthropic SSE format
   - Handle thinking tokens separately

4. **Register Provider**
   - Location: `sendLLMMessage.impl.ts`
   - Add case for `providerName === 'antigravity'`

#### Phase 3: UI Integration (Week 3)

1. **Login Modal**
   - Add "Sign in with Google (Antigravity)" button
   - Location: Existing login modal component

2. **Settings UI**
   - Add Antigravity section to AI provider settings
   - Options: OAuth vs CLI authentication
   - Display: Current user email, quota status

3. **Model Selection**
   - Add Antigravity models to model picker:
     - gemini-3-pro-high
     - gemini-3-flash
     - claude-opus-4-5-thinking
     - claude-sonnet-4-5-thinking

#### Phase 4: Testing & Refinement (Week 4)

1. **Unit Tests**
   - OAuth flow validation
   - CSRF protection
   - Token refresh

2. **Integration Tests**
   - End-to-end authentication flow
   - Model request/response transformation
   - Error handling (rate limits, expired tokens)

3. **User Acceptance Testing**
   - Beta users test authentication
   - Verify model access and quota

---

## Google CLI Authentication Alternative

### Overview

**Google Cloud CLI (`gcloud`)** provides a simpler authentication path for users who already have gcloud installed.

### Advantages

1. **No OAuth Implementation Needed**: Leverage existing gcloud auth
2. **Familiar Workflow**: Many developers already use gcloud
3. **Application Default Credentials**: Standard Google Cloud pattern
4. **Automatic Token Refresh**: Handled by gcloud SDK

### Architecture Design

#### Authentication Flow

```
1. User installs Google Cloud CLI (https://cloud.google.com/sdk/docs/install)
2. User runs: gcloud auth application-default login
3. Google OAuth flow in browser
4. Credentials stored at: ~/.config/gcloud/application_default_credentials.json
5. AINativeStudio-IDE uses GoogleAuth library to read credentials
6. Access tokens obtained automatically via GoogleAuth.getAccessToken()
```

#### Implementation

1. **Dependency Addition**
   - Package: `google-auth-library`
   - Already used in codebase (see `sendLLMMessage.impl.ts:24-30`)

2. **Token Retrieval**
   ```typescript
   import { GoogleAuth } from 'google-auth-library';

   async function getAntigravityToken(): Promise<string> {
     const auth = new GoogleAuth({
       scopes: 'https://www.googleapis.com/auth/cloud-platform'
     });
     const token = await auth.getAccessToken();
     if (!token) {
       throw new Error('Failed to obtain Google access token. Run: gcloud auth application-default login');
     }
     return token;
   }
   ```

3. **User Instructions**
   - IDE detects if gcloud is installed: `which gcloud` (macOS/Linux) or `where gcloud` (Windows)
   - If not installed, show instructions
   - If installed but not authenticated, show: "Run `gcloud auth application-default login` in terminal"

4. **Settings Configuration**
   ```typescript
   antigravity: {
     authMethod: 'cli',  // User selects this option
     cliPath: '/usr/local/bin/gcloud',  // Auto-detected or manual
   }
   ```

### Comparison: Antigravity OAuth vs Google CLI

| Feature | Antigravity OAuth | Google CLI |
|---------|-------------------|------------|
| **Setup Complexity** | Medium (OAuth implementation) | Low (use existing GoogleAuth) |
| **User Experience** | Seamless (in-IDE auth) | External (terminal command) |
| **Dependencies** | None (self-contained) | Requires gcloud CLI |
| **Token Management** | Manual refresh logic | Automatic (handled by gcloud) |
| **Multi-Account** | Supported (switch in IDE) | Supported (gcloud config) |
| **Offline Support** | Yes (with refresh token) | Yes (cached credentials) |
| **Ideal For** | All users | Developers with gcloud |

### Recommendation: Hybrid Approach

**Implement BOTH methods and let users choose:**

1. **Preferred Method Detection**
   - Check if `~/.config/gcloud/application_default_credentials.json` exists
   - If yes, offer CLI method as default (faster to implement)
   - If no, offer OAuth method

2. **Settings UI**
   ```
   Antigravity Authentication Method:
   ○ OAuth (Sign in with Google in browser)
   ○ Google Cloud CLI (Use gcloud auth)

   [Configure Authentication]
   ```

3. **Phased Rollout**
   - **Phase 1 (Fast)**: Implement Google CLI method (1 week)
   - **Phase 2 (Polish)**: Add OAuth method (3 weeks)
   - **Phase 3 (Premium)**: Add multi-account support, quota display

---

## Auto-Update System Configuration

### Overview

AINativeStudio-IDE inherits VS Code's sophisticated multi-platform update system but lacks:
1. Update server endpoint
2. Update metadata generation
3. Production configuration

### Current State

**Existing Infrastructure:**
- ✅ Platform-specific update services (macOS, Windows, Linux, Snap)
- ✅ State machine (Checking → Available → Downloading → Downloaded → Ready)
- ✅ IPC communication (Main ↔ Renderer)
- ✅ UI notifications and actions
- ✅ GitHub Actions for building releases

**Missing Configuration:**
- ❌ `product.json`:
  - `updateUrl: undefined`
  - `downloadUrl: undefined`
  - `releaseNotesUrl: undefined`
  - `quality: undefined`
  - `commit: undefined`

### Architecture Design

#### Update Server Endpoint

**Server URL Structure:**
```
GET https://api.ainative.studio/api/update/{platform}/{quality}/{commit}
```

**Request Parameters:**
- `{platform}`: darwin, darwin-arm64, win32-x64, win32-arm64, linux-x64, etc.
- `{quality}`: stable, insider, dev
- `{commit}`: Current IDE commit hash (40-character hex)

**Response Format (Update Available):**
```json
{
  "version": "abc123def456789...",
  "productVersion": "1.5.0",
  "timestamp": 1704672000000,
  "url": "https://github.com/AINative-Studio/AINativeStudio-IDE/releases/download/v1.5.0/AINativeStudio-darwin-arm64.zip",
  "sha256hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

**Response (No Update):**
```
HTTP 204 No Content
```

#### Implementation Options

##### Option 1: GitHub Releases API Proxy (Recommended)

**Rationale:** Leverage existing GitHub Actions infrastructure

**Architecture:**
```
1. GitHub Actions builds release → Creates GitHub Release with tag v1.5.0
2. Update server fetches latest release from GitHub API
3. Update server compares client commit vs latest release commit
4. If newer, returns release metadata
```

**Server Implementation (Node.js/Express):**

```javascript
// api.ainative.studio/api/update/:platform/:quality/:commit
app.get('/api/update/:platform/:quality/:commit', async (req, res) => {
  const { platform, quality, commit } = req.params;

  // 1. Fetch latest release from GitHub
  const release = await octokit.repos.getLatestRelease({
    owner: 'AINative-Studio',
    repo: 'AINativeStudio-IDE'
  });

  // 2. Compare commits
  if (release.target_commitish === commit) {
    return res.status(204).send(); // No update
  }

  // 3. Find matching asset for platform
  const assetName = getAssetNameForPlatform(platform);
  const asset = release.assets.find(a => a.name.includes(assetName));

  if (!asset) {
    return res.status(404).json({ error: 'No build for platform' });
  }

  // 4. Return update metadata
  res.json({
    version: release.target_commitish,
    productVersion: release.tag_name.replace('v', ''),
    timestamp: new Date(release.published_at).getTime(),
    url: asset.browser_download_url,
    sha256hash: asset.sha256 || '' // Generate during build
  });
});

function getAssetNameForPlatform(platform) {
  const platformMap = {
    'darwin': 'darwin-x64',
    'darwin-arm64': 'darwin-arm64',
    'win32-x64': 'win32-x64',
    'win32-arm64': 'win32-arm64',
    'linux-x64': 'linux-x64',
    // Add more...
  };
  return platformMap[platform];
}
```

**Deployment:**
- Deploy to Vercel/Cloudflare Workers (serverless)
- Cache GitHub API responses (5-minute TTL)
- Add authentication (optional, for private repos)

##### Option 2: Custom Update Server with Database

**Rationale:** More control, versioning history, staged rollouts

**Architecture:**
```
1. GitHub Actions build → Upload to S3/R2
2. GitHub Actions → POST to update server with metadata
3. Update server stores in database (PostgreSQL/SQLite)
4. Supports staged rollouts (10% users → 50% → 100%)
```

**Schema:**
```sql
CREATE TABLE releases (
  id SERIAL PRIMARY KEY,
  version VARCHAR(40) NOT NULL,
  product_version VARCHAR(20) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  quality VARCHAR(20) NOT NULL,
  url TEXT NOT NULL,
  sha256 VARCHAR(64),
  timestamp BIGINT NOT NULL,
  rollout_percentage INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Pros:**
- Staged rollouts (canary deployments)
- Analytics (update success rates)
- Versioning history

**Cons:**
- More infrastructure complexity
- Requires database + hosting

##### Option 3: Static JSON Files (Simplest, Not Recommended)

**Architecture:**
```
1. GitHub Actions generates JSON files per platform/quality
2. Upload to CDN (e.g., updates.ainative.studio/stable/darwin-arm64.json)
3. IDE fetches JSON directly
```

**Pros:**
- Minimal infrastructure
- Fast (CDN)

**Cons:**
- No dynamic logic (version comparison)
- Manual JSON generation
- No rollback capability

### Recommendation: **Option 1 (GitHub Releases API Proxy)**

**Reasons:**
1. ✅ Leverages existing CI/CD (GitHub Actions already builds releases)
2. ✅ Minimal infrastructure (serverless function)
3. ✅ Fast to implement (1-2 days)
4. ✅ Free tier (Vercel/Cloudflare)
5. ✅ Can upgrade to Option 2 later if needed

### Implementation Steps

#### Phase 1: Update Server (Week 1)

1. **Create Update Server Repository**
   ```bash
   mkdir ainative-update-server
   cd ainative-update-server
   npm init -y
   npm install express @octokit/rest
   ```

2. **Implement Endpoint**
   - File: `index.js`
   - Deploy to Vercel: `vercel --prod`
   - URL: `https://api.ainative.studio/api/update`

3. **Test Endpoint**
   ```bash
   curl https://api.ainative.studio/api/update/darwin-arm64/stable/abc123
   ```

#### Phase 2: Product Configuration (Week 1)

1. **Update product.json**
   ```json
   {
     "updateUrl": "https://api.ainative.studio/api/update",
     "downloadUrl": "https://github.com/AINative-Studio/AINativeStudio-IDE/releases",
     "releaseNotesUrl": "https://docs.ainativestudio.com/release-notes",
     "quality": "stable",
     "commit": "${COMMIT_HASH}"
   }
   ```

2. **Inject Commit Hash During Build**
   - Location: `build/gulpfile.vscode.js` or similar
   - Use `git rev-parse HEAD` to get commit hash
   - Replace `${COMMIT_HASH}` in product.json

#### Phase 3: GitHub Actions Integration (Week 2)

1. **Update Release Workflow**
   - File: `.github/workflows/release-all-successful.yml`
   - Generate SHA256 for each asset:
     ```yaml
     - name: Generate SHA256
       run: |
         for file in *.zip *.dmg *.exe; do
           sha256sum $file > $file.sha256
         done
     ```

2. **Upload SHA256 Files**
   - Include `.sha256` files in release assets
   - Update server can fetch and include in response

3. **Tag Format**
   - Enforce: `v1.5.0` (semantic versioning)
   - Extract commit hash from tag annotation

#### Phase 4: Testing (Week 2)

1. **Create Test Release**
   - Tag: `v1.5.0-test`
   - Build artifacts
   - Upload to GitHub Releases

2. **Test Update Flow**
   - Run AINativeStudio-IDE v1.4.9
   - Trigger manual update check
   - Verify update detection
   - Verify download
   - Verify installation

3. **Platform-Specific Testing**
   - macOS: Test Squirrel.Mac flow
   - Windows: Test Setup.exe installation
   - Linux: Test manual download

#### Phase 5: Production Rollout (Week 3)

1. **Enable Auto-Updates**
   - Default `update.mode` to `default` (automatic checks)
   - Initial check: 30 seconds after launch
   - Recurring: Every 1 hour

2. **Monitor Metrics**
   - Update check requests
   - Download success rate
   - Installation success rate
   - Error logs

3. **Rollback Plan**
   - Keep previous version on GitHub Releases
   - Update server can point to older version if critical bug

### Advanced Features (Future)

1. **Staged Rollouts**
   - Week 1: 10% of users
   - Week 2: 50% of users
   - Week 3: 100% of users

2. **Update Channels**
   - Stable: Monthly releases
   - Insider: Weekly releases
   - Dev: Daily builds

3. **Delta Updates**
   - Only download changed files (Windows/macOS)
   - Reduce bandwidth by 80%+

4. **Background Updates**
   - Download in background
   - Apply on next restart
   - Windows: `update.enableWindowsBackgroundUpdates = true`

---

## Implementation Roadmap

### Timeline Overview

| Week | Focus Area | Deliverables |
|------|------------|--------------|
| **Week 1** | Antigravity CLI Auth | Google CLI authentication working |
| **Week 2** | Update Server | Update server deployed and tested |
| **Week 3** | Product Config | product.json configured, builds include commit hash |
| **Week 4** | Antigravity OAuth | OAuth flow implemented |
| **Week 5** | Model Provider | Antigravity models accessible |
| **Week 6** | Testing & QA | End-to-end testing both features |
| **Week 7** | Beta Release | Limited release to beta users |
| **Week 8** | Production | Full rollout with monitoring |

### Detailed Breakdown

#### Week 1: Google CLI Authentication (Priority 1)

**Objective:** Enable Antigravity access via gcloud CLI

**Tasks:**
1. Create `antigravityCliAuthService.ts` (1 day)
2. Implement `getAccessToken()` using GoogleAuth (1 day)
3. Add settings UI for CLI path configuration (1 day)
4. Test authentication with existing gcloud setup (1 day)
5. Documentation: User guide for gcloud setup (1 day)

**Success Criteria:**
- ✅ Users with gcloud can authenticate
- ✅ Access token obtained successfully
- ✅ Token auto-refreshes on expiry

#### Week 2: Update Server Deployment (Priority 1)

**Objective:** Deploy functional update server

**Tasks:**
1. Create Express.js server with GitHub API integration (2 days)
2. Implement platform detection and asset mapping (1 day)
3. Deploy to Vercel/Cloudflare (1 day)
4. Test all platform endpoints (1 day)

**Success Criteria:**
- ✅ Server responds correctly to update checks
- ✅ Returns 204 when no update
- ✅ Returns metadata when update available
- ✅ Sub-500ms response time

#### Week 3: Product Configuration & Build (Priority 1)

**Objective:** Configure product.json and build process

**Tasks:**
1. Update product.json with URLs (1 day)
2. Modify build scripts to inject commit hash (2 days)
3. Generate SHA256 for release artifacts (1 day)
4. Test build process end-to-end (1 day)

**Success Criteria:**
- ✅ product.json contains valid URLs
- ✅ Commit hash injected during build
- ✅ SHA256 files generated for all artifacts

#### Week 4: Antigravity OAuth Implementation (Priority 2)

**Objective:** Implement OAuth flow for Antigravity

**Tasks:**
1. Create `antigravityOAuthService.ts` (2 days)
2. Implement PKCE flow with local callback listener (2 days)
3. Add URL handler for OAuth callback (1 day)

**Success Criteria:**
- ✅ OAuth flow completes successfully
- ✅ Access token stored encrypted
- ✅ CSRF protection working

#### Week 5: Antigravity Model Provider (Priority 2)

**Objective:** Enable model requests via Antigravity

**Tasks:**
1. Create `antigravityProvider.ts` (2 days)
2. Implement request/response transformation (2 days)
3. Add models to model picker (1 day)

**Success Criteria:**
- ✅ Can send messages to Antigravity models
- ✅ Streaming responses work correctly
- ✅ Thinking tokens preserved

#### Week 6: Testing & QA (Priority 1)

**Objective:** Comprehensive testing

**Tasks:**
1. Unit tests for all services (2 days)
2. Integration tests (2 days)
3. Manual QA across platforms (1 day)

**Success Criteria:**
- ✅ >80% code coverage
- ✅ All integration tests passing
- ✅ No critical bugs

#### Week 7: Beta Release (Priority 1)

**Objective:** Limited release to beta users

**Tasks:**
1. Deploy update server to production (1 day)
2. Create beta release (v1.5.0-beta) (1 day)
3. Invite beta users (50-100 users) (1 day)
4. Monitor feedback and errors (2 days)

**Success Criteria:**
- ✅ Beta users successfully update
- ✅ Antigravity auth working for beta users
- ✅ <5% error rate

#### Week 8: Production Rollout (Priority 1)

**Objective:** Full production release

**Tasks:**
1. Fix any critical bugs from beta (2 days)
2. Create production release (v1.5.0) (1 day)
3. Enable auto-updates for all users (1 day)
4. Monitor metrics and errors (1 day)

**Success Criteria:**
- ✅ >90% of users updated successfully
- ✅ <2% error rate
- ✅ Positive user feedback

---

## Technical Architecture

### System Diagram: Antigravity OAuth

```
┌─────────────────────────────────────────────────────────────────┐
│                    AINativeStudio-IDE                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Browser Process (Renderer)                      │   │
│  │                                                         │   │
│  │  ┌──────────────────────┐    ┌───────────────────┐     │   │
│  │  │ Login Modal          │    │ Settings UI       │     │   │
│  │  │ - OAuth Button       │    │ - Auth Method     │     │   │
│  │  │ - CLI Instructions   │    │ - Token Status    │     │   │
│  │  └──────────┬───────────┘    └─────────┬─────────┘     │   │
│  │             │                           │               │   │
│  │             └───────────┬───────────────┘               │   │
│  │                         │                               │   │
│  │             ┌───────────▼──────────────┐                │   │
│  │             │ IAntigravityOAuthService │                │   │
│  │             │ (IPC Proxy)              │                │   │
│  │             └───────────┬──────────────┘                │   │
│  └─────────────────────────┼─────────────────────────────┘   │
│                            │ IPC                             │
│  ┌─────────────────────────▼─────────────────────────────┐   │
│  │         Main Process (Electron)                       │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │ AntigravityOAuthService (Main)               │    │   │
│  │  │ - initiateOAuthFlow()                        │    │   │
│  │  │ - handleCallback()                           │    │   │
│  │  │ - refreshToken()                             │    │   │
│  │  └────────┬──────────────────────┬──────────────┘    │   │
│  │           │                      │                   │   │
│  │           │ Store Token          │ Use Token         │   │
│  │           │                      │                   │   │
│  │  ┌────────▼────────┐   ┌────────▼──────────────┐    │   │
│  │  │EncryptionService│   │ AntigravityProvider   │    │   │
│  │  │ (OS Keychain)   │   │ - sendChatCompletion()│    │   │
│  │  └─────────────────┘   └───────────┬───────────┘    │   │
│  └────────────────────────────────────┼───────────────┘   │
└────────────────────────────────────────┼───────────────────┘
                                         │ HTTPS
                      ┌──────────────────▼────────────────┐
                      │ Antigravity Cloud Code API        │
                      │ - Gemini Models                   │
                      │ - Claude Models (via Antigravity) │
                      └───────────────────────────────────┘
```

### System Diagram: Auto-Updates

```
┌─────────────────────────────────────────────────────────────────┐
│                    AINativeStudio-IDE v1.4.9                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Browser Process (Renderer)                      │   │
│  │                                                         │   │
│  │  ┌──────────────────────┐    ┌───────────────────┐     │   │
│  │  │ Update Notification  │    │ Update Menu       │     │   │
│  │  │ - Download           │    │ - Check for Update│     │   │
│  │  │ - Restart            │    │ - Release Notes   │     │   │
│  │  └──────────┬───────────┘    └─────────┬─────────┘     │   │
│  │             │                           │               │   │
│  │             └───────────┬───────────────┘               │   │
│  │                         │                               │   │
│  │             ┌───────────▼──────────────┐                │   │
│  │             │ IUpdateService (Proxy)   │                │   │
│  │             │ - checkForUpdates()      │                │   │
│  │             │ - downloadUpdate()       │                │   │
│  │             │ - applyUpdate()          │                │   │
│  │             └───────────┬──────────────┘                │   │
│  └─────────────────────────┼─────────────────────────────┘   │
│                            │ IPC                             │
│  ┌─────────────────────────▼─────────────────────────────┐   │
│  │         Main Process (Electron)                       │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │ Platform Update Service                      │    │   │
│  │  │ - macOS: Electron.autoUpdater                │    │   │
│  │  │ - Windows: Setup.exe + SHA256                │    │   │
│  │  │ - Linux: Manual Download                     │    │   │
│  │  └────────┬──────────────────────┬──────────────┘    │   │
│  │           │                      │                   │   │
│  │           │ Check Update         │ Download          │   │
│  │           │                      │                   │   │
│  └───────────┼──────────────────────┼───────────────────┘   │
└─────────────┼──────────────────────┼─────────────────────────┘
              │ HTTPS GET            │ HTTPS GET
              │                      │
     ┌────────▼──────────┐  ┌────────▼──────────────┐
     │ Update Server     │  │ GitHub Releases       │
     │ /api/update/      │  │ - Binaries            │
     │ - Metadata        │  │ - SHA256 Files        │
     │ - Version Check   │  │                       │
     └────────┬──────────┘  └───────────────────────┘
              │
              │ GitHub API
     ┌────────▼──────────┐
     │ GitHub API        │
     │ /repos/.../releases│
     └───────────────────┘
```

---

## Security Considerations

### Antigravity OAuth Security

1. **PKCE (Proof Key for Code Exchange)**
   - Required for public clients (desktop apps)
   - Generate code_verifier: 43-128 character random string
   - Generate code_challenge: SHA256(code_verifier) base64url-encoded
   - Send code_challenge in authorization request
   - Send code_verifier in token request

2. **State Token**
   - Cryptographically random (32 bytes)
   - Stored encrypted
   - 10-minute expiry
   - Must match callback state

3. **Token Storage**
   - Use `IEncryptionService` (OS-level encryption)
   - Storage scope: `APPLICATION` + `MACHINE`
   - Never log tokens

4. **HTTPS Only**
   - All API requests use HTTPS
   - Reject invalid certificates

5. **Token Refresh**
   - Refresh before expiry (5 minutes buffer)
   - Retry on 401 responses
   - Logout on refresh failure

### Auto-Update Security

1. **SHA256 Verification**
   - Download artifact
   - Compute SHA256 hash
   - Compare with server-provided hash
   - Abort if mismatch

2. **HTTPS Only**
   - Update server: HTTPS
   - Download URLs: HTTPS (GitHub)

3. **Code Signing**
   - macOS: Sign with Apple Developer certificate
   - Windows: Sign with Authenticode certificate
   - Verify signatures before installation

4. **Update Server Authentication**
   - Optional: Require API key for update checks
   - Rate limiting: 1 request per hour per device
   - DDoS protection

5. **Rollback Capability**
   - Keep previous version
   - Provide rollback mechanism if update fails

---

## Testing Strategy

### Unit Tests

**Antigravity OAuth:**
- `antigravityOAuthService.test.ts`
  - `initiateOAuthFlow()` generates valid state token
  - `handleCallback()` validates state correctly
  - `handleCallback()` rejects expired state
  - `refreshToken()` updates stored token
  - `logout()` clears encrypted storage

**Auto-Updates:**
- `updateService.test.ts`
  - Platform detection works correctly
  - Version comparison logic
  - SHA256 verification
  - State transitions

### Integration Tests

**Antigravity OAuth:**
1. Full OAuth flow (mock OAuth server)
2. Token refresh on 401 response
3. Multi-account switching

**Auto-Updates:**
1. Check for updates (mock update server)
2. Download update (mock GitHub release)
3. SHA256 verification
4. Apply update (dry run)

### End-to-End Tests

**Antigravity OAuth:**
1. User clicks "Sign in with Google (Antigravity)"
2. Browser opens with OAuth URL
3. User completes authentication
4. IDE receives callback and stores token
5. User sends message to Antigravity model
6. Response streams correctly

**Auto-Updates:**
1. Launch IDE with old version
2. Auto-check triggers after 30 seconds
3. Update detected and downloaded
4. Notification displays
5. User clicks "Restart"
6. IDE relaunches with new version

### Manual Testing Checklist

**Antigravity OAuth:**
- [ ] OAuth flow on macOS
- [ ] OAuth flow on Windows
- [ ] OAuth flow on Linux
- [ ] CLI auth on macOS
- [ ] CLI auth on Windows
- [ ] CLI auth on Linux
- [ ] Token refresh after 1 hour
- [ ] Error handling (network failure)
- [ ] Logout clears credentials

**Auto-Updates:**
- [ ] macOS: Squirrel.Mac download and install
- [ ] Windows: Setup.exe download and install
- [ ] Linux: Manual download link opens
- [ ] Notification displays correctly
- [ ] Release notes open
- [ ] Update skipped if already latest
- [ ] Background update (Windows)

---

## Deployment Plan

### Pre-Deployment Checklist

**Infrastructure:**
- [ ] Update server deployed to production
- [ ] Update server DNS configured (api.ainative.studio)
- [ ] SSL certificate valid
- [ ] GitHub API token configured (if using private repo)
- [ ] Monitoring and logging enabled

**Product Configuration:**
- [ ] product.json updated with URLs
- [ ] Commit hash injection working
- [ ] SHA256 generation in CI/CD

**Testing:**
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual QA completed
- [ ] Beta testing completed

**Documentation:**
- [ ] User guide for Antigravity authentication
- [ ] Troubleshooting guide
- [ ] Release notes prepared

### Rollout Strategy

#### Phase 1: Beta Release (Week 7)

**Scope:**
- 50-100 beta users
- Tag: `v1.5.0-beta`
- Quality: `insider`

**Monitoring:**
- Error rate
- Update success rate
- Antigravity auth success rate

**Rollback Plan:**
- If >10% error rate, revert to v1.4.9

#### Phase 2: Staged Production (Week 8)

**Day 1-2: 10% of Users**
- Update server returns update to 10% of devices
- Monitor for 48 hours

**Day 3-4: 50% of Users**
- Increase to 50% if no issues
- Monitor for 48 hours

**Day 5-7: 100% of Users**
- Full rollout
- Continue monitoring

**Rollback Plan:**
- Update server can revert to older version
- Emergency hotfix process

### Post-Deployment

**Metrics to Monitor:**
1. **Update Metrics:**
   - Update check requests per hour
   - Download success rate (target: >95%)
   - Installation success rate (target: >90%)
   - Average time from check to install

2. **Antigravity Metrics:**
   - OAuth success rate (target: >95%)
   - CLI auth success rate (target: >98%)
   - Token refresh success rate (target: >99%)
   - API request latency

3. **Error Tracking:**
   - Update failures by platform
   - Authentication failures
   - Network errors
   - SHA256 mismatches

**Support Plan:**
- Documentation: https://docs.ainativestudio.com
- GitHub Issues: https://github.com/AINative-Studio/AINativeStudio-IDE/issues
- Discord/Slack support channel

---

## Appendix

### A. Antigravity Model List

Based on research, Antigravity provides access to:

**Gemini Models:**
- `gemini-3-flash` (with thinking)
- `gemini-3-pro-low` (with thinking)
- `gemini-3-pro-high` (with thinking)

**Claude Models (via Antigravity):**
- `gemini-claude-sonnet-4-5`
- `gemini-claude-sonnet-4-5-thinking`
- `gemini-claude-opus-4-5-thinking`

**Model Naming Convention:**
- Prefix: `gemini-claude-*` for Claude models accessed via Antigravity
- Suffix: `-thinking` for models with extended reasoning

### B. Update Server Reference Implementation

```javascript
// api.ainative.studio/api/update/:platform/:quality/:commit
import express from 'express';
import { Octokit } from '@octokit/rest';

const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const PLATFORM_ASSET_MAP = {
  'darwin': 'darwin-x64',
  'darwin-arm64': 'darwin-arm64',
  'win32-x64': 'win32-x64',
  'win32-x64-user': 'win32-x64-user-setup',
  'win32-arm64': 'win32-arm64',
  'linux-x64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
};

app.get('/api/update/:platform/:quality/:commit', async (req, res) => {
  try {
    const { platform, quality, commit } = req.params;

    // Fetch latest release
    const { data: release } = await octokit.repos.getLatestRelease({
      owner: 'AINative-Studio',
      repo: 'AINativeStudio-IDE'
    });

    // Check if update needed
    if (release.target_commitish === commit) {
      return res.status(204).send();
    }

    // Find asset for platform
    const assetPattern = PLATFORM_ASSET_MAP[platform];
    if (!assetPattern) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const asset = release.assets.find(a =>
      a.name.includes(assetPattern) && a.name.endsWith('.zip')
    );

    if (!asset) {
      return res.status(404).json({ error: 'No build for platform' });
    }

    // Get SHA256 file
    const sha256Asset = release.assets.find(a =>
      a.name === `${asset.name}.sha256`
    );

    let sha256hash = '';
    if (sha256Asset) {
      const { data } = await octokit.request(sha256Asset.url, {
        headers: { accept: 'application/octet-stream' }
      });
      sha256hash = data.split(' ')[0];
    }

    // Return update metadata
    res.json({
      version: release.target_commitish,
      productVersion: release.tag_name.replace('v', ''),
      timestamp: new Date(release.published_at).getTime(),
      url: asset.browser_download_url,
      sha256hash
    });

  } catch (error) {
    console.error('Update check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Update server listening on port 3000');
});
```

### C. Build Script for Commit Hash Injection

```javascript
// build/inject-commit.js
const fs = require('fs');
const { execSync } = require('child_process');

const PRODUCT_JSON_PATH = './ainative-studio/product.json';

// Get current commit hash
const commit = execSync('git rev-parse HEAD').toString().trim();

// Read product.json
const product = JSON.parse(fs.readFileSync(PRODUCT_JSON_PATH, 'utf8'));

// Inject commit hash
product.commit = commit;

// Write back
fs.writeFileSync(PRODUCT_JSON_PATH, JSON.stringify(product, null, '\t'));

console.log(`Injected commit hash: ${commit}`);
```

**Usage in GitHub Actions:**
```yaml
- name: Inject commit hash
  run: node build/inject-commit.js

- name: Build application
  run: |
    cd ainative-studio
    npm run compile
```

### D. Google Cloud Console OAuth Configuration

**Steps to obtain OAuth Client ID:**

1. Go to https://console.cloud.google.com
2. Create new project: "AINativeStudio-IDE"
3. Enable APIs:
   - Google Cloud Platform API
   - Vertex AI API
4. Go to "Credentials" → "Create Credentials" → "OAuth Client ID"
5. Application Type: "Desktop App"
6. Name: "AINativeStudio-IDE"
7. Add authorized redirect URI: `ainativestudio://auth/antigravity/callback`
8. Copy Client ID and Client Secret
9. Configure in environment variables:
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=xxx
   ```

**Scopes Required:**
```
https://www.googleapis.com/auth/cloud-platform
openid
email
profile
```

---

## Summary

This implementation plan provides a comprehensive roadmap for adding:
1. **Antigravity OAuth Authentication** - Enabling access to premium models via Google credentials
2. **Auto-Update System** - Automated update delivery to users

**Recommended Approach:**
- **Antigravity Auth**: Hybrid (Google CLI first, then OAuth)
- **Auto-Updates**: GitHub Releases API Proxy (serverless)

**Timeline:** 8 weeks from planning to production rollout

**Key Success Metrics:**
- Update success rate: >90%
- Authentication success rate: >95%
- User satisfaction: Positive feedback from beta users

**Next Steps:**
1. Review and approve this plan
2. Set up infrastructure (update server, Google Cloud Console)
3. Begin Week 1 implementation (Google CLI auth)

---

**Document Status:** Ready for Review
**Reviewers:** Engineering Team, Product Lead
**Approval Date:** TBD
