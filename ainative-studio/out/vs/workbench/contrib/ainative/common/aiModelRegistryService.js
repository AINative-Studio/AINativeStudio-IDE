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
var AIModelRegistryService_1;
/**
 * AI Model Registry Service
 * Integrates with AINative's AI Model Registry for browsing, selecting, and invoking AI models
 */
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes.js';
import { ModelRegistryError, ModelRegistryErrorCode, ModelCapability, PricingTier, ModelParameterType } from './aiModelRegistryTypes.js';
import { ModelConfigManager } from './aiModelConfig.js';
import { IUsageTrackingService } from './usageTrackingService.js';
/**
 * Service interface for AI Model Registry
 */
export const IAIModelRegistryService = createDecorator('aiModelRegistryService');
/**
 * AI Model Registry Service Implementation
 */
let AIModelRegistryService = class AIModelRegistryService extends Disposable {
    static { AIModelRegistryService_1 = this; }
    static { this.API_BASE = 'https://api.ainative.studio'; }
    static { this.CACHE_DURATION_MS = 5 * 60 * 1000; } // 5 minutes
    constructor(cloudAuthService, storageService, usageTrackingService) {
        super();
        this.cloudAuthService = cloudAuthService;
        this._onDidUpdateModels = this._register(new Emitter());
        this.onDidUpdateModels = this._onDidUpdateModels.event;
        this._onDidChangeModelSelection = this._register(new Emitter());
        this.onDidChangeModelSelection = this._onDidChangeModelSelection.event;
        this._cachedModels = null;
        this._cacheTimestamp = 0;
        this._usageTrackingService = null;
        this._usageTrackingService = usageTrackingService;
        this._configManager = new ModelConfigManager(storageService);
        this._register(this._configManager.onDidChangeModelSelection(config => {
            this._onDidChangeModelSelection.fire(config);
        }));
        // Listen to auth state changes to clear cache on logout
        this._register(this.cloudAuthService.onDidChangeAuthState(state => {
            if (state === 'unauthenticated') {
                this._cachedModels = null;
                this._cacheTimestamp = 0;
            }
        }));
    }
    /**
     * Fetch models from API
     */
    async _fetchModelsFromAPI() {
        const accessToken = await this.cloudAuthService.getAccessToken();
        if (!accessToken) {
            console.warn('[AIModelRegistryService] No access token available, returning empty model list');
            return [];
        }
        try {
            const response = await this._makeApiRequest('/api/v1/models/list', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                await this._handleApiError(response);
            }
            const data = await response.json();
            return this._mapAPIModelsToAIModels(data.models || []);
        }
        catch (error) {
            console.error('[AIModelRegistryService] Failed to fetch models from API:', error);
            // Return empty array on failure - caller can decide how to handle
            return [];
        }
    }
    /**
     * Map API model format to internal AIModel format
     */
    _mapAPIModelsToAIModels(apiModels) {
        return apiModels.map(model => ({
            id: model.id || model.model_id,
            name: model.name,
            description: model.description || '',
            provider: model.provider,
            version: model.version,
            capabilities: this._mapCapabilities(model.capabilities || []),
            pricing: {
                tier: this._mapPricingTier(model.pricing?.tier),
                inputTokenCost: model.pricing?.input_token_cost,
                outputTokenCost: model.pricing?.output_token_cost,
                monthlySubscriptionCost: model.pricing?.monthly_subscription_cost,
                currency: model.pricing?.currency || 'USD'
            },
            parameters: this._mapParameters(model.parameters || []),
            maxContextLength: model.max_context_length,
            maxOutputLength: model.max_output_length,
            createdAt: model.created_at,
            updatedAt: model.updated_at,
            available: model.available !== false,
            tags: model.tags || [],
            metadata: model.metadata
        }));
    }
    /**
     * Map API capability strings to ModelCapability enum
     */
    _mapCapabilities(apiCapabilities) {
        const capabilityMap = {
            'text_generation': ModelCapability.TextGeneration,
            'code_generation': ModelCapability.CodeGeneration,
            'code_completion': ModelCapability.CodeCompletion,
            'chat': ModelCapability.Chat,
            'function_calling': ModelCapability.FunctionCalling,
            'vision': ModelCapability.Vision,
            'embedding': ModelCapability.Embedding,
            'streaming': ModelCapability.Streaming,
            'tool_use': ModelCapability.ToolUse
        };
        return apiCapabilities
            .map(cap => capabilityMap[cap])
            .filter(cap => cap !== undefined);
    }
    /**
     * Map API pricing tier to PricingTier enum
     */
    _mapPricingTier(tier) {
        const tierMap = {
            'free': PricingTier.Free,
            'pay_as_you_go': PricingTier.PayAsYouGo,
            'subscription': PricingTier.Subscription,
            'enterprise': PricingTier.Enterprise
        };
        return tierMap[tier || 'pay_as_you_go'] || PricingTier.PayAsYouGo;
    }
    /**
     * Map API parameters to ModelParameter format
     */
    _mapParameters(apiParams) {
        const typeMap = {
            'number': ModelParameterType.Number,
            'string': ModelParameterType.String,
            'boolean': ModelParameterType.Boolean,
            'array': ModelParameterType.Array,
            'object': ModelParameterType.Object
        };
        return apiParams.map(param => ({
            name: param.name,
            type: typeMap[param.type] || ModelParameterType.String,
            description: param.description || '',
            defaultValue: param.default_value,
            min: param.min,
            max: param.max,
            required: param.required || false,
            allowedValues: param.allowed_values
        }));
    }
    /**
     * List available AI models
     */
    async listModels(filters) {
        // Check cache validity
        const cacheValid = this._cachedModels && (Date.now() - this._cacheTimestamp < AIModelRegistryService_1.CACHE_DURATION_MS);
        if (!cacheValid) {
            await this.refreshModels();
        }
        let models = this._cachedModels ?? [];
        // Apply filters
        if (filters) {
            models = this._applyFilters(models, filters);
        }
        return models;
    }
    /**
     * Apply filters to model list
     */
    _applyFilters(models, filters) {
        let filtered = models;
        // Filter by provider
        if (filters.provider) {
            filtered = filtered.filter(m => m.provider === filters.provider);
        }
        // Filter by capabilities
        if (filters.capabilities && filters.capabilities.length > 0) {
            filtered = filtered.filter(m => filters.capabilities.every(cap => m.capabilities.includes(cap)));
        }
        // Filter by pricing tier
        if (filters.pricingTier) {
            filtered = filtered.filter(m => m.pricing.tier === filters.pricingTier);
        }
        // Filter by availability
        if (filters.availableOnly) {
            filtered = filtered.filter(m => m.available);
        }
        // Filter by search query
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(m => m.name.toLowerCase().includes(searchLower) ||
                m.description.toLowerCase().includes(searchLower));
        }
        // Filter by tags
        if (filters.tags && filters.tags.length > 0) {
            filtered = filtered.filter(m => m.tags && filters.tags.some(tag => m.tags.includes(tag)));
        }
        // Filter by max price
        if (filters.maxPrice !== undefined) {
            filtered = filtered.filter(m => {
                const avgCost = ((m.pricing.inputTokenCost ?? 0) + (m.pricing.outputTokenCost ?? 0)) / 2;
                return avgCost <= filters.maxPrice;
            });
        }
        // Filter by min context length
        if (filters.minContextLength !== undefined) {
            filtered = filtered.filter(m => m.maxContextLength && m.maxContextLength >= filters.minContextLength);
        }
        return filtered;
    }
    /**
     * Get a specific model by ID
     */
    async getModel(modelId) {
        const models = await this.listModels();
        const model = models.find(m => m.id === modelId);
        if (!model) {
            throw new ModelRegistryError(ModelRegistryErrorCode.ModelNotFound, `Model not found: ${modelId}`);
        }
        return model;
    }
    /**
     * Select a model for a project
     */
    async selectModel(modelId, projectId, parameters) {
        // Verify model exists
        await this.getModel(modelId);
        // Store selection
        this._configManager.setSelectedModel(projectId, modelId, parameters);
        console.log(`[AIModelRegistryService] Model ${modelId} selected for project ${projectId}`);
    }
    /**
     * Get selected model for a project
     */
    async getSelectedModel(projectId) {
        const config = this._configManager.getSelectedModel(projectId);
        if (!config) {
            return null;
        }
        try {
            return await this.getModel(config.modelId);
        }
        catch (error) {
            console.error(`[AIModelRegistryService] Failed to get selected model:`, error);
            return null;
        }
    }
    /**
     * Invoke a model
     */
    async invokeModel(request) {
        if (!this.cloudAuthService.isAuthenticated()) {
            throw new ModelRegistryError(ModelRegistryErrorCode.AuthenticationRequired, 'Authentication required to invoke models');
        }
        const accessToken = await this.cloudAuthService.getAccessToken();
        if (!accessToken) {
            throw new ModelRegistryError(ModelRegistryErrorCode.AuthenticationRequired, 'No access token available');
        }
        try {
            const response = await this._makeApiRequest('/api/v1/models/invoke', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model_id: request.modelId,
                    prompt: request.prompt,
                    parameters: request.parameters,
                    max_tokens: request.maxTokens,
                    stop_sequences: request.stopSequences,
                    system_prompt: request.systemPrompt,
                    tools: request.tools,
                    metadata: request.metadata
                }),
            });
            if (!response.ok) {
                await this._handleApiError(response);
            }
            const data = await response.json();
            // Track invocation for usage stats (both cloud and local)
            await this._trackInvocation(request.modelId, data.usage);
            if (this._usageTrackingService && data.usage) {
                await this._usageTrackingService.trackUsage(request.modelId, data.usage.input_tokens ?? 0, data.usage.output_tokens ?? 0);
            }
            return {
                id: data.id ?? this._generateId(),
                modelId: request.modelId,
                text: data.text ?? data.content ?? '',
                finishReason: data.finish_reason ?? 'stop',
                usage: data.usage ? {
                    inputTokens: data.usage.input_tokens ?? 0,
                    outputTokens: data.usage.output_tokens ?? 0,
                    totalTokens: data.usage.total_tokens ?? 0,
                } : undefined,
                toolCalls: data.tool_calls,
                timestamp: Date.now(),
                metadata: data.metadata
            };
        }
        catch (error) {
            if (error instanceof ModelRegistryError) {
                throw error;
            }
            throw new ModelRegistryError(ModelRegistryErrorCode.NetworkError, 'Failed to invoke model', error);
        }
    }
    /**
     * Invoke a model with streaming
     */
    async streamModel(request, onChunk) {
        if (!this.cloudAuthService.isAuthenticated()) {
            throw new ModelRegistryError(ModelRegistryErrorCode.AuthenticationRequired, 'Authentication required to invoke models');
        }
        const accessToken = await this.cloudAuthService.getAccessToken();
        if (!accessToken) {
            throw new ModelRegistryError(ModelRegistryErrorCode.AuthenticationRequired, 'No access token available');
        }
        try {
            const response = await this._makeApiRequest('/api/v1/models/invoke', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model_id: request.modelId,
                    prompt: request.prompt,
                    parameters: request.parameters,
                    max_tokens: request.maxTokens,
                    stop_sequences: request.stopSequences,
                    system_prompt: request.systemPrompt,
                    tools: request.tools,
                    stream: true,
                    metadata: request.metadata
                }),
            });
            if (!response.ok) {
                await this._handleApiError(response);
            }
            // Process streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body available');
            }
            const decoder = new TextDecoder();
            let buffer = '';
            let finalUsage = null;
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    if (line.trim() === '')
                        continue;
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            continue;
                        }
                        try {
                            const chunk = JSON.parse(data);
                            const streamChunk = {
                                id: chunk.id ?? this._generateId(),
                                delta: chunk.delta ?? chunk.text ?? '',
                                done: chunk.done ?? false,
                                finishReason: chunk.finish_reason,
                                usage: chunk.usage,
                            };
                            // Store final usage for tracking
                            if (streamChunk.done && streamChunk.usage) {
                                finalUsage = streamChunk.usage;
                            }
                            onChunk(streamChunk);
                        }
                        catch (parseError) {
                            console.error('[AIModelRegistryService] Failed to parse chunk:', parseError);
                        }
                    }
                }
            }
            // Track invocation after streaming completes (both cloud and local)
            if (finalUsage) {
                await this._trackInvocation(request.modelId, finalUsage);
                if (this._usageTrackingService) {
                    await this._usageTrackingService.trackUsage(request.modelId, finalUsage.input_tokens ?? finalUsage.inputTokens ?? 0, finalUsage.output_tokens ?? finalUsage.outputTokens ?? 0);
                }
            }
        }
        catch (error) {
            if (error instanceof ModelRegistryError) {
                throw error;
            }
            throw new ModelRegistryError(ModelRegistryErrorCode.NetworkError, 'Failed to stream model response', error);
        }
    }
    /**
     * Get usage statistics
     */
    async getUsageStats() {
        if (!this.cloudAuthService.isAuthenticated()) {
            throw new ModelRegistryError(ModelRegistryErrorCode.AuthenticationRequired, 'Authentication required to get usage stats');
        }
        const accessToken = await this.cloudAuthService.getAccessToken();
        if (!accessToken) {
            throw new ModelRegistryError(ModelRegistryErrorCode.AuthenticationRequired, 'No access token available');
        }
        try {
            const response = await this._makeApiRequest('/api/v1/usage/stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                await this._handleApiError(response);
            }
            const data = await response.json();
            return {
                totalCalls: data.total_calls ?? 0,
                totalTokens: data.total_tokens ?? 0,
                inputTokens: data.input_tokens ?? 0,
                outputTokens: data.output_tokens ?? 0,
                totalCost: data.total_cost ?? 0,
                byModel: data.by_model,
                periodStart: data.period_start,
                periodEnd: data.period_end,
            };
        }
        catch (error) {
            if (error instanceof ModelRegistryError) {
                throw error;
            }
            throw new ModelRegistryError(ModelRegistryErrorCode.NetworkError, 'Failed to get usage stats', error);
        }
    }
    /**
     * Get quota information
     */
    async getQuota() {
        if (!this.cloudAuthService.isAuthenticated()) {
            throw new ModelRegistryError(ModelRegistryErrorCode.AuthenticationRequired, 'Authentication required to get quota info');
        }
        const accessToken = await this.cloudAuthService.getAccessToken();
        if (!accessToken) {
            throw new ModelRegistryError(ModelRegistryErrorCode.AuthenticationRequired, 'No access token available');
        }
        try {
            const response = await this._makeApiRequest('/api/v1/usage/quota', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                await this._handleApiError(response);
            }
            const data = await response.json();
            return {
                totalLimit: data.total_limit ?? 0,
                used: data.used ?? 0,
                remaining: data.remaining ?? 0,
                resetDate: data.reset_date,
                exceeded: data.exceeded ?? false,
                byModel: data.by_model,
            };
        }
        catch (error) {
            if (error instanceof ModelRegistryError) {
                throw error;
            }
            throw new ModelRegistryError(ModelRegistryErrorCode.NetworkError, 'Failed to get quota info', error);
        }
    }
    /**
     * Refresh model list from registry
     */
    async refreshModels() {
        try {
            const models = await this._fetchModelsFromAPI();
            this._cachedModels = models;
            this._cacheTimestamp = Date.now();
            this._onDidUpdateModels.fire(this._cachedModels);
            console.log(`[AIModelRegistryService] Models refreshed: ${models.length} models loaded`);
        }
        catch (error) {
            console.error('[AIModelRegistryService] Failed to refresh models:', error);
            throw new ModelRegistryError(ModelRegistryErrorCode.NetworkError, 'Failed to refresh models', error);
        }
    }
    /**
     * Track model invocation for usage statistics
     */
    async _trackInvocation(modelId, usage) {
        if (!usage || !this.cloudAuthService.isAuthenticated()) {
            return;
        }
        const accessToken = await this.cloudAuthService.getAccessToken();
        if (!accessToken) {
            return;
        }
        try {
            await this._makeApiRequest('/api/v1/models/track', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model_id: modelId,
                    input_tokens: usage.input_tokens || usage.inputTokens || 0,
                    output_tokens: usage.output_tokens || usage.outputTokens || 0,
                    total_tokens: usage.total_tokens || usage.totalTokens || 0,
                    timestamp: Date.now()
                }),
            });
        }
        catch (error) {
            console.warn('[AIModelRegistryService] Failed to track invocation:', error);
            // Don't throw - tracking is non-critical
        }
    }
    /**
     * Make API request with retry logic
     */
    async _makeApiRequest(path, options, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const url = `${AIModelRegistryService_1.API_BASE}${path}`;
                const response = await fetch(url, options);
                // Handle rate limiting with exponential backoff
                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get('Retry-After') ?? '1', 10);
                    const delay = Math.min(retryAfter * 1000, 10000); // Max 10 seconds
                    console.warn(`[AIModelRegistryService] Rate limited, retrying after ${delay}ms`);
                    await this._sleep(delay);
                    continue;
                }
                return response;
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries - 1) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = Math.pow(2, attempt) * 1000;
                    console.warn(`[AIModelRegistryService] Request failed, retrying after ${delay}ms`);
                    await this._sleep(delay);
                }
            }
        }
        throw lastError ?? new Error('Request failed after retries');
    }
    /**
     * Handle API error responses
     */
    async _handleApiError(response) {
        const status = response.status;
        let errorMessage = response.statusText;
        try {
            const data = await response.json();
            errorMessage = data.message ?? data.error ?? errorMessage;
        }
        catch {
            // Failed to parse error response
        }
        if (status === 401 || status === 403) {
            throw new ModelRegistryError(ModelRegistryErrorCode.AuthenticationRequired, errorMessage);
        }
        if (status === 404) {
            throw new ModelRegistryError(ModelRegistryErrorCode.ModelNotFound, errorMessage);
        }
        if (status === 429) {
            throw new ModelRegistryError(ModelRegistryErrorCode.RateLimitExceeded, errorMessage);
        }
        if (status === 402 || errorMessage.toLowerCase().includes('quota')) {
            throw new ModelRegistryError(ModelRegistryErrorCode.QuotaExceeded, errorMessage);
        }
        if (status === 400) {
            throw new ModelRegistryError(ModelRegistryErrorCode.InvalidParameters, errorMessage);
        }
        throw new ModelRegistryError(ModelRegistryErrorCode.NetworkError, `HTTP ${status}: ${errorMessage}`);
    }
    /**
     * Sleep utility
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Generate unique ID
     */
    _generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};
AIModelRegistryService = AIModelRegistryService_1 = __decorate([
    __param(0, IAINativeCloudAuthService),
    __param(1, IStorageService),
    __param(2, IUsageTrackingService)
], AIModelRegistryService);
export { AIModelRegistryService };
// Register the service with VS Code dependency injection
registerSingleton(IAIModelRegistryService, AIModelRegistryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlNb2RlbFJlZ2lzdHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL2FpTW9kZWxSZWdpc3RyeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHOzs7R0FHRztBQUVILE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDeEUsT0FBTyxFQVNOLGtCQUFrQixFQUNsQixzQkFBc0IsRUFDdEIsZUFBZSxFQUNmLFdBQVcsRUFDWCxrQkFBa0IsRUFDbEIsTUFBTSwyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLEVBQXVCLGtCQUFrQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFbEU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQTBCLHdCQUF3QixDQUFDLENBQUM7QUE0RTFHOztHQUVHO0FBQ0ksSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVOzthQUc3QixhQUFRLEdBQUcsNkJBQTZCLEFBQWhDLENBQWlDO2FBQ3pDLHNCQUFpQixHQUFHLENBQUMs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