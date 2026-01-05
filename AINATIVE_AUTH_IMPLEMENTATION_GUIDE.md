# AINative Authentication Implementation Guide

**Quick Reference for Development Teams**

This is a practical guide for implementing the AINative authentication system. For the complete architecture document, see `AINATIVE_AUTH_ARCHITECTURE.md`.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [What's Already Done](#whats-already-done)
3. [What Needs Implementation](#what-needs-implementation)
4. [Backend Team Guide](#backend-team-guide)
5. [Frontend Team Guide](#frontend-team-guide)
6. [Testing Guide](#testing-guide)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Backend Engineers

**Already Implemented:**
```typescript
// Authentication is ready to use!
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes';

@injectable()
class MyService {
    constructor(
        @IAINativeCloudAuthService private authService: IAINativeCloudAuthService
    ) {}

    async doSomething() {
        // Check if user is authenticated
        if (!this.authService.isAuthenticated()) {
            // Prompt user to login
            return;
        }

        // Get access token (auto-refreshes if needed)
        const token = await this.authService.getAccessToken();

        // Use token for API calls
        // ...
    }
}
```

**What You Need to Build:**
1. Replace mock model data with live API calls
2. Implement usage tracking service
3. Integrate authentication with existing AI features

### For Frontend Engineers

**What You Need to Build:**
1. Login/Register/Password Reset dialogs (React)
2. Model browser component
3. Usage dashboard component
4. Status bar integration

**Component Structure:**
```
react/src/
├── auth/
│   ├── LoginDialog.tsx          # Login form
│   ├── RegisterDialog.tsx       # Registration form
│   ├── PasswordResetDialog.tsx  # Password reset
│   └── AuthMenu.tsx             # User menu
├── models/
│   ├── ModelBrowser.tsx         # Browse available models
│   ├── ModelCard.tsx            # Single model display
│   └── ModelSelector.tsx        # Model picker
└── usage/
    ├── UsageDashboard.tsx       # Usage statistics
    ├── QuotaWidget.tsx          # Quota indicator
    └── CostBreakdown.tsx        # Cost details
```

---

## What's Already Done

### ✅ Core Authentication Service

**File:** `/src/vs/workbench/contrib/ainative/common/ainativeCloudAuthService.ts`

**Features:**
- User registration with email verification
- Login/logout with JWT tokens
- Automatic token refresh (5-minute buffer)
- Password reset flow
- Encrypted token storage
- Comprehensive error handling

**Example Usage:**
```typescript
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes';

// Login
const result = await authService.login('user@example.com', 'password123');
if (result.success) {
    console.log('Logged in as:', result.user.email);
} else {
    console.error('Login failed:', result.error.message);
}

// Check authentication
if (authService.isAuthenticated()) {
    const user = authService.getUser();
    console.log('Current user:', user.email);
}

// Get token (auto-refreshes)
const token = await authService.getAccessToken();

// Listen for auth state changes
authService.onDidChangeAuthState(state => {
    console.log('Auth state changed:', state);
});
```

### ✅ SDK Client

**File:** `/src/vs/workbench/contrib/ainative/common/ainativeSDKClient.ts`

**Features:**
- HTTP client for AINative API
- Automatic retries with exponential backoff
- Rate limiting detection
- Error mapping to semantic codes

**Example Usage:**
```typescript
const client = new AINativeSDKClient();

// All methods return Promise<{data: T}>
const { data } = await client.login('email@example.com', 'password');
console.log('Access token:', data.access_token);
console.log('User:', data.user);
```

### ✅ Model Registry Service (Partial)

**File:** `/src/vs/workbench/contrib/ainative/common/aiModelRegistryService.ts`

**Features:**
- Model listing with filters (using mock data)
- Model caching (5 minutes)
- Model selection persistence

**What's Missing:**
- Live API integration (currently using mock data)
- Model invocation endpoints
- Streaming responses

**Example Usage:**
```typescript
import { IAIModelRegistryService } from './aiModelRegistryService';

// List all models
const models = await modelRegistry.listModels();

// Filter models
const claudeModels = await modelRegistry.listModels({
    provider: 'anthropic',
    capabilities: [ModelCapability.CodeGeneration],
    availableOnly: true
});

// Select model for project
await modelRegistry.selectModel(
    'claude-3-5-sonnet-20241022',
    'my-project-id'
);

// Get selected model
const selected = await modelRegistry.getSelectedModel('my-project-id');
```

---

## What Needs Implementation

### ❌ Priority 1: Live API Integration

**Task:** Replace mock data in `AIModelRegistryService`

**Files to Modify:**
- `/src/vs/workbench/contrib/ainative/common/aiModelRegistryService.ts`

**Changes Needed:**
```typescript
// Current (line 690)
async refreshModels(): Promise<void> {
    // TODO: Replace with actual API endpoint when available
    // For now, we'll use the mock data
    this._initializeMockModels();
    // ...
}

// Change to:
async refreshModels(): Promise<void> {
    try {
        const response = await this._makeApiRequest('/v1/models', {
            method: 'GET',
        });

        if (!response.ok) {
            await this._handleApiError(response);
        }

        const data = await response.json();
        this._cachedModels = data.models ?? [];

        this._cacheTimestamp = Date.now();
        this._onDidUpdateModels.fire(this._cachedModels ?? []);

        console.log('[AIModelRegistryService] Models refreshed');

    } catch (error) {
        console.error('[AIModelRegistryService] Failed to refresh models:', error);
        throw new ModelRegistryError(
            ModelRegistryErrorCode.NetworkError,
            'Failed to refresh models',
            error as Error
        );
    }
}
```

**Testing:**
```bash
# Test with real API
cd ainative-studio
npm run test-node -- --grep "AIModelRegistryService"
```

### ❌ Priority 2: Usage Tracking Service

**Task:** Implement `IUsageTrackingService`

**File to Create:** `/src/vs/workbench/contrib/ainative/common/usageTrackingService.ts`

**Interface:**
```typescript
export const IUsageTrackingService = createDecorator<IUsageTrackingService>('usageTrackingService');

export interface IUsageTrackingService {
    readonly _serviceBrand: undefined;

    // Events
    readonly onDidUpdateUsage: Event<UsageStats>;
    readonly onDidApproachQuota: Event<QuotaWarning>;

    // Local tracking
    recordModelInvocation(invocation: ModelInvocation): void;
    getLocalUsage(period?: DateRange): LocalUsageStats;
    clearLocalUsage(): void;

    // Cloud sync
    syncUsageToCloud(): Promise<void>;
    getCloudUsage(): Promise<UsageStats>;
    getQuotaInfo(): Promise<QuotaInfo>;

    // Cost estimation
    estimateCost(modelId: string, inputTokens: number, outputTokens: number): number;
    getModelPricing(modelId: string): Promise<PricingInfo>;

    // Alerts
    setQuotaWarningThreshold(percentage: number): void;
    getQuotaWarningThreshold(): number;
}
```

**Implementation Steps:**
1. Create service class extending `Disposable`
2. Add local storage for usage tracking
3. Implement cost calculation logic
4. Add quota monitoring with events
5. Implement cloud sync
6. Register as singleton

**Example Implementation:**
```typescript
export class UsageTrackingService extends Disposable implements IUsageTrackingService {
    readonly _serviceBrand: undefined;

    private static readonly STORAGE_KEY_USAGE = 'ainative.usage.local';
    private static readonly DEFAULT_QUOTA_THRESHOLD = 80; // 80%

    private readonly _onDidUpdateUsage = this._register(new Emitter<UsageStats>());
    readonly onDidUpdateUsage = this._onDidUpdateUsage.event;

    private readonly _onDidApproachQuota = this._register(new Emitter<QuotaWarning>());
    readonly onDidApproachQuota = this._onDidApproachQuota.event;

    private _localUsage: Map<string, ModelInvocation[]> = new Map();
    private _quotaThreshold: number = UsageTrackingService.DEFAULT_QUOTA_THRESHOLD;

    constructor(
        @IStorageService private readonly storageService: IStorageService,
        @IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService,
        @IAIModelRegistryService private readonly modelRegistry: IAIModelRegistryService
    ) {
        super();
        this._loadLocalUsage();
    }

    recordModelInvocation(invocation: ModelInvocation): void {
        const modelInvocations = this._localUsage.get(invocation.modelId) ?? [];
        modelInvocations.push(invocation);
        this._localUsage.set(invocation.modelId, modelInvocations);

        this._saveLocalUsage();
        this._checkQuotaWarning();
    }

    estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
        // Get model pricing from registry
        const model = await this.modelRegistry.getModel(modelId);
        const pricing = model.pricing;

        // Calculate cost (prices are per 1K tokens)
        const inputCost = (inputTokens / 1000) * (pricing.inputTokenCost ?? 0);
        const outputCost = (outputTokens / 1000) * (pricing.outputTokenCost ?? 0);

        return inputCost + outputCost;
    }

    // ... implement other methods
}

registerSingleton(IUsageTrackingService, UsageTrackingService, InstantiationType.Delayed);
```

### ❌ Priority 3: React UI Components

**Task:** Create authentication and model browsing UI

**Components to Create:**

#### 1. LoginDialog.tsx
```typescript
import React, { useState } from 'react';
import { IAINativeCloudAuthService } from '../../common/ainativeCloudAuthTypes';

interface LoginDialogProps {
    authService: IAINativeCloudAuthService;
    onSuccess: () => void;
    onCancel: () => void;
    onSwitchToRegister: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
    authService,
    onSuccess,
    onCancel,
    onSwitchToRegister
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await authService.login(email, password);

            if (result.success) {
                onSuccess();
            } else {
                setError(result.error?.message ?? 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-dialog">
            <h2>Sign in to AINative Cloud</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="form-actions">
                    <button type="button" onClick={onCancel} disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </div>
            </form>

            <div className="form-footer">
                <button onClick={onSwitchToRegister}>
                    Don't have an account? Register
                </button>
            </div>
        </div>
    );
};
```

#### 2. ModelBrowser.tsx
```typescript
import React, { useEffect, useState } from 'react';
import { AIModel, ModelFilters, ModelCapability } from '../../common/aiModelRegistryTypes';
import { IAIModelRegistryService } from '../../common/aiModelRegistryService';
import { ModelCard } from './ModelCard';

interface ModelBrowserProps {
    modelRegistry: IAIModelRegistryService;
    onSelectModel: (model: AIModel) => void;
}

export const ModelBrowser: React.FC<ModelBrowserProps> = ({
    modelRegistry,
    onSelectModel
}) => {
    const [models, setModels] = useState<AIModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<ModelFilters>({
        availableOnly: true
    });

    useEffect(() => {
        loadModels();
    }, [filters]);

    const loadModels = async () => {
        setLoading(true);
        try {
            const result = await modelRegistry.listModels(filters);
            setModels(result);
        } catch (error) {
            console.error('Failed to load models:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="model-browser">
            <div className="model-filters">
                <input
                    type="text"
                    placeholder="Search models..."
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />

                <select
                    onChange={(e) => setFilters({ ...filters, provider: e.target.value || undefined })}
                >
                    <option value="">All Providers</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                    <option value="google">Google</option>
                </select>

                <label>
                    <input
                        type="checkbox"
                        checked={filters.capabilities?.includes(ModelCapability.CodeGeneration) ?? false}
                        onChange={(e) => {
                            const caps = filters.capabilities ?? [];
                            setFilters({
                                ...filters,
                                capabilities: e.target.checked
                                    ? [...caps, ModelCapability.CodeGeneration]
                                    : caps.filter(c => c !== ModelCapability.CodeGeneration)
                            });
                        }}
                    />
                    Code Generation
                </label>
            </div>

            <div className="model-list">
                {loading ? (
                    <div className="loading">Loading models...</div>
                ) : (
                    models.map(model => (
                        <ModelCard
                            key={model.id}
                            model={model}
                            onSelect={() => onSelectModel(model)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
```

---

## Backend Team Guide

### Task 1: Complete Model Registry API Integration

**Goal:** Replace mock data with live API calls

**Steps:**

1. **Update refreshModels() method:**
   ```typescript
   async refreshModels(): Promise<void> {
       const response = await this._makeApiRequest('/v1/models', { method: 'GET' });
       const data = await response.json();
       this._cachedModels = data.models;
       this._cacheTimestamp = Date.now();
       this._onDidUpdateModels.fire(this._cachedModels);
   }
   ```

2. **Implement model invocation:**
   ```typescript
   async invokeModel(request: ModelInvocationRequest): Promise<ModelResponse> {
       const token = await this.authService.getAccessToken();

       const response = await this._makeApiRequest('/v1/models/invoke', {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${token}` },
           body: JSON.stringify(request)
       });

       return await response.json();
   }
   ```

3. **Test with real API:**
   ```bash
   npm run test-node -- --grep "Model Registry"
   ```

### Task 2: Implement Usage Tracking Service

**Goal:** Track model usage and costs

**Steps:**

1. **Create service file:**
   ```bash
   touch src/vs/workbench/contrib/ainative/common/usageTrackingService.ts
   touch src/vs/workbench/contrib/ainative/common/usageTrackingTypes.ts
   ```

2. **Define types in usageTrackingTypes.ts:**
   ```typescript
   export interface ModelInvocation {
       readonly id: string;
       readonly modelId: string;
       readonly timestamp: number;
       readonly inputTokens: number;
       readonly outputTokens: number;
       readonly totalTokens: number;
       readonly cost: number;
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
   }
   ```

3. **Implement service class**
4. **Register singleton**
5. **Write unit tests**

### Task 3: Integrate with Chat Service

**Goal:** Use AINative Cloud for chat when authenticated

**File:** `/src/vs/workbench/contrib/ainative/browser/chatThreadService.ts`

**Changes:**
```typescript
export class ChatThreadService extends Disposable implements IChatThreadService {
    constructor(
        // ... existing dependencies
        @IAINativeCloudAuthService private readonly cloudAuth: IAINativeCloudAuthService,
        @IAIModelRegistryService private readonly modelRegistry: IAIModelRegistryService
    ) {
        super();
    }

    private async _sendLLMMessage(message: string): Promise<void> {
        const settings = this.settingsService.getSettings();

        // Check if using AINative Cloud
        if (settings.useAINativeCloud && this.cloudAuth.isAuthenticated()) {
            return this._sendViaAINativeCloud(message);
        }

        // Use existing provider SDK
        return this._sendViaDirectProvider(message);
    }

    private async _sendViaAINativeCloud(message: string): Promise<void> {
        const selectedModel = await this.modelRegistry.getSelectedModel(this.projectId);

        if (!selectedModel) {
            throw new Error('No model selected. Please select a model in settings.');
        }

        await this.modelRegistry.streamModel(
            {
                modelId: selectedModel.id,
                prompt: message,
                stream: true
            },
            (chunk) => {
                this._handleStreamChunk(chunk);
            }
        );
    }
}
```

---

## Frontend Team Guide

### Task 1: Authentication Dialogs

**Goal:** Create login, register, and password reset UI

**Location:** `/src/vs/workbench/contrib/ainative/browser/react/src/auth/`

**Files to Create:**
1. `LoginDialog.tsx`
2. `RegisterDialog.tsx`
3. `PasswordResetDialog.tsx`
4. `AuthMenu.tsx`

**Integration:**
```typescript
// In main React component
import { LoginDialog } from './auth/LoginDialog';

const MyComponent = () => {
    const [showLogin, setShowLogin] = useState(false);

    return (
        <>
            {showLogin && (
                <LoginDialog
                    authService={authService}
                    onSuccess={() => setShowLogin(false)}
                    onCancel={() => setShowLogin(false)}
                    onSwitchToRegister={() => {/* switch to register */}}
                />
            )}
        </>
    );
};
```

**Styling:**
Use existing VS Code Codicon icons and CSS variables:
```css
.login-dialog {
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-widget-border);
}

