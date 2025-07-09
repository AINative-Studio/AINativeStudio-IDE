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
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { Client as MessagePortClient } from '../../../../base/parts/ipc/common/ipc.mp.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-sandbox/ipc.mp.js';
import { ipcUtilityProcessWorkerChannelName } from '../../../../platform/utilityProcess/common/utilityProcessWorkerService.js';
import { Barrier, timeout } from '../../../../base/common/async.js';
export const IUtilityProcessWorkerWorkbenchService = createDecorator('utilityProcessWorkerWorkbenchService');
let UtilityProcessWorkerWorkbenchService = class UtilityProcessWorkerWorkbenchService extends Disposable {
    get utilityProcessWorkerService() {
        if (!this._utilityProcessWorkerService) {
            const channel = this.mainProcessService.getChannel(ipcUtilityProcessWorkerChannelName);
            this._utilityProcessWorkerService = ProxyChannel.toService(channel);
        }
        return this._utilityProcessWorkerService;
    }
    constructor(windowId, logService, mainProcessService) {
        super();
        this.windowId = windowId;
        this.logService = logService;
        this.mainProcessService = mainProcessService;
        this._utilityProcessWorkerService = undefined;
        this.restoredBarrier = new Barrier();
    }
    async createWorker(process) {
        this.logService.trace('Renderer->UtilityProcess#createWorker');
        // We want to avoid heavy utility process work to happen before
        // the window has restored. As such, make sure we await the
        // `Restored` phase before making a connection attempt, but also
        // add a timeout to be safe against possible deadlocks.
        await Promise.race([this.restoredBarrier.wait(), timeout(2000)]);
        // Get ready to acquire the message port from the utility process worker
        const nonce = generateUuid();
        const responseChannel = 'vscode:createUtilityProcessWorkerMessageChannelResult';
        const portPromise = acquirePort(undefined /* we trigger the request via service call! */, responseChannel, nonce);
        // Actually talk with the utility process service
        // to create a new process from a worker
        const onDidTerminate = this.utilityProcessWorkerService.createWorker({
            process,
            reply: { windowId: this.windowId, channel: responseChannel, nonce }
        });
        // Dispose worker upon disposal via utility process service
        const disposables = new DisposableStore();
        disposables.add(toDisposable(() => {
            this.logService.trace('Renderer->UtilityProcess#disposeWorker', process);
            this.utilityProcessWorkerService.disposeWorker({
                process,
                reply: { windowId: this.windowId }
            });
        }));
        const port = await portPromise;
        const client = disposables.add(new MessagePortClient(port, `window:${this.windowId},module:${process.moduleId}`));
        this.logService.trace('Renderer->UtilityProcess#createWorkerChannel: connection established');
        onDidTerminate.then(({ reason }) => {
            if (reason?.code === 0) {
                this.logService.trace(`[UtilityProcessWorker]: terminated normally with code ${reason.code}, signal: ${reason.signal}`);
            }
            else {
                this.logService.error(`[UtilityProcessWorker]: terminated unexpectedly with code ${reason?.code}, signal: ${reason?.signal}`);
            }
        });
        return { client, onDidTerminate, dispose: () => disposables.dispose() };
    }
    notifyRestored() {
        if (!this.restoredBarrier.isOpen()) {
            this.restoredBarrier.open();
        }
    }
};
UtilityProcessWorkerWorkbenchService = __decorate([
    __param(1, ILogService),
    __param(2, IMainProcessService)
], UtilityProcessWorkerWorkbenchService);
export { UtilityProcessWorkerWorkbenchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eVByb2Nlc3NXb3JrZXJXb3JrYmVuY2hTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91dGlsaXR5UHJvY2Vzcy9lbGVjdHJvbi1zYW5kYm94L3V0aWxpdHlQcm9jZXNzV29ya2VyV29ya2JlbmNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQWEsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNwRixPQUFPLEVBQTZDLGtDQUFrQyxFQUE4RCxNQUFNLDJFQUEyRSxDQUFDO0FBQ3RPLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFcEUsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQUcsZUFBZSxDQUF3QyxzQ0FBc0MsQ0FBQyxDQUFDO0FBdUQ3SSxJQUFNLG9DQUFvQyxHQUExQyxNQUFNLG9DQUFxQyxTQUFRLFVBQVU7SUFLbkUsSUFBWSwyQkFBMkI7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