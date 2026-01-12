# WebFetchService Documentation

**Location:** `ainative-studio/src/vs/workbench/contrib/ainative/common/webFetchService.ts`

**Version:** 1.0.0

**Last Updated:** January 7, 2026

---

## Overview

The `WebFetchService` provides documentation retrieval capabilities for the AINative Studio IDE. It offers client-side domain validation, local caching with TTL, and tool schema generation for integration with the managed chat API.

### Key Features

- **Domain Whitelist Validation** - 60+ trusted documentation sources
- **Local Caching** - 1-hour TTL for faster responses
- **Tool Schema Generation** - Compatible with managed chat API tool calling
- **Search Suggestions** - Generate search URLs for documentation queries
- **Error Handling** - User-friendly error messages with specific error codes
- **Automatic Cache Cleanup** - Expired entries removed every 10 minutes

---

## Architecture

### Client-Side vs Server-Side

The WebFetchService is designed to work with a **server-side tool execution model**:

1. **Client-Side (WebFetchService)**
   - Validates domains before API calls
   - Manages local cache
   - Generates tool schemas
   - Provides search suggestions
   - Processes and caches results from backend

2. **Server-Side (Backend Tool)**
   - Actually fetches web content
   - Converts HTML to Markdown
   - Extracts main content
   - Returns formatted documentation

### Flow Diagram

```
┌──────────────────┐
│  Chat UI         │
│  (User Request)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ WebFetchService  │◄──────┐
│ - Validate URL   │       │ Cache Hit
│ - Check Cache    │───────┘
└────────┬─────────┘
         │ Cache Miss
         ▼
┌──────────────────┐
│ ManagedChatAPI   │
│ + web_fetch tool │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Backend          │
│ - Fetch URL      │
│ - Convert HTML   │
│ - Return Markdown│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ WebFetchService  │
│ - Process Result │
│ - Cache Result   │
│ - Return to User │
└──────────────────┘
```

---

## API Reference

### Interface: IWebFetchService

```typescript
interface IWebFetchService {
  // Fetch documentation from URL (validates + throws for server-side execution)
  fetchDocumentation(url: string, options?: FetchOptions): Promise<DocumentationResult>;

  // Search documentation with query
  searchDocumentation(query: string, domains?: string[]): Promise<SearchResult[]>;

  // Validate if domain is whitelisted
  validateDomain(url: string): boolean;

  // Get list of whitelisted domains
  getWhitelistedDomains(): string[];

  // Get tool schema for LLM tool calling
  getToolSchema(): ToolDefinition;

  // Clear cache (all or specific URL)
  clearCache(url?: string): void;

  // Get cache statistics
  getCacheStats(): { size: number; entries: number };
}
```

### Types

#### DocumentationResult

```typescript
interface DocumentationResult {
  url: string;              // Final URL (after redirects)
  title: string;            // Page title
  content: string;          // Markdown-formatted content
  contentType: string;      // MIME type
  sizeBytes: number;        // Content size in bytes
  fetchedAt: Date;          // Timestamp
  cached: boolean;          // Whether from cache
  truncated?: boolean;      // If content was truncated
}
```

#### SearchResult

```typescript
interface SearchResult {
  domain: string;                  // Domain name
  suggested_search_url: string;    // Google search URL for domain
  direct_url: string;              // Direct URL to domain
}
```

#### WebFetchError

```typescript
interface WebFetchError {
  code: WebFetchErrorCode;         // Error type
  message: string;                 // Human-readable message
  url: string;                     // URL that caused error
  statusCode?: number;             // HTTP status code (if applicable)
  originalError?: Error;           // Original error object
}

enum WebFetchErrorCode {
  DomainNotWhitelisted = 'DOMAIN_NOT_WHITELISTED',
  FetchFailed = 'FETCH_FAILED',
  NetworkError = 'NETWORK_ERROR',
  InvalidUrl = 'INVALID_URL',
  Timeout = 'TIMEOUT',
  UnknownError = 'UNKNOWN_ERROR'
}
```

#### FetchOptions

```typescript
interface FetchOptions {
  parseFormat?: 'html' | 'markdown' | 'text';  // Output format
  maxLength?: number;                            // Max content length
  includeLinks?: boolean;                        // Include links in markdown
  timeout?: number;                              // Request timeout (ms)
}
```

