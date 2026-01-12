/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Integration tests for CodeIntelligenceService
 * Tests end-to-end code analysis: AST parsing, complexity analysis, symbol finding
 */
import * as assert from 'assert';
import { CodeIntelligenceService, CodeIntelligenceError, CodeIntelligenceErrorCode } from '../../common/codeIntelligenceService.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
/**
 * Mock Managed Chat API Service
 */
class MockManagedChatAPIService {
    constructor() {
        this.mockResponses = new Map();
        this.callHistory = [];
    }
    setMockResponse(operation, response) {
        this.mockResponses.set(operation, response);
    }
    getCallHistory() {
        return this.callHistory;
    }
    clearHistory() {
        this.callHistory = [];
    }
    async sendChatCompletion(request) {
        this.callHistory.push(request);
        // Extract operation from request
        const operation = this.extractOperation(request);
        const response = this.mockResponses.get(operation);
        if (!response) {
            throw new Error(`No mock response configured for operation: ${operation}`);
        }
        return response;
    }
    async sendStreamingChatCompletion(request, onEvent, onError) {
        throw new Error('Not implemented for testing');
    }
    extractOperation(request) {
        const content = request.messages[0].content;
        const match = content.match(/operation:\s*(\w+)/);
        return match ? match[1] : 'unknown';
    }
    // Stub other methods
    async getUserUsage() { return {}; }
    async getUsageHistory() { return { history: [] }; }
    async getModelDistribution() { return { total_requests: 0, models: [] }; }
    async estimateCost() { return { estimated_credits: 0, can_afford: true }; }
    async checkCreditsAvailable() { return true; }
}
suite('CodeIntelligenceService - Integration Tests', () => {
    let mockChatAPI;
    let codeIntelligenceService;
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
                await codeIntelligenceService.analyzeComplexity('code', 'java');
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof CodeIntelligenceError);
                assert.strictEqual(error.code, CodeIntelligenceErrorCode.UnsupportedLanguage);
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
            }
            catch (error) {
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
            assert.strictEqual(result.parameters[0].name, 'price');
            assert.strictEqual(result.parameters[0].type, 'float');
            assert.strictEqual(result.parameters[1].default, '0.1');
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
            }
            catch (error) {
                assert.ok(error instanceof CodeIntelligenceError);
                assert.strictEqual(error.code, CodeIntelligenceErrorCode.APIError);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUludGVsbGlnZW5jZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9pbnRlZ3JhdGlvbi9jb2RlSW50ZWxsaWdlbmNlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7R0FHRztBQUVILE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1QkFBdUIsRUFBNEIscUJBQXFCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU5SixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFckU7O0dBRUc7QUFDSCxNQUFNLHlCQUF5QjtJQUEvQjtRQUdTLGtCQUFhLEdBQThCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDckQsZ0JBQVcsR0FBa0IsRUFBRSxDQUFDO0lBNEN6QyxDQUFDO0lBMUNBLGVBQWUsQ0FBQyxTQUFpQixFQUFFLFFBQXNCO1FBQ3hELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsY0FBYztRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0lBRUQsWUFBWTtRQUNYLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBb0I7UUFDNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFL0IsaUNBQWlDO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMs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