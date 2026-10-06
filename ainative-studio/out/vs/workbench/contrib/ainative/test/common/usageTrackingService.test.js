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
 * Mock settings service exposing just the `ainativeCloud.apiKey` that
 * UsageTrackingService reads to authenticate the credits balance fetch.
 *
 * The key is empty by default, which keeps the credits sync a no-op in tests:
 * with no API key configured the service makes no HTTP request.
 */
function createMockSettingsService(apiKey = '') {
    return {
        state: {
            settingsOfProvider: {
                ainativeCloud: { apiKey }
            }
        },
        onDidChangeState: new Emitter().event
    };
}
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
        usageTrackingService = disposables.add(new UsageTrackingService(cloudAuthService, modelRegistryService, storageService, createMockSettingsService()));
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
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService, createMockSettingsService());
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
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService, createMockSettingsService());
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
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService, createMockSettingsService());
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
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService, createMockSettingsService());
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
        const newService = new UsageTrackingService(cloudAuthService, modelRegistryService, storageService, createMockSettingsService());
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
        const brokenService = new UsageTrackingService(cloudAuthService, modelRegistryService, brokenStorage, createMockSettingsService());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2VUcmFja2luZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vdXNhZ2VUcmFja2luZ1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUNOLG9CQUFvQixFQUlwQixNQUFNLHNDQUFzQyxDQUFDO0FBQzlDLE9BQU8sRUFBNkIsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHbkcsT0FBTyxFQUFXLFdBQVcsRUFBRSxlQUFlLEVBQXlCLE1BQU0sc0NBQXNDLENBQUM7QUFDcEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlEOzs7Ozs7R0FNRztBQUNILFNBQVMseUJBQXlCLENBQUMsU0FBaUIsRUFBRTtJQUNyRCxPQUFPO1FBQ04sS0FBSyxFQUFFO1lBQ04sa0JBQWtCLEVBQUU7Z0JBQ25CLGFBQWEsRUFBRSxFQUFFLE1BQU0sRUFBRTthQUN6QjtTQUNEO1FBQ0QsZ0JBQWdCLEVBQUUsSUFBSSxPQUFPLEVBQVEsQ0FBQyxLQUFLO0tBQ0osQ0FBQztBQUMxQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLGtCQUFrQjtJQUF4QjtRQUVTLFlBQU8sR0FBcUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUM3Qyw4QkFBeUIsR0FBRyxJQUFJLE9BQU8sRUFBTyxDQUFDO1FBQ3ZELHNCQUFpQixH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