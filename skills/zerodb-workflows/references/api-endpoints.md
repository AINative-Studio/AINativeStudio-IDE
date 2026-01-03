# ZeroDB API Endpoints Reference

Complete reference for ZeroDB API endpoints with TypeScript examples.

## Authentication

All API requests require authentication via API key:

```typescript
import { ZeroDBClient } from '@zerodb/client';

const client = new ZeroDBClient({
  apiKey: process.env.ZERODB_API_KEY,
  baseURL: 'https://api.zerodb.ai/v1' // Optional, defaults to production
});
```

## Project Management

### Get Project Info
```typescript
interface ProjectInfo {
  id: string;
  name: string;
  created_at: number;
  vector_count: number;
  table_count: number;
  storage_bytes: number;
}

const info: ProjectInfo = await client.project.info();
```

### Get Project Statistics
```typescript
interface ProjectStats {
  vectors: {
    total: number;
    dimensions: Record<number, number>; // dimension -> count
  };
  tables: {
    total: number;
    total_rows: number;
  };
  storage: {
    bytes: number;
    files: number;
  };
  api_usage: {
    requests_today: number;
    requests_month: number;
  };
}

const stats: ProjectStats = await client.project.stats();
```

## Vector Operations

### Upsert Vector
```typescript
interface VectorUpsertRequest {
  id: string;                    // Unique identifier
  embedding: number[];           // Dense vector (384, 768, 1024, or 1536 dims)
  metadata?: Record<string, any>; // Arbitrary JSON metadata
}

interface VectorUpsertResponse {
  id: string;
  created: boolean;  // true if new, false if updated
}

const result = await client.vector.upsert({
  id: 'doc_123',
  embedding: [0.1, 0.2, ...], // Must match project dimension
  metadata: {
    title: 'API Documentation',
    category: 'engineering',
    tags: ['api', 'rest', 'backend'],
    timestamp: Date.now(),
    author: 'user_456'
  }
});
```

### Batch Upsert (Recommended for >10 vectors)
```typescript
interface BatchUpsertRequest {
  vectors: VectorUpsertRequest[];
  batch_size?: number; // Default 100, max 1000
}

interface BatchUpsertResponse {
  inserted: number;
  updated: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

const result = await client.vector.batchUpsert({
  vectors: [
    { id: 'vec_1', embedding: [...], metadata: {...} },
    { id: 'vec_2', embedding: [...], metadata: {...} },
    // ... up to 1000 vectors
  ],
  batch_size: 100
});
```

### Search Vectors
```typescript
interface VectorSearchRequest {
  embedding: number[];              // Query vector
  topK: number;                     // Number of results (1-100)
  filters?: MetadataFilter;         // Optional metadata filters
  include_metadata?: boolean;       // Default true
  include_embeddings?: boolean;     // Default false (saves bandwidth)
  min_score?: number;               // Minimum similarity score (0-1)
}

interface VectorSearchResult {
  id: string;
  score: number;                    // Cosine similarity (0-1)
  metadata?: Record<string, any>;
  embedding?: number[];
}

interface VectorSearchResponse {
  results: VectorSearchResult[];
  query_time_ms: number;
}

const response = await client.vector.search({
  embedding: queryEmbedding,
  topK: 10,
  filters: {
    category: 'engineering',
    timestamp: { $gt: Date.now() - 86400000 }
  },
  min_score: 0.7
});
```

### List Vectors (Pagination)
```typescript
interface VectorListRequest {
  limit?: number;      // Default 100, max 1000
  offset?: number;     // Default 0
  filters?: MetadataFilter;
}

interface VectorListResponse {
  vectors: Array<{
    id: string;
    metadata: Record<string, any>;
    created_at: number;
  }>;
  total: number;
  has_more: boolean;
}

const response = await client.vector.list({
  limit: 100,
  offset: 0,
  filters: { category: 'engineering' }
});
```

### Delete Vector
```typescript
await client.vector.delete('vec_123');

// Batch delete
await client.vector.batchDelete(['vec_1', 'vec_2', 'vec_3']);
```

## Metadata Filtering

### Filter Operators
```typescript
type MetadataFilter = {
  [key: string]:
    | any                          // Exact match
    | { $gt: number }              // Greater than
    | { $gte: number }             // Greater than or equal
    | { $lt: number }              // Less than
    | { $lte: number }             // Less than or equal
    | { $ne: any }                 // Not equal
    | { $in: any[] }               // In array
    | { $nin: any[] }              // Not in array
    | { $exists: boolean }         // Field exists
    | { $regex: string }           // Regex match (string fields)
};
```

