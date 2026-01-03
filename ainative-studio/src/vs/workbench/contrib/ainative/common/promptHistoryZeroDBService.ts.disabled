/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IAiEmbeddingVectorService } from '../../../services/aiEmbeddingVector/common/aiEmbeddingVectorService.js';
import { ILanguageModelToolsService } from '../../chat/common/languageModelToolsService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Queue } from '../../../../base/common/async.js';

export const IPromptHistoryZeroDBService = createDecorator<IPromptHistoryZeroDBService>('promptHistoryZeroDBService');

/**
 * Prompt entry for vector storage
 */
export interface PromptEntry {
	readonly id: string;
	readonly content: string;
	readonly timestamp: number;
	readonly threadId?: string;
	readonly modelName?: string;
	readonly providerName?: string;
	readonly tokenCount?: number;
}

/**
 * Search result with similarity score
 */
export interface PromptSearchResult extends PromptEntry {
	readonly similarity: number;
}

/**
 * Prompt History ZeroDB Service Interface
 * Provides semantic search capabilities for prompt history using ZeroDB vector storage
 */
export interface IPromptHistoryZeroDBService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when a prompt vector is stored successfully
	 */
	readonly onDidStoreVector: Event<PromptEntry>;

	/**
	 * Event fired when vector storage fails
	 */
	readonly onDidStoreFail: Event<{ entry: PromptEntry; error: Error }>;

	/**
	 * Check if ZeroDB is available and configured
	 */
	isAvailable(): Promise<boolean>;

	/**
	 * Store a prompt as a vector for semantic search
	 * This is a non-blocking operation that queues the storage request
	 * @param promptEntry The prompt entry to store
	 */
	storePromptVector(promptEntry: PromptEntry): Promise<void>;

	/**
	 * Search for similar prompts using semantic similarity
	 * @param query The search query (natural language)
	 * @param limit Maximum number of results (default: 10)
	 * @param threshold Similarity threshold 0-1 (default: 0.7)
	 */
	searchSimilarPrompts(query: string, limit?: number, threshold?: number): Promise<PromptSearchResult[]>;

	/**
	 * Delete all prompt vectors (for testing/cleanup)
	 */
	deleteAllPromptVectors(): Promise<void>;
}

interface ZeroDBVectorMetadata {
	promptId: string;
	content: string;
	timestamp: number;
	threadId?: string;
	modelName?: string;
	providerName?: string;
	tokenCount?: number;
	source: string;
}

interface ZeroDBSearchResult {
	id: string;
	score: number;
	metadata: ZeroDBVectorMetadata;
	document: string;
}

/**
 * Prompt History ZeroDB Service Implementation
 */
export class PromptHistoryZeroDBService extends Disposable implements IPromptHistoryZeroDBService {
	readonly _serviceBrand: undefined;

	private static readonly NAMESPACE = 'prompt-history';
	private static readonly MAX_RETRIES = 3;
	private static readonly RETRY_DELAY_MS = 1000;
	private static readonly __BATCH_SIZE = 10;
	private static readonly __QUEUE_CONCURRENCY = 2;

	private readonly _onDidStoreVector = this._register(new Emitter<PromptEntry>());
	readonly onDidStoreVector = this._onDidStoreVector.event;

	private readonly _onDidStoreFail = this._register(new Emitter<{ entry: PromptEntry; error: Error }>());
	readonly onDidStoreFail = this._onDidStoreFail.event;

	private readonly _storageQueue: Queue<PromptEntry>;
	private _isZeroDBAvailable: boolean | undefined = undefined;
	private _availabilityCheckPromise: Promise<boolean> | undefined = undefined;

	// Simple LRU cache for search results
	private readonly _searchCache = new Map<string, { results: PromptSearchResult[]; timestamp: number }>();
	private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
	private static readonly MAX_CACHE_SIZE = 100;

	constructor(
		@IAiEmbeddingVectorService private readonly _embeddingService: IAiEmbeddingVectorService,
		@ILanguageModelToolsService private readonly _toolsService: ILanguageModelToolsService,
		@ILogService private readonly _logService: ILogService
	) {
		super();

		// Initialize storage queue with limited concurrency
		this._storageQueue = this._register(new Queue());
	}

	/**
	 * Check if ZeroDB is available by attempting to call a simple tool
	 */
	async isAvailable(): Promise<boolean> {
		// Return cached result if available
		if (this._isZeroDBAvailable !== undefined) {
			return this._isZeroDBAvailable;
		}

		// Return existing check if in progress
		if (this._availabilityCheckPromise) {
			return this._availabilityCheckPromise;
		}

		// Start new availability check
		this._availabilityCheckPromise = this._checkAvailability();
		const result = await this._availabilityCheckPromise;
		this._availabilityCheckPromise = undefined;
		return result;
	}

