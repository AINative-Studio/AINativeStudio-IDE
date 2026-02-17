/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * AI Model Registry Types
 * Defines interfaces for AI model management, selection, and invocation
 */

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

/**
 * Pricing tiers for AI models
 */
export enum PricingTier {
	Free = 'free',
	PayAsYouGo = 'pay_as_you_go',
	Subscription = 'subscription',
	Enterprise = 'enterprise'
}

/**
 * Model capability types
 */
export enum ModelCapability {
	TextGeneration = 'text_generation',
	CodeGeneration = 'code_generation',
	CodeCompletion = 'code_completion',
	Chat = 'chat',
	FunctionCalling = 'function_calling',
	Vision = 'vision',
	Embedding = 'embedding',
	Streaming = 'streaming',
	ToolUse = 'tool_use'
}

/**
 * Model parameter types
 */
export enum ModelParameterType {
	Number = 'number',
	String = 'string',
	Boolean = 'boolean',
	Array = 'array',
	Object = 'object'
}

/**
 * Model invocation status
 */
export enum InvocationStatus {
	Pending = 'pending',
	Running = 'running',
	Completed = 'completed',
	Failed = 'failed',
	Cancelled = 'cancelled'
}

/**
 * Pricing information for a model
 */
export interface PricingInfo {
	/**
	 * Pricing tier
	 */
	readonly tier: PricingTier;

	/**
	 * Cost per 1K input tokens (USD)
	 */
	readonly inputTokenCost?: number;

	/**
	 * Cost per 1K output tokens (USD)
	 */
	readonly outputTokenCost?: number;

	/**
	 * Monthly subscription cost (USD)
	 */
	readonly monthlySubscriptionCost?: number;

	/**
	 * Currency code (default: USD)
	 */
	readonly currency?: string;
}

/**
 * Model parameter definition
 */
export interface ModelParameter {
	/**
	 * Parameter name
	 */
	readonly name: string;

	/**
	 * Parameter type
	 */
	readonly type: ModelParameterType;

	/**
	 * Human-readable description
	 */
	readonly description: string;

	/**
	 * Default value
	 */
	readonly defaultValue?: any;

	/**
	 * Minimum value (for numbers)
	 */
	readonly min?: number;

	/**
	 * Maximum value (for numbers)
	 */
	readonly max?: number;

	/**
	 * Whether parameter is required
	 */
	readonly required?: boolean;

	/**
	 * Allowed values (for enums)
	 */
	readonly allowedValues?: any[];
}

/**
 * AI Model definition
 */
export interface AIModel {
	/**
	 * Unique model identifier
	 */
	readonly id: string;

	/**
	 * Human-readable model name
	 */
	readonly name: string;

	/**
	 * Detailed model description
	 */
	readonly description: string;

	/**
	 * Model provider (e.g., "anthropic", "openai", "ainative")
	 */
	readonly provider: string;

	/**
	 * Model version
	 */
	readonly version?: string;

	/**
	 * Model capabilities
	 */
	readonly capabilities: ModelCapability[];

	/**
	 * Pricing information
	 */
	readonly pricing: PricingInfo;

	/**
	 * Configurable parameters
	 */
	readonly parameters: ModelParameter[];

	/**
	 * Maximum context length (tokens)
	 */
	readonly maxContextLength?: number;

	/**
	 * Maximum output length (tokens)
	 */
	readonly maxOutputLength?: number;

	/**
	 * Model creation/deployment date
	 */
	readonly createdAt?: string;

	/**
	 * Model last updated date
	 */
	readonly updatedAt?: string;

	/**
	 * Whether model is currently available
	 */
	readonly available?: boolean;

	/**
	 * Tags for categorization
	 */
	readonly tags?: string[];

	/**
	 * Model metadata
	 */
	readonly metadata?: Record<string, any>;
}

/**
 * Model filters for listing
 */
export interface ModelFilters {
	/**
	 * Filter by provider
	 */
	readonly provider?: string;

	/**
	 * Filter by capabilities
	 */
	readonly capabilities?: ModelCapability[];

	/**
	 * Filter by pricing tier
	 */
	readonly pricingTier?: PricingTier;

	/**
	 * Filter by availability
	 */
	readonly availableOnly?: boolean;

	/**
	 * Search query (matches name/description)
	 */
	readonly search?: string;

	/**
	 * Filter by tags
	 */
	readonly tags?: string[];

	/**
	 * Maximum price per 1K tokens
	 */
	readonly maxPrice?: number;

	/**
	 * Minimum context length
	 */
	readonly minContextLength?: number;
}

/**
 * Model invocation request
 */
export interface ModelInvocationRequest {
	/**
	 * Model ID to invoke
	 */
	readonly modelId: string;

	/**
	 * Prompt or messages
	 */
	readonly prompt: string | any[];

	/**
	 * Model parameters (temperature, top_p, etc.)
	 */
	readonly parameters?: Record<string, any>;

	/**
	 * Enable streaming responses
	 */
	readonly stream?: boolean;

	/**
	 * Maximum tokens to generate
	 */
	readonly maxTokens?: number;

	/**
	 * Stop sequences
	 */
	readonly stopSequences?: string[];

	/**
	 * System prompt
	 */
	readonly systemPrompt?: string;

	/**
	 * Tools/functions available to the model
	 */
	readonly tools?: any[];

	/**
	 * Additional metadata for the request
	 */
	readonly metadata?: Record<string, any>;
}

/**
 * Model invocation response
 */
export interface ModelResponse {
	/**
	 * Invocation ID
	 */
	readonly id: string;

	/**
	 * Model ID used
	 */
	readonly modelId: string;

	/**
	 * Generated text
	 */
	readonly text: string;

