/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { IAINativeAuthService } from '../../../common/ainativeAuthServiceTypes.js';
import { OnText, OnFinalMessage, OnError, AnthropicReasoning } from '../../../common/sendLLMMessageTypes.js';

/**
 * Chat completion parameters for AINative Cloud API
 */
export interface ChatCompletionParams {
	model: string;
	messages: Array<{
		role: 'user' | 'assistant' | 'system';
		content: string;
	}>;
	stream: boolean;
	max_tokens?: number;
	temperature?: number;
	onText: OnText;
	onFinalMessage: OnFinalMessage;
	onError: OnError;
	abortSignal?: AbortSignal;
	// Test hooks (not used in production)
	_simulateAuthError?: boolean;
	_simulateNetworkError?: boolean;
}

/**
 * Server-Sent Event chunk from AINative Cloud API
 */
interface SSEChunk {
	id?: string;
	object: string;
	created?: number;
	model?: string;
	choices?: Array<{
		index: number;
		delta?: {
			role?: string;
			content?: string;
		};
		finish_reason?: string | null;
	}>;
}

/**
 * LLM provider for AINative Cloud backend
 * Handles JWT authentication, SSE streaming, and automatic token refresh
 */
export class AINativeCloudProvider {
	private static readonly API_BASE = 'https://api.ainative.studio';
	private static readonly CHAT_COMPLETIONS_ENDPOINT = '/v1/chat/completions';
	private static readonly MAX_RETRIES = 1;

	constructor(
		private readonly authService: IAINativeAuthService
	) { }

	/**
	 * Send chat completion request with streaming support
	 * Auto-refreshes JWT on 401 errors and retries
	 */
	async sendChatCompletion(params: ChatCompletionParams): Promise<void> {
		const {
			model,
			messages,
			stream,
			max_tokens = 4096,
			temperature,
			onText,
			onFinalMessage,
			onError,
			abortSignal,
			_simulateAuthError,
			_simulateNetworkError
		} = params;

		let retryCount = 0;

		while (retryCount <= AINativeCloudProvider.MAX_RETRIES) {
			try {
				// Get current JWT token
				const token = await this.authService.getToken();
				if (!token) {
					onError({ message: 'Not authenticated. Please log in to AINative Cloud.', fullError: null });
					return;
				}

				// Test hooks for simulating errors
				if (_simulateNetworkError && retryCount === 0) {
					throw new Error('Network error (simulated)');
				}

				// Build request
				const url = `${AINativeCloudProvider.API_BASE}${AINativeCloudProvider.CHAT_COMPLETIONS_ENDPOINT}`;
				const requestBody: any = {
					model,
					messages,
					stream,
					max_tokens
				};

				if (temperature !== undefined) {
					requestBody.temperature = temperature;
				}

				const response = await fetch(url, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(requestBody),
					signal: abortSignal
				});

				// Test hook for simulating 401
				const is401 = !response.ok && (response.status === 401 || _simulateAuthError);

				// Handle 401 - refresh token and retry
				if (is401 && retryCount < AINativeCloudProvider.MAX_RETRIES) {
					const newToken = await this.authService.refreshToken();
					if (!newToken) {
						onError({ message: 'Failed to refresh authentication. Please log in again.', fullError: null });
						return;
					}
					retryCount++;
					continue; // Retry with new token
				}

				// Handle other HTTP errors
				if (!response.ok) {
					const errorText = await response.text();
					onError({
						message: `API request failed: ${response.status} ${response.statusText}`,
						fullError: new Error(errorText)
					});
					return;
				}

				// Handle streaming response
				if (stream && response.body) {
					await this.handleStreamingResponse(response.body, onText, onFinalMessage, onError);
				} else {
					// Handle non-streaming response
					const data = await response.json();
					const content = data.choices?.[0]?.message?.content || '';
					onFinalMessage({ fullText: content, fullReasoning: '', anthropicReasoning: null });
				}

				return; // Success
			} catch (error: any) {
				if (error.name === 'AbortError') {
					// Request was aborted
					return;
				}

				// If max retries reached, report error
				if (retryCount >= AINativeCloudProvider.MAX_RETRIES) {
					onError({
						message: `Network error: ${error.message}`,
						fullError: error
					});
					return;
				}

				// Otherwise retry
				retryCount++;
			}
		}
	}

	/**
	 * Parse Server-Sent Events stream from AINative Cloud API
	 */
	private async handleStreamingResponse(
		body: ReadableStream<Uint8Array>,
		onText: OnText,
		onFinalMessage: OnFinalMessage,
		onError: OnError
	): Promise<void> {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let fullText = '';
		const anthropicReasoning: AnthropicReasoning[] = [];

		try {
			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || ''; // Keep incomplete line in buffer

				for (const line of lines) {
					const trimmed = line.trim();

					// Skip empty lines and comments
					if (!trimmed || trimmed.startsWith(':')) {
						continue;
					}

					// Parse SSE data line
					if (trimmed.startsWith('data: ')) {
						const dataStr = trimmed.substring(6);

						// Check for [DONE] signal
						if (dataStr === '[DONE]') {
							onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: anthropicReasoning.length > 0 ? anthropicReasoning : null });
							return;
						}

						try {
							const chunk: SSEChunk = JSON.parse(dataStr);

							// Extract content delta
							const delta = chunk.choices?.[0]?.delta;
							if (delta?.content) {
								fullText += delta.content;
								onText({ fullText, fullReasoning: '' });
							}

							// Check for finish
							const finishReason = chunk.choices?.[0]?.finish_reason;
							if (finishReason) {
								onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: anthropicReasoning.length > 0 ? anthropicReasoning : null });
								return;
							}
						} catch (parseError: any) {
							// Skip malformed JSON chunks
							console.warn('Failed to parse SSE chunk:', parseError.message);
						}
					}
				}
			}

			// Stream ended without [DONE] or finish_reason
			onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: anthropicReasoning.length > 0 ? anthropicReasoning : null });
		} catch (error: any) {
			onError({
				message: `Streaming error: ${error.message}`,
				fullError: error
			});
		} finally {
			reader.releaseLock();
		}
	}
}
