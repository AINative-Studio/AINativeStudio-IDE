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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdEVudi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uSG9zdEVudi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLENBQU4sSUFBa0IscUJBSWpCO0FBSkQsV0FBa0IscUJBQXFCO0lBQ3RDLCtEQUFPLENBQUE7SUFDUCxxRUFBVSxDQUFBO0lBQ1YsK0VBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFJdEM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxvQkFBb0I7YUFDbEIsWUFBTyxHQUFHLHlCQUF5QixBQUE1QixDQUE2QjtJQUlsRCxZQUNpQixRQUFnQjtRQUFoQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBSGpCLFNBQUkscUNBQTZCO0lBSTdDLENBQUM7SUFFRSxTQUFTLENBQUMsR0FBd0I7UUFDeEMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDbkQsQ0FBQzs7QUFHRjs7R0FFRztBQUNILE1BQU0sT0FBTyx1QkFBdUI7SUFBcEM7UUFHaUIsU0FBSSx3Q0FBZ0M7SUFLckQsQ0FBQzthQVBjLFlBQU8sR0FBRyxpQ0FBaUMsQUFBcEMsQ0FBcUM7SUFJbkQsU0FBUyxDQUFDLEdBQXdCO1FBQ3hDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDNUMsQ0FBQzs7QUFHRjs7R0FFRztBQUNILE1BQU0sT0FBTyw0QkFBNEI7SUFBekM7UUFHaUIsU0FBSSw2Q0FBcUM7SUFLMUQsQ0FBQzthQVBjLFlBQU8sR0FBRywrQkFBK0IsQUFBbEMsQ0FBbUM7SUFJakQsU0FBUyxDQUFDLEdBQXdCO1FBQ3hDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDakQsQ0FBQzs7QUFLRixTQUFTLEtBQUssQ0FBQyxHQUF3QjtJQUN0QyxPQUFPLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QyxPQUFPLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM1QyxPQUFPLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNsRCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsVUFBNkIsRUFBRSxHQUF3QjtJQUM3Riw2RUFBNkU7SUFDN0UsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ1gsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUMsR0FBd0I7SUFDN0QsSUFBSSxHQUFHLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUN2QyxPQUFPLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFDRCxJQUFJLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzFDLE9BQU8sY0FBYyxDQUFDLEdBQUcsRUFBRSxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBQ0QsSUFBSSxHQUFHLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUMvQyxPQUFPLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSw0QkFBNEIsRUFBRSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsbURBQW1ELENBQUMsQ0FBQztBQUN0RSxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsR0FBd0IsRUFBRSxNQUF5QjtJQUMxRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDWCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==