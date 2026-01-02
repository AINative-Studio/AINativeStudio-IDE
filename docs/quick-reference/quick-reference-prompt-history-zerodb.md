# Prompt History ZeroDB Integration - Quick Reference

## At a Glance

**Service**: `IPromptHistoryZeroDBService`
**Location**: `/ainative-studio/src/vs/workbench/contrib/ainative/common/promptHistoryZeroDBService.ts`
**Purpose**: Semantic search for prompt history using ZeroDB vector storage

## Quick Start

### 1. Inject the Service

```typescript
import { IPromptHistoryZeroDBService } from './promptHistoryZeroDBService.js';

export class YourService {
  constructor(
    @IPromptHistoryZeroDBService private readonly _zeroDBService: IPromptHistoryZeroDBService
  ) {}
}
```

### 2. Store a Prompt Vector

```typescript
// Non-blocking operation
await this._zeroDBService.storePromptVector({
  id: generateUuid(),
  content: 'User prompt text here',
  timestamp: Date.now(),
  threadId: 'optional-thread-id',
  modelName: 'claude-3-5-sonnet',
  providerName: 'anthropic'
});
```

### 3. Search for Similar Prompts

```typescript
const results = await this._zeroDBService.searchSimilarPrompts(
  'search query',
  20,    // limit
  0.7    // threshold (0-1)
);

results.forEach(result => {
  console.log(`${result.similarity.toFixed(2)}: ${result.content}`);
});
```

### 4. Check Availability

```typescript
if (await this._zeroDBService.isAvailable()) {
  // ZeroDB and embeddings are ready
} else {
  // Fall back to alternative search
}
```

## API Cheat Sheet

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `isAvailable()` | None | `Promise<boolean>` | Check if ZeroDB is ready |
| `storePromptVector(entry)` | `PromptEntry` | `Promise<void>` | Store vector (async) |
| `searchSimilarPrompts(query, limit?, threshold?)` | `string, number, number` | `Promise<PromptSearchResult[]>` | Semantic search |
| `deleteAllPromptVectors()` | None | `Promise<void>` | Clear all vectors |

### Events

| Event | Payload | When Fired |
|-------|---------|------------|
| `onDidStoreVector` | `PromptEntry` | Vector stored successfully |
| `onDidStoreFail` | `{ entry, error }` | Storage failed after retries |

### Interfaces

```typescript
interface PromptEntry {
  id: string;
  content: string;
  timestamp: number;
  threadId?: string;
  modelName?: string;
  providerName?: string;
  tokenCount?: number;
}

interface PromptSearchResult extends PromptEntry {
  similarity: number;  // 0-1
}
```

## Common Patterns

### Store and Forget

```typescript
// ✅ Recommended - non-blocking
await localDB.insert(entry);
this._zeroDBService.storePromptVector(entry);
```

### Search with Fallback

```typescript
// ✅ Recommended - graceful degradation
const results = await this._zeroDBService.isAvailable()
  ? await this._zeroDBService.searchSimilarPrompts(query)
  : await this.fallbackSearch(query);
```

### Monitor Success/Failure

```typescript
// ✅ Recommended - track metrics
this._zeroDBService.onDidStoreVector(() => successCount++);
this._zeroDBService.onDidStoreFail(({ error }) => {
  errorCount++;
  console.error('Storage failed:', error);
});
```

## Performance Tips

### Caching
- Search results cached for 5 minutes
- Cache cleared on new vector storage
- Max 100 cached queries

### Concurrency
- 2 concurrent vector storage operations
- Unlimited concurrent searches (cached)

### Latency
- First search: ~150-650ms
- Cached search: ~0ms
- Vector storage: ~150-700ms (async)

## Error Handling

### Automatic Retries
- 3 attempts with exponential backoff
- Delays: 1s, 2s, 4s

### Graceful Degradation
- ZeroDB unavailable → `isAvailable()` returns false
- Embedding unavailable → Same as above
- Network errors → Retries, then fires `onDidStoreFail`

### Never Throws
All methods handle errors internally and return gracefully:
- `isAvailable()` → Returns `false` on error
- `storePromptVector()` → Fires event on failure
- `searchSimilarPrompts()` → Returns `[]` on error

## Configuration

### Prerequisites
1. ZeroDB MCP server configured (`ZERODB_PROJECT_ID`, `ZERODB_API_KEY`)
2. Embedding provider extension installed
3. Network connectivity

### No IDE Config Required
Service auto-detects availability and degrades gracefully.

## Debugging

### Enable Trace Logging

```json
{
  "workbench.logLevel": "trace"
}
```

### Log Prefixes
- `[PromptHistoryZeroDB]` - All operations
- Look for: Availability checks, embedding generation, ZeroDB calls

