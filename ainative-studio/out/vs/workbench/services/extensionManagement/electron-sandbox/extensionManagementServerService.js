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
import { Schemas } from '../../../../base/common/network.js';
import { IExtensionManagementServerService } from '../common/extensionManagement.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { NativeRemoteExtensionManagementService } from './remoteExtensionManagementService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { NativeExtensionManagementService } from './nativeExtensionManagementService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let ExtensionManagementServerService = class ExtensionManagementServerService extends Disposable {
    constructor(sharedProcessService, remoteAgentService, labelService, instantiationService) {
        super();
        this.remoteExtensionManagementServer = null;
        this.webExtensionManagementServer = null;
        const localExtensionManagementService = this._register(instantiationService.createInstance(NativeExtensionManagementService, sharedProcessService.getChannel('extensions')));
        this.localExtensionManagementServer = { extensionManagementService: localExtensionManagementService, id: 'local', label: localize('local', "Local") };
        const remoteAgentConnection = remoteAgentService.getConnection();
        if (remoteAgentConnection) {
            const extensionManagementService = instantiationService.createInstance(NativeRemoteExtensionManagementService, remoteAgentConnection.getChannel('extensions'), this.localExtensionManagementServer);
            this.remoteExtensionManagementServer = {
                id: 'remote',
                extensionManagementService,
                get label() { return labelService.getHostLabel(Schemas.vscodeRemote, remoteAgentConnection.remoteAuthority) || localize('remote', "Remote"); },
            };
        }
    }
    getExtensionManagementServer(extension) {
        if (extension.location.scheme === Schemas.file) {
            return this.localExtensionManagementServer;
        }
        if (this.remoteExtensionManagementServer && extension.location.scheme === Schemas.vscodeRemote) {
            return this.remoteExtensionManagementServer;
        }
        throw new Error(`Invalid Extension ${extension.location}`);
    }
    getExtensionInstallLocation(extension) {
        const server = this.getExtensionManagementServer(extension);
        return server === this.remoteExtensionManagementServer ? 2 /* ExtensionInstallLocation.Remote */ : 1 /* ExtensionInstallLocation.Local */;
    }
};
ExtensionManagementServerService = __decorate([
    __param(0, ISharedProcessService),
    __param(1, IRemoteAgentService),
    __param(2, ILabelService),
    __param(3, IInstantiationService)
], ExtensionManagementServerService);
export { ExtensionManagementServerService };
registerSingleton(IExtensionManagementServerService, ExtensionManagementServerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25NYW5hZ2VtZW50U2VydmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBd0QsaUNBQWlDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzSSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM5RixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUzRCxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLFVBQVU7SUFRL0QsWUFDd0Isb0JBQTJDLEVBQzdDLGtCQUF1QyxFQUM3QyxZQUEyQixFQUNuQixvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUM7UUFUQSxvQ0FBK0IsR0FBc0MsSUFBSSxDQUFDO1FBQzFFLGlDQUE0QixHQUFzQyxJQUFJLENBQUM7UUFTL0UsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQ0FBZ0MsRUFBRSxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdLLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxFQUFFLDBCQUEwQixFQUFFLCtCQUErQixFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUN0SixNQUFNLHFCQUFxQixHQUFHLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ2pFLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMzQixNQUFNLDBCQUEwQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQ0FBc0MsRUFBRSxxQkFBcUIsQ0FBQyxVQUFVLENBQVcsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7WUFDOU0sSUFBSSxDQUFDLCtCQUErQixHQUFHO2dCQUN0QyxFQUFFLEVBQUUsUUFBUTtnQkFDWiwwQkFBMEI7Z0JBQzFCLElBQUksS0FBSyxLQUFLLE9BQU8sWUFBWSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzlJLENBQUM7UUFDSCxDQUFDO0lBRUYsQ0FBQztJQUVELDRCQUE0QixDQUFDLFNBQXFCO1FBQ2pELElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hELE9BQU8sSUFBSSxDQUFDLDhCQUE4QixDQUFDO1FBQzVDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQywrQkFBK0IsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDaEcsT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUM7UUFDN0MsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxTQUFxQjtRQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUQsT0FBTyxNQUFNLEtBQUssSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMseUNBQWlDLENBQUMsdUNBQStCLENBQUM7SUFDM0gsQ0FBQztDQUNELENBQUE7QUEzQ1ksZ0NBQWdDO0lBUzFDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEscUJBQXFCLENBQUE7R0FaWCxnQ0FBZ0MsQ0EyQzVDOztBQUVELGlCQUFpQixDQUFDLGlDQUFpQyxFQUFFLGdDQUFnQyxvQ0FBNEIsQ0FBQyJ9