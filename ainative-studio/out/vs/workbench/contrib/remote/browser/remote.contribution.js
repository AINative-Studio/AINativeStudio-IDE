/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ShowCandidateContribution } from './showCandidate.js';
import { TunnelFactoryContribution } from './tunnelFactory.js';
import { RemoteAgentConnectionStatusListener, RemoteMarkers } from './remote.js';
import { RemoteStatusIndicator } from './remoteIndicator.js';
import { AutomaticPortForwarding, ForwardedPortsView, PortRestore } from './remoteExplorer.js';
import { InitialRemoteConnectionHealthContribution } from './remoteConnectionHealth.js';
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
registerWorkbenchContribution2(ShowCandidateContribution.ID, ShowCandidateContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(TunnelFactoryContribution.ID, TunnelFactoryContribution, 2 /* WorkbenchPhase.BlockRestore */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteAgentConnectionStatusListener, 4 /* LifecyclePhase.Eventually */);
registerWorkbenchContribution2(RemoteStatusIndicator.ID, RemoteStatusIndicator, 1 /* WorkbenchPhase.BlockStartup */);
workbenchContributionsRegistry.registerWorkbenchContribution(ForwardedPortsView, 3 /* LifecyclePhase.Restored */);
workbenchContributionsRegistry.registerWorkbenchContribution(PortRestore, 4 /* LifecyclePhase.Eventually */);
workbenchContributionsRegistry.registerWorkbenchContribution(AutomaticPortForwarding, 4 /* LifecyclePhase.Eventually */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteMarkers, 4 /* LifecyclePhase.Eventually */);
workbenchContributionsRegistry.registerWorkbenchContribution(InitialRemoteConnectionHealthContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci9yZW1vdGUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBbUQsVUFBVSxJQUFJLG1CQUFtQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEssT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRS9ELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQy9GLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXhGLE1BQU0sOEJBQThCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbkgsOEJBQThCLENBQUMseUJBQXlCLENBQUMsRUFBRSxFQUFFLHlCQUF5QixzQ0FBOEIsQ0FBQztBQUNySCw4QkFBOEIsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLEVBQUUseUJBQXlCLHNDQUE4QixDQUFDO0FBQ3JILDhCQUE4QixDQUFDLDZCQUE2QixDQUFDLG1DQUFtQyxvQ0FBNEIsQ0FBQztBQUM3SCw4QkFBOEIsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEVBQUUscUJBQXFCLHNDQUE4QixDQUFDO0FBQzdHLDhCQUE4QixDQUFDLDZCQUE2QixDQUFDLGtCQUFrQixrQ0FBMEIsQ0FBQztBQUMxRyw4QkFBOEIsQ0FBQyw2QkFBNkIsQ0FBQyxXQUFXLG9DQUE0QixDQUFDO0FBQ3JHLDhCQUE4QixDQUFDLDZCQUE2QixDQUFDLHVCQUF1QixvQ0FBNEIsQ0FBQztBQUNqSCw4QkFBOEIsQ0FBQyw2QkFBNkIsQ0FBQyxhQUFhLG9DQUE0QixDQUFDO0FBQ3ZHLDhCQUE4QixDQUFDLDZCQUE2QixDQUFDLHlDQUF5QyxrQ0FBMEIsQ0FBQyJ9