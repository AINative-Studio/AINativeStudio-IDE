# Testing MCP Servers

Comprehensive testing strategies for Model Context Protocol servers.

## Testing Strategy Overview

Every MCP server requires:
1. **Unit Tests**: Test individual tools in isolation
2. **Integration Tests**: Test server with real MCP client
3. **Error Handling Tests**: Verify all error paths
4. **Schema Validation Tests**: Test parameter validation

## Test Setup

### Project Structure

```
my-mcp-server/
├── src/
│   ├── index.ts
│   └── tools/
│       └── search.ts
├── tests/
│   ├── unit/
│   │   └── search.test.ts
│   ├── integration/
│   │   └── server.test.ts
│   └── helpers/
│       └── test-utils.ts
└── package.json
```

### Dependencies

```json
{
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  }
}
```

### Jest Configuration

```typescript
// jest.config.ts
import type { Config } from '@jest/globals';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

export default config;
```

## Unit Testing Tools

### Basic Tool Test

```typescript
// tests/unit/search.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { searchTool } from '../../src/tools/search.js';
import { ZeroDBClient } from '../../src/lib/zerodb-client.js';

// Mock ZeroDBClient
jest.mock('../../src/lib/zerodb-client.js');

describe('Search Tool', () => {
  let mockClient: jest.Mocked<ZeroDBClient>;

  beforeEach(() => {
    mockClient = new ZeroDBClient() as jest.Mocked<ZeroDBClient>;
    jest.clearAllMocks();
  });

  it('should search successfully with valid parameters', async () => {
    // Arrange
    const mockResults = [
      { id: '1', score: 0.95, metadata: { text: 'result 1' } },
      { id: '2', score: 0.85, metadata: { text: 'result 2' } }
    ];

    mockClient.search.mockResolvedValue(mockResults);

    // Act
    const result = await searchTool({
      table: 'test_table',
      query: 'test query',
      top_k: 5
    });

    // Assert
    expect(mockClient.search).toHaveBeenCalledWith({
      table: 'test_table',
      vector: expect.any(Array),
      top_k: 5
    });

    expect(result.content[0].type).toBe('text');
    const responseData = JSON.parse(result.content[0].text);
    expect(responseData.count).toBe(2);
    expect(responseData.results).toHaveLength(2);
  });

  it('should handle search errors gracefully', async () => {
    // Arrange
    mockClient.search.mockRejectedValue(new Error('Connection failed'));

    // Act
    const result = await searchTool({
      table: 'test_table',
      query: 'test query',
      top_k: 5
    });

    // Assert
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('Connection failed');
  });

  it('should use default top_k when not provided', async () => {
    // Arrange
    mockClient.search.mockResolvedValue([]);

    // Act
    await searchTool({
      table: 'test_table',
      query: 'test query'
    });

    // Assert
    expect(mockClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ top_k: 5 })
    );
  });

  it('should apply filters when provided', async () => {
    // Arrange
    const filters = { category: 'docs', status: 'active' };
    mockClient.search.mockResolvedValue([]);

    // Act
    await searchTool({
      table: 'test_table',
      query: 'test query',
      filters
    });

    // Assert
    expect(mockClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ filters })
    );
  });
});
```

### Testing Error Scenarios

```typescript
describe('Error Handling', () => {
  it('should handle network errors', async () => {
    mockClient.search.mockRejectedValue(new Error('Network timeout'));

    const result = await searchTool({
      table: 'test_table',
      query: 'test query'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Network timeout');
  });

  it('should handle authentication errors', async () => {
    mockClient.search.mockRejectedValue(new Error('Invalid API key'));

    const result = await searchTool({
      table: 'test_table',
      query: 'test query'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid API key');
  });

  it('should handle invalid table errors', async () => {
    mockClient.search.mockRejectedValue(new Error('Table not found'));

    const result = await searchTool({
      table: 'nonexistent_table',
      query: 'test query'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Table not found');
  });
});
```

## Integration Testing

### Testing with Real MCP Client

```typescript
// tests/integration/server.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

describe('MCP Server Integration', () => {
  let server: McpServer;
  let client: Client;
  let transport: InMemoryTransport;

  beforeAll(async () => {
    // Create server
    server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    // Register tools
    registerAllTools(server);

    // Create in-memory transport for testing
    const [clientTransport, serverTransport] = InMemoryTransport.createPair();

    // Connect server
    await server.connect(serverTransport);

    // Connect client
    client = new Client({
      name: 'test-client',
      version: '1.0.0',
    });
    await client.connect(clientTransport);

    transport = clientTransport;
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it('should list all available tools', async () => {
    const response = await client.listTools();

    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBeGreaterThan(0);

    const toolNames = response.tools.map(t => t.name);
    expect(toolNames).toContain('zerodb-search');
    expect(toolNames).toContain('zerodb-upsert');
  });

  it('should execute zerodb-search tool', async () => {
    const response = await client.callTool('zerodb-search', {
      table: 'test_table',
      query: 'test query',
      top_k: 5
    });

    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe('text');

    const data = JSON.parse(response.content[0].text);
    expect(data).toHaveProperty('query');
    expect(data).toHaveProperty('results');
  });

  it('should validate tool parameters', async () => {
    await expect(
      client.callTool('zerodb-search', {
        // Missing required 'table' parameter
        query: 'test query'
      })
    ).rejects.toThrow();
  });

  it('should handle tool errors gracefully', async () => {
    const response = await client.callTool('zerodb-search', {
      table: 'invalid_table',
      query: 'test query'
    });

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('Error');
  });
});
```

## Schema Validation Testing

```typescript
// tests/unit/schema-validation.test.ts
import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

const SearchParamsSchema = z.object({
  table: z.string(),
  query: z.string(),
  top_k: z.number().optional(),
  filters: z.record(z.string(), z.any()).optional()
});

describe('Schema Validation', () => {
  it('should validate correct parameters', () => {
    const params = {
      table: 'test_table',
      query: 'test query',
      top_k: 5,
      filters: { category: 'docs' }
    };

    const result = SearchParamsSchema.safeParse(params);
    expect(result.success).toBe(true);
  });

  it('should reject missing required parameters', () => {
    const params = {
      query: 'test query'
      // Missing 'table'
    };

    const result = SearchParamsSchema.safeParse(params);
    expect(result.success).toBe(false);
  });

  it('should reject invalid parameter types', () => {
    const params = {
      table: 'test_table',
      query: 123,  // Should be string
      top_k: 5
    };

    const result = SearchParamsSchema.safeParse(params);
    expect(result.success).toBe(false);
  });

  it('should allow optional parameters to be omitted', () => {
    const params = {
      table: 'test_table',
      query: 'test query'
      // top_k and filters omitted
    };

    const result = SearchParamsSchema.safeParse(params);
    expect(result.success).toBe(true);
  });
});
```

## Test Helpers

```typescript
// tests/helpers/test-utils.ts

export function createMockZeroDBClient() {
  return {
    search: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn()
  };
}

export function createMockEmbedding(dimension: number = 1536): number[] {
  return new Array(dimension).fill(0).map(() => Math.random());
}

export async function setupTestServer() {
  const server = new McpServer({
    name: 'test-server',
    version: '1.0.0',
  });

  registerAllTools(server);

  return server;
}

export function expectToolResponse(response: any) {
  expect(response).toBeDefined();
  expect(response.content).toBeDefined();
  expect(Array.isArray(response.content)).toBe(true);
  expect(response.content.length).toBeGreaterThan(0);
}

export function expectErrorResponse(response: any, errorMessage?: string) {
  expect(response.isError).toBe(true);
  expect(response.content[0].text).toContain('Error');
  if (errorMessage) {
    expect(response.content[0].text).toContain(errorMessage);
  }
}
```

## Performance Testing

```typescript
// tests/integration/performance.test.ts
import { describe, it, expect } from '@jest/globals';

describe('Performance Tests', () => {
  it('should handle concurrent requests', async () => {
    const requests = Array(10).fill(null).map((_, i) =>
      client.callTool('zerodb-search', {
        table: 'test_table',
        query: `query ${i}`,
        top_k: 5
      })
    );

    const startTime = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;

    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result.content).toBeDefined();
    });

    // Should complete within reasonable time
    expect(duration).toBeLessThan(5000);
  });

  it('should handle large result sets', async () => {
    const response = await client.callTool('zerodb-search', {
      table: 'large_table',
      query: 'test query',
      top_k: 100
    });

    const data = JSON.parse(response.content[0].text);
    expect(data.results.length).toBeLessThanOrEqual(100);
  });
});
```

## End-to-End Testing

```typescript
// tests/e2e/workflow.test.ts
import { describe, it, expect } from '@jest/globals';

describe('E2E Workflow', () => {
  it('should complete full vector search workflow', async () => {
    // 1. Create table
    const createResponse = await client.callTool('zerodb-table-create', {
      name: 'e2e_test_table',
      dimension: 1536,
      metric: 'cosine'
    });
    expect(createResponse.content).toBeDefined();

    // 2. Upsert vectors
    const upsertResponse = await client.callTool('zerodb-upsert', {
      table: 'e2e_test_table',
      vectors: [
        { id: '1', text: 'first document', metadata: { type: 'doc' } },
        { id: '2', text: 'second document', metadata: { type: 'doc' } }
      ]
    });
    expect(upsertResponse.content).toBeDefined();

    // 3. Search vectors
    const searchResponse = await client.callTool('zerodb-search', {
      table: 'e2e_test_table',
      query: 'document',
      top_k: 5
    });

    const searchData = JSON.parse(searchResponse.content[0].text);
    expect(searchData.results.length).toBeGreaterThan(0);

    // 4. Cleanup - delete table
    const deleteResponse = await client.callTool('zerodb-table-delete', {
      name: 'e2e_test_table'
    });
    expect(deleteResponse.content).toBeDefined();
  });
});
```

## Coverage Requirements

### Minimum Coverage Thresholds

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### Coverage Report

```bash
# Run tests with coverage
npm test -- --coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test MCP Server

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run typecheck

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Testing Checklist

Before releasing an MCP server:

- [ ] All tools have unit tests
- [ ] Integration tests pass with real MCP client
- [ ] Error scenarios are tested
- [ ] Schema validation is tested
- [ ] Coverage meets 80% threshold
- [ ] Performance tests pass
- [ ] E2E workflows are tested
- [ ] CI/CD pipeline is green
- [ ] Documentation includes test examples
