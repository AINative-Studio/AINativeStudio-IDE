/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * AI Model Registry Service
 * Integrates with AINative's AI Model Registry for browsing, selecting, and invoking AI models
 */

import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes.js';
import {
	AIModel,
	ModelFilters,
	ModelInvocationRequest,
	ModelResponse,
	ModelStreamChunk,
	UsageStats,
	QuotaInfo,
	ModelSelectionConfig,
	ModelRegistryError,
	ModelRegistryErrorCode,
	ModelCapability,
	PricingTier,
	ModelParameterType,
	IAIModelRegistryService
} from './aiModelRegistryTypes.js';
import { IModelConfigManager, ModelConfigManager } from './aiModelConfig.js';
import { IUsageTrackingService } from './usageTrackingTypes.js';

// Re-export for backward compatibility
export { IAIModelRegistryService } from './aiModelRegistryTypes.js';

/**
 * AI Model Registry Service Implementation
 */
export class AIModelRegistryService extends Disposable implements IAIModelRegistryService {
	readonly _serviceBrand: undefined;

	private static readonly API_BASE = 'https://api.ainative.studio';
	private static readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

	private readonly _onDidUpdateModels = this._register(new Emitter<AIModel[]>());
	readonly onDidUpdateModels = this._onDidUpdateModels.event;

	private readonly _onDidChangeModelSelection = this._register(new Emitter<ModelSelectionConfig>());
	readonly onDidChangeModelSelection = this._onDidChangeModelSelection.event;

	private _cachedModels: AIModel[] | null = null;
	private _cacheTimestamp: number = 0;
	private _configManager: IModelConfigManager;
	private _usageTrackingService: IUsageTrackingService | null = null;
	private _usageTrackingResolved = false;

	constructor(
		@IAINativeCloudAuthService private readonly cloudAuthService: IAINativeCloudAuthService,
		@IStorageService storageService: IStorageService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		super();

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
	 * Lazily resolve IUsageTrackingService to avoid circular DI dependency.
	 * usageTrackingService depends on aiModelRegistryService, so we cannot
	 * inject it directly in the constructor.
	 */
	private _getUsageTrackingService(): IUsageTrackingService | null {
		if (!this._usageTrackingResolved) {
			this._usageTrackingResolved = true;
			try {
				this._usageTrackingService = this._instantiationService.invokeFunction(
					accessor => accessor.get(IUsageTrackingService)
				);
			} catch {
				// Service not yet available
			}
		}
		return this._usageTrackingService;
	}

	/**
	 * Fetch models from API
	 */
	private async _fetchModelsFromAPI(): Promise<AIModel[]> {
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

		} catch (error) {
			console.error('[AIModelRegistryService] Failed to fetch models from API:', error);
			// Return empty array on failure - caller can decide how to handle
			return [];
		}
	}

