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
			<div className="p-6 bg-ainative-bg-1 border border-ainative-border-2 rounded-md animate-pulse">
				<div className="h-6 bg-ainative-bg-2 rounded w-1/3 mb-4"></div>
				<div className="h-8 bg-ainative-bg-2 rounded w-1/2 mb-2"></div>
				<div className="h-2 bg-ainative-bg-2 rounded w-full"></div>
			</div>
		);
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
		<div className="p-6 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<DollarSign size={20} className="text-[#0e70c0]" />
					<h3 className="text-lg font-medium text-ainative-fg-1">Credits Status</h3>
				</div>

				{/* Plan Badge */}
				<div className="px-3 py-1 bg-ainative-bg-2 rounded-full text-xs font-medium text-ainative-fg-1 capitalize">
					{planTier} Plan
				</div>
			</div>

			{/* Warning Banner */}
			{isLow && (
				<div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-3">
					<AlertTriangle size={18} className="text-yellow-500 mt-0.5 flex-shrink-0" />
					<div>
						<h4 className="text-sm font-medium text-yellow-500 mb-1">Credits Running Low</h4>
						<p className="text-xs text-ainative-fg-3">
							You have used {percentUsed.toFixed(0)}% of your credits. Consider upgrading your plan.
						</p>
					</div>
				</div>
			)}

			{/* Credits Display */}
			<div className="grid grid-cols-3 gap-4 mb-4">
				{/* Total Credits */}
				<div>
					<div className="text-xs text-ainative-fg-3 mb-1">Total</div>
					<div className="text-2xl font-medium text-ainative-fg-1">
						{total.toLocaleString()}
					</div>
				</div>

				{/* Used Credits */}
				<div>
					<div className="text-xs text-ainative-fg-3 mb-1 flex items-center gap-1">
						Used
						{trend === 'high' && <TrendingUp size={12} className="text-red-500" />}
					</div>
					<div className="text-2xl font-medium text-ainative-fg-1">
						{used.toLocaleString()}
					</div>
				</div>

				{/* Remaining Credits */}
				<div>
					<div className="text-xs text-ainative-fg-3 mb-1 flex items-center gap-1">
						Remaining
						{trend === 'low' && <TrendingDown size={12} className="text-yellow-500" />}
						{trend === 'normal' && <CheckCircle2 size={12} className="text-green-500" />}
					</div>
					<div className="text-2xl font-medium text-ainative-fg-1">
						{remaining.toLocaleString()}
					</div>
				</div>
			</div>

			{/* Progress Bar */}
			<div className="mb-2">
				<div className="flex items-center justify-between text-sm mb-1">
					<span className="text-ainative-fg-3">
						{used.toLocaleString()} / {total.toLocaleString()} credits
					</span>
					<span className={`font-medium ${
						statusColor === 'red' ? 'text-red-500' :
						statusColor === 'yellow' ? 'text-yellow-500' :
						'text-[#0e70c0]'
					}`}>
						{percentUsed.toFixed(1)}%
					</span>
				</div>

				<div className="w-full h-3 bg-ainative-bg-2 rounded-full overflow-hidden">
					<div
						className={`h-full transition-all duration-500 ${barColor}`}
						style={{ width: `${Math.min(percentUsed, 100)}%` }}
					/>
				</div>
			</div>

			{/* Reset Date */}
			{resetDate && (
				<div className="text-xs text-ainative-fg-3">
					Resets on {new Date(resetDate).toLocaleDateString('en-US', {
						month: 'long',
						day: 'numeric',
						year: 'numeric'
					})}
				</div>
			)}
		</div>
	);
};
