/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../base/common/platform.js';
import { getMachineId, getSqmMachineId, getdevDeviceId } from '../../../base/node/id.js';
import { machineIdKey, sqmIdKey, devDeviceIdKey } from '../common/telemetry.js';
export async function resolveMachineId(stateService, logService) {
    // We cache the machineId for faster lookups
    // and resolve it only once initially if not cached or we need to replace the macOS iBridge device
    let machineId = stateService.getItem(machineIdKey);
    if (typeof machineId !== 'string' || (isMacintosh && machineId === '6c9d2bc8f91b89624add29c0abeae7fb42bf539fa1cdb2e3e57cd668fa9bcead')) {
        machineId = await getMachineId(logService.error.bind(logService));
    }
    return machineId;
}
export async function resolveSqmId(stateService, logService) {
    let sqmId = stateService.getItem(sqmIdKey);
    if (typeof sqmId !== 'string') {
        sqmId = await getSqmMachineId(logService.error.bind(logService));
    }
    return sqmId;
}
export async function resolvedevDeviceId(stateService, logService) {
    let devDeviceId = stateService.getItem(devDeviceIdKey);
    if (typeof devDeviceId !== 'string') {
        devDeviceId = await getdevDeviceId(logService.error.bind(logService));
    }
    return devDeviceId;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9ub2RlL3RlbGVtZXRyeVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUd6RixPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUdoRixNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUFDLFlBQStCLEVBQUUsVUFBdUI7SUFDOUYsNENBQTRDO0lBQzVDLGtHQUFrRztJQUNsRyxJQUFJLFNBQVMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFTLFlBQVksQ0FBQyxDQUFDO0lBQzNELElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxJQUFJLENBQUMsV0FBVyxJQUFJLFNBQVMsS0FBSyxrRUFBa0UsQ0FBQyxFQUFFLENBQUM7UUFDeEksU0FBUyxHQUFHLE1BQU0sWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLFlBQVksQ0FBQyxZQUErQixFQUFFLFVBQXVCO0lBQzFGLElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQVMsUUFBUSxDQUFDLENBQUM7SUFDbkQsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMvQixLQUFLLEdBQUcsTUFBTSxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxZQUErQixFQUFFLFVBQXVCO0lBQ2hHLElBQUksV0FBVyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQVMsY0FBYyxDQUFDLENBQUM7SUFDL0QsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNyQyxXQUFXLEdBQUcsTUFBTSxjQUFjLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQsT0FBTyxXQUFXLENBQUM7QUFDcEIsQ0FBQyJ9