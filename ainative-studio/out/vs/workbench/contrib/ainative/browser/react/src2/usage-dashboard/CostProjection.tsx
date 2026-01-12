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
      <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-animate-pulse">
				<div className="ainative-h-6 ainative-bg-ainative-bg-2 ainative-rounded ainative-w-1/3 ainative-mb-4"></div>
				<div className="ainative-space-y-3">
					<div className="ainative-h-16 ainative-bg-ainative-bg-2 ainative-rounded"></div>
					<div className="ainative-h-16 ainative-bg-ainative-bg-2 ainative-rounded"></div>
					<div className="ainative-h-20 ainative-bg-ainative-bg-2 ainative-rounded"></div>
				</div>
			</div>);

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
    <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
			{/* Header */}
			<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-6">
				<TrendingUp size={20} className="ainative-text-[#0e70c0]" />
				<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">Cost Projection</h3>
			</div>

			{/* Warning Banner */}
			{isConcerning &&
      <div className="ainative-mb-6 ainative-p-4 ainative-bg-red-500/10 ainative-border ainative-border-red-500/20 ainative-rounded-md ainative-flex ainative-items-start ainative-gap-3">
					<AlertCircle size={20} className="ainative-text-red-500 ainative-mt-0.5 ainative-flex-shrink-0" />
					<div>
						<h4 className="ainative-text-sm ainative-font-medium ainative-text-red-500 ainative-mb-1">Credits May Run Out Soon</h4>
						<p className="ainative-text-xs ainative-text-ainative-fg-3">
							Based on current usage patterns, your credits may be exhausted by{' '}
							{projectedExhaustionDate && new Date(projectedExhaustionDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
						</p>
					</div>
				</div>
      }

			{/* Projection Cards */}
			<div className="ainative-grid ainative-grid-cols-1 md:ainative-grid-cols-2 ainative-gap-4 ainative-mb-6">
				{/* Monthly Credits Estimate */}
				<div className="ainative-p-4 ainative-bg-ainative-bg-2 ainative-rounded-md">
					<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-2">
						<DollarSign size={16} className="ainative-text-[#0e70c0]" />
						<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-uppercase">Estimated Monthly Credits</span>
					</div>
					<div className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-1">
						{estimatedMonthlyCredits.toLocaleString()}
					</div>
					<div className="ainative-text-xs ainative-text-ainative-fg-3">
						Based on last 30 days usage
					</div>
				</div>

				{/* Monthly Cost Estimate */}
				<div className="ainative-p-4 ainative-bg-ainative-bg-2 ainative-rounded-md">
					<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-2">
						<DollarSign size={16} className="ainative-text-[#0e70c0]" />
						<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-uppercase">Estimated Monthly Cost</span>
					</div>
					<div className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-1">
						${estimatedMonthlyCost.toFixed(2)}
					</div>
					<div className="ainative-text-xs ainative-text-ainative-fg-3">
						At current pricing
					</div>
				</div>

				{/* Exhaustion Date */}
				{projectedExhaustionDate &&
        <div className={`ainative-p-4 ainative-rounded-md ${isConcerning ? "ainative-bg-red-500/10 ainative-border ainative-border-red-500/20" : "ainative-bg-ainative-bg-2"}`}>
						<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-2">
							<Calendar size={16} className={isConcerning ? "ainative-text-red-500" : "ainative-text-[#0e70c0]"} />
							<span className={`ainative-text-xs ainative-uppercase ${isConcerning ? "ainative-text-red-500" : "ainative-text-ainative-fg-3"}`}>
								Projected Exhaustion
							</span>
						</div>
						<div className={`ainative-text-2xl ainative-font-medium ainative-mb-1 ${isConcerning ? "ainative-text-red-500" : "ainative-text-ainative-fg-1"}`}>
							{new Date(projectedExhaustionDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
						</div>
						<div className={`ainative-text-xs ${isConcerning ? "ainative-text-red-500/80" : "ainative-text-ainative-fg-3"}`}>
							{Math.ceil((new Date(projectedExhaustionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
						</div>
					</div>
        }

				{/* Confidence Level */}
				<div className="ainative-p-4 ainative-bg-ainative-bg-2 ainative-rounded-md">
					<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-2">
						<TrendingUp size={16} className="ainative-text-[#0e70c0]" />
						<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-uppercase">Confidence Level</span>
					</div>
					<div className={`ainative-text-2xl ainative-font-medium ainative-mb-1 ${confidenceColor}`}>
						{confidenceLevel}%
					</div>
					<div className="ainative-w-full ainative-h-1.5 ainative-bg-ainative-bg-1 ainative-rounded-full ainative-overflow-hidden">
						<div
              className={`ainative-h-full ainative-transition-all ainative-duration-500 ${
              confidenceLevel >= 70 ? "ainative-bg-green-500" :
              confidenceLevel >= 40 ? "ainative-bg-yellow-500" : "ainative-bg-red-500"}`}


              style={{ width: `${confidenceLevel}%` }} />

					</div>
				</div>
			</div>

			{/* Recommendation */}
			<div className="ainative-p-4 ainative-bg-[#0e70c0]/10 ainative-border ainative-border-[#0e70c0]/20 ainative-rounded-md">
				<div className="ainative-flex ainative-items-start ainative-gap-3">
					<Lightbulb size={20} className="ainative-text-[#0e70c0] ainative-mt-0.5 ainative-flex-shrink-0" />
					<div>
						<h4 className="ainative-text-sm ainative-font-medium ainative-text-[#0e70c0] ainative-mb-1">Recommendation</h4>
						<p className="ainative-text-sm ainative-text-ainative-fg-3">
							{recommendation}
						</p>
					</div>
				</div>
			</div>

			{/* Methodology Note */}
			<div className="ainative-mt-4 ainative-text-xs ainative-text-ainative-fg-3 ainative-text-center">
				Projections based on historical usage patterns and may not reflect future changes in usage.
			</div>
		</div>);

};