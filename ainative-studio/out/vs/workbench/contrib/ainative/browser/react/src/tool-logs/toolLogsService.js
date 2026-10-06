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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbExvZ3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL3JlYWN0L3NyYy90b29sLWxvZ3MvdG9vbExvZ3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBNkNoRzs7OztHQUlHO0FBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxRQUFnQjtJQUMzQyxRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCLEtBQUssV0FBVyxDQUFDO1FBQ2pCLEtBQUssUUFBUSxDQUFDO1FBQ2QsS0FBSyxjQUFjLENBQUM7UUFDcEIsS0FBSyxjQUFjLENBQUM7UUFDcEIsS0FBSyxXQUFXLENBQUM7UUFDakIsS0FBSyx1QkFBdUIsQ0FBQztRQUM3QixLQUFLLHVCQUF1QixDQUFDO1FBQzdCLEtBQUssa0JBQWtCO1lBQ3RCLE9BQU8sZ0JBQWdCLENBQUM7UUFDekIsS0FBSyx1QkFBdUIsQ0FBQztRQUM3QixLQUFLLGtCQUFrQixDQUFDO1FBQ3hCLEtBQUssZ0JBQWdCO1lBQ3BCLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLEtBQUssYUFBYSxDQUFDO1FBQ25CLEtBQUssd0JBQXdCLENBQUM7UUFDOUIsS0FBSywwQkFBMEIsQ0FBQztRQUNoQyxLQUFLLDBCQUEwQjtZQUM5QixPQUFPLG1CQUFtQixDQUFDO1FBQzVCO1lBQ0MsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsdUJBQXVCLENBQUMsSUFBOEM7SUFDOUUsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNkLEtBQUssY0FBYztZQUNsQixPQUFPLFNBQVMsQ0FBQztRQUNsQixLQUFLLGFBQWE7WUFDakIsT0FBTyxTQUFTLENBQUM7UUFDbEIsS0FBSyxT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