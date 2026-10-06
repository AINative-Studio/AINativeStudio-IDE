/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tool Logs Panel
 *
 * Comprehensive debugging and monitoring interface for tool executions
 *
 * @module tool-logs
 */

import type React from 'react';

export { ToolLogsPanel } from './ToolLogsPanel';
export { ToolLogsFilter } from './ToolLogsFilter';
export { ToolLogsTable } from './ToolLogsTable';
export { ToolLogDetails } from './ToolLogDetails';
export { ToolLogsStatistics } from './ToolLogsStatistics';
export { ExportDialog } from './ExportDialog';

export * from './types';
export * from './toolLogsService';
export * from './utils';

// Import CSS
import './tool-logs.css';

// Mount function used to attach the Tool Logs panel to the workbench DOM,
// following the same `mountFnGenerator` pattern as every other React panel
// in this codebase (see sidebar-tsx/index.tsx, ainative-onboarding/index.tsx).
//
// mountFnGenerator expects a plain `(params: any) => React.ReactNode`, but
// ToolLogsPanel is typed as `React.FC<ToolLogsPanelProps>` -- a narrower,
// non-bivariant signature that TS strict mode won't structurally match
// against `(params: any) => ReactNode`. The cast below is just a type-level
// adapter; the runtime behavior (calling the component with whatever props
// mountFnGenerator's `rerender(props)` passes) is unaffected.
import { mountFnGenerator } from '../util/mountFnGenerator.js';
import { ToolLogsPanel as ToolLogsPanelComponent } from './ToolLogsPanel.js';

export const mountToolLogsPanel = mountFnGenerator(ToolLogsPanelComponent as (params: any) => React.ReactNode);