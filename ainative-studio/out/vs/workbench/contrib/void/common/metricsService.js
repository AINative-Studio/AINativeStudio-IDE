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
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { localize2 } from '../../../../nls.js';
import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
export const IMetricsService = createDecorator('metricsService');
// implemented by calling channel
let MetricsService = class MetricsService {
    constructor(mainProcessService // (only usable on client side)
    ) {
        // creates an IPC proxy to use metricsMainService.ts
        this.metricsService = ProxyChannel.toService(mainProcessService.getChannel('void-channel-metrics'));
    }
    // call capture on the channel
    capture(...params) {
        this.metricsService.capture(...params);
    }
    setOptOut(...params) {
        this.metricsService.setOptOut(...params);
    }
    // anything transmitted over a channel must be async even if it looks like it doesn't have to be
    async getDebuggingProperties() {
        return this.metricsService.getDebuggingProperties();
    }
};
MetricsService = __decorate([
    __param(0, IMainProcessService)
], MetricsService);
export { MetricsService };
registerSingleton(IMetricsService, MetricsService, 0 /* InstantiationType.Eager */);
// debugging action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'voidDebugInfo',
            f1: true,
            title: localize2('voidMetricsDebug', 'Void: Log Debug Info'),
        });
    }
    async run(accessor) {
        const metricsService = accessor.get(IMetricsService);
        const notifService = accessor.get(INotificationService);
        const debugProperties = await metricsService.getDebuggingProperties();
        console.log('Metrics:', debugProperties);
        notifService.info(`Void Debug info:\n${JSON.stringify(debugProperties, null, 2)}`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vbWV0cmljc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBU2hHLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGdCQUFnQixDQUFDLENBQUM7QUFHbEYsaUNBQWlDO0FBQzFCLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFLMUIsWUFDc0Isa0JBQXVDLENBQUMsK0JBQStCOztRQUU1RixvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFrQixrQkFBa0IsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO0lBQ3RILENBQUM7SUFFRCw4QkFBOEI7SUFDOUIsT0FBTyxDQUFDLEdBQUcsTUFBOEM7UUFDeEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsU0FBUyxDQUFDLEdBQUcsTUFBZ0Q7UUFDNUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBR0QsZ0dBQWdHO0lBQ2hHLEtBQUssQ0FBQyxzQkFBc0I7UUFDM0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLENBQUE7SUFDcEQsQ0FBQztDQUNELENBQUE7QUExQlksY0FBYztJQU14QixXQUFBLG1CQUFtQixDQUFBO0dBTlQsY0FBYyxDQTBCMUI7O0FBRUQsaUJBQWlCLENBQUMsZUFBZSxFQUFFLGNBQWMsa0NBQTBCLENBQUM7QUFHNUUsbUJBQW1CO0FBQ25CLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxlQUFlO1lBQ25CLEVBQUUsRUFBRSxJQUFJO1lBQ1IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxzQkFBc0IsQ0FBQztTQUM1RCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUV2RCxNQUFNLGVBQWUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQ3JFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3hDLFlBQVksQ0FBQyxJQUFJLENBQUMscUJBQXFCLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDbkYsQ0FBQztDQUNELENBQUMsQ0FBQSJ9