/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILocalPtyService, TerminalIpcChannels } from '../../../../platform/terminal/common/terminal.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import { TerminalNativeContribution } from './terminalNativeContribution.js';
import { ElectronTerminalProfileResolverService } from './terminalProfileResolverService.js';
import { LocalTerminalBackendContribution } from './localTerminalBackend.js';
// Register services
registerMainProcessRemoteService(ILocalPtyService, TerminalIpcChannels.LocalPty);
registerSingleton(ITerminalProfileResolverService, ElectronTerminalProfileResolverService, 1 /* InstantiationType.Delayed */);
// Register workbench contributions
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
// This contribution needs to be active during the Startup phase to be available when a remote resolver tries to open a local
// terminal while connecting to the remote.
registerWorkbenchContribution2(LocalTerminalBackendContribution.ID, LocalTerminalBackendContribution, 1 /* WorkbenchPhase.BlockStartup */);
workbenchRegistry.registerWorkbenchContribution(TerminalNativeContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2VsZWN0cm9uLXNhbmRib3gvdGVybWluYWwuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDekcsT0FBTyxFQUFtRCxVQUFVLElBQUksbUJBQW1CLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU3RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUU3RSxvQkFBb0I7QUFDcEIsZ0NBQWdDLENBQUMsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakYsaUJBQWlCLENBQUMsK0JBQStCLEVBQUUsc0NBQXNDLG9DQUE0QixDQUFDO0FBRXRILG1DQUFtQztBQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQWtDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRXRHLDZIQUE2SDtBQUM3SCwyQ0FBMkM7QUFDM0MsOEJBQThCLENBQUMsZ0NBQWdDLENBQUMsRUFBRSxFQUFFLGdDQUFnQyxzQ0FBOEIsQ0FBQztBQUNuSSxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQywwQkFBMEIsa0NBQTBCLENBQUMifQ==