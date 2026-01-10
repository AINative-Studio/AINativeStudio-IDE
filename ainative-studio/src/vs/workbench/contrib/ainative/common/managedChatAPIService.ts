/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

/**
 * Service identifier for dependency injection
 */
export const IManagedChatAPIService = createDecorator<IManagedChatAPIService>('managedChatAPIService');

/**
 * Chat message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Chat message interface
 */
export interface ChatMessage {
	role: MessageRole;
	content: string;
	name?: string;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
}

/**
 * Tool call structure
 */
export interface ToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

/**
 * Tool definition for function calling
 */
export interface ToolDefinition {
	name: string;
	description: string;
	input_schema: {
		type: 'object';
		properties: Record<string, any>;
		required?: string[];
	};
}

/**
 * Chat completion request
 */
export interface ChatRequest {
	messages: ChatMessage[];
	tools?: ToolDefinition[];
	preferred_model?: string;
	max_iterations?: number;
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
}

/**
 * Chat completion choice
 */
export interface ChatChoice {
	index: number;
	message: ChatMessage;
	finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

/**
 * Chat completion response
 */
export interface ChatResponse {
	id: string;
	model: string;
	provider: string;
	created: number;
	choices: ChatChoice[];
	usage: TokenUsage;
	credits_consumed: number;
	credits_remaining: number;
	plan_tier: string;
	finish_reason: string;
}

/**
 * Usage statistics for a period
 */
export interface UsageStats {
	period: 'daily' | 'weekly' | 'monthly';
	credits_used: number;
	credits_remaining: number;
	requests_count: number;
	total_tokens: number;
	models_used: Record<string, number>;
}

/**
 * Daily usage entry
 */
export interface DailyUsage {
	date: string;
	requests: number;
	credits_used: number;
	tokens: number;
}

/**
 * Usage history response
 */
export interface UsageHistory {
	history: DailyUsage[];
}

/**
 * Model usage statistics
 */
export interface ModelUsage {
	model: string;
	requests: number;
	percentage: number;
}

/**
 * Model distribution response
 */
export interface ModelDistribution {
	total_requests: number;
	models: ModelUsage[];
}

/**
 * Cost estimation request
 */
export interface CostEstimateRequest {
	model: string;
	estimated_tokens: number;
}

/**
 * Cost estimation response
 */
export interface CostEstimate {
	model: string;
	estimated_tokens: number;
	estimated_credits: number;
	credits_available: number;
	can_afford: boolean;
}

/**
 * API error details
 */
export interface APIErrorDetails {
	code: string;
	message: string;
	details?: Record<string, any>;
}

/**
 * API error response
 */
export interface APIErrorResponse {
	error: APIErrorDetails;
}

/**
 * Custom error class for Managed Chat API errors
 */
export class ManagedChatAPIError extends Error {
	constructor(
		public readonly statusCode: number,
		public readonly code: string,
		message: string,
		public readonly details?: Record<string, any>
	) {
		super(message);
		this.name = 'ManagedChatAPIError';
	}

	/**
	 * Check if error is due to insufficient credits
	 */
	isInsufficientCredits(): boolean {
		return this.statusCode === 402 || this.code === 'insufficient_credits';
	}

	/**
	 * Check if error is due to model not available
	 */
	isModelNotAvailable(): boolean {
		return this.statusCode === 403 || this.code === 'model_not_available';
	}

	/**
	 * Check if error is due to rate limiting
	 */
	isRateLimited(): boolean {
		return this.statusCode === 429;
	}

	/**
	 * Check if error is due to authentication
	 */
	isAuthError(): boolean {
		return this.statusCode === 401;
	}

	/**
	 * Get upgrade URL if available
	 */
	getUpgradeURL(): string | null {
		return this.details?.upgrade_url || null;
	}
}

/**
 * Managed Chat API Service interface
 */
export interface IManagedChatAPIService {
	readonly _serviceBrand: undefined;

	/**
	 * Send a chat completion request
	 */
	sendChatCompletion(request: ChatRequest): Promise<ChatResponse>;

	/**
	 * Send a streaming chat completion request with SSE
	 * Returns a controller to manage the stream
	 */
	sendStreamingChatCompletion(
		request: ChatRequest,
		onEvent: (event: any) => void,
		onError?: (error: Error) => void
	): Promise<{ abort: () => void }>;

