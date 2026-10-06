/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Map a real builtin/MCP tool name to the coarse-grained category the UI
 * filters on. Unrecognized / MCP tool names fall back to 'unknown' rather
 * than being miscategorized.
 */
function toolTypeOfToolName(toolName) {
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
function statusOfToolMessageType(type) {
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
function sizeOfJson(value) {
    try {
        return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
    }
    catch {
        return undefined;
    }
}
/**
 * Convert every `role: 'tool'` message across all chat threads into a
 * `ToolExecutionLog`. This is the real, local source of truth for "what
 * tools has the agent run" — no network call, no mock data.
 */
export function buildToolLogsFromThreads(allThreads) {
    const logs = [];
    // Real tool messages don't currently timestamp when they started, so there is
    // no wall-clock time to report. `sortLogs`'s default sort field is
    // 'timestamp', so giving every entry the same `new Date(0)` would make that
    // default sort a silent no-op (and would make any future `dateRange` filter
    // exclude every real log). Use a monotonically increasing synthetic instant
    // instead, so "sort by timestamp" still reflects real thread/message order —
    // this is ordering-only and must not be read as a real wall-clock time.
    let syntheticSequence = 0;
    for (const threadId of Object.keys(allThreads)) {
        const thread = allThreads[threadId];
        if (!thread)
            continue;
        thread.messages.forEach((message, messageIndex) => {
            if (message.role !== 'tool')
                return;
            const toolType = toolTypeOfToolName(message.name);
            const status = statusOfToolMessageType(message.type);
            const isError = message.type === 'tool_error' || message.type === 'invalid_params';
            logs.push({
                id: message.id,
                toolType,
                operation: message.name,
                status,
                // Synthetic ordering timestamp (see comment above) — not a real
                // wall-clock time. Duration is still genuinely unknown.
                timestamp: new Date(syntheticSequence++),
                duration: undefined,
                threadId,
                messageIndex,
                input: {
                    parameters: (message.rawParams ?? {}),
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
function filterLogs(logs, filter) {
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
        // NOTE: `log.timestamp` is a synthetic ordering value, not a real
        // wall-clock time (see buildToolLogsFromThreads), so a `dateRange` filter
        // expressed in real calendar time cannot be evaluated against it — applying
        // it here would silently exclude every real log. Intentionally not
        // filtering on dateRange until real tool timing is tracked.
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
        // NOTE: `log.duration` is always undefined for real tool logs today (tool
        // messages carry no timing data), so min/maxDuration never exclude
        // anything. Left as pass-through rather than silently misleading users
        // with a filter control that appears to work but never removes anything.
        return true;
    });
}
/**
 * Sort logs based on criteria
 */
function sortLogs(logs, sort) {
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
export function paginateToolLogs(allLogs, filter, sort, pagination) {
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
export async function fetchToolLogs(allThreads, filter, sort, pagination) {
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
function generateSampleData(filter, sort, pagination) {
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
function generateSampleLogs(count) {
    const logs = [];
    const toolTypes = ['code_intelligence', 'web_fetch', 'file_operation', 'search'];
    const statuses = ['success', 'success', 'success', 'error', 'timeout'];
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
function getOperationForToolType(toolType) {
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
function generateInputForToolType(toolType) {
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
function generateOutputForToolType(toolType) {
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
export async function fetchToolLogsStatistics(allThreads, filter) {
    const realLogs = allThreads ? buildToolLogsFromThreads(allThreads) : [];
    if (realLogs.length > 0) {
        return computeStatistics(filterLogs(realLogs, filter));
    }
    return generateSampleStatistics();
}
/**
 * Compute real statistics from a set of tool execution logs.
 */
function computeStatistics(logs) {
    const byToolType = {
        code_intelligence: { count: 0, successRate: 0, averageDuration: 0 },
        web_fetch: { count: 0, successRate: 0, averageDuration: 0 },
        file_operation: { count: 0, successRate: 0, averageDuration: 0 },
        search: { count: 0, successRate: 0, averageDuration: 0 },
        unknown: { count: 0, successRate: 0, averageDuration: 0 }
    };
    const durationsByType = {
        code_intelligence: [], web_fetch: [], file_operation: [], search: [], unknown: []
    };
    const successesByType = {
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
        }
        else if (log.status === 'error' || log.status === 'timeout') {
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
    for (const toolType of Object.keys(byToolType)) {
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
function generateSampleStatistics() {
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
export function exportToolLogs(logs, format) {
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
function convertToCSV(logs) {
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
function convertToText(logs) {
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
export function downloadFile(content, filename, mimeType) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbExvZ3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL3JlYWN0L3NyYzIvdG9vbC1sb2dzL3Rvb2xMb2dzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQTZDaEc7Ozs7R0FJRztBQUNILFNBQVMsa0JBQWtCLENBQUMsUUFBZ0I7SUFDM0MsUUFBUSxRQUFRLEVBQUUsQ0FBQztRQUNsQixLQUFLLFdBQVcsQ0FBQztRQUNqQixLQUFLLFFBQVEsQ0FBQztRQUNkLEtBQUssY0FBYyxDQUFDO1FBQ3BCLEtBQUssY0FBYyxDQUFDO1FBQ3BCLEtBQUssV0FBVyxDQUFDO1FBQ2pCLEtBQUssdUJBQXVCLENBQUM7UUFDN0IsS0FBSyx1QkFBdUIsQ0FBQztRQUM3QixLQUFLLGtCQUFrQjtZQUN0QixPQUFPLGdCQUFnQixDQUFDO1FBQ3pCLEtBQUssdUJBQXVCLENBQUM7UUFDN0IsS0FBSyxrQkFBa0IsQ0FBQztRQUN4QixLQUFLLGdCQUFnQjtZQUNwQixPQUFPLFFBQVEsQ0FBQztRQUNqQixLQUFLLGFBQWEsQ0FBQztRQUNuQixLQUFLLHdCQUF3QixDQUFDO1FBQzlCLEtBQUssMEJBQTBCLENBQUM7UUFDaEMsS0FBSywwQkFBMEI7WUFDOUIsT0FBTyxtQkFBbUIsQ0FBQztRQUM1QjtZQUNDLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLHVCQUF1QixDQUFDLElBQThDO0lBQzlFLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZCxLQUFLLGNBQWM7WUFDbEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsS0FBSyxhQUFhO1lBQ2pCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLEtBQUss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