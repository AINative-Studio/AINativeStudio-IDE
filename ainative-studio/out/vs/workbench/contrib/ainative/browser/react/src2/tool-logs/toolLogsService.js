/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Check if backend endpoint is available
 */
async function checkEndpointAvailable() {
    try {
        const response = await fetch('/api/v1/tool-logs/health', {
            method: 'HEAD'
        });
        return response.ok;
    }
    catch (error) {
        return false;
    }
}
/**
 * Fetch tool logs from backend or generate mock data
 */
export async function fetchToolLogs(filter, sort, pagination) {
    const isEndpointAvailable = await checkEndpointAvailable();
    if (isEndpointAvailable) {
        return fetchFromBackend(filter, sort, pagination);
    }
    else {
        console.warn('[ToolLogsService] Backend endpoint not available, using mock data');
        return generateMockData(filter, sort, pagination);
    }
}
/**
 * Fetch from backend API
 */
async function fetchFromBackend(filter, sort, pagination) {
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
function generateMockData(filter, sort, pagination) {
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
function generateMockLogs(count) {
    const logs = [];
    const toolTypes = ['code_intelligence', 'web_fetch', 'file_operation', 'search'];
    const statuses = ['success', 'success', 'success', 'error', 'timeout'];
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
function getOperationForToolType(toolType) {
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
function generateInputForToolType(toolType) {
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
function generateOutputForToolType(toolType) {
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
export async function fetchToolLogsStatistics(filter) {
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
function generateMockStatistics() {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbExvZ3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL3JlYWN0L3NyYzIvdG9vbC1sb2dzL3Rvb2xMb2dzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQW9CaEc7O0dBRUc7QUFDSCxLQUFLLFVBQVUsc0JBQXNCO0lBQ3BDLElBQUksQ0FBQztRQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLDBCQUEwQixFQUFFO1lBQ3hELE1BQU0sRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxRQUFRLENBQUMsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsYUFBYSxDQUNsQyxNQUF1QixFQUN2QixJQUEwQixFQUMxQixVQUE4QjtJQUU5QixNQUFNLG1CQUFtQixHQUFHLE1BQU0sc0JBQXNCLEVBQUUsQ0FBQztJQUUzRCxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFDekIsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxDQUFDLElBQUksQ0FBQyxtRUFBbUUsQ0FBQyxDQUFDO1FBQ2xGLE9BQU8sZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNuRCxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsS0FBSyxVQUFVLGdCQUFnQixDQUM5QixNQUF1QixFQUN2QixJQUEwQixF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