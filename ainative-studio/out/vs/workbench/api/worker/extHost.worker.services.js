/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostExtensionService } from '../common/extHostExtensionService.js';
import { ExtHostLogService } from '../common/extHostLogService.js';
import { ExtensionStoragePaths, IExtensionStoragePaths } from '../common/extHostStoragePaths.js';
import { ExtHostTelemetry, IExtHostTelemetry } from '../common/extHostTelemetry.js';
import { ExtHostExtensionService } from './extHostExtensionService.js';
// #########################################################################
// ###                                                                   ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO extHost.common.services.ts !!! ###
// ###                                                                   ###
// #########################################################################
registerSingleton(ILogService, new SyncDescriptor(ExtHostLogService, [true], true));
registerSingleton(IExtHostExtensionService, ExtHostExtensionService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtensionStoragePaths, ExtensionStoragePaths, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTelemetry, new SyncDescriptor(ExtHostTelemetry, [true], true));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC53b3JrZXIuc2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS93b3JrZXIvZXh0SG9zdC53b3JrZXIuc2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDakcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDcEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFdkUsNEVBQTRFO0FBQzVFLDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFDNUUsNEVBQTRFO0FBQzVFLDRFQUE0RTtBQUU1RSxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsSUFBSSxjQUFjLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLHVCQUF1QixrQ0FBMEIsQ0FBQztBQUM5RixpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsa0NBQTBCLENBQUM7QUFDMUYsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDIn0=