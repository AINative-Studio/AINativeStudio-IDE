/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Code Intelligence Types
 * Type definitions for code analysis operations including AST parsing,
 * symbol finding, complexity metrics, and reference tracking.
 */

/**
 * Supported programming languages for code intelligence
 */
export type CodeLanguage = 'python' | 'javascript' | 'typescript';

/**
 * Code intelligence operations
 */
export type CodeIntelligenceOperation =
	| 'parse_ast'
	| 'find_symbol'
	| 'find_references'
	| 'analyze_imports'
	| 'get_function_signature'
	| 'analyze_complexity';

/**
 * Symbol type in code
 */
export type SymbolType = 'function' | 'class' | 'variable' | 'import';

/**
 * Reference usage type
 */
export type ReferenceType = 'call' | 'access' | 'assignment' | 'load' | 'store' | 'attribute';

/**
 * Complexity rank (A-F scale)
 */
export type ComplexityRank = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/**
 * Location in source code
 */
export interface CodeLocation {
	/**
	 * Line number (1-based)
	 */
	readonly line: number;

	/**
	 * Column number (0-based)
	 */
	readonly column: number;

	/**
	 * End line number (optional)
	 */
	readonly endLine?: number;

	/**
	 * End column number (optional)
	 */
	readonly endColumn?: number;
}

/**
 * Code symbol information
 */
export interface Symbol {
	/**
	 * Symbol name
	 */
	readonly name: string;

	/**
	 * Symbol type
	 */
	readonly type: SymbolType;

	/**
	 * Location in source code
	 */
	readonly location: CodeLocation;

	/**
	 * Scope of the symbol (optional)
	 */
	readonly scope?: string;

	/**
	 * Function/method signature (optional)
	 */
	readonly signature?: string;
}

/**
 * Abstract Syntax Tree parsing result
 */
export interface ASTResult {
	/**
	 * Programming language
	 */
	readonly language: CodeLanguage;

	/**
	 * AST structure (language-specific format)
	 */
	readonly tree: any;

	/**
	 * Top-level symbols found
	 */
	readonly symbols: Symbol[];

	/**
	 * Parsing errors (if any)
	 */
	readonly errors?: Array<{
		readonly type: string;
		readonly message: string;
		readonly line?: number;
		readonly offset?: number;
	}>;
}

/**
 * Symbol search result
 */
export interface SymbolResult {
	/**
	 * Whether symbol was found
	 */
	readonly found: boolean;

	/**
	 * Symbol name
	 */
	readonly name: string;

	/**
	 * Symbol type
	 */
	readonly type?: SymbolType;

	/**
	 * Location in source code
	 */
	readonly location?: CodeLocation;

	/**
	 * Scope of the symbol
	 */
	readonly scope?: string;

	/**
	 * Function/method signature
	 */
	readonly signature?: string;

	/**
	 * Code context (line of code)
	 */
	readonly context?: string;

	/**
	 * Error message if search failed
	 */
	readonly error?: string;
}

/**
 * Single reference to a symbol
 */
export interface SymbolReference {
	/**
	 * Line number
	 */
	readonly line: number;

	/**
	 * Column number
	 */
	readonly column: number;

	/**
	 * Code context (line of code)
	 */
	readonly context: string;

	/**
	 * Usage type
	 */
	readonly type: ReferenceType;
}

/**
 * References search result
 */
export interface ReferencesResult {
	/**
	 * Symbol name
	 */
	readonly symbol: string;

	/**
	 * List of references found
	 */
	readonly references: SymbolReference[];

	/**
	 * Total count of references
	 */
	readonly count: number;
}

/**
 * Function parameter information
 */
export interface FunctionParameter {
	/**
	 * Parameter name
	 */
	readonly name: string;

	/**
	 * Type annotation (if available)
	 */
	readonly type?: string;

	/**
	 * Default value (if available)
	 */
	readonly default?: string;
}

/**
 * Function signature extraction result
 */
export interface SignatureResult {
	/**
	 * Whether function was found
	 */
	readonly found: boolean;

	/**
	 * Function name
	 */
	readonly name: string;

	/**
	 * List of parameters
	 */
	readonly parameters?: FunctionParameter[];

	/**
	 * Return type annotation
	 */
	readonly returnType?: string;

	/**
	 * Full signature string
	 */
	readonly signature?: string;

	/**
	 * Function docstring/JSDoc
	 */
	readonly docstring?: string;

	/**
	 * Error message if extraction failed
	 */
	readonly error?: string;
}

/**
 * Import analysis result
 */
export interface ImportsResult {
	/**
	 * Programming language
	 */
	readonly language: CodeLanguage;

	/**
	 * List of imported modules/packages
	 */
	readonly imports: string[];

	/**
	 * Total count of imports
	 */
	readonly count: number;
}

/**
 * Function complexity information
 */
export interface FunctionComplexity {
	/**
	 * Function name
	 */
	readonly name: string;

	/**
	 * Cyclomatic complexity (decision points + 1)
	 */
	readonly cyclomaticComplexity: number;

	/**
	 * Cognitive complexity (difficulty to understand)
	 */
	readonly cognitiveComplexity: number;

	/**
	 * Maintainability index (0-100, Python only)
	 */
	readonly maintainabilityIndex?: number;

	/**
	 * Starting line number
	 */
	readonly line: number;

	/**
	 * Starting column number
	 */
	readonly column: number;

	/**
	 * Complexity rank (A-F)
	 */
	readonly complexityRank: ComplexityRank;

	/**
	 * Class name (if method)
	 */
	readonly classname?: string;
}

/**
 * Code complexity analysis result
 */
export interface ComplexityResult {
	/**
	 * Programming language
	 */
	readonly language: CodeLanguage;

	/**
	 * Complexity data for each function
	 */
	readonly functions: FunctionComplexity[];

	/**
	 * Average cyclomatic complexity
	 */
	readonly averageComplexity: number;

	/**
	 * Maximum cyclomatic complexity found
	 */
	readonly maxComplexity: number;

	/**
	 * Total number of functions analyzed
	 */
	readonly totalFunctions: number;

	/**
	 * Analysis errors (if any)
	 */
	readonly errors?: Array<{
		readonly type: string;
		readonly message: string;
		readonly line?: number;
	}>;
}

/**
 * Code intelligence error codes
 */
export enum CodeIntelligenceErrorCode {
	/**
	 * Language not supported
	 */
	UnsupportedLanguage = 'UNSUPPORTED_LANGUAGE',

	/**
	 * Parsing failed
	 */
	ParseError = 'PARSE_ERROR',

	/**
	 * Symbol not found
	 */
	SymbolNotFound = 'SYMBOL_NOT_FOUND',

	/**
	 * API request failed
	 */
	APIError = 'API_ERROR',

	/**
	 * Unknown error
	 */
	UnknownError = 'UNKNOWN_ERROR'
}

/**
 * Code intelligence error
 */
export class CodeIntelligenceError extends Error {
	constructor(
		public readonly code: CodeIntelligenceErrorCode,
		message: string,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'CodeIntelligenceError';
	}
}
