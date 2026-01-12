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
  AlertCircle } from
'lucide-react';
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
  const quotaPercentage = quotaLimit > 0 ? quotaUsed / quotaLimit * 100 : 0;

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
    <div className="ainative-p-6 ainative-max-w-7xl ainative-mx-auto">
			{/* Header */}
			<div className="ainative-flex ainative-items-center ainative-justify-between ainative-mb-6">
				<h2 className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1">Usage & Quota</h2>

				<div className="ainative-flex ainative-items-center ainative-gap-3">
					{/* Period Filter */}
					<select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="ainative-px-3 ainative-py-2 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-text-sm ainative-text-ainative-fg-1 focus:ainative-border-ainative-border-1 focus:ainative-outline-none">

						<option value="day">Last 24 Hours</option>
						<option value="week">Last 7 Days</option>
						<option value="month">Last 30 Days</option>
						<option value="all">All Time</option>
					</select>

					{/* Refresh Button */}
					<button
            onClick={handleRefresh}
            disabled={refreshing}
            className="ainative-p-2 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md hover:ainative-bg-ainative-bg-2-hover ainative-transition-colors disabled:ainative-opacity-50"
            aria-label="Refresh data">

						<RefreshCw size={18} className={`ainative-text-ainative-fg-3 ${refreshing ? "ainative-animate-spin" : ""}`} />
					</button>
				</div>
			</div>

			{/* Loading State */}
			{loading && !refreshing ?
      <div className="ainative-flex ainative-items-center ainative-justify-center ainative-py-24">
					<div className="ainative-text-center">
						<Loader2 className="ainative-mx-auto ainative-mb-4 ainative-animate-spin ainative-text-ainative-fg-3" size={48} />
						<p className="ainative-text-ainative-fg-3">Loading usage data...</p>
					</div>
				</div> :
      error ?
      <div className="ainative-flex ainative-items-center ainative-justify-center ainative-py-24">
					<div className="ainative-text-center ainative-p-8 ainative-max-w-md">
						<AlertTriangle className="ainative-mx-auto ainative-mb-4 ainative-text-red-500" size={48} />
						<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-2">Error Loading Data</h3>
						<p className="ainative-text-ainative-fg-3 ainative-mb-4">{error}</p>
						<button
            onClick={loadData}
            className="ainative-px-4 ainative-py-2 ainative-bg-[#0e70c0] ainative-text-white ainative-rounded-md hover:ainative-bg-[#1177cb]">

							Try Again
						</button>
					</div>
				</div> :

      <>
					{/* Quota Warning */}
					{quotaApproaching && !quotaExceeded &&
        <div className="ainative-mb-6 ainative-p-4 ainative-bg-yellow-500/10 ainative-border ainative-border-yellow-500/20 ainative-rounded-md ainative-flex ainative-items-start ainative-gap-3">
							<AlertCircle size={20} className="ainative-text-yellow-500 ainative-mt-0.5 ainative-flex-shrink-0" />
							<div>
								<h3 className="ainative-text-sm ainative-font-medium ainative-text-yellow-500 ainative-mb-1">Quota Warning</h3>
								<p className="ainative-text-sm ainative-text-ainative-fg-3">
									You have used {quotaPercentage.toFixed(0)}% of your quota. Consider upgrading your plan.
								</p>
							</div>
						</div>
        }

					{quotaExceeded &&
        <div className="ainative-mb-6 ainative-p-4 ainative-bg-red-500/10 ainative-border ainative-border-red-500/20 ainative-rounded-md ainative-flex ainative-items-start ainative-gap-3">
							<AlertTriangle size={20} className="ainative-text-red-500 ainative-mt-0.5 ainative-flex-shrink-0" />
							<div>
								<h3 className="ainative-text-sm ainative-font-medium ainative-text-red-500 ainative-mb-1">Quota Exceeded</h3>
								<p className="ainative-text-sm ainative-text-ainative-fg-3">
									You have exceeded your quota limit. Please upgrade your plan to continue using models.
								</p>
							</div>
						</div>
        }

					{/* Quota Card */}
					<ErrorBoundary>
						<div className="ainative-mb-6 ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
							<div className="ainative-flex ainative-items-center ainative-justify-between ainative-mb-4">
								<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">Token Quota</h3>
								{quotaResetDate &&
              <div className="ainative-flex ainative-items-center ainative-gap-1 ainative-text-xs ainative-text-ainative-fg-3">
										<Calendar size={14} />
										<span>Resets {new Date(quotaResetDate).toLocaleDateString()}</span>
									</div>
              }
							</div>

							<div className="ainative-mb-2">
								<div className="ainative-flex ainative-items-center ainative-justify-between ainative-text-sm ainative-mb-1">
									<span className="ainative-text-ainative-fg-3">
										{formatNumber(quotaUsed)} / {formatNumber(quotaLimit)} tokens
									</span>
									<span className="ainative-font-medium ainative-text-ainative-fg-1">{quotaPercentage.toFixed(1)}%</span>
								</div>

								{/* Progress Bar */}
								<div className="ainative-w-full ainative-h-2 ainative-bg-ainative-bg-2 ainative-rounded-full ainative-overflow-hidden">
									<div
                  className={`ainative-h-full ainative-transition-all ainative-duration-300 ${
                  quotaExceeded ? "ainative-bg-red-500" :

                  quotaApproaching ? "ainative-bg-yellow-500" : "ainative-bg-[#0e70c0]"}`}



                  style={{ width: `${Math.min(quotaPercentage, 100)}%` }} />

								</div>
							</div>

							<div className="ainative-text-sm ainative-text-ainative-fg-3 ainative-mt-3">
								{formatNumber(quotaRemaining)} tokens remaining
							</div>
						</div>
					</ErrorBoundary>

					{/* Stats Grid */}
					<ErrorBoundary>
						<div className="ainative-grid ainative-grid-cols-1 md:ainative-grid-cols-2 lg:ainative-grid-cols-4 ainative-gap-4 ainative-mb-6">
							{/* Total Calls */}
							<div className="ainative-p-4 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
								<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-2">
									<Activity size={18} className="ainative-text-[#0e70c0]" />
									<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-uppercase">Total Calls</span>
								</div>
								<div className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1">{formatNumber(totalCalls)}</div>
							</div>

							{/* Total Tokens */}
							<div className="ainative-p-4 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
								<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-2">
									<TrendingUp size={18} className="ainative-text-[#0e70c0]" />
									<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-uppercase">Total Tokens</span>
								</div>
								<div className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1">{formatNumber(totalTokens)}</div>
								<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mt-1">
									{formatNumber(inputTokens)} in • {formatNumber(outputTokens)} out
								</div>
							</div>

							{/* Total Cost */}
							<div className="ainative-p-4 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
								<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-2">
									<DollarSign size={18} className="ainative-text-[#0e70c0]" />
									<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-uppercase">Total Cost</span>
								</div>
								<div className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1">{formatCost(totalCost)}</div>
							</div>

							{/* Period */}
							<div className="ainative-p-4 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
								<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-2">
									<Calendar size={18} className="ainative-text-[#0e70c0]" />
									<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-uppercase">Period</span>
								</div>
								<div className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1">{getPeriodLabel(period)}</div>
							</div>
						</div>
					</ErrorBoundary>

					{/* Usage by Model */}
					<ErrorBoundary>
						<div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
							<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-4">Usage by Model</h3>

							{Object.keys(byModel).length === 0 ?
            <p className="ainative-text-sm ainative-text-ainative-fg-3 ainative-text-center ainative-py-8">
									No usage data for this period
								</p> :

            <div className="ainative-space-y-4">
									{Object.entries(byModel).
              sort(([, a], [, b]) => (b as any).tokens - (a as any).tokens).
              map(([modelId, stats]: [string, any]) => {
                const percentage = totalTokens > 0 ? stats.tokens / totalTokens * 100 : 0;

                return (
                  <div key={modelId} className="ainative-space-y-2">
													<div className="ainative-flex ainative-items-center ainative-justify-between">
														<div>
															<div className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">{modelId}</div>
															<div className="ainative-text-xs ainative-text-ainative-fg-3">
																{formatNumber(stats.calls)} calls • {formatNumber(stats.tokens)} tokens
															</div>
														</div>
														<div className="ainative-text-right">
															<div className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
																{formatCost(stats.cost)}
															</div>
															<div className="ainative-text-xs ainative-text-ainative-fg-3">{percentage.toFixed(1)}%</div>
														</div>
													</div>

													{/* Progress Bar */}
													<div className="ainative-w-full ainative-h-1.5 ainative-bg-ainative-bg-2 ainative-rounded-full ainative-overflow-hidden">
														<div
                        className="ainative-h-full ainative-bg-[#0e70c0] ainative-transition-all ainative-duration-300"
                        style={{ width: `${percentage}%` }} />

													</div>
												</div>);

              })}
								</div>
            }
						</div>
					</ErrorBoundary>
				</>
      }
		</div>);

};