/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Logs Panel Component
 *
 * Main component for viewing and filtering tool execution logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ToolLogsFilter } from './ToolLogsFilter';
import { ToolLogsTable } from './ToolLogsTable';
import { ToolLogDetails } from './ToolLogDetails';
import { ToolLogsStatistics as StatsPanel } from './ToolLogsStatistics';
import { ExportDialog } from './ExportDialog';
import {
  ToolExecutionLog,
  ToolLogsFilter as Filter,
  ToolLogsSortOptions,
  PaginationOptions,
  PaginatedToolLogs,
  ToolLogsStatistics,
  ExportFormat } from
'./types';
import { fetchToolLogs, fetchToolLogsStatistics, exportToolLogs, downloadFile } from './toolLogsService';
import './tool-logs.css';

interface ToolLogsPanelProps {
  /**
   * Optional initial filter
   */
  initialFilter?: Filter;

  /**
   * Optional thread ID to filter by
   */
  threadId?: string;

  /**
   * Show statistics panel
   */
  showStatistics?: boolean;

  /**
   * Height of the panel
   */
  height?: string;
}

export const ToolLogsPanel: React.FC<ToolLogsPanelProps> = ({
  initialFilter,
  threadId,
  showStatistics = true,
  height = '100%'
}) => {
  // State
  const [filter, setFilter] = useState<Filter>(initialFilter ?? (threadId ? { threadId } : {}));
  const [sortOptions, setSortOptions] = useState<ToolLogsSortOptions>({ field: 'timestamp', direction: 'desc' });
  const [pagination, setPagination] = useState<PaginationOptions>({ page: 1, pageSize: 25 });
  const [logsData, setLogsData] = useState<PaginatedToolLogs | null>(null);
  const [statistics, setStatistics] = useState<ToolLogsStatistics | null>(null);
  const [selectedLog, setSelectedLog] = useState<ToolExecutionLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  /**
   * Load tool logs
   */
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchToolLogs(filter, sortOptions, pagination);
      setLogsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tool logs');
      console.error('[ToolLogsPanel] Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, sortOptions, pagination]);

  /**
   * Load statistics
   */
  const loadStatistics = useCallback(async () => {
    if (!showStatistics) {
      return;
    }

    try {
      const stats = await fetchToolLogsStatistics(filter);
      setStatistics(stats);
    } catch (err) {
      console.error('[ToolLogsPanel] Error loading statistics:', err);
    }
  }, [filter, showStatistics]);

  /**
   * Load data on mount and when dependencies change
   */
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  /**
   * Auto-refresh logs
   */
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      loadLogs();
      loadStatistics();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs, loadStatistics]);

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((newFilter: Filter) => {
    setFilter(newFilter);
    setPagination({ ...pagination, page: 1 }); // Reset to first page
  }, [pagination]);

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback((newSort: ToolLogsSortOptions) => {
    setSortOptions(newSort);
  }, []);

  /**
   * Handle pagination change
   */
  const handlePaginationChange = useCallback((newPagination: PaginationOptions) => {
    setPagination(newPagination);
  }, []);

  /**
   * Handle log selection
   */
  const handleLogSelect = useCallback((log: ToolExecutionLog) => {
    setSelectedLog(log);
  }, []);

  /**
   * Handle export
   */
  const handleExport = useCallback((format: ExportFormat) => {
    if (!logsData) {
      return;
    }

    const content = exportToolLogs(logsData.logs, format);
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const extension = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt';
    const filename = `tool-logs-${timestamp}.${extension}`;
    const mimeType = format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/plain';

    downloadFile(content, filename, mimeType);
    setShowExportDialog(false);
  }, [logsData]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    loadLogs();
    loadStatistics();
  }, [loadLogs, loadStatistics]);

  /**
   * Handle clear filter
   */
  const handleClearFilter = useCallback(() => {
    setFilter(threadId ? { threadId } : {});
    setPagination({ page: 1, pageSize: 25 });
  }, [threadId]);

  return (
    <div className="ainative-tool-logs-panel" style={{ height }}>
			<div className="ainative-tool-logs-header">
				<h2>Tool Execution Logs</h2>
				<div className="ainative-tool-logs-actions">
					<button
            className="ainative-tool-logs-action-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh logs">

						<span className="ainative-codicon ainative-codicon-refresh"></span>
					</button>
					<button
            className={`ainative-tool-logs-action-btn ${autoRefresh ? "ainative-active" : ""}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}>

						<span className="ainative-codicon ainative-codicon-sync"></span>
					</button>
					<button
            className="ainative-tool-logs-action-btn"
            onClick={() => setShowExportDialog(true)}
            disabled={!logsData || logsData.logs.length === 0}
            title="Export logs">

						<span className="ainative-codicon ainative-codicon-export"></span>
					</button>
					<button
            className="ainative-tool-logs-action-btn"
            onClick={handleClearFilter}
            title="Clear filters">

						<span className="ainative-codicon ainative-codicon-clear-all"></span>
					</button>
				</div>
			</div>

			{showStatistics && statistics &&
      <StatsPanel statistics={statistics} />
      }

			<ToolLogsFilter
        filter={filter}
        onChange={handleFilterChange} />


			{error &&
      <div className="ainative-tool-logs-error">
					<span className="ainative-codicon ainative-codicon-error"></span>
					<span>{error}</span>
				</div>
      }

			<div className="ainative-tool-logs-content">
				<div className="ainative-tool-logs-table-container">
					<ToolLogsTable
            data={logsData}
            sortOptions={sortOptions}
            pagination={pagination}
            loading={loading}
            onSortChange={handleSortChange}
            onPaginationChange={handlePaginationChange}
            onRowClick={handleLogSelect}
            selectedLogId={selectedLog?.id} />

				</div>

				{selectedLog &&
        <div className="ainative-tool-logs-details-container">
						<ToolLogDetails
            log={selectedLog}
            onClose={() => setSelectedLog(null)} />

					</div>
        }
			</div>

			{showExportDialog &&
      <ExportDialog
        onExport={handleExport}
        onClose={() => setShowExportDialog(false)} />

      }
		</div>);

};