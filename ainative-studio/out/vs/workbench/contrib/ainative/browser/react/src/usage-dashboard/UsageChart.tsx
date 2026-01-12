/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useMemo } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { ChartDataPoint, PeriodFilter } from './types.js';

interface UsageChartProps {
	data: ChartDataPoint[];
	period: PeriodFilter;
	loading: boolean;
}

/**
 * UsageChart Component
 * Line chart showing credits usage over time
 */
export const UsageChart: React.FC<UsageChartProps> = ({ data, period, loading }) => {
	// Calculate chart dimensions and scale
	const chartHeight = 200;
	const chartWidth = 600;
	const padding = { top: 20, right: 20, bottom: 40, left: 60 };
	const innerWidth = chartWidth - padding.left - padding.right;
	const innerHeight = chartHeight - padding.top - padding.bottom;

	// Find min/max for scaling
	const { minValue, maxValue, points } = useMemo(() => {
		if (!data || data.length === 0) {
			return { minValue: 0, maxValue: 100, points: [] };
		}

		const values = data.map(d => d.credits);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min || 1;

		// Create points for the line chart
		const pts = data.map((d, i) => {
			const x = padding.left + (i / (data.length - 1 || 1)) * innerWidth;
			const y = padding.top + innerHeight - ((d.credits - min) / range) * innerHeight;
			return { x, y, data: d };
		});

		return { minValue: min, maxValue: max, points: pts };
	}, [data, innerWidth, innerHeight, padding]);

	// Create SVG path for the line
	const linePath = useMemo(() => {
		if (points.length === 0) return '';
		return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
	}, [points]);

	// Create area fill path
	const areaPath = useMemo(() => {
		if (points.length === 0) return '';
		const start = `M ${padding.left} ${padding.top + innerHeight}`;
		const line = points.map(p => `L ${p.x} ${p.y}`).join(' ');
		const end = `L ${padding.left + innerWidth} ${padding.top + innerHeight} Z`;
		return `${start} ${line} ${end}`;
	}, [points, padding, innerWidth, innerHeight]);

	// Format date for display
	const formatDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	};

	// Calculate average and trend
	const stats = useMemo(() => {
		if (data.length === 0) return { avg: 0, trend: 0 };

		const total = data.reduce((sum, d) => sum + d.credits, 0);
		const avg = total / data.length;

		// Calculate trend (comparing first half to second half)
		const mid = Math.floor(data.length / 2);
		const firstHalf = data.slice(0, mid).reduce((sum, d) => sum + d.credits, 0) / mid;
		const secondHalf = data.slice(mid).reduce((sum, d) => sum + d.credits, 0) / (data.length - mid);
		const trend = ((secondHalf - firstHalf) / (firstHalf || 1)) * 100;

		return { avg, trend };
	}, [data]);

	if (loading) {
		return (
			<div className="p-6 bg-ainative-bg-1 border border-ainative-border-2 rounded-md animate-pulse">
				<div className="h-6 bg-ainative-bg-2 rounded w-1/3 mb-4"></div>
				<div className="h-48 bg-ainative-bg-2 rounded"></div>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className="p-6 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
				<div className="flex items-center gap-2 mb-4">
					<TrendingUp size={20} className="text-[#0e70c0]" />
					<h3 className="text-lg font-medium text-ainative-fg-1">Usage Over Time</h3>
				</div>
				<div className="h-48 flex items-center justify-center text-ainative-fg-3">
					No usage data available for this period
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-ainative-bg-1 border border-ainative-border-2 rounded-md">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<TrendingUp size={20} className="text-[#0e70c0]" />
					<h3 className="text-lg font-medium text-ainative-fg-1">Usage Over Time</h3>
				</div>

				<div className="flex items-center gap-3">
					{/* Stats */}
					<div className="text-right">
						<div className="text-xs text-ainative-fg-3">Average Daily</div>
						<div className="text-sm font-medium text-ainative-fg-1">
							{stats.avg.toFixed(1)} credits
						</div>
					</div>
					<div className={`text-right ${stats.trend >= 0 ? 'text-red-500' : 'text-green-500'}`}>
						<div className="text-xs">Trend</div>
						<div className="text-sm font-medium">
							{stats.trend >= 0 ? '+' : ''}{stats.trend.toFixed(1)}%
						</div>
					</div>
				</div>
			</div>

			{/* Chart */}
			<div className="relative">
				<svg
					width="100%"
					height={chartHeight}
					viewBox={`0 0 ${chartWidth} ${chartHeight}`}
					preserveAspectRatio="none"
					className="overflow-visible"
				>
					{/* Grid lines */}
					{[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
						const y = padding.top + innerHeight * (1 - ratio);
						return (
							<g key={i}>
								<line
									x1={padding.left}
									y1={y}
									x2={padding.left + innerWidth}
									y2={y}
									stroke="currentColor"
									strokeWidth="1"
									strokeDasharray="4 4"
									className="text-ainative-border-2"
									opacity="0.3"
								/>
								<text
									x={padding.left - 10}
									y={y}
									textAnchor="end"
									alignmentBaseline="middle"
									className="text-ainative-fg-3 text-xs"
									fill="currentColor"
								>
									{(minValue + (maxValue - minValue) * ratio).toFixed(0)}
								</text>
							</g>
						);
					})}

					{/* Area fill */}
					<path
						d={areaPath}
						fill="currentColor"
						className="text-[#0e70c0]"
						opacity="0.1"
					/>

					{/* Line */}
					<path
						d={linePath}
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						className="text-[#0e70c0]"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>

					{/* Data points */}
					{points.map((p, i) => (
						<g key={i}>
							<circle
								cx={p.x}
								cy={p.y}
								r="4"
								fill="currentColor"
								className="text-[#0e70c0]"
							/>
							<circle
								cx={p.x}
								cy={p.y}
								r="8"
								fill="transparent"
								className="cursor-pointer hover:fill-current hover:text-[#0e70c0] hover:opacity-10"
							>
								<title>
									{formatDate(p.data.date)}: {p.data.credits} credits ({p.data.tokens.toLocaleString()} tokens)
								</title>
							</circle>
						</g>
					))}

					{/* X-axis labels */}
					{points.filter((_, i) => i % Math.ceil(points.length / 7) === 0).map((p, i) => (
						<text
							key={i}
							x={p.x}
							y={padding.top + innerHeight + 20}
							textAnchor="middle"
							className="text-ainative-fg-3 text-xs"
							fill="currentColor"
						>
							{formatDate(p.data.date)}
						</text>
					))}
				</svg>
			</div>

			{/* Legend */}
			<div className="flex items-center justify-center gap-4 mt-4 text-xs text-ainative-fg-3">
				<div className="flex items-center gap-2">
					<Calendar size={14} />
					<span>
						{period === '7days' ? 'Last 7 Days' : period === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
					</span>
				</div>
			</div>
		</div>
	);
};
