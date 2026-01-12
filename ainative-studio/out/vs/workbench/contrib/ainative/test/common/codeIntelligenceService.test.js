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
import { CodeIntelligenceService } from '../../common/codeIntelligenceService.js';
import { CodeIntelligenceErrorCode } from '../../common/codeIntelligenceTypes.js';
/**
 * Mock Managed Chat API Service
 */
class MockManagedChatAPIService {
    constructor() {
        this._mockResponse = null;
        this._shouldFail = false;
        this._failureError = null;
    }
    setMockResponse(response) {
        this._mockResponse = response;
        this._shouldFail = false;
    }
    setFailure(error) {
        this._shouldFail = true;
        this._failureError = error;
    }
    async sendChatCompletion(request) {
        if (this._shouldFail) {
            throw this._failureError || new Error('Mock API failure');
        }
        if (!this._mockResponse) {
            throw new Error('No mock response set');
        }
        return this._mockResponse;
    }
    // Placeholder methods (not used in tests)
    async getUserUsage() {
        return { credits_used: 0, credits_remaining: 1000, requests_count: 0, total_tokens: 0 };
    }
    async getUsageHistory() {
        return { history: [] };
    }
    async estimateCost() {
        return { estimated_credits: 0, estimated_tokens: 0 };
    }
    async getModelDistribution() {
        return { models: {} };
    }
    async sendStreamingChatCompletion() {
        throw new Error('Streaming not supported in mock');
    }
    async checkCreditsAvailable() {
        return true;
    }
}
suite('CodeIntelligenceService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    let mockAPI;
    setup(() => {
        mockAPI = new MockManagedChatAPIService();
        service = disposables.add(new CodeIntelligenceService(mockAPI));
    });
    /**
     * Helper to create mock chat response
     */
    function createMockResponse(content) {
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
            await assert.rejects(async () => service.analyzeComplexity('code', 'ruby'), (error) => {
                assert.strictEqual(error.code, CodeIntelligenceErrorCode.UnsupportedLanguage);
                return true;
            });
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
            await assert.rejects(async () => service.analyzeComplexity('code', 'python'), (error) => {
                assert.strictEqual(error.code, CodeIntelligenceErrorCode.APIError);
                return true;
            });
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
            await assert.rejects(async () => service.findSymbol('code', 'python', ''), (error) => {
                assert.strictEqual(error.code, CodeIntelligenceErrorCode.UnknownError);
                assert.ok(error.message.includes('empty'));
                return true;
            });
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
            await assert.rejects(async () => service.findReferences('code', 'python', '   '), (error) => {
                assert.strictEqual(error.code, CodeIntelligenceErrorCode.UnknownError);
                return true;
            });
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
            await assert.rejects(async () => service.getFunctionSignature('code', 'python', ''), (error) => {
                assert.strictEqual(error.code, CodeIntelligenceErrorCode.UnknownError);
                return true;
            });
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
            const badResponse = {
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
            await assert.rejects(async () => service.analyzeComplexity('code', 'python'), (error) => {
                assert.strictEqual(error.code, CodeIntelligenceErrorCode.APIError);
                return true;
            });
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
                assert.strictEqual(result.functions[0].complexityRank, testCase.expected, `Complexity ${testCase.complexity} should be ranked ${testCase.expected}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUludGVsbGlnZW5jZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vY29kZUludGVsbGlnZW5jZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7O0dBR0c7QUFFSCxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsdUJBQXVCLEVBQTRCLE1BQU0seUNBQXlDLENBQUM7QUFDNUcsT0FBTyxFQUF5Qix5QkFBeUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR3pHOztHQUVHO0FBQ0gsTUFBTSx5QkFBeUI7SUFBL0I7UUFHUyxrQkFBYSxHQUF3QixJQUFJLENBQUM7UUFDMUMsZ0JBQVcsR0FBRyxLQUFLLENBQUM7UUFDcEIsa0JBQWEsR0FBaUIsSUFBSSxDQUFDO0lBMkM1QyxDQUFDO0lBekNBLGVBQWUsQ0FBQyxRQUFzQjtRQUNyQyxJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQztRQUM5QixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztJQUMxQixDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQVk7UUFDdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDNUIsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFZO1FBQ3BDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLEtBQUssQ0FBQyxrQkFB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