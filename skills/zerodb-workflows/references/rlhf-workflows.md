# RLHF Workflows & Feedback Collection

Patterns for collecting, analyzing, and acting on human feedback for AI model improvement using ZeroDB.

## Core RLHF Concepts

**RLHF (Reinforcement Learning from Human Feedback)** is a process for improving AI models by:
1. Collecting human feedback on AI outputs
2. Training reward models based on preferences
3. Fine-tuning models to maximize reward

ZeroDB provides the infrastructure for steps 1 and 2 (data collection and analysis).

## Basic Feedback Collection

### Simple Rating System
```typescript
import { ZeroDBClient } from '@zerodb/client';

interface FeedbackData {
  prompt_id: string;
  response_id: string;
  user_id: string;
  rating: number;              // 1-5 scale
  feedback_type: 'quality' | 'accuracy' | 'helpfulness' | 'safety';
  timestamp: number;
  metadata?: Record<string, any>;
}

class FeedbackCollector {
  private client: ZeroDBClient;

  constructor(apiKey: string) {
    this.client = new ZeroDBClient({ apiKey });
  }

  async submitFeedback(feedback: FeedbackData): Promise<void> {
    await this.client.rlhf.feedback({
      prompt_id: feedback.prompt_id,
      response_id: feedback.response_id,
      rating: feedback.rating,
      feedback_type: feedback.feedback_type,
      metadata: {
        user_id: feedback.user_id,
        timestamp: feedback.timestamp,
        ...feedback.metadata
      }
    });

    // Also store in table for analysis
    await this.client.table.insert({
      table: 'rlhf_feedback',
      rows: [feedback]
    });
  }

  async getFeedbackStats(
    responseId: string
  ): Promise<{
    avg_rating: number;
    total_ratings: number;
    rating_distribution: Record<number, number>;
  }> {
    const result = await this.client.table.query({
      table: 'rlhf_feedback',
      filters: { response_id: responseId }
    });

    const ratings = result.rows.map(r => r.rating);
    const distribution: Record<number, number> = {};

    for (const rating of ratings) {
      distribution[rating] = (distribution[rating] || 0) + 1;
    }

    return {
      avg_rating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      total_ratings: ratings.length,
      rating_distribution: distribution
    };
  }
}

// Usage
const collector = new FeedbackCollector(process.env.ZERODB_API_KEY!);

await collector.submitFeedback({
  prompt_id: 'prompt_123',
  response_id: 'resp_456',
  user_id: 'user_789',
  rating: 4,
  feedback_type: 'quality',
  timestamp: Date.now(),
  metadata: {
    model: 'claude-3-sonnet',
    latency_ms: 1250
  }
});

const stats = await collector.getFeedbackStats('resp_456');
console.log(`Average rating: ${stats.avg_rating.toFixed(2)}`);
```

## Comparative Feedback (Preference Learning)

