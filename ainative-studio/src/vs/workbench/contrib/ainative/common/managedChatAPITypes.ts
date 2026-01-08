/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Managed Chat API Types
 * Types for AINative Cloud managed chat API with tool calling support
 */

/**
 * Tool definition for managed API
 */
export interface ToolDefinition {
	name: string;
	description: string;
	input_schema: {
		type: 'object';
		properties: Record<string, any>;
		required: string[];
	};
}

/**
 * Chat message for managed API
 */
export interface ManagedChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

/**
 * Managed chat completion request
 */
export interface ManagedChatRequest {
	messages: ManagedChatMessage[];
	tools?: ToolDefinition[];
	preferred_model?: string;
	max_iterations?: number;
	temperature?: number;
	stream?: boolean;
}

/**
 * Usage statistics from managed API
 */
export interface ManagedAPIUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
}

/**
 * Choice in managed API response
 */
export interface ManagedChatChoice {
	index: number;
	message: {
		role: 'assistant';
		content: string;
	};
	finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

/**
 * Managed chat completion response
 */
export interface ManagedChatResponse {
	id: string;
	model: string;
	provider: string;
	created: number;
	choices: ManagedChatChoice[];
	usage: ManagedAPIUsage;
	credits_consumed: number;
	credits_remaining: number;
	plan_tier: string;
}

/**
 * Usage statistics response
 */
export interface UsageStatsResponse {
	period: 'daily' | 'weekly' | 'monthly';
	credits_used: number;
	credits_remaining: number;
	requests_count: number;
	total_tokens: number;
	models_used: Record<string, number>;
}

/**
 * Usage history entry
 */
export interface UsageHistoryEntry {
	date: string;
	requests: number;
	credits_used: number;
	tokens: number;
}

/**
 * Usage history response
 */
export interface UsageHistoryResponse {
	history: UsageHistoryEntry[];
}

/**
 * Model distribution entry
 */
export interface ModelDistributionEntry {
	model: string;
	requests: number;
	percentage: number;
}

/**
 * Model distribution response
 */
export interface ModelDistributionResponse {
	total_requests: number;
	models: ModelDistributionEntry[];
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
export interface CostEstimateResponse {
	model: string;
	estimated_tokens: number;
	estimated_credits: number;
	credits_available: number;
	can_afford: boolean;
}

/**
 * Error response from managed API
 */
export interface ManagedAPIError {
	status: number;
	message: string;
	code?: string;
}

/**
 * Code context for tool selection
 */
export interface CodeContext {
	selectedCode?: string;
	selectedLanguage?: string;
	currentFile?: string;
}
