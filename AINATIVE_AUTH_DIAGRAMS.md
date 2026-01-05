# AINative Authentication - Visual Diagrams

Quick visual reference for the authentication architecture.

---

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                     AINative Studio IDE                               │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    UI Layer (React)                          │    │
│  │                                                               │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │    │
│  │  │   Login    │  │   Model    │  │   Usage    │            │    │
│  │  │   Dialog   │  │   Browser  │  │  Dashboard │            │    │
│  │  └────────────┘  └────────────┘  └────────────┘            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│           │                    │                    │                 │
│           ▼                    ▼                    ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Service Layer (Browser Process)                 │    │
│  │                                                               │    │
│  │  ┌──────────────────────┐    ┌──────────────────────┐       │    │
│  │  │ AINativeCloudAuth    │    │ AIModelRegistry      │       │    │
│  │  │ Service              │    │ Service              │       │    │
│  │  │                      │    │                      │       │    │
│  │  │ ✅ Complete          │    │ ⚠️ Partially Done    │       │    │
│  │  └──────────────────────┘    └──────────────────────┘       │    │
│  │                                                               │    │
│  │  ┌──────────────────────┐    ┌──────────────────────┐       │    │
│  │  │ UsageTracking        │    │ ModelInvocation      │       │    │
│  │  │ Service              │    │ Service              │       │    │
│  │  │                      │    │                      │       │    │
│  │  │ ❌ Not Started       │    │ ❌ Not Started       │       │    │
│  │  └──────────────────────┘    └──────────────────────┘       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│           │                    │                    │                 │
│           ▼                    ▼                    ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │           Infrastructure (Electron Main Process)             │    │
│  │                                                               │    │
│  │  ┌──────────────────────┐    ┌──────────────────────┐       │    │
│  │  │ AINativeSDK          │    │ Encryption           │       │    │
│  │  │ Client               │    │ Service              │       │    │
│  │  │                      │    │                      │       │    │
│  │  │ ✅ Complete          │    │ ✅ VS Code Built-in  │       │    │
│  │  └──────────────────────┘    └──────────────────────┘       │    │
│  │                                                               │    │
│  │  ┌──────────────────────┐    ┌──────────────────────┐       │    │
│  │  │ Storage              │    │ Network              │       │    │
│  │  │ Service              │    │ Manager              │       │    │
│  │  │                      │    │                      │       │    │
│  │  │ ✅ VS Code Built-in  │    │ ✅ Fetch API         │       │    │
│  │  └──────────────────────┘    └──────────────────────┘       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                             │                                        │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │  AINative Cloud API  │
                   │                      │
                   │  /v1/auth/*          │
                   │  /v1/models/*        │
                   │  /v1/usage/*         │
                   └──────────────────────┘
```

---

## Authentication Flow

```
┌─────────┐              ┌─────────┐              ┌──────────┐
│  User   │              │   UI    │              │ Service  │
└────┬────┘              └────┬────┘              └────┬─────┘
     │                        │                        │
     │ 1. Click "Sign In"     │                        │
     ├───────────────────────>│                        │
     │                        │                        │
     │ 2. Show Login Dialog   │                        │
     │<───────────────────────┤                        │
     │                        │                        │
     │ 3. Enter Credentials   │                        │
     ├───────────────────────>│                        │
     │                        │                        │
     │                        │ 4. login(email, pwd)   │
     │                        ├───────────────────────>│
     │                        │                        │
     │                        │                        │ ┌──────────┐
     │                        │                        ├>│   API    │
     │                        │                        │ │POST /v1/ │
     │                        │                        │ │auth/login│
     │                        │                        │ └─────┬────┘
     │                        │                        │       │
     │                        │                        │ ┌─────▼────┐
     │                        │                        │<│ {tokens, │
     │                        │                        │ │  user}   │
     │                        │                        │ └──────────┘
     │                        │                        │
     │                        │                        │ 5. Encrypt
     │                        │                        ├──────┐
     │                        │                        │<─────┘
     │                        │                        │
     │                        │                        │ 6. Store
     │                        │                        ├──────┐
     │                        │                        │<─────┘
     │                        │                        │
     │                        │ 7. Success             │
     │                        │<───────────────────────┤
     │                        │                        │
     │ 8. Close Dialog        │                        │
     │<───────────────────────┤                        │
     │                        │                        │
     │ 9. Update UI           │                        │
     │ (show email)           │                        │
     │<───────────────────────┤                        │
     │                        │                        │
```

---

## Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                   Token State Machine                       │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │ No Tokens    │ <──────────┐
    │ (Logged Out) │            │
    └──────┬───────┘            │
           │                    │
           │ login() /          │
           │ register()         │
           │                    │
           ▼                    │
    ┌──────────────┐            │
    │   Tokens     │            │
    │   Stored     │            │
    │ (Encrypted)  │            │
    └──────┬───────┘            │
           │                    │
           │ Startup /          │
           │ App Load           │
           │                    │
           ▼                    │
    ┌──────────────┐            │
    │  Check Token │            │
    │  Expiration  │            │
    └──────┬───────┘            │
           │                    │
           ├─────┬──────────────┤
           │     │              │
      Valid│     │Expired       │
           │     │              │
           ▼     ▼              │
    ┌──────────────┐            │
    │ Authenticated│     ┌──────┴──────┐
    │              │     │ Auto-Refresh│
    │   Ready!     │     │   Token     │
    └──────┬───────┘     └──────┬──────┘
           │                    │
           │                    │ Success
           │                    │
           │<───────────────────┤
           │                    │
           │                    │ Failure
           │                    │
           │             ┌──────▼──────┐
           │             │Clear Tokens │
           │             │Show Re-Auth │
           │             └──────┬──────┘
           │                    │
           │<───────────────────┘
           │
           │ logout()
           │
           └────────────────────┘
```

---

## Model Invocation Flow

```
User Message                  Chat Service            Model Registry
     │                             │                        │
     │ 1. Send "Hello"             │                        │
     ├────────────────────────────>│                        │
     │                             │                        │
     │                             │ 2. Check auth mode     │
     │                             ├────────┐               │
     │                             │<───────┘               │
     │                             │                        │
     │                             │ If AINative Cloud:     │
     │                             │                        │
     │                             │ 3. Get selected model  │
     │                             ├───────────────────────>│
     │                             │                        │
     │                             │ 4. Return model        │
     │                             │<───────────────────────┤
     │                             │                        │
     │                             │ 5. streamModel()       │
     │                             ├───────────────────────>│
     │                             │                        │
     │                             │                        │ ┌─────────┐
     │                             │                        ├>│   API   │
     │                             │                        │ │POST /v1/│
     │                             │                        │ │models/  │
     │                             │                        │ │stream   │
     │                             │                        │ └────┬────┘
     │                             │                        │      │
     │                             │                        │ ┌────▼────┐
     │                             │ 6. Chunk 1             │<│ Stream  │
     │                             │<───────────────────────┤ │ Chunk 1 │
     │                             │                        │ └─────────┘
     │ 7. Display partial          │                        │
     │<────────────────────────────┤                        │
     │                             │                        │
     │                             │ 8. Chunk 2             │ ┌─────────┐
     │                             │<───────────────────────┤<│ Chunk 2 │
     │                             │                        │ └─────────┘
     │ 9. Update display           │                        │
     │<────────────────────────────┤                        │
     │                             │                        │
     │                             │ ... more chunks ...    │
     │                             │                        │
     │                             │ 10. [DONE]             │ ┌─────────┐
     │                             │<───────────────────────┤<│ [DONE]  │
     │                             │                        │ │ +usage  │
     │                             │                        │ └─────────┘
     │                             │                        │
     │                             │ 11. Record usage       │
     │                             ├───────────────────────>│
     │                             │                        │
     │ 12. Complete response       │                        │
     │<────────────────────────────┤                        │
     │                             │                        │
```

---

## Service Dependencies

```
                    ┌──────────────────────┐
                    │   Core VS Code       │
                    │   Services           │
                    │                      │
                    │ • IStorageService    │
                    │ • IEncryptionService │
                    │ • INotificationSrv   │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
    ┌──────────────────┐ ┌──────────────┐ ┌────────────────┐
    │ AINativeCloud    │ │ AIModel      │ │ UsageTracking  │
    │ AuthService      │ │ Registry     │ │ Service        │
    │                  │ │ Service      │ │                │
    │ ✅ Complete      │ │ ⚠️ Partial   │ │ ❌ Not Done    │
    └──────┬───────────┘ └──────┬───────┘ └────────┬───────┘
           │                    │                   │
           │                    │ depends on        │
           │                    │◄──────────────────┘
           │                    │
           │ provides auth      │
           │ for API calls      │
           └───────────────────►│
                                │
                                ▼
                    ┌──────────────────────┐
                    │  AINativeSDK         │
                    │  Client              │
                    │                      │
                    │  ✅ Complete         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  AINative Cloud API  │
                    │  (api.ainative.      │
                    │   studio)            │
                    └──────────────────────┘
```

---

## Data Storage Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   Token Storage Security                     │
└──────────────────────────────────────────────────────────────┘

Plaintext Token
     │
     │ "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     │
     ▼
┌─────────────────────┐
│ IEncryptionService  │
│   .encrypt()        │
└──────┬──────────────┘
       │
       ├──► macOS: Keychain
       ├──► Windows: DPAPI
       └──► Linux: libsecret
       │
       ▼
Encrypted Token (Platform-specific)
       │
       │ "AQAAANCMnd8BFdERjHoAwE/Cl+sBAAAA..."
       │
       ▼
┌─────────────────────┐
│ IStorageService     │
│   .store()          │
│                     │
│ Scope: APPLICATION  │
│ Target: MACHINE     │
└──────┬──────────────┘
       │
       ▼
Persisted to Disk
       │
       │ ~/.config/AINative Studio/storage.json
       │
       ▼
{
  "ainative.cloud.auth.accessToken": "encrypted_blob_here",
  "ainative.cloud.auth.refreshToken": "encrypted_blob_here",
  "ainative.cloud.auth.user": "{...user json...}"
}
```

---

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Error Recovery Strategy                   │
└──────────────────────────────────────────────────────────────┘

API Request
     │
     ▼
┌─────────────┐
│ Try Request │
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
    Success      Network Error   API Error     Rate Limited
       │              │              │              │
       ▼              ▼              ▼              ▼
   Return        Retry with     Parse Error    Wait & Retry
   Response      Backoff        Response         (with delay)
                     │              │              │
                     │              ▼              │
                     │         ┌────────────┐     │
                     │         │ 401/403?   │     │
                     │         └──┬─────┬───┘     │
                     │            │     │         │
                     │          Yes    No         │
                     │            │     │         │
                     │            ▼     ▼         │
                     │         Refresh  Map       │
                     │         Token    Error     │
                     │            │     Code      │
                     │            │     │         │
                     ▼            ▼     ▼         ▼
                ┌─────────────────────────────────┐
                │   Retry Count < 3?              │
                └──────┬──────────────┬───────────┘
                       │              │
                     Yes             No
                       │              │
                       │              ▼
                       │         Throw Error
                       │         (with context)
                       │              │
                       └──────────────┤
                                      │
                                      ▼
                              User sees error
                              (with retry button)
```

---

## File Organization Map

```
ainative-studio/src/vs/workbench/contrib/ainative/
│
├── common/                              # Shared (main + renderer)
│   │
│   ├── Authentication
│   │   ├── ainativeCloudAuthService.ts     ✅ Complete
│   │   ├── ainativeCloudAuthTypes.ts       ✅ Complete
│   │   └── ainativeSDKClient.ts            ✅ Complete
│   │
│   ├── Models
│   │   ├── aiModelRegistryService.ts       ⚠️ Partial (mock data)
│   │   ├── aiModelRegistryTypes.ts         ✅ Complete
│   │   └── aiModelConfig.ts                ✅ Complete
│   │
│   └── Usage (TO BE CREATED)
│       ├── usageTrackingService.ts         ❌ Not started
│       └── usageTrackingTypes.ts           ❌ Not started
│
├── browser/                             # Renderer only
│   │
│   ├── Services (TO BE CREATED)
│   │   ├── modelInvocationService.ts       ❌ Not started
│   │   └── ainativeStatusBar.ts            ❌ Not started
│   │
│   └── react/src/                       # React UI
│       │
│       ├── auth/ (TO BE CREATED)
│       │   ├── LoginDialog.tsx             ❌ Not started
│       │   ├── RegisterDialog.tsx          ❌ Not started
│       │   ├── PasswordResetDialog.tsx     ❌ Not started
│       │   └── AuthMenu.tsx                ❌ Not started
│       │
│       ├── models/ (TO BE CREATED)
│       │   ├── ModelBrowser.tsx            ❌ Not started
│       │   ├── ModelCard.tsx               ❌ Not started
│       │   └── ModelSelector.tsx           ❌ Not started
│       │
│       └── usage/ (TO BE CREATED)
│           ├── UsageDashboard.tsx          ❌ Not started
│           ├── QuotaWidget.tsx             ❌ Not started
│           └── CostBreakdown.tsx           ❌ Not started
│
└── test/common/                         # Unit tests
    ├── ainativeCloudAuthService.test.ts    ✅ Complete
    ├── ainativeSDKClient.test.ts           ✅ Complete
    ├── aiModelRegistryService.test.ts      ⚠️ Partial
    ├── usageTrackingService.test.ts        ❌ Not started
    └── modelInvocationService.test.ts      ❌ Not started
```

---

## Implementation Progress

```
Phase 1: Core Authentication                    ✅ COMPLETE
├── AINativeCloudAuthService                    ✅ 100%
├── AINativeSDKClient                           ✅ 100%
├── Token encryption & storage                  ✅ 100%
├── Automatic token refresh                     ✅ 100%
└── Unit tests                                  ✅ 100%

Phase 2: Model Registry                         ⚠️ 60% COMPLETE
├── AIModelRegistryService                      ⚠️ 80% (mock data)
├── Model caching                               ✅ 100%
├── Filtering capabilities                      ✅ 100%
├── Live API integration                        ❌ 0%
├── Model invocation                            ❌ 0%
└── Streaming support                           ❌ 0%

Phase 3: Usage Tracking                         ❌ 0% COMPLETE
├── UsageTrackingService                        ❌ 0%
├── Local usage tracking                        ❌ 0%
├── Cost calculation                            ❌ 0%
├── Quota monitoring                            ❌ 0%
└── Cloud sync                                  ❌ 0%

Phase 4: UI Components                          ❌ 0% COMPLETE
├── Authentication dialogs                      ❌ 0%
├── Model browser                               ❌ 0%
├── Usage dashboard                             ❌ 0%
└── Status bar integration                      ❌ 0%

Phase 5: Integration                            ❌ 0% COMPLETE
├── Chat service integration                    ❌ 0%
├── Autocomplete integration                    ❌ 0%
├── Quick edit integration                      ❌ 0%
└── Settings UI                                 ❌ 0%

Phase 6: Testing & Polish                       ❌ 0% COMPLETE
├── E2E tests                                   ❌ 0%
├── Security audit                              ❌ 0%
├── Performance optimization                    ❌ 0%
└── Documentation                               ⚠️ 50% (arch docs done)

Overall Progress: ████░░░░░░░░░░░░░░░░ 26%
```

---

## Integration Checklist

### ✅ Backend Services (Already Done)
- [x] AINativeCloudAuthService implemented
- [x] Token encryption and storage
- [x] Automatic token refresh
- [x] AINativeSDKClient with retry logic
- [x] Error handling and mapping
- [x] Unit tests for auth service

### ⚠️ Backend Services (Partially Done)
- [x] AIModelRegistryService structure
- [x] Model caching
- [x] Client-side filtering
- [ ] Replace mock data with live API
- [ ] Implement model invocation
- [ ] Implement streaming

### ❌ Backend Services (Not Started)
- [ ] UsageTrackingService
- [ ] Local usage tracking
- [ ] Cost calculation
- [ ] Quota monitoring
- [ ] Cloud sync

### ❌ UI Components (Not Started)
- [ ] LoginDialog
- [ ] RegisterDialog
- [ ] PasswordResetDialog
- [ ] ModelBrowser
- [ ] UsageDashboard
- [ ] Status bar integration

### ❌ Feature Integration (Not Started)
- [ ] Chat service integration
- [ ] Autocomplete integration
- [ ] Quick edit integration
- [ ] Settings UI

### ❌ Testing (Not Started)
- [ ] E2E authentication tests
- [ ] Model invocation tests
- [ ] Usage tracking tests
- [ ] UI component tests
- [ ] Security audit

---

## Quick Command Reference

### Development
```bash
# Watch TypeScript compilation
npm run watch

# Watch React compilation
npm run watchreact

# Run development server
./scripts/code.sh
```

### Testing
```bash
# Run all unit tests
npm run test-node

# Run specific test
npm run test-node -- --grep "AINativeCloudAuthService"

# Run with coverage
npm run test-node -- --coverage

# Run browser tests
npm run test-browser
```

### Building
```bash
# Compile TypeScript once
npm run compile

# Build React once
npm run buildreact

# Production build (takes 25+ minutes)
npm run gulp vscode-darwin-arm64
```

---

**Last Updated:** January 3, 2026
