/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Unit Tests for Code Intelligence Service
 * Tests all code analysis operations with mocked managed chat API
 */

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CodeIntelligenceService, ICodeIntelligenceService } from '../../common/codeIntelligenceService.js';
import { CodeIntelligenceError, CodeIntelligenceErrorCode } from '../../common/codeIntelligenceTypes.js';
import { IManagedChatAPIService, ChatResponse } from '../../common/managedChatAPIService.js';

/**
 * Mock Managed Chat API Service
 */
class MockManagedChatAPIService implements IManagedChatAPIService {
	_serviceBrand: undefined;

	private _mockResponse: ChatResponse | null = null;
	private _shouldFail = false;
	private _failureError: Error | null = null;

	setMockResponse(response: ChatResponse): void {
		this._mockResponse = response;
		this._shouldFail = false;
	}

	setFailure(error: Error): void {
		this._shouldFail = true;
		this._failureError = error;
	}

	async sendChatCompletion(request: any): Promise<ChatResponse> {
		if (this._shouldFail) {
			throw this._failureError || new Error('Mock API failure');
		}

		if (!this._mockResponse) {
			throw new Error('No mock response set');
		}

		return this._mockResponse;
	}

	// Placeholder methods (not used in tests)
	async getUserUsage(): Promise<any> {
		return { credits_used: 0, credits_remaining: 1000, requests_count: 0, total_tokens: 0 };
	}
	async getUsageHistory(): Promise<any> {
		return { history: [] };
	}
	async estimateCost(): Promise<any> {
		return { estimated_credits: 0, estimated_tokens: 0 };
	}
	async getModelDistribution(): Promise<any> {
		return { models: {} };
	}
	async sendStreamingChatCompletion(): Promise<any> {
		throw new Error('Streaming not supported in mock');
	}
	async checkCreditsAvailable(): Promise<boolean> {
		return true;
	}
}

