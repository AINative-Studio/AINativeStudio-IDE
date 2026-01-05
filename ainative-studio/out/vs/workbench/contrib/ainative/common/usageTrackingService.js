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
var UsageTrackingService_1;
/**
 * Usage Tracking Service
 * Tracks local token usage, calculates costs, monitors quotas, and syncs with cloud API
 */
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes.js';
import { IAIModelRegistryService } from './aiModelRegistryService.js';
/**
 * Service interface for usage tracking
 */
export const IUsageTrackingService = createDecorator('usageTrackingService');
/**
 * Usage Tracking Service Implementation
 */
let UsageTrackingService = class UsageTrackingService extends Disposable {
    static { UsageTrackingService_1 = this; }
    static { this.STORAGE_KEY_USAGE_RECORDS = 'ainative.usage.records'; }
    static { this.STORAGE_KEY_LAST_SYNC = 'ainative.usage.lastSync'; }
    static { this.SYNC_INTERVAL_MS = 5 * 60 * 1000; } // 5 minutes
    static { this.QUOTA_WARNING_THRESHOLD = 0.8; } // 80%
    static { this.MAX_LOCAL_RECORDS = 10000; } // Limit local storage
    constructor(cloudAuthService, modelRegistryService, storageService) {
        super();
        this.cloudAuthService = cloudAuthService;
        this.modelRegistryService = modelRegistryService;
        this.storageService = storageService;
        this._onDidUpdateUsage = this._register(new Emitter());
        this.onDidUpdateUsage = this._onDidUpdateUsage.event;
        this._onDidUpdateQuota = this._register(new Emitter());
        this.onDidUpdateQuota = this._onDidUpdateQuota.event;
        this._usageRecords = [];
        this._quotaStatus = null;
        this._syncTimer = null;
        this._modelCache = new Map();
        this._loadFromStorage();
        this._startSyncTimer();
        // Listen to auth state changes
        this._register(this.cloudAuthService.onDidChangeAuthState(state => {
            if (state === 'authenticated') {
                this.syncWithCloud().catch(err => console.error('[UsageTrackingService] Failed to sync on auth:', err));
            }
            else if (state === 'unauthenticated') {
                this.reset();
            }
        }));
    }
    /**
     * Track a model invocation
     */
    async trackUsage(modelId, inputTokens, outputTokens) {
        try {
            // Calculate cost
            const costCalc = await this.calculateCost(modelId, inputTokens, outputTokens);
            // Create usage record
            const record = {
                id: this._generateId(),
                modelId,
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                cost: costCalc.totalCost,
                timestamp: Date.now()
            };
            // Add to local records
            this._usageRecords.push(record);
            // Trim if exceeding max records
            if (this._usageRecords.length > UsageTrackingService_1.MAX_LOCAL_RECORDS) {
                this._usageRecords = this._usageRecords.slice(-UsageTrackingService_1.MAX_LOCAL_RECORDS);
            }
            // Save to storage
            await this._saveToStorage();
            // Update quota status
            await this._updateQuotaStatus();
            // Fire update event
            const usage = await this.getUsage();
            this._onDidUpdateUsage.fire(usage);
            console.log(`[UsageTrackingService] Tracked usage: ${modelId}, ${inputTokens}/${outputTokens} tokens, $${costCalc.totalCost.toFixed(6)}`);
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to track usage:', error);
        }
    }
    /**
     * Get current usage statistics
     */
    async getUsage(period = 'all') {
        const now = Date.now();
        let periodStart = 0;
        // Calculate period start
        switch (period) {
            case 'day':
                periodStart = now - (24 * 60 * 60 * 1000);
                break;
            case 'week':
                periodStart = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                periodStart = now - (30 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
            default:
                periodStart = 0;
                break;
        }
        // Filter records by period
        const records = this._usageRecords.filter(r => r.timestamp >= periodStart);
        // Aggregate statistics
        const byModel = {};
        let totalCalls = 0;
        let totalTokens = 0;
        let inputTokens = 0;
        let outputTokens = 0;
        let totalCost = 0;
        for (const record of records) {
            totalCalls++;
            totalTokens += record.totalTokens;
            inputTokens += record.inputTokens;
            outputTokens += record.outputTokens;
            totalCost += record.cost;
            if (!byModel[record.modelId]) {
                byModel[record.modelId] = {
                    calls: 0,
                    tokens: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    cost: 0
                };
            }
            byModel[record.modelId].calls++;
            byModel[record.modelId].tokens += record.totalTokens;
            byModel[record.modelId].inputTokens += record.inputTokens;
            byModel[record.modelId].outputTokens += record.outputTokens;
            byModel[record.modelId].cost += record.cost;
        }
        return {
            totalCalls,
            totalTokens,
            inputTokens,
            outputTokens,
            totalCost,
            byModel,
            periodStart,
            periodEnd: now
        };
    }
    /**
     * Get quota status
     */
    async getQuotaStatus() {
        if (!this._quotaStatus) {
            await this._updateQuotaStatus();
        }
        return this._quotaStatus ?? this._getDefaultQuotaStatus();
    }
    /**
     * Calculate cost for a potential usage
     */
    async calculateCost(modelId, inputTokens, outputTokens) {
        try {
            // Get model pricing
            const model = await this._getModel(modelId);
            if (!model) {
                console.warn(`[UsageTrackingService] Model not found: ${modelId}, using zero cost`);
                return { inputCost: 0, outputCost: 0, totalCost: 0 };
            }
            // Calculate costs (pricing is per 1K tokens)
            const inputCost = (inputTokens / 1000) * (model.pricing.inputTokenCost ?? 0);
            const outputCost = (outputTokens / 1000) * (model.pricing.outputTokenCost ?? 0);
            const totalCost = inputCost + outputCost;
            return { inputCost, outputCost, totalCost };
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to calculate cost:', error);
            return { inputCost: 0, outputCost: 0, totalCost: 0 };
        }
    }
    /**
     * Sync local usage with cloud API
     */
    async syncWithCloud() {
        if (!this.cloudAuthService.isAuthenticated()) {
            console.log('[UsageTrackingService] Not authenticated, skipping cloud sync');
            return;
        }
        try {
            // Fetch quota from cloud
            const quota = await this.modelRegistryService.getQuota();
            // Update quota status
            this._quotaStatus = {
                hasQuota: quota.totalLimit > 0,
                totalLimit: quota.totalLimit,
                used: quota.used,
                remaining: quota.remaining,
                exceeded: quota.exceeded,
                resetDate: quota.resetDate,
                warningThreshold: UsageTrackingService_1.QUOTA_WARNING_THRESHOLD,
                approaching: quota.used / quota.totalLimit >= UsageTrackingService_1.QUOTA_WARNING_THRESHOLD
            };
            this._onDidUpdateQuota.fire(this._quotaStatus);
            // Update last sync timestamp
            this.storageService.store(UsageTrackingService_1.STORAGE_KEY_LAST_SYNC, Date.now().toString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            console.log('[UsageTrackingService] Cloud sync completed successfully');
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to sync with cloud:', error);
        }
    }
    /**
     * Clear all local usage data
     */
    async clearLocalUsage() {
        this._usageRecords = [];
        await this._saveToStorage();
        console.log('[UsageTrackingService] Local usage data cleared');
    }
    /**
     * Reset usage tracking (called on logout)
     */
    reset() {
        this._usageRecords = [];
        this._quotaStatus = null;
        this._modelCache.clear();
        // Clear storage
        this.storageService.remove(UsageTrackingService_1.STORAGE_KEY_USAGE_RECORDS, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(UsageTrackingService_1.STORAGE_KEY_LAST_SYNC, -1 /* StorageScope.APPLICATION */);
        console.log('[UsageTrackingService] Reset completed');
    }
    /**
     * Load usage records from storage
     */
    _loadFromStorage() {
        try {
            const data = this.storageService.get(UsageTrackingService_1.STORAGE_KEY_USAGE_RECORDS, -1 /* StorageScope.APPLICATION */);
            if (data) {
                this._usageRecords = JSON.parse(data);
                console.log(`[UsageTrackingService] Loaded ${this._usageRecords.length} usage records from storage`);
            }
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to load from storage:', error);
            this._usageRecords = [];
        }
    }
    /**
     * Save usage records to storage
     */
    async _saveToStorage() {
        try {
            this.storageService.store(UsageTrackingService_1.STORAGE_KEY_USAGE_RECORDS, JSON.stringify(this._usageRecords), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to save to storage:', error);
        }
    }
    /**
     * Get model from cache or registry
     */
    async _getModel(modelId) {
        // Check cache first
        if (this._modelCache.has(modelId)) {
            return this._modelCache.get(modelId);
        }
        // Fetch from registry
        try {
            const model = await this.modelRegistryService.getModel(modelId);
            this._modelCache.set(modelId, model);
            return model;
        }
        catch (error) {
            console.error(`[UsageTrackingService] Failed to fetch model ${modelId}:`, error);
            return null;
        }
    }
    /**
     * Update quota status from cloud
     */
    async _updateQuotaStatus() {
        if (!this.cloudAuthService.isAuthenticated()) {
            this._quotaStatus = this._getDefaultQuotaStatus();
            return;
        }
        try {
            const quota = await this.modelRegistryService.getQuota();
            this._quotaStatus = {
                hasQuota: quota.totalLimit > 0,
                totalLimit: quota.totalLimit,
                used: quota.used,
                remaining: quota.remaining,
                exceeded: quota.exceeded,
                resetDate: quota.resetDate,
                warningThreshold: UsageTrackingService_1.QUOTA_WARNING_THRESHOLD,
                approaching: quota.totalLimit > 0 && (quota.used / quota.totalLimit) >= UsageTrackingService_1.QUOTA_WARNING_THRESHOLD
            };
            this._onDidUpdateQuota.fire(this._quotaStatus);
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to update quota status:', error);
            this._quotaStatus = this._getDefaultQuotaStatus();
        }
    }
    /**
     * Get default quota status
     */
    _getDefaultQuotaStatus() {
        return {
            hasQuota: false,
            totalLimit: 0,
            used: 0,
            remaining: 0,
            exceeded: false,
            warningThreshold: UsageTrackingService_1.QUOTA_WARNING_THRESHOLD,
            approaching: false
        };
    }
    /**
     * Start sync timer
     */
    _startSyncTimer() {
        // Clear existing timer
        if (this._syncTimer) {
            clearInterval(this._syncTimer);
        }
        // Set up periodic sync
        this._syncTimer = setInterval(() => {
            if (this.cloudAuthService.isAuthenticated()) {
                this.syncWithCloud().catch(err => console.error('[UsageTrackingService] Auto-sync failed:', err));
            }
        }, UsageTrackingService_1.SYNC_INTERVAL_MS);
        this._register({
            dispose: () => {
                if (this._syncTimer) {
                    clearInterval(this._syncTimer);
                    this._syncTimer = null;
                }
            }
        });
    }
    /**
     * Generate unique ID
     */
    _generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    dispose() {
        if (this._syncTimer) {
            clearInterval(this._syncTimer);
            this._syncTimer = null;
        }
        super.dispose();
    }
};
UsageTrackingService = UsageTrackingService_1 = __decorate([
    __param(0, IAINativeCloudAuthService),
    __param(1, IAIModelRegistryService),
    __param(2, IStorageService)
], UsageTrackingService);
export { UsageTrackingService };
// Register the service with VS Code dependency injection
registerSingleton(IUsageTrackingService, UsageTrackingService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2VUcmFja2luZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi91c2FnZVRyYWNraW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEc7OztHQUdHO0FBRUgsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDeEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUEyRHRFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBNkRwRzs7R0FFRztBQUNJLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTs7YUFHM0IsOEJBQXlCLEdBQUcsd0JBQXdCLEFBQTNCLENBQTRCO2FBQ3JELDBCQUFxQixHQUFHLHlCQUF5QixBQUE1QixDQUE2QjthQUNsRCxxQkFBZ0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQUFBaEIsQ0FBaUIsR0FBQyxZQUFZO2FBQzlDLDRCQUF1QixHQUFHLEdBQUcsQUFBTixDQUFPLEdBQUMsTUFBTTthQUNyQyxzQkFBaUIsR0FB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