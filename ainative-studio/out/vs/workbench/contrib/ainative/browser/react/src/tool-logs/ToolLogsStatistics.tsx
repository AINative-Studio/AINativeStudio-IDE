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
	const successRate = statistics.totalExecutions > 0
		? (statistics.successfulExecutions / statistics.totalExecutions) * 100
		: 0;

	return (
		<div className="tool-logs-statistics">
			<div className="stats-grid">
				<div className="stat-card">
					<div className="stat-icon">
						<span className="codicon codicon-symbol-misc"></span>
					</div>
					<div className="stat-content">
						<div className="stat-value">{statistics.totalExecutions}</div>
						<div className="stat-label">Total Executions</div>
					</div>
				</div>

				<div className="stat-card success">
					<div className="stat-icon">
						<span className="codicon codicon-check"></span>
					</div>
					<div className="stat-content">
						<div className="stat-value">{statistics.successfulExecutions}</div>
						<div className="stat-label">Successful</div>
					</div>
				</div>

				<div className="stat-card error">
					<div className="stat-icon">
						<span className="codicon codicon-error"></span>
					</div>
					<div className="stat-content">
						<div className="stat-value">{statistics.failedExecutions}</div>
						<div className="stat-label">Failed</div>
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-icon">
						<span className="codicon codicon-graph-line"></span>
					</div>
					<div className="stat-content">
						<div className="stat-value">{successRate.toFixed(1)}%</div>
						<div className="stat-label">Success Rate</div>
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-icon">
						<span className="codicon codicon-watch"></span>
					</div>
					<div className="stat-content">
						<div className="stat-value">{formatDuration(statistics.averageDuration)}</div>
						<div className="stat-label">Avg Duration</div>
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-icon">
						<span className="codicon codicon-symbol-variable"></span>
					</div>
					<div className="stat-content">
						<div className="stat-value">{statistics.totalTokens.toLocaleString()}</div>
						<div className="stat-label">Total Tokens</div>
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-icon">
						<span className="codicon codicon-credit-card"></span>
					</div>
					<div className="stat-content">
						<div className="stat-value">${statistics.totalCost.toFixed(2)}</div>
						<div className="stat-label">Total Cost</div>
					</div>
				</div>
			</div>

			<div className="stats-breakdown">
				<h4>Breakdown by Tool Type</h4>
				<div className="breakdown-grid">
					{Object.entries(statistics.byToolType).map(([toolType, stats]) => {
						if (stats.count === 0) return null;
						return (
							<div key={toolType} className="breakdown-card">
								<div className="breakdown-header">
									<span className="tool-type-label">{toolType.replace('_', ' ')}</span>
									<span className="execution-count">{stats.count} executions</span>
								</div>
								<div className="breakdown-metrics">
									<div className="metric">
										<span className="metric-label">Success Rate:</span>
										<span className="metric-value">{(stats.successRate * 100).toFixed(1)}%</span>
									</div>
									<div className="metric">
										<span className="metric-label">Avg Duration:</span>
										<span className="metric-value">{formatDuration(stats.averageDuration)}</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
