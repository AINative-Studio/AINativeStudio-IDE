/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Client as MessagePortClient } from '../common/ipc.mp.js';
/**
 * An implementation of a `IPCClient` on top of DOM `MessagePort`.
 */
export class Client extends MessagePortClient {
    /**
     * @param clientId a way to uniquely identify this client among
     * other clients. this is important for routing because every
     * client can also be a server
     */
    constructor(port, clientId) {
        super(port, clientId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL2Jyb3dzZXIvaXBjLm1wLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxNQUFNLElBQUksaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVsRTs7R0FFRztBQUNILE1BQU0sT0FBTyxNQUFPLFNBQVEsaUJBQWlCO0lBRTVDOzs7O09BSUc7SUFDSCxZQUFZLElBQWlCLEVBQUUsUUFBZ0I7UUFDOUMsS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN2QixDQUFDO0NBQ0QifQ==