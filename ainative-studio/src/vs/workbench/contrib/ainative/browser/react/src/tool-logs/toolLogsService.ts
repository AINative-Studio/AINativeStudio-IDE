/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Logs Service
 *
 * Handles fetching, filtering, and managing tool execution logs
 * Provides mock data when backend endpoint is not available
 */

import {
	ToolExecutionLog,
	ToolLogsFilter,
	ToolLogsSortOptions,
	PaginationOptions,
	PaginatedToolLogs,
	ToolLogsStatistics,
	ToolType,
	ExecutionStatus
} from './types';

/**
 * Check if backend endpoint is available
 */
async function checkEndpointAvailable(): Promise<boolean> {
	try {
		const response = await fetch('/api/v1/tool-logs/health', {
			method: 'HEAD'
		});
		return response.ok;
	} catch (error) {
		return false;
	}
}

/**
 * Fetch tool logs from backend or generate mock data
 */
export async function fetchToolLogs(
	filter?: ToolLogsFilter,
	sort?: ToolLogsSortOptions,
	pagination?: PaginationOptions
): Promise<PaginatedToolLogs> {
	const isEndpointAvailable = await checkEndpointAvailable();

	if (isEndpointAvailable) {
		return fetchFromBackend(filter, sort, pagination);
	} else {
		console.warn('[ToolLogsService] Backend endpoint not available, using mock data');
		return generateMockData(filter, sort, pagination);
	}
}

/**
 * Fetch from backend API
 */
async function fetchFromBackend(
	filter?: ToolLogsFilter,
	sort?: ToolLogsSortOptions,
	pagination?: PaginationOptions
): Promise<PaginatedToolLogs> {
	const params = new URLSearchParams();

	// Add filter parameters
	if (filter) {
		if (filter.toolTypes) {
			params.append('toolTypes', filter.toolTypes.join(','));
		}
		if (filter.statuses) {
			params.append('statuses', filter.statuses.join(','));
		}
		if (filter.dateRange) {
			params.append('startDate', filter.dateRange.start.toISOString());
			params.append('endDate', filter.dateRange.end.toISOString());
		}
		if (filter.threadId) {
			params.append('threadId', filter.threadId);
		}
		if (filter.searchQuery) {
			params.append('search', filter.searchQuery);
		}
		if (filter.minDuration !== undefined) {
			params.append('minDuration', filter.minDuration.toString());
		}
		if (filter.maxDuration !== undefined) {
			params.append('maxDuration', filter.maxDuration.toString());
		}
	}

	// Add sort parameters
	if (sort) {
		params.append('sortBy', sort.field);
		params.append('sortDirection', sort.direction);
	}

	// Add pagination parameters
	const page = pagination?.page ?? 1;
	const pageSize = pagination?.pageSize ?? 25;
	params.append('page', page.toString());
	params.append('pageSize', pageSize.toString());

	const response = await fetch(`/api/v1/tool-logs?${params.toString()}`);

	if (!response.ok) {
		throw new Error(`Failed to fetch tool logs: ${response.statusText}`);
	}

	const data = await response.json();
	return data.data;
}

/**
 * Generate mock data for development/testing
 */
function generateMockData(
	filter?: ToolLogsFilter,
	sort?: ToolLogsSortOptions,
	pagination?: PaginationOptions
): PaginatedToolLogs {
	const allLogs = generateMockLogs(100);
	let filteredLogs = filterLogs(allLogs, filter);
	filteredLogs = sortLogs(filteredLogs, sort);

	const page = pagination?.page ?? 1;
	const pageSize = pagination?.pageSize ?? 25;
	const start = (page - 1) * pageSize;
	const end = start + pageSize;
	const paginatedLogs = filteredLogs.slice(start, end);

	return {
		logs: paginatedLogs,
		total: filteredLogs.length,
		page,
		pageSize,
		totalPages: Math.ceil(filteredLogs.length / pageSize),
		hasNextPage: end < filteredLogs.length,
		hasPreviousPage: page > 1
	};
}

/**
 * Generate mock tool execution logs
 */
