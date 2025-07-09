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
var CodeApplication_1;
import { app, protocol, session, systemPreferences } from 'electron';
import { addUNCHostToAllowlist, disableUNCAccessRestrictions } from '../../base/node/unc.js';
import { validatedIpcMain } from '../../base/parts/ipc/electron-main/ipcMain.js';
import { hostname, release } from 'os';
import { VSBuffer } from '../../base/common/buffer.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { Event } from '../../base/common/event.js';
import { parse } from '../../base/common/jsonc.js';
import { getPathLabel } from '../../base/common/labels.js';
import { Disposable, DisposableStore } from '../../base/common/lifecycle.js';
import { Schemas, VSCODE_AUTHORITY } from '../../base/common/network.js';
import { join, posix } from '../../base/common/path.js';
import { isLinux, isLinuxSnap, isMacintosh, isWindows, OS } from '../../base/common/platform.js';
import { assertType } from '../../base/common/types.js';
import { URI } from '../../base/common/uri.js';
import { generateUuid } from '../../base/common/uuid.js';
import { registerContextMenuListener } from '../../base/parts/contextmenu/electron-main/contextmenu.js';
import { getDelayedChannel, ProxyChannel, StaticRouter } from '../../base/parts/ipc/common/ipc.js';
import { Server as ElectronIPCServer } from '../../base/parts/ipc/electron-main/ipc.electron.js';
import { Client as MessagePortClient } from '../../base/parts/ipc/electron-main/ipc.mp.js';
import { IProxyAuthService, ProxyAuthService } from '../../platform/native/electron-main/auth.js';
import { localize } from '../../nls.js';
import { IBackupMainService } from '../../platform/backup/electron-main/backup.js';
import { BackupMainService } from '../../platform/backup/electron-main/backupMainService.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ElectronExtensionHostDebugBroadcastChannel } from '../../platform/debug/electron-main/extensionHostDebugIpc.js';
import { IDiagnosticsService } from '../../platform/diagnostics/common/diagnostics.js';
import { DiagnosticsMainService, IDiagnosticsMainService } from '../../platform/diagnostics/electron-main/diagnosticsMainService.js';
import { DialogMainService, IDialogMainService } from '../../platform/dialogs/electron-main/dialogMainService.js';
import { IEncryptionMainService } from '../../platform/encryption/common/encryptionService.js';
import { EncryptionMainService } from '../../platform/encryption/electron-main/encryptionMainService.js';
import { IEnvironmentMainService } from '../../platform/environment/electron-main/environmentMainService.js';
import { isLaunchedFromCli } from '../../platform/environment/node/argvHelper.js';
import { getResolvedShellEnv } from '../../platform/shell/node/shellEnv.js';
import { IExtensionHostStarter, ipcExtensionHostStarterChannelName } from '../../platform/extensions/common/extensionHostStarter.js';
import { ExtensionHostStarter } from '../../platform/extensions/electron-main/extensionHostStarter.js';
import { IExternalTerminalMainService } from '../../platform/externalTerminal/electron-main/externalTerminal.js';
import { LinuxExternalTerminalService, MacExternalTerminalService, WindowsExternalTerminalService } from '../../platform/externalTerminal/node/externalTerminalService.js';
import { LOCAL_FILE_SYSTEM_CHANNEL_NAME } from '../../platform/files/common/diskFileSystemProviderClient.js';
import { IFileService } from '../../platform/files/common/files.js';
import { DiskFileSystemProviderChannel } from '../../platform/files/electron-main/diskFileSystemProviderServer.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { IProcessMainService } from '../../platform/process/common/process.js';
import { ProcessMainService } from '../../platform/process/electron-main/processMainService.js';
import { IKeyboardLayoutMainService, KeyboardLayoutMainService } from '../../platform/keyboardLayout/electron-main/keyboardLayoutMainService.js';
import { ILaunchMainService, LaunchMainService } from '../../platform/launch/electron-main/launchMainService.js';
import { ILifecycleMainService } from '../../platform/lifecycle/electron-main/lifecycleMainService.js';
import { ILoggerService, ILogService } from '../../platform/log/common/log.js';
import { IMenubarMainService, MenubarMainService } from '../../platform/menubar/electron-main/menubarMainService.js';
import { INativeHostMainService, NativeHostMainService } from '../../platform/native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { getRemoteAuthority } from '../../platform/remote/common/remoteHosts.js';
import { SharedProcess } from '../../platform/sharedProcess/electron-main/sharedProcess.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { IStateService } from '../../platform/state/node/state.js';
import { StorageDatabaseChannel } from '../../platform/storage/electron-main/storageIpc.js';
import { ApplicationStorageMainService, IApplicationStorageMainService, IStorageMainService, StorageMainService } from '../../platform/storage/electron-main/storageMainService.js';
import { resolveCommonProperties } from '../../platform/telemetry/common/commonProperties.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { TelemetryAppenderClient } from '../../platform/telemetry/common/telemetryIpc.js';
import { TelemetryService } from '../../platform/telemetry/common/telemetryService.js';
import { getPiiPathsFromEnvironment, getTelemetryLevel, isInternalTelemetry, NullTelemetryService, supportsTelemetry } from '../../platform/telemetry/common/telemetryUtils.js';
import { IUpdateService } from '../../platform/update/common/update.js';
import { UpdateChannel } from '../../platform/update/common/updateIpc.js';
import { DarwinUpdateService } from '../../platform/update/electron-main/updateService.darwin.js';
import { LinuxUpdateService } from '../../platform/update/electron-main/updateService.linux.js';
import { SnapUpdateService } from '../../platform/update/electron-main/updateService.snap.js';
import { Win32UpdateService } from '../../platform/update/electron-main/updateService.win32.js';
import { IURLService } from '../../platform/url/common/url.js';
import { URLHandlerChannelClient, URLHandlerRouter } from '../../platform/url/common/urlIpc.js';
import { NativeURLService } from '../../platform/url/common/urlService.js';
import { ElectronURLListener } from '../../platform/url/electron-main/electronUrlListener.js';
import { IWebviewManagerService } from '../../platform/webview/common/webviewManagerService.js';
import { WebviewMainService } from '../../platform/webview/electron-main/webviewMainService.js';
import { isFolderToOpen, isWorkspaceToOpen } from '../../platform/window/common/window.js';
import { getAllWindowsExcludingOffscreen, IWindowsMainService } from '../../platform/windows/electron-main/windows.js';
import { WindowsMainService } from '../../platform/windows/electron-main/windowsMainService.js';
import { ActiveWindowManager } from '../../platform/windows/node/windowTracker.js';
import { hasWorkspaceFileExtension } from '../../platform/workspace/common/workspace.js';
import { IWorkspacesService } from '../../platform/workspaces/common/workspaces.js';
import { IWorkspacesHistoryMainService, WorkspacesHistoryMainService } from '../../platform/workspaces/electron-main/workspacesHistoryMainService.js';
import { WorkspacesMainService } from '../../platform/workspaces/electron-main/workspacesMainService.js';
import { IWorkspacesManagementMainService, WorkspacesManagementMainService } from '../../platform/workspaces/electron-main/workspacesManagementMainService.js';
import { IPolicyService } from '../../platform/policy/common/policy.js';
import { PolicyChannel } from '../../platform/policy/common/policyIpc.js';
import { IUserDataProfilesMainService } from '../../platform/userDataProfile/electron-main/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from '../../platform/extensionManagement/node/extensionsScannerService.js';
import { UserDataProfilesHandler } from '../../platform/userDataProfile/electron-main/userDataProfilesHandler.js';
import { ProfileStorageChangesListenerChannel } from '../../platform/userDataProfile/electron-main/userDataProfileStorageIpc.js';
import { Promises, RunOnceScheduler, runWhenGlobalIdle } from '../../base/common/async.js';
import { resolveMachineId, resolveSqmId, resolvedevDeviceId, validatedevDeviceId } from '../../platform/telemetry/electron-main/telemetryUtils.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LoggerChannel } from '../../platform/log/electron-main/logIpc.js';
import { ILoggerMainService } from '../../platform/log/electron-main/loggerService.js';
import { IUtilityProcessWorkerMainService, UtilityProcessWorkerMainService } from '../../platform/utilityProcess/electron-main/utilityProcessWorkerMainService.js';
import { ipcUtilityProcessWorkerChannelName } from '../../platform/utilityProcess/common/utilityProcessWorkerService.js';
import { ILocalPtyService, TerminalIpcChannels } from '../../platform/terminal/common/terminal.js';
import { ElectronPtyHostStarter } from '../../platform/terminal/electron-main/electronPtyHostStarter.js';
import { PtyHostService } from '../../platform/terminal/node/ptyHostService.js';
import { NODE_REMOTE_RESOURCE_CHANNEL_NAME, NODE_REMOTE_RESOURCE_IPC_METHOD_NAME, NodeRemoteResourceRouter } from '../../platform/remote/common/electronRemoteResources.js';
import { Lazy } from '../../base/common/lazy.js';
import { IAuxiliaryWindowsMainService } from '../../platform/auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { AuxiliaryWindowsMainService } from '../../platform/auxiliaryWindow/electron-main/auxiliaryWindowsMainService.js';
import { normalizeNFC } from '../../base/common/normalization.js';
import { ICSSDevelopmentService, CSSDevelopmentService } from '../../platform/cssDev/node/cssDevService.js';
import { INativeMcpDiscoveryHelperService, NativeMcpDiscoveryHelperChannelName } from '../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { NativeMcpDiscoveryHelperService } from '../../platform/mcp/node/nativeMcpDiscoveryHelperService.js';
import { IWebContentExtractorService } from '../../platform/webContentExtractor/common/webContentExtractor.js';
import { NativeWebContentExtractorService } from '../../platform/webContentExtractor/electron-main/webContentExtractorService.js';
import ErrorTelemetry from '../../platform/telemetry/electron-main/errorTelemetry.js';
// in theory this is not allowed
// ignore the eslint errors below
import { IMetricsService } from '../../workbench/contrib/void/common/metricsService.js';
import { IVoidUpdateService } from '../../workbench/contrib/void/common/voidUpdateService.js';
import { MetricsMainService } from '../../workbench/contrib/void/electron-main/metricsMainService.js';
import { VoidMainUpdateService } from '../../workbench/contrib/void/electron-main/voidUpdateMainService.js';
import { LLMMessageChannel } from '../../workbench/contrib/void/electron-main/sendLLMMessageChannel.js';
import { VoidSCMService } from '../../workbench/contrib/void/electron-main/voidSCMMainService.js';
import { IVoidSCMService } from '../../workbench/contrib/void/common/voidSCMTypes.js';
import { MCPChannel } from '../../workbench/contrib/void/electron-main/mcpChannel.js';
/**
 * The main VS Code application. There will only ever be one instance,
 * even if the user starts many instances (e.g. from the command line).
 */
