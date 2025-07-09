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
var AbstractLifecycleService_1;
import { Emitter } from '../../../../base/common/event.js';
import { Barrier } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { LifecyclePhaseToString } from './lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { mark } from '../../../../base/common/performance.js';
import { IStorageService, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
let AbstractLifecycleService = class AbstractLifecycleService extends Disposable {
    static { AbstractLifecycleService_1 = this; }
    static { this.LAST_SHUTDOWN_REASON_KEY = 'lifecyle.lastShutdownReason'; }
    get startupKind() { return this._startupKind; }
    get phase() { return this._phase; }
    get willShutdown() { return this._willShutdown; }
    constructor(logService, storageService) {
        super();
        this.logService = logService;
        this.storageService = storageService;
        this._onBeforeShutdown = this._register(new Emitter());
        this.onBeforeShutdown = this._onBeforeShutdown.event;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
        this._onDidShutdown = this._register(new Emitter());
        this.onDidShutdown = this._onDidShutdown.event;
        this._onBeforeShutdownError = this._register(new Emitter());
        this.onBeforeShutdownError = this._onBeforeShutdownError.event;
        this._onShutdownVeto = this._register(new Emitter());
        this.onShutdownVeto = this._onShutdownVeto.event;
        this._phase = 1 /* LifecyclePhase.Starting */;
        this._willShutdown = false;
        this.phaseWhen = new Map();
        // Resolve startup kind
        this._startupKind = this.resolveStartupKind();
        // Save shutdown reason to retrieve on next startup
        this._register(this.storageService.onWillSaveState(e => {
            if (e.reason === WillSaveStateReason.SHUTDOWN) {
                this.storageService.store(AbstractLifecycleService_1.LAST_SHUTDOWN_REASON_KEY, this.shutdownReason, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }));
    }
    resolveStartupKind() {
        const startupKind = this.doResolveStartupKind() ?? 1 /* StartupKind.NewWindow */;
        this.logService.trace(`[lifecycle] starting up (startup kind: ${startupKind})`);
        return startupKind;
    }
    doResolveStartupKind() {
        // Retrieve and reset last shutdown reason
        const lastShutdownReason = this.storageService.getNumber(AbstractLifecycleService_1.LAST_SHUTDOWN_REASON_KEY, 1 /* StorageScope.WORKSPACE */);
        this.storageService.remove(AbstractLifecycleService_1.LAST_SHUTDOWN_REASON_KEY, 1 /* StorageScope.WORKSPACE */);
        // Convert into startup kind
        let startupKind = undefined;
        switch (lastShutdownReason) {
            case 3 /* ShutdownReason.RELOAD */:
                startupKind = 3 /* StartupKind.ReloadedWindow */;
                break;
            case 4 /* ShutdownReason.LOAD */:
                startupKind = 4 /* StartupKind.ReopenedWindow */;
                break;
        }
        return startupKind;
    }
    set phase(value) {
        if (value < this.phase) {
            throw new Error('Lifecycle cannot go backwards');
        }
        if (this._phase === value) {
            return;
        }
        this.logService.trace(`lifecycle: phase changed (value: ${value})`);
        this._phase = value;
        mark(`code/LifecyclePhase/${LifecyclePhaseToString(value)}`);
        const barrier = this.phaseWhen.get(this._phase);
        if (barrier) {
            barrier.open();
            this.phaseWhen.delete(this._phase);
        }
    }
    async when(phase) {
        if (phase <= this._phase) {
            return;
        }
        let barrier = this.phaseWhen.get(phase);
        if (!barrier) {
            barrier = new Barrier();
            this.phaseWhen.set(phase, barrier);
        }
        await barrier.wait();
    }
};
AbstractLifecycleService = AbstractLifecycleService_1 = __decorate([
    __param(0, ILogService),
    __param(1, IStorageService)
], AbstractLifecycleService);
export { AbstractLifecycleService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGlmZWN5Y2xlL2NvbW1vbi9saWZlY3ljbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQXFFLHNCQUFzQixFQUF5RSxNQUFNLGdCQUFnQixDQUFDO0FBQ2xNLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBK0IsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUU1SCxJQUFlLHdCQUF3QixHQUF2QyxNQUFlLHdCQUF5QixTQUFRLFVBQVU7O2FBRXhDLDZCQUF3QixHQUFHLDZCQUE2QixBQUFoQyxDQUFpQztJQW9CakYsSUFBSSxXQUFXLEtBQWtCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFHNUQsSUFBSSxLQUFLLEtBQXFCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFHbkQsSUFBSSxZQUFZLEtBQWMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQU0xRCxZQUNjLFVBQTBDLEVBQ3RDLGNBQWtEO1FBRW5FLEtBQUssRUFBRSxDQUFDO1FBSHdCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDbkIsbUJB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