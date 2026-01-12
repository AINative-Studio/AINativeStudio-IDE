/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import {
	ModelFilters as IModelFilters,
	ModelCapability,
	PricingTier
} from '../../../../common/aiModelRegistryTypes.js';
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
		const newCapabilities = current.includes(capability)
			? current.filter((c) => c !== capability)
			: [...current, capability];

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
		(filters.capabilities && filters.capabilities.length > 0) ||
		filters.maxPrice !== undefined ||
		filters.minContextLength !== undefined;

	return (
		<div className="p-4 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-medium text-ainative-fg-1">Filters</h2>
				<button
					onClick={onRefresh}
					className="p-1.5 hover:bg-ainative-bg-2-hover rounded transition-colors"
					aria-label="Refresh models"
					data-tooltip-id="ainative-tooltip"
					data-tooltip-content="Refresh model list"
				>
					<RefreshCw size={16} className="text-ainative-fg-3" />
				</button>
			</div>

			{/* Search */}
			<div className="relative">
				<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ainative-fg-3" />
				<input
					type="text"
					value={searchValue}
					onChange={(e) => setSearchValue(e.target.value)}
					placeholder="Search models..."
					className="w-full pl-9 pr-8 py-2 bg-ainative-bg-2 border border-ainative-border-2 rounded-md text-sm text-ainative-fg-1 placeholder:text-ainative-fg-3 focus:border-ainative-border-1 focus:outline-none"
				/>
				{searchValue && (
					<button
						onClick={() => setSearchValue('')}
						className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-ainative-bg-2-hover rounded"
					>
						<X size={14} className="text-ainative-fg-3" />
					</button>
				)}
			</div>

			{/* Available Only Toggle */}
			<div className="flex items-center justify-between py-2">
				<span className="text-sm text-ainative-fg-3">Available only</span>
				<AINativeSwitch
					size="xs"
					value={filters.availableOnly ?? true}
					onChange={(value) => onChange({ ...filters, availableOnly: value })}
				/>
			</div>

			{/* Capabilities Filter */}
			<div className="border-t border-ainative-border-3 pt-3">
				<button
					onClick={() => toggleSection('capabilities')}
					className="flex items-center justify-between w-full py-1 text-sm font-medium text-ainative-fg-1 hover:text-ainative-fg-0"
				>
					<span>Capabilities</span>
					{expandedSections.capabilities ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>

				{expandedSections.capabilities && (
					<div className="mt-2 space-y-1.5">
						{Object.values(ModelCapability).map((capability) => (
							<label
								key={capability}
								className="flex items-center gap-2 py-1 cursor-pointer hover:bg-ainative-bg-2-hover rounded px-2"
							>
								<input
									type="checkbox"
									checked={filters.capabilities?.includes(capability) ?? false}
									onChange={() => toggleCapability(capability)}
									className="rounded border-ainative-border-2"
								/>
								<span className="text-sm text-ainative-fg-3 capitalize">
									{capability.replace(/_/g, ' ')}
								</span>
							</label>
						))}
					</div>
				)}
			</div>

			{/* Pricing Tier Filter */}
			<div className="border-t border-ainative-border-3 pt-3">
				<button
					onClick={() => toggleSection('pricing')}
					className="flex items-center justify-between w-full py-1 text-sm font-medium text-ainative-fg-1 hover:text-ainative-fg-0"
				>
					<span>Pricing</span>
					{expandedSections.pricing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>

				{expandedSections.pricing && (
					<div className="mt-2 space-y-1.5">
						<label className="flex items-center gap-2 py-1 cursor-pointer hover:bg-ainative-bg-2-hover rounded px-2">
							<input
								type="radio"
								checked={!filters.pricingTier}
								onChange={() => setPricingTier(undefined)}
								name="pricing-tier"
								className="border-ainative-border-2"
							/>
							<span className="text-sm text-ainative-fg-3">All tiers</span>
						</label>

						{Object.values(PricingTier).map((tier) => (
							<label
								key={tier}
								className="flex items-center gap-2 py-1 cursor-pointer hover:bg-ainative-bg-2-hover rounded px-2"
							>
								<input
									type="radio"
									checked={filters.pricingTier === tier}
									onChange={() => setPricingTier(tier)}
									name="pricing-tier"
									className="border-ainative-border-2"
								/>
								<span className="text-sm text-ainative-fg-3 capitalize">
									{tier.replace(/_/g, ' ')}
								</span>
							</label>
						))}
					</div>
				)}
			</div>

			{/* Advanced Filters */}
			<div className="border-t border-ainative-border-3 pt-3">
				<button
					onClick={() => toggleSection('advanced')}
					className="flex items-center justify-between w-full py-1 text-sm font-medium text-ainative-fg-1 hover:text-ainative-fg-0"
				>
					<span>Advanced</span>
					{expandedSections.advanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>

				{expandedSections.advanced && (
					<div className="mt-2 space-y-3">
						{/* Max Price */}
						<div>
							<label className="block text-xs text-ainative-fg-3 mb-1">Max price ($/1K tokens)</label>
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
								className="w-full px-3 py-1.5 bg-ainative-bg-2 border border-ainative-border-2 rounded-md text-sm text-ainative-fg-1 placeholder:text-ainative-fg-3 focus:border-ainative-border-1 focus:outline-none"
							/>
						</div>

						{/* Min Context Length */}
						<div>
							<label className="block text-xs text-ainative-fg-3 mb-1">Min context (tokens)</label>
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
								className="w-full px-3 py-1.5 bg-ainative-bg-2 border border-ainative-border-2 rounded-md text-sm text-ainative-fg-1 placeholder:text-ainative-fg-3 focus:border-ainative-border-1 focus:outline-none"
							/>
						</div>
					</div>
				)}
			</div>

			{/* Clear Filters */}
			{hasActiveFilters && (
				<button
					onClick={clearFilters}
					className="w-full mt-4 px-3 py-2 bg-ainative-bg-2 text-ainative-fg-3 text-sm rounded-md hover:bg-ainative-bg-2-hover transition-colors"
				>
					Clear all filters
				</button>
			)}
		</div>
	);
};
