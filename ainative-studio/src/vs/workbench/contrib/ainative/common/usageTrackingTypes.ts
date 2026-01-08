/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Usage Tracking Types
 * Type definitions for usage tracking, cost calculation, and quota monitoring
 */

/**
 * Usage record for a single model invocation
 */
export interface UsageRecord {
	/**
	 * Unique record identifier
	 */
	readonly id: string;

	/**
	 * Model identifier that was invoked
	 */
	readonly modelId: string;

	/**
	 * Number of input tokens consumed
	 */
	readonly inputTokens: number;

	/**
	 * Number of output tokens generated
	 */
	readonly outputTokens: number;

	/**
	 * Total tokens (input + output)
	 */
	readonly totalTokens: number;

	/**
	 * Total cost in USD for this invocation
	 */
	readonly cost: number;

	/**
	 * Unix timestamp when this usage occurred
	 */
	readonly timestamp: number;
}

/**
 * Aggregated usage statistics for a time period
 */
export interface AggregatedUsage {
	/**
	 * Total number of API calls made
	 */
	readonly totalCalls: number;

	/**
	 * Total tokens consumed across all calls
	 */
	readonly totalTokens: number;

	/**
	 * Total input tokens consumed
	 */
	readonly inputTokens: number;

	/**
	 * Total output tokens generated
	 */
	readonly outputTokens: number;

	/**
	 * Total cost in USD for all usage
	 */
	readonly totalCost: number;

	/**
	 * Usage breakdown by model ID
	 */
	readonly byModel: Record<string, {
		/**
		 * Number of calls to this model
		 */
		readonly calls: number;

		/**
		 * Total tokens for this model
		 */
		readonly tokens: number;

		/**
		 * Input tokens for this model
		 */
		readonly inputTokens: number;

		/**
		 * Output tokens for this model
		 */
		readonly outputTokens: number;

		/**
		 * Total cost for this model
		 */
		readonly cost: number;
	}>;

	/**
	 * Start of the aggregation period (Unix timestamp)
	 */
	readonly periodStart: number;

	/**
	 * End of the aggregation period (Unix timestamp)
	 */
	readonly periodEnd: number;
}

/**
 * Quota status information
 */
export interface QuotaStatus {
	/**
	 * Whether the user has an active quota
	 */
	readonly hasQuota: boolean;

	/**
	 * Total quota limit (in tokens or requests)
	 */
	readonly totalLimit: number;

	/**
	 * Amount of quota already used
	 */
	readonly used: number;

	/**
	 * Amount of quota remaining
	 */
	readonly remaining: number;

	/**
	 * Whether the quota has been exceeded
	 */
	readonly exceeded: boolean;

	/**
	 * Date when the quota resets (ISO string)
	 */
	readonly resetDate?: string;

	/**
	 * Threshold percentage for warning (default: 0.8 = 80%)
	 */
	readonly warningThreshold: number;

	/**
	 * Whether usage is approaching the warning threshold
	 */
	readonly approaching: boolean;
}

/**
 * Cost calculation result for a potential usage
 */
export interface CostCalculation {
	/**
	 * Cost for input tokens in USD
	 */
	readonly inputCost: number;

	/**
	 * Cost for output tokens in USD
	 */
	readonly outputCost: number;

	/**
	 * Total cost in USD
	 */
	readonly totalCost: number;
}

/**
 * Time period options for usage queries
 */
export type UsagePeriod = 'day' | 'week' | 'month' | 'all';

/**
 * Quota warning event data
 */
export interface QuotaWarning {
	/**
	 * Current usage percentage (0-1)
	 */
	readonly usagePercentage: number;

	/**
	 * Tokens used
	 */
	readonly used: number;

	/**
	 * Total limit
	 */
	readonly limit: number;

	/**
	 * Tokens remaining
	 */
	readonly remaining: number;

	/**
	 * Threshold that triggered the warning
	 */
	readonly threshold: number;
}

/**
 * Quota exceeded event data
 */
export interface QuotaExceeded {
	/**
	 * Tokens used
	 */
	readonly used: number;

	/**
	 * Total limit that was exceeded
	 */
	readonly limit: number;

	/**
	 * Amount over the limit
	 */
	readonly overage: number;

	/**
	 * Date when quota resets (ISO string)
	 */
	readonly resetDate?: string;
}

/**
 * Usage tracking error codes
 */
export enum UsageTrackingErrorCode {
	/**
	 * Model not found in registry
	 */
	ModelNotFound = 'MODEL_NOT_FOUND',

	/**
	 * Cost calculation failed
	 */
	CostCalculationFailed = 'COST_CALCULATION_FAILED',

	/**
	 * Cloud sync failed
	 */
	SyncFailed = 'SYNC_FAILED',

	/**
	 * Storage operation failed
	 */
	StorageFailed = 'STORAGE_FAILED',

	/**
	 * Unknown error
	 */
	UnknownError = 'UNKNOWN_ERROR'
}

/**
 * Usage tracking error
 */
export class UsageTrackingError extends Error {
	constructor(
		public readonly code: UsageTrackingErrorCode,
		message: string,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'UsageTrackingError';
	}
}

/**
 * Usage sync status
 */
export interface UsageSyncStatus {
	/**
	 * Last successful sync timestamp
	 */
	readonly lastSync: number | null;

	/**
	 * Whether a sync is currently in progress
	 */
	readonly syncing: boolean;

	/**
	 * Error from last sync attempt (if any)
	 */
	readonly lastError?: string;

	/**
	 * Number of pending local records not yet synced
	 */
	readonly pendingRecords: number;
}

/**
 * Managed usage record with credits tracking
 */
export interface ManagedUsageRecord extends UsageRecord {
	/**
	 * Credits consumed for this invocation
	 */
	readonly creditsConsumed: number;

	/**
	 * Credits remaining after this invocation
	 */
	readonly creditsRemaining: number;

	/**
	 * User's plan tier at time of invocation
	 */
	readonly planTier: string;
}

/**
 * Credits status information
 */
export interface CreditsStatus {
	/**
	 * Total credits used in current period
	 */
	readonly used: number;

	/**
	 * Credits remaining in current period
	 */
	readonly remaining: number;

	/**
	 * Total credits allocated for the period
	 */
	readonly total: number;

	/**
	 * Percentage of credits used (0-100)
	 */
	readonly percentUsed: number;

	/**
	 * Whether credits are running low (< 20% remaining)
	 */
	readonly isLow: boolean;

	/**
	 * User's current plan tier
	 */
	readonly planTier: string;

	/**
	 * Date when credits reset (ISO string)
	 */
	readonly resetDate?: string;
}

/**
 * Credits usage history for a time period
 */
export interface CreditsHistory {
	/**
	 * Time period for this history
	 */
	readonly period: {
		readonly start: Date;
		readonly end: Date;
	};

	/**
	 * Daily usage breakdown
	 */
	readonly dailyUsage: Array<{
		/**
		 * Date in YYYY-MM-DD format
		 */
		readonly date: string;

		/**
		 * Credits consumed on this date
		 */
		readonly creditsUsed: number;

		/**
		 * Number of requests made
		 */
		readonly requestCount: number;

		/**
		 * Total tokens used
		 */
		readonly tokensUsed: number;
	}>;

	/**
	 * Total credits used in period
	 */
	readonly totalCreditsUsed: number;

	/**
	 * Total requests in period
	 */
	readonly totalRequests: number;

	/**
	 * Total tokens in period
	 */
	readonly totalTokens: number;
}
