/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9tZXRyaWNzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsZUFBZSxFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFTaEcsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsZ0JBQWdCLENBQUMsQ0FBQztBQUdsRixpQ0FBaUM7QUFDMUIsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBYztJQUsxQixZQUNzQixrQkFBdUMsQ0FBQywrQkFBK0I7O1FBRTVGLG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsY0FBYyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQWtCLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7SUFDdEgsQ0FBQztJQUVELDhCQUE4QjtJQUM5QixPQUFPLENBQUMsR0FBRyxNQUE4QztRQUN4RCxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxTQUFTLENBQUMsR0FBRyxNQUFnRDtRQUM1RCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFHRCxnR0FBZ0c7SUFDaEcsS0FBSyxDQUFDLHNCQUFzQjtRQUMzQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtJQUNwRCxDQUFDO0NBQ0QsQ0FBQTtBQTFCWSxjQUFjO0lBTXhCLFdBQUEsbUJBQW1CLENBQUE7R0FOVCxjQUFjLENBMEIxQjs7QUFFRCxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsY0FBYyxrQ0FBMEIsQ0FBQztBQUc1RSxtQkFBbUI7QUFDbkIsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGVBQWU7WUFDbkIsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLHNCQUFzQixDQUFDO1NBQzVELENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDcEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRXZELE1BQU0sZUFBZSxHQUFHLE1BQU0sY0FBYyxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDeEMsWUFBWSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNuRixDQUFDO0NBQ0QsQ0FBQyxDQUFBIn0=