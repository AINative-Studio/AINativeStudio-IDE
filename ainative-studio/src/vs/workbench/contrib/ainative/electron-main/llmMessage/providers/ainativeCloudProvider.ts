/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { IAINativeAuthService } from '../../../common/ainativeAuthServiceTypes.js';
import { OnText, OnFinalMessage, OnError, AnthropicReasoning } from '../../../common/sendLLMMessageTypes.js';

/**
 * Chat completion parameters for AINative Cloud API
 *
 * Mirrors the confirmed request schema of `POST /api/v1/chat/completions`
 * (OpenAI-compatible). See docs/api/BACKEND_CONTRACT_NOTES.md.
 */
export interface ChatCompletionParams {
	model: string;
	messages: Array<{
		role: 'user' | 'assistant' | 'system';
		content: string;
	}>;
	stream: boolean;
	/** Backend default is 4096 when omitted. */
	max_tokens?: number;
	/** Backend default is 0.7 when omitted. Valid range 0.0 - 2.0. */
	temperature?: number;
	/** Backend default is 1.0 when omitted. */
	top_p?: number;
	/** System prompt, sent as a top-level field rather than a system-role message. */
	system?: string;
	/**
	 * Per-request API key override. When omitted, the key supplied to the
	 * constructor (sourced from the `ainativeCloud` provider settings) is used.
	 */
	apiKey?: string;
	onText: OnText;
	onFinalMessage: OnFinalMessage;
	onError: OnError;
	abortSignal?: AbortSignal;
	// Test hooks (not used in production)
	_simulateAuthError?: boolean;
	_simulateNetworkError?: boolean;
}

/**
 * Server-Sent Event chunk from AINative Cloud API.
 *
 * The OpenAI-compatible `/api/v1/chat/completions` endpoint emits
 * `choices[].delta`-shaped chunks terminated by `data: [DONE]`, which is what
 * the parser below consumes.
 *
 * NOTE for whoever wires streaming end-to-end: the docs also describe
 * Anthropic-style SSE event types (`message_start`, `content_block_delta`,
 * `message_delta`, `message_stop`) which belong to the Anthropic-format
 * `POST /v1/messages` endpoint, and the docs state non-streaming is more
 * reliable for AINative-hosted models. If a `message_start` style frame ever
 * shows up on this endpoint, the parser needs a second branch — it is
 * deliberately not speculated on here.
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
 * LLM provider for AINative Cloud backend.
 *
 * Auth model (confirmed against https://docs.ainative.studio, see
 * BACKEND_CONTRACT_NOTES.md):
 *  - The chat-completions call authenticates with an **API key** via the
 *    `X-API-Key` header. Permanent account keys are `sk_`-prefixed; temporary
 *    instant-db keys (`tmp_`, 72h) and claimed-project keys (`zdb_live_`) are
 *    also accepted. Keys from other vendors (e.g. `sk-ant-`) are rejected 401.
 *  - JWT bearer auth belongs to the `/api/v1/auth/*` user-session endpoints
 *    (login/register/refresh/logout) and is NOT accepted interchangeably here,
 *    so `IAINativeAuthService` is retained only as an optional fallback for
 *    installs that still carry a session token.
 */
export class AINativeCloudProvider {
	private static readonly API_BASE = 'https://api.ainative.studio';
	/**
	 * Confirmed OpenAI-compatible chat endpoint. Note the `/api` prefix — the
	 * previous value (`/v1/chat/completions`) was wrong and 404'd.
	 * (An Anthropic-format `POST /v1/messages` also exists but does not match
	 * the OpenAI-shaped types used throughout this codebase.)
	 */
	private static readonly CHAT_COMPLETIONS_ENDPOINT = '/api/v1/chat/completions';
	private static readonly API_KEY_HEADER = 'X-API-Key';
	private static readonly MAX_RETRIES = 1;

	/**
	 * @param authService JWT session service, kept for `/api/v1/auth/*` session
	 *   concerns and used only as a fallback credential when no API key is set.
	 * @param apiKey The `ainativeCloud` provider API key from settings
	 *   (`settingsOfProvider.ainativeCloud.apiKey`). Preferred credential.
	 */
	constructor(
		private readonly authService: IAINativeAuthService,
		private readonly apiKey?: string | undefined
	) { }

	/**
	 * Resolve the credential and the header it must be sent under.
	 *
	 * An API key is preferred and is sent as `X-API-Key`. If no key is
	 * configured we fall back to the JWT session token as a bearer token so
	 * existing logged-in installs degrade gracefully rather than hard-failing.
	 */
	private async resolveAuthHeaders(perRequestApiKey?: string): Promise<Record<string, string> | null> {
		const apiKey = perRequestApiKey || this.apiKey;
		if (apiKey) {
			return { [AINativeCloudProvider.API_KEY_HEADER]: apiKey };
		}

		const token = await this.authService.getToken();
		if (token) {
			return { 'Authorization': `Bearer ${token}` };
		}

		return null;
	}

	/**
	 * Send chat completion request with streaming support.
	 * On 401 with a JWT fallback credential, refreshes the token and retries
	 * once. A rejected API key is not retryable, so it surfaces immediately.
	 */
	async sendChatCompletion(params: ChatCompletionParams): Promise<void> {
		const {
			model,
			messages,
			stream,
			max_tokens = 4096,
			temperature,
			top_p,
			system,
			apiKey: perRequestApiKey,
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
				// Resolve credential: API key (X-API-Key) preferred, JWT bearer as fallback
				const authHeaders = await this.resolveAuthHeaders(perRequestApiKey);
				if (!authHeaders) {
					onError({
						message: 'Not authenticated. Add your AINative Cloud API key in Settings, or log in to AINative Cloud.',
						fullError: null
					});
					return;
				}
				const usingApiKey = AINativeCloudProvider.API_KEY_HEADER in authHeaders;

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
				if (top_p !== undefined) {
					requestBody.top_p = top_p;
				}
				if (system !== undefined) {
					requestBody.system = system;
				}

				const response = await fetch(url, {
					method: 'POST',
					headers: {
						...authHeaders,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(requestBody),
					signal: abortSignal
				});

				// Test hook for simulating 401
				const is401 = !response.ok && (response.status === 401 || _simulateAuthError);

				if (is401 && usingApiKey) {
					// An API key rejection is not recoverable by refreshing — fail fast
					// with actionable guidance instead of burning a retry.
					const errorBody = await response.text().catch(() => '');
					onError({
						message: 'AINative Cloud rejected the API key (401). Check the key in Settings — it must be an AINative key (`sk_`, `tmp_`, or `zdb_live_` prefixed), not a key from another provider such as `sk-ant-...`.',
						fullError: errorBody ? new Error(errorBody) : null
					});
					return;
				}

				// Handle 401 on the JWT fallback path - refresh token and retry
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