.login-dialog button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
}

.login-dialog button:hover {
    background: var(--vscode-button-hoverBackground);
}

.error-message {
    color: var(--vscode-errorForeground);
}
```

### Task 2: Model Browser

**Goal:** Browse and select AI models

**Location:** `/src/vs/workbench/contrib/ainative/browser/react/src/models/`

**Files to Create:**
1. `ModelBrowser.tsx` - Main browser component
2. `ModelCard.tsx` - Individual model display
3. `ModelSelector.tsx` - Quick model picker

**Features:**
- Search models by name/description
- Filter by provider, capabilities, pricing
- Show model details (context length, pricing, etc.)
- Select model for project
- Show current selection

### Task 3: Usage Dashboard

**Goal:** Display usage statistics and costs

**Location:** `/src/vs/workbench/contrib/ainative/browser/react/src/usage/`

**Files to Create:**
1. `UsageDashboard.tsx` - Main dashboard
2. `QuotaWidget.tsx` - Quota indicator
3. `CostBreakdown.tsx` - Cost analysis

**Features:**
- Show total calls, tokens, costs
- Breakdown by model
- Quota progress bar
- Cost trends (daily/weekly/monthly)
- Alert when approaching quota

### Task 4: Status Bar Integration

**Goal:** Show auth status in VS Code status bar

**File to Create:** `/src/vs/workbench/contrib/ainative/browser/ainativeStatusBar.ts`

**Implementation:**
```typescript
export class AINativeStatusBarContribution extends Disposable implements IWorkbenchContribution {
    constructor(
        @IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService,
        @IStatusbarService private readonly statusbarService: IStatusbarService,
        @ICommandService private readonly commandService: ICommandService
    ) {
        super();
        this._register(this.authService.onDidChangeAuthState(() => this._update()));
        this._update();
    }

    private _update(): void {
        const authenticated = this.authService.isAuthenticated();
        const user = this.authService.getUser();

        const entry: IStatusbarEntry = {
            name: 'AINative Cloud',
            text: authenticated ? `$(cloud) ${user?.email}` : '$(cloud-offline) Sign In',
            tooltip: authenticated ? 'Signed in to AINative Cloud' : 'Sign in to AINative Cloud',
            command: 'ainative.showAuthMenu',
            ariaLabel: 'AINative Cloud Authentication'
        };

        this.statusbarService.addEntry(entry, 'ainativeCloud', StatusbarAlignment.RIGHT, 100);
    }
}
```

---

## Testing Guide

### Unit Tests

**Location:** `/test/common/`

**Running Tests:**
```bash
# Run all tests
npm run test-node

# Run specific test file
npm run test-node -- --grep "AINativeCloudAuthService"

# Run with coverage
npm run test-node -- --coverage
```

**Example Test:**
```typescript
import { AINativeCloudAuthService } from '../../src/vs/workbench/contrib/ainative/common/ainativeCloudAuthService';

describe('AINativeCloudAuthService', () => {
    let authService: AINativeCloudAuthService;
    let encryptionService: IEncryptionService;
    let storageService: IStorageService;

    beforeEach(() => {
        // Setup mock services
        encryptionService = createMockEncryptionService();
        storageService = createMockStorageService();

        authService = new AINativeCloudAuthService(
            encryptionService,
            storageService
        );
    });

    it('should login successfully', async () => {
        const result = await authService.login('test@example.com', 'password123');

        expect(result.success).toBe(true);
        expect(result.user?.email).toBe('test@example.com');
        expect(authService.isAuthenticated()).toBe(true);
    });

    it('should refresh token automatically', async () => {
        // Login
        await authService.login('test@example.com', 'password123');

        // Manually expire token
        (authService as any)._accessToken = createExpiredToken();

        // Get token should auto-refresh
        const token = await authService.getAccessToken();

        expect(token).toBeDefined();
        expect(isTokenExpired(token)).toBe(false);
    });
});
```

### Integration Tests

**Test Scenarios:**
1. Complete authentication flow
2. Model selection and invocation
3. Usage tracking and syncing
4. Error handling and recovery

**Example:**
```typescript
describe('AINative Cloud Integration', () => {
    it('should authenticate and invoke model', async () => {
        // 1. Login
        const authResult = await authService.login(TEST_EMAIL, TEST_PASSWORD);
        expect(authResult.success).toBe(true);

        // 2. List models
        const models = await modelRegistry.listModels();
        expect(models.length).toBeGreaterThan(0);

        // 3. Select model
        await modelRegistry.selectModel(models[0].id, 'test-project');

        // 4. Invoke model
        const response = await modelRegistry.invokeModel({
            modelId: models[0].id,
            prompt: 'Hello, world!',
            maxTokens: 100
        });

        expect(response.text).toBeDefined();
        expect(response.usage).toBeDefined();
    });
});
```

---

## Common Patterns

### Pattern 1: Service Injection

```typescript
import { createDecorator } from '../../../../platform/instantiation/common/instantiation';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions';

// 1. Create service decorator
export const IMyService = createDecorator<IMyService>('myService');

// 2. Define interface
export interface IMyService {
    readonly _serviceBrand: undefined;
    myMethod(): Promise<void>;
}

// 3. Implement service
export class MyService extends Disposable implements IMyService {
    readonly _serviceBrand: undefined;

    constructor(
        @IOtherService private readonly otherService: IOtherService
    ) {
        super();
    }

    async myMethod(): Promise<void> {
        // Implementation
    }
}

// 4. Register singleton
registerSingleton(IMyService, MyService, InstantiationType.Delayed);
```

### Pattern 2: Event Emission

```typescript
import { Emitter, Event } from '../../../../base/common/event';

export class MyService extends Disposable {
    private readonly _onDidChange = this._register(new Emitter<string>());
    readonly onDidChange: Event<string> = this._onDidChange.event;

    private _doSomething(): void {
        // ... do work

        // Fire event
        this._onDidChange.fire('value changed');
    }
}

// Usage
service.onDidChange(value => {
    console.log('Changed:', value);
});
```

### Pattern 3: Encrypted Storage

```typescript
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage';

// Store encrypted
async storeSecret(secret: string): Promise<void> {
    const encrypted = await this.encryptionService.encrypt(secret);
    this.storageService.store(
        'my.secret.key',
        encrypted,
        StorageScope.APPLICATION,
        StorageTarget.MACHINE
    );
}

