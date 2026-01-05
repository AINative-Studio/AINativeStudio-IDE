# AINative Cloud Authentication - Integration Guide

This guide explains how the React UI components integrate with VS Code services for AINative Cloud authentication.

## Architecture Overview

The integration layer consists of three main components:

1. **AINativeAuthUIHandler** - Handles bidirectional communication between React UI and VS Code services
2. **AINativeAuthWebviewProvider** - Creates and manages the webview that hosts React components
3. **AINativeAuthActions** - Registers VS Code commands for authentication operations

## Message Flow

### React UI → VS Code Services

```
React Component
    ↓ (window.postMessage)
Webview
    ↓ (onDidReceiveMessage)
AINativeAuthWebviewProvider
    ↓ (forwards to)
AINativeAuthUIHandler
    ↓ (calls)
IAINativeCloudAuthService / IAIModelRegistryService
```

### VS Code Services → React UI

```
IAINativeCloudAuthService / IAIModelRegistryService
    ↓ (service events)
AINativeAuthUIHandler
    ↓ (onDidSendMessage)
AINativeAuthWebviewProvider
    ↓ (postMessage)
Webview
    ↓ (window message event)
React Component
```

## Message Protocol

All messages follow a standardized format:

### Request from UI to VS Code

```typescript
interface UIMessage {
    type: string;           // Message type (e.g., 'auth-login', 'model-select')
    requestId: string;      // Unique ID for correlating responses
    data?: any;            // Optional payload
}
```

### Response from VS Code to UI

```typescript
interface UIResponse {
    type: string;           // Response type (e.g., 'auth-login-success', 'error')
    requestId: string;      // Matches request ID
    success: boolean;       // Indicates success/failure
    data?: any;            // Response data
    error?: {
        code: string;       // Error code
        message: string;    // Error message
    };
}
```

## Supported Message Types

### Authentication Messages

| Type | Direction | Description | Data |
|------|-----------|-------------|------|
| `auth-login` | UI → VSCode | Login request | `{ email, password }` |
| `auth-login-success` | VSCode → UI | Login successful | `{ user, accessToken }` |
| `auth-register` | UI → VSCode | Registration request | `{ username, email, password, name? }` |
| `auth-register-success` | VSCode → UI | Registration successful | `{ user, accessToken, requiresEmailVerification }` |
| `auth-logout` | UI → VSCode | Logout request | - |
| `auth-logout-success` | VSCode → UI | Logout successful | - |
| `auth-get-state` | UI → VSCode | Get auth state | - |
| `auth-state-result` | VSCode → UI | Auth state result | `{ state, isAuthenticated }` |
| `auth-get-user` | UI → VSCode | Get current user | - |
| `auth-user-result` | VSCode → UI | User data result | `{ user }` |
| `auth-request-password-reset` | UI → VSCode | Request password reset | `{ email }` |
| `auth-password-reset-requested` | VSCode → UI | Reset email sent | `{ message }` |
| `auth-confirm-password-reset` | UI → VSCode | Confirm password reset | `{ token, newPassword }` |
| `auth-password-reset-confirmed` | VSCode → UI | Password reset confirmed | `{ message }` |
| `auth-change-password` | UI → VSCode | Change password | `{ currentPassword, newPassword }` |
| `auth-password-changed` | VSCode → UI | Password changed | `{ message }` |

### Model Registry Messages

| Type | Direction | Description | Data |
|------|-----------|-------------|------|
| `model-list` | UI → VSCode | List available models | `{ filters? }` |
| `model-list-result` | VSCode → UI | Models list | `{ models }` |
| `model-select` | UI → VSCode | Select a model | `{ modelId, projectId, parameters? }` |
| `model-select-success` | VSCode → UI | Model selected | `{ modelId, projectId }` |
| `model-get-selected` | UI → VSCode | Get selected model | `{ projectId }` |
| `model-selected-result` | VSCode → UI | Selected model data | `{ model }` |
| `model-get-usage` | UI → VSCode | Get usage statistics | - |
| `model-usage-result` | VSCode → UI | Usage stats | `{ stats }` |
| `model-get-quota` | UI → VSCode | Get quota info | - |
| `model-quota-result` | VSCode → UI | Quota info | `{ quota }` |

### Broadcast Messages

| Type | Direction | Description | Data |
|------|-----------|-------------|------|
| `auth-state-changed` | VSCode → UI | Auth state changed | `{ state }` |
| `user-updated` | VSCode → UI | User data updated | `{ user }` |
| `model-selection-changed` | VSCode → UI | Model selection changed | `{ config }` |

## Using the Integration from React Components

### Sending Messages to VS Code

The webview provides helper functions for sending messages:

```typescript
// Simple message (fire and forget)
window.sendToVSCode('auth-logout', {});

// Async message with promise
const result = await window.sendToVSCodeAsync('auth-login', {
    email: 'user@example.com',
    password: 'password123'
});
console.log('Login result:', result);
```

### Receiving Messages from VS Code

Listen for messages using the custom event:

