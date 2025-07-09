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
import { IUserDataAutoSyncService, UserDataSyncError } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { Event } from '../../../../base/common/event.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
let UserDataAutoSyncService = class UserDataAutoSyncService {
    get onError() { return Event.map(this.channel.listen('onError'), e => UserDataSyncError.toUserDataSyncError(e)); }
    constructor(sharedProcessService) {
        this.channel = sharedProcessService.getChannel('userDataAutoSync');
    }
    triggerSync(sources, options) {
        return this.channel.call('triggerSync', [sources, options]);
    }
    turnOn() {
        return this.channel.call('turnOn');
    }
    turnOff(everywhere) {
        return this.channel.call('turnOff', [everywhere]);
    }
};
UserDataAutoSyncService = __decorate([
    __param(0, ISharedProcessService)
], UserDataAutoSyncService);
registerSingleton(IUserDataAutoSyncService, UserDataAutoSyncService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhU3luYy9lbGVjdHJvbi1zYW5kYm94L3VzZXJEYXRhQXV0b1N5bmNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFL0csSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFLNUIsSUFBSSxPQUFPLEtBQStCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBUSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5KLFlBQ3dCLG9CQUEyQztRQUVsRSxJQUFJLENBQUMsT0FBTyxHQUFHLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCxXQUFXLENBQUMsT0FBaUIsRUFBRSxPQUFxQjtRQUNuRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsT0FBTyxDQUFDLFVBQW1CO1FBQzFCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBRUQsQ0FBQTtBQXpCSyx1QkFBdUI7SUFRMUIsV0FBQSxxQkFBcUIsQ0FBQTtHQVJsQix1QkFBdUIsQ0F5QjVCO0FBRUQsaUJBQWlCLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLG9DQUE0QixDQUFDIn0=