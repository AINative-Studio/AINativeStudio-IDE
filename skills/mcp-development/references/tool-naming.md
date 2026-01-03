# Tool Naming Standards

Comprehensive naming conventions for MCP tools in the AINative ecosystem.

## Core Principle: Kebab-Case

**ALL** MCP tool names MUST use kebab-case (lowercase with hyphens).

```typescript
// ✅ CORRECT
server.tool('zerodb-search', ...);
server.tool('vector-upsert', ...);
server.tool('postgres-query', ...);
server.tool('file-upload', ...);
server.tool('user-get-profile', ...);

// ❌ WRONG - Never use these formats
server.tool('zerodbSearch', ...);      // camelCase
server.tool('VectorUpsert', ...);      // PascalCase
server.tool('postgres_query', ...);    // snake_case
server.tool('FILEUPLOAD', ...);        // UPPERCASE
```

## Naming Patterns

### 1. Action-Resource Pattern

Format: `{action}-{resource}`

Best for CRUD operations and simple actions:

```typescript
// Create operations
server.tool('create-user', ...);
server.tool('create-table', ...);
server.tool('create-index', ...);

// Read operations
server.tool('get-user', ...);
server.tool('list-tables', ...);
server.tool('fetch-data', ...);

// Update operations
server.tool('update-user', ...);
server.tool('modify-settings', ...);
server.tool('patch-record', ...);

// Delete operations
server.tool('delete-user', ...);
server.tool('remove-file', ...);
server.tool('drop-table', ...);
```

### 2. Service-Action Pattern

Format: `{service}-{action}`

Best for service-specific operations:

```typescript
// ZeroDB operations
server.tool('zerodb-search', ...);
server.tool('zerodb-upsert', ...);
server.tool('zerodb-delete', ...);

// PostgreSQL operations
server.tool('postgres-query', ...);
server.tool('postgres-execute', ...);
server.tool('postgres-backup', ...);

// File storage operations
server.tool('storage-upload', ...);
server.tool('storage-download', ...);
server.tool('storage-list', ...);
```

### 3. Service-Action-Resource Pattern

Format: `{service}-{action}-{resource}`

Best for complex operations with multiple resource types:

```typescript
// ZeroDB table operations
server.tool('zerodb-create-table', ...);
server.tool('zerodb-drop-table', ...);
server.tool('zerodb-list-tables', ...);

// ZeroDB vector operations
server.tool('zerodb-upsert-vector', ...);
server.tool('zerodb-search-vectors', ...);
server.tool('zerodb-delete-vectors', ...);

// User management
server.tool('auth-create-user', ...);
server.tool('auth-verify-token', ...);
server.tool('auth-revoke-session', ...);
```

### 4. Multi-Word Resources

Use hyphens between all words:

```typescript
server.tool('get-user-profile', ...);
server.tool('update-user-settings', ...);
server.tool('send-email-notification', ...);
server.tool('generate-api-key', ...);
server.tool('validate-oauth-token', ...);
```

## Action Verbs

Use clear, standard verbs for actions:

### Creation
- `create` - Create new resource
- `add` - Add to collection
- `insert` - Insert into database
- `upsert` - Insert or update

### Retrieval
- `get` - Fetch single resource
- `list` - Fetch multiple resources
- `search` - Search with query
- `find` - Find matching resources
- `fetch` - Retrieve data

### Updates
- `update` - Replace entire resource
- `modify` - Change parts of resource
- `patch` - Apply partial update
- `set` - Set specific value

### Deletion
- `delete` - Remove resource
- `remove` - Remove from collection
- `drop` - Drop database object
- `clear` - Clear all items

### Other Actions
- `execute` - Run operation
- `process` - Process data
- `generate` - Generate content
- `validate` - Validate data
- `send` - Send message/data
- `receive` - Receive message/data

## Resource Names

### Singular vs Plural

- Use **singular** for single-item operations:
  ```typescript
  server.tool('get-user', ...);        // Fetches ONE user
  server.tool('create-table', ...);    // Creates ONE table
  server.tool('delete-vector', ...);   // Deletes ONE vector
  ```

- Use **plural** for multi-item operations:
  ```typescript
  server.tool('list-users', ...);      // Fetches MULTIPLE users
  server.tool('search-vectors', ...);  // Searches MULTIPLE vectors
  server.tool('delete-all-sessions', ...); // Deletes MULTIPLE sessions
  ```

### Abbreviations

Avoid abbreviations unless they're industry standard:

