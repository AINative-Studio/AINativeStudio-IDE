/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Model Browser Component Exports
 *
 * This module provides React components for browsing, selecting, and managing
 * AI models from the AINative registry.
 */

import type React from 'react';

export { ModelBrowser } from './ModelBrowser.js';
export { ModelCard } from './ModelCard.js';
export { ModelFilters } from './ModelFilters.js';
export { ModelSelector } from './ModelSelector.js';
export { UsageDashboard } from './UsageDashboard.js';

// Re-export types for convenience
export type {
	AIModel,
	ModelFilters,
	ModelCapability,
	PricingTier,
	UsageStats,
	QuotaInfo
} from '../../../../common/aiModelRegistryTypes.js';

// Mount function used to attach the Model Browser panel to the workbench DOM,
// following the same `mountFnGenerator` pattern as every other React panel
// in this codebase (see sidebar-tsx/index.tsx, ainative-onboarding/index.tsx).
//
// mountFnGenerator expects a plain `(params: any) => React.ReactNode`, but
// ModelBrowser is typed as `React.FC<ModelBrowserProps>` -- a narrower,
// non-bivariant signature that TS strict mode won't structurally match
// against `(params: any) => ReactNode`. The cast below is just a type-level
// adapter; the runtime behavior is unaffected.
import { mountFnGenerator } from '../util/mountFnGenerator.js';
import { ModelBrowser as ModelBrowserComponent } from './ModelBrowser.js';

export const mountModelBrowser = mountFnGenerator(ModelBrowserComponent as (params: any) => React.ReactNode);
