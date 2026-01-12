/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { UsageTrackingService } from '../../common/usageTrackingService.js';
import { CloudAuthState } from '../../common/ainativeCloudAuthTypes.js';
import { PricingTier, ModelCapability } from '../../common/aiModelRegistryTypes.js';
import { Emitter } from '../../../../../base/common/event.js';
/**
 * Mock Storage Service for testing
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this._onDidChangeTargetEmitter = new Emitter();
        this.onDidChangeTarget = this._onDidChangeTargetEmitter.event;
        this._onWillSaveStateEmitter = new Emitter();
        this.onWillSaveState = this._onWillSaveStateEmitter.event;
    }
    onDidChangeValue() {
        return { dispose: () => { } };
    }
    get(key, scope, fallbackValue) {
        const scopeMap = this.storage.get(scope.toString());
        return scopeMap?.get(key) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        return value !== undefined ? value === 'true' : fallbackValue;
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        return value !== undefined ? parseInt(value, 10) : fallbackValue;
    }
    getObject(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        return value ? JSON.parse(value) : fallbackValue;
    }
    store(key, value, scope, target) {
        if (!this.storage.has(scope.toString())) {
            this.storage.set(scope.toString(), new Map());
        }
        const scopeMap = this.storage.get(scope.toString());
        if (value === undefined || value === null) {
            scopeMap.delete(key);
        }
        else {
            scopeMap.set(key, String(value));
        }
    }
    remove(key, scope) {
        this.storage.get(scope.toString())?.delete(key);
    }
    keys(scope, target) {
        return Array.from(this.storage.get(scope.toString())?.keys() ?? []);
    }
    switch() {
        return Promise.resolve();
    }
    hasScope() {
        return true;
    }
    logStorage() {
        // No-op for testing
    }
    migrate() {
        return Promise.resolve();
    }
    isNew() {
        return false;
    }
    flush() {
        return Promise.resolve();
    }
    log() {
        // No-op for testing
    }
    storeAll(entries, external) {
        for (const entry of entries) {
            this.store(entry.key, entry.value, entry.scope, entry.target);
        }
    }
    optimize(scope) {
        return Promise.resolve();
    }
}
/**
 * Mock Cloud Auth Service
 */
class MockCloudAuthService {
    constructor() {
        this._isAuthenticated = false;
        this._authState = CloudAuthState.Unauthenticated;
        this._onDidChangeAuthStateEmitter = new Emitter();
        this.onDidChangeAuthState = this._onDidChangeAuthStateEmitter.event;
        this._onDidUpdateUserEmitter = new Emitter();
        this.onDidUpdateUser = this._onDidUpdateUserEmitter.event;
    }
    setAuthenticated(authenticated) {
        this._isAuthenticated = authenticated;
        this._authState = authenticated ? CloudAuthState.Authenticated : CloudAuthState.Unauthenticated;
        this._onDidChangeAuthStateEmitter.fire(this._authState);
    }
    isAuthenticated() {
        return this._isAuthenticated;
    }
    getAuthState() {
        return this._authState;
    }
    async getAccessToken() {
        return this._isAuthenticated ? 'mock-token' : null;
    }
    getAccessTokenSync() {
        return this._isAuthenticated ? 'mock-token' : null;
    }
    // Stub methods
    async register() { throw new Error('Not implemented'); }
    async login() { throw new Error('Not implemented'); }
    async logout() { }
    async requestPasswordReset() { throw new Error('Not implemented'); }
    async confirmPasswordReset() { throw new Error('Not implemented'); }
    async changePassword() { throw new Error('Not implemented'); }
    async refreshToken() { throw new Error('Not implemented'); }
    async validateToken() { throw new Error('Not implemented'); }
    async getCurrentUser() { return null; }
    getUser() { return null; }
    async resendEmailVerification() { throw new Error('Not implemented'); }
    async verifyEmail() { throw new Error('Not implemented'); }
}
/**
 * Mock Model Registry Service
 */
