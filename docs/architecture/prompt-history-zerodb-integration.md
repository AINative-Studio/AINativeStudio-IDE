# Prompt History ZeroDB Integration - Design Document

## Overview

This document describes the design and implementation of ZeroDB vector search integration for the PromptHistoryService. The integration enables semantic search capabilities for historical prompts, allowing users to find similar past prompts using natural language queries.

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PromptHistoryService                      │
│  (Being created by another agent)                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Uses
                   ▼
┌─────────────────────────────────────────────────────────────┐
│             PromptHistoryZeroDBService                       │
│  - storePromptVector()                                       │
│  - searchSimilarPrompts()                                    │
│  - deleteAllPromptVectors()                                  │
└────┬─────────────────────┬──────────────────────────────────┘
     │                     │
     │ Uses                │ Uses
     ▼                     ▼
┌──────────────────┐  ┌──────────────────────────────────────┐
│ MCP Tools        │  │  IAiEmbeddingVectorService           │
│ (ZeroDB)         │  │  - getEmbeddingVector()              │
└──────────────────┘  └──────────────────────────────────────┘
     │
     │ Calls
     ▼
┌──────────────────────────────────────────────────────────────┐
│  ZeroDB MCP Server (via ILanguageModelToolsService)          │
│  - mcp__ainative-zerodb__zerodb_upsert_vector                │
│  - mcp__ainative-zerodb__zerodb_search_vectors               │
│  - mcp__ainative-zerodb__zerodb_delete_vector                │
└──────────────────────────────────────────────────────────────┘
```

## Data Schema

### Vector Storage Schema

```typescript
interface PromptVector {
  id: string;                    // Unique prompt ID (UUID)
  embedding: number[];           // 1536-dimension vector (OpenAI ada-002 compatible)
  metadata: {
    content: string;             // Original prompt text
    timestamp: number;           // Unix timestamp
    threadId?: string;           // Optional chat thread ID
    modelName?: string;          // AI model used (e.g., "claude-3-5-sonnet")
    providerName?: string;       // Provider name (e.g., "anthropic")
    tokenCount?: number;         // Token count of prompt
    source: 'ainative-ide';      // Always set to identify source
  }
}
```

### Namespace Organization

Vectors are organized using the `prompt-history` namespace in ZeroDB to isolate them from other vector data.

## Service Interface

### IPromptHistoryZeroDBService

```typescript
export interface IPromptHistoryZeroDBService {
  readonly _serviceBrand: undefined;

  /**
   * Event fired when a prompt vector is stored
   */
  readonly onDidStoreVector: Event<PromptEntry>;

  /**
   * Event fired when vector storage fails
   */
  readonly onDidStoreFail: Event<{ entry: PromptEntry; error: Error }>;

  /**
   * Check if ZeroDB is available and configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Store a prompt as a vector for semantic search
   * @param promptEntry The prompt entry to store
   * @returns Promise resolving when storage is complete, or undefined if ZeroDB unavailable
   */
  storePromptVector(promptEntry: PromptEntry): Promise<void>;

  /**
   * Search for similar prompts using semantic similarity
   * @param query The search query (natural language)
   * @param limit Maximum number of results (default: 10)
   * @param threshold Similarity threshold 0-1 (default: 0.7)
   * @returns Array of matching prompt entries with similarity scores
   */
  searchSimilarPrompts(
    query: string,
    limit?: number,
    threshold?: number
  ): Promise<PromptSearchResult[]>;

  /**
   * Delete all prompt vectors (for testing/cleanup)
   */
  deleteAllPromptVectors(): Promise<void>;
}

export interface PromptEntry {
  readonly id: string;
  readonly content: string;
  readonly timestamp: number;
  readonly threadId?: string;
  readonly modelName?: string;
  readonly providerName?: string;
  readonly tokenCount?: number;
}

export interface PromptSearchResult extends PromptEntry {
  readonly similarity: number;  // Cosine similarity score (0-1)
}
```

## Implementation Details

### Embedding Strategy

**Decision: Use IAiEmbeddingVectorService**

The implementation uses the existing `IAiEmbeddingVectorService` which:
- Abstracts away the embedding model provider
- Supports multiple embedding providers via extension API
- Has built-in timeout and error handling
- Returns 1536-dimension vectors (OpenAI ada-002 compatible)

**Alternative Considered: Direct API Calls**
- Would require managing API keys for OpenAI/Anthropic
- Additional error handling complexity
- Not aligned with existing architecture

### ZeroDB Tool Invocation

The service invokes ZeroDB MCP tools through the `ILanguageModelToolsService`:

```typescript
// Example tool invocation for vector upsert
const result = await this._toolsService.invokeTool(
  {
    callId: generateUuid(),
    toolId: 'mcp__ainative-zerodb__zerodb_upsert_vector',
    parameters: {
      vector_embedding: embedding,
      document: promptEntry.content,
      metadata: {
        promptId: promptEntry.id,
        timestamp: promptEntry.timestamp,
        threadId: promptEntry.threadId,
        modelName: promptEntry.modelName,
        providerName: promptEntry.providerName,
        tokenCount: promptEntry.tokenCount,
        source: 'ainative-ide'
      },
      namespace: 'prompt-history',
      vector_id: promptEntry.id
    },
    context: undefined
  },
  countTokensCallback,
  CancellationToken.None
);
```

### Error Handling Strategy

#### Graceful Degradation
- If ZeroDB is unavailable, semantic search is silently disabled
- The PromptHistoryService continues to function normally
- Users can still access prompt history via traditional methods

#### Error Scenarios
1. **ZeroDB Not Configured**: `isAvailable()` returns false
2. **Embedding Service Unavailable**: Log warning, skip vector storage
3. **Network Errors**: Retry with exponential backoff (3 attempts)
4. **Rate Limiting**: Queue requests and process with delay
5. **Invalid Vector Dimensions**: Validate before sending to ZeroDB

### Performance Considerations

#### Async Background Processing
```typescript
// Non-blocking vector storage
public async storePromptVector(promptEntry: PromptEntry): Promise<void> {
  // Don't block the caller
  this._queueVectorStorage(promptEntry).catch(error => {
    this._onDidStoreFail.fire({ entry: promptEntry, error });
    this._logService.error('Failed to store prompt vector:', error);
  });
}

