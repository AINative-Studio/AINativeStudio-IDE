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
var WorkspacesHistoryMainService_1;
import { app } from 'electron';
import { coalesce } from '../../../base/common/arrays.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { normalizeDriveLetter, splitRecentLabel } from '../../../base/common/labels.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { isMacintosh, isWindows } from '../../../base/common/platform.js';
import { basename, extUriBiasedIgnorePathCase, originalFSPath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { Promises } from '../../../base/node/pfs.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IApplicationStorageMainService } from '../../storage/electron-main/storageMainService.js';
import { isRecentFile, isRecentFolder, isRecentWorkspace, restoreRecentlyOpened, toStoreData } from '../common/workspaces.js';
import { WORKSPACE_EXTENSION } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from './workspacesManagementMainService.js';
import { ResourceMap } from '../../../base/common/map.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
export const IWorkspacesHistoryMainService = createDecorator('workspacesHistoryMainService');
let WorkspacesHistoryMainService = class WorkspacesHistoryMainService extends Disposable {
    static { WorkspacesHistoryMainService_1 = this; }
    static { this.MAX_TOTAL_RECENT_ENTRIES = 500; }
    static { this.RECENTLY_OPENED_STORAGE_KEY = 'history.recentlyOpenedPathsList'; }
    constructor(logService, workspacesManagementMainService, lifecycleMainService, applicationStorageMainService, dialogMainService) {
        super();
        this.logService = logService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.applicationStorageMainService = applicationStorageMainService;
        this.dialogMainService = dialogMainService;
        this._onDidChangeRecentlyOpened = this._register(new Emitter());
        this.onDidChangeRecentlyOpened = this._onDidChangeRecentlyOpened.event;
        this.macOSRecentDocumentsUpdater = this._register(new ThrottledDelayer(800));
        this.registerListeners();
    }
    registerListeners() {
        // Install window jump list delayed after opening window
        // because perf measurements have shown this to be slow
        this.lifecycleMainService.when(4 /* LifecycleMainPhase.Eventually */).then(() => this.handleWindowsJumpList());
        // Add to history when entering workspace
        this._register(this.workspacesManagementMainService.onDidEnterWorkspace(event => this.addRecentlyOpened([{ workspace: event.workspace, remoteAuthority: event.window.remoteAuthority }])));
    }
    //#region Workspaces History
    async addRecentlyOpened(recentToAdd) {
        let workspaces = [];
        let files = [];
        for (const recent of recentToAdd) {
            // Workspace
            if (isRecentWorkspace(recent)) {
                if (!this.workspacesManagementMainService.isUntitledWorkspace(recent.workspace) && !this.containsWorkspace(workspaces, recent.workspace)) {
                    workspaces.push(recent);
                }
            }
            // Folder
            else if (isRecentFolder(recent)) {
                if (!this.containsFolder(workspaces, recent.folderUri)) {
                    workspaces.push(recent);
                }
            }
            // File
            else {
                const alreadyExistsInHistory = this.containsFile(files, recent.fileUri);
                const shouldBeFiltered = recent.fileUri.scheme === Schemas.file && WorkspacesHistoryMainService_1.COMMON_FILES_FILTER.indexOf(basename(recent.fileUri)) >= 0;
                if (!alreadyExistsInHistory && !shouldBeFiltered) {
                    files.push(recent);
                    // Add to recent documents (Windows only, macOS later)
                    if (isWindows && recent.fileUri.scheme === Schemas.file) {
                        app.addRecentDocument(recent.fileUri.fsPath);
                    }
                }
            }
        }
        const mergedEntries = await this.mergeEntriesFromStorage({ workspaces, files });
        workspaces = mergedEntries.workspaces;
        files = mergedEntries.files;
        if (workspaces.length > WorkspacesHistoryMainService_1.MAX_TOTAL_RECENT_ENTRIES) {
            workspaces.length = WorkspacesHistoryMainService_1.MAX_TOTAL_RECENT_ENTRIES;
        }
        if (files.length > WorkspacesHistoryMainService_1.MAX_TOTAL_RECENT_ENTRIES) {
            files.length = WorkspacesHistoryMainService_1.MAX_TOTAL_RECENT_ENTRIES;
        }
        await this.saveRecentlyOpened({ workspaces, files });
        this._onDidChangeRecentlyOpened.fire();
        // Schedule update to recent documents on macOS dock
        if (isMacintosh) {
            this.macOSRecentDocumentsUpdater.trigger(() => this.updateMacOSRecentDocuments());
        }
    }
    async removeRecentlyOpened(recentToRemove) {
        const keep = (recent) => {
            const uri = this.location(recent);
            for (const resourceToRemove of recentToRemove) {
                if (extUriBiasedIgnorePathCase.isEqual(resourceToRemove, uri)) {
                    return false;
                }
            }
            return true;
        };
        const mru = await this.getRecentlyOpened();
        const workspaces = mru.workspaces.filter(keep);
        const files = mru.files.filter(keep);
        if (workspaces.length !== mru.workspaces.length || files.length !== mru.files.length) {
            await this.saveRecentlyOpened({ files, workspaces });
            this._onDidChangeRecentlyOpened.fire();
            // Schedule update to recent documents on macOS dock
            if (isMacintosh) {
                this.macOSRecentDocumentsUpdater.trigger(() => this.updateMacOSRecentDocuments());
            }
        }
    }
    async clearRecentlyOpened(options) {
        if (options?.confirm) {
            const { response } = await this.dialogMainService.showMessageBox({
                type: 'warning',
                buttons: [
                    localize({ key: 'clearButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Clear"),
                    localize({ key: 'cancel', comment: ['&& denotes a mnemonic'] }, "&&Cancel")
                ],
                message: localize('confirmClearRecentsMessage', "Do you want to clear all recently opened files and workspaces?"),
                detail: localize('confirmClearDetail', "This action is irreversible!"),
                cancelId: 1
            });
            if (response !== 0) {
                return;
            }
        }
        await this.saveRecentlyOpened({ workspaces: [], files: [] });
        app.clearRecentDocuments();
        // Event
        this._onDidChangeRecentlyOpened.fire();
    }
    async getRecentlyOpened() {
        return this.mergeEntriesFromStorage();
    }
    async mergeEntriesFromStorage(existingEntries) {
        // Build maps for more efficient lookup of existing entries that
        // are passed in by storing based on workspace/file identifier
        const mapWorkspaceIdToWorkspace = new ResourceMap(uri => extUriBiasedIgnorePathCase.getComparisonKey(uri));
        if (existingEntries?.workspaces) {
            for (const workspace of existingEntries.workspaces) {
                mapWorkspaceIdToWorkspace.set(this.location(workspace), workspace);
            }
        }
        const mapFileIdToFile = new ResourceMap(uri => extUriBiasedIgnorePathCase.getComparisonKey(uri));
        if (existingEntries?.files) {
            for (const file of existingEntries.files) {
                mapFileIdToFile.set(this.location(file), file);
            }
        }
        // Merge in entries from storage, preserving existing known entries
        const recentFromStorage = await this.getRecentlyOpenedFromStorage();
        for (const recentWorkspaceFromStorage of recentFromStorage.workspaces) {
            const existingRecentWorkspace = mapWorkspaceIdToWorkspace.get(this.location(recentWorkspaceFromStorage));
            if (existingRecentWorkspace) {
                existingRecentWorkspace.label = existingRecentWorkspace.label ?? recentWorkspaceFromStorage.label;
            }
            else {
                mapWorkspaceIdToWorkspace.set(this.location(recentWorkspaceFromStorage), recentWorkspaceFromStorage);
            }
        }
        for (const recentFileFromStorage of recentFromStorage.files) {
            const existingRecentFile = mapFileIdToFile.get(this.location(recentFileFromStorage));
            if (existingRecentFile) {
                existingRecentFile.label = existingRecentFile.label ?? recentFileFromStorage.label;
            }
            else {
                mapFileIdToFile.set(this.location(recentFileFromStorage), recentFileFromStorage);
            }
        }
        return {
            workspaces: [...mapWorkspaceIdToWorkspace.values()],
            files: [...mapFileIdToFile.values()]
        };
    }
    async getRecentlyOpenedFromStorage() {
        // Wait for global storage to be ready
        await this.applicationStorageMainService.whenReady;
        let storedRecentlyOpened = undefined;
        // First try with storage service
        const storedRecentlyOpenedRaw = this.applicationStorageMainService.get(WorkspacesHistoryMainService_1.RECENTLY_OPENED_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (typeof storedRecentlyOpenedRaw === 'string') {
            try {
                storedRecentlyOpened = JSON.parse(storedRecentlyOpenedRaw);
            }
            catch (error) {
                this.logService.error('Unexpected error parsing opened paths list', error);
            }
        }
        return restoreRecentlyOpened(storedRecentlyOpened, this.logService);
    }
    async saveRecentlyOpened(recent) {
        // Wait for global storage to be ready
        await this.applicationStorageMainService.whenReady;
        // Store in global storage (but do not sync since this is mainly local paths)
        this.applicationStorageMainService.store(WorkspacesHistoryMainService_1.RECENTLY_OPENED_STORAGE_KEY, JSON.stringify(toStoreData(recent)), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    location(recent) {
        if (isRecentFolder(recent)) {
            return recent.folderUri;
        }
        if (isRecentFile(recent)) {
            return recent.fileUri;
        }
        return recent.workspace.configPath;
    }
    containsWorkspace(recents, candidate) {
        return !!recents.find(recent => isRecentWorkspace(recent) && recent.workspace.id === candidate.id);
    }
    containsFolder(recents, candidate) {
        return !!recents.find(recent => isRecentFolder(recent) && extUriBiasedIgnorePathCase.isEqual(recent.folderUri, candidate));
    }
    containsFile(recents, candidate) {
        return !!recents.find(recent => extUriBiasedIgnorePathCase.isEqual(recent.fileUri, candidate));
    }
    //#endregion
    //#region macOS Dock / Windows JumpList
    static { this.MAX_MACOS_DOCK_RECENT_WORKSPACES = 7; } // prefer higher number of workspaces...
    static { this.MAX_MACOS_DOCK_RECENT_ENTRIES_TOTAL = 10; } // ...over number of files
    static { this.MAX_WINDOWS_JUMP_LIST_ENTRIES = 7; }
    // Exclude some very common files from the dock/taskbar
    static { this.COMMON_FILES_FILTER = [
        'COMMIT_EDITMSG',
        'MERGE_MSG',
        'git-rebase-todo'
    ]; }
    async handleWindowsJumpList() {
        if (!isWindows) {
            return; // only on windows
        }
        await this.updateWindowsJumpList();
        this._register(this.onDidChangeRecentlyOpened(() => this.updateWindowsJumpList()));
    }
    async updateWindowsJumpList() {
        if (!isWindows) {
            return; // only on windows
        }
        const jumpList = [];
        // Tasks
        jumpList.push({
            type: 'tasks',
            items: [
                {
                    type: 'task',
                    title: localize('newWindow', "New Window"),
                    description: localize('newWindowDesc', "Opens a new window"),
                    program: process.execPath,
                    args: '-n', // force new window
                    iconPath: process.execPath,
                    iconIndex: 0
                }
            ]
        });
        // Recent Workspaces
        if ((await this.getRecentlyOpened()).workspaces.length > 0) {
            // The user might have meanwhile removed items from the jump list and we have to respect that
            // so we need to update our list of recent paths with the choice of the user to not add them again
            // Also: Windows will not show our custom category at all if there is any entry which was removed
            // by the user! See https://github.com/microsoft/vscode/issues/15052
            const toRemove = [];
            for (const item of app.getJumpListSettings().removedItems) {
                const args = item.args;
                if (args) {
                    const match = /^--(folder|file)-uri\s+"([^"]+)"$/.exec(args);
                    if (match) {
                        toRemove.push(URI.parse(match[2]));
                    }
                }
            }
            await this.removeRecentlyOpened(toRemove);
            // Add entries
            let hasWorkspaces = false;
            const items = coalesce((await this.getRecentlyOpened()).workspaces.slice(0, WorkspacesHistoryMainService_1.MAX_WINDOWS_JUMP_LIST_ENTRIES).map(recent => {
                const workspace = isRecentWorkspace(recent) ? recent.workspace : recent.folderUri;
                const { title, description } = this.getWindowsJumpListLabel(workspace, recent.label);
                let args;
                if (URI.isUri(workspace)) {
                    args = `--folder-uri "${workspace.toString()}"`;
                }
                else {
                    hasWorkspaces = true;
                    args = `--file-uri "${workspace.configPath.toString()}"`;
                }
                return {
                    type: 'task',
                    title: title.substr(0, 255), // Windows seems to be picky around the length of entries
                    description: description.substr(0, 255), // (see https://github.com/microsoft/vscode/issues/111177)
                    program: process.execPath,
                    args,
                    iconPath: 'explorer.exe', // simulate folder icon
                    iconIndex: 0
                };
            }));
            if (items.length > 0) {
                jumpList.push({
                    type: 'custom',
                    name: hasWorkspaces ? localize('recentFoldersAndWorkspaces', "Recent Folders & Workspaces") : localize('recentFolders', "Recent Folders"),
                    items
                });
            }
        }
        // Recent
        jumpList.push({
            type: 'recent' // this enables to show files in the "recent" category
        });
        try {
            const res = app.setJumpList(jumpList);
            if (res && res !== 'ok') {
                this.logService.warn(`updateWindowsJumpList#setJumpList unexpected result: ${res}`);
            }
        }
        catch (error) {
            this.logService.warn('updateWindowsJumpList#setJumpList', error); // since setJumpList is relatively new API, make sure to guard for errors
        }
    }
    getWindowsJumpListLabel(workspace, recentLabel) {
        // Prefer recent label
        if (recentLabel) {
            return { title: splitRecentLabel(recentLabel).name, description: recentLabel };
        }
        // Single Folder
        if (URI.isUri(workspace)) {
            return { title: basename(workspace), description: this.renderJumpListPathDescription(workspace) };
        }
        // Workspace: Untitled
        if (this.workspacesManagementMainService.isUntitledWorkspace(workspace)) {
            return { title: localize('untitledWorkspace', "Untitled (Workspace)"), description: '' };
        }
        // Workspace: normal
        let filename = basename(workspace.configPath);
        if (filename.endsWith(WORKSPACE_EXTENSION)) {
            filename = filename.substr(0, filename.length - WORKSPACE_EXTENSION.length - 1);
        }
        return { title: localize('workspaceName', "{0} (Workspace)", filename), description: this.renderJumpListPathDescription(workspace.configPath) };
    }
    renderJumpListPathDescription(uri) {
        return uri.scheme === 'file' ? normalizeDriveLetter(uri.fsPath) : uri.toString();
    }
    async updateMacOSRecentDocuments() {
        if (!isMacintosh) {
            return;
        }
        // We clear all documents first to ensure an up-to-date view on the set. Since entries
        // can get deleted on disk, this ensures that the list is always valid
        app.clearRecentDocuments();
        const mru = await this.getRecentlyOpened();
        // Collect max-N recent workspaces that are known to exist
        const workspaceEntries = [];
        let entries = 0;
        for (let i = 0; i < mru.workspaces.length && entries < WorkspacesHistoryMainService_1.MAX_MACOS_DOCK_RECENT_WORKSPACES; i++) {
            const loc = this.location(mru.workspaces[i]);
            if (loc.scheme === Schemas.file) {
                const workspacePath = originalFSPath(loc);
                if (await Promises.exists(workspacePath)) {
                    workspaceEntries.push(workspacePath);
                    entries++;
                }
            }
        }
        // Collect max-N recent files that are known to exist
        const fileEntries = [];
        for (let i = 0; i < mru.files.length && entries < WorkspacesHistoryMainService_1.MAX_MACOS_DOCK_RECENT_ENTRIES_TOTAL; i++) {
            const loc = this.location(mru.files[i]);
            if (loc.scheme === Schemas.file) {
                const filePath = originalFSPath(loc);
                if (WorkspacesHistoryMainService_1.COMMON_FILES_FILTER.includes(basename(loc)) || // skip some well known file entries
                    workspaceEntries.includes(filePath) // prefer a workspace entry over a file entry (e.g. for .code-workspace)
                ) {
                    continue;
                }
                if (await Promises.exists(filePath)) {
                    fileEntries.push(filePath);
                    entries++;
                }
            }
        }
        // The apple guidelines (https://developer.apple.com/design/human-interface-guidelines/macos/menus/menu-anatomy/)
        // explain that most recent entries should appear close to the interaction by the user (e.g. close to the
        // mouse click). Most native macOS applications that add recent documents to the dock, show the most recent document
        // to the bottom (because the dock menu is not appearing from top to bottom, but from the bottom to the top). As such
        // we fill in the entries in reverse order so that the most recent shows up at the bottom of the menu.
        //
        // On top of that, the maximum number of documents can be configured by the user (defaults to 10). To ensure that
        // we are not failing to show the most recent entries, we start by adding files first (in reverse order of recency)
        // and then add folders (in reverse order of recency). Given that strategy, we can ensure that the most recent
        // N folders are always appearing, even if the limit is low (https://github.com/microsoft/vscode/issues/74788)
        fileEntries.reverse().forEach(fileEntry => app.addRecentDocument(fileEntry));
        workspaceEntries.reverse().forEach(workspaceEntry => app.addRecentDocument(workspaceEntry));
    }
};
WorkspacesHistoryMainService = WorkspacesHistoryMainService_1 = __decorate([
    __param(0, ILogService),
    __param(1, IWorkspacesManagementMainService),
    __param(2, ILifecycleMainService),
    __param(3, IApplicationStorageMainService),
    __param(4, IDialogMainService)
], WorkspacesHistoryMainService);
export { WorkspacesHistoryMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc0hpc3RvcnlNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2VzL2VsZWN0cm9uLW1haW4vd29ya3NwYWNlc0hpc3RvcnlNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBa0MsTUFBTSxVQUFVLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQXdCLE1BQU0sK0JBQStCLENBQUM7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsMEJBQTBCLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBc0Is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