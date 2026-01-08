/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import {
	UsageTrackingService,
	IUsageTrackingService,
	AggregatedUsage,
	QuotaStatus
} from '../../common/usageTrackingService.js';
import { IAINativeCloudAuthService, CloudAuthState } from '../../common/ainativeCloudAuthTypes.js';
import { IAIModelRegistryService } from '../../common/aiModelRegistryService.js';
import { AIModel, PricingTier, ModelCapability, QuotaInfo, UsageStats } from '../../common/aiModelRegistryTypes.js';
import { Emitter } from '../../../../../base/common/event.js';

/**
 * Mock Storage Service for testing
 */
class MockStorageService implements IStorageService {
	readonly _serviceBrand: undefined;
	private storage: Map<string, Map<string, string>> = new Map();
	private readonly _onDidChangeValueEmitter = new Emitter<any>();
	readonly onDidChangeValue = this._onDidChangeValueEmitter.event;
	private readonly _onDidChangeTargetEmitter = new Emitter<any>();
	readonly onDidChangeTarget = this._onDidChangeTargetEmitter.event;
	private readonly _onWillSaveStateEmitter = new Emitter<any>();
	readonly onWillSaveState = this._onWillSaveStateEmitter.event;

	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		const scopeMap = this.storage.get(scope.toString());
		return scopeMap?.get(key) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue: boolean): boolean;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
		const value = this.get(key, scope);
		return value !== undefined ? value === 'true' : fallbackValue;
	}

	getNumber(key: string, scope: StorageScope, fallbackValue: number): number;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
		const value = this.get(key, scope);
		return value !== undefined ? parseInt(value, 10) : fallbackValue;
	}

	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue: T): T;
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined;
	getObject<T extends object>(key: string, scope: StorageScope, fallbackValue?: T): T | undefined {
		const value = this.get(key, scope);
		return value ? JSON.parse(value) : fallbackValue;
	}

	store(key: string, value: string | boolean | number | undefined | null, scope: StorageScope, target: StorageTarget): void {
		if (!this.storage.has(scope.toString())) {
			this.storage.set(scope.toString(), new Map());
		}
		const scopeMap = this.storage.get(scope.toString())!;
		if (value === undefined || value === null) {
			scopeMap.delete(key);
		} else {
			scopeMap.set(key, String(value));
		}
	}

	remove(key: string, scope: StorageScope): void {
		this.storage.get(scope.toString())?.delete(key);
	}

	keys(scope: StorageScope, target: StorageTarget): string[] {
		return Array.from(this.storage.get(scope.toString())?.keys() ?? []);
	}

	switch(): Promise<void> {
		return Promise.resolve();
	}

	hasScope(): boolean {
		return true;
	}

	logStorage(): void {
		// No-op for testing
	}

	migrate(): Promise<void> {
		return Promise.resolve();
	}

	isNew(): boolean {
		return false;
	}

	flush(): Promise<void> {
		return Promise.resolve();
	}

	log(): void {
		// No-op for testing
	}

	storeAll(toStore: [key: string, value: any][], overwrite: boolean): Promise<void> {
		for (const [key, value] of toStore) {
			// Simplified - using StorageScope.PROFILE as default
			this.store(key, value, StorageScope.PROFILE, StorageTarget.MACHINE);
		}
		return Promise.resolve();
	}

	optimize(scope: StorageScope): Promise<void> {
		return Promise.resolve();
	}
}

/**
 * Mock Cloud Auth Service
 */
class MockCloudAuthService implements IAINativeCloudAuthService {
	readonly _serviceBrand: undefined;
	private _isAuthenticated = false;
	private _authState = CloudAuthState.Unauthenticated;
	private readonly _onDidChangeAuthStateEmitter = new Emitter<CloudAuthState>();
	readonly onDidChangeAuthState = this._onDidChangeAuthStateEmitter.event;
	private readonly _onDidUpdateUserEmitter = new Emitter<any>();
	readonly onDidUpdateUser = this._onDidUpdateUserEmitter.event;

	setAuthenticated(authenticated: boolean): void {
		this._isAuthenticated = authenticated;
		this._authState = authenticated ? CloudAuthState.Authenticated : CloudAuthState.Unauthenticated;
		this._onDidChangeAuthStateEmitter.fire(this._authState);
	}

	isAuthenticated(): boolean {
		return this._isAuthenticated;
	}

	getAuthState(): CloudAuthState {
		return this._authState;
	}

	async getAccessToken(): Promise<string | null> {
		return this._isAuthenticated ? 'mock-token' : null;
	}

	getAccessTokenSync(): string | null {
		return this._isAuthenticated ? 'mock-token' : null;
	}

	// Stub methods
	async register(): Promise<any> { throw new Error('Not implemented'); }
	async login(): Promise<any> { throw new Error('Not implemented'); }
	async logout(): Promise<void> { }
	async requestPasswordReset(): Promise<any> { throw new Error('Not implemented'); }
	async confirmPasswordReset(): Promise<any> { throw new Error('Not implemented'); }
	async changePassword(): Promise<any> { throw new Error('Not implemented'); }
	async refreshToken(): Promise<string> { throw new Error('Not implemented'); }
	async validateToken(): Promise<any> { throw new Error('Not implemented'); }
	async getCurrentUser(): Promise<any> { return null; }
	getUser(): any { return null; }
	async resendEmailVerification(): Promise<any> { throw new Error('Not implemented'); }
	async verifyEmail(): Promise<any> { throw new Error('Not implemented'); }
}

/**
 * Mock Model Registry Service
 */
class MockModelRegistryService implements IAIModelRegistryService {
	readonly _serviceBrand: undefined;
	private readonly _onDidUpdateModelsEmitter = new Emitter<AIModel[]>();
	readonly onDidUpdateModels = this._onDidUpdateModelsEmitter.event;
	private readonly _onDidChangeModelSelectionEmitter = new Emitter<any>();
	readonly onDidChangeModelSelection = this._onDidChangeModelSelectionEmitter.event;

	private models: Map<string, AIModel> = new Map();
	private quotaInfo: QuotaInfo = {
		totalLimit: 10000,
		used: 0,
		remaining: 10000,
		exceeded: false
	};

	addModel(model: AIModel): void {
		this.models.set(model.id, model);
	}

	setQuotaInfo(quota: QuotaInfo): void {
		this.quotaInfo = quota;
	}

	async listModels(): Promise<AIModel[]> {
		return Array.from(this.models.values());
	}

	async getModel(modelId: string): Promise<AIModel> {
		const model = this.models.get(modelId);
		if (!model) {
			throw new Error(`Model not found: ${modelId}`);
		}
		return model;
	}

	async getQuota(): Promise<QuotaInfo> {
		return this.quotaInfo;
	}

	async getUsageStats(): Promise<UsageStats> {
		return {
			totalCalls: 0,
			totalTokens: 0,
			inputTokens: 0,
			outputTokens: 0,
			totalCost: 0
		};
	}

	// Stub methods
	async selectModel(): Promise<void> { }
	async getSelectedModel(): Promise<AIModel | null> { return null; }
	async invokeModel(): Promise<any> { throw new Error('Not implemented'); }
	async streamModel(): Promise<void> { throw new Error('Not implemented'); }
	async refreshModels(): Promise<void> { }
}

suite('UsageTrackingService', () => {
	const disposables = new DisposableStore();
	let storageService: MockStorageService;
	let cloudAuthService: MockCloudAuthService;
	let modelRegistryService: MockModelRegistryService;
	let usageTrackingService: IUsageTrackingService;

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

		usageTrackingService = disposables.add(new UsageTrackingService(
			cloudAuthService,
			modelRegistryService,
			storageService
		));
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
		const stored = storageService.get('ainative.usage.records', StorageScope.APPLICATION);
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
		storageService.store('ainative.usage.records', JSON.stringify(records), StorageScope.APPLICATION, StorageTarget.MACHINE);

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
		storageService.store('ainative.usage.records', JSON.stringify(records), StorageScope.APPLICATION, StorageTarget.MACHINE);

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
		let receivedUsage: AggregatedUsage | null = null;

		disposables.add(usageTrackingService.onDidUpdateUsage(usage => {
			eventFired = true;
			receivedUsage = usage;
		}));

		await usageTrackingService.trackUsage('claude-3-opus', 1000, 500);

		ok(eventFired, 'Usage update event should fire');
		ok(receivedUsage);
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
		let receivedQuota: QuotaStatus | null = null;

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
		const stored = storageService.get('ainative.usage.records', StorageScope.APPLICATION);
		strictEqual(stored, undefined);
	});

	test('should sync to cloud on authentication', async () => {
		let syncCalled = false;

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

		const stored = storageService.get('ainative.usage.records', StorageScope.APPLICATION);
		const records = JSON.parse(stored!);

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
		storageService.store('ainative.usage.records', JSON.stringify(records), StorageScope.APPLICATION, StorageTarget.MACHINE);

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
		storageService.store('ainative.usage.records', JSON.stringify(records), StorageScope.APPLICATION, StorageTarget.MACHINE);

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
