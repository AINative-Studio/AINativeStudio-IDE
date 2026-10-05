/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Logs Service
 *
 * Tool execution logging is a LOCAL IDE feature: it reflects tools the AI agent
 * has run in this workspace (file edits, terminal commands, searches, MCP
 * calls, etc.), which already live in `IChatThreadService`'s per-thread message
 * history (`ThreadType.messages`, role `'tool'`). There is no AINative Cloud
 * backend endpoint for this (confirmed against docs/api/BACKEND_CONTRACT_NOTES.md
 * and a live 404 against https://api.ainative.studio/api/v1/tool-logs/health) —
 * tool execution is a local-agent concept, not a cloud-inference one.
 *
 * This service therefore derives logs directly from chat thread state instead
 * of calling any network endpoint. `generateSampleData` / `generateSampleStatistics`
 * are kept only as an explicit, clearly-labeled fallback for when there are no
 * local tool executions yet to show (e.g. a brand new workspace) — callers must
 * surface `PaginatedToolLogs.isSampleData` / `ToolLogsStatistics.isSampleData` to
 * the user (see the sample-data banner in ToolLogsPanel.tsx) rather than silently
 * presenting fabricated data as real, which was the root cause of #148.
 */

import { ChatMessage } from '../../../../common/chatThreadServiceTypes.js';
import {
	ToolExecutionLog,
	ToolLogsFilter,
	ToolLogsSortOptions,
	PaginationOptions,
	PaginatedToolLogs,
	ToolLogsStatistics,
	ToolType,
	ExecutionStatus
} from './types.js';

/**
 * Minimal shape this service needs from `IChatThreadService.state.allThreads`.
 * Kept narrow (rather than importing `ThreadsState` directly) so this module
 * doesn't need to pull in the full chat thread service for a simple read.
 */
export type ToolLogsThreadsSource = {
	[threadId: string]: undefined | {
		messages: ChatMessage[];
	};
};

/**
 * Map a real builtin/MCP tool name to the coarse-grained category the UI
 * filters on. Unrecognized / MCP tool names fall back to 'unknown' rather
 * than being miscategorized.
 */
function toolTypeOfToolName(toolName: string): ToolType {
	switch (toolName) {
		case 'read_file':
		case 'ls_dir':
		case 'get_dir_tree':
		case 'rewrite_file':
		case 'edit_file':
		case 'create_file_or_folder':
		case 'delete_file_or_folder':
		case 'read_lint_errors':
			return 'file_operation';
		case 'search_pathnames_only':
		case 'search_for_files':
		case 'search_in_file':
			return 'search';
		case 'run_command':
		case 'run_persistent_command':
		case 'open_persistent_terminal':
		case 'kill_persistent_terminal':
			return 'code_intelligence';
		default:
			return 'unknown';
	}
}

/**
 * Map a tool message's lifecycle `type` to the panel's execution status.
 */
function statusOfToolMessageType(type: (ChatMessage & { role: 'tool' })['type']): ExecutionStatus {
	switch (type) {
		case 'tool_request':
			return 'pending';
		case 'running_now':
			return 'running';
		case 'success':
			return 'success';
		case 'tool_error':
			return 'error';
		case 'rejected':
			return 'cancelled';
		case 'invalid_params':
			return 'error';
		default:
			return 'error';
	}
}

function sizeOfJson(value: unknown): number | undefined {
	try {
		return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
	} catch {
		return undefined;
	}
}

/**
 * Convert every `role: 'tool'` message across all chat threads into a
 * `ToolExecutionLog`. This is the real, local source of truth for "what
 * tools has the agent run" — no network call, no mock data.
 */
export function buildToolLogsFromThreads(allThreads: ToolLogsThreadsSource): ToolExecutionLog[] {
	const logs: ToolExecutionLog[] = [];

	for (const threadId of Object.keys(allThreads)) {
		const thread = allThreads[threadId];
		if (!thread) continue;

		thread.messages.forEach((message, messageIndex) => {
			if (message.role !== 'tool') return;

			const toolType = toolTypeOfToolName(message.name);
			const status = statusOfToolMessageType(message.type);
			const isError = message.type === 'tool_error' || message.type === 'invalid_params';

			logs.push({
				id: message.id,
				toolType,
				operation: message.name,
				status,
				// Real tool messages don't currently timestamp when they started;
				// thread/message ordering is the only ordering signal we have, so
				// logs are presented in thread/message order rather than sorted by
				// a fabricated timestamp.
				timestamp: new Date(0),
				duration: undefined,
				threadId,
				messageIndex,
				input: {
					parameters: (message.rawParams ?? {}) as Record<string, any>,
					sizeBytes: sizeOfJson(message.rawParams)
				},
				output: message.type === 'success' ? {
					data: message.result,
					sizeBytes: sizeOfJson(message.result),
					contentType: 'application/json'
				} : undefined,
				error: isError ? {
					code: message.type === 'invalid_params' ? 'INVALID_PARAMS' : 'EXECUTION_FAILED',
					message: typeof message.result === 'string' ? message.result : message.content
				} : undefined,
				// Token/cost accounting for individual tool calls isn't tracked by
				// chatThreadService today (only aggregate message-level metadata
				// exists) — leave these undefined rather than inventing numbers.
				tokens: undefined,
				cost: undefined,
				model: undefined,
				metadata: message.mcpServerName ? { mcpServerName: message.mcpServerName } : undefined
			});
		});
	}

	return logs;
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
			case 'duration': {
				const aDuration = a.duration ?? 0;
				const bDuration = b.duration ?? 0;
				comparison = aDuration - bDuration;
				break;
			}
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
 * Paginate, filter, and sort a flat list of real tool execution logs sourced
 * from local chat thread state. This never hits the network and never
 * fabricates data; `fetchToolLogs` below is the only place sample data is
 * synthesized, and only as an explicit last resort.
 */
export function paginateToolLogs(
	allLogs: ToolExecutionLog[],
	filter?: ToolLogsFilter,
	sort?: ToolLogsSortOptions,
	pagination?: PaginationOptions
): PaginatedToolLogs {
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
		hasPreviousPage: page > 1,
		isSampleData: false
	};
}

/**
 * Fetch tool logs from the real local source (chat thread history). When
 * `allThreads` is omitted or contains no tool executions yet, this falls back
 * to clearly-flagged sample data so the panel has something to render — the
 * caller (ToolLogsPanel) is responsible for surfacing `isSampleData` to the
 * user via a visible banner, never just a console warning.
 */
export async function fetchToolLogs(
	allThreads: ToolLogsThreadsSource | undefined,
	filter?: ToolLogsFilter,
	sort?: ToolLogsSortOptions,
	pagination?: PaginationOptions
): Promise<PaginatedToolLogs> {
	const realLogs = allThreads ? buildToolLogsFromThreads(allThreads) : [];

	if (realLogs.length > 0) {
		return paginateToolLogs(realLogs, filter, sort, pagination);
	}

	console.warn('[ToolLogsService] No local tool execution history found yet; showing sample data until the agent runs tools in this workspace.');
	return generateSampleData(filter, sort, pagination);
}

/**
 * Generate sample data to illustrate the panel before any tools have run
 * locally. Always flagged via `isSampleData: true` so the UI can show a
 * visible "showing sample data" banner — this must never be presented to the
 * user as real data.
 */
function generateSampleData(
	filter?: ToolLogsFilter,
	sort?: ToolLogsSortOptions,
	pagination?: PaginationOptions
): PaginatedToolLogs {
	const allLogs = generateSampleLogs(20);
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
		hasPreviousPage: page > 1,
		isSampleData: true
	};
}

/**
 * Generate sample tool execution logs (illustrative only — see
 * `generateSampleData` doc comment).
 */
function generateSampleLogs(count: number): ToolExecutionLog[] {
	const logs: ToolExecutionLog[] = [];
	const toolTypes: ToolType[] = ['code_intelligence', 'web_fetch', 'file_operation', 'search'];
	const statuses: ExecutionStatus[] = ['success', 'success', 'success', 'error', 'timeout'];

	for (let i = 0; i < count; i++) {
		const toolType = toolTypes[i % toolTypes.length];
		const status = statuses[i % statuses.length];
		const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
		const duration = status === 'success' ? 250 + (i % 10) * 180 : undefined;

		logs.push({
			id: `sample-log-${i}`,
			toolType,
			operation: getOperationForToolType(toolType),
			status,
			timestamp,
			duration,
			threadId: `sample-thread-${i % 3}`,
			messageIndex: i % 10,
			input: {
				parameters: generateInputForToolType(toolType),
				sizeBytes: 128
			},
			output: status === 'success' ? {
				data: generateOutputForToolType(toolType),
				sizeBytes: 512,
				contentType: 'application/json'
			} : undefined,
			error: status === 'error' ? {
				code: 'EXECUTION_FAILED',
				message: 'Sample error — no real tool executions recorded yet'
			} : undefined,
			tokens: undefined,
			cost: undefined,
			model: undefined
		});
	}

	return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get operation name for tool type (sample data only)
 */
function getOperationForToolType(toolType: ToolType): string {
	switch (toolType) {
		case 'code_intelligence':
			return 'run_command';
		case 'web_fetch':
			return 'fetch_url';
		case 'file_operation':
			return 'read_file';
		case 'search':
			return 'search_for_files';
		default:
			return 'unknown_operation';
	}
}

/**
 * Generate input parameters for tool type (sample data only)
 */
function generateInputForToolType(toolType: ToolType): Record<string, any> {
	switch (toolType) {
		case 'code_intelligence':
			return { command: 'echo example' };
		case 'web_fetch':
			return { url: 'https://docs.python.org/3/library/os.html' };
		case 'file_operation':
			return { path: '/path/to/file.py' };
		case 'search':
			return { query: 'function definition' };
		default:
			return {};
	}
}

/**
 * Generate output data for tool type (sample data only)
 */
function generateOutputForToolType(toolType: ToolType): any {
	switch (toolType) {
		case 'code_intelligence':
			return { result: 'example', resolveReason: { type: 'done' } };
		case 'web_fetch':
			return { title: 'Python os Module Documentation' };
		case 'file_operation':
			return { fileContents: 'File contents here...', totalNumLines: 42 };
		case 'search':
			return { uris: ['main.py', 'utils.py'] };
		default:
			return {};
	}
}

/**
 * Fetch tool logs statistics derived from the same local source as
 * `fetchToolLogs`. Falls back to flagged sample statistics only when there
 * are no real tool executions yet.
 */
export async function fetchToolLogsStatistics(
	allThreads: ToolLogsThreadsSource | undefined,
	filter?: ToolLogsFilter
): Promise<ToolLogsStatistics> {
	const realLogs = allThreads ? buildToolLogsFromThreads(allThreads) : [];

	if (realLogs.length > 0) {
		return computeStatistics(filterLogs(realLogs, filter));
	}

	return generateSampleStatistics();
}

/**
 * Compute real statistics from a set of tool execution logs.
 */
function computeStatistics(logs: ToolExecutionLog[]): ToolLogsStatistics {
	const byToolType: ToolLogsStatistics['byToolType'] = {
		code_intelligence: { count: 0, successRate: 0, averageDuration: 0 },
		web_fetch: { count: 0, successRate: 0, averageDuration: 0 },
		file_operation: { count: 0, successRate: 0, averageDuration: 0 },
		search: { count: 0, successRate: 0, averageDuration: 0 },
		unknown: { count: 0, successRate: 0, averageDuration: 0 }
	};

	const durationsByType: Record<ToolType, number[]> = {
		code_intelligence: [], web_fetch: [], file_operation: [], search: [], unknown: []
	};
	const successesByType: Record<ToolType, number> = {
		code_intelligence: 0, web_fetch: 0, file_operation: 0, search: 0, unknown: 0
	};

	let successfulExecutions = 0;
	let failedExecutions = 0;
	let totalDuration = 0;
	let durationCount = 0;
	let totalTokens = 0;
	let totalCost = 0;

	for (const log of logs) {
		byToolType[log.toolType].count++;
		if (log.status === 'success') {
			successfulExecutions++;
			successesByType[log.toolType]++;
		} else if (log.status === 'error' || log.status === 'timeout') {
			failedExecutions++;
		}
		if (log.duration !== undefined) {
			totalDuration += log.duration;
			durationCount++;
			durationsByType[log.toolType].push(log.duration);
		}
		if (log.tokens) {
			totalTokens += log.tokens.total;
		}
		if (log.cost) {
			totalCost += log.cost;
		}
	}

	for (const toolType of Object.keys(byToolType) as ToolType[]) {
		const stat = byToolType[toolType];
		stat.successRate = stat.count > 0 ? successesByType[toolType] / stat.count : 0;
		const durations = durationsByType[toolType];
		stat.averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
	}

	return {
		totalExecutions: logs.length,
		successfulExecutions,
		failedExecutions,
		averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
		totalTokens,
		totalCost,
		byToolType,
		isSampleData: false
	};
}

/**
 * Generate sample statistics (illustrative only, used when there's no real
 * local tool execution history yet).
 */
function generateSampleStatistics(): ToolLogsStatistics {
	return {
		totalExecutions: 0,
		successfulExecutions: 0,
		failedExecutions: 0,
		averageDuration: 0,
		totalTokens: 0,
		totalCost: 0,
		byToolType: {
			code_intelligence: { count: 0, successRate: 0, averageDuration: 0 },
			web_fetch: { count: 0, successRate: 0, averageDuration: 0 },
			file_operation: { count: 0, successRate: 0, averageDuration: 0 },
			search: { count: 0, successRate: 0, averageDuration: 0 },
			unknown: { count: 0, successRate: 0, averageDuration: 0 }
		},
		isSampleData: true
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
