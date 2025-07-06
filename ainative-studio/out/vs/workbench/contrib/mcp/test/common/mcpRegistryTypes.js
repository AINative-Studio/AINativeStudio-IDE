/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { LogLevel } from '../../../../../platform/log/common/log.js';
import { MCP } from '../../common/modelContextProtocol.js';
/**
 * Implementation of IMcpMessageTransport for testing purposes.
 * Allows tests to easily send/receive messages and control the connection state.
 */
export class TestMcpMessageTransport extends Disposable {
    constructor() {
        super();
        this._onDidLog = this._register(new Emitter());
        this.onDidLog = this._onDidLog.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._stateValue = observableValue('testTransportState', { state: 1 /* McpConnectionState.Kind.Starting */ });
        this.state = this._stateValue;
        this._sentMessages = [];
    }
    /**
     * Send a message through the transport.
     */
    send(message) {
        this._sentMessages.push(message);
    }
    /**
     * Stop the transport.
     */
    stop() {
        this._stateValue.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
    }
    // Test Helper Methods
    /**
     * Simulate receiving a message from the server.
     */
    simulateReceiveMessage(message) {
        this._onDidReceiveMessage.fire(message);
    }
    /**
     * Simulates a reply to an 'initialized' request.
     */
    simulateInitialized() {
        if (!this._sentMessages.length) {
            throw new Error('initialize was not called yet');
        }
        this.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: this.getSentMessages()[0].id,
            result: {
                protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                capabilities: {
                    tools: {},
                },
                serverInfo: {
                    name: 'Test Server',
                    version: '1.0.0'
                },
            }
        });
    }
    /**
     * Simulate a log event.
     */
    simulateLog(message) {
        this._onDidLog.fire({ level: LogLevel.Info, message });
    }
    /**
     * Set the connection state.
     */
    setConnectionState(state) {
        this._stateValue.set(state, undefined);
    }
    /**
     * Get all messages that have been sent.
     */
    getSentMessages() {
        return [...this._sentMessages];
    }
    /**
     * Clear the sent messages history.
     */
    clearSentMessages() {
        this._sentMessages.length = 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BSZWdpc3RyeVR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUdyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFM0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7SUFZdEQ7UUFDQyxLQUFLLEVBQUUsQ0FBQztRQVpRLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF3QyxDQUFDLENBQUM7UUFDakYsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO1FBRS9CLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNCLENBQUMsQ0FBQztRQUMxRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO1FBRXJELGdCQUFXLEdBQUcsZUFBZSxDQUFxQixvQkFBb0IsRUFBRSxFQUFFLEtBQUssMENBQWtDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RILFVBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBRXhCLGtCQUFhLEdBQXlCLEVBQUUsQ0FBQztJQUkxRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxJQUFJLENBQUMsT0FBMkI7UUFDdEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksSUFBSTtRQUNWLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyx5Q0FBaUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxzQkFBc0I7SUFFdEI7O09BRUc7SUFDSSxzQkFBc0IsQ0FBQyxPQUEyQjtRQUN4RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNJLG1CQUFtQjtRQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELElBQUksQ0FBQyxzQkFBc0IsQ0FBQztZQUMzQixPQUFPLEVBQUUsR0FBRyxDQUFDLGVBQWU7WUFDNUIsRUFBRSxFQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQXdCLENBQUMsRUFBRTtZQUN4RCxNQUFNLEVBQUU7Z0JBQ1AsZUFBZSxFQUFFLEdBQUcsQ0FBQyx1QkFBdUI7Z0JBQzVDLFlBQVksRUFBRTtvQkFDYixLQUFLLEVBQUUsRUFBRTtpQkFDVDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsSUFBSSxFQUFFLGFBQWE7b0JBQ25CLE9BQU8sRUFBRSxPQUFPO2lCQUNoQjthQUM4QjtTQUNoQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSSxXQUFXLENBQUMsT0FBZTtRQUNqQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksa0JBQWtCLENBQUMsS0FBeUI7UUFDbEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRDs7T0FFRztJQUNJLGVBQWU7UUFDckIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7T0FFRztJQUNJLGlCQUFpQjtRQUN2QixJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDL0IsQ0FBQztDQUNEIn0=