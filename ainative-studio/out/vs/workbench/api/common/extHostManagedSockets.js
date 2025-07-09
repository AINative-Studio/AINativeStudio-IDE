/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { MainContext } from './extHost.protocol.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { VSBuffer } from '../../../base/common/buffer.js';
export const IExtHostManagedSockets = createDecorator('IExtHostManagedSockets');
let ExtHostManagedSockets = class ExtHostManagedSockets {
    constructor(extHostRpc) {
        this._remoteSocketIdCounter = 0;
        this._factory = null;
        this._managedRemoteSockets = new Map();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadManagedSockets);
    }
    setFactory(socketFactoryId, makeConnection) {
        // Terminate all previous sockets
        for (const socket of this._managedRemoteSockets.values()) {
            // calling dispose() will lead to it removing itself from the map
            socket.dispose();
        }
        // Unregister previous factory
        if (this._factory) {
            this._proxy.$unregisterSocketFactory(this._factory.socketFactoryId);
        }
        this._factory = new ManagedSocketFactory(socketFactoryId, makeConnection);
        this._proxy.$registerSocketFactory(this._factory.socketFactoryId);
    }
    async $openRemoteSocket(socketFactoryId) {
        if (!this._factory || this._factory.socketFactoryId !== socketFactoryId) {
            throw new Error(`No socket factory with id ${socketFactoryId}`);
        }
        const id = (++this._remoteSocketIdCounter);
        const socket = await this._factory.makeConnection();
        const disposable = new DisposableStore();
        this._managedRemoteSockets.set(id, new ManagedSocket(id, socket, disposable));
        disposable.add(toDisposable(() => this._managedRemoteSockets.delete(id)));
        disposable.add(socket.onDidEnd(() => {
            this._proxy.$onDidManagedSocketEnd(id);
            disposable.dispose();
        }));
        disposable.add(socket.onDidClose(e => {
            this._proxy.$onDidManagedSocketClose(id, e?.stack ?? e?.message);
            disposable.dispose();
        }));
        disposable.add(socket.onDidReceiveMessage(e => this._proxy.$onDidManagedSocketHaveData(id, VSBuffer.wrap(e))));
        return id;
    }
    $remoteSocketWrite(socketId, buffer) {
        this._managedRemoteSockets.get(socketId)?.actual.send(buffer.buffer);
    }
    $remoteSocketEnd(socketId) {
        const socket = this._managedRemoteSockets.get(socketId);
        if (socket) {
            socket.actual.end();
            socket.dispose();
        }
    }
    async $remoteSocketDrain(socketId) {
        await this._managedRemoteSockets.get(socketId)?.actual.drain?.();
    }
};
ExtHostManagedSockets = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostManagedSockets);
export { ExtHostManagedSockets };
class ManagedSocketFactory {
    constructor(socketFactoryId, makeConnection) {
        this.socketFactoryId = socketFactoryId;
        this.makeConnection = makeConnection;
    }
}
class ManagedSocket extends Disposable {
    constructor(socketId, actual, disposer) {
        super();
        this.socketId = socketId;
        this.actual = actual;
        this._register(disposer);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1hbmFnZWRTb2NrZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RNYW5hZ2VkU29ja2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQThCLFdBQVcsRUFBaUMsTUFBTSx1QkFBdUIsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBTzFELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGVBQWUsQ0FBeUIsd0JBQXdCLENBQUMsQ0FBQztBQUVqRyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQVFqQyxZQUNxQixVQUE4QjtRQUwzQywyQkFBc0IsR0FBRyxDQUFDLENBQUM7UUFDM0IsYUFBUSxHQUFnQyxJQUFJLENBQUM7UUFDcEMsMEJBQXFCLEdBQStCLElBQUksR0FBRyxFQUFFLENBQUM7UUFLOUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxVQUFVLENBQUMsZUFBdUIsRUFBRSxjQUE0RDtRQUMvRixpQ0FBaUM7UUFDakMsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUMxRCxpRUFBaUU7WUFDakUs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