suite('CodeIntelligenceService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let service: ICodeIntelligenceService;
	let mockAPI: MockManagedChatAPIService;

	setup(() => {
		mockAPI = new MockManagedChatAPIService();
		service = disposables.add(new CodeIntelligenceService(mockAPI));
	});

	/**
	 * Helper to create mock chat response
	 */
	function createMockResponse(content: string): ChatResponse {
		return {
			id: 'test-123',
			model: 'llama-3.3-70b-instruct',
			provider: 'meta',
			created: Date.now(),
			choices: [{
				index: 0,
				message: {
					role: 'assistant',
					content
				},
				finish_reason: 'stop'
			}],
			usage: {
				prompt_tokens: 100,
				completion_tokens: 50,
				total_tokens: 150
			},
			credits_consumed: 0.5,
			credits_remaining: 999.5,
			plan_tier: 'basic',
			finish_reason: 'stop'
		};
	}

	suite('analyzeComplexity', () => {
		test('should analyze Python code complexity', async () => {
			const mockData = {
				language: 'python',
				functions: [{
					name: 'calculate',
					cyclomatic_complexity: 3,
					cognitive_complexity: 2,
					line: 1,
					column: 0,
					complexity_rank: 'A'
				}],
				average_complexity: 3,
				max_complexity: 3,
				total_functions: 1,
				errors: []
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.analyzeComplexity('def calculate(x):\n  if x > 0:\n    return x', 'python');

			assert.strictEqual(result.language, 'python');
			assert.strictEqual(result.totalFunctions, 1);
			assert.strictEqual(result.averageComplexity, 3);
			assert.strictEqual(result.maxComplexity, 3);
			assert.strictEqual(result.functions.length, 1);
			assert.strictEqual(result.functions[0].name, 'calculate');
			assert.strictEqual(result.functions[0].cyclomaticComplexity, 3);
		});

		test('should analyze JavaScript code complexity', async () => {
			const mockData = {
				language: 'javascript',
				functions: [{
					name: 'processData',
					cyclomatic_complexity: 5,
					cognitive_complexity: 4,
					line: 1,
					column: 0,
					complexity_rank: 'A'
				}],
				average_complexity: 5,
				max_complexity: 5,
				total_functions: 1,
				errors: []
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.analyzeComplexity('function processData() {}', 'javascript');

			assert.strictEqual(result.language, 'javascript');
			assert.strictEqual(result.functions[0].name, 'processData');
			assert.strictEqual(result.functions[0].cyclomaticComplexity, 5);
		});

		test('should throw error for unsupported language', async () => {
			await assert.rejects(
				async () => service.analyzeComplexity('code', 'ruby' as any),
				(error: CodeIntelligenceError) => {
					assert.strictEqual(error.code, CodeIntelligenceErrorCode.UnsupportedLanguage);
					return true;
				}
			);
		});

		test('should handle complexity parsing from text response', async () => {
			const textResponse = `
				Function: calculate
				Complexity: 3

				Function: validate
				Complexity: 2
			`;

			mockAPI.setMockResponse(createMockResponse(textResponse));

			const result = await service.analyzeComplexity('code', 'python');

			assert.strictEqual(result.functions.length, 2);
			assert.strictEqual(result.functions[0].name, 'calculate');
			assert.strictEqual(result.functions[0].cyclomaticComplexity, 3);
			assert.strictEqual(result.functions[1].name, 'validate');
			assert.strictEqual(result.functions[1].cyclomaticComplexity, 2);
		});

		test('should handle API errors gracefully', async () => {
			mockAPI.setFailure(new Error('API connection failed'));

			await assert.rejects(
				async () => service.analyzeComplexity('code', 'python'),
				(error: CodeIntelligenceError) => {
					assert.strictEqual(error.code, CodeIntelligenceErrorCode.APIError);
					return true;
				}
			);
		});
	});

	suite('parseAST', () => {
		test('should parse Python AST', async () => {
			const mockData = {
				language: 'python',
				ast: 'Module(...)',
				symbols: [{
					name: 'foo',
					type: 'function',
					line: 1,
					col: 0
				}],
				errors: []
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.parseAST('def foo(): pass', 'python');

			assert.strictEqual(result.language, 'python');
			assert.strictEqual(result.symbols.length, 1);
			assert.strictEqual(result.symbols[0].name, 'foo');
			assert.strictEqual(result.symbols[0].type, 'function');
		});

		test('should handle parsing errors', async () => {
			const mockData = {
				language: 'python',
				ast: null,
				symbols: [],
				errors: [{
					type: 'SyntaxError',
					message: 'Invalid syntax',
					line: 1
				}]
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.parseAST('def foo(:', 'python');

			assert.strictEqual(result.symbols.length, 0);
			assert.strictEqual(result.errors?.length, 1);
			assert.strictEqual(result.errors?.[0].type, 'SyntaxError');
		});
	});

	suite('findSymbol', () => {
		test('should find function symbol', async () => {
			const mockData = {
				found: true,
				symbol: 'calculate',
				type: 'function',
				location: {
					line: 5,
					column: 4
				},
				signature: 'calculate(x: int) -> int',
				context: 'def calculate(x: int) -> int:'
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.findSymbol('code', 'python', 'calculate');

			assert.strictEqual(result.found, true);
			assert.strictEqual(result.name, 'calculate');
			assert.strictEqual(result.type, 'function');
			assert.strictEqual(result.location?.line, 5);
			assert.strictEqual(result.signature, 'calculate(x: int) -> int');
		});

		test('should return not found for missing symbol', async () => {
			const mockData = {
				found: false,
				symbol: 'missing'
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.findSymbol('code', 'python', 'missing');

			assert.strictEqual(result.found, false);
			assert.strictEqual(result.name, 'missing');
		});

		test('should throw error for empty symbol name', async () => {
			await assert.rejects(
				async () => service.findSymbol('code', 'python', ''),
				(error: CodeIntelligenceError) => {
					assert.strictEqual(error.code, CodeIntelligenceErrorCode.UnknownError);
					assert.ok(error.message.includes('empty'));
					return true;
				}
			);
		});
	});

	suite('findReferences', () => {
		test('should find all references to symbol', async () => {
			const mockData = [
				{
					line: 5,
					column: 10,
					context: 'result = calculate(x)',
					type: 'call'
				},
				{
					line: 8,
					column: 15,
					context: 'y = calculate(z)',
					type: 'call'
				}
			];

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.findReferences('code', 'python', 'calculate');

			assert.strictEqual(result.symbol, 'calculate');
			assert.strictEqual(result.count, 2);
			assert.strictEqual(result.references.length, 2);
			assert.strictEqual(result.references[0].line, 5);
			assert.strictEqual(result.references[0].type, 'call');
			assert.strictEqual(result.references[1].line, 8);
		});

		test('should return empty list for symbol with no references', async () => {
			mockAPI.setMockResponse(createMockResponse('[]'));

			const result = await service.findReferences('code', 'python', 'unused');

			assert.strictEqual(result.count, 0);
			assert.strictEqual(result.references.length, 0);
		});

		test('should throw error for empty symbol name', async () => {
			await assert.rejects(
				async () => service.findReferences('code', 'python', '   '),
				(error: CodeIntelligenceError) => {
					assert.strictEqual(error.code, CodeIntelligenceErrorCode.UnknownError);
					return true;
				}
			);
		});
	});

	suite('getFunctionSignature', () => {
		test('should extract function signature with types', async () => {
			const mockData = {
				found: true,
				name: 'calculate',
				parameters: [
					{ name: 'x', type: 'int', default: null },
					{ name: 'y', type: 'int', default: '0' }
				],
				return_type: 'int',
				signature: 'calculate(x: int, y: int = 0) -> int',
				docstring: 'Calculate the sum of two numbers'
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.getFunctionSignature('code', 'python', 'calculate');

			assert.strictEqual(result.found, true);
			assert.strictEqual(result.name, 'calculate');
			assert.strictEqual(result.parameters?.length, 2);
			assert.strictEqual(result.parameters?.[0].name, 'x');
			assert.strictEqual(result.parameters?.[0].type, 'int');
			assert.strictEqual(result.parameters?.[1].default, '0');
			assert.strictEqual(result.returnType, 'int');
			assert.strictEqual(result.signature, 'calculate(x: int, y: int = 0) -> int');
			assert.strictEqual(result.docstring, 'Calculate the sum of two numbers');
		});

		test('should handle function not found', async () => {
			const mockData = {
				found: false,
				name: 'missing'
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.getFunctionSignature('code', 'python', 'missing');

			assert.strictEqual(result.found, false);
			assert.strictEqual(result.name, 'missing');
		});

		test('should throw error for empty function name', async () => {
			await assert.rejects(
				async () => service.getFunctionSignature('code', 'python', ''),
				(error: CodeIntelligenceError) => {
					assert.strictEqual(error.code, CodeIntelligenceErrorCode.UnknownError);
					return true;
				}
			);
		});
	});

	suite('analyzeImports', () => {
		test('should analyze Python imports', async () => {
			const mockData = ['os', 'sys.path', 'typing.List'];

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.analyzeImports('import os\nfrom sys import path', 'python');

			assert.strictEqual(result.language, 'python');
			assert.strictEqual(result.count, 3);
			assert.strictEqual(result.imports.length, 3);
			assert.strictEqual(result.imports[0], 'os');
			assert.strictEqual(result.imports[1], 'sys.path');
			assert.strictEqual(result.imports[2], 'typing.List');
		});

		test('should analyze JavaScript imports', async () => {
			const mockData = {
				imports: ['react', 'lodash', './utils']
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.analyzeImports('import React from "react"', 'javascript');

			assert.strictEqual(result.language, 'javascript');
			assert.strictEqual(result.count, 3);
			assert.strictEqual(result.imports[0], 'react');
			assert.strictEqual(result.imports[1], 'lodash');
		});

		test('should return empty list for code with no imports', async () => {
			mockAPI.setMockResponse(createMockResponse('[]'));

			const result = await service.analyzeImports('function foo() {}', 'javascript');

			assert.strictEqual(result.count, 0);
			assert.strictEqual(result.imports.length, 0);
		});
	});

	suite('Edge Cases', () => {
		test('should handle malformed JSON in response', async () => {
			mockAPI.setMockResponse(createMockResponse('This is not JSON'));

			const result = await service.analyzeImports('code', 'python');

			// Should return empty result rather than throwing
			assert.strictEqual(result.count, 0);
		});

		test('should handle empty response', async () => {
			mockAPI.setMockResponse(createMockResponse(''));

			const result = await service.analyzeImports('code', 'python');

			assert.strictEqual(result.count, 0);
		});

		test('should handle response with no choices', async () => {
			const badResponse: ChatResponse = {
				id: 'test-123',
				model: 'llama-3.3-70b-instruct',
				provider: 'meta',
				created: Date.now(),
				choices: [],
				usage: {
					prompt_tokens: 0,
					completion_tokens: 0,
					total_tokens: 0
				},
				credits_consumed: 0,
				credits_remaining: 1000,
				plan_tier: 'basic',
				finish_reason: 'error'
			};

			mockAPI.setMockResponse(badResponse);

			await assert.rejects(
				async () => service.analyzeComplexity('code', 'python'),
				(error: CodeIntelligenceError) => {
					assert.strictEqual(error.code, CodeIntelligenceErrorCode.APIError);
					return true;
				}
			);
		});
	});

	suite('Complexity Ranking', () => {
		test('should correctly rank complexity levels', async () => {
			const testCases = [
				{ complexity: 3, expected: 'A' },
				{ complexity: 8, expected: 'B' },
				{ complexity: 15, expected: 'C' },
				{ complexity: 25, expected: 'D' },
				{ complexity: 35, expected: 'E' },
				{ complexity: 50, expected: 'F' }
			];

			for (const testCase of testCases) {
				const mockData = {
					language: 'python',
					functions: [{
						name: 'test',
						cyclomatic_complexity: testCase.complexity,
						cognitive_complexity: testCase.complexity,
						line: 1,
						column: 0
					}],
					average_complexity: testCase.complexity,
					max_complexity: testCase.complexity,
					total_functions: 1,
					errors: []
				};

				mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

				const result = await service.analyzeComplexity('code', 'python');

				assert.strictEqual(result.functions[0].complexityRank, testCase.expected,
					`Complexity ${testCase.complexity} should be ranked ${testCase.expected}`);
			}
		});
	});

	suite('TypeScript Support', () => {
		test('should analyze TypeScript code', async () => {
			const mockData = {
				language: 'typescript',
				functions: [{
					name: 'processData',
					cyclomatic_complexity: 4,
					cognitive_complexity: 3,
					line: 1,
					column: 0,
					complexity_rank: 'A'
				}],
				average_complexity: 4,
				max_complexity: 4,
				total_functions: 1,
				errors: []
			};

			mockAPI.setMockResponse(createMockResponse(JSON.stringify(mockData)));

			const result = await service.analyzeComplexity('function processData(): void {}', 'typescript');

			assert.strictEqual(result.language, 'typescript');
			assert.strictEqual(result.functions[0].name, 'processData');
		});
	});
});