```typescript
useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
        const message = event.detail;

        switch (message.type) {
            case 'auth-state-changed':
                setAuthState(message.data.state);
                break;
            case 'user-updated':
                setUser(message.data.user);
                break;
            // ... handle other message types
        }
    };

    window.addEventListener('vscode-message', handleMessage as EventListener);

    return () => {
        window.removeEventListener('vscode-message', handleMessage as EventListener);
    };
}, []);
```

### Initial State

The webview provides initial state via `window.AINATIVE_INITIAL_STATE`:

```typescript
interface InitialState {
    authState: string;
    isAuthenticated: boolean;
    user: CloudUser | null;
    initialView: 'login' | 'register' | 'forgotPassword' | 'modelSelector';
    projectId?: string;
}

const initialState = window.AINATIVE_INITIAL_STATE;
```

## Registered Commands

All commands are registered in the Command Palette (F1):

- `ainative.showAuthDialog` - Show authentication dialog
- `ainative.login` - Quick sign in
- `ainative.logout` - Sign out
- `ainative.register` - Create new account
- `ainative.selectModel` - Select AI model
- `ainative.showAccount` - Show account information
- `ainative.refreshAuth` - Refresh authentication token

### Invoking Commands from Code

```typescript
// From VS Code extension code
const commandService = accessor.get(ICommandService);
await commandService.executeCommand('ainative.showAuthDialog', { initialView: 'login' });

// From React component (via VS Code API)
vscode.postMessage({
    type: 'command',
    command: 'ainative.selectModel',
    args: ['default']
});
```

## Error Handling

All errors are returned in the standardized error format:

```typescript
{
    type: 'error',
    requestId: '<original-request-id>',
    success: false,
    error: {
        code: 'ERROR_CODE',  // e.g., 'INVALID_CREDENTIALS', 'NETWORK_ERROR'
        message: 'Human-readable error message'
    }
}
```

Error codes match those defined in `CloudAuthErrorCode`:

- `INVALID_CREDENTIALS` - Wrong email/password
- `NETWORK_ERROR` - Network request failed
- `TOKEN_EXPIRED` - Access token expired
- `TOKEN_REFRESH_FAILED` - Token refresh failed
- `REGISTRATION_FAILED` - Registration failed
- `PASSWORD_RESET_FAILED` - Password reset failed
- `EMAIL_ALREADY_EXISTS` - Email already registered
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `UNKNOWN_ERROR` - Unknown error occurred

## Example: Complete Login Flow

### React Component

```typescript
import React, { useState } from 'react';

export const LoginForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await window.sendToVSCodeAsync('auth-login', {
                email,
                password
            });

            console.log('Login successful:', result.user);
            // Navigate to next screen or close dialog
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                disabled={loading}
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={loading}
            />
            <button type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
            </button>
            {error && <div className="error">{error}</div>}
        </form>
    );
};
```

## Building React Components

The React components need to be built separately and loaded into the webview:

```bash
cd ainative-studio/src/vs/workbench/contrib/ainative/browser/react/
npm install
npm run build
```

The built bundle should be referenced in the webview HTML in `ainativeAuthWebview.ts`.

## Security Considerations

1. **No Direct API Calls from UI**: React components should never make direct API calls to AINative Cloud. All requests must go through VS Code services via the message protocol.

2. **Token Security**: Access tokens are never sent to the React UI. Only user information and authentication state are shared.

3. **Content Security Policy**: The webview has a strict CSP that only allows connections to `https://api.ainative.studio`.

4. **Input Validation**: All user input is validated both in the React UI and in the VS Code services.

5. **Encrypted Storage**: Tokens are encrypted using VS Code's encryption service before being stored.

## Testing the Integration

1. **Start Development Build**:
   ```bash
   cd ainative-studio
   npm run watch
   ./scripts/code.sh
   ```

2. **Open Command Palette** (F1 or Cmd+Shift+P)

3. **Run Command**: `AINative Studio: Sign In to Cloud`

4. **Verify**:
   - Webview opens successfully
   - Initial state is populated correctly
   - Messages flow between UI and services
   - Authentication state updates properly
   - Error handling works as expected

## Troubleshooting

### Webview not loading
- Check browser console for errors
- Verify React components are built
- Check Content Security Policy settings

### Messages not received
- Verify `AINativeAuthUIHandler` is attached to window
- Check `requestId` correlation between requests and responses
- Look for errors in VS Code developer console

### Authentication failing
- Check network connectivity to `https://api.ainative.studio`
- Verify credentials are correct
- Check backend service status
- Review logs in Output panel (AINative Studio channel)

## Next Steps

1. Build the React authentication components
2. Implement the UI designs for login, registration, and model selection
3. Add comprehensive error handling and validation
4. Implement loading states and user feedback
5. Add telemetry for authentication events
6. Write integration tests

## Related Files

- `/ainative-studio/src/vs/workbench/contrib/ainative/browser/ainativeAuthUIHandler.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/browser/ainativeAuthWebview.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/browser/ainativeAuthActions.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/common/ainativeCloudAuthService.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/common/aiModelRegistryService.ts`
