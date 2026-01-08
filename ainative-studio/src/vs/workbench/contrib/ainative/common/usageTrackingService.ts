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
import {
	UsageRecord,
	AggregatedUsage,
	QuotaStatus,
	CostCalculation,
	UsagePeriod,
	ManagedUsageRecord,
	CreditsStatus,
	CreditsHistory
} from './usageTrackingTypes.js';

// Re-export types for backwards compatibility
export {
	UsageRecord,
	AggregatedUsage,
	QuotaStatus,
	CostCalculation,
	UsagePeriod,
	ManagedUsageRecord,
	CreditsStatus,
	CreditsHistory
} from './usageTrackingTypes.js';

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
	 * Event fired when credits status is updated
	 */
	readonly onDidUpdateCredits: Event<CreditsStatus>;

	/**
	 * Event fired when credits are running low
	 */
	readonly onCreditsLow: Event<CreditsStatus>;

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
	getUsage(period?: UsagePeriod): Promise<AggregatedUsage>;

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

	/**
	 * Track managed API usage with credits
	 * @param modelId Model identifier
	 * @param tokensUsed Total tokens consumed
	 * @param creditsConsumed Credits charged for this invocation
	 */
	trackManagedUsage(modelId: string, tokensUsed: number, creditsConsumed: number): Promise<void>;

	/**
	 * Get current credits status from backend
	 * @returns Current credits status
	 */
	getCreditsStatus(): Promise<CreditsStatus>;

	/**
	 * Check if credits are running low (< 20% remaining)
	 * @returns True if credits are low
	 */
	isCreditsLow(): boolean;

	/**
	 * Get credits usage history
	 * @param days Number of days to retrieve (default: 30)
	 * @returns Credits usage history
	 */
	getCreditsHistory(days?: number): Promise<CreditsHistory>;
}

/**
 * Usage Tracking Service Implementation
 */
export class UsageTrackingService extends Disposable implements IUsageTrackingService {
	readonly _serviceBrand: undefined;

	private static readonly STORAGE_KEY_USAGE_RECORDS = 'ainative.usage.records';
	private static readonly STORAGE_KEY_LAST_SYNC = 'ainative.usage.lastSync';
	private static readonly STORAGE_KEY_CREDITS_STATUS = 'ainative.usage.creditsStatus';
	private static readonly STORAGE_KEY_MANAGED_USAGE = 'ainative.usage.managedRecords';
	private static readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
	private static readonly QUOTA_WARNING_THRESHOLD = 0.8; // 80%
	private static readonly MAX_LOCAL_RECORDS = 10000; // Limit local storage

	private readonly _onDidUpdateUsage = this._register(new Emitter<AggregatedUsage>());
	readonly onDidUpdateUsage = this._onDidUpdateUsage.event;

	private readonly _onDidUpdateQuota = this._register(new Emitter<QuotaStatus>());
	readonly onDidUpdateQuota = this._onDidUpdateQuota.event;

	private readonly _onDidUpdateCredits = this._register(new Emitter<CreditsStatus>());
	readonly onDidUpdateCredits = this._onDidUpdateCredits.event;

	private readonly _onCreditsLow = this._register(new Emitter<CreditsStatus>());
	readonly onCreditsLow = this._onCreditsLow.event;

	private _usageRecords: UsageRecord[] = [];
	private _managedUsageRecords: ManagedUsageRecord[] = [];
	private _quotaStatus: QuotaStatus | null = null;
	private _creditsStatus: CreditsStatus | null = null;
	private _syncTimer: any = null;
	private _modelCache: Map<string, AIModel> = new Map();

	constructor(
		@IAINativeCloudAuthService private readonly cloudAuthService: IAINativeCloudAuthService,
		@IAIModelRegistryService private readonly modelRegistryService: IAIModelRegistryService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();

		this._loadFromStorage();
		this._loadManagedUsageFromStorage();
		this._startSyncTimer();

		// Listen to auth state changes
		this._register(this.cloudAuthService.onDidChangeAuthState(state => {
			if (state === 'authenticated') {
				this.syncWithCloud().catch(err =>
					console.error('[UsageTrackingService] Failed to sync on auth:', err)
				);
				this._syncCreditsStatus().catch(err =>
					console.error('[UsageTrackingService] Failed to sync credits on auth:', err)
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
	async getUsage(period: UsagePeriod = 'all'): Promise<AggregatedUsage> {
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
		this._managedUsageRecords = [];
		this._quotaStatus = null;
		this._creditsStatus = null;
		this._modelCache.clear();

		// Clear storage
		this.storageService.remove(UsageTrackingService.STORAGE_KEY_USAGE_RECORDS, StorageScope.APPLICATION);
		this.storageService.remove(UsageTrackingService.STORAGE_KEY_LAST_SYNC, StorageScope.APPLICATION);
		this.storageService.remove(UsageTrackingService.STORAGE_KEY_CREDITS_STATUS, StorageScope.APPLICATION);
		this.storageService.remove(UsageTrackingService.STORAGE_KEY_MANAGED_USAGE, StorageScope.APPLICATION);

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

	/**
	 * Track managed API usage with credits
	 */
	async trackManagedUsage(modelId: string, tokensUsed: number, creditsConsumed: number): Promise<void> {
		try {
			// Fetch current credits status to get remaining balance and plan tier
			const creditsStatus = await this.getCreditsStatus();

			// Create managed usage record
			const record: ManagedUsageRecord = {
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
			if (this._managedUsageRecords.length > UsageTrackingService.MAX_LOCAL_RECORDS) {
				this._managedUsageRecords = this._managedUsageRecords.slice(-UsageTrackingService.MAX_LOCAL_RECORDS);
			}

			// Save to storage
			await this._saveManagedUsageToStorage();

			// Update credits status
			await this._syncCreditsStatus();

			console.log(`[UsageTrackingService] Tracked managed usage: ${modelId}, ${tokensUsed} tokens, ${creditsConsumed} credits`);

		} catch (error) {
			console.error('[UsageTrackingService] Failed to track managed usage:', error);
		}
	}

	/**
	 * Get current credits status from backend
	 */
	async getCreditsStatus(): Promise<CreditsStatus> {
		if (!this.cloudAuthService.isAuthenticated()) {
			console.log('[UsageTrackingService] Not authenticated, returning default credits status');
			return this._getDefaultCreditsStatus();
		}

		try {
			// Sync with backend
			await this._syncCreditsStatus();

			return this._creditsStatus ?? this._getDefaultCreditsStatus();

		} catch (error) {
			console.error('[UsageTrackingService] Failed to get credits status:', error);
			return this._creditsStatus ?? this._getDefaultCreditsStatus();
		}
	}

	/**
	 * Check if credits are running low (< 20% remaining)
	 */
	isCreditsLow(): boolean {
		if (!this._creditsStatus) {
			return false;
		}

		return this._creditsStatus.isLow;
	}

	/**
	 * Get credits usage history
	 */
	async getCreditsHistory(days: number = 30): Promise<CreditsHistory> {
		try {
			// TODO: This will be replaced with actual backend API call when ManagedChatAPIService is implemented
			// For now, calculate from local managed usage records

			const now = Date.now();
			const startTime = now - (days * 24 * 60 * 60 * 1000);

			// Filter records by time period
			const periodRecords = this._managedUsageRecords.filter(r => r.timestamp >= startTime);

			// Group by date
			const dailyUsageMap = new Map<string, { creditsUsed: number; requestCount: number; tokensUsed: number }>();

			for (const record of periodRecords) {
				const date = new Date(record.timestamp).toISOString().split('T')[0];

				if (!dailyUsageMap.has(date)) {
					dailyUsageMap.set(date, { creditsUsed: 0, requestCount: 0, tokensUsed: 0 });
				}

				const dayData = dailyUsageMap.get(date)!;
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

		} catch (error) {
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
	private async _syncCreditsStatus(): Promise<void> {
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
				const stored = this.storageService.get(
					UsageTrackingService.STORAGE_KEY_CREDITS_STATUS,
					StorageScope.APPLICATION
				);

				if (stored) {
					this._creditsStatus = JSON.parse(stored);
				} else {
					this._creditsStatus = this._getDefaultCreditsStatus();
				}
			}

			// Fire events
			if (this._creditsStatus) {
				this._onDidUpdateCredits.fire(this._creditsStatus);

				if (this._creditsStatus.isLow) {
					this._onCreditsLow.fire(this._creditsStatus);
				}
			}

			// Save to storage
			this.storageService.store(
				UsageTrackingService.STORAGE_KEY_CREDITS_STATUS,
				JSON.stringify(this._creditsStatus),
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);

			console.log('[UsageTrackingService] Credits status synced');

		} catch (error) {
			console.error('[UsageTrackingService] Failed to sync credits status:', error);
			this._creditsStatus = this._getDefaultCreditsStatus();
		}
	}

	/**
	 * Get default credits status
	 */
	private _getDefaultCreditsStatus(): CreditsStatus {
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
	private async _saveManagedUsageToStorage(): Promise<void> {
		try {
			this.storageService.store(
				UsageTrackingService.STORAGE_KEY_MANAGED_USAGE,
				JSON.stringify(this._managedUsageRecords),
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);
		} catch (error) {
			console.error('[UsageTrackingService] Failed to save managed usage to storage:', error);
		}
	}

	/**
	 * Load managed usage records from storage
	 */
	private _loadManagedUsageFromStorage(): void {
		try {
			const data = this.storageService.get(
				UsageTrackingService.STORAGE_KEY_MANAGED_USAGE,
				StorageScope.APPLICATION
			);

			if (data) {
				this._managedUsageRecords = JSON.parse(data);
				console.log(`[UsageTrackingService] Loaded ${this._managedUsageRecords.length} managed usage records from storage`);
			}
		} catch (error) {
			console.error('[UsageTrackingService] Failed to load managed usage from storage:', error);
			this._managedUsageRecords = [];
		}
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
