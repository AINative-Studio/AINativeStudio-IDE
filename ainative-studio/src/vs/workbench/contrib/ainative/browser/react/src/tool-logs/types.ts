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
}

/**
 * Backend API endpoint response format
 *
 * Expected schema for /api/v1/tool-logs endpoint
 */
export interface ToolLogsAPIResponse {
	/**
	 * Success flag
	 */
	success: boolean;

	/**
	 * Paginated logs data
	 */
	data: PaginatedToolLogs;

	/**
	 * Statistics (optional)
	 */
	statistics?: ToolLogsStatistics;

	/**
	 * Error message (if success = false)
	 */
	error?: string;
}

/**
 * Real-time tool execution update (WebSocket/SSE)
 */
export interface ToolExecutionUpdate {
	/**
	 * Update type
	 */
	type: 'started' | 'progress' | 'completed' | 'error';

	/**
	 * Log entry ID
	 */
	logId: string;

	/**
	 * Updated log entry
	 */
	log: ToolExecutionLog;

	/**
	 * Progress percentage (0-100) for progress updates
	 */
	progress?: number;

	/**
	 * Status message
	 */
	message?: string;
}
