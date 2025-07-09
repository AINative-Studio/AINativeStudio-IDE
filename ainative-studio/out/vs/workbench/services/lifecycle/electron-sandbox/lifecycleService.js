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
var NativeLifecycleService_1;
import { handleVetos } from '../../../../platform/lifecycle/common/lifecycle.js';
import { ILifecycleService, WillShutdownJoinerOrder } from '../common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractLifecycleService } from '../common/lifecycleService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Promises, disposableTimeout, raceCancellation } from '../../../../base/common/async.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
let NativeLifecycleService = class NativeLifecycleService extends AbstractLifecycleService {
    static { NativeLifecycleService_1 = this; }
    static { this.BEFORE_SHUTDOWN_WARNING_DELAY = 5000; }
    static { this.WILL_SHUTDOWN_WARNING_DELAY = 800; }
    constructor(nativeHostService, storageService, logService) {
        super(logService, storageService);
        this.nativeHostService = nativeHostService;
        this.registerListeners();
    }
    registerListeners() {
        const windowId = this.nativeHostService.windowId;
        // Main side indicates that window is about to unload, check for vetos
        ipcRenderer.on('vscode:onBeforeUnload', async (event, reply) => {
            this.logService.trace(`[lifecycle] onBeforeUnload (reason: ${reply.reason})`);
            // trigger onBeforeShutdown events and veto collecting
            const veto = await this.handleBeforeShutdown(reply.reason);
            // veto: cancel unload
            if (veto) {
                this.logService.trace('[lifecycle] onBeforeUnload prevented via veto');
                // Indicate as event
                this._onShutdownVeto.fire();
                ipcRenderer.send(reply.cancelChannel, windowId);
            }
            // no veto: allow unload
            else {
                this.logService.trace('[lifecycle] onBeforeUnload continues without veto');
                this.shutdownReason = reply.reason;
                ipcRenderer.send(reply.okChannel, windowId);
            }
        });
        // Main side indicates that we will indeed shutdown
        ipcRenderer.on('vscode:onWillUnload', async (event, reply) => {
            this.logService.trace(`[lifecycle] onWillUnload (reason: ${reply.reason})`);
            // trigger onWillShutdown events and joining
            await this.handleWillShutdown(reply.reason);
            // trigger onDidShutdown event now that we know we will quit
            this._onDidShutdown.fire();
            // acknowledge to main side
            ipcRenderer.send(reply.replyChannel, windowId);
        });
    }
    async handleBeforeShutdown(reason) {
        const logService = this.logService;
        const vetos = [];
        const pendingVetos = new Set();
        let finalVeto = undefined;
        let finalVetoId = undefined;
        // before-shutdown event with veto support
        this._onBeforeShutdown.fire({
            reason,
            veto(value, id) {
                vetos.push(value);
                // Log any veto instantly
                if (value === true) {
                    logService.info(`[lifecycle]: Shutdown was prevented (id: ${id})`);
                }
                // Track promise completion
                else if (value instanceof Promise) {
                    pendingVetos.add(id);
                    value.then(veto => {
                        if (veto === true) {
                            logService.info(`[lifecycle]: Shutdown was prevented (id: ${id})`);
                        }
                    }).finally(() => pendingVetos.delete(id));
                }
            },
            finalVeto(value, id) {
                if (!finalVeto) {
                    finalVeto = value;
                    finalVetoId = id;
                }
                else {
                    throw new Error(`[lifecycle]: Final veto is already defined (id: ${id})`);
                }
            }
        });
        const longRunningBeforeShutdownWarning = disposableTimeout(() => {
            logService.warn(`[lifecycle] onBeforeShutdown is taking a long time, pending operations: ${Array.from(pendingVetos).join(', ')}`);
        }, NativeLifecycleService_1.BEFORE_SHUTDOWN_WARNING_DELAY);
        try {
            // First: run list of vetos in parallel
            let veto = await handleVetos(vetos, error => this.handleBeforeShutdownError(error, reason));
            if (veto) {
                return veto;
            }
            // Second: run the final veto if defined
            if (finalVeto) {
                try {
                    pendingVetos.add(finalVetoId);
                    veto = await finalVeto();
                    if (veto) {
                        logService.info(`[lifecycle]: Shutdown was prevented by final veto (id: ${finalVetoId})`);
                    }
                }
                catch (error) {
                    veto = true; // treat error as veto
                    this.handleBeforeShutdownError(error, reason);
                }
            }
            return veto;
        }
        finally {
            longRunningBeforeShutdownWarning.dispose();
        }
    }
    handleBeforeShutdownError(error, reason) {
        this.logService.error(`[lifecycle]: Error during before-shutdown phase (error: ${toErrorMessage(error)})`);
        this._onBeforeShutdownError.fire({ reason, error });
    }
    async handleWillShutdown(reason) {
        this._willShutdown = true;
        const joiners = [];
        const lastJoiners = [];
        const pendingJoiners = new Set();
        const cts = new CancellationTokenSource();
        this._onWillShutdown.fire({
            reason,
            token: cts.token,
            joiners: () => Array.from(pendingJoiners.values()),
            join(promiseOrPromiseFn, joiner) {
                pendingJoiners.add(joiner);
                if (joiner.order === WillShutdownJoinerOrder.Last) {
                    const promiseFn = typeof promiseOrPromiseFn === 'function' ? promiseOrPromiseFn : () => promiseOrPromiseFn;
                    lastJoiners.push(() => promiseFn().finally(() => pendingJoiners.delete(joiner)));
                }
                else {
                    const promise = typeof promiseOrPromiseFn === 'function' ? promiseOrPromiseFn() : promiseOrPromiseFn;
                    promise.finally(() => pendingJoiners.delete(joiner));
                    joiners.push(promise);
                }
            },
            force: () => {
                cts.dispose(true);
            }
        });
        const longRunningWillShutdownWarning = disposableTimeout(() => {
            this.logService.warn(`[lifecycle] onWillShutdown is taking a long time, pending operations: ${Array.from(pendingJoiners).map(joiner => joiner.id).join(', ')}`);
        }, NativeLifecycleService_1.WILL_SHUTDOWN_WARNING_DELAY);
        try {
            await raceCancellation(Promises.settled(joiners), cts.token);
        }
        catch (error) {
            this.logService.error(`[lifecycle]: Error during will-shutdown phase in default joiners (error: ${toErrorMessage(error)})`);
        }
        try {
            await raceCancellation(Promises.settled(lastJoiners.map(lastJoiner => lastJoiner())), cts.token);
        }
        catch (error) {
            this.logService.error(`[lifecycle]: Error during will-shutdown phase in last joiners (error: ${toErrorMessage(error)})`);
        }
        longRunningWillShutdownWarning.dispose();
    }
    shutdown() {
        return this.nativeHostService.closeWindow();
    }
};
NativeLifecycleService = NativeLifecycleService_1 = __decorate([
    __param(0, INativeHostService),
    __param(1, IStorageService),
    __param(2, ILogService)
], NativeLifecycleService);
export { NativeLifecycleService };
registerSingleton(ILifecycleService, NativeLifecycleService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGlmZWN5Y2xlL2VsZWN0cm9uLXNhbmRib3gvbGlmZWN5Y2xlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2pGLE9BQU8sRUFBa0IsaUJBQWlCLEVBQTRCLHVCQUF1QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDOUgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFM0UsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSx3QkFBd0I7O2FBRTNDLGtDQUE2QixHQUFHLElBQUksQUFBUCxDQUFRO2FBQ3JDLGdDQUEyQixHQUFHLEdBQUcsQUFBTixDQUFPO0lBRTFELFlBQ3ND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