	private async _checkAvailability(): Promise<boolean> {
		try {
			// Check if embedding service is enabled
			if (!this._embeddingService.isEnabled()) {
				this._logService.debug('[PromptHistoryZeroDB] Embedding service not enabled');
				this._isZeroDBAvailable = false;
				return false;
			}

			// Try to get vector stats to check if ZeroDB is available
			const toolId = 'mcp__ainative-zerodb__zerodb_vector_stats';
			const tool = this._toolsService.getTool(toolId);

			if (!tool) {
				this._logService.debug('[PromptHistoryZeroDB] ZeroDB tool not found:', toolId);
				this._isZeroDBAvailable = false;
				return false;
			}

			this._logService.info('[PromptHistoryZeroDB] ZeroDB is available and configured');
			this._isZeroDBAvailable = true;
			return true;
		} catch (error) {
			this._logService.warn('[PromptHistoryZeroDB] ZeroDB availability check failed:', error);
			this._isZeroDBAvailable = false;
			return false;
		}
	}

	/**
	 * Store a prompt vector (non-blocking, queued operation)
	 */
	async storePromptVector(promptEntry: PromptEntry): Promise<void> {
		if (!(await this.isAvailable())) {
			this._logService.debug('[PromptHistoryZeroDB] ZeroDB not available, skipping vector storage');
			return;
		}

		// Queue the storage operation
		this._storageQueue.queue(() => this._executeVectorStorage(promptEntry));
	}

