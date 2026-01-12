/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    else if (ms < 60000) {
        return `${(ms / 1000).toFixed(2)}s`;
    }
    else {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
    }
}
/**
 * Format timestamp to human-readable string
 */
export function formatTimestamp(date, includeTime = false) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    // If within last hour, show relative time
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) {
            return 'Just now';
        }
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
        return `Today at ${date.toLocaleTimeString()}`;
    }
    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday at ${date.toLocaleTimeString()}`;
    }
    // Otherwise, show full date
    if (includeTime) {
        return date.toLocaleString();
    }
    return date.toLocaleDateString();
}
/**
 * Get icon class for execution status
 */
export function getStatusIcon(status) {
    switch (status) {
        case 'success':
            return 'codicon-check';
        case 'error':
            return 'codicon-error';
        case 'timeout':
            return 'codicon-watch';
        case 'cancelled':
            return 'codicon-close';
        case 'pending':
            return 'codicon-clock';
        case 'running':
            return 'codicon-loading';
        default:
            return 'codicon-question';
    }
}
/**
 * Get icon class for tool type
 */
export function getToolTypeIcon(toolType) {
    switch (toolType) {
        case 'code_intelligence':
            return 'codicon-symbol-method';
        case 'web_fetch':
            return 'codicon-globe';
        case 'file_operation':
            return 'codicon-file';
        case 'search':
            return 'codicon-search';
        default:
            return 'codicon-tools';
    }
}
/**
 * Get color class for status
 */
export function getStatusColor(status) {
    switch (status) {
        case 'success':
            return 'success';
        case 'error':
            return 'error';
        case 'timeout':
            return 'warning';
        case 'cancelled':
            return 'neutral';
        case 'pending':
        case 'running':
            return 'info';
        default:
            return 'neutral';
    }
}
/**
 * Truncate text to specified length
 */
export function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength) + '...';
}
/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    else if (bytes < 1048576) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }
    else if (bytes < 1073741824) {
        return `${(bytes / 1048576).toFixed(2)} MB`;
    }
    else {
        return `${(bytes / 1073741824).toFixed(2)} GB`;
    }
}
/**
 * Validate date range
 */
export function isValidDateRange(start, end) {
    return start.getTime() < end.getTime();
}
/**
 * Get relative time string
 */
export function getRelativeTimeString(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) {
        return 'just now';
    }
    else if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    else if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    else if (days < 7) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    else {
        return date.toLocaleDateString();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvcmVhY3Qvc3JjMi90b29sLWxvZ3MvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEc7O0dBRUc7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUFDLEVBQVU7SUFDeEMsSUFBSSxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDZixPQUFPLEdBQUcsRUFBRSxJQUFJLENBQUM7SUFDbEIsQ0FBQztTQUFNLElBQUksRUFBRSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sR0FBRyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUNyQyxDQUFDO1NBQU0sQ0FBQztRQUNQLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sR0FBRyxPQUFPLEtBQUssT0FBTyxHQUFHLENBQUM7SUFDbEMsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsSUFBVSxFQUFFLGNBQXVCLEtBQUs7SUFDdkUsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUN2QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRTVDLDBDQUEwQztJQUMxQyxJQUFJLElB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