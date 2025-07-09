/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isUtilityProcess } from '../../sandbox/node/electronTypes.js';
import { VSBuffer } from '../../../common/buffer.js';
import { IPCServer } from '../common/ipc.js';
import { Emitter, Event } from '../../../common/event.js';
import { assertType } from '../../../common/types.js';
/**
 * The MessagePort `Protocol` leverages MessagePortMain style IPC communication
 * for the implementation of the `IMessagePassingProtocol`.
 */
class Protocol {
    constructor(port) {
        this.port = port;
        this.onMessage = Event.fromNodeEventEmitter(this.port, 'message', (e) => {
            if (e.data) {
                return VSBuffer.wrap(e.data);
            }
            return VSBuffer.alloc(0);
        });
        // we must call start() to ensure messages are flowing
        port.start();
    }
    send(message) {
        this.port.postMessage(message.buffer);
    }
    disconnect() {
        this.port.close();
    }
}
/**
 * An implementation of a `IPCServer` on top of MessagePort style IPC communication.
 * The clients register themselves via Electron Utility Process IPC transfer.
 */
export class Server extends IPCServer {
    static getOnDidClientConnect(filter) {
        assertType(isUtilityProcess(process), 'Electron Utility Process');
        const onCreateMessageChannel = new Emitter();
        process.parentPort.on('message', (e) => {
            if (filter?.handledClientConnection(e)) {
                return;
            }
            const port = e.ports.at(0);
            if (port) {
                onCreateMessageChannel.fire(port);
            }
        });
        return Event.map(onCreateMessageChannel.event, port => {
            const protocol = new Protocol(port);
            const result = {
                protocol,
                // Not part of the standard spec, but in Electron we get a `close` event
                // when the other side closes. We can use this to detect disconnects
                // (https://github.com/electron/electron/blob/11-x-y/docs/api/message-port-main.md#event-close)
                onDidClientDisconnect: Event.fromNodeEventEmitter(port, 'close')
            };
            return result;
        });
    }
    constructor(filter) {
        super(Server.getOnDidClientConnect(filter));
    }
}
export function once(port, message, callback) {
    const listener = (e) => {
        if (e.data === message) {
            port.removeListener('message', listener);
            callback();
        }
    };
    port.on('message', listener);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL25vZGUvaXBjLm1wLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBbUIsZ0JBQWdCLEVBQWdCLE1BQU0scUNBQXFDLENBQUM7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JELE9BQU8sRUFBa0QsU0FBUyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFdEQ7OztHQUdHO0FBQ0gsTUFBTSxRQUFRO0lBSWIsWUFBb0IsSUFBcUI7UUFBckIsU0FBSSxHQUFKLElBQUksQ0FBaUI7UUFDeEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQVcsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFlLEVBQUUsRUFBRTtZQUMvRixJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlCLENBQUM7WUFDRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7UUFDSCxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2QsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFpQjtRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELFVBQVU7UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25CLENBQUM7Q0FDRDtBQWVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxNQUFPLFNBQVEsU0FBUztJQUU1QixNQUFNLENBQUMscUJBQXFCLENBQUMsTUFBZ0M7UUFDcEUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFFbEUsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBbUIsQ0FBQztRQUU5RCxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFlLEVBQUUsRUFBRTtZQUNwRCxJQUFJLE1BQU0sRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1Ysc0JBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFcEMsTUFBTSxNQUFNLEdBQTBCO2dCQUNyQyxRQUFRO2dCQUNSLHdFQUF3RTtnQkFDeEUsb0VBQW9FO2dCQUNwRSwrRkFBK0Y7Z0JBQy9GLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDO2FBQ2hFLENBQUM7WUFFRixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELFlBQVksTUFBZ0M7UUFDM0MsS0FBSyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzdDLENBQUM7Q0FDRDtBQU9ELE1BQU0sVUFBVSxJQUFJLENBQUMsSUFBOEIsRUFBRSxPQUFnQixFQUFFLFFBQW9CO0lBQzFGLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBZSxFQUFFLEVBQUU7UUFDcEMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3pDLFFBQVEsRUFBRSxDQUFDO1FBQ1osQ0FBQztJQUNGLENBQUMsQ0FBQztJQUVGLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzlCLENBQUMifQ==