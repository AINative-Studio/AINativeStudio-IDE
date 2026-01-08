/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Types for Tool Results Display Panel
 *
 * Supports parsing and displaying results from:
 * - code_intelligence tool (complexity, AST, symbols)
 * - web_fetch tool (documentation, markdown content)
 */

export type ToolName = 'code_intelligence' | 'web_fetch' | 'unknown';

/**
 * Parsed tool execution from assistant response
 */
export interface ParsedToolExecution {
	toolName: ToolName;
	operation?: string;
	timestamp: Date;
	messageIndex: number;
	threadId: string;
	result: CodeIntelligenceResult | WebFetchResult | null;
}

/**
 * Code intelligence tool result
 */
export interface CodeIntelligenceResult {
	type: 'code_intelligence';
	operation: 'analyze_complexity' | 'parse_ast' | 'find_symbol' | 'find_references' | 'get_function_signature' | 'analyze_imports';
	language?: string;
	complexity?: {
		functions: FunctionComplexity[];
		averageComplexity: number;
		maxComplexity: number;
		totalFunctions: number;
	};
	symbols?: {
		name: string;
		type: string;
		line: number;
		column: number;
		signature?: string;
	}[];
	imports?: string[];
	references?: {
		line: number;
		column: number;
		type: string;
		context: string;
	}[];
	rawText?: string;
}

/**
 * Function complexity metrics
 */
export interface FunctionComplexity {
	name: string;
	cyclomaticComplexity: number;
	cognitiveComplexity: number;
	maintainabilityIndex?: number;
	line: number;
	column: number;
	complexityRank: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
	classname?: string;
}

/**
 * Web fetch tool result
 */
export interface WebFetchResult {
	type: 'web_fetch';
	operation: 'fetch_url' | 'fetch_documentation' | 'search_docs';
	url?: string;
	title?: string;
	content?: string; // Markdown content
	contentType?: string;
	sizeBytes?: number;
	truncated?: boolean;
	rawText?: string;
}

/**
 * Tool execution log entry
 */
export interface ToolLogEntry {
	timestamp: Date;
	toolName: ToolName;
	operation?: string;
	status: 'pending' | 'running' | 'success' | 'error';
	message: string;
	duration?: number;
}
