/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Usage Tracking Service
 * Tracks local token usage, calculates costs, monitors quotas, and syncs with cloud API
 */

import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes.js';
import { IAIModelRegistryService } from './aiModelRegistryService.js';
import { AIModel } from './aiModelRegistryTypes.js';

/**
 * Usage record for a single model invocation
 */
export interface UsageRecord {
	readonly id: string;
	readonly modelId: string;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly totalTokens: number;
	readonly cost: number;
	readonly timestamp: number;
}

/**
 * Aggregated usage statistics
 */
export interface AggregatedUsage {
	readonly totalCalls: number;
	readonly totalTokens: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly totalCost: number;
	readonly byModel: Record<string, {
		readonly calls: number;
		readonly tokens: number;
		readonly inputTokens: number;
		readonly outputTokens: number;
		readonly cost: number;
	}>;
	readonly periodStart: number;
	readonly periodEnd: number;
}

/**
 * Quota status information
 */
export interface QuotaStatus {
	readonly hasQuota: boolean;
	readonly totalLimit: number;
	readonly used: number;
	readonly remaining: number;
	readonly exceeded: boolean;
	readonly resetDate?: string;
	readonly warningThreshold: number; // 80% by default
	readonly approaching: boolean; // True if usage > warningThreshold
}

/**
 * Cost calculation result
 */
export interface CostCalculation {
	readonly inputCost: number;
	readonly outputCost: number;
	readonly totalCost: number;
}

/**
 * Service interface for usage tracking
 */
export const IUsageTrackingService = createDecorator<IUsageTrackingService>('usageTrackingService');

export interface IUsageTrackingService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when usage is updated
	 */
	readonly onDidUpdateUsage: Event<AggregatedUsage>;

	/**
	 * Event fired when quota status changes
	 */
	readonly onDidUpdateQuota: Event<QuotaStatus>;

	/**
	 * Track a model invocation
	 * @param modelId Model identifier
	 * @param inputTokens Number of input tokens
	 * @param outputTokens Number of output tokens
	 */
	trackUsage(modelId: string, inputTokens: number, outputTokens: number): Promise<void>;

	/**
	 * Get current usage statistics
	 * @param period Optional period filter ('day' | 'week' | 'month' | 'all')
	 * @returns Aggregated usage statistics
	 */
	getUsage(period?: 'day' | 'week' | 'month' | 'all'): Promise<AggregatedUsage>;

	/**
	 * Get quota status
	 * @returns Current quota status
	 */
	getQuotaStatus(): Promise<QuotaStatus>;

	/**
	 * Calculate cost for a potential usage
	 * @param modelId Model identifier
	 * @param inputTokens Number of input tokens
	 * @param outputTokens Number of output tokens
	 * @returns Cost calculation
	 */
	calculateCost(modelId: string, inputTokens: number, outputTokens: number): Promise<CostCalculation>;

	/**
	 * Sync local usage with cloud API
	 */
	syncWithCloud(): Promise<void>;

	/**
	 * Clear all local usage data
	 */
	clearLocalUsage(): Promise<void>;

	/**
	 * Reset usage tracking (called on logout)
	 */
	reset(): void;
}

/**
 * Usage Tracking Service Implementation
 */
export class UsageTrackingService extends Disposable implements IUsageTrackingService {
	readonly _serviceBrand: undefined;

	private static readonly STORAGE_KEY_USAGE_RECORDS = 'ainative.usage.records';
	private static readonly STORAGE_KEY_LAST_SYNC = 'ainative.usage.lastSync';
	private static readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
	private static readonly QUOTA_WARNING_THRESHOLD = 0.8; // 80%
	private static readonly MAX_LOCAL_RECORDS = 10000; // Limit local storage

	private readonly _onDidUpdateUsage = this._register(new Emitter<AggregatedUsage>());
	readonly onDidUpdateUsage = this._onDidUpdateUsage.event;

	private readonly _onDidUpdateQuota = this._register(new Emitter<QuotaStatus>());
	readonly onDidUpdateQuota = this._onDidUpdateQuota.event;

	private _usageRecords: UsageRecord[] = [];
	private _quotaStatus: QuotaStatus | null = null;
	private _syncTimer: any = null;
	private _modelCache: Map<string, AIModel> = new Map();

	constructor(
		@IAINativeCloudAuthService private readonly cloudAuthService: IAINativeCloudAuthService,
		@IAIModelRegistryService private readonly modelRegistryService: IAIModelRegistryService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();

		this._loadFromStorage();
		this._startSyncTimer();

		// Listen to auth state changes
		this._register(this.cloudAuthService.onDidChangeAuthState(state => {
			if (state === 'authenticated') {
				this.syncWithCloud().catch(err =>
					console.error('[UsageTrackingService] Failed to sync on auth:', err)
				);
			} else if (state === 'unauthenticated') {
				this.reset();
			}
		}));
	}

	/**
	 * Track a model invocation
	 */
	async trackUsage(modelId: string, inputTokens: number, outputTokens: number): Promise<void> {
		try {
			// Calculate cost
			const costCalc = await this.calculateCost(modelId, inputTokens, outputTokens);

			// Create usage record
			const record: UsageRecord = {
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
			if (this._usageRecords.length > UsageTrackingService.MAX_LOCAL_RECORDS) {
				this._usageRecords = this._usageRecords.slice(-UsageTrackingService.MAX_LOCAL_RECORDS);
			}

			// Save to storage
			await this._saveToStorage();

			// Update quota status
			await this._updateQuotaStatus();

			// Fire update event
			const usage = await this.getUsage();
			this._onDidUpdateUsage.fire(usage);

			console.log(`[UsageTrackingService] Tracked usage: ${modelId}, ${inputTokens}/${outputTokens} tokens, $${costCalc.totalCost.toFixed(6)}`);

		} catch (error) {
			console.error('[UsageTrackingService] Failed to track usage:', error);
		}
	}

	/**
	 * Get current usage statistics
	 */
	async getUsage(period: 'day' | 'week' | 'month' | 'all' = 'all'): Promise<AggregatedUsage> {
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
		const byModel: Record<string, any> = {};
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
	async getQuotaStatus(): Promise<QuotaStatus> {
		if (!this._quotaStatus) {
			await this._updateQuotaStatus();
		}

		return this._quotaStatus ?? this._getDefaultQuotaStatus();
	}

	/**
	 * Calculate cost for a potential usage
	 */
	async calculateCost(modelId: string, inputTokens: number, outputTokens: number): Promise<CostCalculation> {
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

		} catch (error) {
			console.error('[UsageTrackingService] Failed to calculate cost:', error);
			return { inputCost: 0, outputCost: 0, totalCost: 0 };
		}
	}

	/**
	 * Sync local usage with cloud API
	 */
	async syncWithCloud(): Promise<void> {
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
				warningThreshold: UsageTrackingService.QUOTA_WARNING_THRESHOLD,
				approaching: quota.used / quota.totalLimit >= UsageTrackingService.QUOTA_WARNING_THRESHOLD
			};

			this._onDidUpdateQuota.fire(this._quotaStatus);

			// Update last sync timestamp
			this.storageService.store(
				UsageTrackingService.STORAGE_KEY_LAST_SYNC,
				Date.now().toString(),
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);

			console.log('[UsageTrackingService] Cloud sync completed successfully');

		} catch (error) {
			console.error('[UsageTrackingService] Failed to sync with cloud:', error);
		}
	}

	/**
	 * Clear all local usage data
	 */
	async clearLocalUsage(): Promise<void> {
		this._usageRecords = [];
		await this._saveToStorage();
		console.log('[UsageTrackingService] Local usage data cleared');
	}

	/**
	 * Reset usage tracking (called on logout)
	 */
	reset(): void {
		this._usageRecords = [];
		this._quotaStatus = null;
		this._modelCache.clear();

		// Clear storage
		this.storageService.remove(UsageTrackingService.STORAGE_KEY_USAGE_RECORDS, StorageScope.APPLICATION);
		this.storageService.remove(UsageTrackingService.STORAGE_KEY_LAST_SYNC, StorageScope.APPLICATION);

		console.log('[UsageTrackingService] Reset completed');
	}

	/**
	 * Load usage records from storage
	 */
	private _loadFromStorage(): void {
		try {
			const data = this.storageService.get(
				UsageTrackingService.STORAGE_KEY_USAGE_RECORDS,
				StorageScope.APPLICATION
			);

			if (data) {
				this._usageRecords = JSON.parse(data);
				console.log(`[UsageTrackingService] Loaded ${this._usageRecords.length} usage records from storage`);
			}
		} catch (error) {
			console.error('[UsageTrackingService] Failed to load from storage:', error);
			this._usageRecords = [];
		}
	}

	/**
	 * Save usage records to storage
	 */
	private async _saveToStorage(): Promise<void> {
		try {
			this.storageService.store(
				UsageTrackingService.STORAGE_KEY_USAGE_RECORDS,
				JSON.stringify(this._usageRecords),
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);
		} catch (error) {
			console.error('[UsageTrackingService] Failed to save to storage:', error);
		}
	}

	/**
	 * Get model from cache or registry
	 */
	private async _getModel(modelId: string): Promise<AIModel | null> {
		// Check cache first
		if (this._modelCache.has(modelId)) {
			return this._modelCache.get(modelId)!;
		}

		// Fetch from registry
		try {
			const model = await this.modelRegistryService.getModel(modelId);
			this._modelCache.set(modelId, model);
			return model;
		} catch (error) {
			console.error(`[UsageTrackingService] Failed to fetch model ${modelId}:`, error);
			return null;
		}
	}

	/**
	 * Update quota status from cloud
	 */
	private async _updateQuotaStatus(): Promise<void> {
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
				warningThreshold: UsageTrackingService.QUOTA_WARNING_THRESHOLD,
				approaching: quota.totalLimit > 0 && (quota.used / quota.totalLimit) >= UsageTrackingService.QUOTA_WARNING_THRESHOLD
			};

			this._onDidUpdateQuota.fire(this._quotaStatus);

		} catch (error) {
			console.error('[UsageTrackingService] Failed to update quota status:', error);
			this._quotaStatus = this._getDefaultQuotaStatus();
		}
	}

	/**
	 * Get default quota status
	 */
	private _getDefaultQuotaStatus(): QuotaStatus {
		return {
			hasQuota: false,
			totalLimit: 0,
			used: 0,
			remaining: 0,
			exceeded: false,
			warningThreshold: UsageTrackingService.QUOTA_WARNING_THRESHOLD,
			approaching: false
		};
	}

	/**
	 * Start sync timer
	 */
	private _startSyncTimer(): void {
		// Clear existing timer
		if (this._syncTimer) {
			clearInterval(this._syncTimer);
		}

		// Set up periodic sync
		this._syncTimer = setInterval(() => {
			if (this.cloudAuthService.isAuthenticated()) {
				this.syncWithCloud().catch(err =>
					console.error('[UsageTrackingService] Auto-sync failed:', err)
				);
			}
		}, UsageTrackingService.SYNC_INTERVAL_MS);

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
	private _generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	override dispose(): void {
		if (this._syncTimer) {
			clearInterval(this._syncTimer);
			this._syncTimer = null;
		}
		super.dispose();
	}
}

// Register the service with VS Code dependency injection
registerSingleton(IUsageTrackingService, UsageTrackingService, InstantiationType.Delayed);
