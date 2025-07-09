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
import { app } from 'electron';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { getAllWindowsExcludingOffscreen, IWindowsMainService } from '../../windows/electron-main/windows.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { ILogService } from '../../log/common/log.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
export const ID = 'diagnosticsMainService';
export const IDiagnosticsMainService = createDecorator(ID);
let DiagnosticsMainService = class DiagnosticsMainService {
    constructor(windowsMainService, workspacesManagementMainService, logService) {
        this.windowsMainService = windowsMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.logService = logService;
    }
    async getRemoteDiagnostics(options) {
        const windows = this.windowsMainService.getWindows();
        const diagnostics = await Promise.all(windows.map(async (window) => {
            const remoteAuthority = window.remoteAuthority;
            if (!remoteAuthority) {
                return undefined;
            }
            const replyChannel = `vscode:getDiagnosticInfoResponse${window.id}`;
            const args = {
                includeProcesses: options.includeProcesses,
                folders: options.includeWorkspaceMetadata ? await this.getFolderURIs(window) : undefined
            };
            return new Promise(resolve => {
                window.sendWhenReady('vscode:getDiagnosticInfo', CancellationToken.None, { replyChannel, args });
                validatedIpcMain.once(replyChannel, (_, data) => {
                    // No data is returned if getting the connection fails.
                    if (!data) {
                        resolve({ hostName: remoteAuthority, errorMessage: `Unable to resolve connection to '${remoteAuthority}'.` });
                    }
                    resolve(data);
                });
                setTimeout(() => {
                    resolve({ hostName: remoteAuthority, errorMessage: `Connection to '${remoteAuthority}' could not be established` });
                }, 5000);
            });
        }));
        return diagnostics.filter((x) => !!x);
    }
    async getMainDiagnostics() {
        this.logService.trace('Received request for main process info from other instance.');
        const windows = [];
        for (const window of getAllWindowsExcludingOffscreen()) {
            const codeWindow = this.windowsMainService.getWindowById(window.id);
            if (codeWindow) {
                windows.push(await this.codeWindowToInfo(codeWindow));
            }
            else {
                windows.push(this.browserWindowToInfo(window));
            }
        }
        const pidToNames = [];
        for (const { pid, name } of UtilityProcess.getAll()) {
            pidToNames.push({ pid, name });
        }
        return {
            mainPID: process.pid,
            mainArguments: process.argv.slice(1),
            windows,
            pidToNames,
            screenReader: !!app.accessibilitySupportEnabled,
            gpuFeatureStatus: app.getGPUFeatureStatus()
        };
    }
    async codeWindowToInfo(window) {
        const folderURIs = await this.getFolderURIs(window);
        const win = assertIsDefined(window.win);
        return this.browserWindowToInfo(win, folderURIs, window.remoteAuthority);
    }
    browserWindowToInfo(window, folderURIs = [], remoteAuthority) {
        return {
            id: window.id,
            pid: window.webContents.getOSProcessId(),
            title: window.getTitle(),
            folderURIs,
            remoteAuthority
        };
    }
    async getFolderURIs(window) {
        const folderURIs = [];
        const workspace = window.openedWorkspace;
        if (isSingleFolderWorkspaceIdentifier(workspace)) {
            folderURIs.push(workspace.uri);
        }
        else if (isWorkspaceIdentifier(workspace)) {
            const resolvedWorkspace = await this.workspacesManagementMainService.resolveLocalWorkspace(workspace.configPath); // workspace folders can only be shown for local (resolved) workspaces
            if (resolvedWorkspace) {
                const rootFolders = resolvedWorkspace.folders;
                rootFolders.forEach(root => {
                    folderURIs.push(root.uri);
                });
            }
        }
        return folderURIs;
    }
};
DiagnosticsMainService = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IWorkspacesManagementMainService),
    __param(2, ILogService)
], DiagnosticsMainService);
export { DiagnosticsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3NNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kaWFnbm9zdGljcy9lbGVjdHJvbi1tYWluL2RpYWdub3N0aWNzTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBb0MsTUFBTSxVQUFVLENBQUM7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3JILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQztBQUMzQyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQTBCLEVBQUUsQ0FBQyxDQUFDO0FBYTdFLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBSWxDLFlBQ3VDLGtCQUF1QyxFQUMxQiwrQkFBaUUsRUFDdEYsVUFBdUI7UUFG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