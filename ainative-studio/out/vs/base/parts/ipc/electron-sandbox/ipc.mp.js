/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from '../../../browser/window.js';
import { Event } from '../../../common/event.js';
import { generateUuid } from '../../../common/uuid.js';
import { ipcMessagePort, ipcRenderer } from '../../sandbox/electron-sandbox/globals.js';
export async function acquirePort(requestChannel, responseChannel, nonce = generateUuid()) {
    // Get ready to acquire the message port from the
    // provided `responseChannel` via preload helper.
    ipcMessagePort.acquire(responseChannel, nonce);
    // If a `requestChannel` is provided, we are in charge
    // to trigger acquisition of the message port from main
    if (typeof requestChannel === 'string') {
        ipcRenderer.send(requestChannel, nonce);
    }
    // Wait until the main side has returned the `MessagePort`
    // We need to filter by the `nonce` to ensure we listen
    // to the right response.
    const onMessageChannelResult = Event.fromDOMEventEmitter(mainWindow, 'message', (e) => ({ nonce: e.data, port: e.ports[0], source: e.source }));
    const { port } = await Event.toPromise(Event.once(Event.filter(onMessageChannelResult, e => e.nonce === nonce && e.source === mainWindow)));
    return port;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL2VsZWN0cm9uLXNhbmRib3gvaXBjLm1wLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFReEYsTUFBTSxDQUFDLEtBQUssVUFBVSxXQUFXLENBQUMsY0FBa0MsRUFBRSxlQUF1QixFQUFFLEtBQUssR0FBRyxZQUFZLEVBQUU7SUFFcEgsaURBQWlEO0lBQ2pELGlEQUFpRDtJQUNqRCxjQUFjLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUUvQyxzREFBc0Q7SUFDdEQsdURBQXVEO0lBQ3ZELElBQUksT0FBTyxjQUFjLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDeEMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVELDBEQUEwRDtJQUMxRCx1REFBdUQ7SUFDdkQseUJBQXlCO0lBQ3pCLE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxDQUFDLG1CQUFtQixDQUF3QixVQUFVLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckwsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU1SSxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMifQ==