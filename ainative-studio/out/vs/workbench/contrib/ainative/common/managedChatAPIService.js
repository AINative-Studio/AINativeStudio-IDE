/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { getAINativeConfig } from './ainativeConfig.js';
/**
 * Service identifier for dependency injection
 */
export const IManagedChatAPIService = createDecorator('managedChatAPIService');
/**
 * Custom error class for Managed Chat API errors
 */
export class ManagedChatAPIError extends Error {
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'ManagedChatAPIError';
    }
    /**
     * Check if error is due to insufficient credits
     */
    isInsufficientCredits() {
        return this.statusCode === 402 || this.code === 'insufficient_credits';
    }
    /**
     * Check if error is due to model not available
     */
    isModelNotAvailable() {
        return this.statusCode === 403 || this.code === 'model_not_available';
    }
    /**
     * Check if error is due to rate limiting
     */
    isRateLimited() {
        return this.statusCode === 429;
    }
    /**
     * Check if error is due to authentication
     */
    isAuthError() {
        return this.statusCode === 401;
    }
    /**
     * Get upgrade URL if available
     */
    getUpgradeURL() {
        return this.details?.upgrade_url || null;
    }
}
/**
 * Managed Chat API Service implementation
 * Provides TypeScript wrapper for the backend Managed Chat API
 */
