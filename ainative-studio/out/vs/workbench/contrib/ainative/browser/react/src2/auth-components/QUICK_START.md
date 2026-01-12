# Quick Start Guide - AINative Authentication Components

**5-Minute Guide to Using the Auth Components**

## Installation

These components are already part of the codebase. No installation needed.

## Basic Usage

### 1. Import the AuthDialog

```tsx
import { AuthDialog } from './auth-components';
```

### 2. Use in Your Component

```tsx
function MyApp() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div>
      <button onClick={() => setShowAuth(true)}>Sign In</button>

      {showAuth && (
        <AuthDialog
          onSuccess={() => {
            console.log('User logged in!');
            setShowAuth(false);
          }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
```

## Individual Components

### Login Form

```tsx
import { LoginForm } from './auth-components';

<LoginForm
  onSwitchToRegister={() => setView('register')}
  onSwitchToForgotPassword={() => setView('forgot')}
  onSuccess={() => console.log('Logged in!')}
/>
```

### Register Form

```tsx
import { RegisterForm } from './auth-components';

<RegisterForm
  onSwitchToLogin={() => setView('login')}
  onSuccess={() => console.log('Registered!')}
/>
```

### Forgot Password

```tsx
import { ForgotPasswordForm } from './auth-components';

<ForgotPasswordForm
  onSwitchToLogin={() => setView('login')}
  onSuccess={() => console.log('Reset email sent!')}
/>
```

### Password Reset

```tsx
import { PasswordResetForm } from './auth-components';

<PasswordResetForm
  resetToken="token-from-email"
  onSwitchToLogin={() => setView('login')}
  onSuccess={() => console.log('Password reset!')}
/>
```

## Message Protocol

Components communicate with VS Code using messages:

```tsx
import { useSendToVSCode, useVSCodeMessage } from './auth-components';

function MyComponent() {
  const sendToVSCode = useSendToVSCode();

  // Send a message
  const login = async () => {
    await sendToVSCode('auth-login', {
      email: 'user@example.com',
      password: 'password123'
    });
  };

  // Listen for responses
  useVSCodeMessage((message) => {
    if (message.type === 'auth-login-success') {
      console.log('Success!', message.data.user);
    }
  });
}
```

## Initial State

Set the initial view using `window.AINATIVE_INITIAL_STATE`:

```typescript
window.AINATIVE_INITIAL_STATE = {
  authState: 'unauthenticated',
  isAuthenticated: false,
  user: null,
  initialView: 'login',  // or 'register', 'forgotPassword', 'passwordReset'
  projectId: 'my-project',
  resetToken: 'optional-token-for-reset'
};
```

## Styling

Import the CSS to get VS Code theme integration:

```tsx
import './auth-components/auth.css';
```

Components automatically use VS Code theme variables:
- Background: `--vscode-editor-background`
- Text: `--vscode-foreground`
- Buttons: `--vscode-button-background`
- Errors: `--vscode-errorForeground`
- Focus: `--vscode-focusBorder`

## Building

Before using, build the React components:

```bash
cd src/vs/workbench/contrib/ainative/browser/react/
npm install
npm run build
```

## Testing

1. Start VS Code in dev mode:
   ```bash
   cd ainative-studio
   npm run watch
   ./scripts/code.sh
   ```

2. Open Command Palette (F1)

3. Run: `AINative Studio: Sign In to Cloud`

## Common Patterns

### Custom View Management

```tsx
import { LoginForm, RegisterForm } from './auth-components';

function CustomAuth() {
  const [view, setView] = useState<'login' | 'register'>('login');

  return (
    <div className="custom-auth">
      {view === 'login' && (
        <LoginForm
          onSwitchToRegister={() => setView('register')}
          onSuccess={handleSuccess}
        />
      )}
      {view === 'register' && (
        <RegisterForm
          onSwitchToLogin={() => setView('login')}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
```

### Error Handling

```tsx
import { useVSCodeMessage } from './auth-components';

useVSCodeMessage((message) => {
  if (message.type === 'error') {
    switch (message.error?.code) {
      case 'INVALID_CREDENTIALS':
        console.error('Wrong email or password');
        break;
      case 'EMAIL_ALREADY_EXISTS':
        console.error('Email already registered');
        break;
      case 'WEAK_PASSWORD':
        console.error('Password too weak');
        break;
      default:
        console.error('Unknown error:', message.error?.message);
    }
  }
});
```

### Loading States

All forms have built-in loading states:

```tsx
<LoginForm onSuccess={onSuccess} />
// Shows "Signing in..." with spinner automatically
```

## Keyboard Shortcuts

- `Escape` - Close dialog
- `Tab` / `Shift+Tab` - Navigate fields
- `Enter` - Submit form

## Accessibility

Components are fully accessible:
- Screen reader support
- Keyboard navigation
- ARIA labels
- Error announcements
- High contrast mode
- Reduced motion support

## TypeScript Types

```typescript
import type {
  CloudUser,
  UIMessage,
  UIResponse,
  InitialState,
  FormErrors,
  AuthView
} from './auth-components';

const user: CloudUser = {
  id: '123',
  email: 'user@example.com',
  role: 'user'
};

const initialState: InitialState = {
  authState: 'unauthenticated',
  isAuthenticated: false,
  user: null,
  initialView: 'login'
};
```

## Troubleshooting

### Components not rendering?
- Check that auth.css is imported
- Verify React build completed: `npm run build`

### Messages not working?
- Ensure `window.sendToVSCodeAsync` is defined
- Check VS Code Developer Console for errors

### Styling issues?
- Verify VS Code theme variables are available
- Check for CSS conflicts

## Next Steps

- Read full documentation: [README.md](./README.md)
- See integration guide: `/docs/ainative-auth-integration-guide.md`
- Check message protocol: `INTEGRATION_REFERENCE.md`

## Support

For issues or questions:
1. Check the README.md
2. Review integration guide
3. Check VS Code Developer Console
4. Open an issue on GitHub
