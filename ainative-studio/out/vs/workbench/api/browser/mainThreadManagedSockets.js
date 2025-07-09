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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ManagedSocket, connectManagedSocket } from '../../../platform/remote/common/managedSocket.js';
import { IRemoteSocketFactoryService } from '../../../platform/remote/common/remoteSocketFactoryService.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadManagedSockets = class MainThreadManagedSockets extends Disposable {
    constructor(extHostContext, _remoteSocketFactoryService) {
        super();
        this._remoteSocketFactoryService = _remoteSocketFactoryService;
        this._registrations = new Map();
        this._remoteSockets = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostManagedSockets);
    }
    async $registerSocketFactory(socketFactoryId) {
        const that = this;
        const socketFactory = new class {
            supports(connectTo) {
                return (connectTo.id === socketFactoryId);
            }
            connect(connectTo, path, query, debugLabel) {
                return new Promise((resolve, reject) => {
                    if (connectTo.id !== socketFactoryId) {
                        return reject(new Error('Invalid connectTo'));
                    }
                    const factoryId = connectTo.id;
                    that._proxy.$openRemoteSocket(factoryId).then(socketId => {
                        const half = {
                            onClose: new Emitter(),
                            onData: new Emitter(),
                            onEnd: new Emitter(),
                        };
                        that._remoteSockets.set(socketId, half);
                        MainThreadManagedSocket.connect(socketId, that._proxy, path, query, debugLabel, half)
                            .then(socket => {
                            socket.onDidDispose(() => that._remoteSockets.delete(socketId));
                            resolve(socket);
                        }, err => {
                            that._remoteSockets.delete(socketId);
                            reject(err);
                        });
                    }).catch(reject);
                });
            }
        };
        this._registrations.set(socketFactoryId, this._remoteSocketFactoryService.register(1 /* RemoteConnectionType.Managed */, socketFactory));
    }
    async $unregisterSocketFactory(socketFactoryId) {
        this._registrations.get(socketFactoryId)?.dispose();
    }
    $onDidManagedSocketHaveData(socketId, data) {
        this._remoteSockets.get(socketId)?.onData.fire(data);
    }
    $onDidManagedSocketClose(socketId, error) {
        this._remoteSockets.get(socketId)?.onClose.fire({
            type: 0 /* SocketCloseEventType.NodeSocketCloseEvent */,
            error: error ? new Error(error) : undefined,
            hadError: !!error
        });
        this._remoteSockets.delete(socketId);
    }
    $onDidManagedSocketEnd(socketId) {
        this._remoteSockets.get(socketId)?.onEnd.fire();
    }
};
MainThreadManagedSockets = __decorate([
    extHostNamedCustomer(MainContext.MainThreadManagedSockets),
    __param(1, IRemoteSocketFactoryService)
], MainThreadManagedSockets);
export { MainThreadManagedSockets };
export class MainThreadManagedSocket extends ManagedSocket {
    static connect(socketId, proxy, path, query, debugLabel, half) {
        const socket = new MainThreadManagedSocket(socketId, proxy, debugLabel, half);
        return connectManagedSocket(socket, path, query, debugLabel, half);
    }
    constructor(socketId, proxy, debugLabel, half) {
        super(debugLabel, half);
        this.socketId = socketId;
        this.proxy = proxy;
    }
    write(buffer) {
        this.proxy.$remoteSocketWrite(this.socketId, buffer);
    }
    closeRemote() {
        this.proxy.$remoteSocketEnd(this.socketId);
    }
    drain() {
        return this.proxy.$remoteSocketDrain(this.socketId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1hbmFnZWRTb2NrZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTWFuYWdlZFNvY2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsYUFBYSxFQUFvQixvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXpILE9BQU8sRUFBRSwyQkFBMkIsRUFBa0IsTUFBTSwrREFBK0QsQ0FBQztBQUM1SCxPQUFPLEVBQUUsY0FBYyxFQUE4QixXQUFXLEVBQWlDLE1BQU0sK0JBQStCLENBQUM7QUFDdkksT0FBTyxFQUFtQixvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3RHLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQU12RCxZQUNDLGNBQStCLEVBQ0YsMkJBQXlFO1FBRXRHLEtBQUssRUFBRSxDQUFDO1FBRnNDLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFMdEYsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUNoRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO1FBT3JFLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsS0FBSyxDQUFDLHNCQUFzQixDQUFDLGVBQXVCO1FBQ25ELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixNQUFNLGFBQWEs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