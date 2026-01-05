# React UI Integration Reference

Quick reference for React developers building AINative Cloud authentication components.

## Window API

The webview provides these globals:

### `window.AINATIVE_INITIAL_STATE`

Initial state object containing:

```typescript
{
    authState: 'authenticated' | 'unauthenticated' | 'refreshing' | ...,
    isAuthenticated: boolean,
    user: CloudUser | null,
    initialView: 'login' | 'register' | 'forgotPassword' | 'modelSelector',
    projectId: string
}
```

### `window.sendToVSCode(type, data)`

Send a message to VS Code (fire and forget):

```typescript
window.sendToVSCode('auth-logout', {});
```

### `window.sendToVSCodeAsync(type, data)`

Send a message and get a promise:

```typescript
const result = await window.sendToVSCodeAsync('auth-login', {
    email: 'user@example.com',
    password: 'password123'
});
```

## Message Types

### Login

```typescript
// Request
await window.sendToVSCodeAsync('auth-login', {
    email: string,
    password: string
});

// Response (on success)
{
    user: CloudUser,
    accessToken: string
}
```

### Register

```typescript
// Request
await window.sendToVSCodeAsync('auth-register', {
    username: string,
    email: string,
    password: string,
    name?: string
});

// Response (on success)
{
    user: CloudUser,
    accessToken: string,
    requiresEmailVerification: boolean
}
```

### Logout

```typescript
await window.sendToVSCodeAsync('auth-logout', {});
```

### Get Auth State

```typescript
const { state, isAuthenticated } = await window.sendToVSCodeAsync('auth-get-state', {});
```

### Get Current User

```typescript
const { user } = await window.sendToVSCodeAsync('auth-get-user', {});
```

### Request Password Reset

```typescript
const { message } = await window.sendToVSCodeAsync('auth-request-password-reset', {
    email: string
});
```

### Confirm Password Reset

```typescript
const { message } = await window.sendToVSCodeAsync('auth-confirm-password-reset', {
    token: string,
    newPassword: string
});
```

### Change Password

```typescript
const { message } = await window.sendToVSCodeAsync('auth-change-password', {
    currentPassword: string,
    newPassword: string
});
```

### List Models

```typescript
const { models } = await window.sendToVSCodeAsync('model-list', {
    filters?: {
        provider?: string,
        capability?: string,
        pricingTier?: string
    }
});
```

### Select Model

```typescript
await window.sendToVSCodeAsync('model-select', {
    modelId: string,
    projectId: string,
    parameters?: Record<string, any>
});
```

### Get Selected Model

```typescript
const { model } = await window.sendToVSCodeAsync('model-get-selected', {
    projectId: string
});
```

### Get Usage Stats

```typescript
const { stats } = await window.sendToVSCodeAsync('model-get-usage', {});
```

### Get Quota

```typescript
const { quota } = await window.sendToVSCodeAsync('model-get-quota', {});
```

## Listening to Events

Subscribe to broadcast events:

```typescript
useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
        const message = event.detail;

        switch (message.type) {
            case 'auth-state-changed':
                console.log('Auth state:', message.data.state);
                break;

            case 'user-updated':
                console.log('User updated:', message.data.user);
                break;

            case 'model-selection-changed':
                console.log('Model changed:', message.data.config);
                break;
        }
    };

    window.addEventListener('vscode-message', handleMessage as EventListener);

    return () => {
        window.removeEventListener('vscode-message', handleMessage as EventListener);
    };
}, []);
```

## Error Handling

All async calls may throw errors:

```typescript
try {
    const result = await window.sendToVSCodeAsync('auth-login', { email, password });
    console.log('Success:', result);
} catch (error) {
    console.error('Error:', error.message);
    // Error codes: INVALID_CREDENTIALS, NETWORK_ERROR, etc.
}
```

## TypeScript Types

```typescript
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

interface AIModel {
    readonly id: string;
    readonly name: string;
    readonly provider: string;
    readonly description?: string;
    readonly capabilities: string[];
    readonly pricingTier: 'free' | 'pay_per_use' | 'subscription';
    readonly contextWindow: number;
    readonly maxTokens: number;
}

interface UsageStats {
    readonly totalRequests: number;
    readonly totalTokens: number;
    readonly totalCost: number;
    readonly period: {
        start: string;
        end: string;
    };
}

interface QuotaInfo {
    readonly requests: {
        used: number;
        limit: number;
        remaining: number;
    };
    readonly tokens: {
        used: number;
        limit: number;
        remaining: number;
    };
    readonly resetAt: string;
}
```

## VSCode Theme Variables

Use VS Code theme variables for consistent styling:

```css
background-color: var(--vscode-editor-background);
color: var(--vscode-editor-foreground);
border-color: var(--vscode-input-border);
background: var(--vscode-button-background);
color: var(--vscode-button-foreground);
background: var(--vscode-button-hoverBackground);
background: var(--vscode-inputValidation-errorBackground);
border-color: var(--vscode-inputValidation-errorBorder);
color: var(--vscode-errorForeground);
```

## Development Setup

1. Install dependencies:
   ```bash
   cd src/vs/workbench/contrib/ainative/browser/react/
   npm install
   ```

2. Start watch mode:
   ```bash
   npm run watch
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Testing

Test your components by opening the auth dialog:

1. Press `F1` in VS Code
2. Type: `AINative Studio: Sign In to Cloud`
3. Press Enter

Check browser console for messages and errors.
