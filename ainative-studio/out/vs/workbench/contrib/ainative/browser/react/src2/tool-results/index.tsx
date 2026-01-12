/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Results Display Components
 *
 * Phase 2 Week 1 Integration - Issue #101
 *
 * Exports all components and utilities for displaying tool execution results
 * in the chat interface.
 *
 * Usage:
 * ```tsx
 * import { ToolResultsPanel, useToolResults } from './tool-results';
 *
 * // In chat message component
 * <ToolResultsPanel
 *   messageContent={message.displayContent}
 *   messageIndex={idx}
 *   threadId={threadId}
 * />
 *
 * // Or use hook for custom rendering
 * const toolResults = useToolResults(messageContent, messageIndex, threadId);
 * ```
 */

// Main panel component
export { ToolResultsPanel, useToolResults } from './ToolResultsPanel.js';

// Individual view components
export { CodeIntelligenceView } from './CodeIntelligenceView.js';
export { WebFetchView } from './WebFetchView.js';
export { ToolExecutionLog } from './ToolExecutionLog.js';

// Parsing utilities
export { parseToolExecutions, extractToolName } from './parseToolResults.js';

// Types
export type {
  ToolName,
  ParsedToolExecution,
  CodeIntelligenceResult,
  WebFetchResult,
  FunctionComplexity,
  ToolLogEntry } from
'./types.js';

// Import CSS
import './tool-results.css';