	/**
	 * Get current usage statistics
	 */
	getUserUsage(period?: 'daily' | 'weekly' | 'monthly'): Promise<UsageStats>;

	/**
	 * Get usage history for a number of days
	 */
	getUsageHistory(days?: number): Promise<UsageHistory>;

	/**
	 * Get model distribution statistics
	 */
	getModelDistribution(period?: 'daily' | 'weekly' | 'monthly'): Promise<ModelDistribution>;

	/**
	 * Estimate cost for a request
	 */
	estimateCost(model: string, tokens: number): Promise<CostEstimate>;

	/**
	 * Check if user has sufficient credits for a request
	 */
	checkCreditsAvailable(estimatedCredits: number): Promise<boolean>;
}

/**
 * Managed Chat API Service implementation
 * Provides TypeScript wrapper for the backend Managed Chat API
 */
export class ManagedChatAPIService extends Disposable implements IManagedChatAPIService {
	readonly _serviceBrand: undefined;

	// API base URL - production by default
	private readonly baseURL = 'https://api.ainative.studio/api/v1/managed';

	// Retry configuration for rate limiting
	private readonly MAX_RETRIES = 3;
	private readonly INITIAL_RETRY_DELAY_MS = 1000;

	constructor(
		@IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService
	) {
		super();
	}

	/**
	 * Send a chat completion request
	 */
	async sendChatCompletion(request: ChatRequest): Promise<ChatResponse> {
		const token = await this._getAccessToken();

		try {
			const response = await this._fetchWithRetry(
				`${this.baseURL}/chat/completions`,
				{
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						...request,
						stream: false // Ensure non-streaming mode
					})
				}
			);

