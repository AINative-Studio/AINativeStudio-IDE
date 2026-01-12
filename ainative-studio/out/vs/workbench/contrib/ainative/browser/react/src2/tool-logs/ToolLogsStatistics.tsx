/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Logs Statistics Component
 *
 * Displays statistical overview of tool executions
 */

import React from 'react';
import { ToolLogsStatistics as Statistics } from './types';
import { formatDuration } from './utils';

interface ToolLogsStatisticsProps {
  statistics: Statistics;
}

export const ToolLogsStatistics: React.FC<ToolLogsStatisticsProps> = ({ statistics }) => {
  const successRate = statistics.totalExecutions > 0 ?
  statistics.successfulExecutions / statistics.totalExecutions * 100 :
  0;

  return (
    <div className="ainative-tool-logs-statistics">
			<div className="ainative-stats-grid">
				<div className="ainative-stat-card">
					<div className="ainative-stat-icon">
						<span className="ainative-codicon ainative-codicon-symbol-misc"></span>
					</div>
					<div className="ainative-stat-content">
						<div className="ainative-stat-value">{statistics.totalExecutions}</div>
						<div className="ainative-stat-label">Total Executions</div>
					</div>
				</div>

				<div className="ainative-stat-card ainative-success">
					<div className="ainative-stat-icon">
						<span className="ainative-codicon ainative-codicon-check"></span>
					</div>
					<div className="ainative-stat-content">
						<div className="ainative-stat-value">{statistics.successfulExecutions}</div>
						<div className="ainative-stat-label">Successful</div>
					</div>
				</div>

				<div className="ainative-stat-card ainative-error">
					<div className="ainative-stat-icon">
						<span className="ainative-codicon ainative-codicon-error"></span>
					</div>
					<div className="ainative-stat-content">
						<div className="ainative-stat-value">{statistics.failedExecutions}</div>
						<div className="ainative-stat-label">Failed</div>
					</div>
				</div>

				<div className="ainative-stat-card">
					<div className="ainative-stat-icon">
						<span className="ainative-codicon ainative-codicon-graph-line"></span>
					</div>
					<div className="ainative-stat-content">
						<div className="ainative-stat-value">{successRate.toFixed(1)}%</div>
						<div className="ainative-stat-label">Success Rate</div>
					</div>
				</div>

				<div className="ainative-stat-card">
					<div className="ainative-stat-icon">
						<span className="ainative-codicon ainative-codicon-watch"></span>
					</div>
					<div className="ainative-stat-content">
						<div className="ainative-stat-value">{formatDuration(statistics.averageDuration)}</div>
						<div className="ainative-stat-label">Avg Duration</div>
					</div>
				</div>

				<div className="ainative-stat-card">
					<div className="ainative-stat-icon">
						<span className="ainative-codicon ainative-codicon-symbol-variable"></span>
					</div>
					<div className="ainative-stat-content">
						<div className="ainative-stat-value">{statistics.totalTokens.toLocaleString()}</div>
						<div className="ainative-stat-label">Total Tokens</div>
					</div>
				</div>

				<div className="ainative-stat-card">
					<div className="ainative-stat-icon">
						<span className="ainative-codicon ainative-codicon-credit-card"></span>
					</div>
					<div className="ainative-stat-content">
						<div className="ainative-stat-value">${statistics.totalCost.toFixed(2)}</div>
						<div className="ainative-stat-label">Total Cost</div>
					</div>
				</div>
			</div>

			<div className="ainative-stats-breakdown">
				<h4>Breakdown by Tool Type</h4>
				<div className="ainative-breakdown-grid">
					{Object.entries(statistics.byToolType).map(([toolType, stats]) => {
            if (stats.count === 0) return null;
            return (
              <div key={toolType} className="ainative-breakdown-card">
								<div className="ainative-breakdown-header">
									<span className="ainative-tool-type-label">{toolType.replace('_', ' ')}</span>
									<span className="ainative-execution-count">{stats.count} executions</span>
								</div>
								<div className="ainative-breakdown-metrics">
									<div className="ainative-metric">
										<span className="ainative-metric-label">Success Rate:</span>
										<span className="ainative-metric-value">{(stats.successRate * 100).toFixed(1)}%</span>
									</div>
									<div className="ainative-metric">
										<span className="ainative-metric-label">Avg Duration:</span>
										<span className="ainative-metric-value">{formatDuration(stats.averageDuration)}</span>
									</div>
								</div>
							</div>);

          })}
				</div>
			</div>
		</div>);

};