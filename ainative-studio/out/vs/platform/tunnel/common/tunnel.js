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
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
export const ITunnelService = createDecorator('tunnelService');
export const ISharedTunnelsService = createDecorator('sharedTunnelsService');
export var TunnelProtocol;
(function (TunnelProtocol) {
    TunnelProtocol["Http"] = "http";
    TunnelProtocol["Https"] = "https";
})(TunnelProtocol || (TunnelProtocol = {}));
export var TunnelPrivacyId;
(function (TunnelPrivacyId) {
    TunnelPrivacyId["ConstantPrivate"] = "constantPrivate";
    TunnelPrivacyId["Private"] = "private";
    TunnelPrivacyId["Public"] = "public";
})(TunnelPrivacyId || (TunnelPrivacyId = {}));
export function isTunnelProvider(addressOrTunnelProvider) {
    return !!addressOrTunnelProvider.forwardPort;
}
export var ProvidedOnAutoForward;
(function (ProvidedOnAutoForward) {
    ProvidedOnAutoForward[ProvidedOnAutoForward["Notify"] = 1] = "Notify";
    ProvidedOnAutoForward[ProvidedOnAutoForward["OpenBrowser"] = 2] = "OpenBrowser";
    ProvidedOnAutoForward[ProvidedOnAutoForward["OpenPreview"] = 3] = "OpenPreview";
    ProvidedOnAutoForward[ProvidedOnAutoForward["Silent"] = 4] = "Silent";
    ProvidedOnAutoForward[ProvidedOnAutoForward["Ignore"] = 5] = "Ignore";
    ProvidedOnAutoForward[ProvidedOnAutoForward["OpenBrowserOnce"] = 6] = "OpenBrowserOnce";
})(ProvidedOnAutoForward || (ProvidedOnAutoForward = {}));
export function extractLocalHostUriMetaDataForPortMapping(uri) {
    if (uri.scheme !== 'http' && uri.scheme !== 'https') {
        return undefined;
    }
    const localhostMatch = /^(localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)$/.exec(uri.authority);
    if (!localhostMatch) {
        return undefined;
    }
    return {
        address: localhostMatch[1],
        port: +localhostMatch[2],
    };
}
export function extractQueryLocalHostUriMetaDataForPortMapping(uri) {
    if (uri.scheme !== 'http' && uri.scheme !== 'https' || !uri.query) {
        return undefined;
    }
    const keyvalues = uri.query.split('&');
    for (const keyvalue of keyvalues) {
        const value = keyvalue.split('=')[1];
        if (/^https?:/.exec(value)) {
            const result = extractLocalHostUriMetaDataForPortMapping(URI.parse(value));
            if (result) {
                return result;
            }
        }
    }
    return undefined;
}
export const LOCALHOST_ADDRESSES = ['localhost', '127.0.0.1', '0:0:0:0:0:0:0:1', '::1'];
export function isLocalhost(host) {
    return LOCALHOST_ADDRESSES.indexOf(host) >= 0;
}
export const ALL_INTERFACES_ADDRESSES = ['0.0.0.0', '0:0:0:0:0:0:0:0', '::'];
export function isAllInterfaces(host) {
    return ALL_INTERFACES_ADDRESSES.indexOf(host) >= 0;
}
export function isPortPrivileged(port, host, os, osRelease) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return false;
    }
    if (os === 2 /* OperatingSystem.Macintosh */) {
        if (isAllInterfaces(host)) {
            const osVersion = (/(\d+)\.(\d+)\.(\d+)/g).exec(osRelease);
            if (osVersion?.length === 4) {
                const major = parseInt(osVersion[1]);
                if (major >= 18 /* since macOS Mojave, darwin version 18.0.0 */) {
                    return false;
                }
            }
        }
    }
    return port < 1024;
}
export class DisposableTunnel {
    constructor(remoteAddress, localAddress, _dispose) {
        this.remoteAddress = remoteAddress;
        this.localAddress = localAddress;
        this._dispose = _dispose;
        this._onDispose = new Emitter();
        this.onDidDispose = this._onDispose.event;
    }
    dispose() {
        this._onDispose.fire();
        return this._dispose();
    }
}
let AbstractTunnelService = class AbstractTunnelService extends Disposable {
    constructor(logService, configurationService) {
        super();
        this.logService = logService;
        this.configurationService = configurationService;
        this._onTunnelOpened = new Emitter();
        this.onTunnelOpened = this._onTunnelOpened.event;
        this._onTunnelClosed = new Emitter();
        this.onTunnelClosed = this._onTunnelClosed.event;
        this._onAddedTunnelProvider = new Emitter();
        this.onAddedTunnelProvider = this._onAddedTunnelProvider.event;
        this._tunnels = new Map();
        this._canElevate = false;
        this._canChangeProtocol = true;
        this._privacyOptions = [];
        this._factoryInProgress = new Set();
    }
    get hasTunnelProvider() {
        return !!this._tunnelProvider;
    }
    get defaultTunnelHost() {
        const settingValue = this.configurationService.getValue('remote.localPortHost');
        return (!settingValue || settingValue === 'localhost') ? '127.0.0.1' : '0.0.0.0';
    }
    setTunnelProvider(provider) {
        this._tunnelProvider = provider;
        if (!provider) {
            // clear features
            this._canElevate = false;
            this._privacyOptions = [];
            this._onAddedTunnelProvider.fire();
            return {
                dispose: () => { }
            };
        }
        this._onAddedTunnelProvider.fire();
        return {
            dispose: () => {
                this._tunnelProvider = undefined;
                this._canElevate = false;
                this._privacyOptions = [];
            }
        };
    }
    setTunnelFeatures(features) {
        this._canElevate = features.elevation;
        this._privacyOptions = features.privacyOptions;
        this._canChangeProtocol = features.protocol;
    }
    get canChangeProtocol() {
        return this._canChangeProtocol;
    }
    get canElevate() {
        return this._canElevate;
    }
    get canChangePrivacy() {
        return this._privacyOptions.length > 0;
    }
    get privacyOptions() {
        return this._privacyOptions;
    }
    get tunnels() {
        return this.getTunnels();
    }
    async getTunnels() {
        const tunnels = [];
        const tunnelArray = Array.from(this._tunnels.values());
        for (const portMap of tunnelArray) {
            const portArray = Array.from(portMap.values());
            for (const x of portArray) {
                const tunnelValue = await x.value;
                if (tunnelValue && (typeof tunnelValue !== 'string')) {
                    tunnels.push(tunnelValue);
                }
            }
        }
        return tunnels;
    }
    async dispose() {
        super.dispose();
        for (const portMap of this._tunnels.values()) {
            for (const { value } of portMap.values()) {
                await value.then(tunnel => typeof tunnel !== 'string' ? tunnel?.dispose() : undefined);
            }
            portMap.clear();
        }
        this._tunnels.clear();
    }
    setEnvironmentTunnel(remoteHost, remotePort, localAddress, privacy, protocol) {
        this.addTunnelToMap(remoteHost, remotePort, Promise.resolve({
            tunnelRemoteHost: remoteHost,
            tunnelRemotePort: remotePort,
            localAddress,
            privacy,
            protocol,
            dispose: () => Promise.resolve()
        }));
    }
    async getExistingTunnel(remoteHost, remotePort) {
        if (isAllInterfaces(remoteHost) || isLocalhost(remoteHost)) {
            remoteHost = LOCALHOST_ADDRESSES[0];
        }
        const existing = this.getTunnelFromMap(remoteHost, remotePort);
        if (existing) {
            ++existing.refcount;
            return existing.value;
        }
        return undefined;
    }
    openTunnel(addressProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded = false, privacy, protocol) {
        this.logService.trace(`ForwardedPorts: (TunnelService) openTunnel request for ${remoteHost}:${remotePort} on local port ${localPort}.`);
        const addressOrTunnelProvider = this._tunnelProvider ?? addressProvider;
        if (!addressOrTunnelProvider) {
            return undefined;
        }
        if (!remoteHost) {
            remoteHost = 'localhost';
        }
        if (!localHost) {
            localHost = this.defaultTunnelHost;
        }
        // Prevent tunnel factories from calling openTunnel from within the factory
        if (this._tunnelProvider && this._factoryInProgress.has(remotePort)) {
            this.logService.debug(`ForwardedPorts: (TunnelService) Another call to create a tunnel with the same address has occurred before the last one completed. This call will be ignored.`);
            return;
        }
        const resolvedTunnel = this.retainOrCreateTunnel(addressOrTunnelProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded, privacy, protocol);
        if (!resolvedTunnel) {
            this.logService.trace(`ForwardedPorts: (TunnelService) Tunnel was not created.`);
            return resolvedTunnel;
        }
        return resolvedTunnel.then(tunnel => {
            if (!tunnel) {
                this.logService.trace('ForwardedPorts: (TunnelService) New tunnel is undefined.');
                this.removeEmptyOrErrorTunnelFromMap(remoteHost, remotePort);
                return undefined;
            }
            else if (typeof tunnel === 'string') {
                this.logService.trace('ForwardedPorts: (TunnelService) The tunnel provider returned an error when creating the tunnel.');
                this.removeEmptyOrErrorTunnelFromMap(remoteHost, remotePort);
                return tunnel;
            }
            this.logService.trace('ForwardedPorts: (TunnelService) New tunnel established.');
            const newTunnel = this.makeTunnel(tunnel);
            if (tunnel.tunnelRemoteHost !== remoteHost || tunnel.tunnelRemotePort !== remotePort) {
                this.logService.warn('ForwardedPorts: (TunnelService) Created tunnel does not match requirements of requested tunnel. Host or port mismatch.');
            }
            if (privacy && tunnel.privacy !== privacy) {
                this.logService.warn('ForwardedPorts: (TunnelService) Created tunnel does not match requirements of requested tunnel. Privacy mismatch.');
            }
            this._onTunnelOpened.fire(newTunnel);
            return newTunnel;
        });
    }
    makeTunnel(tunnel) {
        return {
            tunnelRemotePort: tunnel.tunnelRemotePort,
            tunnelRemoteHost: tunnel.tunnelRemoteHost,
            tunnelLocalPort: tunnel.tunnelLocalPort,
            localAddress: tunnel.localAddress,
            privacy: tunnel.privacy,
            protocol: tunnel.protocol,
            dispose: async () => {
                this.logService.trace(`ForwardedPorts: (TunnelService) dispose request for ${tunnel.tunnelRemoteHost}:${tunnel.tunnelRemotePort} `);
                const existingHost = this._tunnels.get(tunnel.tunnelRemoteHost);
                if (existingHost) {
                    const existing = existingHost.get(tunnel.tunnelRemotePort);
                    if (existing) {
                        existing.refcount--;
                        await this.tryDisposeTunnel(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort, existing);
                    }
                }
            }
        };
    }
    async tryDisposeTunnel(remoteHost, remotePort, tunnel) {
        if (tunnel.refcount <= 0) {
            this.logService.trace(`ForwardedPorts: (TunnelService) Tunnel is being disposed ${remoteHost}:${remotePort}.`);
            const disposePromise = tunnel.value.then(async (tunnel) => {
                if (tunnel && (typeof tunnel !== 'string')) {
                    await tunnel.dispose(true);
                    this._onTunnelClosed.fire({ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort });
                }
            });
            if (this._tunnels.has(remoteHost)) {
                this._tunnels.get(remoteHost).delete(remotePort);
            }
            return disposePromise;
        }
    }
    async closeTunnel(remoteHost, remotePort) {
        this.logService.trace(`ForwardedPorts: (TunnelService) close request for ${remoteHost}:${remotePort} `);
        const portMap = this._tunnels.get(remoteHost);
        if (portMap && portMap.has(remotePort)) {
            const value = portMap.get(remotePort);
            value.refcount = 0;
            await this.tryDisposeTunnel(remoteHost, remotePort, value);
        }
    }
    addTunnelToMap(remoteHost, remotePort, tunnel) {
        if (!this._tunnels.has(remoteHost)) {
            this._tunnels.set(remoteHost, new Map());
        }
        this._tunnels.get(remoteHost).set(remotePort, { refcount: 1, value: tunnel });
    }
    async removeEmptyOrErrorTunnelFromMap(remoteHost, remotePort) {
        const hostMap = this._tunnels.get(remoteHost);
        if (hostMap) {
            const tunnel = hostMap.get(remotePort);
            const tunnelResult = tunnel ? await tunnel.value : undefined;
            if (!tunnelResult || (typeof tunnelResult === 'string')) {
                hostMap.delete(remotePort);
            }
            if (hostMap.size === 0) {
                this._tunnels.delete(remoteHost);
            }
        }
    }
    getTunnelFromMap(remoteHost, remotePort) {
        const hosts = [remoteHost];
        // Order matters. We want the original host to be first.
        if (isLocalhost(remoteHost)) {
            hosts.push(...LOCALHOST_ADDRESSES);
            // For localhost, we add the all interfaces hosts because if the tunnel is already available at all interfaces,
            // then of course it is available at localhost.
            hosts.push(...ALL_INTERFACES_ADDRESSES);
        }
        else if (isAllInterfaces(remoteHost)) {
            hosts.push(...ALL_INTERFACES_ADDRESSES);
        }
        const existingPortMaps = hosts.map(host => this._tunnels.get(host));
        for (const map of existingPortMaps) {
            const existingTunnel = map?.get(remotePort);
            if (existingTunnel) {
                return existingTunnel;
            }
        }
        return undefined;
    }
    canTunnel(uri) {
        return !!extractLocalHostUriMetaDataForPortMapping(uri);
    }
    createWithProvider(tunnelProvider, remoteHost, remotePort, localPort, elevateIfNeeded, privacy, protocol) {
        this.logService.trace(`ForwardedPorts: (TunnelService) Creating tunnel with provider ${remoteHost}:${remotePort} on local port ${localPort}.`);
        const key = remotePort;
        this._factoryInProgress.add(key);
        const preferredLocalPort = localPort === undefined ? remotePort : localPort;
        const creationInfo = { elevationRequired: elevateIfNeeded ? this.isPortPrivileged(preferredLocalPort) : false };
        const tunnelOptions = { remoteAddress: { host: remoteHost, port: remotePort }, localAddressPort: localPort, privacy, public: privacy ? (privacy !== TunnelPrivacyId.Private) : undefined, protocol };
        const tunnel = tunnelProvider.forwardPort(tunnelOptions, creationInfo);
        if (tunnel) {
            this.addTunnelToMap(remoteHost, remotePort, tunnel);
            tunnel.finally(() => {
                this.logService.trace('ForwardedPorts: (TunnelService) Tunnel created by provider.');
                this._factoryInProgress.delete(key);
            });
        }
        else {
            this._factoryInProgress.delete(key);
        }
        return tunnel;
    }
};
AbstractTunnelService = __decorate([
    __param(0, ILogService),
    __param(1, IConfigurationService)
], AbstractTunnelService);
export { AbstractTunnelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3R1bm5lbC9jb21tb24vdHVubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQWUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFJdEQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBaUIsZUFBZSxDQUFDLENBQUM7QUFDL0UsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBcUJwRyxNQUFNLENBQU4sSUFBWSxjQUdYO0FBSEQsV0FBWSxjQUFjO0lBQ3pCLCtCQUFhLENBQUE7SUFDYixpQ0FBZSxDQUFBO0FBQ2hCLENBQUMsRUFIVyxjQUFjLEtBQWQsY0FBYyxRQUd6QjtBQUVELE1BQU0sQ0FBTixJQUFZLGVBSVg7QUFKRCxXQUFZLGVBQWU7SUFDMUIsc0RBQW1DLENBQUE7SUFDbkMsc0NBQW1CLENBQUE7SUFDbkIsb0NBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQUpXLGVBQWUsS0FBZixlQUFlLFFBSTFCO0FBb0JELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyx1QkFBMkQ7SUFDM0YsT0FBTyxDQUFDLENBQUUsdUJBQTJDLENBQUMsV0FB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