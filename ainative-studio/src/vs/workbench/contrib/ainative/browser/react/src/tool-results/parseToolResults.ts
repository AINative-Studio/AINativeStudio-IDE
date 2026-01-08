/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Results Parser
 *
 * Parses assistant response text for tool execution mentions and extracts
 * structured data. Since backend doesn't return tool details separately,
 * we parse the assistant's natural language response.
 */

import { ParsedToolExecution, CodeIntelligenceResult, WebFetchResult, ToolName } from './types.js';

/**
 * Parse assistant response for tool executions
 *
 * Detects mentions like:
 * - "I've analyzed the code using code_intelligence"
 * - "I fetched the documentation from docs.python.org"
 * - "The complexity is 15..."
 * - "Found 3 functions..."
 */
export function parseToolExecutions(
	responseText: string,
	messageIndex: number,
	threadId: string
): ParsedToolExecution[] {
	const executions: ParsedToolExecution[] = [];
	const timestamp = new Date();

	// Detect code_intelligence tool usage
	const codeIntelPatterns = [
		/(?:analyzed|analyzing|analyze)\s+(?:the\s+)?code(?:\s+using\s+code_intelligence)?/i,
		/code_intelligence\s+tool/i,
		/(?:complexity|cyclomatic|cognitive)\s+(?:is|of|score)/i,
		/(?:found|detected)\s+\d+\s+(?:function|symbol|import)/i,
		/AST\s+(?:parsing|analysis)/i,
	];

	const hasCodeIntel = codeIntelPatterns.some(pattern => pattern.test(responseText));

	if (hasCodeIntel) {
		const result = parseCodeIntelligenceResult(responseText);
		executions.push({
			toolName: 'code_intelligence',
			operation: result?.operation,
			timestamp,
			messageIndex,
			threadId,
			result
		});
	}

	// Detect web_fetch tool usage
	const webFetchPatterns = [
		/(?:fetched|fetching|fetch)\s+(?:the\s+)?documentation/i,
		/web_fetch\s+tool/i,
		/(?:retrieved|retrieving)\s+from\s+https?:\/\//i,
		/documentation\s+from\s+[\w.-]+\.(?:org|com|io|dev)/i,
	];

	const hasWebFetch = webFetchPatterns.some(pattern => pattern.test(responseText));

	if (hasWebFetch) {
		const result = parseWebFetchResult(responseText);
		executions.push({
			toolName: 'web_fetch',
			operation: result?.operation,
			timestamp,
			messageIndex,
			threadId,
			result
		});
	}

	return executions;
}

/**
 * Parse code intelligence result from response text
 */
function parseCodeIntelligenceResult(text: string): CodeIntelligenceResult | null {
	const result: CodeIntelligenceResult = {
		type: 'code_intelligence',
		operation: 'analyze_complexity', // default
		rawText: text
	};

	// Detect operation type
	if (/complexity|cyclomatic|cognitive/i.test(text)) {
		result.operation = 'analyze_complexity';
		result.complexity = parseComplexityMetrics(text);
	} else if (/AST|parse|syntax tree/i.test(text)) {
		result.operation = 'parse_ast';
		result.symbols = parseSymbols(text);
	} else if (/import|from|require/i.test(text)) {
		result.operation = 'analyze_imports';
		result.imports = parseImports(text);
	} else if (/reference|usage|call/i.test(text)) {
		result.operation = 'find_references';
		result.references = parseReferences(text);
	}

	// Extract language
	const langMatch = text.match(/(?:python|javascript|typescript)(?:\s+code)?/i);
	if (langMatch) {
		result.language = langMatch[0].toLowerCase().replace(/\s+code/i, '');
	}

	return result;
}

/**
 * Parse complexity metrics from text
 */
function parseComplexityMetrics(text: string): CodeIntelligenceResult['complexity'] {
	const functions: any[] = [];

	// Pattern: "function_name: complexity 15" or "function_name (line 10): 15"
	const funcPattern = /(?:function|method|def)\s+([a-zA-Z_]\w*)\s*(?:\(line\s+(\d+)\))?[:\s]+(?:complexity\s+)?(\d+)/gi;
	let match;

	while ((match = funcPattern.exec(text)) !== null) {
		const complexity = parseInt(match[3], 10);
		functions.push({
			name: match[1],
			cyclomaticComplexity: complexity,
			cognitiveComplexity: complexity,
			line: match[2] ? parseInt(match[2], 10) : 0,
			column: 0,
			complexityRank: getComplexityRank(complexity)
		});
	}

	// Extract average/max from text
	const avgMatch = text.match(/average\s+complexity[:\s]+(\d+(?:\.\d+)?)/i);
	const maxMatch = text.match(/max(?:imum)?\s+complexity[:\s]+(\d+)/i);
	const totalMatch = text.match(/(\d+)\s+(?:total\s+)?functions?/i);

	const averageComplexity = avgMatch ? parseFloat(avgMatch[1]) : 0;
	const maxComplexity = maxMatch ? parseInt(maxMatch[1], 10) : Math.max(...functions.map(f => f.cyclomaticComplexity), 0);
	const totalFunctions = totalMatch ? parseInt(totalMatch[1], 10) : functions.length;

	return {
		functions,
		averageComplexity,
		maxComplexity,
		totalFunctions
	};
}

/**
 * Parse symbols from text
 */
function parseSymbols(text: string): CodeIntelligenceResult['symbols'] {
	const symbols: any[] = [];

	// Pattern: "function foo at line 10" or "class Bar (line 5)"
	const symbolPattern = /(function|class|variable|method)\s+([a-zA-Z_]\w*)\s*(?:at\s+line|line|\(line)\s+(\d+)/gi;
	let match;

	while ((match = symbolPattern.exec(text)) !== null) {
		symbols.push({
			name: match[2],
			type: match[1].toLowerCase(),
			line: parseInt(match[3], 10),
			column: 0
		});
	}

	return symbols;
}

/**
 * Parse imports from text
 */
function parseImports(text: string): string[] {
	const imports: string[] = [];

	// Pattern: "imports: numpy, pandas, os" or "imported: numpy"
	const importsMatch = text.match(/imports?[:\s]+([a-zA-Z0-9_.,\s]+)/i);
	if (importsMatch) {
		const importsList = importsMatch[1].split(/[,\s]+/).filter(s => s.length > 0);
		imports.push(...importsList);
	}

	return imports;
}

/**
 * Parse references from text
 */
function parseReferences(text: string): CodeIntelligenceResult['references'] {
	const references: any[] = [];

	// Pattern: "reference at line 15" or "called at line 20"
	const refPattern = /(?:reference|call|usage)\s+at\s+line\s+(\d+)/gi;
	let match;

	while ((match = refPattern.exec(text)) !== null) {
		references.push({
			line: parseInt(match[1], 10),
			column: 0,
			type: 'access',
			context: ''
		});
	}

	return references;
}

/**
 * Parse web fetch result from response text
 */
function parseWebFetchResult(text: string): WebFetchResult | null {
	const result: WebFetchResult = {
		type: 'web_fetch',
		operation: 'fetch_documentation',
		rawText: text
	};

	// Extract URL
	const urlMatch = text.match(/(https?:\/\/[^\s<>"]+)/i);
	if (urlMatch) {
		result.url = urlMatch[1];

		// Extract domain as title
		try {
			const url = new URL(result.url);
			result.title = url.hostname;
		} catch {
			result.title = 'Documentation';
		}
	}

	// Look for markdown content blocks
	const codeBlockMatch = text.match(/```markdown\n([\s\S]*?)\n```/);
	if (codeBlockMatch) {
		result.content = codeBlockMatch[1];
	} else {
		// Use text after "documentation:" as content
		const contentMatch = text.match(/documentation[:\s]+([\s\S]+)/i);
		if (contentMatch) {
			result.content = contentMatch[1].trim();
		}
	}

	// Extract size if mentioned
	const sizeMatch = text.match(/(\d+)\s*(?:bytes|KB|MB)/i);
	if (sizeMatch) {
		result.sizeBytes = parseInt(sizeMatch[1], 10);
	}

	// Check if truncated
	result.truncated = /truncated|limited|partial/i.test(text);

	return result;
}

/**
 * Get complexity rank from cyclomatic complexity value
 */
function getComplexityRank(complexity: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' {
	if (complexity <= 5) return 'A';
	if (complexity <= 10) return 'B';
	if (complexity <= 20) return 'C';
	if (complexity <= 30) return 'D';
	if (complexity <= 40) return 'E';
	return 'F';
}

/**
 * Extract tool name from response
 */
export function extractToolName(text: string): ToolName {
	if (/code_intelligence|complexity|AST|symbol/i.test(text)) {
		return 'code_intelligence';
	}
	if (/web_fetch|documentation|fetched/i.test(text)) {
		return 'web_fetch';
	}
	return 'unknown';
}
