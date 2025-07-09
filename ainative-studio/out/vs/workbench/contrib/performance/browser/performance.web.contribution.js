/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { BrowserResourcePerformanceMarks, BrowserStartupTimings } from './startupTimings.js';
// -- startup timings
Registry.as(Extensions.Workbench).registerWorkbenchContribution(BrowserResourcePerformanceMarks, 4 /* LifecyclePhase.Eventually */);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(BrowserStartupTimings, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2Uud2ViLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wZXJmb3JtYW5jZS9icm93c2VyL3BlcmZvcm1hbmNlLndlYi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQW1DLE1BQU0sa0NBQWtDLENBQUM7QUFDL0YsT0FBTyxFQUFFLCtCQUErQixFQUFFLHFCQUFxQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFN0YscUJBQXFCO0FBRXJCLFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FDL0YsK0JBQStCLG9DQUUvQixDQUFDO0FBRUYsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUE2QixDQUMvRixxQkFBcUIsb0NBRXJCLENBQUMifQ==