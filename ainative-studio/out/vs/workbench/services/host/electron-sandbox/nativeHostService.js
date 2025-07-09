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
import { Emitter, Event } from '../../../../base/common/event.js';
import { IHostService } from '../browser/host.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { isFolderToOpen, isWorkspaceToOpen } from '../../../../platform/window/common/window.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { NativeHostService } from '../../../../platform/native/common/nativeHostService.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { disposableWindowInterval, getActiveDocument, getWindowId, getWindowsCount, hasWindow, onDidRegisterWindow } from '../../../../base/browser/dom.js';
import { memoize } from '../../../../base/common/decorators.js';
import { isAuxiliaryWindow } from '../../../../base/browser/window.js';
let WorkbenchNativeHostService = class WorkbenchNativeHostService extends NativeHostService {
    constructor(environmentService, mainProcessService) {
        super(environmentService.window.id, mainProcessService);
    }
};
WorkbenchNativeHostService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IMainProcessService)
], WorkbenchNativeHostService);
let WorkbenchHostService = class WorkbenchHostService extends Disposable {
    constructor(nativeHostService, labelService, environmentService) {
        super();
        this.nativeHostService = nativeHostService;
        this.labelService = labelService;
        this.environmentService = environmentService;
        //#endregion
        //#region Native Handle
        this._nativeWindowHandleCache = new Map();
        this.onDidChangeFocus = Event.latch(Event.any(Event.map(Event.filter(this.nativeHostService.onDidFocusMainOrAuxiliaryWindow, id => hasWindow(id), this._store), () => this.hasFocus, this._store), Event.map(Event.filter(this.nativeHostService.onDidBlurMainOrAuxiliaryWindow, id => hasWindow(id), this._store), () => this.hasFocus, this._store), Event.map(this.onDidChangeActiveWindow, () => this.hasFocus, this._store)), undefined, this._store);
        this.onDidChangeFullScreen = Event.filter(this.nativeHostService.onDidChangeWindowFullScreen, e => hasWindow(e.windowId), this._store);
    }
    get hasFocus() {
        return getActiveDocument().hasFocus();
    }
    async hadLastFocus() {
        const activeWindowId = await this.nativeHostService.getActiveWindowId();
        if (typeof activeWindowId === 'undefined') {
            return false;
        }
        return activeWindowId === this.nativeHostService.windowId;
    }
    //#endregion
    //#region Window
    get onDidChangeActiveWindow() {
        const emitter = this._register(new Emitter());
        // Emit via native focus tracking
        this._register(Event.filter(this.nativeHostService.onDidFocusMainOrAuxiliaryWindow, id => hasWindow(id), this._store)(id => emitter.fire(id)));
        this._register(onDidRegisterWindow(({ window, disposables }) => {
            // Emit via interval: immediately when opening an auxiliary window,
            // it is possible that document focus has not yet changed, so we
            // poll for a while to ensure we catch the event.
            disposables.add(disposableWindowInterval(window, () => {
                const hasFocus = window.document.hasFocus();
                if (hasFocus) {
                    emitter.fire(window.vscodeWindowId);
                }
                return hasFocus;
            }, 100, 20));
        }));
        return Event.latch(emitter.event, undefined, this._store);
    }
    openWindow(arg1, arg2) {
        if (Array.isArray(arg1)) {
            return this.doOpenWindow(arg1, arg2);
        }
        return this.doOpenEmptyWindow(arg1);
    }
    doOpenWindow(toOpen, options) {
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (!!remoteAuthority) {
            toOpen.forEach(openable => openable.label = openable.label || this.getRecentLabel(openable));
            if (options?.remoteAuthority === undefined) {
                // set the remoteAuthority of the window the request came from.
                // It will be used when the input is neither file nor vscode-remote.
                options = options ? { ...options, remoteAuthority } : { remoteAuthority };
            }
        }
        return this.nativeHostService.openWindow(toOpen, options);
    }
    getRecentLabel(openable) {
        if (isFolderToOpen(openable)) {
            return this.labelService.getWorkspaceLabel(openable.folderUri, { verbose: 2 /* Verbosity.LONG */ });
        }
        if (isWorkspaceToOpen(openable)) {
            return this.labelService.getWorkspaceLabel({ id: '', configPath: openable.workspaceUri }, { verbose: 2 /* Verbosity.LONG */ });
        }
        return this.labelService.getUriLabel(openable.fileUri, { appendWorkspaceSuffix: true });
    }
    doOpenEmptyWindow(options) {
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (!!remoteAuthority && options?.remoteAuthority === undefined) {
            // set the remoteAuthority of the window the request came from
            options = options ? { ...options, remoteAuthority } : { remoteAuthority };
        }
        return this.nativeHostService.openWindow(options);
    }
    toggleFullScreen(targetWindow) {
        return this.nativeHostService.toggleFullScreen({ targetWindowId: isAuxiliaryWindow(targetWindow) ? targetWindow.vscodeWindowId : undefined });
    }
    async moveTop(targetWindow) {
        if (getWindowsCount() <= 1) {
            return; // does not apply when only one window is opened
        }
        return this.nativeHostService.moveWindowTop(isAuxiliaryWindow(targetWindow) ? { targetWindowId: targetWindow.vscodeWindowId } : undefined);
    }
    getCursorScreenPoint() {
        return this.nativeHostService.getCursorScreenPoint();
    }
    //#endregion
    //#region Lifecycle
    focus(targetWindow, options) {
        return this.nativeHostService.focusWindow({
            force: options?.force,
            targetWindowId: getWindowId(targetWindow)
        });
    }
    restart() {
        return this.nativeHostService.relaunch();
    }
    reload(options) {
        return this.nativeHostService.reload(options);
    }
    close() {
        return this.nativeHostService.closeWindow();
    }
    async withExpectedShutdown(expectedShutdownTask) {
        return await expectedShutdownTask();
    }
    //#endregion
    //#region Screenshots
    getScreenshot() {
        return this.nativeHostService.getScreenshot();
    }
    async getNativeWindowHandle(windowId) {
        if (!this._nativeWindowHandleCache.has(windowId)) {
            this._nativeWindowHandleCache.set(windowId, this.nativeHostService.getNativeWindowHandle(windowId));
        }
        return this._nativeWindowHandleCache.get(windowId);
    }
};
__decorate([
    memoize
], WorkbenchHostService.prototype, "onDidChangeActiveWindow", null);
WorkbenchHostService = __decorate([
    __param(0, INativeHostService),
    __param(1, ILabelService),
    __param(2, IWorkbenchEnvironmentService)
], WorkbenchHostService);
registerSingleton(IHostService, WorkbenchHostService, 1 /* InstantiationType.Delayed */);
registerSingleton(INativeHostService, WorkbenchNativeHostService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSG9zdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2hvc3QvZWxlY3Ryb24tc2FuZGJveC9uYXRpdmVIb3N0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNsRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGFBQWEsRUFBYSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzlGLE9BQU8sRUFBdUMsY0FBYyxFQUFFLGlCQUFpQixFQUErQyxNQUFNLDhDQUE4QyxDQUFDO0FBQ25MLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM1SixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7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