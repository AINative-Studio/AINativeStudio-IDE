/*---------------------------------------------------------------------------------------------
 *  Example: Integrating ManagedChatAPIService into AINative Studio
 *
 *  This file demonstrates how to integrate the Managed Chat API service into various
 *  parts of the IDE, including chat threads, code intelligence, and usage tracking.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vs/base/common/lifecycle';
import {
	IManagedChatAPIService,
	ChatRequest,
	ChatResponse,
	ManagedChatAPIError,
	ToolDefinition
} from 'vs/workbench/contrib/ainative/common/managedChatAPIService';

/**
 * Example 1: Basic Chat Integration
 *
 * Shows how to send a simple chat message and handle the response
 */
export class BasicChatExample extends Disposable {
	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {
		super();
	}

	async sendSimpleMessage(userMessage: string): Promise<string> {
		try {
			// Create request
			const request: ChatRequest = {
				messages: [
					{ role: 'user', content: userMessage }
				],
				preferred_model: 'llama-3.3-70b-instruct',
				temperature: 0.7,
				max_tokens: 1000
			};

			// Send request
			const response = await this.managedChatAPI.sendChatCompletion(request);

			// Extract assistant message
			const assistantMessage = response.choices[0].message.content;

			// Log usage
			console.log(`Credits consumed: ${response.credits_consumed}`);
			console.log(`Credits remaining: ${response.credits_remaining}`);
			console.log(`Tokens used: ${response.usage.total_tokens}`);

			return assistantMessage;

		} catch (error) {
			if (error instanceof ManagedChatAPIError) {
				if (error.isInsufficientCredits()) {
					throw new Error(`Insufficient credits. Upgrade at: ${error.getUpgradeURL()}`);
				} else if (error.isModelNotAvailable()) {
					throw new Error('Model not available for your plan');
				}
			}
			throw error;
		}
	}
}

/**
 * Example 2: Code Analysis with Tool Calling
 *
 * Demonstrates using the code_intelligence tool to analyze code
 */
export class CodeAnalysisExample extends Disposable {
	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {
		super();
	}

	async analyzeCode(code: string, language: 'python' | 'javascript' | 'typescript'): Promise<any> {
		// Define code intelligence tool
		const codeIntelligenceTool: ToolDefinition = {
			name: 'code_intelligence',
			description: 'Analyze code with AST parsing and complexity metrics',
			input_schema: {
				type: 'object',
				properties: {
					operation: {
						type: 'string',
						enum: ['parse_ast', 'analyze_complexity', 'find_symbol']
					},
					code: { type: 'string' },
					language: { type: 'string', enum: ['python', 'javascript', 'typescript'] }
				},
				required: ['operation', 'code', 'language']
			}
		};

		// Create request with tool
		const request: ChatRequest = {
			messages: [
				{
					role: 'user',
					content: `Analyze the complexity and structure of this ${language} code:\n\n${code}`
				}
			],
			tools: [codeIntelligenceTool],
			preferred_model: 'llama-3.3-70b-instruct',
			max_iterations: 5
		};

		// Send request
		const response = await this.managedChatAPI.sendChatCompletion(request);

		return {
			analysis: response.choices[0].message.content,
			creditsUsed: response.credits_consumed,
			tokensUsed: response.usage.total_tokens
		};
	}
}

/**
 * Example 3: Streaming Chat with Real-time Updates
 *
 * Shows how to use streaming for better UX on long-running requests
 */
export class StreamingChatExample extends Disposable {
	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {
		super();
	}

	async sendStreamingMessage(
		userMessage: string,
		onProgress: (chunk: string) => void,
		onToolExecution: (toolName: string) => void
	): Promise<void> {
		const request: ChatRequest = {
			messages: [
				{ role: 'user', content: userMessage }
			],
			preferred_model: 'llama-3.3-70b-instruct',
			stream: true
		};

		await this.managedChatAPI.sendStreamingChatCompletion(
			request,
			(event) => {
				if (event.type === 'content') {
					// Show incremental content
					onProgress(event.content);
				} else if (event.type === 'tool_execution') {
					// Show tool being used
					onToolExecution(event.tool_name);
				} else if (event.type === 'done') {
					// Final event
					console.log('Stream complete');
				}
			}
		);
	}
}

/**
 * Example 4: Usage Tracking and Cost Management
 *
 * Demonstrates how to track usage and manage costs
 */
export class UsageManagementExample extends Disposable {
	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {
		super();
	}

	async checkAndReportUsage(): Promise<void> {
		// Get current usage
		const usage = await this.managedChatAPI.getUserUsage('monthly');

		console.log('=== Monthly Usage Stats ===');
		console.log(`Credits used: ${usage.credits_used}`);
		console.log(`Credits remaining: ${usage.credits_remaining}`);
		console.log(`Total requests: ${usage.requests_count}`);
		console.log(`Total tokens: ${usage.total_tokens}`);

		// Get usage history
		const history = await this.managedChatAPI.getUsageHistory(7);

		console.log('\n=== Last 7 Days ===');
		history.history.forEach(day => {
			console.log(`${day.date}: ${day.requests} requests, ${day.credits_used} credits`);
		});

		// Get model distribution
		const distribution = await this.managedChatAPI.getModelDistribution('monthly');

		console.log('\n=== Model Usage ===');
		distribution.models.forEach(model => {
			console.log(`${model.model}: ${model.requests} requests (${model.percentage}%)`);
		});
	}

	async estimateBeforeSending(model: string, estimatedTokens: number): Promise<boolean> {
		// Estimate cost
		const estimate = await this.managedChatAPI.estimateCost(model, estimatedTokens);

		console.log('=== Cost Estimate ===');
		console.log(`Model: ${estimate.model}`);
		console.log(`Estimated tokens: ${estimate.estimated_tokens}`);
		console.log(`Estimated credits: ${estimate.estimated_credits}`);
		console.log(`Credits available: ${estimate.credits_available}`);
		console.log(`Can afford: ${estimate.can_afford}`);

		return estimate.can_afford;
	}

	async ensureSufficientCredits(requiredCredits: number): Promise<void> {
		const hasCredits = await this.managedChatAPI.checkCreditsAvailable(requiredCredits);

		if (!hasCredits) {
			throw new Error('Insufficient credits. Please upgrade your plan.');
		}
	}
}

/**
 * Example 5: Multi-turn Conversation with Context
 *
 * Shows how to maintain conversation context across multiple turns
 */
export class ConversationExample extends Disposable {
	private messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {
		super();
	}

	async sendMessage(userMessage: string): Promise<string> {
		// Add user message to conversation
		this.messages.push({
			role: 'user',
			content: userMessage
		});

		// Create request with full conversation history
		const request: ChatRequest = {
			messages: this.messages,
			preferred_model: 'llama-3.3-70b-instruct',
			temperature: 0.7,
			max_tokens: 1000
		};

		// Send request
		const response = await this.managedChatAPI.sendChatCompletion(request);
		const assistantMessage = response.choices[0].message.content;

		// Add assistant response to conversation
		this.messages.push({
			role: 'assistant',
			content: assistantMessage
		});

		return assistantMessage;
	}

	clearConversation(): void {
		this.messages = [];
	}

	getConversationLength(): number {
		return this.messages.length;
	}
}

/**
 * Example 6: Error Handling Best Practices
 *
 * Demonstrates comprehensive error handling
 */
export class ErrorHandlingExample extends Disposable {
	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {
		super();
	}

	async sendMessageWithErrorHandling(userMessage: string): Promise<string> {
		try {
			const request: ChatRequest = {
				messages: [{ role: 'user', content: userMessage }],
				preferred_model: 'llama-3.3-70b-instruct'
			};

			const response = await this.managedChatAPI.sendChatCompletion(request);
			return response.choices[0].message.content;

		} catch (error) {
			if (error instanceof ManagedChatAPIError) {
				// Handle specific error types
				if (error.isInsufficientCredits()) {
					return this.handleInsufficientCredits(error);
				} else if (error.isModelNotAvailable()) {
					return this.handleModelNotAvailable(userMessage);
				} else if (error.isRateLimited()) {
					return this.handleRateLimited();
				} else if (error.isAuthError()) {
					return this.handleAuthError();
				}
			}

			// Generic error
			console.error('Unexpected error:', error);
			throw new Error('Failed to send message. Please try again.');
		}
	}

	private handleInsufficientCredits(error: ManagedChatAPIError): string {
		const upgradeURL = error.getUpgradeURL();
		throw new Error(`You have run out of credits. Upgrade your plan at: ${upgradeURL}`);
	}

	private async handleModelNotAvailable(userMessage: string): Promise<string> {
		// Fall back to free model
		console.log('Falling back to free model...');

		const request: ChatRequest = {
			messages: [{ role: 'user', content: userMessage }],
			preferred_model: 'llama-3.3-8b-instruct'
		};

		const response = await this.managedChatAPI.sendChatCompletion(request);
		return response.choices[0].message.content;
	}