### Common Log Messages
```
✅ [PromptHistoryZeroDB] ZeroDB is available and configured
✅ [PromptHistoryZeroDB] Successfully stored vector for prompt abc-123
✅ [PromptHistoryZeroDB] Found 5 similar prompts
❌ [PromptHistoryZeroDB] ZeroDB not available, skipping vector storage
⚠️  [PromptHistoryZeroDB] Storage attempt 1/3 failed: Network error
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| No search results | ZeroDB unavailable or no vectors stored | Check `isAvailable()`, wait for vectors to be stored |
| Storage always fails | Invalid API key or network issues | Verify ZeroDB credentials, check network |
| High latency | Slow embedding provider | Use faster provider or reduce search limit |
| Cache not working | Cache TTL expired or size exceeded | Normal behavior, consider increasing limits |

## Testing

### Mock Example

```typescript
const mockEmbeddingService = {
  isEnabled: () => true,
  getEmbeddingVector: async () => new Array(1536).fill(0.1)
};

const mockToolsService = {
  getTool: () => ({ id: 'mock-tool' }),
  invokeTool: async () => ({ content: [{ value: { results: [] } }] })
};

const service = new PromptHistoryZeroDBService(
  mockEmbeddingService as any,
  mockToolsService as any,
  mockLogService
);
```

## Integration Example

```typescript
export class PromptHistoryService {
  private _vectorizedCount = 0;

  constructor(
    @IPromptHistoryZeroDBService private readonly _zeroDBService: IPromptHistoryZeroDBService,
    @ILogService private readonly _logService: ILogService
  ) {
    // Track vectorization
    this._zeroDBService.onDidStoreVector(() => {
      this._vectorizedCount++;
      this._logService.info(`Vectorized ${this._vectorizedCount} prompts`);
    });
  }

  async addPrompt(content: string, threadId?: string): Promise<void> {
    const entry: PromptEntry = {
      id: generateUuid(),
      content,
      timestamp: Date.now(),
      threadId,
      modelName: this._currentModel,
      providerName: this._currentProvider
    };

    // Store locally (fast, required)
    await this._localDB.insert(entry);

    // Store vector (async, optional)
    if (await this._zeroDBService.isAvailable()) {
      this._zeroDBService.storePromptVector(entry);
    }
  }

  async search(query: string, useSemanticSearch = true): Promise<PromptEntry[]> {
    if (useSemanticSearch && await this._zeroDBService.isAvailable()) {
      // Semantic search
      return await this._zeroDBService.searchSimilarPrompts(query, 20, 0.7);
    } else {
      // Fallback to keyword search
      return await this._localDB.query({ content: { $contains: query } }, 20);
    }
  }

  async getVectorizedCount(): Promise<number> {
    return this._vectorizedCount;
  }
}
```

## Best Practices Checklist

- [ ] Always check `isAvailable()` before searching
- [ ] Don't await `storePromptVector()` (non-blocking)
- [ ] Provide fallback for when ZeroDB unavailable
- [ ] Use reasonable similarity thresholds (0.6-0.8)
- [ ] Monitor events for success/failure tracking
- [ ] Enable trace logging during development
- [ ] Mock dependencies in unit tests
- [ ] Handle empty search results gracefully

## Quick Links

- **Implementation**: `/ainative-studio/src/vs/workbench/contrib/ainative/common/promptHistoryZeroDBService.ts`
- **Architecture Doc**: `/docs/architecture/prompt-history-zerodb-integration.md`
- **Integration Guide**: `/docs/guides/prompt-history-semantic-search.md`
- **ZeroDB Guide**: `/.claude/commands/ZERODB-GUIDE.md`

## Dependencies

```typescript
// Required imports
import { IPromptHistoryZeroDBService, PromptEntry, PromptSearchResult } from './promptHistoryZeroDBService.js';
import { IAiEmbeddingVectorService } from '../../../services/aiEmbeddingVector/common/aiEmbeddingVectorService.js';
import { ILanguageModelToolsService } from '../../chat/common/languageModelToolsService.js';
```

## Constants

```typescript
// Namespace for prompt vectors
const NAMESPACE = 'prompt-history';

// Performance tuning
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const BATCH_SIZE = 10;
const QUEUE_CONCURRENCY = 2;
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes
const MAX_CACHE_SIZE = 100;
```

## Sample Test

```typescript
describe('PromptHistoryZeroDBService', () => {
  let service: PromptHistoryZeroDBService;

  beforeEach(() => {
    service = instantiationService.createInstance(PromptHistoryZeroDBService);
  });

  it('should store and search prompts', async () => {
    const entry: PromptEntry = {
      id: 'test-1',
      content: 'How to write unit tests',
      timestamp: Date.now()
    };

    await service.storePromptVector(entry);
    await delay(1000); // Wait for async storage

    const results = await service.searchSimilarPrompts('unit testing', 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('unit tests');
    expect(results[0].similarity).toBeGreaterThan(0.7);
  });
});
```

---

**Last Updated**: January 2, 2026
**Version**: 1.0.0
**Maintainer**: AINative Studio Team
