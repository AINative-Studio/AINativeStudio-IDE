/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Code Intelligence Service
 * Provides high-level code analysis operations using the managed chat API with code_intelligence tool.
 * Abstracts complexity of tool calling and response parsing into developer-friendly methods.
 *
 * Architecture:
 * - Uses IManagedChatAPIService for backend communication
 * - Automatically constructs tool schemas for each operation
 * - Parses LLM responses to extract structured results
 * - Supports Python, JavaScript, and TypeScript
 *
 * Example Usage:
 * ```typescript
 * const service = accessor.get(ICodeIntelligenceService);
 * const complexity = await service.analyzeComplexity(code, 'python');
 * console.log(complexity.averageComplexity); // 2.5
 * ```
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IManagedChatAPIService, ChatRequest, ChatResponse, ToolDefinition } from './managedChatAPIService.js';
import {
	CodeLanguage,
	ASTResult,
	SymbolResult,
	ReferencesResult,
	SignatureResult,
	ImportsResult,
	ComplexityResult,
	CodeIntelligenceError,
	CodeIntelligenceErrorCode,
	FunctionComplexity,
	ComplexityRank
} from './codeIntelligenceTypes.js';

// Re-export types for convenience
export * from './codeIntelligenceTypes.js';

/**
 * Service interface for code intelligence operations
 */
export const ICodeIntelligenceService = createDecorator<ICodeIntelligenceService>('codeIntelligenceService');

export interface ICodeIntelligenceService {
	readonly _serviceBrand: undefined;

	/**
	 * Analyze code complexity metrics
	 *
	 * Calculates cyclomatic complexity (decision points), cognitive complexity (difficulty),
	 * and maintainability index for all functions in the code.
	 *
	 * @param code Source code to analyze
	 * @param language Programming language
	 * @returns Complexity analysis result
	 * @throws CodeIntelligenceError if language unsupported or analysis fails
	 *
	 * @example
	 * ```typescript
	 * const result = await service.analyzeComplexity(`
	 *   def calculate(x):
	 *     if x > 0:
	 *       return x * 2
	 *     return 0
	 * `, 'python');
	 *
	 * console.log(result.averageComplexity); // 2
	 * console.log(result.functions[0].cyclomaticComplexity); // 2
	 * ```
	 */
	analyzeComplexity(code: string, language: CodeLanguage): Promise<ComplexityResult>;

	/**
	 * Parse code into Abstract Syntax Tree
	 *
	 * Parses source code and extracts top-level symbols (functions, classes, variables).
	 *
	 * @param code Source code to parse
	 * @param language Programming language
	 * @returns AST parsing result with symbols
	 * @throws CodeIntelligenceError if parsing fails
	 *
	 * @example
	 * ```typescript
	 * const ast = await service.parseAST('def foo(): pass', 'python');
	 * console.log(ast.symbols[0].name); // 'foo'
	 * console.log(ast.symbols[0].type); // 'function'
	 * ```
	 */
	parseAST(code: string, language: CodeLanguage): Promise<ASTResult>;

	/**
	 * Find symbol definition in code
	 *
	 * Searches for a symbol (function, class, variable) and returns its location and metadata.
	 *
	 * @param code Source code to search
	 * @param language Programming language
	 * @param symbolName Name of symbol to find
	 * @returns Symbol search result
	 *
	 * @example
	 * ```typescript
	 * const symbol = await service.findSymbol(code, 'python', 'calculate');
	 * if (symbol.found) {
	 *   console.log(symbol.location.line); // 5
	 *   console.log(symbol.signature); // 'calculate(x: int) -> int'
	 * }
	 * ```
	 */
	findSymbol(code: string, language: CodeLanguage, symbolName: string): Promise<SymbolResult>;

