/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ExtHostConnectionType;
(function (ExtHostConnectionType) {
    ExtHostConnectionType[ExtHostConnectionType["IPC"] = 1] = "IPC";
    ExtHostConnectionType[ExtHostConnectionType["Socket"] = 2] = "Socket";
    ExtHostConnectionType[ExtHostConnectionType["MessagePort"] = 3] = "MessagePort";
})(ExtHostConnectionType || (ExtHostConnectionType = {}));
/**
 * The extension host will connect via named pipe / domain socket to its renderer.
 */
export class IPCExtHostConnection {
    static { this.ENV_KEY = 'VSCODE_EXTHOST_IPC_HOOK'; }
    constructor(pipeName) {
        this.pipeName = pipeName;
        this.type = 1 /* ExtHostConnectionType.IPC */;
    }
    serialize(env) {
        env[IPCExtHostConnection.ENV_KEY] = this.pipeName;
    }
}
/**
 * The extension host will receive via nodejs IPC the socket to its renderer.
 */
export class SocketExtHostConnection {
    constructor() {
        this.type = 2 /* ExtHostConnectionType.Socket */;
    }
    static { this.ENV_KEY = 'VSCODE_EXTHOST_WILL_SEND_SOCKET'; }
    serialize(env) {
        env[SocketExtHostConnection.ENV_KEY] = '1';
    }
}
/**
 * The extension host will receive via nodejs IPC the MessagePort to its renderer.
 */
export class MessagePortExtHostConnection {
    constructor() {
        this.type = 3 /* ExtHostConnectionType.MessagePort */;
    }
    static { this.ENV_KEY = 'VSCODE_WILL_SEND_MESSAGE_PORT'; }
    serialize(env) {
        env[MessagePortExtHostConnection.ENV_KEY] = '1';
    }
}
function clean(env) {
    delete env[IPCExtHostConnection.ENV_KEY];
    delete env[SocketExtHostConnection.ENV_KEY];
    delete env[MessagePortExtHostConnection.ENV_KEY];
}
/**
 * Write `connection` into `env` and clean up `env`.
 */
export function writeExtHostConnection(connection, env) {
    // Avoid having two different keys that might introduce amiguity or problems.
    clean(env);
    connection.serialize(env);
}
/**
 * Read `connection` from `env` and clean up `env`.
 */
export function readExtHostConnection(env) {
    if (env[IPCExtHostConnection.ENV_KEY]) {
        return cleanAndReturn(env, new IPCExtHostConnection(env[IPCExtHostConnection.ENV_KEY]));
    }
    if (env[SocketExtHostConnection.ENV_KEY]) {
        return cleanAndReturn(env, new SocketExtHostConnection());
    }
    if (env[MessagePortExtHostConnection.ENV_KEY]) {
        return cleanAndReturn(env, new MessagePortExtHostConnection());
    }
    throw new Error(`No connection information defined in environment!`);
}
function cleanAndReturn(env, result) {
    clean(env);
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdEVudi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbkhvc3RFbnYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0QywrREFBTyxDQUFBO0lBQ1AscUVBQVUsQ0FBQTtJQUNWLCtFQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUppQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXRDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO2FBQ2xCLFlBQU8sR0FBRyx5QkFBeUIsQUFBNUIsQ0FBNkI7SUFJbEQsWUFDaUIsUUFBZ0I7UUFBaEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUhqQixTQUFJLHFDQUE2QjtJQUk3QyxDQUFDO0lBRUUsU0FBUyxDQUFDLEdBQXdCO1FBQ3hDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ25ELENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBR2lCLFNBQUksd0NBQWdDO0lBS3JELENBQUM7YUFQYyxZQUFPLEdBQUcsaUNBQWlDLEFBQXBDLENBQXFDO0lBSW5ELFNBQVMsQ0FBQyxHQUF3QjtRQUN4QyxHQUFHLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQzVDLENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8sNEJBQTRCO0lBQXpDO1FBR2lCLFNBQUksNkNBQXFDO0lBSzFELENBQUM7YUFQYyxZQUFPLEdBQUcsK0JBQStCLEFBQWxDLENBQW1DO0lBSWpELFNBQVMsQ0FBQyxHQUF3QjtRQUN4QyxHQUFHLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ2pELENBQUM7O0FBS0YsU0FBUyxLQUFLLENBQUMsR0FBd0I7SUFDdEMsT0FBTyxHQUFHLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekMsT0FBTyxHQUFHLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDNUMsT0FBTyxHQUFHLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFVBQTZCLEVBQUUsR0FBd0I7SUFDN0YsNkVBQTZFO0lBQzdFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNYLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQXdCO0lBQzdELElBQUksR0FBRyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDdkMsT0FBTyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksb0JBQW9CLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBRSxDQUFDLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBQ0QsSUFBSSxHQUFHLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUMxQyxPQUFPLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUNELElBQUksR0FBRyxDQUFDLDRCQUE0QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDL0MsT0FBTyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksNEJBQTRCLEVBQUUsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7QUFDdEUsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLEdBQXdCLEVBQUUsTUFBeUI7SUFDMUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ1gsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDIn0=