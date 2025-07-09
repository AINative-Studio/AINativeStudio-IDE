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
import { ProxyChannel } from '../../../base/parts/ipc/common/ipc.js';
import { SyncDescriptor } from '../../instantiation/common/descriptors.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { IMainProcessService } from '../common/mainProcessService.js';
class RemoteServiceStub {
    constructor(channelName, options, remote, instantiationService) {
        const channel = remote.getChannel(channelName);
        if (isRemoteServiceWithChannelClientOptions(options)) {
            return instantiationService.createInstance(new SyncDescriptor(options.channelClientCtor, [channel]));
        }
        return ProxyChannel.toService(channel, options?.proxyOptions);
    }
}
function isRemoteServiceWithChannelClientOptions(obj) {
    const candidate = obj;
    return !!candidate?.channelClientCtor;
}
//#region Main Process
let MainProcessRemoteServiceStub = class MainProcessRemoteServiceStub extends RemoteServiceStub {
    constructor(channelName, options, ipcService, instantiationService) {
        super(channelName, options, ipcService, instantiationService);
    }
};
MainProcessRemoteServiceStub = __decorate([
    __param(2, IMainProcessService),
    __param(3, IInstantiationService)
], MainProcessRemoteServiceStub);
export function registerMainProcessRemoteService(id, channelName, options) {
    registerSingleton(id, new SyncDescriptor(MainProcessRemoteServiceStub, [channelName, options], true));
}
//#endregion
//#region Shared Process
export const ISharedProcessService = createDecorator('sharedProcessService');
let SharedProcessRemoteServiceStub = class SharedProcessRemoteServiceStub extends RemoteServiceStub {
    constructor(channelName, options, ipcService, instantiationService) {
        super(channelName, options, ipcService, instantiationService);
    }
};
SharedProcessRemoteServiceStub = __decorate([
    __param(2, ISharedProcessService),
    __param(3, IInstantiationService)
], SharedProcessRemoteServiceStub);
export function registerSharedProcessRemoteService(id, channelName, options) {
    registerSingleton(id, new SyncDescriptor(SharedProcessRemoteServiceStub, [channelName, options], true));
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaXBjL2VsZWN0cm9uLXNhbmRib3gvc2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFZLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFxQixNQUFNLDZDQUE2QyxDQUFDO0FBQ3hILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBTXRFLE1BQWUsaUJBQWlCO0lBQy9CLFlBQ0MsV0FBbUIsRUFDbkIsT0FBK0YsRUFDL0YsTUFBYyxFQUNkLG9CQUEyQztRQUUzQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRS9DLElBQUksdUNBQXVDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN0RCxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEcsQ0FBQztRQUVELE9BQU8sWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQy9ELENBQUM7Q0FDRDtBQVVELFNBQVMsdUNBQXVDLENBQUksR0FBWTtJQUMvRCxNQUFNLFNBQVMsR0FBRyxHQUE0RCxDQUFDO0lBRS9FLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQztBQUN2QyxDQUFDO0FBRUQsc0JBQXNCO0FBRXRCLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQStDLFNBQVEsaUJBQW9CO0lBQ2hGLFlBQVksV0FBbUIsRUFBRSxPQUErRixFQUF1QixVQUErQixFQUF5QixvQkFBMkM7UUFDelAsS0FBSyxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDL0QsQ0FBQztDQUNELENBQUE7QUFKSyw0QkFBNEI7SUFDa0csV0FBQSxtQkFBbUIsQ0FBQTtJQUFtQyxXQUFBLHFCQUFxQixDQUFBO0dBRHpNLDRCQUE0QixDQUlqQztBQUVELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FBSSxFQUF3QixFQUFFLFdBQW1CLEVBQUUsT0FBb0Y7SUFDdEwsaUJBQWlCLENBQUMsRUFBRSxFQUFFLElBQUksY0FBYyxDQUFDLDRCQUE0QixFQUFFLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdkcsQ0FBQztBQUVELFlBQVk7QUFFWix3QkFBd0I7QUFFeEIsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBb0JwRyxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUFpRCxTQUFRLGlCQUFvQjtJQUNsRixZQUFZLFdBQW1CLEVBQUUsT0FBK0YsRUFBeUIsVUFBaUMsRUFBeUIsb0JBQTJDO1FBQzdQLEtBQUssQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQy9ELENBQUM7Q0FDRCxDQUFBO0FBSkssOEJBQThCO0lBQ2dHLFdBQUEscUJBQXFCLENBQUE7SUFBcUMsV0FBQSxxQkFBcUIsQ0FBQTtHQUQ3TSw4QkFBOEIsQ0FJbkM7QUFFRCxNQUFNLFVBQVUsa0NBQWtDLENBQUksRUFBd0IsRUFBRSxXQUFtQixFQUFFLE9BQW9GO0lBQ3hMLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxJQUFJLGNBQWMsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3pHLENBQUM7QUFFRCxZQUFZIn0=