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

    const values = data.map((d) => d.credits);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // Create points for the line chart
    const pts = data.map((d, i) => {
      const x = padding.left + i / (data.length - 1 || 1) * innerWidth;
      const y = padding.top + innerHeight - (d.credits - min) / range * innerHeight;
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
    const line = points.map((p) => `L ${p.x} ${p.y}`).join(' ');
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
    const trend = (secondHalf - firstHalf) / (firstHalf || 1) * 100;

    return { avg, trend };
  }, [data]);

  if (loading) {
    return (
      <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-animate-pulse">
				<div className="ainative-h-6 ainative-bg-ainative-bg-2 ainative-rounded ainative-w-1/3 ainative-mb-4"></div>
				<div className="ainative-h-48 ainative-bg-ainative-bg-2 ainative-rounded"></div>
			</div>);

  }

  if (data.length === 0) {
    return (
      <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
				<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-4">
					<TrendingUp size={20} className="ainative-text-[#0e70c0]" />
					<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">Usage Over Time</h3>
				</div>
				<div className="ainative-h-48 ainative-flex ainative-items-center ainative-justify-center ainative-text-ainative-fg-3">
					No usage data available for this period
				</div>
			</div>);

  }

  return (
    <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
			{/* Header */}
			<div className="ainative-flex ainative-items-center ainative-justify-between ainative-mb-4">
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					<TrendingUp size={20} className="ainative-text-[#0e70c0]" />
					<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">Usage Over Time</h3>
				</div>

				<div className="ainative-flex ainative-items-center ainative-gap-3">
					{/* Stats */}
					<div className="ainative-text-right">
						<div className="ainative-text-xs ainative-text-ainative-fg-3">Average Daily</div>
						<div className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
							{stats.avg.toFixed(1)} credits
						</div>
					</div>
					<div className={`ainative-text-right ${stats.trend >= 0 ? "ainative-text-red-500" : "ainative-text-green-500"}`}>
						<div className="ainative-text-xs">Trend</div>
						<div className="ainative-text-sm ainative-font-medium">
							{stats.trend >= 0 ? '+' : ''}{stats.trend.toFixed(1)}%
						</div>
					</div>
				</div>
			</div>

			{/* Chart */}
			<div className="ainative-relative">
				<svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="ainative-overflow-visible">

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
                  className="ainative-text-ainative-border-2"
                  opacity="0.3" />

								<text
                  x={padding.left - 10}
                  y={y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="ainative-text-ainative-fg-3 ainative-text-xs"
                  fill="currentColor">

									{(minValue + (maxValue - minValue) * ratio).toFixed(0)}
								</text>
							</g>);

          })}

					{/* Area fill */}
					<path
            d={areaPath}
            fill="currentColor"
            className="ainative-text-[#0e70c0]"
            opacity="0.1" />


					{/* Line */}
					<path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="ainative-text-[#0e70c0]"
            strokeLinecap="round"
            strokeLinejoin="round" />


					{/* Data points */}
					{points.map((p, i) =>
          <g key={i}>
							<circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="currentColor"
              className="ainative-text-[#0e70c0]" />

							<circle
              cx={p.x}
              cy={p.y}
              r="8"
              fill="transparent"
              className="ainative-cursor-pointer hover:ainative-fill-current hover:ainative-text-[#0e70c0] hover:ainative-opacity-10">

								<title>
									{formatDate(p.data.date)}: {p.data.credits} credits ({p.data.tokens.toLocaleString()} tokens)
								</title>
							</circle>
						</g>
          )}

					{/* X-axis labels */}
					{points.filter((_, i) => i % Math.ceil(points.length / 7) === 0).map((p, i) =>
          <text
            key={i}
            x={p.x}
            y={padding.top + innerHeight + 20}
            textAnchor="middle"
            className="ainative-text-ainative-fg-3 ainative-text-xs"
            fill="currentColor">

							{formatDate(p.data.date)}
						</text>
          )}
				</svg>
			</div>

			{/* Legend */}
			<div className="ainative-flex ainative-items-center ainative-justify-center ainative-gap-4 ainative-mt-4 ainative-text-xs ainative-text-ainative-fg-3">
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					<Calendar size={14} />
					<span>
						{period === '7days' ? 'Last 7 Days' : period === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
					</span>
				</div>
			</div>
		</div>);

};