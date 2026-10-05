/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Types for Tool Execution Logs Panel
 *
 * Provides comprehensive logging and debugging interface for tool executions
 * including code_intelligence, web_fetch, and other tool types.
 */

/**
 * Tool types that can be executed
 */
export type ToolType =
	| 'code_intelligence'
	| 'web_fetch'
	| 'file_operation'
	| 'search'
	| 'unknown';

/**
 * Execution status of a tool call
 */
export type ExecutionStatus =
	| 'pending'
	| 'running'
	| 'success'
	| 'error'
	| 'timeout'
	| 'cancelled';

/**
 * Complete tool execution log entry
 */
export interface ToolExecutionLog {
	/**
	 * Unique log entry ID
	 */
	id: string;

	/**
	 * Type of tool executed
	 */
	toolType: ToolType;

	/**
	 * Specific operation performed
	 */
	operation: string;

	/**
	 * Execution status
	 */
	status: ExecutionStatus;

	/**
	 * Timestamp when execution started
	 */
	timestamp: Date;

	/**
	 * Duration in milliseconds (if completed)
	 */
	duration?: number;

	/**
	 * Thread ID where this tool was executed
	 */
	threadId: string;

	/**
	 * Message index in the thread
	 */
	messageIndex: number;

	/**
	 * Input parameters passed to the tool
	 */
	input: ToolInput;

	/**
	 * Output/result from the tool
	 */
	output?: ToolOutput;

	/**
	 * Error details if failed
	 */
	error?: ToolError;

	/**
	 * Token usage for this execution
	 */
	tokens?: {
		input: number;
		output: number;
		total: number;
	};

	/**
	 * Cost in credits/USD
	 */
	cost?: number;

	/**
	 * Model used (if applicable)
	 */
	model?: string;

	/**
	 * Additional metadata
	 */
	metadata?: Record<string, any>;
}

/**
 * Tool input parameters
 */
export interface ToolInput {
	/**
	 * Operation-specific parameters
	 */
	parameters: Record<string, any>;

	/**
	 * Raw input size in bytes
	 */
	sizeBytes?: number;

	/**
	 * Input truncated flag
	 */
	truncated?: boolean;
}

/**
 * Tool output/result
 */
export interface ToolOutput {
	/**
	 * Result data (varies by tool type)
	 */
	data: any;

	/**
	 * Output size in bytes
	 */
	sizeBytes?: number;

	/**
	 * Output truncated flag
	 */
	truncated?: boolean;

	/**
	 * Content type (e.g., 'text/plain', 'application/json')
	 */
	contentType?: string;
}

/**
 * Tool execution error
 */
export interface ToolError {
	/**
	 * Error code
	 */
	code: string;

	/**
	 * Human-readable error message
	 */
	message: string;

	/**
	 * Stack trace (if available)
	 */
	stack?: string;

	/**
	 * Additional error details
	 */
	details?: Record<string, any>;
}

/**
 * Filter options for tool logs
 */
export interface ToolLogsFilter {
	/**
	 * Filter by tool type(s)
	 */
	toolTypes?: ToolType[];

	/**
	 * Filter by status(es)
	 */
	statuses?: ExecutionStatus[];

	/**
	 * Date range filter
	 */
	dateRange?: {
		start: Date;
		end: Date;
	};

	/**
	 * Filter by thread ID
	 */
	threadId?: string;

	/**
	 * Search query (searches in operation, input, output)
	 */
	searchQuery?: string;

	/**
	 * Minimum duration (ms)
	 */
	minDuration?: number;

	/**
	 * Maximum duration (ms)
	 */
	maxDuration?: number;
}

/**
 * Sort options for tool logs
 */
export interface ToolLogsSortOptions {
	/**
	 * Field to sort by
	 */
	field: 'timestamp' | 'duration' | 'toolType' | 'status';

	/**
	 * Sort direction
	 */
	direction: 'asc' | 'desc';
}

/**
 * Pagination options
 */
export interface PaginationOptions {
	/**
	 * Current page (1-indexed)
	 */
	page: number;

	/**
	 * Items per page
	 */
	pageSize: number;
}

/**
 * Paginated tool logs response
 */
export interface PaginatedToolLogs {
	/**
	 * Log entries for current page
	 */
	logs: ToolExecutionLog[];

	/**
	 * Total number of logs matching filter
	 */
	total: number;

	/**
	 * Current page number
	 */
	page: number;

	/**
	 * Page size
	 */
	pageSize: number;

	/**
	 * Total number of pages
	 */
	totalPages: number;

	/**
	 * Whether there's a next page
	 */
	hasNextPage: boolean;

	/**
	 * Whether there's a previous page
	 */
	hasPreviousPage: boolean;

	/**
	 * True when these logs are illustrative sample data rather than real local
	 * tool execution history (e.g. no tools have run in this workspace yet).
	 * Consumers MUST surface this to the user via a visible indicator — never
	 * present sample data as if it were real.
	 */
	isSampleData: boolean;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv' | 'text';

/**
 * Tool logs statistics
 */
export interface ToolLogsStatistics {
	/**
	 * Total number of executions
	 */
	totalExecutions: number;

	/**
	 * Successful executions
	 */
	successfulExecutions: number;

	/**
	 * Failed executions
	 */
	failedExecutions: number;

	/**
	 * Average execution duration (ms)
	 */
	averageDuration: number;

	/**
	 * Total tokens used
	 */
	totalTokens: number;

	/**
	 * Total cost
	 */
	totalCost: number;

	/**
	 * Breakdown by tool type
	 */
	byToolType: Record<ToolType, {
		count: number;
		successRate: number;
		averageDuration: number;
	}>;

	/**
	 * Execution trend over time
	 */
	timeline?: {
		date: string;
		count: number;
		successCount: number;
		failureCount: number;
	}[];

	/**
	 * True when these statistics are illustrative sample data rather than
	 * derived from real local tool execution history.
	 */
	isSampleData?: boolean;
}

/**
 * NOTE: tool execution logs are a local IDE feature sourced from
 * `IChatThreadService` chat thread history (see toolLogsService.ts) — there is
 * no AINative Cloud backend endpoint for this, so no backend API response or
 * real-time WebSocket/SSE update shape is defined here. If a backend-backed
 * remote log sync is ever added, define those types at that point.
 */
