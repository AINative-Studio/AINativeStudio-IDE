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
import * as fs from 'fs';
import { exec } from 'child_process';
import { app, BrowserWindow, clipboard, Menu, powerMonitor, screen, shell, webContents } from 'electron';
import { arch, cpus, freemem, loadavg, platform, release, totalmem, type } from 'os';
import { promisify } from 'util';
import { memoize } from '../../../base/common/decorators.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { matchesSomeScheme, Schemas } from '../../../base/common/network.js';
import { dirname, join, posix, resolve, win32 } from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { realpath } from '../../../base/node/extpath.js';
import { virtualMachineHint } from '../../../base/node/id.js';
import { Promises, SymlinkSupport } from '../../../base/node/pfs.js';
import { findFreePort } from '../../../base/node/ports.js';
import { localize } from '../../../nls.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { defaultWindowState } from '../../window/electron-main/window.js';
import { defaultBrowserWindowOptions, IWindowsMainService } from '../../windows/electron-main/windows.js';
import { isWorkspaceIdentifier, toWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { hasWSLFeatureInstalled } from '../../remote/node/wsl.js';
import { WindowProfiler } from '../../profiling/electron-main/windowProfiling.js';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { CancellationError } from '../../../base/common/errors.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IProxyAuthService } from './auth.js';
import { IRequestService } from '../../request/common/request.js';
import { randomPath } from '../../../base/common/extpath.js';
export const INativeHostMainService = createDecorator('nativeHostMainService');
let NativeHostMainService = class NativeHostMainService extends Disposable {
    constructor(windowsMainService, auxiliaryWindowsMainService, dialogMainService, lifecycleMainService, environmentMainService, logService, productService, themeMainService, workspacesManagementMainService, configurationService, requestService, proxyAuthService, instantiationService) {
        super();
        this.windowsMainService = windowsMainService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
        this.dialogMainService = dialogMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        this.productService = productService;
        this.themeMainService = themeMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.configurationService = configurationService;
        this.requestService = requestService;
        this.proxyAuthService = proxyAuthService;
        this.instantiationService = instantiationService;
        this._onDidChangePassword = this._register(new Emitter());
        this.onDidChangePassword = this._onDidChangePassword.event;
        // Events
        {
            this.onDidOpenMainWindow = Event.map(this.windowsMainService.onDidOpenWindow, window => window.id);
            this.onDidTriggerWindowSystemContextMenu = Event.any(Event.map(this.windowsMainService.onDidTriggerSystemContextMenu, ({ window, x, y }) => ({ windowId: window.id, x, y })), Event.map(this.auxiliaryWindowsMainService.onDidTriggerSystemContextMenu, ({ window, x, y }) => ({ windowId: window.id, x, y })));
            this.onDidMaximizeWindow = Event.any(Event.map(this.windowsMainService.onDidMaximizeWindow, window => window.id), Event.map(this.auxiliaryWindowsMainService.onDidMaximizeWindow, window => window.id));
            this.onDidUnmaximizeWindow = Event.any(Event.map(this.windowsMainService.onDidUnmaximizeWindow, window => window.id), Event.map(this.auxiliaryWindowsMainService.onDidUnmaximizeWindow, window => window.id));
            this.onDidChangeWindowFullScreen = Event.any(Event.map(this.windowsMainService.onDidChangeFullScreen, e => ({ windowId: e.window.id, fullscreen: e.fullscreen })), Event.map(this.auxiliaryWindowsMainService.onDidChangeFullScreen, e => ({ windowId: e.window.id, fullscreen: e.fullscreen })));
            this.onDidBlurMainWindow = Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-blur', (event, window) => window.id), windowId => !!this.windowsMainService.getWindowById(windowId));
            this.onDidFocusMainWindow = Event.any(Event.map(Event.filter(Event.map(this.windowsMainService.onDidChangeWindowsCount, () => this.windowsMainService.getLastActiveWindow()), window => !!window), window => window.id), Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-focus', (event, window) => window.id), windowId => !!this.windowsMainService.getWindowById(windowId)));
            this.onDidBlurMainOrAuxiliaryWindow = Event.any(this.onDidBlurMainWindow, Event.map(Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-blur', (event, window) => this.auxiliaryWindowsMainService.getWindowByWebContents(window.webContents)), window => !!window), window => window.id));
            this.onDidFocusMainOrAuxiliaryWindow = Event.any(this.onDidFocusMainWindow, Event.map(Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-focus', (event, window) => this.auxiliaryWindowsMainService.getWindowByWebContents(window.webContents)), window => !!window), window => window.id));
            this.onDidResumeOS = Event.fromNodeEventEmitter(powerMonitor, 'resume');
            this.onDidChangeColorScheme = this.themeMainService.onDidChangeColorScheme;
            this.onDidChangeDisplay = Event.debounce(Event.any(Event.filter(Event.fromNodeEventEmitter(screen, 'display-metrics-changed', (event, display, changedMetrics) => changedMetrics), changedMetrics => {
                // Electron will emit 'display-metrics-changed' events even when actually
                // going fullscreen, because the dock hides. However, we do not want to
                // react on this event as there is no change in display bounds.
                return !(Array.isArray(changedMetrics) && changedMetrics.length === 1 && changedMetrics[0] === 'workArea');
            }), Event.fromNodeEventEmitter(screen, 'display-added'), Event.fromNodeEventEmitter(screen, 'display-removed')), () => { }, 100);
        }
    }
    //#region Properties
    get windowId() { throw new Error('Not implemented in electron-main'); }
    async getWindows(windowId, options) {
        const mainWindows = this.windowsMainService.getWindows().map(window => ({
            id: window.id,
            workspace: window.openedWorkspace ?? toWorkspaceIdentifier(window.backupPath, window.isExtensionDevelopmentHost),
            title: window.win?.getTitle() ?? '',
            filename: window.getRepresentedFilename(),
            dirty: window.isDocumentEdited()
        }));
        const auxiliaryWindows = [];
        if (options.includeAuxiliaryWindows) {
            auxiliaryWindows.push(...this.auxiliaryWindowsMainService.getWindows().map(window => ({
                id: window.id,
                parentId: window.parentId,
                title: window.win?.getTitle() ?? '',
                filename: window.getRepresentedFilename()
            })));
        }
        return [...mainWindows, ...auxiliaryWindows];
    }
    async getWindowCount(windowId) {
        return this.windowsMainService.getWindowCount();
    }
    async getActiveWindowId(windowId) {
        const activeWindow = this.windowsMainService.getFocusedWindow() || this.windowsMainService.getLastActiveWindow();
        if (activeWindow) {
            return activeWindow.id;
        }
        return undefined;
    }
    async getActiveWindowPosition() {
        const activeWindow = this.windowsMainService.getFocusedWindow() || this.windowsMainService.getLastActiveWindow();
        if (activeWindow) {
            return activeWindow.getBounds();
        }
        return undefined;
    }
    async getNativeWindowHandle(fallbackWindowId, windowId) {
        const window = this.windowById(windowId, fallbackWindowId);
        if (window?.win) {
            return VSBuffer.wrap(window.win.getNativeWindowHandle());
        }
        return undefined;
    }
    openWindow(windowId, arg1, arg2) {
        if (Array.isArray(arg1)) {
            return this.doOpenWindow(windowId, arg1, arg2);
        }
        return this.doOpenEmptyWindow(windowId, arg1);
    }
    async doOpenWindow(windowId, toOpen, options = Object.create(null)) {
        if (toOpen.length > 0) {
            await this.windowsMainService.open({
                context: 5 /* OpenContext.API */,
                contextWindowId: windowId,
                urisToOpen: toOpen,
                cli: this.environmentMainService.args,
                forceNewWindow: options.forceNewWindow,
                forceReuseWindow: options.forceReuseWindow,
                preferNewWindow: options.preferNewWindow,
                diffMode: options.diffMode,
                mergeMode: options.mergeMode,
                addMode: options.addMode,
                removeMode: options.removeMode,
                gotoLineMode: options.gotoLineMode,
                noRecentEntry: options.noRecentEntry,
                waitMarkerFileURI: options.waitMarkerFileURI,
                remoteAuthority: options.remoteAuthority || undefined,
                forceProfile: options.forceProfile,
                forceTempProfile: options.forceTempProfile,
            });
        }
    }
    async doOpenEmptyWindow(windowId, options) {
        await this.windowsMainService.openEmptyWindow({
            context: 5 /* OpenContext.API */,
            contextWindowId: windowId
        }, options);
    }
    async isFullScreen(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.isFullScreen ?? false;
    }
    async toggleFullScreen(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.toggleFullScreen();
    }
    async getCursorScreenPoint(windowId) {
        const point = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(point);
        return { point, display: display.bounds };
    }
    async isMaximized(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.win?.isMaximized() ?? false;
    }
    async maximizeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.maximize();
    }
    async unmaximizeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.unmaximize();
    }
    async minimizeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.minimize();
    }
    async moveWindowTop(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.moveTop();
    }
    async positionWindow(windowId, position, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        if (window?.win) {
            if (window.win.isFullScreen()) {
                const fullscreenLeftFuture = Event.toPromise(Event.once(Event.fromNodeEventEmitter(window.win, 'leave-full-screen')));
                window.win.setFullScreen(false);
                await fullscreenLeftFuture;
            }
            window.win.setBounds(position);
        }
    }
    async updateWindowControls(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.updateWindowControls(options);
    }
    async focusWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.focus({ force: options?.force ?? false });
    }
    async setMinimumSize(windowId, width, height) {
        const window = this.codeWindowById(windowId);
        if (window?.win) {
            const [windowWidth, windowHeight] = window.win.getSize();
            const [minWindowWidth, minWindowHeight] = window.win.getMinimumSize();
            const [newMinWindowWidth, newMinWindowHeight] = [width ?? minWindowWidth, height ?? minWindowHeight];
            const [newWindowWidth, newWindowHeight] = [Math.max(windowWidth, newMinWindowWidth), Math.max(windowHeight, newMinWindowHeight)];
            if (minWindowWidth !== newMinWindowWidth || minWindowHeight !== newMinWindowHeight) {
                window.win.setMinimumSize(newMinWindowWidth, newMinWindowHeight);
            }
            if (windowWidth !== newWindowWidth || windowHeight !== newWindowHeight) {
                window.win.setSize(newWindowWidth, newWindowHeight);
            }
        }
    }
    async saveWindowSplash(windowId, splash) {
        const window = this.codeWindowById(windowId);
        this.themeMainService.saveWindowSplash(windowId, window?.openedWorkspace, splash);
    }
    //#endregion
    //#region macOS Shell Command
    async installShellCommand(windowId) {
        const { source, target } = await this.getShellCommandLink();
        // Only install unless already existing
        try {
            const { symbolicLink } = await SymlinkSupport.stat(source);
            if (symbolicLink && !symbolicLink.dangling) {
                const linkTargetRealPath = await realpath(source);
                if (target === linkTargetRealPath) {
                    return;
                }
            }
            // Different source, delete it first
            await fs.promises.unlink(source);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error; // throw on any error but file not found
            }
        }
        try {
            await fs.promises.symlink(target, source);
        }
        catch (error) {
            if (error.code !== 'EACCES' && error.code !== 'ENOENT') {
                throw error;
            }
            const { response } = await this.showMessageBox(windowId, {
                type: 'info',
                message: localize('warnEscalation', "{0} will now prompt with 'osascript' for Administrator privileges to install the shell command.", this.productService.nameShort),
                buttons: [
                    localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                    localize('cancel', "Cancel")
                ]
            });
            if (response === 1 /* Cancel */) {
                throw new CancellationError();
            }
            try {
                const command = `osascript -e "do shell script \\"mkdir -p /usr/local/bin && ln -sf \'${target}\' \'${source}\'\\" with administrator privileges"`;
                await promisify(exec)(command);
            }
            catch (error) {
                throw new Error(localize('cantCreateBinFolder', "Unable to install the shell command '{0}'.", source));
            }
        }
    }
    async uninstallShellCommand(windowId) {
        const { source } = await this.getShellCommandLink();
        try {
            await fs.promises.unlink(source);
        }
        catch (error) {
            switch (error.code) {
                case 'EACCES': {
                    const { response } = await this.showMessageBox(windowId, {
                        type: 'info',
                        message: localize('warnEscalationUninstall', "{0} will now prompt with 'osascript' for Administrator privileges to uninstall the shell command.", this.productService.nameShort),
                        buttons: [
                            localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                            localize('cancel', "Cancel")
                        ]
                    });
                    if (response === 1 /* Cancel */) {
                        throw new CancellationError();
                    }
                    try {
                        const command = `osascript -e "do shell script \\"rm \'${source}\'\\" with administrator privileges"`;
                        await promisify(exec)(command);
                    }
                    catch (error) {
                        throw new Error(localize('cantUninstall', "Unable to uninstall the shell command '{0}'.", source));
                    }
                    break;
                }
                case 'ENOENT':
                    break; // ignore file not found
                default:
                    throw error;
            }
        }
    }
    async getShellCommandLink() {
        const target = resolve(this.environmentMainService.appRoot, 'bin', 'code');
        const source = `/usr/local/bin/${this.productService.applicationName}`;
        // Ensure source exists
        const sourceExists = await Promises.exists(target);
        if (!sourceExists) {
            throw new Error(localize('sourceMissing', "Unable to find shell script in '{0}'", target));
        }
        return { source, target };
    }
    //#endregion
    //#region Dialog
    async showMessageBox(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return this.dialogMainService.showMessageBox(options, window?.win ?? undefined);
    }
    async showSaveDialog(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return this.dialogMainService.showSaveDialog(options, window?.win ?? undefined);
    }
    async showOpenDialog(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return this.dialogMainService.showOpenDialog(options, window?.win ?? undefined);
    }
    async pickFileFolderAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickFileFolder(options);
        if (paths) {
            await this.doOpenPicked(await Promise.all(paths.map(async (path) => (await SymlinkSupport.existsDirectory(path)) ? { folderUri: URI.file(path) } : { fileUri: URI.file(path) })), options, windowId);
        }
    }
    async pickFolderAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickFolder(options);
        if (paths) {
            await this.doOpenPicked(paths.map(path => ({ folderUri: URI.file(path) })), options, windowId);
        }
    }
    async pickFileAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickFile(options);
        if (paths) {
            await this.doOpenPicked(paths.map(path => ({ fileUri: URI.file(path) })), options, windowId);
        }
    }
    async pickWorkspaceAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickWorkspace(options);
        if (paths) {
            await this.doOpenPicked(paths.map(path => ({ workspaceUri: URI.file(path) })), options, windowId);
        }
    }
    async doOpenPicked(openable, options, windowId) {
        await this.windowsMainService.open({
            context: 3 /* OpenContext.DIALOG */,
            contextWindowId: windowId,
            cli: this.environmentMainService.args,
            urisToOpen: openable,
            forceNewWindow: options.forceNewWindow,
            /* remoteAuthority will be determined based on openable */
        });
    }
    //#endregion
    //#region OS
    async showItemInFolder(windowId, path) {
        shell.showItemInFolder(path);
    }
    async setRepresentedFilename(windowId, path, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.setRepresentedFilename(path);
    }
    async setDocumentEdited(windowId, edited, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.setDocumentEdited(edited);
    }
    async openExternal(windowId, url, defaultApplication) {
        this.environmentMainService.unsetSnapExportedVariables();
        try {
            if (matchesSomeScheme(url, Schemas.http, Schemas.https)) {
                this.openExternalBrowser(url, defaultApplication);
            }
            else {
                shell.openExternal(url);
            }
        }
        finally {
            this.environmentMainService.restoreSnapExportedVariables();
        }
        return true;
    }
    async openExternalBrowser(url, defaultApplication) {
        const configuredBrowser = defaultApplication ?? this.configurationService.getValue('workbench.externalBrowser');
        if (!configuredBrowser) {
            return shell.openExternal(url);
        }
        if (configuredBrowser.includes(posix.sep) || configuredBrowser.includes(win32.sep)) {
            const browserPathExists = await Promises.exists(configuredBrowser);
            if (!browserPathExists) {
                this.logService.error(`Configured external browser path does not exist: ${configuredBrowser}`);
                return shell.openExternal(url);
            }
        }
        try {
            const { default: open } = await import('open');
            const res = await open(url, {
                app: {
                    // Use `open.apps` helper to allow cross-platform browser
                    // aliases to be looked up properly. Fallback to the
                    // configured value if not found.
                    name: Object.hasOwn(open.apps, configuredBrowser) ? open.apps[configuredBrowser] : configuredBrowser
                }
            });
            if (!isWindows) {
                // On Linux/macOS, listen to stderr and treat that as failure
                // for opening the browser to fallback to the default.
                // On Windows, unfortunately PowerShell seems to always write
                // to stderr so we cannot use it there
                // (see also https://github.com/microsoft/vscode/issues/230636)
                res.stderr?.once('data', (data) => {
                    this.logService.error(`Error openening external URL '${url}' using browser '${configuredBrowser}': ${data.toString()}`);
                    return shell.openExternal(url);
                });
            }
        }
        catch (error) {
            this.logService.error(`Unable to open external URL '${url}' using browser '${configuredBrowser}' due to ${error}.`);
            return shell.openExternal(url);
        }
    }
    moveItemToTrash(windowId, fullPath) {
        return shell.trashItem(fullPath);
    }
    async isAdmin() {
        let isAdmin;
        if (isWindows) {
            isAdmin = (await import('native-is-elevated')).default();
        }
        else {
            isAdmin = process.getuid?.() === 0;
        }
        return isAdmin;
    }
    async writeElevated(windowId, source, target, options) {
        const sudoPrompt = await import('@vscode/sudo-prompt');
        const argsFile = randomPath(this.environmentMainService.userDataPath, 'code-elevated');
        await Promises.writeFile(argsFile, JSON.stringify({ source: source.fsPath, target: target.fsPath }));
        try {
            await new Promise((resolve, reject) => {
                const sudoCommand = [`"${this.cliPath}"`];
                if (options?.unlock) {
                    sudoCommand.push('--file-chmod');
                }
                sudoCommand.push('--file-write', `"${argsFile}"`);
                const promptOptions = {
                    name: this.productService.nameLong.replace('-', ''),
                    icns: (isMacintosh && this.environmentMainService.isBuilt) ? join(dirname(this.environmentMainService.appRoot), `${this.productService.nameShort}.icns`) : undefined
                };
                this.logService.trace(`[sudo-prompt] running command: ${sudoCommand.join(' ')}`);
                sudoPrompt.exec(sudoCommand.join(' '), promptOptions, (error, stdout, stderr) => {
                    if (stdout) {
                        this.logService.trace(`[sudo-prompt] received stdout: ${stdout}`);
                    }
                    if (stderr) {
                        this.logService.error(`[sudo-prompt] received stderr: ${stderr}`);
                    }
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(undefined);
                    }
                });
            });
        }
        finally {
            await fs.promises.unlink(argsFile);
        }
    }
    async isRunningUnderARM64Translation() {
        if (isLinux || isWindows) {
            return false;
        }
        return app.runningUnderARM64Translation;
    }
    get cliPath() {
        // Windows
        if (isWindows) {
            if (this.environmentMainService.isBuilt) {
                return join(dirname(process.execPath), 'bin', `${this.productService.applicationName}.cmd`);
            }
            return join(this.environmentMainService.appRoot, 'scripts', 'code-cli.bat');
        }
        // Linux
        if (isLinux) {
            if (this.environmentMainService.isBuilt) {
                return join(dirname(process.execPath), 'bin', `${this.productService.applicationName}`);
            }
            return join(this.environmentMainService.appRoot, 'scripts', 'code-cli.sh');
        }
        // macOS
        if (this.environmentMainService.isBuilt) {
            return join(this.environmentMainService.appRoot, 'bin', 'code');
        }
        return join(this.environmentMainService.appRoot, 'scripts', 'code-cli.sh');
    }
    async getOSStatistics() {
        return {
            totalmem: totalmem(),
            freemem: freemem(),
            loadavg: loadavg()
        };
    }
    async getOSProperties() {
        return {
            arch: arch(),
            platform: platform(),
            release: release(),
            type: type(),
            cpus: cpus()
        };
    }
    async getOSVirtualMachineHint() {
        return virtualMachineHint.value();
    }
    async getOSColorScheme() {
        return this.themeMainService.getColorScheme();
    }
    // WSL
    async hasWSLFeatureInstalled() {
        return isWindows && hasWSLFeatureInstalled();
    }
    //#endregion
    //#region Screenshots
    async getScreenshot(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        const captured = await window?.win?.webContents.capturePage();
        return captured?.toJPEG(95);
    }
    //#endregion
    //#region Process
    async getProcessId(windowId) {
        const window = this.windowById(undefined, windowId);
        return window?.win?.webContents.getOSProcessId();
    }
    async killProcess(windowId, pid, code) {
        process.kill(pid, code);
    }
    //#endregion
    //#region Clipboard
    async readClipboardText(windowId, type) {
        return clipboard.readText(type);
    }
    async readImage() {
        return clipboard.readImage().toPNG();
    }
    async writeClipboardText(windowId, text, type) {
        return clipboard.writeText(text, type);
    }
    async readClipboardFindText(windowId) {
        return clipboard.readFindText();
    }
    async writeClipboardFindText(windowId, text) {
        return clipboard.writeFindText(text);
    }
    async writeClipboardBuffer(windowId, format, buffer, type) {
        return clipboard.writeBuffer(format, Buffer.from(buffer.buffer), type);
    }
    async readClipboardBuffer(windowId, format) {
        return VSBuffer.wrap(clipboard.readBuffer(format));
    }
    async hasClipboard(windowId, format, type) {
        return clipboard.has(format, type);
    }
    //#endregion
    //#region macOS Touchbar
    async newWindowTab() {
        await this.windowsMainService.open({
            context: 5 /* OpenContext.API */,
            cli: this.environmentMainService.args,
            forceNewTabbedWindow: true,
            forceEmpty: true,
            remoteAuthority: this.environmentMainService.args.remote || undefined
        });
    }
    async showPreviousWindowTab() {
        Menu.sendActionToFirstResponder('selectPreviousTab:');
    }
    async showNextWindowTab() {
        Menu.sendActionToFirstResponder('selectNextTab:');
    }
    async moveWindowTabToNewWindow() {
        Menu.sendActionToFirstResponder('moveTabToNewWindow:');
    }
    async mergeAllWindowTabs() {
        Menu.sendActionToFirstResponder('mergeAllWindows:');
    }
    async toggleWindowTabsBar() {
        Menu.sendActionToFirstResponder('toggleTabBar:');
    }
    async updateTouchBar(windowId, items) {
        const window = this.codeWindowById(windowId);
        window?.updateTouchBar(items);
    }
    //#endregion
    //#region Lifecycle
    async notifyReady(windowId) {
        const window = this.codeWindowById(windowId);
        window?.setReady();
    }
    async relaunch(windowId, options) {
        return this.lifecycleMainService.relaunch(options);
    }
    async reload(windowId, options) {
        const window = this.codeWindowById(windowId);
        if (window) {
            // Special case: support `transient` workspaces by preventing
            // the reload and rather go back to an empty window. Transient
            // workspaces should never restore, even when the user wants
            // to reload.
            // For: https://github.com/microsoft/vscode/issues/119695
            if (isWorkspaceIdentifier(window.openedWorkspace)) {
                const configPath = window.openedWorkspace.configPath;
                if (configPath.scheme === Schemas.file) {
                    const workspace = await this.workspacesManagementMainService.resolveLocalWorkspace(configPath);
                    if (workspace?.transient) {
                        return this.openWindow(window.id, { forceReuseWindow: true });
                    }
                }
            }
            // Proceed normally to reload the window
            return this.lifecycleMainService.reload(window, options?.disableExtensions !== undefined ? { _: [], 'disable-extensions': options.disableExtensions } : undefined);
        }
    }
    async closeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.win?.close();
    }
    async quit(windowId) {
        // If the user selected to exit from an extension development host window, do not quit, but just
        // close the window unless this is the last window that is opened.
        const window = this.windowsMainService.getLastActiveWindow();
        if (window?.isExtensionDevelopmentHost && this.windowsMainService.getWindowCount() > 1 && window.win) {
            window.win.close();
        }
        // Otherwise: normal quit
        else {
            this.lifecycleMainService.quit();
        }
    }
    async exit(windowId, code) {
        await this.lifecycleMainService.kill(code);
    }
    //#endregion
    //#region Connectivity
    async resolveProxy(windowId, url) {
        const window = this.codeWindowById(windowId);
        const session = window?.win?.webContents?.session;
        return session?.resolveProxy(url);
    }
    async lookupAuthorization(_windowId, authInfo) {
        return this.proxyAuthService.lookupAuthorization(authInfo);
    }
    async lookupKerberosAuthorization(_windowId, url) {
        return this.requestService.lookupKerberosAuthorization(url);
    }
    async loadCertificates(_windowId) {
        return this.requestService.loadCertificates();
    }
    findFreePort(windowId, startPort, giveUpAfter, timeout, stride = 1) {
        return findFreePort(startPort, giveUpAfter, timeout, stride);
    }
    async openDevTools(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.webContents.openDevTools(options?.mode ? { mode: options.mode, activate: options.activate } : undefined);
    }
    async toggleDevTools(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.webContents.toggleDevTools();
    }
    async openGPUInfoWindow(windowId) {
        const parentWindow = this.codeWindowById(windowId);
        if (!parentWindow) {
            return;
        }
        if (typeof this.gpuInfoWindowId !== 'number') {
            const options = this.instantiationService.invokeFunction(defaultBrowserWindowOptions, defaultWindowState(), { forceNativeTitlebar: true });
            options.backgroundColor = undefined;
            const gpuInfoWindow = new BrowserWindow(options);
            gpuInfoWindow.setMenuBarVisibility(false);
            gpuInfoWindow.loadURL('chrome://gpu');
            gpuInfoWindow.once('ready-to-show', () => gpuInfoWindow.show());
            gpuInfoWindow.once('close', () => this.gpuInfoWindowId = undefined);
            parentWindow.win?.on('close', () => {
                if (this.gpuInfoWindowId) {
                    BrowserWindow.fromId(this.gpuInfoWindowId)?.close();
                    this.gpuInfoWindowId = undefined;
                }
            });
            this.gpuInfoWindowId = gpuInfoWindow.id;
        }
        if (typeof this.gpuInfoWindowId === 'number') {
            const window = BrowserWindow.fromId(this.gpuInfoWindowId);
            if (window?.isMinimized()) {
                window?.restore();
            }
            window?.focus();
        }
    }
    //#endregion
    // #region Performance
    async profileRenderer(windowId, session, duration) {
        const window = this.codeWindowById(windowId);
        if (!window || !window.win) {
            throw new Error();
        }
        const profiler = new WindowProfiler(window.win, session, this.logService);
        const result = await profiler.inspect(duration);
        return result;
    }
    // #endregion
    //#region Registry (windows)
    async windowsGetStringRegKey(windowId, hive, path, name) {
        if (!isWindows) {
            return undefined;
        }
        const Registry = await import('@vscode/windows-registry');
        try {
            return Registry.GetStringRegKey(hive, path, name);
        }
        catch {
            return undefined;
        }
    }
    //#endregion
    windowById(windowId, fallbackCodeWindowId) {
        return this.codeWindowById(windowId) ?? this.auxiliaryWindowById(windowId) ?? this.codeWindowById(fallbackCodeWindowId);
    }
    codeWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        return this.windowsMainService.getWindowById(windowId);
    }
    auxiliaryWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        const contents = webContents.fromId(windowId);
        if (!contents) {
            return undefined;
        }
        return this.auxiliaryWindowsMainService.getWindowByWebContents(contents);
    }
};
__decorate([
    memoize
], NativeHostMainService.prototype, "cliPath", null);
NativeHostMainService = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IAuxiliaryWindowsMainService),
    __param(2, IDialogMainService),
    __param(3, ILifecycleMainService),
    __param(4, IEnvironmentMainService),
    __param(5, ILogService),
    __param(6, IProductService),
    __param(7, IThemeMainService),
    __param(8, IWorkspacesManagementMainService),
    __param(9, IConfigurationService),
    __param(10, IRequestService),
    __param(11, IProxyAuthService),
    __param(12, IInstantiationService)
], NativeHostMainService);
export { NativeHostMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSG9zdE1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbmF0aXZlL2VsZWN0cm9uLW1haW4vbmF0aXZlSG9zdE1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFXLElBQUksRUFBMkcsWUFBWSxFQUE0QyxNQUFNLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNyUSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLElBQUksQ0FBQztBQUNyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxT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