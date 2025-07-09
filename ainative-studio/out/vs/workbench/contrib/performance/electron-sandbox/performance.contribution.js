/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { StartupProfiler } from './startupProfiler.js';
import { NativeStartupTimings } from './startupTimings.js';
import { RendererProfiling } from './rendererAutoProfiler.js';
import { Extensions as ConfigExt } from '../../../../platform/configuration/common/configurationRegistry.js';
import { localize } from '../../../../nls.js';
import { applicationConfigurationNodeBase } from '../../../common/configuration.js';
// -- auto profiler
Registry.as(Extensions.Workbench).registerWorkbenchContribution(RendererProfiling, 4 /* LifecyclePhase.Eventually */);
// -- startup profiler
Registry.as(Extensions.Workbench).registerWorkbenchContribution(StartupProfiler, 3 /* LifecyclePhase.Restored */);
// -- startup timings
Registry.as(Extensions.Workbench).registerWorkbenchContribution(NativeStartupTimings, 4 /* LifecyclePhase.Eventually */);
Registry.as(ConfigExt.Configuration).registerConfiguration({
    ...applicationConfigurationNodeBase,
    'properties': {
        'application.experimental.rendererProfiling': {
            type: 'boolean',
            default: false,
            tags: ['experimental', 'onExP'],
            markdownDescription: localize('experimental.rendererProfiling', "When enabled, slow renderers are automatically profiled.")
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3BlcmZvcm1hbmNlL2VsZWN0cm9uLXNhbmRib3gvcGVyZm9ybWFuY2UuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFtQyxNQUFNLGtDQUFrQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM5RCxPQUFPLEVBQTBCLFVBQVUsSUFBSSxTQUFTLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNySSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFcEYsbUJBQW1CO0FBRW5CLFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FDL0YsaUJBQWlCLG9DQUVqQixDQUFDO0FBRUYsc0JBQXNCO0FBRXRCLFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FDL0YsZUFBZSxrQ0FFZixDQUFDO0FBRUYscUJBQXFCO0FBRXJCLFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FDL0Ysb0JBQW9CLG9DQUVwQixDQUFDO0FBRUYsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ2xGLEdBQUcsZ0NBQWdDO0lBQ25DLFlBQVksRUFBRTtRQUNiLDRDQUE0QyxFQUFFO1lBQzdDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7WUFDZCxJQUFJLEVBQUUsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDO1lBQy9CLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSwwREFBMEQsQ0FBQztTQUMzSDtLQUNEO0NBQ0QsQ0FBQyxDQUFDIn0=