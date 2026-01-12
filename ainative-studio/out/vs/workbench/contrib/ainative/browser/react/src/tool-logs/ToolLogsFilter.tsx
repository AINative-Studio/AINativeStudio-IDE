/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Logs Filter Component
 *
 * Provides comprehensive filtering options for tool execution logs
 */

import React, { useState, useCallback } from 'react';
import { ToolLogsFilter as Filter, ToolType, ExecutionStatus } from './types';

interface ToolLogsFilterProps {
	filter: Filter;
	onChange: (filter: Filter) => void;
}

export const ToolLogsFilter: React.FC<ToolLogsFilterProps> = ({ filter, onChange }) => {
	const [expanded, setExpanded] = useState(false);
	const [localFilter, setLocalFilter] = useState<Filter>(filter);

	/**
	 * Handle tool type toggle
	 */
	const handleToolTypeToggle = useCallback((toolType: ToolType) => {
		const currentTypes = localFilter.toolTypes ?? [];
		const newTypes = currentTypes.includes(toolType)
			? currentTypes.filter(t => t !== toolType)
			: [...currentTypes, toolType];

		const newFilter = {
			...localFilter,
			toolTypes: newTypes.length > 0 ? newTypes : undefined
		};
		setLocalFilter(newFilter);
		onChange(newFilter);
	}, [localFilter, onChange]);

	/**
	 * Handle status toggle
	 */
	const handleStatusToggle = useCallback((status: ExecutionStatus) => {
		const currentStatuses = localFilter.statuses ?? [];
		const newStatuses = currentStatuses.includes(status)
			? currentStatuses.filter(s => s !== status)
			: [...currentStatuses, status];

		const newFilter = {
			...localFilter,
			statuses: newStatuses.length > 0 ? newStatuses : undefined
		};
		setLocalFilter(newFilter);
		onChange(newFilter);
	}, [localFilter, onChange]);

	/**
	 * Handle date range change
	 */
	const handleDateRangeChange = useCallback((type: 'start' | 'end', value: string) => {
		const date = new Date(value);
		const currentRange = localFilter.dateRange;

		const newFilter = {
			...localFilter,
			dateRange: {
				start: type === 'start' ? date : (currentRange?.start ?? new Date()),
				end: type === 'end' ? date : (currentRange?.end ?? new Date())
			}
		};
		setLocalFilter(newFilter);
		onChange(newFilter);
	}, [localFilter, onChange]);

	/**
	 * Handle search query change
	 */
	const handleSearchChange = useCallback((value: string) => {
		const newFilter = {
			...localFilter,
			searchQuery: value || undefined
		};
		setLocalFilter(newFilter);
		onChange(newFilter);
	}, [localFilter, onChange]);

	/**
	 * Handle duration range change
	 */
	const handleDurationChange = useCallback((type: 'min' | 'max', value: string) => {
		const numValue = parseInt(value, 10);
		const newFilter = {
			...localFilter,
			[type === 'min' ? 'minDuration' : 'maxDuration']: isNaN(numValue) ? undefined : numValue
		};
		setLocalFilter(newFilter);
		onChange(newFilter);
	}, [localFilter, onChange]);

	const toolTypes: ToolType[] = ['code_intelligence', 'web_fetch', 'file_operation', 'search'];
	const statuses: ExecutionStatus[] = ['success', 'error', 'timeout', 'cancelled', 'pending', 'running'];

	return (
		<div className="tool-logs-filter">
			<div className="tool-logs-filter-header">
				<button
					className="tool-logs-filter-toggle"
					onClick={() => setExpanded(!expanded)}
				>
					<span className={`codicon codicon-chevron-${expanded ? 'down' : 'right'}`}></span>
					<span>Filters</span>
					{(localFilter.toolTypes?.length || localFilter.statuses?.length || localFilter.searchQuery) && (
						<span className="tool-logs-filter-badge">
							{(localFilter.toolTypes?.length ?? 0) + (localFilter.statuses?.length ?? 0) + (localFilter.searchQuery ? 1 : 0)}
						</span>
					)}
				</button>

				<input
					type="search"
					className="tool-logs-search"
					placeholder="Search logs..."
					value={localFilter.searchQuery ?? ''}
					onChange={(e) => handleSearchChange(e.target.value)}
				/>
			</div>

			{expanded && (
				<div className="tool-logs-filter-content">
					<div className="tool-logs-filter-section">
						<label>Tool Types</label>
						<div className="tool-logs-filter-chips">
							{toolTypes.map(toolType => (
								<button
									key={toolType}
									className={`tool-logs-chip ${localFilter.toolTypes?.includes(toolType) ? 'active' : ''}`}
									onClick={() => handleToolTypeToggle(toolType)}
								>
									{toolType.replace('_', ' ')}
								</button>
							))}
						</div>
					</div>

					<div className="tool-logs-filter-section">
						<label>Status</label>
						<div className="tool-logs-filter-chips">
							{statuses.map(status => (
								<button
									key={status}
									className={`tool-logs-chip status-${status} ${localFilter.statuses?.includes(status) ? 'active' : ''}`}
									onClick={() => handleStatusToggle(status)}
								>
									{status}
								</button>
							))}
						</div>
					</div>

					<div className="tool-logs-filter-section">
						<label>Date Range</label>
						<div className="tool-logs-filter-dates">
							<input
								type="datetime-local"
								value={localFilter.dateRange?.start.toISOString().slice(0, 16) ?? ''}
								onChange={(e) => handleDateRangeChange('start', e.target.value)}
								placeholder="Start date"
							/>
							<span>to</span>
							<input
								type="datetime-local"
								value={localFilter.dateRange?.end.toISOString().slice(0, 16) ?? ''}
								onChange={(e) => handleDateRangeChange('end', e.target.value)}
								placeholder="End date"
							/>
						</div>
					</div>

					<div className="tool-logs-filter-section">
						<label>Duration (ms)</label>
						<div className="tool-logs-filter-range">
							<input
								type="number"
								placeholder="Min"
								value={localFilter.minDuration ?? ''}
								onChange={(e) => handleDurationChange('min', e.target.value)}
								min="0"
							/>
							<span>to</span>
							<input
								type="number"
								placeholder="Max"
								value={localFilter.maxDuration ?? ''}
								onChange={(e) => handleDurationChange('max', e.target.value)}
								min="0"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
