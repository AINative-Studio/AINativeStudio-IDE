/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Integration tests for CodeIntelligenceService
 * Tests end-to-end code analysis: AST parsing, complexity analysis, symbol finding
 */

import * as assert from 'assert';
import { CodeIntelligenceService, ICodeIntelligenceService, CodeIntelligenceError, CodeIntelligenceErrorCode } from '../../common/codeIntelligenceService.js';
import { IManagedChatAPIService, ChatRequest, ChatResponse } from '../../common/managedChatAPIService.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';

/**
 * Mock Managed Chat API Service
 */
class MockManagedChatAPIService implements IManagedChatAPIService {
	readonly _serviceBrand: undefined;

	private mockResponses: Map<string, ChatResponse> = new Map();
	private callHistory: ChatRequest[] = [];

	setMockResponse(operation: string, response: ChatResponse): void {
		this.mockResponses.set(operation, response);
	}

	getCallHistory(): ChatRequest[] {
		return this.callHistory;
	}

	clearHistory(): void {
		this.callHistory = [];
	}

	async sendChatCompletion(request: ChatRequest): Promise<ChatResponse> {
		this.callHistory.push(request);

		// Extract operation from request
		const operation = this.extractOperation(request);
		const response = this.mockResponses.get(operation);

		if (!response) {
			throw new Error(`No mock response configured for operation: ${operation}`);
		}

		return response;
	}

	async sendStreamingChatCompletion(request: ChatRequest, onEvent: (event: any) => void, onError?: (error: Error) => void): Promise<{ abort: () => void }> {
		throw new Error('Not implemented for testing');
	}

	private extractOperation(request: ChatRequest): string {
		const content = request.messages[0].content;
		const match = content.match(/operation:\s*(\w+)/);
		return match ? match[1] : 'unknown';
	}

	// Stub other methods
	async getUserUsage(): Promise<any> { return {}; }
	async getUsageHistory(): Promise<any> { return { history: [] }; }
	async getModelDistribution(): Promise<any> { return { total_requests: 0, models: [] }; }
	async estimateCost(): Promise<any> { return { estimated_credits: 0, can_afford: true }; }
	async checkCreditsAvailable(): Promise<boolean> { return true; }
}

suite('CodeIntelligenceService - Integration Tests', () => {

	let mockChatAPI: MockManagedChatAPIService;
	let codeIntelligenceService: ICodeIntelligenceService;

	setup(() => {
		mockChatAPI = new MockManagedChatAPIService();
		codeIntelligenceService = new CodeIntelligenceService(mockChatAPI);
	});

	teardown(() => {
		if (codeIntelligenceService instanceof Disposable) {
			codeIntelligenceService.dispose();
		}
		mockChatAPI.clearHistory();
	});

	suite('Complexity Analysis', () => {

		test('should analyze Python code complexity', async () => {
			const pythonCode = `
def simple_function(x):
    if x > 0:
        return x * 2
    return 0

def complex_function(a, b, c):
    if a > 0:
        if b > 0:
            if c > 0:
                return a + b + c
            return a + b
        return a
    return 0
`;

			mockChatAPI.setMockResponse('analyze_complexity', {
				id: 'test-1',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							functions: [
								{
									name: 'simple_function',
									cyclomatic_complexity: 2,
									cognitive_complexity: 2,
									line: 2,
									column: 0,
									complexity_rank: 'A'
								},
								{
									name: 'complex_function',
									cyclomatic_complexity: 4,
									cognitive_complexity: 6,
									line: 7,
									column: 0,
									complexity_rank: 'A'
								}
							],
							average_complexity: 3,
							max_complexity: 4,
							total_functions: 2,
							errors: []
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
				credits_consumed: 0.5,
				credits_remaining: 999.5,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.analyzeComplexity(pythonCode, 'python');

			assert.strictEqual(result.language, 'python');
			assert.strictEqual(result.totalFunctions, 2);
			assert.strictEqual(result.averageComplexity, 3);
			assert.strictEqual(result.maxComplexity, 4);
			assert.strictEqual(result.functions[0].name, 'simple_function');
			assert.strictEqual(result.functions[0].cyclomaticComplexity, 2);
			assert.strictEqual(result.functions[1].name, 'complex_function');
			assert.strictEqual(result.functions[1].cyclomaticComplexity, 4);
		});

		test('should analyze JavaScript code complexity', async () => {
			const jsCode = `
function calculateTotal(items) {
    let total = 0;
    for (const item of items) {
        if (item.active) {
            total += item.price;
        }
    }
    return total;
}
`;

			mockChatAPI.setMockResponse('analyze_complexity', {
				id: 'test-2',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							functions: [
								{
									name: 'calculateTotal',
									cyclomatic_complexity: 3,
									cognitive_complexity: 3,
									line: 2,
									column: 0,
									complexity_rank: 'A'
								}
							],
							average_complexity: 3,
							max_complexity: 3,
							total_functions: 1,
							errors: []
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 80, completion_tokens: 40, total_tokens: 120 },
				credits_consumed: 0.4,
				credits_remaining: 999.1,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.analyzeComplexity(jsCode, 'javascript');

			assert.strictEqual(result.language, 'javascript');
			assert.strictEqual(result.totalFunctions, 1);
			assert.strictEqual(result.functions[0].name, 'calculateTotal');
			assert.strictEqual(result.functions[0].cyclomaticComplexity, 3);
		});

		test('should reject unsupported language', async () => {
			try {
				await codeIntelligenceService.analyzeComplexity('code', 'java' as any);
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof CodeIntelligenceError);
				assert.strictEqual((error as CodeIntelligenceError).code, CodeIntelligenceErrorCode.UnsupportedLanguage);
			}
		});

		test('should handle code with high complexity', async () => {
			const highComplexityCode = `
def very_complex_function(a, b, c, d, e):
    result = 0
    if a > 0:
        if b > 0:
            if c > 0:
                if d > 0:
                    if e > 0:
                        result = a + b + c + d + e
                    else:
                        result = a + b + c + d
                else:
                    result = a + b + c
            else:
                result = a + b
        else:
            result = a
    return result
`;

			mockChatAPI.setMockResponse('analyze_complexity', {
				id: 'test-3',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							functions: [
								{
									name: 'very_complex_function',
									cyclomatic_complexity: 6,
									cognitive_complexity: 15,
									maintainability_index: 40,
									line: 2,
									column: 0,
									complexity_rank: 'B'
								}
							],
							average_complexity: 6,
							max_complexity: 6,
							total_functions: 1,
							errors: []
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 120, completion_tokens: 60, total_tokens: 180 },
				credits_consumed: 0.6,
				credits_remaining: 998.5,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.analyzeComplexity(highComplexityCode, 'python');

			assert.strictEqual(result.functions[0].cyclomaticComplexity, 6);
			assert.strictEqual(result.functions[0].cognitiveComplexity, 15);
			assert.strictEqual(result.functions[0].complexityRank, 'B');
		});
	});

	suite('AST Parsing', () => {

		test('should parse Python AST and extract symbols', async () => {
			const pythonCode = `
class Calculator:
    def __init__(self):
        self.value = 0

    def add(self, x):
        self.value += x
        return self.value

def multiply(a, b):
    return a * b

PI = 3.14159
`;

			mockChatAPI.setMockResponse('parse_ast', {
				id: 'test-4',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							ast: {},
							symbols: [
								{
									name: 'Calculator',
									type: 'class',
									line: 2,
									col: 0,
									scope: 'global'
								},
								{
									name: '__init__',
									type: 'function',
									line: 3,
									col: 4,
									scope: 'Calculator'
								},
								{
									name: 'add',
									type: 'function',
									line: 6,
									col: 4,
									scope: 'Calculator'
								},
								{
									name: 'multiply',
									type: 'function',
									line: 10,
									col: 0,
									scope: 'global'
								},
								{
									name: 'PI',
									type: 'variable',
									line: 13,
									col: 0,
									scope: 'global'
								}
							],
							errors: []
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 90, completion_tokens: 70, total_tokens: 160 },
				credits_consumed: 0.5,
				credits_remaining: 998.0,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.parseAST(pythonCode, 'python');

			assert.strictEqual(result.language, 'python');
			assert.strictEqual(result.symbols.length, 5);
			assert.strictEqual(result.symbols[0].name, 'Calculator');
			assert.strictEqual(result.symbols[0].type, 'class');
			assert.strictEqual(result.symbols[3].name, 'multiply');
			assert.strictEqual(result.symbols[3].type, 'function');
		});

		test('should parse TypeScript AST', async () => {
			const tsCode = `
interface User {
    id: number;
    name: string;
}

class UserService {
    private users: User[] = [];

    addUser(user: User): void {
        this.users.push(user);
    }
}
`;

			mockChatAPI.setMockResponse('parse_ast', {
				id: 'test-5',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							ast: {},
							symbols: [
								{
									name: 'User',
									type: 'interface',
									line: 2,
									col: 0,
									scope: 'global'
								},
								{
									name: 'UserService',
									type: 'class',
									line: 7,
									col: 0,
									scope: 'global'
								},
								{
									name: 'addUser',
									type: 'method',
									line: 10,
									col: 4,
									scope: 'UserService',
									signature: 'addUser(user: User): void'
								}
							],
							errors: []
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 85, completion_tokens: 65, total_tokens: 150 },
				credits_consumed: 0.45,
				credits_remaining: 997.55,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.parseAST(tsCode, 'typescript');

			assert.strictEqual(result.language, 'typescript');
			assert.strictEqual(result.symbols.length, 3);
			assert.strictEqual(result.symbols[0].name, 'User');
			assert.strictEqual(result.symbols[0].type, 'interface');
		});
	});

	suite('Symbol Finding', () => {

		test('should find symbol definition', async () => {
			const code = `
def calculate_total(items):
    total = 0
    for item in items:
        total += item.price
    return total
`;

			mockChatAPI.setMockResponse('find_symbol', {
				id: 'test-6',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							found: true,
							symbol: 'calculate_total',
							type: 'function',
							location: { line: 2, column: 0 },
							scope: 'global',
							signature: 'calculate_total(items)',
							context: 'def calculate_total(items):'
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 70, completion_tokens: 40, total_tokens: 110 },
				credits_consumed: 0.35,
				credits_remaining: 997.20,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.findSymbol(code, 'python', 'calculate_total');

			assert.strictEqual(result.found, true);
			assert.strictEqual(result.name, 'calculate_total');
			assert.strictEqual(result.type, 'function');
			assert.strictEqual(result.location?.line, 2);
			assert.strictEqual(result.signature, 'calculate_total(items)');
		});

		test('should return not found for non-existent symbol', async () => {
			const code = `
def foo():
    pass
`;

			mockChatAPI.setMockResponse('find_symbol', {
				id: 'test-7',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							found: false
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 60, completion_tokens: 20, total_tokens: 80 },
				credits_consumed: 0.25,
				credits_remaining: 996.95,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.findSymbol(code, 'python', 'non_existent');

			assert.strictEqual(result.found, false);
			assert.strictEqual(result.name, 'non_existent');
		});

		test('should reject empty symbol name', async () => {
			try {
				await codeIntelligenceService.findSymbol('code', 'python', '');
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof CodeIntelligenceError);
			}
		});
	});

	suite('References Finding', () => {

		test('should find all references to a symbol', async () => {
			const code = `
def process_data(data):
    result = calculate(data)
    return result

def calculate(value):
    temp = calculate_temp(value)
    return temp * 2

def calculate_temp(val):
    return val + 10
`;

			mockChatAPI.setMockResponse('find_references', {
				id: 'test-8',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							references: [
								{
									line: 3,
									column: 13,
									type: 'call',
									context: 'result = calculate(data)'
								},
								{
									line: 6,
									column: 0,
									type: 'definition',
									context: 'def calculate(value):'
								}
							]
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 95, completion_tokens: 55, total_tokens: 150 },
				credits_consumed: 0.48,
				credits_remaining: 996.47,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.findReferences(code, 'python', 'calculate');

			assert.strictEqual(result.symbol, 'calculate');
			assert.strictEqual(result.count, 2);
			assert.strictEqual(result.references[0].type, 'call');
			assert.strictEqual(result.references[0].line, 3);
			assert.strictEqual(result.references[1].type, 'definition');
		});
	});

	suite('Function Signatures', () => {

		test('should extract function signature with type annotations', async () => {
			const code = `
def calculate_discount(price: float, discount_rate: float = 0.1) -> float:
    """Calculate discounted price.

    Args:
        price: Original price
        discount_rate: Discount percentage (default 0.1)

    Returns:
        Discounted price
    """
    return price * (1 - discount_rate)
`;

			mockChatAPI.setMockResponse('get_function_signature', {
				id: 'test-9',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							found: true,
							name: 'calculate_discount',
							parameters: [
								{ name: 'price', type: 'float' },
								{ name: 'discount_rate', type: 'float', default: '0.1' }
							],
							return_type: 'float',
							signature: 'calculate_discount(price: float, discount_rate: float = 0.1) -> float',
							docstring: 'Calculate discounted price.'
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 100, completion_tokens: 60, total_tokens: 160 },
				credits_consumed: 0.5,
				credits_remaining: 995.97,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.getFunctionSignature(code, 'python', 'calculate_discount');

			assert.strictEqual(result.found, true);
			assert.strictEqual(result.name, 'calculate_discount');
			assert.strictEqual(result.parameters?.length, 2);
			assert.strictEqual(result.parameters![0].name, 'price');
			assert.strictEqual(result.parameters![0].type, 'float');
			assert.strictEqual(result.parameters![1].default, '0.1');
			assert.strictEqual(result.returnType, 'float');
		});
	});

	suite('Import Analysis', () => {

		test('should analyze Python imports', async () => {
			const code = `
import os
import sys
from typing import List, Dict
from pathlib import Path
import numpy as np
`;

			mockChatAPI.setMockResponse('analyze_imports', {
				id: 'test-10',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							imports: ['os', 'sys', 'typing.List', 'typing.Dict', 'pathlib.Path', 'numpy']
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 75, completion_tokens: 35, total_tokens: 110 },
				credits_consumed: 0.38,
				credits_remaining: 995.59,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.analyzeImports(code, 'python');

			assert.strictEqual(result.language, 'python');
			assert.strictEqual(result.count, 6);
			assert.ok(result.imports.includes('os'));
			assert.ok(result.imports.includes('numpy'));
		});

		test('should analyze JavaScript imports', async () => {
			const code = `
import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';
`;

			mockChatAPI.setMockResponse('analyze_imports', {
				id: 'test-11',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: JSON.stringify({
							imports: ['react', 'axios']
						})
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 70, completion_tokens: 30, total_tokens: 100 },
				credits_consumed: 0.35,
				credits_remaining: 995.24,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.analyzeImports(code, 'javascript');

			assert.strictEqual(result.language, 'javascript');
			assert.strictEqual(result.count, 2);
			assert.ok(result.imports.includes('react'));
			assert.ok(result.imports.includes('axios'));
		});
	});

	suite('Tool Schema', () => {

		test('should provide correct tool schema', () => {
			const schema = codeIntelligenceService.getToolSchema();

			assert.strictEqual(schema.name, 'code_intelligence');
			assert.ok(schema.description.includes('AST'));
			assert.strictEqual(schema.input_schema.type, 'object');
			assert.ok(schema.input_schema.properties.operation);
			assert.ok(schema.input_schema.properties.code);
			assert.ok(schema.input_schema.properties.language);
			assert.strictEqual(schema.input_schema.required?.length, 3);
		});
	});

	suite('Error Handling', () => {

		test('should handle API errors gracefully', async () => {
			mockChatAPI.setMockResponse('analyze_complexity', {
				id: 'test-error',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [],
				usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
				credits_consumed: 0,
				credits_remaining: 995.24,
				plan_tier: 'free',
				finish_reason: 'error'
			});

			try {
				await codeIntelligenceService.analyzeComplexity('code', 'python');
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof CodeIntelligenceError);
				assert.strictEqual((error as CodeIntelligenceError).code, CodeIntelligenceErrorCode.APIError);
			}
		});

		test('should handle malformed JSON responses', async () => {
			mockChatAPI.setMockResponse('parse_ast', {
				id: 'test-malformed',
				model: 'llama-3.3-70b-instruct',
				provider: 'groq',
				created: Date.now(),
				choices: [{
					index: 0,
					message: {
						role: 'assistant',
						content: 'This is not valid JSON'
					},
					finish_reason: 'stop'
				}],
				usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
				credits_consumed: 0.2,
				credits_remaining: 995.04,
				plan_tier: 'free',
				finish_reason: 'stop'
			});

			const result = await codeIntelligenceService.parseAST('code', 'python');

			// Should return default result with errors
			assert.strictEqual(result.language, 'python');
			assert.strictEqual(result.symbols.length, 0);
			assert.ok(result.errors);
		});
	});
});
