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
import * as nls from '../../../../nls.js';
import { ITunnelService, TunnelProtocol, TunnelPrivacyId } from '../../../../platform/tunnel/common/tunnel.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { IRemoteExplorerService } from '../../../services/remote/common/remoteExplorerService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { forwardedPortsFeaturesEnabled } from '../../../services/remote/common/tunnelModel.js';
let TunnelFactoryContribution = class TunnelFactoryContribution extends Disposable {
    static { this.ID = 'workbench.contrib.tunnelFactory'; }
    constructor(tunnelService, environmentService, openerService, remoteExplorerService, logService, contextKeyService) {
        super();
        this.openerService = openerService;
        const tunnelFactory = environmentService.options?.tunnelProvider?.tunnelFactory;
        if (tunnelFactory) {
            // At this point we clearly want the ports view/features since we have a tunnel factory
            contextKeyService.createKey(forwardedPortsFeaturesEnabled.key, true);
            let privacyOptions = environmentService.options?.tunnelProvider?.features?.privacyOptions ?? [];
            if (environmentService.options?.tunnelProvider?.features?.public
                && (privacyOptions.length === 0)) {
                privacyOptions = [
                    {
                        id: 'private',
                        label: nls.localize('tunnelPrivacy.private', "Private"),
                        themeIcon: 'lock'
                    },
                    {
                        id: 'public',
                        label: nls.localize('tunnelPrivacy.public', "Public"),
                        themeIcon: 'eye'
                    }
                ];
            }
            this._register(tunnelService.setTunnelProvider({
                forwardPort: async (tunnelOptions, tunnelCreationOptions) => {
                    let tunnelPromise;
                    try {
                        tunnelPromise = tunnelFactory(tunnelOptions, tunnelCreationOptions);
                    }
                    catch (e) {
                        logService.trace('tunnelFactory: tunnel provider error');
                    }
                    if (!tunnelPromise) {
                        return undefined;
                    }
                    let tunnel;
                    try {
                        tunnel = await tunnelPromise;
                    }
                    catch (e) {
                        logService.trace('tunnelFactory: tunnel provider promise error');
                        if (e instanceof Error) {
                            return e.message;
                        }
                        return undefined;
                    }
                    const localAddress = tunnel.localAddress.startsWith('http') ? tunnel.localAddress : `http://${tunnel.localAddress}`;
                    const remoteTunnel = {
                        tunnelRemotePort: tunnel.remoteAddress.port,
                        tunnelRemoteHost: tunnel.remoteAddress.host,
                        // The tunnel factory may give us an inaccessible local address.
                        // To make sure this doesn't happen, resolve the uri immediately.
                        localAddress: await this.resolveExternalUri(localAddress),
                        privacy: tunnel.privacy ?? (tunnel.public ? TunnelPrivacyId.Public : TunnelPrivacyId.Private),
                        protocol: tunnel.protocol ?? TunnelProtocol.Http,
                        dispose: async () => { await tunnel.dispose(); }
                    };
                    return remoteTunnel;
                }
            }));
            const tunnelInformation = environmentService.options?.tunnelProvider?.features ?
                {
                    features: {
                        elevation: !!environmentService.options?.tunnelProvider?.features?.elevation,
                        public: !!environmentService.options?.tunnelProvider?.features?.public,
                        privacyOptions,
                        protocol: environmentService.options?.tunnelProvider?.features?.protocol === undefined ? true : !!environmentService.options?.tunnelProvider?.features?.protocol
                    }
                } : undefined;
            remoteExplorerService.setTunnelInformation(tunnelInformation);
        }
    }
    async resolveExternalUri(uri) {
        try {
            return (await this.openerService.resolveExternalUri(URI.parse(uri))).resolved.toString();
        }
        catch {
            return uri;
        }
    }
};
TunnelFactoryContribution = __decorate([
    __param(0, ITunnelService),
    __param(1, IBrowserWorkbenchEnvironmentService),
    __param(2, IOpenerService),
    __param(3, IRemoteExplorerService),
    __param(4, ILogService),
    __param(5, IContextKeyService)
], TunnelFactoryContribution);
export { TunnelFactoryContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci90dW5uZWxGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGNBQWMsRUFBK0QsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzVLLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV4RixJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7YUFFeEMsT0FBRSxHQUFHLGlDQUFpQyxBQUFwQyxDQUFxQztJQUV2RCxZQUNpQixhQUE2QixFQUNSLGtCQUF1RCxFQUNwRSxhQUE2QixFQUM3QixxQkFBNkMsRUFDeEQsVUFBdUIsRUFDaEIsaUJBQXFDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBTGdCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQU1y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