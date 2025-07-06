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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2lwYy9lbGVjdHJvbi1zYW5kYm94L3NlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBWSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBcUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUN4SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQU10RSxNQUFlLGlCQUFpQjtJQUMvQixZQUNDLFdBQW1CLEVBQ25CLE9BQStGLEVBQy9GLE1BQWMsRUFDZCxvQkFBMkM7UUFFM0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUUvQyxJQUFJLHVDQUF1QyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEQsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RHLENBQUM7UUFFRCxPQUFPLFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztJQUMvRCxDQUFDO0NBQ0Q7QUFVRCxTQUFTLHVDQUF1QyxDQUFJLEdBQVk7SUFDL0QsTUFBTSxTQUFTLEdBQUcsR0FBNEQsQ0FBQztJQUUvRSxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUM7QUFDdkMsQ0FBQztBQUVELHNCQUFzQjtBQUV0QixJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUErQyxTQUFRLGlCQUFvQjtJQUNoRixZQUFZLFdBQW1CLEVBQUUsT0FBK0YsRUFBdUIsVUFBK0IsRUFBeUIsb0JBQTJDO1FBQ3pQLEtBQUssQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQy9ELENBQUM7Q0FDRCxDQUFBO0FBSkssNEJBQTRCO0lBQ2tHLFdBQUEsbUJBQW1CLENBQUE7SUFBbUMsV0FBQSxxQkFBcUIsQ0FBQTtHQUR6TSw0QkFBNEIsQ0FJakM7QUFFRCxNQUFNLFVBQVUsZ0NBQWdDLENBQUksRUFBd0IsRUFBRSxXQUFtQixFQUFFLE9BQW9GO0lBQ3RMLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxJQUFJLGNBQWMsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3ZHLENBQUM7QUFFRCxZQUFZO0FBRVosd0JBQXdCO0FBRXhCLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNCLENBQUMsQ0FBQztBQW9CcEcsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBaUQsU0FBUSxpQkFBb0I7SUFDbEYsWUFBWSxXQUFtQixFQUFFLE9BQStGLEVBQXlCLFVBQWlDLEVBQXlCLG9CQUEyQztRQUM3UCxLQUFLLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUMvRCxDQUFDO0NBQ0QsQ0FBQTtBQUpLLDhCQUE4QjtJQUNnRyxXQUFBLHFCQUFxQixDQUFBO0lBQXFDLFdBQUEscUJBQXFCLENBQUE7R0FEN00sOEJBQThCLENBSW5DO0FBRUQsTUFBTSxVQUFVLGtDQUFrQyxDQUFJLEVBQXdCLEVBQUUsV0FBbUIsRUFBRSxPQUFvRjtJQUN4TCxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxjQUFjLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN6RyxDQUFDO0FBRUQsWUFBWSJ9