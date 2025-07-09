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
import * as net from 'net';
import * as os from 'os';
import { BROWSER_RESTRICTED_PORTS, findFreePortFaster } from '../../../base/node/ports.js';
import { NodeSocket } from '../../../base/parts/ipc/node/ipc.net.js';
import { Barrier } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { OS } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { connectRemoteAgentTunnel } from '../../remote/common/remoteAgentConnection.js';
import { IRemoteSocketFactoryService } from '../../remote/common/remoteSocketFactoryService.js';
import { ISignService } from '../../sign/common/sign.js';
import { AbstractTunnelService, TunnelPrivacyId, isAllInterfaces, isLocalhost, isPortPrivileged, isTunnelProvider } from '../common/tunnel.js';
import { VSBuffer } from '../../../base/common/buffer.js';
async function createRemoteTunnel(options, defaultTunnelHost, tunnelRemoteHost, tunnelRemotePort, tunnelLocalPort) {
    let readyTunnel;
    for (let attempts = 3; attempts; attempts--) {
        readyTunnel?.dispose();
        const tunnel = new NodeRemoteTunnel(options, defaultTunnelHost, tunnelRemoteHost, tunnelRemotePort, tunnelLocalPort);
        readyTunnel = await tunnel.waitForReady();
        if ((tunnelLocalPort && BROWSER_RESTRICTED_PORTS[tunnelLocalPort]) || !BROWSER_RESTRICTED_PORTS[readyTunnel.tunnelLocalPort]) {
            break;
        }
    }
    return readyTunnel;
}
export class NodeRemoteTunnel extends Disposable {
    constructor(options, defaultTunnelHost, tunnelRemoteHost, tunnelRemotePort, suggestedLocalPort) {
        super();
        this.defaultTunnelHost = defaultTunnelHost;
        this.suggestedLocalPort = suggestedLocalPort;
        this.privacy = TunnelPrivacyId.Private;
        this._socketsDispose = new Map();
        this._options = options;
        this._server = net.createServer();
        this._barrier = new Barrier();
        this._listeningListener = () => this._barrier.open();
        this._server.on('listening', this._listeningListener);
        this._connectionListener = (socket) => this._onConnection(socket);
        this._server.on('connection', this._connectionListener);
        // If there is no error listener and there is an error it will crash the whole window
        this._errorListener = () => { };
        this._server.on('error', this._errorListener);
        this.tunnelRemotePort = tunnelRemotePort;
        this.tunnelRemoteHost = tunnelRemoteHost;
    }
    async dispose() {
        super.dispose();
        this._server.removeListener('listening', this._listeningListener);
        this._server.removeListener('connection', this._connectionListener);
        this._server.removeListener('error', this._errorListener);
        this._server.close();
        const disposers = Array.from(this._socketsDispose.values());
        disposers.forEach(disposer => {
            disposer();
        });
    }
    async waitForReady() {
        const startPort = this.suggestedLocalPort ?? this.tunnelRemotePort;
        const hostname = isAllInterfaces(this.defaultTunnelHost) ? '0.0.0.0' : '127.0.0.1';
        // try to get the same port number as the remote port number...
        let localPort = await findFreePortFaster(startPort, 2, 1000, hostname);
        // if that fails, the method above returns 0, which works out fine below...
        let address = null;
        this._server.listen(localPort, this.defaultTunnelHost);
        await this._barrier.wait();
        address = this._server.address();
        // It is possible for findFreePortFaster to return a port that there is already a server listening on. This causes the previous listen call to error out.
        if (!address) {
            localPort = 0;
            this._server.listen(localPort, this.defaultTunnelHost);
            await this._barrier.wait();
            address = this._server.address();
        }
        this.tunnelLocalPort = address.port;
        this.localAddress = `${this.tunnelRemoteHost === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:${address.port}`;
        return this;
    }
    async _onConnection(localSocket) {
        // pause reading on the socket until we have a chance to forward its data
        localSocket.pause();
        const tunnelRemoteHost = (isLocalhost(this.tunnelRemoteHost) || isAllInterfaces(this.tunnelRemoteHost)) ? 'localhost' : this.tunnelRemoteHost;
        const protocol = await connectRemoteAgentTunnel(this._options, tunnelRemoteHost, this.tunnelRemotePort);
        const remoteSocket = protocol.getSocket();
        const dataChunk = protocol.readEntireBuffer();
        protocol.dispose();
        if (dataChunk.byteLength > 0) {
            localSocket.write(dataChunk.buffer);
        }
        localSocket.on('end', () => {
            if (localSocket.localAddress) {
                this._socketsDispose.delete(localSocket.localAddress);
            }
            remoteSocket.end();
        });
        localSocket.on('close', () => remoteSocket.end());
        localSocket.on('error', () => {
            if (localSocket.localAddress) {
                this._socketsDispose.delete(localSocket.localAddress);
            }
            if (remoteSocket instanceof NodeSocket) {
                remoteSocket.socket.destroy();
            }
            else {
                remoteSocket.end();
            }
        });
        if (remoteSocket instanceof NodeSocket) {
            this._mirrorNodeSocket(localSocket, remoteSocket);
        }
        else {
            this._mirrorGenericSocket(localSocket, remoteSocket);
        }
        if (localSocket.localAddress) {
            this._socketsDispose.set(localSocket.localAddress, () => {
                // Need to end instead of unpipe, otherwise whatever is connected locally could end up "stuck" with whatever state it had until manually exited.
                localSocket.end();
                remoteSocket.end();
            });
        }
    }
    _mirrorGenericSocket(localSocket, remoteSocket) {
        remoteSocket.onClose(() => localSocket.destroy());
        remoteSocket.onEnd(() => localSocket.end());
        remoteSocket.onData(d => localSocket.write(d.buffer));
        localSocket.on('data', d => remoteSocket.write(VSBuffer.wrap(d)));
        localSocket.resume();
    }
    _mirrorNodeSocket(localSocket, remoteNodeSocket) {
        const remoteSocket = remoteNodeSocket.socket;
        remoteSocket.on('end', () => localSocket.end());
        remoteSocket.on('close', () => localSocket.end());
        remoteSocket.on('error', () => {
            localSocket.destroy();
        });
        remoteSocket.pipe(localSocket);
        localSocket.pipe(remoteSocket);
    }
}
let BaseTunnelService = class BaseTunnelService extends AbstractTunnelService {
    constructor(remoteSocketFactoryService, logService, signService, productService, configurationService) {
        super(logService, configurationService);
        this.remoteSocketFactoryService = remoteSocketFactoryService;
        this.signService = signService;
        this.productService = productService;
    }
    isPortPrivileged(port) {
        return isPortPrivileged(port, this.defaultTunnelHost, OS, os.release());
    }
    retainOrCreateTunnel(addressOrTunnelProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded, privacy, protocol) {
        const existing = this.getTunnelFromMap(remoteHost, remotePort);
        if (existing) {
            ++existing.refcount;
            return existing.value;
        }
        if (isTunnelProvider(addressOrTunnelProvider)) {
            return this.createWithProvider(addressOrTunnelProvider, remoteHost, remotePort, localPort, elevateIfNeeded, privacy, protocol);
        }
        else {
            this.logService.trace(`ForwardedPorts: (TunnelService) Creating tunnel without provider ${remoteHost}:${remotePort} on local port ${localPort}.`);
            const options = {
                commit: this.productService.commit,
                quality: this.productService.quality,
                addressProvider: addressOrTunnelProvider,
                remoteSocketFactoryService: this.remoteSocketFactoryService,
                signService: this.signService,
                logService: this.logService,
                ipcLogger: null
            };
            const tunnel = createRemoteTunnel(options, localHost, remoteHost, remotePort, localPort);
            this.logService.trace('ForwardedPorts: (TunnelService) Tunnel created without provider.');
            this.addTunnelToMap(remoteHost, remotePort, tunnel);
            return tunnel;
        }
    }
};
BaseTunnelService = __decorate([
    __param(0, IRemoteSocketFactoryService),
    __param(1, ILogService),
    __param(2, ISignService),
    __param(3, IProductService),
    __param(4, IConfigurationService)
], BaseTunnelService);
export { BaseTunnelService };
let TunnelService = class TunnelService extends BaseTunnelService {
    constructor(remoteSocketFactoryService, logService, signService, productService, configurationService) {
        super(remoteSocketFactoryService, logService, signService, productService, configurationService);
    }
};
TunnelService = __decorate([
    __param(0, IRemoteSocketFactoryService),
    __param(1, ILogService),
    __param(2, ISignService),
    __param(3, IProductService),
    __param(4, IConfigurationService)
], TunnelService);
export { TunnelService };
let SharedTunnelsService = class SharedTunnelsService extends Disposable {
    constructor(remoteSocketFactoryService, logService, productService, signService, configurationService) {
        super();
        this.remoteSocketFactoryService = remoteSocketFactoryService;
        this.logService = logService;
        this.productService = productService;
        this.signService = signService;
        this.configurationService = configurationService;
        this._tunnelServices = new Map();
    }
    async openTunnel(authority, addressProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded, privacy, protocol) {
        this.logService.trace(`ForwardedPorts: (SharedTunnelService) openTunnel request for ${remoteHost}:${remotePort} on local port ${localPort}.`);
        if (!this._tunnelServices.has(authority)) {
            const tunnelService = new TunnelService(this.remoteSocketFactoryService, this.logService, this.signService, this.productService, this.configurationService);
            this._register(tunnelService);
            this._tunnelServices.set(authority, tunnelService);
            tunnelService.onTunnelClosed(async () => {
                if ((await tunnelService.tunnels).length === 0) {
                    tunnelService.dispose();
                    this._tunnelServices.delete(authority);
                }
            });
        }
        return this._tunnelServices.get(authority).openTunnel(addressProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded, privacy, protocol);
    }
};
SharedTunnelsService = __decorate([
    __param(0, IRemoteSocketFactoryService),
    __param(1, ILogService),
    __param(2, IProductService),
    __param(3, ISignService),
    __param(4, IConfigurationService)
], SharedTunnelsService);
export { SharedTunnelsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90dW5uZWwvbm9kZS90dW5uZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDO0FBQzNCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBd0Msd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5SCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUF3RSxlQUFlLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3JOLE9BQU8sRUFB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