/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { localize } from '../../../nls.js';
export const IRemoteTunnelService = createDecorator('IRemoteTunnelService');
export const INACTIVE_TUNNEL_MODE = { active: false };
export var TunnelStates;
(function (TunnelStates) {
    TunnelStates.disconnected = (onTokenFailed) => ({ type: 'disconnected', onTokenFailed });
    TunnelStates.connected = (info, serviceInstallFailed) => ({ type: 'connected', info, serviceInstallFailed });
    TunnelStates.connecting = (progress) => ({ type: 'connecting', progress });
    TunnelStates.uninitialized = { type: 'uninitialized' };
})(TunnelStates || (TunnelStates = {}));
export const CONFIGURATION_KEY_PREFIX = 'remote.tunnels.access';
export const CONFIGURATION_KEY_HOST_NAME = CONFIGURATION_KEY_PREFIX + '.hostNameOverride';
export const CONFIGURATION_KEY_PREVENT_SLEEP = CONFIGURATION_KEY_PREFIX + '.preventSleep';
export const LOG_ID = 'remoteTunnelService';
export const LOGGER_NAME = localize('remoteTunnelLog', "Remote Tunnel Service");
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVHVubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZVR1bm5lbC9jb21tb24vcmVtb3RlVHVubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFTM0MsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixzQkFBc0IsQ0FBQyxDQUFDO0FBNkJsRyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBdUIsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUM7QUFPMUUsTUFBTSxLQUFXLFlBQVksQ0FzQjVCO0FBdEJELFdBQWlCLFlBQVk7SUFpQmYseUJBQVksR0FBRyxDQUFDLGFBQW9DLEVBQWdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBQ2pILHNCQUFTLEdBQUcsQ0FBQyxJQUFvQixFQUFFLG9CQUE2QixFQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO0lBQ3BJLHVCQUFVLEdBQUcsQ0FBQyxRQUFpQixFQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ25GLDBCQUFhLEdBQWtCLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDO0FBRXZFLENBQUMsRUF0QmdCLFlBQVksS0FBWixZQUFZLFFBc0I1QjtBQVNELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLHVCQUF1QixDQUFDO0FBQ2hFLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLHdCQUF3QixHQUFHLG1CQUFtQixDQUFDO0FBQzFGLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLHdCQUF3QixHQUFHLGVBQWUsQ0FBQztBQUUxRixNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcscUJBQXFCLENBQUM7QUFDNUMsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDIn0=