let CodeApplication = class CodeApplication extends Disposable {
    static { CodeApplication_1 = this; }
    static { this.SECURITY_PROTOCOL_HANDLING_CONFIRMATION_SETTING_KEY = {
        [Schemas.file]: 'security.promptForLocalFileProtocolHandling',
        [Schemas.vscodeRemote]: 'security.promptForRemoteFileProtocolHandling'
    }; }
    constructor(mainProcessNodeIpcServer, userEnv, mainInstantiationService, logService, loggerService, environmentMainService, lifecycleMainService, configurationService, stateService, fileService, productService, userDataProfilesMainService) {
        super();
        this.mainProcessNodeIpcServer = mainProcessNodeIpcServer;
        this.userEnv = userEnv;
        this.mainInstantiationService = mainInstantiationService;
        this.logService = logService;
        this.loggerService = loggerService;
        this.environmentMainService = environmentMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.configurationService = configurationService;
        this.stateService = stateService;
        this.fileService = fileService;
        this.productService = productService;
        this.userDataProfilesMainService = userDataProfilesMainService;
        this.configureSession();
        this.registerListeners();
    }
    configureSession() {
        //#region Security related measures (https://electronjs.org/docs/tutorial/security)
        //
        // !!! DO NOT CHANGE without consulting the documentation !!!
        //
        const isUrlFromWindow = (requestingUrl) => requestingUrl?.startsWith(`${Schemas.vscodeFileResource}://${VSCODE_AUTHORITY}`);
        const isUrlFromWebview = (requestingUrl) => requestingUrl?.startsWith(`${Schemas.vscodeWebview}://`);
        const allowedPermissionsInWebview = new Set([
            'clipboard-read',
            'clipboard-sanitized-write',
            // TODO(deepak1556): Should be removed once migration is complete
            // https://github.com/microsoft/vscode/issues/239228
            'deprecated-sync-clipboard-read',
        ]);
        const allowedPermissionsInCore = new Set([
            'media',
            'local-fonts',
            // TODO(deepak1556): Should be removed once migration is complete
            // https://github.com/microsoft/vscode/issues/239228
            'deprecated-sync-clipboard-read',
        ]);
        session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
            if (isUrlFromWebview(details.requestingUrl)) {
                return callback(allowedPermissionsInWebview.has(permission));
            }
            if (isUrlFromWindow(details.requestingUrl)) {
                return callback(allowedPermissionsInCore.has(permission));
            }
            return callback(false);
        });
        session.defaultSession.setPermissionCheckHandler((_webContents, permission, _origin, details) => {
            if (isUrlFromWebview(details.requestingUrl)) {
                return allowedPermissionsInWebview.has(permission);
            }
            if (isUrlFromWindow(details.requestingUrl)) {
                return allowedPermissionsInCore.has(permission);
            }
            return false;
        });
        //#endregion
        //#region Request filtering
        // Block all SVG requests from unsupported origins
        const supportedSvgSchemes = new Set([Schemas.file, Schemas.vscodeFileResource, Schemas.vscodeRemoteResource, Schemas.vscodeManagedRemoteResource, 'devtools']);
        // But allow them if they are made from inside an webview
        const isSafeFrame = (requestFrame) => {
            for (let frame = requestFrame; frame; frame = frame.parent) {
                if (frame.url.startsWith(`${Schemas.vscodeWebview}://`)) {
                    return true;
                }
            }
            return false;
        };
        const isSvgRequestFromSafeContext = (details) => {
            return details.resourceType === 'xhr' || isSafeFrame(details.frame);
        };
        const isAllowedVsCodeFileRequest = (details) => {
            const frame = details.frame;
            if (!frame || !this.windowsMainService) {
                return false;
            }
            // Check to see if the request comes from one of the main windows (or shared process) and not from embedded content
            const windows = getAllWindowsExcludingOffscreen();
            for (const window of windows) {
                if (frame.processId === window.webContents.mainFrame.processId) {
                    return true;
                }
            }
            return false;
        };
        const isAllowedWebviewRequest = (uri, details) => {
            if (uri.path !== '/index.html') {
                return true; // Only restrict top level page of webviews: index.html
            }
            const frame = details.frame;
            if (!frame || !this.windowsMainService) {
                return false;
            }
            // Check to see if the request comes from one of the main editor windows.
            for (const window of this.windowsMainService.getWindows()) {
                if (window.win) {
                    if (frame.processId === window.win.webContents.mainFrame.processId) {
                        return true;
                    }
                }
            }
            return false;
        };
        session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
            const uri = URI.parse(details.url);
            if (uri.scheme === Schemas.vscodeWebview) {
                if (!isAllowedWebviewRequest(uri, details)) {
                    this.logService.error('Blocked vscode-webview request', details.url);
                    return callback({ cancel: true });
                }
            }
            if (uri.scheme === Schemas.vscodeFileResource) {
                if (!isAllowedVsCodeFileRequest(details)) {
                    this.logService.error('Blocked vscode-file request', details.url);
                    return callback({ cancel: true });
                }
            }
            // Block most svgs
            if (uri.path.endsWith('.svg')) {
                const isSafeResourceUrl = supportedSvgSchemes.has(uri.scheme);
                if (!isSafeResourceUrl) {
                    return callback({ cancel: !isSvgRequestFromSafeContext(details) });
                }
            }
            return callback({ cancel: false });
        });
        // Configure SVG header content type properly
        // https://github.com/microsoft/vscode/issues/97564
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            const responseHeaders = details.responseHeaders;
            const contentTypes = (responseHeaders['content-type'] || responseHeaders['Content-Type']);
            if (contentTypes && Array.isArray(contentTypes)) {
                const uri = URI.parse(details.url);
                if (uri.path.endsWith('.svg')) {
                    if (supportedSvgSchemes.has(uri.scheme)) {
                        responseHeaders['Content-Type'] = ['image/svg+xml'];
                        return callback({ cancel: false, responseHeaders });
                    }
                }
                // remote extension schemes have the following format
                // http://127.0.0.1:<port>/vscode-remote-resource?path=
                if (!uri.path.endsWith(Schemas.vscodeRemoteResource) && contentTypes.some(contentType => contentType.toLowerCase().includes('image/svg'))) {
                    return callback({ cancel: !isSvgRequestFromSafeContext(details) });
                }
            }
            return callback({ cancel: false });
        });
        //#endregion
        //#region Allow CORS for the PRSS CDN
        // https://github.com/microsoft/vscode-remote-release/issues/9246
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            if (details.url.startsWith('https://vscode.download.prss.microsoft.com/')) {
                const responseHeaders = details.responseHeaders ?? Object.create(null);
                if (responseHeaders['Access-Control-Allow-Origin'] === undefined) {
                    responseHeaders['Access-Control-Allow-Origin'] = ['*'];
                    return callback({ cancel: false, responseHeaders });
                }
            }
            return callback({ cancel: false });
        });
        const defaultSession = session.defaultSession;
        if (typeof defaultSession.setCodeCachePath === 'function' && this.environmentMainService.codeCachePath) {
            // Make sure to partition Chrome's code cache folder
            // in the same way as our code cache path to help
            // invalidate caches that we know are invalid
            // (https://github.com/microsoft/vscode/issues/120655)
            defaultSession.setCodeCachePath(join(this.environmentMainService.codeCachePath, 'chrome'));
        }
        //#endregion
        //#region UNC Host Allowlist (Windows)
        if (isWindows) {
            if (this.configurationService.getValue('security.restrictUNCAccess') === false) {
                disableUNCAccessRestrictions();
            }
            else {
                addUNCHostToAllowlist(this.configurationService.getValue('security.allowedUNCHosts'));
            }
        }
        //#endregion
    }
    registerListeners() {
        // Dispose on shutdown
        Event.once(this.lifecycleMainService.onWillShutdown)(() => this.dispose());
        // Contextmenu via IPC support
        registerContextMenuListener();
        // Accessibility change event
        app.on('accessibility-support-changed', (event, accessibilitySupportEnabled) => {
            this.windowsMainService?.sendToAll('vscode:accessibilitySupportChanged', accessibilitySupportEnabled);
        });
        // macOS dock activate
        app.on('activate', async (event, hasVisibleWindows) => {
            this.logService.trace('app#activate');
            // Mac only event: open new window when we get activated
            if (!hasVisibleWindows) {
                await this.windowsMainService?.openEmptyWindow({ context: 1 /* OpenContext.DOCK */ });
            }
        });
        //#region Security related measures (https://electronjs.org/docs/tutorial/security)
        //
        // !!! DO NOT CHANGE without consulting the documentation !!!
        //
        app.on('web-contents-created', (event, contents) => {
            // Auxiliary Window: delegate to `AuxiliaryWindow` class
            if (contents?.opener?.url.startsWith(`${Schemas.vscodeFileResource}://${VSCODE_AUTHORITY}/`)) {
                this.logService.trace('[aux window]  app.on("web-contents-created"): Registering auxiliary window');
                this.auxiliaryWindowsMainService?.registerWindow(contents);
            }
            // Block any in-page navigation
            contents.on('will-navigate', event => {
                this.logService.error('webContents#will-navigate: Prevented webcontent navigation');
                event.preventDefault();
            });
            // All Windows: only allow about:blank auxiliary windows to open
            // For all other URLs, delegate to the OS.
            contents.setWindowOpenHandler(details => {
                // about:blank windows can open as window witho our default options
                if (details.url === 'about:blank') {
                    this.logService.trace('[aux window] webContents#setWindowOpenHandler: Allowing auxiliary window to open on about:blank');
                    return {
                        action: 'allow',
                        overrideBrowserWindowOptions: this.auxiliaryWindowsMainService?.createWindow(details)
                    };
                }
                // Any other URL: delegate to OS
                else {
                    this.logService.trace(`webContents#setWindowOpenHandler: Prevented opening window with URL ${details.url}}`);
                    this.nativeHostMainService?.openExternal(undefined, details.url);
                    return { action: 'deny' };
                }
            });
        });
        //#endregion
        let macOpenFileURIs = [];
        let runningTimeout = undefined;
        app.on('open-file', (event, path) => {
            path = normalizeNFC(path); // macOS only: normalize paths to NFC form
            this.logService.trace('app#open-file: ', path);
            event.preventDefault();
            // Keep in array because more might come!
            macOpenFileURIs.push(hasWorkspaceFileExtension(path) ? { workspaceUri: URI.file(path) } : { fileUri: URI.file(path) });
            // Clear previous handler if any
            if (runningTimeout !== undefined) {
                clearTimeout(runningTimeout);
                runningTimeout = undefined;
            }
            // Handle paths delayed in case more are coming!
            runningTimeout = setTimeout(async () => {
                await this.windowsMainService?.open({
                    context: 1 /* OpenContext.DOCK */ /* can also be opening from finder while app is running */,
                    cli: this.environmentMainService.args,
                    urisToOpen: macOpenFileURIs,
                    gotoLineMode: false,
                    preferNewWindow: true /* dropping on the dock or opening from finder prefers to open in a new window */
                });
                macOpenFileURIs = [];
                runningTimeout = undefined;
            }, 100);
        });
        app.on('new-window-for-tab', async () => {
            await this.windowsMainService?.openEmptyWindow({ context: 4 /* OpenContext.DESKTOP */ }); //macOS native tab "+" button
        });
        //#region Bootstrap IPC Handlers
        validatedIpcMain.handle('vscode:fetchShellEnv', event => {
            // Prefer to use the args and env from the target window
            // when resolving the shell env. It is possible that
            // a first window was opened from the UI but a second
            // from the CLI and that has implications for whether to
            // resolve the shell environment or not.
            //
            // Window can be undefined for e.g. the shared process
            // that is not part of our windows registry!
            const window = this.windowsMainService?.getWindowByWebContents(event.sender); // Note: this can be `undefined` for the shared process
            let args;
            let env;
            if (window?.config) {
                args = window.config;
                env = { ...process.env, ...window.config.userEnv };
            }
            else {
                args = this.environmentMainService.args;
                env = process.env;
            }
            // Resolve shell env
            return this.resolveShellEnvironment(args, env, false);
        });
        validatedIpcMain.on('vscode:toggleDevTools', event => event.sender.toggleDevTools());
        validatedIpcMain.on('vscode:openDevTools', event => event.sender.openDevTools());
        validatedIpcMain.on('vscode:reloadWindow', event => event.sender.reload());
        validatedIpcMain.handle('vscode:notifyZoomLevel', async (event, zoomLevel) => {
            const window = this.windowsMainService?.getWindowByWebContents(event.sender);
            if (window) {
                window.notifyZoomLevel(zoomLevel);
            }
        });
        //#endregion
    }
    async startup() {
        this.logService.debug('Starting VS Code');
        this.logService.debug(`from: ${this.environmentMainService.appRoot}`);
        this.logService.debug('args:', this.environmentMainService.args);
        // Make sure we associate the program with the app user model id
        // This will help Windows to associate the running program with
        // any shortcut that is pinned to the taskbar and prevent showing
        // two icons in the taskbar for the same app.
        const win32AppUserModelId = this.productService.win32AppUserModelId;
        if (isWindows && win32AppUserModelId) {
            app.setAppUserModelId(win32AppUserModelId);
        }
        // Fix native tabs on macOS 10.13
        // macOS enables a compatibility patch for any bundle ID beginning with
        // "com.microsoft.", which breaks native tabs for VS Code when using this
        // identifier (from the official build).
        // Explicitly opt out of the patch here before creating any windows.
        // See: https://github.com/microsoft/vscode/issues/35361#issuecomment-399794085
        try {
            if (isMacintosh && this.configurationService.getValue('window.nativeTabs') === true && !systemPreferences.getUserDefault('NSUseImprovedLayoutPass', 'boolean')) {
                systemPreferences.setUserDefault('NSUseImprovedLayoutPass', 'boolean', true);
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        // Main process server (electron IPC based)
        const mainProcessElectronServer = new ElectronIPCServer();
        Event.once(this.lifecycleMainService.onWillShutdown)(e => {
            if (e.reason === 2 /* ShutdownReason.KILL */) {
                // When we go down abnormally, make sure to free up
                // any IPC we accept from other windows to reduce
                // the chance of doing work after we go down. Kill
                // is special in that it does not orderly shutdown
                // windows.
                mainProcessElectronServer.dispose();
            }
        });
        // Resolve unique machine ID
        this.logService.trace('Resolving machine identifier...');
        const [machineId, sqmId, devDeviceId] = await Promise.all([
            resolveMachineId(this.stateService, this.logService),
            resolveSqmId(this.stateService, this.logService),
            resolvedevDeviceId(this.stateService, this.logService)
        ]);
        this.logService.trace(`Resolved machine identifier: ${machineId}`);
        // Shared process
        const { sharedProcessReady, sharedProcessClient } = this.setupSharedProcess(machineId, sqmId, devDeviceId);
        // Services
        const appInstantiationService = await this.initServices(machineId, sqmId, devDeviceId, sharedProcessReady);
        // Error telemetry
        appInstantiationService.invokeFunction(accessor => this._register(new ErrorTelemetry(accessor.get(ILogService), accessor.get(ITelemetryService))));
        // Auth Handler
        appInstantiationService.invokeFunction(accessor => accessor.get(IProxyAuthService));
        // Transient profiles handler
        this._register(appInstantiationService.createInstance(UserDataProfilesHandler));
        // Init Channels
        appInstantiationService.invokeFunction(accessor => this.initChannels(accessor, mainProcessElectronServer, sharedProcessClient));
        // Setup Protocol URL Handlers
        const initialProtocolUrls = await appInstantiationService.invokeFunction(accessor => this.setupProtocolUrlHandlers(accessor, mainProcessElectronServer));
        // Setup vscode-remote-resource protocol handler
        this.setupManagedRemoteResourceUrlHandler(mainProcessElectronServer);
        // Signal phase: ready - before opening first window
        this.lifecycleMainService.phase = 2 /* LifecycleMainPhase.Ready */;
        // Open Windows
        await appInstantiationService.invokeFunction(accessor => this.openFirstWindow(accessor, initialProtocolUrls));
        // Signal phase: after window open
        this.lifecycleMainService.phase = 3 /* LifecycleMainPhase.AfterWindowOpen */;
        // Post Open Windows Tasks
        this.afterWindowOpen();
        // Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
        const eventuallyPhaseScheduler = this._register(new RunOnceScheduler(() => {
            this._register(runWhenGlobalIdle(() => {
                // Signal phase: eventually
                this.lifecycleMainService.phase = 4 /* LifecycleMainPhase.Eventually */;
                // Eventually Post Open Window Tasks
                this.eventuallyAfterWindowOpen();
            }, 2500));
        }, 2500));
        eventuallyPhaseScheduler.schedule();
    }
    async setupProtocolUrlHandlers(accessor, mainProcessElectronServer) {
        const windowsMainService = this.windowsMainService = accessor.get(IWindowsMainService);
        const urlService = accessor.get(IURLService);
        const nativeHostMainService = this.nativeHostMainService = accessor.get(INativeHostMainService);
        const dialogMainService = accessor.get(IDialogMainService);
        // Install URL handlers that deal with protocl URLs either
        // from this process by opening windows and/or by forwarding
        // the URLs into a window process to be handled there.
        const app = this;
        urlService.registerHandler({
            async handleURL(uri, options) {
                return app.handleProtocolUrl(windowsMainService, dialogMainService, urlService, uri, options);
            }
        });
        const activeWindowManager = this._register(new ActiveWindowManager({
            onDidOpenMainWindow: nativeHostMainService.onDidOpenMainWindow,
            onDidFocusMainWindow: nativeHostMainService.onDidFocusMainWindow,
            getActiveWindowId: () => nativeHostMainService.getActiveWindowId(-1)
        }));
        const activeWindowRouter = new StaticRouter(ctx => activeWindowManager.getActiveClientId().then(id => ctx === id));
        const urlHandlerRouter = new URLHandlerRouter(activeWindowRouter, this.logService);
        const urlHandlerChannel = mainProcessElectronServer.getChannel('urlHandler', urlHandlerRouter);
        urlService.registerHandler(new URLHandlerChannelClient(urlHandlerChannel));
        const initialProtocolUrls = await this.resolveInitialProtocolUrls(windowsMainService, dialogMainService);
        this._register(new ElectronURLListener(initialProtocolUrls?.urls, urlService, windowsMainService, this.environmentMainService, this.productService, this.logService));
        return initialProtocolUrls;
    }
    setupManagedRemoteResourceUrlHandler(mainProcessElectronServer) {
        const notFound = () => ({ statusCode: 404, data: 'Not found' });
        const remoteResourceChannel = new Lazy(() => mainProcessElectronServer.getChannel(NODE_REMOTE_RESOURCE_CHANNEL_NAME, new NodeRemoteResourceRouter()));
        protocol.registerBufferProtocol(Schemas.vscodeManagedRemoteResource, (request, callback) => {
            const url = URI.parse(request.url);
            if (!url.authority.startsWith('window:')) {
                return callback(notFound());
            }
            remoteResourceChannel.value.call(NODE_REMOTE_RESOURCE_IPC_METHOD_NAME, [url]).then(r => callback({ ...r, data: Buffer.from(r.body, 'base64') }), err => {
                this.logService.warn('error dispatching remote resource call', err);
                callback({ statusCode: 500, data: String(err) });
            });
        });
    }
    async resolveInitialProtocolUrls(windowsMainService, dialogMainService) {
        /**
         * Protocol URL handling on startup is complex, refer to
         * {@link IInitialProtocolUrls} for an explainer.
         */
        // Windows/Linux: protocol handler invokes CLI with --open-url
        const protocolUrlsFromCommandLine = this.environmentMainService.args['open-url'] ? this.environmentMainService.args._urls || [] : [];
        if (protocolUrlsFromCommandLine.length > 0) {
            this.logService.trace('app#resolveInitialProtocolUrls() protocol urls from command line:', protocolUrlsFromCommandLine);
        }
        // macOS: open-url events that were received before the app is ready
        const protocolUrlsFromEvent = (global.getOpenUrls() || []);
        if (protocolUrlsFromEvent.length > 0) {
            this.logService.trace(`app#resolveInitialProtocolUrls() protocol urls from macOS 'open-url' event:`, protocolUrlsFromEvent);
        }
        if (protocolUrlsFromCommandLine.length + protocolUrlsFromEvent.length === 0) {
            return undefined;
        }
        const protocolUrls = [
            ...protocolUrlsFromCommandLine,
            ...protocolUrlsFromEvent
        ].map(url => {
            try {
                return { uri: URI.parse(url), originalUrl: url };
            }
            catch {
                this.logService.trace('app#resolveInitialProtocolUrls() protocol url failed to parse:', url);
                return undefined;
            }
        });
        const openables = [];
        const urls = [];
        for (const protocolUrl of protocolUrls) {
            if (!protocolUrl) {
                continue; // invalid
            }
            const windowOpenable = this.getWindowOpenableFromProtocolUrl(protocolUrl.uri);
            if (windowOpenable) {
                if (await this.shouldBlockOpenable(windowOpenable, windowsMainService, dialogMainService)) {
                    this.logService.trace('app#resolveInitialProtocolUrls() protocol url was blocked:', protocolUrl.uri.toString(true));
                    continue; // blocked
                }
                else {
                    this.logService.trace('app#resolveInitialProtocolUrls() protocol url will be handled as window to open:', protocolUrl.uri.toString(true), windowOpenable);
                    openables.push(windowOpenable); // handled as window to open
                }
            }
            else {
                this.logService.trace('app#resolveInitialProtocolUrls() protocol url will be passed to active window for handling:', protocolUrl.uri.toString(true));
                urls.push(protocolUrl); // handled within active window
            }
        }
        return { urls, openables };
    }
    async shouldBlockOpenable(openable, windowsMainService, dialogMainService) {
        let openableUri;
        let message;
        if (isWorkspaceToOpen(openable)) {
            openableUri = openable.workspaceUri;
            message = localize('confirmOpenMessageWorkspace', "An external application wants to open '{0}' in {1}. Do you want to open this workspace file?", openableUri.scheme === Schemas.file ? getPathLabel(openableUri, { os: OS, tildify: this.environmentMainService }) : openableUri.toString(true), this.productService.nameShort);
        }
        else if (isFolderToOpen(openable)) {
            openableUri = openable.folderUri;
            message = localize('confirmOpenMessageFolder', "An external application wants to open '{0}' in {1}. Do you want to open this folder?", openableUri.scheme === Schemas.file ? getPathLabel(openableUri, { os: OS, tildify: this.environmentMainService }) : openableUri.toString(true), this.productService.nameShort);
        }
        else {
            openableUri = openable.fileUri;
            message = localize('confirmOpenMessageFileOrFolder', "An external application wants to open '{0}' in {1}. Do you want to open this file or folder?", openableUri.scheme === Schemas.file ? getPathLabel(openableUri, { os: OS, tildify: this.environmentMainService }) : openableUri.toString(true), this.productService.nameShort);
        }
        if (openableUri.scheme !== Schemas.file && openableUri.scheme !== Schemas.vscodeRemote) {
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            //
            // NOTE: we currently only ask for confirmation for `file` and `vscode-remote`
            // authorities here. There is an additional confirmation for `extension.id`
            // authorities from within the window.
            //
            // IF YOU ARE PLANNING ON ADDING ANOTHER AUTHORITY HERE, MAKE SURE TO ALSO
            // ADD IT TO THE CONFIRMATION CODE BELOW OR INSIDE THE WINDOW!
            //
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            return false;
        }
        const askForConfirmation = this.configurationService.getValue(CodeApplication_1.SECURITY_PROTOCOL_HANDLING_CONFIRMATION_SETTING_KEY[openableUri.scheme]);
        if (askForConfirmation === false) {
            return false; // not blocked via settings
        }
        const { response, checkboxChecked } = await dialogMainService.showMessageBox({
            type: 'warning',
            buttons: [
                localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, "&&Yes"),
                localize({ key: 'cancel', comment: ['&& denotes a mnemonic'] }, "&&No")
            ],
            message,
            detail: localize('confirmOpenDetail', "If you did not initiate this request, it may represent an attempted attack on your system. Unless you took an explicit action to initiate this request, you should press 'No'"),
            checkboxLabel: openableUri.scheme === Schemas.file ? localize('doNotAskAgainLocal', "Allow opening local paths without asking") : localize('doNotAskAgainRemote', "Allow opening remote paths without asking"),
            cancelId: 1
        });
        if (response !== 0) {
            return true; // blocked by user choice
        }
        if (checkboxChecked) {
            // Due to https://github.com/microsoft/vscode/issues/195436, we can only
            // update settings from within a window. But we do not know if a window
            // is about to open or can already handle the request, so we have to send
            // to any current window and any newly opening window.
            const request = { channel: 'vscode:disablePromptForProtocolHandling', args: openableUri.scheme === Schemas.file ? 'local' : 'remote' };
            windowsMainService.sendToFocused(request.channel, request.args);
            windowsMainService.sendToOpeningWindow(request.channel, request.args);
        }
        return false; // not blocked by user choice
    }
    getWindowOpenableFromProtocolUrl(uri) {
        if (!uri.path) {
            return undefined;
        }
        // File path
        if (uri.authority === Schemas.file) {
            const fileUri = URI.file(uri.fsPath);
            if (hasWorkspaceFileExtension(fileUri)) {
                return { workspaceUri: fileUri };
            }
            return { fileUri };
        }
        // Remote path
        else if (uri.authority === Schemas.vscodeRemote) {
            // Example conversion:
            // From: vscode://vscode-remote/wsl+ubuntu/mnt/c/GitDevelopment/monaco
            //   To: vscode-remote://wsl+ubuntu/mnt/c/GitDevelopment/monaco
            const secondSlash = uri.path.indexOf(posix.sep, 1 /* skip over the leading slash */);
            let authority;
            let path;
            if (secondSlash !== -1) {
                authority = uri.path.substring(1, secondSlash);
                path = uri.path.substring(secondSlash);
            }
            else {
                authority = uri.path.substring(1);
                path = '/';
            }
            let query = uri.query;
            const params = new URLSearchParams(uri.query);
            if (params.get('windowId') === '_blank') {
                // Make sure to unset any `windowId=_blank` here
                // https://github.com/microsoft/vscode/issues/191902
                params.delete('windowId');
                query = params.toString();
            }
            const remoteUri = URI.from({ scheme: Schemas.vscodeRemote, authority, path, query, fragment: uri.fragment });
            if (hasWorkspaceFileExtension(path)) {
                return { workspaceUri: remoteUri };
            }
            if (/:[\d]+$/.test(path)) {
                // path with :line:column syntax
                return { fileUri: remoteUri };
            }
            return { folderUri: remoteUri };
        }
        return undefined;
    }
    async handleProtocolUrl(windowsMainService, dialogMainService, urlService, uri, options) {
        this.logService.trace('app#handleProtocolUrl():', uri.toString(true), options);
        // Support 'workspace' URLs (https://github.com/microsoft/vscode/issues/124263)
        if (uri.scheme === this.productService.urlProtocol && uri.path === 'workspace') {
            uri = uri.with({
                authority: 'file',
                path: URI.parse(uri.query).path,
                query: ''
            });
        }
        let shouldOpenInNewWindow = false;
        // We should handle the URI in a new window if the URL contains `windowId=_blank`
        const params = new URLSearchParams(uri.query);
        if (params.get('windowId') === '_blank') {
            this.logService.trace(`app#handleProtocolUrl() found 'windowId=_blank' as parameter, setting shouldOpenInNewWindow=true:`, uri.toString(true));
            params.delete('windowId');
            uri = uri.with({ query: params.toString() });
            shouldOpenInNewWindow = true;
        }
        // or if no window is open (macOS only)
        else if (isMacintosh && windowsMainService.getWindowCount() === 0) {
            this.logService.trace(`app#handleProtocolUrl() running on macOS with no window open, setting shouldOpenInNewWindow=true:`, uri.toString(true));
            shouldOpenInNewWindow = true;
        }
        // Pass along whether the application is being opened via a Continue On flow
        const continueOn = params.get('continueOn');
        if (continueOn !== null) {
            this.logService.trace(`app#handleProtocolUrl() found 'continueOn' as parameter:`, uri.toString(true));
            params.delete('continueOn');
            uri = uri.with({ query: params.toString() });
            this.environmentMainService.continueOn = continueOn ?? undefined;
        }
        // Check if the protocol URL is a window openable to open...
        const windowOpenableFromProtocolUrl = this.getWindowOpenableFromProtocolUrl(uri);
        if (windowOpenableFromProtocolUrl) {
            if (await this.shouldBlockOpenable(windowOpenableFromProtocolUrl, windowsMainService, dialogMainService)) {
                this.logService.trace('app#handleProtocolUrl() protocol url was blocked:', uri.toString(true));
                return true; // If openable should be blocked, behave as if it's handled
            }
            else {
                this.logService.trace('app#handleProtocolUrl() opening protocol url as window:', windowOpenableFromProtocolUrl, uri.toString(true));
                const window = (await windowsMainService.open({
                    context: 6 /* OpenContext.LINK */,
                    cli: { ...this.environmentMainService.args },
                    urisToOpen: [windowOpenableFromProtocolUrl],
                    forceNewWindow: shouldOpenInNewWindow,
                    gotoLineMode: true
                    // remoteAuthority: will be determined based on windowOpenableFromProtocolUrl
                })).at(0);
                window?.focus(); // this should help ensuring that the right window gets focus when multiple are opened
                return true;
            }
        }
        // ...or if we should open in a new window and then handle it within that window
        if (shouldOpenInNewWindow) {
            this.logService.trace('app#handleProtocolUrl() opening empty window and passing in protocol url:', uri.toString(true));
            const window = (await windowsMainService.open({
                context: 6 /* OpenContext.LINK */,
                cli: { ...this.environmentMainService.args },
                forceNewWindow: true,
                forceEmpty: true,
                gotoLineMode: true,
                remoteAuthority: getRemoteAuthority(uri)
            })).at(0);
            await window?.ready();
            return urlService.open(uri, options);
        }
        this.logService.trace('app#handleProtocolUrl(): not handled', uri.toString(true), options);
        return false;
    }
    setupSharedProcess(machineId, sqmId, devDeviceId) {
        const sharedProcess = this._register(this.mainInstantiationService.createInstance(SharedProcess, machineId, sqmId, devDeviceId));
        this._register(sharedProcess.onDidCrash(() => this.windowsMainService?.sendToFocused('vscode:reportSharedProcessCrash')));
        const sharedProcessClient = (async () => {
            this.logService.trace('Main->SharedProcess#connect');
            const port = await sharedProcess.connect();
            this.logService.trace('Main->SharedProcess#connect: connection established');
            return new MessagePortClient(port, 'main');
        })();
        const sharedProcessReady = (async () => {
            await sharedProcess.whenReady();
            return sharedProcessClient;
        })();
        return { sharedProcessReady, sharedProcessClient };
    }
    async initServices(machineId, sqmId, devDeviceId, sharedProcessReady) {
        const services = new ServiceCollection();
        // Update
        switch (process.platform) {
            case 'win32':
                services.set(IUpdateService, new SyncDescriptor(Win32UpdateService));
                break;
            case 'linux':
                if (isLinuxSnap) {
                    services.set(IUpdateService, new SyncDescriptor(SnapUpdateService, [process.env['SNAP'], process.env['SNAP_REVISION']]));
                }
                else {
                    services.set(IUpdateService, new SyncDescriptor(LinuxUpdateService));
                }
                break;
            case 'darwin':
                services.set(IUpdateService, new SyncDescriptor(DarwinUpdateService));
                break;
        }
        // Windows
        services.set(IWindowsMainService, new SyncDescriptor(WindowsMainService, [machineId, sqmId, devDeviceId, this.userEnv], false));
        services.set(IAuxiliaryWindowsMainService, new SyncDescriptor(AuxiliaryWindowsMainService, undefined, false));
        // Dialogs
        const dialogMainService = new DialogMainService(this.logService, this.productService);
        services.set(IDialogMainService, dialogMainService);
        // Launch
        services.set(ILaunchMainService, new SyncDescriptor(LaunchMainService, undefined, false /* proxied to other processes */));
        // Diagnostics
        services.set(IDiagnosticsMainService, new SyncDescriptor(DiagnosticsMainService, undefined, false /* proxied to other processes */));
        services.set(IDiagnosticsService, ProxyChannel.toService(getDelayedChannel(sharedProcessReady.then(client => client.getChannel('diagnostics')))));
        // Process
        services.set(IProcessMainService, new SyncDescriptor(ProcessMainService, [this.userEnv]));
        // Encryption
        services.set(IEncryptionMainService, new SyncDescriptor(EncryptionMainService));
        // Keyboard Layout
        services.set(IKeyboardLayoutMainService, new SyncDescriptor(KeyboardLayoutMainService));
        // Native Host
        services.set(INativeHostMainService, new SyncDescriptor(NativeHostMainService, undefined, false /* proxied to other processes */));
        // Web Contents Extractor
        services.set(IWebContentExtractorService, new SyncDescriptor(NativeWebContentExtractorService, undefined, false /* proxied to other processes */));
        // Webview Manager
        services.set(IWebviewManagerService, new SyncDescriptor(WebviewMainService));
        // Menubar
        services.set(IMenubarMainService, new SyncDescriptor(MenubarMainService));
        // Extension Host Starter
        services.set(IExtensionHostStarter, new SyncDescriptor(ExtensionHostStarter));
        // Storage
        services.set(IStorageMainService, new SyncDescriptor(StorageMainService));
        services.set(IApplicationStorageMainService, new SyncDescriptor(ApplicationStorageMainService));
        // Terminal
        const ptyHostStarter = new ElectronPtyHostStarter({
            graceTime: 60000 /* LocalReconnectConstants.GraceTime */,
            shortGraceTime: 6000 /* LocalReconnectConstants.ShortGraceTime */,
            scrollback: this.configurationService.getValue("terminal.integrated.persistentSessionScrollback" /* TerminalSettingId.PersistentSessionScrollback */) ?? 100
        }, this.configurationService, this.environmentMainService, this.lifecycleMainService, this.logService);
        const ptyHostService = new PtyHostService(ptyHostStarter, this.configurationService, this.logService, this.loggerService);
        services.set(ILocalPtyService, ptyHostService);
        // External terminal
        if (isWindows) {
            services.set(IExternalTerminalMainService, new SyncDescriptor(WindowsExternalTerminalService));
        }
        else if (isMacintosh) {
            services.set(IExternalTerminalMainService, new SyncDescriptor(MacExternalTerminalService));
        }
        else if (isLinux) {
            services.set(IExternalTerminalMainService, new SyncDescriptor(LinuxExternalTerminalService));
        }
        // Backups
        const backupMainService = new BackupMainService(this.environmentMainService, this.configurationService, this.logService, this.stateService);
        services.set(IBackupMainService, backupMainService);
        // Workspaces
        const workspacesManagementMainService = new WorkspacesManagementMainService(this.environmentMainService, this.logService, this.userDataProfilesMainService, backupMainService, dialogMainService);
        services.set(IWorkspacesManagementMainService, workspacesManagementMainService);
        services.set(IWorkspacesService, new SyncDescriptor(WorkspacesMainService, undefined, false /* proxied to other processes */));
        services.set(IWorkspacesHistoryMainService, new SyncDescriptor(WorkspacesHistoryMainService, undefined, false));
        // URL handling
        services.set(IURLService, new SyncDescriptor(NativeURLService, undefined, false /* proxied to other processes */));
        // Telemetry
        if (supportsTelemetry(this.productService, this.environmentMainService)) {
            const isInternal = isInternalTelemetry(this.productService, this.configurationService);
            const channel = getDelayedChannel(sharedProcessReady.then(client => client.getChannel('telemetryAppender')));
            const appender = new TelemetryAppenderClient(channel);
            const commonProperties = resolveCommonProperties(release(), hostname(), process.arch, this.productService.commit, this.productService.version, machineId, sqmId, devDeviceId, isInternal);
            const piiPaths = getPiiPathsFromEnvironment(this.environmentMainService);
            const config = { appenders: [appender], commonProperties, piiPaths, sendErrorTelemetry: true };
            services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config], false));
        }
        else {
            services.set(ITelemetryService, NullTelemetryService);
        }
        // Void main process services (required for services with a channel for comm between browser and electron-main (node))
        services.set(IMetricsService, new SyncDescriptor(MetricsMainService, undefined, false));
        services.set(IVoidUpdateService, new SyncDescriptor(VoidMainUpdateService, undefined, false));
        services.set(IVoidSCMService, new SyncDescriptor(VoidSCMService, undefined, false));
        // Default Extensions Profile Init
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        // Utility Process Worker
        services.set(IUtilityProcessWorkerMainService, new SyncDescriptor(UtilityProcessWorkerMainService, undefined, true));
        // Proxy Auth
        services.set(IProxyAuthService, new SyncDescriptor(ProxyAuthService));
        // MCP
        services.set(INativeMcpDiscoveryHelperService, new SyncDescriptor(NativeMcpDiscoveryHelperService));
        // Dev Only: CSS service (for ESM)
        services.set(ICSSDevelopmentService, new SyncDescriptor(CSSDevelopmentService, undefined, true));
        // Init services that require it
        await Promises.settled([
            backupMainService.initialize(),
            workspacesManagementMainService.initialize()
        ]);
        return this.mainInstantiationService.createChild(services);
    }
    initChannels(accessor, mainProcessElectronServer, sharedProcessClient) {
        // Channels registered to node.js are exposed to second instances
        // launching because that is the only way the second instance
        // can talk to the first instance. Electron IPC does not work
        // across apps until `requestSingleInstance` APIs are adopted.
        const disposables = this._register(new DisposableStore());
        const launchChannel = ProxyChannel.fromService(accessor.get(ILaunchMainService), disposables, { disableMarshalling: true });
        this.mainProcessNodeIpcServer.registerChannel('launch', launchChannel);
        const diagnosticsChannel = ProxyChannel.fromService(accessor.get(IDiagnosticsMainService), disposables, { disableMarshalling: true });
        this.mainProcessNodeIpcServer.registerChannel('diagnostics', diagnosticsChannel);
        // Policies (main & shared process)
        const policyChannel = disposables.add(new PolicyChannel(accessor.get(IPolicyService)));
        mainProcessElectronServer.registerChannel('policy', policyChannel);
        sharedProcessClient.then(client => client.registerChannel('policy', policyChannel));
        // Local Files
        const diskFileSystemProvider = this.fileService.getProvider(Schemas.file);
        assertType(diskFileSystemProvider instanceof DiskFileSystemProvider);
        const fileSystemProviderChannel = disposables.add(new DiskFileSystemProviderChannel(diskFileSystemProvider, this.logService, this.environmentMainService));
        mainProcessElectronServer.registerChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME, fileSystemProviderChannel);
        sharedProcessClient.then(client => client.registerChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME, fileSystemProviderChannel));
        // User Data Profiles
        const userDataProfilesService = ProxyChannel.fromService(accessor.get(IUserDataProfilesMainService), disposables);
        mainProcessElectronServer.registerChannel('userDataProfiles', userDataProfilesService);
        sharedProcessClient.then(client => client.registerChannel('userDataProfiles', userDataProfilesService));
        // Update
        const updateChannel = new UpdateChannel(accessor.get(IUpdateService));
        mainProcessElectronServer.registerChannel('update', updateChannel);
        // Process
        const processChannel = ProxyChannel.fromService(accessor.get(IProcessMainService), disposables);
        mainProcessElectronServer.registerChannel('process', processChannel);
        // Encryption
        const encryptionChannel = ProxyChannel.fromService(accessor.get(IEncryptionMainService), disposables);
        mainProcessElectronServer.registerChannel('encryption', encryptionChannel);
        // Signing
        const signChannel = ProxyChannel.fromService(accessor.get(ISignService), disposables);
        mainProcessElectronServer.registerChannel('sign', signChannel);
        // Keyboard Layout
        const keyboardLayoutChannel = ProxyChannel.fromService(accessor.get(IKeyboardLayoutMainService), disposables);
        mainProcessElectronServer.registerChannel('keyboardLayout', keyboardLayoutChannel);
        // Native host (main & shared process)
        this.nativeHostMainService = accessor.get(INativeHostMainService);
        const nativeHostChannel = ProxyChannel.fromService(this.nativeHostMainService, disposables);
        mainProcessElectronServer.registerChannel('nativeHost', nativeHostChannel);
        sharedProcessClient.then(client => client.registerChannel('nativeHost', nativeHostChannel));
        // Web Content Extractor
        const webContentExtractorChannel = ProxyChannel.fromService(accessor.get(IWebContentExtractorService), disposables);
        mainProcessElectronServer.registerChannel('webContentExtractor', webContentExtractorChannel);
        // Workspaces
        const workspacesChannel = ProxyChannel.fromService(accessor.get(IWorkspacesService), disposables);
        mainProcessElectronServer.registerChannel('workspaces', workspacesChannel);
        // Menubar
        const menubarChannel = ProxyChannel.fromService(accessor.get(IMenubarMainService), disposables);
        mainProcessElectronServer.registerChannel('menubar', menubarChannel);
        // URL handling
        const urlChannel = ProxyChannel.fromService(accessor.get(IURLService), disposables);
        mainProcessElectronServer.registerChannel('url', urlChannel);
        // Webview Manager
        const webviewChannel = ProxyChannel.fromService(accessor.get(IWebviewManagerService), disposables);
        mainProcessElectronServer.registerChannel('webview', webviewChannel);
        // Storage (main & shared process)
        const storageChannel = disposables.add((new StorageDatabaseChannel(this.logService, accessor.get(IStorageMainService))));
        mainProcessElectronServer.registerChannel('storage', storageChannel);
        sharedProcessClient.then(client => client.registerChannel('storage', storageChannel));
        // Profile Storage Changes Listener (shared process)
        const profileStorageListener = disposables.add((new ProfileStorageChangesListenerChannel(accessor.get(IStorageMainService), accessor.get(IUserDataProfilesMainService), this.logService)));
        sharedProcessClient.then(client => client.registerChannel('profileStorageListener', profileStorageListener));
        // Terminal
        const ptyHostChannel = ProxyChannel.fromService(accessor.get(ILocalPtyService), disposables);
        mainProcessElectronServer.registerChannel(TerminalIpcChannels.LocalPty, ptyHostChannel);
        // External Terminal
        const externalTerminalChannel = ProxyChannel.fromService(accessor.get(IExternalTerminalMainService), disposables);
        mainProcessElectronServer.registerChannel('externalTerminal', externalTerminalChannel);
        // MCP
        const mcpDiscoveryChannel = ProxyChannel.fromService(accessor.get(INativeMcpDiscoveryHelperService), disposables);
        mainProcessElectronServer.registerChannel(NativeMcpDiscoveryHelperChannelName, mcpDiscoveryChannel);
        // Logger
        const loggerChannel = new LoggerChannel(accessor.get(ILoggerMainService));
        mainProcessElectronServer.registerChannel('logger', loggerChannel);
        sharedProcessClient.then(client => client.registerChannel('logger', loggerChannel));
        // Void - use loggerChannel as reference
        const metricsChannel = ProxyChannel.fromService(accessor.get(IMetricsService), disposables);
        mainProcessElectronServer.registerChannel('void-channel-metrics', metricsChannel);
        const voidUpdatesChannel = ProxyChannel.fromService(accessor.get(IVoidUpdateService), disposables);
        mainProcessElectronServer.registerChannel('void-channel-update', voidUpdatesChannel);
        const sendLLMMessageChannel = new LLMMessageChannel(accessor.get(IMetricsService));
        mainProcessElectronServer.registerChannel('void-channel-llmMessage', sendLLMMessageChannel);
        // Void added this
        const voidSCMChannel = ProxyChannel.fromService(accessor.get(IVoidSCMService), disposables);
        mainProcessElectronServer.registerChannel('void-channel-scm', voidSCMChannel);
        // Void added this
        const mcpChannel = new MCPChannel();
        mainProcessElectronServer.registerChannel('void-channel-mcp', mcpChannel);
        // Extension Host Debug Broadcasting
        const electronExtensionHostDebugBroadcastChannel = new ElectronExtensionHostDebugBroadcastChannel(accessor.get(IWindowsMainService));
        mainProcessElectronServer.registerChannel('extensionhostdebugservice', electronExtensionHostDebugBroadcastChannel);
        // Extension Host Starter
        const extensionHostStarterChannel = ProxyChannel.fromService(accessor.get(IExtensionHostStarter), disposables);
        mainProcessElectronServer.registerChannel(ipcExtensionHostStarterChannelName, extensionHostStarterChannel);
        // Utility Process Worker
        const utilityProcessWorkerChannel = ProxyChannel.fromService(accessor.get(IUtilityProcessWorkerMainService), disposables);
        mainProcessElectronServer.registerChannel(ipcUtilityProcessWorkerChannelName, utilityProcessWorkerChannel);
    }
    async openFirstWindow(accessor, initialProtocolUrls) {
        const windowsMainService = this.windowsMainService = accessor.get(IWindowsMainService);
        this.auxiliaryWindowsMainService = accessor.get(IAuxiliaryWindowsMainService);
        const context = isLaunchedFromCli(process.env) ? 0 /* OpenContext.CLI */ : 4 /* OpenContext.DESKTOP */;
        const args = this.environmentMainService.args;
        // First check for windows from protocol links to open
        if (initialProtocolUrls) {
            // Openables can open as windows directly
            if (initialProtocolUrls.openables.length > 0) {
                return windowsMainService.open({
                    context,
                    cli: args,
                    urisToOpen: initialProtocolUrls.openables,
                    gotoLineMode: true,
                    initialStartup: true
                    // remoteAuthority: will be determined based on openables
                });
            }
            // Protocol links with `windowId=_blank` on startup
            // should be handled in a special way:
            // We take the first one of these and open an empty
            // window for it. This ensures we are not restoring
            // all windows of the previous session.
            // If there are any more URLs like these, they will
            // be handled from the URL listeners installed later.
            if (initialProtocolUrls.urls.length > 0) {
                for (const protocolUrl of initialProtocolUrls.urls) {
                    const params = new URLSearchParams(protocolUrl.uri.query);
                    if (params.get('windowId') === '_blank') {
                        // It is important here that we remove `windowId=_blank` from
                        // this URL because here we open an empty window for it.
                        params.delete('windowId');
                        protocolUrl.originalUrl = protocolUrl.uri.toString(true);
                        protocolUrl.uri = protocolUrl.uri.with({ query: params.toString() });
                        return windowsMainService.open({
                            context,
                            cli: args,
                            forceNewWindow: true,
                            forceEmpty: true,
                            gotoLineMode: true,
                            initialStartup: true
                            // remoteAuthority: will be determined based on openables
                        });
                    }
                }
            }
        }
        const macOpenFiles = global.macOpenFiles;
        const hasCliArgs = args._.length;
        const hasFolderURIs = !!args['folder-uri'];
        const hasFileURIs = !!args['file-uri'];
        const noRecentEntry = args['skip-add-to-recently-opened'] === true;
        const waitMarkerFileURI = args.wait && args.waitMarkerFilePath ? URI.file(args.waitMarkerFilePath) : undefined;
        const remoteAuthority = args.remote || undefined;
        const forceProfile = args.profile;
        const forceTempProfile = args['profile-temp'];
        // Started without file/folder arguments
        if (!hasCliArgs && !hasFolderURIs && !hasFileURIs) {
            // Force new window
            if (args['new-window'] || forceProfile || forceTempProfile) {
                return windowsMainService.open({
                    context,
                    cli: args,
                    forceNewWindow: true,
                    forceEmpty: true,
                    noRecentEntry,
                    waitMarkerFileURI,
                    initialStartup: true,
                    remoteAuthority,
                    forceProfile,
                    forceTempProfile
                });
            }
            // mac: open-file event received on startup
            if (macOpenFiles.length) {
                return windowsMainService.open({
                    context: 1 /* OpenContext.DOCK */,
                    cli: args,
                    urisToOpen: macOpenFiles.map(path => {
                        path = normalizeNFC(path); // macOS only: normalize paths to NFC form
                        return (hasWorkspaceFileExtension(path) ? { workspaceUri: URI.file(path) } : { fileUri: URI.file(path) });
                    }),
                    noRecentEntry,
                    waitMarkerFileURI,
                    initialStartup: true,
                    // remoteAuthority: will be determined based on macOpenFiles
                });
            }
        }
        // default: read paths from cli
        return windowsMainService.open({
            context,
            cli: args,
            forceNewWindow: args['new-window'],
            diffMode: args.diff,
            mergeMode: args.merge,
            noRecentEntry,
            waitMarkerFileURI,
            gotoLineMode: args.goto,
            initialStartup: true,
            remoteAuthority,
            forceProfile,
            forceTempProfile
        });
    }
    afterWindowOpen() {
        // Windows: mutex
        this.installMutex();
        // Remote Authorities
        protocol.registerHttpProtocol(Schemas.vscodeRemoteResource, (request, callback) => {
            callback({
                url: request.url.replace(/^vscode-remote-resource:/, 'http:'),
                method: request.method
            });
        });
        // Start to fetch shell environment (if needed) after window has opened
        // Since this operation can take a long time, we want to warm it up while
        // the window is opening.
        // We also show an error to the user in case this fails.
        this.resolveShellEnvironment(this.environmentMainService.args, process.env, true);
        // Crash reporter
        this.updateCrashReporterEnablement();
        // macOS: rosetta translation warning
        if (isMacintosh && app.runningUnderARM64Translation) {
            this.windowsMainService?.sendToFocused('vscode:showTranslatedBuildWarning');
        }
    }
    async installMutex() {
        const win32MutexName = this.productService.win32MutexName;
        if (isWindows && win32MutexName) {
            try {
                const WindowsMutex = await import('@vscode/windows-mutex');
                const mutex = new WindowsMutex.Mutex(win32MutexName);
                Event.once(this.lifecycleMainService.onWillShutdown)(() => mutex.release());
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
    async resolveShellEnvironment(args, env, notifyOnError) {
        try {
            return await getResolvedShellEnv(this.configurationService, this.logService, args, env);
        }
        catch (error) {
            const errorMessage = toErrorMessage(error);
            if (notifyOnError) {
                this.windowsMainService?.sendToFocused('vscode:showResolveShellEnvError', errorMessage);
            }
            else {
                this.logService.error(errorMessage);
            }
        }
        return {};
    }
    async updateCrashReporterEnablement() {
        // If enable-crash-reporter argv is undefined then this is a fresh start,
        // based on `telemetry.enableCrashreporter` settings, generate a UUID which
        // will be used as crash reporter id and also update the json file.
        try {
            const argvContent = await this.fileService.readFile(this.environmentMainService.argvResource);
            const argvString = argvContent.value.toString();
            const argvJSON = parse(argvString);
            const telemetryLevel = getTelemetryLevel(this.configurationService);
            const enableCrashReporter = telemetryLevel >= 1 /* TelemetryLevel.CRASH */;
            // Initial startup
            if (argvJSON['enable-crash-reporter'] === undefined) {
                const additionalArgvContent = [
                    '',
                    '	// Allows to disable crash reporting.',
                    '	// Should restart the app if the value is changed.',
                    `	"enable-crash-reporter": ${enableCrashReporter},`,
                    '',
                    '	// Unique id used for correlating crash reports sent from this instance.',
                    '	// Do not edit this value.',
                    `	"crash-reporter-id": "${generateUuid()}"`,
                    '}'
                ];
                const newArgvString = argvString.substring(0, argvString.length - 2).concat(',\n', additionalArgvContent.join('\n'));
                await this.fileService.writeFile(this.environmentMainService.argvResource, VSBuffer.fromString(newArgvString));
            }
            // Subsequent startup: update crash reporter value if changed
            else {
                const newArgvString = argvString.replace(/"enable-crash-reporter": .*,/, `"enable-crash-reporter": ${enableCrashReporter},`);
                if (newArgvString !== argvString) {
                    await this.fileService.writeFile(this.environmentMainService.argvResource, VSBuffer.fromString(newArgvString));
                }
            }
        }
        catch (error) {
            this.logService.error(error);
            // Inform the user via notification
            this.windowsMainService?.sendToFocused('vscode:showArgvParseWarning');
        }
    }
    eventuallyAfterWindowOpen() {
        // Validate Device ID is up to date (delay this as it has shown significant perf impact)
        // Refs: https://github.com/microsoft/vscode/issues/234064
        validatedevDeviceId(this.stateService, this.logService);
    }
};
CodeApplication = CodeApplication_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService),
    __param(4, ILoggerService),
    __param(5, IEnvironmentMainService),
    __param(6, ILifecycleMainService),
    __param(7, IConfigurationService),
    __param(8, IStateService),
    __param(9, IFileService),
    __param(10, IProductService),
    __param(11, IUserDataProfilesMainService)
], CodeApplication);
export { CodeApplication };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tbWFpbi9hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBVyxpQkFBaUIsRUFBZ0IsTUFBTSxVQUFVLENBQUM7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDdkMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ25ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hELE9BQU8sRUFBdUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RILE9BQU8sRUFB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