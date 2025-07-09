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
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { WindowUtilityProcess } from './utilityProcess.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { hash } from '../../../base/common/hash.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
export const IUtilityProcessWorkerMainService = createDecorator('utilityProcessWorker');
let UtilityProcessWorkerMainService = class UtilityProcessWorkerMainService extends Disposable {
    constructor(logService, windowsMainService, telemetryService, lifecycleMainService) {
        super();
        this.logService = logService;
        this.windowsMainService = windowsMainService;
        this.telemetryService = telemetryService;
        this.lifecycleMainService = lifecycleMainService;
        this.workers = new Map();
    }
    async createWorker(configuration) {
        const workerLogId = `window: ${configuration.reply.windowId}, moduleId: ${configuration.process.moduleId}`;
        this.logService.trace(`[UtilityProcessWorker]: createWorker(${workerLogId})`);
        // Ensure to dispose any existing process for config
        const workerId = this.hash(configuration);
        if (this.workers.has(workerId)) {
            this.logService.warn(`[UtilityProcessWorker]: createWorker() found an existing worker that will be terminated (${workerLogId})`);
            this.disposeWorker(configuration);
        }
        // Create new worker
        const worker = new UtilityProcessWorker(this.logService, this.windowsMainService, this.telemetryService, this.lifecycleMainService, configuration);
        if (!worker.spawn()) {
            return { reason: { code: 1, signal: 'EINVALID' } };
        }
        this.workers.set(workerId, worker);
        const onDidTerminate = new DeferredPromise();
        Event.once(worker.onDidTerminate)(reason => {
            if (reason.code === 0) {
                this.logService.trace(`[UtilityProcessWorker]: terminated normally with code ${reason.code}, signal: ${reason.signal}`);
            }
            else {
                this.logService.error(`[UtilityProcessWorker]: terminated unexpectedly with code ${reason.code}, signal: ${reason.signal}`);
            }
            this.workers.delete(workerId);
            onDidTerminate.complete({ reason });
        });
        return onDidTerminate.p;
    }
    hash(configuration) {
        return hash({
            moduleId: configuration.process.moduleId,
            windowId: configuration.reply.windowId
        });
    }
    async disposeWorker(configuration) {
        const workerId = this.hash(configuration);
        const worker = this.workers.get(workerId);
        if (!worker) {
            return;
        }
        this.logService.trace(`[UtilityProcessWorker]: disposeWorker(window: ${configuration.reply.windowId}, moduleId: ${configuration.process.moduleId})`);
        worker.kill();
        worker.dispose();
        this.workers.delete(workerId);
    }
};
UtilityProcessWorkerMainService = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, ITelemetryService),
    __param(3, ILifecycleMainService)
], UtilityProcessWorkerMainService);
export { UtilityProcessWorkerMainService };
let UtilityProcessWorker = class UtilityProcessWorker extends Disposable {
    constructor(logService, windowsMainService, telemetryService, lifecycleMainService, configuration) {
        super();
        this.windowsMainService = windowsMainService;
        this.configuration = configuration;
        this._onDidTerminate = this._register(new Emitter());
        this.onDidTerminate = this._onDidTerminate.event;
        this.utilityProcess = this._register(new WindowUtilityProcess(logService, windowsMainService, telemetryService, lifecycleMainService));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.utilityProcess.onExit(e => this._onDidTerminate.fire({ code: e.code, signal: e.signal })));
        this._register(this.utilityProcess.onCrash(e => this._onDidTerminate.fire({ code: e.code, signal: 'ECRASH' })));
    }
    spawn() {
        const window = this.windowsMainService.getWindowById(this.configuration.reply.windowId);
        const windowPid = window?.win?.webContents.getOSProcessId();
        return this.utilityProcess.start({
            type: this.configuration.process.type,
            entryPoint: this.configuration.process.moduleId,
            parentLifecycleBound: windowPid,
            windowLifecycleBound: true,
            correlationId: `${this.configuration.reply.windowId}`,
            responseWindowId: this.configuration.reply.windowId,
            responseChannel: this.configuration.reply.channel,
            responseNonce: this.configuration.reply.nonce
        });
    }
    kill() {
        this.utilityProcess.kill();
    }
};
UtilityProcessWorker = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, ITelemetryService),
    __param(3, ILifecycleMainService)
], UtilityProcessWorker);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eVByb2Nlc3NXb3JrZXJNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91dGlsaXR5UHJvY2Vzcy9lbGVjdHJvbi1tYWluL3V0aWxpdHlQcm9jZXNzV29ya2VyTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRTlGLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLGVBQWUsQ0FBbUMsc0JBQXNCLENBQUMsQ0FBQztBQU9uSCxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLFVBQVU7SUFNOUQsWUFDYyxVQUF3QyxFQUNoQyxrQkFBd0QsRUFDMUQsZ0JBQW9ELEVBQ2hELG9CQUE0RDtRQUVuRixLQUFLLEVBQUUs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