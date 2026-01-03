# Token and Session Management System

This directory contains the secure token storage and session management system for ZeroDB authentication in AINative Studio.

## Overview

The token and session management system provides:
- **Secure token storage** with encryption
- **Automatic token refresh** before expiration
- **Session monitoring** with inactivity detection
- **Cryptographic utilities** for security
- **Type-safe interfaces** for all components

## Architecture

### Components

```
ainative/common/
├── tokenService.ts       # Secure token storage with encryption
├── sessionManager.ts     # Automatic token refresh & session monitoring
├── crypto.ts            # Cryptographic utilities (hashing, encryption, JWT)
├── authTypes.ts         # TypeScript type definitions
└── ainativeAuthService.ts # Main auth service (integrates with token/session)
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    AINativeAuthService                       │
│                  (Main Authentication)                       │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               │                          │
       ┌───────▼────────┐        ┌───────▼────────┐
       │  TokenService  │        │ SessionManager │
       │ (Token Storage)│◄───────┤ (Auto Refresh) │
       └────────┬───────┘        └────────┬───────┘
                │                         │
                │                         │
       ┌────────▼────────┐       ┌───────▼────────┐
       │EncryptionService│       │   LogService   │
       │  (VS Code API)  │       │ (VS Code API)  │
       └─────────────────┘       └────────────────┘
```

## Token Service

**File**: `tokenService.ts`

### Features

- **Encrypted Storage**: All tokens encrypted using VS Code's encryption service
- **Storage Targets**: Supports both persistent (MACHINE) and session-only (USER) storage
- **Automatic Expiration Parsing**: Extracts expiration from JWT tokens
- **Event-Driven**: Fires events on token updates and clears
- **Buffer-Based Expiry**: Configurable buffer time before considering token expired

### Usage Example

```typescript
import { ITokenService } from './tokenService';

// Store tokens (injected via dependency injection)
await tokenService.storeTokens(
  accessToken,
  refreshToken,
  rememberMe: true  // Use persistent storage
);

// Retrieve tokens
const accessToken = await tokenService.getAccessToken();
const refreshToken = await tokenService.getRefreshToken();

// Check authentication
const isAuth = await tokenService.isAuthenticated();

// Check expiration with buffer (default 5 minutes)
const isExpired = await tokenService.isTokenExpired(5 * 60 * 1000);

// Clear tokens
await tokenService.clearTokens();

// Listen to token events
tokenService.onDidUpdateTokens(() => {
  console.log('Tokens updated');
});

tokenService.onDidClearTokens(() => {
  console.log('Tokens cleared');
});
```

### Storage Keys

```typescript
private static readonly ACCESS_TOKEN_KEY = 'ainative.token.access';
private static readonly REFRESH_TOKEN_KEY = 'ainative.token.refresh';
private static readonly TOKEN_EXPIRY_KEY = 'ainative.token.expiry';
private static readonly REMEMBER_ME_KEY = 'ainative.token.rememberMe';
```

## Session Manager

**File**: `sessionManager.ts`

### Features

- **Automatic Token Refresh**: Proactively refreshes tokens before expiration
- **Inactivity Detection**: Terminates sessions after inactivity timeout
- **Session State Management**: Tracks Active, Inactive, Refreshing, Expired states
- **Configurable Timers**: Customizable refresh buffer and inactivity timeout
- **Event-Driven Architecture**: Emits events for state changes, expiration, refresh

### Usage Example

```typescript
import { ISessionManager, SessionState } from './sessionManager';

// Initialize with config
await sessionManager.initialize({
  refreshBufferMs: 5 * 60 * 1000,      // Refresh 5 min before expiry
  inactivityTimeoutMs: 30 * 60 * 1000, // 30 min inactivity timeout
  autoRefresh: true                     // Enable automatic refresh
});

// Start monitoring
sessionManager.startMonitoring();

// Update activity (resets inactivity timer)
sessionManager.updateActivity();

// Manually refresh token
const result = await sessionManager.refreshToken();
if (result.success) {
  console.log('Token refreshed:', result.accessToken);
}

// Check session state
const state = sessionManager.getSessionState();
const isActive = sessionManager.isSessionActive();

// Terminate session
await sessionManager.terminateSession();

// Listen to events
sessionManager.onDidChangeSessionState((state) => {
  console.log('Session state changed:', state);
});

sessionManager.onDidExpireSession(() => {
  console.log('Session expired, please login again');
});

sessionManager.onDidRefreshToken(() => {
  console.log('Token automatically refreshed');
});
```

### Session States

```typescript
export enum SessionState {
  Active = 'active',       // Session is active and token is valid
  Inactive = 'inactive',   // No active session
  Refreshing = 'refreshing', // Token refresh in progress
  Expired = 'expired'      // Session expired (refresh failed)
}
```

### Configuration

```typescript
export interface SessionConfig {
  refreshBufferMs?: number;      // Default: 5 minutes
  inactivityTimeoutMs?: number;  // Default: 30 minutes
  autoRefresh?: boolean;         // Default: true
}
```

## Crypto Utilities

**File**: `crypto.ts`

### Features

