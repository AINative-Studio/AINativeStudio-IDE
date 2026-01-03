---
name: mcp-development
description: MCP server development patterns extending Anthropic's mcp-builder with AINative-specific conventions. Use when creating MCP servers, integrating ZeroDB, or building tool-based AI systems.
version: 1.0.0
author: AINative Studio
tags: [mcp, zerodb, tools, server-development]
extends: mcp-builder
---

# MCP Development Skill

Expert guidance for building Model Context Protocol (MCP) servers with AINative-specific conventions and ZeroDB integration.

## When to Use This Skill

Use this skill when:
1. Creating new MCP servers from scratch
2. Adding tools to existing MCP servers
3. Integrating ZeroDB with MCP servers
4. Building AI agent tool systems
5. Testing MCP server implementations
6. Following AINative MCP conventions

## Core Principles

### 1. Tool Naming Convention
**ALWAYS use kebab-case** for tool names:
- ✅ `zerodb-search`, `vector-upsert`, `postgres-query`
- ❌ `zerodbSearch`, `VectorUpsert`, `postgresQuery`

### 2. Consistent Error Handling
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
Use Zod schemas for all tool parameters with descriptive messages:
```typescript
{
  query: z.string().describe('Search query for semantic similarity'),
  top_k: z.number().optional().describe('Number of results to return (default: 5)')
}
```

## Project Structure

Standard AINative MCP server layout:
```
my-mcp-server/
├── src/
│   ├── index.ts          # Server setup and registration
│   ├── tools/            # Tool implementations
│   │   ├── search.ts
│   │   └── upsert.ts
│   └── lib/              # Shared utilities
│       └── client.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start Template

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// Register a tool
server.tool(
  'example-tool',
  'Description of what this tool does',
  {
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional().describe('Optional parameter')
  },
  async ({ param1, param2 = 10 }) => {
    try {
      const result = await performOperation(param1, param2);
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

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Reference Documentation

Detailed patterns and examples in the `references/` directory:

- **ainative-conventions.md**: AINative-specific MCP patterns
- **zerodb-integration.md**: ZeroDB tool integration examples
- **tool-naming.md**: Naming standards and best practices
- **testing-mcps.md**: Testing strategies for MCP servers

## Common Patterns

### Pattern 1: ZeroDB Vector Search Tool
See `references/zerodb-integration.md` for full implementation.

### Pattern 2: Multi-Step Tool with State
```typescript
server.tool(
  'multi-step-operation',
  'Performs operation across multiple steps',
  { input: z.string() },
  async ({ input }) => {
    const step1 = await firstStep(input);
    const step2 = await secondStep(step1);
    const final = await finalStep(step2);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          steps: ['first', 'second', 'final'],
          result: final
        }, null, 2)
      }]
    };
  }
);
```

### Pattern 3: Resource Provider
```typescript
server.resource(
  'config://settings',
  'Server configuration settings',
  async () => {
    const config = await loadConfig();
    return {
      contents: [{
        uri: 'config://settings',
        mimeType: 'application/json',
        text: JSON.stringify(config, null, 2)
      }]
    };
  }
);
```

## Testing Requirements

1. **Unit Tests**: Test each tool in isolation
2. **Integration Tests**: Test server with real MCP client
3. **Error Cases**: Verify error handling for all failure modes
4. **Schema Validation**: Test parameter validation with Zod

See `references/testing-mcps.md` for detailed testing patterns.

## AINative Integration

### Environment Variables
```bash
ZERODB_API_KEY=your_api_key
ZERODB_PROJECT_ID=your_project_id
MCP_SERVER_PORT=3000  # If using HTTP transport
```

### Configuration in package.json
```json
{
  "name": "@ainative/mcp-my-server",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mcp-my-server": "./build/index.js"
  }
}
```

## Best Practices

1. **Always validate input**: Use Zod schemas for type safety
2. **Provide helpful descriptions**: Tool and parameter descriptions help AI understand usage
3. **Handle errors gracefully**: Return structured errors with `isError: true`
4. **Use semantic versioning**: Version your MCP servers properly
5. **Document tool behavior**: Include examples in descriptions
6. **Test thoroughly**: Unit, integration, and error path testing

## Common Pitfalls

❌ **Avoid**:
- camelCase or PascalCase tool names
- Throwing unhandled errors
- Missing parameter descriptions
- Hardcoded configuration
- Synchronous blocking operations

✅ **Instead**:
- Use kebab-case tool names
- Catch all errors and return structured responses
- Add descriptive Zod schema messages
- Use environment variables for config
- Use async/await for all I/O operations

## Next Steps

After reading this skill:
1. Review `references/ainative-conventions.md` for detailed patterns
2. Check `references/zerodb-integration.md` for ZeroDB examples
3. Follow `references/testing-mcps.md` for testing guidance
4. Use the quick start template to create your first server
