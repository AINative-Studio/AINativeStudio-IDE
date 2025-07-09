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
import * as nls from '../../../nls.js';
import { MainContext, ExtHostContext, CandidatePortSource } from '../common/extHost.protocol.js';
import { TunnelDtoConverter } from '../common/extHostTunnelService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IRemoteExplorerService, PORT_AUTO_FORWARD_SETTING, PORT_AUTO_SOURCE_SETTING, PORT_AUTO_SOURCE_SETTING_HYBRID, PORT_AUTO_SOURCE_SETTING_OUTPUT, PortsEnablement } from '../../services/remote/common/remoteExplorerService.js';
import { ITunnelService, TunnelProtocol } from '../../../platform/tunnel/common/tunnel.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { INotificationService, Severity } from '../../../platform/notification/common/notification.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IRemoteAgentService } from '../../services/remote/common/remoteAgentService.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../platform/configuration/common/configurationRegistry.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { TunnelCloseReason, TunnelSource, forwardedPortsFeaturesEnabled, makeAddress } from '../../services/remote/common/tunnelModel.js';
let MainThreadTunnelService = class MainThreadTunnelService extends Disposable {
    constructor(extHostContext, remoteExplorerService, tunnelService, notificationService, configurationService, logService, remoteAgentService, contextKeyService) {
        super();
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.logService = logService;
        this.remoteAgentService = remoteAgentService;
        this.contextKeyService = contextKeyService;
        this.elevateionRetry = false;
        this.portsAttributesProviders = new Map();
        this._alreadyRegistered = false;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTunnelService);
        this._register(tunnelService.onTunnelOpened(() => this._proxy.$onDidTunnelsChange()));
        this._register(tunnelService.onTunnelClosed(() => this._proxy.$onDidTunnelsChange()));
    }
    processFindingEnabled() {
        return (!!this.configurationService.getValue(PORT_AUTO_FORWARD_SETTING) || this.tunnelService.hasTunnelProvider)
            && (this.configurationService.getValue(PORT_AUTO_SOURCE_SETTING) !== PORT_AUTO_SOURCE_SETTING_OUTPUT);
    }
    async $setRemoteTunnelService(processId) {
        this.remoteExplorerService.namedProcesses.set(processId, 'Code Extension Host');
        if (this.remoteExplorerService.portsFeaturesEnabled === PortsEnablement.AdditionalFeatures) {
            this._proxy.$registerCandidateFinder(this.processFindingEnabled());
        }
        else {
            this._register(this.remoteExplorerService.onEnabledPortsFeatures(() => this._proxy.$registerCandidateFinder(this.processFindingEnabled())));
        }
        this._register(this.configurationService.onDidChangeConfiguration(async (e) => {
            if ((this.remoteExplorerService.portsFeaturesEnabled === PortsEnablement.AdditionalFeatures) && (e.affectsConfiguration(PORT_AUTO_FORWARD_SETTING) || e.affectsConfiguration(PORT_AUTO_SOURCE_SETTING))) {
                return this._proxy.$registerCandidateFinder(this.processFindingEnabled());
            }
        }));
        this._register(this.tunnelService.onAddedTunnelProvider(async () => {
            if (this.remoteExplorerService.portsFeaturesEnabled === PortsEnablement.AdditionalFeatures) {
                return this._proxy.$registerCandidateFinder(this.processFindingEnabled());
            }
        }));
    }
    async $registerPortsAttributesProvider(selector, providerHandle) {
        this.portsAttributesProviders.set(providerHandle, selector);
        if (!this._alreadyRegistered) {
            this.remoteExplorerService.tunnelModel.addAttributesProvider(this);
            this._alreadyRegistered = true;
        }
    }
    async $unregisterPortsAttributesProvider(providerHandle) {
        this.portsAttributesProviders.delete(providerHandle);
    }
    async providePortAttributes(ports, pid, commandLine, token) {
        if (this.portsAttributesProviders.size === 0) {
            return [];
        }
        // Check all the selectors to make sure it's worth going to the extension host.
        const appropriateHandles = Array.from(this.portsAttributesProviders.entries()).filter(entry => {
            const selector = entry[1];
            const portRange = (typeof selector.portRange === 'number') ? [selector.portRange, selector.portRange + 1] : selector.portRange;
            const portInRange = portRange ? ports.some(port => portRange[0] <= port && port < portRange[1]) : true;
            const commandMatches = !selector.commandPattern || (commandLine && (commandLine.match(selector.commandPattern)));
            return portInRange && commandMatches;
        }).map(entry => entry[0]);
        if (appropriateHandles.length === 0) {
            return [];
        }
        return this._proxy.$providePortAttributes(appropriateHandles, ports, pid, commandLine, token);
    }
    async $openTunnel(tunnelOptions, source) {
        const tunnel = await this.remoteExplorerService.forward({
            remote: tunnelOptions.remoteAddress,
            local: tunnelOptions.localAddressPort,
            name: tunnelOptions.label,
            source: {
                source: TunnelSource.Extension,
                description: source
            },
            elevateIfNeeded: false
        });
        if (!tunnel || (typeof tunnel === 'string')) {
            return undefined;
        }
        if (!this.elevateionRetry
            && (tunnelOptions.localAddressPort !== undefined)
            && (tunnel.tunnelLocalPort !== undefined)
            && this.tunnelService.isPortPrivileged(tunnelOptions.localAddressPort)
            && (tunnel.tunnelLocalPort !== tunnelOptions.localAddressPort)
            && this.tunnelService.canElevate) {
            this.elevationPrompt(tunnelOptions, tunnel, source);
        }
        return TunnelDtoConverter.fromServiceTunnel(tunnel);
    }
    async elevationPrompt(tunnelOptions, tunnel, source) {
        return this.notificationService.prompt(Severity.Info, nls.localize('remote.tunnel.openTunnel', "The extension {0} has forwarded port {1}. You'll need to run as superuser to use port {2} locally.", source, tunnelOptions.remoteAddress.port, tunnelOptions.localAddressPort), [{
                label: nls.localize('remote.tunnelsView.elevationButton', "Use Port {0} as Sudo...", tunnel.tunnelRemotePort),
                run: async () => {
                    this.elevateionRetry = true;
                    await this.remoteExplorerService.close({ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort }, TunnelCloseReason.Other);
                    await this.remoteExplorerService.forward({
                        remote: tunnelOptions.remoteAddress,
                        local: tunnelOptions.localAddressPort,
                        name: tunnelOptions.label,
                        source: {
                            source: TunnelSource.Extension,
                            description: source
                        },
                        elevateIfNeeded: true
                    });
                    this.elevateionRetry = false;
                }
            }]);
    }
    async $closeTunnel(remote) {
        return this.remoteExplorerService.close(remote, TunnelCloseReason.Other);
    }
    async $getTunnels() {
        return (await this.tunnelService.tunnels).map(tunnel => {
            return {
                remoteAddress: { port: tunnel.tunnelRemotePort, host: tunnel.tunnelRemoteHost },
                localAddress: tunnel.localAddress,
                privacy: tunnel.privacy,
                protocol: tunnel.protocol
            };
        });
    }
    async $onFoundNewCandidates(candidates) {
        this.remoteExplorerService.onFoundNewCandidates(candidates);
    }
    async $setTunnelProvider(features, isResolver) {
        const tunnelProvider = {
            forwardPort: (tunnelOptions, tunnelCreationOptions) => {
                const forward = this._proxy.$forwardPort(tunnelOptions, tunnelCreationOptions);
                return forward.then(tunnelOrError => {
                    if (!tunnelOrError) {
                        return undefined;
                    }
                    else if (typeof tunnelOrError === 'string') {
                        return tunnelOrError;
                    }
                    const tunnel = tunnelOrError;
                    this.logService.trace(`ForwardedPorts: (MainThreadTunnelService) New tunnel established by tunnel provider: ${tunnel?.remoteAddress.host}:${tunnel?.remoteAddress.port}`);
                    return {
                        tunnelRemotePort: tunnel.remoteAddress.port,
                        tunnelRemoteHost: tunnel.remoteAddress.host,
                        localAddress: typeof tunnel.localAddress === 'string' ? tunnel.localAddress : makeAddress(tunnel.localAddress.host, tunnel.localAddress.port),
                        tunnelLocalPort: typeof tunnel.localAddress !== 'string' ? tunnel.localAddress.port : undefined,
                        public: tunnel.public,
                        privacy: tunnel.privacy,
                        protocol: tunnel.protocol ?? TunnelProtocol.Http,
                        dispose: async (silent) => {
                            this.logService.trace(`ForwardedPorts: (MainThreadTunnelService) Closing tunnel from tunnel provider: ${tunnel?.remoteAddress.host}:${tunnel?.remoteAddress.port}`);
                            return this._proxy.$closeTunnel({ host: tunnel.remoteAddress.host, port: tunnel.remoteAddress.port }, silent);
                        }
                    };
                });
            }
        };
        if (features) {
            this.tunnelService.setTunnelFeatures(features);
        }
        this.tunnelService.setTunnelProvider(tunnelProvider);
        // At this point we clearly want the ports view/features since we have a tunnel factory
        if (isResolver) {
            this.contextKeyService.createKey(forwardedPortsFeaturesEnabled.key, true);
        }
    }
    async $setCandidateFilter() {
        this.remoteExplorerService.setCandidateFilter((candidates) => {
            return this._proxy.$applyCandidateFilter(candidates);
        });
    }
    async $setCandidatePortSource(source) {
        // Must wait for the remote environment before trying to set settings there.
        this.remoteAgentService.getEnvironment().then(() => {
            switch (source) {
                case CandidatePortSource.None: {
                    Registry.as(ConfigurationExtensions.Configuration)
                        .registerDefaultConfigurations([{ overrides: { 'remote.autoForwardPorts': false } }]);
                    break;
                }
                case CandidatePortSource.Output: {
                    Registry.as(ConfigurationExtensions.Configuration)
                        .registerDefaultConfigurations([{ overrides: { 'remote.autoForwardPortsSource': PORT_AUTO_SOURCE_SETTING_OUTPUT } }]);
                    break;
                }
                case CandidatePortSource.Hybrid: {
                    Registry.as(ConfigurationExtensions.Configuration)
                        .registerDefaultConfigurations([{ overrides: { 'remote.autoForwardPortsSource': PORT_AUTO_SOURCE_SETTING_HYBRID } }]);
                    break;
                }
                default: // Do nothing, the defaults for these settings should be used.
            }
        }).catch(() => {
            // The remote failed to get setup. Errors from that area will already be surfaced to the user.
        });
    }
};
MainThreadTunnelService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTunnelService),
    __param(1, IRemoteExplorerService),
    __param(2, ITunnelService),
    __param(3, INotificationService),
    __param(4, IConfigurationService),
    __param(5, ILogService),
    __param(6, IRemoteAgentService),
    __param(7, IContextKeyService)
], MainThreadTunnelService);
export { MainThreadTunnelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFR1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRUdW5uZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFnQyxXQUFXLEVBQUUsY0FBYyxFQUE2QixtQkFBbUIsRUFBcUMsTUFBTSwrQkFBK0IsQ0FBQztBQUM3TCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLHNCQUFzQixFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixFQUFFLCtCQUErQixFQUFFLCtCQUErQixFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZPLE9BQU8sRUFBbUIsY0FBYyxFQUE4SCxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4TyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUEwQixVQUFVLElBQUksdUJB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