### Pairwise Comparison
```typescript
interface ComparisonFeedback {
  prompt_id: string;
  response_a_id: string;
  response_b_id: string;
  user_id: string;
  preferred: 'a' | 'b' | 'tie';
  preference_strength: 'weak' | 'moderate' | 'strong';
  reasoning?: string;
  timestamp: number;
}

class ComparativeFeedbackCollector {
  private client: ZeroDBClient;

  constructor(apiKey: string) {
    this.client = new ZeroDBClient({ apiKey });
  }

  async submitComparison(comparison: ComparisonFeedback): Promise<void> {
    await this.client.table.insert({
      table: 'rlhf_comparisons',
      rows: [comparison]
    });

    // Convert preference to ratings for reward modeling
    const preferenceScore = {
      weak: 1,
      moderate: 2,
      strong: 3
    }[comparison.preference_strength];

    if (comparison.preferred === 'a') {
      await this.updateResponseScore(comparison.response_a_id, preferenceScore);
      await this.updateResponseScore(comparison.response_b_id, -preferenceScore);
    } else if (comparison.preferred === 'b') {
      await this.updateResponseScore(comparison.response_b_id, preferenceScore);
      await this.updateResponseScore(comparison.response_a_id, -preferenceScore);
    }
  }

  private async updateResponseScore(
    responseId: string,
    scoreChange: number
  ): Promise<void> {
    const result = await this.client.table.query({
      table: 'response_scores',
      filters: { response_id: responseId },
      limit: 1
    });

    const currentScore = result.rows[0]?.score || 0;

    await this.client.table.update({
      table: 'response_scores',
      filters: { response_id: responseId },
      data: {
        score: currentScore + scoreChange,
        last_updated: Date.now()
      }
    });
  }

  async getTopResponses(
    promptId: string,
    limit = 10
  ): Promise<Array<{ response_id: string; score: number }>> {
    const result = await this.client.table.query({
      table: 'response_scores',
      filters: { prompt_id: promptId },
      order_by: 'score',
      order: 'desc',
      limit
    });

    return result.rows.map(r => ({
      response_id: r.response_id,
      score: r.score
    }));
  }
}

// Usage
const comparator = new ComparativeFeedbackCollector(process.env.ZERODB_API_KEY!);

await comparator.submitComparison({
  prompt_id: 'prompt_123',
  response_a_id: 'resp_456',
  response_b_id: 'resp_789',
  user_id: 'user_123',
  preferred: 'a',
  preference_strength: 'moderate',
  reasoning: 'Response A was more concise and directly addressed the question',
  timestamp: Date.now()
});

const topResponses = await comparator.getTopResponses('prompt_123', 5);
```

## Detailed Feedback Analysis

### Multi-Dimensional Feedback
```typescript
interface DetailedFeedback {
  response_id: string;
  user_id: string;
  dimensions: {
    accuracy: number;        // 1-5
    helpfulness: number;     // 1-5
    clarity: number;         // 1-5
    completeness: number;    // 1-5
    safety: number;          // 1-5
  };
  issues?: string[];         // e.g., ['hallucination', 'off-topic']
  highlights?: string[];     // e.g., ['clear-examples', 'well-structured']
  text_feedback?: string;
  timestamp: number;
}

class DetailedFeedbackAnalyzer {
  private client: ZeroDBClient;

  constructor(apiKey: string) {
    this.client = new ZeroDBClient({ apiKey });
  }

  async submitDetailedFeedback(feedback: DetailedFeedback): Promise<void> {
    await this.client.table.insert({
      table: 'rlhf_detailed_feedback',
      rows: [feedback]
    });

    // Calculate composite score
    const avgScore =
      Object.values(feedback.dimensions).reduce((a, b) => a + b, 0) /
      Object.keys(feedback.dimensions).length;

    // Store for quick retrieval
    await this.client.table.insert({
      table: 'response_quality_scores',
      rows: [{
        response_id: feedback.response_id,
        composite_score: avgScore,
        dimension_scores: feedback.dimensions,
        issue_count: feedback.issues?.length || 0,
        highlight_count: feedback.highlights?.length || 0,
        timestamp: feedback.timestamp
      }]
    });
  }

  async analyzeResponseQuality(
    responseId: string
  ): Promise<{
    avg_scores: Record<string, number>;
    common_issues: Array<{ issue: string; count: number }>;
    common_highlights: Array<{ highlight: string; count: number }>;
    total_feedback: number;
  }> {
    const result = await this.client.table.query({
      table: 'rlhf_detailed_feedback',
      filters: { response_id: responseId }
    });

    const feedbacks = result.rows as DetailedFeedback[];

    // Aggregate scores by dimension
    const dimensionSums: Record<string, number> = {};
    const issueCounts: Record<string, number> = {};
    const highlightCounts: Record<string, number> = {};

    for (const fb of feedbacks) {
      for (const [dim, score] of Object.entries(fb.dimensions)) {
        dimensionSums[dim] = (dimensionSums[dim] || 0) + score;
      }

      for (const issue of fb.issues || []) {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      }

      for (const highlight of fb.highlights || []) {
        highlightCounts[highlight] = (highlightCounts[highlight] || 0) + 1;
      }
    }

    const avg_scores: Record<string, number> = {};
    for (const [dim, sum] of Object.entries(dimensionSums)) {
      avg_scores[dim] = sum / feedbacks.length;
    }

    const common_issues = Object.entries(issueCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const common_highlights = Object.entries(highlightCounts)
      .map(([highlight, count]) => ({ highlight, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      avg_scores,
      common_issues,
      common_highlights,
      total_feedback: feedbacks.length
    };
  }

  async identifyProblemPatterns(): Promise<Array<{
    issue: string;
    frequency: number;
    avg_impact: number;
    examples: string[];
  }>> {
    const result = await this.client.table.query({
      table: 'rlhf_detailed_feedback',
      filters: {
        issues: { $exists: true }
      },
      limit: 1000
    });

    const feedbacks = result.rows as DetailedFeedback[];

    const issueData: Record<string, {
      count: number;
      scores: number[];
      examples: Set<string>;
    }> = {};

    for (const fb of feedbacks) {
      const avgScore =
        Object.values(fb.dimensions).reduce((a, b) => a + b, 0) /
        Object.keys(fb.dimensions).length;

      for (const issue of fb.issues || []) {
        if (!issueData[issue]) {
          issueData[issue] = { count: 0, scores: [], examples: new Set() };
        }
        issueData[issue].count++;
        issueData[issue].scores.push(avgScore);
        if (fb.text_feedback) {
          issueData[issue].examples.add(fb.text_feedback);
        }
      }
    }

    return Object.entries(issueData)
      .map(([issue, data]) => ({
        issue,
        frequency: data.count,
        avg_impact: 5 - (data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        examples: Array.from(data.examples).slice(0, 3)
      }))
      .sort((a, b) => b.frequency * b.avg_impact - a.frequency * a.avg_impact)
      .slice(0, 10);
  }
}

// Usage
const analyzer = new DetailedFeedbackAnalyzer(process.env.ZERODB_API_KEY!);

await analyzer.submitDetailedFeedback({
  response_id: 'resp_456',
  user_id: 'user_123',
  dimensions: {
    accuracy: 4,
    helpfulness: 5,
    clarity: 4,
    completeness: 3,
    safety: 5
  },
  issues: ['incomplete-answer'],
  highlights: ['clear-examples', 'good-structure'],
  text_feedback: 'Good response but could include more edge cases',
  timestamp: Date.now()
});

const quality = await analyzer.analyzeResponseQuality('resp_456');
console.log('Average scores:', quality.avg_scores);
console.log('Common issues:', quality.common_issues);

const patterns = await analyzer.identifyProblemPatterns();
console.log('Top issues to address:', patterns.slice(0, 5));
```

## Implicit Feedback (Behavioral Signals)

### Tracking User Engagement
```typescript
interface ImplicitFeedback {
  response_id: string;
  user_id: string;
  session_id: string;
  engagement_signals: {
    time_to_read_ms?: number;
    copied_to_clipboard?: boolean;
    followed_links?: number;
    requested_clarification?: boolean;
    regenerated_response?: boolean;
    continued_conversation?: boolean;
  };
  timestamp: number;
}

class ImplicitFeedbackCollector {
  private client: ZeroDBClient;

  constructor(apiKey: string) {
    this.client = new ZeroDBClient({ apiKey });
  }

  async trackEngagement(feedback: ImplicitFeedback): Promise<void> {
    await this.client.table.insert({
      table: 'implicit_feedback',
      rows: [feedback]
    });

    // Calculate engagement score
    const score = this.calculateEngagementScore(feedback.engagement_signals);

    await this.client.table.insert({
      table: 'engagement_scores',
      rows: [{
        response_id: feedback.response_id,
        user_id: feedback.user_id,
        score,
        timestamp: feedback.timestamp
      }]
    });
  }

  private calculateEngagementScore(signals: ImplicitFeedback['engagement_signals']): number {
    let score = 0;

    // Positive signals
    if (signals.copied_to_clipboard) score += 2;
    if (signals.followed_links) score += signals.followed_links * 0.5;
    if (signals.continued_conversation) score += 1.5;

    // Neutral/time-based
    if (signals.time_to_read_ms) {
      // Sweet spot: 10-60 seconds
      if (signals.time_to_read_ms >= 10000 && signals.time_to_read_ms <= 60000) {
        score += 1;
      }
    }

    // Negative signals
    if (signals.requested_clarification) score -= 0.5;
    if (signals.regenerated_response) score -= 1.5;

    return Math.max(0, Math.min(5, score)); // Clamp to 0-5
  }

  async getEngagementTrends(
    timeWindowMs = 7 * 86400000
  ): Promise<{
    avg_score: number;
    trend: 'improving' | 'declining' | 'stable';
    metrics: {
      copy_rate: number;
      regeneration_rate: number;
      continuation_rate: number;
    };
  }> {
    const result = await this.client.table.query({
      table: 'implicit_feedback',
      filters: {
        timestamp: { $gt: Date.now() - timeWindowMs }
      },
      limit: 10000
    });

    const feedbacks = result.rows as ImplicitFeedback[];
    const total = feedbacks.length;

    let totalScore = 0;
    let copyCount = 0;
    let regenCount = 0;
    let continueCount = 0;

    for (const fb of feedbacks) {
      totalScore += this.calculateEngagementScore(fb.engagement_signals);
      if (fb.engagement_signals.copied_to_clipboard) copyCount++;
      if (fb.engagement_signals.regenerated_response) regenCount++;
      if (fb.engagement_signals.continued_conversation) continueCount++;
    }

    const avgScore = totalScore / total;

    // Simple trend detection (compare first half vs second half)
    const midpoint = Math.floor(feedbacks.length / 2);
    const firstHalf = feedbacks.slice(0, midpoint);
    const secondHalf = feedbacks.slice(midpoint);

    const firstHalfAvg =
      firstHalf.reduce((sum, fb) =>
        sum + this.calculateEngagementScore(fb.engagement_signals), 0
      ) / firstHalf.length;

    const secondHalfAvg =
      secondHalf.reduce((sum, fb) =>
        sum + this.calculateEngagementScore(fb.engagement_signals), 0
      ) / secondHalf.length;

    let trend: 'improving' | 'declining' | 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'improving';
    else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'declining';
    else trend = 'stable';

    return {
      avg_score: avgScore,
      trend,
      metrics: {
        copy_rate: copyCount / total,
        regeneration_rate: regenCount / total,
        continuation_rate: continueCount / total
      }
    };
  }
}

// Usage
const implicitCollector = new ImplicitFeedbackCollector(process.env.ZERODB_API_KEY!);

await implicitCollector.trackEngagement({
  response_id: 'resp_456',
  user_id: 'user_123',
  session_id: 'sess_abc',
  engagement_signals: {
    time_to_read_ms: 25000,
    copied_to_clipboard: true,
    followed_links: 2,
    continued_conversation: true
  },
  timestamp: Date.now()
});

const trends = await implicitCollector.getEngagementTrends(7 * 86400000);
console.log(`Engagement trend: ${trends.trend}`);
console.log(`Average score: ${trends.avg_score.toFixed(2)}`);
```