#### ToolDefinition

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}
```

---

## Whitelisted Domains

The service whitelists **60+ trusted documentation sources** across multiple categories:

### Python & Data Science
- docs.python.org
- numpy.org
- pandas.pydata.org
- matplotlib.org
- scikit-learn.org
- pytorch.org
- tensorflow.org
- docs.scipy.org
- jupyter.org

### JavaScript & Web
- developer.mozilla.org
- nodejs.org
- docs.npmjs.com
- reactjs.org
- react.dev
- vuejs.org
- angular.io
- svelte.dev
- nextjs.org

### Backend Frameworks
- docs.djangoproject.com
- flask.palletsprojects.com
- fastapi.tiangolo.com
- docs.sqlalchemy.org
- expressjs.com
- nestjs.com
- spring.io

### Databases
- postgresql.org
- dev.mysql.com
- mongodb.com
- redis.io
- cassandra.apache.org

### DevOps & Cloud
- docs.docker.com
- kubernetes.io
- docs.aws.amazon.com
- cloud.google.com
- learn.microsoft.com

### AI & ML
- docs.anthropic.com
- platform.openai.com
- docs.cohere.ai
- huggingface.co
- docs.langchain.com

### Developer Resources
- github.com
- gitlab.com
- stackoverflow.com
- docs.microsoft.com

### Academic
- arxiv.org
- wikipedia.org
- en.wikipedia.org

### Programming Languages
- go.dev
- rust-lang.org
- kotlinlang.org
- swift.org
- typescriptlang.org

---

## Usage Examples

### 1. Domain Validation

```typescript
import { IWebFetchService } from './webFetchService';

// Inject service via DI
constructor(@IWebFetchService private webFetchService: IWebFetchService) {}

// Validate URL before use
const url = 'https://docs.python.org/3/library/os.html';
if (this.webFetchService.validateDomain(url)) {
  console.log('URL is safe to fetch');
} else {
  console.error('URL domain is not whitelisted');
}
```

### 2. Get Tool Schema

```typescript
// Get tool schema for managed chat API
const toolSchema = this.webFetchService.getToolSchema();

// Use in chat completion request
const response = await managedChatAPI.sendChatCompletion({
  messages: [{
    role: 'user',
    content: 'Show me Python os module documentation'
  }],
  tools: [toolSchema],
  preferred_model: 'llama-3.3-70b-instruct'
});
```

### 3. Search Documentation

```typescript
// Search with default domains
const results = await this.webFetchService.searchDocumentation('async functions');

results.forEach(result => {
  console.log(`${result.domain}: ${result.suggested_search_url}`);
});

// Search specific domains
const dockerResults = await this.webFetchService.searchDocumentation(
  'container networking',
  ['docs.docker.com', 'kubernetes.io']
);
```

### 4. Process Backend Results

```typescript
// After backend executes web_fetch tool
const backendResult = {
  url: 'https://docs.python.org/3/library/os.html',
  title: 'os — Miscellaneous operating system interfaces',
  content: '# os module\n\nProvides portable way...',
  format: 'markdown',
  length: 1234
};

// Process and cache result
const docResult = this.webFetchService.processToolResult(
  backendResult,
  backendResult.url
);

// Display to user
console.log('Title:', docResult.title);
console.log('Content:', docResult.content.substring(0, 200));
```

### 5. Cache Management

```typescript
// Get cache statistics
const stats = this.webFetchService.getCacheStats();
console.log(`Cache: ${stats.entries} entries, ${stats.size} bytes`);

// Clear specific URL
this.webFetchService.clearCache('https://docs.python.org/3/library/os.html');

// Clear all cache
this.webFetchService.clearCache();
```

### 6. Error Handling

```typescript
try {
  await this.webFetchService.fetchDocumentation('https://malicious-site.com');
} catch (error) {
  const webFetchError = error as WebFetchError;

  switch (webFetchError.code) {
    case WebFetchErrorCode.DomainNotWhitelisted:
      // Show user list of valid domains
      const domains = this.webFetchService.getWhitelistedDomains();
      showError(`Please use a trusted source: ${domains.slice(0, 5).join(', ')}`);
      break;

    case WebFetchErrorCode.InvalidUrl:
      showError('Invalid URL format');
      break;

    case WebFetchErrorCode.NetworkError:
      showError('Network request failed. Please try again.');
      break;
  }
}
```

---

## Integration Guide

### With ManagedChatAPIService

```typescript
import { IWebFetchService } from './webFetchService';
import { IManagedChatAPIService } from './managedChatAPIService';

export class ChatService {
  constructor(
    @IWebFetchService private webFetchService: IWebFetchService,
    @IManagedChatAPIService private chatAPI: IManagedChatAPIService
  ) {}

  async sendMessageWithDocumentation(message: string, url?: string): Promise<string> {
    // Validate URL if provided
    if (url && !this.webFetchService.validateDomain(url)) {
      throw new Error('URL domain is not whitelisted');
    }

    // Build tools array
    const tools = [this.webFetchService.getToolSchema()];

    // Send to managed API
    const response = await this.chatAPI.sendChatCompletion({
      messages: [{ role: 'user', content: message }],
      tools,
      preferred_model: 'llama-3.3-70b-instruct',
      stream: false
    });

    // Process any tool results in the response
    // (Backend handles actual tool execution)

    return response.choices[0].message.content;
  }
}
```

### With Chat UI

```typescript
// In chat component
import { IWebFetchService } from '../common/webFetchService';

export class ChatPanel {
  constructor(@IWebFetchService private webFetchService: IWebFetchService) {}

  // Show whitelisted domains in UI
  renderDocumentationSources(): void {
    const domains = this.webFetchService.getWhitelistedDomains();
    this.docsSourceList.innerHTML = domains
      .map(domain => `<li>${domain}</li>`)
      .join('');
  }