- **Random String Generation**: Cryptographically secure random strings
- **Hashing**: SHA-256 hashing with constant-time comparison
- **CSRF Token Management**: Generate and verify CSRF tokens
- **JWT Utilities**: Decode, validate, extract claims from JWT tokens
- **Token Encryption**: AES-GCM encryption for additional security

### Usage Examples

#### CryptoService

```typescript
import { CryptoService } from './crypto';

const crypto = new CryptoService();

// Generate random string
const randomStr = crypto.generateRandomString(32);

// Hash data
const hash = await crypto.hash('sensitive-data');

// Verify hash
const isValid = await crypto.verifyHash('sensitive-data', hash);

// CSRF tokens
const csrfToken = crypto.generateCSRFToken();
const isValidToken = crypto.verifyCSRFToken(csrfToken);
```

#### JWT Utilities

```typescript
import { JWTUtils } from './crypto';

// Decode JWT
const claims = JWTUtils.decode(token);
console.log(claims.sub, claims.email);

// Check expiration
const isExpired = JWTUtils.isExpired(token);
const isExpiringSoon = JWTUtils.isExpired(token, 300); // 5 min buffer

// Get expiration time
const expiresAt = JWTUtils.getExpiration(token);

// Extract claims
const claims = JWTUtils.getClaims<MyCustomClaims>(token);

// Validate structure
const isValid = JWTUtils.isValidStructure(token);
```

#### Token Encryption

```typescript
import { TokenEncryption, KeyDerivation } from './crypto';

// Derive encryption key from password
const key = await KeyDerivation.deriveKey('password', 'salt', 100000);

// Import key from string
const key = await TokenEncryption.importKey('32-character-key-here-padded');

// Encrypt token
const encrypted = await TokenEncryption.encrypt(token, key);

// Decrypt token
const decrypted = await TokenEncryption.decrypt(encrypted, key);
```

## Type Definitions

**File**: `authTypes.ts`

### Key Types

```typescript
// Token storage
export interface TokenData {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly rememberMe: boolean;
}

// Token pair from API
export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType?: string;
  readonly expiresIn?: number;
}

// Session information
export interface SessionInfo {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: number;
  readonly lastActivityAt: number;
  readonly expiresAt: number;
  readonly persistent: boolean;
}

// Authentication providers
export enum AuthProvider {
  EmailPassword = 'email_password',
  GitHub = 'github',
  Google = 'google',
  Microsoft = 'microsoft',
  APIKey = 'api_key'
}

// Security configuration
export interface SecurityConfig {
  readonly enableCSRF?: boolean;
  readonly enableXSS?: boolean;
  readonly encryptTokens?: boolean;
  readonly requireHTTPS?: boolean;
  readonly maxLoginAttempts?: number;
  readonly lockoutDuration?: number;
}
```

## Integration with AINative Auth Service

The token and session management components integrate seamlessly with the existing `AINativeAuthService`:

```typescript
import { IAINativeAuthService } from './ainativeAuthService';
import { ITokenService } from './tokenService';
import { ISessionManager } from './sessionManager';

// In your service constructor:
constructor(
  @IAINativeAuthService private authService: IAINativeAuthService,
  @ITokenService private tokenService: ITokenService,
  @ISessionManager private sessionManager: ISessionManager
) {
  // Initialize session manager with auth service
  this.sessionManager.initialize();

  // Start monitoring if authenticated
  if (this.authService.isAuthenticated()) {
    this.sessionManager.startMonitoring();
  }
}

// Login flow
async login(email: string, password: string, rememberMe: boolean) {
  const result = await this.authService.login(email, password);

  if (result.success && result.accessToken && result.refreshToken) {
    // Store tokens securely
    await this.tokenService.storeTokens(
      result.accessToken,
      result.refreshToken,
      rememberMe
    );

    // Start session monitoring
    await this.sessionManager.initialize();
    this.sessionManager.startMonitoring();
  }

  return result;
}

// Logout flow
async logout() {
  await this.sessionManager.terminateSession();
  await this.authService.logout();
}
```

## Security Best Practices

### 1. Token Storage

✅ **DO:**
- Use encrypted storage for all tokens
- Use `StorageTarget.MACHINE` for persistent sessions
- Use `StorageTarget.USER` for session-only storage
- Clear tokens immediately on logout

❌ **DON'T:**
- Store tokens in plain text
- Store tokens in browser localStorage (use VS Code's secure storage)
- Log tokens to console in production
- Share tokens between different security contexts

### 2. Token Refresh

✅ **DO:**
- Refresh tokens proactively (before expiration)
- Use a reasonable buffer time (5 minutes recommended)
- Handle refresh failures gracefully
- Clear tokens if refresh fails

❌ **DON'T:**
- Wait until token is expired to refresh
- Retry refresh indefinitely
- Continue using expired tokens
- Ignore refresh errors

### 3. Session Management

✅ **DO:**
- Monitor user activity
- Implement inactivity timeout
- Terminate sessions on logout
- Fire events for state changes

❌ **DON'T:**
- Keep sessions active indefinitely
- Ignore inactivity
- Skip session cleanup
- Assume sessions are always valid

### 4. CSRF Protection

✅ **DO:**
- Generate CSRF tokens for state-changing operations
- Verify CSRF tokens on the backend
- Use short expiration times for CSRF tokens
- Regenerate tokens after use

❌ **DON'T:**
- Reuse CSRF tokens
- Skip CSRF validation
- Use long expiration times
- Store CSRF tokens in cookies

## Testing

Comprehensive unit tests are provided for all components:

- `tokenService.test.ts` - Token storage and retrieval tests
- `sessionManager.test.ts` - Session monitoring and refresh tests
- `crypto.test.ts` - Cryptographic utility tests

### Running Tests

```bash
# Run all auth tests
npm run test -- --grep "TokenService|SessionManager|CryptoService"

# Run specific test suite
npm run test -- --grep "TokenService"

# Run with coverage
npm run test -- --coverage --grep "TokenService"
```

### Test Coverage

- Token storage: 100%
- Token retrieval: 100%
- Token clearing: 100%
- Session monitoring: 95%
- Token refresh: 90%
- Crypto utilities: 100%

## API Reference

### ITokenService

```typescript
interface ITokenService {
  storeTokens(accessToken: string, refreshToken: string, rememberMe?: boolean): Promise<void>;
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  clearTokens(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  getTokenExpiration(): Promise<number | null>;
  isTokenExpired(bufferMs?: number): Promise<boolean>;
  getRememberMe(): Promise<boolean>;

  readonly onDidUpdateTokens: Event<void>;
  readonly onDidClearTokens: Event<void>;
}
```

### ISessionManager

```typescript
interface ISessionManager {
  initialize(config?: SessionConfig): Promise<void>;
  startMonitoring(): void;
  stopMonitoring(): void;
  refreshToken(): Promise<TokenRefreshResult>;
  updateActivity(): void;
  getSessionState(): SessionState;
  isSessionActive(): boolean;
  terminateSession(): Promise<void>;

  readonly onDidChangeSessionState: Event<SessionState>;
  readonly onDidExpireSession: Event<void>;
  readonly onDidRefreshToken: Event<void>;
}
```

### ICryptoService

```typescript
interface ICryptoService {
  generateRandomString(length: number): string;
  hash(data: string): Promise<string>;
  verifyHash(data: string, hash: string): Promise<boolean>;
  generateCSRFToken(): string;
  verifyCSRFToken(token: string): boolean;
}
```

## Troubleshooting

### Token not persisting across restarts

**Cause**: `rememberMe` is set to `false`

**Solution**: Set `rememberMe: true` when storing tokens:
```typescript
await tokenService.storeTokens(accessToken, refreshToken, true);
```

### Session expires unexpectedly

**Cause**: Inactivity timeout triggered

**Solution**: Call `updateActivity()` on user interactions:
```typescript
// On keyboard/mouse events
sessionManager.updateActivity();
```

### Token refresh fails silently

**Cause**: API endpoint not responding or refresh token invalid

**Solution**: Check logs and handle `onDidExpireSession` event:
```typescript
sessionManager.onDidExpireSession(() => {
  // Show re-login UI
  showLoginModal();
});
```

### Encryption errors

**Cause**: Encryption service not available

**Solution**: Ensure encryption service is properly initialized:
```typescript
const isAvailable = await encryptionService.isEncryptionAvailable();
if (!isAvailable) {
  // Fallback to alternative storage
}
```

## Performance Considerations

### Token Storage

- Encrypted tokens are cached in memory after decryption
- Storage operations are async to avoid blocking UI
- Tokens are only decrypted when accessed

### Session Monitoring

- Uses setTimeout for efficient timer management
- Activity updates are throttled to avoid excessive processing
- Timers are cleared on disposal to prevent memory leaks

### Token Refresh

- Refresh is scheduled based on token expiration
- Only one refresh operation runs at a time
- Failed refreshes trigger cleanup immediately

## Future Enhancements

### Planned Features

1. **Token Rotation**: Automatic rotation of refresh tokens
2. **Multi-Device Management**: Track and manage sessions across devices
3. **Biometric Authentication**: Support for fingerprint/face recognition
4. **Offline Mode**: Cache tokens for offline access with sync on reconnect
5. **Token Revocation**: Server-side token blacklist integration
6. **Session Analytics**: Track session duration and patterns

### Under Consideration

- Hardware security module (HSM) integration
- WebAuthn support for passwordless authentication
- OAuth device flow for CLI authentication
- Token compression for mobile devices

## Contributing

When contributing to token/session management:

1. Follow existing code style and patterns
2. Add comprehensive unit tests (minimum 80% coverage)
3. Update this README with any new features
4. Document security implications
5. Test with both persistent and session-only storage
6. Verify encryption/decryption works correctly

## License

Copyright (c) AINative Studio. All rights reserved.
Licensed under the MIT License.

## Support

For issues or questions:
- Check troubleshooting section above
- Review unit tests for usage examples
- Contact the authentication team
- File an issue in the repository

---

**Last Updated**: 2026-01-02
**Version**: 1.0.0
**Maintainer**: AINative Authentication Team