	/**
	 * Find all references to a symbol
	 *
	 * Searches for all locations where a symbol is used (calls, accesses, assignments).
	 *
	 * @param code Source code to search
	 * @param language Programming language
	 * @param symbolName Name of symbol to find references for
	 * @returns List of references with locations and usage types
	 *
	 * @example
	 * ```typescript
	 * const refs = await service.findReferences(code, 'python', 'calculate');
	 * console.log(refs.count); // 5
	 * refs.references.forEach(ref => {
	 *   console.log(`${ref.type} at line ${ref.line}`); // 'call at line 10'
	 * });
	 * ```
	 */
	findReferences(code: string, language: CodeLanguage, symbolName: string): Promise<ReferencesResult>;

	/**
	 * Get function signature with type annotations
	 *
	 * Extracts function signature including parameters, types, and return type.
	 *
	 * @param code Source code containing the function
	 * @param language Programming language
	 * @param functionName Name of function to extract
	 * @returns Function signature result
	 *
	 * @example
	 * ```typescript
	 * const sig = await service.getFunctionSignature(code, 'python', 'calculate');
	 * console.log(sig.signature); // 'calculate(x: int, y: int) -> int'
	 * console.log(sig.parameters); // [{ name: 'x', type: 'int' }, ...]
	 * console.log(sig.docstring); // 'Calculate the sum...'
	 * ```
	 */
	getFunctionSignature(code: string, language: CodeLanguage, functionName: string): Promise<SignatureResult>;

	/**
	 * Analyze import statements
	 *
	 * Extracts all import statements from source code.
	 *
	 * @param code Source code to analyze
	 * @param language Programming language
	 * @returns List of imported modules/packages
	 *
	 * @example
	 * ```typescript
	 * const imports = await service.analyzeImports(`
	 *   import os
	 *   from typing import List
	 *   import numpy as np
	 * `, 'python');
	 *
	 * console.log(imports.imports); // ['os', 'typing.List', 'numpy']
	 * console.log(imports.count); // 3
	 * ```
	 */
	analyzeImports(code: string, language: CodeLanguage): Promise<ImportsResult>;

	/**
	 * Get the code_intelligence tool schema for use with managed chat API
	 *
	 * Returns the tool definition that can be passed to the managed chat API
	 * to enable code intelligence capabilities in chat completions.
	 *
	 * @returns Tool definition for code_intelligence
	 *
	 * @example
	 * ```typescript
	 * const service = accessor.get(ICodeIntelligenceService);
	 * const toolSchema = service.getToolSchema();
	 *
	 * // Use in chat request
	 * const request = {
	 *   messages: [...],
	 *   tools: [toolSchema]
	 * };
	 * ```
	 */
	getToolSchema(): ToolDefinition;
}

/**
 * Code Intelligence Service Implementation
 */
export class CodeIntelligenceService extends Disposable implements ICodeIntelligenceService {
	readonly _serviceBrand: undefined;

	private static readonly SUPPORTED_LANGUAGES: ReadonlySet<CodeLanguage> = new Set<CodeLanguage>(['python', 'javascript', 'typescript']);
	private static readonly DEFAULT_MODEL = 'llama-3.3-70b-instruct';
	private static readonly MAX_ITERATIONS = 5;

	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {
		super();
	}

	/**
	 * Analyze code complexity
	 */
	async analyzeComplexity(code: string, language: CodeLanguage): Promise<ComplexityResult> {
		this._validateLanguage(language);

		const response = await this._executeCodeIntelligence({
			operation: 'analyze_complexity',
			code,
			language
		});

		return this._parseComplexityFromResponse(response, language);
	}

	/**
	 * Parse code to AST
	 */
	async parseAST(code: string, language: CodeLanguage): Promise<ASTResult> {
		this._validateLanguage(language);

		const response = await this._executeCodeIntelligence({
			operation: 'parse_ast',
			code,
			language
		});

		return this._parseASTFromResponse(response, language);
	}