private async _queueVectorStorage(promptEntry: PromptEntry): Promise<void> {
  // Add to queue, process with rate limiting
  this._storageQueue.push(promptEntry);
  this._processQueue();
}
```

#### Caching Strategy
- Cache embeddings for frequently searched queries (LRU cache, max 100 items)
- Cache search results for 5 minutes
- Clear cache on new vector storage

#### Batch Operations
- Use `mcp__ainative-zerodb__zerodb_batch_upsert_vectors` for bulk imports
- Process storage queue in batches of 10

## Integration Points

### 1. PromptHistoryService Integration

```typescript
export class PromptHistoryService implements IPromptHistoryService {
  constructor(
    @IPromptHistoryZeroDBService private readonly _zeroDBService: IPromptHistoryZeroDBService
  ) {}

  async addPrompt(content: string, threadId?: string): Promise<void> {
    const entry: PromptEntry = {
      id: generateUuid(),
      content,
      timestamp: Date.now(),
      threadId,
      // ... other metadata
    };

    // Store in local database (IndexedDB/SQLite)
    await this._localDB.insert(entry);

    // Store vector for semantic search (non-blocking)
    if (await this._zeroDBService.isAvailable()) {
      this._zeroDBService.storePromptVector(entry).catch(err => {
        // Log but don't fail the operation
        console.warn('Failed to store vector:', err);
      });
    }
  }

  async searchSemantic(query: string): Promise<PromptEntry[]> {
    if (!(await this._zeroDBService.isAvailable())) {
      return []; // Fall back to empty results
    }

    const results = await this._zeroDBService.searchSimilarPrompts(query, 20, 0.7);
    return results;
  }
}
```

### 2. Service Registration

```typescript
// In ainative.contribution.ts or similar
registerSingleton(
  IPromptHistoryZeroDBService,
  PromptHistoryZeroDBService,
  InstantiationType.Delayed
);
```

## Configuration

### Environment Variables (MCP Server)
```bash
ZERODB_PROJECT_ID=your-project-id
ZERODB_API_KEY=your-api-key
```

These are configured in the MCP server settings, not directly in the IDE.

### User Settings (Future Enhancement)
```json
{
  "ainative.promptHistory.enableSemanticSearch": true,
  "ainative.promptHistory.searchThreshold": 0.7,
  "ainative.promptHistory.maxSearchResults": 20
}
```

## Testing Strategy

### Unit Tests
- Mock `IAiEmbeddingVectorService` for embedding generation
- Mock `ILanguageModelToolsService` for ZeroDB calls
- Test error handling scenarios
- Test queue processing and batching

### Integration Tests
- Test with actual ZeroDB MCP server (if available)
- Test fallback behavior when ZeroDB unavailable
- Test concurrent storage operations

### Performance Tests
- Measure embedding generation time
- Measure search latency
- Test with large datasets (10k+ prompts)

## Migration Strategy

### Phase 1: Initial Implementation (Current)
- Implement basic vector storage
- Implement semantic search
- No migration of existing prompts

### Phase 2: Backfill (Future)
- Background job to vectorize existing prompts
- Progress indicator in UI
- Pausable/resumable process

### Phase 3: Advanced Features (Future)
- Clustering similar prompts
- Trend analysis
- Prompt templates extraction

## Security Considerations

1. **API Key Storage**: ZeroDB API keys stored in MCP server config, not in IDE
2. **Data Privacy**: Prompts stored in user's ZeroDB project (isolated)
3. **PII Handling**: No automatic PII detection (user responsibility)
4. **Rate Limiting**: Prevent abuse with request queuing

## Monitoring and Observability

### Metrics to Track
- Vector storage success/failure rate
- Average search latency
- Embedding generation time
- Queue depth and processing rate

### Logging
- Info: Vector stored successfully
- Warn: ZeroDB unavailable, falling back
- Error: Storage failures, network errors

### Events
- `onDidStoreVector`: Successful vector storage
- `onDidStoreFail`: Storage failure with error details

## Future Enhancements

1. **Multi-model Embedding Support**: Support different embedding models
2. **Namespace Per Project**: Isolate prompts by workspace
3. **Prompt Clustering**: Group similar prompts automatically
4. **Feedback Loop**: Learn from user search behavior
5. **Hybrid Search**: Combine semantic + keyword search

## References

- ZeroDB MCP Server Guide: `.claude/commands/ZERODB-GUIDE.md`
- Embedding Service: `src/vs/workbench/services/aiEmbeddingVector/common/aiEmbeddingVectorService.ts`
- MCP Service: `src/vs/workbench/contrib/mcp/common/mcpService.ts`
- Agent Memory Service: `src/vs/workbench/contrib/ainative/common/agentMemoryService.ts`
