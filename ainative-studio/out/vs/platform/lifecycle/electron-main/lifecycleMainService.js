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
var LifecycleMainService_1;
import electron from 'electron';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { Barrier, Promises, timeout } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { isMacintosh, isWindows } from '../../../base/common/platform.js';
import { cwd } from '../../../base/common/process.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IStateService } from '../../state/node/state.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { getAllWindowsExcludingOffscreen } from '../../windows/electron-main/windows.js';
export const ILifecycleMainService = createDecorator('lifecycleMainService');
export var ShutdownReason;
(function (ShutdownReason) {
    /**
     * The application exits normally.
     */
    ShutdownReason[ShutdownReason["QUIT"] = 1] = "QUIT";
    /**
     * The application exits abnormally and is being
     * killed with an exit code (e.g. from integration
     * test run)
     */
    ShutdownReason[ShutdownReason["KILL"] = 2] = "KILL";
})(ShutdownReason || (ShutdownReason = {}));
export var LifecycleMainPhase;
(function (LifecycleMainPhase) {
    /**
     * The first phase signals that we are about to startup.
     */
    LifecycleMainPhase[LifecycleMainPhase["Starting"] = 1] = "Starting";
    /**
     * Services are ready and first window is about to open.
     */
    LifecycleMainPhase[LifecycleMainPhase["Ready"] = 2] = "Ready";
    /**
     * This phase signals a point in time after the window has opened
     * and is typically the best place to do work that is not required
     * for the window to open.
     */
    LifecycleMainPhase[LifecycleMainPhase["AfterWindowOpen"] = 3] = "AfterWindowOpen";
    /**
     * The last phase after a window has opened and some time has passed
     * (2-5 seconds).
     */
    LifecycleMainPhase[LifecycleMainPhase["Eventually"] = 4] = "Eventually";
})(LifecycleMainPhase || (LifecycleMainPhase = {}));
let LifecycleMainService = class LifecycleMainService extends Disposable {
    static { LifecycleMainService_1 = this; }
    static { this.QUIT_AND_RESTART_KEY = 'lifecycle.quitAndRestart'; }
    get quitRequested() { return this._quitRequested; }
    get wasRestarted() { return this._wasRestarted; }
    get phase() { return this._phase; }
    constructor(logService, stateService, environmentMainService) {
        super();
        this.logService = logService;
        this.stateService = stateService;
        this.environmentMainService = environmentMainService;
        this._onBeforeShutdown = this._register(new Emitter());
        this.onBeforeShutdown = this._onBeforeShutdown.event;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
        this._onWillLoadWindow = this._register(new Emitter());
        this.onWillLoadWindow = this._onWillLoadWindow.event;
        this._onBeforeCloseWindow = this._register(new Emitter());
        this.onBeforeCloseWindow = this._onBeforeCloseWindow.event;
        this._quitRequested = false;
        this._wasRestarted = false;
        this._phase = 1 /* LifecycleMainPhase.Starting */;
        this.windowToCloseRequest = new Set();
        this.oneTimeListenerTokenGenerator = 0;
        this.windowCounter = 0;
        this.pendingQuitPromise = undefined;
        this.pendingQuitPromiseResolve = undefined;
        this.pendingWillShutdownPromise = undefined;
        this.mapWindowIdToPendingUnload = new Map();
        this.phaseWhen = new Map();
        this.relaunchHandler = undefined;
        this.resolveRestarted();
        this.when(2 /* LifecycleMainPhase.Ready */).then(() => this.registerListeners());
    }
    resolveRestarted() {
        this._wasRestarted = !!this.stateService.getItem(LifecycleMainService_1.QUIT_AND_RESTART_KEY);
        if (this._wasRestarted) {
            // remove the marker right after if found
            this.stateService.removeItem(LifecycleMainService_1.QUIT_AND_RESTART_KEY);
        }
    }
    registerListeners() {
        // before-quit: an event that is fired if application quit was
        // requested but before any window was closed.
        const beforeQuitListener = () => {
            if (this._quitRequested) {
                return;
            }
            this.trace('Lifecycle#app.on(before-quit)');
            this._quitRequested = true;
            // Emit event to indicate that we are about to shutdown
            this.trace('Lifecycle#onBeforeShutdown.fire()');
            this._onBeforeShutdown.fire();
            // macOS: can run without any window open. in that case we fire
            // the onWillShutdown() event directly because there is no veto
            // to be expected.
            if (isMacintosh && this.windowCounter === 0) {
                this.fireOnWillShutdown(1 /* ShutdownReason.QUIT */);
            }
        };
        electron.app.addListener('before-quit', beforeQuitListener);
        // window-all-closed: an event that only fires when the last window
        // was closed. We override this event to be in charge if app.quit()
        // should be called or not.
        const windowAllClosedListener = () => {
            this.trace('Lifecycle#app.on(window-all-closed)');
            // Windows/Linux: we quit when all windows have closed
            // Mac: we only quit when quit was requested
            if (this._quitRequested || !isMacintosh) {
                electron.app.quit();
            }
        };
        electron.app.addListener('window-all-closed', windowAllClosedListener);
        // will-quit: an event that is fired after all windows have been
        // closed, but before actually quitting.
        electron.app.once('will-quit', e => {
            this.trace('Lifecycle#app.on(will-quit) - begin');
            // Prevent the quit until the shutdown promise was resolved
            e.preventDefault();
            // Start shutdown sequence
            const shutdownPromise = this.fireOnWillShutdown(1 /* ShutdownReason.QUIT */);
            // Wait until shutdown is signaled to be complete
            shutdownPromise.finally(() => {
                this.trace('Lifecycle#app.on(will-quit) - after fireOnWillShutdown');
                // Resolve pending quit promise now without veto
                this.resolvePendingQuitPromise(false /* no veto */);
                // Quit again, this time do not prevent this, since our
                // will-quit listener is only installed "once". Also
                // remove any listener we have that is no longer needed
                electron.app.removeListener('before-quit', beforeQuitListener);
                electron.app.removeListener('window-all-closed', windowAllClosedListener);
                this.trace('Lifecycle#app.on(will-quit) - calling app.quit()');
                electron.app.quit();
            });
        });
    }
    fireOnWillShutdown(reason) {
        if (this.pendingWillShutdownPromise) {
            return this.pendingWillShutdownPromise; // shutdown is already running
        }
        const logService = this.logService;
        this.trace('Lifecycle#onWillShutdown.fire()');
        const joiners = [];
        this._onWillShutdown.fire({
            reason,
            join(id, promise) {
                logService.trace(`Lifecycle#onWillShutdown - begin '${id}'`);
                joiners.push(promise.finally(() => {
                    logService.trace(`Lifecycle#onWillShutdown - end '${id}'`);
                }));
            }
        });
        this.pendingWillShutdownPromise = (async () => {
            // Settle all shutdown event joiners
            try {
                await Promises.settled(joiners);
            }
            catch (error) {
                this.logService.error(error);
            }
            // Then, always make sure at the end
            // the state service is flushed.
            try {
                await this.stateService.close();
            }
            catch (error) {
                this.logService.error(error);
            }
        })();
        return this.pendingWillShutdownPromise;
    }
    set phase(value) {
        if (value < this.phase) {
            throw new Error('Lifecycle cannot go backwards');
        }
        if (this._phase === value) {
            return;
        }
        this.trace(`lifecycle (main): phase changed (value: ${value})`);
        this._phase = value;
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
    registerWindow(window) {
        const windowListeners = new DisposableStore();
        // track window count
        this.windowCounter++;
        // Window Will Load
        windowListeners.add(window.onWillLoad(e => this._onWillLoadWindow.fire({ window, workspace: e.workspace, reason: e.reason })));
        // Window Before Closing: Main -> Renderer
        const win = assertIsDefined(window.win);
        windowListeners.add(Event.fromNodeEventEmitter(win, 'close')(e => {
            // The window already acknowledged to be closed
            const windowId = window.id;
            if (this.windowToCloseRequest.has(windowId)) {
                this.windowToCloseRequest.delete(windowId);
                return;
            }
            this.trace(`Lifecycle#window.on('close') - window ID ${window.id}`);
            // Otherwise prevent unload and handle it from window
            e.preventDefault();
            this.unload(window, 1 /* UnloadReason.CLOSE */).then(veto => {
                if (veto) {
                    this.windowToCloseRequest.delete(windowId);
                    return;
                }
                this.windowToCloseRequest.add(windowId);
                // Fire onBeforeCloseWindow before actually closing
                this.trace(`Lifecycle#onBeforeCloseWindow.fire() - window ID ${windowId}`);
                this._onBeforeCloseWindow.fire(window);
                // No veto, close window now
                window.close();
            });
        }));
        windowListeners.add(Event.fromNodeEventEmitter(win, 'closed')(() => {
            this.trace(`Lifecycle#window.on('closed') - window ID ${window.id}`);
            // update window count
            this.windowCounter--;
            // clear window listeners
            windowListeners.dispose();
            // if there are no more code windows opened, fire the onWillShutdown event, unless
            // we are on macOS where it is perfectly fine to close the last window and
            // the application continues running (unless quit was actually requested)
            if (this.windowCounter === 0 && (!isMacintosh || this._quitRequested)) {
                this.fireOnWillShutdown(1 /* ShutdownReason.QUIT */);
            }
        }));
    }
    registerAuxWindow(auxWindow) {
        const win = assertIsDefined(auxWindow.win);
        const windowListeners = new DisposableStore();
        windowListeners.add(Event.fromNodeEventEmitter(win, 'close')(e => {
            this.trace(`Lifecycle#auxWindow.on('close') - window ID ${auxWindow.id}`);
            if (this._quitRequested) {
                this.trace(`Lifecycle#auxWindow.on('close') - preventDefault() because quit requested`);
                // When quit is requested, Electron will close all
                // auxiliary windows before closing the main windows.
                // This prevents us from storing the auxiliary window
                // state on shutdown and thus we prevent closing if
                // quit is requested.
                //
                // Interestingly, this will not prevent the application
                // from quitting because the auxiliary windows will still
                // close once the owning window closes.
                e.preventDefault();
            }
        }));
        windowListeners.add(Event.fromNodeEventEmitter(win, 'closed')(() => {
            this.trace(`Lifecycle#auxWindow.on('closed') - window ID ${auxWindow.id}`);
            windowListeners.dispose();
        }));
    }
    async reload(window, cli) {
        // Only reload when the window has not vetoed this
        const veto = await this.unload(window, 3 /* UnloadReason.RELOAD */);
        if (!veto) {
            window.reload(cli);
        }
    }
    unload(window, reason) {
        // Ensure there is only 1 unload running at the same time
        const pendingUnloadPromise = this.mapWindowIdToPendingUnload.get(window.id);
        if (pendingUnloadPromise) {
            return pendingUnloadPromise;
        }
        // Start unload and remember in map until finished
        const unloadPromise = this.doUnload(window, reason).finally(() => {
            this.mapWindowIdToPendingUnload.delete(window.id);
        });
        this.mapWindowIdToPendingUnload.set(window.id, unloadPromise);
        return unloadPromise;
    }
    async doUnload(window, reason) {
        // Always allow to unload a window that is not yet ready
        if (!window.isReady) {
            return false;
        }
        this.trace(`Lifecycle#unload() - window ID ${window.id}`);
        // first ask the window itself if it vetos the unload
        const windowUnloadReason = this._quitRequested ? 2 /* UnloadReason.QUIT */ : reason;
        const veto = await this.onBeforeUnloadWindowInRenderer(window, windowUnloadReason);
        if (veto) {
            this.trace(`Lifecycle#unload() - veto in renderer (window ID ${window.id})`);
            return this.handleWindowUnloadVeto(veto);
        }
        // finally if there are no vetos, unload the renderer
        await this.onWillUnloadWindowInRenderer(window, windowUnloadReason);
        return false;
    }
    handleWindowUnloadVeto(veto) {
        if (!veto) {
            return false; // no veto
        }
        // a veto resolves any pending quit with veto
        this.resolvePendingQuitPromise(true /* veto */);
        // a veto resets the pending quit request flag
        this._quitRequested = false;
        return true; // veto
    }
    resolvePendingQuitPromise(veto) {
        if (this.pendingQuitPromiseResolve) {
            this.pendingQuitPromiseResolve(veto);
            this.pendingQuitPromiseResolve = undefined;
            this.pendingQuitPromise = undefined;
        }
    }
    onBeforeUnloadWindowInRenderer(window, reason) {
        return new Promise(resolve => {
            const oneTimeEventToken = this.oneTimeListenerTokenGenerator++;
            const okChannel = `vscode:ok${oneTimeEventToken}`;
            const cancelChannel = `vscode:cancel${oneTimeEventToken}`;
            validatedIpcMain.once(okChannel, () => {
                resolve(false); // no veto
            });
            validatedIpcMain.once(cancelChannel, () => {
                resolve(true); // veto
            });
            window.send('vscode:onBeforeUnload', { okChannel, cancelChannel, reason });
        });
    }
    onWillUnloadWindowInRenderer(window, reason) {
        return new Promise(resolve => {
            const oneTimeEventToken = this.oneTimeListenerTokenGenerator++;
            const replyChannel = `vscode:reply${oneTimeEventToken}`;
            validatedIpcMain.once(replyChannel, () => resolve());
            window.send('vscode:onWillUnload', { replyChannel, reason });
        });
    }
    quit(willRestart) {
        return this.doQuit(willRestart).then(veto => {
            if (!veto && willRestart) {
                // Windows: we are about to restart and as such we need to restore the original
                // current working directory we had on startup to get the exact same startup
                // behaviour. As such, we briefly change back to that directory and then when
                // Code starts it will set it back to the installation directory again.
                try {
                    if (isWindows) {
                        const currentWorkingDir = cwd();
                        if (currentWorkingDir !== process.cwd()) {
                            process.chdir(currentWorkingDir);
                        }
                    }
                }
                catch (err) {
                    this.logService.error(err);
                }
            }
            return veto;
        });
    }
    doQuit(willRestart) {
        this.trace(`Lifecycle#quit() - begin (willRestart: ${willRestart})`);
        if (this.pendingQuitPromise) {
            this.trace('Lifecycle#quit() - returning pending quit promise');
            return this.pendingQuitPromise;
        }
        // Remember if we are about to restart
        if (willRestart) {
            this.stateService.setItem(LifecycleMainService_1.QUIT_AND_RESTART_KEY, true);
        }
        this.pendingQuitPromise = new Promise(resolve => {
            // Store as field to access it from a window cancellation
            this.pendingQuitPromiseResolve = resolve;
            // Calling app.quit() will trigger the close handlers of each opened window
            // and only if no window vetoed the shutdown, we will get the will-quit event
            this.trace('Lifecycle#quit() - calling app.quit()');
            electron.app.quit();
        });
        return this.pendingQuitPromise;
    }
    trace(msg) {
        if (this.environmentMainService.args['enable-smoke-test-driver']) {
            this.logService.info(msg); // helps diagnose issues with exiting from smoke tests
        }
        else {
            this.logService.trace(msg);
        }
    }
    setRelaunchHandler(handler) {
        this.relaunchHandler = handler;
    }
    async relaunch(options) {
        this.trace('Lifecycle#relaunch()');
        const args = process.argv.slice(1);
        if (options?.addArgs) {
            args.push(...options.addArgs);
        }
        if (options?.removeArgs) {
            for (const a of options.removeArgs) {
                const idx = args.indexOf(a);
                if (idx >= 0) {
                    args.splice(idx, 1);
                }
            }
        }
        const quitListener = () => {
            if (!this.relaunchHandler?.handleRelaunch(options)) {
                this.trace('Lifecycle#relaunch() - calling app.relaunch()');
                electron.app.relaunch({ args });
            }
        };
        electron.app.once('quit', quitListener);
        // `app.relaunch()` does not quit automatically, so we quit first,
        // check for vetoes and then relaunch from the `app.on('quit')` event
        const veto = await this.quit(true /* will restart */);
        if (veto) {
            electron.app.removeListener('quit', quitListener);
        }
    }
    async kill(code) {
        this.trace('Lifecycle#kill()');
        // Give main process participants a chance to orderly shutdown
        await this.fireOnWillShutdown(2 /* ShutdownReason.KILL */);
        // From extension tests we have seen issues where calling app.exit()
        // with an opened window can lead to native crashes (Linux). As such,
        // we should make sure to destroy any opened window before calling
        // `app.exit()`.
        //
        // Note: Electron implements a similar logic here:
        // https://github.com/electron/electron/blob/fe5318d753637c3903e23fc1ed1b263025887b6a/spec-main/window-helpers.ts#L5
        await Promise.race([
            // Still do not block more than 1s
            timeout(1000),
            // Destroy any opened window: we do not unload windows here because
            // there is a chance that the unload is veto'd or long running due
            // to a participant within the window. this is not wanted when we
            // are asked to kill the application.
            (async () => {
                for (const window of getAllWindowsExcludingOffscreen()) {
                    if (window && !window.isDestroyed()) {
                        let whenWindowClosed;
                        if (window.webContents && !window.webContents.isDestroyed()) {
                            whenWindowClosed = new Promise(resolve => window.once('closed', resolve));
                        }
                        else {
                            whenWindowClosed = Promise.resolve();
                        }
                        window.destroy();
                        await whenWindowClosed;
                    }
                }
            })()
        ]);
        // Now exit either after 1s or all windows destroyed
        electron.app.exit(code);
    }
};
LifecycleMainService = LifecycleMainService_1 = __decorate([
    __param(0, ILogService),
    __param(1, IStateService),
    __param(2, IEnvironmentMainService)
], LifecycleMainService);
export { LifecycleMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbGlmZWN5Y2xlL2VsZWN0cm9uLW1haW4vbGlmZWN5Y2xlTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWhFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRzFELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRXBHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXpGLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNC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