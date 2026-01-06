/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useCallback } from 'react';
import { useAccessor } from '../util/services.js';
import {
	Activity,
	DollarSign,
	AlertTriangle,
	TrendingUp,
	Calendar,
	RefreshCw,
	Loader2,
	AlertCircle
} from 'lucide-react';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';

type PeriodFilter = 'day' | 'week' | 'month' | 'all';

export const UsageDashboard: React.FC = () => {
	const accessor = useAccessor();
	const usageTrackingService = accessor.get('IUsageTrackingService');

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [period, setPeriod] = useState<PeriodFilter>('month');
	const [refreshing, setRefreshing] = useState(false);

	// Usage stats
	const [totalCalls, setTotalCalls] = useState(0);
	const [totalTokens, setTotalTokens] = useState(0);
	const [inputTokens, setInputTokens] = useState(0);
	const [outputTokens, setOutputTokens] = useState(0);
	const [totalCost, setTotalCost] = useState(0);
	const [byModel, setByModel] = useState<Record<string, any>>({});

	// Quota stats
	const [quotaLimit, setQuotaLimit] = useState(0);
	const [quotaUsed, setQuotaUsed] = useState(0);
	const [quotaRemaining, setQuotaRemaining] = useState(0);
	const [quotaExceeded, setQuotaExceeded] = useState(false);
	const [quotaApproaching, setQuotaApproaching] = useState(false);
	const [quotaResetDate, setQuotaResetDate] = useState<string | undefined>();

	/**
	 * Load usage and quota data
	 */
	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			// Load usage stats
			const usage = await usageTrackingService.getUsage(period);
			setTotalCalls(usage.totalCalls);
			setTotalTokens(usage.totalTokens);
			setInputTokens(usage.inputTokens);
			setOutputTokens(usage.outputTokens);
			setTotalCost(usage.totalCost);
			setByModel(usage.byModel || {});

			// Load quota info
			const quota = await usageTrackingService.getQuotaStatus();
			setQuotaLimit(quota.totalLimit);
			setQuotaUsed(quota.used);
			setQuotaRemaining(quota.remaining);
			setQuotaExceeded(quota.exceeded);
			setQuotaApproaching(quota.approaching);
			setQuotaResetDate(quota.resetDate);

		} catch (err) {
			console.error('[UsageDashboard] Failed to load data:', err);
			setError(err instanceof Error ? err.message : 'Failed to load usage data');
		} finally {
			setLoading(false);
		}
	}, [usageTrackingService, period]);

	/**
	 * Refresh data from cloud
	 */
	const handleRefresh = useCallback(async () => {
		try {
			setRefreshing(true);
			await usageTrackingService.syncWithCloud();
			await loadData();
		} catch (err) {
			console.error('[UsageDashboard] Failed to refresh:', err);
		} finally {
			setRefreshing(false);
		}
	}, [usageTrackingService, loadData]);

	// Load data on mount and period change
	useEffect(() => {
		loadData();
	}, [loadData]);

	// Listen to usage updates
	useEffect(() => {
		const disposable = usageTrackingService.onDidUpdateUsage(() => {
			loadData();
		});

		return () => disposable.dispose();
	}, [usageTrackingService, loadData]);

	// Calculate quota percentage
	const quotaPercentage = quotaLimit > 0 ? (quotaUsed / quotaLimit) * 100 : 0;

	/**
	 * Format number with commas
	 */
	const formatNumber = (num: number): string => {
		return num.toLocaleString();
	};

	/**
	 * Format cost
	 */
	const formatCost = (cost: number): string => {
		return `$${cost.toFixed(4)}`;
	};

	/**
	 * Get period label
	 */
	const getPeriodLabel = (p: PeriodFilter): string => {
		switch (p) {
			case 'day':
				return 'Last 24 Hours';
			case 'week':
				return 'Last 7 Days';
			case 'month':
				return 'Last 30 Days';
			case 'all':
				return 'All Time';
		}
	};

	return (
		<div className="p-6 max-w-7xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-medium text-ainative-fg-1">Usage & Quota</h2>

				<div className="flex items-center gap-3">
					{/* Period Filter */}
					<select
						value={period}
						onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
						className="px-3 py-2 bg-ainative-bg-1 border border-ainative-border-2 rounded-md text-sm text-ainative-fg-1 focus:border-ainative-border-1 focus:outline-none"
					>
						<option value="day">Last 24 Hours</option>
						<option value="week">Last 7 Days</option>
						<option value="month">Last 30 Days</option>
						<option value="all">All Time</option>
					</select>

					{/* Refresh Button */}
					<button
						onClick={handleRefresh}
						disabled={refreshing}
						className="p-2 bg-ainative-bg-1 border border-ainative-border-2 rounded-md hover:bg-ainative-bg-2-hover transition-colors disabled:opacity-50"
						aria-label="Refresh data"
					>
						<RefreshCw size={18} className={`text-ainative-fg-3 ${refreshing ? 'animate-spin' : ''}`} />
					</button>
				</div>
			</div>

			{/* Loading State */}
			{loading && !refreshing ? (
				<div className="flex items-center justify-center py-24">
					<div className="text-center">
						<Loader2 className="mx-auto mb-4 animate-spin text-ainative-fg-3" size={48} />
						<p className="text-ainative-fg-3">Loading usage data...</p>
					</div>
				</div>
			) : error ? (
				<div className="flex items-center justify-center py-24">
					<div className="text-center p-8 max-w-md">
						<AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
						<h3 className="text-lg font-medium text-ainative-fg-1 mb-2">Error Loading Data</h3>
						<p className="text-ainative-fg-3 mb-4">{error}</p>
						<button
							onClick={loadData}
							className="px-4 py-2 bg-[#0e70c0] text-white rounded-md hover:bg-[#1177cb]"
						>
							Try Again
						</button>
					</div>
				</div>
			) : (
				<>
					{/* Quota Warning */}
					{quotaApproaching && !quotaExceeded && (
						<div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-3">
							<AlertCircle size={20} className="text-yellow-500 mt-0.5 flex-shrink-0" />
							<div>
								<h3 className="text-sm font-medium text-yellow-500 mb-1">Quota Warning</h3>
								<p className="text-sm text-ainative-fg-3">
									You have used {quotaPercentage.toFixed(0)}% of your quota. Consider upgrading your plan.
								</p>
							</div>
						</div>
					)}

					{quotaExceeded && (
						<div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-3">
							<AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
							<div>
								<h3 className="text-sm font-medium text-red-500 mb-1">Quota Exceeded</h3>
								<p className="text-sm text-ainative-fg-3">
									You have exceeded your quota limit. Please upgrade your plan to continue using models.
								</p>
							</div>
						</div>
					)}

					{/* Quota Card */}
					<ErrorBoundary>
						<div className="mb-6 p-6 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-medium text-ainative-fg-1">Token Quota</h3>
								{quotaResetDate && (
									<div className="flex items-center gap-1 text-xs text-ainative-fg-3">
										<Calendar size={14} />
										<span>Resets {new Date(quotaResetDate).toLocaleDateString()}</span>
									</div>
								)}
							</div>

							<div className="mb-2">
								<div className="flex items-center justify-between text-sm mb-1">
									<span className="text-ainative-fg-3">
										{formatNumber(quotaUsed)} / {formatNumber(quotaLimit)} tokens
									</span>
									<span className="font-medium text-ainative-fg-1">{quotaPercentage.toFixed(1)}%</span>
								</div>

								{/* Progress Bar */}
								<div className="w-full h-2 bg-ainative-bg-2 rounded-full overflow-hidden">
									<div
										className={`h-full transition-all duration-300 ${
											quotaExceeded
												? 'bg-red-500'
												: quotaApproaching
												? 'bg-yellow-500'
												: 'bg-[#0e70c0]'
										}`}
										style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
									/>
								</div>
							</div>

							<div className="text-sm text-ainative-fg-3 mt-3">
								{formatNumber(quotaRemaining)} tokens remaining
							</div>
						</div>
					</ErrorBoundary>

					{/* Stats Grid */}
					<ErrorBoundary>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
							{/* Total Calls */}
							<div className="p-4 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
								<div className="flex items-center gap-2 mb-2">
									<Activity size={18} className="text-[#0e70c0]" />
									<span className="text-xs text-ainative-fg-3 uppercase">Total Calls</span>
								</div>
								<div className="text-2xl font-medium text-ainative-fg-1">{formatNumber(totalCalls)}</div>
							</div>

							{/* Total Tokens */}
							<div className="p-4 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
								<div className="flex items-center gap-2 mb-2">
									<TrendingUp size={18} className="text-[#0e70c0]" />
									<span className="text-xs text-ainative-fg-3 uppercase">Total Tokens</span>
								</div>
								<div className="text-2xl font-medium text-ainative-fg-1">{formatNumber(totalTokens)}</div>
								<div className="text-xs text-ainative-fg-3 mt-1">
									{formatNumber(inputTokens)} in • {formatNumber(outputTokens)} out
								</div>
							</div>

							{/* Total Cost */}
							<div className="p-4 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
								<div className="flex items-center gap-2 mb-2">
									<DollarSign size={18} className="text-[#0e70c0]" />
									<span className="text-xs text-ainative-fg-3 uppercase">Total Cost</span>
								</div>
								<div className="text-2xl font-medium text-ainative-fg-1">{formatCost(totalCost)}</div>
							</div>

							{/* Period */}
							<div className="p-4 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
								<div className="flex items-center gap-2 mb-2">
									<Calendar size={18} className="text-[#0e70c0]" />
									<span className="text-xs text-ainative-fg-3 uppercase">Period</span>
								</div>
								<div className="text-2xl font-medium text-ainative-fg-1">{getPeriodLabel(period)}</div>
							</div>
						</div>
					</ErrorBoundary>

					{/* Usage by Model */}
					<ErrorBoundary>
						<div className="p-6 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
							<h3 className="text-lg font-medium text-ainative-fg-1 mb-4">Usage by Model</h3>

							{Object.keys(byModel).length === 0 ? (
								<p className="text-sm text-ainative-fg-3 text-center py-8">
									No usage data for this period
								</p>
							) : (
								<div className="space-y-4">
									{Object.entries(byModel)
										.sort(([, a], [, b]) => (b as any).tokens - (a as any).tokens)
										.map(([modelId, stats]: [string, any]) => {
											const percentage = totalTokens > 0 ? (stats.tokens / totalTokens) * 100 : 0;

											return (
												<div key={modelId} className="space-y-2">
													<div className="flex items-center justify-between">
														<div>
															<div className="text-sm font-medium text-ainative-fg-1">{modelId}</div>
															<div className="text-xs text-ainative-fg-3">
																{formatNumber(stats.calls)} calls • {formatNumber(stats.tokens)} tokens
															</div>
														</div>
														<div className="text-right">
															<div className="text-sm font-medium text-ainative-fg-1">
																{formatCost(stats.cost)}
															</div>
															<div className="text-xs text-ainative-fg-3">{percentage.toFixed(1)}%</div>
														</div>
													</div>

													{/* Progress Bar */}
													<div className="w-full h-1.5 bg-ainative-bg-2 rounded-full overflow-hidden">
														<div
															className="h-full bg-[#0e70c0] transition-all duration-300"
															style={{ width: `${percentage}%` }}
														/>
													</div>
												</div>
											);
										})}
								</div>
							)}
						</div>
					</ErrorBoundary>
				</>
			)}
		</div>
	);
};
