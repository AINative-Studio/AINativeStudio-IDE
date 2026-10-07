/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useMemo } from 'react';
import { PieChart, Layers } from 'lucide-react';
import { ModelUsageData } from './types.js';
import { EmptyState } from '../primitives/EmptyState.js';

interface ModelBreakdownProps {
	data: ModelUsageData[];
	loading: boolean;
}

/**
 * ModelBreakdown Component
 * Pie chart showing usage distribution across models
 */
export const ModelBreakdown: React.FC<ModelBreakdownProps> = ({ data, loading }) => {
	// Calculate pie chart segments
	const pieSegments = useMemo(() => {
		if (!data || data.length === 0) return [];

		let currentAngle = -90; // Start from top
		return data.map((model) => {
			const startAngle = currentAngle;
			const sweepAngle = (model.percentage / 100) * 360;
			currentAngle += sweepAngle;

			// Calculate path for pie slice
			const radius = 80;
			const centerX = 100;
			const centerY = 100;

			const startRad = (startAngle * Math.PI) / 180;
			const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;

			const x1 = centerX + radius * Math.cos(startRad);
			const y1 = centerY + radius * Math.sin(startRad);
			const x2 = centerX + radius * Math.cos(endRad);
			const y2 = centerY + radius * Math.sin(endRad);

			const largeArc = sweepAngle > 180 ? 1 : 0;

			const path = [
				`M ${centerX} ${centerY}`,
				`L ${x1} ${y1}`,
				`A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
				'Z'
			].join(' ');

			// Calculate label position
			const labelAngle = startAngle + sweepAngle / 2;
			const labelRad = (labelAngle * Math.PI) / 180;
			const labelRadius = radius + 25;
			const labelX = centerX + labelRadius * Math.cos(labelRad);
			const labelY = centerY + labelRadius * Math.sin(labelRad);

			return {
				...model,
				path,
				labelX,
				labelY,
				startAngle,
				sweepAngle
			};
		});
	}, [data]);

	// Color palette for models. Rotates through the theme's own semantic tokens - not a
	// dedicated per-series chart palette (the design brief defines none) - so a multi-model
	// breakdown stays theme-correct in both light and dark rather than reintroducing the
	// hardcoded hex values the brief explicitly prohibits.
	const modelColors = [
		'var(--ainative-accent)',
		'var(--ainative-ok)',
		'var(--ainative-warning)',
		'var(--ainative-error)',
		'var(--ainative-accent-fg)',
		'var(--ainative-fg-2)',
	];

	if (loading) {
		return (
			<div className="p-6 bg-ainative-bg-2 border border-ainative-border-1 rounded-xl animate-pulse">
				<div className="h-6 bg-ainative-bg-3 rounded w-1/3 mb-4"></div>
				<div className="h-64 bg-ainative-bg-3 rounded"></div>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className="p-6 bg-ainative-bg-2 border border-ainative-border-1 rounded-xl">
				<div className="flex items-center gap-2 mb-4">
					<PieChart size={20} className="text-ainative-accent-fg" />
					<h3 className="text-lg font-medium text-ainative-fg-1">Model Distribution</h3>
				</div>
				<EmptyState
					mascot='blob'
					title='No model usage yet'
					body='Once you chat with a model, its share of usage shows up here.'
				/>
			</div>
		);
	}

	return (
		<div className="p-6 bg-ainative-bg-2 border border-ainative-border-1 rounded-xl">
			{/* Header */}
			<div className="flex items-center gap-2 mb-6">
				<PieChart size={20} className="text-ainative-accent-fg" />
				<h3 className="text-lg font-medium text-ainative-fg-1">Model Distribution</h3>
			</div>

			<div className="flex flex-col lg:flex-row items-center gap-8">
				{/* Pie Chart */}
				<div className="flex-shrink-0">
					<svg width="220" height="220" viewBox="0 0 220 220" className="drop-shadow-md">
						{/* Background circle */}
						<circle
							cx="110"
							cy="110"
							r="80"
							fill="currentColor"
							className="text-ainative-bg-3"
							opacity="0.2"
						/>

						{/* Pie segments */}
						{pieSegments.map((segment, i) => (
							<g key={segment.modelId}>
								<path
									d={segment.path}
									fill={modelColors[i % modelColors.length]}
									className="hover:opacity-80 transition-opacity cursor-pointer"
									transform="translate(10, 10)"
								>
									<title>
										{segment.modelName}: {segment.percentage.toFixed(1)}% ({segment.credits.toFixed(1)} credits)
									</title>
								</path>
							</g>
						))}

						{/* Center circle (donut hole) - matches the card's own background so it
							reads as a hole, not the page background behind it. */}
						<circle
							cx="110"
							cy="110"
							r="50"
							fill="currentColor"
							className="text-ainative-bg-2"
						/>

						{/* Center text */}
						<text
							x="110"
							y="105"
							textAnchor="middle"
							className="text-ainative-fg-3 text-xs"
							fill="currentColor"
						>
							Total
						</text>
						<text
							x="110"
							y="120"
							textAnchor="middle"
							className="text-ainative-fg-1 text-base font-medium"
							fill="currentColor"
						>
							{data.length} Models
						</text>
					</svg>
				</div>

				{/* Legend */}
				<div className="flex-1 space-y-3 max-h-64 overflow-y-auto">
					{data.map((model, i) => (
						<div key={model.modelId} className="flex items-start gap-3">
							{/* Color indicator */}
							<div
								className="w-4 h-4 rounded-sm flex-shrink-0 mt-0.5"
								style={{ backgroundColor: modelColors[i % modelColors.length] }}
							/>

							{/* Model info */}
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between gap-2 mb-1">
									<div className="text-sm font-medium text-ainative-fg-1 truncate">
										{model.modelName}
									</div>
									<div className="text-sm font-medium text-ainative-fg-1 flex-shrink-0">
										{model.percentage.toFixed(1)}%
									</div>
								</div>
								<div className="flex items-center gap-3 text-xs text-ainative-fg-3">
									<span>{model.credits.toFixed(2)} credits</span>
									<span>{model.tokens.toLocaleString()} tokens</span>
									<span>{model.requests} requests</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Summary Stats */}
			<div className="mt-6 pt-6 border-t border-ainative-border-1">
				<div className="flex items-center gap-2 mb-3">
					<Layers size={16} className="text-ainative-fg-3" />
					<span className="text-xs text-ainative-fg-3 uppercase">Summary</span>
				</div>
				<div className="grid grid-cols-3 gap-4">
					<div>
						<div className="text-xs text-ainative-fg-3 mb-1">Total Credits</div>
						<div className="text-lg font-medium text-ainative-fg-1">
							{data.reduce((sum, m) => sum + m.credits, 0).toFixed(2)}
						</div>
					</div>
					<div>
						<div className="text-xs text-ainative-fg-3 mb-1">Total Tokens</div>
						<div className="text-lg font-medium text-ainative-fg-1">
							{data.reduce((sum, m) => sum + m.tokens, 0).toLocaleString()}
						</div>
					</div>
					<div>
						<div className="text-xs text-ainative-fg-3 mb-1">Total Requests</div>
						<div className="text-lg font-medium text-ainative-fg-1">
							{data.reduce((sum, m) => sum + m.requests, 0).toLocaleString()}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
