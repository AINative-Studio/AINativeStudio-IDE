# AINative Cloud Authentication Components

React UI components for authenticating users with AINative Cloud services. These components are designed to work within VS Code webviews and communicate with backend services via the message protocol.

## Overview

This module provides a complete authentication flow including:

- **LoginForm** - Email and password authentication
- **RegisterForm** - New user registration with validation
- **ForgotPasswordForm** - Password reset request
- **PasswordResetForm** - Complete password reset with token
- **AuthDialog** - Container component that orchestrates all forms

## Features

- Full WCAG 2.1 AA accessibility compliance
- VS Code theme integration using CSS variables
- Comprehensive form validation
- Loading states and error handling
- Keyboard navigation support
- Responsive design for all screen sizes
- Type-safe with TypeScript
- Message protocol integration with VS Code services

## Installation

These components are part of the AINative Studio IDE codebase. They are located at:

```
/src/vs/workbench/contrib/ainative/browser/react/src/auth-components/
```

## Usage

### Basic Usage

```tsx
import { AuthDialog } from './auth-components';

function MyComponent() {
  const handleSuccess = () => {
    console.log('User authenticated successfully');
  };

  const handleClose = () => {
    console.log('Dialog closed');
  };

  return (
    <AuthDialog
      onSuccess={handleSuccess}
      onClose={handleClose}
    />
  );
}
```

### Using Individual Forms

```tsx
import { LoginForm, RegisterForm } from './auth-components';

function CustomAuthFlow() {
  const [view, setView] = useState<'login' | 'register'>('login');

  return view === 'login' ? (
    <LoginForm
      onSwitchToRegister={() => setView('register')}
      onSuccess={() => console.log('Logged in')}
    />
  ) : (
    <RegisterForm
      onSwitchToLogin={() => setView('login')}
      onSuccess={() => console.log('Registered')}
    />
  );
}
```

## Message Protocol

All components communicate with VS Code services using the webview message protocol.

### Sending Messages

```typescript
// Using the hook
import { useSendToVSCode } from './auth-components';

const sendToVSCode = useSendToVSCode();
await sendToVSCode('auth-login', { email, password });
```

### Receiving Messages

```typescript
// Using the hook
import { useVSCodeMessage } from './auth-components';

useVSCodeMessage((message) => {
  if (message.type === 'auth-login-success') {
    console.log('Login successful:', message.data);
  }
});
```

### Supported Message Types

#### Authentication Messages

| Type | Direction | Description | Data |
|------|-----------|-------------|------|
| `auth-login` | UI → VS Code | Login request | `{ email, password }` |
| `auth-login-success` | VS Code → UI | Login successful | `{ user, accessToken }` |
| `auth-register` | UI → VS Code | Registration request | `{ username, email, password, name? }` |
| `auth-register-success` | VS Code → UI | Registration successful | `{ user, requiresEmailVerification }` |
| `auth-logout` | UI → VS Code | Logout request | - |
| `auth-request-password-reset` | UI → VS Code | Request password reset | `{ email }` |
| `auth-password-reset-requested` | VS Code → UI | Reset email sent | `{ message }` |
| `auth-confirm-password-reset` | UI → VS Code | Confirm password reset | `{ token, newPassword }` |
| `auth-password-reset-confirmed` | VS Code → UI | Password reset confirmed | `{ message }` |
| `error` | VS Code → UI | Error occurred | `{ code, message }` |

## Component API

### AuthDialog

Main container component that manages the authentication flow.

**Props:**
- `onClose?: () => void` - Called when dialog is closed
- `onSuccess?: () => void` - Called when authentication succeeds

**Initial State:**
The component reads `window.AINATIVE_INITIAL_STATE` to determine the starting view:
- `login` - Show login form (default)
- `register` - Show registration form
- `forgotPassword` - Show forgot password form
- `passwordReset` - Show password reset form (requires resetToken)

### LoginForm

Email and password login form.

**Props:**
- `onSwitchToRegister?: () => void` - Switch to registration
- `onSwitchToForgotPassword?: () => void` - Switch to forgot password
- `onSuccess?: () => void` - Called on successful login

**Features:**
- Email validation (RFC 5322 compliant)
- Password length validation (min 8 characters)
- Loading states during authentication
- Accessible error messages
- Auto-focus on email field

### RegisterForm

New user registration form with comprehensive validation.

**Props:**
- `onSwitchToLogin?: () => void` - Switch to login
- `onSuccess?: () => void` - Called on successful registration

**Validation Rules:**
- **Username**: 3+ characters, alphanumeric with hyphens/underscores
- **Email**: Valid email format
- **Password**: 8+ characters with uppercase, lowercase, and numbers
- **Confirm Password**: Must match password

**Features:**
- Email verification flow support
- Duplicate email detection
- Password strength requirements
- Optional full name field

### ForgotPasswordForm

