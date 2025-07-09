/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { ExtHostTerminalService } from './extHostTerminalService.js';
import { ExtHostTask } from './extHostTask.js';
import { ExtHostDebugService } from './extHostDebugService.js';
import { NativeExtHostSearch } from './extHostSearch.js';
import { ExtHostExtensionService } from './extHostExtensionService.js';
import { NodeExtHostTunnelService } from './extHostTunnelService.js';
import { IExtHostDebugService } from '../common/extHostDebugService.js';
import { IExtHostExtensionService } from '../common/extHostExtensionService.js';
import { IExtHostSearch } from '../common/extHostSearch.js';
import { IExtHostTask } from '../common/extHostTask.js';
import { IExtHostTerminalService } from '../common/extHostTerminalService.js';
import { IExtHostTunnelService } from '../common/extHostTunnelService.js';
import { IExtensionStoragePaths } from '../common/extHostStoragePaths.js';
import { ExtensionStoragePaths } from './extHostStoragePaths.js';
import { ExtHostLoggerService } from './extHostLoggerService.js';
import { ILogService, ILoggerService } from '../../../platform/log/common/log.js';
import { NodeExtHostVariableResolverProviderService } from './extHostVariableResolverService.js';
import { IExtHostVariableResolverProvider } from '../common/extHostVariableResolverService.js';
import { ExtHostLogService } from '../common/extHostLogService.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { ISignService } from '../../../platform/sign/common/sign.js';
import { SignService } from '../../../platform/sign/node/signService.js';
import { ExtHostTelemetry, IExtHostTelemetry } from '../common/extHostTelemetry.js';
import { IExtHostMpcService } from '../common/extHostMcp.js';
import { NodeExtHostMpcService } from './extHostMpcNode.js';
// #########################################################################
// ###                                                                   ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO extHost.common.services.ts !!! ###
// ###                                                                   ###
// #########################################################################
registerSingleton(IExtHostExtensionService, ExtHostExtensionService, 0 /* InstantiationType.Eager */);
registerSingleton(ILoggerService, ExtHostLoggerService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILogService, new SyncDescriptor(ExtHostLogService, [false], true));
registerSingleton(ISignService, SignService, 1 /* InstantiationType.Delayed */);
registerSingleton(IExtensionStoragePaths, ExtensionStoragePaths, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTelemetry, new SyncDescriptor(ExtHostTelemetry, [false], true));
registerSingleton(IExtHostDebugService, ExtHostDebugService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostSearch, NativeExtHostSearch, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTask, ExtHostTask, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTerminalService, ExtHostTerminalService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTunnelService, NodeExtHostTunnelService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostVariableResolverProvider, NodeExtHostVariableResolverProviderService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostMpcService, NodeExtHostMpcService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5ub2RlLnNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0Lm5vZGUuc2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEYsT0FBTyxFQUFFLDBDQUEwQyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDakcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFNUQsNEVBQTRFO0FBQzVFLDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFDNUUsNEVBQTRFO0FBQzVFLDRFQUE0RTtBQUU1RSxpQkFBaUIsQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsa0NBQTBCLENBQUM7QUFDOUYsaUJBQWlCLENBQUMsY0FBYyxFQUFFLG9CQUFvQixvQ0FBNEIsQ0FBQztBQUNuRixpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsSUFBSSxjQUFjLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3JGLGlCQUFpQixDQUFDLFlBQVksRUFBRSxXQUFXLG9DQUE0QixDQUFDO0FBQ3hFLGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixrQ0FBMEIsQ0FBQztBQUMxRixpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7QUFFMUYsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLGtDQUEwQixDQUFDO0FBQ3RGLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxtQkFBbUIsa0NBQTBCLENBQUM7QUFDaEYsaUJBQWlCLENBQUMsWUFBWSxFQUFFLFdBQVcsa0NBQTBCLENBQUM7QUFDdEUsaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsc0JBQXNCLGtDQUEwQixDQUFDO0FBQzVGLGlCQUFpQixDQUFDLHFCQUFxQixFQUFFLHdCQUF3QixrQ0FBMEIsQ0FBQztBQUM1RixpQkFBaUIsQ0FBQyxnQ0FBZ0MsRUFBRSwwQ0FBMEMsa0NBQTBCLENBQUM7QUFDekgsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLGtDQUEwQixDQUFDIn0=