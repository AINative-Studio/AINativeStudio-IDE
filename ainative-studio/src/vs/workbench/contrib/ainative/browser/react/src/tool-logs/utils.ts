/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Utility functions for Tool Logs Panel
 */

import { ExecutionStatus, ToolType } from './types';

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	} else if (ms < 60000) {
		return `${(ms / 1000).toFixed(2)}s`;
	} else {
		const minutes = Math.floor(ms / 60000);
		const seconds = ((ms % 60000) / 1000).toFixed(0);
		return `${minutes}m ${seconds}s`;
	}
}

/**
 * Format timestamp to human-readable string
 */
export function formatTimestamp(date: Date, includeTime: boolean = false): string {
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
export function getStatusIcon(status: ExecutionStatus): string {
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
export function getToolTypeIcon(toolType: ToolType): string {
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
export function getStatusColor(status: ExecutionStatus): string {
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
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return text.slice(0, maxLength) + '...';
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	} else if (bytes < 1048576) {
		return `${(bytes / 1024).toFixed(2)} KB`;
	} else if (bytes < 1073741824) {
		return `${(bytes / 1048576).toFixed(2)} MB`;
	} else {
		return `${(bytes / 1073741824).toFixed(2)} GB`;
	}
}

/**
 * Validate date range
 */
export function isValidDateRange(start: Date, end: Date): boolean {
	return start.getTime() < end.getTime();
}

/**
 * Get relative time string
 */
export function getRelativeTimeString(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) {
		return 'just now';
	} else if (minutes < 60) {
		return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
	} else if (hours < 24) {
		return `${hours} hour${hours > 1 ? 's' : ''} ago`;
	} else if (days < 7) {
		return `${days} day${days > 1 ? 's' : ''} ago`;
	} else {
		return date.toLocaleDateString();
	}
}