	/**
	 * Execute the actual vector storage with retries
	 */
	private async _executeVectorStorage(promptEntry: PromptEntry): Promise<void> {
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= PromptHistoryZeroDBService.MAX_RETRIES; attempt++) {
			try {
				// Generate embedding
				this._logService.trace(`[PromptHistoryZeroDB] Generating embedding for prompt ${promptEntry.id}`);
				const embedding = await this._embeddingService.getEmbeddingVector(
					promptEntry.content,
					CancellationToken.None
				);

				if (!Array.isArray(embedding) || embedding.length !== 1536) {
					throw new Error(`Invalid embedding dimensions: ${Array.isArray(embedding) ? embedding.length : 'not an array'}`);
				}

				// Store in ZeroDB
				this._logService.trace(`[PromptHistoryZeroDB] Storing vector for prompt ${promptEntry.id}`);
				await this._upsertVector(promptEntry, embedding);

				// Success
				this._onDidStoreVector.fire(promptEntry);
				this._logService.info(`[PromptHistoryZeroDB] Successfully stored vector for prompt ${promptEntry.id}`);

				// Clear search cache as new data is available
				this._searchCache.clear();

				return;
			} catch (error) {
				lastError = error as Error;
				this._logService.warn(
					`[PromptHistoryZeroDB] Storage attempt ${attempt}/${PromptHistoryZeroDBService.MAX_RETRIES} failed:`,
					error
				);

				if (attempt < PromptHistoryZeroDBService.MAX_RETRIES) {
					// Exponential backoff
					const delay = PromptHistoryZeroDBService.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}

		// All retries failed
		const finalError = lastError || new Error('Unknown error during vector storage');
		this._onDidStoreFail.fire({ entry: promptEntry, error: finalError });
		this._logService.error('[PromptHistoryZeroDB] Failed to store vector after all retries:', finalError);
	}

	/**
	 * Call ZeroDB to upsert a vector
	 */
	private async _upsertVector(promptEntry: PromptEntry, embedding: number[]): Promise<void> {
		const metadata: ZeroDBVectorMetadata = {
			promptId: promptEntry.id,
			content: promptEntry.content,
			timestamp: promptEntry.timestamp,
			threadId: promptEntry.threadId,
			modelName: promptEntry.modelName,
			providerName: promptEntry.providerName,
			tokenCount: promptEntry.tokenCount,
			source: 'ainative-ide'
		};

		const toolId = 'mcp__ainative-zerodb__zerodb_upsert_vector';

		try {
			await this._toolsService.invokeTool(
				{
					callId: generateUuid(),
					toolId,
					parameters: {
						vector_embedding: embedding,
						document: promptEntry.content,
						metadata,
						namespace: PromptHistoryZeroDBService.NAMESPACE,
						vector_id: promptEntry.id
					},
					context: undefined
				},
				async () => 0, // countTokensCallback (not used for this operation)
				CancellationToken.None
			);
		} catch (error) {
			throw new Error(`ZeroDB upsert failed: ${error}`);
		}
	}

	/**
	 * Search for similar prompts using semantic similarity
	 */
	async searchSimilarPrompts(
		query: string,
		limit: number = 10,
		threshold: number = 0.7
	): Promise<PromptSearchResult[]> {
		if (!(await this.isAvailable())) {
			this._logService.debug('[PromptHistoryZeroDB] ZeroDB not available, returning empty results');
			return [];
		}

		// Check cache
		const cacheKey = `${query}:${limit}:${threshold}`;
		const cached = this._searchCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < PromptHistoryZeroDBService.CACHE_TTL_MS) {
			this._logService.trace('[PromptHistoryZeroDB] Returning cached search results');
			return cached.results;
		}

		try {
			// Generate query embedding
			this._logService.trace('[PromptHistoryZeroDB] Generating embedding for search query');
			const queryEmbedding = await this._embeddingService.getEmbeddingVector(
				query,
				CancellationToken.None
			);

			if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
				throw new Error(`Invalid query embedding dimensions: ${Array.isArray(queryEmbedding) ? queryEmbedding.length : 'not an array'}`);
			}

			// Search in ZeroDB
			this._logService.trace('[PromptHistoryZeroDB] Searching vectors in ZeroDB');
			const results = await this._searchVectors(queryEmbedding, limit, threshold);

			// Cache results
			this._cacheSearchResults(cacheKey, results);

			this._logService.info(`[PromptHistoryZeroDB] Found ${results.length} similar prompts`);
			return results;
		} catch (error) {
			this._logService.error('[PromptHistoryZeroDB] Search failed:', error);
			return [];
		}
	}

	/**
	 * Call ZeroDB to search for similar vectors
	 */
	private async _searchVectors(
		queryEmbedding: number[],
		limit: number,
		threshold: number
	): Promise<PromptSearchResult[]> {
		const toolId = 'mcp__ainative-zerodb__zerodb_search_vectors';

		try {
			const result = await this._toolsService.invokeTool(
				{
					callId: generateUuid(),
					toolId,
					parameters: {
						query_vector: queryEmbedding,
						limit,
						threshold,
						namespace: PromptHistoryZeroDBService.NAMESPACE
					},
					context: undefined
				},
				async () => 0, // countTokensCallback
				CancellationToken.None
			);

			// Parse results
			return this._parseSearchResults(result);
		} catch (error) {
			throw new Error(`ZeroDB search failed: ${error}`);
		}
	}

	/**
	 * Parse ZeroDB search results into PromptSearchResult array
	 */
	private _parseSearchResults(toolResult: any): PromptSearchResult[] {
		try {
			// The tool result format may vary, adapt as needed
			const results: ZeroDBSearchResult[] = toolResult?.content?.[0]?.value?.results || [];

			return results.map(result => ({
				id: result.metadata.promptId,
				content: result.metadata.content,
				timestamp: result.metadata.timestamp,
				threadId: result.metadata.threadId,
				modelName: result.metadata.modelName,
				providerName: result.metadata.providerName,
				tokenCount: result.metadata.tokenCount,
				similarity: result.score
			}));
		} catch (error) {
			this._logService.error('[PromptHistoryZeroDB] Failed to parse search results:', error);
			return [];
		}
	}

	/**
	 * Cache search results with LRU eviction
	 */
	private _cacheSearchResults(key: string, results: PromptSearchResult[]): void {
		// Evict oldest entries if cache is full
		if (this._searchCache.size >= PromptHistoryZeroDBService.MAX_CACHE_SIZE) {
			const oldestKey = this._searchCache.keys().next().value;
			if (oldestKey) {
				this._searchCache.delete(oldestKey);
			}
		}

		this._searchCache.set(key, {
			results,
			timestamp: Date.now()
		});
	}

	/**
	 * Delete all prompt vectors (for testing/cleanup)
	 */
	async deleteAllPromptVectors(): Promise<void> {
		if (!(await this.isAvailable())) {
			this._logService.warn('[PromptHistoryZeroDB] ZeroDB not available, cannot delete vectors');
			return;
		}

		try {
			// List all vectors in the namespace
			const listToolId = 'mcp__ainative-zerodb__zerodb_list_vectors';
			const listResult = await this._toolsService.invokeTool(
				{
					callId: generateUuid(),
					toolId: listToolId,
					parameters: {
						namespace: PromptHistoryZeroDBService.NAMESPACE,
						limit: 1000 // Get all vectors
					},
					context: undefined
				},
				async () => 0,
				CancellationToken.None
			);

			// Extract vector IDs
			const vectors: any[] = listResult?.content?.[0]?.value?.vectors || [];
			const vectorIds = vectors.map(v => v.id);

			if (vectorIds.length === 0) {
				this._logService.info('[PromptHistoryZeroDB] No vectors to delete');
				return;
			}

			// Delete each vector
			const deleteToolId = 'mcp__ainative-zerodb__zerodb_delete_vector';
			for (const vectorId of vectorIds) {
				await this._toolsService.invokeTool(
					{
						callId: generateUuid(),
						toolId: deleteToolId,
						parameters: {
							vector_id: vectorId,
							namespace: PromptHistoryZeroDBService.NAMESPACE
						},
						context: undefined
					},
					async () => 0,
					CancellationToken.None
				);
			}

			// Clear cache
			this._searchCache.clear();

			this._logService.info(`[PromptHistoryZeroDB] Deleted ${vectorIds.length} vectors`);
		} catch (error) {
			this._logService.error('[PromptHistoryZeroDB] Failed to delete vectors:', error);
			throw error;
		}
	}

	override dispose(): void {
		this._searchCache.clear();
		super.dispose();
	}
}

// Register the service
registerSingleton(IPromptHistoryZeroDBService, PromptHistoryZeroDBService, InstantiationType.Delayed);
