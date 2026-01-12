/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CreditsStatus } from '../../../../common/usageTrackingTypes.js';

interface CreditsDisplayProps {
  creditsStatus: CreditsStatus | null;
  loading: boolean;
}

/**
 * CreditsDisplay Component
 * Shows credits used, remaining, and visual quota bar with warnings
 */
export const CreditsDisplay: React.FC<CreditsDisplayProps> = ({ creditsStatus, loading }) => {
  if (loading || !creditsStatus) {
    return (
      <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-animate-pulse">
				<div className="ainative-h-6 ainative-bg-ainative-bg-2 ainative-rounded ainative-w-1/3 ainative-mb-4"></div>
				<div className="ainative-h-8 ainative-bg-ainative-bg-2 ainative-rounded ainative-w-1/2 ainative-mb-2"></div>
				<div className="ainative-h-2 ainative-bg-ainative-bg-2 ainative-rounded ainative-w-full"></div>
			</div>);

  }

  const { used, remaining, total, percentUsed, isLow, planTier, resetDate } = creditsStatus;

  // Determine status color based on usage
  const getStatusColor = () => {
    if (percentUsed >= 90) return 'red';
    if (percentUsed >= 75) return 'yellow';
    return 'blue';
  };

  const statusColor = getStatusColor();
  const barColor = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-[#0e70c0]'
  }[statusColor];

  const trend = percentUsed >= 80 ? 'high' : percentUsed <= 20 ? 'low' : 'normal';

  return (
    <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
			{/* Header */}
			<div className="ainative-flex ainative-items-center ainative-justify-between ainative-mb-4">
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					<DollarSign size={20} className="ainative-text-[#0e70c0]" />
					<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">Credits Status</h3>
				</div>

				{/* Plan Badge */}
				<div className="ainative-px-3 ainative-py-1 ainative-bg-ainative-bg-2 ainative-rounded-full ainative-text-xs ainative-font-medium ainative-text-ainative-fg-1 ainative-capitalize">
					{planTier} Plan
				</div>
			</div>

			{/* Warning Banner */}
			{isLow &&
      <div className="ainative-mb-4 ainative-p-3 ainative-bg-yellow-500/10 ainative-border ainative-border-yellow-500/20 ainative-rounded-md ainative-flex ainative-items-start ainative-gap-3">
					<AlertTriangle size={18} className="ainative-text-yellow-500 ainative-mt-0.5 ainative-flex-shrink-0" />
					<div>
						<h4 className="ainative-text-sm ainative-font-medium ainative-text-yellow-500 ainative-mb-1">Credits Running Low</h4>
						<p className="ainative-text-xs ainative-text-ainative-fg-3">
							You have used {percentUsed.toFixed(0)}% of your credits. Consider upgrading your plan.
						</p>
					</div>
				</div>
      }

			{/* Credits Display */}
			<div className="ainative-grid ainative-grid-cols-3 ainative-gap-4 ainative-mb-4">
				{/* Total Credits */}
				<div>
					<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Total</div>
					<div className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1">
						{total.toLocaleString()}
					</div>
				</div>

				{/* Used Credits */}
				<div>
					<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1 ainative-flex ainative-items-center ainative-gap-1">
						Used
						{trend === 'high' && <TrendingUp size={12} className="ainative-text-red-500" />}
					</div>
					<div className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1">
						{used.toLocaleString()}
					</div>
				</div>

				{/* Remaining Credits */}
				<div>
					<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1 ainative-flex ainative-items-center ainative-gap-1">
						Remaining
						{trend === 'low' && <TrendingDown size={12} className="ainative-text-yellow-500" />}
						{trend === 'normal' && <CheckCircle2 size={12} className="ainative-text-green-500" />}
					</div>
					<div className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1">
						{remaining.toLocaleString()}
					</div>
				</div>
			</div>

			{/* Progress Bar */}
			<div className="ainative-mb-2">
				<div className="ainative-flex ainative-items-center ainative-justify-between ainative-text-sm ainative-mb-1">
					<span className="ainative-text-ainative-fg-3">
						{used.toLocaleString()} / {total.toLocaleString()} credits
					</span>
					<span className={`ainative-font-medium ${
          statusColor === 'red' ? "ainative-text-red-500" :
          statusColor === 'yellow' ? "ainative-text-yellow-500" : "ainative-text-[#0e70c0]"}`}>


						{percentUsed.toFixed(1)}%
					</span>
				</div>

				<div className="ainative-w-full ainative-h-3 ainative-bg-ainative-bg-2 ainative-rounded-full ainative-overflow-hidden">
					<div
            className={`ainative-h-full ainative-transition-all ainative-duration-500 ${barColor}`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }} />

				</div>
			</div>

			{/* Reset Date */}
			{resetDate &&
      <div className="ainative-text-xs ainative-text-ainative-fg-3">
					Resets on {new Date(resetDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}
				</div>
      }
		</div>);

};