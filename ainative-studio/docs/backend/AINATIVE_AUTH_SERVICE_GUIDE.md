# AINative Authentication Service Integration Guide

## Overview

The `AINativeAuthService` provides secure JWT-based authentication for the AINative Studio IDE. It manages user login, logout, token refresh, and session state using the AINative Cloud backend API.

## Architecture

### Service Location
- **Interface**: `src/vs/workbench/contrib/ainative/common/ainativeAuthService.ts`
- **Implementation**: `src/vs/workbench/contrib/ainative/common/ainativeAuthServiceImpl.ts`
- **Registration**: `src/vs/workbench/contrib/ainative/browser/ainative.contribution.ts`

### Dependencies
- `IEncryptionService` - Secure token storage and encryption
- `IStorageService` - Persist user data and authentication state
- `Emitter` - Event notifications for authentication state changes

## API Endpoints

### Base URL
```
https://api.ainative.studio/v1/auth
```

### Endpoints

#### 1. Login
```http
POST /login-json
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://..."
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `500 Server Error` - Backend error

#### 2. Logout
```http
POST /logout
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "success": true
}
```

#### 3. Refresh Token
```http
POST /refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized` - Refresh token expired
- `400 Bad Request` - Invalid refresh token

#### 4. Get Current User
```http
GET /me
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://..."
}
```

## Service Usage

### Dependency Injection

```typescript
import { IAINativeAuthService } from 'vs/workbench/contrib/ainative/common/ainativeAuthService';

class YourService {
  constructor(
    @IAINativeAuthService private readonly authService: IAINativeAuthService
  ) {
    // Service is automatically injected
  }
}
```

### Login

```typescript
try {
  const result = await this.authService.login('user@example.com', 'password123');

  if (result.success) {
    console.log('Logged in as:', result.user?.name);
    console.log('Token:', result.token);
  }
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Auth error:', error.code, error.message);
  }
}
```

### Logout

```typescript
await this.authService.logout();
// User is now logged out, tokens cleared
```

### Check Authentication Status

```typescript
if (this.authService.isAuthenticated()) {
  const user = await this.authService.getCurrentUser();
  console.log('Logged in as:', user?.name);
}
```

### Get Auth Token for API Requests

```typescript
const token = this.authService.getAuthToken();

if (token) {
  fetch('https://api.ainative.studio/v1/some-endpoint', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
```

### Listen to Authentication State Changes

```typescript
this.authService.onDidChangeAuthState(state => {
  if (state.isAuthenticated) {
    console.log('User logged in:', state.user?.name);
  } else {
    console.log('User logged out');
  }
});
```

## Security Features

### Token Storage
- Tokens are encrypted using `IEncryptionService.encrypt()`
- Stored in application scope with machine target
- Automatically cleared on logout

### Storage Keys
- `ainative.auth.jwt` - Encrypted JWT access token
- `ainative.auth.refreshToken` - Encrypted refresh token
- `ainative.auth.user` - User profile JSON

### Token Validation
- JWT tokens are decoded to check expiration
- Expired tokens trigger automatic refresh
- Invalid tokens trigger logout

### Automatic Token Refresh
- Service checks token expiration on initialization
- Automatically refreshes tokens before they expire
- Falls back to logout if refresh fails

## Error Handling

### Error Codes

```typescript
enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',  // Wrong email/password
  NETWORK_ERROR = 'NETWORK_ERROR',              // Network failure
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',              // Token expired
  UNAUTHORIZED = 'UNAUTHORIZED',                // Not authorized
  SERVER_ERROR = 'SERVER_ERROR',                // Backend error
  INVALID_TOKEN = 'INVALID_TOKEN',              // Malformed token
  REFRESH_FAILED = 'REFRESH_FAILED'             // Token refresh failed
}
```

### Example Error Handling

```typescript
try {
  await authService.login(email, password);
} catch (error) {
  if (error instanceof AuthenticationError) {
    switch (error.code) {
      case AuthErrorCode.INVALID_CREDENTIALS:
        showError('Invalid email or password');
        break;
      case AuthErrorCode.NETWORK_ERROR:
        showError('Network error. Please check your connection.');
        break;
      case AuthErrorCode.SERVER_ERROR:
        showError('Server error. Please try again later.');
        break;
    }
  }
}
```

## State Management

### Authentication States
- **Authenticated** - User logged in with valid token
- **Unauthenticated** - User not logged in
- **Logging In** - Login in progress
- **Refreshing** - Token refresh in progress

### State Transitions

```
[Unauthenticated] --login()--> [Authenticated]
[Authenticated] --logout()--> [Unauthenticated]
[Authenticated] --token expiry--> [Refreshing] --success--> [Authenticated]
[Authenticated] --token expiry--> [Refreshing] --failure--> [Unauthenticated]
```

## Testing

Tests are tracked in Issue #73. See `/Users/aideveloper/AINativeStudio-IDE/ainative-studio/src/vs/workbench/contrib/ainative/test/common/ainativeAuthService.test.ts`

### Required Test Coverage
- ≥10 tests minimum
- ≥90% code coverage (critical security path)
- All authentication flows tested
- Error scenarios covered
- Event emission verified

## Integration Examples

### React Component

```typescript
import { useAccessor } from '../util/services';

export const LoginComponent = () => {
  const accessor = useAccessor();
  const authService = accessor.get('IAINativeAuthService');

  const handleLogin = async (email: string, password: string) => {
    try {
      const result = await authService.login(email, password);
      if (result.success) {
        // Redirect to main view
      }
    } catch (error) {
      // Show error
    }
  };

  return (
    // UI implementation
  );
};
```

### Settings UI

```typescript
// Check auth status in settings
const isAuthenticated = authService.isAuthenticated();
const user = await authService.getCurrentUser();

if (user) {
  // Show user profile section
  renderUserProfile(user);
} else {
  // Show login button
  renderLoginButton();
}
```

## Troubleshooting

### Common Issues

#### 1. Token Not Persisting
**Problem**: User logged out after IDE restart

**Solution**: Check that storage service is using `StorageScope.APPLICATION` and `StorageTarget.MACHINE`

#### 2. Token Refresh Failing
**Problem**: Automatic token refresh not working

**Solution**: Verify refresh token is being stored correctly and hasn't expired

#### 3. Network Errors
**Problem**: Login fails with network error

**Solution**:
- Check internet connection
- Verify API endpoint is reachable
- Check firewall/proxy settings

#### 4. Encryption Errors
**Problem**: Failed to decrypt stored tokens

**Solution**:
- Clear stored tokens: Delete `ainative.auth.*` keys
- Re-login to generate new tokens

## Related Issues

- Issue #63 - AINativeAuthService implementation
- Issue #73 - Testing requirements
- Issue #62 - Settings UI integration

## References

- [AINative API Documentation](https://api.ainative.studio/docs-enhanced#/)
- [VS Code Service Pattern](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
