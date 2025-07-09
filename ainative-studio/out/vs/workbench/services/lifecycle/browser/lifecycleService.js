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
import { ILifecycleService } from '../common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractLifecycleService } from '../common/lifecycleService.js';
import { localize } from '../../../../nls.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { addDisposableListener, EventType } from '../../../../base/browser/dom.js';
import { IStorageService, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { mainWindow } from '../../../../base/browser/window.js';
let BrowserLifecycleService = class BrowserLifecycleService extends AbstractLifecycleService {
    constructor(logService, storageService) {
        super(logService, storageService);
        this.beforeUnloadListener = undefined;
        this.unloadListener = undefined;
        this.ignoreBeforeUnload = false;
        this.didUnload = false;
        this.registerListeners();
    }
    registerListeners() {
        // Listen to `beforeUnload` to support to veto
        this.beforeUnloadListener = addDisposableListener(mainWindow, EventType.BEFORE_UNLOAD, (e) => this.onBeforeUnload(e));
        // Listen to `pagehide` to support orderly shutdown
        // We explicitly do not listen to `unload` event
        // which would disable certain browser caching.
        // We currently do not handle the `persisted` property
        // (https://github.com/microsoft/vscode/issues/136216)
        this.unloadListener = addDisposableListener(mainWindow, EventType.PAGE_HIDE, () => this.onUnload());
    }
    onBeforeUnload(event) {
        // Before unload ignored (once)
        if (this.ignoreBeforeUnload) {
            this.logService.info('[lifecycle] onBeforeUnload triggered but ignored once');
            this.ignoreBeforeUnload = false;
        }
        // Before unload with veto support
        else {
            this.logService.info('[lifecycle] onBeforeUnload triggered and handled with veto support');
            this.doShutdown(() => this.vetoBeforeUnload(event));
        }
    }
    vetoBeforeUnload(event) {
        event.preventDefault();
        event.returnValue = localize('lifecycleVeto', "Changes that you made may not be saved. Please check press 'Cancel' and try again.");
    }
    withExpectedShutdown(reason, callback) {
        // Standard shutdown
        if (typeof reason === 'number') {
            this.shutdownReason = reason;
            // Ensure UI state is persisted
            return this.storageService.flush(WillSaveStateReason.SHUTDOWN);
        }
        // Before unload handling ignored for duration of callback
        else {
            this.ignoreBeforeUnload = true;
            try {
                callback?.();
            }
            finally {
                this.ignoreBeforeUnload = false;
            }
        }
    }
    async shutdown() {
        this.logService.info('[lifecycle] shutdown triggered');
        // An explicit shutdown renders our unload
        // event handlers disabled, so dispose them.
        this.beforeUnloadListener?.dispose();
        this.unloadListener?.dispose();
        // Ensure UI state is persisted
        await this.storageService.flush(WillSaveStateReason.SHUTDOWN);
        // Handle shutdown without veto support
        this.doShutdown();
    }
    doShutdown(vetoShutdown) {
        const logService = this.logService;
        // Optimistically trigger a UI state flush
        // without waiting for it. The browser does
        // not guarantee that this is being executed
        // but if a dialog opens, we have a chance
        // to succeed.
        this.storageService.flush(WillSaveStateReason.SHUTDOWN);
        let veto = false;
        function handleVeto(vetoResult, id) {
            if (typeof vetoShutdown !== 'function') {
                return; // veto handling disabled
            }
            if (vetoResult instanceof Promise) {
                logService.error(`[lifecycle] Long running operations before shutdown are unsupported in the web (id: ${id})`);
                veto = true; // implicitly vetos since we cannot handle promises in web
            }
            if (vetoResult === true) {
                logService.info(`[lifecycle]: Unload was prevented (id: ${id})`);
                veto = true;
            }
        }
        // Before Shutdown
        this._onBeforeShutdown.fire({
            reason: 2 /* ShutdownReason.QUIT */,
            veto(value, id) {
                handleVeto(value, id);
            },
            finalVeto(valueFn, id) {
                handleVeto(valueFn(), id); // in browser, trigger instantly because we do not support async anyway
            }
        });
        // Veto: handle if provided
        if (veto && typeof vetoShutdown === 'function') {
            return vetoShutdown();
        }
        // No veto, continue to shutdown
        return this.onUnload();
    }
    onUnload() {
        if (this.didUnload) {
            return; // only once
        }
        this.didUnload = true;
        this._willShutdown = true;
        // Register a late `pageshow` listener specifically on unload
        this._register(addDisposableListener(mainWindow, EventType.PAGE_SHOW, (e) => this.onLoadAfterUnload(e)));
        // First indicate will-shutdown
        const logService = this.logService;
        this._onWillShutdown.fire({
            reason: 2 /* ShutdownReason.QUIT */,
            joiners: () => [], // Unsupported in web
            token: CancellationToken.None, // Unsupported in web
            join(promise, joiner) {
                if (typeof promise === 'function') {
                    promise();
                }
                logService.error(`[lifecycle] Long running operations during shutdown are unsupported in the web (id: ${joiner.id})`);
            },
            force: () => { },
        });
        // Finally end with did-shutdown
        this._onDidShutdown.fire();
    }
    onLoadAfterUnload(event) {
        // We only really care about page-show events
        // where the browser indicates to us that the
        // page was restored from cache and not freshly
        // loaded.
        const wasRestoredFromCache = event.persisted;
        if (!wasRestoredFromCache) {
            return;
        }
        // At this point, we know that the page was restored from
        // cache even though it was unloaded before,
        // so in order to get back to a functional workbench, we
        // currently can only reload the window
        // Docs: https://web.dev/bfcache/#optimize-your-pages-for-bfcache
        // Refs: https://github.com/microsoft/vscode/issues/136035
        this.withExpectedShutdown({ disableShutdownHandling: true }, () => mainWindow.location.reload());
    }
    doResolveStartupKind() {
        let startupKind = super.doResolveStartupKind();
        if (typeof startupKind !== 'number') {
            const timing = performance.getEntriesByType('navigation').at(0);
            if (timing?.type === 'reload') {
                // MDN: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming/type#value
                startupKind = 3 /* StartupKind.ReloadedWindow */;
            }
        }
        return startupKind;
    }
};
BrowserLifecycleService = __decorate([
    __param(0, ILogService),
    __param(1, IStorageService)
], BrowserLifecycleService);
export { BrowserLifecycleService };
registerSingleton(ILifecycleService, BrowserLifecycleService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGlmZWN5Y2xlL2Jyb3dzZXIvbGlmZWN5Y2xlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWtCLGlCQUFpQixFQUFlLE1BQU0sd0JBQXdCLENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFekQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSx3QkFBd0I7SUFTcEUsWUFDYyxVQUF1QixFQUNuQixjQUErQjtRQUVoRCxLQUFLLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBWDNCLHlCQUFvQixHQUE0QixTQUFTLENBQUM7UUFDMUQsbUJBQWMsR0FBNEIsU0FBUyxDQUFDO1FBRXBELHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUUzQixjQUFTLEdBQUcsS0FBSyxDQUFDO1FBUXpCLElB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