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
			<div className="p-6 bg-ainative-bg-1 border border-ainative-border-2 rounded-md animate-pulse">
				<div className="h-6 bg-ainative-bg-2 rounded w-1/3 mb-4"></div>
				<div className="space-y-3">
					<div className="h-16 bg-ainative-bg-2 rounded"></div>
					<div className="h-16 bg-ainative-bg-2 rounded"></div>
					<div className="h-20 bg-ainative-bg-2 rounded"></div>
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
	const confidenceColor = confidenceLevel >= 70 ? 'text-green-500' : confidenceLevel >= 40 ? 'text-yellow-500' : 'text-red-500';

	return (
		<div className="p-6 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
			{/* Header */}
			<div className="flex items-center gap-2 mb-6">
				<TrendingUp size={20} className="text-[#0e70c0]" />
				<h3 className="text-lg font-medium text-ainative-fg-1">Cost Projection</h3>
			</div>

			{/* Warning Banner */}
			{isConcerning && (
				<div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-3">
					<AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
					<div>
						<h4 className="text-sm font-medium text-red-500 mb-1">Credits May Run Out Soon</h4>
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
				<div className="p-4 bg-ainative-bg-2 rounded-md">
					<div className="flex items-center gap-2 mb-2">
						<DollarSign size={16} className="text-[#0e70c0]" />
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
				<div className="p-4 bg-ainative-bg-2 rounded-md">
					<div className="flex items-center gap-2 mb-2">
						<DollarSign size={16} className="text-[#0e70c0]" />
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
					<div className={`p-4 rounded-md ${isConcerning ? 'bg-red-500/10 border border-red-500/20' : 'bg-ainative-bg-2'}`}>
						<div className="flex items-center gap-2 mb-2">
							<Calendar size={16} className={isConcerning ? 'text-red-500' : 'text-[#0e70c0]'} />
							<span className={`text-xs uppercase ${isConcerning ? 'text-red-500' : 'text-ainative-fg-3'}`}>
								Projected Exhaustion
							</span>
						</div>
						<div className={`text-2xl font-medium mb-1 ${isConcerning ? 'text-red-500' : 'text-ainative-fg-1'}`}>
							{new Date(projectedExhaustionDate).toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric'
							})}
						</div>
						<div className={`text-xs ${isConcerning ? 'text-red-500/80' : 'text-ainative-fg-3'}`}>
							{Math.ceil((new Date(projectedExhaustionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
						</div>
					</div>
				)}

				{/* Confidence Level */}
				<div className="p-4 bg-ainative-bg-2 rounded-md">
					<div className="flex items-center gap-2 mb-2">
						<TrendingUp size={16} className="text-[#0e70c0]" />
						<span className="text-xs text-ainative-fg-3 uppercase">Confidence Level</span>
					</div>
					<div className={`text-2xl font-medium mb-1 ${confidenceColor}`}>
						{confidenceLevel}%
					</div>
					<div className="w-full h-1.5 bg-ainative-bg-1 rounded-full overflow-hidden">
						<div
							className={`h-full transition-all duration-500 ${
								confidenceLevel >= 70 ? 'bg-green-500' :
								confidenceLevel >= 40 ? 'bg-yellow-500' :
								'bg-red-500'
							}`}
							style={{ width: `${confidenceLevel}%` }}
						/>
					</div>
				</div>
			</div>

			{/* Recommendation */}
			<div className="p-4 bg-[#0e70c0]/10 border border-[#0e70c0]/20 rounded-md">
				<div className="flex items-start gap-3">
					<Lightbulb size={20} className="text-[#0e70c0] mt-0.5 flex-shrink-0" />
					<div>
						<h4 className="text-sm font-medium text-[#0e70c0] mb-1">Recommendation</h4>
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
