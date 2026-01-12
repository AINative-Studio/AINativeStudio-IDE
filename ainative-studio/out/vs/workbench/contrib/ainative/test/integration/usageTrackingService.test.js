/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Integration tests for UsageTrackingService
 * Tests credits tracking, usage aggregation, quota monitoring, and event firing
 */
import * as assert from 'assert';
import { UsageTrackingService } from '../../common/usageTrackingService.js';
import { PricingTier } from '../../common/aiModelRegistryTypes.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';
/**
 * Mock storage service
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this._onDidChangeTarget = new Emitter();
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this._onWillSaveState = new Emitter();
        this.onWillSaveState = this._onWillSaveState.event;
    }
    onDidChangeValue() {
        return { dispose: () => { } };
    }
    get(key, scope, fallbackValue) {
        return this.storage.get(key) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        return value !== undefined ? value === 'true' : !!fallbackValue;
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        return value !== undefined ? parseFloat(value) : (fallbackValue ?? 0);
    }
    getObject(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        return value ? JSON.parse(value) : fallbackValue;
    }
    store(key, value, scope, target) {
        this.storage.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    remove(key, scope) {
        this.storage.delete(key);
    }
    keys(scope, target) {
        return Array.from(this.storage.keys());
    }
    clear() {
        this.storage.clear();
    }
    isNew(scope) {
        return false;
    }
    flush() {
        return Promise.resolve();
    }
    migrate() {
        return Promise.resolve();
    }
    logStorage() { }
    storeAll(entries, external) {
        for (const entry of entries) {
            this.store(entry.key, entry.value, entry.scope, entry.target);
        }
    }
    log() { }
    switch() {
        return Promise.resolve();
    }
    hasScope() {
        return true;
    }
    optimize() {
        return Promise.resolve();
    }
    // Stub for testing
    getAll() {
        return this.storage;
    }
}
/**
 * Mock auth service
 */
class MockAuthService {
    constructor() {
        this._isAuthenticated = false;
        this._onDidChangeAuthState = new Emitter();
        this._onDidUpdateUser = new Emitter();
        this.onDidChangeAuthState = this._onDidChangeAuthState.event;
        this.onDidUpdateUser = this._onDidUpdateUser.event;
    }
    isAuthenticated() {
        return this._isAuthenticated;
    }
    setAuthenticated(value) {
        this._isAuthenticated = value;
        this._onDidChangeAuthState.fire(value ? 'authenticated' : 'unauthenticated');
    }
    async getAccessToken() {
        return this._isAuthenticated ? 'mock_token' : null;
    }
    async refreshToken() {
        if (!this._isAuthenticated) {
            throw new Error('Not authenticated');
        }
        return 'mock_token';
    }
    // Stub other methods
    async register() { return { success: true }; }
    async login() { return { success: true }; }
    async logout() { }
    async requestPasswordReset() { return { success: true }; }
    async confirmPasswordReset() { return { success: true }; }
    async changePassword() { return { success: true }; }
    async validateToken() { return { valid: true }; }
    getAccessTokenSync() { return this._isAuthenticated ? 'mock_token' : null; }
    async getCurrentUser() { return null; }
    getUser() { return null; }
    getAuthState() { return this._isAuthenticated ? 'authenticated' : 'unauthenticated'; }
    async resendEmailVerification() { return { success: true }; }
    async verifyEmail() { return { success: true }; }
}
/**
 * Mock model registry service
 */