	/**
	 * Finish reason
	 */
	readonly finishReason?: 'stop' | 'length' | 'tool_use' | 'error';

	/**
	 * Usage statistics
	 */
	readonly usage?: {
		readonly inputTokens: number;
		readonly outputTokens: number;
		readonly totalTokens: number;
	};

	/**
	 * Tool calls made by the model
	 */
	readonly toolCalls?: any[];

	/**
	 * Response timestamp
	 */
	readonly timestamp?: number;

	/**
	 * Response metadata
	 */
	readonly metadata?: Record<string, any>;
}

/**
 * Streaming chunk from model
 */
export interface ModelStreamChunk {
	/**
	 * Chunk ID
	 */
	readonly id: string;

	/**
	 * Text delta
	 */
	readonly delta: string;

	/**
	 * Whether this is the final chunk
	 */
	readonly done: boolean;

	/**
	 * Finish reason (only in final chunk)
	 */
	readonly finishReason?: 'stop' | 'length' | 'tool_use' | 'error';

	/**
	 * Usage statistics (only in final chunk)
	 */
	readonly usage?: {
		readonly inputTokens: number;
		readonly outputTokens: number;
		readonly totalTokens: number;
	};
}

/**
 * Usage statistics for user/project
 */
export interface UsageStats {
	/**
	 * Total API calls made
	 */
	readonly totalCalls: number;

	/**
	 * Total tokens consumed
	 */
	readonly totalTokens: number;

	/**
	 * Input tokens consumed
	 */
	readonly inputTokens: number;

	/**
	 * Output tokens consumed
	 */
	readonly outputTokens: number;

	/**
	 * Total cost (USD)
	 */
	readonly totalCost: number;

	/**
	 * Usage breakdown by model
	 */
	readonly byModel?: Record<string, {
		readonly calls: number;
		readonly tokens: number;
		readonly cost: number;
	}>;

	/**
	 * Usage period start date
	 */
	readonly periodStart?: string;

	/**
	 * Usage period end date
	 */
	readonly periodEnd?: string;
}

/**
 * Quota information for user/project
 */
export interface QuotaInfo {
	/**
	 * Total quota limit (tokens)
	 */
	readonly totalLimit: number;

	/**
	 * Tokens used
	 */
	readonly used: number;

	/**
	 * Tokens remaining
	 */
	readonly remaining: number;

	/**
	 * Quota reset date
	 */
	readonly resetDate?: string;

	/**
	 * Whether quota is exceeded
	 */
	readonly exceeded: boolean;

	/**
	 * Quota limits by model
	 */
	readonly byModel?: Record<string, {
		readonly limit: number;
		readonly used: number;
		readonly remaining: number;
	}>;
}

/**
 * Model selection configuration for a project
 */
export interface ModelSelectionConfig {
	/**
	 * Project ID
	 */
	readonly projectId: string;

	/**
	 * Selected model ID
	 */
	readonly modelId: string;

	/**
	 * Custom parameters for this model
	 */
	readonly parameters?: Record<string, any>;

	/**
	 * Last updated timestamp
	 */
	readonly updatedAt?: number;
}

/**
 * Error codes for model registry operations
 */
export enum ModelRegistryErrorCode {
	ModelNotFound = 'MODEL_NOT_FOUND',
	QuotaExceeded = 'QUOTA_EXCEEDED',
	RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
	InvalidParameters = 'INVALID_PARAMETERS',
	AuthenticationRequired = 'AUTHENTICATION_REQUIRED',
	NetworkError = 'NETWORK_ERROR',
	UnknownError = 'UNKNOWN_ERROR'
}

/**
 * Model registry error
 */
export class ModelRegistryError extends Error {
	constructor(
		public readonly code: ModelRegistryErrorCode,
		message: string,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'ModelRegistryError';
	}
}

/**
 * Service interface for AI Model Registry
 */
export const IAIModelRegistryService = createDecorator<IAIModelRegistryService>('aiModelRegistryService');

export interface IAIModelRegistryService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when model list is updated
	 */
	readonly onDidUpdateModels: Event<AIModel[]>;

	/**
	 * Event fired when model selection changes
	 */
	readonly onDidChangeModelSelection: Event<ModelSelectionConfig>;

	/**
	 * List available AI models
	 * @param filters Optional filters to apply
	 * @returns List of matching models
	 */
	listModels(filters?: ModelFilters): Promise<AIModel[]>;

	/**
	 * Get a specific model by ID
	 * @param modelId Model identifier
	 * @returns Model details
	 */
	getModel(modelId: string): Promise<AIModel>;

	/**
	 * Select a model for a project
	 * @param modelId Model identifier
	 * @param projectId Project identifier
	 * @param parameters Optional custom parameters
	 */
	selectModel(modelId: string, projectId: string, parameters?: Record<string, any>): Promise<void>;

	/**
	 * Get selected model for a project
	 * @param projectId Project identifier
	 * @returns Selected model or null
	 */
	getSelectedModel(projectId: string): Promise<AIModel | null>;

	/**
	 * Invoke a model
	 * @param request Invocation request
	 * @returns Model response
	 */
	invokeModel(request: ModelInvocationRequest): Promise<ModelResponse>;

	/**
	 * Invoke a model with streaming
	 * @param request Invocation request
	 * @param onChunk Callback for each chunk
	 */
	streamModel(request: ModelInvocationRequest, onChunk: (chunk: ModelStreamChunk) => void): Promise<void>;

	/**
	 * Get usage statistics
	 * @returns Usage stats for current user
	 */
	getUsageStats(): Promise<UsageStats>;

	/**
	 * Get quota information
	 * @returns Quota info for current user
	 */
	getQuota(): Promise<QuotaInfo>;

	/**
	 * Refresh model list from registry
	 */
	refreshModels(): Promise<void>;
}
