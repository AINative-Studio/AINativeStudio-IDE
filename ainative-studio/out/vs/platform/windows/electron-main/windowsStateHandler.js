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
var WindowsStateHandler_1;
import electron from 'electron';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IStateService } from '../../state/node/state.js';
import { IWindowsMainService } from './windows.js';
import { defaultWindowState } from '../../window/electron-main/window.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier } from '../../workspace/common/workspace.js';
let WindowsStateHandler = class WindowsStateHandler extends Disposable {
    static { WindowsStateHandler_1 = this; }
    static { this.windowsStateStorageKey = 'windowsState'; }
    get state() { return this._state; }
    constructor(windowsMainService, stateService, lifecycleMainService, logService, configurationService) {
        super();
        this.windowsMainService = windowsMainService;
        this.stateService = stateService;
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.lastClosedState = undefined;
        this.shuttingDown = false;
        this._state = restoreWindowsState(this.stateService.getItem(WindowsStateHandler_1.windowsStateStorageKey));
        this.registerListeners();
    }
    registerListeners() {
        // When a window looses focus, save all windows state. This allows to
        // prevent loss of window-state data when OS is restarted without properly
        // shutting down the application (https://github.com/microsoft/vscode/issues/87171)
        electron.app.on('browser-window-blur', () => {
            if (!this.shuttingDown) {
                this.saveWindowsState();
            }
        });
        // Handle various lifecycle events around windows
        this._register(this.lifecycleMainService.onBeforeCloseWindow(window => this.onBeforeCloseWindow(window)));
        this._register(this.lifecycleMainService.onBeforeShutdown(() => this.onBeforeShutdown()));
        this._register(this.windowsMainService.onDidChangeWindowsCount(e => {
            if (e.newCount - e.oldCount > 0) {
                // clear last closed window state when a new window opens. this helps on macOS where
                // otherwise closing the last window, opening a new window and then quitting would
                // use the state of the previously closed window when restarting.
                this.lastClosedState = undefined;
            }
        }));
        // try to save state before destroy because close will not fire
        this._register(this.windowsMainService.onDidDestroyWindow(window => this.onBeforeCloseWindow(window)));
    }
    // Note that onBeforeShutdown() and onBeforeCloseWindow() are fired in different order depending on the OS:
    // - macOS: since the app will not quit when closing the last window, you will always first get
    //          the onBeforeShutdown() event followed by N onBeforeCloseWindow() events for each window
    // - other: on other OS, closing the last window will quit the app so the order depends on the
    //          user interaction: closing the last window will first trigger onBeforeCloseWindow()
    //          and then onBeforeShutdown(). Using the quit action however will first issue onBeforeShutdown()
    //          and then onBeforeCloseWindow().
    //
    // Here is the behavior on different OS depending on action taken (Electron 1.7.x):
    //
    // Legend
    // -  quit(N): quit application with N windows opened
    // - close(1): close one window via the window close button
    // - closeAll: close all windows via the taskbar command
    // - onBeforeShutdown(N): number of windows reported in this event handler
    // - onBeforeCloseWindow(N, M): number of windows reported and quitRequested boolean in this event handler
    //
    // macOS
    // 	-     quit(1): onBeforeShutdown(1), onBeforeCloseWindow(1, true)
    // 	-     quit(2): onBeforeShutdown(2), onBeforeCloseWindow(2, true), onBeforeCloseWindow(2, true)
    // 	-     quit(0): onBeforeShutdown(0)
    // 	-    close(1): onBeforeCloseWindow(1, false)
    //
    // Windows
    // 	-     quit(1): onBeforeShutdown(1), onBeforeCloseWindow(1, true)
    // 	-     quit(2): onBeforeShutdown(2), onBeforeCloseWindow(2, true), onBeforeCloseWindow(2, true)
    // 	-    close(1): onBeforeCloseWindow(2, false)[not last window]
    // 	-    close(1): onBeforeCloseWindow(1, false), onBeforeShutdown(0)[last window]
    // 	- closeAll(2): onBeforeCloseWindow(2, false), onBeforeCloseWindow(2, false), onBeforeShutdown(0)
    //
    // Linux
    // 	-     quit(1): onBeforeShutdown(1), onBeforeCloseWindow(1, true)
    // 	-     quit(2): onBeforeShutdown(2), onBeforeCloseWindow(2, true), onBeforeCloseWindow(2, true)
    // 	-    close(1): onBeforeCloseWindow(2, false)[not last window]
    // 	-    close(1): onBeforeCloseWindow(1, false), onBeforeShutdown(0)[last window]
    // 	- closeAll(2): onBeforeCloseWindow(2, false), onBeforeCloseWindow(2, false), onBeforeShutdown(0)
    //
    onBeforeShutdown() {
        this.shuttingDown = true;
        this.saveWindowsState();
    }
    saveWindowsState() {
        // TODO@electron workaround for Electron not being able to restore
        // multiple (native) fullscreen windows on the same display at once
        // on macOS.
        // https://github.com/electron/electron/issues/34367
        const displaysWithFullScreenWindow = new Set();
        const currentWindowsState = {
            openedWindows: [],
            lastPluginDevelopmentHostWindow: this._state.lastPluginDevelopmentHostWindow,
            lastActiveWindow: this.lastClosedState
        };
        // 1.) Find a last active window (pick any other first window otherwise)
        if (!currentWindowsState.lastActiveWindow) {
            let activeWindow = this.windowsMainService.getLastActiveWindow();
            if (!activeWindow || activeWindow.isExtensionDevelopmentHost) {
                activeWindow = this.windowsMainService.getWindows().find(window => !window.isExtensionDevelopmentHost);
            }
            if (activeWindow) {
                currentWindowsState.lastActiveWindow = this.toWindowState(activeWindow);
                if (currentWindowsState.lastActiveWindow.uiState.mode === 3 /* WindowMode.Fullscreen */) {
                    displaysWithFullScreenWindow.add(currentWindowsState.lastActiveWindow.uiState.display); // always allow fullscreen for active window
                }
            }
        }
        // 2.) Find extension host window
        const extensionHostWindow = this.windowsMainService.getWindows().find(window => window.isExtensionDevelopmentHost && !window.isExtensionTestHost);
        if (extensionHostWindow) {
            currentWindowsState.lastPluginDevelopmentHostWindow = this.toWindowState(extensionHostWindow);
            if (currentWindowsState.lastPluginDevelopmentHostWindow.uiState.mode === 3 /* WindowMode.Fullscreen */) {
                if (displaysWithFullScreenWindow.has(currentWindowsState.lastPluginDevelopmentHostWindow.uiState.display)) {
                    if (isMacintosh && !extensionHostWindow.win?.isSimpleFullScreen()) {
                        currentWindowsState.lastPluginDevelopmentHostWindow.uiState.mode = 1 /* WindowMode.Normal */;
                    }
                }
                else {
                    displaysWithFullScreenWindow.add(currentWindowsState.lastPluginDevelopmentHostWindow.uiState.display);
                }
            }
        }
        // 3.) All windows (except extension host) for N >= 2 to support `restoreWindows: all` or for auto update
        //
        // Careful here: asking a window for its window state after it has been closed returns bogus values (width: 0, height: 0)
        // so if we ever want to persist the UI state of the last closed window (window count === 1), it has
        // to come from the stored lastClosedWindowState on Win/Linux at least
        if (this.windowsMainService.getWindowCount() > 1) {
            currentWindowsState.openedWindows = this.windowsMainService.getWindows().filter(window => !window.isExtensionDevelopmentHost).map(window => {
                const windowState = this.toWindowState(window);
                if (windowState.uiState.mode === 3 /* WindowMode.Fullscreen */) {
                    if (displaysWithFullScreenWindow.has(windowState.uiState.display)) {
                        if (isMacintosh && windowState.windowId !== currentWindowsState.lastActiveWindow?.windowId && !window.win?.isSimpleFullScreen()) {
                            windowState.uiState.mode = 1 /* WindowMode.Normal */;
                        }
                    }
                    else {
                        displaysWithFullScreenWindow.add(windowState.uiState.display);
                    }
                }
                return windowState;
            });
        }
        // Persist
        const state = getWindowsStateStoreData(currentWindowsState);
        this.stateService.setItem(WindowsStateHandler_1.windowsStateStorageKey, state);
        if (this.shuttingDown) {
            this.logService.trace('[WindowsStateHandler] onBeforeShutdown', state);
        }
    }
    // See note on #onBeforeShutdown() for details how these events are flowing
    onBeforeCloseWindow(window) {
        if (this.lifecycleMainService.quitRequested) {
            return; // during quit, many windows close in parallel so let it be handled in the before-quit handler
        }
        // On Window close, update our stored UI state of this window
        const state = this.toWindowState(window);
        if (window.isExtensionDevelopmentHost && !window.isExtensionTestHost) {
            this._state.lastPluginDevelopmentHostWindow = state; // do not let test run window state overwrite our extension development state
        }
        // Any non extension host window with same workspace or folder
        else if (!window.isExtensionDevelopmentHost && window.openedWorkspace) {
            this._state.openedWindows.forEach(openedWindow => {
                const sameWorkspace = isWorkspaceIdentifier(window.openedWorkspace) && openedWindow.workspace?.id === window.openedWorkspace.id;
                const sameFolder = isSingleFolderWorkspaceIdentifier(window.openedWorkspace) && openedWindow.folderUri && extUriBiasedIgnorePathCase.isEqual(openedWindow.folderUri, window.openedWorkspace.uri);
                if (sameWorkspace || sameFolder) {
                    openedWindow.uiState = state.uiState;
                }
            });
        }
        // On Windows and Linux closing the last window will trigger quit. Since we are storing all UI state
        // before quitting, we need to remember the UI state of this window to be able to persist it.
        // On macOS we keep the last closed window state ready in case the user wants to quit right after or
        // wants to open another window, in which case we use this state over the persisted one.
        if (this.windowsMainService.getWindowCount() === 1) {
            this.lastClosedState = state;
        }
    }
    toWindowState(window) {
        return {
            windowId: window.id,
            workspace: isWorkspaceIdentifier(window.openedWorkspace) ? window.openedWorkspace : undefined,
            folderUri: isSingleFolderWorkspaceIdentifier(window.openedWorkspace) ? window.openedWorkspace.uri : undefined,
            backupPath: window.backupPath,
            remoteAuthority: window.remoteAuthority,
            uiState: window.serializeWindowState()
        };
    }
    getNewWindowState(configuration) {
        const state = this.doGetNewWindowState(configuration);
        const windowConfig = this.configurationService.getValue('window');
        // Fullscreen state gets special treatment
        if (state.mode === 3 /* WindowMode.Fullscreen */) {
            // Window state is not from a previous session: only allow fullscreen if we inherit it or user wants fullscreen
            let allowFullscreen;
            if (state.hasDefaultState) {
                allowFullscreen = !!(windowConfig?.newWindowDimensions && ['fullscreen', 'inherit', 'offset'].indexOf(windowConfig.newWindowDimensions) >= 0);
            }
            // Window state is from a previous session: only allow fullscreen when we got updated or user wants to restore
            else {
                allowFullscreen = !!(this.lifecycleMainService.wasRestarted || windowConfig?.restoreFullscreen);
            }
            if (!allowFullscreen) {
                state.mode = 1 /* WindowMode.Normal */;
            }
        }
        return state;
    }
    doGetNewWindowState(configuration) {
        const lastActive = this.windowsMainService.getLastActiveWindow();
        // Restore state unless we are running extension tests
        if (!configuration.extensionTestsPath) {
            // extension development host Window - load from stored settings if any
            if (!!configuration.extensionDevelopmentPath && this.state.lastPluginDevelopmentHostWindow) {
                return this.state.lastPluginDevelopmentHostWindow.uiState;
            }
            // Known Workspace - load from stored settings
            const workspace = configuration.workspace;
            if (isWorkspaceIdentifier(workspace)) {
                const stateForWorkspace = this.state.openedWindows.filter(openedWindow => openedWindow.workspace && openedWindow.workspace.id === workspace.id).map(openedWindow => openedWindow.uiState);
                if (stateForWorkspace.length) {
                    return stateForWorkspace[0];
                }
            }
            // Known Folder - load from stored settings
            if (isSingleFolderWorkspaceIdentifier(workspace)) {
                const stateForFolder = this.state.openedWindows.filter(openedWindow => openedWindow.folderUri && extUriBiasedIgnorePathCase.isEqual(openedWindow.folderUri, workspace.uri)).map(openedWindow => openedWindow.uiState);
                if (stateForFolder.length) {
                    return stateForFolder[0];
                }
            }
            // Empty windows with backups
            else if (configuration.backupPath) {
                const stateForEmptyWindow = this.state.openedWindows.filter(openedWindow => openedWindow.backupPath === configuration.backupPath).map(openedWindow => openedWindow.uiState);
                if (stateForEmptyWindow.length) {
                    return stateForEmptyWindow[0];
                }
            }
            // First Window
            const lastActiveState = this.lastClosedState || this.state.lastActiveWindow;
            if (!lastActive && lastActiveState) {
                return lastActiveState.uiState;
            }
        }
        //
        // In any other case, we do not have any stored settings for the window state, so we come up with something smart
        //
        // We want the new window to open on the same display that the last active one is in
        let displayToUse;
        const displays = electron.screen.getAllDisplays();
        // Single Display
        if (displays.length === 1) {
            displayToUse = displays[0];
        }
        // Multi Display
        else {
            // on mac there is 1 menu per window so we need to use the monitor where the cursor currently is
            if (isMacintosh) {
                const cursorPoint = electron.screen.getCursorScreenPoint();
                displayToUse = electron.screen.getDisplayNearestPoint(cursorPoint);
            }
            // if we have a last active window, use that display for the new window
            if (!displayToUse && lastActive) {
                displayToUse = electron.screen.getDisplayMatching(lastActive.getBounds());
            }
            // fallback to primary display or first display
            if (!displayToUse) {
                displayToUse = electron.screen.getPrimaryDisplay() || displays[0];
            }
        }
        // Compute x/y based on display bounds
        // Note: important to use Math.round() because Electron does not seem to be too happy about
        // display coordinates that are not absolute numbers.
        let state = defaultWindowState();
        state.x = Math.round(displayToUse.bounds.x + (displayToUse.bounds.width / 2) - (state.width / 2));
        state.y = Math.round(displayToUse.bounds.y + (displayToUse.bounds.height / 2) - (state.height / 2));
        // Check for newWindowDimensions setting and adjust accordingly
        const windowConfig = this.configurationService.getValue('window');
        let ensureNoOverlap = true;
        if (windowConfig?.newWindowDimensions) {
            if (windowConfig.newWindowDimensions === 'maximized') {
                state.mode = 0 /* WindowMode.Maximized */;
                ensureNoOverlap = false;
            }
            else if (windowConfig.newWindowDimensions === 'fullscreen') {
                state.mode = 3 /* WindowMode.Fullscreen */;
                ensureNoOverlap = false;
            }
            else if ((windowConfig.newWindowDimensions === 'inherit' || windowConfig.newWindowDimensions === 'offset') && lastActive) {
                const lastActiveState = lastActive.serializeWindowState();
                if (lastActiveState.mode === 3 /* WindowMode.Fullscreen */) {
                    state.mode = 3 /* WindowMode.Fullscreen */; // only take mode (fixes https://github.com/microsoft/vscode/issues/19331)
                }
                else {
                    state = {
                        ...lastActiveState,
                        zoomLevel: undefined // do not inherit zoom level
                    };
                }
                ensureNoOverlap = state.mode !== 3 /* WindowMode.Fullscreen */ && windowConfig.newWindowDimensions === 'offset';
            }
        }
        if (ensureNoOverlap) {
            state = this.ensureNoOverlap(state);
        }
        state.hasDefaultState = true; // flag as default state
        return state;
    }
    ensureNoOverlap(state) {
        if (this.windowsMainService.getWindows().length === 0) {
            return state;
        }
        state.x = typeof state.x === 'number' ? state.x : 0;
        state.y = typeof state.y === 'number' ? state.y : 0;
        const existingWindowBounds = this.windowsMainService.getWindows().map(window => window.getBounds());
        while (existingWindowBounds.some(bounds => bounds.x === state.x || bounds.y === state.y)) {
            state.x += 30;
            state.y += 30;
        }
        return state;
    }
};
WindowsStateHandler = WindowsStateHandler_1 = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IStateService),
    __param(2, ILifecycleMainService),
    __param(3, ILogService),
    __param(4, IConfigurationService)
], WindowsStateHandler);
export { WindowsStateHandler };
export function restoreWindowsState(data) {
    const result = { openedWindows: [] };
    const windowsState = data || { openedWindows: [] };
    if (windowsState.lastActiveWindow) {
        result.lastActiveWindow = restoreWindowState(windowsState.lastActiveWindow);
    }
    if (windowsState.lastPluginDevelopmentHostWindow) {
        result.lastPluginDevelopmentHostWindow = restoreWindowState(windowsState.lastPluginDevelopmentHostWindow);
    }
    if (Array.isArray(windowsState.openedWindows)) {
        result.openedWindows = windowsState.openedWindows.map(windowState => restoreWindowState(windowState));
    }
    return result;
}
function restoreWindowState(windowState) {
    const result = { uiState: windowState.uiState };
    if (windowState.backupPath) {
        result.backupPath = windowState.backupPath;
    }
    if (windowState.remoteAuthority) {
        result.remoteAuthority = windowState.remoteAuthority;
    }
    if (windowState.folder) {
        result.folderUri = URI.parse(windowState.folder);
    }
    if (windowState.workspaceIdentifier) {
        result.workspace = { id: windowState.workspaceIdentifier.id, configPath: URI.parse(windowState.workspaceIdentifier.configURIPath) };
    }
    return result;
}
export function getWindowsStateStoreData(windowsState) {
    return {
        lastActiveWindow: windowsState.lastActiveWindow && serializeWindowState(windowsState.lastActiveWindow),
        lastPluginDevelopmentHostWindow: windowsState.lastPluginDevelopmentHostWindow && serializeWindowState(windowsState.lastPluginDevelopmentHostWindow),
        openedWindows: windowsState.openedWindows.map(ws => serializeWindowState(ws))
    };
}
function serializeWindowState(windowState) {
    return {
        workspaceIdentifier: windowState.workspace && { id: windowState.workspace.id, configURIPath: windowState.workspace.configPath.toString() },
        folder: windowState.folderUri && windowState.folderUri.toString(),
        backupPath: windowState.backupPath,
        remoteAuthority: windowState.remoteAuthority,
        uiState: windowState.uiState
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c1N0YXRlSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93aW5kb3dzL2VsZWN0cm9uLW1haW4vd2luZG93c1N0YXRlSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ25ELE9BQU8sRUFBRSxrQkFBa0IsRUFBMkQsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuSSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUscUJBQXFCLEVBQXdCLE1BQU0scUNBQXFDLENBQUM7QUFtQzlILElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTs7YUFFMUIsMkJBQXNCLEdBQUcsY0FBYyxBQUFqQixDQUFrQjtJQUVoRSxJQUFJLEtBQUssS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMs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