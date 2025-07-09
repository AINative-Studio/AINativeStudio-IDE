/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../common/buffer.js';
import { Event } from '../../../common/event.js';
import { IPCClient } from './ipc.js';
/**
 * The MessagePort `Protocol` leverages MessagePort style IPC communication
 * for the implementation of the `IMessagePassingProtocol`. That style of API
 * is a simple `onmessage` / `postMessage` pattern.
 */
export class Protocol {
    constructor(port) {
        this.port = port;
        this.onMessage = Event.fromDOMEventEmitter(this.port, 'message', (e) => {
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
 * An implementation of a `IPCClient` on top of MessagePort style IPC communication.
 */
export class Client extends IPCClient {
    constructor(port, clientId) {
        const protocol = new Protocol(port);
        super(protocol, clientId);
        this.protocol = protocol;
    }
    dispose() {
        this.protocol.disconnect();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL2NvbW1vbi9pcGMubXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVqRCxPQUFPLEVBQTJCLFNBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQTRCOUQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxRQUFRO0lBSXBCLFlBQW9CLElBQWlCO1FBQWpCLFNBQUksR0FBSixJQUFJLENBQWE7UUFDcEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsbUJBQW1CLENBQVcsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFlLEVBQUUsRUFBRTtZQUM5RixJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlCLENBQUM7WUFDRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7UUFDSCxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2QsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFpQjtRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELFVBQVU7UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25CLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLE1BQU8sU0FBUSxTQUFTO0lBSXBDLFlBQVksSUFBaUIsRUFBRSxRQUFnQjtRQUM5QyxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTFCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzFCLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUUzQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNEIn0=