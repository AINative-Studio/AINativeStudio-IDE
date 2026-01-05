# AINative Cloud Authentication Service

## Overview

This document describes the implementation of the AINative Cloud Authentication backend service, which provides comprehensive authentication capabilities for the AINative Studio IDE using the AINative API at `https://api.ainative.studio`.

## Implementation Files

### Core Service Files

1. **ainativeCloudAuthTypes.ts** - Type definitions and interfaces
   - Location: `src/vs/workbench/contrib/ainative/common/ainativeCloudAuthTypes.ts`
   - Defines all types, interfaces, enums, and error classes
   - Exports `IAINativeCloudAuthService` decorator for dependency injection

2. **ainativeSDKClient.ts** - API client wrapper
   - Location: `src/vs/workbench/contrib/ainative/common/ainativeSDKClient.ts`
   - Handles HTTP requests with retry logic, error handling, and rate limiting
   - Implements exponential backoff for failed requests
   - Maps API responses to appropriate error codes

3. **ainativeCloudAuthService.ts** - Main authentication service
   - Location: `src/vs/workbench/contrib/ainative/common/ainativeCloudAuthService.ts`
   - Implements `IAINativeCloudAuthService` interface
   - Handles secure token storage using VS Code's encryption service
   - Manages authentication state and user sessions
   - Registered as singleton with `InstantiationType.Eager`

### Test Files

1. **ainativeCloudAuthService.test.ts** - Service unit tests
   - Location: `src/vs/workbench/contrib/ainative/test/common/ainativeCloudAuthService.test.ts`
   - Tests all authentication flows, token management, and error handling
   - Includes mock services for encryption and storage
   - Verifies no conflicts with ZeroDB authentication

2. **ainativeSDKClient.test.ts** - SDK client unit tests
   - Location: `src/vs/workbench/contrib/ainative/test/common/ainativeSDKClient.test.ts`
   - Tests retry logic, error handling, and configuration
   - Verifies correct endpoint paths and headers
   - Tests rate limiting and timeout handling

## Features Implemented

### Authentication Methods

1. **User Registration**
   - `register(request: RegistrationRequest): Promise<RegistrationResult>`
   - Validates email format and password strength (min 8 characters)
   - Prevents concurrent operations
   - Returns tokens and user data on success

2. **User Login**
   - `login(email: string, password: string): Promise<CloudAuthResult>`
   - Authenticates with email/password
   - Returns JWT access and refresh tokens
   - Stores encrypted tokens in secure storage

3. **User Logout**
   - `logout(): Promise<void>`
   - Blacklists token on server
   - Clears all local authentication data
   - Updates authentication state

4. **Password Management**
   - `requestPasswordReset(email: string): Promise<PasswordResetResult>`
   - `confirmPasswordReset(token: string, newPassword: string): Promise<PasswordResetResult>`
   - `changePassword(currentPassword: string, newPassword: string): Promise<PasswordResetResult>`
   - All password operations validate minimum length (8 characters)

5. **Token Management**
   - `refreshToken(): Promise<string>` - Refresh expired access token
   - `validateToken(token: string): Promise<TokenValidationResult>` - Validate JWT token
   - `getAccessToken(): Promise<string | null>` - Get token with auto-refresh
   - Automatic token refresh when expired (5-minute buffer)

6. **User Information**
   - `getCurrentUser(): Promise<CloudUser | null>` - Fetch current user from API
   - `getUser(): CloudUser | null` - Get cached user data
   - `isAuthenticated(): boolean` - Check authentication status

7. **Email Verification**
   - `resendEmailVerification(email: string): Promise<PasswordResetResult>`
   - `verifyEmail(token: string): Promise<PasswordResetResult>`

### Security Features

1. **Token Encryption**
   - All tokens encrypted at rest using VS Code's `IEncryptionService`
   - Separate storage keys from ZeroDB auth to prevent conflicts
   - Keys: `ainative.cloud.auth.*` (vs `ainative.auth.*` for ZeroDB)

2. **Error Handling**
   - Comprehensive error codes for all failure scenarios
   - Network error retry with exponential backoff
   - Rate limiting detection and handling
   - Detailed error messages for debugging

3. **JWT Token Handling**
   - Automatic token expiration detection
   - Token refresh with 5-minute buffer before expiration
   - JWT decoding to extract claims
   - Token validation endpoint integration

4. **State Management**
   - Authentication state tracking (`Authenticated`, `Unauthenticated`, `Refreshing`, etc.)
   - Event emitters for state changes and user updates
   - Prevents concurrent authentication operations

## API Integration

### Endpoints Used

All endpoints are prefixed with `https://api.ainative.studio/v1/auth/`:

- `POST /register` - User registration
- `POST /login-json` - User login
- `POST /logout` - User logout
- `POST /refresh` - Token refresh
- `GET /me` - Get current user
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Confirm password reset
- `POST /change-password` - Change password
- `POST /verify-token` - Verify JWT token
- `POST /resend-verification` - Resend email verification
- `POST /verify-email` - Verify email with token

### Request/Response Handling

- All requests use JSON content type
- Bearer token authentication for protected endpoints
- Handles validation errors (422 status code)
- Maps HTTP status codes to error codes:
  - 401 → `InvalidCredentials`
  - 409 → `EmailAlreadyExists`
  - 429 → `RateLimitExceeded`
  - 5xx → `NetworkError` (with retry)

## Storage Architecture

### Storage Keys

To avoid conflicts with existing ZeroDB authentication, cloud auth uses distinct storage keys:

- **Access Token**: `ainative.cloud.auth.accessToken` (encrypted)
- **Refresh Token**: `ainative.cloud.auth.refreshToken` (encrypted)
- **User Data**: `ainative.cloud.auth.user` (plain JSON)

Compare to ZeroDB auth keys:
- `ainative.auth.jwt`
- `ainative.auth.refreshToken`
- `ainative.auth.user`

### Storage Scope

All data stored with:
- `StorageScope.APPLICATION` - Available across all workspaces
- `StorageTarget.MACHINE` - Persists on the machine

## Service Registration

The service is registered with VS Code's dependency injection system:

```typescript
registerSingleton(IAINativeCloudAuthService, AINativeCloudAuthService, InstantiationType.Eager);
```

This allows other services to inject it via constructor:

```typescript
constructor(
  @IAINativeCloudAuthService private readonly cloudAuthService: IAINativeCloudAuthService
) {}
```

## Error Codes

### CloudAuthErrorCode Enum

- `InvalidCredentials` - Invalid email/password
- `NetworkError` - Network request failed
- `TokenExpired` - JWT token has expired
- `TokenRefreshFailed` - Failed to refresh token
- `LogoutFailed` - Logout operation failed
- `RegistrationFailed` - User registration failed
- `PasswordResetFailed` - Password reset failed
- `EmailAlreadyExists` - Email already registered
- `WeakPassword` - Password doesn't meet requirements
- `RateLimitExceeded` - Too many requests
- `UnknownError` - Unexpected error

## Authentication States

### CloudAuthState Enum

- `Authenticated` - User is authenticated
- `Unauthenticated` - User is not authenticated
- `Refreshing` - Token refresh in progress
- `Registering` - Registration in progress
- `LoggingOut` - Logout in progress
- `ResettingPassword` - Password reset in progress

## Testing

### Test Coverage

The implementation includes comprehensive unit tests covering:

1. **Initial State**
   - Service starts unauthenticated
   - Storage keys are cloud-specific
   - No conflicts with ZeroDB auth

2. **Registration**
   - Password validation (min 8 characters)
   - Email format validation
   - Concurrent operation prevention

3. **Login**
   - Concurrent operation prevention
   - Token storage
   - State management

4. **Password Reset**
   - Password strength validation
   - Authentication requirement for password change
   - Token-based reset flow

5. **Token Management**
   - JWT decoding
   - Expiration detection
   - Invalid token handling

6. **Logout**
   - Data clearing
   - Storage cleanup
   - State updates

7. **Email Validation**
   - Valid email formats
   - Invalid email rejection

8. **State Management**
   - Event emission
   - State transitions

9. **Error Handling**
   - CloudAuthError properties
   - Error code mapping

10. **SDK Client**
    - Configuration
    - Retry logic with exponential backoff
    - Error handling
    - Rate limiting
    - Timeout handling
    - Endpoint paths
    - Request headers
    - Response handling

### Running Tests

```bash
cd ainative-studio
npm run test-node
```

Tests are located in:
- `src/vs/workbench/contrib/ainative/test/common/ainativeCloudAuthService.test.ts`
- `src/vs/workbench/contrib/ainative/test/common/ainativeSDKClient.test.ts`

## Integration with Existing Systems

### No Conflicts with ZeroDB Auth

The cloud authentication service is designed to coexist with the existing ZeroDB authentication:

1. **Different Service Interfaces**
   - Cloud: `IAINativeCloudAuthService`
   - ZeroDB: `IAINativeAuthService`

2. **Different Storage Keys**
   - Cloud: `ainative.cloud.auth.*`
   - ZeroDB: `ainative.auth.*`

3. **Different Decorators**
   - Cloud: `createDecorator<IAINativeCloudAuthService>('ainativeCloudAuthService')`
   - ZeroDB: `createDecorator<IAINativeAuthService>('ainativeAuthService')`

Both services can be used simultaneously without interference.

## Usage Example

```typescript
import { IAINativeCloudAuthService } from './ainativeCloudAuthService.js';

class MyService {
  constructor(
    @IAINativeCloudAuthService private readonly cloudAuth: IAINativeCloudAuthService
  ) {
    // Listen for auth state changes
    this.cloudAuth.onDidChangeAuthState((state) => {
      console.log('Auth state changed:', state);
    });
  }

  async login(email: string, password: string): Promise<void> {
    const result = await this.cloudAuth.login(email, password);

    if (result.success) {
      console.log('Logged in as:', result.user?.email);
    } else {
      console.error('Login failed:', result.error?.message);
    }
  }

  async register(username: string, email: string, password: string): Promise<void> {
    const result = await this.cloudAuth.register({
      username,
      email,
      password
    });

    if (result.success) {
      console.log('Registered successfully:', result.user?.email);
      if (result.requiresEmailVerification) {
        console.log('Please verify your email');
      }
    } else {
      console.error('Registration failed:', result.error?.message);
    }
  }

  async logout(): Promise<void> {
    await this.cloudAuth.logout();
    console.log('Logged out successfully');
  }

  async getToken(): Promise<string | null> {
    // Automatically refreshes if expired
    return await this.cloudAuth.getAccessToken();
  }
}
```

## Configuration

### SDK Client Configuration

The SDK client can be configured with custom settings:

```typescript
const client = new AINativeSDKClient({
  baseUrl: 'https://api.ainative.studio',
  timeout: 30000, // 30 seconds
  retryConfig: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  }
});
```

### Retry Configuration

- **maxRetries**: Maximum number of retry attempts (default: 3)
- **initialDelayMs**: Initial retry delay in milliseconds (default: 1000)
- **maxDelayMs**: Maximum retry delay in milliseconds (default: 10000)
- **backoffMultiplier**: Exponential backoff multiplier (default: 2)

## Security Considerations

1. **Token Storage**
   - All tokens encrypted using VS Code's encryption service
   - Stored with machine-level persistence
   - Automatically cleared on logout

2. **Password Requirements**
   - Minimum 8 characters
   - Validated on both client and server

3. **Network Security**
   - All requests use HTTPS
   - Bearer token authentication
   - Rate limiting protection

4. **Session Management**
   - Automatic token refresh before expiration
   - 5-minute buffer for token refresh
   - Secure session invalidation on logout

## Future Enhancements

Potential improvements for future iterations:

1. **OAuth Integration**
   - Support for GitHub OAuth (already available separately)
   - Additional OAuth providers (Google, Microsoft)

2. **Multi-Factor Authentication**
   - TOTP support
   - SMS verification
   - Backup codes

3. **Session Management**
   - Multiple active sessions
   - Session revocation
   - Device management

4. **Advanced Security**
   - Passwordless authentication
   - Biometric support
   - Hardware security keys

5. **Metrics and Monitoring**
   - Authentication success/failure rates
   - Token refresh statistics
   - Error tracking

## Troubleshooting

### Common Issues

1. **Token Refresh Failures**
   - Check network connectivity
   - Verify refresh token hasn't been blacklisted
   - Check token expiration

2. **Storage Issues**
   - Verify encryption service is available
   - Check storage permissions
   - Clear storage and re-authenticate if corrupted

3. **Rate Limiting**
   - Implement exponential backoff (already handled by SDK)
   - Respect `Retry-After` headers
   - Reduce request frequency

4. **Email Verification**
   - Check spam folder for verification emails
   - Use `resendEmailVerification()` if needed
   - Verify email address is correct

## Support

For issues or questions:
- File an issue on the GitHub repository
- Contact AINative Studio support
- Check API documentation at https://api.ainative.studio/docs-enhanced
