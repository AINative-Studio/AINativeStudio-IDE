/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useCallback } from 'react';
import { useAccessor } from '../util/services.js';
import {
  RefreshCw,
  Download,
  Loader2,
  AlertTriangle,
  Activity } from
'lucide-react';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { CreditsDisplay } from './CreditsDisplay.js';
import { UsageChart } from './UsageChart.js';
import { ModelBreakdown } from './ModelBreakdown.js';
import { CostProjection } from './CostProjection.js';
import { PeriodFilter, ChartDataPoint, ModelUsageData, ProjectionData, ExportFormat } from './types.js';
import { CreditsHistory } from '../../../../common/usageTrackingTypes.js';

/**
 * UsageDashboard Component
 * Comprehensive dashboard showing credits, usage, and projections
 */
export const UsageDashboard: React.FC = () => {
  const accessor = useAccessor();
  const usageTrackingService = accessor.get('IUsageTrackingService');

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('30days');

  // Data state
  const [creditsStatus, setCreditsStatus] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [modelData, setModelData] = useState<ModelUsageData[]>([]);
  const [projection, setProjection] = useState<ProjectionData | null>(null);

  /**
   * Convert period filter to days
   */
  const periodToDays = (p: PeriodFilter): number => {
    switch (p) {
      case '7days':return 7;
      case '30days':return 30;
      case '90days':return 90;
    }
  };

  /**
   * Load all dashboard data
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const days = periodToDays(period);

      // Load credits status
      const credits = await usageTrackingService.getCreditsStatus();
      setCreditsStatus(credits);

      // Load usage history for chart
      const history: CreditsHistory = await usageTrackingService.getCreditsHistory(days);
      const chartPoints: ChartDataPoint[] = history.dailyUsage.map((day) => ({
        date: day.date,
        credits: day.creditsUsed,
        tokens: day.tokensUsed,
        requests: day.requestCount
      }));
      setChartData(chartPoints);

      // Load usage stats for model breakdown
      const usage = await usageTrackingService.getUsage(
        period === '7days' ? 'week' : 'month'
      );

      // Convert to model usage data
      const modelColors = [
      '#0e70c0', '#4a90e2', '#7fba00', '#ffb900',
      '#e74856', '#8764b8', '#00b7c3', '#ca5010'];


      const models: ModelUsageData[] = Object.entries(usage.byModel || {}).map(([modelId, stats], i) => ({
        modelId,
        modelName: modelId,
        credits: stats.cost,
        tokens: stats.tokens,
        requests: stats.calls,
        percentage: usage.totalTokens > 0 ? stats.tokens / usage.totalTokens * 100 : 0,
        color: modelColors[i % modelColors.length]
      })).sort((a, b) => b.credits - a.credits);

      setModelData(models);

      // Calculate projection
      if (history.dailyUsage.length > 0) {
        const avgDailyCredits = history.totalCreditsUsed / history.dailyUsage.length;
        const estimatedMonthlyCredits = avgDailyCredits * 30;
        const estimatedMonthlyCost = estimatedMonthlyCredits * 0.001; // Assuming $0.001 per credit

        let projectedExhaustionDate: Date | undefined;
        if (credits && credits.remaining > 0 && avgDailyCredits > 0) {
          const daysRemaining = credits.remaining / avgDailyCredits;
          projectedExhaustionDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
        }

        // Calculate confidence level based on data consistency
        const confidenceLevel = Math.min(
          100,
          history.dailyUsage.length / days * 100 * 0.7 + 30
        );

        // Generate recommendation
        let recommendation = 'Your usage is stable. Continue monitoring.';
        if (credits && credits.percentUsed >= 90) {
          recommendation = 'You are running low on credits. Consider upgrading your plan immediately.';
        } else if (credits && credits.percentUsed >= 75) {
          recommendation = 'Consider upgrading your plan soon to avoid service interruption.';
        } else if (avgDailyCredits > credits.total / 30) {
          recommendation = 'Your current usage rate exceeds your monthly allocation. Consider upgrading.';
        }

        setProjection({
          estimatedMonthlyCredits,
          estimatedMonthlyCost,
          projectedExhaustionDate,
          confidenceLevel,
          recommendation
        });
      }

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

  /**
   * Export usage data
   */
  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        period,
        creditsStatus,
        usageHistory: chartData,
        modelBreakdown: modelData,
        projection
      };

      if (format === 'json') {
        // Export as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage-report-${period}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Export as CSV
        const csvLines: string[] = [];

        // Header
        csvLines.push('Usage Report');
        csvLines.push(`Export Date: ${new Date().toISOString()}`);
        csvLines.push(`Period: ${period}`);
        csvLines.push('');

        // Credits status
        csvLines.push('Credits Status');
        csvLines.push('Used,Remaining,Total,Percent Used,Plan Tier');
        if (creditsStatus) {
          csvLines.push(
            `${creditsStatus.used},${creditsStatus.remaining},${creditsStatus.total},${creditsStatus.percentUsed},${creditsStatus.planTier}`
          );
        }
        csvLines.push('');

        // Usage history
        csvLines.push('Usage History');
        csvLines.push('Date,Credits,Tokens,Requests');
        chartData.forEach((point) => {
          csvLines.push(`${point.date},${point.credits},${point.tokens},${point.requests}`);
        });
        csvLines.push('');

        // Model breakdown
        csvLines.push('Model Breakdown');
        csvLines.push('Model,Credits,Tokens,Requests,Percentage');
        modelData.forEach((model) => {
          csvLines.push(
            `${model.modelName},${model.credits},${model.tokens},${model.requests},${model.percentage}`
          );
        });

        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage-report-${period}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[UsageDashboard] Failed to export:', err);
    }
  }, [period, creditsStatus, chartData, modelData, projection]);

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

  return (
    <div className="ainative-p-6 ainative-max-w-7xl ainative-mx-auto">
			{/* Header */}
			<div className="ainative-flex ainative-items-center ainative-justify-between ainative-mb-6">
				<div className="ainative-flex ainative-items-center ainative-gap-3">
					<Activity size={28} className="ainative-text-[#0e70c0]" />
					<h1 className="ainative-text-3xl ainative-font-medium ainative-text-ainative-fg-1">Usage Dashboard</h1>
				</div>

				<div className="ainative-flex ainative-items-center ainative-gap-3">
					{/* Period Filter */}
					<select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="ainative-px-3 ainative-py-2 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-text-sm ainative-text-ainative-fg-1 focus:ainative-border-ainative-border-1 focus:ainative-outline-none"
            disabled={loading}>

						<option value="7days">Last 7 Days</option>
						<option value="30days">Last 30 Days</option>
						<option value="90days">Last 90 Days</option>
					</select>

					{/* Export Button */}
					<div className="ainative-relative ainative-group">
						<button
              className="ainative-p-2 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md hover:ainative-bg-ainative-bg-2-hover ainative-transition-colors"
              aria-label="Export data">

							<Download size={18} className="ainative-text-ainative-fg-3" />
						</button>
						<div className="ainative-hidden group-hover:ainative-block ainative-absolute ainative-right-0 ainative-mt-2 ainative-w-32 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-shadow-lg ainative-overflow-hidden ainative-z-10">
							<button
                onClick={() => handleExport('csv')}
                className="ainative-w-full ainative-px-4 ainative-py-2 ainative-text-left ainative-text-sm ainative-text-ainative-fg-1 hover:ainative-bg-ainative-bg-2-hover ainative-transition-colors">

								Export CSV
							</button>
							<button
                onClick={() => handleExport('json')}
                className="ainative-w-full ainative-px-4 ainative-py-2 ainative-text-left ainative-text-sm ainative-text-ainative-fg-1 hover:ainative-bg-ainative-bg-2-hover ainative-transition-colors">

								Export JSON
							</button>
						</div>
					</div>

					{/* Refresh Button */}
					<button
            onClick={handleRefresh}
            disabled={refreshing || loading}
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
						<p className="ainative-text-ainative-fg-3">Loading dashboard...</p>
					</div>
				</div> :
      error ?
      <div className="ainative-flex ainative-items-center ainative-justify-center ainative-py-24">
					<div className="ainative-text-center ainative-p-8 ainative-max-w-md">
						<AlertTriangle className="ainative-mx-auto ainative-mb-4 ainative-text-red-500" size={48} />
						<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-2">Error Loading Dashboard</h3>
						<p className="ainative-text-ainative-fg-3 ainative-mb-4">{error}</p>
						<button
            onClick={loadData}
            className="ainative-px-4 ainative-py-2 ainative-bg-[#0e70c0] ainative-text-white ainative-rounded-md hover:ainative-bg-[#1177cb] ainative-transition-colors">

							Try Again
						</button>
					</div>
				</div> :

      <div className="ainative-space-y-6">
					{/* Credits Display */}
					<ErrorBoundary>
						<CreditsDisplay creditsStatus={creditsStatus} loading={false} />
					</ErrorBoundary>

					{/* Usage Chart */}
					<ErrorBoundary>
						<UsageChart data={chartData} period={period} loading={false} />
					</ErrorBoundary>

					{/* Model Breakdown and Cost Projection */}
					<div className="ainative-grid ainative-grid-cols-1 lg:ainative-grid-cols-2 ainative-gap-6">
						<ErrorBoundary>
							<ModelBreakdown data={modelData} loading={false} />
						</ErrorBoundary>

						<ErrorBoundary>
							<CostProjection projection={projection} loading={false} />
						</ErrorBoundary>
					</div>
				</div>
      }
		</div>);

};