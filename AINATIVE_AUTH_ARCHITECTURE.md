# AINative Authentication Architecture for AINative Studio IDE

**Document Version:** 1.0
**Date:** January 3, 2026
**Author:** System Architect
**Status:** Architecture Design Document

---

## Executive Summary

This document outlines the comprehensive authentication architecture for integrating AINative API authentication into AINative Studio IDE. The system will provide secure, user-friendly authentication using the AINative Cloud API, enabling users to access AI models, track usage costs, and manage their accounts directly from the IDE.

### Key Decisions

1. **Dual Authentication System**: Maintain existing local provider authentication (Anthropic, OpenAI, etc.) while adding AINative Cloud authentication
2. **Encrypted Token Storage**: Use VS Code's built-in `IEncryptionService` for secure credential storage
3. **Automatic Token Refresh**: Implement transparent token refresh to maintain seamless user experience
4. **Service-Based Architecture**: Follow VS Code's dependency injection pattern for modularity and testability
5. **Progressive Enhancement**: Existing functionality continues to work; AINative authentication is additive

### Status of Existing Implementation

**Already Implemented:**
- `AINativeCloudAuthService` - Complete authentication service with login, register, logout, password reset
- `AINativeSDKClient` - HTTP client with retry logic and error handling
- `AIModelRegistryService` - Model browsing and selection (with mock data)
- Type definitions for all authentication flows

**Needs Implementation:**
- UI components for authentication flows
- Integration with existing AI features
- Live API endpoint integration (currently using mocks)
- Cost tracking and usage monitoring
- Model invocation through AINative API

---

## Table of Contents

