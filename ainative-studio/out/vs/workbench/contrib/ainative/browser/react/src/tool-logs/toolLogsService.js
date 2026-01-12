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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbExvZ3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL3JlYWN0L3NyYy90b29sLWxvZ3MvdG9vbExvZ3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBb0JoRzs7R0FFRztBQUNILEtBQUssVUFBVSxzQkFBc0I7SUFDcEMsSUFBSSxDQUFDO1FBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsMEJBQTBCLEVBQUU7WUFDeEQsTUFBTSxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDSCxPQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxhQUFhLENBQ2xDLE1BQXVCLEVBQ3ZCLElBQTBCLEVBQzFCLFVBQThCO0lBRTlCLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxzQkFBc0IsRUFBRSxDQUFDO0lBRTNELElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUN6QixPQUFPLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDbkQsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLENBQUMsSUFBSSxDQUFDLG1FQUFtRSxDQUFDLENBQUM7UUFDbEYsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxLQUFLLFVBQVUsZ0JBQWdCLENBQzlCLE1BQXVCLEVBQ3ZCLElBQTBCLEVBQzFCLFVBQThCO0lBRTlCLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFckMsd0JBQXdCO0lBQ3hCLElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN0QixNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQixNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN0QixNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDeEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzdELENBQUM7SUFDRixDQUFDO0lBRUQsc0JBQXNCO0lBQ3RCLElBQUksSUFBSSxFQUFFLENBQUM7UUFDVixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCw0QkFBNEI7SUFDNUIsTUFBTSxJQUFJLEdBQUcsVUFBVSxFQUFFLElBQUksSUFBSSxDQUFDLENBQUM7SUFDbkMsTUFBTSxRQUFRLEdBQUcsVUFBVSxFQUFFLFFBQVEsSUFBSSxFQUFFLENBQUM7SUFDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFFL0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMscUJBQXFCLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFdkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbkMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ2xCLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsZ0JBQWdCLENBQ3hCLE1BQXVC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