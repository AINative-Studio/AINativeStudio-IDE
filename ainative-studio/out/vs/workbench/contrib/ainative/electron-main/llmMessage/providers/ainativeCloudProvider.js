/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
/**
 * LLM provider for AINative Cloud backend
 * Handles JWT authentication, SSE streaming, and automatic token refresh
 */
export class AINativeCloudProvider {
    static { this.API_BASE = 'https://api.ainative.studio'; }
    static { this.CHAT_COMPLETIONS_ENDPOINT = '/v1/chat/completions'; }
    static { this.MAX_RETRIES = 1; }
    constructor(authService) {
        this.authService = authService;
    }
    /**
     * Send chat completion request with streaming support
     * Auto-refreshes JWT on 401 errors and retries
     */
    async sendChatCompletion(params) {
        const { model, messages, stream, max_tokens = 4096, temperature, onText, onFinalMessage, onError, abortSignal, _simulateAuthError, _simulateNetworkError } = params;
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
                const requestBody = {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVDbG91ZFByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9lbGVjdHJvbi1tYWluL2xsbU1lc3NhZ2UvcHJvdmlkZXJzL2FpbmF0aXZlQ2xvdWRQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQTRDMUY7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHFCQUFxQjthQUNULGFBQVEsR0FBRyw2QkFBNkIsQ0FBQzthQUN6Qyw4QkFBeUIsR0FBRyxzQkFBc0IsQ0FBQzthQUNuRCxnQkFBVyxHQUFHLENBQUMsQ0FBQztJQUV4QyxZQUNrQixXQUFpQztRQUFqQyxnQkFBVyxHQUFYLFdBQVcsQ0FBc0I7SUFDL0MsQ0FBQztJQUVMOzs7T0FHRztJQUNILEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUE0QjtRQUNwRCxNQUFNLEVBQ0wsS0FBSyxFQUNMLFFBQVEsRUFDUixNQUFNLEVBQ04sVUFBVSxHQUFHLElBQUksRUFDakIsV0FBVyxFQUNYLE1BQU0sRUFDTixjQUFjLEVBQ2QsT0FBTyxFQUNQLFdBQVcsRUFDWCxrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLEdBQUcsTUFBTSxDQUFDO1FBRVgsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBRW5CLE9BQU8sVUFBVSxJQUFJLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3hELElBQUksQ0FBQztnQkFDSix3QkFBd0I7Z0JBQ3hCLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNaLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxxREFBcUQsRUFBRSxTQUFTLEVB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