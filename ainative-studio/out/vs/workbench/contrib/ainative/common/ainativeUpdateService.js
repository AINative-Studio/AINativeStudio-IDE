/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
export const IAINativeUpdateService = createDecorator('VoidUpdateService');
// implemented by calling channel
let VoidUpdateService = class VoidUpdateService {
    constructor(mainProcessService) {
        // anything transmitted over a channel must be async even if it looks like it doesn't have to be
        this.check = async (explicit) => {
            const res = await this.ainativeUpdateService.check(explicit);
            return res;
        };
        // creates an IPC proxy to use metricsMainService.ts
        this.ainativeUpdateService = ProxyChannel.toService(mainProcessService.getChannel('void-channel-update'));
    }
};
VoidUpdateService = __decorate([
    __param(0, IMainProcessService)
], VoidUpdateService);
export { VoidUpdateService };
registerSingleton(IAINativeUpdateService, VoidUpdateService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVVcGRhdGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vYWluYXRpdmVVcGRhdGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBVzVGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGVBQWUsQ0FBeUIsbUJBQW1CLENBQUMsQ0FBQztBQUduRyxpQ0FBaUM7QUFDMUIsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7SUFLN0IsWUFDc0Isa0JBQXVDO1FBTzdELGdHQUFnRztRQUNoRyxVQUFLLEdBQW9DLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUMzRCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDNUQsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDLENBQUE7UUFUQSxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFlBQVksQ0FBQyxTQUFTLENBQXlCLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFDbkksQ0FBQztDQVFELENBQUE7QUFsQlksaUJBQWlCO0lBTTNCLFdBQUEsbUJBQW1CLENBQUE7R0FOVCxpQkFBaUIsQ0FrQjdCOztBQUVELGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLGlCQUFpQixrQ0FBMEIsQ0FBQyJ9