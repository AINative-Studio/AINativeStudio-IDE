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
  PricingTier } from
'../../../../common/aiModelRegistryTypes.js';
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
      filtered = filtered.filter((m) =>
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
      <div className={`ainative-scope ${isDark ? "ainative-dark" : ""} ainative-h-full ainative-w-full ainative-flex ainative-items-center ainative-justify-center`}>
				<div className="ainative-text-center ainative-p-8">
					<AlertTriangle className="ainative-mx-auto ainative-mb-4 ainative-text-ainative-fg-3" size={48} />
					<h2 className="ainative-text-xl ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-2">Authentication Required</h2>
					<p className="ainative-text-ainative-fg-3 ainative-mb-4">
						Please sign in to AINative Cloud to browse and use AI models.
					</p>
				</div>
			</div>);

  }

  return (
    <div className={`ainative-scope ${isDark ? "ainative-dark" : ""} ainative-h-full ainative-w-full ainative-flex ainative-flex-col ainative-bg-ainative-bg-2`}>
			{/* Header */}
			<div className="ainative-border-b ainative-border-ainative-border-2 ainative-bg-ainative-bg-1 ainative-px-6 ainative-py-4">
				<div className="ainative-flex ainative-items-center ainative-justify-between">
					<h1 className="ainative-text-2xl ainative-font-medium ainative-text-ainative-fg-1">AI Model Browser</h1>

					{/* View Toggle */}
					<div className="ainative-flex ainative-gap-2">
						<button
              onClick={() => setView('browse')}
              className={`ainative-px-4 ainative-py-2 ainative-rounded-md ainative-transition-colors ${
              view === 'browse' ? "ainative-bg-[#0e70c0] ainative-text-white" : "ainative-bg-ainative-bg-2 ainative-text-ainative-fg-3 hover:ainative-bg-ainative-bg-2-hover"}`}>




							Browse Models
						</button>
						<button
              onClick={() => setView('usage')}
              className={`ainative-px-4 ainative-py-2 ainative-rounded-md ainative-transition-colors ${
              view === 'usage' ? "ainative-bg-[#0e70c0] ainative-text-white" : "ainative-bg-ainative-bg-2 ainative-text-ainative-fg-3 hover:ainative-bg-ainative-bg-2-hover"}`}>




							Usage & Quota
						</button>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="ainative-flex-1 ainative-overflow-hidden">
				{view === 'browse' ?
        <div className="ainative-h-full ainative-flex">
						{/* Filters Sidebar */}
						<div className="ainative-w-64 ainative-border-r ainative-border-ainative-border-2 ainative-bg-ainative-bg-1 ainative-overflow-y-auto">
							<ErrorBoundary>
								<ModelFilters
                filters={filters}
                onChange={handleFilterChange}
                onRefresh={refreshModels} />

							</ErrorBoundary>
						</div>

						{/* Model Grid */}
						<div className="ainative-flex-1 ainative-overflow-y-auto ainative-p-6">
							<ErrorBoundary>
								{loading ?
              <div className="ainative-flex ainative-items-center ainative-justify-center ainative-h-full">
										<div className="ainative-text-center">
											<Loader2 className="ainative-mx-auto ainative-mb-4 ainative-animate-spin ainative-text-ainative-fg-3" size={48} />
											<p className="ainative-text-ainative-fg-3">Loading models...</p>
										</div>
									</div> :
              error ?
              <div className="ainative-flex ainative-items-center ainative-justify-center ainative-h-full">
										<div className="ainative-text-center ainative-p-8 ainative-max-w-md">
											<AlertTriangle className="ainative-mx-auto ainative-mb-4 ainative-text-red-500" size={48} />
											<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-2">Error Loading Models</h3>
											<p className="ainative-text-ainative-fg-3 ainative-mb-4">{error}</p>
											<button
                    onClick={refreshModels}
                    className="ainative-px-4 ainative-py-2 ainative-bg-[#0e70c0] ainative-text-white ainative-rounded-md hover:ainative-bg-[#1177cb]">

												Try Again
											</button>
										</div>
									</div> :
              filteredModels.length === 0 ?
              <div className="ainative-flex ainative-items-center ainative-justify-center ainative-h-full">
										<div className="ainative-text-center ainative-p-8">
											<p className="ainative-text-ainative-fg-3 ainative-text-lg ainative-mb-4">No models found matching your filters.</p>
											<button
                    onClick={() => setFilters({ availableOnly: true })}
                    className="ainative-px-4 ainative-py-2 ainative-bg-ainative-bg-2 ainative-text-ainative-fg-1 ainative-rounded-md hover:ainative-bg-ainative-bg-2-hover">

												Clear Filters
											</button>
										</div>
									</div> :

              <div className="ainative-grid ainative-grid-cols-1 md:ainative-grid-cols-2 lg:ainative-grid-cols-3 ainative-gap-4">
										{filteredModels.map((model) =>
                <ErrorBoundary key={model.id}>
												<ModelCard
                    model={model}
                    onClick={() => handleModelClick(model)} />

											</ErrorBoundary>
                )}
									</div>
              }
							</ErrorBoundary>
						</div>
					</div> :

        <div className="ainative-h-full ainative-overflow-y-auto">
						<ErrorBoundary>
							<UsageDashboard />
						</ErrorBoundary>
					</div>
        }
			</div>

			{/* Model Selection Dialog */}
			{showSelector && selectedModel &&
      <ErrorBoundary>
					<ModelSelector
          model={selectedModel}
          projectId={projectId}
          onSelect={handleModelSelect}
          onClose={() => setShowSelector(false)} />

				</ErrorBoundary>
      }
		</div>);

};