### Filter Examples
```typescript
// Exact match
{ category: 'engineering' }

// Numeric comparison
{ timestamp: { $gt: Date.now() - 86400000 } }

// Multiple conditions (AND)
{
  category: 'engineering',
  priority: { $gte: 3 },
  status: { $in: ['active', 'pending'] }
}

// Array membership
{ tags: { $in: ['api', 'backend'] } }

// Field existence
{ reviewed_by: { $exists: true } }

// Regex matching
{ title: { $regex: '^API' } } // Starts with "API"
```

## Table Operations (NoSQL)

### Create Table
```typescript
interface TableSchema {
  [column: string]: 'string' | 'number' | 'boolean' | 'json';
}

await client.table.create({
  name: 'user_sessions',
  schema: {
    user_id: 'string',
    session_id: 'string',
    started_at: 'number',
    metadata: 'json'
  },
  primary_key: 'session_id',
  indexes: ['user_id', 'started_at'] // Optional secondary indexes
});
```

### Insert Rows
```typescript
await client.table.insert({
  table: 'user_sessions',
  rows: [
    {
      user_id: 'user_123',
      session_id: 'sess_abc',
      started_at: Date.now(),
      metadata: { browser: 'Chrome', ip: '192.168.1.1' }
    }
  ]
});
```

### Query Table
```typescript
interface TableQueryRequest {
  table: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  order_by?: string;
  order?: 'asc' | 'desc';
}

const results = await client.table.query({
  table: 'user_sessions',
  filters: {
    user_id: 'user_123',
    started_at: { $gt: Date.now() - 3600000 }
  },
  limit: 50,
  order_by: 'started_at',
  order: 'desc'
});
```

### Update Rows
```typescript
await client.table.update({
  table: 'user_sessions',
  filters: { session_id: 'sess_abc' },
  data: {
    metadata: { browser: 'Firefox', ip: '192.168.1.2' }
  }
});
```

## File Storage

### Upload File
```typescript
import { createReadStream } from 'fs';

interface FileUploadResponse {
  file_id: string;
  filename: string;
  size_bytes: number;
  content_type: string;
  url: string; // Permanent storage URL
}

const result = await client.file.upload({
  filename: 'document.pdf',
  data: createReadStream('./document.pdf'),
  content_type: 'application/pdf',
  metadata: {
    uploaded_by: 'user_123',
    category: 'contracts'
  }
});
```

### Download File
```typescript
const fileBuffer = await client.file.download('file_abc123');

// Or get presigned URL (expires in 1 hour)
const url = await client.file.getUrl('file_abc123', { expires_in: 3600 });
```

### List Files
```typescript
const files = await client.file.list({
  limit: 100,
  filters: { category: 'contracts' }
});
```

## Memory Management

### Store Memory
```typescript
await client.memory.store({
  content: 'User prefers concise responses without excessive detail',
  metadata: {
    user_id: 'user_123',
    type: 'preference',
    confidence: 0.95,
    learned_at: Date.now()
  }
});
```

### Search Memory
```typescript
const memories = await client.memory.search({
  query: 'How does the user like responses formatted?',
  user_id: 'user_123',
  topK: 5
});
```

### Get Context Window
```typescript
interface ContextWindowRequest {
  user_id: string;
  session_id?: string;
  max_tokens?: number; // Limit total context size
  topK?: number;
}

const context = await client.memory.getContext({
  user_id: 'user_123',
  session_id: 'sess_current',
  max_tokens: 2000,
  topK: 10
});
```

## RLHF Feedback

### Submit Feedback
```typescript
interface RLHFFeedbackRequest {
  prompt_id: string;
  response_id: string;
  rating: number;              // 1-5 scale
  feedback_type: 'quality' | 'accuracy' | 'helpfulness' | 'safety';
  metadata?: {
    model?: string;
    latency_ms?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    user_comment?: string;
    [key: string]: any;
  };
}

await client.rlhf.feedback({
  prompt_id: 'prompt_123',
  response_id: 'resp_456',
  rating: 4,
  feedback_type: 'quality',
  metadata: {
    model: 'claude-3-sonnet',
    latency_ms: 1250,
    user_comment: 'Good but verbose'
  }
});
```

## Error Handling

### Standard Error Response
```typescript
interface ZeroDBError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  request_id: string;
}

// Error codes
// - invalid_request: Bad request parameters
// - unauthorized: Invalid API key
// - not_found: Resource not found
// - rate_limit_exceeded: Too many requests
// - server_error: Internal server error
```

### Retry Pattern
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  backoffMs = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Only retry on network/server errors
      if (error.error?.code === 'server_error' || error.code === 'ECONNRESET') {
        await new Promise(resolve => setTimeout(resolve, backoffMs * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const result = await withRetry(() => client.vector.search({...}));
```

## Rate Limits

- **Free Tier**: 100 requests/minute, 10,000 vectors
- **Pro Tier**: 1,000 requests/minute, 1M vectors
- **Enterprise**: Custom limits

Rate limit headers included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1672531200
```
