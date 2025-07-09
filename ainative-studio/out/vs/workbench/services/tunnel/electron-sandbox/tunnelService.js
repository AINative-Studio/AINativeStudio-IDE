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
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ITunnelService, AbstractTunnelService, TunnelPrivacyId, isPortPrivileged, isTunnelProvider } from '../../../../platform/tunnel/common/tunnel.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ISharedProcessTunnelService } from '../../../../platform/remote/common/sharedProcessTunnelService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { OS } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let SharedProcessTunnel = class SharedProcessTunnel extends Disposable {
    constructor(_id, _addressProvider, tunnelRemoteHost, tunnelRemotePort, tunnelLocalPort, localAddress, _onBeforeDispose, _sharedProcessTunnelService, _remoteAuthorityResolverService) {
        super();
        this._id = _id;
        this._addressProvider = _addressProvider;
        this.tunnelRemoteHost = tunnelRemoteHost;
        this.tunnelRemotePort = tunnelRemotePort;
        this.tunnelLocalPort = tunnelLocalPort;
        this.localAddress = localAddress;
        this._onBeforeDispose = _onBeforeDispose;
        this._sharedProcessTunnelService = _sharedProcessTunnelService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this.privacy = TunnelPrivacyId.Private;
        this.protocol = undefined;
        this._updateAddress();
        this._register(this._remoteAuthorityResolverService.onDidChangeConnectionData(() => this._updateAddress()));
    }
    _updateAddress() {
        this._addressProvider.getAddress().then((address) => {
            this._sharedProcessTunnelService.setAddress(this._id, address);
        });
    }
    async dispose() {
        this._onBeforeDispose();
        super.dispose();
        await this._sharedProcessTunnelService.destroyTunnel(this._id);
    }
};
SharedProcessTunnel = __decorate([
    __param(7, ISharedProcessTunnelService),
    __param(8, IRemoteAuthorityResolverService)
], SharedProcessTunnel);
let TunnelService = class TunnelService extends AbstractTunnelService {
    constructor(logService, _environmentService, _sharedProcessTunnelService, _instantiationService, lifecycleService, _nativeWorkbenchEnvironmentService, configurationService) {
        super(logService, configurationService);
        this._environmentService = _environmentService;
        this._sharedProcessTunnelService = _sharedProcessTunnelService;
        this._instantiationService = _instantiationService;
        this._nativeWorkbenchEnvironmentService = _nativeWorkbenchEnvironmentService;
        this._activeSharedProcessTunnels = new Set();
        // Destroy any shared process tunnels that might still be active
        this._register(lifecycleService.onDidShutdown(() => {
            this._activeSharedProcessTunnels.forEach((id) => {
                this._sharedProcessTunnelService.destroyTunnel(id);
            });
        }));
    }
    isPortPrivileged(port) {
        return isPortPrivileged(port, this.defaultTunnelHost, OS, this._nativeWorkbenchEnvironmentService.os.release);
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
            const tunnel = this._createSharedProcessTunnel(addressOrTunnelProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded);
            this.logService.trace('ForwardedPorts: (TunnelService) Tunnel created without provider.');
            this.addTunnelToMap(remoteHost, remotePort, tunnel);
            return tunnel;
        }
    }
    async _createSharedProcessTunnel(addressProvider, tunnelRemoteHost, tunnelRemotePort, tunnelLocalHost, tunnelLocalPort, elevateIfNeeded) {
        const { id } = await this._sharedProcessTunnelService.createTunnel();
        this._activeSharedProcessTunnels.add(id);
        const authority = this._environmentService.remoteAuthority;
        const result = await this._sharedProcessTunnelService.startTunnel(authority, id, tunnelRemoteHost, tunnelRemotePort, tunnelLocalHost, tunnelLocalPort, elevateIfNeeded);
        const tunnel = this._instantiationService.createInstance(SharedProcessTunnel, id, addressProvider, tunnelRemoteHost, tunnelRemotePort, result.tunnelLocalPort, result.localAddress, () => {
            this._activeSharedProcessTunnels.delete(id);
        });
        return tunnel;
    }
    canTunnel(uri) {
        return super.canTunnel(uri) && !!this._environmentService.remoteAuthority;
    }
};
TunnelService = __decorate([
    __param(0, ILogService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, ISharedProcessTunnelService),
    __param(3, IInstantiationService),
    __param(4, ILifecycleService),
    __param(5, INativeWorkbenchEnvironmentService),
    __param(6, IConfigurationService)
], TunnelService);
export { TunnelService };
registerSingleton(ITunnelService, TunnelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdHVubmVsL2VsZWN0cm9uLXNhbmRib3gvdHVubmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFOUYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxjQUFjLEVBQUUscUJBQXFCLEVBQWdCLGVBQWUsRUFBRSxnQkFBZ0IsRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6TCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDL0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDaEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUszQyxZQUNrQixHQUFXLEVBQ1gsZ0JBQWtDLEVB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