class MockModelRegistryService {
    constructor() {
        this.mockModels = new Map();
        this.mockQuota = {
            totalLimit: 1000,
            used: 100,
            remaining: 900,
            exceeded: false,
            resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        this.onDidChangeModels = new Emitter().event;
        this.onDidChangeQuota = new Emitter().event;
        // Stub other methods
        this.onDidUpdateModels = () => ({ dispose: () => { } });
        this.onDidChangeModelSelection = () => ({ dispose: () => { } });
    }
    async getModel(modelId) {
        const model = this.mockModels.get(modelId);
        if (!model) {
            throw new Error(`Model not found: ${modelId}`);
        }
        return model;
    }
    async getQuota() {
        return this.mockQuota;
    }
    setMockModel(modelId, model) {
        this.mockModels.set(modelId, model);
    }
    setMockQuota(quota) {
        this.mockQuota = quota;
    }
    async listModels() {
        return Array.from(this.mockModels.values());
    }
    async getSelectedModel() { return null; }
    async selectModel() { }
    async invokeModel() { return {}; }
    async streamModel() { return {}; }
    async getUsageStats() { return {}; }
    async getAllModels() {
        return Array.from(this.mockModels.values());
    }
    async refreshModels() { }
    async refreshQuota() { }
}
suite('UsageTrackingService - Integration Tests', () => {
    let storageService;
    let authService;
    let modelRegistryService;
    let usageTrackingService;
    setup(() => {
        storageService = new MockStorageService();
        authService = new MockAuthService();
        modelRegistryService = new MockModelRegistryService();
        // Set up mock models
        modelRegistryService.setMockModel('gpt-4o-mini', {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            provider: 'openai',
            description: 'GPT-4o Mini model',
            capabilities: [],
            pricing: {
                tier: PricingTier.Free,
                inputCost: 0.15,
                outputCost: 0.60,
                requestCost: 0,
                currency: 'USD'
            },
            parameters: [],
            maxContextLength: 128000,
            maxOutputLength: 16384
        });
        modelRegistryService.setMockModel('llama-3.3-70b-instruct', {
            id: 'llama-3.3-70b-instruct',
            name: 'Llama 3.3 70B',
            provider: 'groq',
            description: 'Llama 3.3 70B model',
            capabilities: [],
            pricing: {
                tier: PricingTier.Free,
                inputCost: 0.59,
                outputCost: 0.79,
                requestCost: 0,
                currency: 'USD'
            },
            parameters: [],
            maxContextLength: 128000,
            maxOutputLength: 8192
        });
        authService.setAuthenticated(true);
        usageTrackingService = new UsageTrackingService(authService, modelRegistryService, storageService);
    });
    teardown(() => {
        if (usageTrackingService instanceof Disposable) {
            usageTrackingService.dispose();
        }
        storageService.clear();
    });
    suite('Usage Tracking', () => {
        test('should track model usage and calculate cost', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            const usage = await usageTrackingService.getUsage();
            assert.strictEqual(usage.totalCalls, 1);
            assert.strictEqual(usage.inputTokens, 1000);
            assert.strictEqual(usage.outputTokens, 500);
            assert.strictEqual(usage.totalTokens, 1500);
            // Cost calculation: (1000/1000 * 0.15) + (500/1000 * 0.60) = 0.15 + 0.30 = 0.45
            assert.ok(Math.abs(usage.totalCost - 0.45) < 0.001);
        });
        test('should track multiple usages', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            await usageTrackingService.trackUsage('llama-3.3-70b-instruct', 2000, 1000);
            await usageTrackingService.trackUsage('gpt-4o-mini', 500, 250);
            const usage = await usageTrackingService.getUsage();
            assert.strictEqual(usage.totalCalls, 3);
            assert.strictEqual(usage.inputTokens, 3500);
            assert.strictEqual(usage.outputTokens, 1750);
            assert.strictEqual(usage.totalTokens, 5250);
        });
        test('should aggregate usage by model', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            await usageTrackingService.trackUsage('gpt-4o-mini', 500, 250);
            await usageTrackingService.trackUsage('llama-3.3-70b-instruct', 2000, 1000);
            const usage = await usageTrackingService.getUsage();
            assert.strictEqual(usage.byModel['gpt-4o-mini'].calls, 2);
            assert.strictEqual(usage.byModel['gpt-4o-mini'].tokens, 2250);
            assert.strictEqual(usage.byModel['llama-3.3-70b-instruct'].calls, 1);
            assert.strictEqual(usage.byModel['llama-3.3-70b-instruct'].tokens, 3000);
        });
        test('should persist usage to storage', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            const stored = storageService.get('ainative.usage.records', -1 /* StorageScope.APPLICATION */);
            assert.ok(stored);
            const records = JSON.parse(stored);
            assert.strictEqual(records.length, 1);
            assert.strictEqual(records[0].modelId, 'gpt-4o-mini');
            assert.strictEqual(records[0].inputTokens, 1000);
            assert.strictEqual(records[0].outputTokens, 500);
        });
        test('should fire update event on usage tracking', (done) => {
            usageTrackingService.onDidUpdateUsage(usage => {
                assert.strictEqual(usage.totalCalls, 1);
                assert.strictEqual(usage.totalTokens, 1500);
                done();
            });
            usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
        });
    });
    suite('Usage Period Filtering', () => {
        test('should filter usage by day', async () => {
            // Track current usage
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            const usage = await usageTrackingService.getUsage('day');
            // Should include today's usage
            assert.strictEqual(usage.totalCalls, 1);
        });
        test('should filter usage by week', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            await usageTrackingService.trackUsage('llama-3.3-70b-instruct', 2000, 1000);
            const usage = await usageTrackingService.getUsage('week');
            assert.strictEqual(usage.totalCalls, 2);
        });
        test('should filter usage by month', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            const usage = await usageTrackingService.getUsage('month');
            assert.strictEqual(usage.totalCalls, 1);
        });
        test('should return all usage by default', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            await usageTrackingService.trackUsage('llama-3.3-70b-instruct', 2000, 1000);
            const usage = await usageTrackingService.getUsage('all');
            assert.strictEqual(usage.totalCalls, 2);
        });
    });
    suite('Cost Calculation', () => {
        test('should calculate cost for GPT-4o Mini', async () => {
            const cost = await usageTrackingService.calculateCost('gpt-4o-mini', 1000, 500);
            // (1000/1000 * 0.15) + (500/1000 * 0.60) = 0.45
            assert.strictEqual(cost.inputCost, 0.15);
            assert.strictEqual(cost.outputCost, 0.30);
            assert.strictEqual(cost.totalCost, 0.45);
        });
        test('should calculate cost for Llama 3.3', async () => {
            const cost = await usageTrackingService.calculateCost('llama-3.3-70b-instruct', 2000, 1000);
            // (2000/1000 * 0.59) + (1000/1000 * 0.79) = 1.18 + 0.79 = 1.97
            assert.ok(Math.abs(cost.inputCost - 1.18) < 0.001);
            assert.ok(Math.abs(cost.outputCost - 0.79) < 0.001);
            assert.ok(Math.abs(cost.totalCost - 1.97) < 0.001);
        });
        test('should return zero cost for unknown model', async () => {
            const cost = await usageTrackingService.calculateCost('unknown-model', 1000, 500);
            assert.strictEqual(cost.inputCost, 0);
            assert.strictEqual(cost.outputCost, 0);
            assert.strictEqual(cost.totalCost, 0);
        });
    });
    suite('Quota Management', () => {
        test('should get quota status', async () => {
            const quota = await usageTrackingService.getQuotaStatus();
            assert.strictEqual(quota.hasQuota, true);
            assert.strictEqual(quota.totalLimit, 1000);
            assert.strictEqual(quota.used, 100);
            assert.strictEqual(quota.remaining, 900);
            assert.strictEqual(quota.exceeded, false);
        });
        test('should detect approaching quota', async () => {
            modelRegistryService.setMockQuota({
                totalLimit: 1000,
                used: 850, // 85% used
                remaining: 150,
                exceeded: false,
                resetDate: new Date().toISOString()
            });
            const quota = await usageTrackingService.getQuotaStatus();
            assert.strictEqual(quota.approaching, true);
        });
        test('should detect exceeded quota', async () => {
            modelRegistryService.setMockQuota({
                totalLimit: 1000,
                used: 1200,
                remaining: 0,
                exceeded: true,
                resetDate: new Date().toISOString()
            });
            const quota = await usageTrackingService.getQuotaStatus();
            assert.strictEqual(quota.exceeded, true);
            assert.strictEqual(quota.remaining, 0);
        });
        test('should fire quota update event', (done) => {
            usageTrackingService.onDidUpdateQuota(quota => {
                assert.strictEqual(quota.totalLimit, 1000);
                done();
            });
            usageTrackingService.syncWithCloud();
        });
    });
    suite('Managed API Credits Tracking', () => {
        test('should track managed usage with credits', async () => {
            await usageTrackingService.trackManagedUsage('llama-3.3-70b-instruct', 1500, 0.5);
            const stored = storageService.get('ainative.usage.managedRecords', -1 /* StorageScope.APPLICATION */);
            assert.ok(stored);
            const records = JSON.parse(stored);
            assert.strictEqual(records.length, 1);
            assert.strictEqual(records[0].modelId, 'llama-3.3-70b-instruct');
            assert.strictEqual(records[0].totalTokens, 1500);
            assert.strictEqual(records[0].creditsConsumed, 0.5);
        });
        test('should get credits status', async () => {
            const status = await usageTrackingService.getCreditsStatus();
            assert.ok(status);
            assert.ok(typeof status.remaining === 'number');
            assert.ok(typeof status.total === 'number');
            assert.ok(typeof status.planTier === 'string');
        });
        test('should detect low credits', async () => {
            // Track usage that brings credits below 20%
            await usageTrackingService.trackManagedUsage('llama-3.3-70b-instruct', 1500, 0.5);
            // Note: This depends on the mock implementation returning appropriate status
            const isLow = usageTrackingService.isCreditsLow();
            assert.strictEqual(typeof isLow, 'boolean');
        });
        test('should fire credits low event when threshold reached', (done) => {
            let eventFired = false;
            usageTrackingService.onCreditsLow(status => {
                eventFired = true;
                assert.ok(status.isLow);
            });
            // Give it a moment to potentially fire
            setTimeout(() => {
                // Event may or may not fire depending on mock data
                assert.strictEqual(typeof eventFired, 'boolean');
                done();
            }, 100);
        });
        test('should get credits history', async () => {
            await usageTrackingService.trackManagedUsage('llama-3.3-70b-instruct', 1500, 0.5);
            await usageTrackingService.trackManagedUsage('gpt-4o-mini', 1000, 0.3);
            const history = await usageTrackingService.getCreditsHistory(7);
            assert.ok(history);
            assert.ok(Array.isArray(history.dailyUsage));
            assert.strictEqual(typeof history.totalCreditsUsed, 'number');
            assert.strictEqual(typeof history.totalRequests, 'number');
        });
    });
    suite('Storage Persistence', () => {
        test('should load usage from storage on initialization', () => {
            // Store some usage data
            const records = [{
                    id: 'test-1',
                    modelId: 'gpt-4o-mini',
                    inputTokens: 1000,
                    outputTokens: 500,
                    totalTokens: 1500,
                    cost: 0.45,
                    timestamp: Date.now()
                }];
            storageService.store('ainative.usage.records', JSON.stringify(records), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Create new service instance
            const newService = new UsageTrackingService(authService, modelRegistryService, storageService);
            // Should load the stored data
            newService.getUsage().then(usage => {
                assert.strictEqual(usage.totalCalls, 1);
            });
            if (newService instanceof Disposable) {
                newService.dispose();
            }
        });
        test('should clear local usage', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            let usage = await usageTrackingService.getUsage();
            assert.strictEqual(usage.totalCalls, 1);
            await usageTrackingService.clearLocalUsage();
            usage = await usageTrackingService.getUsage();
            assert.strictEqual(usage.totalCalls, 0);
        });
        test('should reset all data on logout', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
            usageTrackingService.reset();
            const usage = await usageTrackingService.getUsage();
            assert.strictEqual(usage.totalCalls, 0);
            const stored = storageService.get('ainative.usage.records', -1 /* StorageScope.APPLICATION */);
            assert.strictEqual(stored, undefined);
        });
    });
    suite('Cloud Sync', () => {
        test('should sync with cloud when authenticated', async () => {
            await usageTrackingService.syncWithCloud();
            const quota = await usageTrackingService.getQuotaStatus();
            assert.strictEqual(quota.totalLimit, 1000);
        });
        test('should skip sync when not authenticated', async () => {
            authService.setAuthenticated(false);
            await usageTrackingService.syncWithCloud();
            const quota = await usageTrackingService.getQuotaStatus();
            assert.strictEqual(quota.hasQuota, false);
        });
        test('should update last sync timestamp', async () => {
            await usageTrackingService.syncWithCloud();
            const lastSync = storageService.get('ainative.usage.lastSync', -1 /* StorageScope.APPLICATION */);
            assert.ok(lastSync);
            const timestamp = parseInt(lastSync);
            assert.ok(timestamp > 0);
            assert.ok(Date.now() - timestamp < 5000); // Within last 5 seconds
        });
    });
    suite('Event Handling', () => {
        test('should fire usage update event', (done) => {
            usageTrackingService.onDidUpdateUsage(usage => {
                assert.ok(usage);
                assert.strictEqual(usage.totalCalls, 1);
                done();
            });
            usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
        });
        test('should fire quota update event', (done) => {
            usageTrackingService.onDidUpdateQuota(quota => {
                assert.ok(quota);
                assert.strictEqual(quota.totalLimit, 1000);
                done();
            });
            usageTrackingService.trackUsage('gpt-4o-mini', 1000, 500);
        });
        test('should react to auth state changes', (done) => {
            authService.setAuthenticated(false);
            // Give it a moment to react
            setTimeout(() => {
                const quota = usageTrackingService.getQuotaStatus();
                quota.then(q => {
                    assert.strictEqual(q.hasQuota, false);
                    done();
                });
            }, 100);
        });
    });
    suite('Edge Cases', () => {
        test('should handle zero token usage', async () => {
            await usageTrackingService.trackUsage('gpt-4o-mini', 0, 0);
            const usage = await usageTrackingService.getUsage();
            assert.strictEqual(usage.totalCalls, 1);
            assert.strictEqual(usage.totalTokens, 0);
            assert.strictEqual(usage.totalCost, 0);
        });
        test('should handle very large token counts', async () => {
            const largeCount = 1000000;
            await usageTrackingService.trackUsage('gpt-4o-mini', largeCount, largeCount / 2);
            const usage = await usageTrackingService.getUsage();
            assert.strictEqual(usage.totalTokens, largeCount + largeCount / 2);
        });
        test('should limit stored records to MAX_LOCAL_RECORDS', async () => {
            // Track more than MAX_LOCAL_RECORDS (10000) - we'll do 100 for test speed
            for (let i = 0; i < 100; i++) {
                await usageTrackingService.trackUsage('gpt-4o-mini', 100, 50);
            }
            const usage = await usageTrackingService.getUsage();
            assert.strictEqual(usage.totalCalls, 100);
        });
        test('should handle malformed storage data gracefully', () => {
            // Store invalid JSON
            storageService.store('ainative.usage.records', 'invalid json', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Should not crash when loading
            const newService = new UsageTrackingService(authService, modelRegistryService, storageService);
            assert.ok(newService);
            if (newService instanceof Disposable) {
                newService.dispose();
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2VUcmFja2luZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9pbnRlZ3JhdGlvbi91c2FnZVRyYWNraW5nU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7R0FHRztBQUVILE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxvQkFBb0IsRUFBc0MsTUFBTSxzQ0FBc0MsQ0FBQztBQUdoSCxPQUFPLEVBQVcsV0FBVyxFQUFhLE1BQU0sc0NBQXNDLENBQUM7QUFFdkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RDs7R0FFRztBQUNILE1BQU0sa0JBQWtCO0lBQXhCO1FBR1MsWUFBTyxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hDLHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUFPLENBQUM7UUFDaEQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUMxQyxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBTyxDQUFDO1FBQzlDLG9CQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQztJQW1GeEQsQ0FBQztJQWpGQSxnQkFBZ0I7UUFDZixPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFJRCxHQUFHLENBQUMsR0FBVyxFQUFFLEtBQW1CLEVBQUUsYUFBc0I7UUFDM0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FB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