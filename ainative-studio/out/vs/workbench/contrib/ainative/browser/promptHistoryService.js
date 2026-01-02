/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Emitter } from '../../../../base/common/event.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { PROMPT_HISTORY_STORAGE_KEY } from '../common/storageKeys.js';
export const IPromptHistoryService = createDecorator('promptHistoryService');
/**
 * Implementation of the prompt history service
 * Stores user prompts with metadata for history navigation and search
 */
let PromptHistoryService = class PromptHistoryService extends Disposable {
    constructor(_storageService) {
        super();
        this._storageService = _storageService;
        this._onDidChangeHistory = new Emitter();
        this.onDidChangeHistory = this._onDidChangeHistory.event;
        this._history = [];
        // Load history from storage on initialization
        this._loadHistory();
    }
    /**
     * Load history from storage
     */
    _loadHistory() {
        const historyStr = this._storageService.get(PROMPT_HISTORY_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (!historyStr) {
            this._history = [];
            return;
        }
        try {
            const parsed = JSON.parse(historyStr);
            if (Array.isArray(parsed)) {
                this._history = parsed;
            }
            else {
                this._history = [];
            }
        }
        catch (error) {
            console.error('Error parsing prompt history from storage:', error);
            this._history = [];
        }
    }
    /**
     * Save history to storage
     */
    _saveHistory() {
        const serialized = JSON.stringify(this._history);
        this._storageService.store(PROMPT_HISTORY_STORAGE_KEY, serialized, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    /**
     * Add a prompt to history
     */
    async addPrompt(content, metadata) {
        // Skip empty prompts
        if (!content || content.trim().length === 0) {
            return;
        }
        const entry = {
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
    async getHistory(limit) {
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
    async searchHistory(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        const lowerQuery = query.toLowerCase().trim();
        return this._history.filter(entry => entry.content.toLowerCase().includes(lowerQuery));
    }
    /**
     * Clear all prompt history
     */
    async clearHistory() {
        this._history = [];
        this._saveHistory();
        this._onDidChangeHistory.fire();
    }
};
PromptHistoryService = __decorate([
    __param(0, IStorageService)
], PromptHistoryService);
// Register the service as a singleton with eager instantiation
registerSingleton(IPromptHistoryService, PromptHistoryService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGlzdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvcHJvbXB0SGlzdG9yeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBNER0RSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUM7QUFFcEc7OztHQUdHO0FBQ0gsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBUTVDLFlBQ2tCLGVBQWlEO1FBRWxFLEtBQUssRUFBRSxDQUFDO1FBRjBCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQU5sRCx3QkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQ2xELHVCQUFrQixHQUFnQixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBRWxFLGFBQVEsR0FBa0IsRUFBRSxDQUFDO1FBT3BDLDhDQUE4QztRQUM5QyxJQUFJLENBQUMsWUFBWSxFQUFFLENB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