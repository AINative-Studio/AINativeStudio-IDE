/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { PROMPT_HISTORY_STORAGE_KEY } from '../common/storageKeys.js';

/**
 * Metadata associated with a prompt entry
 */
export interface PromptMetadata {
	threadId?: string;
	modelName?: string;
	providerName?: string;
}

/**
 * A single prompt entry in the history
 */
export interface PromptEntry {
	id: string;
	content: string;
	timestamp: number;
	threadId?: string;
	modelName?: string;
	providerName?: string;
}

/**
 * Service interface for managing user prompt history
 */
export interface IPromptHistoryService {
	readonly _serviceBrand: undefined;

	/**
	 * Add a prompt to history
	 * @param content The prompt content
	 * @param metadata Additional metadata about the prompt
	 */
	addPrompt(content: string, metadata: PromptMetadata): Promise<void>;

	/**
	 * Get recent prompts from history
	 * @param limit Optional limit on number of prompts to return (default: all)
	 */
	getHistory(limit?: number): Promise<PromptEntry[]>;

	/**
	 * Search prompts using simple text search
	 * Note: Semantic search via ZeroDB will be implemented by another agent
	 * @param query Search query string
	 */
	searchHistory(query: string): Promise<PromptEntry[]>;

	/**
	 * Clear all prompt history
	 */
	clearHistory(): Promise<void>;

	/**
	 * Event fired when history changes (add, clear, etc.)
	 */
	onDidChangeHistory: Event<void>;
}

export const IPromptHistoryService = createDecorator<IPromptHistoryService>('promptHistoryService');

/**
 * Implementation of the prompt history service
 * Stores user prompts with metadata for history navigation and search
 */
class PromptHistoryService extends Disposable implements IPromptHistoryService {
	_serviceBrand: undefined;

	private readonly _onDidChangeHistory = new Emitter<void>();
	readonly onDidChangeHistory: Event<void> = this._onDidChangeHistory.event;

	private _history: PromptEntry[] = [];

	constructor(
		@IStorageService private readonly _storageService: IStorageService,
	) {
		super();

		// Load history from storage on initialization
		this._loadHistory();
	}

	/**
	 * Load history from storage
	 */
	private _loadHistory(): void {
		const historyStr = this._storageService.get(PROMPT_HISTORY_STORAGE_KEY, StorageScope.APPLICATION);
		if (!historyStr) {
			this._history = [];
			return;
		}

		try {
			const parsed = JSON.parse(historyStr);
			if (Array.isArray(parsed)) {
				this._history = parsed;
			} else {
				this._history = [];
			}
		} catch (error) {
			console.error('Error parsing prompt history from storage:', error);
			this._history = [];
		}
	}

	/**
	 * Save history to storage
	 */
	private _saveHistory(): void {
		const serialized = JSON.stringify(this._history);
		this._storageService.store(
			PROMPT_HISTORY_STORAGE_KEY,
			serialized,
			StorageScope.APPLICATION,
			StorageTarget.USER
		);
	}

	/**
	 * Add a prompt to history
	 */
	async addPrompt(content: string, metadata: PromptMetadata): Promise<void> {
		// Skip empty prompts
		if (!content || content.trim().length === 0) {
			return;
		}

		const entry: PromptEntry = {
			id: generateUuid(),
			content: content.trim(),
			timestamp: Date.now(),
			threadId: metadata.threadId,
			modelName: metadata.modelName,
			providerName: metadata.providerName,
		};

		// Add to beginning of array (most recent first)
		this._history.unshift(entry);

		// Save to storage
		this._saveHistory();

		// Notify listeners
		this._onDidChangeHistory.fire();
	}

	/**
	 * Get recent prompts from history
	 */
	async getHistory(limit?: number): Promise<PromptEntry[]> {
		if (limit !== undefined && limit > 0) {
			return this._history.slice(0, limit);
		}
		return [...this._history];
	}

	/**
	 * Search prompts using simple text search
	 * Currently implements basic case-insensitive text matching
	 * TODO: Semantic search via ZeroDB to be implemented by another agent
	 */
	async searchHistory(query: string): Promise<PromptEntry[]> {
		if (!query || query.trim().length === 0) {
			return [];
		}

		const lowerQuery = query.toLowerCase().trim();
		return this._history.filter(entry =>
			entry.content.toLowerCase().includes(lowerQuery)
		);
	}

	/**
	 * Clear all prompt history
	 */
	async clearHistory(): Promise<void> {
		this._history = [];
		this._saveHistory();
		this._onDidChangeHistory.fire();
	}
}

// Register the service as a singleton with eager instantiation
registerSingleton(IPromptHistoryService, PromptHistoryService, InstantiationType.Eager);
