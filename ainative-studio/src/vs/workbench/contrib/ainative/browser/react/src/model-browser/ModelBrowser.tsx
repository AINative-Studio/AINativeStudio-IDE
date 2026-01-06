/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useCallback } from 'react';
import { useAccessor, useIsDark, useAINativeAuth } from '../util/services.js';
import { ModelCard } from './ModelCard.js';
import { ModelFilters } from './ModelFilters.js';
import { ModelSelector } from './ModelSelector.js';
import { UsageDashboard } from './UsageDashboard.js';
import {
	AIModel,
	ModelFilters as IModelFilters,
	ModelCapability,
	PricingTier
} from '../../../../common/aiModelRegistryTypes.js';
import { Loader2, AlertTriangle } from 'lucide-react';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';

interface ModelBrowserProps {
	/** Initial view mode */
	initialView?: 'browse' | 'usage';
	/** Callback when a model is selected */
	onModelSelected?: (model: AIModel) => void;
	/** Optional project ID for model selection context */
	projectId?: string;
}

export const ModelBrowser: React.FC<ModelBrowserProps> = ({
	initialView = 'browse',
	onModelSelected,
	projectId = 'default'
}) => {
	const isDark = useIsDark();
	const { isAuthenticated } = useAINativeAuth();
	const accessor = useAccessor();
	const modelRegistryService = accessor.get('IAIModelRegistryService');

	// State management
	const [view, setView] = useState<'browse' | 'usage'>(initialView);
	const [models, setModels] = useState<AIModel[]>([]);
	const [filteredModels, setFilteredModels] = useState<AIModel[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
	const [showSelector, setShowSelector] = useState(false);

	// Filter state
	const [filters, setFilters] = useState<IModelFilters>({
		availableOnly: true
	});

	/**
	 * Load models from registry
	 */
	const loadModels = useCallback(async () => {
		if (!isAuthenticated) {
			setError('Please sign in to browse AI models');
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const modelList = await modelRegistryService.listModels(filters);
			setModels(modelList);
			setFilteredModels(modelList);
		} catch (err) {
			console.error('[ModelBrowser] Failed to load models:', err);
			setError(err instanceof Error ? err.message : 'Failed to load models');
		} finally {
			setLoading(false);
		}
	}, [modelRegistryService, filters, isAuthenticated]);

	/**
	 * Refresh models
	 */
	const refreshModels = useCallback(async () => {
		try {
			await modelRegistryService.refreshModels();
			await loadModels();
		} catch (err) {
			console.error('[ModelBrowser] Failed to refresh models:', err);
			setError('Failed to refresh models');
		}
	}, [modelRegistryService, loadModels]);

	/**
	 * Handle filter changes
	 */
	const handleFilterChange = useCallback((newFilters: IModelFilters) => {
		setFilters(newFilters);
	}, []);

	/**
	 * Handle model card click
	 */
	const handleModelClick = useCallback((model: AIModel) => {
		setSelectedModel(model);
		setShowSelector(true);
	}, []);

	/**
	 * Handle model selection confirmation
	 */
	const handleModelSelect = useCallback((model: AIModel, parameters?: Record<string, any>) => {
		setShowSelector(false);
		if (onModelSelected) {
			onModelSelected(model);
		}
	}, [onModelSelected]);

	// Load models on mount and filter changes
	useEffect(() => {
		loadModels();
	}, [loadModels]);

	// Listen to model registry updates
	useEffect(() => {
		const disposable = modelRegistryService.onDidUpdateModels((updatedModels) => {
			setModels(updatedModels);

			// Re-apply filters
			const filtered = applyLocalFilters(updatedModels, filters);
			setFilteredModels(filtered);
		});

		return () => disposable.dispose();
	}, [modelRegistryService, filters]);

	/**
	 * Apply local client-side filters (for real-time filtering)
	 */
	const applyLocalFilters = (modelList: AIModel[], currentFilters: IModelFilters): AIModel[] => {
		let filtered = [...modelList];

		if (currentFilters.search) {
			const searchLower = currentFilters.search.toLowerCase();
			filtered = filtered.filter(m =>
				m.name.toLowerCase().includes(searchLower) ||
				m.description.toLowerCase().includes(searchLower) ||
				m.provider.toLowerCase().includes(searchLower)
			);
		}

		return filtered;
	};

	// Render authentication required message
	if (!isAuthenticated) {
		return (
			<div className={`@@ainative-scope ${isDark ? 'dark' : ''} h-full w-full flex items-center justify-center`}>
				<div className="text-center p-8">
					<AlertTriangle className="mx-auto mb-4 text-ainative-fg-3" size={48} />
					<h2 className="text-xl font-medium text-ainative-fg-1 mb-2">Authentication Required</h2>
					<p className="text-ainative-fg-3 mb-4">
						Please sign in to AINative Cloud to browse and use AI models.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`@@ainative-scope ${isDark ? 'dark' : ''} h-full w-full flex flex-col bg-ainative-bg-2`}>
			{/* Header */}
			<div className="border-b border-ainative-border-2 bg-ainative-bg-1 px-6 py-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-medium text-ainative-fg-1">AI Model Browser</h1>

					{/* View Toggle */}
					<div className="flex gap-2">
						<button
							onClick={() => setView('browse')}
							className={`px-4 py-2 rounded-md transition-colors ${
								view === 'browse'
									? 'bg-[#0e70c0] text-white'
									: 'bg-ainative-bg-2 text-ainative-fg-3 hover:bg-ainative-bg-2-hover'
							}`}
						>
							Browse Models
						</button>
						<button
							onClick={() => setView('usage')}
							className={`px-4 py-2 rounded-md transition-colors ${
								view === 'usage'
									? 'bg-[#0e70c0] text-white'
									: 'bg-ainative-bg-2 text-ainative-fg-3 hover:bg-ainative-bg-2-hover'
							}`}
						>
							Usage & Quota
						</button>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-hidden">
				{view === 'browse' ? (
					<div className="h-full flex">
						{/* Filters Sidebar */}
						<div className="w-64 border-r border-ainative-border-2 bg-ainative-bg-1 overflow-y-auto">
							<ErrorBoundary>
								<ModelFilters
									filters={filters}
									onChange={handleFilterChange}
									onRefresh={refreshModels}
								/>
							</ErrorBoundary>
						</div>

						{/* Model Grid */}
						<div className="flex-1 overflow-y-auto p-6">
							<ErrorBoundary>
								{loading ? (
									<div className="flex items-center justify-center h-full">
										<div className="text-center">
											<Loader2 className="mx-auto mb-4 animate-spin text-ainative-fg-3" size={48} />
											<p className="text-ainative-fg-3">Loading models...</p>
										</div>
									</div>
								) : error ? (
									<div className="flex items-center justify-center h-full">
										<div className="text-center p-8 max-w-md">
											<AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
											<h3 className="text-lg font-medium text-ainative-fg-1 mb-2">Error Loading Models</h3>
											<p className="text-ainative-fg-3 mb-4">{error}</p>
											<button
												onClick={refreshModels}
												className="px-4 py-2 bg-[#0e70c0] text-white rounded-md hover:bg-[#1177cb]"
											>
												Try Again
											</button>
										</div>
									</div>
								) : filteredModels.length === 0 ? (
									<div className="flex items-center justify-center h-full">
										<div className="text-center p-8">
											<p className="text-ainative-fg-3 text-lg mb-4">No models found matching your filters.</p>
											<button
												onClick={() => setFilters({ availableOnly: true })}
												className="px-4 py-2 bg-ainative-bg-2 text-ainative-fg-1 rounded-md hover:bg-ainative-bg-2-hover"
											>
												Clear Filters
											</button>
										</div>
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{filteredModels.map((model) => (
											<ErrorBoundary key={model.id}>
												<ModelCard
													model={model}
													onClick={() => handleModelClick(model)}
												/>
											</ErrorBoundary>
										))}
									</div>
								)}
							</ErrorBoundary>
						</div>
					</div>
				) : (
					<div className="h-full overflow-y-auto">
						<ErrorBoundary>
							<UsageDashboard />
						</ErrorBoundary>
					</div>
				)}
			</div>

			{/* Model Selection Dialog */}
			{showSelector && selectedModel && (
				<ErrorBoundary>
					<ModelSelector
						model={selectedModel}
						projectId={projectId}
						onSelect={handleModelSelect}
						onClose={() => setShowSelector(false)}
					/>
				</ErrorBoundary>
			)}
		</div>
	);
};
