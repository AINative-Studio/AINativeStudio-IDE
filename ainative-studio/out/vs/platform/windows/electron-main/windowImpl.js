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
import electron from 'electron';
import { DeferredPromise, RunOnceScheduler, timeout, Delayer } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { getMarks, mark } from '../../../base/common/performance.js';
import { isBigSurOrNewer, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { release } from 'os';
import { IBackupMainService } from '../../backup/electron-main/backup.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { isLaunchedFromCli } from '../../environment/node/argvHelper.js';
import { IFileService } from '../../files/common/files.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IProtocolMainService } from '../../protocol/electron-main/protocol.js';
import { resolveMarketplaceHeaders } from '../../externalServices/common/marketplace.js';
import { IApplicationStorageMainService, IStorageMainService } from '../../storage/electron-main/storageMainService.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { getMenuBarVisibility, hasNativeTitlebar, useNativeFullScreen, useWindowControlsOverlay, DEFAULT_CUSTOM_TITLEBAR_HEIGHT } from '../../window/common/window.js';
import { defaultBrowserWindowOptions, getAllWindowsExcludingOffscreen, IWindowsMainService, WindowStateValidator } from './windows.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, toWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { defaultWindowState } from '../../window/electron-main/window.js';
import { IPolicyService } from '../../policy/common/policy.js';
import { IStateService } from '../../state/node/state.js';
import { IUserDataProfilesMainService } from '../../userDataProfile/electron-main/userDataProfile.js';
import { ILoggerMainService } from '../../log/electron-main/loggerService.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { errorHandler } from '../../../base/common/errors.js';
var ReadyState;
(function (ReadyState) {
    /**
     * This window has not loaded anything yet
     * and this is the initial state of every
     * window.
     */
    ReadyState[ReadyState["NONE"] = 0] = "NONE";
    /**
     * This window is navigating, either for the
     * first time or subsequent times.
     */
    ReadyState[ReadyState["NAVIGATING"] = 1] = "NAVIGATING";
    /**
     * This window has finished loading and is ready
     * to forward IPC requests to the web contents.
     */
    ReadyState[ReadyState["READY"] = 2] = "READY";
})(ReadyState || (ReadyState = {}));
export class BaseWindow extends Disposable {
    get lastFocusTime() { return this._lastFocusTime; }
    get win() { return this._win; }
    setWin(win, options) {
        this._win = win;
        // Window Events
        this._register(Event.fromNodeEventEmitter(win, 'maximize')(() => this._onDidMaximize.fire()));
        this._register(Event.fromNodeEventEmitter(win, 'unmaximize')(() => this._onDidUnmaximize.fire()));
        this._register(Event.fromNodeEventEmitter(win, 'closed')(() => {
            this._onDidClose.fire();
            this.dispose();
        }));
        this._register(Event.fromNodeEventEmitter(win, 'focus')(() => {
            this._lastFocusTime = Date.now();
        }));
        this._register(Event.fromNodeEventEmitter(this._win, 'enter-full-screen')(() => this._onDidEnterFullScreen.fire()));
        this._register(Event.fromNodeEventEmitter(this._win, 'leave-full-screen')(() => this._onDidLeaveFullScreen.fire()));
        // Sheet Offsets
        const useCustomTitleStyle = !hasNativeTitlebar(this.configurationService, options?.titleBarStyle === 'hidden' ? "custom" /* TitlebarStyle.CUSTOM */ : undefined /* unknown */);
        if (isMacintosh && useCustomTitleStyle) {
            win.setSheetOffset(isBigSurOrNewer(release()) ? 28 : 22); // offset dialogs by the height of the custom title bar if we have any
        }
        // Update the window controls immediately based on cached or default values
        if (useCustomTitleStyle && useWindowControlsOverlay(this.configurationService)) {
            const cachedWindowControlHeight = this.stateService.getItem((BaseWindow.windowControlHeightStateStorageKey));
            if (cachedWindowControlHeight) {
                this.updateWindowControls({ height: cachedWindowControlHeight });
            }
            else {
                this.updateWindowControls({ height: DEFAULT_CUSTOM_TITLEBAR_HEIGHT });
            }
        }
        // Windows Custom System Context Menu
        // See https://github.com/electron/electron/issues/24893
        //
        // The purpose of this is to allow for the context menu in the Windows Title Bar
        //
        // Currently, all mouse events in the title bar are captured by the OS
        // thus we need to capture them here with a window hook specific to Windows
        // and then forward them to the correct window.
        if (isWindows && useCustomTitleStyle) {
            const WM_INITMENU = 0x0116; // https://docs.microsoft.com/en-us/windows/win32/menurc/wm-initmenu
            // This sets up a listener for the window hook. This is a Windows-only API provided by electron.
            win.hookWindowMessage(WM_INITMENU, () => {
                const [x, y] = win.getPosition();
                const cursorPos = electron.screen.getCursorScreenPoint();
                const cx = cursorPos.x - x;
                const cy = cursorPos.y - y;
                // In some cases, show the default system context menu
                // 1) The mouse position is not within the title bar
                // 2) The mouse position is within the title bar, but over the app icon
                // We do not know the exact title bar height but we make an estimate based on window height
                const shouldTriggerDefaultSystemContextMenu = () => {
                    // Use the custom context menu when over the title bar, but not over the app icon
                    // The app icon is estimated to be 30px wide
                    // The title bar is estimated to be the max of 35px and 15% of the window height
                    if (cx > 30 && cy >= 0 && cy <= Math.max(win.getBounds().height * 0.15, 35)) {
                        return false;
                    }
                    return true;
                };
                if (!shouldTriggerDefaultSystemContextMenu()) {
                    // This is necessary to make sure the native system context menu does not show up.
                    win.setEnabled(false);
                    win.setEnabled(true);
                    this._onDidTriggerSystemContextMenu.fire({ x: cx, y: cy });
                }
                return 0;
            });
        }
        // Open devtools if instructed from command line args
        if (this.environmentMainService.args['open-devtools'] === true) {
            win.webContents.openDevTools();
        }
        // macOS: Window Fullscreen Transitions
        if (isMacintosh) {
            this._register(this.onDidEnterFullScreen(() => {
                this.joinNativeFullScreenTransition?.complete(true);
            }));
            this._register(this.onDidLeaveFullScreen(() => {
                this.joinNativeFullScreenTransition?.complete(true);
            }));
        }
    }
    constructor(configurationService, stateService, environmentMainService, logService) {
        super();
        this.configurationService = configurationService;
        this.stateService = stateService;
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        //#region Events
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        this._onDidMaximize = this._register(new Emitter());
        this.onDidMaximize = this._onDidMaximize.event;
        this._onDidUnmaximize = this._register(new Emitter());
        this.onDidUnmaximize = this._onDidUnmaximize.event;
        this._onDidTriggerSystemContextMenu = this._register(new Emitter());
        this.onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;
        this._onDidEnterFullScreen = this._register(new Emitter());
        this.onDidEnterFullScreen = this._onDidEnterFullScreen.event;
        this._onDidLeaveFullScreen = this._register(new Emitter());
        this.onDidLeaveFullScreen = this._onDidLeaveFullScreen.event;
        this._lastFocusTime = Date.now(); // window is shown on creation so take current time
        this._win = null;
        //#endregion
        //#region Fullscreen
        this.transientIsNativeFullScreen = undefined;
        this.joinNativeFullScreenTransition = undefined;
    }
    applyState(state, hasMultipleDisplays = electron.screen.getAllDisplays().length > 0) {
        // TODO@electron (Electron 4 regression): when running on multiple displays where the target display
        // to open the window has a larger resolution than the primary display, the window will not size
        // correctly unless we set the bounds again (https://github.com/microsoft/vscode/issues/74872)
        //
        // Extended to cover Windows as well as Mac (https://github.com/microsoft/vscode/issues/146499)
        //
        // However, when running with native tabs with multiple windows we cannot use this workaround
        // because there is a potential that the new window will be added as native tab instead of being
        // a window on its own. In that case calling setBounds() would cause https://github.com/microsoft/vscode/issues/75830
        const windowSettings = this.configurationService.getValue('window');
        const useNativeTabs = isMacintosh && windowSettings?.nativeTabs === true;
        if ((isMacintosh || isWindows) && hasMultipleDisplays && (!useNativeTabs || getAllWindowsExcludingOffscreen().length === 1)) {
            if ([state.width, state.height, state.x, state.y].every(value => typeof value === 'number')) {
                this._win?.setBounds({
                    width: state.width,
                    height: state.height,
                    x: state.x,
                    y: state.y
                });
            }
        }
        if (state.mode === 0 /* WindowMode.Maximized */ || state.mode === 3 /* WindowMode.Fullscreen */) {
            // this call may or may not show the window, depends
            // on the platform: currently on Windows and Linux will
            // show the window as active. To be on the safe side,
            // we show the window at the end of this block.
            this._win?.maximize();
            if (state.mode === 3 /* WindowMode.Fullscreen */) {
                this.setFullScreen(true, true);
            }
            // to reduce flicker from the default window size
            // to maximize or fullscreen, we only show after
            this._win?.show();
        }
    }
    setRepresentedFilename(filename) {
        if (isMacintosh) {
            this.win?.setRepresentedFilename(filename);
        }
        else {
            this.representedFilename = filename;
        }
    }
    getRepresentedFilename() {
        if (isMacintosh) {
            return this.win?.getRepresentedFilename();
        }
        return this.representedFilename;
    }
    setDocumentEdited(edited) {
        if (isMacintosh) {
            this.win?.setDocumentEdited(edited);
        }
        this.documentEdited = edited;
    }
    isDocumentEdited() {
        if (isMacintosh) {
            return Boolean(this.win?.isDocumentEdited());
        }
        return !!this.documentEdited;
    }
    focus(options) {
        if (isMacintosh && options?.force) {
            electron.app.focus({ steal: true });
        }
        const win = this.win;
        if (!win) {
            return;
        }
        if (win.isMinimized()) {
            win.restore();
        }
        win.focus();
    }
    //#region Window Control Overlays
    static { this.windowControlHeightStateStorageKey = 'windowControlHeight'; }
    updateWindowControls(options) {
        const win = this.win;
        if (!win) {
            return;
        }
        // Cache the height for speeds lookups on startup
        if (options.height) {
            this.stateService.setItem((CodeWindow.windowControlHeightStateStorageKey), options.height);
        }
        // Windows/Linux: update window controls via setTitleBarOverlay()
        if (!isMacintosh && useWindowControlsOverlay(this.configurationService)) {
            win.setTitleBarOverlay({
                color: options.backgroundColor?.trim() === '' ? undefined : options.backgroundColor,
                symbolColor: options.foregroundColor?.trim() === '' ? undefined : options.foregroundColor,
                height: options.height ? options.height - 1 : undefined // account for window border
            });
        }
        // macOS: update window controls via setWindowButtonPosition()
        else if (isMacintosh && options.height !== undefined) {
            // The traffic lights have a height of 12px. There's an invisible margin
            // of 2px at the top and bottom, and 1px on the left and right. Therefore,
            // the height for centering is 12px + 2 * 2px = 16px. When the position
            // is set, the horizontal margin is offset to ensure the distance between
            // the traffic lights and the window frame is equal in both directions.
            const offset = Math.floor((options.height - 16) / 2);
            if (!offset) {
                win.setWindowButtonPosition(null);
            }
            else {
                win.setWindowButtonPosition({ x: offset + 1, y: offset });
            }
        }
    }
    toggleFullScreen() {
        this.setFullScreen(!this.isFullScreen, false);
    }
    setFullScreen(fullscreen, fromRestore) {
        // Set fullscreen state
        if (useNativeFullScreen(this.configurationService)) {
            this.setNativeFullScreen(fullscreen, fromRestore);
        }
        else {
            this.setSimpleFullScreen(fullscreen);
        }
    }
    get isFullScreen() {
        if (isMacintosh && typeof this.transientIsNativeFullScreen === 'boolean') {
            return this.transientIsNativeFullScreen;
        }
        const win = this.win;
        const isFullScreen = win?.isFullScreen();
        const isSimpleFullScreen = win?.isSimpleFullScreen();
        return Boolean(isFullScreen || isSimpleFullScreen);
    }
    setNativeFullScreen(fullscreen, fromRestore) {
        const win = this.win;
        if (win?.isSimpleFullScreen()) {
            win?.setSimpleFullScreen(false);
        }
        this.doSetNativeFullScreen(fullscreen, fromRestore);
    }
    doSetNativeFullScreen(fullscreen, fromRestore) {
        if (isMacintosh) {
            // macOS: Electron windows report `false` for `isFullScreen()` for as long
            // as the fullscreen transition animation takes place. As such, we need to
            // listen to the transition events and carry around an intermediate state
            // for knowing if we are in fullscreen or not
            // Refs: https://github.com/electron/electron/issues/35360
            this.transientIsNativeFullScreen = fullscreen;
            const joinNativeFullScreenTransition = this.joinNativeFullScreenTransition = new DeferredPromise();
            (async () => {
                const transitioned = await Promise.race([
                    joinNativeFullScreenTransition.p,
                    timeout(10000).then(() => false)
                ]);
                if (this.joinNativeFullScreenTransition !== joinNativeFullScreenTransition) {
                    return; // another transition was requested later
                }
                this.transientIsNativeFullScreen = undefined;
                this.joinNativeFullScreenTransition = undefined;
                // There is one interesting gotcha on macOS: when you are opening a new
                // window from a fullscreen window, that new window will immediately
                // open fullscreen and emit the `enter-full-screen` event even before we
                // reach this method. In that case, we actually will timeout after 10s
                // for detecting the transition and as such it is important that we only
                // signal to leave fullscreen if the window reports as not being in fullscreen.
                if (!transitioned && fullscreen && fromRestore && this.win && !this.win.isFullScreen()) {
                    // We have seen requests for fullscreen failing eventually after some
                    // time, for example when an OS update was performed and windows restore.
                    // In those cases a user would find a window that is not in fullscreen
                    // but also does not show any custom titlebar (and thus window controls)
                    // because we think the window is in fullscreen.
                    //
                    // As a workaround in that case we emit a warning and leave fullscreen
                    // so that at least the window controls are back.
                    this.logService.warn('window: native macOS fullscreen transition did not happen within 10s from restoring');
                    this._onDidLeaveFullScreen.fire();
                }
            })();
        }
        const win = this.win;
        win?.setFullScreen(fullscreen);
    }
    setSimpleFullScreen(fullscreen) {
        const win = this.win;
        if (win?.isFullScreen()) {
            this.doSetNativeFullScreen(false, false);
        }
        win?.setSimpleFullScreen(fullscreen);
        win?.webContents.focus(); // workaround issue where focus is not going into window
    }
    dispose() {
        super.dispose();
        this._win = null; // Important to dereference the window object to allow for GC
    }
}
let CodeWindow = class CodeWindow extends BaseWindow {
    get id() { return this._id; }
    get backupPath() { return this._config?.backupPath; }
    get openedWorkspace() { return this._config?.workspace; }
    get profile() {
        if (!this.config) {
            return undefined;
        }
        const profile = this.userDataProfilesService.profiles.find(profile => profile.id === this.config?.profiles.profile.id);
        if (this.isExtensionDevelopmentHost && profile) {
            return profile;
        }
        return this.userDataProfilesService.getProfileForWorkspace(this.config.workspace ?? toWorkspaceIdentifier(this.backupPath, this.isExtensionDevelopmentHost)) ?? this.userDataProfilesService.defaultProfile;
    }
    get remoteAuthority() { return this._config?.remoteAuthority; }
    get config() { return this._config; }
    get isExtensionDevelopmentHost() { return !!(this._config?.extensionDevelopmentPath); }
    get isExtensionTestHost() { return !!(this._config?.extensionTestsPath); }
    get isExtensionDevelopmentTestFromCli() { return this.isExtensionDevelopmentHost && this.isExtensionTestHost && !this._config?.debugId; }
    constructor(config, logService, loggerMainService, environmentMainService, policyService, userDataProfilesService, fileService, applicationStorageMainService, storageMainService, configurationService, themeMainService, workspacesManagementMainService, backupMainService, telemetryService, dialogMainService, lifecycleMainService, productService, protocolMainService, windowsMainService, stateService, instantiationService) {
        super(configurationService, stateService, environmentMainService, logService);
        this.loggerMainService = loggerMainService;
        this.policyService = policyService;
        this.userDataProfilesService = userDataProfilesService;
        this.fileService = fileService;
        this.applicationStorageMainService = applicationStorageMainService;
        this.storageMainService = storageMainService;
        this.themeMainService = themeMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.backupMainService = backupMainService;
        this.telemetryService = telemetryService;
        this.dialogMainService = dialogMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.productService = productService;
        this.windowsMainService = windowsMainService;
        //#region Events
        this._onWillLoad = this._register(new Emitter());
        this.onWillLoad = this._onWillLoad.event;
        this._onDidSignalReady = this._register(new Emitter());
        this.onDidSignalReady = this._onDidSignalReady.event;
        this._onDidDestroy = this._register(new Emitter());
        this.onDidDestroy = this._onDidDestroy.event;
        this.whenReadyCallbacks = [];
        this.touchBarGroups = [];
        this.currentHttpProxy = undefined;
        this.currentNoProxy = undefined;
        this.customZoomLevel = undefined;
        this.wasLoaded = false;
        this.readyState = 0 /* ReadyState.NONE */;
        //#region create browser window
        {
            this.configObjectUrl = this._register(protocolMainService.createIPCObjectUrl());
            // Load window state
            const [state, hasMultipleDisplays] = this.restoreWindowState(config.state);
            this.windowState = state;
            this.logService.trace('window#ctor: using window state', state);
            const options = instantiationService.invokeFunction(defaultBrowserWindowOptions, this.windowState, undefined, {
                preload: FileAccess.asFileUri('vs/base/parts/sandbox/electron-sandbox/preload.js').fsPath,
                additionalArguments: [`--vscode-window-config=${this.configObjectUrl.resource.toString()}`],
                v8CacheOptions: this.environmentMainService.useCodeCache ? 'bypassHeatCheck' : 'none',
            });
            // Create the browser window
            mark('code/willCreateCodeBrowserWindow');
            this._win = new electron.BrowserWindow(options);
            mark('code/didCreateCodeBrowserWindow');
            this._id = this._win.id;
            this.setWin(this._win, options);
            // Apply some state after window creation
            this.applyState(this.windowState, hasMultipleDisplays);
            this._lastFocusTime = Date.now(); // since we show directly, we need to set the last focus time too
        }
        //#endregion
        //#region JS Callstack Collector
        let sampleInterval = parseInt(this.environmentMainService.args['unresponsive-sample-interval'] || '1000');
        let samplePeriod = parseInt(this.environmentMainService.args['unresponsive-sample-period'] || '15000');
        if (sampleInterval <= 0 || samplePeriod <= 0 || sampleInterval > samplePeriod) {
            this.logService.warn(`Invalid unresponsive sample interval (${sampleInterval}ms) or period (${samplePeriod}ms), using defaults.`);
            sampleInterval = 1000;
            samplePeriod = 15000;
        }
        this.jsCallStackMap = new Map();
        this.jsCallStackEffectiveSampleCount = Math.round(sampleInterval / samplePeriod);
        this.jsCallStackCollector = this._register(new Delayer(sampleInterval));
        this.jsCallStackCollectorStopScheduler = this._register(new RunOnceScheduler(() => {
            this.stopCollectingJScallStacks(); // Stop collecting after 15s max
        }, samplePeriod));
        //#endregion
        // respect configured menu bar visibility
        this.onConfigurationUpdated();
        // macOS: touch bar support
        this.createTouchBar();
        // Eventing
        this.registerListeners();
    }
    setReady() {
        this.logService.trace(`window#load: window reported ready (id: ${this._id})`);
        this.readyState = 2 /* ReadyState.READY */;
        // inform all waiting promises that we are ready now
        while (this.whenReadyCallbacks.length) {
            this.whenReadyCallbacks.pop()(this);
        }
        // Events
        this._onDidSignalReady.fire();
    }
    ready() {
        return new Promise(resolve => {
            if (this.isReady) {
                return resolve(this);
            }
            // otherwise keep and call later when we are ready
            this.whenReadyCallbacks.push(resolve);
        });
    }
    get isReady() {
        return this.readyState === 2 /* ReadyState.READY */;
    }
    get whenClosedOrLoaded() {
        return new Promise(resolve => {
            function handle() {
                closeListener.dispose();
                loadListener.dispose();
                resolve();
            }
            const closeListener = this.onDidClose(() => handle());
            const loadListener = this.onWillLoad(() => handle());
        });
    }
    registerListeners() {
        // Window error conditions to handle
        this._register(Event.fromNodeEventEmitter(this._win, 'unresponsive')(() => this.onWindowError(1 /* WindowError.UNRESPONSIVE */)));
        this._register(Event.fromNodeEventEmitter(this._win, 'responsive')(() => this.onWindowError(4 /* WindowError.RESPONSIVE */)));
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'render-process-gone', (event, details) => details)(details => this.onWindowError(2 /* WindowError.PROCESS_GONE */, { ...details })));
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'did-fail-load', (event, exitCode, reason) => ({ exitCode, reason }))(({ exitCode, reason }) => this.onWindowError(3 /* WindowError.LOAD */, { reason, exitCode })));
        // Prevent windows/iframes from blocking the unload
        // through DOM events. We have our own logic for
        // unloading a window that should not be confused
        // with the DOM way.
        // (https://github.com/microsoft/vscode/issues/122736)
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'will-prevent-unload')(event => event.preventDefault()));
        // Remember that we loaded
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'did-finish-load')(() => {
            // Associate properties from the load request if provided
            if (this.pendingLoadConfig) {
                this._config = this.pendingLoadConfig;
                this.pendingLoadConfig = undefined;
            }
        }));
        // Window (Un)Maximize
        this._register(this.onDidMaximize(() => {
            if (this._config) {
                this._config.maximized = true;
            }
        }));
        this._register(this.onDidUnmaximize(() => {
            if (this._config) {
                this._config.maximized = false;
            }
        }));
        // Window Fullscreen
        this._register(this.onDidEnterFullScreen(() => {
            this.sendWhenReady('vscode:enterFullScreen', CancellationToken.None);
        }));
        this._register(this.onDidLeaveFullScreen(() => {
            this.sendWhenReady('vscode:leaveFullScreen', CancellationToken.None);
        }));
        // Handle configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
        // Handle Workspace events
        this._register(this.workspacesManagementMainService.onDidDeleteUntitledWorkspace(e => this.onDidDeleteUntitledWorkspace(e)));
        // Inject headers when requests are incoming
        const urls = ['https://marketplace.visualstudio.com/*', 'https://*.vsassets.io/*'];
        this._win.webContents.session.webRequest.onBeforeSendHeaders({ urls }, async (details, cb) => {
            const headers = await this.getMarketplaceHeaders();
            cb({ cancel: false, requestHeaders: Object.assign(details.requestHeaders, headers) });
        });
    }
    getMarketplaceHeaders() {
        if (!this.marketplaceHeadersPromise) {
            this.marketplaceHeadersPromise = resolveMarketplaceHeaders(this.productService.version, this.productService, this.environmentMainService, this.configurationService, this.fileService, this.applicationStorageMainService, this.telemetryService);
        }
        return this.marketplaceHeadersPromise;
    }
    async onWindowError(type, details) {
        switch (type) {
            case 2 /* WindowError.PROCESS_GONE */:
                this.logService.error(`CodeWindow: renderer process gone (reason: ${details?.reason || '<unknown>'}, code: ${details?.exitCode || '<unknown>'})`);
                break;
            case 1 /* WindowError.UNRESPONSIVE */:
                this.logService.error('CodeWindow: detected unresponsive');
                break;
            case 4 /* WindowError.RESPONSIVE */:
                this.logService.error('CodeWindow: recovered from unresponsive');
                break;
            case 3 /* WindowError.LOAD */:
                this.logService.error(`CodeWindow: failed to load (reason: ${details?.reason || '<unknown>'}, code: ${details?.exitCode || '<unknown>'})`);
                break;
        }
        this.telemetryService.publicLog2('windowerror', {
            type,
            reason: details?.reason,
            code: details?.exitCode
        });
        // Inform User if non-recoverable
        switch (type) {
            case 1 /* WindowError.UNRESPONSIVE */:
            case 2 /* WindowError.PROCESS_GONE */:
                // If we run extension tests from CLI, we want to signal
                // back this state to the test runner by exiting with a
                // non-zero exit code.
                if (this.isExtensionDevelopmentTestFromCli) {
                    this.lifecycleMainService.kill(1);
                    return;
                }
                // If we run smoke tests, want to proceed with an orderly
                // shutdown as much as possible by destroying the window
                // and then calling the normal `quit` routine.
                if (this.environmentMainService.args['enable-smoke-test-driver']) {
                    await this.destroyWindow(false, false);
                    this.lifecycleMainService.quit(); // still allow for an orderly shutdown
                    return;
                }
                // Unresponsive
                if (type === 1 /* WindowError.UNRESPONSIVE */) {
                    if (this.isExtensionDevelopmentHost || this.isExtensionTestHost || (this._win && this._win.webContents && this._win.webContents.isDevToolsOpened())) {
                        // TODO@electron Workaround for https://github.com/microsoft/vscode/issues/56994
                        // In certain cases the window can report unresponsiveness because a breakpoint was hit
                        // and the process is stopped executing. The most typical cases are:
                        // - devtools are opened and debugging happens
                        // - window is an extensions development host that is being debugged
                        // - window is an extension test development host that is being debugged
                        return;
                    }
                    // Interrupt V8 and collect JavaScript stack
                    this.jsCallStackCollector.trigger(() => this.startCollectingJScallStacks());
                    // Stack collection will stop under any of the following conditions:
                    // - The window becomes responsive again
                    // - The window is destroyed i-e reopen or closed
                    // - sampling period is complete, default is 15s
                    this.jsCallStackCollectorStopScheduler.schedule();
                    // Show Dialog
                    const { response, checkboxChecked } = await this.dialogMainService.showMessageBox({
                        type: 'warning',
                        buttons: [
                            localize({ key: 'reopen', comment: ['&& denotes a mnemonic'] }, "&&Reopen"),
                            localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, "&&Close"),
                            localize({ key: 'wait', comment: ['&& denotes a mnemonic'] }, "&&Keep Waiting")
                        ],
                        message: localize('appStalled', "The window is not responding"),
                        detail: localize('appStalledDetail', "You can reopen or close the window or keep waiting."),
                        checkboxLabel: this._config?.workspace ? localize('doNotRestoreEditors', "Don't restore editors") : undefined
                    }, this._win);
                    // Handle choice
                    if (response !== 2 /* keep waiting */) {
                        const reopen = response === 0;
                        this.stopCollectingJScallStacks();
                        await this.destroyWindow(reopen, checkboxChecked);
                    }
                }
                // Process gone
                else if (type === 2 /* WindowError.PROCESS_GONE */) {
                    let message;
                    if (!details) {
                        message = localize('appGone', "The window terminated unexpectedly");
                    }
                    else {
                        message = localize('appGoneDetails', "The window terminated unexpectedly (reason: '{0}', code: '{1}')", details.reason, details.exitCode ?? '<unknown>');
                    }
                    // Show Dialog
                    const { response, checkboxChecked } = await this.dialogMainService.showMessageBox({
                        type: 'warning',
                        buttons: [
                            this._config?.workspace ? localize({ key: 'reopen', comment: ['&& denotes a mnemonic'] }, "&&Reopen") : localize({ key: 'newWindow', comment: ['&& denotes a mnemonic'] }, "&&New Window"),
                            localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, "&&Close")
                        ],
                        message,
                        detail: this._config?.workspace ?
                            localize('appGoneDetailWorkspace', "We are sorry for the inconvenience. You can reopen the window to continue where you left off.") :
                            localize('appGoneDetailEmptyWindow', "We are sorry for the inconvenience. You can open a new empty window to start again."),
                        checkboxLabel: this._config?.workspace ? localize('doNotRestoreEditors', "Don't restore editors") : undefined
                    }, this._win);
                    // Handle choice
                    const reopen = response === 0;
                    await this.destroyWindow(reopen, checkboxChecked);
                }
                break;
            case 4 /* WindowError.RESPONSIVE */:
                this.stopCollectingJScallStacks();
                break;
        }
    }
    async destroyWindow(reopen, skipRestoreEditors) {
        const workspace = this._config?.workspace;
        // check to discard editor state first
        if (skipRestoreEditors && workspace) {
            try {
                const workspaceStorage = this.storageMainService.workspaceStorage(workspace);
                await workspaceStorage.init();
                workspaceStorage.delete('memento/workbench.parts.editor');
                await workspaceStorage.close();
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        // 'close' event will not be fired on destroy(), so signal crash via explicit event
        this._onDidDestroy.fire();
        try {
            // ask the windows service to open a new fresh window if specified
            if (reopen && this._config) {
                // We have to reconstruct a openable from the current workspace
                let uriToOpen = undefined;
                let forceEmpty = undefined;
                if (isSingleFolderWorkspaceIdentifier(workspace)) {
                    uriToOpen = { folderUri: workspace.uri };
                }
                else if (isWorkspaceIdentifier(workspace)) {
                    uriToOpen = { workspaceUri: workspace.configPath };
                }
                else {
                    forceEmpty = true;
                }
                // Delegate to windows service
                const window = (await this.windowsMainService.open({
                    context: 5 /* OpenContext.API */,
                    userEnv: this._config.userEnv,
                    cli: {
                        ...this.environmentMainService.args,
                        _: [] // we pass in the workspace to open explicitly via `urisToOpen`
                    },
                    urisToOpen: uriToOpen ? [uriToOpen] : undefined,
                    forceEmpty,
                    forceNewWindow: true,
                    remoteAuthority: this.remoteAuthority
                })).at(0);
                window?.focus();
            }
        }
        finally {
            // make sure to destroy the window as its renderer process is gone. do this
            // after the code for reopening the window, to prevent the entire application
            // from quitting when the last window closes as a result.
            this._win?.destroy();
        }
    }
    onDidDeleteUntitledWorkspace(workspace) {
        // Make sure to update our workspace config if we detect that it
        // was deleted
        if (this._config?.workspace?.id === workspace.id) {
            this._config.workspace = undefined;
        }
    }
    onConfigurationUpdated(e) {
        // Menubar
        if (!e || e.affectsConfiguration('window.menuBarVisibility')) {
            const newMenuBarVisibility = this.getMenuBarVisibility();
            if (newMenuBarVisibility !== this.currentMenuBarVisibility) {
                this.currentMenuBarVisibility = newMenuBarVisibility;
                this.setMenuBarVisibility(newMenuBarVisibility);
            }
        }
        // Proxy
        if (!e || e.affectsConfiguration('http.proxy') || e.affectsConfiguration('http.noProxy')) {
            const inspect = this.configurationService.inspect('http.proxy');
            let newHttpProxy = (inspect.userLocalValue || '').trim()
                || (process.env['https_proxy'] || process.env['HTTPS_PROXY'] || process.env['http_proxy'] || process.env['HTTP_PROXY'] || '').trim() // Not standardized.
                || undefined;
            if (newHttpProxy?.indexOf('@') !== -1) {
                const uri = URI.parse(newHttpProxy);
                const i = uri.authority.indexOf('@');
                if (i !== -1) {
                    newHttpProxy = uri.with({ authority: uri.authority.substring(i + 1) })
                        .toString();
                }
            }
            if (newHttpProxy?.endsWith('/')) {
                newHttpProxy = newHttpProxy.substr(0, newHttpProxy.length - 1);
            }
            const newNoProxy = (this.configurationService.getValue('http.noProxy') || []).map((item) => item.trim()).join(',')
                || (process.env['no_proxy'] || process.env['NO_PROXY'] || '').trim() || undefined; // Not standardized.
            if ((newHttpProxy || '').indexOf('@') === -1 && (newHttpProxy !== this.currentHttpProxy || newNoProxy !== this.currentNoProxy)) {
                this.currentHttpProxy = newHttpProxy;
                this.currentNoProxy = newNoProxy;
                const proxyRules = newHttpProxy || '';
                const proxyBypassRules = newNoProxy ? `${newNoProxy},<local>` : '<local>';
                this.logService.trace(`Setting proxy to '${proxyRules}', bypassing '${proxyBypassRules}'`);
                this._win.webContents.session.setProxy({ proxyRules, proxyBypassRules, pacScript: '' });
                electron.app.setProxy({ proxyRules, proxyBypassRules, pacScript: '' });
            }
        }
    }
    addTabbedWindow(window) {
        if (isMacintosh && window.win) {
            this._win.addTabbedWindow(window.win);
        }
    }
    load(configuration, options = Object.create(null)) {
        this.logService.trace(`window#load: attempt to load window (id: ${this._id})`);
        // Clear Document Edited if needed
        if (this.isDocumentEdited()) {
            if (!options.isReload || !this.backupMainService.isHotExitEnabled()) {
                this.setDocumentEdited(false);
            }
        }
        // Clear Title and Filename if needed
        if (!options.isReload) {
            if (this.getRepresentedFilename()) {
                this.setRepresentedFilename('');
            }
            this._win.setTitle(this.productService.nameLong);
        }
        // Update configuration values based on our window context
        // and set it into the config object URL for usage.
        this.updateConfiguration(configuration, options);
        // If this is the first time the window is loaded, we associate the paths
        // directly with the window because we assume the loading will just work
        if (this.readyState === 0 /* ReadyState.NONE */) {
            this._config = configuration;
        }
        // Otherwise, the window is currently showing a folder and if there is an
        // unload handler preventing the load, we cannot just associate the paths
        // because the loading might be vetoed. Instead we associate it later when
        // the window load event has fired.
        else {
            this.pendingLoadConfig = configuration;
        }
        // Indicate we are navigting now
        this.readyState = 1 /* ReadyState.NAVIGATING */;
        // Load URL
        this._win.loadURL(FileAccess.asBrowserUri(`vs/code/electron-sandbox/workbench/workbench${this.environmentMainService.isBuilt ? '' : '-dev'}.html`).toString(true));
        // Remember that we did load
        const wasLoaded = this.wasLoaded;
        this.wasLoaded = true;
        // Make window visible if it did not open in N seconds because this indicates an error
        // Only do this when running out of sources and not when running tests
        if (!this.environmentMainService.isBuilt && !this.environmentMainService.extensionTestsLocationURI) {
            this._register(new RunOnceScheduler(() => {
                if (this._win && !this._win.isVisible() && !this._win.isMinimized()) {
                    this._win.show();
                    this.focus({ force: true });
                    this._win.webContents.openDevTools();
                }
            }, 10000)).schedule();
        }
        // Event
        this._onWillLoad.fire({ workspace: configuration.workspace, reason: options.isReload ? 3 /* LoadReason.RELOAD */ : wasLoaded ? 2 /* LoadReason.LOAD */ : 1 /* LoadReason.INITIAL */ });
    }
    updateConfiguration(configuration, options) {
        // If this window was loaded before from the command line
        // (as indicated by VSCODE_CLI environment), make sure to
        // preserve that user environment in subsequent loads,
        // unless the new configuration context was also a CLI
        // (for https://github.com/microsoft/vscode/issues/108571)
        // Also, preserve the environment if we're loading from an
        // extension development host that had its environment set
        // (for https://github.com/microsoft/vscode/issues/123508)
        const currentUserEnv = (this._config ?? this.pendingLoadConfig)?.userEnv;
        if (currentUserEnv) {
            const shouldPreserveLaunchCliEnvironment = isLaunchedFromCli(currentUserEnv) && !isLaunchedFromCli(configuration.userEnv);
            const shouldPreserveDebugEnvironmnet = this.isExtensionDevelopmentHost;
            if (shouldPreserveLaunchCliEnvironment || shouldPreserveDebugEnvironmnet) {
                configuration.userEnv = { ...currentUserEnv, ...configuration.userEnv }; // still allow to override certain environment as passed in
            }
        }
        // If named pipe was instantiated for the crashpad_handler process, reuse the same
        // pipe for new app instances connecting to the original app instance.
        // Ref: https://github.com/microsoft/vscode/issues/115874
        if (process.env['CHROME_CRASHPAD_PIPE_NAME']) {
            Object.assign(configuration.userEnv, {
                CHROME_CRASHPAD_PIPE_NAME: process.env['CHROME_CRASHPAD_PIPE_NAME']
            });
        }
        // Add disable-extensions to the config, but do not preserve it on currentConfig or
        // pendingLoadConfig so that it is applied only on this load
        if (options.disableExtensions !== undefined) {
            configuration['disable-extensions'] = options.disableExtensions;
        }
        // Update window related properties
        try {
            configuration.handle = VSBuffer.wrap(this._win.getNativeWindowHandle());
        }
        catch (error) {
            this.logService.error(`Error getting native window handle: ${error}`);
        }
        configuration.fullscreen = this.isFullScreen;
        configuration.maximized = this._win.isMaximized();
        configuration.partsSplash = this.themeMainService.getWindowSplash(configuration.workspace);
        configuration.zoomLevel = this.getZoomLevel();
        configuration.isCustomZoomLevel = typeof this.customZoomLevel === 'number';
        if (configuration.isCustomZoomLevel && configuration.partsSplash) {
            configuration.partsSplash.zoomLevel = configuration.zoomLevel;
        }
        // Update with latest perf marks
        mark('code/willOpenNewWindow');
        configuration.perfMarks = getMarks();
        // Update in config object URL for usage in renderer
        this.configObjectUrl.update(configuration);
    }
    async reload(cli) {
        // Copy our current config for reuse
        const configuration = Object.assign({}, this._config);
        // Validate workspace
        configuration.workspace = await this.validateWorkspaceBeforeReload(configuration);
        // Delete some properties we do not want during reload
        delete configuration.filesToOpenOrCreate;
        delete configuration.filesToDiff;
        delete configuration.filesToMerge;
        delete configuration.filesToWait;
        // Some configuration things get inherited if the window is being reloaded and we are
        // in extension development mode. These options are all development related.
        if (this.isExtensionDevelopmentHost && cli) {
            configuration.verbose = cli.verbose;
            configuration.debugId = cli.debugId;
            configuration.extensionEnvironment = cli.extensionEnvironment;
            configuration['inspect-extensions'] = cli['inspect-extensions'];
            configuration['inspect-brk-extensions'] = cli['inspect-brk-extensions'];
            configuration['extensions-dir'] = cli['extensions-dir'];
        }
        configuration.accessibilitySupport = electron.app.isAccessibilitySupportEnabled();
        configuration.isInitialStartup = false; // since this is a reload
        configuration.policiesData = this.policyService.serialize(); // set policies data again
        configuration.continueOn = this.environmentMainService.continueOn;
        configuration.profiles = {
            all: this.userDataProfilesService.profiles,
            profile: this.profile || this.userDataProfilesService.defaultProfile,
            home: this.userDataProfilesService.profilesHome
        };
        configuration.logLevel = this.loggerMainService.getLogLevel();
        configuration.loggers = this.loggerMainService.getGlobalLoggers();
        // Load config
        this.load(configuration, { isReload: true, disableExtensions: cli?.['disable-extensions'] });
    }
    async validateWorkspaceBeforeReload(configuration) {
        // Multi folder
        if (isWorkspaceIdentifier(configuration.workspace)) {
            const configPath = configuration.workspace.configPath;
            if (configPath.scheme === Schemas.file) {
                const workspaceExists = await this.fileService.exists(configPath);
                if (!workspaceExists) {
                    return undefined;
                }
            }
        }
        // Single folder
        else if (isSingleFolderWorkspaceIdentifier(configuration.workspace)) {
            const uri = configuration.workspace.uri;
            if (uri.scheme === Schemas.file) {
                const folderExists = await this.fileService.exists(uri);
                if (!folderExists) {
                    return undefined;
                }
            }
        }
        // Workspace is valid
        return configuration.workspace;
    }
    serializeWindowState() {
        if (!this._win) {
            return defaultWindowState();
        }
        // fullscreen gets special treatment
        if (this.isFullScreen) {
            let display;
            try {
                display = electron.screen.getDisplayMatching(this.getBounds());
            }
            catch (error) {
                // Electron has weird conditions under which it throws errors
                // e.g. https://github.com/microsoft/vscode/issues/100334 when
                // large numbers are passed in
            }
            const defaultState = defaultWindowState();
            return {
                mode: 3 /* WindowMode.Fullscreen */,
                display: display ? display.id : undefined,
                // Still carry over window dimensions from previous sessions
                // if we can compute it in fullscreen state.
                // does not seem possible in all cases on Linux for example
                // (https://github.com/microsoft/vscode/issues/58218) so we
                // fallback to the defaults in that case.
                width: this.windowState.width || defaultState.width,
                height: this.windowState.height || defaultState.height,
                x: this.windowState.x || 0,
                y: this.windowState.y || 0,
                zoomLevel: this.customZoomLevel
            };
        }
        const state = Object.create(null);
        let mode;
        // get window mode
        if (!isMacintosh && this._win.isMaximized()) {
            mode = 0 /* WindowMode.Maximized */;
        }
        else {
            mode = 1 /* WindowMode.Normal */;
        }
        // we don't want to save minimized state, only maximized or normal
        if (mode === 0 /* WindowMode.Maximized */) {
            state.mode = 0 /* WindowMode.Maximized */;
        }
        else {
            state.mode = 1 /* WindowMode.Normal */;
        }
        // only consider non-minimized window states
        if (mode === 1 /* WindowMode.Normal */ || mode === 0 /* WindowMode.Maximized */) {
            let bounds;
            if (mode === 1 /* WindowMode.Normal */) {
                bounds = this.getBounds();
            }
            else {
                bounds = this._win.getNormalBounds(); // make sure to persist the normal bounds when maximized to be able to restore them
            }
            state.x = bounds.x;
            state.y = bounds.y;
            state.width = bounds.width;
            state.height = bounds.height;
        }
        state.zoomLevel = this.customZoomLevel;
        return state;
    }
    restoreWindowState(state) {
        mark('code/willRestoreCodeWindowState');
        let hasMultipleDisplays = false;
        if (state) {
            // Window zoom
            this.customZoomLevel = state.zoomLevel;
            // Window dimensions
            try {
                const displays = electron.screen.getAllDisplays();
                hasMultipleDisplays = displays.length > 1;
                state = WindowStateValidator.validateWindowState(this.logService, state, displays);
            }
            catch (err) {
                this.logService.warn(`Unexpected error validating window state: ${err}\n${err.stack}`); // somehow display API can be picky about the state to validate
            }
        }
        mark('code/didRestoreCodeWindowState');
        return [state || defaultWindowState(), hasMultipleDisplays];
    }
    getBounds() {
        const [x, y] = this._win.getPosition();
        const [width, height] = this._win.getSize();
        return { x, y, width, height };
    }
    setFullScreen(fullscreen, fromRestore) {
        super.setFullScreen(fullscreen, fromRestore);
        // Events
        this.sendWhenReady(fullscreen ? 'vscode:enterFullScreen' : 'vscode:leaveFullScreen', CancellationToken.None);
        // Respect configured menu bar visibility or default to toggle if not set
        if (this.currentMenuBarVisibility) {
            this.setMenuBarVisibility(this.currentMenuBarVisibility, false);
        }
    }
    getMenuBarVisibility() {
        let menuBarVisibility = getMenuBarVisibility(this.configurationService);
        if (['visible', 'toggle', 'hidden'].indexOf(menuBarVisibility) < 0) {
            menuBarVisibility = 'classic';
        }
        return menuBarVisibility;
    }
    setMenuBarVisibility(visibility, notify = true) {
        if (isMacintosh) {
            return; // ignore for macOS platform
        }
        if (visibility === 'toggle') {
            if (notify) {
                this.send('vscode:showInfoMessage', localize('hiddenMenuBar', "You can still access the menu bar by pressing the Alt-key."));
            }
        }
        if (visibility === 'hidden') {
            // for some weird reason that I have no explanation for, the menu bar is not hiding when calling
            // this without timeout (see https://github.com/microsoft/vscode/issues/19777). there seems to be
            // a timing issue with us opening the first window and the menu bar getting created. somehow the
            // fact that we want to hide the menu without being able to bring it back via Alt key makes Electron
            // still show the menu. Unable to reproduce from a simple Hello World application though...
            setTimeout(() => {
                this.doSetMenuBarVisibility(visibility);
            });
        }
        else {
            this.doSetMenuBarVisibility(visibility);
        }
    }
    doSetMenuBarVisibility(visibility) {
        const isFullscreen = this.isFullScreen;
        switch (visibility) {
            case ('classic'):
                this._win.setMenuBarVisibility(!isFullscreen);
                this._win.autoHideMenuBar = isFullscreen;
                break;
            case ('visible'):
                this._win.setMenuBarVisibility(true);
                this._win.autoHideMenuBar = false;
                break;
            case ('toggle'):
                this._win.setMenuBarVisibility(false);
                this._win.autoHideMenuBar = true;
                break;
            case ('hidden'):
                this._win.setMenuBarVisibility(false);
                this._win.autoHideMenuBar = false;
                break;
        }
    }
    notifyZoomLevel(zoomLevel) {
        this.customZoomLevel = zoomLevel;
    }
    getZoomLevel() {
        if (typeof this.customZoomLevel === 'number') {
            return this.customZoomLevel;
        }
        const windowSettings = this.configurationService.getValue('window');
        return windowSettings?.zoomLevel;
    }
    close() {
        this._win?.close();
    }
    sendWhenReady(channel, token, ...args) {
        if (this.isReady) {
            this.send(channel, ...args);
        }
        else {
            this.ready().then(() => {
                if (!token.isCancellationRequested) {
                    this.send(channel, ...args);
                }
            });
        }
    }
    send(channel, ...args) {
        if (this._win) {
            if (this._win.isDestroyed() || this._win.webContents.isDestroyed()) {
                this.logService.warn(`Sending IPC message to channel '${channel}' for window that is destroyed`);
                return;
            }
            try {
                this._win.webContents.send(channel, ...args);
            }
            catch (error) {
                this.logService.warn(`Error sending IPC message to channel '${channel}' of window ${this._id}: ${toErrorMessage(error)}`);
            }
        }
    }
    updateTouchBar(groups) {
        if (!isMacintosh) {
            return; // only supported on macOS
        }
        // Update segments for all groups. Setting the segments property
        // of the group directly prevents ugly flickering from happening
        this.touchBarGroups.forEach((touchBarGroup, index) => {
            const commands = groups[index];
            touchBarGroup.segments = this.createTouchBarGroupSegments(commands);
        });
    }
    createTouchBar() {
        if (!isMacintosh) {
            return; // only supported on macOS
        }
        // To avoid flickering, we try to reuse the touch bar group
        // as much as possible by creating a large number of groups
        // for reusing later.
        for (let i = 0; i < 10; i++) {
            const groupTouchBar = this.createTouchBarGroup();
            this.touchBarGroups.push(groupTouchBar);
        }
        this._win.setTouchBar(new electron.TouchBar({ items: this.touchBarGroups }));
    }
    createTouchBarGroup(items = []) {
        // Group Segments
        const segments = this.createTouchBarGroupSegments(items);
        // Group Control
        const control = new electron.TouchBar.TouchBarSegmentedControl({
            segments,
            mode: 'buttons',
            segmentStyle: 'automatic',
            change: (selectedIndex) => {
                this.sendWhenReady('vscode:runAction', CancellationToken.None, { id: control.segments[selectedIndex].id, from: 'touchbar' });
            }
        });
        return control;
    }
    createTouchBarGroupSegments(items = []) {
        const segments = items.map(item => {
            let icon;
            if (item.icon && !ThemeIcon.isThemeIcon(item.icon) && item.icon?.dark?.scheme === Schemas.file) {
                icon = electron.nativeImage.createFromPath(URI.revive(item.icon.dark).fsPath);
                if (icon.isEmpty()) {
                    icon = undefined;
                }
            }
            let title;
            if (typeof item.title === 'string') {
                title = item.title;
            }
            else {
                title = item.title.value;
            }
            return {
                id: item.id,
                label: !icon ? title : undefined,
                icon
            };
        });
        return segments;
    }
    async startCollectingJScallStacks() {
        if (!this.jsCallStackCollector.isTriggered()) {
            const stack = await this._win.webContents.mainFrame.collectJavaScriptCallStack();
            // Increment the count for this stack trace
            if (stack) {
                const count = this.jsCallStackMap.get(stack) || 0;
                this.jsCallStackMap.set(stack, count + 1);
            }
            this.jsCallStackCollector.trigger(() => this.startCollectingJScallStacks());
        }
    }
    stopCollectingJScallStacks() {
        this.jsCallStackCollectorStopScheduler.cancel();
        this.jsCallStackCollector.cancel();
        if (this.jsCallStackMap.size) {
            let logMessage = `CodeWindow unresponsive samples:\n`;
            let samples = 0;
            const sortedEntries = Array.from(this.jsCallStackMap.entries())
                .sort((a, b) => b[1] - a[1]);
            for (const [stack, count] of sortedEntries) {
                samples += count;
                // If the stack appears more than 20 percent of the time, log it
                // to the error telemetry as UnresponsiveSampleError.
                if (Math.round((count * 100) / this.jsCallStackEffectiveSampleCount) > 20) {
                    const fakeError = new UnresponsiveError(stack, this.id, this.win?.webContents.getOSProcessId());
                    errorHandler.onUnexpectedError(fakeError);
                }
                logMessage += `<${count}> ${stack}\n`;
            }
            logMessage += `Total Samples: ${samples}\n`;
            logMessage += 'For full overview of the unresponsive period, capture cpu profile via https://aka.ms/vscode-tracing-cpu-profile';
            this.logService.error(logMessage);
        }
        this.jsCallStackMap.clear();
    }
    matches(webContents) {
        return this._win?.webContents.id === webContents.id;
    }
    dispose() {
        super.dispose();
        // Deregister the loggers for this window
        this.loggerMainService.deregisterLoggers(this.id);
    }
};
CodeWindow = __decorate([
    __param(1, ILogService),
    __param(2, ILoggerMainService),
    __param(3, IEnvironmentMainService),
    __param(4, IPolicyService),
    __param(5, IUserDataProfilesMainService),
    __param(6, IFileService),
    __param(7, IApplicationStorageMainService),
    __param(8, IStorageMainService),
    __param(9, IConfigurationService),
    __param(10, IThemeMainService),
    __param(11, IWorkspacesManagementMainService),
    __param(12, IBackupMainService),
    __param(13, ITelemetryService),
    __param(14, IDialogMainService),
    __param(15, ILifecycleMainService),
    __param(16, IProductService),
    __param(17, IProtocolMainService),
    __param(18, IWindowsMainService),
    __param(19, IStateService),
    __param(20, IInstantiationService)
], CodeWindow);
export { CodeWindow };
class UnresponsiveError extends Error {
    constructor(sample, windowId, pid = 0) {
        // Since the stacks are available via the sample
        // we can avoid collecting them when constructing the error.
        const stackTraceLimit = Error.stackTraceLimit;
        Error.stackTraceLimit = 0;
        super(`UnresponsiveSampleError: from window with ID ${windowId} belonging to process with pid ${pid}`);
        Error.stackTraceLimit = stackTraceLimit;
        this.name = 'UnresponsiveSampleError';
        this.stack = sample;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93SW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93aW5kb3dzL2VsZWN0cm9uLW1haW4vd2luZG93SW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLFFBQTZDLE1BQU0sVUFBVSxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3BHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRTdCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFFLE9BQU8sRUFBNkIscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FB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