```typescript
// ✅ GOOD - Clear and unambiguous
server.tool('generate-api-key', ...);
server.tool('validate-oauth-token', ...);
server.tool('get-user-profile', ...);

// ❌ AVOID - Unclear abbreviations
server.tool('gen-key', ...);
server.tool('val-tok', ...);
server.tool('get-usr-prof', ...);

// ✅ OK - Standard industry abbreviations
server.tool('query-sql', ...);        // SQL is standard
server.tool('parse-json', ...);       // JSON is standard
server.tool('validate-jwt', ...);     // JWT is standard
```

## Service Prefixes

Use consistent prefixes for service families:

```typescript
// ZeroDB services
zerodb-search
zerodb-upsert
zerodb-delete
zerodb-create-table
zerodb-list-tables

// PostgreSQL services
postgres-query
postgres-execute
postgres-backup
postgres-restore

// Storage services
storage-upload
storage-download
storage-delete
storage-list

// Authentication services
auth-login
auth-logout
auth-verify-token
auth-refresh-token

// Analytics services
analytics-track-event
analytics-get-report
analytics-export-data
```

## Special Cases

### Compound Actions

When action itself is multi-word, hyphenate everything:

```typescript
server.tool('bulk-insert-records', ...);
server.tool('soft-delete-user', ...);
server.tool('dry-run-migration', ...);
server.tool('force-sync-data', ...);
```

### Versioned Tools

Include version in the name if needed:

```typescript
server.tool('search-v2', ...);
server.tool('legacy-import-data', ...);
server.tool('beta-ai-completion', ...);
```

### Contextual Prefixes

Add context when ambiguity exists:

```typescript
// Without context - ambiguous
server.tool('search', ...);  // Search what?
server.tool('upload', ...);  // Upload where?

// With context - clear
server.tool('vector-search', ...);
server.tool('file-upload', ...);
```

## Anti-Patterns to Avoid

```typescript
// ❌ WRONG: camelCase
server.tool('getUserProfile', ...);

// ❌ WRONG: PascalCase
server.tool('GetUserProfile', ...);

// ❌ WRONG: snake_case
server.tool('get_user_profile', ...);

// ❌ WRONG: No separator
server.tool('getuserprofile', ...);

// ❌ WRONG: Mixed case
server.tool('Get-User-Profile', ...);

// ❌ WRONG: Unclear abbreviations
server.tool('gt-usr-prf', ...);

// ❌ WRONG: Inconsistent verb
server.tool('retrieve-user', ...);  // Use 'get' instead
server.tool('fetch-user', ...);     // Use 'get' instead

// ✅ CORRECT
server.tool('get-user-profile', ...);
```

## Migration Guide

If you have existing tools with wrong naming:

```typescript
// Step 1: Add new correctly-named tool
server.tool('zerodb-search', ...);  // New name

// Step 2: Keep old tool with deprecation warning
server.tool('zerodbSearch', ..., async (params) => {
  console.error('Warning: zerodbSearch is deprecated, use zerodb-search');
  // Call new implementation
});

// Step 3: Remove deprecated tool in next major version
```

## Validation Checklist

Before registering a tool, verify:

- [ ] Tool name uses only lowercase letters, numbers, and hyphens
- [ ] No camelCase, PascalCase, or snake_case
- [ ] Action verb is clear and standard
- [ ] Resource name is unambiguous
- [ ] Singular/plural matches operation type
- [ ] Service prefix is consistent with related tools
- [ ] No unclear abbreviations
- [ ] Multi-word parts are hyphenated

## Examples by Category

### Database Operations
```typescript
// Table management
server.tool('create-table', ...);
server.tool('drop-table', ...);
server.tool('list-tables', ...);
server.tool('describe-table', ...);

// Record operations
server.tool('insert-record', ...);
server.tool('update-record', ...);
server.tool('delete-record', ...);
server.tool('query-records', ...);
```

### File Operations
```typescript
server.tool('upload-file', ...);
server.tool('download-file', ...);
server.tool('delete-file', ...);
server.tool('list-files', ...);
server.tool('get-file-metadata', ...);
```

### User Management
```typescript
server.tool('create-user', ...);
server.tool('get-user', ...);
server.tool('update-user', ...);
server.tool('delete-user', ...);
server.tool('list-users', ...);
server.tool('search-users', ...);
```

### Analytics
```typescript
server.tool('track-event', ...);
server.tool('get-metrics', ...);
server.tool('generate-report', ...);
server.tool('export-analytics-data', ...);
```
