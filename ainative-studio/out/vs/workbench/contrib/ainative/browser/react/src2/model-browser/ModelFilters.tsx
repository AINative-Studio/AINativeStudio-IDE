/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import {
  ModelFilters as IModelFilters,
  ModelCapability,
  PricingTier } from
'../../../../common/aiModelRegistryTypes.js';
import { Search, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import { AINativeSwitch } from '../util/inputs.js';

interface ModelFiltersProps {
  filters: IModelFilters;
  onChange: (filters: IModelFilters) => void;
  onRefresh: () => void;
}

export const ModelFilters: React.FC<ModelFiltersProps> = ({ filters, onChange, onRefresh }) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [expandedSections, setExpandedSections] = useState({
    capabilities: true,
    pricing: true,
    advanced: false
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onChange({ ...filters, search: searchValue || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  /**
   * Toggle section expansion
   */
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  /**
   * Toggle capability filter
   */
  const toggleCapability = (capability: ModelCapability) => {
    const current = filters.capabilities || [];
    const newCapabilities = current.includes(capability) ?
    current.filter((c) => c !== capability) :
    [...current, capability];

    onChange({
      ...filters,
      capabilities: newCapabilities.length > 0 ? newCapabilities : undefined
    });
  };

  /**
   * Set pricing tier filter
   */
  const setPricingTier = (tier: PricingTier | undefined) => {
    onChange({ ...filters, pricingTier: tier });
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSearchValue('');
    onChange({ availableOnly: true });
  };

  const hasActiveFilters =
  filters.search ||
  filters.provider ||
  filters.pricingTier ||
  filters.capabilities && filters.capabilities.length > 0 ||
  filters.maxPrice !== undefined ||
  filters.minContextLength !== undefined;

  return (
    <div className="ainative-p-4 ainative-space-y-4">
			{/* Header */}
			<div className="ainative-flex ainative-items-center ainative-justify-between ainative-mb-4">
				<h2 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1">Filters</h2>
				<button
          onClick={onRefresh}
          className="ainative-p-1.5 hover:ainative-bg-ainative-bg-2-hover ainative-rounded ainative-transition-colors"
          aria-label="Refresh models"
          data-tooltip-id="ainative-tooltip"
          data-tooltip-content="Refresh model list">

					<RefreshCw size={16} className="ainative-text-ainative-fg-3" />
				</button>
			</div>

			{/* Search */}
			<div className="ainative-relative">
				<Search size={16} className="ainative-absolute ainative-left-3 ainative-top-1/2 -ainative-translate-y-1/2 ainative-text-ainative-fg-3" />
				<input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search models..."
          className="ainative-w-full ainative-pl-9 ainative-pr-8 ainative-py-2 ainative-bg-ainative-bg-2 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-text-sm ainative-text-ainative-fg-1 placeholder:ainative-text-ainative-fg-3 focus:ainative-border-ainative-border-1 focus:ainative-outline-none" />

				{searchValue &&
        <button
          onClick={() => setSearchValue('')}
          className="ainative-absolute ainative-right-2 ainative-top-1/2 -ainative-translate-y-1/2 ainative-p-1 hover:ainative-bg-ainative-bg-2-hover ainative-rounded">

						<X size={14} className="ainative-text-ainative-fg-3" />
					</button>
        }
			</div>

			{/* Available Only Toggle */}
			<div className="ainative-flex ainative-items-center ainative-justify-between ainative-py-2">
				<span className="ainative-text-sm ainative-text-ainative-fg-3">Available only</span>
				<AINativeSwitch
          size="xs"
          value={filters.availableOnly ?? true}
          onChange={(value) => onChange({ ...filters, availableOnly: value })} />

			</div>

			{/* Capabilities Filter */}
			<div className="ainative-border-t ainative-border-ainative-border-3 ainative-pt-3">
				<button
          onClick={() => toggleSection('capabilities')}
          className="ainative-flex ainative-items-center ainative-justify-between ainative-w-full ainative-py-1 ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1 hover:ainative-text-ainative-fg-0">

					<span>Capabilities</span>
					{expandedSections.capabilities ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>

				{expandedSections.capabilities &&
        <div className="ainative-mt-2 ainative-space-y-1.5">
						{Object.values(ModelCapability).map((capability) =>
          <label
            key={capability}
            className="ainative-flex ainative-items-center ainative-gap-2 ainative-py-1 ainative-cursor-pointer hover:ainative-bg-ainative-bg-2-hover ainative-rounded ainative-px-2">

								<input
              type="checkbox"
              checked={filters.capabilities?.includes(capability) ?? false}
              onChange={() => toggleCapability(capability)}
              className="ainative-rounded ainative-border-ainative-border-2" />

								<span className="ainative-text-sm ainative-text-ainative-fg-3 ainative-capitalize">
									{capability.replace(/_/g, ' ')}
								</span>
							</label>
          )}
					</div>
        }
			</div>

			{/* Pricing Tier Filter */}
			<div className="ainative-border-t ainative-border-ainative-border-3 ainative-pt-3">
				<button
          onClick={() => toggleSection('pricing')}
          className="ainative-flex ainative-items-center ainative-justify-between ainative-w-full ainative-py-1 ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1 hover:ainative-text-ainative-fg-0">

					<span>Pricing</span>
					{expandedSections.pricing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>

				{expandedSections.pricing &&
        <div className="ainative-mt-2 ainative-space-y-1.5">
						<label className="ainative-flex ainative-items-center ainative-gap-2 ainative-py-1 ainative-cursor-pointer hover:ainative-bg-ainative-bg-2-hover ainative-rounded ainative-px-2">
							<input
              type="radio"
              checked={!filters.pricingTier}
              onChange={() => setPricingTier(undefined)}
              name="pricing-tier"
              className="ainative-border-ainative-border-2" />

							<span className="ainative-text-sm ainative-text-ainative-fg-3">All tiers</span>
						</label>

						{Object.values(PricingTier).map((tier) =>
          <label
            key={tier}
            className="ainative-flex ainative-items-center ainative-gap-2 ainative-py-1 ainative-cursor-pointer hover:ainative-bg-ainative-bg-2-hover ainative-rounded ainative-px-2">

								<input
              type="radio"
              checked={filters.pricingTier === tier}
              onChange={() => setPricingTier(tier)}
              name="pricing-tier"
              className="ainative-border-ainative-border-2" />

								<span className="ainative-text-sm ainative-text-ainative-fg-3 ainative-capitalize">
									{tier.replace(/_/g, ' ')}
								</span>
							</label>
          )}
					</div>
        }
			</div>

			{/* Advanced Filters */}
			<div className="ainative-border-t ainative-border-ainative-border-3 ainative-pt-3">
				<button
          onClick={() => toggleSection('advanced')}
          className="ainative-flex ainative-items-center ainative-justify-between ainative-w-full ainative-py-1 ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1 hover:ainative-text-ainative-fg-0">

					<span>Advanced</span>
					{expandedSections.advanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>

				{expandedSections.advanced &&
        <div className="ainative-mt-2 ainative-space-y-3">
						{/* Max Price */}
						<div>
							<label className="ainative-block ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Max price ($/1K tokens)</label>
							<input
              type="number"
              value={filters.maxPrice ?? ''}
              onChange={(e) =>
              onChange({
                ...filters,
                maxPrice: e.target.value ? parseFloat(e.target.value) : undefined
              })
              }
              placeholder="Any"
              step="0.001"
              min="0"
              className="ainative-w-full ainative-px-3 ainative-py-1.5 ainative-bg-ainative-bg-2 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-text-sm ainative-text-ainative-fg-1 placeholder:ainative-text-ainative-fg-3 focus:ainative-border-ainative-border-1 focus:ainative-outline-none" />

						</div>

						{/* Min Context Length */}
						<div>
							<label className="ainative-block ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Min context (tokens)</label>
							<input
              type="number"
              value={filters.minContextLength ?? ''}
              onChange={(e) =>
              onChange({
                ...filters,
                minContextLength: e.target.value ? parseInt(e.target.value) : undefined
              })
              }
              placeholder="Any"
              step="1000"
              min="0"
              className="ainative-w-full ainative-px-3 ainative-py-1.5 ainative-bg-ainative-bg-2 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-text-sm ainative-text-ainative-fg-1 placeholder:ainative-text-ainative-fg-3 focus:ainative-border-ainative-border-1 focus:ainative-outline-none" />

						</div>
					</div>
        }
			</div>

			{/* Clear Filters */}
			{hasActiveFilters &&
      <button
        onClick={clearFilters}
        className="ainative-w-full ainative-mt-4 ainative-px-3 ainative-py-2 ainative-bg-ainative-bg-2 ainative-text-ainative-fg-3 ainative-text-sm ainative-rounded-md hover:ainative-bg-ainative-bg-2-hover ainative-transition-colors">

					Clear all filters
				</button>
      }
		</div>);

};