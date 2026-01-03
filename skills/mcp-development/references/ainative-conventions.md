# AINative MCP Conventions

Standardized patterns for building MCP servers in the AINative ecosystem.

## Project Structure

```
my-mcp-server/
├── src/
│   ├── index.ts          # Main entry point with server setup
│   ├── tools/            # Tool definitions (one file per tool or grouped)
│   │   ├── search.ts
│   │   ├── upsert.ts
│   │   └── delete.ts
│   ├── resources/        # Resource providers (optional)
│   │   └── config.ts
│   └── lib/              # Shared utilities and clients
│       ├── client.ts
│       └── validation.ts
├── tests/                # Test files
│   ├── tools/
│   │   └── search.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Tool Naming Conventions

### Standard Format
All tools **MUST** use kebab-case:

```typescript
// ✅ Correct
server.tool('zerodb-search', ...);
server.tool('vector-upsert', ...);
server.tool('postgres-query', ...);
server.tool('file-upload', ...);

// ❌ Incorrect
server.tool('zerodbSearch', ...);
server.tool('VectorUpsert', ...);
server.tool('postgresQuery', ...);
```

### Naming Patterns
- **Action-Resource**: `{action}-{resource}` (e.g., `create-table`, `delete-vector`)
- **Service-Action**: `{service}-{action}` (e.g., `zerodb-search`, `postgres-query`)
- **Multi-word**: Use hyphens (e.g., `get-user-profile`, `send-email-notification`)

## Error Handling Pattern

### Standard Error Response

```typescript
import { z } from 'zod';

server.tool(
  'example-tool',
  'Tool description',
  { input: z.string() },
  async ({ input }) => {
    try {
      const result = await performOperation(input);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      // Standard error handling
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);

      return {
        content: [{
          type: "text",
          text: `Error: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);
```

### Error Types

Provide specific error types for better debugging:

```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

// In tool handler
catch (error) {
  let errorType = 'UnknownError';
  let errorMessage = String(error);

  if (error instanceof ValidationError) {
    errorType = 'ValidationError';
    errorMessage = error.message;
  } else if (error instanceof ConnectionError) {
    errorType = 'ConnectionError';
    errorMessage = error.message;
  } else if (error instanceof Error) {
    errorType = error.name;
    errorMessage = error.message;
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        error: errorType,
        message: errorMessage
      }, null, 2)
    }],
    isError: true
  };
}
```

## Schema Design

### Descriptive Parameters

Always provide helpful descriptions for AI agents:

```typescript
{
  query: z.string()
    .describe('Search query for semantic similarity matching'),

  top_k: z.number()
    .optional()
    .describe('Number of results to return (default: 5, max: 100)'),

  table: z.string()
    .describe('Name of the table to query'),

  filters: z.record(z.string(), z.any())
    .optional()
    .describe('Key-value pairs for filtering results')
}
```

### Complex Schemas

For complex nested data:

```typescript
const VectorSchema = z.object({
  id: z.string().describe('Unique identifier for the vector'),
  values: z.array(z.number()).describe('Vector embedding values'),
  metadata: z.record(z.string(), z.any())
    .optional()
    .describe('Additional metadata as key-value pairs')
});

server.tool(
  'vector-upsert',
  'Upsert a vector with metadata',
  {
    table: z.string().describe('Target table name'),
    vector: VectorSchema
  },
  async ({ table, vector }) => {
    // Implementation
  }
);
```

## Server Configuration

### Standard Setup

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// Register tools
import { registerSearchTools } from './tools/search.js';
import { registerUpsertTools } from './tools/upsert.js';

registerSearchTools(server);
registerUpsertTools(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### Environment Configuration

```typescript
// lib/config.ts
import { z } from 'zod';

const ConfigSchema = z.object({
  apiKey: z.string(),
  projectId: z.string(),
  endpoint: z.string().url().optional(),
  timeout: z.number().optional().default(30000)
});

export function loadConfig() {
  const config = {
    apiKey: process.env.ZERODB_API_KEY,
    projectId: process.env.ZERODB_PROJECT_ID,
    endpoint: process.env.ZERODB_ENDPOINT,
    timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : undefined
  };

  return ConfigSchema.parse(config);
}
```

## Response Formatting

### JSON Responses

Always pretty-print JSON for readability:

```typescript
return {
  content: [{
    type: "text",
    text: JSON.stringify(result, null, 2)
  }]
};
```

### List Responses

Format lists consistently:

```typescript
const results = await search(query);

return {
  content: [{
    type: "text",
    text: JSON.stringify({
      count: results.length,
      results: results.map(r => ({
        id: r.id,
        score: r.score,
        metadata: r.metadata
      }))
    }, null, 2)
  }]
};
```

### Multi-Part Responses

For complex responses with multiple sections:

```typescript
return {
  content: [
    {
      type: "text",
      text: `# Search Results\n\nFound ${results.length} matches`
    },
    {
      type: "text",
      text: JSON.stringify(results, null, 2)
    }
  ]
};
```

## Resource Providers

### Standard Resource Pattern

```typescript
server.resource(
  'config://database',
  'Database configuration and status',
  async () => {
    const config = await getDatabaseConfig();

    return {
      contents: [{
        uri: 'config://database',
        mimeType: 'application/json',
        text: JSON.stringify(config, null, 2)
      }]
    };
  }
);
```

## Logging

### Standard Logging Pattern

Use stderr for logging (stdout is for MCP protocol):

```typescript
function logInfo(message: string, data?: any) {
  console.error(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
}

function logError(message: string, error?: any) {
  console.error(`[ERROR] ${message}`, error ? error.message : '');
}

// In tool handler
async ({ query }) => {
  logInfo('Executing search', { query });

  try {
    const result = await search(query);
    logInfo('Search completed', { resultCount: result.length });
    return result;
  } catch (error) {
    logError('Search failed', error);
    throw error;
  }
}
```

## Package.json Configuration

```json
{
  "name": "@ainative/mcp-my-server",
  "version": "1.0.0",
  "description": "MCP server for XYZ functionality",
  "type": "module",
  "main": "./build/index.js",
  "bin": {
    "mcp-my-server": "./build/index.js"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "test": "jest",
    "prepare": "npm run build"
  },
  "keywords": ["mcp", "ainative", "tool"],
  "author": "AINative Studio",
  "license": "MIT"
}
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "tests"]
}
```
