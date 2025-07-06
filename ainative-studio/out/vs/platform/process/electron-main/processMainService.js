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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvY2Vzcy9lbGVjdHJvbi1tYWluL3Byb2Nlc3NNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBbUMsY0FBYyxFQUF5QixNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDekgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUF1QixXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHVCQUF1QixFQUErQixNQUFNLHlDQUF5QyxDQUFDO0FBQ3BJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFB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