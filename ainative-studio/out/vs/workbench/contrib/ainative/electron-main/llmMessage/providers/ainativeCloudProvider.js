/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { getAINativeConfig } from '../../../common/ainativeConfig.js';
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
 *    so `IAINativeAuthTokenProvider` is retained only as an optional fallback
 *    for installs that still carry a session token.
 */
export class AINativeCloudProvider {
    /**
     * Base host, sourced from the centralized `ainativeConfig` service (issue
     * #153) instead of a local literal, so it stays in sync with the other
     * AINative services that read `apiBaseUrl` from the same place. Defaults to
     * `https://api.ainative.studio`, overridable via `AINATIVE_API_BASE_URL`.
     */
    static { this.API_BASE = getAINativeConfig().apiBaseUrl; }
    /**
     * Confirmed OpenAI-compatible chat endpoint. Note the `/api` prefix — the
     * previous value (`/v1/chat/completions`) was wrong and 404'd.
     * (An Anthropic-format `POST /v1/messages` also exists but does not match
     * the OpenAI-shaped types used throughout this codebase.)
     */
    static { this.CHAT_COMPLETIONS_ENDPOINT = '/api/v1/chat/completions'; }
    static { this.API_KEY_HEADER = 'X-API-Key'; }
    static { this.MAX_RETRIES = 1; }
    /**
     * @param authService JWT token provider, kept for `/api/v1/auth/*` session
     *   concerns and used only as a fallback credential when no API key is set.
     * @param apiKey The `ainativeCloud` provider API key from settings
     *   (`settingsOfProvider.ainativeCloud.apiKey`). Preferred credential.
     */
    constructor(authService, apiKey) {
        this.authService = authService;
        this.apiKey = apiKey;
    }
    /**
     * Resolve the credential and the header it must be sent under.
     *
     * An API key is preferred and is sent as `X-API-Key`. If no key is
     * configured we fall back to the JWT session token as a bearer token so
     * existing logged-in installs degrade gracefully rather than hard-failing.
     */
    async resolveAuthHeaders(perRequestApiKey) {
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
    async sendChatCompletion(params) {
        const { model, messages, stream, max_tokens = 4096, temperature, top_p, system, apiKey: perRequestApiKey, onText, onFinalMessage, onError, abortSignal, _simulateAuthError, _simulateNetworkError } = params;
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
                const requestBody = {
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
                }
                else {
                    // Handle non-streaming response
                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content || '';
                    onFinalMessage({ fullText: content, fullReasoning: '', anthropicReasoning: null });
                }
                return; // Success
            }
            catch (error) {
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
    async handleStreamingResponse(body, onText, onFinalMessage, onError) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        const anthropicReasoning = [];
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
                            const chunk = JSON.parse(dataStr);
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
                        }
                        catch (parseError) {
                            // Skip malformed JSON chunks
                            console.warn('Failed to parse SSE chunk:', parseError.message);
                        }
                    }
                }
            }
            // Stream ended without [DONE] or finish_reason
            onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: anthropicReasoning.length > 0 ? anthropicReasoning : null });
        }
        catch (error) {
            onError({
                message: `Streaming error: ${error.message}`,
                fullError: error
            });
        }
        finally {
            reader.releaseLock();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVDbG91ZFByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9lbGVjdHJvbi1tYWluL2xsbU1lc3NhZ2UvcHJvdmlkZXJzL2FpbmF0aXZlQ2xvdWRQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUkxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQW1FdEU7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUNILE1BQU0sT0FBTyxxQkFBcUI7SUFDakM7Ozs7O09BS0c7YUFDcUIsYUFBUSxHQUFHLGlCQUFpQixFQUFFLENBQUMsVUFBVSxDQUFDO0lBQ2xFOzs7OztPQUtHO2FBQ3FCLDhCQUF5QixHQUFHLDBCQUEwQixDQUFDO2FBQ3ZELG1CQUFjLEdBQUcsV0FBVyxDQUFDO2FBQzdCLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO0lBRXhDOzs7OztPQUtHO0lBQ0gsWUFDa0IsV0FBdUMsRUFDdkMsTUFBMkI7UUFEM0IsZ0JBQVcsR0FBWCxXQUFXLENBQTRCO1FBQ3ZDLFdBQU0sR0FBTixNQUFNLENBQXFCO0lBQ3pDLENBQUM7SUFFTDs7Ozs7O09BTUc7SUFDSyxLQUFLLENBQUMsa0JBQWtCLENBQUMsZ0JBQXlCO1FBQ3pELE1BQU0sTUFBTSxHQUFHLGdCQUFnQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDL0MsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQzNELENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDaEQsSUFBSSxL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