class MockModelRegistryService {
    constructor() {
        this._onDidUpdateModelsEmitter = new Emitter();
        this.onDidUpdateModels = this._onDidUpdateModelsEmitter.event;
        this._onDidChangeModelSelectionEmitter = new Emitter();
        this.onDidChangeModelSelection = this._onDidChangeModelSelectionEmitter.event;
        this.models = new Map();
        this.quotaInfo = {
            totalLimit: 10000,
            used: 0,
            remaining: 10000,
            exceeded: false
        };
    }
    addModel(model) {
        this.models.set(model.id, model);
    }
    setQuotaInfo(quota) {
        this.quotaInfo = quota;
    }
    async listModels() {
        return Array.from(this.models.values());
    }
    async getModel(modelId) {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model not found: ${modelId}`);
        }
        return model;
    }
    async getQuota() {
        return this.quotaInfo;
    }
    async getUsageStats() {
        return {
            totalCalls: 0,
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalCost: 0
        };
    }
    // Stub methods
    async selectModel() { }
    async getSelectedModel() { return null; }
    async invokeModel() { throw new Error('Not implemented'); }
    async streamModel() { throw new Error('Not implemented'); }
    async refreshModels() { }
}
suite('UsageTrackingService', () => {
    const disposables = new DisposableStore();
    let storageService;
    let cloudAuthService;
    let modelRegistryService;
    let usageTrackingService;
    setup(() => {
        storageService = new MockStorageService();
        cloudAuthService = new MockCloudAuthService();
        modelRegistryService = new MockModelRegistryService();
        // Add test models
        modelRegistryService.addModel({
            id: 'claude-3-opus',
            name: 'Claude 3 Opus',
            description: 'Most powerful Claude model',
            provider: 'anthropic',
            version: '3.0',
            capabilities: [ModelCapability.Chat, ModelCapability.TextGeneration],
            pricing: {
                tier: PricingTier.PayAsYouGo,
                inputTokenCost: 0.015,
                outputTokenCost: 0.075,
                currency: 'USD'
            },
            parameters: [],
            maxContextLength: 200000,
            available: true
        });
        modelRegistryService.addModel({
            id: 'gpt-4',
            name: 'GPT-4',
            description: 'OpenAI GPT-4',
            provider: 'openai',
            capabilities: [ModelCapability.Chat],
            pricing: {
                tier: PricingTier.PayAsYouGo,
                inputTokenCost: 0.03,
                outputTokenCost: 0.06,
                currency: 'USD'
            },
            parameters: [],
            available: true
        });
        usageTrackingService = disposables.add(new UsageTrackingService(cloudAuthService, modelRegistryService, storageService));
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should initialize with empty usage records', async () => {
        const usage = await usageTrackingService.getUsage();
        strictEqual(usage.totalCalls, 0);
        strictEqual(usage.totalTokens, 0);
        strictEqual(usage.totalCost, 0);
    });
    test('should track single usage correctly', async () => {
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        const usage = await usageTrackingService.getUsage();
        strictEqual(usage.totalCalls, 1);
        strictEqual(usage.inputTokens, 1000);
        strictEqual(usage.outputTokens, 500);
        strictEqual(usage.totalTokens, 1500);
        ok(usage.totalCost > 0);
    });
    test('should calculate cost correctly for Claude 3 Opus', async () => {
        const cost = await usageTrackingService.calculateCost('claude-3-opus', 1000, 500);
        // Cost = (1000/1000 * 0.015) + (500/1000 * 0.075) = 0.015 + 0.0375 = 0.0525
        strictEqual(cost.inputCost, 0.015);
        strictEqual(cost.outputCost, 0.0375);
        strictEqual(cost.totalCost, 0.0525);
    });
    test('should calculate cost correctly for GPT-4', async () => {
        const cost = await usageTrackingService.calculateCost('gpt-4', 2000, 1000);
        // Cost = (2000/1000 * 0.03) + (1000/1000 * 0.06) = 0.06 + 0.06 = 0.12
        strictEqual(cost.inputCost, 0.06);
        strictEqual(cost.outputCost, 0.06);
        strictEqual(cost.totalCost, 0.12);
    });
    test('should aggregate usage across multiple models', async () => {
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        await usageTrackingService.trackUsage('gpt-4', 2000, 1000);
        const usage = await usageTrackingService.getUsage();
        strictEqual(usage.totalCalls, 2);
        strictEqual(usage.inputTokens, 3000);
        strictEqual(usage.outputTokens, 1500);
        strictEqual(usage.totalTokens, 4500);
        // Verify per-model breakdown
        ok(usage.byModel['claude-3-opus']);
        strictEqual(usage.byModel['claude-3-opus'].calls, 1);
        strictEqual(usage.byModel['claude-3-opus'].inputTokens, 1000);
        strictEqual(usage.byModel['claude-3-opus'].outputTokens, 500);
        ok(usage.byModel['gpt-4']);
        strictEqual(usage.byModel['gpt-4'].calls, 1);
        strictEqual(usage.byModel['gpt-4'].inputTokens, 2000);
        strictEqual(usage.byModel['gpt-4'].outputTokens, 1000);
    });
    test('should persist usage to storage', async () => {
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        // Check storage was updated
        const stored = storageService.get('ainative.usage.records', -1 /* StorageScope.APPLICATION */);
        ok(stored);
        const records = JSON.parse(stored);
        strictEqual(records.length, 1);
        strictEqual(records[0].modelId, 'claude-3-opus');
        strictEqual(records[0].inputTokens, 1000);
        strictEqual(records[0].outputTokens, 500);
    });
    test('should load usage from storage on initialization', async () => {
        // Store usage records manually
        const records = [{
                id: 'test-1',
                modelId: 'claude-3-opus',
                inputTokens: 1000,
                outputTokens: 500,
                totalTokens: 1500,
                cost: 0.0525,
                timestamp: Date.now()
            }];
        storageService.store('ainative.usage.records', JSON.stringify(records), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Create new service instance
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService);
        const usage = await newService.getUsage();
        strictEqual(usage.totalCalls, 1);
        strictEqual(usage.totalTokens, 1500);
        newService.dispose();
    });
    test('should filter usage by period - day', async () => {
        const now = Date.now();
        const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
        // Manually add records with different timestamps
        const records = [
            {
                id: 'old',
                modelId: 'claude-3-opus',
                inputTokens: 1000,
                outputTokens: 500,
                totalTokens: 1500,
                cost: 0.0525,
                timestamp: twoDaysAgo
            },
            {
                id: 'recent',
                modelId: 'gpt-4',
                inputTokens: 2000,
                outputTokens: 1000,
                totalTokens: 3000,
                cost: 0.12,
                timestamp: now - 1000
            }
        ];
        storageService.store('ainative.usage.records', JSON.stringify(records), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService);
        const usage = await newService.getUsage('day');
        // Should only include recent record
        strictEqual(usage.totalCalls, 1);
        strictEqual(usage.totalTokens, 3000);
        newService.dispose();
    });
    test('should handle zero cost for unknown models', async () => {
        const cost = await usageTrackingService.calculateCost('unknown-model', 1000, 500);
        strictEqual(cost.inputCost, 0);
        strictEqual(cost.outputCost, 0);
        strictEqual(cost.totalCost, 0);
    });
    test('should fire usage update event when tracking', async () => {
        let eventFired = false;
        let receivedUsage = null;
        disposables.add(usageTrackingService.onDidUpdateUsage(usage => {
            eventFired = true;
            receivedUsage = usage;
        }));
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        ok(eventFired, 'Usage update event should fire');
        ok(receivedUsage, 'Usage should be received');
        strictEqual(receivedUsage.totalCalls, 1);
    });
    test('should get quota status when unauthenticated', async () => {
        cloudAuthService.setAuthenticated(false);
        const quota = await usageTrackingService.getQuotaStatus();
        strictEqual(quota.hasQuota, false);
        strictEqual(quota.totalLimit, 0);
        strictEqual(quota.exceeded, false);
        strictEqual(quota.approaching, false);
    });
    test('should get quota status when authenticated', async () => {
        cloudAuthService.setAuthenticated(true);
        modelRegistryService.setQuotaInfo({
            totalLimit: 10000,
            used: 2000,
            remaining: 8000,
            exceeded: false
        });
        await usageTrackingService.syncWithCloud();
        const quota = await usageTrackingService.getQuotaStatus();
        strictEqual(quota.hasQuota, true);
        strictEqual(quota.totalLimit, 10000);
        strictEqual(quota.used, 2000);
        strictEqual(quota.remaining, 8000);
        strictEqual(quota.exceeded, false);
        strictEqual(quota.approaching, false);
    });
    test('should detect approaching quota threshold', async () => {
        cloudAuthService.setAuthenticated(true);
        modelRegistryService.setQuotaInfo({
            totalLimit: 10000,
            used: 8500, // 85% used
            remaining: 1500,
            exceeded: false
        });
        await usageTrackingService.syncWithCloud();
        const quota = await usageTrackingService.getQuotaStatus();
        strictEqual(quota.approaching, true);
    });
    test('should detect exceeded quota', async () => {
        cloudAuthService.setAuthenticated(true);
        modelRegistryService.setQuotaInfo({
            totalLimit: 10000,
            used: 10500,
            remaining: 0,
            exceeded: true
        });
        await usageTrackingService.syncWithCloud();
        const quota = await usageTrackingService.getQuotaStatus();
        strictEqual(quota.exceeded, true);
    });
    test('should fire quota update event after sync', async () => {
        cloudAuthService.setAuthenticated(true);
        let eventFired = false;
        let receivedQuota = null;
        disposables.add(usageTrackingService.onDidUpdateQuota(quota => {
            eventFired = true;
            receivedQuota = quota;
        }));
        await usageTrackingService.syncWithCloud();
        ok(eventFired, 'Quota update event should fire');
        ok(receivedQuota);
    });
    test('should skip cloud sync when unauthenticated', async () => {
        cloudAuthService.setAuthenticated(false);
        // Should not throw
        await usageTrackingService.syncWithCloud();
    });
    test('should clear local usage data', async () => {
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        let usage = await usageTrackingService.getUsage();
        strictEqual(usage.totalCalls, 1);
        await usageTrackingService.clearLocalUsage();
        usage = await usageTrackingService.getUsage();
        strictEqual(usage.totalCalls, 0);
        strictEqual(usage.totalTokens, 0);
    });
    test('should reset all data', async () => {
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        usageTrackingService.reset();
        const usage = await usageTrackingService.getUsage();
        strictEqual(usage.totalCalls, 0);
        // Verify storage was cleared
        const stored = storageService.get('ainative.usage.records', -1 /* StorageScope.APPLICATION */);
        strictEqual(stored, undefined);
    });
    test('should sync to cloud on authentication', async () => {
        // Start unauthenticated
        cloudAuthService.setAuthenticated(false);
        // Create new service to attach event listener
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService);
        // Authenticate - should trigger sync
        cloudAuthService.setAuthenticated(true);
        // Wait a bit for async sync
        await new Promise(resolve => setTimeout(resolve, 100));
        // Verify quota was updated (indicates sync happened)
        const quota = await newService.getQuotaStatus();
        ok(quota);
        newService.dispose();
    });
    test('should reset on unauthentication', async () => {
        cloudAuthService.setAuthenticated(true);
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        // Trigger unauthentication
        cloudAuthService.setAuthenticated(false);
        // Wait a bit for async reset
        await new Promise(resolve => setTimeout(resolve, 100));
        const usage = await usageTrackingService.getUsage();
        strictEqual(usage.totalCalls, 0);
    });
    test('should limit local records to MAX_LOCAL_RECORDS', async () => {
        // Track many usage records
        for (let i = 0; i < 150; i++) {
            await usageTrackingService.trackUsage('claude-3-opus', 100, 50);
        }
        const usage = await usageTrackingService.getUsage();
        // Should have trimmed to 100 records (MAX_LOCAL_RECORDS)
        strictEqual(usage.totalCalls, 100);
    });
    test('should handle multiple concurrent trackUsage calls', async () => {
        // Track usage concurrently
        await Promise.all([
            usageTrackingService.trackUsage('claude-3-opus', 1000, 500),
            usageTrackingService.trackUsage('gpt-4', 2000, 1000),
            usageTrackingService.trackUsage('claude-3-opus', 500, 250)
        ]);
        const usage = await usageTrackingService.getUsage();
        strictEqual(usage.totalCalls, 3);
        strictEqual(usage.inputTokens, 3500);
        strictEqual(usage.outputTokens, 1750);
    });
    test('should generate unique IDs for usage records', async () => {
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        const stored = storageService.get('ainative.usage.records', -1 /* StorageScope.APPLICATION */);
        const records = JSON.parse(stored);
        strictEqual(records.length, 2);
        ok(records[0].id !== records[1].id, 'IDs should be unique');
    });
    test('should filter usage by week period', async () => {
        const now = Date.now();
        const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
        const records = [
            {
                id: 'old',
                modelId: 'claude-3-opus',
                inputTokens: 1000,
                outputTokens: 500,
                totalTokens: 1500,
                cost: 0.0525,
                timestamp: eightDaysAgo
            },
            {
                id: 'recent',
                modelId: 'gpt-4',
                inputTokens: 2000,
                outputTokens: 1000,
                totalTokens: 3000,
                cost: 0.12,
                timestamp: threeDaysAgo
            }
        ];
        storageService.store('ainative.usage.records', JSON.stringify(records), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService);
        const usage = await newService.getUsage('week');
        strictEqual(usage.totalCalls, 1);
        strictEqual(usage.totalTokens, 3000);
        newService.dispose();
    });
    test('should filter usage by month period', async () => {
        const now = Date.now();
        const fortyDaysAgo = now - (40 * 24 * 60 * 60 * 1000);
        const fifteenDaysAgo = now - (15 * 24 * 60 * 60 * 1000);
        const records = [
            {
                id: 'old',
                modelId: 'claude-3-opus',
                inputTokens: 1000,
                outputTokens: 500,
                totalTokens: 1500,
                cost: 0.0525,
                timestamp: fortyDaysAgo
            },
            {
                id: 'recent',
                modelId: 'gpt-4',
                inputTokens: 2000,
                outputTokens: 1000,
                totalTokens: 3000,
                cost: 0.12,
                timestamp: fifteenDaysAgo
            }
        ];
        storageService.store('ainative.usage.records', JSON.stringify(records), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService);
        const usage = await newService.getUsage('month');
        strictEqual(usage.totalCalls, 1);
        strictEqual(usage.totalTokens, 3000);
        newService.dispose();
    });
    test('should include period timestamps in usage aggregation', async () => {
        await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);
        const usage = await usageTrackingService.getUsage();
        ok(usage.periodStart === 0); // 'all' period starts at 0
        ok(usage.periodEnd > Date.now() - 1000); // Within last second
    });
    test('should handle storage errors gracefully', async () => {
        // Create a service with a broken storage
        const brokenStorage = new MockStorageService();
        brokenStorage.store = () => { throw new Error('Storage error'); };
        const brokenService = new UsageTrackingService(cloudAuthService, modelRegistryService, brokenStorage);
        // Should not throw
        await brokenService.trackUsage('claude-3-opus', 1000, 500);
        brokenService.dispose();
    });
    test('should handle model fetch errors gracefully', async () => {
        // Track usage for a model that will error
        const originalGetModel = modelRegistryService.getModel.bind(modelRegistryService);
        modelRegistryService.getModel = async () => {
            throw new Error('Network error');
        };
        // Should not throw and should use zero cost
        await usageTrackingService.trackUsage('error-model', 1000, 500);
        const usage = await usageTrackingService.getUsage();
        strictEqual(usage.totalCalls, 1);
        strictEqual(usage.totalCost, 0);
        // Restore
        modelRegistryService.getModel = originalGetModel;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2VUcmFja2luZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vdXNhZ2VUcmFja2luZ1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUNOLG9CQUFvQixFQUlwQixNQUFNLHNDQUFzQyxDQUFDO0FBQzlDLE9BQU8sRUFBNkIsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFbkcsT0FBTyxFQUFXLFdBQVcsRUFBRSxlQUFlLEVBQXlCLE1BQU0sc0NBQXNDLENBQUM7QUFDcEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlEOztHQUVHO0FBQ0gsTUFBTSxrQkFBa0I7SUFBeEI7UUFFUyxZQUFPLEdBQXFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDN0MsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQU8sQ0FBQztRQUN2RCxzQkFBaUIsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO1FBQ2pELDRCQUF1QixHQUFHLElBQUksT0FBTyxFQUFPLENBQUM7UUFDckQsb0JBQWUsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDO0lBMkYvRCxDQUFDO0lBekZBLGdCQUFnQjtRQUNmLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFF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