/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Usage Dashboard Module
 * Comprehensive usage tracking and visualization for AINative Cloud credits
 */

import type React from 'react';

export { UsageDashboard } from './UsageDashboard.js';
export { CreditsDisplay } from './CreditsDisplay.js';
export { UsageChart } from './UsageChart.js';
export { ModelBreakdown } from './ModelBreakdown.js';
export { CostProjection } from './CostProjection.js';

export type {
	PeriodFilter,
	ChartDataPoint,
	ModelUsageData,
	UsageSummary,
	ExportFormat,
	ProjectionData
} from './types.js';

// Mount function used to attach the Usage Dashboard panel to the workbench DOM,
// following the same `mountFnGenerator` pattern as every other React panel
// in this codebase (see sidebar-tsx/index.tsx, ainative-onboarding/index.tsx).
//
// mountFnGenerator expects a plain `(params: any) => React.ReactNode`, but
// UsageDashboard is typed as `React.FC<{}>` -- a narrower, non-bivariant
// signature that TS strict mode won't structurally match against
// `(params: any) => ReactNode`. The cast below is just a type-level adapter;
// the runtime behavior is unaffected.
import { mountFnGenerator } from '../util/mountFnGenerator.js';
import { UsageDashboard as UsageDashboardComponent } from './UsageDashboard.js';

export const mountUsageDashboard = mountFnGenerator(UsageDashboardComponent as (params: any) => React.ReactNode);