## Building Training Datasets

### Export Feedback for Model Training
```typescript
interface TrainingExample {
  prompt: string;
  response: string;
  reward_score: number;
  metadata: {
    model: string;
    timestamp: number;
    user_feedback?: any;
  };
}

class TrainingDatasetBuilder {
  private client: ZeroDBClient;

  constructor(apiKey: string) {
    this.client = new ZeroDBClient({ apiKey });
  }

  async buildDataset(options: {
    minRating?: number;
    minFeedbackCount?: number;
    includeComparisons?: boolean;
    limit?: number;
  }): Promise<TrainingExample[]> {
    const {
      minRating = 3.5,
      minFeedbackCount = 3,
      includeComparisons = true,
      limit = 10000
    } = options;

    // Get high-quality responses
    const result = await this.client.table.query({
      table: 'response_quality_scores',
      filters: {
        composite_score: { $gte: minRating }
      },
      order_by: 'composite_score',
      order: 'desc',
      limit
    });

    const examples: TrainingExample[] = [];

    for (const row of result.rows) {
      // Get original prompt and response
      const promptResult = await this.client.table.query({
        table: 'prompts',
        filters: { prompt_id: row.prompt_id },
        limit: 1
      });

      const responseResult = await this.client.table.query({
        table: 'responses',
        filters: { response_id: row.response_id },
        limit: 1
      });

      if (promptResult.rows.length === 0 || responseResult.rows.length === 0) {
        continue;
      }

      const prompt = promptResult.rows[0];
      const response = responseResult.rows[0];

      examples.push({
        prompt: prompt.content,
        response: response.content,
        reward_score: row.composite_score,
        metadata: {
          model: response.model,
          timestamp: response.timestamp,
          user_feedback: row.dimension_scores
        }
      });
    }

    return examples;
  }

  async exportToJSONL(examples: TrainingExample[], filepath: string): Promise<void> {
    const fs = await import('fs');
    const lines = examples.map(ex => JSON.stringify(ex)).join('\n');
    fs.writeFileSync(filepath, lines, 'utf-8');
  }

  async buildComparisonDataset(): Promise<Array<{
    prompt: string;
    chosen: string;
    rejected: string;
    preference_strength: string;
  }>> {
    const result = await this.client.table.query({
      table: 'rlhf_comparisons',
      filters: {
        preferred: { $ne: 'tie' }
      },
      limit: 10000
    });

    const comparisons = result.rows as ComparisonFeedback[];
    const dataset: Array<{
      prompt: string;
      chosen: string;
      rejected: string;
      preference_strength: string;
    }> = [];

    for (const comp of comparisons) {
      const promptResult = await this.client.table.query({
        table: 'prompts',
        filters: { prompt_id: comp.prompt_id },
        limit: 1
      });

      const responseAResult = await this.client.table.query({
        table: 'responses',
        filters: { response_id: comp.response_a_id },
        limit: 1
      });

      const responseBResult = await this.client.table.query({
        table: 'responses',
        filters: { response_id: comp.response_b_id },
        limit: 1
      });

      if (!promptResult.rows[0] || !responseAResult.rows[0] || !responseBResult.rows[0]) {
        continue;
      }

      dataset.push({
        prompt: promptResult.rows[0].content,
        chosen: comp.preferred === 'a'
          ? responseAResult.rows[0].content
          : responseBResult.rows[0].content,
        rejected: comp.preferred === 'a'
          ? responseBResult.rows[0].content
          : responseAResult.rows[0].content,
        preference_strength: comp.preference_strength
      });
    }

    return dataset;
  }
}

// Usage
const datasetBuilder = new TrainingDatasetBuilder(process.env.ZERODB_API_KEY!);

const trainingExamples = await datasetBuilder.buildDataset({
  minRating: 4.0,
  minFeedbackCount: 5,
  limit: 5000
});

await datasetBuilder.exportToJSONL(trainingExamples, './training_data.jsonl');

const comparisonDataset = await datasetBuilder.buildComparisonDataset();
console.log(`Built comparison dataset with ${comparisonDataset.length} examples`);
```

## Best Practices

### 1. Feedback Collection Strategy
- **Mix explicit and implicit feedback**: Ratings + behavioral signals
- **Use comparative feedback** for nuanced preferences
- **Collect multi-dimensional ratings** to identify specific issues
- **Make feedback easy**: Low friction UI, optional comments

### 2. Quality Control
- **Filter out spam/low-quality feedback**: Check for patterns
- **Require minimum feedback count**: Don't train on single ratings
- **Weight feedback by user expertise**: Trust domain experts more
- **Monitor inter-rater reliability**: Check for consistency

### 3. Dataset Curation
- **Balance positive and negative examples**: Avoid skewed datasets
- **Include edge cases**: Rare but important scenarios
- **Version your datasets**: Track improvements over time
- **Anonymize sensitive data**: Privacy-first approach

### 4. Continuous Improvement
- **Track metrics over time**: Monitor quality trends
- **A/B test changes**: Measure impact of improvements
- **Close the feedback loop**: Show users their impact
- **Iterate quickly**: Use feedback to drive rapid improvements