	private handleRateLimited(): string {
		throw new Error('Too many requests. Please wait a moment and try again.');
	}

	private handleAuthError(): string {
		throw new Error('Authentication required. Please log in.');
	}
}

/**
 * Example 7: Documentation Lookup with Web Fetch
 *
 * Shows how to use the web_fetch tool to query documentation
 */
export class DocumentationLookupExample extends Disposable {
	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {
		super();
	}

	async lookupDocumentation(query: string, url?: string): Promise<string> {
		// Define web fetch tool
		const webFetchTool: ToolDefinition = {
			name: 'web_fetch',
			description: 'Fetch documentation from web sources',
			input_schema: {
				type: 'object',
				properties: {
					operation: {
						type: 'string',
						enum: ['fetch_url', 'fetch_documentation', 'search_docs']
					},
					url: { type: 'string', format: 'uri' },
					query: { type: 'string' }
				},
				required: ['operation']
			}
		};

		const request: ChatRequest = {
			messages: [
				{ role: 'user', content: url ? `Fetch documentation from ${url} about: ${query}` : query }
			],
			tools: [webFetchTool],
			preferred_model: 'llama-3.3-70b-instruct',
			max_iterations: 3
		};

		const response = await this.managedChatAPI.sendChatCompletion(request);
		return response.choices[0].message.content;
	}
}

/**
 * Example 8: Complete Chat Service Integration
 *
 * A production-ready example combining all features
 */
export class ProductionChatService extends Disposable {
	private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {
		super();
	}

	async sendMessage(
		userMessage: string,
		options?: {
			selectedCode?: string;
			language?: 'python' | 'javascript' | 'typescript';
			enableWebFetch?: boolean;
		}
	): Promise<{
		response: string;
		creditsUsed: number;
		tokensUsed: number;
		creditsRemaining: number;
	}> {
		// Check credits before sending
		const estimate = await this.managedChatAPI.estimateCost('llama-3.3-70b-instruct', 1000);
		if (!estimate.can_afford) {
			throw new Error('Insufficient credits. Please upgrade your plan.');
		}

		// Build tools array based on context
		const tools: ToolDefinition[] = [];

		if (options?.selectedCode) {
			tools.push(this.getCodeIntelligenceTool());
		}

		if (options?.enableWebFetch) {
			tools.push(this.getWebFetchTool());
		}

		// Add user message to history
		this.conversationHistory.push({
			role: 'user',
			content: userMessage
		});

		// Create request
		const request: ChatRequest = {
			messages: this.conversationHistory,
			tools: tools.length > 0 ? tools : undefined,
			preferred_model: 'llama-3.3-70b-instruct',
			max_iterations: 5,
			temperature: 0.7,
			max_tokens: 2000
		};

		try {
			// Send request
			const response = await this.managedChatAPI.sendChatCompletion(request);
			const assistantMessage = response.choices[0].message.content;

			// Add assistant response to history
			this.conversationHistory.push({
				role: 'assistant',
				content: assistantMessage
			});

			return {
				response: assistantMessage,
				creditsUsed: response.credits_consumed,
				tokensUsed: response.usage.total_tokens,
				creditsRemaining: response.credits_remaining
			};

		} catch (error) {
			// Remove user message if request failed
			this.conversationHistory.pop();
			throw error;
		}
	}

	private getCodeIntelligenceTool(): ToolDefinition {
		return {
			name: 'code_intelligence',
			description: 'Analyze code with AST parsing and complexity metrics',
			input_schema: {
				type: 'object',
				properties: {
					operation: { type: 'string', enum: ['parse_ast', 'analyze_complexity'] },
					code: { type: 'string' },
					language: { type: 'string', enum: ['python', 'javascript', 'typescript'] }
				},
				required: ['operation', 'code', 'language']
			}
		};
	}

	private getWebFetchTool(): ToolDefinition {
		return {
			name: 'web_fetch',
			description: 'Fetch documentation from web sources',
			input_schema: {
				type: 'object',
				properties: {
					operation: { type: 'string', enum: ['fetch_url', 'fetch_documentation'] },
					url: { type: 'string', format: 'uri' }
				},
				required: ['operation']
			}
		};
	}

	clearConversation(): void {
		this.conversationHistory = [];
	}
}
