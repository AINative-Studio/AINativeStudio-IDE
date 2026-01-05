/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * AI Model Configuration Management
 * Handles storing and retrieving model selections and parameters per workspace/project
 */
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Storage keys for model configuration
 */
const STORAGE_KEYS = {
    MODEL_SELECTION: 'ainative.modelRegistry.modelSelection',
    MODEL_PARAMETERS: 'ainative.modelRegistry.modelParameters',
    DEFAULT_MODEL: 'ainative.modelRegistry.defaultModel',
};
/**
 * Model configuration manager implementation
 */
export class ModelConfigManager extends Disposable {
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this._onDidChangeModelSelection = this._register(new Emitter());
        this.onDidChangeModelSelection = this._onDidChangeModelSelection.event;
        this._modelSelections = {};
        this._modelParameters = {};
        this._defaultModel = null;
        this._loadFromStorage();
    }
    /**
     * Load configuration from storage
     */
    _loadFromStorage() {
        try {
            // Load model selections
            const selectionsData = this.storageService.get(STORAGE_KEYS.MODEL_SELECTION, 1 /* StorageScope.WORKSPACE */);
            if (selectionsData) {
                this._modelSelections = JSON.parse(selectionsData);
            }
            // Load model parameters
            const parametersData = this.storageService.get(STORAGE_KEYS.MODEL_PARAMETERS, 1 /* StorageScope.WORKSPACE */);
            if (parametersData) {
                this._modelParameters = JSON.parse(parametersData);
            }
            // Load default model
            this._defaultModel = this.storageService.get(STORAGE_KEYS.DEFAULT_MODEL, -1 /* StorageScope.APPLICATION */) ?? null;
        }
        catch (error) {
            console.error('[ModelConfigManager] Failed to load from storage:', error);
        }
    }
    /**
     * Save configuration to storage
     */
    _saveToStorage() {
        try {
            // Save model selections
            this.storageService.store(STORAGE_KEYS.MODEL_SELECTION, JSON.stringify(this._modelSelections), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
            // Save model parameters
            this.storageService.store(STORAGE_KEYS.MODEL_PARAMETERS, JSON.stringify(this._modelParameters), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
            // Save default model
            if (this._defaultModel) {
                this.storageService.store(STORAGE_KEYS.DEFAULT_MODEL, this._defaultModel, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            }
        }
        catch (error) {
            console.error('[ModelConfigManager] Failed to save to storage:', error);
        }
    }
    /**
     * Get selected model for a project
     */
    getSelectedModel(projectId) {
        return this._modelSelections[projectId] ?? null;
    }
    /**
     * Set selected model for a project
     */
    setSelectedModel(projectId, modelId, parameters) {
        const config = {
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
    getModelParameters(projectId, modelId) {
        return this._modelParameters[projectId]?.[modelId] ?? null;
    }
    /**
     * Set custom parameters for a model in a project
     */
    setModelParameters(projectId, modelId, parameters) {
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
    getDefaultModel() {
        return this._defaultModel;
    }
    /**
     * Set default model
     */
    setDefaultModel(modelId) {
        this._defaultModel = modelId;
        this._saveToStorage();
        console.log(`[ModelConfigManager] Default model set to: ${modelId}`);
    }
    /**
     * Clear model selection for a project
     */
    clearModelSelection(projectId) {
        delete this._modelSelections[projectId];
        delete this._modelParameters[projectId];
        this._saveToStorage();
        console.log(`[ModelConfigManager] Model selection cleared for project: ${projectId}`);
    }
    /**
     * Get all model selections
     */
    getAllModelSelections() {
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
};
/**
 * Validate model parameters
 */
export function validateModelParameters(parameters) {
    const errors = [];
    // Validate temperature
    if (parameters.temperature !== undefined) {
        if (typeof parameters.temperature !== 'number') {
            errors.push('temperature must be a number');
        }
        else if (parameters.temperature < 0 || parameters.temperature > 2) {
            errors.push('temperature must be between 0 and 2');
        }
    }
    // Validate topP
    if (parameters.topP !== undefined) {
        if (typeof parameters.topP !== 'number') {
            errors.push('topP must be a number');
        }
        else if (parameters.topP < 0 || parameters.topP > 1) {
            errors.push('topP must be between 0 and 1');
        }
    }
    // Validate maxTokens
    if (parameters.maxTokens !== undefined) {
        if (typeof parameters.maxTokens !== 'number') {
            errors.push('maxTokens must be a number');
        }
        else if (parameters.maxTokens < 1) {
            errors.push('maxTokens must be at least 1');
        }
    }
    // Validate stopSequences
    if (parameters.stopSequences !== undefined) {
        if (!Array.isArray(parameters.stopSequences)) {
            errors.push('stopSequences must be an array');
        }
        else if (!parameters.stopSequences.every((s) => typeof s === 'string')) {
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
export function mergeWithDefaults(userParameters, defaultParameters) {
    return {
        ...defaultParameters,
        ...(userParameters ?? {})
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlNb2RlbENvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL2FpTW9kZWxDb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7OztHQUdHO0FBRUgsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUlsRTs7R0FFRztBQUNILE1BQU0sWUFBWSxHQUFHO0lBQ3BCLGVBQWUsRUFBRSx1Q0FBdUM7SUFDeEQsZ0JBQWdCLEVBQUUsd0NBQXdDO0lBQzFELGFBQWEsRUFBRSxxQ0FBcUM7Q0FDM0MsQ0FBQztBQW9EWDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBUWpELFlBQ2tCLGNBQStCO1FBRWhELEtBQUssRUFBRSxDQUFDO1FBRlMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBUmhDLCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXdCLENBQUMsQ0FBQztRQUN6Riw4QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDO1FBRW5FLHFCQUFnQixHQUF5QyxFQUFFLENBQUM7UUFDNUQscUJBQWdCLEdBQXdELEVBQUUsQ0FBQztRQUMzRSxrQkFBYSxHQUFrQixJQUFJLENBQUM7UUFNM0MsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZ0JBQWdCO1FBQ3ZCLElBQUksQ0FBQztZQUNKLHdCQUF3QjtZQUN4QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDN0MsWUFBWSxD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