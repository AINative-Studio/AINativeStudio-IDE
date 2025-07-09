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
import { Client as MessagePortClient } from '../../../../base/parts/ipc/common/ipc.mp.js';
import { getDelayedChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { SharedProcessChannelConnection, SharedProcessRawConnection } from '../../../../platform/sharedProcess/common/sharedProcess.js';
import { mark } from '../../../../base/common/performance.js';
import { Barrier, timeout } from '../../../../base/common/async.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-sandbox/ipc.mp.js';
let SharedProcessService = class SharedProcessService extends Disposable {
    constructor(windowId, logService) {
        super();
        this.windowId = windowId;
        this.logService = logService;
        this.restoredBarrier = new Barrier();
        this.withSharedProcessConnection = this.connect();
    }
    async connect() {
        this.logService.trace('Renderer->SharedProcess#connect');
        // Our performance tests show that a connection to the shared
        // process can have significant overhead to the startup time
        // of the window because the shared process could be created
        // as a result. As such, make sure we await the `Restored`
        // phase before making a connection attempt, but also add a
        // timeout to be safe against possible deadlocks.
        await Promise.race([this.restoredBarrier.wait(), timeout(2000)]);
        // Acquire a message port connected to the shared process
        mark('code/willConnectSharedProcess');
        this.logService.trace('Renderer->SharedProcess#connect: before acquirePort');
        const port = await acquirePort(SharedProcessChannelConnection.request, SharedProcessChannelConnection.response);
        mark('code/didConnectSharedProcess');
        this.logService.trace('Renderer->SharedProcess#connect: connection established');
        return this._register(new MessagePortClient(port, `window:${this.windowId}`));
    }
    notifyRestored() {
        if (!this.restoredBarrier.isOpen()) {
            this.restoredBarrier.open();
        }
    }
    getChannel(channelName) {
        return getDelayedChannel(this.withSharedProcessConnection.then(connection => connection.getChannel(channelName)));
    }
    registerChannel(channelName, channel) {
        this.withSharedProcessConnection.then(connection => connection.registerChannel(channelName, channel));
    }
    async createRawConnection() {
        // Await initialization of the shared process
        await this.withSharedProcessConnection;
        // Create a new port to the shared process
        this.logService.trace('Renderer->SharedProcess#createRawConnection: before acquirePort');
        const port = await acquirePort(SharedProcessRawConnection.request, SharedProcessRawConnection.response);
        this.logService.trace('Renderer->SharedProcess#createRawConnection: connection established');
        return port;
    }
};
SharedProcessService = __decorate([
    __param(1, ILogService)
], SharedProcessService);
export { SharedProcessService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NoYXJlZFByb2Nlc3MvZWxlY3Ryb24tc2FuZGJveC9zaGFyZWRQcm9jZXNzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxJQUFJLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDMUYsT0FBTyxFQUE0QixpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLDBCQUEwQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDeEksT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRTdFLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTtJQVFuRCxZQUNVLFFBQWdCLEVBQ1osVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUM7UUFIQyxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ0ssZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUpyQyxvQkFBZSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFRaEQsSUFBSSxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNuRCxDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU87UUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUV6RCw2REFBNkQ7UUFDN0QsNERBQTREO1FBQzVELDREQUE0RDtRQUM1RCwwREFBMEQ7UUFDMUQsMkRBQTJEO1FBQzNELGlEQUFpRDtRQUVqRCxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakUseURBQXlEO1FBQ3pELElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7UUFDN0UsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsOEJBQThCLENBQUMsT0FBTyxFQUFFLDhCQUE4QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hILElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7UUFFakYsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxFQUFFLFVBQVUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRUQsY0FBYztRQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM3QixDQUFDO0lBQ0YsQ0FBQztJQUVELFVBQVUsQ0FBQyxXQUFtQjtRQUM3QixPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuSCxDQUFDO0lBRUQsZUFBZSxDQUFDLFdBQW1CLEVBQUUsT0FBK0I7UUFDbkUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDdkcsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUI7UUFFeEIsNkNBQTZDO1FBQzdDLE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUFDO1FBRXZDLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxpRUFBaUUsQ0FBQyxDQUFDO1FBQ3pGLE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sRUFBRSwwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4RyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO1FBRTdGLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNELENBQUE7QUFqRVksb0JBQW9CO0lBVTlCLFdBQUEsV0FBVyxDQUFBO0dBVkQsb0JBQW9CLENBaUVoQyJ9