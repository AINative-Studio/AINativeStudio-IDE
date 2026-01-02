# Prompt History Semantic Search - Integration Guide

## Overview

The Prompt History Semantic Search feature enables users to find similar historical prompts using natural language queries. This is powered by ZeroDB vector storage and the IAiEmbeddingVectorService.

## Architecture

### Components

1. **PromptHistoryService** - Main service that manages prompt history
2. **PromptHistoryZeroDBService** - Handles vector storage and semantic search
3. **IAiEmbeddingVectorService** - Generates embeddings from text
4. **ZeroDB MCP Server** - Stores and searches vector embeddings

### Data Flow

```
User Prompt
    |
    v
PromptHistoryService.addPrompt()
    |
    +---> Store in local DB (IndexedDB/SQLite)
    |
    +---> PromptHistoryZeroDBService.storePromptVector()
              |
              +---> IAiEmbeddingVectorService.getEmbeddingVector()
              |
              +---> ZeroDB MCP Tool (upsert_vector)
              |
              v
          ZeroDB Storage

User Search Query
    |
    v
PromptHistoryService.searchSemantic()
    |
    v
PromptHistoryZeroDBService.searchSimilarPrompts()
    |
    +---> IAiEmbeddingVectorService.getEmbeddingVector()
    |
    +---> ZeroDB MCP Tool (search_vectors)
    |
    v
Search Results with Similarity Scores
```

## Integration with PromptHistoryService

### Example Implementation

```typescript
import { IPromptHistoryZeroDBService, PromptEntry } from './promptHistoryZeroDBService.js';

export class PromptHistoryService extends Disposable implements IPromptHistoryService {

  constructor(
    @IPromptHistoryZeroDBService private readonly _zeroDBService: IPromptHistoryZeroDBService,
    @ILogService private readonly _logService: ILogService
  ) {
    super();

    // Listen to vector storage events
    this._register(this._zeroDBService.onDidStoreVector(entry => {
      this._logService.info(`Vector stored for prompt ${entry.id}`);
    }));

    this._register(this._zeroDBService.onDidStoreFail(({ entry, error }) => {
      this._logService.warn(`Vector storage failed for prompt ${entry.id}:`, error);
    }));
  }

  async addPrompt(
    content: string,
    threadId?: string,
    modelName?: string,
    providerName?: string
  ): Promise<void> {
    const entry: PromptEntry = {
      id: generateUuid(),
      content,
      timestamp: Date.now(),
      threadId,
      modelName,
      providerName,
      tokenCount: this._estimateTokens(content)
    };

    // Store in local database (fast, synchronous-like operation)
    await this._localDB.insert(entry);

    // Store vector for semantic search (async, non-blocking)
    // Don't await - this happens in the background
    this._zeroDBService.storePromptVector(entry).catch(err => {
      // Already logged by the service, just prevent unhandled rejection
    });
  }

  async searchSemantic(query: string, limit: number = 20): Promise<PromptEntry[]> {
    // Check if ZeroDB is available
    if (!(await this._zeroDBService.isAvailable())) {
      this._logService.debug('Semantic search unavailable, falling back to keyword search');
      return this.searchKeyword(query, limit);
    }

    try {
      // Perform semantic search with 0.7 similarity threshold
      const results = await this._zeroDBService.searchSimilarPrompts(query, limit, 0.7);
      return results;
    } catch (error) {
      this._logService.error('Semantic search failed:', error);
      // Fallback to keyword search
      return this.searchKeyword(query, limit);
    }
  }

  private searchKeyword(query: string, limit: number): Promise<PromptEntry[]> {
    // Fallback implementation using local database
    return this._localDB.query({ content: { $contains: query } }, limit);
  }
}
```

## Configuration

### Prerequisites

1. **ZeroDB MCP Server**: Must be configured with valid credentials
2. **Embedding Provider**: An extension must provide embeddings via IAiEmbeddingVectorService

### Environment Setup

The ZeroDB MCP server requires these environment variables:

```bash
ZERODB_PROJECT_ID=your-project-id
ZERODB_API_KEY=your-api-key
```

These should be configured in the MCP server settings (not in the IDE).

### Embedding Provider Setup

The IDE needs an extension that provides embeddings. Example providers:
- OpenAI Embeddings Extension
- Local Embedding Model Extension
- Anthropic Embeddings Extension

The extension should register with IAiEmbeddingVectorService:

```typescript
embeddingService.registerAiEmbeddingVectorProvider(
  'text-embedding-ada-002',
  myEmbeddingProvider
);
```

## API Reference

### IPromptHistoryZeroDBService

#### Methods

##### `isAvailable(): Promise<boolean>`

Check if ZeroDB and embedding services are available.

```typescript
const available = await promptHistoryZeroDBService.isAvailable();
if (available) {
  // Semantic search is enabled
}
```

##### `storePromptVector(promptEntry: PromptEntry): Promise<void>`

Store a prompt as a vector. This is a non-blocking, queued operation.

```typescript
await promptHistoryZeroDBService.storePromptVector({
  id: 'prompt-123',
  content: 'How do I implement a binary search tree?',
  timestamp: Date.now(),
  threadId: 'thread-456',
  modelName: 'claude-3-5-sonnet',
  providerName: 'anthropic',
  tokenCount: 42
});
```

##### `searchSimilarPrompts(query: string, limit?: number, threshold?: number): Promise<PromptSearchResult[]>`

Search for similar prompts using semantic similarity.

Parameters:
- `query`: Natural language search query
- `limit`: Maximum results (default: 10)
- `threshold`: Similarity threshold 0-1 (default: 0.7)

```typescript
const results = await promptHistoryZeroDBService.searchSimilarPrompts(
  'algorithm implementation',
  20,
  0.75
);

results.forEach(result => {
  console.log(`Similarity: ${result.similarity.toFixed(2)}`);
  console.log(`Content: ${result.content}`);
  console.log(`Timestamp: ${new Date(result.timestamp).toISOString()}`);
});
```

##### `deleteAllPromptVectors(): Promise<void>`

Delete all prompt vectors from ZeroDB. Useful for testing or cleanup.

```typescript
await promptHistoryZeroDBService.deleteAllPromptVectors();
```

#### Events

##### `onDidStoreVector: Event<PromptEntry>`

Fired when a prompt vector is successfully stored.

```typescript
promptHistoryZeroDBService.onDidStoreVector(entry => {
  console.log('Vector stored:', entry.id);
});
```

##### `onDidStoreFail: Event<{ entry: PromptEntry; error: Error }>`

Fired when vector storage fails after all retries.

```typescript
promptHistoryZeroDBService.onDidStoreFail(({ entry, error }) => {
  console.error(`Failed to store vector for ${entry.id}:`, error);
});
```

## Performance Characteristics

### Vector Storage
- **Operation**: Non-blocking, queued
- **Concurrency**: 2 concurrent operations
- **Retry Strategy**: 3 attempts with exponential backoff
- **Embedding Generation**: ~100-500ms (depends on provider)
- **ZeroDB Upload**: ~50-200ms

### Semantic Search
- **Embedding Generation**: ~100-500ms
- **Vector Search**: ~50-150ms
- **Cache**: 5-minute TTL, max 100 entries
- **Total Latency**: ~150-650ms (first search), ~0ms (cached)

### Storage Overhead
- **Vector Size**: ~6KB per prompt (1536 floats)
- **Metadata Size**: ~500 bytes per prompt
- **Total**: ~6.5KB per prompt in ZeroDB

## Error Handling

### Graceful Degradation

The service is designed to fail gracefully:

1. **ZeroDB Unavailable**: Semantic search returns empty results
2. **Embedding Service Unavailable**: Vector storage is skipped
3. **Network Errors**: Retries with exponential backoff (3 attempts)
4. **Invalid Embeddings**: Logged and skipped

### Example Error Handling

```typescript
try {
  const results = await promptHistoryZeroDBService.searchSimilarPrompts('query');
  if (results.length === 0) {
    // Either no matches or ZeroDB unavailable
    // Fallback to alternative search method
    return await fallbackSearch('query');
  }
  return results;
} catch (error) {
  // Service threw an error (unlikely due to graceful handling)
  console.error('Unexpected error:', error);
  return [];
}
```

## Monitoring and Debugging

### Logging

The service uses `ILogService` with these levels:

- **Trace**: Embedding generation, vector operations
- **Debug**: Availability checks, cache hits
- **Info**: Successful operations, statistics
- **Warn**: Retry attempts, ZeroDB unavailable
- **Error**: Final failures after retries

### Enable Debug Logging

Set the log level in your settings:

```json
{
  "workbench.logLevel": "trace"
}
```

Then check the console for `[PromptHistoryZeroDB]` messages.

### Events for Monitoring

```typescript
let storedCount = 0;
let failedCount = 0;

promptHistoryZeroDBService.onDidStoreVector(() => {
  storedCount++;
  console.log(`Vectors stored: ${storedCount}`);
});

promptHistoryZeroDBService.onDidStoreFail(() => {
  failedCount++;
  console.log(`Storage failures: ${failedCount}`);
});
```