function generateMockLogs(count: number): ToolExecutionLog[] {
	const logs: ToolExecutionLog[] = [];
	const toolTypes: ToolType[] = ['code_intelligence', 'web_fetch', 'file_operation', 'search'];
	const statuses: ExecutionStatus[] = ['success', 'success', 'success', 'error', 'timeout'];

	for (let i = 0; i < count; i++) {
		const toolType = toolTypes[Math.floor(Math.random() * toolTypes.length)];
		const status = statuses[Math.floor(Math.random() * statuses.length)];
		const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
		const duration = status === 'success' ? Math.random() * 5000 : undefined;

		logs.push({
			id: `log-${i}`,
			toolType,
			operation: getOperationForToolType(toolType),
			status,
			timestamp,
			duration,
			threadId: `thread-${Math.floor(Math.random() * 10)}`,
			messageIndex: Math.floor(Math.random() * 50),
			input: {
				parameters: generateInputForToolType(toolType),
				sizeBytes: Math.floor(Math.random() * 10000)
			},
			output: status === 'success' ? {
				data: generateOutputForToolType(toolType),
				sizeBytes: Math.floor(Math.random() * 50000),
				contentType: 'application/json'
			} : undefined,
			error: status === 'error' ? {
				code: 'EXECUTION_FAILED',
				message: 'Tool execution failed due to invalid parameters'
			} : undefined,
			tokens: {
				input: Math.floor(Math.random() * 1000),
				output: Math.floor(Math.random() * 2000),
				total: Math.floor(Math.random() * 3000)
			},
			cost: Math.random() * 0.1,
			model: 'gpt-4'
		});
	}

	return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get operation name for tool type
 */
function getOperationForToolType(toolType: ToolType): string {
	switch (toolType) {
		case 'code_intelligence':
			return ['analyze_complexity', 'parse_ast', 'find_symbol'][Math.floor(Math.random() * 3)];
		case 'web_fetch':
			return ['fetch_documentation', 'fetch_url'][Math.floor(Math.random() * 2)];
		case 'file_operation':
			return ['read_file', 'write_file', 'list_directory'][Math.floor(Math.random() * 3)];
		case 'search':
			return ['search_code', 'search_files'][Math.floor(Math.random() * 2)];
		default:
			return 'unknown_operation';
	}
}

/**
 * Generate input parameters for tool type
 */
function generateInputForToolType(toolType: ToolType): Record<string, any> {
	switch (toolType) {
		case 'code_intelligence':
			return {
				language: 'python',
				code: 'def example():\n    pass',
				operation: 'analyze_complexity'
			};
		case 'web_fetch':
			return {
				url: 'https://docs.python.org/3/library/os.html',
				prompt: 'Fetch documentation for os module'
			};
		case 'file_operation':
			return {
				path: '/path/to/file.py',
				action: 'read'
			};
		case 'search':
			return {
				query: 'function definition',
				scope: 'workspace'
			};
		default:
			return {};
	}
}

/**
 * Generate output data for tool type
 */
function generateOutputForToolType(toolType: ToolType): any {
	switch (toolType) {
		case 'code_intelligence':
			return {
				complexity: {
					averageComplexity: 5.2,
					maxComplexity: 15,
					totalFunctions: 8
				}
			};
		case 'web_fetch':
			return {
				title: 'Python os Module Documentation',
				content: 'The os module provides...',
				url: 'https://docs.python.org/3/library/os.html'
			};
		case 'file_operation':
			return {
				content: 'File contents here...',
				lines: 42
			};
		case 'search':
			return {
				results: [
					{ file: 'main.py', line: 10, match: 'def main():' },
					{ file: 'utils.py', line: 5, match: 'def helper():' }
				],
				totalMatches: 2
			};
		default:
			return {};
	}
}

/**
 * Filter logs based on criteria
 */
function filterLogs(logs: ToolExecutionLog[], filter?: ToolLogsFilter): ToolExecutionLog[] {
	if (!filter) {
		return logs;
	}

	return logs.filter(log => {
		if (filter.toolTypes && !filter.toolTypes.includes(log.toolType)) {
			return false;
		}
		if (filter.statuses && !filter.statuses.includes(log.status)) {
			return false;
		}
		if (filter.dateRange) {
			const logTime = log.timestamp.getTime();
			const startTime = filter.dateRange.start.getTime();
			const endTime = filter.dateRange.end.getTime();
			if (logTime < startTime || logTime > endTime) {
				return false;
			}
		}
		if (filter.threadId && log.threadId !== filter.threadId) {
			return false;
		}
		if (filter.searchQuery) {
			const query = filter.searchQuery.toLowerCase();
			const searchable = JSON.stringify(log).toLowerCase();
			if (!searchable.includes(query)) {
				return false;
			}
		}
		if (filter.minDuration !== undefined && log.duration !== undefined && log.duration < filter.minDuration) {
			return false;
		}
		if (filter.maxDuration !== undefined && log.duration !== undefined && log.duration > filter.maxDuration) {
			return false;
		}
		return true;
	});
}

/**
 * Sort logs based on criteria
 */
function sortLogs(logs: ToolExecutionLog[], sort?: ToolLogsSortOptions): ToolExecutionLog[] {
	if (!sort) {
		return logs;
	}

	return [...logs].sort((a, b) => {
		let comparison = 0;

		switch (sort.field) {
			case 'timestamp':
				comparison = a.timestamp.getTime() - b.timestamp.getTime();
				break;
			case 'duration':
				const aDuration = a.duration ?? 0;
				const bDuration = b.duration ?? 0;
				comparison = aDuration - bDuration;
				break;
			case 'toolType':
				comparison = a.toolType.localeCompare(b.toolType);
				break;
			case 'status':
				comparison = a.status.localeCompare(b.status);
				break;
		}

		return sort.direction === 'asc' ? comparison : -comparison;
	});
}

/**
 * Fetch tool logs statistics
 */
export async function fetchToolLogsStatistics(filter?: ToolLogsFilter): Promise<ToolLogsStatistics> {
	const isEndpointAvailable = await checkEndpointAvailable();

	if (isEndpointAvailable) {
		const params = new URLSearchParams();
		if (filter?.dateRange) {
			params.append('startDate', filter.dateRange.start.toISOString());
			params.append('endDate', filter.dateRange.end.toISOString());
		}

		const response = await fetch(`/api/v1/tool-logs/statistics?${params.toString()}`);
		const data = await response.json();
		return data.statistics;
	}

	// Generate mock statistics
	return generateMockStatistics();
}

/**
 * Generate mock statistics
 */
function generateMockStatistics(): ToolLogsStatistics {
	return {
		totalExecutions: 156,
		successfulExecutions: 142,
		failedExecutions: 14,
		averageDuration: 2340,
		totalTokens: 45678,
		totalCost: 12.34,
		byToolType: {
			code_intelligence: { count: 78, successRate: 0.92, averageDuration: 1800 },
			web_fetch: { count: 45, successRate: 0.95, averageDuration: 3200 },
			file_operation: { count: 23, successRate: 0.91, averageDuration: 500 },
			search: { count: 10, successRate: 0.90, averageDuration: 1200 },
			unknown: { count: 0, successRate: 0, averageDuration: 0 }
		}
	};
}

/**
 * Export tool logs to specified format
 */
export function exportToolLogs(logs: ToolExecutionLog[], format: 'json' | 'csv' | 'text'): string {
	switch (format) {
		case 'json':
			return JSON.stringify(logs, null, 2);
		case 'csv':
			return convertToCSV(logs);
		case 'text':
			return convertToText(logs);
		default:
			return '';
	}
}

/**
 * Convert logs to CSV format
 */
function convertToCSV(logs: ToolExecutionLog[]): string {
	const headers = ['ID', 'Timestamp', 'Tool Type', 'Operation', 'Status', 'Duration (ms)', 'Tokens', 'Cost'];
	const rows = logs.map(log => [
		log.id,
		log.timestamp.toISOString(),
		log.toolType,
		log.operation,
		log.status,
		log.duration?.toString() ?? 'N/A',
		log.tokens?.total.toString() ?? 'N/A',
		log.cost?.toFixed(4) ?? 'N/A'
	]);

	return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Convert logs to text format
 */
function convertToText(logs: ToolExecutionLog[]): string {
	return logs.map(log => {
		const lines = [
			`Log ID: ${log.id}`,
			`Timestamp: ${log.timestamp.toISOString()}`,
			`Tool Type: ${log.toolType}`,
			`Operation: ${log.operation}`,
			`Status: ${log.status}`,
			`Duration: ${log.duration ?? 'N/A'} ms`,
			`Tokens: ${log.tokens?.total ?? 'N/A'}`,
			`Cost: $${log.cost?.toFixed(4) ?? 'N/A'}`,
			`Thread ID: ${log.threadId}`,
			'---'
		];
		return lines.join('\n');
	}).join('\n\n');
}

/**
 * Download file with given content
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