// Retrieve encrypted
async getSecret(): Promise<string | null> {
    const encrypted = this.storageService.get('my.secret.key', StorageScope.APPLICATION);
    if (!encrypted) {
        return null;
    }
    return await this.encryptionService.decrypt(encrypted);
}
```

### Pattern 4: React Component with Service

```typescript
import React from 'react';

interface MyComponentProps {
    authService: IAINativeCloudAuthService;
}

export const MyComponent: React.FC<MyComponentProps> = ({ authService }) => {
    const [user, setUser] = React.useState(authService.getUser());

    React.useEffect(() => {
        const disposable = authService.onDidUpdateUser(updatedUser => {
            setUser(updatedUser);
        });

        return () => disposable.dispose();
    }, [authService]);

    return (
        <div>
            {user ? `Logged in as ${user.email}` : 'Not logged in'}
        </div>
    );
};
```

---

## Troubleshooting

### Problem: "Service not found"

**Cause:** Service not registered in DI container

**Solution:**
```typescript
// Ensure this is at the end of your service file:
registerSingleton(IMyService, MyService, InstantiationType.Delayed);
```

### Problem: "Token refresh loop"

**Cause:** Token expiration check causing infinite refresh

**Solution:**
Check that JWT decoding works correctly:
```typescript
private _isTokenExpired(token: string): boolean {
    try {
        const claims = this._decodeJWT(token);
        const now = Math.floor(Date.now() / 1000);
        const buffer = 300; // 5 minutes
        return claims.exp < (now + buffer);
    } catch {
        return true; // Treat decode errors as expired
    }
}
```

### Problem: "Encryption service unavailable"

**Cause:** Platform doesn't support native encryption

**Solution:**
```typescript
async _saveTokens(): Promise<void> {
    try {
        const encrypted = await this.encryptionService.encrypt(token);
        // ... store
    } catch (error) {
        console.warn('Encryption unavailable, using obfuscation');
        // Fallback to base64 obfuscation (warn user)
        const obfuscated = Buffer.from(token).toString('base64');
        // ... store
    }
}
```

### Problem: "React components not hot reloading"

**Cause:** React build not in watch mode

**Solution:**
```bash
cd src/vs/workbench/contrib/ainative/browser/react
node build.js --watch
```

### Problem: "API requests timing out"

**Cause:** Network issues or slow API

**Solution:**
```typescript
// Increase timeout for specific requests
const response = await this._makeApiRequest('/v1/models/invoke', {
    method: 'POST',
    body: JSON.stringify(request)
}, {
    timeout: 60000 // 60 seconds for long-running requests
});
```

---

## Quick Reference

### File Locations

| Component | Location |
|-----------|----------|
| Auth Service | `src/vs/workbench/contrib/ainative/common/ainativeCloudAuthService.ts` |
| Model Registry | `src/vs/workbench/contrib/ainative/common/aiModelRegistryService.ts` |
| SDK Client | `src/vs/workbench/contrib/ainative/common/ainativeSDKClient.ts` |
| React Components | `src/vs/workbench/contrib/ainative/browser/react/src/` |
| Tests | `test/common/` |
| Type Definitions | `src/vs/workbench/contrib/ainative/common/*Types.ts` |

### Commands

```bash
# Development
npm run watch              # Watch TypeScript compilation
npm run watchreact         # Watch React compilation

# Testing
npm run test-node          # Run unit tests
npm run test-browser       # Run browser tests

# Building
npm run compile            # One-time TypeScript compilation
npm run buildreact         # One-time React build
```

### API Endpoints

```
Authentication:
POST /v1/auth/register          - Register new user
POST /v1/auth/login-json        - Login
POST /v1/auth/logout            - Logout
POST /v1/auth/refresh           - Refresh token
GET  /v1/auth/me                - Get current user

Models:
GET  /v1/models                 - List models
GET  /v1/models/{id}            - Get model details
POST /v1/models/invoke          - Invoke model
POST /v1/models/stream          - Stream model response

Usage:
GET  /v1/usage/stats            - Get usage statistics
GET  /v1/usage/quota            - Get quota information
```

---

## Next Steps

1. **Backend Team:**
   - Replace mock data in `AIModelRegistryService`
   - Implement `UsageTrackingService`
   - Integrate with chat service

2. **Frontend Team:**
   - Create authentication dialogs
   - Build model browser component
   - Implement usage dashboard

3. **Everyone:**
   - Write comprehensive tests
   - Update documentation
   - Perform code reviews

---

**Need Help?**
- See full architecture: `AINATIVE_AUTH_ARCHITECTURE.md`
- Check existing tests for examples
- Review existing service implementations

**Last Updated:** January 3, 2026
