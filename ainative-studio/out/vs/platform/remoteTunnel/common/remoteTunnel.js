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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVHVubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGVUdW5uZWwvY29tbW9uL3JlbW90ZVR1bm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBUzNDLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIsc0JBQXNCLENBQUMsQ0FBQztBQTZCbEcsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQXVCLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDO0FBTzFFLE1BQU0sS0FBVyxZQUFZLENBc0I1QjtBQXRCRCxXQUFpQixZQUFZO0lBaUJmLHlCQUFZLEdBQUcsQ0FBQyxhQUFvQyxFQUFnQixFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztJQUNqSCxzQkFBUyxHQUFHLENBQUMsSUFBb0IsRUFBRSxvQkFBNkIsRUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQztJQUNwSSx1QkFBVSxHQUFHLENBQUMsUUFBaUIsRUFBYyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNuRiwwQkFBYSxHQUFrQixFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQztBQUV2RSxDQUFDLEVBdEJnQixZQUFZLEtBQVosWUFBWSxRQXNCNUI7QUFTRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyx1QkFBdUIsQ0FBQztBQUNoRSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyx3QkFBd0IsR0FBRyxtQkFBbUIsQ0FBQztBQUMxRixNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyx3QkFBd0IsR0FBRyxlQUFlLENBQUM7QUFFMUYsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDO0FBQzVDLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyJ9