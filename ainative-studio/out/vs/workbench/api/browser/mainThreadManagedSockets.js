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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1hbmFnZWRTb2NrZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRNYW5hZ2VkU29ja2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxhQUFhLEVBQW9CLG9CQUFvQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFekgsT0FBTyxFQUFFLDJCQUEyQixFQUFrQixNQUFNLCtEQUErRCxDQUFDO0FBQzVILE9BQU8sRUFBRSxjQUFjLEVBQThCLFdBQVcsRUFBaUMsTUFBTSwrQkFBK0IsQ0FBQztBQUN2SSxPQUFPLEVBQW1CLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHdEcsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBTXZELFlBQ0MsY0FBK0IsRUFDRiwyQkFBeUU7UUFFdEcsS0FBSyxFQUFFLENBQUM7UUFGc0MsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQUx0RixtQkFBYyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBQ2hELG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7UUFPckUsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCLENBQUMsZUFBdUI7UUFDbkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLE1BQU0sYUFBYSxH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