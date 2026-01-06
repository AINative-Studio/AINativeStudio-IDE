/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';
import { AIModel, ModelCapability, PricingTier } from '../../../../common/aiModelRegistryTypes.js';
import {
	Code,
	MessageSquare,
	Eye,
	Sparkles,
	Zap,
	DollarSign,
	Info,
	CheckCircle2
} from 'lucide-react';

interface ModelCardProps {
	model: AIModel;
	onClick: () => void;
	isSelected?: boolean;
}

/**
 * Get icon for model capability
 */
const getCapabilityIcon = (capability: ModelCapability): React.ReactNode => {
	switch (capability) {
		case ModelCapability.CodeGeneration:
		case ModelCapability.CodeCompletion:
			return <Code size={14} />;
		case ModelCapability.Chat:
			return <MessageSquare size={14} />;
		case ModelCapability.Vision:
			return <Eye size={14} />;
		case ModelCapability.FunctionCalling:
		case ModelCapability.ToolUse:
			return <Zap size={14} />;
		default:
			return <Sparkles size={14} />;
	}
};

/**
 * Get display name for capability
 */
const getCapabilityName = (capability: ModelCapability): string => {
	switch (capability) {
		case ModelCapability.TextGeneration:
			return 'Text';
		case ModelCapability.CodeGeneration:
			return 'Code Gen';
		case ModelCapability.CodeCompletion:
			return 'Code Complete';
		case ModelCapability.Chat:
			return 'Chat';
		case ModelCapability.FunctionCalling:
			return 'Functions';
		case ModelCapability.Vision:
			return 'Vision';
		case ModelCapability.Embedding:
			return 'Embeddings';
		case ModelCapability.Streaming:
			return 'Streaming';
		case ModelCapability.ToolUse:
			return 'Tools';
		default:
			return capability;
	}
};

/**
 * Get pricing tier display
 */
const getPricingTierDisplay = (tier: PricingTier): { text: string; color: string } => {
	switch (tier) {
		case PricingTier.Free:
			return { text: 'Free', color: 'text-green-500' };
		case PricingTier.PayAsYouGo:
			return { text: 'Pay as you go', color: 'text-blue-500' };
		case PricingTier.Subscription:
			return { text: 'Subscription', color: 'text-purple-500' };
		case PricingTier.Enterprise:
			return { text: 'Enterprise', color: 'text-orange-500' };
		default:
			return { text: tier, color: 'text-ainative-fg-3' };
	}
};

/**
 * Format token cost for display
 */
const formatTokenCost = (cost?: number): string => {
	if (!cost) return 'Free';
	if (cost < 0.001) return '< $0.001';
	return `$${cost.toFixed(3)}`;
};

export const ModelCard: React.FC<ModelCardProps> = ({ model, onClick, isSelected = false }) => {
	const pricingDisplay = getPricingTierDisplay(model.pricing.tier);
	const hasContextInfo = model.maxContextLength && model.maxContextLength > 0;

	// Get primary capabilities to display (max 4)
	const primaryCapabilities = model.capabilities.slice(0, 4);

	return (
		<div
			onClick={onClick}
			className={`
				relative bg-ainative-bg-1 border rounded-md p-4 cursor-pointer
				transition-all duration-200 hover:shadow-lg
				${
					isSelected
						? 'border-[#0e70c0] ring-2 ring-[#0e70c0]/20'
						: 'border-ainative-border-2 hover:border-ainative-border-1'
				}
				${!model.available ? 'opacity-60' : ''}
			`}
			role="button"
			tabIndex={0}
			aria-label={`Select ${model.name} model`}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onClick();
				}
			}}
		>
			{/* Availability Badge */}
			{isSelected && (
				<div className="absolute top-2 right-2">
					<CheckCircle2 size={20} className="text-[#0e70c0]" />
				</div>
			)}

			{/* Header */}
			<div className="mb-3">
				<div className="flex items-start justify-between mb-1">
					<h3 className="text-base font-medium text-ainative-fg-1 pr-6 line-clamp-1">
						{model.name}
					</h3>
				</div>

				<div className="flex items-center gap-2 text-xs">
					<span className="text-ainative-fg-3">{model.provider}</span>
					{model.version && (
						<>
							<span className="text-ainative-fg-4">•</span>
							<span className="text-ainative-fg-3">v{model.version}</span>
						</>
					)}
				</div>
			</div>

			{/* Description */}
			<p className="text-sm text-ainative-fg-3 mb-3 line-clamp-2 min-h-[2.5rem]">
				{model.description || 'No description available'}
			</p>

			{/* Capabilities */}
			<div className="flex flex-wrap gap-1.5 mb-3">
				{primaryCapabilities.map((capability) => (
					<div
						key={capability}
						className="flex items-center gap-1 px-2 py-0.5 bg-ainative-bg-2 text-ainative-fg-3 rounded-sm text-xs"
						data-tooltip-id="ainative-tooltip"
						data-tooltip-content={getCapabilityName(capability)}
					>
						{getCapabilityIcon(capability)}
						<span>{getCapabilityName(capability)}</span>
					</div>
				))}
				{model.capabilities.length > 4 && (
					<div
						className="flex items-center px-2 py-0.5 bg-ainative-bg-2 text-ainative-fg-3 rounded-sm text-xs"
						data-tooltip-id="ainative-tooltip"
						data-tooltip-content={`+${model.capabilities.length - 4} more capabilities`}
					>
						+{model.capabilities.length - 4}
					</div>
				)}
			</div>

			{/* Context Length */}
			{hasContextInfo && (
				<div className="flex items-center gap-1 text-xs text-ainative-fg-3 mb-3">
					<Info size={12} />
					<span>
						{(model.maxContextLength! / 1000).toLocaleString()}K context
						{model.maxOutputLength && ` • ${(model.maxOutputLength / 1000).toLocaleString()}K max output`}
					</span>
				</div>
			)}

			{/* Pricing Footer */}
			<div className="pt-3 border-t border-ainative-border-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1">
						<DollarSign size={14} className={pricingDisplay.color} />
						<span className={`text-xs font-medium ${pricingDisplay.color}`}>
							{pricingDisplay.text}
						</span>
					</div>

					{model.pricing.tier !== PricingTier.Free && (
						<div className="text-xs text-ainative-fg-3">
							{formatTokenCost(model.pricing.inputTokenCost)}/1K in •{' '}
							{formatTokenCost(model.pricing.outputTokenCost)}/1K out
						</div>
					)}
				</div>
			</div>

			{/* Unavailable Overlay */}
			{!model.available && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
					<span className="text-white font-medium text-sm">Unavailable</span>
				</div>
			)}
		</div>
	);
};