Request a password reset link via email.

**Props:**
- `onSwitchToLogin?: () => void` - Switch to login
- `onSuccess?: () => void` - Called when reset email is sent

**Features:**
- Email validation
- Confirmation screen after submission
- Security-conscious messaging (doesn't reveal if email exists)

### PasswordResetForm

Complete password reset using a token from email.

**Props:**
- `resetToken: string` - Token from password reset email (required)
- `onSwitchToLogin?: () => void` - Switch to login
- `onSuccess?: () => void` - Called on successful password reset

**Features:**
- Token expiration handling
- Password strength validation
- Confirm password matching
- Success screen with login redirect

## Validation

All forms use the shared validation utilities from `../util/validation.ts`:

```typescript
import { isValidEmail, isValidPassword } from '../util/validation';

// Email validation
isValidEmail('user@example.com'); // true

// Password validation
isValidPassword('SecurePass123', 8); // true (min 8 chars)
```

## Styling

Components use VS Code theme variables for consistent styling:

```css
/* Background colors */
--vscode-editor-background
--vscode-input-background

/* Foreground colors */
--vscode-foreground
--vscode-errorForeground

/* Borders */
--vscode-widget-border
--vscode-focusBorder

/* Buttons */
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground
```

### Custom Styling

You can override styles by importing your own CSS after the component CSS:

```tsx
import { AuthDialog } from './auth-components';
import './my-custom-auth-styles.css';
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- ✓ Semantic HTML structure
- ✓ ARIA labels and descriptions
- ✓ Keyboard navigation support
- ✓ Focus management
- ✓ Screen reader announcements
- ✓ Color contrast compliance
- ✓ Reduced motion support
- ✓ High contrast mode support

### Keyboard Shortcuts

- `Escape` - Close dialog
- `Tab` / `Shift+Tab` - Navigate between fields
- `Enter` - Submit form
- Focus indicators for all interactive elements

## Error Handling

All components handle errors gracefully:

```typescript
// Field-specific errors
setErrors({
  email: 'Please enter a valid email address',
  password: 'Password must be at least 8 characters'
});

// General errors
setErrors({
  general: 'An unexpected error occurred. Please try again.'
});
```

Error messages are:
- Displayed inline below fields
- Announced to screen readers
- Linked to inputs via `aria-describedby`
- Styled with VS Code error theme colors

## Building for Production

Build the React components:

```bash
cd ainative-studio/src/vs/workbench/contrib/ainative/browser/react/
npm install
npm run build
```

The built bundle will be used by the webview provider.

## Testing

To test the components:

1. Start VS Code in development mode:
   ```bash
   cd ainative-studio
   npm run watch
   ./scripts/code.sh
   ```

2. Open the Command Palette (`F1` or `Cmd+Shift+P`)

3. Run: `AINative Studio: Sign In to Cloud`

4. Test the authentication flow

### Testing Tips

- Check browser console for message protocol logs
- Use VS Code Developer Tools (Help > Toggle Developer Tools)
- Test keyboard navigation
- Test with screen readers
- Test in high contrast mode
- Test responsive behavior

## Integration with VS Code Services

These components are designed to work with:

- **AINativeAuthUIHandler** - Handles message routing
- **AINativeAuthWebviewProvider** - Creates the webview
- **IAINativeCloudAuthService** - Backend authentication service

See `/docs/ainative-auth-integration-guide.md` for complete integration details.

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

interface InitialState {
  authState: string;
  isAuthenticated: boolean;
  user: CloudUser | null;
  initialView: 'login' | 'register' | 'forgotPassword' | 'passwordReset';
  projectId?: string;
  resetToken?: string;
}

type AuthView = 'login' | 'register' | 'forgotPassword' | 'passwordReset';
```

## Security Considerations

1. **No Direct API Calls**: Components never make direct API calls. All requests go through VS Code services.

2. **Token Security**: Access tokens are never exposed to the React UI. Only user data is shared.

3. **Input Validation**: All inputs are validated on both client and server.

4. **CSRF Protection**: Message protocol includes request IDs for correlation.

5. **Content Security Policy**: Webview has strict CSP restrictions.

## Troubleshooting

### Components not loading

- Verify React build completed successfully
- Check webview Content Security Policy
- Ensure message handlers are registered

### Messages not working

- Verify `window.sendToVSCodeAsync` is available
- Check request IDs match between request/response
- Look for errors in VS Code Developer Console

### Styling issues

- Ensure `auth.css` is imported
- Verify VS Code theme variables are available
- Check for CSS conflicts with other styles

## Contributing

When adding new features:

1. Follow existing component patterns
2. Add proper TypeScript types
3. Include accessibility attributes
4. Add loading and error states
5. Update this README
6. Test with keyboard and screen readers

## License

Copyright 2025 AINative Studio. All rights reserved.
Licensed under the Apache License, Version 2.0.
