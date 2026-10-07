/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { CreditsStatus } from '../../../../common/usageTrackingTypes.js';

// Refills (buying more credits mid-subscription-period) is handled entirely
// by the existing, working checkout flow on the public site - not
// reimplemented in the IDE. See #164: an embedded Stripe checkout was
// drafted and then deliberately reverted once it was confirmed this page
// already exists and already works.
const REFILLS_URL = 'https://ainative.studio/refills';

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
			<div className="p-6 bg-ainative-bg-2 border border-ainative-border-1 rounded-xl animate-pulse">
				<div className="h-6 bg-ainative-bg-3 rounded w-1/3 mb-4"></div>
				<div className="h-8 bg-ainative-bg-3 rounded w-1/2 mb-2"></div>
				<div className="h-2 bg-ainative-bg-3 rounded w-full"></div>
			</div>
		);
	}

	const { used, remaining, total, percentUsed, isLow, planTier, resetDate } = creditsStatus;

	// Determine status color based on usage, using the redesign's shared ok/warning/error
	// tokens (docs/design/handoff README "Design Tokens") instead of ad-hoc Tailwind colors,
	// so this reads as the same system as StatusDot/Card elsewhere rather than a separate one.
	const getStatusColor = () => {
		if (percentUsed >= 90) return 'error';
		if (percentUsed >= 75) return 'warning';
		return 'accent';
	};

	const statusColor = getStatusColor();
	const barColor = {
		error: 'bg-ainative-error',
		warning: 'bg-ainative-warning',
		accent: 'bg-ainative-accent-solid'
	}[statusColor];

	const trend = percentUsed >= 80 ? 'high' : percentUsed <= 20 ? 'low' : 'normal';

	return (
		<div className="p-6 bg-ainative-bg-2 border border-ainative-border-1 rounded-xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<DollarSign size={20} className="text-ainative-accent-fg" />
					<h3 className="text-lg font-medium text-ainative-fg-1">Credits Status</h3>
				</div>

				{/* Plan Badge + Buy Refill */}
				<div className="flex items-center gap-2">
					<div className="px-3 py-1 bg-ainative-bg-3 rounded-full text-xs font-medium text-ainative-fg-1 capitalize">
						{planTier} Plan
					</div>
					<button
						type="button"
						className="flex items-center gap-1 px-3 py-1 bg-ainative-accent-solid hover:bg-ainative-accent-solid-hover text-white rounded-full text-xs font-medium transition-colors"
						onClick={() => window.open(REFILLS_URL, '_blank')}
					>
						Buy Refill
						<ExternalLink size={12} />
					</button>
				</div>
			</div>

			{/* Warning Banner */}
			{isLow && (
				<div className="mb-4 p-3 bg-ainative-warning/10 border border-ainative-warning/20 rounded-md flex items-start gap-3">
					<AlertTriangle size={18} className="text-ainative-warning mt-0.5 flex-shrink-0" />
					<div className="flex-1">
						<h4 className="text-sm font-medium text-ainative-warning mb-1">Credits Running Low</h4>
						<p className="text-xs text-ainative-fg-3 mb-2">
							You have used {percentUsed.toFixed(0)}% of your credits.
						</p>
						<button
							type="button"
							className="flex items-center gap-1 text-xs font-medium text-ainative-warning hover:brightness-110 underline underline-offset-2"
							onClick={() => window.open(REFILLS_URL, '_blank')}
						>
							Buy a credit refill
							<ExternalLink size={11} />
						</button>
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
						{trend === 'high' && <TrendingUp size={12} className="text-ainative-error" />}
					</div>
					<div className="text-2xl font-medium text-ainative-fg-1">
						{used.toLocaleString()}
					</div>
				</div>

				{/* Remaining Credits */}
				<div>
					<div className="text-xs text-ainative-fg-3 mb-1 flex items-center gap-1">
						Remaining
						{trend === 'low' && <TrendingDown size={12} className="text-ainative-warning" />}
						{trend === 'normal' && <CheckCircle2 size={12} className="text-ainative-ok" />}
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
						statusColor === 'error' ? 'text-ainative-error' :
						statusColor === 'warning' ? 'text-ainative-warning' :
						'text-ainative-accent-fg'
					}`}>
						{percentUsed.toFixed(1)}%
					</span>
				</div>

				<div className="w-full h-3 bg-ainative-bg-3 rounded-full overflow-hidden">
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
