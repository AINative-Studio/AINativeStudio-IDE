/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getdevDeviceId } from '../../../base/node/id.js';
import { machineIdKey, sqmIdKey, devDeviceIdKey } from '../common/telemetry.js';
import { resolveMachineId as resolveNodeMachineId, resolveSqmId as resolveNodeSqmId, resolvedevDeviceId as resolveNodedevDeviceId } from '../node/telemetryUtils.js';
export async function resolveMachineId(stateService, logService) {
    // Call the node layers implementation to avoid code duplication
    const machineId = await resolveNodeMachineId(stateService, logService);
    stateService.setItem(machineIdKey, machineId);
    return machineId;
}
export async function resolveSqmId(stateService, logService) {
    const sqmId = await resolveNodeSqmId(stateService, logService);
    stateService.setItem(sqmIdKey, sqmId);
    return sqmId;
}
export async function resolvedevDeviceId(stateService, logService) {
    const devDeviceId = await resolveNodedevDeviceId(stateService, logService);
    stateService.setItem(devDeviceIdKey, devDeviceId);
    return devDeviceId;
}
export async function validatedevDeviceId(stateService, logService) {
    const actualDeviceId = await getdevDeviceId(logService.error.bind(logService));
    const currentDeviceId = await resolveNodedevDeviceId(stateService, logService);
    if (actualDeviceId !== currentDeviceId) {
        stateService.setItem(devDeviceIdKey, actualDeviceId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvZWxlY3Ryb24tbWFpbi90ZWxlbWV0cnlVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixJQUFJLG9CQUFvQixFQUFFLFlBQVksSUFBSSxnQkFBZ0IsRUFBRSxrQkFBa0IsSUFBSSxzQkFBc0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRXJLLE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsWUFBMkIsRUFBRSxVQUF1QjtJQUMxRixnRUFBZ0U7SUFDaEUsTUFBTSxTQUFTLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdkUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDOUMsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsWUFBWSxDQUFDLFlBQTJCLEVBQUUsVUFBdUI7SUFDdEYsTUFBTSxLQUFLLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDL0QsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEMsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxZQUEyQixFQUFFLFVBQXVCO0lBQzVGLE1BQU0sV0FBVyxHQUFHLE1BQU0sc0JBQXNCLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzNFLFlBQVksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2xELE9BQU8sV0FBVyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUFDLFlBQTJCLEVBQUUsVUFBdUI7SUFDN0YsTUFBTSxjQUFjLEdBQUcsTUFBTSxjQUFjLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUMvRSxNQUFNLGVBQWUsR0FBRyxNQUFNLHNCQUFzQixDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMvRSxJQUFJLGNBQWMsS0FBSyxlQUFlLEVBQUUsQ0FBQztRQUN4QyxZQUFZLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUN0RCxDQUFDO0FBQ0YsQ0FBQyJ9