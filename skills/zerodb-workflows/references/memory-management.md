# Memory Management & Context Optimization

Patterns for managing AI agent memory, conversation context, and long-term knowledge retention using ZeroDB.

## Core Concepts

### Memory Types
1. **Short-term Memory**: Current conversation context (last N messages)
2. **Working Memory**: Task-specific context (current task details)
3. **Long-term Memory**: Persistent knowledge (user preferences, facts learned over time)
4. **Episodic Memory**: Past conversations and interactions

## Short-Term Memory (Conversation Context)

### Basic Conversation Storage
```typescript
import { ZeroDBClient } from '@zerodb/client';
import { getEmbedding } from './embeddings';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class ConversationMemory {
  private client: ZeroDBClient;

  constructor(apiKey: string) {
    this.client = new ZeroDBClient({ apiKey });
  }

  async storeTurn(
    sessionId: string,
    userId: string,
    turn: ConversationTurn
  ): Promise<void> {
    const embedding = await getEmbedding(turn.content);

    await this.client.vector.upsert({
      id: `${sessionId}_${turn.timestamp}`,
      embedding,
      metadata: {
        type: 'conversation_turn',
        session_id: sessionId,
        user_id: userId,
        role: turn.role,
        content: turn.content,
        timestamp: turn.timestamp,
        ...turn.metadata
      }
    });
  }

  async getRecentContext(
    sessionId: string,
    maxTurns = 10
  ): Promise<ConversationTurn[]> {
    const response = await this.client.vector.list({
      filters: {
        type: 'conversation_turn',
        session_id: sessionId
      },
      limit: maxTurns * 2, // Get more to ensure we have enough
    });

    // Sort by timestamp descending and take most recent
    return response.vectors
      .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
      .slice(0, maxTurns)
      .reverse() // Chronological order
      .map(v => ({
        role: v.metadata.role,
        content: v.metadata.content,
        timestamp: v.metadata.timestamp,
        metadata: v.metadata
      }));
  }
}

// Usage
const memory = new ConversationMemory(process.env.ZERODB_API_KEY!);

await memory.storeTurn('session_123', 'user_456', {
  role: 'user',
  content: 'How do I implement authentication?',
  timestamp: Date.now()
});

await memory.storeTurn('session_123', 'user_456', {
  role: 'assistant',
  content: 'Here are the steps for implementing authentication...',
  timestamp: Date.now()
});

const context = await memory.getRecentContext('session_123', 10);
```

### Semantic Context Retrieval
```typescript
class SemanticContextMemory extends ConversationMemory {
  async getRelevantContext(
    query: string,
    userId: string,
    options: {
      sessionId?: string;
      topK?: number;
      timeWindowMs?: number;
      minScore?: number;
    } = {}
  ): Promise<ConversationTurn[]> {
    const {
      sessionId,
      topK = 5,
      timeWindowMs = 24 * 3600000, // 24 hours
      minScore = 0.6
    } = options;

    const queryEmbedding = await getEmbedding(query);

    const filters: any = {
      type: 'conversation_turn',
      user_id: userId,
      timestamp: { $gt: Date.now() - timeWindowMs }
    };

    if (sessionId) {
      filters.session_id = sessionId;
    }

    const response = await this.client.vector.search({
      embedding: queryEmbedding,
      topK: topK * 2,
      filters,
      include_metadata: true
    });

    return response.results
      .filter(r => r.score >= minScore)
      .slice(0, topK)
      .map(r => ({
        role: r.metadata.role,
        content: r.metadata.content,
        timestamp: r.metadata.timestamp,
        metadata: { ...r.metadata, relevance_score: r.score }
      }));
  }
}

// Usage
const semanticMemory = new SemanticContextMemory(process.env.ZERODB_API_KEY!);

const relevantContext = await semanticMemory.getRelevantContext(
  'authentication best practices',
  'user_456',
  {
    topK: 5,
    timeWindowMs: 7 * 86400000, // Last 7 days
    minScore: 0.7
  }
);
```

## Long-Term Memory (User Preferences & Facts)

### Storing Persistent Knowledge
```typescript
interface UserKnowledge {
  user_id: string;
  knowledge_type: 'preference' | 'fact' | 'skill' | 'goal';
  content: string;
  confidence: number; // 0-1
  learned_at: number;
  reinforced_count?: number;
  last_accessed?: number;
}

class LongTermMemory {
  private client: ZeroDBClient;

  constructor(apiKey: string) {
    this.client = new ZeroDBClient({ apiKey });
  }

  async storeKnowledge(knowledge: UserKnowledge): Promise<void> {
    const embedding = await getEmbedding(knowledge.content);

    await this.client.vector.upsert({
      id: `knowledge_${knowledge.user_id}_${knowledge.learned_at}`,
      embedding,
      metadata: {
        type: 'long_term_knowledge',
        ...knowledge
      }
    });
  }

  async recallKnowledge(
    userId: string,
    query: string,
    knowledgeType?: string,
    topK = 5
  ): Promise<UserKnowledge[]> {
    const queryEmbedding = await getEmbedding(query);

    const filters: any = {
      type: 'long_term_knowledge',
      user_id: userId
    };

    if (knowledgeType) {
      filters.knowledge_type = knowledgeType;
    }

    const response = await this.client.vector.search({
      embedding: queryEmbedding,
      topK,
      filters,
      include_metadata: true
    });

    // Update last_accessed timestamp
    await Promise.all(
      response.results.map(r =>
        this.client.vector.upsert({
          id: r.id,
          embedding: r.embedding!,
          metadata: {
            ...r.metadata,
            last_accessed: Date.now()
          }
        })
      )
    );

    return response.results.map(r => r.metadata as UserKnowledge);
  }

  async reinforceKnowledge(
    userId: string,
    content: string
  ): Promise<void> {
    const queryEmbedding = await getEmbedding(content);

    // Find matching knowledge
    const response = await this.client.vector.search({
      embedding: queryEmbedding,
      topK: 1,
      filters: {
        type: 'long_term_knowledge',
        user_id: userId
      },
      min_score: 0.9 // High similarity threshold
    });

    if (response.results.length > 0) {
      const match = response.results[0];
      const reinforcedCount = (match.metadata.reinforced_count || 0) + 1;
      const newConfidence = Math.min(1.0, match.metadata.confidence + 0.1);

      await this.client.vector.upsert({
        id: match.id,
        embedding: match.embedding!,
        metadata: {
          ...match.metadata,
          reinforced_count: reinforcedCount,
          confidence: newConfidence,
          last_accessed: Date.now()
        }
      });
    }
  }
}

// Usage
const ltm = new LongTermMemory(process.env.ZERODB_API_KEY!);

// Store user preference
await ltm.storeKnowledge({
  user_id: 'user_456',
  knowledge_type: 'preference',
  content: 'User prefers concise responses without excessive detail',
  confidence: 0.8,
  learned_at: Date.now()
});

// Store learned fact
await ltm.storeKnowledge({
  user_id: 'user_456',
  knowledge_type: 'fact',
  content: 'User works with TypeScript and PostgreSQL',
  confidence: 0.95,
  learned_at: Date.now()
});

// Recall relevant knowledge
const preferences = await ltm.recallKnowledge(
  'user_456',
  'How should I format my response?',
  'preference',
  3
);

// Reinforce knowledge (user confirms preference again)
await ltm.reinforceKnowledge(
  'user_456',
  'User prefers concise responses'
);
```

## Context Window Optimization

### Token-Aware Context Building
```typescript
interface ContextWindow {
  messages: ConversationTurn[];
  knowledge: UserKnowledge[];
  total_tokens: number;
  truncated: boolean;
}

class ContextWindowBuilder {
  private shortTermMemory: SemanticContextMemory;
  private longTermMemory: LongTermMemory;

  constructor(apiKey: string) {
    this.shortTermMemory = new SemanticContextMemory(apiKey);
    this.longTermMemory = new LongTermMemory(apiKey);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  async buildContextWindow(
    userId: string,
    sessionId: string,
    currentQuery: string,
    maxTokens = 2000
  ): Promise<ContextWindow> {
    let totalTokens = 0;
    const messages: ConversationTurn[] = [];
    const knowledge: UserKnowledge[] = [];
    let truncated = false;

    // Reserve 20% for long-term knowledge
    const knowledgeTokenBudget = Math.floor(maxTokens * 0.2);
    const conversationTokenBudget = maxTokens - knowledgeTokenBudget;

    // 1. Add long-term knowledge first (most stable context)
    const relevantKnowledge = await this.longTermMemory.recallKnowledge(
      userId,
      currentQuery,
      undefined,
      5
    );

    for (const k of relevantKnowledge) {
      const tokens = this.estimateTokens(k.content);
      if (totalTokens + tokens <= knowledgeTokenBudget) {
        knowledge.push(k);
        totalTokens += tokens;
      } else {
        truncated = true;
        break;
      }
    }

    // 2. Add recent conversation context
    const recentMessages = await this.shortTermMemory.getRecentContext(
      sessionId,
      20
    );

    // Add most recent messages first (reverse order)
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      const tokens = this.estimateTokens(msg.content);

      if (totalTokens + tokens <= conversationTokenBudget) {
        messages.unshift(msg); // Add to front to maintain chronological order
        totalTokens += tokens;
      } else {
        truncated = true;
        break;
      }
    }

    // 3. Add semantically relevant context if room remains
    if (totalTokens < maxTokens * 0.9) {
      const semanticContext = await this.shortTermMemory.getRelevantContext(
        currentQuery,
        userId,
        {
          topK: 3,
          timeWindowMs: 7 * 86400000,
          minScore: 0.7
        }
      );

      // Filter out messages already in recent context
      const messageIds = new Set(messages.map(m => m.timestamp));
      const newSemanticMessages = semanticContext.filter(
        m => !messageIds.has(m.timestamp)
      );

      for (const msg of newSemanticMessages) {
        const tokens = this.estimateTokens(msg.content);
        if (totalTokens + tokens <= maxTokens) {
          messages.push(msg);
          totalTokens += tokens;
        } else {
          truncated = true;
          break;
        }
      }
    }

    return {
      messages,
      knowledge,
      total_tokens: totalTokens,
      truncated
    };
  }

  formatForPrompt(context: ContextWindow): string {
    let prompt = '';

    // Add long-term knowledge
    if (context.knowledge.length > 0) {
      prompt += '## User Profile\n\n';
      for (const k of context.knowledge) {
        prompt += `- ${k.content} (confidence: ${k.confidence.toFixed(2)})\n`;
      }
      prompt += '\n';
    }

    // Add conversation history
    if (context.messages.length > 0) {
      prompt += '## Conversation History\n\n';
      for (const msg of context.messages) {
        prompt += `${msg.role}: ${msg.content}\n`;
      }
      prompt += '\n';
    }

    if (context.truncated) {
      prompt += '_Note: Context was truncated due to token limits_\n\n';
    }

    return prompt;
  }
}

// Usage
const builder = new ContextWindowBuilder(process.env.ZERODB_API_KEY!);

const context = await builder.buildContextWindow(
  'user_456',
  'session_123',
  'How do I optimize my database queries?',
  2000
);

const promptContext = builder.formatForPrompt(context);
console.log(`Context: ${context.total_tokens} tokens, truncated: ${context.truncated}`);
```

## Memory Pruning Strategies

### Time-Based Pruning
```typescript
class MemoryPruner {
  private client: ZeroDBClient;

  constructor(apiKey: string) {
    this.client = new ZeroDBClient({ apiKey });
  }

  async pruneOldMemories(
    userId: string,
    maxAgeMs = 90 * 86400000 // 90 days
  ): Promise<number> {
    const cutoffTime = Date.now() - maxAgeMs;

    // Find old conversation turns
    const oldTurns = await this.client.vector.list({
      filters: {
        type: 'conversation_turn',
        user_id: userId,
        timestamp: { $lt: cutoffTime }
      },
      limit: 1000
    });

    // Delete in batches
    const idsToDelete = oldTurns.vectors.map(v => v.id);
    if (idsToDelete.length > 0) {
      await this.client.vector.batchDelete(idsToDelete);
    }

    return idsToDelete.length;
  }

  async pruneUnusedKnowledge(
    userId: string,
    unusedDays = 30
  ): Promise<number> {
    const cutoffTime = Date.now() - (unusedDays * 86400000);

    const unusedKnowledge = await this.client.vector.list({
      filters: {
        type: 'long_term_knowledge',
        user_id: userId,
        last_accessed: { $lt: cutoffTime },
        confidence: { $lt: 0.5 } // Only low-confidence unused knowledge
      },
      limit: 1000
    });

    const idsToDelete = unusedKnowledge.vectors.map(v => v.id);
    if (idsToDelete.length > 0) {
      await this.client.vector.batchDelete(idsToDelete);
    }

    return idsToDelete.length;
  }

  async consolidateDuplicates(userId: string): Promise<number> {
    // Find all knowledge for user
    const allKnowledge = await this.client.vector.list({
      filters: {
        type: 'long_term_knowledge',
        user_id: userId
      },
      limit: 1000
    });

    let consolidated = 0;

    // Check for duplicates using similarity
    for (let i = 0; i < allKnowledge.vectors.length; i++) {
      const current = allKnowledge.vectors[i];

      const similar = await this.client.vector.search({
        embedding: (current as any).embedding!, // Would need to fetch embedding
        topK: 5,
        filters: {
          type: 'long_term_knowledge',
          user_id: userId
        },
        min_score: 0.95
      });

      // If we found duplicates (excluding self)
      if (similar.results.length > 1) {
        const duplicates = similar.results.slice(1); // Skip first (self)

        // Keep the one with highest confidence, delete others
        const toDelete = duplicates
          .filter(d => d.metadata.confidence < current.metadata.confidence)
          .map(d => d.id);

        if (toDelete.length > 0) {
          await this.client.vector.batchDelete(toDelete);
          consolidated += toDelete.length;
        }
      }
    }

    return consolidated;
  }
}

// Usage - Run periodically (e.g., daily cron job)
const pruner = new MemoryPruner(process.env.ZERODB_API_KEY!);

const deletedOld = await pruner.pruneOldMemories('user_456', 90 * 86400000);
console.log(`Pruned ${deletedOld} old conversation turns`);

const deletedUnused = await pruner.pruneUnusedKnowledge('user_456', 30);
console.log(`Pruned ${deletedUnused} unused knowledge items`);

const consolidated = await pruner.consolidateDuplicates('user_456');
console.log(`Consolidated ${consolidated} duplicate knowledge items`);
```

