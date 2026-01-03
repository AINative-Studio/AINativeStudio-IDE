# Vector Search Patterns & Optimization

Advanced patterns for semantic search, hybrid queries, and search quality optimization.

## Basic Semantic Search

### Simple Similarity Search
```typescript
import { ZeroDBClient } from '@zerodb/client';
import { getEmbedding } from './embeddings'; // Your embedding function

async function semanticSearch(query: string, topK = 10) {
  const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });

  // Convert query to embedding
  const queryEmbedding = await getEmbedding(query);

  // Search for similar vectors
  const response = await client.vector.search({
    embedding: queryEmbedding,
    topK,
    include_metadata: true
  });

  return response.results;
}

// Usage
const results = await semanticSearch('How to implement authentication?', 5);
results.forEach(result => {
  console.log(`Score: ${result.score.toFixed(3)} - ${result.metadata.content}`);
});
```

## Hybrid Search (Vector + Metadata)

### Combining Semantic and Structured Filters
```typescript
interface HybridSearchOptions {
  query: string;
  topK?: number;
  filters?: {
    category?: string;
    dateRange?: { start: number; end: number };
    tags?: string[];
    author?: string;
  };
  minScore?: number;
}

async function hybridSearch(options: HybridSearchOptions) {
  const {
    query,
    topK = 10,
    filters = {},
    minScore = 0.5
  } = options;

  const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });
  const queryEmbedding = await getEmbedding(query);

  // Build metadata filters
  const metadataFilters: any = {};

  if (filters.category) {
    metadataFilters.category = filters.category;
  }

  if (filters.dateRange) {
    metadataFilters.timestamp = {
      $gte: filters.dateRange.start,
      $lte: filters.dateRange.end
    };
  }

  if (filters.tags && filters.tags.length > 0) {
    metadataFilters.tags = { $in: filters.tags };
  }

  if (filters.author) {
    metadataFilters.author = filters.author;
  }

  const response = await client.vector.search({
    embedding: queryEmbedding,
    topK: topK * 2, // Fetch more, then filter by score
    filters: metadataFilters,
    include_metadata: true
  });

  // Post-filter by minimum score
  return response.results
    .filter(r => r.score >= minScore)
    .slice(0, topK);
}

// Usage example
const results = await hybridSearch({
  query: 'database optimization techniques',
  topK: 5,
  filters: {
    category: 'engineering',
    dateRange: {
      start: Date.now() - 30 * 86400000, // Last 30 days
      end: Date.now()
    },
    tags: ['performance', 'postgresql']
  },
  minScore: 0.7
});
```

## Multi-Table Search

### Searching Across Multiple Collections
```typescript
interface MultiTableSearchResult {
  source: string;
  results: Array<{
    id: string;
    score: number;
    metadata: any;
  }>;
}

async function searchAcrossTables(
  query: string,
  tables: string[],
  topKPerTable = 5
): Promise<MultiTableSearchResult[]> {
  const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });
  const queryEmbedding = await getEmbedding(query);

  // Search all tables in parallel
  const searches = tables.map(async (table) => {
    const response = await client.vector.search({
      embedding: queryEmbedding,
      topK: topKPerTable,
      filters: { table_name: table } // Assuming table_name in metadata
    });

    return {
      source: table,
      results: response.results
    };
  });

  return await Promise.all(searches);
}

// Merge and re-rank results from multiple sources
function mergeAndRankResults(
  multiTableResults: MultiTableSearchResult[],
  topK = 10
) {
  const allResults = multiTableResults.flatMap(tableResult =>
    tableResult.results.map(result => ({
      ...result,
      source: tableResult.source
    }))
  );

  // Sort by score descending
  allResults.sort((a, b) => b.score - a.score);

  return allResults.slice(0, topK);
}

// Usage
const results = await searchAcrossTables(
  'machine learning best practices',
  ['documentation', 'blog_posts', 'research_papers'],
  5
);
const topResults = mergeAndRankResults(results, 10);
```

## Search Result Reranking

### Score-Based Reranking
```typescript
interface RerankingWeights {
  semanticScore: number;      // 0-1, weight for vector similarity
  recencyBoost: number;        // 0-1, weight for recent items
  popularityBoost: number;     // 0-1, weight for popular items
}

function rerankResults(
  results: any[],
  weights: RerankingWeights = {
    semanticScore: 0.7,
    recencyBoost: 0.2,
    popularityBoost: 0.1
  }
) {
  const now = Date.now();
  const maxTimestamp = Math.max(...results.map(r => r.metadata.timestamp || 0));
  const maxViews = Math.max(...results.map(r => r.metadata.views || 0));

  return results.map(result => {
    const semanticScore = result.score;

    // Recency score (0-1, newer is better)
    const recencyScore = result.metadata.timestamp
      ? (result.metadata.timestamp / maxTimestamp)
      : 0;

    // Popularity score (0-1, more views is better)
    const popularityScore = result.metadata.views
      ? (result.metadata.views / maxViews)
      : 0;

    // Weighted combination
    const finalScore =
      semanticScore * weights.semanticScore +
      recencyScore * weights.recencyBoost +
      popularityScore * weights.popularityBoost;

    return {
      ...result,
      original_score: semanticScore,
      final_score: finalScore,
      recency_score: recencyScore,
      popularity_score: popularityScore
    };
  }).sort((a, b) => b.final_score - a.final_score);
}
```

### Context-Aware Reranking
```typescript
async function contextAwareRerank(
  query: string,
  results: any[],
  userContext: {
    user_id: string;
    previous_queries?: string[];
    preferences?: Record<string, any>;
  }
) {
  // Boost results matching user preferences
  return results.map(result => {
    let boost = 1.0;

    // Preference matching
    if (userContext.preferences?.categories) {
      const categories = userContext.preferences.categories as string[];
      if (categories.includes(result.metadata.category)) {
        boost *= 1.2;
      }
    }

    // Previous query relevance
    if (userContext.previous_queries) {
      const isRelatedToPrevious = userContext.previous_queries.some(
        prevQuery => result.metadata.content.includes(prevQuery)
      );
      if (isRelatedToPrevious) {
        boost *= 1.15;
      }
    }

    return {
      ...result,
      score: result.score * boost,
      boost_factor: boost
    };
  }).sort((a, b) => b.score - a.score);
}
```

## Search Optimization Strategies

### Embedding Cache
```typescript
import { createHash } from 'crypto';

class EmbeddingCache {
  private cache = new Map<string, number[]>();
  private maxSize = 1000;

  private getCacheKey(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  async getEmbedding(text: string, embedFn: (text: string) => Promise<number[]>): Promise<number[]> {
    const key = this.getCacheKey(text);

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const embedding = await embedFn(text);

    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, embedding);
    return embedding;
  }

  clear() {
    this.cache.clear();
  }
}

// Usage
const cache = new EmbeddingCache();
const embedding = await cache.getEmbedding(query, getEmbedding);
```

### Batch Search Optimization
```typescript
async function batchSearch(
  queries: string[],
  topK = 5
): Promise<Map<string, any[]>> {
  const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });

  // Generate embeddings in parallel
  const embeddings = await Promise.all(
    queries.map(q => getEmbedding(q))
  );

  // Execute searches in parallel
  const searches = embeddings.map((embedding, idx) =>
    client.vector.search({
      embedding,
      topK,
      include_metadata: true
    }).then(response => ({
      query: queries[idx],
      results: response.results
    }))
  );

  const results = await Promise.all(searches);

  // Return as Map for easy lookup
  return new Map(results.map(r => [r.query, r.results]));
}

// Usage
const queries = [
  'What is authentication?',
  'How to optimize database queries?',
  'Best practices for API design?'
];
const results = await batchSearch(queries, 5);
```

### Pagination for Large Result Sets
```typescript
async function paginatedSearch(
  query: string,
  page = 1,
  pageSize = 20
) {
  const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });
  const queryEmbedding = await getEmbedding(query);

  // Fetch more results than needed for accurate pagination
  const totalResults = page * pageSize + pageSize;

  const response = await client.vector.search({
    embedding: queryEmbedding,
    topK: totalResults,
    include_metadata: true
  });

  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;

  return {
    results: response.results.slice(startIdx, endIdx),
    page,
    pageSize,
    total: response.results.length,
    hasMore: response.results.length >= totalResults
  };
}
```

## Quality Monitoring

