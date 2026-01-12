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
      <div className="ainative-json-content">
				<div className="ainative-json-header">
					<span>{label}</span>
					<button
            className="ainative-copy-btn"
            onClick={() => copyToClipboard(jsonString)}
            title="Copy to clipboard">

						<span className="ainative-codicon ainative-codicon-copy"></span>
					</button>
				</div>
				<pre>{jsonString}</pre>
			</div>);

  };

  const isExpanded = (section: string) => expandedSections.has(section);

  return (
    <div className="ainative-tool-log-details">
			<div className="ainative-tool-log-details-header">
				<h3>Log Details</h3>
				<button className="ainative-close-btn" onClick={onClose} title="Close">
					<span className="ainative-codicon ainative-codicon-close"></span>
				</button>
			</div>

			<div className="ainative-tool-log-details-content">
				{/* Overview Section */}
				<div className="ainative-detail-section">
					<button
            className="ainative-section-header"
            onClick={() => toggleSection('overview')}>

						<span className={`ainative-codicon ainative-codicon-chevron-${isExpanded('overview') ? "ainative-down" : "ainative-right"}`}></span>
						<span>Overview</span>
					</button>
					{isExpanded('overview') &&
          <div className="ainative-section-content">
							<div className="ainative-detail-row">
								<span className="ainative-detail-label">Log ID:</span>
								<span className="ainative-detail-value ainative-monospace">{log.id}</span>
							</div>
							<div className="ainative-detail-row">
								<span className="ainative-detail-label">Timestamp:</span>
								<span className="ainative-detail-value">{formatTimestamp(log.timestamp, true)}</span>
							</div>
							<div className="ainative-detail-row">
								<span className="ainative-detail-label">Tool Type:</span>
								<span className="ainative-detail-value">{log.toolType.replace('_', ' ')}</span>
							</div>
							<div className="ainative-detail-row">
								<span className="ainative-detail-label">Operation:</span>
								<span className="ainative-detail-value">{log.operation}</span>
							</div>
							<div className="ainative-detail-row">
								<span className="ainative-detail-label">Status:</span>
								<span className={`ainative-detail-value ainative-status-badge ainative-status-${log.status}`}>
									<span className={`ainative-codicon ${getStatusIcon(log.status)}`}></span>
									<span>{log.status}</span>
								</span>
							</div>
							{log.duration !== undefined &&
            <div className="ainative-detail-row">
									<span className="ainative-detail-label">Duration:</span>
									<span className="ainative-detail-value">{formatDuration(log.duration)}</span>
								</div>
            }
							<div className="ainative-detail-row">
								<span className="ainative-detail-label">Thread ID:</span>
								<span className="ainative-detail-value ainative-monospace">{log.threadId}</span>
							</div>
							<div className="ainative-detail-row">
								<span className="ainative-detail-label">Message Index:</span>
								<span className="ainative-detail-value">{log.messageIndex}</span>
							</div>
							{log.model &&
            <div className="ainative-detail-row">
									<span className="ainative-detail-label">Model:</span>
									<span className="ainative-detail-value">{log.model}</span>
								</div>
            }
						</div>
          }
				</div>

				{/* Tokens & Cost Section */}
				{(log.tokens || log.cost !== undefined) &&
        <div className="ainative-detail-section">
						<button
            className="ainative-section-header"
            onClick={() => toggleSection('metrics')}>

							<span className={`ainative-codicon ainative-codicon-chevron-${isExpanded('metrics') ? "ainative-down" : "ainative-right"}`}></span>
							<span>Metrics</span>
						</button>
						{isExpanded('metrics') &&
          <div className="ainative-section-content">
								{log.tokens &&
            <>
										<div className="ainative-detail-row">
											<span className="ainative-detail-label">Input Tokens:</span>
											<span className="ainative-detail-value">{log.tokens.input.toLocaleString()}</span>
										</div>
										<div className="ainative-detail-row">
											<span className="ainative-detail-label">Output Tokens:</span>
											<span className="ainative-detail-value">{log.tokens.output.toLocaleString()}</span>
										</div>
										<div className="ainative-detail-row">
											<span className="ainative-detail-label">Total Tokens:</span>
											<span className="ainative-detail-value">{log.tokens.total.toLocaleString()}</span>
										</div>
									</>
            }
								{log.cost !== undefined &&
            <div className="ainative-detail-row">
										<span className="ainative-detail-label">Cost:</span>
										<span className="ainative-detail-value">${log.cost.toFixed(6)}</span>
									</div>
            }
							</div>
          }
					</div>
        }

				{/* Input Section */}
				<div className="ainative-detail-section">
					<button
            className="ainative-section-header"
            onClick={() => toggleSection('input')}>

						<span className={`ainative-codicon ainative-codicon-chevron-${isExpanded('input') ? "ainative-down" : "ainative-right"}`}></span>
						<span>Input</span>
						{log.input.truncated &&
            <span className="ainative-truncated-badge">Truncated</span>
            }
					</button>
					{isExpanded('input') &&
          <div className="ainative-section-content">
							{log.input.sizeBytes !== undefined &&
            <div className="ainative-detail-row">
									<span className="ainative-detail-label">Size:</span>
									<span className="ainative-detail-value">{(log.input.sizeBytes / 1024).toFixed(2)} KB</span>
								</div>
            }
							{renderJSON(log.input.parameters, 'Parameters')}
						</div>
          }
				</div>

				{/* Output Section */}
				{log.output &&
        <div className="ainative-detail-section">
						<button
            className="ainative-section-header"
            onClick={() => toggleSection('output')}>

							<span className={`ainative-codicon ainative-codicon-chevron-${isExpanded('output') ? "ainative-down" : "ainative-right"}`}></span>
							<span>Output</span>
							{log.output.truncated &&
            <span className="ainative-truncated-badge">Truncated</span>
            }
						</button>
						{isExpanded('output') &&
          <div className="ainative-section-content">
								{log.output.sizeBytes !== undefined &&
            <div className="ainative-detail-row">
										<span className="ainative-detail-label">Size:</span>
										<span className="ainative-detail-value">{(log.output.sizeBytes / 1024).toFixed(2)} KB</span>
									</div>
            }
								{log.output.contentType &&
            <div className="ainative-detail-row">
										<span className="ainative-detail-label">Content Type:</span>
										<span className="ainative-detail-value">{log.output.contentType}</span>
									</div>
            }
								{renderJSON(log.output.data, 'Result')}
							</div>
          }
					</div>
        }

				{/* Error Section */}
				{log.error &&
        <div className="ainative-detail-section ainative-error-section">
						<button
            className="ainative-section-header"
            onClick={() => toggleSection('error')}>

							<span className={`ainative-codicon ainative-codicon-chevron-${isExpanded('error') ? "ainative-down" : "ainative-right"}`}></span>
							<span>Error</span>
						</button>
						{isExpanded('error') &&
          <div className="ainative-section-content">
								<div className="ainative-detail-row">
									<span className="ainative-detail-label">Code:</span>
									<span className="ainative-detail-value ainative-monospace">{log.error.code}</span>
								</div>
								<div className="ainative-detail-row">
									<span className="ainative-detail-label">Message:</span>
									<span className="ainative-detail-value ainative-error-message">{log.error.message}</span>
								</div>
								{log.error.stack &&
            <div className="ainative-detail-row ainative-stack-trace">
										<span className="ainative-detail-label">Stack Trace:</span>
										<pre className="ainative-detail-value">{log.error.stack}</pre>
									</div>
            }
								{log.error.details && renderJSON(log.error.details, 'Details')}
							</div>
          }
					</div>
        }

				{/* Metadata Section */}
				{log.metadata && Object.keys(log.metadata).length > 0 &&
        <div className="ainative-detail-section">
						<button
            className="ainative-section-header"
            onClick={() => toggleSection('metadata')}>

							<span className={`ainative-codicon ainative-codicon-chevron-${isExpanded('metadata') ? "ainative-down" : "ainative-right"}`}></span>
							<span>Metadata</span>
						</button>
						{isExpanded('metadata') &&
          <div className="ainative-section-content">
								{renderJSON(log.metadata, 'Additional Information')}
							</div>
          }
					</div>
        }
			</div>
		</div>);

};