/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validatedIpcMain } from './ipcMain.js';
import { VSBuffer } from '../../../common/buffer.js';
import { Emitter, Event } from '../../../common/event.js';
import { toDisposable } from '../../../common/lifecycle.js';
import { IPCServer } from '../common/ipc.js';
import { Protocol as ElectronProtocol } from '../common/ipc.electron.js';
function createScopedOnMessageEvent(senderId, eventName) {
    const onMessage = Event.fromNodeEventEmitter(validatedIpcMain, eventName, (event, message) => ({ event, message }));
    const onMessageFromSender = Event.filter(onMessage, ({ event }) => event.sender.id === senderId);
    return Event.map(onMessageFromSender, ({ message }) => message ? VSBuffer.wrap(message) : message);
}
/**
 * An implementation of `IPCServer` on top of Electron `ipcMain` API.
 */
export class Server extends IPCServer {
    static { this.Clients = new Map(); }
    static getOnDidClientConnect() {
        const onHello = Event.fromNodeEventEmitter(validatedIpcMain, 'vscode:hello', ({ sender }) => sender);
        return Event.map(onHello, webContents => {
            const id = webContents.id;
            const client = Server.Clients.get(id);
            client?.dispose();
            const onDidClientReconnect = new Emitter();
            Server.Clients.set(id, toDisposable(() => onDidClientReconnect.fire()));
            const onMessage = createScopedOnMessageEvent(id, 'vscode:message');
            const onDidClientDisconnect = Event.any(Event.signal(createScopedOnMessageEvent(id, 'vscode:disconnect')), onDidClientReconnect.event);
            const protocol = new ElectronProtocol(webContents, onMessage);
            return { protocol, onDidClientDisconnect };
        });
    }
    constructor() {
        super(Server.getOnDidClientConnect());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmVsZWN0cm9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL2VsZWN0cm9uLW1haW4vaXBjLmVsZWN0cm9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNoRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekUsT0FBTyxFQUF5QixTQUFTLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxJQUFJLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFPekUsU0FBUywwQkFBMEIsQ0FBQyxRQUFnQixFQUFFLFNBQWlCO0lBQ3RFLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxvQkFBb0IsQ0FBWSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvSCxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUM7SUFFakcsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNwRyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sTUFBTyxTQUFRLFNBQVM7YUFFWixZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7SUFFekQsTUFBTSxDQUFDLHFCQUFxQjtRQUNuQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQWMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbEgsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRTtZQUN2QyxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRXRDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUVsQixNQUFNLG9CQUFvQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7WUFDakQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFeEUsTUFBTSxTQUFTLEdBQUcsMEJBQTBCLENBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFvQixDQUFDO1lBQ3RGLE1BQU0scUJBQXFCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkksTUFBTSxRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEO1FBQ0MsS0FBSyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUM7SUFDdkMsQ0FBQyJ9