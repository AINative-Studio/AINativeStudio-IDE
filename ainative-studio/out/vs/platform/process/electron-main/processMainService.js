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
var ProcessMainService_1;
import { BrowserWindow, contentTracing, screen } from 'electron';
import { randomPath } from '../../../base/common/extpath.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { FileAccess } from '../../../base/common/network.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { listProcesses } from '../../../base/node/ps.js';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { getNLSLanguage, getNLSMessages, localize } from '../../../nls.js';
import { IDiagnosticsService, isRemoteDiagnosticError } from '../../diagnostics/common/diagnostics.js';
import { IDiagnosticsMainService } from '../../diagnostics/electron-main/diagnosticsMainService.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ICSSDevelopmentService } from '../../cssDev/node/cssDevService.js';
import { ILogService } from '../../log/common/log.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import product from '../../product/common/product.js';
import { IProductService } from '../../product/common/productService.js';
import { IProtocolMainService } from '../../protocol/electron-main/protocol.js';
import { IStateService } from '../../state/node/state.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
import { zoomLevelToZoomFactor } from '../../window/common/window.js';
const processExplorerWindowState = 'issue.processExplorerWindowState';
let ProcessMainService = class ProcessMainService {
    static { ProcessMainService_1 = this; }
    static { this.DEFAULT_BACKGROUND_COLOR = '#1E1E1E'; }
    constructor(userEnv, environmentMainService, logService, diagnosticsService, diagnosticsMainService, dialogMainService, nativeHostMainService, protocolMainService, productService, stateService, cssDevelopmentService) {
        this.userEnv = userEnv;
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        this.diagnosticsService = diagnosticsService;
        this.diagnosticsMainService = diagnosticsMainService;
        this.dialogMainService = dialogMainService;
        this.nativeHostMainService = nativeHostMainService;
        this.protocolMainService = protocolMainService;
        this.productService = productService;
        this.stateService = stateService;
        this.cssDevelopmentService = cssDevelopmentService;
        this.processExplorerWindow = null;
        this.processExplorerParentWindow = null;
        this.registerListeners();
    }
    //#region Register Listeners
    registerListeners() {
        validatedIpcMain.on('vscode:listProcesses', async (event) => {
            const processes = [];
            try {
                processes.push({ name: localize('local', "Local"), rootProcess: await listProcesses(process.pid) });
                const remoteDiagnostics = await this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: true });
                remoteDiagnostics.forEach(data => {
                    if (isRemoteDiagnosticError(data)) {
                        processes.push({
                            name: data.hostName,
                            rootProcess: data
                        });
                    }
                    else {
                        if (data.processes) {
                            processes.push({
                                name: data.hostName,
                                rootProcess: data.processes
                            });
                        }
                    }
                });
            }
            catch (e) {
                this.logService.error(`Listing processes failed: ${e}`);
            }
            this.safeSend(event, 'vscode:listProcessesResponse', processes);
        });
        validatedIpcMain.on('vscode:workbenchCommand', (_, commandInfo) => {
            const { id, from, args } = commandInfo;
            let parentWindow;
            switch (from) {
                case 'processExplorer':
                    parentWindow = this.processExplorerParentWindow;
                    break;
                default:
                    // The issue reporter does not use this anymore.
                    throw new Error(`Unexpected command source: ${from}`);
            }
            parentWindow?.webContents.send('vscode:runAction', { id, from, args });
        });
        validatedIpcMain.on('vscode:closeProcessExplorer', event => {
            this.processExplorerWindow?.close();
        });
        validatedIpcMain.on('vscode:pidToNameRequest', async (event) => {
            const mainProcessInfo = await this.diagnosticsMainService.getMainDiagnostics();
            const pidToNames = [];
            for (const window of mainProcessInfo.windows) {
                pidToNames.push([window.pid, `window [${window.id}] (${window.title})`]);
            }
            for (const { pid, name } of UtilityProcess.getAll()) {
                pidToNames.push([pid, name]);
            }
            this.safeSend(event, 'vscode:pidToNameResponse', pidToNames);
        });
    }
    async openProcessExplorer(data) {
        if (!this.processExplorerWindow) {
            this.processExplorerParentWindow = BrowserWindow.getFocusedWindow();
            if (this.processExplorerParentWindow) {
                const processExplorerDisposables = new DisposableStore();
                const processExplorerWindowConfigUrl = processExplorerDisposables.add(this.protocolMainService.createIPCObjectUrl());
                const savedPosition = this.stateService.getItem(processExplorerWindowState, undefined);
                const position = isStrictWindowState(savedPosition) ? savedPosition : this.getWindowPosition(this.processExplorerParentWindow, 800, 500);
                this.processExplorerWindow = this.createBrowserWindow(position, processExplorerWindowConfigUrl, {
                    backgroundColor: data.styles.backgroundColor,
                    title: localize('processExplorer', "Process Explorer"),
                    zoomLevel: data.zoomLevel,
                    alwaysOnTop: true
                }, 'process-explorer');
                // Store into config object URL
                processExplorerWindowConfigUrl.update({
                    appRoot: this.environmentMainService.appRoot,
                    windowId: this.processExplorerWindow.id,
                    userEnv: this.userEnv,
                    data,
                    product,
                    nls: {
                        messages: getNLSMessages(),
                        language: getNLSLanguage()
                    },
                    cssModules: this.cssDevelopmentService.isEnabled ? await this.cssDevelopmentService.getCssModules() : undefined
                });
                this.processExplorerWindow.loadURL(FileAccess.asBrowserUri(`vs/code/electron-sandbox/processExplorer/processExplorer${this.environmentMainService.isBuilt ? '' : '-dev'}.html`).toString(true));
                this.processExplorerWindow.on('close', () => {
                    this.processExplorerWindow = null;
                    processExplorerDisposables.dispose();
                });
                this.processExplorerParentWindow.on('close', () => {
                    if (this.processExplorerWindow) {
                        this.processExplorerWindow.close();
                        this.processExplorerWindow = null;
                        processExplorerDisposables.dispose();
                    }
                });
                const storeState = () => {
                    if (!this.processExplorerWindow) {
                        return;
                    }
                    const size = this.processExplorerWindow.getSize();
                    const position = this.processExplorerWindow.getPosition();
                    if (!size || !position) {
                        return;
                    }
                    const state = {
                        width: size[0],
                        height: size[1],
                        x: position[0],
                        y: position[1]
                    };
                    this.stateService.setItem(processExplorerWindowState, state);
                };
                this.processExplorerWindow.on('moved', storeState);
                this.processExplorerWindow.on('resized', storeState);
            }
        }
        if (this.processExplorerWindow) {
            this.focusWindow(this.processExplorerWindow);
        }
    }
    focusWindow(window) {
        if (window.isMinimized()) {
            window.restore();
        }
        window.focus();
    }
    getWindowPosition(parentWindow, defaultWidth, defaultHeight) {
        // We want the new window to open on the same display that the parent is in
        let displayToUse;
        const displays = screen.getAllDisplays();
        // Single Display
        if (displays.length === 1) {
            displayToUse = displays[0];
        }
        // Multi Display
        else {
            // on mac there is 1 menu per window so we need to use the monitor where the cursor currently is
            if (isMacintosh) {
                const cursorPoint = screen.getCursorScreenPoint();
                displayToUse = screen.getDisplayNearestPoint(cursorPoint);
            }
            // if we have a last active window, use that display for the new window
            if (!displayToUse && parentWindow) {
                displayToUse = screen.getDisplayMatching(parentWindow.getBounds());
            }
            // fallback to primary display or first display
            if (!displayToUse) {
                displayToUse = screen.getPrimaryDisplay() || displays[0];
            }
        }
        const displayBounds = displayToUse.bounds;
        const state = {
            width: defaultWidth,
            height: defaultHeight,
            x: displayBounds.x + (displayBounds.width / 2) - (defaultWidth / 2),
            y: displayBounds.y + (displayBounds.height / 2) - (defaultHeight / 2)
        };
        if (displayBounds.width > 0 && displayBounds.height > 0 /* Linux X11 sessions sometimes report wrong display bounds */) {
            if (state.x < displayBounds.x) {
                state.x = displayBounds.x; // prevent window from falling out of the screen to the left
            }
            if (state.y < displayBounds.y) {
                state.y = displayBounds.y; // prevent window from falling out of the screen to the top
            }
            if (state.x > (displayBounds.x + displayBounds.width)) {
                state.x = displayBounds.x; // prevent window from falling out of the screen to the right
            }
            if (state.y > (displayBounds.y + displayBounds.height)) {
                state.y = displayBounds.y; // prevent window from falling out of the screen to the bottom
            }
            if (state.width > displayBounds.width) {
                state.width = displayBounds.width; // prevent window from exceeding display bounds width
            }
            if (state.height > displayBounds.height) {
                state.height = displayBounds.height; // prevent window from exceeding display bounds height
            }
        }
        return state;
    }
    async stopTracing() {
        if (!this.environmentMainService.args.trace) {
            return; // requires tracing to be on
        }
        const path = await contentTracing.stopRecording(`${randomPath(this.environmentMainService.userHome.fsPath, this.productService.applicationName)}.trace.txt`);
        // Inform user to report an issue
        await this.dialogMainService.showMessageBox({
            type: 'info',
            message: localize('trace.message', "Successfully created the trace file"),
            detail: localize('trace.detail', "Please create an issue and manually attach the following file:\n{0}", path),
            buttons: [localize({ key: 'trace.ok', comment: ['&& denotes a mnemonic'] }, "&&OK")],
        }, BrowserWindow.getFocusedWindow() ?? undefined);
        // Show item in explorer
        this.nativeHostMainService.showItemInFolder(undefined, path);
    }
    async getSystemStatus() {
        const [info, remoteData] = await Promise.all([this.diagnosticsMainService.getMainDiagnostics(), this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: false, includeWorkspaceMetadata: false })]);
        return this.diagnosticsService.getDiagnostics(info, remoteData);
    }
    async $getSystemInfo() {
        const [info, remoteData] = await Promise.all([this.diagnosticsMainService.getMainDiagnostics(), this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: false, includeWorkspaceMetadata: false })]);
        const msg = await this.diagnosticsService.getSystemInfo(info, remoteData);
        return msg;
    }
    async $getPerformanceInfo() {
        try {
            const [info, remoteData] = await Promise.all([this.diagnosticsMainService.getMainDiagnostics(), this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: true, includeWorkspaceMetadata: true })]);
            return await this.diagnosticsService.getPerformanceInfo(info, remoteData);
        }
        catch (error) {
            this.logService.warn('issueService#getPerformanceInfo ', error.message);
            throw error;
        }
    }
    createBrowserWindow(position, ipcObjectUrl, options, windowKind) {
        const browserWindowOptions = {
            fullscreen: false,
            skipTaskbar: false,
            resizable: true,
            width: position.width,
            height: position.height,
            minWidth: 300,
            minHeight: 200,
            x: position.x,
            y: position.y,
            title: options.title,
            backgroundColor: options.backgroundColor || ProcessMainService_1.DEFAULT_BACKGROUND_COLOR,
            webPreferences: {
                preload: FileAccess.asFileUri('vs/base/parts/sandbox/electron-sandbox/preload.js').fsPath,
                additionalArguments: [`--vscode-window-config=${ipcObjectUrl.resource.toString()}`],
                v8CacheOptions: this.environmentMainService.useCodeCache ? 'bypassHeatCheck' : 'none',
                enableWebSQL: false,
                spellcheck: false,
                zoomFactor: zoomLevelToZoomFactor(options.zoomLevel),
                sandbox: true
            },
            alwaysOnTop: options.alwaysOnTop,
            experimentalDarkMode: true
        };
        const window = new BrowserWindow(browserWindowOptions);
        window.setMenuBarVisibility(false);
        return window;
    }
    safeSend(event, channel, ...args) {
        if (!event.sender.isDestroyed()) {
            event.sender.send(channel, ...args);
        }
    }
    async closeProcessExplorer() {
        this.processExplorerWindow?.close();
    }
};
ProcessMainService = ProcessMainService_1 = __decorate([
    __param(1, IEnvironmentMainService),
    __param(2, ILogService),
    __param(3, IDiagnosticsService),
    __param(4, IDiagnosticsMainService),
    __param(5, IDialogMainService),
    __param(6, INativeHostMainService),
    __param(7, IProtocolMainService),
    __param(8, IProductService),
    __param(9, IStateService),
    __param(10, ICSSDevelopmentService)
], ProcessMainService);
export { ProcessMainService };
function isStrictWindowState(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    return ('x' in obj &&
        'y' in obj &&
        'width' in obj &&
        'height' in obj);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2Nlc3MvZWxlY3Ryb24tbWFpbi9wcm9jZXNzTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQW1DLGNBQWMsRUFBeUIsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBdUIsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBK0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwSSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJB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