# ZeroDB MCP Integration

Complete examples for integrating ZeroDB with MCP servers using AINative conventions.

## ZeroDB Client Setup

```typescript
// src/lib/zerodb-client.ts
import { z } from 'zod';

const ConfigSchema = z.object({
  apiKey: z.string(),
  projectId: z.string(),
  endpoint: z.string().url().default('https://api.zerodb.io')
});

export class ZeroDBClient {
  private config: z.infer<typeof ConfigSchema>;

  constructor() {
    this.config = ConfigSchema.parse({
      apiKey: process.env.ZERODB_API_KEY,
      projectId: process.env.ZERODB_PROJECT_ID,
      endpoint: process.env.ZERODB_ENDPOINT
    });
  }

  async search(params: {
    table: string;
    vector: number[];
    top_k?: number;
    filters?: Record<string, any>;
  }) {
    const response = await fetch(`${this.config.endpoint}/vector/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project_id: this.config.projectId,
        ...params
      })
    });

    if (!response.ok) {
      throw new Error(`ZeroDB search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async upsert(params: {
    table: string;
    vectors: Array<{
      id: string;
      values: number[];
      metadata?: Record<string, any>;
    }>;
  }) {
    const response = await fetch(`${this.config.endpoint}/vector/upsert`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project_id: this.config.projectId,
        ...params
      })
    });

    if (!response.ok) {
      throw new Error(`ZeroDB upsert failed: ${response.statusText}`);
    }

    return response.json();
  }
}
```

## Tool: zerodb-search

Vector search with semantic similarity:

```typescript
// src/tools/search.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ZeroDBClient } from '../lib/zerodb-client.js';

export function registerSearchTool(server: McpServer) {
  server.tool(
    'zerodb-search',
    'Search ZeroDB for semantically similar vectors',
    {
      table: z.string()
        .describe('Name of the vector table to search'),

      query: z.string()
        .describe('Text query to convert to embedding and search'),

      top_k: z.number()
        .optional()
        .describe('Number of results to return (default: 5, max: 100)'),

      filters: z.record(z.string(), z.any())
        .optional()
        .describe('Metadata filters as key-value pairs')
    },
    async ({ table, query, top_k = 5, filters }) => {
      try {
        const client = new ZeroDBClient();

        // Generate embedding from query text
        const embedding = await generateEmbedding(query);

        // Search ZeroDB
        const results = await client.search({
          table,
          vector: embedding,
          top_k,
          filters
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              query,
              table,
              count: results.length,
              results: results.map((r: any) => ({
                id: r.id,
                score: r.score,
                metadata: r.metadata
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error searching ZeroDB: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}

// Helper function to generate embeddings
async function generateEmbedding(text: string): Promise<number[]> {
  // Use your preferred embedding model
  // Example with OpenAI:
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

## Tool: zerodb-upsert

Insert or update vectors with metadata:

```typescript
// src/tools/upsert.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ZeroDBClient } from '../lib/zerodb-client.js';

const VectorSchema = z.object({
  id: z.string().describe('Unique identifier for the vector'),
  text: z.string().describe('Text to convert to embedding'),
  metadata: z.record(z.string(), z.any())
    .optional()
    .describe('Additional metadata to store with vector')
});

export function registerUpsertTool(server: McpServer) {
  server.tool(
    'zerodb-upsert',
    'Insert or update vectors in ZeroDB with automatic embedding generation',
    {
      table: z.string()
        .describe('Name of the vector table'),

      vectors: z.array(VectorSchema)
        .describe('Array of vectors to upsert')
    },
    async ({ table, vectors }) => {
      try {
        const client = new ZeroDBClient();

        // Generate embeddings for all vectors
        const vectorsWithEmbeddings = await Promise.all(
          vectors.map(async (v) => ({
            id: v.id,
            values: await generateEmbedding(v.text),
            metadata: {
              ...v.metadata,
              text: v.text,
              created_at: new Date().toISOString()
            }
          }))
        );

        // Upsert to ZeroDB
        const result = await client.upsert({
          table,
          vectors: vectorsWithEmbeddings
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              table,
              upserted: result.upserted_count,
              vectors: vectors.map(v => v.id)
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error upserting to ZeroDB: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
```

## Tool: zerodb-table-create

Create a new vector table:

```typescript
// src/tools/table.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerTableTools(server: McpServer) {
  server.tool(
    'zerodb-table-create',
    'Create a new vector table in ZeroDB',
    {
      name: z.string()
        .describe('Name of the table to create'),

      dimension: z.number()
        .describe('Vector dimension (e.g., 1536 for text-embedding-3-small)'),

      metric: z.enum(['cosine', 'euclidean', 'dotProduct'])
        .optional()
        .describe('Distance metric for similarity search (default: cosine)')
    },
    async ({ name, dimension, metric = 'cosine' }) => {
      try {
        const config = {
          apiKey: process.env.ZERODB_API_KEY!,
          projectId: process.env.ZERODB_PROJECT_ID!,
          endpoint: process.env.ZERODB_ENDPOINT || 'https://api.zerodb.io'
        };

        const response = await fetch(`${config.endpoint}/table/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            project_id: config.projectId,
            name,
            dimension,
            metric
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to create table: ${response.statusText}`);
        }

        const result = await response.json();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              message: 'Table created successfully',
              table: {
                name,
                dimension,
                metric,
                id: result.table_id
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error creating table: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
```

## Tool: zerodb-memory-store

Store conversation memory for AI agents:

```typescript
// src/tools/memory.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ZeroDBClient } from '../lib/zerodb-client.js';

export function registerMemoryTools(server: McpServer) {
  server.tool(
    'zerodb-memory-store',
    'Store conversation memory in ZeroDB for long-term agent context',
    {
      session_id: z.string()
        .describe('Unique session identifier'),

      message: z.string()
        .describe('Message or context to store'),

      metadata: z.record(z.string(), z.any())
        .optional()
        .describe('Additional metadata (user_id, timestamp, tags, etc.)')
    },
    async ({ session_id, message, metadata = {} }) => {
      try {
        const client = new ZeroDBClient();
        const embedding = await generateEmbedding(message);

        const result = await client.upsert({
          table: 'agent_memory',
          vectors: [{
            id: `${session_id}-${Date.now()}`,
            values: embedding,
            metadata: {
              session_id,
              message,
              timestamp: new Date().toISOString(),
              ...metadata
            }
          }]
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              stored: true,
              session_id,
              message_preview: message.substring(0, 100)
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error storing memory: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'zerodb-memory-search',
    'Search stored conversation memory for relevant context',
    {
      session_id: z.string()
        .describe('Session identifier to search within'),

      query: z.string()
        .describe('Query to find relevant memories'),

      top_k: z.number()
        .optional()
        .describe('Number of memories to retrieve (default: 5)')
    },
    async ({ session_id, query, top_k = 5 }) => {
      try {
        const client = new ZeroDBClient();
        const embedding = await generateEmbedding(query);

        const results = await client.search({
          table: 'agent_memory',
          vector: embedding,
          top_k,
          filters: { session_id }
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              query,
              session_id,
              memories: results.map((r: any) => ({
                message: r.metadata.message,
                timestamp: r.metadata.timestamp,
                relevance_score: r.score
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error searching memory: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
```

## Complete Server Example

```typescript
// src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerSearchTool } from './tools/search.js';
import { registerUpsertTool } from './tools/upsert.js';
import { registerTableTools } from './tools/table.js';
import { registerMemoryTools } from './tools/memory.js';

const server = new McpServer({
  name: 'zerodb-mcp-server',
  version: '1.0.0',
});

// Register all ZeroDB tools
registerSearchTool(server);
registerUpsertTool(server);
registerTableTools(server);
registerMemoryTools(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ZeroDB MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

## Environment Setup

```bash
# .env
ZERODB_API_KEY=your_api_key_here
ZERODB_PROJECT_ID=your_project_id
ZERODB_ENDPOINT=https://api.zerodb.io
OPENAI_API_KEY=your_openai_key_for_embeddings
```

## Testing ZeroDB Tools

```typescript
// tests/tools/search.test.ts
import { describe, it, expect, beforeAll } from '@jest/globals';
import { ZeroDBClient } from '../../src/lib/zerodb-client.js';

describe('ZeroDB Search Tool', () => {
  let client: ZeroDBClient;

  beforeAll(() => {
    client = new ZeroDBClient();
  });

  it('should search vectors successfully', async () => {
    const results = await client.search({
      table: 'test_table',
      vector: new Array(1536).fill(0.1),
      top_k: 5
    });

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle search errors gracefully', async () => {
    await expect(
      client.search({
        table: 'nonexistent_table',
        vector: [],
        top_k: 5
      })
    ).rejects.toThrow();
  });
});
```
