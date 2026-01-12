/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useMemo } from 'react';
import { PieChart, Layers } from 'lucide-react';
import { ModelUsageData } from './types.js';

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
      const sweepAngle = model.percentage / 100 * 360;
      currentAngle += sweepAngle;

      // Calculate path for pie slice
      const radius = 80;
      const centerX = 100;
      const centerY = 100;

      const startRad = startAngle * Math.PI / 180;
      const endRad = (startAngle + sweepAngle) * Math.PI / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = sweepAngle > 180 ? 1 : 0;

      const path = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'].
      join(' ');

      // Calculate label position
      const labelAngle = startAngle + sweepAngle / 2;
      const labelRad = labelAngle * Math.PI / 180;
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

  // Color palette for models
  const modelColors = [
  '#0e70c0', // AINative Blue
  '#4a90e2',
  '#7fba00',
  '#ffb900',
  '#e74856',
  '#8764b8',
  '#00b7c3',
  '#ca5010'];


  if (loading) {
    return (
      <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-animate-pulse">
				<div className="ainative-h-6 ainative-bg-ainative-bg-2 ainative-rounded ainative-w-1/3 ainative-mb-4"></div>
				<div className="ainative-h-64 ainative-bg-ainative-bg-2 ainative-rounded"></div>
			</div>);

  }

  if (data.length === 0) {
    return (
      <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
				<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-4">
					<PieChart size={20} className="ainative-text-[#0e70c0]" />
					<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">Model Distribution</h3>
				</div>
				<div className="ainative-h-64 ainative-flex ainative-items-center ainative-justify-center ainative-text-ainative-fg-3">
					No model usage data available
				</div>
			</div>);

  }

  return (
    <div className="ainative-p-6 ainative-bg-ainative-bg-1 ainative-border ainative-border-ainative-border-2 ainative-rounded-md">
			{/* Header */}
			<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-6">
				<PieChart size={20} className="ainative-text-[#0e70c0]" />
				<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">Model Distribution</h3>
			</div>

			<div className="ainative-flex ainative-flex-col lg:ainative-flex-row ainative-items-center ainative-gap-8">
				{/* Pie Chart */}
				<div className="ainative-flex-shrink-0">
					<svg width="220" height="220" viewBox="0 0 220 220" className="ainative-drop-shadow-md">
						{/* Background circle */}
						<circle
              cx="110"
              cy="110"
              r="80"
              fill="currentColor"
              className="ainative-text-ainative-bg-2"
              opacity="0.2" />


						{/* Pie segments */}
						{pieSegments.map((segment, i) =>
            <g key={segment.modelId}>
								<path
                d={segment.path}
                fill={modelColors[i % modelColors.length]}
                className="hover:ainative-opacity-80 ainative-transition-opacity ainative-cursor-pointer"
                transform="translate(10, 10)">

									<title>
										{segment.modelName}: {segment.percentage.toFixed(1)}% ({segment.credits.toFixed(1)} credits)
									</title>
								</path>
							</g>
            )}

						{/* Center circle (donut hole) */}
						<circle
              cx="110"
              cy="110"
              r="50"
              fill="currentColor"
              className="ainative-text-ainative-bg-1" />


						{/* Center text */}
						<text
              x="110"
              y="105"
              textAnchor="middle"
              className="ainative-text-ainative-fg-3 ainative-text-xs"
              fill="currentColor">

							Total
						</text>
						<text
              x="110"
              y="120"
              textAnchor="middle"
              className="ainative-text-ainative-fg-1 ainative-text-base ainative-font-medium"
              fill="currentColor">

							{data.length} Models
						</text>
					</svg>
				</div>

				{/* Legend */}
				<div className="ainative-flex-1 ainative-space-y-3 ainative-max-h-64 ainative-overflow-y-auto">
					{data.map((model, i) =>
          <div key={model.modelId} className="ainative-flex ainative-items-start ainative-gap-3">
							{/* Color indicator */}
							<div
              className="ainative-w-4 ainative-h-4 ainative-rounded-sm ainative-flex-shrink-0 ainative-mt-0.5"
              style={{ backgroundColor: modelColors[i % modelColors.length] }} />


							{/* Model info */}
							<div className="ainative-flex-1 ainative-min-w-0">
								<div className="ainative-flex ainative-items-center ainative-justify-between ainative-gap-2 ainative-mb-1">
									<div className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1 ainative-truncate">
										{model.modelName}
									</div>
									<div className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1 ainative-flex-shrink-0">
										{model.percentage.toFixed(1)}%
									</div>
								</div>
								<div className="ainative-flex ainative-items-center ainative-gap-3 ainative-text-xs ainative-text-ainative-fg-3">
									<span>{model.credits.toFixed(2)} credits</span>
									<span>{model.tokens.toLocaleString()} tokens</span>
									<span>{model.requests} requests</span>
								</div>
							</div>
						</div>
          )}
				</div>
			</div>

			{/* Summary Stats */}
			<div className="ainative-mt-6 ainative-pt-6 ainative-border-t ainative-border-ainative-border-2">
				<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-3">
					<Layers size={16} className="ainative-text-ainative-fg-3" />
					<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-uppercase">Summary</span>
				</div>
				<div className="ainative-grid ainative-grid-cols-3 ainative-gap-4">
					<div>
						<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Total Credits</div>
						<div className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">
							{data.reduce((sum, m) => sum + m.credits, 0).toFixed(2)}
						</div>
					</div>
					<div>
						<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Total Tokens</div>
						<div className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">
							{data.reduce((sum, m) => sum + m.tokens, 0).toLocaleString()}
						</div>
					</div>
					<div>
						<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Total Requests</div>
						<div className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">
							{data.reduce((sum, m) => sum + m.requests, 0).toLocaleString()}
						</div>
					</div>
				</div>
			</div>
		</div>);

};