let ManagedChatAPIService = class ManagedChatAPIService extends Disposable {
    /**
     * Credits balance is NOT under `/api/v1/managed`. The confirmed path is
     * `GET /api/v1/public/credits/balance`, authenticated with the `X-API-Key`
     * header (the unprefixed `/api/v1/credits/balance` returns 404).
     *
     * It is a separate call from the chat response — credits are not returned
     * inline by chat completions, so `credits_consumed` / `credits_remaining`
     * on ChatResponse/UsageStats cannot be assumed to be populated by the chat
     * call alone.
     *
     * Wiring this up (and the `creditsRemaining` sync it feeds) is issue #147's
     * scope; it is declared here so the correct path is recorded in one place.
     */
    static { this.CREDITS_BALANCE_URL = `${getAINativeConfig().apiBaseUrl}/api/v1/public/credits/balance`; }
    constructor(authService) {
        super();
        this.authService = authService;
        // API base URL - production by default.
        //
        // VERIFIED (issue #143): the `/api/v1/managed/*` surface exists and is the
        // correct base for the billed/metered endpoints below — probing it returns
        // 401 (auth required) rather than 404. Confirmed live:
        //   POST /api/v1/managed/chat/completions  -> 401
        //   GET  /api/v1/managed/usage             -> 401
        //   GET  /api/v1/managed/usage/history     -> 401
        //   GET  /api/v1/managed/models            -> 401
        // These endpoints are JWT-authenticated (`Authorization: Bearer <access>`),
        // which is why this service takes IAINativeCloudAuthService rather than an
        // API key. Note the distinction from raw inference: the OpenAI-compatible
        // `POST /api/v1/chat/completions` used by AINativeCloudProvider authenticates
        // with `X-API-Key` instead. See docs/api/BACKEND_CONTRACT_NOTES.md.
        // Host sourced from the centralized `ainativeConfig` service (issue #153)
        // instead of a local literal; the `/api/v1/managed` path suffix stays here
        // since it is specific to this service and is not shared with any other
        // AINative service's endpoint.
        this.baseURL = `${getAINativeConfig().apiBaseUrl}/api/v1/managed`;
        // Retry configuration for rate limiting
        this.MAX_RETRIES = 3;
        this.INITIAL_RETRY_DELAY_MS = 1000;
    }
    /**
     * Send a chat completion request
     */
    async sendChatCompletion(request) {
        const token = await this._getAccessToken();
        try {
            const response = await this._fetchWithRetry(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...request,
                    stream: false // Ensure non-streaming mode
                })
            });
            return response;
        }
        catch (error) {
            throw this._handleError(error);
        }
    }
    /**
     * Send a streaming chat completion request
     * Uses Server-Sent Events (SSE) for real-time updates
     * Returns a controller to abort the stream
     */
    async sendStreamingChatCompletion(request, onEvent, onError) {
        const token = await this._getAccessToken();
        // Create abort controller for stream interruption
        const abortController = new AbortController();
        let reader = null;
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
                            if (!streamActive)
                                break;
                            this._processSSSELine(line, chunkIndex++, onEvent, onError);
                        }
                    }
                    // Successfully completed stream
                    break;
                }
                catch (error) {
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
                }
                finally {
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
                const error = new ManagedChatAPIError(0, 'max_reconnect_attempts', 'Maximum reconnection attempts reached');
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
    _processSSSELine(line, chunkIndex, onEvent, onError) {
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
            }
            catch (e) {
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
    _isNetworkError(error) {
        if (!error)
            return false;
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
    async getUserUsage(period = 'monthly') {
        const token = await this._getAccessToken();
        try {
            const response = await this._fetchWithRetry(`${this.baseURL}/usage?period=${period}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response;
        }
        catch (error) {
            throw this._handleError(error);
        }
    }
    /**
     * Get usage history for a number of days
     */
    async getUsageHistory(days = 30) {
        const token = await this._getAccessToken();
        // Validate days parameter
        if (days < 1 || days > 365) {
            throw new Error('days must be between 1 and 365');
        }
        try {
            const response = await this._fetchWithRetry(`${this.baseURL}/usage/history?days=${days}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response;
        }
        catch (error) {
            throw this._handleError(error);
        }
    }
    /**
     * Get model distribution statistics
     */
    async getModelDistribution(period = 'monthly') {
        const token = await this._getAccessToken();
        try {
            const response = await this._fetchWithRetry(`${this.baseURL}/models?period=${period}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response;
        }
        catch (error) {
            throw this._handleError(error);
        }
    }
    /**
     * Estimate cost for a request
     *
     * CONTRACT WARNING (issue #143): unlike the other `/api/v1/managed/*` paths,
     * `/api/v1/managed/estimate` returns 404 when probed — every sibling endpoint
     * returns 401. This path appears not to exist on the current backend, so this
     * method should be treated as unverified and will throw at runtime until the
     * real path is confirmed with the backend team. Left as-is deliberately:
     * replacing it is out of scope for #143 (contract correctness only) and
     * belongs with the usage/credits work in #147.
     */
    async estimateCost(model, tokens) {
        const token = await this._getAccessToken();
        try {
            const response = await this._fetchWithRetry(`${this.baseURL}/estimate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    estimated_tokens: tokens
                })
            });
            return response;
        }
        catch (error) {
            throw this._handleError(error);
        }
    }
    /**
     * Check if user has sufficient credits for a request
     */
    async checkCreditsAvailable(estimatedCredits) {
        try {
            const usage = await this.getUserUsage('monthly');
            return usage.credits_remaining >= estimatedCredits;
        }
        catch (error) {
            console.error('[ManagedChatAPIService] Failed to check credits:', error);
            return false;
        }
    }
    /**
     * Get access token from auth service
     * Automatically refreshes if expired
     */
    async _getAccessToken() {
        const token = await this.authService.getAccessToken();
        if (!token) {
            throw new ManagedChatAPIError(401, 'not_authenticated', 'Not authenticated. Please log in to use the Managed Chat API.');
        }
        return token;
    }
    /**
     * Fetch with automatic retry on rate limiting
     */
    async _fetchWithRetry(url, options, retryCount = 0) {
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
        }
        catch (error) {
            if (error instanceof ManagedChatAPIError) {
                throw error;
            }
            // Network or other errors
            throw new ManagedChatAPIError(0, 'network_error', 'Network error occurred while communicating with the API', { originalError: error });
        }
    }
    /**
     * Create API error from response
     */
    _createAPIError(statusCode, errorData) {
        const errorResponse = errorData;
        const error = errorResponse.error || { code: 'unknown_error', message: 'An unknown error occurred' };
        return new ManagedChatAPIError(statusCode, error.code, error.message, error.details);
    }
    /**
     * Handle and transform errors
     */
    _handleError(error) {
        if (error instanceof ManagedChatAPIError) {
            return error;
        }
        // Generic error
        return new ManagedChatAPIError(0, 'unknown_error', error.message || 'An unexpected error occurred', { originalError: error });
    }
    /**
     * Sleep utility for retry delays
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
ManagedChatAPIService = __decorate([
    __param(0, IAINativeCloudAuthService)
], ManagedChatAPIService);
export { ManagedChatAPIService };
// Register service with VS Code dependency injection
registerSingleton(IManagedChatAPIService, ManagedChatAPIService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlZENoYXRBUElTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vbWFuYWdlZENoYXRBUElTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXhEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFDO0FBMkt2Rzs7R0FFRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxLQUFLO0lBQzdDLFlBQ2lCLFVBQWtCLEVBQ2xCLElBQVksRUFDNUIsT0FBZSxFQUNDLE9BQTZCO1FBRTdDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUxDLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUVaLFlBQU8sR0FBUCxPQUFPLENBQXNCO1FBRzdDLElBQUksQ0FBQyxJQUFJLEdBQUcscUJBQXFCLENBQUM7SUFDbkMsQ0FBQztJQUVEOztPQUVHO0lBQ0gscUJBQXFCO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxzQkFBc0IsQ0FBQztJQUN4RSxD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