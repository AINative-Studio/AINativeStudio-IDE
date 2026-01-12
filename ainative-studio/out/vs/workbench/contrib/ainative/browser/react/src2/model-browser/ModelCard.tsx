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
  CheckCircle2 } from
'lucide-react';

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
const getPricingTierDisplay = (tier: PricingTier): {text: string;color: string;} => {
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
      className={` ainative-relative ainative-bg-ainative-bg-1 ainative-border ainative-rounded-md ainative-p-4 ainative-cursor-pointer ainative-transition-all ainative-duration-200 hover:ainative-shadow-lg ${



      isSelected ? "ainative-border-[#0e70c0] ainative-ring-2 ainative-ring-[#0e70c0]/20" : "ainative-border-ainative-border-2 hover:ainative-border-ainative-border-1"} ${



      !model.available ? "ainative-opacity-60" : ""} `}

      role="button"
      tabIndex={0}
      aria-label={`Select ${model.name} model`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}>

			{/* Availability Badge */}
			{isSelected &&
      <div className="ainative-absolute ainative-top-2 ainative-right-2">
					<CheckCircle2 size={20} className="ainative-text-[#0e70c0]" />
				</div>
      }

			{/* Header */}
			<div className="ainative-mb-3">
				<div className="ainative-flex ainative-items-start ainative-justify-between ainative-mb-1">
					<h3 className="ainative-text-base ainative-font-medium ainative-text-ainative-fg-1 ainative-pr-6 ainative-line-clamp-1">
						{model.name}
					</h3>
				</div>

				<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-text-xs">
					<span className="ainative-text-ainative-fg-3">{model.provider}</span>
					{model.version &&
          <>
							<span className="ainative-text-ainative-fg-4">•</span>
							<span className="ainative-text-ainative-fg-3">v{model.version}</span>
						</>
          }
				</div>
			</div>

			{/* Description */}
			<p className="ainative-text-sm ainative-text-ainative-fg-3 ainative-mb-3 ainative-line-clamp-2 ainative-min-h-[2.5rem]">
				{model.description || 'No description available'}
			</p>

			{/* Capabilities */}
			<div className="ainative-flex ainative-flex-wrap ainative-gap-1.5 ainative-mb-3">
				{primaryCapabilities.map((capability) =>
        <div
          key={capability}
          className="ainative-flex ainative-items-center ainative-gap-1 ainative-px-2 ainative-py-0.5 ainative-bg-ainative-bg-2 ainative-text-ainative-fg-3 ainative-rounded-sm ainative-text-xs"
          data-tooltip-id="ainative-tooltip"
          data-tooltip-content={getCapabilityName(capability)}>

						{getCapabilityIcon(capability)}
						<span>{getCapabilityName(capability)}</span>
					</div>
        )}
				{model.capabilities.length > 4 &&
        <div
          className="ainative-flex ainative-items-center ainative-px-2 ainative-py-0.5 ainative-bg-ainative-bg-2 ainative-text-ainative-fg-3 ainative-rounded-sm ainative-text-xs"
          data-tooltip-id="ainative-tooltip"
          data-tooltip-content={`+${model.capabilities.length - 4} more capabilities`}>

						+{model.capabilities.length - 4}
					</div>
        }
			</div>

			{/* Context Length */}
			{hasContextInfo &&
      <div className="ainative-flex ainative-items-center ainative-gap-1 ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-3">
					<Info size={12} />
					<span>
						{(model.maxContextLength! / 1000).toLocaleString()}K context
						{model.maxOutputLength && ` • ${(model.maxOutputLength / 1000).toLocaleString()}K max output`}
					</span>
				</div>
      }

			{/* Pricing Footer */}
			<div className="ainative-pt-3 ainative-border-t ainative-border-ainative-border-3">
				<div className="ainative-flex ainative-items-center ainative-justify-between">
					<div className="ainative-flex ainative-items-center ainative-gap-1">
						<DollarSign size={14} className={pricingDisplay.color} />
						<span className={`ainative-text-xs ainative-font-medium ${pricingDisplay.color}`}>
							{pricingDisplay.text}
						</span>
					</div>

					{model.pricing.tier !== PricingTier.Free &&
          <div className="ainative-text-xs ainative-text-ainative-fg-3">
							{formatTokenCost(model.pricing.inputTokenCost)}/1K in •{' '}
							{formatTokenCost(model.pricing.outputTokenCost)}/1K out
						</div>
          }
				</div>
			</div>

			{/* Unavailable Overlay */}
			{!model.available &&
      <div className="ainative-absolute ainative-inset-0 ainative-flex ainative-items-center ainative-justify-center ainative-bg-black/50 ainative-rounded-md">
					<span className="ainative-text-white ainative-font-medium ainative-text-sm">Unavailable</span>
				</div>
      }
		</div>);

};