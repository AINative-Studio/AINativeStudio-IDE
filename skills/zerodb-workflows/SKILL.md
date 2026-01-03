---
name: zerodb-workflows
description: ZeroDB vector database best practices, semantic search patterns, RLHF workflows, and memory management. Use when working with ZeroDB APIs, vector search, or AI memory systems.
version: 1.0.0
author: AINative Studio
license: Apache-2.0
keywords:
  - zerodb
  - vector-database
  - semantic-search
  - rlhf
  - memory-management
category: database
---

# ZeroDB Workflows & Best Practices

This skill provides patterns and best practices for working with ZeroDB, AINative's vector database system for AI memory, semantic search, and RLHF workflows.

## When to Use This Skill

- Creating ZeroDB projects or tables
- Implementing vector search functionality
- Managing AI agent memory and conversation context
- Collecting RLHF feedback data for model improvement
- Optimizing semantic similarity queries
- Debugging vector search results and relevance
- Building RAG (Retrieval Augmented Generation) systems
- Storing and retrieving embeddings at scale

## Core Concepts

### Vector Storage
ZeroDB stores high-dimensional embeddings (384, 768, 1024, 1536 dimensions) for semantic search and similarity matching. Each vector includes:
- **Embedding**: Dense vector representation of text/data
- **Metadata**: Arbitrary JSON data for filtering and context
- **ID**: Unique identifier for retrieval and updates

### Memory Management
Efficient context window management for AI agents using vector similarity to retrieve relevant conversation history. Key patterns:
- Store conversation turns as vectors with metadata (timestamp, user_id, session_id)
- Search by semantic similarity to find relevant context
- Prune old/irrelevant memories to maintain context quality
- Use hybrid search (vector + metadata filters) for precise retrieval

### RLHF Workflows
Collect human feedback on AI responses for model improvement and fine-tuning:
- Store prompt-response pairs with feedback ratings
- Track improvement metrics over time
- Identify failure patterns for targeted training
- Build datasets for reinforcement learning

## Quick Start Examples

### 1. Vector Upsert with Metadata
```typescript
import { ZeroDBClient } from '@zerodb/client';

const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });

// Store conversation memory
await client.vector.upsert({
  id: 'msg_12345',
  embedding: await getEmbedding('User asked about authentication'),
  metadata: {
    type: 'conversation',
    user_id: 'user_123',
    session_id: 'session_abc',
    timestamp: Date.now(),
    content: 'User asked about authentication',
    role: 'user'
  }
});
```

### 2. Semantic Search with Filters
```typescript
// Find relevant conversation history
const results = await client.vector.search({
  embedding: await getEmbedding('How do I implement OAuth?'),
  topK: 5,
  filters: {
    user_id: 'user_123',
    type: 'conversation',
    timestamp: { $gt: Date.now() - 86400000 } // Last 24 hours
  }
});

// Build context for AI prompt
const context = results.map(r => r.metadata.content).join('\n');
```

### 3. RLHF Feedback Collection
```typescript
// Store AI response with feedback tracking
await client.rlhf.feedback({
  prompt_id: 'prompt_123',
  response_id: 'resp_456',
  rating: 4, // 1-5 scale
  feedback_type: 'quality',
  metadata: {
    model: 'claude-3-sonnet',
    latency_ms: 1250,
    prompt_tokens: 1024,
    completion_tokens: 512,
    user_comment: 'Good response but could be more concise'
  }
});
```

## Architecture Patterns

### Memory-First Design
Always consider:
1. What information needs to be retrieved later?
2. How will you search for it (semantic, metadata, hybrid)?
3. What metadata is needed for filtering?
4. How long should memories persist?

### Search Quality
Optimize for relevance:
- Use meaningful embeddings (not just keywords)
- Include rich metadata for hybrid search
- Experiment with topK values (5-20 typical)
- Monitor search latency and quality metrics

### Scalability
Plan for growth:
- Batch operations when inserting multiple vectors
- Use pagination for large result sets
- Implement caching for frequently accessed data
- Monitor vector count and storage usage

## Common Pitfalls

❌ **Storing vectors without metadata** - Makes filtering impossible
✅ Store rich metadata for every vector

❌ **Using too few search results (topK=1)** - Misses relevant context
✅ Use topK=5-10 and rerank if needed

❌ **Ignoring embedding dimensions** - Different models need different dimensions
✅ Match embedding model output to ZeroDB dimension config

❌ **Not handling search errors** - Network/API failures happen
✅ Implement retry logic and fallbacks

## Reference Files

See the `references/` directory for detailed patterns:
- `api-endpoints.md` - Complete ZeroDB API reference with examples
- `vector-search.md` - Advanced search query patterns and optimization
- `memory-management.md` - Context window optimization strategies
- `rlhf-workflows.md` - Feedback collection and analysis patterns

## Best Practices Checklist

- [ ] All vectors include meaningful metadata
- [ ] Search queries use appropriate topK values
- [ ] Error handling implemented for API calls
- [ ] Batch operations used for multiple inserts
- [ ] Memory pruning strategy defined
- [ ] Search quality metrics monitored
- [ ] RLHF feedback includes model/prompt metadata
- [ ] Embedding dimensions match model output

## Related Skills

- `@ainative/skill-api-design` - RESTful API patterns
- `@ainative/skill-typescript-backend` - TypeScript service architecture
- `@ainative/skill-testing-patterns` - Testing database integrations

## Support

- Documentation: https://docs.zerodb.ai
- GitHub: https://github.com/zerodb/zerodb-client
- Discord: https://discord.gg/zerodb