			return response as ChatResponse;

		} catch (error) {
			throw this._handleError(error);
		}
	}

	/**
	 * Send a streaming chat completion request
	 * Uses Server-Sent Events (SSE) for real-time updates
	 * Returns a controller to abort the stream
	 */
	async sendStreamingChatCompletion(
		request: ChatRequest,
		onEvent: (event: any) => void,
		onError?: (error: Error) => void
	): Promise<{ abort: () => void }> {
		const token = await this._getAccessToken();

		// Create abort controller for stream interruption
		const abortController = new AbortController();
		let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
		let streamActive = true;
		let reconnectAttempts = 0;
		const MAX_RECONNECT_ATTEMPTS = 3;
		const RECONNECT_DELAY_MS = 2000;

		const abort = () => {
			streamActive = false;
			abortController.abort();
			if (reader) {
				reader.cancel().catch(() => {
					// Ignore cancel errors
				});
				reader = null;
			}
		};

		// Start streaming in background
		(async () => {
			while (streamActive && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
				try {
					const response = await fetch(`${this.baseURL}/chat/completions`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${token}`,
							'Content-Type': 'application/json',
							'Accept': 'text/event-stream'
						},
						body: JSON.stringify({
							...request,
							stream: true
						}),
						signal: abortController.signal
					});

					// Handle authentication errors
					if (response.status === 401) {
						console.log('[ManagedChatAPIService] Token expired during streaming, refreshing...');
						await this.authService.refreshToken();
						reconnectAttempts++;
						await this._sleep(RECONNECT_DELAY_MS);
						continue; // Retry with new token
					}

					// Handle other errors
					if (!response.ok) {
						const errorData = await response.json();
						const apiError = this._createAPIError(response.status, errorData);
						if (onError) {
							onError(apiError);
						}
						throw apiError;
					}

					// Check for SSE content type
					const contentType = response.headers.get('content-type');
					if (!contentType || !contentType.includes('text/event-stream')) {
						throw new Error(`Expected text/event-stream but got ${contentType}`);
					}

					// Parse SSE stream
					const bodyReader = response.body?.getReader();
					if (!bodyReader) {
						throw new Error('Response body is not readable');
					}
					reader = bodyReader;

					const decoder = new TextDecoder();
					let buffer = '';
					let chunkIndex = 0;

					while (streamActive) {
						const { done, value } = await reader.read();

						if (done) {
							// Process any remaining buffer
							if (buffer.trim()) {
								this._processSSSELine(buffer, chunkIndex++, onEvent, onError);
							}
							break;
						}

						buffer += decoder.decode(value, { stream: true });
						const lines = buffer.split('\n');

						// Keep last incomplete line in buffer
						buffer = lines.pop() || '';

						for (const line of lines) {
							if (!streamActive) break;
							this._processSSSELine(line, chunkIndex++, onEvent, onError);
						}
					}

					// Successfully completed stream
					break;

				} catch (error) {
					// Handle abort
					if (error instanceof Error && error.name === 'AbortError') {
						console.log('[ManagedChatAPIService] Stream aborted by user');
						break;
					}

					// Handle network errors with reconnection
					if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && this._isNetworkError(error)) {
						reconnectAttempts++;
						console.warn(`[ManagedChatAPIService] Network error, reconnecting (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
						await this._sleep(RECONNECT_DELAY_MS * reconnectAttempts);
						continue;
					}

					// Fatal error
					const handledError = this._handleError(error);
					if (onError) {
						onError(handledError);
					}
					throw handledError;
				} finally {
					if (reader) {
						reader.cancel().catch(() => {
							// Ignore cancel errors
						});
						reader = null;
					}
				}
			}

			// Max reconnect attempts reached
			if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
				const error = new ManagedChatAPIError(
					0,
					'max_reconnect_attempts',
					'Maximum reconnection attempts reached'
				);
				if (onError) {
					onError(error);
				}
			}
		})().catch((error) => {
			console.error('[ManagedChatAPIService] Unhandled streaming error:', error);
			if (onError) {
				onError(error);
			}
		});

		return { abort };
	}

	/**
	 * Process a single SSE line
	 */
	private _processSSSELine(
		line: string,
		chunkIndex: number,
		onEvent: (event: any) => void,
		onError?: (error: Error) => void
	): void {
		// Trim whitespace
		const trimmedLine = line.trim();

		// Skip empty lines and comments
		if (!trimmedLine || trimmedLine.startsWith(':')) {
			return;
		}

		// Parse SSE format: "data: {...}"
		if (trimmedLine.startsWith('data: ')) {
			const data = trimmedLine.slice(6).trim();

			// Handle [DONE] marker
			if (data === '[DONE]') {
				onEvent({
					type: 'done',
					timestamp: Date.now(),
					finish_reason: 'stop'
				});
				return;
			}

			// Parse JSON event
			try {
				const event = JSON.parse(data);

				// Enrich event with metadata
				const enrichedEvent = {
					...event,
					timestamp: event.timestamp || Date.now(),
					index: chunkIndex
				};

				onEvent(enrichedEvent);
			} catch (e) {
				console.error('[ManagedChatAPIService] Failed to parse SSE event:', data, e);
				if (onError) {
					onError(new Error(`Failed to parse SSE event: ${e}`));
				}
			}
		}
		// Handle other SSE fields (id:, event:, retry:)
		else if (trimmedLine.startsWith('id: ') || trimmedLine.startsWith('event: ') || trimmedLine.startsWith('retry: ')) {
			// These are SSE metadata fields, we can log or use them if needed
			console.debug('[ManagedChatAPIService] SSE metadata:', trimmedLine);
		}
	}

	/**
	 * Check if error is a network error that can be retried
	 */
	private _isNetworkError(error: any): boolean {
		if (!error) return false;

		// Check for common network error types
		if (error.name === 'TypeError' || error.name === 'NetworkError') {
			return true;
		}

		// Check for network-related messages
		const message = error.message?.toLowerCase() || '';
		return message.includes('network') ||
		       message.includes('fetch') ||
		       message.includes('connection') ||
		       message.includes('timeout');
	}

	/**
	 * Get current usage statistics
	 */
	async getUserUsage(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<UsageStats> {
		const token = await this._getAccessToken();

		try {
			const response = await this._fetchWithRetry(
				`${this.baseURL}/usage?period=${period}`,
				{
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${token}`
					}
				}
			);

			return response as UsageStats;

		} catch (error) {
			throw this._handleError(error);
		}
	}

	/**
	 * Get usage history for a number of days
	 */
	async getUsageHistory(days: number = 30): Promise<UsageHistory> {
		const token = await this._getAccessToken();

		// Validate days parameter
		if (days < 1 || days > 365) {
			throw new Error('days must be between 1 and 365');
		}

		try {
			const response = await this._fetchWithRetry(
				`${this.baseURL}/usage/history?days=${days}`,
				{
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${token}`
					}
				}
			);

			return response as UsageHistory;

		} catch (error) {
			throw this._handleError(error);
		}
	}

	/**
	 * Get model distribution statistics
	 */
	async getModelDistribution(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<ModelDistribution> {
		const token = await this._getAccessToken();

		try {
			const response = await this._fetchWithRetry(
				`${this.baseURL}/models?period=${period}`,
				{
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${token}`
					}
				}
			);

			return response as ModelDistribution;

		} catch (error) {
			throw this._handleError(error);
		}
	}

	/**
	 * Estimate cost for a request
	 */
	async estimateCost(model: string, tokens: number): Promise<CostEstimate> {
		const token = await this._getAccessToken();

		try {
			const response = await this._fetchWithRetry(
				`${this.baseURL}/estimate`,
				{
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model,
						estimated_tokens: tokens
					})
				}
			);

			return response as CostEstimate;

		} catch (error) {
			throw this._handleError(error);
		}
	}

	/**
	 * Check if user has sufficient credits for a request
	 */
	async checkCreditsAvailable(estimatedCredits: number): Promise<boolean> {
		try {
			const usage = await this.getUserUsage('monthly');
			return usage.credits_remaining >= estimatedCredits;
		} catch (error) {
			console.error('[ManagedChatAPIService] Failed to check credits:', error);
			return false;
		}
	}

	/**
	 * Get access token from auth service
	 * Automatically refreshes if expired
	 */
	private async _getAccessToken(): Promise<string> {
		const token = await this.authService.getAccessToken();

		if (!token) {
			throw new ManagedChatAPIError(
				401,
				'not_authenticated',
				'Not authenticated. Please log in to use the Managed Chat API.'
			);
		}

		return token;
	}

	/**
	 * Fetch with automatic retry on rate limiting
	 */
	private async _fetchWithRetry(
		url: string,
		options: RequestInit,
		retryCount: number = 0
	): Promise<any> {
		try {
			const response = await fetch(url, options);

			// Handle rate limiting with exponential backoff
			if (response.status === 429 && retryCount < this.MAX_RETRIES) {
				const delay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
				console.warn(`[ManagedChatAPIService] Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);

				await this._sleep(delay);
				return this._fetchWithRetry(url, options, retryCount + 1);
			}

			// Handle token expiration
			if (response.status === 401) {
				console.log('[ManagedChatAPIService] Token expired, triggering refresh');
				await this.authService.refreshToken();

				// Retry with new token
				const newToken = await this._getAccessToken();
				const newOptions = {
					...options,
					headers: {
						...options.headers,
						'Authorization': `Bearer ${newToken}`
					}
				};

				const retryResponse = await fetch(url, newOptions);

				if (!retryResponse.ok) {
					const errorData = await retryResponse.json();
					throw this._createAPIError(retryResponse.status, errorData);
				}

				return await retryResponse.json();
			}

			// Handle other errors
			if (!response.ok) {
				const errorData = await response.json();
				throw this._createAPIError(response.status, errorData);
			}

			return await response.json();

		} catch (error) {
			if (error instanceof ManagedChatAPIError) {
				throw error;
			}

			// Network or other errors
			throw new ManagedChatAPIError(
				0,
				'network_error',
				'Network error occurred while communicating with the API',
				{ originalError: error }
			);
		}
	}

	/**
	 * Create API error from response
	 */
	private _createAPIError(statusCode: number, errorData: any): ManagedChatAPIError {
		const errorResponse = errorData as APIErrorResponse;
		const error = errorResponse.error || { code: 'unknown_error', message: 'An unknown error occurred' };

		return new ManagedChatAPIError(
			statusCode,
			error.code,
			error.message,
			error.details
		);
	}

	/**
	 * Handle and transform errors
	 */
	private _handleError(error: any): ManagedChatAPIError {
		if (error instanceof ManagedChatAPIError) {
			return error;
		}

		// Generic error
		return new ManagedChatAPIError(
			0,
			'unknown_error',
			error.message || 'An unexpected error occurred',
			{ originalError: error }
		);
	}

	/**
	 * Sleep utility for retry delays
	 */
	private _sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

// Register service with VS Code dependency injection
registerSingleton(IManagedChatAPIService, ManagedChatAPIService, InstantiationType.Delayed);
