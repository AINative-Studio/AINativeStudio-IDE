/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../common/buffer.js';
import { Event } from '../../../common/event.js';
import { IPCClient } from '../common/ipc.js';
import { Protocol as ElectronProtocol } from '../common/ipc.electron.js';
import { ipcRenderer } from '../../sandbox/electron-sandbox/globals.js';
/**
 * An implementation of `IPCClient` on top of Electron `ipcRenderer` IPC communication
 * provided from sandbox globals (via preload script).
 */
export class Client extends IPCClient {
    static createProtocol() {
        const onMessage = Event.fromNodeEventEmitter(ipcRenderer, 'vscode:message', (_, message) => VSBuffer.wrap(message));
        ipcRenderer.send('vscode:hello');
        return new ElectronProtocol(ipcRenderer, onMessage);
    }
    constructor(id) {
        const protocol = Client.createProtocol();
        super(protocol, id);
        this.protocol = protocol;
    }
    dispose() {
        this.protocol.disconnect();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmVsZWN0cm9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL2VsZWN0cm9uLXNhbmRib3gvaXBjLmVsZWN0cm9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFakQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxRQUFRLElBQUksZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFeEU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLE1BQU8sU0FBUSxTQUFTO0lBSTVCLE1BQU0sQ0FBQyxjQUFjO1FBQzVCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxvQkFBb0IsQ0FBVyxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUgsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVqQyxPQUFPLElBQUksZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCxZQUFZLEVBQVU7UUFDckIsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3pDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDMUIsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzNCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0QifQ==