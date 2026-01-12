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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvcmVhY3Qvc3JjL3Rvb2wtbG9ncy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRzs7R0FFRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQUMsRUFBVTtJQUN4QyxJQUFJLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUNmLE9BQU8sR0FBRyxFQUFFLElBQUksQ0FBQztJQUNsQixDQUFDO1NBQU0sSUFBSSxFQUFFLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDdkIsT0FBTyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBQ3JDLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDdkMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakQsT0FBTyxHQUFHLE9BQU8sS0FBSyxPQUFPLEdBQUcsQ0FBQztJQUNsQyxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBQyxJQUFVLEVBQUUsY0FBdUIsS0FBSztJQUN2RSxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3ZCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFNUMsMENBQTBDO0lBQzFDLElBQUksSUFB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