/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * AI Model Configuration Management
 * Handles storing and retrieving model selections and parameters per workspace/project
 */

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { ModelSelectionConfig } from './aiModelRegistryTypes.js';

/**
 * Storage keys for model configuration
 */
const STORAGE_KEYS = {
	MODEL_SELECTION: 'ainative.modelRegistry.modelSelection',
	MODEL_PARAMETERS: 'ainative.modelRegistry.modelParameters',
	DEFAULT_MODEL: 'ainative.modelRegistry.defaultModel',
} as const;

/**
 * Model configuration manager interface
 */
export interface IModelConfigManager {
	/**
	 * Event fired when model selection changes
	 */
	readonly onDidChangeModelSelection: Event<ModelSelectionConfig>;

	/**
	 * Get selected model for a project
	 */
	getSelectedModel(projectId: string): ModelSelectionConfig | null;

	/**
	 * Set selected model for a project
	 */
	setSelectedModel(projectId: string, modelId: string, parameters?: Record<string, any>): void;

	/**
	 * Get custom parameters for a model in a project
	 */
	getModelParameters(projectId: string, modelId: string): Record<string, any> | null;

	/**
	 * Set custom parameters for a model in a project
	 */
	setModelParameters(projectId: string, modelId: string, parameters: Record<string, any>): void;

	/**
	 * Get default model (used when no project-specific selection exists)
	 */
	getDefaultModel(): string | null;

	/**
	 * Set default model
	 */
	setDefaultModel(modelId: string): void;

	/**
	 * Clear model selection for a project
	 */
	clearModelSelection(projectId: string): void;

	/**
	 * Get all model selections
	 */
	getAllModelSelections(): Record<string, ModelSelectionConfig>;
}

/**
 * Model configuration manager implementation
 */
export class ModelConfigManager extends Disposable implements IModelConfigManager {
	private readonly _onDidChangeModelSelection = this._register(new Emitter<ModelSelectionConfig>());
	readonly onDidChangeModelSelection = this._onDidChangeModelSelection.event;

	private _modelSelections: Record<string, ModelSelectionConfig> = {};
	private _modelParameters: Record<string, Record<string, Record<string, any>>> = {};
	private _defaultModel: string | null = null;

	constructor(
		private readonly storageService: IStorageService
	) {
		super();
		this._loadFromStorage();
	}

	/**
	 * Load configuration from storage
	 */
	private _loadFromStorage(): void {
		try {
			// Load model selections
			const selectionsData = this.storageService.get(
				STORAGE_KEYS.MODEL_SELECTION,
				StorageScope.WORKSPACE
			);
			if (selectionsData) {
				this._modelSelections = JSON.parse(selectionsData);
			}

			// Load model parameters
			const parametersData = this.storageService.get(
				STORAGE_KEYS.MODEL_PARAMETERS,
				StorageScope.WORKSPACE
			);
			if (parametersData) {
				this._modelParameters = JSON.parse(parametersData);
			}

			// Load default model
			this._defaultModel = this.storageService.get(
				STORAGE_KEYS.DEFAULT_MODEL,
				StorageScope.APPLICATION
			) ?? null;

		} catch (error) {
			console.error('[ModelConfigManager] Failed to load from storage:', error);
		}
	}

	/**
	 * Save configuration to storage
	 */
	private _saveToStorage(): void {
		try {
			// Save model selections
			this.storageService.store(
				STORAGE_KEYS.MODEL_SELECTION,
				JSON.stringify(this._modelSelections),
				StorageScope.WORKSPACE,
				StorageTarget.USER
			);

			// Save model parameters
			this.storageService.store(
				STORAGE_KEYS.MODEL_PARAMETERS,
				JSON.stringify(this._modelParameters),
				StorageScope.WORKSPACE,
				StorageTarget.USER
			);

			// Save default model
			if (this._defaultModel) {
				this.storageService.store(
					STORAGE_KEYS.DEFAULT_MODEL,
					this._defaultModel,
					StorageScope.APPLICATION,
					StorageTarget.USER
				);
			}
		} catch (error) {
			console.error('[ModelConfigManager] Failed to save to storage:', error);
		}
	}

	/**
	 * Get selected model for a project
	 */
	getSelectedModel(projectId: string): ModelSelectionConfig | null {
		return this._modelSelections[projectId] ?? null;
	}