## Testing

### Unit Tests

Mock the dependencies:

```typescript
import { mock } from 'sinon';

const mockEmbeddingService = {
  isEnabled: () => true,
  getEmbeddingVector: async (text: string) => new Array(1536).fill(0.1)
};

const mockToolsService = {
  getTool: (id: string) => ({ id }),
  invokeTool: async () => ({ content: [] })
};

const service = new PromptHistoryZeroDBService(
  mockEmbeddingService as any,
  mockToolsService as any,
  mockLogService
);
```

### Integration Tests

Test with actual ZeroDB (if configured):

```typescript
describe('PromptHistoryZeroDBService Integration', () => {
  it('should store and retrieve prompts', async () => {
    const service = instantiationService.createInstance(PromptHistoryZeroDBService);

    const entry: PromptEntry = {
      id: 'test-1',
      content: 'Test prompt for integration',
      timestamp: Date.now()
    };

    await service.storePromptVector(entry);

    // Wait for async storage
    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = await service.searchSimilarPrompts('test prompt', 5);

    assert(results.length > 0);
    assert(results[0].content.includes('Test prompt'));
  });
});
```

## Best Practices

### 1. Don't Block on Vector Storage

```typescript
// ✅ Good - non-blocking
await localDB.insert(entry);
promptHistoryZeroDBService.storePromptVector(entry);

// ❌ Bad - blocks on vector storage
await localDB.insert(entry);
await promptHistoryZeroDBService.storePromptVector(entry);
```

### 2. Always Provide Fallback

```typescript
// ✅ Good - has fallback
const results = await semanticSearch(query) || await keywordSearch(query);

// ❌ Bad - no fallback
const results = await semanticSearch(query);
```

### 3. Handle Availability Gracefully

```typescript
// ✅ Good - checks availability
if (await service.isAvailable()) {
  return await service.searchSimilarPrompts(query);
}
return fallbackResults;

// ❌ Bad - assumes availability
return await service.searchSimilarPrompts(query);
```

### 4. Use Appropriate Thresholds

```typescript
// ✅ Good - uses reasonable threshold
const results = await service.searchSimilarPrompts(query, 20, 0.7);

// ❌ Bad - threshold too low (too many irrelevant results)
const results = await service.searchSimilarPrompts(query, 20, 0.3);

// ❌ Bad - threshold too high (too few results)
const results = await service.searchSimilarPrompts(query, 20, 0.95);
```

## Future Enhancements

### Planned Features

1. **Namespace Per Workspace**: Isolate prompts by project
2. **Batch Import**: Vectorize existing prompts
3. **Hybrid Search**: Combine semantic + keyword search
4. **Prompt Clustering**: Group similar prompts
5. **Trend Analysis**: Identify common themes

### Configuration Options (Future)

```json
{
  "ainative.promptHistory.enableSemanticSearch": true,
  "ainative.promptHistory.searchThreshold": 0.7,
  "ainative.promptHistory.maxSearchResults": 20,
  "ainative.promptHistory.autoVectorize": true,
  "ainative.promptHistory.cacheEnabled": true
}
```

## Troubleshooting

### Semantic Search Returns No Results

**Possible Causes**:
1. ZeroDB not configured or unavailable
2. No prompts have been vectorized yet
3. Query threshold too high
4. Embedding service not available

**Solutions**:
1. Check MCP server configuration
2. Wait for prompts to be vectorized (background process)
3. Lower the threshold to 0.5-0.6
4. Install and enable an embedding provider extension

### Vector Storage Always Fails

**Possible Causes**:
1. ZeroDB API credentials invalid
2. Network connectivity issues
3. Rate limiting from embedding provider

**Solutions**:
1. Verify `ZERODB_PROJECT_ID` and `ZERODB_API_KEY`
2. Check internet connection
3. Reduce request rate or upgrade embedding service plan

### High Search Latency

**Possible Causes**:
1. Embedding generation slow
2. Large number of vectors to search
3. Cache disabled or not working

**Solutions**:
1. Use a faster embedding provider
2. Reduce search limit
3. Check cache TTL and size settings

## References

- Design Document: `/docs/architecture/prompt-history-zerodb-integration.md`
- Service Implementation: `/ainative-studio/src/vs/workbench/contrib/ainative/common/promptHistoryZeroDBService.ts`
- ZeroDB Guide: `/.claude/commands/ZERODB-GUIDE.md`
- Embedding Service: `/ainative-studio/src/vs/workbench/services/aiEmbeddingVector/common/aiEmbeddingVectorService.ts`
