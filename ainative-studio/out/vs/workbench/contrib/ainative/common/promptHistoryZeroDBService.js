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
var PromptHistoryZeroDBService_1;
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IAiEmbeddingVectorService } from '../../../services/aiEmbeddingVector/common/aiEmbeddingVectorService.js';
import { ILanguageModelToolsService } from '../../chat/common/languageModelToolsService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Queue } from '../../../../base/common/async.js';
export const IPromptHistoryZeroDBService = createDecorator('promptHistoryZeroDBService');
/**
 * Prompt History ZeroDB Service Implementation
 */
let PromptHistoryZeroDBService = class PromptHistoryZeroDBService extends Disposable {
    static { PromptHistoryZeroDBService_1 = this; }
    static { this.NAMESPACE = 'prompt-history'; }
    static { this.MAX_RETRIES = 3; }
    static { this.RETRY_DELAY_MS = 1000; }
    static { this.BATCH_SIZE = 10; }
    static { this.QUEUE_CONCURRENCY = 2; }
    static { this.CACHE_TTL_MS = 5 * 60 * 1000; } // 5 minutes
    static { this.MAX_CACHE_SIZE = 100; }
    constructor(_embeddingService, _toolsService, _logService) {
        super();
        this._embeddingService = _embeddingService;
        this._toolsService = _toolsService;
        this._logService = _logService;
        this._onDidStoreVector = this._register(new Emitter());
        this.onDidStoreVector = this._onDidStoreVector.event;
        this._onDidStoreFail = this._register(new Emitter());
        this.onDidStoreFail = this._onDidStoreFail.event;
        this._isZeroDBAvailable = undefined;
        this._availabilityCheckPromise = undefined;
        // Simple LRU cache for search results
        this._searchCache = new Map();
        // Initialize storage queue with limited concurrency
        this._storageQueue = this._register(new Queue());
    }
    /**
     * Check if ZeroDB is available by attempting to call a simple tool
     */
    async isAvailable() {
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
    async _checkAvailability() {
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
        }
        catch (error) {
            this._logService.warn('[PromptHistoryZeroDB] ZeroDB availability check failed:', error);
            this._isZeroDBAvailable = false;
            return false;
        }
    }
    /**
     * Store a prompt vector (non-blocking, queued operation)
     */
    async storePromptVector(promptEntry) {
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
    async _executeVectorStorage(promptEntry) {
        let lastError;
        for (let attempt = 1; attempt <= PromptHistoryZeroDBService_1.MAX_RETRIES; attempt++) {
            try {
                // Generate embedding
                this._logService.trace(`[PromptHistoryZeroDB] Generating embedding for prompt ${promptEntry.id}`);
                const embedding = await this._embeddingService.getEmbeddingVector(promptEntry.content, CancellationToken.None);
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
            }
            catch (error) {
                lastError = error;
                this._logService.warn(`[PromptHistoryZeroDB] Storage attempt ${attempt}/${PromptHistoryZeroDBService_1.MAX_RETRIES} failed:`, error);
                if (attempt < PromptHistoryZeroDBService_1.MAX_RETRIES) {
                    // Exponential backoff
                    const delay = PromptHistoryZeroDBService_1.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
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
    async _upsertVector(promptEntry, embedding) {
        const metadata = {
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
            await this._toolsService.invokeTool({
                callId: generateUuid(),
                toolId,
                parameters: {
                    vector_embedding: embedding,
                    document: promptEntry.content,
                    metadata,
                    namespace: PromptHistoryZeroDBService_1.NAMESPACE,
                    vector_id: promptEntry.id
                },
                context: undefined
            }, async () => 0, // countTokensCallback (not used for this operation)
            CancellationToken.None);
        }
        catch (error) {
            throw new Error(`ZeroDB upsert failed: ${error}`);
        }
    }
    /**
     * Search for similar prompts using semantic similarity
     */
    async searchSimilarPrompts(query, limit = 10, threshold = 0.7) {
        if (!(await this.isAvailable())) {
            this._logService.debug('[PromptHistoryZeroDB] ZeroDB not available, returning empty results');
            return [];
        }
        // Check cache
        const cacheKey = `${query}:${limit}:${threshold}`;
        const cached = this._searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < PromptHistoryZeroDBService_1.CACHE_TTL_MS) {
            this._logService.trace('[PromptHistoryZeroDB] Returning cached search results');
            return cached.results;
        }
        try {
            // Generate query embedding
            this._logService.trace('[PromptHistoryZeroDB] Generating embedding for search query');
            const queryEmbedding = await this._embeddingService.getEmbeddingVector(query, CancellationToken.None);
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
        }
        catch (error) {
            this._logService.error('[PromptHistoryZeroDB] Search failed:', error);
            return [];
        }
    }
    /**
     * Call ZeroDB to search for similar vectors
     */
    async _searchVectors(queryEmbedding, limit, threshold) {
        const toolId = 'mcp__ainative-zerodb__zerodb_search_vectors';
        try {
            const result = await this._toolsService.invokeTool({
                callId: generateUuid(),
                toolId,
                parameters: {
                    query_vector: queryEmbedding,
                    limit,
                    threshold,
                    namespace: PromptHistoryZeroDBService_1.NAMESPACE
                },
                context: undefined
            }, async () => 0, // countTokensCallback
            CancellationToken.None);
            // Parse results
            return this._parseSearchResults(result);
        }
        catch (error) {
            throw new Error(`ZeroDB search failed: ${error}`);
        }
    }
    /**
     * Parse ZeroDB search results into PromptSearchResult array
     */
    _parseSearchResults(toolResult) {
        try {
            // The tool result format may vary, adapt as needed
            const results = toolResult?.content?.[0]?.value?.results || [];
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
        }
        catch (error) {
            this._logService.error('[PromptHistoryZeroDB] Failed to parse search results:', error);
            return [];
        }
    }
    /**
     * Cache search results with LRU eviction
     */
    _cacheSearchResults(key, results) {
        // Evict oldest entries if cache is full
        if (this._searchCache.size >= PromptHistoryZeroDBService_1.MAX_CACHE_SIZE) {
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
    async deleteAllPromptVectors() {
        if (!(await this.isAvailable())) {
            this._logService.warn('[PromptHistoryZeroDB] ZeroDB not available, cannot delete vectors');
            return;
        }
        try {
            // List all vectors in the namespace
            const listToolId = 'mcp__ainative-zerodb__zerodb_list_vectors';
            const listResult = await this._toolsService.invokeTool({
                callId: generateUuid(),
                toolId: listToolId,
                parameters: {
                    namespace: PromptHistoryZeroDBService_1.NAMESPACE,
                    limit: 1000 // Get all vectors
                },
                context: undefined
            }, async () => 0, CancellationToken.None);
            // Extract vector IDs
            const vectors = listResult?.content?.[0]?.value?.vectors || [];
            const vectorIds = vectors.map(v => v.id);
            if (vectorIds.length === 0) {
                this._logService.info('[PromptHistoryZeroDB] No vectors to delete');
                return;
            }
            // Delete each vector
            const deleteToolId = 'mcp__ainative-zerodb__zerodb_delete_vector';
            for (const vectorId of vectorIds) {
                await this._toolsService.invokeTool({
                    callId: generateUuid(),
                    toolId: deleteToolId,
                    parameters: {
                        vector_id: vectorId,
                        namespace: PromptHistoryZeroDBService_1.NAMESPACE
                    },
                    context: undefined
                }, async () => 0, CancellationToken.None);
            }
            // Clear cache
            this._searchCache.clear();
            this._logService.info(`[PromptHistoryZeroDB] Deleted ${vectorIds.length} vectors`);
        }
        catch (error) {
            this._logService.error('[PromptHistoryZeroDB] Failed to delete vectors:', error);
            throw error;
        }
    }
    dispose() {
        this._searchCache.clear();
        super.dispose();
    }
};
PromptHistoryZeroDBService = PromptHistoryZeroDBService_1 = __decorate([
    __param(0, IAiEmbeddingVectorService),
    __param(1, ILanguageModelToolsService),
    __param(2, ILogService)
], PromptHistoryZeroDBService);
export { PromptHistoryZeroDBService };
// Register the service
registerSingleton(IPromptHistoryZeroDBService, PromptHistoryZeroDBService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGlzdG9yeVplcm9EQlNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9wcm9tcHRIaXN0b3J5WmVyb0RCU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQ25ILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FBOEIsNEJBQTRCLENBQUMsQ0FBQztBQW1GdEg7O0dBRUc7QUFDSSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7O2FBR2pDLGNBQVMsR0FBRyxnQkFBZ0IsQUFBbkIsQ0FBb0I7YUFDN0IsZ0JBQVcsR0FBRyxDQUFDLEFBQUosQ0FBSzthQUNoQixtQkFBYyxH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