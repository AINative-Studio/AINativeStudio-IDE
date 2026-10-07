/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';
import { TrendingUp, AlertCircle, Calendar, DollarSign, Lightbulb } from 'lucide-react';
import { ProjectionData } from './types.js';

interface CostProjectionProps {
	projection: ProjectionData | null;
	loading: boolean;
}

/**
 * CostProjection Component
 * Estimates future credit usage and provides recommendations
 */
export const CostProjection: React.FC<CostProjectionProps> = ({ projection, loading }) => {
	if (loading || !projection) {
		return (
			<div className="p-6 bg-ainative-bg-2 border border-ainative-border-1 rounded-xl animate-pulse">
				<div className="h-6 bg-ainative-bg-3 rounded w-1/3 mb-4"></div>
				<div className="space-y-3">
					<div className="h-16 bg-ainative-bg-3 rounded"></div>
					<div className="h-16 bg-ainative-bg-3 rounded"></div>
					<div className="h-20 bg-ainative-bg-3 rounded"></div>
				</div>
			</div>
		);
	}

	const {
		estimatedMonthlyCredits,
		estimatedMonthlyCost,
		projectedExhaustionDate,
		confidenceLevel,
		recommendation
	} = projection;

	// Determine if projection is concerning
	const isConcerning = projectedExhaustionDate && new Date(projectedExhaustionDate) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
	const confidenceColor = confidenceLevel >= 70 ? 'text-ainative-ok' : confidenceLevel >= 40 ? 'text-ainative-warning' : 'text-ainative-error';

	return (
		<div className="p-6 bg-ainative-bg-2 border border-ainative-border-1 rounded-xl">
			{/* Header */}
			<div className="flex items-center gap-2 mb-6">
				<TrendingUp size={20} className="text-ainative-accent-fg" />
				<h3 className="text-lg font-medium text-ainative-fg-1">Cost Projection</h3>
			</div>

			{/* Warning Banner */}
			{isConcerning && (
				<div className="mb-6 p-4 bg-ainative-error-bg border border-ainative-error/20 rounded-md flex items-start gap-3">
					<AlertCircle size={20} className="text-ainative-error mt-0.5 flex-shrink-0" />
					<div>
						<h4 className="text-sm font-medium text-ainative-error mb-1">Credits May Run Out Soon</h4>
						<p className="text-xs text-ainative-fg-3">
							Based on current usage patterns, your credits may be exhausted by{' '}
							{projectedExhaustionDate && new Date(projectedExhaustionDate).toLocaleDateString('en-US', {
								month: 'long',
								day: 'numeric',
								year: 'numeric'
							})}
						</p>
					</div>
				</div>
			)}

			{/* Projection Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				{/* Monthly Credits Estimate */}
				<div className="p-4 bg-ainative-bg-3 rounded-md">
					<div className="flex items-center gap-2 mb-2">
						<DollarSign size={16} className="text-ainative-accent-fg" />
						<span className="text-xs text-ainative-fg-3 uppercase">Estimated Monthly Credits</span>
					</div>
					<div className="text-2xl font-medium text-ainative-fg-1 mb-1">
						{estimatedMonthlyCredits.toLocaleString()}
					</div>
					<div className="text-xs text-ainative-fg-3">
						Based on last 30 days usage
					</div>
				</div>

				{/* Monthly Cost Estimate */}
				<div className="p-4 bg-ainative-bg-3 rounded-md">
					<div className="flex items-center gap-2 mb-2">
						<DollarSign size={16} className="text-ainative-accent-fg" />
						<span className="text-xs text-ainative-fg-3 uppercase">Estimated Monthly Cost</span>
					</div>
					<div className="text-2xl font-medium text-ainative-fg-1 mb-1">
						${estimatedMonthlyCost.toFixed(2)}
					</div>
					<div className="text-xs text-ainative-fg-3">
						At current pricing
					</div>
				</div>

				{/* Exhaustion Date */}
				{projectedExhaustionDate && (
					<div className={`p-4 rounded-md ${isConcerning ? 'bg-ainative-error-bg border border-ainative-error/20' : 'bg-ainative-bg-3'}`}>
						<div className="flex items-center gap-2 mb-2">
							<Calendar size={16} className={isConcerning ? 'text-ainative-error' : 'text-ainative-accent-fg'} />
							<span className={`text-xs uppercase ${isConcerning ? 'text-ainative-error' : 'text-ainative-fg-3'}`}>
								Projected Exhaustion
							</span>
						</div>
						<div className={`text-2xl font-medium mb-1 ${isConcerning ? 'text-ainative-error' : 'text-ainative-fg-1'}`}>
							{new Date(projectedExhaustionDate).toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric'
							})}
						</div>
						<div className={`text-xs ${isConcerning ? 'text-ainative-error/80' : 'text-ainative-fg-3'}`}>
							{Math.ceil((new Date(projectedExhaustionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
						</div>
					</div>
				)}

				{/* Confidence Level */}
				<div className="p-4 bg-ainative-bg-3 rounded-md">
					<div className="flex items-center gap-2 mb-2">
						<TrendingUp size={16} className="text-ainative-accent-fg" />
						<span className="text-xs text-ainative-fg-3 uppercase">Confidence Level</span>
					</div>
					<div className={`text-2xl font-medium mb-1 ${confidenceColor}`}>
						{confidenceLevel}%
					</div>
					<div className="w-full h-1.5 bg-ainative-bg-2 rounded-full overflow-hidden">
						<div
							className={`h-full transition-all duration-500 ${
								confidenceLevel >= 70 ? 'bg-ainative-ok' :
								confidenceLevel >= 40 ? 'bg-ainative-warning' :
								'bg-ainative-error'
							}`}
							style={{ width: `${confidenceLevel}%` }}
						/>
					</div>
				</div>
			</div>

			{/* Recommendation */}
			<div className="p-4 bg-ainative-accent-bg border border-ainative-accent rounded-md">
				<div className="flex items-start gap-3">
					<Lightbulb size={20} className="text-ainative-accent-fg mt-0.5 flex-shrink-0" />
					<div>
						<h4 className="text-sm font-medium text-ainative-accent-fg mb-1">Recommendation</h4>
						<p className="text-sm text-ainative-fg-3">
							{recommendation}
						</p>
					</div>
				</div>
			</div>

			{/* Methodology Note */}
			<div className="mt-4 text-xs text-ainative-fg-3 text-center">
				Projections based on historical usage patterns and may not reflect future changes in usage.
			</div>
		</div>
	);
};