	/**
	 * Find symbol definition
	 */
	async findSymbol(code: string, language: CodeLanguage, symbolName: string): Promise<SymbolResult> {
		this._validateLanguage(language);

		if (!symbolName || symbolName.trim().length === 0) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.UnknownError,
				'Symbol name cannot be empty'
			);
		}

		const response = await this._executeCodeIntelligence({
			operation: 'find_symbol',
			code,
			language,
			symbol_name: symbolName
		});

		return this._parseSymbolFromResponse(response, symbolName);
	}

	/**
	 * Find references to symbol
	 */
	async findReferences(code: string, language: CodeLanguage, symbolName: string): Promise<ReferencesResult> {
		this._validateLanguage(language);

		if (!symbolName || symbolName.trim().length === 0) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.UnknownError,
				'Symbol name cannot be empty'
			);
		}

		const response = await this._executeCodeIntelligence({
			operation: 'find_references',
			code,
			language,
			symbol_name: symbolName
		});

		return this._parseReferencesFromResponse(response, symbolName);
	}

	/**
	 * Get function signature
	 */
	async getFunctionSignature(code: string, language: CodeLanguage, functionName: string): Promise<SignatureResult> {
		this._validateLanguage(language);

		if (!functionName || functionName.trim().length === 0) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.UnknownError,
				'Function name cannot be empty'
			);
		}

		const response = await this._executeCodeIntelligence({
			operation: 'get_function_signature',
			code,
			language,
			function_name: functionName
		});

		return this._parseSignatureFromResponse(response, functionName);
	}

	/**
	 * Analyze imports
	 */
	async analyzeImports(code: string, language: CodeLanguage): Promise<ImportsResult> {
		this._validateLanguage(language);

		const response = await this._executeCodeIntelligence({
			operation: 'analyze_imports',
			code,
			language
		});

		return this._parseImportsFromResponse(response, language);
	}

	/**
	 * Get code_intelligence tool schema
	 */
	getToolSchema(): ToolDefinition {
		return this._getCodeIntelligenceToolSchema();
	}

	/**
	 * Execute code intelligence operation via managed chat API
	 */
	private async _executeCodeIntelligence(params: Record<string, any>): Promise<ChatResponse> {
		try {
			const request: ChatRequest = {
				messages: [{
					role: 'user',
					content: `Analyze the provided ${params.language} code using the code_intelligence tool with operation: ${params.operation}`
				}],
				tools: [this._getCodeIntelligenceToolSchema()],
				preferred_model: CodeIntelligenceService.DEFAULT_MODEL,
				max_iterations: CodeIntelligenceService.MAX_ITERATIONS,
				temperature: 0.1, // Low temperature for precise analysis
				stream: false
			};

			const response = await this.managedChatAPI.sendChatCompletion(request);

			if (!response.choices || response.choices.length === 0) {
				throw new CodeIntelligenceError(
					CodeIntelligenceErrorCode.APIError,
					'No response from managed chat API'
				);
			}

			return response;

		} catch (error) {
			if (error instanceof CodeIntelligenceError) {
				throw error;
			}

			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.APIError,
				`Failed to execute code intelligence operation: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Get code_intelligence tool schema for managed API
	 */
	private _getCodeIntelligenceToolSchema(): ToolDefinition {
		return {
			name: 'code_intelligence',
			description: 'Analyze code with AST parsing, symbol finding, complexity metrics, and reference tracking. Supports Python, JavaScript, TypeScript.',
			input_schema: {
				type: 'object',
				properties: {
					operation: {
						type: 'string',
						enum: ['parse_ast', 'find_symbol', 'find_references', 'analyze_imports', 'get_function_signature', 'analyze_complexity'],
						description: 'Code intelligence operation to perform'
					},
					code: {
						type: 'string',
						description: 'Source code to analyze'
					},
					language: {
						type: 'string',
						enum: ['python', 'javascript', 'typescript'],
						description: 'Programming language'
					},
					symbol_name: {
						type: 'string',
						description: 'Symbol name to search for (required for find_symbol, find_references)'
					},
					function_name: {
						type: 'string',
						description: 'Function name to extract signature (required for get_function_signature)'
					}
				},
				required: ['operation', 'code', 'language']
			}
		};
	}

	/**
	 * Validate language is supported
	 */
	private _validateLanguage(language: CodeLanguage): void {
		if (!CodeIntelligenceService.SUPPORTED_LANGUAGES.has(language)) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.UnsupportedLanguage,
				`Language '${language}' is not supported. Supported languages: ${Array.from(CodeIntelligenceService.SUPPORTED_LANGUAGES).join(', ')}`
			);
		}
	}

	/**
	 * Parse complexity result from chat response
	 */
	private _parseComplexityFromResponse(response: ChatResponse, language: CodeLanguage): ComplexityResult {
		try {
			const content = response.choices[0].message.content;

			// Try to extract JSON from the response
			const jsonMatch = content.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				// If no JSON, try to parse structured text
				return this._parseComplexityFromText(content, language);
			}

			const data = JSON.parse(jsonMatch[0]);

			// Map backend response format to our interface
			return {
				language,
				functions: (data.functions || []).map((func: any) => this._mapFunctionComplexity(func)),
				averageComplexity: data.average_complexity || 0,
				maxComplexity: data.max_complexity || 0,
				totalFunctions: data.total_functions || 0,
				errors: data.errors
			};

		} catch (error) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.ParseError,
				'Failed to parse complexity result from response',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Parse complexity from unstructured text response
	 */
	private _parseComplexityFromText(text: string, language: CodeLanguage): ComplexityResult {
		const functions: FunctionComplexity[] = [];
		let totalComplexity = 0;
		let maxComplexity = 0;

		// Extract function complexity data from text
		const functionPattern = /(?:Function|Method):\s*(\w+).*?Complexity:\s*(\d+)/gi;
		let match;

		while ((match = functionPattern.exec(text)) !== null) {
			const name = match[1];
			const complexity = parseInt(match[2], 10);

			functions.push({
				name,
				cyclomaticComplexity: complexity,
				cognitiveComplexity: complexity, // Approximate
				line: 0, // Unknown from text
				column: 0,
				complexityRank: this._getComplexityRank(complexity)
			});

			totalComplexity += complexity;
			maxComplexity = Math.max(maxComplexity, complexity);
		}

		return {
			language,
			functions,
			averageComplexity: functions.length > 0 ? totalComplexity / functions.length : 0,
			maxComplexity,
			totalFunctions: functions.length,
			errors: []
		};
	}

	/**
	 * Parse AST result from chat response
	 */
	private _parseASTFromResponse(response: ChatResponse, language: CodeLanguage): ASTResult {
		try {
			const content = response.choices[0].message.content;
			const jsonMatch = content.match(/\{[\s\S]*\}/);

			if (!jsonMatch) {
				return {
					language,
					tree: {},
					symbols: [],
					errors: [{ type: 'ParseError', message: 'Could not extract AST from response' }]
				};
			}

			const data = JSON.parse(jsonMatch[0]);

			return {
				language,
				tree: data.ast || data.tree || {},
				symbols: (data.symbols || []).map((sym: any) => this._mapSymbol(sym)),
				errors: data.errors
			};

		} catch (error) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.ParseError,
				'Failed to parse AST result from response',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Parse symbol result from chat response
	 */
	private _parseSymbolFromResponse(response: ChatResponse, symbolName: string): SymbolResult {
		try {
			const content = response.choices[0].message.content;
			const jsonMatch = content.match(/\{[\s\S]*\}/);

			if (!jsonMatch) {
				return {
					found: false,
					name: symbolName
				};
			}

			const data = JSON.parse(jsonMatch[0]);

			if (!data.found) {
				return {
					found: false,
					name: symbolName
				};
			}

			return {
				found: true,
				name: data.symbol || symbolName,
				type: data.type,
				location: data.location,
				scope: data.scope,
				signature: data.signature,
				context: data.context
			};

		} catch (error) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.ParseError,
				'Failed to parse symbol result from response',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Parse references result from chat response
	 */
	private _parseReferencesFromResponse(response: ChatResponse, symbolName: string): ReferencesResult {
		try {
			const content = response.choices[0].message.content;
			const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

			if (!jsonMatch) {
				return {
					symbol: symbolName,
					references: [],
					count: 0
				};
			}

			const data = JSON.parse(jsonMatch[0]);
			const references = Array.isArray(data) ? data : (data.references || []);

			return {
				symbol: symbolName,
				references: references.map((ref: any) => ({
					line: ref.line,
					column: ref.column,
					context: ref.context || '',
					type: ref.type || 'access'
				})),
				count: references.length
			};

		} catch (error) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.ParseError,
				'Failed to parse references result from response',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Parse function signature result from chat response
	 */
	private _parseSignatureFromResponse(response: ChatResponse, functionName: string): SignatureResult {
		try {
			const content = response.choices[0].message.content;
			const jsonMatch = content.match(/\{[\s\S]*\}/);

			if (!jsonMatch) {
				return {
					found: false,
					name: functionName
				};
			}

			const data = JSON.parse(jsonMatch[0]);

			if (!data.found) {
				return {
					found: false,
					name: functionName
				};
			}

			return {
				found: true,
				name: data.name || functionName,
				parameters: (data.parameters || []).map((param: any) => ({
					name: param.name,
					type: param.type,
					default: param.default
				})),
				returnType: data.return_type,
				signature: data.signature,
				docstring: data.docstring
			};

		} catch (error) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.ParseError,
				'Failed to parse signature result from response',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Parse imports result from chat response
	 */
	private _parseImportsFromResponse(response: ChatResponse, language: CodeLanguage): ImportsResult {
		try {
			const content = response.choices[0].message.content;
			const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

			if (!jsonMatch) {
				return {
					language,
					imports: [],
					count: 0
				};
			}

			const data = JSON.parse(jsonMatch[0]);
			const imports = Array.isArray(data) ? data : (data.imports || []);

			return {
				language,
				imports: imports.filter((imp: any) => typeof imp === 'string'),
				count: imports.length
			};

		} catch (error) {
			throw new CodeIntelligenceError(
				CodeIntelligenceErrorCode.ParseError,
				'Failed to parse imports result from response',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Map backend function complexity to our interface
	 */
	private _mapFunctionComplexity(func: any): FunctionComplexity {
		return {
			name: func.name,
			cyclomaticComplexity: func.cyclomatic_complexity || func.complexity || 0,
			cognitiveComplexity: func.cognitive_complexity || func.cyclomatic_complexity || 0,
			maintainabilityIndex: func.maintainability_index,
			line: func.line || func.lineno || 0,
			column: func.column || func.col_offset || 0,
			complexityRank: func.complexity_rank || func.letter || this._getComplexityRank(func.cyclomatic_complexity || 0),
			classname: func.classname
		};
	}

	/**
	 * Map backend symbol to our interface
	 */
	private _mapSymbol(sym: any): any {
		return {
			name: sym.name,
			type: sym.type,
			location: {
				line: sym.line || sym.lineno || 0,
				column: sym.col || sym.col_offset || 0,
				endLine: sym.end_line || sym.end_lineno,
				endColumn: sym.end_col || sym.end_col_offset
			},
			scope: sym.scope,
			signature: sym.signature
		};
	}

	/**
	 * Get complexity rank from cyclomatic complexity value
	 */
	private _getComplexityRank(complexity: number): ComplexityRank {
		if (complexity <= 5) return 'A';
		if (complexity <= 10) return 'B';
		if (complexity <= 20) return 'C';
		if (complexity <= 30) return 'D';
		if (complexity <= 40) return 'E';
		return 'F';
	}

	override dispose(): void {
		super.dispose();
	}
}

// Register the service with VS Code dependency injection
registerSingleton(ICodeIntelligenceService, CodeIntelligenceService, InstantiationType.Delayed);
