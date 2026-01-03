# ZeroDB Landing - Authentication UI Components

This project contains the authentication UI components for the ZeroDB landing page, built as part of Issue #49: Add ZeroDB Authentication.

## Overview

A React TypeScript application with authentication forms designed for integration with AINative Authentication APIs.

## Features

### Login Form
- Email/username input with validation
- Password input with show/hide toggle
- "Remember me" checkbox
- "Forgot password?" link
- Loading states during API calls
- Error and success message display
- OAuth placeholder buttons (Google, GitHub)

### Sign-Up Form
- Username input with format validation
- Email input with format validation
- Password input with strength indicator
- Password confirmation with match validation
- Real-time password strength feedback
- Terms of service agreement checkbox
- Loading states during API calls
- Error and success message display

### Shared Components
- `FormField`: Reusable form field with label and error display
- `PasswordInput`: Password field with show/hide toggle
- `ErrorMessage`: Consistent error message display
- `LoadingSpinner`: Loading indicator in multiple sizes
- `PasswordStrengthIndicator`: Visual password strength meter
- `AuthLayout`: Consistent layout for auth pages

## Technology Stack

- **React 18+** with TypeScript
- **Vite** for build tooling
- **React Hook Form** for form state management
- **Zod** for schema validation
- **Tailwind CSS** for styling

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

## Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   └── auth/
│       ├── LoginForm.tsx
│       ├── SignUpForm.tsx
│       ├── AuthLayout.tsx
│       ├── FormField.tsx
│       ├── PasswordInput.tsx
│       ├── ErrorMessage.tsx
│       ├── LoadingSpinner.tsx
│       ├── PasswordStrengthIndicator.tsx
│       └── index.ts
├── schemas/
│   └── authSchemas.ts
├── services/
│   └── authService.ts (mock - to be replaced)
├── types/
│   └── auth.ts
├── utils/
│   └── passwordStrength.ts
└── App.tsx
```

## Integration Points

### For Agent 2 (API Service)
Replace the mock `authService` in `src/services/authService.ts` with the real AINative Auth API integration:

```typescript
class AuthService {
  async login(email: string, password: string, rememberMe: boolean): Promise<AuthResponse>
  async signup(username: string, email: string, password: string): Promise<AuthResponse>
  async initiateOAuth(provider: string): Promise<void>
}
```

### For Agent 3 (Token Management)
Token storage happens automatically after successful login/signup. The auth service should handle token persistence.

### For Agent 4 (OAuth)
Update the OAuth button handlers in `LoginForm.tsx` and `SignUpForm.tsx`:
- Remove `disabled` prop from OAuth buttons
- Connect to `authService.initiateOAuth()` method

## Validation Rules

### Login
- Email: Valid email format required
- Password: Required field

### Sign-Up
- Username: 3-20 characters, alphanumeric with hyphens/underscores
- Email: Valid email format required
- Password:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- Confirm Password: Must match password
- Terms Agreement: Must be checked

## Accessibility

All components follow WCAG 2.1 AA standards:
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Error announcements with `aria-live`

## Testing Credentials (Mock Service)

For testing the current mock implementation:
- **Email**: test@example.com
- **Password**: Test123!

Any other email will also work for sign-up (except existing@example.com which simulates duplicate error).

## Next Steps

1. Agent 2 to implement real API integration
2. Agent 3 to add token management
3. Agent 4 to implement OAuth flows
4. Add routing with React Router
5. Add forgot password functionality
6. Add email verification flow
7. Integration testing with backend APIs

## License

MIT