### Search Analytics
```typescript
interface SearchAnalytics {
  query: string;
  timestamp: number;
  results_count: number;
  top_score: number;
  avg_score: number;
  latency_ms: number;
  user_id?: string;
}

async function searchWithAnalytics(query: string, userId?: string) {
  const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });
  const startTime = Date.now();

  const queryEmbedding = await getEmbedding(query);
  const response = await client.vector.search({
    embedding: queryEmbedding,
    topK: 10,
    include_metadata: true
  });

  const latency = Date.now() - startTime;
  const scores = response.results.map(r => r.score);

  const analytics: SearchAnalytics = {
    query,
    timestamp: Date.now(),
    results_count: response.results.length,
    top_score: Math.max(...scores),
    avg_score: scores.reduce((a, b) => a + b, 0) / scores.length,
    latency_ms: latency,
    user_id: userId
  };

  // Log analytics (send to monitoring system)
  await logSearchAnalytics(analytics);

  return response.results;
}

async function logSearchAnalytics(analytics: SearchAnalytics) {
  // Store in ZeroDB table for analysis
  const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });
  await client.table.insert({
    table: 'search_analytics',
    rows: [analytics]
  });
}
```

### Low-Quality Search Detection
```typescript
function detectLowQualitySearch(results: any[], thresholds = {
  minTopScore: 0.6,
  minAvgScore: 0.4,
  minResults: 3
}) {
  if (results.length < thresholds.minResults) {
    return {
      isLowQuality: true,
      reason: 'insufficient_results',
      suggestion: 'Broaden search criteria or check data coverage'
    };
  }

  const topScore = results[0]?.score || 0;
  if (topScore < thresholds.minTopScore) {
    return {
      isLowQuality: true,
      reason: 'low_top_score',
      suggestion: 'Query may be too specific or out of domain'
    };
  }

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  if (avgScore < thresholds.minAvgScore) {
    return {
      isLowQuality: true,
      reason: 'low_avg_score',
      suggestion: 'Results may not be highly relevant'
    };
  }

  return {
    isLowQuality: false,
    topScore,
    avgScore
  };
}

// Usage with fallback
async function searchWithFallback(query: string) {
  const results = await semanticSearch(query, 10);
  const quality = detectLowQualitySearch(results);

  if (quality.isLowQuality) {
    console.warn(`Low quality search: ${quality.reason}`);
    console.warn(`Suggestion: ${quality.suggestion}`);

    // Try hybrid search as fallback
    return await hybridSearch({
      query,
      topK: 10,
      minScore: 0.3 // Lower threshold
    });
  }

  return results;
}
```

## Advanced Patterns

### Query Expansion
```typescript
async function expandedSearch(query: string, topK = 10) {
  // Generate variations of the query
  const queryVariations = [
    query,
    query.toLowerCase(),
    query.replace(/[?!.]/g, ''), // Remove punctuation
    // Add synonyms, related terms, etc.
  ];

  // Search with each variation
  const allResults = await batchSearch(queryVariations, topK);

  // Merge and deduplicate by ID
  const uniqueResults = new Map();
  for (const [_, results] of allResults) {
    for (const result of results) {
      if (!uniqueResults.has(result.id) || result.score > uniqueResults.get(result.id).score) {
        uniqueResults.set(result.id, result);
      }
    }
  }

  // Return top K from unique results
  return Array.from(uniqueResults.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

### Faceted Search
```typescript
async function facetedSearch(query: string) {
  const client = new ZeroDBClient({ apiKey: process.env.ZERODB_API_KEY });
  const queryEmbedding = await getEmbedding(query);

  // Get base results
  const response = await client.vector.search({
    embedding: queryEmbedding,
    topK: 100, // Fetch more for faceting
    include_metadata: true
  });

  // Build facets from results
  const facets = {
    categories: new Map<string, number>(),
    authors: new Map<string, number>(),
    dateRanges: {
      last_week: 0,
      last_month: 0,
      last_year: 0,
      older: 0
    }
  };

  const now = Date.now();
  const oneWeek = 7 * 86400000;
  const oneMonth = 30 * 86400000;
  const oneYear = 365 * 86400000;

  for (const result of response.results) {
    // Category facets
    const category = result.metadata.category;
    if (category) {
      facets.categories.set(category, (facets.categories.get(category) || 0) + 1);
    }

    // Author facets
    const author = result.metadata.author;
    if (author) {
      facets.authors.set(author, (facets.authors.get(author) || 0) + 1);
    }

    // Date range facets
    const timestamp = result.metadata.timestamp;
    if (timestamp) {
      const age = now - timestamp;
      if (age <= oneWeek) facets.dateRanges.last_week++;
      else if (age <= oneMonth) facets.dateRanges.last_month++;
      else if (age <= oneYear) facets.dateRanges.last_year++;
      else facets.dateRanges.older++;
    }
  }

  return {
    results: response.results.slice(0, 10),
    facets: {
      categories: Object.fromEntries(facets.categories),
      authors: Object.fromEntries(facets.authors),
      dateRanges: facets.dateRanges
    }
  };
}
```
