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
import { localize } from '../../../../nls.js';
import { IExtensionManagementServerService } from './extensionManagement.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { Schemas } from '../../../../base/common/network.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WebExtensionManagementService } from './webExtensionManagementService.js';
import { RemoteExtensionManagementService } from './remoteExtensionManagementService.js';
let ExtensionManagementServerService = class ExtensionManagementServerService {
    constructor(remoteAgentService, labelService, instantiationService) {
        this.localExtensionManagementServer = null;
        this.remoteExtensionManagementServer = null;
        this.webExtensionManagementServer = null;
        const remoteAgentConnection = remoteAgentService.getConnection();
        if (remoteAgentConnection) {
            const extensionManagementService = instantiationService.createInstance(RemoteExtensionManagementService, remoteAgentConnection.getChannel('extensions'));
            this.remoteExtensionManagementServer = {
                id: 'remote',
                extensionManagementService,
                get label() { return labelService.getHostLabel(Schemas.vscodeRemote, remoteAgentConnection.remoteAuthority) || localize('remote', "Remote"); },
            };
        }
        if (isWeb) {
            const extensionManagementService = instantiationService.createInstance(WebExtensionManagementService);
            this.webExtensionManagementServer = {
                id: 'web',
                extensionManagementService,
                label: localize('browser', "Browser"),
            };
        }
    }
    getExtensionManagementServer(extension) {
        if (extension.location.scheme === Schemas.vscodeRemote) {
            return this.remoteExtensionManagementServer;
        }
        if (this.webExtensionManagementServer) {
            return this.webExtensionManagementServer;
        }
        throw new Error(`Invalid Extension ${extension.location}`);
    }
    getExtensionInstallLocation(extension) {
        const server = this.getExtensionManagementServer(extension);
        return server === this.remoteExtensionManagementServer ? 2 /* ExtensionInstallLocation.Remote */ : 3 /* ExtensionInstallLocation.Web */;
    }
};
ExtensionManagementServerService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ILabelService),
    __param(2, IInstantiationService)
], ExtensionManagementServerService);
export { ExtensionManagementServerService };
registerSingleton(IExtensionManagementServerService, ExtensionManagementServerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnRTZXJ2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXdELGlDQUFpQyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbkksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWxGLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWdDO0lBUTVDLFlBQ3NCLGtCQUF1QyxFQUM3QyxZQUEyQixFQUNuQixvQkFBMkM7UUFQMUQsbUNBQThCLEdBQXNDLElBQUksQ0FBQztRQUN6RSxvQ0FBK0IsR0FBc0MsSUFBSSxDQUFDO1FBQzFFLGlDQUE0QixHQUFzQyxJQUFJLENBQUM7UUFPL0UsTUFBTSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNqRSxJQUFJLHFCQUFxQixFQUFFLENBQUM7WUFDM0IsTUFBTSwwQkFBMEIsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0NBQWdDLEVBQUUscUJBQXFCLENBQUMsVUFBVSxDQUFXLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDbkssSUFBSSxDQUFDLCtCQUErQixHQUFHO2dCQUN0QyxFQUFFLEVBQUUsUUFBUTtnQkFDWiwwQkFBMEI7Z0JBQzFCLElBQUksS0FBSyxLQUFLLE9BQU8sWUFBWSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzlJLENBQUM7UUFDSCxDQUFDO1FBQ0QsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sMEJBQTBCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDdEcsSUFBSSxDQUFDLDRCQUE0QixHQUFHO2dCQUNuQyxFQUFFLEVBQUUsS0FBSztnQkFDVCwwQkFBMEI7Z0JBQzFCLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQzthQUNyQyxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxTQUFxQjtRQUNqRCxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4RCxPQUFPLElBQUksQ0FBQywrQkFBZ0MsQ0FBQztRQUM5QyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUN2QyxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQztRQUMxQyxDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELDJCQUEyQixDQUFDLFNBQXFCO1FBQ2hELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RCxPQUFPLE1BQU0sS0FBSyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQyx5Q0FBaUMsQ0FBQyxxQ0FBNkIsQ0FBQztJQUN6SCxDQUFDO0NBQ0QsQ0FBQTtBQTlDWSxnQ0FBZ0M7SUFTMUMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEscUJBQXFCLENBQUE7R0FYWCxnQ0FBZ0MsQ0E4QzVDOztBQUVELGlCQUFpQixDQUFDLGlDQUFpQyxFQUFFLGdDQUFnQyxvQ0FBNEIsQ0FBQyJ9