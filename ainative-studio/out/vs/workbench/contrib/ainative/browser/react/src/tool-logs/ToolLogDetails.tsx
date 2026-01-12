/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Log Details Component
 *
 * Displays detailed information about a tool execution log entry
 */

import React, { useState } from 'react';
import { ToolExecutionLog } from './types';
import { formatDuration, formatTimestamp, getStatusIcon } from './utils';

interface ToolLogDetailsProps {
	log: ToolExecutionLog;
	onClose: () => void;
}

export const ToolLogDetails: React.FC<ToolLogDetailsProps> = ({ log, onClose }) => {
	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

	/**
	 * Toggle section expansion
	 */
	const toggleSection = (section: string) => {
		const newExpanded = new Set(expandedSections);
		if (newExpanded.has(section)) {
			newExpanded.delete(section);
		} else {
			newExpanded.add(section);
		}
		setExpandedSections(newExpanded);
	};

	/**
	 * Copy content to clipboard
	 */
	const copyToClipboard = (content: string) => {
		navigator.clipboard.writeText(content);
	};

	/**
	 * Render JSON content
	 */
	const renderJSON = (data: any, label: string) => {
		const jsonString = JSON.stringify(data, null, 2);
		return (
			<div className="json-content">
				<div className="json-header">
					<span>{label}</span>
					<button
						className="copy-btn"
						onClick={() => copyToClipboard(jsonString)}
						title="Copy to clipboard"
					>
						<span className="codicon codicon-copy"></span>
					</button>
				</div>
				<pre>{jsonString}</pre>
			</div>
		);
	};

	const isExpanded = (section: string) => expandedSections.has(section);

	return (
		<div className="tool-log-details">
			<div className="tool-log-details-header">
				<h3>Log Details</h3>
				<button className="close-btn" onClick={onClose} title="Close">
					<span className="codicon codicon-close"></span>
				</button>
			</div>

			<div className="tool-log-details-content">
				{/* Overview Section */}
				<div className="detail-section">
					<button
						className="section-header"
						onClick={() => toggleSection('overview')}
					>
						<span className={`codicon codicon-chevron-${isExpanded('overview') ? 'down' : 'right'}`}></span>
						<span>Overview</span>
					</button>
					{isExpanded('overview') && (
						<div className="section-content">
							<div className="detail-row">
								<span className="detail-label">Log ID:</span>
								<span className="detail-value monospace">{log.id}</span>
							</div>
							<div className="detail-row">
								<span className="detail-label">Timestamp:</span>
								<span className="detail-value">{formatTimestamp(log.timestamp, true)}</span>
							</div>
							<div className="detail-row">
								<span className="detail-label">Tool Type:</span>
								<span className="detail-value">{log.toolType.replace('_', ' ')}</span>
							</div>
							<div className="detail-row">
								<span className="detail-label">Operation:</span>
								<span className="detail-value">{log.operation}</span>
							</div>
							<div className="detail-row">
								<span className="detail-label">Status:</span>
								<span className={`detail-value status-badge status-${log.status}`}>
									<span className={`codicon ${getStatusIcon(log.status)}`}></span>
									<span>{log.status}</span>
								</span>
							</div>
							{log.duration !== undefined && (
								<div className="detail-row">
									<span className="detail-label">Duration:</span>
									<span className="detail-value">{formatDuration(log.duration)}</span>
								</div>
							)}
							<div className="detail-row">
								<span className="detail-label">Thread ID:</span>
								<span className="detail-value monospace">{log.threadId}</span>
							</div>
							<div className="detail-row">
								<span className="detail-label">Message Index:</span>
								<span className="detail-value">{log.messageIndex}</span>
							</div>
							{log.model && (
								<div className="detail-row">
									<span className="detail-label">Model:</span>
									<span className="detail-value">{log.model}</span>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Tokens & Cost Section */}
				{(log.tokens || log.cost !== undefined) && (
					<div className="detail-section">
						<button
							className="section-header"
							onClick={() => toggleSection('metrics')}
						>
							<span className={`codicon codicon-chevron-${isExpanded('metrics') ? 'down' : 'right'}`}></span>
							<span>Metrics</span>
						</button>
						{isExpanded('metrics') && (
							<div className="section-content">
								{log.tokens && (
									<>
										<div className="detail-row">
											<span className="detail-label">Input Tokens:</span>
											<span className="detail-value">{log.tokens.input.toLocaleString()}</span>
										</div>
										<div className="detail-row">
											<span className="detail-label">Output Tokens:</span>
											<span className="detail-value">{log.tokens.output.toLocaleString()}</span>
										</div>
										<div className="detail-row">
											<span className="detail-label">Total Tokens:</span>
											<span className="detail-value">{log.tokens.total.toLocaleString()}</span>
										</div>
									</>
								)}
								{log.cost !== undefined && (
									<div className="detail-row">
										<span className="detail-label">Cost:</span>
										<span className="detail-value">${log.cost.toFixed(6)}</span>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{/* Input Section */}
				<div className="detail-section">
					<button
						className="section-header"
						onClick={() => toggleSection('input')}
					>
						<span className={`codicon codicon-chevron-${isExpanded('input') ? 'down' : 'right'}`}></span>
						<span>Input</span>
						{log.input.truncated && (
							<span className="truncated-badge">Truncated</span>
						)}
					</button>
					{isExpanded('input') && (
						<div className="section-content">
							{log.input.sizeBytes !== undefined && (
								<div className="detail-row">
									<span className="detail-label">Size:</span>
									<span className="detail-value">{(log.input.sizeBytes / 1024).toFixed(2)} KB</span>
								</div>
							)}
							{renderJSON(log.input.parameters, 'Parameters')}
						</div>
					)}
				</div>

				{/* Output Section */}
				{log.output && (
					<div className="detail-section">
						<button
							className="section-header"
							onClick={() => toggleSection('output')}
						>
							<span className={`codicon codicon-chevron-${isExpanded('output') ? 'down' : 'right'}`}></span>
							<span>Output</span>
							{log.output.truncated && (
								<span className="truncated-badge">Truncated</span>
							)}
						</button>
						{isExpanded('output') && (
							<div className="section-content">
								{log.output.sizeBytes !== undefined && (
									<div className="detail-row">
										<span className="detail-label">Size:</span>
										<span className="detail-value">{(log.output.sizeBytes / 1024).toFixed(2)} KB</span>
									</div>
								)}
								{log.output.contentType && (
									<div className="detail-row">
										<span className="detail-label">Content Type:</span>
										<span className="detail-value">{log.output.contentType}</span>
									</div>
								)}
								{renderJSON(log.output.data, 'Result')}
							</div>
						)}
					</div>
				)}

				{/* Error Section */}
				{log.error && (
					<div className="detail-section error-section">
						<button
							className="section-header"
							onClick={() => toggleSection('error')}
						>
							<span className={`codicon codicon-chevron-${isExpanded('error') ? 'down' : 'right'}`}></span>
							<span>Error</span>
						</button>
						{isExpanded('error') && (
							<div className="section-content">
								<div className="detail-row">
									<span className="detail-label">Code:</span>
									<span className="detail-value monospace">{log.error.code}</span>
								</div>
								<div className="detail-row">
									<span className="detail-label">Message:</span>
									<span className="detail-value error-message">{log.error.message}</span>
								</div>
								{log.error.stack && (
									<div className="detail-row stack-trace">
										<span className="detail-label">Stack Trace:</span>
										<pre className="detail-value">{log.error.stack}</pre>
									</div>
								)}
								{log.error.details && renderJSON(log.error.details, 'Details')}
							</div>
						)}
					</div>
				)}

				{/* Metadata Section */}
				{log.metadata && Object.keys(log.metadata).length > 0 && (
					<div className="detail-section">
						<button
							className="section-header"
							onClick={() => toggleSection('metadata')}
						>
							<span className={`codicon codicon-chevron-${isExpanded('metadata') ? 'down' : 'right'}`}></span>
							<span>Metadata</span>
						</button>
						{isExpanded('metadata') && (
							<div className="section-content">
								{renderJSON(log.metadata, 'Additional Information')}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
