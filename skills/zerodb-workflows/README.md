# @ainative/skill-zerodb-workflows

> Official AINative Studio skill for ZeroDB vector database workflows, semantic search patterns, RLHF feedback collection, and AI memory management.

## Installation

```bash
npm install @ainative/skill-zerodb-workflows
```

Or install directly in your AINative Studio skills directory:

```bash
cd ~/.ainative/skills
git clone https://github.com/AINative-Studio/ainative-skills
```

## What This Skill Covers

This skill provides comprehensive patterns and best practices for:

- **Vector Database Operations**: Storing, searching, and managing embeddings at scale
- **Semantic Search**: Hybrid search combining vector similarity and metadata filters
- **Memory Management**: Context window optimization for AI agents
- **RLHF Workflows**: Collecting and analyzing human feedback for model improvement
- **Performance Optimization**: Caching, batching, and query optimization strategies

## Quick Start

### 1. Basic Vector Storage and Search

```typescript
import { ZeroDBClient } from '@zerodb/client';
import { getEmbedding } from './embeddings';

const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });

// Store a document with semantic embedding
await client.vector.upsert({
  id: 'doc_1',
  embedding: await getEmbedding('How to implement OAuth authentication'),
  metadata: {
    title: 'OAuth Guide',
    category: 'security',
    timestamp: Date.now()
  }
});

// Search for similar documents
const results = await client.vector.search({
  embedding: await getEmbedding('authentication best practices'),
  topK: 5,
  filters: { category: 'security' }
});
```

### 2. Conversation Memory Management

```typescript
import { ConversationMemory } from '@ainative/skill-zerodb-workflows/memory';

const memory = new ConversationMemory(process.env.ZERODB_API_KEY!);

// Store conversation turn
await memory.storeTurn('session_123', 'user_456', {
  role: 'user',
  content: 'How do I optimize database queries?',
  timestamp: Date.now()
});

// Retrieve recent context
const context = await memory.getRecentContext('session_123', 10);
```

### 3. RLHF Feedback Collection

```typescript
import { FeedbackCollector } from '@ainative/skill-zerodb-workflows/rlhf';

const collector = new FeedbackCollector(process.env.ZERODB_API_KEY!);

// Submit user rating
await collector.submitFeedback({
  prompt_id: 'prompt_123',
  response_id: 'resp_456',
  user_id: 'user_789',
  rating: 4,
  feedback_type: 'quality',
  timestamp: Date.now()
});

// Analyze feedback trends
const stats = await collector.getFeedbackStats('resp_456');
console.log(`Avg rating: ${stats.avg_rating}`);
```

## Skill Structure

```
zerodb-workflows/
├── SKILL.md                           # Main skill file with quick reference
├── references/
│   ├── api-endpoints.md              # Complete ZeroDB API documentation
│   ├── vector-search.md              # Advanced search patterns
│   ├── memory-management.md          # Context optimization strategies
│   └── rlhf-workflows.md             # Feedback collection patterns
├── package.json                       # NPM package configuration
└── README.md                          # This file
```

## Reference Documentation

### API Endpoints (`references/api-endpoints.md`)
- Authentication and client setup
- Vector operations (upsert, search, delete)
- Metadata filtering syntax
- Table operations for structured data
- File storage and retrieval
- Error handling and retry patterns

### Vector Search (`references/vector-search.md`)
- Semantic search fundamentals
- Hybrid search (vector + metadata)
- Multi-table search and result merging
- Search result reranking strategies
- Performance optimization (caching, batching)
- Quality monitoring and analytics

### Memory Management (`references/memory-management.md`)
- Short-term conversation context
- Long-term knowledge retention
- Context window optimization
- Token-aware context building
- Memory pruning strategies
- Multi-session management

### RLHF Workflows (`references/rlhf-workflows.md`)
- Simple rating systems
- Comparative feedback (pairwise comparisons)
- Multi-dimensional feedback analysis
- Implicit feedback (behavioral signals)
- Training dataset construction
- Quality control best practices

## Use Cases

### 1. Building a RAG System
```typescript
// Store your knowledge base
for (const doc of documents) {
  await client.vector.upsert({
    id: doc.id,
    embedding: await getEmbedding(doc.content),
    metadata: { title: doc.title, category: doc.category }
  });
}

// Retrieve relevant context for user query
const context = await client.vector.search({
  embedding: await getEmbedding(userQuery),
  topK: 5
});
```

### 2. AI Agent Memory
```typescript
// Store agent observations
await memory.storeTurn(sessionId, userId, {
  role: 'assistant',
  content: 'I noticed you prefer TypeScript for backend work',
  timestamp: Date.now()
});

// Retrieve relevant memories for next interaction
const relevantMemories = await memory.getRelevantContext(
  'What language should I use?',
  userId,
  { topK: 3 }
);
```

### 3. Model Improvement Pipeline
```typescript
// Collect feedback
await collector.submitFeedback({...});

// Analyze patterns
const problems = await analyzer.identifyProblemPatterns();

// Build training dataset
const dataset = await builder.buildDataset({
  minRating: 4.0,
  limit: 5000
});

await builder.exportToJSONL(dataset, './training.jsonl');
```

## Best Practices

### Performance
- Use batch operations for inserting multiple vectors
- Implement embedding caching to reduce API calls
- Set appropriate `topK` values (5-20 typical)
- Monitor search latency and optimize queries

### Data Quality
- Always include rich metadata for hybrid search
- Store conversation turns immediately (don't batch)
- Implement memory pruning for old/irrelevant data
- Use minimum similarity scores to filter poor matches

### Security
- Never store API keys in metadata
- Implement proper authentication and authorization
- Anonymize sensitive user data
- Follow data retention policies

### Monitoring
- Track search quality metrics (avg score, result count)
- Monitor engagement signals (copy rate, regeneration rate)
- Analyze feedback trends over time
- A/B test changes to measure impact

## Requirements

- Node.js >= 18.0.0
- ZeroDB account and API key
- Embedding model (OpenAI, Anthropic, or local)

## Environment Setup

```bash
export ZERODB_API_KEY="your_api_key_here"
export EMBEDDING_MODEL="text-embedding-3-small" # or your preferred model
```

## TypeScript Support

This skill includes full TypeScript type definitions for all patterns and examples.

```typescript
import type {
  VectorUpsertRequest,
  VectorSearchRequest,
  FeedbackData,
  ConversationTurn
} from '@ainative/skill-zerodb-workflows';
```

## Contributing

Found a bug or have a pattern to share? Open an issue or PR at:
https://github.com/AINative-Studio/ainative-skills

## License

Apache-2.0

## Support

- Documentation: https://docs.zerodb.ai
- AINative Studio: https://ainative.studio
- Discord: https://discord.gg/ainative

## Related Skills

- `@ainative/skill-api-design` - RESTful API patterns
- `@ainative/skill-typescript-backend` - Backend architecture
- `@ainative/skill-testing-patterns` - Testing strategies

---

**Made with ❤️ by AINative Studio**
