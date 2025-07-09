/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSharedProcessRemoteService } from '../../ipc/electron-sandbox/services.js';
import { ISharedProcessTunnelService, ipcSharedProcessTunnelChannelName } from '../common/sharedProcessTunnelService.js';
registerSharedProcessRemoteService(ISharedProcessTunnelService, ipcSharedProcessTunnelChannelName);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc1R1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2VsZWN0cm9uLXNhbmRib3gvc2hhcmVkUHJvY2Vzc1R1bm5lbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLGlDQUFpQyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFekgsa0NBQWtDLENBQUMsMkJBQTJCLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyJ9