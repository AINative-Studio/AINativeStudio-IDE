/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CodeIntelligenceService_1;
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
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IManagedChatAPIService } from './managedChatAPIService.js';
import { CodeIntelligenceError, CodeIntelligenceErrorCode } from './codeIntelligenceTypes.js';
// Re-export types for convenience
export * from './codeIntelligenceTypes.js';
/**
 * Service interface for code intelligence operations
 */
export const ICodeIntelligenceService = createDecorator('codeIntelligenceService');
/**
 * Code Intelligence Service Implementation
 */
let CodeIntelligenceService = class CodeIntelligenceService extends Disposable {
    static { CodeIntelligenceService_1 = this; }
    static { this.SUPPORTED_LANGUAGES = new Set(['python', 'javascript', 'typescript']); }
    static { this.DEFAULT_MODEL = 'llama-3.3-70b-instruct'; }
    static { this.MAX_ITERATIONS = 5; }
    constructor(managedChatAPI) {
        super();
        this.managedChatAPI = managedChatAPI;
    }
    /**
     * Analyze code complexity
     */
    async analyzeComplexity(code, language) {
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
    async parseAST(code, language) {
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
    async findSymbol(code, language, symbolName) {
        this._validateLanguage(language);
        if (!symbolName || symbolName.trim().length === 0) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.UnknownError, 'Symbol name cannot be empty');
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
    async findReferences(code, language, symbolName) {
        this._validateLanguage(language);
        if (!symbolName || symbolName.trim().length === 0) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.UnknownError, 'Symbol name cannot be empty');
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
    async getFunctionSignature(code, language, functionName) {
        this._validateLanguage(language);
        if (!functionName || functionName.trim().length === 0) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.UnknownError, 'Function name cannot be empty');
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
    async analyzeImports(code, language) {
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
    getToolSchema() {
        return this._getCodeIntelligenceToolSchema();
    }
    /**
     * Execute code intelligence operation via managed chat API
     */
    async _executeCodeIntelligence(params) {
        try {
            const request = {
                messages: [{
                        role: 'user',
                        content: `Analyze the provided ${params.language} code using the code_intelligence tool with operation: ${params.operation}`
                    }],
                tools: [this._getCodeIntelligenceToolSchema()],
                preferred_model: CodeIntelligenceService_1.DEFAULT_MODEL,
                max_iterations: CodeIntelligenceService_1.MAX_ITERATIONS,
                temperature: 0.1, // Low temperature for precise analysis
                stream: false
            };
            const response = await this.managedChatAPI.sendChatCompletion(request);
            if (!response.choices || response.choices.length === 0) {
                throw new CodeIntelligenceError(CodeIntelligenceErrorCode.APIError, 'No response from managed chat API');
            }
            return response;
        }
        catch (error) {
            if (error instanceof CodeIntelligenceError) {
                throw error;
            }
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.APIError, `Failed to execute code intelligence operation: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
        }
    }
    /**
     * Get code_intelligence tool schema for managed API
     */
    _getCodeIntelligenceToolSchema() {
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
    _validateLanguage(language) {
        if (!CodeIntelligenceService_1.SUPPORTED_LANGUAGES.has(language)) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.UnsupportedLanguage, `Language '${language}' is not supported. Supported languages: ${Array.from(CodeIntelligenceService_1.SUPPORTED_LANGUAGES).join(', ')}`);
        }
    }
    /**
     * Parse complexity result from chat response
     */
    _parseComplexityFromResponse(response, language) {
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
                functions: (data.functions || []).map((func) => this._mapFunctionComplexity(func)),
                averageComplexity: data.average_complexity || 0,
                maxComplexity: data.max_complexity || 0,
                totalFunctions: data.total_functions || 0,
                errors: data.errors
            };
        }
        catch (error) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.ParseError, 'Failed to parse complexity result from response', error instanceof Error ? error : undefined);
        }
    }
    /**
     * Parse complexity from unstructured text response
     */
    _parseComplexityFromText(text, language) {
        const functions = [];
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
    _parseASTFromResponse(response, language) {
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
                symbols: (data.symbols || []).map((sym) => this._mapSymbol(sym)),
                errors: data.errors
            };
        }
        catch (error) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.ParseError, 'Failed to parse AST result from response', error instanceof Error ? error : undefined);
        }
    }
    /**
     * Parse symbol result from chat response
     */
    _parseSymbolFromResponse(response, symbolName) {
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
        }
        catch (error) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.ParseError, 'Failed to parse symbol result from response', error instanceof Error ? error : undefined);
        }
    }
    /**
     * Parse references result from chat response
     */
    _parseReferencesFromResponse(response, symbolName) {
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
                references: references.map((ref) => ({
                    line: ref.line,
                    column: ref.column,
                    context: ref.context || '',
                    type: ref.type || 'access'
                })),
                count: references.length
            };
        }
        catch (error) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.ParseError, 'Failed to parse references result from response', error instanceof Error ? error : undefined);
        }
    }
    /**
     * Parse function signature result from chat response
     */
    _parseSignatureFromResponse(response, functionName) {
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
                parameters: (data.parameters || []).map((param) => ({
                    name: param.name,
                    type: param.type,
                    default: param.default
                })),
                returnType: data.return_type,
                signature: data.signature,
                docstring: data.docstring
            };
        }
        catch (error) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.ParseError, 'Failed to parse signature result from response', error instanceof Error ? error : undefined);
        }
    }
    /**
     * Parse imports result from chat response
     */
    _parseImportsFromResponse(response, language) {
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
                imports: imports.filter((imp) => typeof imp === 'string'),
                count: imports.length
            };
        }
        catch (error) {
            throw new CodeIntelligenceError(CodeIntelligenceErrorCode.ParseError, 'Failed to parse imports result from response', error instanceof Error ? error : undefined);
        }
    }
    /**
     * Map backend function complexity to our interface
     */
    _mapFunctionComplexity(func) {
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
    _mapSymbol(sym) {
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
    _getComplexityRank(complexity) {
        if (complexity <= 5)
            return 'A';
        if (complexity <= 10)
            return 'B';
        if (complexity <= 20)
            return 'C';
        if (complexity <= 30)
            return 'D';
        if (complexity <= 40)
            return 'E';
        return 'F';
    }
    dispose() {
        super.dispose();
    }
};
CodeIntelligenceService = CodeIntelligenceService_1 = __decorate([
    __param(0, IManagedChatAPIService)
], CodeIntelligenceService);
export { CodeIntelligenceService };
// Register the service with VS Code dependency injection
registerSingleton(ICodeIntelligenceService, CodeIntelligenceService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUludGVsbGlnZW5jZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9jb2RlSW50ZWxsaWdlbmNlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEc7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBaUJHO0FBRUgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHNCQUFzQixFQUE2QyxNQUFNLDRCQUE0QixDQUFDO0FBQy9HLE9BQU8sRUFRTixxQkFBcUIsRUFDckIseUJBQXlCLEVBR3pCLE1BQU0sNEJBQTRCLENBQUM7QUFFcEMsa0NBQWtDO0FBQ2xDLGNBQWMsNEJBQTRCLENBQUM7QUFFM0M7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQTJCLHlCQUF5QixDQUFDLENBQUM7QUE4SjdHOztHQUVHO0FBQ0ksSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVOzthQUc5Qix3QkFBbUIsR0FBOEIsSUFBSSxHQUFHLENBQWUsQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDLEFBQTNGLENBQTRGO2FBQy9HLGtCQUFhLEdBQUcsd0JBQXdCLEFBQTNCLENBQTRCO2FBQ3pDLG1CQUFjLEdBQUcsQ0FBQyxBQUFKLENBQUs7SUFFM0MsWUFDMEMsY0FBc0M7UUFFL0UsS0FBSyxFQUFFLENBQUM7UUFGaUMsbUJBQWMsR0FBZCxjQUFj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