	/**
	 * Set selected model for a project
	 */
	setSelectedModel(projectId: string, modelId: string, parameters?: Record<string, any>): void {
		const config: ModelSelectionConfig = {
			projectId,
			modelId,
			parameters,
			updatedAt: Date.now()
		};

		this._modelSelections[projectId] = config;
		this._saveToStorage();
		this._onDidChangeModelSelection.fire(config);

		console.log(`[ModelConfigManager] Model selected for project ${projectId}: ${modelId}`);
	}

	/**
	 * Get custom parameters for a model in a project
	 */
	getModelParameters(projectId: string, modelId: string): Record<string, any> | null {
		return this._modelParameters[projectId]?.[modelId] ?? null;
	}

	/**
	 * Set custom parameters for a model in a project
	 */
	setModelParameters(projectId: string, modelId: string, parameters: Record<string, any>): void {
		if (!this._modelParameters[projectId]) {
			this._modelParameters[projectId] = {};
		}

		this._modelParameters[projectId][modelId] = parameters;
		this._saveToStorage();

		console.log(`[ModelConfigManager] Parameters updated for ${modelId} in project ${projectId}`);
	}

	/**
	 * Get default model
	 */
	getDefaultModel(): string | null {
		return this._defaultModel;
	}

	/**
	 * Set default model
	 */
	setDefaultModel(modelId: string): void {
		this._defaultModel = modelId;
		this._saveToStorage();

		console.log(`[ModelConfigManager] Default model set to: ${modelId}`);
	}

	/**
	 * Clear model selection for a project
	 */
	clearModelSelection(projectId: string): void {
		delete this._modelSelections[projectId];
		delete this._modelParameters[projectId];
		this._saveToStorage();

		console.log(`[ModelConfigManager] Model selection cleared for project: ${projectId}`);
	}

	/**
	 * Get all model selections
	 */
	getAllModelSelections(): Record<string, ModelSelectionConfig> {
		return { ...this._modelSelections };
	}
}

/**
 * Default model parameters for common configurations
 */
export const DEFAULT_MODEL_PARAMETERS = {
	/**
	 * Conservative parameters for production use
	 */
	conservative: {
		temperature: 0.3,
		topP: 0.9,
		maxTokens: 4096,
	},

	/**
	 * Balanced parameters for general use
	 */
	balanced: {
		temperature: 0.7,
		topP: 0.95,
		maxTokens: 4096,
	},

	/**
	 * Creative parameters for exploratory use
	 */
	creative: {
		temperature: 1.0,
		topP: 0.98,
		maxTokens: 4096,
	},

	/**
	 * Code generation parameters
	 */
	codeGeneration: {
		temperature: 0.2,
		topP: 0.9,
		maxTokens: 8192,
	},

	/**
	 * Chat/conversation parameters
	 */
	chat: {
		temperature: 0.8,
		topP: 0.95,
		maxTokens: 2048,
	},
} as const;

/**
 * Validate model parameters
 */
export function validateModelParameters(parameters: Record<string, any>): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Validate temperature
	if (parameters.temperature !== undefined) {
		if (typeof parameters.temperature !== 'number') {
			errors.push('temperature must be a number');
		} else if (parameters.temperature < 0 || parameters.temperature > 2) {
			errors.push('temperature must be between 0 and 2');
		}
	}

	// Validate topP
	if (parameters.topP !== undefined) {
		if (typeof parameters.topP !== 'number') {
			errors.push('topP must be a number');
		} else if (parameters.topP < 0 || parameters.topP > 1) {
			errors.push('topP must be between 0 and 1');
		}
	}

	// Validate maxTokens
	if (parameters.maxTokens !== undefined) {
		if (typeof parameters.maxTokens !== 'number') {
			errors.push('maxTokens must be a number');
		} else if (parameters.maxTokens < 1) {
			errors.push('maxTokens must be at least 1');
		}
	}

	// Validate stopSequences
	if (parameters.stopSequences !== undefined) {
		if (!Array.isArray(parameters.stopSequences)) {
			errors.push('stopSequences must be an array');
		} else if (!parameters.stopSequences.every((s: any) => typeof s === 'string')) {
			errors.push('stopSequences must be an array of strings');
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Merge parameters with defaults
 */
export function mergeWithDefaults(
	userParameters: Record<string, any> | undefined,
	defaultParameters: Record<string, any>
): Record<string, any> {
	return {
		...defaultParameters,
		...(userParameters ?? {})
	};
}
