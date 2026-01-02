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
    static { this.__BATCH_SIZE = 10; }
    static { this.__QUEUE_CONCURRENCY = 2; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGlzdG9yeVplcm9EQlNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9wcm9tcHRIaXN0b3J5WmVyb0RCU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQ25ILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FBOEIsNEJBQTRCLENBQUMsQ0FBQztBQW1GdEg7O0dBRUc7QUFDSSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7O2FBR2pDLGNBQVMsR0FBRyxnQkFBZ0IsQUFBbkIsQ0FBb0I7YUFDN0IsZ0JBQVcsR0FBRyxDQUFDLEFBQUosQ0FBSzthQUNoQixtQkFBYyxHQUFHLElBQUksQUFBUCxDQUFRO2FBQ3RCLGlCQUFZLEdBQUcsRUFBRSxBQUFMLENBQU07YUFDbEIsd0JBQW1CLEdBQUcsQ0FBQyxBQUFKLENBQUs7YUFjeEIsaUJBQVksR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQUFBaEIsQ0FBaUIsR0FBQyxZQUFZO2FBQzFDLG1CQUFjLEdBQUcsR0FBRyxBQUFOLENBQU87SUFFN0MsWUFDNEIsaUJBQTZELEVBQzVELGFBQTBELEVBQ3pFLFdBQXlDO1FBRXRELEtBQUssRUFBRSxDQUFDO1FBSm9DLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBMkI7UUFDM0Msa0JBQWEsR0FBYixhQUFhLENBQTRCO1FBQ3hELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBbEJ0QyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQztRQUN2RSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1FBRXhDLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBd0MsQ0FBQyxDQUFDO1FBQzlGLG1CQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7UUFHN0MsdUJBQWtCLEdBQXdCLFNBQVMsQ0FBQztRQUNwRCw4QkFBeUIsR0FBaUMsU0FBUyxDQUFDO1FBRTVFLHNDQUFzQztRQUNyQixpQkFBWSxHQUFHLElBQUksR0FBRyxFQUFnRSxDQUFDO1FBV3ZHLG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXO1FBQ2hCLG9DQUFvQztRQUNwQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztRQUNoQyxDQUFDO1FBRUQsdUNBQXVDO1FBQ3ZDLElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDcEMsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUM7UUFDdkMsQ0FBQztRQUVELCtCQUErQjtRQUMvQixJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDM0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUM7UUFDcEQsSUFBSSxDQUFDLHlCQUF5QixHQUFHLFNBQVMsQ0FBQztRQUMzQyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCO1FBQy9CLElBQUksQ0FBQztZQUNKLHdDQUF3QztZQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7Z0JBQzlFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7Z0JBQ2hDLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUVELDBEQUEwRDtZQUMxRCxNQUFNLE1BQU0sR0FBRywyQ0FBMkMsQ0FBQztZQUMzRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVoRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsOENBQThDLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQy9FLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7Z0JBQ2hDLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUVELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLDBEQUEwRCxDQUFDLENBQUM7WUFDbEYsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztZQUMvQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3hGLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7WUFDaEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFdBQXdCO1FBQy9DLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO1lBQzlGLE9BQU87UUFDUixDQUFDO1FBRUQsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxXQUF3QjtRQUMzRCxJQUFJLFNBQTRCLENBQUM7UUFFakMsS0FBSyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsT0FBTyxJQUFJLDRCQUEwQixDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3BGLElBQUksQ0FBQztnQkFDSixxQkFBcUI7Z0JBQ3JCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHlEQUF5RCxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbEcsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQ2hFLFdBQVcsQ0FBQyxPQUFPLEVBQ25CLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQztnQkFFRixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO29CQUM1RCxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO2dCQUNsSCxDQUFDO2dCQUVELGtCQUFrQjtnQkFDbEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsbURBQW1ELFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1RixNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUVqRCxVQUFVO2dCQUNWLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLCtEQUErRCxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFFdkcsOENBQThDO2dCQUM5QyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUUxQixPQUFPO1lBQ1IsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLFNBQVMsR0FBRyxLQUFjLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUNwQix5Q0FBeUMsT0FBTyxJQUFJLDRCQUEwQixDQUFDLFdBQVcsVUFBVSxFQUNwRyxLQUFLLENBQ0wsQ0FBQztnQkFFRixJQUFJLE9BQU8sR0FBRyw0QkFBMEIsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDdEQsc0JBQXNCO29CQUN0QixNQUFNLEtBQUssR0FBRyw0QkFBMEIsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNuRixNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsTUFBTSxVQUFVLEdBQUcsU0FBUyxJQUFJLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7UUFDakYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGlFQUFpRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZHLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxhQUFhLENBQUMsV0FBd0IsRUFBRSxTQUFtQjtRQUN4RSxNQUFNLFFBQVEsR0FBeUI7WUFDdEMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxFQUFFO1lBQ3hCLE9BQU8sRUFBRSxXQUFXLENBQUMsT0FBTztZQUM1QixTQUFTLEVBQUUsV0FBVyxDQUFDLFNBQVM7WUFDaEMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxRQUFRO1lBQzlCLFNBQVMsRUFBRSxXQUFXLENBQUMsU0FBUztZQUNoQyxZQUFZLEVBQUUsV0FBVyxDQUFDLFlBQVk7WUFDdEMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxVQUFVO1lBQ2xDLE1BQU0sRUFBRSxjQUFjO1NBQ3RCLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyw0Q0FBNEMsQ0FBQztRQUU1RCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUNsQztnQkFDQyxNQUFNLEVBQUUsWUFBWSxFQUFFO2dCQUN0QixNQUFNO2dCQUNOLFVBQVUsRUFBRTtvQkFDWCxnQkFBZ0IsRUFBRSxTQUFTO29CQUMzQixRQUFRLEVBQUUsV0FBVyxDQUFDLE9BQU87b0JBQzdCLFFBQVE7b0JBQ1IsU0FBUyxFQUFFLDRCQUEwQixDQUFDLFNBQVM7b0JBQy9DLFNBQVMsRUFBRSxXQUFXLENBQUMsRUFBRTtpQkFDekI7Z0JBQ0QsT0FBTyxFQUFFLFNBQVM7YUFDbEIsRUFDRCxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxvREFBb0Q7WUFDbkUsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFDO1FBQ0gsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUN6QixLQUFhLEVBQ2IsUUFBZ0IsRUFBRSxFQUNsQixZQUFvQixHQUFHO1FBRXZCLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO1lBQzlGLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELGNBQWM7UUFDZCxNQUFNLFFBQVEsR0FBRyxHQUFHLEtBQUssSUFBSSxLQUFLLElBQUksU0FBUyxFQUFFLENBQUM7UUFDbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEdBQUcsNEJBQTBCLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdkYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQztZQUNoRixPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDdkIsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLDJCQUEyQjtZQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO1lBQ3RGLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUNyRSxLQUFLLEVBQ0wsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFDO1lBRUYsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDdEUsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUNsSSxDQUFDO1lBRUQsbUJBQW1CO1lBQ25CLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7WUFDNUUsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFNUUsZ0JBQWdCO1lBQ2hCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsK0JBQStCLE9BQU8sQ0FBQyxNQUFNLGtCQUFrQixDQUFDLENBQUM7WUFDdkYsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdEUsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLGNBQWMsQ0FDM0IsY0FBd0IsRUFDeEIsS0FBYSxFQUNiLFNBQWlCO1FBRWpCLE1BQU0sTUFBTSxHQUFHLDZDQUE2QyxDQUFDO1FBRTdELElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQ2pEO2dCQUNDLE1BQU0sRUFBRSxZQUFZLEVBQUU7Z0JBQ3RCLE1BQU07Z0JBQ04sVUFBVSxFQUFFO29CQUNYLFlBQVksRUFBRSxjQUFjO29CQUM1QixLQUFLO29CQUNMLFNBQVM7b0JBQ1QsU0FBUyxFQUFFLDRCQUEwQixDQUFDLFNBQVM7aUJBQy9DO2dCQUNELE9BQU8sRUFBRSxTQUFTO2FBQ2xCLEVBQ0QsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsc0JBQXNCO1lBQ3JDLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQztZQUVGLGdCQUFnQjtZQUNoQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxtQkFBbUIsQ0FBQyxVQUFlO1FBQzFDLElBQUksQ0FBQztZQUNKLG1EQUFtRDtZQUNuRCxNQUFNLE9BQU8sR0FBeUIsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLElBQUksRUFBRSxDQUFDO1lBRXJGLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzdCLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVE7Z0JBQzVCLE9BQU8sRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU87Z0JBQ2hDLFNBQVMsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVM7Z0JBQ3BDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVE7Z0JBQ2xDLFNBQVMsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVM7Z0JBQ3BDLFlBQVksRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVk7Z0JBQzFDLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVU7Z0JBQ3RDLFVBQVUsRUFBRSxNQUFNLENBQUMsS0FBSzthQUN4QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHVEQUF1RCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3ZGLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxPQUE2QjtRQUNyRSx3Q0FBd0M7UUFDeEMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksSUFBSSw0QkFBMEIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6RSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztZQUN4RCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3JDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO1lBQzFCLE9BQU87WUFDUCxTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtTQUNyQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsc0JBQXNCO1FBQzNCLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxtRUFBbUUsQ0FBQyxDQUFDO1lBQzNGLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osb0NBQW9DO1lBQ3BDLE1BQU0sVUFBVSxHQUFHLDJDQUEyQyxDQUFDO1lBQy9ELE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQ3JEO2dCQUNDLE1BQU0sRUFBRSxZQUFZLEVBQUU7Z0JBQ3RCLE1BQU0sRUFBRSxVQUFVO2dCQUNsQixVQUFVLEVBQUU7b0JBQ1gsU0FBUyxFQUFFLDRCQUEwQixDQUFDLFNBQVM7b0JBQy9DLEtBQUssRUFBRSxJQUFJLENBQUMsa0JBQWtCO2lCQUM5QjtnQkFDRCxPQUFPLEVBQUUsU0FBUzthQUNsQixFQUNELEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUNiLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQztZQUVGLHFCQUFxQjtZQUNyQixNQUFNLE9BQU8sR0FBVSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDdEUsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUV6QyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxDQUFDLENBQUM7Z0JBQ3BFLE9BQU87WUFDUixDQUFDO1lBRUQscUJBQXFCO1lBQ3JCLE1BQU0sWUFBWSxHQUFHLDRDQUE0QyxDQUFDO1lBQ2xFLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2xDLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQ2xDO29CQUNDLE1BQU0sRUFBRSxZQUFZLEVBQUU7b0JBQ3RCLE1BQU0sRUFBRSxZQUFZO29CQUNwQixVQUFVLEVBQUU7d0JBQ1gsU0FBUyxFQUFFLFFBQVE7d0JBQ25CLFNBQVMsRUFBRSw0QkFBMEIsQ0FBQyxTQUFTO3FCQUMvQztvQkFDRCxPQUFPLEVBQUUsU0FBUztpQkFDbEIsRUFDRCxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsRUFDYixpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUM7WUFDSCxDQUFDO1lBRUQsY0FBYztZQUNkLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFMUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLFNBQVMsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxDQUFDO1FBQ3BGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGlEQUFpRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2pGLE1BQU0sS0FBSyxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMxQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQzs7QUEzWFcsMEJBQTBCO0lBeUJwQyxXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsMEJBQTBCLENBQUE7SUFDMUIsV0FBQSxXQUFXLENBQUE7R0EzQkQsMEJBQTBCLENBNFh0Qzs7QUFFRCx1QkFBdUI7QUFDdkIsaUJBQWlCLENBQUMsMkJBQTJCLEVBQUUsMEJBQTBCLG9DQUE0QixDQUFDIn0=