## Session Management

### Multi-Session Context
```typescript
interface Session {
  session_id: string;
  user_id: string;
  started_at: number;
  ended_at?: number;
  message_count: number;
  topic?: string;
}

class SessionManager {
  private client: ZeroDBClient;
  private memory: ConversationMemory;

  constructor(apiKey: string) {
    this.client = new ZeroDBClient({ apiKey });
    this.memory = new ConversationMemory(apiKey);
  }

  async startSession(userId: string, topic?: string): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.client.table.insert({
      table: 'sessions',
      rows: [{
        session_id: sessionId,
        user_id: userId,
        started_at: Date.now(),
        message_count: 0,
        topic
      }]
    });

    return sessionId;
  }

  async endSession(sessionId: string): Promise<void> {
    await this.client.table.update({
      table: 'sessions',
      filters: { session_id: sessionId },
      data: {
        ended_at: Date.now()
      }
    });
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    const result = await this.client.table.query({
      table: 'sessions',
      filters: {
        user_id: userId,
        ended_at: { $exists: false }
      },
      order_by: 'started_at',
      order: 'desc'
    });

    return result.rows as Session[];
  }

  async searchSessions(
    userId: string,
    query: string,
    topK = 5
  ): Promise<Session[]> {
    // Search across all session messages
    const queryEmbedding = await getEmbedding(query);

    const relevantTurns = await this.client.vector.search({
      embedding: queryEmbedding,
      topK: topK * 3,
      filters: {
        type: 'conversation_turn',
        user_id: userId
      }
    });

    // Group by session_id
    const sessionIds = new Set(
      relevantTurns.results.map(r => r.metadata.session_id)
    );

    // Fetch session metadata
    const sessions: Session[] = [];
    for (const sessionId of sessionIds) {
      const result = await this.client.table.query({
        table: 'sessions',
        filters: { session_id: sessionId },
        limit: 1
      });

      if (result.rows.length > 0) {
        sessions.push(result.rows[0] as Session);
      }
    }

    return sessions.slice(0, topK);
  }
}

// Usage
const sessionMgr = new SessionManager(process.env.ZERODB_API_KEY!);

const sessionId = await sessionMgr.startSession('user_456', 'database optimization');

// ... conversation happens ...

await sessionMgr.endSession(sessionId);

// Find sessions about a topic
const relevantSessions = await sessionMgr.searchSessions(
  'user_456',
  'authentication implementation',
  5
);
```

## Best Practices

### 1. Memory Hierarchy
- **Immediate Context**: Last 3-5 messages (always include)
- **Recent Context**: Last 20 messages (include if tokens allow)
- **Semantic Context**: Relevant past messages (fill remaining budget)
- **Long-term Knowledge**: User preferences and facts (20% of budget)

### 2. Update Strategies
- **Eagerly Store**: Save every message immediately
- **Lazily Retrieve**: Only fetch context when needed
- **Periodically Prune**: Clean old/irrelevant memories daily/weekly

### 3. Quality Over Quantity
- Use relevance scores to filter low-quality context
- Prefer recent + relevant over just recent
- Monitor token usage to avoid bloated prompts

### 4. User Privacy
- Allow users to delete their memory
- Implement retention policies
- Don't store sensitive information in metadata
