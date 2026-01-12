/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Results Panel
 *
 * Main container for displaying tool execution results in chat messages.
 * Automatically detects and parses tool usage from assistant responses.
 *
 * Features:
 * - Automatic tool detection in messages
 * - Code intelligence metrics display
 * - Web fetch documentation viewer
 * - Execution log viewer
 * - Copy/export functionality
 * - Collapsible sections
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ParsedToolExecution, ToolLogEntry, CodeIntelligenceResult, WebFetchResult } from './types.js';
import { parseToolExecutions } from './parseToolResults.js';
import { CodeIntelligenceView } from './CodeIntelligenceView.js';
import { WebFetchView } from './WebFetchView.js';
import { ToolExecutionLog } from './ToolExecutionLog.js';
import { Download, Copy, X } from 'lucide-react';
import './tool-results.css';

interface ToolResultsPanelProps {
  messageContent: string;
  messageIndex: number;
  threadId: string;
  showLog?: boolean;
  onClose?: () => void;
}

/**
 * Main tool results panel component
 */
export const ToolResultsPanel: React.FC<ToolResultsPanelProps> = ({
  messageContent,
  messageIndex,
  threadId,
  showLog = false,
  onClose
}) => {
  const [logs, setLogs] = useState<ToolLogEntry[]>([]);
  const [showFullLog, setShowFullLog] = useState(showLog);

  // Parse tool executions from message content
  const toolExecutions = useMemo(() => {
    return parseToolExecutions(messageContent, messageIndex, threadId);
  }, [messageContent, messageIndex, threadId]);

  // Add log entries for detected tools
  useEffect(() => {
    const newLogs: ToolLogEntry[] = toolExecutions.map((exec) => ({
      timestamp: exec.timestamp,
      toolName: exec.toolName,
      operation: exec.operation,
      status: 'success' as const,
      message: `${exec.toolName} executed successfully`
    }));

    if (newLogs.length > 0) {
      setLogs((prev) => [...prev, ...newLogs]);
    }
  }, [toolExecutions]);

  // Don't render if no tools detected
  if (toolExecutions.length === 0 && !showFullLog) {
    return null;
  }

  return (
    <div className="ainative-tool-results-panel">
			{onClose &&
      <button className="ainative-close-panel-btn" onClick={onClose} title="Close">
					<X size={16} />
				</button>
      }

			{/* Tool Results */}
			<div className="ainative-tool-results-container">
				{toolExecutions.map((execution, idx) =>
        <ToolResultView
          key={`${execution.toolName}-${idx}`}
          execution={execution} />

        )}
			</div>

			{/* Execution Log */}
			{showFullLog && logs.length > 0 &&
      <ToolExecutionLog
        logs={logs}
        onClear={() => setLogs([])} />

      }

			{/* Panel Actions */}
			{toolExecutions.length > 0 &&
      <div className="ainative-panel-actions">
					<button
          className="ainative-panel-action-btn"
          onClick={() => copyAllResults(toolExecutions)}
          title="Copy all results">

						<Copy size={14} />
						<span>Copy All</span>
					</button>
					<button
          className="ainative-panel-action-btn"
          onClick={() => exportResults(toolExecutions)}
          title="Export results">

						<Download size={14} />
						<span>Export</span>
					</button>
					{!showFullLog && logs.length > 0 &&
        <button
          className="ainative-panel-action-btn"
          onClick={() => setShowFullLog(true)}
          title="Show execution log">

							Show Log ({logs.length})
						</button>
        }
				</div>
      }
		</div>);

};

/**
 * Individual tool result view
 */
const ToolResultView: React.FC<{execution: ParsedToolExecution;}> = ({ execution }) => {
  const handleCopy = () => {
    if (execution.result) {
      const text = JSON.stringify(execution.result, null, 2);
      navigator.clipboard.writeText(text);
    }
  };

  const handleExport = () => {
    if (execution.result) {
      const blob = new Blob([JSON.stringify(execution.result, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${execution.toolName}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!execution.result) {
    return null;
  }

  // Render based on tool type
  switch (execution.result.type) {
    case 'code_intelligence':
      return (
        <CodeIntelligenceView
          result={execution.result as CodeIntelligenceResult}
          onCopy={handleCopy} />);


    case 'web_fetch':
      return (
        <WebFetchView
          result={execution.result as WebFetchResult}
          onCopy={handleCopy}
          onExport={handleExport} />);


    default:
      return null;
  }
};

/**
 * Copy all results to clipboard
 */
function copyAllResults(executions: ParsedToolExecution[]) {
  const results = executions.
  filter((e) => e.result).
  map((e) => ({
    tool: e.toolName,
    operation: e.operation,
    timestamp: e.timestamp.toISOString(),
    result: e.result
  }));

  const text = JSON.stringify(results, null, 2);
  navigator.clipboard.writeText(text);
}

/**
 * Export all results to JSON file
 */
function exportResults(executions: ParsedToolExecution[]) {
  const results = executions.
  filter((e) => e.result).
  map((e) => ({
    tool: e.toolName,
    operation: e.operation,
    timestamp: e.timestamp.toISOString(),
    result: e.result
  }));

  const blob = new Blob([JSON.stringify(results, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tool-results-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Hook for using tool results in parent components
 */
export function useToolResults(messageContent: string, messageIndex: number, threadId: string) {
  return useMemo(() => {
    return parseToolExecutions(messageContent, messageIndex, threadId);
  }, [messageContent, messageIndex, threadId]);
}