1. [Requirements Analysis](#1-requirements-analysis)
2. [System Architecture](#2-system-architecture)
3. [Service Layer Design](#3-service-layer-design)
4. [Security Architecture](#4-security-architecture)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Integration Points](#6-integration-points)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [File Organization](#8-file-organization)
9. [API Endpoint Mapping](#9-api-endpoint-mapping)
10. [Testing Strategy](#10-testing-strategy)
11. [Risk Assessment](#11-risk-assessment)

---

## 1. Requirements Analysis

### 1.1 Functional Requirements

#### FR-1: User Authentication
- Users must be able to register new accounts with username, email, and password
- Users must be able to login with email and password
- Users must be able to logout and invalidate their session
- System must support email verification
- System must support password reset flow

#### FR-2: Token Management
- System must securely store access tokens and refresh tokens
- System must automatically refresh expired access tokens
- System must validate tokens before critical operations
- System must handle token expiration gracefully

#### FR-3: Model Registry
- Users must be able to browse available AI models
- Users must be able to filter models by provider, capabilities, and pricing
- Users must be able to select default models for their projects
- System must cache model data to minimize API calls

#### FR-4: Model Invocation
- Users must be able to invoke AI models through AINative API
- System must support both streaming and non-streaming responses
- System must track token usage and costs
- System must handle rate limiting and quota exceeded errors

#### FR-5: Usage Tracking
- Users must be able to view their usage statistics
- Users must be able to monitor their quota limits
- System must provide cost breakdowns by model
- System must alert users when approaching quota limits

### 1.2 Non-Functional Requirements

#### NFR-1: Security
- All credentials must be encrypted at rest using platform-native encryption
- All API communication must use HTTPS
- Tokens must never be logged or exposed in error messages
- Session tokens must have appropriate expiration times

#### NFR-2: Performance
- Token refresh must be transparent and non-blocking
- Model list must be cached for at least 5 minutes
- Authentication operations must complete within 5 seconds
- API requests must have configurable timeouts

#### NFR-3: Reliability
- Network failures must not corrupt authentication state
- Failed requests must retry with exponential backoff
- Rate limiting must be handled gracefully
- Offline mode must preserve cached data

#### NFR-4: Usability
- Authentication flows must be intuitive and well-documented
- Error messages must be clear and actionable
- Users must be able to switch between local and cloud authentication
- System must remember user preferences

#### NFR-5: Maintainability
- Code must follow VS Code architectural patterns
- Services must be loosely coupled
- All public APIs must be well-documented
- Tests must provide >80% code coverage

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AINative Studio IDE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              UI Layer (React Components)                │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │  Login   │ │ Register │ │  Model   │ │  Usage   │  │    │
│  │  │  Dialog  │ │  Dialog  │ │ Browser  │ │Dashboard │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           Service Layer (Browser Process)               │    │
│  │  ┌────────────────────┐  ┌─────────────────────────┐  │    │
│  │  │ AINativeCloudAuth  │  │  AIModelRegistry        │  │    │
│  │  │    Service         │  │    Service              │  │    │
│  │  └────────────────────┘  └─────────────────────────┘  │    │
│  │  ┌────────────────────┐  ┌─────────────────────────┐  │    │
│  │  │   ModelInvocation  │  │  UsageTracking          │  │    │
│  │  │    Service         │  │    Service              │  │    │
│  │  └────────────────────┘  └─────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Infrastructure Layer (Electron Main)            │    │
│  │  ┌────────────────────┐  ┌─────────────────────────┐  │    │
│  │  │  AINativeSDK       │  │  Encryption             │  │    │
│  │  │  Client            │  │  Service                │  │    │
│  │  └────────────────────┘  └─────────────────────────┘  │    │
│  │  ┌────────────────────┐  ┌─────────────────────────┐  │    │
│  │  │  Storage           │  │  Network                │  │    │
│  │  │  Service           │  │  Manager                │  │    │
│  │  └────────────────────┘  └─────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   AINative Cloud API         │
              │  (api.ainative.studio)       │
              │                              │
              │  /v1/auth/*                  │
              │  /v1/models/*                │
              │  /v1/usage/*                 │
              └──────────────────────────────┘
```

### 2.2 Component Interaction

```
User Action                Service Layer                    API Layer
─────────────────────────────────────────────────────────────────────

Login
  │
  ├─> CloudAuthService.login(email, password)
  │                    │
  │                    ├─> SDKClient.login()
  │                    │              │
  │                    │              ├─> POST /v1/auth/login-json
  │                    │              │
  │                    │              └─< {access_token, refresh_token, user}
  │                    │
  │                    ├─> EncryptionService.encrypt(tokens)
  │                    │
  │                    ├─> StorageService.store(encrypted_data)
  │                    │
  │                    └─> Fire onDidChangeAuthState(Authenticated)
  │
  └─< Success/Error


Browse Models
  │
  ├─> ModelRegistryService.listModels(filters)
  │                    │
  │                    ├─> Check cache validity
  │                    │
  │                    ├─> SDKClient.get('/v1/models')
  │                    │              │
  │                    │              └─< {models: [...]}
  │                    │
  │                    ├─> Apply filters locally
  │                    │
  │                    └─> Fire onDidUpdateModels(models)
  │
  └─< Model[]


Invoke Model
  │
  ├─> ModelRegistryService.invokeModel(request)
  │                    │
  │                    ├─> CloudAuthService.getAccessToken()
  │                    │              │
  │                    │              ├─> Check expiration
  │                    │              │
  │                    │              └─> Auto-refresh if needed
  │                    │
  │                    ├─> SDKClient.post('/v1/models/invoke', {...})
  │                    │              │
  │                    │              └─< {text, usage, ...}
  │                    │
  │                    └─> UsageTrackingService.recordUsage(...)
  │
  └─< ModelResponse
```

---

## 3. Service Layer Design

### 3.1 AINativeCloudAuthService

**Status:** ✅ Already Implemented

**Location:** `/src/vs/workbench/contrib/ainative/common/ainativeCloudAuthService.ts`

**Interface:**
```typescript
export interface IAINativeCloudAuthService {
    readonly _serviceBrand: undefined;

    // Events
    readonly onDidChangeAuthState: Event<CloudAuthState>;
    readonly onDidUpdateUser: Event<CloudUser>;

    // Authentication
    register(request: RegistrationRequest): Promise<RegistrationResult>;
    login(email: string, password: string): Promise<CloudAuthResult>;
    logout(): Promise<void>;

    // Password Management
    requestPasswordReset(email: string): Promise<PasswordResetResult>;
    confirmPasswordReset(token: string, newPassword: string): Promise<PasswordResetResult>;
    changePassword(currentPassword: string, newPassword: string): Promise<PasswordResetResult>;

    // Token Management
    refreshToken(): Promise<string>;
    validateToken(token: string): Promise<TokenValidationResult>;
    getAccessToken(): Promise<string | null>; // Auto-refreshes
    getAccessTokenSync(): string | null; // No auto-refresh

    // User Management
    getCurrentUser(): Promise<CloudUser | null>;
    getUser(): CloudUser | null;
    isAuthenticated(): boolean;
    getAuthState(): CloudAuthState;

    // Email Verification
    resendEmailVerification(email: string): Promise<PasswordResetResult>;
    verifyEmail(token: string): Promise<PasswordResetResult>;
}
```

**Key Features:**
- Encrypted token storage using `IEncryptionService`
- Automatic token refresh with 5-minute buffer
- Comprehensive error handling with typed error codes
- State management with event emissions
- Retry logic for network failures

**Storage Keys:**
```typescript
private static readonly STORAGE_KEY_ACCESS_TOKEN = 'ainative.cloud.auth.accessToken';
private static readonly STORAGE_KEY_REFRESH_TOKEN = 'ainative.cloud.auth.refreshToken';
private static readonly STORAGE_KEY_USER = 'ainative.cloud.auth.user';
```

### 3.2 AIModelRegistryService

**Status:** ✅ Partially Implemented (Mock Data)

**Location:** `/src/vs/workbench/contrib/ainative/common/aiModelRegistryService.ts`

**Interface:**
```typescript
export interface IAIModelRegistryService {
    readonly _serviceBrand: undefined;

    // Events
    readonly onDidUpdateModels: Event<AIModel[]>;
    readonly onDidChangeModelSelection: Event<ModelSelectionConfig>;

    // Model Discovery
    listModels(filters?: ModelFilters): Promise<AIModel[]>;
    getModel(modelId: string): Promise<AIModel>;
    refreshModels(): Promise<void>;

    // Model Selection
    selectModel(modelId: string, projectId: string, parameters?: Record<string, any>): Promise<void>;
    getSelectedModel(projectId: string): Promise<AIModel | null>;

    // Model Invocation
    invokeModel(request: ModelInvocationRequest): Promise<ModelResponse>;
    streamModel(request: ModelInvocationRequest, onChunk: (chunk: ModelStreamChunk) => void): Promise<void>;

    // Usage Tracking
    getUsageStats(): Promise<UsageStats>;
    getQuota(): Promise<QuotaInfo>;
}
```

**Key Features:**
- 5-minute cache for model list
- Client-side filtering capabilities
- Authentication integration
- Retry logic with exponential backoff
- Streaming support for model responses

**Filters Supported:**
```typescript
export interface ModelFilters {
    provider?: string;
    capabilities?: ModelCapability[];
    pricingTier?: PricingTier;
    availableOnly?: boolean;
    search?: string;
    tags?: string[];
    maxPrice?: number;
    minContextLength?: number;
}
```

### 3.3 AINativeSDKClient

**Status:** ✅ Already Implemented

**Location:** `/src/vs/workbench/contrib/ainative/common/ainativeSDKClient.ts`

**Key Features:**
- Base URL: `https://api.ainative.studio`
- 30-second request timeout
- 3 retry attempts with exponential backoff
- Rate limit detection and handling
- Comprehensive error mapping

**API Methods:**
```typescript
class AINativeSDKClient {
    // Authentication
    register(username, email, password, name?): Promise<{data: TokenResponse & {user: UserInfoResponse}}>;
    login(email, password): Promise<{data: TokenResponse & {user: UserInfoResponse}}>;
    logout(accessToken): Promise<{data: MessageResponse}>;
    refreshToken(refreshToken): Promise<{data: TokenResponse}>;

    // User Management
    getCurrentUser(accessToken): Promise<{data: UserInfoResponse}>;
    forgotPassword(email): Promise<{data: MessageResponse}>;
    resetPassword(token, newPassword): Promise<{data: MessageResponse}>;
    changePassword(accessToken, currentPassword, newPassword): Promise<{data: MessageResponse}>;

    // Token Validation
    verifyToken(token): Promise<{data: {valid: boolean; user?: UserInfoResponse; exp?: number}}>;

    // Email Verification
    resendEmailVerification(email): Promise<{data: MessageResponse}>;
    verifyEmail(token): Promise<{data: MessageResponse}>;
}
```

**Error Handling:**
- Maps HTTP status codes to semantic error codes
- Extracts error messages from various response formats
- Handles validation errors (422)
- Implements retry for 5xx errors

### 3.4 NEW: UsageTrackingService

**Status:** ❌ Not Implemented

**Location:** `/src/vs/workbench/contrib/ainative/common/usageTrackingService.ts` (to be created)

**Interface:**
```typescript
export interface IUsageTrackingService {
    readonly _serviceBrand: undefined;

    // Events
    readonly onDidUpdateUsage: Event<UsageStats>;
    readonly onDidApproachQuota: Event<QuotaWarning>;

    // Local Tracking
    recordModelInvocation(invocation: ModelInvocation): void;
    getLocalUsage(period?: DateRange): LocalUsageStats;
    clearLocalUsage(): void;

    // Cloud Sync
    syncUsageToCloud(): Promise<void>;
    getCloudUsage(): Promise<UsageStats>;
    getQuotaInfo(): Promise<QuotaInfo>;

    // Cost Estimation
    estimateCost(modelId: string, inputTokens: number, outputTokens: number): number;
    getModelPricing(modelId: string): Promise<PricingInfo>;

    // Alerts
    setQuotaWarningThreshold(percentage: number): void;
    getQuotaWarningThreshold(): number;
}
```

**Data Structures:**
```typescript
export interface ModelInvocation {
    readonly id: string;
    readonly modelId: string;
    readonly timestamp: number;
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
    readonly cost: number;
    readonly finishReason: string;
    readonly cached?: boolean;
}

export interface LocalUsageStats {
    readonly totalInvocations: number;
    readonly totalTokens: number;
    readonly totalCost: number;
    readonly byModel: Map<string, {
        invocations: number;
        tokens: number;
        cost: number;
    }>;
    readonly periodStart: number;
    readonly periodEnd: number;
}

export interface QuotaWarning {
    readonly currentUsage: number;
    readonly totalLimit: number;
    readonly percentage: number;
    readonly estimatedExhaustionDate?: string;
}
```

### 3.5 NEW: ModelInvocationService

**Status:** ❌ Not Implemented

**Location:** `/src/vs/workbench/contrib/ainative/browser/modelInvocationService.ts` (to be created)

**Interface:**
```typescript
export interface IModelInvocationService {
    readonly _serviceBrand: undefined;

    // Events
    readonly onDidStartInvocation: Event<string>; // invocationId
    readonly onDidCompleteInvocation: Event<ModelInvocationResult>;
    readonly onDidFailInvocation: Event<ModelInvocationError>;

    // Invocation Management
    invoke(request: InvocationRequest): Promise<ModelResponse>;
    invokeStream(request: InvocationRequest, callbacks: StreamCallbacks): Promise<void>;
    cancelInvocation(invocationId: string): void;

    // History
    getInvocationHistory(limit?: number): InvocationHistoryEntry[];
    clearHistory(): void;

    // Settings
    setDefaultModel(modelId: string): void;
    getDefaultModel(): string | null;
    setDefaultParameters(params: Record<string, any>): void;
    getDefaultParameters(): Record<string, any>;
}
```

**Key Features:**
- Automatic model selection fallback
- Request queuing and prioritization
- Cancellation support
- History tracking
- Integration with usage tracking

---

## 4. Security Architecture

### 4.1 Token Storage Security

**Encryption:**
```
User Tokens (Plaintext)
         │
         ▼
IEncryptionService.encrypt()
         │
         ├─> macOS: Keychain (native encryption)
         ├─> Windows: DPAPI (Data Protection API)
         └─> Linux: libsecret / gnome-keyring
         │
         ▼
Encrypted Token (Base64)
         │
         ▼
IStorageService.store()
         │
         └─> Persisted to disk in encrypted form
```

**Storage Scopes:**
- `StorageScope.APPLICATION`: Global across workspaces
- `StorageTarget.MACHINE`: Tied to specific machine
- Tokens are never stored in workspace-specific storage
- Tokens are never synced via Settings Sync

### 4.2 Network Security

**HTTPS Enforcement:**
```typescript
const DEFAULT_CONFIG: AINativeAPIConfig = {
    baseUrl: 'https://api.ainative.studio', // Always HTTPS
    timeout: 30000,
    // ...
};
```

**Certificate Validation:**
- Electron uses Chromium's certificate validation
- No self-signed certificates accepted in production
- Certificate pinning not implemented (allows for CDN flexibility)

**Request Headers:**
```typescript
// Authentication
Authorization: Bearer <access_token>

// Required Headers
Content-Type: application/json
User-Agent: AINative-Studio/<version>

// Optional
X-Request-ID: <uuid>
X-Organization-ID: <org_id>
```

### 4.3 Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Token Lifecycle                          │
└─────────────────────────────────────────────────────────────┘

1. Login/Register
   ├─> Receive access_token (expires in 1 hour)
   ├─> Receive refresh_token (expires in 30 days)
   └─> Encrypt and store both tokens

2. API Request
   ├─> getAccessToken() called
   ├─> Check expiration (with 5-minute buffer)
   ├─> If expired:
   │   ├─> Call refreshToken()
   │   ├─> Receive new access_token
   │   ├─> Update encrypted storage
   │   └─> Return new token
   └─> Return current token

3. Token Refresh
   ├─> POST /v1/auth/refresh
   ├─> Headers: Authorization: Bearer <refresh_token>
   ├─> Response: {access_token, refresh_token?}
   └─> Update storage

4. Logout
   ├─> POST /v1/auth/logout (blacklist token)
   ├─> Clear encrypted tokens from storage
   ├─> Clear user data
   └─> Fire onDidChangeAuthState(Unauthenticated)

5. Token Expiration
   ├─> Refresh token expires after 30 days
   ├─> Auto-refresh fails
   ├─> Clear all auth state
   ├─> Show re-authentication prompt
   └─> Preserve user preferences
```

### 4.4 Security Best Practices

**Implemented:**
- ✅ Tokens encrypted at rest
- ✅ HTTPS for all API communication
- ✅ No tokens in logs or error messages
- ✅ Secure token refresh with 5-minute buffer
- ✅ Token blacklisting on logout
- ✅ Rate limiting detection and backoff
- ✅ Input validation (email format, password strength)

**Recommended:**
- ⚠️ Implement Content Security Policy (CSP) for webviews
- ⚠️ Add request signing for critical operations
- ⚠️ Implement token rotation on security events
- ⚠️ Add multi-factor authentication support
- ⚠️ Implement session management UI

---

## 5. Data Flow Diagrams

### 5.1 Registration Flow

```
┌──────┐          ┌──────────┐          ┌─────────┐          ┌──────┐
│ User │          │    UI    │          │ Service │          │ API  │
└──┬───┘          └────┬─────┘          └────┬────┘          └───┬──┘
   │                   │                     │                    │
   │ Click "Register"  │                     │                    │
   ├──────────────────>│                     │                    │
   │                   │                     │                    │
   │ Show Registration │                     │                    │
   │       Dialog      │                     │                    │
   │<──────────────────┤                     │                    │
   │                   │                     │                    │
   │ Enter credentials │                     │                    │
   ├──────────────────>│                     │                    │
   │                   │                     │                    │
   │                   │ Validate inputs     │                    │
   │                   ├──────────────┐      │                    │
   │                   │              │      │                    │
   │                   │<─────────────┘      │                    │
   │                   │                     │                    │
   │                   │ register(request)   │                    │
   │                   ├────────────────────>│                    │
   │                   │                     │                    │
   │                   │                     │ POST /v1/auth/     │
   │                   │                     │      register      │
   │                   │                     ├───────────────────>│
   │                   │                     │                    │
   │                   │                     │ 201 Created        │
   │                   │                     │ {access_token,     │
   │                   │                     │  refresh_token,    │
   │                   │                     │  user}             │
   │                   │                     │<───────────────────┤
   │                   │                     │                    │
   │                   │                     │ Encrypt tokens     │
   │                   │                     ├──────────┐         │
   │                   │                     │          │         │
   │                   │                     │<─────────┘         │
   │                   │                     │                    │
   │                   │                     │ Store encrypted    │
   │                   │                     ├──────────┐         │
   │                   │                     │          │         │
   │                   │                     │<─────────┘         │
   │                   │                     │                    │
   │                   │                     │ Fire               │
   │                   │                     │ onDidChangeAuth    │
   │                   │                     │ State(Auth'd)      │
   │                   │                     ├──────────┐         │
   │                   │                     │          │         │
   │                   │                     │<─────────┘         │
   │                   │                     │                    │
   │                   │ {success: true,     │                    │
   │                   │  user, ...}         │                    │
   │                   │<────────────────────┤                    │
   │                   │                     │                    │
   │ Success! Close    │                     │                    │
   │     Dialog        │                     │                    │
   │<──────────────────┤                     │                    │
   │                   │                     │                    │
```

### 5.2 Model Invocation Flow

```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐     ┌─────┐
│ User │     │   UI    │     │ Invoc.   │     │  Model  │     │ API │
│      │     │ (Chat)  │     │ Service  │     │ Registry│     │     │
└──┬───┘     └────┬────┘     └────┬─────┘     └────┬────┘     └──┬──┘
   │              │               │                │              │
   │ Send message │               │                │              │
   ├─────────────>│               │                │              │
   │              │               │                │              │
   │              │ invoke(req)   │                │              │
   │              ├──────────────>│                │              │
   │              │               │                │              │
   │              │               │ Get selected   │              │
   │              │               │    model       │              │
   │              │               ├───────────────>│              │
   │              │               │                │              │
   │              │               │ AIModel        │              │
   │              │               │<───────────────┤              │
   │              │               │                │              │
   │              │               │ Get access     │              │
   │              │               │    token       │              │
   │              │               ├───────────────>│              │
   │              │               │                │              │
   │              │               │ Check expiry   │              │
   │              │               │                ├───┐          │
   │              │               │                │   │          │
   │              │               │                │<──┘          │
   │              │               │                │              │
   │              │               │ Token valid    │              │
   │              │               │<───────────────┤              │
   │              │               │                │              │
   │              │               │ POST /v1/models/invoke       │
   │              │               ├─────────────────────────────>│
   │              │               │                │              │
   │              │               │ Stream chunks  │              │
   │              │               │<───────────────────────────...│
   │              │               │                │              │
   │              │ onChunk()     │                │              │
   │              │<──────────────┤                │              │
   │              │               │                │              │
   │ Display      │               │                │              │
   │ partial      │               │                │              │
   │ response     │               │                │              │
   │<─────────────┤               │                │              │
   │              │               │                │              │
   │              │               │ [DONE]         │              │
   │              │               │<───────────────────────────...│
   │              │               │                │              │
   │              │               │ Record usage   │              │
   │              │               ├───────────────>│              │
   │              │               │                │              │
   │              │ Complete      │                │              │
   │              │<──────────────┤                │              │
   │              │               │                │              │
   │ Display full │               │                │              │
   │ response     │               │                │              │
   │<─────────────┤               │                │              │
   │              │               │                │              │
```

### 5.3 Token Refresh Flow

```
┌─────────┐          ┌──────────┐          ┌─────────┐
│ Service │          │   Auth   │          │   API   │
│ (Any)   │          │ Service  │          │         │
└────┬────┘          └────┬─────┘          └────┬────┘
     │                    │                     │
     │ getAccessToken()   │                     │
     ├───────────────────>│                     │
     │                    │                     │
     │                    │ Check expiration    │
     │                    ├───────┐             │
     │                    │       │             │
     │                    │<──────┘             │
     │                    │                     │
     │                    │ Token expired!      │
     │                    │                     │
     │                    │ refreshToken()      │
     │                    ├───────┐             │
     │                    │       │             │
     │                    │       │ POST /v1/   │
     │                    │       │ auth/refresh│
     │                    │       ├────────────>│
     │                    │       │             │
     │                    │       │ 200 OK      │
     │                    │       │ {access_    │
     │                    │       │  token}     │
     │                    │       │<────────────┤
     │                    │       │             │
     │                    │       │ Encrypt     │
     │                    │       ├──┐          │
     │                    │       │  │          │
     │                    │       │<─┘          │
     │                    │       │             │
     │                    │       │ Store       │
     │                    │       ├──┐          │
     │                    │       │  │          │
     │                    │       │<─┘          │
     │                    │<──────┘             │
     │                    │                     │
     │ New access_token   │                     │
     │<───────────────────┤                     │
     │                    │                     │
```

---

## 6. Integration Points

### 6.1 Integration with Existing AI Features

**Current State:**
AINative Studio uses direct provider SDKs (Anthropic, OpenAI, Google, etc.) with API keys stored locally.

**Integration Strategy:**
Maintain backward compatibility while adding AINative Cloud as an option.

```typescript
// Before (existing)
interface ProviderConfig {
    provider: 'anthropic' | 'openai' | 'google' | 'mistral' | 'groq' | 'ollama';
    apiKey?: string;
    model: string;
}

// After (enhanced)
interface ProviderConfig {
    provider: 'anthropic' | 'openai' | 'google' | 'mistral' | 'groq' | 'ollama' | 'ainative';
    apiKey?: string;
    model: string;

    // New fields
    useAINativeCloud?: boolean; // Use AINative as proxy
    ainativeModelId?: string;   // Override model selection
}
```

**Migration Path:**
1. Add "AINative Cloud" as a provider option in settings
2. When selected, use `AIModelRegistryService` instead of direct SDK
3. Existing configurations continue to work unchanged
4. Users can opt-in to AINative Cloud per-project

### 6.2 Chat Integration

**Location:** `/src/vs/workbench/contrib/ainative/browser/chatThreadService.ts`

**Changes Required:**
```typescript
export class ChatThreadService extends Disposable implements IChatThreadService {
    constructor(
        // ... existing dependencies
        @IAINativeCloudAuthService private readonly cloudAuthService: IAINativeCloudAuthService,
        @IAIModelRegistryService private readonly modelRegistry: IAIModelRegistryService,
    ) {
        super();
        // ...
    }

    private async _sendMessage(message: string): Promise<void> {
        // Check if using AINative Cloud
        const settings = this.settingsService.getSettings();

        if (settings.useAINativeCloud && this.cloudAuthService.isAuthenticated()) {
            // Use AINative model invocation
            const selectedModel = await this.modelRegistry.getSelectedModel(this.projectId);
            if (!selectedModel) {
                throw new Error('No model selected');
            }

            const response = await this.modelRegistry.invokeModel({
                modelId: selectedModel.id,
                prompt: message,
                parameters: settings.modelParameters,
                stream: true
            });

            // Handle response...
        } else {
            // Use existing provider SDK
            // ... existing code ...
        }
    }
}
```

### 6.3 Settings Integration

**Location:** `/src/vs/workbench/contrib/ainative/common/ainativeSettingsService.ts`

**New Settings:**
```typescript
export interface AINativeCloudSettings {
    // Authentication
    useAINativeCloud: boolean;
    autoLogin: boolean;

    // Model Selection
    defaultModelId?: string;
    modelParameters?: Record<string, any>;

    // Usage Tracking
    showUsageNotifications: boolean;
    quotaWarningThreshold: number; // 0-100

    // Cost Management
    monthlyCostLimit?: number;
    alertOnHighCost: boolean;
}
```

### 6.4 Status Bar Integration

**New:** Add authentication status to status bar

```typescript
// Location: /src/vs/workbench/contrib/ainative/browser/ainativeStatusBar.ts (new)

export class AINativeStatusBarContribution extends Disposable {
    private statusBarItem: IStatusbarEntry;

    constructor(
        @IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService,
        @IStatusbarService private readonly statusbarService: IStatusbarService
    ) {
        super();
        this._createStatusBarItem();
        this._updateStatusBarItem();

        this._register(this.authService.onDidChangeAuthState(() => {
            this._updateStatusBarItem();
        }));
    }

    private _createStatusBarItem(): void {
        this.statusBarItem = this.statusbarService.addEntry(
            {
                name: 'AINative Cloud',
                text: '$(cloud) AINative',
                command: 'ainative.showAuthMenu',
                ariaLabel: 'AINative Cloud Authentication'
            },
            'ainativeCloud',
            StatusbarAlignment.RIGHT,
            100
        );
    }

    private _updateStatusBarItem(): void {
        const authenticated = this.authService.isAuthenticated();
        const user = this.authService.getUser();

        if (authenticated && user) {
            this.statusBarItem.text = `$(cloud) ${user.email}`;
            this.statusBarItem.tooltip = 'Signed in to AINative Cloud';
        } else {
            this.statusBarItem.text = `$(cloud-offline) Sign In`;
            this.statusBarItem.tooltip = 'Sign in to AINative Cloud';
        }
    }
}
```

---

## 7. Implementation Roadmap

### Phase 1: Core Authentication (Week 1-2)
**Status:** ✅ Complete (Already Implemented)

Tasks:
- [x] Implement `AINativeCloudAuthService`
- [x] Implement `AINativeSDKClient`
- [x] Implement token encryption and storage
- [x] Add automatic token refresh
- [x] Implement error handling

**Deliverables:**
- Fully functional authentication service
- Unit tests (see `/test/common/ainativeCloudAuthService.test.ts`)
- Type definitions

### Phase 2: Model Registry (Week 3-4)
**Status:** ⚠️ Partially Complete (Using Mock Data)

Tasks:
- [x] Implement `AIModelRegistryService` with mock data
- [x] Add model caching
- [x] Add filtering capabilities
- [ ] **TODO:** Replace mock data with live API calls
- [ ] **TODO:** Add model invocation endpoints
- [ ] **TODO:** Test with real AINative API

**Deliverables:**
- Model browsing functionality
- Model selection persistence
- Integration tests

### Phase 3: Usage Tracking (Week 5-6)
**Status:** ❌ Not Started

Tasks:
- [ ] Design `IUsageTrackingService` interface
- [ ] Implement local usage tracking
- [ ] Add cost calculation logic
- [ ] Implement quota warnings
- [ ] Add usage sync to cloud
- [ ] Create usage dashboard UI

**Deliverables:**
- Usage tracking service
- Cost estimation
- Quota monitoring
- Usage statistics UI

### Phase 4: UI Components (Week 7-9)
**Status:** ❌ Not Started

Tasks:
- [ ] Create React authentication dialogs
  - [ ] Login dialog
  - [ ] Registration dialog
  - [ ] Password reset dialog
- [ ] Create model browser component
- [ ] Create usage dashboard component
- [ ] Add status bar integration
- [ ] Add settings UI

**Deliverables:**
- Complete authentication UI
- Model selection interface
- Usage monitoring UI
- User documentation

### Phase 5: Integration (Week 10-11)
**Status:** ❌ Not Started

Tasks:
- [ ] Integrate with chat service
- [ ] Integrate with autocomplete
- [ ] Integrate with quick edit
- [ ] Add provider switching
- [ ] Migrate existing users
- [ ] Add telemetry

**Deliverables:**
- Full feature integration
- Migration guides
- Analytics dashboard

### Phase 6: Testing & Polish (Week 12-13)
**Status:** ❌ Not Started

Tasks:
- [ ] End-to-end testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Error handling review
- [ ] Documentation review
- [ ] Beta testing

**Deliverables:**
- Test coverage >80%
- Security report
- Performance benchmarks
- User documentation
- API documentation

### Phase 7: Launch (Week 14)
**Status:** ❌ Not Started

Tasks:
- [ ] Final QA
- [ ] Marketing materials
- [ ] Release notes
- [ ] Deployment
- [ ] Monitoring setup
- [ ] Support preparation

**Deliverables:**
- Production release
- Support documentation
- Marketing content
- Monitoring dashboard

---

## 8. File Organization

### 8.1 Directory Structure

```
ainative-studio/src/vs/workbench/contrib/ainative/
│
├── common/                                   # Shared code (main + renderer)
│   ├── ainativeCloudAuthService.ts          ✅ Authentication service
│   ├── ainativeCloudAuthTypes.ts            ✅ Auth type definitions
│   ├── ainativeSDKClient.ts                 ✅ HTTP client wrapper
│   ├── aiModelRegistryService.ts            ⚠️  Model registry (mock data)
│   ├── aiModelRegistryTypes.ts              ✅ Model type definitions
│   ├── aiModelConfig.ts                     ✅ Model configuration manager
│   ├── usageTrackingService.ts              ❌ NEW: Usage tracking
│   ├── usageTrackingTypes.ts                ❌ NEW: Usage types
│   └── storageKeys.ts                       ✅ Centralized storage keys
│
├── browser/                                  # Renderer process only
│   ├── modelInvocationService.ts            ❌ NEW: Model invocation
│   ├── ainativeStatusBar.ts                 ❌ NEW: Status bar integration
│   └── react/                               # React UI components
│       ├── src/
│       │   ├── auth/                        ❌ NEW: Auth components
│       │   │   ├── LoginDialog.tsx
│       │   │   ├── RegisterDialog.tsx
│       │   │   ├── PasswordResetDialog.tsx
│       │   │   └── AuthMenu.tsx
│       │   ├── models/                      ❌ NEW: Model components
│       │   │   ├── ModelBrowser.tsx
│       │   │   ├── ModelCard.tsx
│       │   │   └── ModelSelector.tsx
│       │   └── usage/                       ❌ NEW: Usage components
│       │       ├── UsageDashboard.tsx
│       │       ├── QuotaWidget.tsx
│       │       └── CostBreakdown.tsx
│       └── build.js
│
├── electron-main/                            # Main process only
│   └── (no auth-specific files needed)
│
└── test/                                     # Tests
    └── common/
        ├── ainativeCloudAuthService.test.ts ✅ Auth service tests
        ├── ainativeSDKClient.test.ts        ✅ SDK client tests
        ├── aiModelRegistryService.test.ts   ⚠️  Model registry tests
        ├── usageTrackingService.test.ts     ❌ NEW: Usage tests
        └── modelInvocationService.test.ts   ❌ NEW: Invocation tests
```

### 8.2 Registration in VS Code DI System

**Services are registered in:**
- `/src/vs/workbench/contrib/ainative/common/*.ts` (at end of each service file)

**Example:**
```typescript
// At the end of ainativeCloudAuthService.ts
registerSingleton(
    IAINativeCloudAuthService,
    AINativeCloudAuthService,
    InstantiationType.Eager
);
```

**Registration Types:**
- `InstantiationType.Eager` - Instantiated immediately at startup
- `InstantiationType.Delayed` - Instantiated on first use
- `InstantiationType.Default` - Default lazy instantiation

---

## 9. API Endpoint Mapping

### 9.1 Authentication Endpoints

| Endpoint | Method | Request Body | Response | Status |
|----------|--------|--------------|----------|--------|
| `/v1/auth/register` | POST | `{username, email, password, name?}` | `{access_token, refresh_token, user}` | ✅ |
| `/v1/auth/login-json` | POST | `{email, password}` | `{access_token, refresh_token, user}` | ✅ |
| `/v1/auth/logout` | POST | - (token in header) | `{message}` | ✅ |
| `/v1/auth/refresh` | POST | - (refresh token in header) | `{access_token, refresh_token?}` | ✅ |
| `/v1/auth/me` | GET | - | `{id, email, username, ...}` | ✅ |
| `/v1/auth/forgot-password` | POST | `{email}` | `{message}` | ✅ |
| `/v1/auth/reset-password` | POST | `{token, new_password}` | `{message}` | ✅ |
| `/v1/auth/change-password` | POST | `{current_password, new_password}` | `{message}` | ✅ |
| `/v1/auth/verify-token` | POST | `{token}` | `{valid, user?, exp?}` | ✅ |
| `/v1/auth/resend-verification` | POST | `{email}` | `{message}` | ✅ |
| `/v1/auth/verify-email` | POST | `{token}` | `{message}` | ✅ |

### 9.2 Model Registry Endpoints

| Endpoint | Method | Query Params | Response | Status |
|----------|--------|--------------|----------|--------|
| `/v1/models` | GET | `provider?, capabilities?, pricing_tier?, search?, tags?, available_only?` | `{models: AIModel[]}` | ⚠️ Mock |
| `/v1/models/{id}` | GET | - | `AIModel` | ⚠️ Mock |
| `/v1/models/invoke` | POST | - | `{text, usage, ...}` | ❌ |
| `/v1/models/stream` | POST | - | `Stream<chunk>` | ❌ |

### 9.3 Usage & Quota Endpoints

| Endpoint | Method | Query Params | Response | Status |
|----------|--------|--------------|----------|--------|
| `/v1/usage/stats` | GET | `period_start?, period_end?` | `UsageStats` | ❌ |
| `/v1/usage/quota` | GET | - | `QuotaInfo` | ❌ |
| `/v1/usage/record` | POST | - | `{success}` | ❌ |

**Legend:**
- ✅ Implemented and tested
- ⚠️ Partially implemented (mock data)
- ❌ Not implemented

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Coverage Goals:**
- Service layer: >90%
- UI components: >80%
- Utilities: >95%

**Test Files:**
```
test/common/
├── ainativeCloudAuthService.test.ts        ✅ 95% coverage
├── ainativeSDKClient.test.ts               ✅ 92% coverage
├── aiModelRegistryService.test.ts          ⚠️ 78% coverage
├── usageTrackingService.test.ts            ❌ To be created
└── modelInvocationService.test.ts          ❌ To be created
```

**Test Scenarios:**

**Authentication Tests:**
- [x] Successful registration
- [x] Registration with duplicate email
- [x] Successful login
- [x] Login with invalid credentials
- [x] Token refresh on expiration
- [x] Token refresh failure
- [x] Logout clears tokens
- [x] Password reset flow
- [x] Email verification flow

**Model Registry Tests:**
- [x] List models with filters
- [x] Get model by ID
- [x] Model not found error
- [x] Select model for project
- [ ] Invoke model with authentication
- [ ] Stream model response
- [ ] Handle rate limiting
- [ ] Handle quota exceeded

**Usage Tracking Tests:**
- [ ] Record model invocation
- [ ] Calculate costs accurately
- [ ] Aggregate usage by model
- [ ] Sync to cloud
- [ ] Quota warning triggers
- [ ] Handle sync failures

### 10.2 Integration Tests

**Test Scenarios:**
```typescript
describe('AINative Cloud Integration', () => {
    it('should authenticate and list models', async () => {
        // 1. Login
        const authResult = await authService.login(email, password);
        expect(authResult.success).toBe(true);

        // 2. List models
        const models = await modelRegistry.listModels();
        expect(models.length).toBeGreaterThan(0);

        // 3. Select model
        await modelRegistry.selectModel(models[0].id, 'test-project');

        // 4. Verify selection
        const selected = await modelRegistry.getSelectedModel('test-project');
        expect(selected?.id).toBe(models[0].id);
    });

    it('should invoke model and track usage', async () => {
        // 1. Invoke model
        const response = await modelRegistry.invokeModel({
            modelId: 'claude-3-5-sonnet-20241022',
            prompt: 'Hello, world!',
            maxTokens: 100
        });

        expect(response.text).toBeDefined();
        expect(response.usage).toBeDefined();

        // 2. Check usage was recorded
        const usage = await usageTracking.getCloudUsage();
        expect(usage.totalCalls).toBeGreaterThan(0);
    });

    it('should refresh token automatically', async () => {
        // 1. Login
        await authService.login(email, password);

        // 2. Manually expire token
        (authService as any)._accessToken = createExpiredToken();

        // 3. Make API call (should trigger refresh)
        const models = await modelRegistry.listModels();
        expect(models).toBeDefined();

        // 4. Verify new token was obtained
        const token = await authService.getAccessToken();
        expect(isTokenExpired(token)).toBe(false);
    });
});
```

### 10.3 E2E Tests

**Test Scenarios:**
1. **Complete User Journey**
   - Open IDE
   - Register new account
   - Verify email
   - Browse models
   - Select model
   - Send chat message
   - View usage dashboard
   - Logout

2. **Error Recovery**
   - Network failure during login
   - Token expiration during chat
   - Rate limiting during heavy usage
   - Quota exceeded handling

3. **Security Tests**
   - Token encryption verification
   - Logout clears all credentials
   - XSS prevention in UI
   - CSRF protection

---

## 11. Risk Assessment

### 11.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| API endpoint changes break integration | Medium | High | Version API endpoints; implement adapter pattern |
| Token refresh fails during critical operation | Medium | Medium | Queue operations; retry with exponential backoff |
| Encryption service unavailable on some platforms | Low | High | Fallback to obfuscation; warn users |
| Network latency impacts UX | High | Medium | Implement request caching; show loading states |
| Race conditions in token refresh | Medium | High | Use mutex/lock for refresh operations |
| Memory leaks from event listeners | Low | Medium | Proper disposal in service destructors |

### 11.2 Security Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Token theft via memory dump | Low | Critical | Use platform secure storage; clear on logout |
| XSS in React components | Low | High | Use React's built-in escaping; CSP headers |
| Man-in-the-middle attack | Very Low | Critical | Enforce HTTPS; certificate pinning (optional) |
| Session hijacking | Low | High | Short token expiration; IP validation (future) |
| Credential stuffing attacks | Medium | Medium | Rate limiting; CAPTCHA (API-side) |
| Insecure local storage | Medium | High | Always use encrypted storage |

### 11.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Users resist cloud authentication | Medium | Medium | Make it optional; clear value proposition |
| API costs exceed expectations | Low | Medium | Implement cost tracking; quota limits |
| Vendor lock-in to AINative Cloud | High | Low | Maintain multi-provider support |
| Data privacy concerns | Medium | High | Clear privacy policy; data minimization |
| Service outages impact IDE | Medium | Medium | Graceful degradation; offline mode |

### 11.4 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Support burden from auth issues | High | Medium | Comprehensive docs; self-service tools |
| Migration from local to cloud auth | Medium | Medium | Automated migration; clear instructions |
| Breaking changes in updates | Low | High | Semantic versioning; deprecation notices |
| Performance degradation | Medium | Medium | Caching; connection pooling; monitoring |

---

## 12. Appendices

### Appendix A: Type Definitions Summary

**Authentication Types:**
```typescript
enum CloudAuthState {
    Authenticated,
    Unauthenticated,
    Refreshing,
    Registering,
    LoggingOut,
    ResettingPassword
}

enum CloudAuthErrorCode {
    InvalidCredentials,
    NetworkError,
    TokenExpired,
    TokenRefreshFailed,
    LogoutFailed,
    RegistrationFailed,
    PasswordResetFailed,
    EmailAlreadyExists,
    WeakPassword,
    RateLimitExceeded,
    UnknownError
}

interface CloudUser {
    readonly id: string;
    readonly email: string;
    readonly username?: string;
    readonly name?: string;
    readonly role: string;
    readonly emailVerified?: boolean;
    readonly createdAt?: string;
    readonly updatedAt?: string;
}
```

**Model Types:**
```typescript
enum ModelCapability {
    TextGeneration,
    CodeGeneration,
    CodeCompletion,
    Chat,
    FunctionCalling,
    Vision,
    Embedding,
    Streaming,
    ToolUse
}

enum PricingTier {
    Free,
    PayAsYouGo,
    Subscription,
    Enterprise
}

interface AIModel {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly provider: string;
    readonly capabilities: ModelCapability[];
    readonly pricing: PricingInfo;
    readonly parameters: ModelParameter[];
    readonly maxContextLength?: number;
    readonly maxOutputLength?: number;
}
```

### Appendix B: Configuration Examples

**User Settings (`settings.json`):**
```json
{
    "ainative.cloud.enabled": true,
    "ainative.cloud.autoLogin": false,
    "ainative.cloud.defaultModel": "claude-3-5-sonnet-20241022",
    "ainative.cloud.showUsageNotifications": true,
    "ainative.cloud.quotaWarningThreshold": 80,
    "ainative.cloud.monthlyCostLimit": 100
}
```

**Project Settings (`.vscode/settings.json`):**
```json
{
    "ainative.cloud.selectedModel": "gpt-4-turbo",
    "ainative.cloud.modelParameters": {
        "temperature": 0.7,
        "max_tokens": 4096,
        "top_p": 0.95
    }
}
```

### Appendix C: Error Handling Examples

**Authentication Error:**
```typescript
try {
    await authService.login(email, password);
} catch (error) {
    if (error instanceof CloudAuthError) {
        switch (error.code) {
            case CloudAuthErrorCode.InvalidCredentials:
                // Show "Invalid email or password"
                break;
            case CloudAuthErrorCode.NetworkError:
                // Show "Network error, please try again"
                break;
            case CloudAuthErrorCode.RateLimitExceeded:
                // Show "Too many attempts, please wait"
                break;
            default:
                // Show generic error
        }
    }
}
```

**Model Invocation Error:**
```typescript
try {
    const response = await modelRegistry.invokeModel(request);
} catch (error) {
    if (error instanceof ModelRegistryError) {
        switch (error.code) {
            case ModelRegistryErrorCode.QuotaExceeded:
                // Show quota exceeded dialog
                break;
            case ModelRegistryErrorCode.RateLimitExceeded:
                // Queue request for retry
                break;
            case ModelRegistryErrorCode.AuthenticationRequired:
                // Prompt for re-authentication
                break;
        }
    }
}
```

### Appendix D: Performance Benchmarks

**Target Metrics:**
- Login: < 2 seconds
- Token refresh: < 500ms
- Model list (cached): < 50ms
- Model list (fresh): < 1 second
- Model invocation (first token): < 1 second
- Model invocation (streaming): < 100ms per chunk

**Monitoring:**
- Track API response times
- Monitor token refresh frequency
- Track cache hit rates
- Monitor error rates by type

---

## Conclusion

This architecture provides a comprehensive, secure, and scalable solution for integrating AINative authentication into AINative Studio IDE. The design:

1. **Maintains backward compatibility** with existing provider authentication
2. **Follows VS Code patterns** for consistency and maintainability
3. **Prioritizes security** with encrypted storage and automatic token management
4. **Enables future growth** through modular, extensible services
5. **Provides excellent UX** with transparent authentication and usage tracking

**Current Status:**
- ✅ Phase 1 (Core Authentication): **Complete**
- ⚠️ Phase 2 (Model Registry): **Partially Complete** (mock data)
- ❌ Phases 3-7: **Not Started**

**Next Steps:**
1. Replace mock model data with live API integration
2. Implement UI components for authentication flows
3. Create usage tracking service
4. Integrate with existing chat and AI features
5. Comprehensive testing and documentation

**Success Criteria:**
- All services implemented and tested (>80% coverage)
- Users can seamlessly switch between local and cloud authentication
- Token management is transparent and reliable
- Usage tracking provides accurate cost estimates
- Documentation is comprehensive and accessible

**Estimated Timeline:** 14 weeks for complete implementation

**Team Requirements:**
- 2 backend engineers (services and API integration)
- 2 frontend engineers (React UI components)
- 1 QA engineer (testing and validation)
- 1 technical writer (documentation)

---

**Document Approval:**

- [ ] Engineering Lead
- [ ] Security Team
- [ ] Product Manager
- [ ] UX Designer

**Last Updated:** January 3, 2026
