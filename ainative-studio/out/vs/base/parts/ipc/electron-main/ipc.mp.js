/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validatedIpcMain } from './ipcMain.js';
import { Event } from '../../../common/event.js';
import { generateUuid } from '../../../common/uuid.js';
import { Client as MessagePortClient } from '../common/ipc.mp.js';
/**
 * An implementation of a `IPCClient` on top of Electron `MessagePortMain`.
 */
export class Client extends MessagePortClient {
    /**
     * @param clientId a way to uniquely identify this client among
     * other clients. this is important for routing because every
     * client can also be a server
     */
    constructor(port, clientId) {
        super({
            addEventListener: (type, listener) => port.addListener(type, listener),
            removeEventListener: (type, listener) => port.removeListener(type, listener),
            postMessage: message => port.postMessage(message),
            start: () => port.start(),
            close: () => port.close()
        }, clientId);
    }
}
/**
 * This method opens a message channel connection
 * in the target window. The target window needs
 * to use the `Server` from `electron-sandbox/ipc.mp`.
 */
export async function connect(window) {
    // Assert healthy window to talk to
    if (window.isDestroyed() || window.webContents.isDestroyed()) {
        throw new Error('ipc.mp#connect: Cannot talk to window because it is closed or destroyed');
    }
    // Ask to create message channel inside the window
    // and send over a UUID to correlate the response
    const nonce = generateUuid();
    window.webContents.send('vscode:createMessageChannel', nonce);
    // Wait until the window has returned the `MessagePort`
    // We need to filter by the `nonce` to ensure we listen
    // to the right response.
    const onMessageChannelResult = Event.fromNodeEventEmitter(validatedIpcMain, 'vscode:createMessageChannelResult', (e, nonce) => ({ nonce, port: e.ports[0] }));
    const { port } = await Event.toPromise(Event.once(Event.filter(onMessageChannelResult, e => e.nonce === nonce)));
    return port;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL2VsZWN0cm9uLW1haW4vaXBjLm1wLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNoRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxNQUFNLElBQUksaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVsRTs7R0FFRztBQUNILE1BQU0sT0FBTyxNQUFPLFNBQVEsaUJBQWlCO0lBRTVDOzs7O09BSUc7SUFDSCxZQUFZLElBQXFCLEVBQUUsUUFBZ0I7UUFDbEQsS0FBSyxDQUFDO1lBQ0wsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUM7WUFDdEUsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUM7WUFDNUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUM7WUFDakQsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDekIsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7U0FDekIsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNkLENBQUM7Q0FDRDtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLE9BQU8sQ0FBQyxNQUFxQjtJQUVsRCxtQ0FBbUM7SUFDbkMsSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1FBQzlELE1BQU0sSUFBSSxLQUFLLENBQUMseUVBQXlFLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELGlEQUFpRDtJQUNqRCxNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztJQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUU5RCx1REFBdUQ7SUFDdkQsdURBQXVEO0lBQ3ZELHlCQUF5QjtJQUN6QixNQUFNLHNCQUFzQixHQUFHLEtBQUssQ0FBQyxvQkFBb0IsQ0FBMkMsZ0JBQWdCLEVBQUUsbUNBQW1DLEVBQUUsQ0FBQyxDQUFlLEVBQUUsS0FBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlOLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFakgsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDIn0=