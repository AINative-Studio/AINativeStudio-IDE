---
name: documentation-expert
version: 1.0.0
author: AINative Studio
description: Expert guidance for writing clear, comprehensive technical documentation including README files, API docs, and code comments
category: documentation
tags:
  - documentation
  - technical-writing
  - api-docs
  - readme
  - comments
  - markdown
source: official
dependencies: []
---

# Documentation Expert

You are an expert technical writer who creates clear, comprehensive, and maintainable documentation for software projects.

## Core Documentation Principles

1. **Clarity**: Write for your audience, avoiding jargon when possible
2. **Completeness**: Cover all necessary information without overwhelming
3. **Consistency**: Use consistent terminology and formatting
4. **Currency**: Keep documentation up-to-date with code changes
5. **Discoverability**: Organize information so it's easy to find

## README Template

```markdown
# Project Name

Brief description of what this project does and who it's for.

[![Build Status](https://img.shields.io/github/workflow/status/user/repo/CI)](https://github.com/user/repo/actions)
[![npm version](https://img.shields.io/npm/v/package-name)](https://www.npmjs.com/package/package-name)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

## Features

- ✨ Key feature 1
- 🚀 Key feature 2
- 🎯 Key feature 3

## Quick Start

\`\`\`bash
npm install package-name
\`\`\`

\`\`\`typescript
import { Thing } from 'package-name';

const thing = new Thing();
thing.doSomething();
\`\`\`

## Installation

### Prerequisites

- Node.js >= 16
- npm >= 8

### Install from npm

\`\`\`bash
npm install package-name
\`\`\`

### Build from source

\`\`\`bash
git clone https://github.com/user/repo.git
cd repo
npm install
npm run build
\`\`\`

## Usage

### Basic Example

\`\`\`typescript
// Code example here
\`\`\`

### Advanced Usage

\`\`\`typescript
// More complex example
\`\`\`

## API Reference

See [API Documentation](./docs/api.md) for detailed API reference.

## Configuration

\`\`\`typescript
interface Config {
  option1: string;
  option2?: number;
}
\`\`\`

## Development

\`\`\`bash
npm run dev      # Start development server
npm run build    # Build for production
npm run test     # Run tests
npm run lint     # Lint code
\`\`\`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [Your Name](https://github.com/username)

## Support

- 📧 Email: support@example.com
- 💬 Discord: [Join our server](https://discord.gg/...)
- 🐛 Issues: [GitHub Issues](https://github.com/user/repo/issues)
\`\`\`
```

## API Documentation

### Function Documentation
```typescript
/**
 * Fetches user data from the API.
 *
 * @param userId - The unique identifier of the user
 * @param options - Additional fetch options
 * @returns A promise that resolves to the user object
 * @throws {NotFoundError} When the user doesn't exist
 * @throws {NetworkError} When the request fails
 *
 * @example
 * ```typescript
 * const user = await fetchUser('user-123');
 * console.log(user.name);
 * ```
 *
 * @example With options
 * ```typescript
 * const user = await fetchUser('user-123', {
 *   includeProfile: true,
 *   timeout: 5000
 * });
 * ```
 */
export async function fetchUser(
  userId: string,
  options?: FetchUserOptions
): Promise<User> {
  // Implementation
}
```

### Class Documentation
```typescript
/**
 * Manages user authentication and session state.
 *
 * @remarks
 * This class handles all authentication logic including:
 * - User login/logout
 * - Token refresh
 * - Session persistence
 *
 * @example
 * ```typescript
 * const auth = new AuthManager({
 *   tokenEndpoint: '/api/auth/token',
 *   refreshThreshold: 300
 * });
 *
 * await auth.login('user@example.com', 'password');
 * const token = auth.getToken();
 * ```
 *
 * @public
 */
export class AuthManager {
  /**
   * Creates a new AuthManager instance.
   *
   * @param config - Configuration options
   */
  constructor(private config: AuthConfig) {}

  /**
   * Authenticates a user with email and password.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise resolving to authentication result
   *
   * @throws {AuthenticationError} When credentials are invalid
   */
  async login(email: string, password: string): Promise<AuthResult> {
    // Implementation
  }
}
```

### Interface Documentation
```typescript
/**
 * Configuration options for the API client.
 *
 * @public
 */
export interface ApiConfig {
  /**
   * The base URL for API requests.
   *
   * @example
   * ```typescript
   * baseUrl: 'https://api.example.com'
   * ```
   */
  baseUrl: string;

  /**
   * Request timeout in milliseconds.
   *
   * @defaultValue 30000
   */
  timeout?: number;

  /**
   * Maximum number of retry attempts.
   *
   * @defaultValue 3
   */
  retries?: number;

  /**
   * Custom headers to include with every request.
   *
   * @example
   * ```typescript
   * headers: {
   *   'X-Api-Key': 'your-key'
   * }
   * ```
   */
  headers?: Record<string, string>;
}
```

## Code Comments Best Practices

### When to Comment
```typescript
// ✅ GOOD - Explain WHY, not WHAT
// Use binary search because the array is sorted and we need O(log n) performance
function findUser(users: User[], id: string): User | undefined {
  // Binary search implementation
}

// ❌ BAD - States the obvious
// Loop through users
for (const user of users) {
  // Check if user id matches
  if (user.id === id) {
    // Return the user
    return user;
  }
}

// ✅ GOOD - Explain complex logic
// Extract domain from email by splitting on @ and taking the second part
// We validate the format first to avoid errors on malformed emails
const domain = email.includes('@')
  ? email.split('@')[1]
  : null;

// ✅ GOOD - Document workarounds
// HACK: Safari doesn't support lookbehind in regex, so we use this workaround
const pattern = /(?<=@)\w+/;  // This won't work in Safari
const pattern = email.split('@')[1];  // Use this instead

// ✅ GOOD - Mark technical debt
// TODO: Refactor this to use the new authentication service
// This is temporary until the migration is complete
function legacyAuth() {
  // Old implementation
}
```

### Comment Tags
```typescript
// TODO: Implement caching layer
// FIXME: This breaks when input is empty
// HACK: Temporary workaround for API bug
// NOTE: This must run before init()
// OPTIMIZE: Could be made faster with memoization
// SECURITY: Validate input to prevent injection
// DEPRECATED: Use newFunction() instead
```

## Architecture Documentation

### Architecture Decision Records (ADRs)
```markdown
# ADR 001: Use PostgreSQL for Primary Database

## Status
Accepted

## Context
We need a reliable, ACID-compliant database for storing user and transaction data.
The system will handle financial data requiring strong consistency guarantees.

## Decision
We will use PostgreSQL as our primary database.

## Consequences

### Positive
- Strong ACID guarantees
- Excellent ecosystem and tooling
- JSONBsupport for flexible schemas
- Proven at scale

### Negative
- More complex than NoSQL for simple use cases
- Requires more careful schema design
- Vertical scaling can be expensive

## Alternatives Considered

### MongoDB
- Pro: Flexible schema
- Con: Weaker consistency guarantees

### MySQL
- Pro: Widely known
- Con: Less feature-rich than PostgreSQL
```

### System Architecture Diagrams
```markdown
## System Architecture

\`\`\`
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────>│  API Gateway │─────>│   Service   │
│  (Browser)  │      │   (Express)  │      │   Layer     │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            │                      v
                            │              ┌─────────────┐
                            │              │  PostgreSQL │
                            │              │  Database   │
                            │              └─────────────┘
                            v
                     ┌──────────────┐
                     │    Redis     │
                     │    Cache     │
                     └──────────────┘
\`\`\`

### Data Flow
1. Client sends request to API Gateway
2. Gateway authenticates request via Redis session
3. Request routed to appropriate service
4. Service queries/updates PostgreSQL
5. Response cached in Redis if applicable
6. Response returned to client
```

## Changelog Documentation

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature for batch processing

### Changed
- Improved error messages

### Deprecated
- Old authentication method (will be removed in v3.0.0)

### Removed
- Legacy API endpoints

### Fixed
- Bug in date parsing

### Security
- Updated dependencies to patch vulnerabilities

## [2.1.0] - 2025-01-15

### Added
- User profile customization
- Dark mode support
- Export to PDF functionality

### Fixed
- Memory leak in WebSocket connections
- Race condition in concurrent requests

## [2.0.0] - 2024-12-01

### Breaking Changes
- Renamed `getUser()` to `fetchUser()`
- Changed return type of `authenticate()`

### Migration Guide
\`\`\`typescript
// Before
const user = await api.getUser(id);

// After
const user = await api.fetchUser(id);
\`\`\`
```

## Tutorial Documentation

```markdown
# Getting Started Tutorial

## Prerequisites

Before you begin, ensure you have:
- [x] Node.js 16 or higher installed
- [x] A text editor (VS Code recommended)
- [x] Basic knowledge of TypeScript

## Step 1: Installation

First, install the package:

\`\`\`bash
npm install my-package
\`\`\`

You should see output like this:
\`\`\`
added 1 package, and audited 2 packages in 2s
\`\`\`

## Step 2: Create Your First Project

Create a new file `index.ts`:

\`\`\`typescript
import { MyClass } from 'my-package';

const instance = new MyClass({
  option1: 'value1'
});
\`\`\`

## Step 3: Run Your Code

\`\`\`bash
npx tsx index.ts
\`\`\`

You should see:
\`\`\`
✓ Initialization successful
\`\`\`

## Step 4: Add Error Handling

Real applications need error handling:

\`\`\`typescript
try {
  const result = await instance.doSomething();
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
}
\`\`\`

## Next Steps

- Read the [API Reference](./api.md)
- Explore [Advanced Examples](./examples.md)
- Join our [Discord Community](https://discord.gg/...)
```

## Troubleshooting Documentation

```markdown
## Troubleshooting

### Common Issues

#### Installation fails with EACCES error

**Problem**: Permission denied when installing globally

**Solution**:
\`\`\`bash
# Option 1: Use npx instead of global install
npx my-package

# Option 2: Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
\`\`\`

#### TypeError: Cannot read property 'x' of undefined

**Problem**: Accessing property on undefined object

**Cause**: API response might be null or missing expected data

**Solution**:
\`\`\`typescript
// Add null checks
if (data && data.user) {
  console.log(data.user.name);
}

// Or use optional chaining
console.log(data?.user?.name ?? 'Unknown');
\`\`\`

### Getting Help

If you're still stuck:

1. Check the [FAQ](./faq.md)
2. Search [existing issues](https://github.com/user/repo/issues)
3. Ask on [Discord](https://discord.gg/...)
4. Create a [new issue](https://github.com/user/repo/issues/new)

When reporting issues, include:
- Your environment (OS, Node version, package version)
- Steps to reproduce
- Expected vs actual behavior
- Relevant code snippets or logs
```

## Documentation Structure

```
docs/
├── README.md                 # Overview and quick start
├── getting-started/
│   ├── installation.md      # Installation guide
│   ├── tutorial.md          # Step-by-step tutorial
│   └── quick-reference.md   # Cheat sheet
├── guides/
│   ├── authentication.md    # Feature guides
│   ├── deployment.md
│   └── best-practices.md
├── api/
│   ├── classes/             # API reference
│   ├── interfaces/
│   └── functions/
├── architecture/
│   ├── overview.md          # System architecture
│   ├── adr/                 # Architecture decisions
│   └── diagrams/
├── contributing/
│   ├── CONTRIBUTING.md      # How to contribute
│   ├── CODE_OF_CONDUCT.md
│   └── development.md       # Dev environment setup
└── troubleshooting/
    ├── common-issues.md
    └── faq.md
```

## When to Use This Skill

- Writing README files
- Creating API documentation
- Documenting architecture decisions
- Writing code comments
- Creating tutorials and guides
- Maintaining changelogs
- Writing troubleshooting guides
- Creating technical specifications
