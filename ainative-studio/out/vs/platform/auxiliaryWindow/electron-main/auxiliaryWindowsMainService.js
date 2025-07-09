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
import { BrowserWindow, app } from 'electron';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { FileAccess } from '../../../base/common/network.js';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { AuxiliaryWindow } from './auxiliaryWindow.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { defaultAuxWindowState } from '../../window/electron-main/window.js';
import { WindowStateValidator, defaultBrowserWindowOptions, getLastFocused } from '../../windows/electron-main/windows.js';
let AuxiliaryWindowsMainService = class AuxiliaryWindowsMainService extends Disposable {
    constructor(instantiationService, logService) {
        super();
        this.instantiationService = instantiationService;
        this.logService = logService;
        this._onDidMaximizeWindow = this._register(new Emitter());
        this.onDidMaximizeWindow = this._onDidMaximizeWindow.event;
        this._onDidUnmaximizeWindow = this._register(new Emitter());
        this.onDidUnmaximizeWindow = this._onDidUnmaximizeWindow.event;
        this._onDidChangeFullScreen = this._register(new Emitter());
        this.onDidChangeFullScreen = this._onDidChangeFullScreen.event;
        this._onDidTriggerSystemContextMenu = this._register(new Emitter());
        this.onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;
        this.windows = new Map();
        this.registerListeners();
    }
    registerListeners() {
        // We have to ensure that an auxiliary window gets to know its
        // containing `BrowserWindow` so that it can apply listeners to it
        // Unfortunately we cannot rely on static `BrowserWindow` methods
        // because we might call the methods too early before the window
        // is created.
        app.on('browser-window-created', (_event, browserWindow) => {
            // This is an auxiliary window, try to claim it
            const auxiliaryWindow = this.getWindowByWebContents(browserWindow.webContents);
            if (auxiliaryWindow) {
                this.logService.trace('[aux window] app.on("browser-window-created"): Trying to claim auxiliary window');
                auxiliaryWindow.tryClaimWindow();
            }
            // This is a main window, listen to child windows getting created to claim it
            else {
                const disposables = new DisposableStore();
                disposables.add(Event.fromNodeEventEmitter(browserWindow.webContents, 'did-create-window', (browserWindow, details) => ({ browserWindow, details }))(({ browserWindow, details }) => {
                    const auxiliaryWindow = this.getWindowByWebContents(browserWindow.webContents);
                    if (auxiliaryWindow) {
                        this.logService.trace('[aux window] window.on("did-create-window"): Trying to claim auxiliary window');
                        auxiliaryWindow.tryClaimWindow(details.options);
                    }
                }));
                disposables.add(Event.fromNodeEventEmitter(browserWindow, 'closed')(() => disposables.dispose()));
            }
        });
        validatedIpcMain.handle('vscode:registerAuxiliaryWindow', async (event, mainWindowId) => {
            const auxiliaryWindow = this.getWindowByWebContents(event.sender);
            if (auxiliaryWindow) {
                this.logService.trace('[aux window] vscode:registerAuxiliaryWindow: Registering auxiliary window to main window');
                auxiliaryWindow.parentId = mainWindowId;
            }
            return event.sender.id;
        });
    }
    createWindow(details) {
        const { state, overrides } = this.computeWindowStateAndOverrides(details);
        return this.instantiationService.invokeFunction(defaultBrowserWindowOptions, state, overrides, {
            preload: FileAccess.asFileUri('vs/base/parts/sandbox/electron-sandbox/preload-aux.js').fsPath
        });
    }
    computeWindowStateAndOverrides(details) {
        const windowState = {};
        const overrides = {};
        const features = details.features.split(','); // for example: popup=yes,left=270,top=14.5,width=1024,height=768
        for (const feature of features) {
            const [key, value] = feature.split('=');
            switch (key) {
                case 'width':
                    windowState.width = parseInt(value, 10);
                    break;
                case 'height':
                    windowState.height = parseInt(value, 10);
                    break;
                case 'left':
                    windowState.x = parseInt(value, 10);
                    break;
                case 'top':
                    windowState.y = parseInt(value, 10);
                    break;
                case 'window-maximized':
                    windowState.mode = 0 /* WindowMode.Maximized */;
                    break;
                case 'window-fullscreen':
                    windowState.mode = 3 /* WindowMode.Fullscreen */;
                    break;
                case 'window-disable-fullscreen':
                    overrides.disableFullscreen = true;
                    break;
                case 'window-native-titlebar':
                    overrides.forceNativeTitlebar = true;
                    break;
            }
        }
        const state = WindowStateValidator.validateWindowState(this.logService, windowState) ?? defaultAuxWindowState();
        this.logService.trace('[aux window] using window state', state);
        return { state, overrides };
    }
    registerWindow(webContents) {
        const disposables = new DisposableStore();
        const auxiliaryWindow = this.instantiationService.createInstance(AuxiliaryWindow, webContents);
        this.windows.set(auxiliaryWindow.id, auxiliaryWindow);
        disposables.add(toDisposable(() => this.windows.delete(auxiliaryWindow.id)));
        disposables.add(auxiliaryWindow.onDidMaximize(() => this._onDidMaximizeWindow.fire(auxiliaryWindow)));
        disposables.add(auxiliaryWindow.onDidUnmaximize(() => this._onDidUnmaximizeWindow.fire(auxiliaryWindow)));
        disposables.add(auxiliaryWindow.onDidEnterFullScreen(() => this._onDidChangeFullScreen.fire({ window: auxiliaryWindow, fullscreen: true })));
        disposables.add(auxiliaryWindow.onDidLeaveFullScreen(() => this._onDidChangeFullScreen.fire({ window: auxiliaryWindow, fullscreen: false })));
        disposables.add(auxiliaryWindow.onDidTriggerSystemContextMenu(({ x, y }) => this._onDidTriggerSystemContextMenu.fire({ window: auxiliaryWindow, x, y })));
        Event.once(auxiliaryWindow.onDidClose)(() => disposables.dispose());
    }
    getWindowByWebContents(webContents) {
        const window = this.windows.get(webContents.id);
        return window?.matches(webContents) ? window : undefined;
    }
    getFocusedWindow() {
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
            return this.getWindowByWebContents(window.webContents);
        }
        return undefined;
    }
    getLastActiveWindow() {
        return getLastFocused(Array.from(this.windows.values()));
    }
    getWindows() {
        return Array.from(this.windows.values());
    }
};
AuxiliaryWindowsMainService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService)
], AuxiliaryWindowsMainService);
export { AuxiliaryWindowsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93c01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2F1eGlsaWFyeVdpbmRvdy9lbGVjdHJvbi1tYWluL2F1eGlsaWFyeVdpbmRvd3NNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFnRSxHQUFHLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDNUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSxzQkFBc0IsQ0FBQztBQUV6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUE0QixxQkFBcUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZHLE9BQU8sRUFBeUMsb0JBQW9CLEVBQUUsMkJBQTJCLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFM0osSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBa0IxRCxZQUN3QixvQkFBNEQsRUFDdEUsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUM7UUFIZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtR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