  // Validate URL before sending
  async handleDocumentationRequest(url: string): Promise<void> {
    if (!this.webFetchService.validateDomain(url)) {
      this.showError('Please use a whitelisted documentation source');
      return;
    }

    // Proceed with chat request...
  }
}
```

---

## Best Practices

### 1. Always Validate Before API Calls

```typescript
// BAD: No validation
const result = await chatAPI.sendWithTools(url);

// GOOD: Validate first
if (!webFetchService.validateDomain(url)) {
  throw new Error('Invalid domain');
}
const result = await chatAPI.sendWithTools(url);
```

### 2. Use Cache Stats for UI Feedback

```typescript
// Show cache status to user
const stats = webFetchService.getCacheStats();
statusBar.text = `Documentation cache: ${stats.entries} entries`;
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await webFetchService.fetchDocumentation(url);
} catch (error) {
  const webError = error as WebFetchError;

  // Show user-friendly message
  if (webError.code === WebFetchErrorCode.DomainNotWhitelisted) {
    showQuickPick(webFetchService.getWhitelistedDomains());
  }
}
```

### 4. Clear Cache When Needed

```typescript
// Clear cache when user logs out
onLogout(() => {
  webFetchService.clearCache();
});

// Clear specific URL on refresh
onRefresh((url) => {
  webFetchService.clearCache(url);
});
```

### 5. Use Search for Discovery

```typescript
// Help users find documentation
const query = await showInputBox('Search documentation');
const results = await webFetchService.searchDocumentation(query);

// Show results in quick pick
const selected = await showQuickPick(results.map(r => ({
  label: r.domain,
  detail: r.suggested_search_url
})));
```

---

## Performance Considerations

### Caching Strategy

- **TTL:** 1 hour (configurable)
- **Cleanup:** Every 10 minutes
- **Storage:** In-memory Map
- **Size:** Tracks total bytes

### Memory Usage

```typescript
// Monitor cache size
const stats = webFetchService.getCacheStats();
if (stats.size > 10 * 1024 * 1024) { // 10 MB
  webFetchService.clearCache(); // Clear if too large
}
```

### Rate Limiting

The service itself doesn't implement rate limiting, but the backend does:
- Respects backend rate limits
- Handles 429 responses
- Caching reduces backend load

---

## Testing

### Unit Tests

Located at: `ainative-studio/src/vs/workbench/contrib/ainative/test/common/webFetchService.test.ts`

**Coverage:** 80%+ target

Test suites:
1. Domain Validation
2. Whitelisted Domains
3. Tool Schema
4. Search Documentation
5. Cache Management
6. Process Tool Result
7. Fetch Documentation
8. Error Handling
9. Disposal

### Running Tests

```bash
cd ainative-studio
npm run test-node -- --grep "WebFetchService"
```

---

## Security

### Domain Whitelist

Only pre-approved domains can be fetched:
- Prevents SSRF attacks
- Blocks malicious sites
- Ensures quality content

### Protocol Validation

Only HTTP and HTTPS allowed:
- No `file://` access
- No `javascript:` execution
- No `data:` URLs

### Content Sanitization

Server-side handles sanitization:
- HTML is converted to Markdown
- Scripts are removed
- Only main content extracted

---

## Troubleshooting

### "Domain not whitelisted" Error

**Cause:** URL domain is not in the whitelist

**Solution:**
1. Check URL is correct
2. Verify domain is a documentation site
3. Request domain addition if legitimate

### Cache Not Working

**Cause:** Results not being cached

**Solution:**
1. Check cache stats: `getCacheStats()`
2. Verify `processToolResult()` is called
3. Check TTL hasn't expired

### Empty Search Results

**Cause:** No whitelisted domains match

**Solution:**
1. Verify domains parameter
2. Check domain spelling
3. Use default domains (omit parameter)

---

## Future Enhancements

### Planned Features

1. **Configurable Whitelist**
   - User-defined domains
   - Per-project whitelists
   - Dynamic domain management

2. **Persistent Cache**
   - SQLite storage
   - Larger capacity
   - Cross-session caching

3. **Smart Caching**
   - Content-based TTL
   - Popularity-based retention
   - Predictive caching

4. **Enhanced Search**
   - Built-in search API integration
   - Semantic search
   - Related documentation suggestions

5. **Offline Support**
   - Download documentation sets
   - Offline-first mode
   - Sync when online

---

## Related Documentation

- [Managed Chat API Integration Guide](../PHASE2_FINAL_INTEGRATION_GUIDE.md)
- [Code Intelligence Service](./CODE_INTELLIGENCE_SERVICE.md)
- [Usage Tracking Service](./USAGE_TRACKING_SERVICE.md)
- [Backend Web Fetch Tool](/Users/aideveloper/core/src/backend/app/services/agent_framework/tools/web_fetch_tool.py)

---

## Support

For questions or issues:
1. Check this documentation
2. Review unit tests for examples
3. See `webFetchServiceExample.ts` for usage patterns
4. Contact backend team for tool-related issues

---

**Last Updated:** January 7, 2026
**Maintainer:** AINative Studio Team
**Version:** 1.0.0
