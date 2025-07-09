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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2VsZWN0cm9uLW1haW4vdGVsZW1ldHJ5VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRzFELE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2hGLE9BQU8sRUFBRSxnQkFBZ0IsSUFBSSxvQkFBb0IsRUFBRSxZQUFZLElBQUksZ0JBQWdCLEVBQUUsa0JBQWtCLElBQUksc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVySyxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUFDLFlBQTJCLEVBQUUsVUFBdUI7SUFDMUYsZ0VBQWdFO0lBQ2hFLE1BQU0sU0FBUyxHQUFHLE1BQU0sb0JBQW9CLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZFLFlBQVksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzlDLE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLFlBQVksQ0FBQyxZQUEyQixFQUFFLFVBQXVCO0lBQ3RGLE1BQU0sS0FBSyxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQy9ELFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsa0JBQWtCLENBQUMsWUFBMkIsRUFBRSxVQUF1QjtJQUM1RixNQUFNLFdBQVcsR0FBRyxNQUFNLHNCQUFzQixDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMzRSxZQUFZLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNsRCxPQUFPLFdBQVcsQ0FBQztBQUNwQixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxZQUEyQixFQUFFLFVBQXVCO0lBQzdGLE1BQU0sY0FBYyxHQUFHLE1BQU0sY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDL0UsTUFBTSxlQUFlLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDL0UsSUFBSSxjQUFjLEtBQUssZUFBZSxFQUFFLENBQUM7UUFDeEMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDdEQsQ0FBQztBQUNGLENBQUMifQ==