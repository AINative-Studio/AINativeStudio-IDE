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
import { IAIModelRegistryService } from './aiModelRegistryTypes.js';
import { IAINativeSettingsService } from './ainativeSettingsService.js';
import { ManagedChatAPIService } from './managedChatAPIService.js';
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
    static { this.CREDITS_LOW_THRESHOLD = 0.2; } // 20% remaining
    /**
     * Minimum gap between balance fetches. `trackManagedUsage()` triggers a sync
     * after every managed request, so without this a burst of chat turns would
     * fire one HTTP request per turn at the balance endpoint. Within this window
     * the cached `_creditsStatus` is served and decremented locally instead.
     */
    static { this.CREDITS_SYNC_MIN_INTERVAL_MS = 30 * 1000; } // 30 seconds
    /** Request timeout for the balance/history fetches. */
    static { this.CREDITS_FETCH_TIMEOUT_MS = 10 * 1000; } // 10 seconds
    /**
     * Authoritative usage history. CONFIRMED live (401 = present, auth-gated)
     * and present in the backend's OpenAPI document as `UsageHistoryResponse`.
     *
     * Unlike the credits balance this is on the `/api/v1/managed` surface, so it
     * is JWT-authenticated (`Authorization: Bearer`), not `X-API-Key`.
     * See docs/api/BACKEND_CONTRACT_NOTES.md section 3.
     */
    static { this.USAGE_HISTORY_URL = 'https://api.ainative.studio/api/v1/managed/usage/history'; }
    constructor(cloudAuthService, modelRegistryService, storageService, ainativeSettingsService) {
        super();
        this.cloudAuthService = cloudAuthService;
        this.modelRegistryService = modelRegistryService;
        this.storageService = storageService;
        this.ainativeSettingsService = ainativeSettingsService;
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
        /** Timestamp of the last *successful* balance fetch, for rate limiting. */
        this._lastCreditsSyncAt = 0;
        /** In-flight balance fetch, so concurrent callers share one request. */
        this._inFlightCreditsSync = null;
        this._loadFromStorage();
        this._loadManagedUsageFromStorage();
        this._loadCreditsStatusFromStorage();
        this._startSyncTimer();
        // Startup sync: an API key configured in settings is enough to read the
        // balance, so this does not wait for a JWT session to be established.
        this._syncCreditsStatus().catch(err => console.error('[UsageTrackingService] Failed to sync credits on startup:', err));
        // Listen to auth state changes
        this._register(this.cloudAuthService.onDidChangeAuthState(state => {
            if (state === 'authenticated') {
                this.syncWithCloud().catch(err => console.error('[UsageTrackingService] Failed to sync on auth:', err));
                this._syncCreditsStatus({ force: true }).catch(err => console.error('[UsageTrackingService] Failed to sync credits on auth:', err));
            }
            else if (state === 'unauthenticated') {
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
                    this._syncCreditsStatus({ force: true }).catch(err => console.error('[UsageTrackingService] Failed to sync credits after API key change:', err));
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
    _getApiKey() {
        try {
            const apiKey = this.ainativeSettingsService?.state?.settingsOfProvider?.ainativeCloud?.apiKey;
            const trimmed = typeof apiKey === 'string' ? apiKey.trim() : '';
            return trimmed.length > 0 ? trimmed : undefined;
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to read ainativeCloud API key:', error);
            return undefined;
        }
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
        // Force the next balance fetch rather than serving a stale rate-limit
        // window from the previous account.
        this._lastCreditsSyncAt = 0;
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
            // Quota sync goes through the JWT-authed registry, so the session
            // check is correct here.
            if (this.cloudAuthService.isAuthenticated()) {
                this.syncWithCloud().catch(err => console.error('[UsageTrackingService] Auto-sync failed:', err));
            }
            // Credits are API-key-authed and so refresh independently of any
            // JWT session. `_syncCreditsStatus()` no-ops when no key is set.
            this._syncCreditsStatus({ force: true }).catch(err => console.error('[UsageTrackingService] Credits auto-sync failed:', err));
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
            // Reconcile against the server. Rate limited, so this is a no-op
            // during a burst and the optimistic local delta above stands until
            // the window reopens.
            await this._syncCreditsStatus();
            console.log(`[UsageTrackingService] Tracked managed usage: ${modelId}, ${tokensUsed} tokens, ${creditsConsumed} credits`);
        }
        catch (error) {
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
    async getCreditsStatus() {
        try {
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
    async getCreditsHistory(days = 30) {
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
    async _fetchCreditsHistory(days) {
        // This endpoint is JWT-authed, so a session genuinely is the right gate
        // here — in contrast to the balance endpoint above.
        let accessToken = null;
        try {
            accessToken = await this.cloudAuthService.getAccessToken();
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to get access token for usage history:', error);
            return undefined;
        }
        if (!accessToken) {
            return undefined;
        }
        const timeoutController = new AbortController();
        const timeoutHandle = setTimeout(() => timeoutController.abort(), UsageTrackingService_1.CREDITS_FETCH_TIMEOUT_MS);
        try {
            const response = await fetch(`${UsageTrackingService_1.USAGE_HISTORY_URL}?days=${days}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                },
                signal: timeoutController.signal
            });
            if (!response.ok) {
                console.warn(`[UsageTrackingService] Usage history request failed with HTTP ${response.status}; ` +
                    'falling back to local managed usage records');
                return undefined;
            }
            const body = await response.json();
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
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to fetch usage history from backend:', error);
            return undefined;
        }
        finally {
            clearTimeout(timeoutHandle);
        }
    }
    /**
     * Compute history from local managed usage records.
     *
     * Fallback only — see `getCreditsHistory()`. Covers just the requests this
     * install recorded, so it can under-report relative to the server.
     */
    _getLocalCreditsHistory(days) {
        try {
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
                totalTokens,
                source: 'local'
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
    async _syncCreditsStatus(options) {
        const force = options?.force === true;
        // Share an in-flight request rather than issuing duplicates.
        if (this._inFlightCreditsSync) {
            return this._inFlightCreditsSync;
        }
        // Rate limit: serve the cache if we fetched recently.
        const sinceLastSync = Date.now() - this._lastCreditsSyncAt;
        if (!force && this._lastCreditsSyncAt > 0 && sinceLastSync < UsageTrackingService_1.CREDITS_SYNC_MIN_INTERVAL_MS) {
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
            }
            catch (error) {
                // Retain the cached status — see the doc comment above.
                console.error('[UsageTrackingService] Failed to sync credits status:', error);
                if (!this._creditsStatus) {
                    this._creditsStatus = this._getDefaultCreditsStatus();
                }
            }
        })();
        try {
            await this._inFlightCreditsSync;
        }
        finally {
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
    async _fetchCreditsBalance(apiKey) {
        const timeoutController = new AbortController();
        const timeoutHandle = setTimeout(() => timeoutController.abort(), UsageTrackingService_1.CREDITS_FETCH_TIMEOUT_MS);
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
                console.warn(`[UsageTrackingService] Credits balance rejected the API key (HTTP ${response.status}). ` +
                    'Check that settings contain a valid AINative key (sk_, tmp_ or zdb_live_ prefix).');
                return undefined;
            }
            if (!response.ok) {
                throw new Error(`Credits balance request failed with HTTP ${response.status}`);
            }
            const body = await response.json();
            return this._parseCreditsBalance(body);
        }
        finally {
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
    _parseCreditsBalance(body) {
        if (typeof body !== 'object' || body === null) {
            console.warn('[UsageTrackingService] Credits balance response was not an object');
            return undefined;
        }
        const candidate = body;
        const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
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
    _applyCreditsBalance(balance) {
        // Prefer the server's own usage_percentage; fall back to deriving it
        // when the allocation is zero (which would otherwise divide by zero).
        const percentUsed = balance.total_credits > 0
            ? balance.usage_percentage
            : 0;
        // An unlimited plan has no meaningful "low credits" state, so never warn
        // on one regardless of what the remaining figure says.
        const isLow = !balance.unlimited &&
            balance.total_credits > 0 &&
            (balance.remaining_credits / balance.total_credits) < UsageTrackingService_1.CREDITS_LOW_THRESHOLD;
        const creditsStatus = {
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
        console.log(`[UsageTrackingService] Credits synced from backend: ${creditsStatus.remaining}/${creditsStatus.total} ` +
            `remaining (${creditsStatus.percentUsed.toFixed(1)}% used, plan=${creditsStatus.planTier}` +
            `${balance.unlimited ? ', unlimited' : ''})`);
    }
    /**
     * Apply a locally-known credits delta to the cached status.
     *
     * Used between balance fetches so the UI reflects a request's cost
     * immediately rather than appearing frozen until the rate limiter allows the
     * next real fetch. This is an optimistic local estimate; the next successful
     * `_syncCreditsStatus()` overwrites it with authoritative server state.
     */
    _applyLocalCreditsDelta(creditsConsumed) {
        const current = this._creditsStatus;
        if (!current || current.total <= 0 || !Number.isFinite(creditsConsumed) || creditsConsumed <= 0) {
            return;
        }
        const used = Math.min(current.used + creditsConsumed, current.total);
        const remaining = Math.max(current.total - used, 0);
        const isLow = (remaining / current.total) < UsageTrackingService_1.CREDITS_LOW_THRESHOLD;
        const updated = {
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
    _saveCreditsStatusToStorage() {
        try {
            this.storageService.store(UsageTrackingService_1.STORAGE_KEY_CREDITS_STATUS, JSON.stringify(this._creditsStatus), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to save credits status to storage:', error);
        }
    }
    /**
     * Load the last known credits status from storage.
     */
    _loadCreditsStatusFromStorage() {
        try {
            const stored = this.storageService.get(UsageTrackingService_1.STORAGE_KEY_CREDITS_STATUS, -1 /* StorageScope.APPLICATION */);
            if (stored) {
                this._creditsStatus = JSON.parse(stored);
            }
        }
        catch (error) {
            console.error('[UsageTrackingService] Failed to load credits status from storage:', error);
            this._creditsStatus = null;
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
    __param(2, IStorageService),
    __param(3, IAINativeSettingsService)
], UsageTrackingService);
export { UsageTrackingService };
// Register the service with VS Code dependency injection
registerSingleton(IUsageTrackingService, UsageTrackingService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2VUcmFja2luZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi91c2FnZVRyYWNraW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEc7OztHQUdHO0FBRUgsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDeEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUErRW5FOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBa0dwRzs7R0FFRztBQUNJLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTs7YUFHM0IsOEJBQXlCLEdBQUcsd0JBQXdCLEFBQTNCLENBQTRCO2FBQ3JELDBCQUFxQixHQUFHLHlCQUF5QixBQUE1QixDQUE2QjthQUNsRCwrQkFBMEIsR0FBRyw4QkFBOEIsQUFBakMsQ0FB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