# @ainative/skill-mcp-development

Expert guidance for building Model Context Protocol (MCP) servers with AINative-specific conventions and ZeroDB integration.

## Installation

Install the skill package:

```bash
npm install @ainative/skill-mcp-development
```

Or add to your AINative Studio skills directory:

```bash
cd ~/.ainative/skills
git clone https://github.com/ainative/ainative-studio.git
ln -s ainative-studio/skills/mcp-development ./mcp-development
```

## What This Skill Provides

This skill extends Anthropic's `mcp-builder` skill with AINative-specific patterns:

- **Naming Conventions**: Kebab-case tool naming standards
- **Error Handling**: Consistent error response patterns
- **ZeroDB Integration**: Vector search, upsert, and memory tools
- **Schema Design**: Zod-based parameter validation
- **Testing Strategies**: Comprehensive testing patterns
- **Project Structure**: Standard MCP server layout

## When to Use This Skill

Invoke this skill when:

1. **Creating MCP Servers**: Building new MCP servers from scratch
2. **Adding Tools**: Implementing new MCP tools
3. **ZeroDB Integration**: Adding ZeroDB vector search or storage
4. **Agent Systems**: Building AI agent tool systems
5. **Testing MCP**: Writing tests for MCP server implementations

## Quick Start

### 1. Create a New MCP Server

```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node
```

### 2. Basic Server Template

```typescript
// src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

server.tool(
  'example-tool',
  'Description of what this tool does',
  {
    param1: z.string().describe('Parameter description')
  },
  async ({ param1 }) => {
    try {
      const result = await performOperation(param1);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3. Add ZeroDB Integration

```typescript
// src/tools/search.ts
import { z } from 'zod';
import { ZeroDBClient } from '../lib/zerodb-client.js';

export function registerSearchTool(server: McpServer) {
  server.tool(
    'zerodb-search',
    'Search ZeroDB for semantically similar vectors',
    {
      table: z.string().describe('Name of the vector table'),
      query: z.string().describe('Search query text'),
      top_k: z.number().optional().describe('Number of results (default: 5)')
    },
    async ({ table, query, top_k = 5 }) => {
      try {
        const client = new ZeroDBClient();
        const embedding = await generateEmbedding(query);
        const results = await client.search({ table, vector: embedding, top_k });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              query,
              count: results.length,
              results
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
```

## Core Principles

### 1. Tool Naming Convention

**ALWAYS use kebab-case** for tool names:

```typescript
✅ server.tool('zerodb-search', ...);
✅ server.tool('vector-upsert', ...);
❌ server.tool('zerodbSearch', ...);
❌ server.tool('VectorUpsert', ...);
```

### 2. Error Handling

All tools must return structured error responses:

```typescript
try {
  const result = await operation();
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
  };
} catch (error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true
  };
}
```

### 3. Schema-First Design

Use Zod schemas with descriptive messages:

```typescript
{
  query: z.string().describe('Search query for semantic similarity'),
  top_k: z.number().optional().describe('Number of results (default: 5)')
}
```

## Reference Documentation

Detailed patterns in the `references/` directory:

- **ainative-conventions.md**: AINative-specific MCP patterns
- **zerodb-integration.md**: ZeroDB tool integration examples
- **tool-naming.md**: Naming standards and best practices
- **testing-mcps.md**: Testing strategies for MCP servers

## Example Tools

### Vector Search

```typescript
server.tool('zerodb-search', 'Search vectors', schema, async (params) => {
  const results = await client.search(params);
  return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
});
```

### Memory Storage

```typescript
server.tool('zerodb-memory-store', 'Store agent memory', schema, async (params) => {
  await client.upsert({ table: 'memory', vectors: [params] });
  return { content: [{ type: "text", text: "Memory stored" }] };
});
```

## Testing

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Search Tool', () => {
  it('should search successfully', async () => {
    const result = await searchTool({ table: 'test', query: 'query', top_k: 5 });
    expect(result.content).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const result = await searchTool({ table: 'invalid', query: 'query' });
    expect(result.isError).toBe(true);
  });
});
```

## Environment Variables

```bash
ZERODB_API_KEY=your_api_key
ZERODB_PROJECT_ID=your_project_id
ZERODB_ENDPOINT=https://api.zerodb.io
```

## Best Practices

1. **Validate input**: Use Zod schemas for type safety
2. **Provide descriptions**: Help AI understand tool usage
3. **Handle errors gracefully**: Return structured errors
4. **Test thoroughly**: Unit, integration, and error path testing
5. **Use semantic versioning**: Version your servers properly

## Contributing

Contributions welcome! Please follow:

- AINative coding standards
- Kebab-case tool naming
- 80% test coverage minimum
- Comprehensive documentation

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: [AINative Studio Docs](https://docs.ainative.studio)
- **Issues**: [GitHub Issues](https://github.com/ainative/ainative-studio/issues)
- **Discord**: [AINative Community](https://discord.gg/ainative)

## Related Skills

- `@ainative/skill-zerodb`: ZeroDB database patterns
- `@ainative/skill-backend-api`: Backend API development
- `mcp-builder`: Anthropic's base MCP builder skill