	/**
	 * Map API model format to internal AIModel format
	 */
	private _mapAPIModelsToAIModels(apiModels: any[]): AIModel[] {
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
	private _mapCapabilities(apiCapabilities: string[]): ModelCapability[] {
		const capabilityMap: Record<string, ModelCapability> = {
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
	private _mapPricingTier(tier?: string): PricingTier {
		const tierMap: Record<string, PricingTier> = {
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
	private _mapParameters(apiParams: any[]): import('./aiModelRegistryTypes.js').ModelParameter[] {
		const typeMap: Record<string, ModelParameterType> = {
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
	async listModels(filters?: ModelFilters): Promise<AIModel[]> {
		// Check cache validity
		const cacheValid = this._cachedModels && (Date.now() - this._cacheTimestamp < AIModelRegistryService.CACHE_DURATION_MS);

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
	private _applyFilters(models: AIModel[], filters: ModelFilters): AIModel[] {
		let filtered = models;

		// Filter by provider
		if (filters.provider) {
			filtered = filtered.filter(m => m.provider === filters.provider);
		}

		// Filter by capabilities
		if (filters.capabilities && filters.capabilities.length > 0) {
			filtered = filtered.filter(m =>
				filters.capabilities!.every(cap => m.capabilities.includes(cap))
			);
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
			filtered = filtered.filter(m =>
				m.name.toLowerCase().includes(searchLower) ||
				m.description.toLowerCase().includes(searchLower)
			);
		}

		// Filter by tags
		if (filters.tags && filters.tags.length > 0) {
			filtered = filtered.filter(m =>
				m.tags && filters.tags!.some(tag => m.tags!.includes(tag))
			);
		}

		// Filter by max price
		if (filters.maxPrice !== undefined) {
			filtered = filtered.filter(m => {
				const avgCost = ((m.pricing.inputTokenCost ?? 0) + (m.pricing.outputTokenCost ?? 0)) / 2;
				return avgCost <= filters.maxPrice!;
			});
		}

		// Filter by min context length
		if (filters.minContextLength !== undefined) {
			filtered = filtered.filter(m =>
				m.maxContextLength && m.maxContextLength >= filters.minContextLength!
			);
		}

		return filtered;
	}

	/**
	 * Get a specific model by ID
	 */
	async getModel(modelId: string): Promise<AIModel> {
		const models = await this.listModels();
		const model = models.find(m => m.id === modelId);

		if (!model) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.ModelNotFound,
				`Model not found: ${modelId}`
			);
		}

		return model;
	}

	/**
	 * Select a model for a project
	 */
	async selectModel(modelId: string, projectId: string, parameters?: Record<string, any>): Promise<void> {
		// Verify model exists
		await this.getModel(modelId);

		// Store selection
		this._configManager.setSelectedModel(projectId, modelId, parameters);

		console.log(`[AIModelRegistryService] Model ${modelId} selected for project ${projectId}`);
	}

	/**
	 * Get selected model for a project
	 */
	async getSelectedModel(projectId: string): Promise<AIModel | null> {
		const config = this._configManager.getSelectedModel(projectId);

		if (!config) {
			return null;
		}

		try {
			return await this.getModel(config.modelId);
		} catch (error) {
			console.error(`[AIModelRegistryService] Failed to get selected model:`, error);
			return null;
		}
	}

	/**
	 * Invoke a model
	 */
	async invokeModel(request: ModelInvocationRequest): Promise<ModelResponse> {
		if (!this.cloudAuthService.isAuthenticated()) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.AuthenticationRequired,
				'Authentication required to invoke models'
			);
		}

		const accessToken = await this.cloudAuthService.getAccessToken();
		if (!accessToken) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.AuthenticationRequired,
				'No access token available'
			);
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
			const usageService = this._getUsageTrackingService();
			if (usageService && data.usage) {
				await usageService.trackUsage(
					request.modelId,
					data.usage.input_tokens ?? 0,
					data.usage.output_tokens ?? 0
				);
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

		} catch (error) {
			if (error instanceof ModelRegistryError) {
				throw error;
			}

			throw new ModelRegistryError(
				ModelRegistryErrorCode.NetworkError,
				'Failed to invoke model',
				error as Error
			);
		}
	}

	/**
	 * Invoke a model with streaming
	 */
	async streamModel(request: ModelInvocationRequest, onChunk: (chunk: ModelStreamChunk) => void): Promise<void> {
		if (!this.cloudAuthService.isAuthenticated()) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.AuthenticationRequired,
				'Authentication required to invoke models'
			);
		}

		const accessToken = await this.cloudAuthService.getAccessToken();
		if (!accessToken) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.AuthenticationRequired,
				'No access token available'
			);
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
			let finalUsage: any = null;

			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (line.trim() === '') continue;
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') {
							continue;
						}

