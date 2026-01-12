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
    static { this.STORAGE_KEY_CREDITS_STATUS = 'ainative.usage.creditsStatus'; }
    static { this.STORAGE_KEY_MANAGED_USAGE = 'ainative.usage.managedRecords'; }
    static { this.SYNC_INTERVAL_MS = 5 * 60 * 1000; } // 5 minutes
    static { this.QUOTA_WARNING_THRESHOLD = 0.8; } // 80%
    static { this.MAX_LOCAL_RECORDS = 10000; } // Limit local storage
    constructor(cloudAuthService, modelRegistryService, storageService) {
        super();
        this.cloudAuthService = cloudAuthService;
        this.modelRegistryService = modelRegistryService;
        this.storageService = storageService;
        // private static readonly CREDITS_LOW_THRESHOLD = 0.2; // 20% - defined for reference but not currently used
        this._onDidUpdateUsage = this._register(new Emitter());
        this.onDidUpdateUsage = this._onDidUpdateUsage.event;
        this._onDidUpdateQuota = this._register(new Emitter());
        this.onDidUpdateQuota = this._onDidUpdateQuota.event;
        this._onDidUpdateCredits = this._register(new Emitter());
        this.onDidUpdateCredits = this._onDidUpdateCredits.event;
        this._onCreditsLow = this._register(new Emitter());
        this.onCreditsLow = this._onCreditsLow.event;
        this._usageRecords = [];
        this._managedUsageRecords = [];
        this._quotaStatus = null;
        this._creditsStatus = null;
        this._syncTimer = null;
        this._modelCache = new Map();
        this._loadFromStorage();
        this._loadManagedUsageFromStorage();
        this._startSyncTimer();
        // Listen to auth state changes
        this._register(this.cloudAuthService.onDidChangeAuthState(state => {
            if (state === 'authenticated') {
                this.syncWithCloud().catch(err => console.error('[UsageTrackingService] Failed to sync on auth:', err));
                this._syncCreditsStatus().catch(err => console.error('[UsageTrackingService] Failed to sync credits on auth:', err));
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
        this._managedUsageRecords = [];
        this._quotaStatus = null;
        this._creditsStatus = null;
        this._modelCache.clear();
        // Clear storage
        this.storageService.remove(UsageTrackingService_1.STORAGE_KEY_USAGE_RECORDS, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(UsageTrackingService_1.STORAGE_KEY_LAST_SYNC, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(UsageTrackingService_1.STORAGE_KEY_CREDITS_STATUS, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(UsageTrackingService_1.STORAGE_KEY_MANAGED_USAGE, -1 /* StorageScope.APPLICATION */);
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
    /**
     * Track managed API usage with credits
     */
    async trackManagedUsage(modelId, tokensUsed, creditsConsumed) {
        try {
            // Fetch current credits status to get remaining balance and plan tier
            const creditsStatus = await this.getCreditsStatus();
            // Create managed usage record
            const record = {
                id: this._generateId(),
                modelId,
                inputTokens: 0, // Managed API tracks total tokens
                outputTokens: 0,
                totalTokens: tokensUsed,
                cost: 0, // Cost is tracked via credits
                timestamp: Date.now(),
                creditsConsumed,
                creditsRemaining: creditsStatus.remaining,
                planTier: creditsStatus.planTier
            };
            // Add to managed usage records
            this._managedUsageRecords.push(record);
            // Trim if exceeding max records
            if (this._managedUsageRecords.length > UsageTrackingService_1.MAX_LOCAL_RECORDS) {
                this._managedUsageRecords = this._managedUsageRecords.slice(-UsageTrackingService_1.MAX_LOCAL_RECORDS);
            }
            // Save to storage
            await this._saveManagedUsageToStorage();
            // Update credits status
            await this._syncCreditsStatus();
            console.log(`[UsageTrackingService] Tracked managed usage: ${modelId}, ${tokensUsed} tokens, ${creditsConsumed} credits`);
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to track managed usage:', error);
        }
    }
    /**
     * Get current credits status from backend
     */
    async getCreditsStatus() {
        if (!this.cloudAuthService.isAuthenticated()) {
            console.log('[UsageTrackingService] Not authenticated, returning default credits status');
            return this._getDefaultCreditsStatus();
        }
        try {
            // Sync with backend
            await this._syncCreditsStatus();
            return this._creditsStatus ?? this._getDefaultCreditsStatus();
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to get credits status:', error);
            return this._creditsStatus ?? this._getDefaultCreditsStatus();
        }
    }
    /**
     * Check if credits are running low (< 20% remaining)
     */
    isCreditsLow() {
        if (!this._creditsStatus) {
            return false;
        }
        return this._creditsStatus.isLow;
    }
    /**
     * Get credits usage history
     */
    async getCreditsHistory(days = 30) {
        try {
            // TODO: This will be replaced with actual backend API call when ManagedChatAPIService is implemented
            // For now, calculate from local managed usage records
            const now = Date.now();
            const startTime = now - (days * 24 * 60 * 60 * 1000);
            // Filter records by time period
            const periodRecords = this._managedUsageRecords.filter(r => r.timestamp >= startTime);
            // Group by date
            const dailyUsageMap = new Map();
            for (const record of periodRecords) {
                const date = new Date(record.timestamp).toISOString().split('T')[0];
                if (!dailyUsageMap.has(date)) {
                    dailyUsageMap.set(date, { creditsUsed: 0, requestCount: 0, tokensUsed: 0 });
                }
                const dayData = dailyUsageMap.get(date);
                dayData.creditsUsed += record.creditsConsumed;
                dayData.requestCount++;
                dayData.tokensUsed += record.totalTokens;
            }
            // Convert to array and sort by date
            const dailyUsage = Array.from(dailyUsageMap.entries())
                .map(([date, data]) => ({
                date,
                creditsUsed: data.creditsUsed,
                requestCount: data.requestCount,
                tokensUsed: data.tokensUsed
            }))
                .sort((a, b) => a.date.localeCompare(b.date));
            // Calculate totals
            const totalCreditsUsed = periodRecords.reduce((sum, r) => sum + r.creditsConsumed, 0);
            const totalRequests = periodRecords.length;
            const totalTokens = periodRecords.reduce((sum, r) => sum + r.totalTokens, 0);
            return {
                period: {
                    start: new Date(startTime),
                    end: new Date(now)
                },
                dailyUsage,
                totalCreditsUsed,
                totalRequests,
                totalTokens
            };
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to get credits history:', error);
            // Return empty history on error
            return {
                period: {
                    start: new Date(),
                    end: new Date()
                },
                dailyUsage: [],
                totalCreditsUsed: 0,
                totalRequests: 0,
                totalTokens: 0
            };
        }
    }
    /**
     * Sync credits status with backend
     * NOTE: This is a placeholder implementation. Will be replaced with actual ManagedChatAPIService call.
     */
    async _syncCreditsStatus() {
        if (!this.cloudAuthService.isAuthenticated()) {
            this._creditsStatus = this._getDefaultCreditsStatus();
            return;
        }
        try {
            // TODO: Replace with actual backend API call
            // const status = await this.managedChatAPI.getUserUsage('monthly');
            // For now, calculate from local records or use cached status
            if (!this._creditsStatus) {
                // Load from storage if available
                const stored = this.storageService.get(UsageTrackingService_1.STORAGE_KEY_CREDITS_STATUS, -1 /* StorageScope.APPLICATION */);
                if (stored) {
                    this._creditsStatus = JSON.parse(stored);
                }
                else {
                    this._creditsStatus = this._getDefaultCreditsStatus();
                }
            }
            // Fire events
            const currentCreditsStatus = this._creditsStatus;
            if (currentCreditsStatus) {
                this._onDidUpdateCredits.fire(currentCreditsStatus);
                if (currentCreditsStatus.isLow) {
                    this._onCreditsLow.fire(currentCreditsStatus);
                }
            }
            // Save to storage
            this.storageService.store(UsageTrackingService_1.STORAGE_KEY_CREDITS_STATUS, JSON.stringify(this._creditsStatus), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            console.log('[UsageTrackingService] Credits status synced');
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to sync credits status:', error);
            this._creditsStatus = this._getDefaultCreditsStatus();
        }
    }
    /**
     * Get default credits status
     */
    _getDefaultCreditsStatus() {
        return {
            used: 0,
            remaining: 0,
            total: 0,
            percentUsed: 0,
            isLow: false,
            planTier: 'free'
        };
    }
    /**
     * Save managed usage records to storage
     */
    async _saveManagedUsageToStorage() {
        try {
            this.storageService.store(UsageTrackingService_1.STORAGE_KEY_MANAGED_USAGE, JSON.stringify(this._managedUsageRecords), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to save managed usage to storage:', error);
        }
    }
    /**
     * Load managed usage records from storage
     */
    _loadManagedUsageFromStorage() {
        try {
            const data = this.storageService.get(UsageTrackingService_1.STORAGE_KEY_MANAGED_USAGE, -1 /* StorageScope.APPLICATION */);
            if (data) {
                this._managedUsageRecords = JSON.parse(data);
                console.log(`[UsageTrackingService] Loaded ${this._managedUsageRecords.length} managed usage records from storage`);
            }
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to load managed usage from storage:', error);
            this._managedUsageRecords = [];
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2VUcmFja2luZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi91c2FnZVRyYWNraW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEc7OztHQUdHO0FBRUgsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDeEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUF5QnRFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBa0dwRzs7R0FFRztBQUNJLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTs7YUFHM0IsOEJBQXlCLEdBQUcsd0JBQXdCLEFBQTNCLENBQTRCO2FBQ3JELDBCQUFxQixHQUFHLHlCQUF5QixBQUE1QixDQUE2QjthQUNsRCwrQkFBMEIsR0FBRyw4QkFBOEIsQUFBakMsQ0FBa0M7YUFDNUQsOEJBQXlCLEdBQUcsK0JBQStCLEFBQWxDLENBQW1DO2FBQzVELHFCQUFnQixHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxBQUFoQixD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