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
import electron from 'electron';
import { Emitter } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { dirname, join } from '../../../base/common/path.js';
import { basename, extUriBiasedIgnorePathCase, joinPath, originalFSPath } from '../../../base/common/resources.js';
import { Promises } from '../../../base/node/pfs.js';
import { localize } from '../../../nls.js';
import { IBackupMainService } from '../../backup/electron-main/backup.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesMainService } from '../../userDataProfile/electron-main/userDataProfile.js';
import { findWindowOnWorkspaceOrFolder } from '../../windows/electron-main/windowsFinder.js';
import { isWorkspaceIdentifier, hasWorkspaceFileExtension, UNTITLED_WORKSPACE_NAME, isUntitledWorkspace } from '../../workspace/common/workspace.js';
import { getStoredWorkspaceFolder, isStoredWorkspaceFolder, toWorkspaceFolders } from '../common/workspaces.js';
import { getWorkspaceIdentifier } from '../node/workspaces.js';
export const IWorkspacesManagementMainService = createDecorator('workspacesManagementMainService');
let WorkspacesManagementMainService = class WorkspacesManagementMainService extends Disposable {
    constructor(environmentMainService, logService, userDataProfilesMainService, backupMainService, dialogMainService) {
        super();
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        this.userDataProfilesMainService = userDataProfilesMainService;
        this.backupMainService = backupMainService;
        this.dialogMainService = dialogMainService;
        this._onDidDeleteUntitledWorkspace = this._register(new Emitter());
        this.onDidDeleteUntitledWorkspace = this._onDidDeleteUntitledWorkspace.event;
        this._onDidEnterWorkspace = this._register(new Emitter());
        this.onDidEnterWorkspace = this._onDidEnterWorkspace.event;
        this.untitledWorkspaces = [];
        this.untitledWorkspacesHome = this.environmentMainService.untitledWorkspacesHome;
    }
    async initialize() {
        // Reset
        this.untitledWorkspaces = [];
        // Resolve untitled workspaces
        try {
            const untitledWorkspacePaths = (await Promises.readdir(this.untitledWorkspacesHome.with({ scheme: Schemas.file }).fsPath)).map(folder => joinPath(this.untitledWorkspacesHome, folder, UNTITLED_WORKSPACE_NAME));
            for (const untitledWorkspacePath of untitledWorkspacePaths) {
                const workspace = getWorkspaceIdentifier(untitledWorkspacePath);
                const resolvedWorkspace = await this.resolveLocalWorkspace(untitledWorkspacePath);
                if (!resolvedWorkspace) {
                    await this.deleteUntitledWorkspace(workspace);
                }
                else {
                    this.untitledWorkspaces.push({ workspace, remoteAuthority: resolvedWorkspace.remoteAuthority });
                }
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                this.logService.warn(`Unable to read folders in ${this.untitledWorkspacesHome} (${error}).`);
            }
        }
    }
    resolveLocalWorkspace(uri) {
        return this.doResolveLocalWorkspace(uri, path => fs.promises.readFile(path, 'utf8'));
    }
    doResolveLocalWorkspace(uri, contentsFn) {
        if (!this.isWorkspacePath(uri)) {
            return undefined; // does not look like a valid workspace config file
        }
        if (uri.scheme !== Schemas.file) {
            return undefined;
        }
        try {
            const contents = contentsFn(uri.fsPath);
            if (contents instanceof Promise) {
                return contents.then(value => this.doResolveWorkspace(uri, value), error => undefined /* invalid workspace */);
            }
            else {
                return this.doResolveWorkspace(uri, contents);
            }
        }
        catch {
            return undefined; // invalid workspace
        }
    }
    isWorkspacePath(uri) {
        return isUntitledWorkspace(uri, this.environmentMainService) || hasWorkspaceFileExtension(uri);
    }
    doResolveWorkspace(path, contents) {
        try {
            const workspace = this.doParseStoredWorkspace(path, contents);
            const workspaceIdentifier = getWorkspaceIdentifier(path);
            return {
                id: workspaceIdentifier.id,
                configPath: workspaceIdentifier.configPath,
                folders: toWorkspaceFolders(workspace.folders, workspaceIdentifier.configPath, extUriBiasedIgnorePathCase),
                remoteAuthority: workspace.remoteAuthority,
                transient: workspace.transient
            };
        }
        catch (error) {
            this.logService.warn(error.toString());
        }
        return undefined;
    }
    doParseStoredWorkspace(path, contents) {
        // Parse workspace file
        const storedWorkspace = parse(contents); // use fault tolerant parser
        // Filter out folders which do not have a path or uri set
        if (storedWorkspace && Array.isArray(storedWorkspace.folders)) {
            storedWorkspace.folders = storedWorkspace.folders.filter(folder => isStoredWorkspaceFolder(folder));
        }
        else {
            throw new Error(`${path.toString(true)} looks like an invalid workspace file.`);
        }
        return storedWorkspace;
    }
    async createUntitledWorkspace(folders, remoteAuthority) {
        const { workspace, storedWorkspace } = this.newUntitledWorkspace(folders, remoteAuthority);
        const configPath = workspace.configPath.fsPath;
        await fs.promises.mkdir(dirname(configPath), { recursive: true });
        await Promises.writeFile(configPath, JSON.stringify(storedWorkspace, null, '\t'));
        this.untitledWorkspaces.push({ workspace, remoteAuthority });
        return workspace;
    }
    newUntitledWorkspace(folders = [], remoteAuthority) {
        const randomId = (Date.now() + Math.round(Math.random() * 1000)).toString();
        const untitledWorkspaceConfigFolder = joinPath(this.untitledWorkspacesHome, randomId);
        const untitledWorkspaceConfigPath = joinPath(untitledWorkspaceConfigFolder, UNTITLED_WORKSPACE_NAME);
        const storedWorkspaceFolder = [];
        for (const folder of folders) {
            storedWorkspaceFolder.push(getStoredWorkspaceFolder(folder.uri, true, folder.name, untitledWorkspaceConfigFolder, extUriBiasedIgnorePathCase));
        }
        return {
            workspace: getWorkspaceIdentifier(untitledWorkspaceConfigPath),
            storedWorkspace: { folders: storedWorkspaceFolder, remoteAuthority }
        };
    }
    async getWorkspaceIdentifier(configPath) {
        return getWorkspaceIdentifier(configPath);
    }
    isUntitledWorkspace(workspace) {
        return isUntitledWorkspace(workspace.configPath, this.environmentMainService);
    }
    async deleteUntitledWorkspace(workspace) {
        if (!this.isUntitledWorkspace(workspace)) {
            return; // only supported for untitled workspaces
        }
        // Delete from disk
        await this.doDeleteUntitledWorkspace(workspace);
        // unset workspace from profiles
        this.userDataProfilesMainService.unsetWorkspace(workspace);
        // Event
        this._onDidDeleteUntitledWorkspace.fire(workspace);
    }
    async doDeleteUntitledWorkspace(workspace) {
        const configPath = originalFSPath(workspace.configPath);
        try {
            // Delete Workspace
            await Promises.rm(dirname(configPath));
            // Mark Workspace Storage to be deleted
            const workspaceStoragePath = join(this.environmentMainService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath, workspace.id);
            if (await Promises.exists(workspaceStoragePath)) {
                await Promises.writeFile(join(workspaceStoragePath, 'obsolete'), '');
            }
            // Remove from list
            this.untitledWorkspaces = this.untitledWorkspaces.filter(untitledWorkspace => untitledWorkspace.workspace.id !== workspace.id);
        }
        catch (error) {
            this.logService.warn(`Unable to delete untitled workspace ${configPath} (${error}).`);
        }
    }
    getUntitledWorkspaces() {
        return this.untitledWorkspaces;
    }
    async enterWorkspace(window, windows, path) {
        if (!window || !window.win || !window.isReady) {
            return undefined; // return early if the window is not ready or disposed
        }
        const isValid = await this.isValidTargetWorkspacePath(window, windows, path);
        if (!isValid) {
            return undefined; // return early if the workspace is not valid
        }
        const result = await this.doEnterWorkspace(window, getWorkspaceIdentifier(path));
        if (!result) {
            return undefined;
        }
        // Emit as event
        this._onDidEnterWorkspace.fire({ window, workspace: result.workspace });
        return result;
    }
    async isValidTargetWorkspacePath(window, windows, workspacePath) {
        if (!workspacePath) {
            return true;
        }
        if (isWorkspaceIdentifier(window.openedWorkspace) && extUriBiasedIgnorePathCase.isEqual(window.openedWorkspace.configPath, workspacePath)) {
            return false; // window is already opened on a workspace with that path
        }
        // Prevent overwriting a workspace that is currently opened in another window
        if (findWindowOnWorkspaceOrFolder(windows, workspacePath)) {
            await this.dialogMainService.showMessageBox({
                type: 'info',
                buttons: [localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK")],
                message: localize('workspaceOpenedMessage', "Unable to save workspace '{0}'", basename(workspacePath)),
                detail: localize('workspaceOpenedDetail', "The workspace is already opened in another window. Please close that window first and then try again.")
            }, electron.BrowserWindow.getFocusedWindow() ?? undefined);
            return false;
        }
        return true; // OK
    }
    async doEnterWorkspace(window, workspace) {
        if (!window.config) {
            return undefined;
        }
        window.focus();
        // Register window for backups and migrate current backups over
        let backupPath;
        if (!window.config.extensionDevelopmentPath) {
            if (window.config.backupPath) {
                backupPath = await this.backupMainService.registerWorkspaceBackup({ workspace, remoteAuthority: window.remoteAuthority }, window.config.backupPath);
            }
            else {
                backupPath = this.backupMainService.registerWorkspaceBackup({ workspace, remoteAuthority: window.remoteAuthority });
            }
        }
        // if the window was opened on an untitled workspace, delete it.
        if (isWorkspaceIdentifier(window.openedWorkspace) && this.isUntitledWorkspace(window.openedWorkspace)) {
            await this.deleteUntitledWorkspace(window.openedWorkspace);
        }
        // Update window configuration properly based on transition to workspace
        window.config.workspace = workspace;
        window.config.backupPath = backupPath;
        return { workspace, backupPath };
    }
};
WorkspacesManagementMainService = __decorate([
    __param(0, IEnvironmentMainService),
    __param(1, ILogService),
    __param(2, IUserDataProfilesMainService),
    __param(3, IBackupMainService),
    __param(4, IDialogMainService)
], WorkspacesManagementMainService);
export { WorkspacesManagementMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc01hbmFnZW1lbnRNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2VzL2VsZWN0cm9uLW1haW4vd29ya3NwYWNlc01hbmFnZW1lbnRNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSwwQkFBMEIsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFbkgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7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