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
import { IAINativeSettingsService } from './ainativeSettingsService.js';
import { AIModel } from './aiModelRegistryTypes.js';
import { ManagedChatAPIService } from './managedChatAPIService.js';
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
 * Wire format of `GET /api/v1/public/credits/balance`.
 *
 * CONFIRMED (issue #147) against the backend's live OpenAPI document at
 * `https://api.ainative.studio/openapi.json`, schema `CreditsBalanceResponse`.
 * This supersedes the `credits_consumed` / `credits_remaining` field names
 * guessed in issue #147's original description — those names belong to the
 * chat-completion response, not to the balance endpoint.
 *
 * The schema's own description states it is "returned as a bare object, NOT
 * wrapped in a success/data envelope (unlike its sibling credits endpoints)",
 * so this is parsed at the top level with no `{ success, data }` unwrapping.
 *
 * Required per the spec: every field below except `period_end`, which is
 * explicitly nullable.
 */
interface CreditsBalanceResponse {
	/** Credits allocated for the period. Integer per the spec. */
	readonly total_credits: number;
	readonly used_credits: number;
	/** Remaining credits. See `unlimited` before treating this as a cap. */
	readonly remaining_credits: number;
	/** True on unmetered plans, where the remaining/total figures are not a quota. */
	readonly unlimited: boolean;
	/** Plan tier name, e.g. 'free' / 'pro'. Maps to CreditsStatus.planTier. */
	readonly plan: string;
	readonly period_start: string;
	readonly period_end?: string | null;
	/** Percentage of the allocation consumed, 0-100. */
	readonly usage_percentage: number;
}

/**
 * Wire format of `GET /api/v1/managed/usage/history?days=N`.
 *
 * CONFIRMED (issue #147) against the live OpenAPI document, schemas
 * `UsageHistoryResponse` / `UsageHistoryEntry`. Entries are documented as
 * "sorted by date descending"; this service re-sorts ascending because
 * CreditsHistory.dailyUsage is consumed chronologically.
 *
 * Unlike the balance endpoint this one is on the `/api/v1/managed` surface and
 * is therefore JWT-authenticated (see BACKEND_CONTRACT_NOTES.md section 2b).
 */
interface UsageHistoryEntryResponse {
	/** YYYY-MM-DD. */
	readonly date: string;
	readonly requests: number;
	readonly credits_used: number;
	readonly tokens: number;
}

interface UsageHistoryResponseBody {
	readonly history: readonly UsageHistoryEntryResponse[];
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
	private static readonly CREDITS_LOW_THRESHOLD = 0.2; // 20% remaining

	/**
	 * Minimum gap between balance fetches. `trackManagedUsage()` triggers a sync
	 * after every managed request, so without this a burst of chat turns would
	 * fire one HTTP request per turn at the balance endpoint. Within this window
	 * the cached `_creditsStatus` is served and decremented locally instead.
	 */
	private static readonly CREDITS_SYNC_MIN_INTERVAL_MS = 30 * 1000; // 30 seconds

	/** Request timeout for the balance/history fetches. */
	private static readonly CREDITS_FETCH_TIMEOUT_MS = 10 * 1000; // 10 seconds

	/**
	 * Authoritative usage history. CONFIRMED live (401 = present, auth-gated)
	 * and present in the backend's OpenAPI document as `UsageHistoryResponse`.
	 *
	 * Unlike the credits balance this is on the `/api/v1/managed` surface, so it
	 * is JWT-authenticated (`Authorization: Bearer`), not `X-API-Key`.
	 * See docs/api/BACKEND_CONTRACT_NOTES.md section 3.
	 */
	private static readonly USAGE_HISTORY_URL = 'https://api.ainative.studio/api/v1/managed/usage/history';

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

	/** Timestamp of the last *successful* balance fetch, for rate limiting. */
	private _lastCreditsSyncAt = 0;
	/** In-flight balance fetch, so concurrent callers share one request. */
	private _inFlightCreditsSync: Promise<void> | null = null;

	constructor(
		@IAINativeCloudAuthService private readonly cloudAuthService: IAINativeCloudAuthService,
		@IAIModelRegistryService private readonly modelRegistryService: IAIModelRegistryService,
		@IStorageService private readonly storageService: IStorageService,
		// Added in #147 so the credits balance can be fetched with the
		// `ainativeCloud` API key (see `_getApiKey()`).
		//
		// Required (not `?:` and not defaulted): VS Code's `registerSingleton`
		// only accepts constructors whose every parameter is a `BrandedService`,
		// and both an optional and a defaulted parameter widen to
		// `T | undefined`, which fails that constraint.
		//
		// It is nonetheless read defensively (`this.ainativeSettingsService?.`)
		// so that a test double passing a partial/undefined settings service
		// degrades to cached/default credits rather than throwing.
		@IAINativeSettingsService private readonly ainativeSettingsService: IAINativeSettingsService
	) {
		super();

		this._loadFromStorage();
		this._loadManagedUsageFromStorage();
		this._loadCreditsStatusFromStorage();
		this._startSyncTimer();

		// Startup sync: an API key configured in settings is enough to read the
		// balance, so this does not wait for a JWT session to be established.
		this._syncCreditsStatus().catch(err =>
			console.error('[UsageTrackingService] Failed to sync credits on startup:', err)
		);

		// Listen to auth state changes
		this._register(this.cloudAuthService.onDidChangeAuthState(state => {
			if (state === 'authenticated') {
				this.syncWithCloud().catch(err =>
					console.error('[UsageTrackingService] Failed to sync on auth:', err)
				);
				this._syncCreditsStatus({ force: true }).catch(err =>
					console.error('[UsageTrackingService] Failed to sync credits on auth:', err)
				);
			} else if (state === 'unauthenticated') {
				this.reset();
			}
		}));

		// An API key pasted into Settings is the other way credits become
		// readable, and it does not raise an auth-state event. Re-sync when the
		// key changes so the credits UI populates without an IDE restart.
		//
		// The truthiness check is deliberate despite the non-optional type: unit
		// tests construct this service without the settings service (see the
		// constructor parameter comment above).
		if (this.ainativeSettingsService) {
			let lastSeenApiKey = this._getApiKey();
			this._register(this.ainativeSettingsService.onDidChangeState(() => {
				const currentApiKey = this._getApiKey();
				if (currentApiKey !== lastSeenApiKey) {
					lastSeenApiKey = currentApiKey;
					this._syncCreditsStatus({ force: true }).catch(err =>
						console.error('[UsageTrackingService] Failed to sync credits after API key change:', err)
					);
				}
			}));
		}
	}

	/**
	 * Read the `ainativeCloud` API key from settings.
	 *
	 * Per BACKEND_CONTRACT_NOTES.md section 5 the key lives at
	 * `settingsOfProvider.ainativeCloud.apiKey` and follows the standard BYOK
	 * pattern. Returns undefined when unset or when the settings service is not
	 * available (unit-test construction).
	 */
	private _getApiKey(): string | undefined {
		try {
			const apiKey = this.ainativeSettingsService?.state?.settingsOfProvider?.ainativeCloud?.apiKey;
			const trimmed = typeof apiKey === 'string' ? apiKey.trim() : '';
			return trimmed.length > 0 ? trimmed : undefined;
		} catch (error) {
			console.error('[UsageTrackingService] Failed to read ainativeCloud API key:', error);
			return undefined;
		}
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

		// Force the next balance fetch rather than serving a stale rate-limit
		// window from the previous account.
		this._lastCreditsSyncAt = 0;

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
			// Quota sync goes through the JWT-authed registry, so the session
			// check is correct here.
			if (this.cloudAuthService.isAuthenticated()) {
				this.syncWithCloud().catch(err =>
					console.error('[UsageTrackingService] Auto-sync failed:', err)
				);
			}

			// Credits are API-key-authed and so refresh independently of any
			// JWT session. `_syncCreditsStatus()` no-ops when no key is set.
			this._syncCreditsStatus({ force: true }).catch(err =>
				console.error('[UsageTrackingService] Credits auto-sync failed:', err)
			);
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
			// Apply this request's cost to the cached balance first, so the
			// record below captures the post-request remaining figure and the
			// UI updates immediately. `_syncCreditsStatus()` is rate limited, so
			// a burst of chat turns will not issue one balance fetch per turn —
			// the local delta covers the gap until the next real fetch.
			this._applyLocalCreditsDelta(creditsConsumed);

			// Read current credits status for remaining balance and plan tier.
			// Not gated on a JWT session — see getCreditsStatus().
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

			// Reconcile against the server. Rate limited, so this is a no-op
			// during a burst and the optimistic local delta above stands until
			// the window reopens.
			await this._syncCreditsStatus();

			console.log(`[UsageTrackingService] Tracked managed usage: ${modelId}, ${tokensUsed} tokens, ${creditsConsumed} credits`);

		} catch (error) {
			console.error('[UsageTrackingService] Failed to track managed usage:', error);
		}
	}

	/**
	 * Get current credits status from backend.
	 *
	 * Deliberately NOT gated on `cloudAuthService.isAuthenticated()`: the
	 * balance endpoint is `X-API-Key`-authed, so a JWT session is the wrong
	 * precondition (see `_syncCreditsStatus()`). `_syncCreditsStatus()` applies
	 * the correct gate — a configured API key — and is rate limited, so calling
	 * this on a UI render does not issue a request per call.
	 */
	async getCreditsStatus(): Promise<CreditsStatus> {
		try {
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
	 * Get credits usage history.
	 *
	 * A real server-side history endpoint DOES exist — `GET
	 * /api/v1/managed/usage/history?days=N`, confirmed live (401, i.e. present
	 * and auth-gated) and confirmed in the backend's OpenAPI document as
	 * returning `{ history: [{ date, requests, credits_used, tokens }] }`. So
	 * this is not a local-only-by-design feature: the server is authoritative
	 * and is queried first.
	 *
	 * That endpoint is on the `/api/v1/managed` surface and so is
	 * JWT-authenticated, unlike the API-key-authed balance endpoint. The two
	 * therefore have genuinely different preconditions, and that asymmetry is
	 * deliberate here rather than an oversight:
	 *   - balance  -> needs a configured API key
	 *   - history  -> needs a JWT session
	 *
	 * Local managed-usage records remain the fallback when there is no JWT
	 * session or the request fails. The fallback only ever sees requests this
	 * install made, so it under-reports for a user who also used the account
	 * elsewhere; `source` on the result says which path produced the data.
	 */
	async getCreditsHistory(days: number = 30): Promise<CreditsHistory> {
		// The backend validates this range (1-365); check before spending a request.
		const requestedDays = Number.isFinite(days) ? Math.floor(days) : 30;
		const clampedDays = Math.min(Math.max(requestedDays, 1), 365);

		const remoteHistory = await this._fetchCreditsHistory(clampedDays);
		if (remoteHistory) {
			return remoteHistory;
		}

		return this._getLocalCreditsHistory(clampedDays);
	}

	/**
	 * Query `GET /api/v1/managed/usage/history` for authoritative history.
	 *
	 * Returns undefined when unavailable (no JWT session, auth rejected, network
	 * failure, malformed payload) so the caller can fall back to local records.
	 */
	private async _fetchCreditsHistory(days: number): Promise<CreditsHistory | undefined> {
		// This endpoint is JWT-authed, so a session genuinely is the right gate
		// here — in contrast to the balance endpoint above.
		let accessToken: string | null = null;
		try {
			accessToken = await this.cloudAuthService.getAccessToken();
		} catch (error) {
			console.error('[UsageTrackingService] Failed to get access token for usage history:', error);
			return undefined;
		}

		if (!accessToken) {
			return undefined;
		}

		const timeoutController = new AbortController();
		const timeoutHandle = setTimeout(
			() => timeoutController.abort(),
			UsageTrackingService.CREDITS_FETCH_TIMEOUT_MS
		);

		try {
			const response = await fetch(
				`${UsageTrackingService.USAGE_HISTORY_URL}?days=${days}`,
				{
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${accessToken}`,
						'Accept': 'application/json'
					},
					signal: timeoutController.signal
				}
			);

			if (!response.ok) {
				console.warn(
					`[UsageTrackingService] Usage history request failed with HTTP ${response.status}; ` +
					'falling back to local managed usage records'
				);
				return undefined;
			}

			const body = await response.json() as UsageHistoryResponseBody;
			if (!body || !Array.isArray(body.history)) {
				console.warn('[UsageTrackingService] Usage history response had no history array');
				return undefined;
			}

			const now = Date.now();
			const startTime = now - (days * 24 * 60 * 60 * 1000);

			// The backend documents entries as date-descending; CreditsHistory
			// consumers expect chronological order.
			const dailyUsage = body.history
				.filter(entry => entry && typeof entry.date === 'string')
				.map(entry => ({
					date: entry.date,
					creditsUsed: Number.isFinite(entry.credits_used) ? entry.credits_used : 0,
					requestCount: Number.isFinite(entry.requests) ? entry.requests : 0,
					tokensUsed: Number.isFinite(entry.tokens) ? entry.tokens : 0
				}))
				.sort((a, b) => a.date.localeCompare(b.date));

			return {
				period: {
					start: new Date(startTime),
					end: new Date(now)
				},
				dailyUsage,
				totalCreditsUsed: dailyUsage.reduce((sum, d) => sum + d.creditsUsed, 0),
				totalRequests: dailyUsage.reduce((sum, d) => sum + d.requestCount, 0),
				totalTokens: dailyUsage.reduce((sum, d) => sum + d.tokensUsed, 0),
				source: 'backend'
			};

		} catch (error) {
			console.error('[UsageTrackingService] Failed to fetch usage history from backend:', error);
			return undefined;

		} finally {
			clearTimeout(timeoutHandle);
		}
	}

	/**
	 * Compute history from local managed usage records.
	 *
	 * Fallback only — see `getCreditsHistory()`. Covers just the requests this
	 * install recorded, so it can under-report relative to the server.
	 */
	private _getLocalCreditsHistory(days: number): CreditsHistory {
		try {
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
				totalTokens,
				source: 'local'
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
				totalTokens: 0,
				source: 'local'
			};
		}
	}

	/**
	 * Sync credits status with the backend.
	 *
	 * CONTRACT (confirmed — see docs/api/BACKEND_CONTRACT_NOTES.md section 3):
	 *  - Balance comes from `GET /api/v1/public/credits/balance`, authenticated
	 *    with the `X-API-Key` header (NOT a JWT bearer token, and NOT under the
	 *    `/api/v1/managed` prefix — `/api/v1/credits/balance` returns 404).
	 *    The URL is `ManagedChatAPIService.CREDITS_BALANCE_URL`.
	 *  - Response shape is the `CreditsBalanceResponse` interface above,
	 *    confirmed in #147 against the backend's live OpenAPI document. It is a
	 *    bare object, not a `{ success, data }` envelope.
	 *  - This is a SEPARATE call from chat completions: credits are not returned
	 *    inline on a chat response, so a request's `creditsConsumed` cannot be
	 *    read off a chat result.
	 *
	 * AUTH GATE (the bug #143 flagged, fixed here): this is gated on having a
	 * configured API key, NOT on `cloudAuthService.isAuthenticated()`. That
	 * method reports whether a *JWT session* exists, which is the wrong and
	 * unrelated precondition for an `X-API-Key`-authed endpoint — it caused an
	 * install with a valid API key but no JWT session to be denied its own
	 * balance. Do not reintroduce an `isAuthenticated()` check here.
	 *
	 * On any failure the previously cached status is retained rather than being
	 * clobbered with zeroes, so a transient network error does not make the UI
	 * claim the user has no credits.
	 *
	 * @param options.force Bypass the rate limiter (used on auth/key changes).
	 */
	private async _syncCreditsStatus(options?: { force?: boolean }): Promise<void> {
		const force = options?.force === true;

		// Share an in-flight request rather than issuing duplicates.
		if (this._inFlightCreditsSync) {
			return this._inFlightCreditsSync;
		}

		// Rate limit: serve the cache if we fetched recently.
		const sinceLastSync = Date.now() - this._lastCreditsSyncAt;
		if (!force && this._lastCreditsSyncAt > 0 && sinceLastSync < UsageTrackingService.CREDITS_SYNC_MIN_INTERVAL_MS) {
			return;
		}

		const apiKey = this._getApiKey();
		if (!apiKey) {
			// No key configured: nothing to fetch. Keep whatever cached status
			// exists so a logged-out-but-previously-synced install still renders
			// its last known balance instead of flipping to zeroes.
			if (!this._creditsStatus) {
				this._creditsStatus = this._getDefaultCreditsStatus();
			}
			return;
		}

		this._inFlightCreditsSync = (async () => {
			try {
				const balance = await this._fetchCreditsBalance(apiKey);
				if (!balance) {
					return;
				}

				this._lastCreditsSyncAt = Date.now();
				this._applyCreditsBalance(balance);

			} catch (error) {
				// Retain the cached status — see the doc comment above.
				console.error('[UsageTrackingService] Failed to sync credits status:', error);
				if (!this._creditsStatus) {
					this._creditsStatus = this._getDefaultCreditsStatus();
				}
			}
		})();

		try {
			await this._inFlightCreditsSync;
		} finally {
			this._inFlightCreditsSync = null;
		}
	}

	/**
	 * Fetch and validate the credits balance.
	 *
	 * Returns undefined (rather than throwing) for an auth failure, since a bad
	 * or missing key is a configuration problem the user must fix — retrying it
	 * on a timer would just burn requests. Per BACKEND_CONTRACT_NOTES.md section
	 * 2a, a 401 on an API key is not recoverable by refreshing a token.
	 */
	private async _fetchCreditsBalance(apiKey: string): Promise<CreditsBalanceResponse | undefined> {
		const timeoutController = new AbortController();
		const timeoutHandle = setTimeout(
			() => timeoutController.abort(),
			UsageTrackingService.CREDITS_FETCH_TIMEOUT_MS
		);

		try {
			const response = await fetch(ManagedChatAPIService.CREDITS_BALANCE_URL, {
				method: 'GET',
				headers: {
					'X-API-Key': apiKey,
					'Accept': 'application/json'
				},
				signal: timeoutController.signal
			});

			if (response.status === 401 || response.status === 403) {
				// Not retryable. Valid key prefixes are sk_, tmp_ and zdb_live_;
				// a key from another vendor (e.g. sk-ant-...) is rejected here.
				console.warn(
					`[UsageTrackingService] Credits balance rejected the API key (HTTP ${response.status}). ` +
					'Check that settings contain a valid AINative key (sk_, tmp_ or zdb_live_ prefix).'
				);
				return undefined;
			}

			if (!response.ok) {
				throw new Error(`Credits balance request failed with HTTP ${response.status}`);
			}

			const body = await response.json();
			return this._parseCreditsBalance(body);

		} finally {
			clearTimeout(timeoutHandle);
		}
	}

	/**
	 * Validate the balance payload before trusting it.
	 *
	 * The three numeric fields below are required by the OpenAPI schema, but
	 * this guards them anyway: a malformed payload silently producing NaN would
	 * surface to the user as a nonsense credits figure, which is worse than
	 * keeping the cached value.
	 */
	private _parseCreditsBalance(body: unknown): CreditsBalanceResponse | undefined {
		if (typeof body !== 'object' || body === null) {
			console.warn('[UsageTrackingService] Credits balance response was not an object');
			return undefined;
		}

		const candidate = body as Partial<CreditsBalanceResponse>;
		const isFiniteNumber = (value: unknown): value is number =>
			typeof value === 'number' && Number.isFinite(value);

		if (!isFiniteNumber(candidate.total_credits) ||
			!isFiniteNumber(candidate.used_credits) ||
			!isFiniteNumber(candidate.remaining_credits)) {
			console.warn('[UsageTrackingService] Credits balance response missing numeric credit fields');
			return undefined;
		}

		return {
			total_credits: candidate.total_credits,
			used_credits: candidate.used_credits,
			remaining_credits: candidate.remaining_credits,
			unlimited: candidate.unlimited === true,
			plan: typeof candidate.plan === 'string' ? candidate.plan : 'free',
			period_start: typeof candidate.period_start === 'string' ? candidate.period_start : '',
			period_end: typeof candidate.period_end === 'string' ? candidate.period_end : null,
			usage_percentage: isFiniteNumber(candidate.usage_percentage) ? candidate.usage_percentage : 0
		};
	}

	/**
	 * Map a confirmed balance response onto CreditsStatus, persist it, and fire
	 * the update events.
	 */
	private _applyCreditsBalance(balance: CreditsBalanceResponse): void {
		// Prefer the server's own usage_percentage; fall back to deriving it
		// when the allocation is zero (which would otherwise divide by zero).
		const percentUsed = balance.total_credits > 0
			? balance.usage_percentage
			: 0;

		// An unlimited plan has no meaningful "low credits" state, so never warn
		// on one regardless of what the remaining figure says.
		const isLow = !balance.unlimited &&
			balance.total_credits > 0 &&
			(balance.remaining_credits / balance.total_credits) < UsageTrackingService.CREDITS_LOW_THRESHOLD;

		const creditsStatus: CreditsStatus = {
			used: balance.used_credits,
			remaining: balance.remaining_credits,
			total: balance.total_credits,
			percentUsed,
			isLow,
			planTier: balance.plan,
			...(balance.period_end ? { resetDate: balance.period_end } : {})
		};

		const wasLow = this._creditsStatus?.isLow === true;
		this._creditsStatus = creditsStatus;

		this._saveCreditsStatusToStorage();

		this._onDidUpdateCredits.fire(creditsStatus);

		// Fire the low-credits warning only on the transition into the low
		// state, so a periodic sync does not re-notify every 5 minutes.
		if (creditsStatus.isLow && !wasLow) {
			this._onCreditsLow.fire(creditsStatus);
		}

		console.log(
			`[UsageTrackingService] Credits synced from backend: ${creditsStatus.remaining}/${creditsStatus.total} ` +
			`remaining (${creditsStatus.percentUsed.toFixed(1)}% used, plan=${creditsStatus.planTier}` +
			`${balance.unlimited ? ', unlimited' : ''})`
		);
	}

	/**
	 * Apply a locally-known credits delta to the cached status.
	 *
	 * Used between balance fetches so the UI reflects a request's cost
	 * immediately rather than appearing frozen until the rate limiter allows the
	 * next real fetch. This is an optimistic local estimate; the next successful
	 * `_syncCreditsStatus()` overwrites it with authoritative server state.
	 */
	private _applyLocalCreditsDelta(creditsConsumed: number): void {
		const current = this._creditsStatus;
		if (!current || current.total <= 0 || !Number.isFinite(creditsConsumed) || creditsConsumed <= 0) {
			return;
		}

		const used = Math.min(current.used + creditsConsumed, current.total);
		const remaining = Math.max(current.total - used, 0);
		const isLow = (remaining / current.total) < UsageTrackingService.CREDITS_LOW_THRESHOLD;

		const updated: CreditsStatus = {
			...current,
			used,
			remaining,
			percentUsed: (used / current.total) * 100,
			isLow
		};

		const wasLow = current.isLow;
		this._creditsStatus = updated;
		this._saveCreditsStatusToStorage();
		this._onDidUpdateCredits.fire(updated);

		if (updated.isLow && !wasLow) {
			this._onCreditsLow.fire(updated);
		}
	}

	/**
	 * Persist the cached credits status so the UI has a value to render at
	 * startup before the first balance fetch returns.
	 */
	private _saveCreditsStatusToStorage(): void {
		try {
			this.storageService.store(
				UsageTrackingService.STORAGE_KEY_CREDITS_STATUS,
				JSON.stringify(this._creditsStatus),
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);
		} catch (error) {
			console.error('[UsageTrackingService] Failed to save credits status to storage:', error);
		}
	}

	/**
	 * Load the last known credits status from storage.
	 */
	private _loadCreditsStatusFromStorage(): void {
		try {
			const stored = this.storageService.get(
				UsageTrackingService.STORAGE_KEY_CREDITS_STATUS,
				StorageScope.APPLICATION
			);

			if (stored) {
				this._creditsStatus = JSON.parse(stored);
			}
		} catch (error) {
			console.error('[UsageTrackingService] Failed to load credits status from storage:', error);
			this._creditsStatus = null;
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