						try {
							const chunk = JSON.parse(data);
							const streamChunk: ModelStreamChunk = {
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
						} catch (parseError) {
							console.error('[AIModelRegistryService] Failed to parse chunk:', parseError);
						}
					}
				}
			}

			// Track invocation after streaming completes (both cloud and local)
			if (finalUsage) {
				await this._trackInvocation(request.modelId, finalUsage);
				const usageService = this._getUsageTrackingService();
				if (usageService) {
					await usageService.trackUsage(
						request.modelId,
						finalUsage.input_tokens ?? finalUsage.inputTokens ?? 0,
						finalUsage.output_tokens ?? finalUsage.outputTokens ?? 0
					);
				}
			}

		} catch (error) {
			if (error instanceof ModelRegistryError) {
				throw error;
			}

			throw new ModelRegistryError(
				ModelRegistryErrorCode.NetworkError,
				'Failed to stream model response',
				error as Error
			);
		}
	}

	/**
	 * Get usage statistics
	 */
	async getUsageStats(): Promise<UsageStats> {
		if (!this.cloudAuthService.isAuthenticated()) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.AuthenticationRequired,
				'Authentication required to get usage stats'
			);
		}

		const accessToken = await this.cloudAuthService.getAccessToken();
		if (!accessToken) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.AuthenticationRequired,
				'No access token available'
			);
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

		} catch (error) {
			if (error instanceof ModelRegistryError) {
				throw error;
			}

			throw new ModelRegistryError(
				ModelRegistryErrorCode.NetworkError,
				'Failed to get usage stats',
				error as Error
			);
		}
	}

	/**
	 * Get quota information
	 */
	async getQuota(): Promise<QuotaInfo> {
		if (!this.cloudAuthService.isAuthenticated()) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.AuthenticationRequired,
				'Authentication required to get quota info'
			);
		}

		const accessToken = await this.cloudAuthService.getAccessToken();
		if (!accessToken) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.AuthenticationRequired,
				'No access token available'
			);
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

		} catch (error) {
			if (error instanceof ModelRegistryError) {
				throw error;
			}

			throw new ModelRegistryError(
				ModelRegistryErrorCode.NetworkError,
				'Failed to get quota info',
				error as Error
			);
		}
	}

	/**
	 * Refresh model list from registry
	 */
	async refreshModels(): Promise<void> {
		try {
			const models = await this._fetchModelsFromAPI();
			this._cachedModels = models;
			this._cacheTimestamp = Date.now();
			this._onDidUpdateModels.fire(this._cachedModels);

			console.log(`[AIModelRegistryService] Models refreshed: ${models.length} models loaded`);

		} catch (error) {
			console.error('[AIModelRegistryService] Failed to refresh models:', error);
			throw new ModelRegistryError(
				ModelRegistryErrorCode.NetworkError,
				'Failed to refresh models',
				error as Error
			);
		}
	}

	/**
	 * Track model invocation for usage statistics
	 */
	private async _trackInvocation(modelId: string, usage?: any): Promise<void> {
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
		} catch (error) {
			console.warn('[AIModelRegistryService] Failed to track invocation:', error);
			// Don't throw - tracking is non-critical
		}
	}

	/**
	 * Make API request with retry logic
	 */
	private async _makeApiRequest(
		path: string,
		options: RequestInit,
		maxRetries: number = 3
	): Promise<Response> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const url = `${AIModelRegistryService.API_BASE}${path}`;
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

			} catch (error) {
				lastError = error as Error;
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
	private async _handleApiError(response: Response): Promise<never> {
		const status = response.status;
		let errorMessage = response.statusText;

		try {
			const data = await response.json();
			errorMessage = data.message ?? data.error ?? errorMessage;
		} catch {
			// Failed to parse error response
		}

		if (status === 401 || status === 403) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.AuthenticationRequired,
				errorMessage
			);
		}

		if (status === 404) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.ModelNotFound,
				errorMessage
			);
		}

		if (status === 429) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.RateLimitExceeded,
				errorMessage
			);
		}

		if (status === 402 || errorMessage.toLowerCase().includes('quota')) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.QuotaExceeded,
				errorMessage
			);
		}

		if (status === 400) {
			throw new ModelRegistryError(
				ModelRegistryErrorCode.InvalidParameters,
				errorMessage
			);
		}

		throw new ModelRegistryError(
			ModelRegistryErrorCode.NetworkError,
			`HTTP ${status}: ${errorMessage}`
		);
	}

	/**
	 * Sleep utility
	 */
	private _sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Generate unique ID
	 */
	private _generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}

// Register the service with VS Code dependency injection
registerSingleton(IAIModelRegistryService, AIModelRegistryService, InstantiationType.Delayed);
