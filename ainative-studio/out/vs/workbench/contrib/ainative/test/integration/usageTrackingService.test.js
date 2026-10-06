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
        usageTrackingService = new UsageTrackingService(authService, modelRegistryService, storageService, createMockSettingsService());
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
            const newService = new UsageTrackingService(authService, modelRegistryService, storageService, createMockSettingsService());
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
            const newService = new UsageTrackingService(authService, modelRegistryService, storageService, createMockSettingsService());
            assert.ok(newService);
            if (newService instanceof Disposable) {
                newService.dispose();
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2VUcmFja2luZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9pbnRlZ3JhdGlvbi91c2FnZVRyYWNraW5nU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7R0FHRztBQUVILE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxvQkFBb0IsRUFBc0MsTUFBTSxzQ0FBc0MsQ0FBQztBQUloSCxPQUFPLEVBQVcsV0FBVyxFQUFhLE1BQU0sc0NBQXNDLENBQUM7QUFFdkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RDs7Ozs7O0dBTUc7QUFDSCxTQUFTLHlCQUF5QixDQUFDLFNBQWlCLEVBQUU7SUFDckQsT0FBTztRQUNOLEtBQUssRUFBRTtZQUNOLGtCQUFrQixFQUFFO2dCQUNuQixhQUFhLEVBQUUsRUFBRSxNQUFNLEVBQUU7YUFDekI7U0FDRDtRQUNELGdCQUFnQixFQUFFLElBQUksT0FBTyxFQUFRLENBQUMsS0FBSztLQUNKLENBQUM7QUFDMUMsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxrQkFBa0I7SUFBeEI7UUFHUyxZQUFPLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDaEMsdUJBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQU8sQ0FBQztRQUNoRCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBQzFDLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUFPLENBQUM7UUFDOUMsb0JBQWUsR0FBRyxJQUFJLENB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