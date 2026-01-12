/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Logs Table Component
 *
 * Displays tool execution logs in a sortable, paginated table
 */

import React, { useCallback } from 'react';
import {
  ToolExecutionLog,
  PaginatedToolLogs,
  ToolLogsSortOptions,
  PaginationOptions } from
'./types';
import { formatDuration, formatTimestamp, getStatusIcon, getToolTypeIcon } from './utils';

interface ToolLogsTableProps {
  data: PaginatedToolLogs | null;
  sortOptions: ToolLogsSortOptions;
  pagination: PaginationOptions;
  loading: boolean;
  onSortChange: (sort: ToolLogsSortOptions) => void;
  onPaginationChange: (pagination: PaginationOptions) => void;
  onRowClick: (log: ToolExecutionLog) => void;
  selectedLogId?: string;
}

export const ToolLogsTable: React.FC<ToolLogsTableProps> = ({
  data,
  sortOptions,
  pagination,
  loading,
  onSortChange,
  onPaginationChange,
  onRowClick,
  selectedLogId
}) => {
  /**
   * Handle column sort
   */
  const handleSort = useCallback((field: ToolLogsSortOptions['field']) => {
    const newDirection = sortOptions.field === field && sortOptions.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, direction: newDirection });
  }, [sortOptions, onSortChange]);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((newPage: number) => {
    onPaginationChange({ ...pagination, page: newPage });
  }, [pagination, onPaginationChange]);

  /**
   * Handle page size change
   */
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    onPaginationChange({ page: 1, pageSize: newPageSize });
  }, [onPaginationChange]);

  /**
   * Render sort indicator
   */
  const renderSortIndicator = (field: ToolLogsSortOptions['field']) => {
    if (sortOptions.field !== field) {
      return <span className="ainative-codicon ainative-codicon-chevron-up ainative-sort-icon ainative-inactive"></span>;
    }
    return (
      <span className={`ainative-codicon ainative-codicon-chevron-${sortOptions.direction === 'asc' ? "ainative-up" : "ainative-down"} ainative-sort-icon ainative-active`}></span>);

  };

  if (loading && !data) {
    return (
      <div className="ainative-tool-logs-loading">
				<div className="ainative-loading-spinner"></div>
				<span>Loading tool logs...</span>
			</div>);

  }

  if (!data || data.logs.length === 0) {
    return (
      <div className="ainative-tool-logs-empty">
				<span className="ainative-codicon ainative-codicon-info"></span>
				<span>No tool execution logs found</span>
			</div>);

  }

  return (
    <div className="ainative-tool-logs-table">
			<table>
				<thead>
					<tr>
						<th onClick={() => handleSort('timestamp')} className="ainative-sortable">
							Timestamp
							{renderSortIndicator('timestamp')}
						</th>
						<th onClick={() => handleSort('toolType')} className="ainative-sortable">
							Tool Type
							{renderSortIndicator('toolType')}
						</th>
						<th>Operation</th>
						<th onClick={() => handleSort('status')} className="ainative-sortable">
							Status
							{renderSortIndicator('status')}
						</th>
						<th onClick={() => handleSort('duration')} className="ainative-sortable">
							Duration
							{renderSortIndicator('duration')}
						</th>
						<th>Tokens</th>
						<th>Cost</th>
					</tr>
				</thead>
				<tbody>
					{data.logs.map((log) =>
          <tr
            key={log.id}
            onClick={() => onRowClick(log)}
            className={`ainative-tool-log-row ${selectedLogId === log.id ? "ainative-selected" : ""} ainative-status-${log.status}`}>

							<td className="ainative-timestamp-cell">
								{formatTimestamp(log.timestamp)}
							</td>
							<td className="ainative-tool-type-cell">
								<span className={`ainative-codicon ${getToolTypeIcon(log.toolType)}`}></span>
								<span>{log.toolType.replace('_', ' ')}</span>
							</td>
							<td className="ainative-operation-cell">
								{log.operation}
							</td>
							<td className="ainative-status-cell">
								<span className={`ainative-status-badge ainative-status-${log.status}`}>
									<span className={`ainative-codicon ${getStatusIcon(log.status)}`}></span>
									<span>{log.status}</span>
								</span>
							</td>
							<td className="ainative-duration-cell">
								{log.duration !== undefined ? formatDuration(log.duration) : 'N/A'}
							</td>
							<td className="ainative-tokens-cell">
								{log.tokens ? log.tokens.total.toLocaleString() : 'N/A'}
							</td>
							<td className="ainative-cost-cell">
								{log.cost !== undefined ? `$${log.cost.toFixed(4)}` : 'N/A'}
							</td>
						</tr>
          )}
				</tbody>
			</table>

			<div className="ainative-tool-logs-pagination">
				<div className="ainative-pagination-info">
					Showing {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, data.total)} of {data.total}
				</div>

				<div className="ainative-pagination-controls">
					<select
            value={pagination.pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
            className="ainative-page-size-select">

						<option value="10">10 per page</option>
						<option value="25">25 per page</option>
						<option value="50">50 per page</option>
						<option value="100">100 per page</option>
					</select>

					<button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!data.hasPreviousPage}
            className="ainative-pagination-btn">

						<span className="ainative-codicon ainative-codicon-chevron-left"></span>
					</button>

					<span className="ainative-pagination-page">
						Page {pagination.page} of {data.totalPages}
					</span>

					<button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!data.hasNextPage}
            className="ainative-pagination-btn">

						<span className="ainative-codicon ainative-codicon-chevron-right"></span>
					</button>
				</div>
			</div>
		</div>);

};