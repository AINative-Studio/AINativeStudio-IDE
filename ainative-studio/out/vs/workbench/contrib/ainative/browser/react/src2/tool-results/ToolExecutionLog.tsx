/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Execution Log Component
 *
 * Debug viewer for tool execution history:
 * - Timeline of tool calls
 * - Status indicators (pending, running, success, error)
 * - Execution duration
 * - Detailed error messages
 */

import React, { useState } from 'react';
import { ToolLogEntry } from './types.js';
import { Clock, CheckCircle, XCircle, AlertCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react';

interface ToolExecutionLogProps {
  logs: ToolLogEntry[];
  onClear?: () => void;
}

/**
 * Main tool execution log component
 */
export const ToolExecutionLog: React.FC<ToolExecutionLogProps> = ({ logs, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filteredLogs = filterStatus ?
  logs.filter((log) => log.status === filterStatus) :
  logs;

  const statusCounts = {
    pending: logs.filter((l) => l.status === 'pending').length,
    running: logs.filter((l) => l.status === 'running').length,
    success: logs.filter((l) => l.status === 'success').length,
    error: logs.filter((l) => l.status === 'error').length
  };

  return (
    <div className="ainative-tool-execution-log">
			<div className="ainative-log-header">
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					<Clock size={16} />
					<h3 className="ainative-log-title">Execution Log</h3>
					<span className="ainative-log-count">({logs.length})</span>
				</div>
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					{onClear && logs.length > 0 &&
          <button className="ainative-clear-log-btn" onClick={onClear}>
							Clear
						</button>
          }
					<button
            className="ainative-tool-action-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}>

						{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</button>
				</div>
			</div>

			{isExpanded &&
      <div className="ainative-log-body">
					{/* Status filters */}
					<div className="ainative-log-filters">
						<button
            className={`ainative-filter-btn ${filterStatus === null ? "ainative-active" : ""}`}
            onClick={() => setFilterStatus(null)}>

							All ({logs.length})
						</button>
						<button
            className={`ainative-filter-btn ainative-status-success ${filterStatus === 'success' ? "ainative-active" : ""}`}
            onClick={() => setFilterStatus('success')}
            disabled={statusCounts.success === 0}>

							Success ({statusCounts.success})
						</button>
						<button
            className={`ainative-filter-btn ainative-status-error ${filterStatus === 'error' ? "ainative-active" : ""}`}
            onClick={() => setFilterStatus('error')}
            disabled={statusCounts.error === 0}>

							Error ({statusCounts.error})
						</button>
						<button
            className={`ainative-filter-btn ainative-status-running ${filterStatus === 'running' ? "ainative-active" : ""}`}
            onClick={() => setFilterStatus('running')}
            disabled={statusCounts.running === 0}>

							Running ({statusCounts.running})
						</button>
					</div>

					{/* Log entries */}
					<div className="ainative-log-entries">
						{filteredLogs.length === 0 ?
          <div className="ainative-no-logs">No log entries</div> :

          filteredLogs.map((log, idx) =>
          <LogEntry key={idx} log={log} />
          )
          }
					</div>
				</div>
      }
		</div>);

};

/**
 * Single log entry
 */
const LogEntry: React.FC<{log: ToolLogEntry;}> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = getStatusIcon(log.status);
  const statusColor = getStatusColor(log.status);

  return (
    <div className={`ainative-log-entry ainative-status-${log.status}`}>
			<div className="ainative-log-entry-header" onClick={() => setIsExpanded(!isExpanded)}>
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					<div className="ainative-status-icon" style={{ color: statusColor }}>
						{statusIcon}
					</div>
					<span className="ainative-tool-name">{log.toolName}</span>
					{log.operation &&
          <span className="ainative-operation-name">{log.operation}</span>
          }
					<span className="ainative-timestamp">{formatTimestamp(log.timestamp)}</span>
					{log.duration !== undefined &&
          <span className="ainative-duration">{log.duration}ms</span>
          }
				</div>
				<ChevronDown
          size={14}
          className={`ainative-expand-icon ${isExpanded ? "ainative-expanded" : ""}`} />

			</div>

			{isExpanded &&
      <div className="ainative-log-entry-body">
					<div className="ainative-log-message">{log.message}</div>
					<div className="ainative-log-metadata">
						<div className="ainative-metadata-row">
							<span className="ainative-metadata-key">Status:</span>
							<span className="ainative-metadata-value">{log.status}</span>
						</div>
						<div className="ainative-metadata-row">
							<span className="ainative-metadata-key">Tool:</span>
							<span className="ainative-metadata-value">{log.toolName}</span>
						</div>
						{log.operation &&
          <div className="ainative-metadata-row">
								<span className="ainative-metadata-key">Operation:</span>
								<span className="ainative-metadata-value">{log.operation}</span>
							</div>
          }
						<div className="ainative-metadata-row">
							<span className="ainative-metadata-key">Timestamp:</span>
							<span className="ainative-metadata-value">{log.timestamp.toISOString()}</span>
						</div>
						{log.duration !== undefined &&
          <div className="ainative-metadata-row">
								<span className="ainative-metadata-key">Duration:</span>
								<span className="ainative-metadata-value">{log.duration}ms</span>
							</div>
          }
					</div>
				</div>
      }
		</div>);

};

/**
 * Helper functions
 */

function getStatusIcon(status: string): React.ReactNode {
  switch (status) {
    case 'pending':
      return <Clock size={14} />;
    case 'running':
      return <Loader size={14} className="ainative-animate-spin" />;
    case 'success':
      return <CheckCircle size={14} />;
    case 'error':
      return <XCircle size={14} />;
    default:
      return <AlertCircle size={14} />;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#6b7280'; // gray
    case 'running':
      return '#3b82f6'; // blue
    case 'success':
      return '#22c55e'; // green
    case 'error':
      return '#ef4444'; // red
    default:
      return '#6b7280';
  }
}

function formatTimestamp(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();

  if (diff < 1000) {
    return 'just now';
  } else if (diff < 60000) {
    return `${Math.floor(diff / 1000)}s ago`;
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`;
  } else {
    return timestamp.toLocaleTimeString();
  }
}