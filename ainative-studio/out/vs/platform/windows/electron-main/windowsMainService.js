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
import { app, BrowserWindow, shell } from 'electron';
import { addUNCHostToAllowlist } from '../../../base/node/unc.js';
import { hostname, release, arch } from 'os';
import { coalesce, distinct } from '../../../base/common/arrays.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { isWindowsDriveLetter, parseLineAndColumnAware, sanitizeFilePath, toSlashes } from '../../../base/common/extpath.js';
import { getPathLabel } from '../../../base/common/labels.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { basename, join, normalize, posix } from '../../../base/common/path.js';
import { getMarks, mark } from '../../../base/common/performance.js';
import { isMacintosh, isWindows, OS } from '../../../base/common/platform.js';
import { cwd } from '../../../base/common/process.js';
import { extUriBiasedIgnorePathCase, isEqualAuthority, normalizePath, originalFSPath, removeTrailingPathSeparator } from '../../../base/common/resources.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { getNLSLanguage, getNLSMessages, localize } from '../../../nls.js';
import { IBackupMainService } from '../../backup/electron-main/backup.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { FileType, IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import product from '../../product/common/product.js';
import { IProtocolMainService } from '../../protocol/electron-main/protocol.js';
import { getRemoteAuthority } from '../../remote/common/remoteHosts.js';
import { IStateService } from '../../state/node/state.js';
import { isFileToOpen, isFolderToOpen, isWorkspaceToOpen } from '../../window/common/window.js';
import { CodeWindow } from './windowImpl.js';
import { getLastFocused } from './windows.js';
import { findWindowOnExtensionDevelopmentPath, findWindowOnFile, findWindowOnWorkspaceOrFolder } from './windowsFinder.js';
import { WindowsStateHandler } from './windowsStateHandler.js';
import { hasWorkspaceFileExtension, isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, toWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { createEmptyWorkspaceIdentifier, getSingleFolderWorkspaceIdentifier, getWorkspaceIdentifier } from '../../workspaces/node/workspaces.js';
import { IWorkspacesHistoryMainService } from '../../workspaces/electron-main/workspacesHistoryMainService.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { IPolicyService } from '../../policy/common/policy.js';
import { IUserDataProfilesMainService } from '../../userDataProfile/electron-main/userDataProfile.js';
import { ILoggerMainService } from '../../log/electron-main/loggerService.js';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { ICSSDevelopmentService } from '../../cssDev/node/cssDevService.js';
import { ResourceSet } from '../../../base/common/map.js';
const EMPTY_WINDOW = Object.create(null);
function isWorkspacePathToOpen(path) {
    return isWorkspaceIdentifier(path?.workspace);
}
function isSingleFolderWorkspacePathToOpen(path) {
    return isSingleFolderWorkspaceIdentifier(path?.workspace);
}
//#endregion
let WindowsMainService = class WindowsMainService extends Disposable {
    constructor(machineId, sqmId, devDeviceId, initialUserEnv, logService, loggerService, stateService, policyService, environmentMainService, userDataProfilesMainService, lifecycleMainService, backupMainService, configurationService, workspacesHistoryMainService, workspacesManagementMainService, instantiationService, dialogMainService, fileService, protocolMainService, themeMainService, auxiliaryWindowsMainService, cssDevelopmentService) {
        super();
        this.machineId = machineId;
        this.sqmId = sqmId;
        this.devDeviceId = devDeviceId;
        this.initialUserEnv = initialUserEnv;
        this.logService = logService;
        this.loggerService = loggerService;
        this.policyService = policyService;
        this.environmentMainService = environmentMainService;
        this.userDataProfilesMainService = userDataProfilesMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.backupMainService = backupMainService;
        this.configurationService = configurationService;
        this.workspacesHistoryMainService = workspacesHistoryMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.instantiationService = instantiationService;
        this.dialogMainService = dialogMainService;
        this.fileService = fileService;
        this.protocolMainService = protocolMainService;
        this.themeMainService = themeMainService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
        this.cssDevelopmentService = cssDevelopmentService;
        this._onDidOpenWindow = this._register(new Emitter());
        this.onDidOpenWindow = this._onDidOpenWindow.event;
        this._onDidSignalReadyWindow = this._register(new Emitter());
        this.onDidSignalReadyWindow = this._onDidSignalReadyWindow.event;
        this._onDidDestroyWindow = this._register(new Emitter());
        this.onDidDestroyWindow = this._onDidDestroyWindow.event;
        this._onDidChangeWindowsCount = this._register(new Emitter());
        this.onDidChangeWindowsCount = this._onDidChangeWindowsCount.event;
        this._onDidMaximizeWindow = this._register(new Emitter());
        this.onDidMaximizeWindow = this._onDidMaximizeWindow.event;
        this._onDidUnmaximizeWindow = this._register(new Emitter());
        this.onDidUnmaximizeWindow = this._onDidUnmaximizeWindow.event;
        this._onDidChangeFullScreen = this._register(new Emitter());
        this.onDidChangeFullScreen = this._onDidChangeFullScreen.event;
        this._onDidTriggerSystemContextMenu = this._register(new Emitter());
        this.onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;
        this.windows = new Map();
        this.windowsStateHandler = this._register(new WindowsStateHandler(this, stateService, this.lifecycleMainService, this.logService, this.configurationService));
        this.registerListeners();
    }
    registerListeners() {
        // Signal a window is ready after having entered a workspace
        this._register(this.workspacesManagementMainService.onDidEnterWorkspace(event => this._onDidSignalReadyWindow.fire(event.window)));
        // Update valid roots in protocol service for extension dev windows
        this._register(this.onDidSignalReadyWindow(window => {
            if (window.config?.extensionDevelopmentPath || window.config?.extensionTestsPath) {
                const disposables = new DisposableStore();
                disposables.add(Event.any(window.onDidClose, window.onDidDestroy)(() => disposables.dispose()));
                // Allow access to extension development path
                if (window.config.extensionDevelopmentPath) {
                    for (const extensionDevelopmentPath of window.config.extensionDevelopmentPath) {
                        disposables.add(this.protocolMainService.addValidFileRoot(extensionDevelopmentPath));
                    }
                }
                // Allow access to extension tests path
                if (window.config.extensionTestsPath) {
                    disposables.add(this.protocolMainService.addValidFileRoot(window.config.extensionTestsPath));
                }
            }
        }));
    }
    openEmptyWindow(openConfig, options) {
        const cli = this.environmentMainService.args;
        const remoteAuthority = options?.remoteAuthority || undefined;
        const forceEmpty = true;
        const forceReuseWindow = options?.forceReuseWindow;
        const forceNewWindow = !forceReuseWindow;
        return this.open({ ...openConfig, cli, forceEmpty, forceNewWindow, forceReuseWindow, remoteAuthority, forceTempProfile: options?.forceTempProfile, forceProfile: options?.forceProfile });
    }
    openExistingWindow(window, openConfig) {
        // Bring window to front
        window.focus();
        // Handle --wait
        this.handleWaitMarkerFile(openConfig, [window]);
    }
    async open(openConfig) {
        this.logService.trace('windowsManager#open');
        // Make sure addMode/removeMode is only enabled if we have an active window
        if ((openConfig.addMode || openConfig.removeMode) && (openConfig.initialStartup || !this.getLastActiveWindow())) {
            openConfig.addMode = false;
            openConfig.removeMode = false;
        }
        const foldersToAdd = [];
        const foldersToRemove = [];
        const foldersToOpen = [];
        const workspacesToOpen = [];
        const untitledWorkspacesToRestore = [];
        const emptyWindowsWithBackupsToRestore = [];
        let filesToOpen;
        let maybeOpenEmptyWindow = false;
        // Identify things to open from open config
        const pathsToOpen = await this.getPathsToOpen(openConfig);
        this.logService.trace('windowsManager#open pathsToOpen', pathsToOpen);
        for (const path of pathsToOpen) {
            if (isSingleFolderWorkspacePathToOpen(path)) {
                if (openConfig.addMode) {
                    // When run with --add, take the folders that are to be opened as
                    // folders that should be added to the currently active window.
                    foldersToAdd.push(path);
                }
                else if (openConfig.removeMode) {
                    // When run with --remove, take the folders that are to be opened as
                    // folders that should be removed from the currently active window.
                    foldersToRemove.push(path);
                }
                else {
                    foldersToOpen.push(path);
                }
            }
            else if (isWorkspacePathToOpen(path)) {
                workspacesToOpen.push(path);
            }
            else if (path.fileUri) {
                if (!filesToOpen) {
                    filesToOpen = { filesToOpenOrCreate: [], filesToDiff: [], filesToMerge: [], remoteAuthority: path.remoteAuthority };
                }
                filesToOpen.filesToOpenOrCreate.push(path);
            }
            else if (path.backupPath) {
                emptyWindowsWithBackupsToRestore.push({ backupFolder: basename(path.backupPath), remoteAuthority: path.remoteAuthority });
            }
            else {
                maybeOpenEmptyWindow = true; // depends on other parameters such as `forceEmpty` and how many windows have opened already
            }
        }
        // When run with --diff, take the first 2 files to open as files to diff
        if (openConfig.diffMode && filesToOpen && filesToOpen.filesToOpenOrCreate.length >= 2) {
            filesToOpen.filesToDiff = filesToOpen.filesToOpenOrCreate.slice(0, 2);
            filesToOpen.filesToOpenOrCreate = [];
        }
        // When run with --merge, take the first 4 files to open as files to merge
        if (openConfig.mergeMode && filesToOpen && filesToOpen.filesToOpenOrCreate.length === 4) {
            filesToOpen.filesToMerge = filesToOpen.filesToOpenOrCreate.slice(0, 4);
            filesToOpen.filesToOpenOrCreate = [];
            filesToOpen.filesToDiff = [];
        }
        // When run with --wait, make sure we keep the paths to wait for
        if (filesToOpen && openConfig.waitMarkerFileURI) {
            filesToOpen.filesToWait = { paths: coalesce([...filesToOpen.filesToDiff, filesToOpen.filesToMerge[3] /* [3] is the resulting merge file */, ...filesToOpen.filesToOpenOrCreate]), waitMarkerFileUri: openConfig.waitMarkerFileURI };
        }
        // These are windows to restore because of hot-exit or from previous session (only performed once on startup!)
        if (openConfig.initialStartup) {
            // Untitled workspaces are always restored
            untitledWorkspacesToRestore.push(...this.workspacesManagementMainService.getUntitledWorkspaces());
            workspacesToOpen.push(...untitledWorkspacesToRestore);
            // Empty windows with backups are always restored
            emptyWindowsWithBackupsToRestore.push(...this.backupMainService.getEmptyWindowBackups());
        }
        else {
            emptyWindowsWithBackupsToRestore.length = 0;
        }
        // Open based on config
        const { windows: usedWindows, filesOpenedInWindow } = await this.doOpen(openConfig, workspacesToOpen, foldersToOpen, emptyWindowsWithBackupsToRestore, maybeOpenEmptyWindow, filesToOpen, foldersToAdd, foldersToRemove);
        this.logService.trace(`windowsManager#open used window count ${usedWindows.length} (workspacesToOpen: ${workspacesToOpen.length}, foldersToOpen: ${foldersToOpen.length}, emptyToRestore: ${emptyWindowsWithBackupsToRestore.length}, maybeOpenEmptyWindow: ${maybeOpenEmptyWindow})`);
        // Make sure to pass focus to the most relevant of the windows if we open multiple
        if (usedWindows.length > 1) {
            // 1.) focus window we opened files in always with highest priority
            if (filesOpenedInWindow) {
                filesOpenedInWindow.focus();
            }
            // Otherwise, find a good window based on open params
            else {
                const focusLastActive = this.windowsStateHandler.state.lastActiveWindow && !openConfig.forceEmpty && !openConfig.cli._.length && !openConfig.cli['file-uri'] && !openConfig.cli['folder-uri'] && !(openConfig.urisToOpen && openConfig.urisToOpen.length);
                let focusLastOpened = true;
                let focusLastWindow = true;
                // 2.) focus last active window if we are not instructed to open any paths
                if (focusLastActive) {
                    const lastActiveWindow = usedWindows.filter(window => this.windowsStateHandler.state.lastActiveWindow && window.backupPath === this.windowsStateHandler.state.lastActiveWindow.backupPath);
                    if (lastActiveWindow.length) {
                        lastActiveWindow[0].focus();
                        focusLastOpened = false;
                        focusLastWindow = false;
                    }
                }
                // 3.) if instructed to open paths, focus last window which is not restored
                if (focusLastOpened) {
                    for (let i = usedWindows.length - 1; i >= 0; i--) {
                        const usedWindow = usedWindows[i];
                        if ((usedWindow.openedWorkspace && untitledWorkspacesToRestore.some(workspace => usedWindow.openedWorkspace && workspace.workspace.id === usedWindow.openedWorkspace.id)) || // skip over restored workspace
                            (usedWindow.backupPath && emptyWindowsWithBackupsToRestore.some(empty => usedWindow.backupPath && empty.backupFolder === basename(usedWindow.backupPath))) // skip over restored empty window
                        ) {
                            continue;
                        }
                        usedWindow.focus();
                        focusLastWindow = false;
                        break;
                    }
                }
                // 4.) finally, always ensure to have at least last used window focused
                if (focusLastWindow) {
                    usedWindows[usedWindows.length - 1].focus();
                }
            }
        }
        // Remember in recent document list (unless this opens for extension development)
        // Also do not add paths when files are opened for diffing or merging, only if opened individually
        const isDiff = filesToOpen && filesToOpen.filesToDiff.length > 0;
        const isMerge = filesToOpen && filesToOpen.filesToMerge.length > 0;
        if (!usedWindows.some(window => window.isExtensionDevelopmentHost) && !isDiff && !isMerge && !openConfig.noRecentEntry) {
            const recents = [];
            for (const pathToOpen of pathsToOpen) {
                if (isWorkspacePathToOpen(pathToOpen) && !pathToOpen.transient /* never add transient workspaces to history */) {
                    recents.push({ label: pathToOpen.label, workspace: pathToOpen.workspace, remoteAuthority: pathToOpen.remoteAuthority });
                }
                else if (isSingleFolderWorkspacePathToOpen(pathToOpen)) {
                    recents.push({ label: pathToOpen.label, folderUri: pathToOpen.workspace.uri, remoteAuthority: pathToOpen.remoteAuthority });
                }
                else if (pathToOpen.fileUri) {
                    recents.push({ label: pathToOpen.label, fileUri: pathToOpen.fileUri, remoteAuthority: pathToOpen.remoteAuthority });
                }
            }
            this.workspacesHistoryMainService.addRecentlyOpened(recents);
        }
        // Handle --wait
        this.handleWaitMarkerFile(openConfig, usedWindows);
        return usedWindows;
    }
    handleWaitMarkerFile(openConfig, usedWindows) {
        // If we got started with --wait from the CLI, we need to signal to the outside when the window
        // used for the edit operation is closed or loaded to a different folder so that the waiting
        // process can continue. We do this by deleting the waitMarkerFilePath.
        const waitMarkerFileURI = openConfig.waitMarkerFileURI;
        if (openConfig.context === 0 /* OpenContext.CLI */ && waitMarkerFileURI && usedWindows.length === 1 && usedWindows[0]) {
            (async () => {
                await usedWindows[0].whenClosedOrLoaded;
                try {
                    await this.fileService.del(waitMarkerFileURI);
                }
                catch (error) {
                    // ignore - could have been deleted from the window already
                }
            })();
        }
    }
    async doOpen(openConfig, workspacesToOpen, foldersToOpen, emptyToRestore, maybeOpenEmptyWindow, filesToOpen, foldersToAdd, foldersToRemove) {
        // Keep track of used windows and remember
        // if files have been opened in one of them
        const usedWindows = [];
        let filesOpenedInWindow = undefined;
        function addUsedWindow(window, openedFiles) {
            usedWindows.push(window);
            if (openedFiles) {
                filesOpenedInWindow = window;
                filesToOpen = undefined; // reset `filesToOpen` since files have been opened
            }
        }
        // Settings can decide if files/folders open in new window or not
        let { openFolderInNewWindow, openFilesInNewWindow } = this.shouldOpenNewWindow(openConfig);
        // Handle folders to add/remove by looking for the last active workspace (not on initial startup)
        if (!openConfig.initialStartup && (foldersToAdd.length > 0 || foldersToRemove.length > 0)) {
            const authority = foldersToAdd.at(0)?.remoteAuthority ?? foldersToRemove.at(0)?.remoteAuthority;
            const lastActiveWindow = this.getLastActiveWindowForAuthority(authority);
            if (lastActiveWindow) {
                addUsedWindow(this.doAddRemoveFoldersInExistingWindow(lastActiveWindow, foldersToAdd.map(folderToAdd => folderToAdd.workspace.uri), foldersToRemove.map(folderToRemove => folderToRemove.workspace.uri)));
            }
        }
        // Handle files to open/diff/merge or to create when we dont open a folder and we do not restore any
        // folder/untitled from hot-exit by trying to open them in the window that fits best
        const potentialNewWindowsCount = foldersToOpen.length + workspacesToOpen.length + emptyToRestore.length;
        if (filesToOpen && potentialNewWindowsCount === 0) {
            // Find suitable window or folder path to open files in
            const fileToCheck = filesToOpen.filesToOpenOrCreate[0] || filesToOpen.filesToDiff[0] || filesToOpen.filesToMerge[3] /* [3] is the resulting merge file */;
            // only look at the windows with correct authority
            const windows = this.getWindows().filter(window => filesToOpen && isEqualAuthority(window.remoteAuthority, filesToOpen.remoteAuthority));
            // figure out a good window to open the files in if any
            // with a fallback to the last active window.
            //
            // in case `openFilesInNewWindow` is enforced, we skip
            // this step.
            let windowToUseForFiles = undefined;
            if (fileToCheck?.fileUri && !openFilesInNewWindow) {
                if (openConfig.context === 4 /* OpenContext.DESKTOP */ || openConfig.context === 0 /* OpenContext.CLI */ || openConfig.context === 1 /* OpenContext.DOCK */ || openConfig.context === 6 /* OpenContext.LINK */) {
                    windowToUseForFiles = await findWindowOnFile(windows, fileToCheck.fileUri, async (workspace) => workspace.configPath.scheme === Schemas.file ? this.workspacesManagementMainService.resolveLocalWorkspace(workspace.configPath) : undefined);
                }
                if (!windowToUseForFiles) {
                    windowToUseForFiles = this.doGetLastActiveWindow(windows);
                }
            }
            // We found a window to open the files in
            if (windowToUseForFiles) {
                // Window is workspace
                if (isWorkspaceIdentifier(windowToUseForFiles.openedWorkspace)) {
                    workspacesToOpen.push({ workspace: windowToUseForFiles.openedWorkspace, remoteAuthority: windowToUseForFiles.remoteAuthority });
                }
                // Window is single folder
                else if (isSingleFolderWorkspaceIdentifier(windowToUseForFiles.openedWorkspace)) {
                    foldersToOpen.push({ workspace: windowToUseForFiles.openedWorkspace, remoteAuthority: windowToUseForFiles.remoteAuthority });
                }
                // Window is empty
                else {
                    addUsedWindow(this.doOpenFilesInExistingWindow(openConfig, windowToUseForFiles, filesToOpen), true);
                }
            }
            // Finally, if no window or folder is found, just open the files in an empty window
            else {
                addUsedWindow(await this.openInBrowserWindow({
                    userEnv: openConfig.userEnv,
                    cli: openConfig.cli,
                    initialStartup: openConfig.initialStartup,
                    filesToOpen,
                    forceNewWindow: true,
                    remoteAuthority: filesToOpen.remoteAuthority,
                    forceNewTabbedWindow: openConfig.forceNewTabbedWindow,
                    forceProfile: openConfig.forceProfile,
                    forceTempProfile: openConfig.forceTempProfile
                }), true);
            }
        }
        // Handle workspaces to open (instructed and to restore)
        const allWorkspacesToOpen = distinct(workspacesToOpen, workspace => workspace.workspace.id); // prevent duplicates
        if (allWorkspacesToOpen.length > 0) {
            // Check for existing instances
            const windowsOnWorkspace = coalesce(allWorkspacesToOpen.map(workspaceToOpen => findWindowOnWorkspaceOrFolder(this.getWindows(), workspaceToOpen.workspace.configPath)));
            if (windowsOnWorkspace.length > 0) {
                const windowOnWorkspace = windowsOnWorkspace[0];
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, windowOnWorkspace.remoteAuthority) ? filesToOpen : undefined;
                // Do open files
                addUsedWindow(this.doOpenFilesInExistingWindow(openConfig, windowOnWorkspace, filesToOpenInWindow), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
            // Open remaining ones
            for (const workspaceToOpen of allWorkspacesToOpen) {
                if (windowsOnWorkspace.some(window => window.openedWorkspace && window.openedWorkspace.id === workspaceToOpen.workspace.id)) {
                    continue; // ignore folders that are already open
                }
                const remoteAuthority = workspaceToOpen.remoteAuthority;
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, remoteAuthority) ? filesToOpen : undefined;
                // Do open folder
                addUsedWindow(await this.doOpenFolderOrWorkspace(openConfig, workspaceToOpen, openFolderInNewWindow, filesToOpenInWindow), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
        }
        // Handle folders to open (instructed and to restore)
        const allFoldersToOpen = distinct(foldersToOpen, folder => extUriBiasedIgnorePathCase.getComparisonKey(folder.workspace.uri)); // prevent duplicates
        if (allFoldersToOpen.length > 0) {
            // Check for existing instances
            const windowsOnFolderPath = coalesce(allFoldersToOpen.map(folderToOpen => findWindowOnWorkspaceOrFolder(this.getWindows(), folderToOpen.workspace.uri)));
            if (windowsOnFolderPath.length > 0) {
                const windowOnFolderPath = windowsOnFolderPath[0];
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, windowOnFolderPath.remoteAuthority) ? filesToOpen : undefined;
                // Do open files
                addUsedWindow(this.doOpenFilesInExistingWindow(openConfig, windowOnFolderPath, filesToOpenInWindow), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
            // Open remaining ones
            for (const folderToOpen of allFoldersToOpen) {
                if (windowsOnFolderPath.some(window => isSingleFolderWorkspaceIdentifier(window.openedWorkspace) && extUriBiasedIgnorePathCase.isEqual(window.openedWorkspace.uri, folderToOpen.workspace.uri))) {
                    continue; // ignore folders that are already open
                }
                const remoteAuthority = folderToOpen.remoteAuthority;
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, remoteAuthority) ? filesToOpen : undefined;
                // Do open folder
                addUsedWindow(await this.doOpenFolderOrWorkspace(openConfig, folderToOpen, openFolderInNewWindow, filesToOpenInWindow), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
        }
        // Handle empty to restore
        const allEmptyToRestore = distinct(emptyToRestore, info => info.backupFolder); // prevent duplicates
        if (allEmptyToRestore.length > 0) {
            for (const emptyWindowBackupInfo of allEmptyToRestore) {
                const remoteAuthority = emptyWindowBackupInfo.remoteAuthority;
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, remoteAuthority) ? filesToOpen : undefined;
                addUsedWindow(await this.doOpenEmpty(openConfig, true, remoteAuthority, filesToOpenInWindow, emptyWindowBackupInfo), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
        }
        // Finally, open an empty window if
        // - we still have files to open
        // - user forces an empty window (e.g. via command line)
        // - no window has opened yet
        if (filesToOpen || (maybeOpenEmptyWindow && (openConfig.forceEmpty || usedWindows.length === 0))) {
            const remoteAuthority = filesToOpen ? filesToOpen.remoteAuthority : openConfig.remoteAuthority;
            addUsedWindow(await this.doOpenEmpty(openConfig, openFolderInNewWindow, remoteAuthority, filesToOpen), !!filesToOpen);
        }
        return { windows: distinct(usedWindows), filesOpenedInWindow };
    }
    doOpenFilesInExistingWindow(configuration, window, filesToOpen) {
        this.logService.trace('windowsManager#doOpenFilesInExistingWindow', { filesToOpen });
        this.focusMainOrChildWindow(window); // make sure window or any of the children has focus
        const params = {
            filesToOpenOrCreate: filesToOpen?.filesToOpenOrCreate,
            filesToDiff: filesToOpen?.filesToDiff,
            filesToMerge: filesToOpen?.filesToMerge,
            filesToWait: filesToOpen?.filesToWait,
            termProgram: configuration?.userEnv?.['TERM_PROGRAM']
        };
        window.sendWhenReady('vscode:openFiles', CancellationToken.None, params);
        return window;
    }
    focusMainOrChildWindow(mainWindow) {
        let windowToFocus = mainWindow;
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow && focusedWindow.id !== mainWindow.id) {
            const auxiliaryWindowCandidate = this.auxiliaryWindowsMainService.getWindowByWebContents(focusedWindow.webContents);
            if (auxiliaryWindowCandidate && auxiliaryWindowCandidate.parentId === mainWindow.id) {
                windowToFocus = auxiliaryWindowCandidate;
            }
        }
        windowToFocus.focus();
    }
    doAddRemoveFoldersInExistingWindow(window, foldersToAdd, foldersToRemove) {
        this.logService.trace('windowsManager#doAddRemoveFoldersToExistingWindow', { foldersToAdd, foldersToRemove });
        window.focus(); // make sure window has focus
        const request = { foldersToAdd, foldersToRemove };
        window.sendWhenReady('vscode:addRemoveFolders', CancellationToken.None, request);
        return window;
    }
    doOpenEmpty(openConfig, forceNewWindow, remoteAuthority, filesToOpen, emptyWindowBackupInfo) {
        this.logService.trace('windowsManager#doOpenEmpty', { restore: !!emptyWindowBackupInfo, remoteAuthority, filesToOpen, forceNewWindow });
        let windowToUse;
        if (!forceNewWindow && typeof openConfig.contextWindowId === 'number') {
            windowToUse = this.getWindowById(openConfig.contextWindowId); // fix for https://github.com/microsoft/vscode/issues/97172
        }
        return this.openInBrowserWindow({
            userEnv: openConfig.userEnv,
            cli: openConfig.cli,
            initialStartup: openConfig.initialStartup,
            remoteAuthority,
            forceNewWindow,
            forceNewTabbedWindow: openConfig.forceNewTabbedWindow,
            filesToOpen,
            windowToUse,
            emptyWindowBackupInfo,
            forceProfile: openConfig.forceProfile,
            forceTempProfile: openConfig.forceTempProfile
        });
    }
    doOpenFolderOrWorkspace(openConfig, folderOrWorkspace, forceNewWindow, filesToOpen, windowToUse) {
        this.logService.trace('windowsManager#doOpenFolderOrWorkspace', { folderOrWorkspace, filesToOpen });
        if (!forceNewWindow && !windowToUse && typeof openConfig.contextWindowId === 'number') {
            windowToUse = this.getWindowById(openConfig.contextWindowId); // fix for https://github.com/microsoft/vscode/issues/49587
        }
        return this.openInBrowserWindow({
            workspace: folderOrWorkspace.workspace,
            userEnv: openConfig.userEnv,
            cli: openConfig.cli,
            initialStartup: openConfig.initialStartup,
            remoteAuthority: folderOrWorkspace.remoteAuthority,
            forceNewWindow,
            forceNewTabbedWindow: openConfig.forceNewTabbedWindow,
            filesToOpen,
            windowToUse,
            forceProfile: openConfig.forceProfile,
            forceTempProfile: openConfig.forceTempProfile
        });
    }
    async getPathsToOpen(openConfig) {
        let pathsToOpen;
        let isCommandLineOrAPICall = false;
        let isRestoringPaths = false;
        // Extract paths: from API
        if (openConfig.urisToOpen && openConfig.urisToOpen.length > 0) {
            pathsToOpen = await this.doExtractPathsFromAPI(openConfig);
            isCommandLineOrAPICall = true;
        }
        // Check for force empty
        else if (openConfig.forceEmpty) {
            pathsToOpen = [EMPTY_WINDOW];
        }
        // Extract paths: from CLI
        else if (openConfig.cli._.length || openConfig.cli['folder-uri'] || openConfig.cli['file-uri']) {
            pathsToOpen = await this.doExtractPathsFromCLI(openConfig.cli);
            if (pathsToOpen.length === 0) {
                pathsToOpen.push(EMPTY_WINDOW); // add an empty window if we did not have windows to open from command line
            }
            isCommandLineOrAPICall = true;
        }
        // Extract paths: from previous session
        else {
            pathsToOpen = await this.doGetPathsFromLastSession();
            if (pathsToOpen.length === 0) {
                pathsToOpen.push(EMPTY_WINDOW); // add an empty window if we did not have windows to restore
            }
            isRestoringPaths = true;
        }
        // Handle the case of multiple folders being opened from CLI while we are
        // not in `--add` or `--remove` mode by creating an untitled workspace, only if:
        // - they all share the same remote authority
        // - there is no existing workspace to open that matches these folders
        if (!openConfig.addMode && !openConfig.removeMode && isCommandLineOrAPICall) {
            const foldersToOpen = pathsToOpen.filter(path => isSingleFolderWorkspacePathToOpen(path));
            if (foldersToOpen.length > 1) {
                const remoteAuthority = foldersToOpen[0].remoteAuthority;
                if (foldersToOpen.every(folderToOpen => isEqualAuthority(folderToOpen.remoteAuthority, remoteAuthority))) {
                    let workspace;
                    const lastSessionWorkspaceMatchingFolders = await this.doGetWorkspaceMatchingFoldersFromLastSession(remoteAuthority, foldersToOpen);
                    if (lastSessionWorkspaceMatchingFolders) {
                        workspace = lastSessionWorkspaceMatchingFolders;
                    }
                    else {
                        workspace = await this.workspacesManagementMainService.createUntitledWorkspace(foldersToOpen.map(folder => ({ uri: folder.workspace.uri })));
                    }
                    // Add workspace and remove folders thereby
                    pathsToOpen.push({ workspace, remoteAuthority });
                    pathsToOpen = pathsToOpen.filter(path => !isSingleFolderWorkspacePathToOpen(path));
                }
            }
        }
        // Check for `window.restoreWindows` setting to include all windows
        // from the previous session if this is the initial startup and we have
        // not restored windows already otherwise.
        // Use `unshift` to ensure any new window to open comes last for proper
        // focus treatment.
        if (openConfig.initialStartup && !isRestoringPaths && this.configurationService.getValue('window')?.restoreWindows === 'preserve') {
            const lastSessionPaths = await this.doGetPathsFromLastSession();
            pathsToOpen.unshift(...lastSessionPaths.filter(path => isWorkspacePathToOpen(path) || isSingleFolderWorkspacePathToOpen(path) || path.backupPath));
        }
        return pathsToOpen;
    }
    async doExtractPathsFromAPI(openConfig) {
        const pathResolveOptions = {
            gotoLineMode: openConfig.gotoLineMode,
            remoteAuthority: openConfig.remoteAuthority
        };
        const pathsToOpen = await Promise.all(coalesce(openConfig.urisToOpen || []).map(async (pathToOpen) => {
            const path = await this.resolveOpenable(pathToOpen, pathResolveOptions);
            // Path exists
            if (path) {
                path.label = pathToOpen.label;
                return path;
            }
            // Path does not exist: show a warning box
            const uri = this.resourceFromOpenable(pathToOpen);
            this.dialogMainService.showMessageBox({
                type: 'info',
                buttons: [localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK")],
                message: uri.scheme === Schemas.file ? localize('pathNotExistTitle', "Path does not exist") : localize('uriInvalidTitle', "URI can not be opened"),
                detail: uri.scheme === Schemas.file ?
                    localize('pathNotExistDetail', "The path '{0}' does not exist on this computer.", getPathLabel(uri, { os: OS, tildify: this.environmentMainService })) :
                    localize('uriInvalidDetail', "The URI '{0}' is not valid and can not be opened.", uri.toString(true))
            }, BrowserWindow.getFocusedWindow() ?? undefined);
            return undefined;
        }));
        return coalesce(pathsToOpen);
    }
    async doExtractPathsFromCLI(cli) {
        const pathsToOpen = [];
        const pathResolveOptions = {
            ignoreFileNotFound: true,
            gotoLineMode: cli.goto,
            remoteAuthority: cli.remote || undefined,
            forceOpenWorkspaceAsFile: 
            // special case diff / merge mode to force open
            // workspace as file
            // https://github.com/microsoft/vscode/issues/149731
            cli.diff && cli._.length === 2 ||
                cli.merge && cli._.length === 4
        };
        // folder uris
        const folderUris = cli['folder-uri'];
        if (folderUris) {
            const resolvedFolderUris = await Promise.all(folderUris.map(rawFolderUri => {
                const folderUri = this.cliArgToUri(rawFolderUri);
                if (!folderUri) {
                    return undefined;
                }
                return this.resolveOpenable({ folderUri }, pathResolveOptions);
            }));
            pathsToOpen.push(...coalesce(resolvedFolderUris));
        }
        // file uris
        const fileUris = cli['file-uri'];
        if (fileUris) {
            const resolvedFileUris = await Promise.all(fileUris.map(rawFileUri => {
                const fileUri = this.cliArgToUri(rawFileUri);
                if (!fileUri) {
                    return undefined;
                }
                return this.resolveOpenable(hasWorkspaceFileExtension(rawFileUri) ? { workspaceUri: fileUri } : { fileUri }, pathResolveOptions);
            }));
            pathsToOpen.push(...coalesce(resolvedFileUris));
        }
        // folder or file paths
        const resolvedCliPaths = await Promise.all(cli._.map(cliPath => {
            return pathResolveOptions.remoteAuthority ? this.doResolveRemotePath(cliPath, pathResolveOptions) : this.doResolveFilePath(cliPath, pathResolveOptions);
        }));
        pathsToOpen.push(...coalesce(resolvedCliPaths));
        return pathsToOpen;
    }
    cliArgToUri(arg) {
        try {
            const uri = URI.parse(arg);
            if (!uri.scheme) {
                this.logService.error(`Invalid URI input string, scheme missing: ${arg}`);
                return undefined;
            }
            if (!uri.path) {
                return uri.with({ path: '/' });
            }
            return uri;
        }
        catch (e) {
            this.logService.error(`Invalid URI input string: ${arg}, ${e.message}`);
        }
        return undefined;
    }
    async doGetPathsFromLastSession() {
        const restoreWindowsSetting = this.getRestoreWindowsSetting();
        switch (restoreWindowsSetting) {
            // none: no window to restore
            case 'none':
                return [];
            // one: restore last opened workspace/folder or empty window
            // all: restore all windows
            // folders: restore last opened folders only
            case 'one':
            case 'all':
            case 'preserve':
            case 'folders': {
                // Collect previously opened windows
                const lastSessionWindows = [];
                if (restoreWindowsSetting !== 'one') {
                    lastSessionWindows.push(...this.windowsStateHandler.state.openedWindows);
                }
                if (this.windowsStateHandler.state.lastActiveWindow) {
                    lastSessionWindows.push(this.windowsStateHandler.state.lastActiveWindow);
                }
                const pathsToOpen = await Promise.all(lastSessionWindows.map(async (lastSessionWindow) => {
                    // Workspaces
                    if (lastSessionWindow.workspace) {
                        const pathToOpen = await this.resolveOpenable({ workspaceUri: lastSessionWindow.workspace.configPath }, { remoteAuthority: lastSessionWindow.remoteAuthority, rejectTransientWorkspaces: true /* https://github.com/microsoft/vscode/issues/119695 */ });
                        if (isWorkspacePathToOpen(pathToOpen)) {
                            return pathToOpen;
                        }
                    }
                    // Folders
                    else if (lastSessionWindow.folderUri) {
                        const pathToOpen = await this.resolveOpenable({ folderUri: lastSessionWindow.folderUri }, { remoteAuthority: lastSessionWindow.remoteAuthority });
                        if (isSingleFolderWorkspacePathToOpen(pathToOpen)) {
                            return pathToOpen;
                        }
                    }
                    // Empty window, potentially editors open to be restored
                    else if (restoreWindowsSetting !== 'folders' && lastSessionWindow.backupPath) {
                        return { backupPath: lastSessionWindow.backupPath, remoteAuthority: lastSessionWindow.remoteAuthority };
                    }
                    return undefined;
                }));
                return coalesce(pathsToOpen);
            }
        }
    }
    getRestoreWindowsSetting() {
        let restoreWindows;
        if (this.lifecycleMainService.wasRestarted) {
            restoreWindows = 'all'; // always reopen all windows when an update was applied
        }
        else {
            const windowConfig = this.configurationService.getValue('window');
            restoreWindows = windowConfig?.restoreWindows || 'all'; // by default restore all windows
            if (!['preserve', 'all', 'folders', 'one', 'none'].includes(restoreWindows)) {
                restoreWindows = 'all'; // by default restore all windows
            }
        }
        return restoreWindows;
    }
    async doGetWorkspaceMatchingFoldersFromLastSession(remoteAuthority, folders) {
        const workspaces = (await this.doGetPathsFromLastSession()).filter(path => isWorkspacePathToOpen(path));
        const folderUris = folders.map(folder => folder.workspace.uri);
        for (const { workspace } of workspaces) {
            const resolvedWorkspace = await this.workspacesManagementMainService.resolveLocalWorkspace(workspace.configPath);
            if (!resolvedWorkspace ||
                resolvedWorkspace.remoteAuthority !== remoteAuthority ||
                resolvedWorkspace.transient ||
                resolvedWorkspace.folders.length !== folders.length) {
                continue;
            }
            const folderSet = new ResourceSet(folderUris, uri => extUriBiasedIgnorePathCase.getComparisonKey(uri));
            if (resolvedWorkspace.folders.every(folder => folderSet.has(folder.uri))) {
                return resolvedWorkspace;
            }
        }
        return undefined;
    }
    async resolveOpenable(openable, options = Object.create(null)) {
        // handle file:// openables with some extra validation
        const uri = this.resourceFromOpenable(openable);
        if (uri.scheme === Schemas.file) {
            if (isFileToOpen(openable)) {
                options = { ...options, forceOpenWorkspaceAsFile: true };
            }
            return this.doResolveFilePath(uri.fsPath, options);
        }
        // handle non file:// openables
        return this.doResolveRemoteOpenable(openable, options);
    }
    doResolveRemoteOpenable(openable, options) {
        let uri = this.resourceFromOpenable(openable);
        // use remote authority from vscode
        const remoteAuthority = getRemoteAuthority(uri) || options.remoteAuthority;
        // normalize URI
        uri = removeTrailingPathSeparator(normalizePath(uri));
        // File
        if (isFileToOpen(openable)) {
            if (options.gotoLineMode) {
                const { path, line, column } = parseLineAndColumnAware(uri.path);
                return {
                    fileUri: uri.with({ path }),
                    options: {
                        selection: line ? { startLineNumber: line, startColumn: column || 1 } : undefined
                    },
                    remoteAuthority
                };
            }
            return { fileUri: uri, remoteAuthority };
        }
        // Workspace
        else if (isWorkspaceToOpen(openable)) {
            return { workspace: getWorkspaceIdentifier(uri), remoteAuthority };
        }
        // Folder
        return { workspace: getSingleFolderWorkspaceIdentifier(uri), remoteAuthority };
    }
    resourceFromOpenable(openable) {
        if (isWorkspaceToOpen(openable)) {
            return openable.workspaceUri;
        }
        if (isFolderToOpen(openable)) {
            return openable.folderUri;
        }
        return openable.fileUri;
    }
    async doResolveFilePath(path, options, skipHandleUNCError) {
        // Extract line/col information from path
        let lineNumber;
        let columnNumber;
        if (options.gotoLineMode) {
            ({ path, line: lineNumber, column: columnNumber } = parseLineAndColumnAware(path));
        }
        // Ensure the path is normalized and absolute
        path = sanitizeFilePath(normalize(path), cwd());
        try {
            const pathStat = await fs.promises.stat(path);
            // File
            if (pathStat.isFile()) {
                // Workspace (unless disabled via flag)
                if (!options.forceOpenWorkspaceAsFile) {
                    const workspace = await this.workspacesManagementMainService.resolveLocalWorkspace(URI.file(path));
                    if (workspace) {
                        // If the workspace is transient and we are to ignore
                        // transient workspaces, reject it.
                        if (workspace.transient && options.rejectTransientWorkspaces) {
                            return undefined;
                        }
                        return {
                            workspace: { id: workspace.id, configPath: workspace.configPath },
                            type: FileType.File,
                            exists: true,
                            remoteAuthority: workspace.remoteAuthority,
                            transient: workspace.transient
                        };
                    }
                }
                return {
                    fileUri: URI.file(path),
                    type: FileType.File,
                    exists: true,
                    options: {
                        selection: lineNumber ? { startLineNumber: lineNumber, startColumn: columnNumber || 1 } : undefined
                    }
                };
            }
            // Folder
            else if (pathStat.isDirectory()) {
                return {
                    workspace: getSingleFolderWorkspaceIdentifier(URI.file(path), pathStat),
                    type: FileType.Directory,
                    exists: true
                };
            }
            // Special device: in POSIX environments, we may get /dev/null passed
            // in (for example git uses it to signal one side of a diff does not
            // exist). In that special case, treat it like a file to support this
            // scenario ()
            else if (!isWindows && path === '/dev/null') {
                return {
                    fileUri: URI.file(path),
                    type: FileType.File,
                    exists: true
                };
            }
        }
        catch (error) {
            if (error.code === 'ERR_UNC_HOST_NOT_ALLOWED' && !skipHandleUNCError) {
                return this.onUNCHostNotAllowed(path, options);
            }
            const fileUri = URI.file(path);
            // since file does not seem to exist anymore, remove from recent
            this.workspacesHistoryMainService.removeRecentlyOpened([fileUri]);
            // assume this is a file that does not yet exist
            if (options.ignoreFileNotFound && error.code === 'ENOENT') {
                return {
                    fileUri,
                    type: FileType.File,
                    exists: false
                };
            }
            this.logService.error(`Invalid path provided: ${path}, ${error.message}`);
        }
        return undefined;
    }
    async onUNCHostNotAllowed(path, options) {
        const uri = URI.file(path);
        const { response, checkboxChecked } = await this.dialogMainService.showMessageBox({
            type: 'warning',
            buttons: [
                localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, "&&Allow"),
                localize({ key: 'cancel', comment: ['&& denotes a mnemonic'] }, "&&Cancel"),
                localize({ key: 'learnMore', comment: ['&& denotes a mnemonic'] }, "&&Learn More"),
            ],
            message: localize('confirmOpenMessage', "The host '{0}' was not found in the list of allowed hosts. Do you want to allow it anyway?", uri.authority),
            detail: localize('confirmOpenDetail', "The path '{0}' uses a host that is not allowed. Unless you trust the host, you should press 'Cancel'", getPathLabel(uri, { os: OS, tildify: this.environmentMainService })),
            checkboxLabel: localize('doNotAskAgain', "Permanently allow host '{0}'", uri.authority),
            cancelId: 1
        });
        if (response === 0) {
            addUNCHostToAllowlist(uri.authority);
            if (checkboxChecked) {
                // Due to https://github.com/microsoft/vscode/issues/195436, we can only
                // update settings from within a window. But we do not know if a window
                // is about to open or can already handle the request, so we have to send
                // to any current window and any newly opening window.
                const request = { channel: 'vscode:configureAllowedUNCHost', args: uri.authority };
                this.sendToFocused(request.channel, request.args);
                this.sendToOpeningWindow(request.channel, request.args);
            }
            return this.doResolveFilePath(path, options, true /* do not handle UNC error again */);
        }
        if (response === 2) {
            shell.openExternal('https://aka.ms/vscode-windows-unc');
            return this.onUNCHostNotAllowed(path, options); // keep showing the dialog until decision (https://github.com/microsoft/vscode/issues/181956)
        }
        return undefined;
    }
    doResolveRemotePath(path, options) {
        const first = path.charCodeAt(0);
        const remoteAuthority = options.remoteAuthority;
        // Extract line/col information from path
        let lineNumber;
        let columnNumber;
        if (options.gotoLineMode) {
            ({ path, line: lineNumber, column: columnNumber } = parseLineAndColumnAware(path));
        }
        // make absolute
        if (first !== 47 /* CharCode.Slash */) {
            if (isWindowsDriveLetter(first) && path.charCodeAt(path.charCodeAt(1)) === 58 /* CharCode.Colon */) {
                path = toSlashes(path);
            }
            path = `/${path}`;
        }
        const uri = URI.from({ scheme: Schemas.vscodeRemote, authority: remoteAuthority, path: path });
        // guess the file type:
        // - if it ends with a slash it's a folder
        // - if in goto line mode or if it has a file extension, it's a file or a workspace
        // - by defaults it's a folder
        if (path.charCodeAt(path.length - 1) !== 47 /* CharCode.Slash */) {
            // file name ends with .code-workspace
            if (hasWorkspaceFileExtension(path)) {
                if (options.forceOpenWorkspaceAsFile) {
                    return {
                        fileUri: uri,
                        options: {
                            selection: lineNumber ? { startLineNumber: lineNumber, startColumn: columnNumber || 1 } : undefined
                        },
                        remoteAuthority: options.remoteAuthority
                    };
                }
                return { workspace: getWorkspaceIdentifier(uri), remoteAuthority };
            }
            // file name starts with a dot or has an file extension
            else if (options.gotoLineMode || posix.basename(path).indexOf('.') !== -1) {
                return {
                    fileUri: uri,
                    options: {
                        selection: lineNumber ? { startLineNumber: lineNumber, startColumn: columnNumber || 1 } : undefined
                    },
                    remoteAuthority
                };
            }
        }
        return { workspace: getSingleFolderWorkspaceIdentifier(uri), remoteAuthority };
    }
    shouldOpenNewWindow(openConfig) {
        // let the user settings override how folders are open in a new window or same window unless we are forced
        const windowConfig = this.configurationService.getValue('window');
        const openFolderInNewWindowConfig = windowConfig?.openFoldersInNewWindow || 'default' /* default */;
        const openFilesInNewWindowConfig = windowConfig?.openFilesInNewWindow || 'off' /* default */;
        let openFolderInNewWindow = (openConfig.preferNewWindow || openConfig.forceNewWindow) && !openConfig.forceReuseWindow;
        if (!openConfig.forceNewWindow && !openConfig.forceReuseWindow && (openFolderInNewWindowConfig === 'on' || openFolderInNewWindowConfig === 'off')) {
            openFolderInNewWindow = (openFolderInNewWindowConfig === 'on');
        }
        // let the user settings override how files are open in a new window or same window unless we are forced (not for extension development though)
        let openFilesInNewWindow = false;
        if (openConfig.forceNewWindow || openConfig.forceReuseWindow) {
            openFilesInNewWindow = !!openConfig.forceNewWindow && !openConfig.forceReuseWindow;
        }
        else {
            // macOS: by default we open files in a new window if this is triggered via DOCK context
            if (isMacintosh) {
                if (openConfig.context === 1 /* OpenContext.DOCK */) {
                    openFilesInNewWindow = true;
                }
            }
            // Linux/Windows: by default we open files in the new window unless triggered via DIALOG / MENU context
            // or from the integrated terminal where we assume the user prefers to open in the current window
            else {
                if (openConfig.context !== 3 /* OpenContext.DIALOG */ && openConfig.context !== 2 /* OpenContext.MENU */ && !(openConfig.userEnv && openConfig.userEnv['TERM_PROGRAM'] === 'vscode')) {
                    openFilesInNewWindow = true;
                }
            }
            // finally check for overrides of default
            if (!openConfig.cli.extensionDevelopmentPath && (openFilesInNewWindowConfig === 'on' || openFilesInNewWindowConfig === 'off')) {
                openFilesInNewWindow = (openFilesInNewWindowConfig === 'on');
            }
        }
        return { openFolderInNewWindow: !!openFolderInNewWindow, openFilesInNewWindow };
    }
    async openExtensionDevelopmentHostWindow(extensionDevelopmentPaths, openConfig) {
        // Reload an existing extension development host window on the same path
        // We currently do not allow more than one extension development window
        // on the same extension path.
        const existingWindow = findWindowOnExtensionDevelopmentPath(this.getWindows(), extensionDevelopmentPaths);
        if (existingWindow) {
            this.lifecycleMainService.reload(existingWindow, openConfig.cli);
            existingWindow.focus(); // make sure it gets focus and is restored
            return [existingWindow];
        }
        let folderUris = openConfig.cli['folder-uri'] || [];
        let fileUris = openConfig.cli['file-uri'] || [];
        let cliArgs = openConfig.cli._;
        // Fill in previously opened workspace unless an explicit path is provided and we are not unit testing
        if (!cliArgs.length && !folderUris.length && !fileUris.length && !openConfig.cli.extensionTestsPath) {
            const extensionDevelopmentWindowState = this.windowsStateHandler.state.lastPluginDevelopmentHostWindow;
            const workspaceToOpen = extensionDevelopmentWindowState?.workspace ?? extensionDevelopmentWindowState?.folderUri;
            if (workspaceToOpen) {
                if (URI.isUri(workspaceToOpen)) {
                    if (workspaceToOpen.scheme === Schemas.file) {
                        cliArgs = [workspaceToOpen.fsPath];
                    }
                    else {
                        folderUris = [workspaceToOpen.toString()];
                    }
                }
                else {
                    if (workspaceToOpen.configPath.scheme === Schemas.file) {
                        cliArgs = [originalFSPath(workspaceToOpen.configPath)];
                    }
                    else {
                        fileUris = [workspaceToOpen.configPath.toString()];
                    }
                }
            }
        }
        let remoteAuthority = openConfig.remoteAuthority;
        for (const extensionDevelopmentPath of extensionDevelopmentPaths) {
            if (extensionDevelopmentPath.match(/^[a-zA-Z][a-zA-Z0-9\+\-\.]+:/)) {
                const url = URI.parse(extensionDevelopmentPath);
                const extensionDevelopmentPathRemoteAuthority = getRemoteAuthority(url);
                if (extensionDevelopmentPathRemoteAuthority) {
                    if (remoteAuthority) {
                        if (!isEqualAuthority(extensionDevelopmentPathRemoteAuthority, remoteAuthority)) {
                            this.logService.error('more than one extension development path authority');
                        }
                    }
                    else {
                        remoteAuthority = extensionDevelopmentPathRemoteAuthority;
                    }
                }
            }
        }
        // Make sure that we do not try to open:
        // - a workspace or folder that is already opened
        // - a workspace or file that has a different authority as the extension development.
        cliArgs = cliArgs.filter(path => {
            const uri = URI.file(path);
            if (!!findWindowOnWorkspaceOrFolder(this.getWindows(), uri)) {
                return false;
            }
            return isEqualAuthority(getRemoteAuthority(uri), remoteAuthority);
        });
        folderUris = folderUris.filter(folderUriStr => {
            const folderUri = this.cliArgToUri(folderUriStr);
            if (folderUri && !!findWindowOnWorkspaceOrFolder(this.getWindows(), folderUri)) {
                return false;
            }
            return folderUri ? isEqualAuthority(getRemoteAuthority(folderUri), remoteAuthority) : false;
        });
        fileUris = fileUris.filter(fileUriStr => {
            const fileUri = this.cliArgToUri(fileUriStr);
            if (fileUri && !!findWindowOnWorkspaceOrFolder(this.getWindows(), fileUri)) {
                return false;
            }
            return fileUri ? isEqualAuthority(getRemoteAuthority(fileUri), remoteAuthority) : false;
        });
        openConfig.cli._ = cliArgs;
        openConfig.cli['folder-uri'] = folderUris;
        openConfig.cli['file-uri'] = fileUris;
        // Open it
        const openArgs = {
            context: openConfig.context,
            cli: openConfig.cli,
            forceNewWindow: true,
            forceEmpty: !cliArgs.length && !folderUris.length && !fileUris.length,
            userEnv: openConfig.userEnv,
            noRecentEntry: true,
            waitMarkerFileURI: openConfig.waitMarkerFileURI,
            remoteAuthority,
            forceProfile: openConfig.forceProfile,
            forceTempProfile: openConfig.forceTempProfile
        };
        return this.open(openArgs);
    }
    async openInBrowserWindow(options) {
        const windowConfig = this.configurationService.getValue('window');
        const lastActiveWindow = this.getLastActiveWindow();
        const newWindowProfile = windowConfig?.newWindowProfile
            ? this.userDataProfilesMainService.profiles.find(profile => profile.name === windowConfig.newWindowProfile) : undefined;
        const defaultProfile = newWindowProfile ?? lastActiveWindow?.profile ?? this.userDataProfilesMainService.defaultProfile;
        let window;
        if (!options.forceNewWindow && !options.forceNewTabbedWindow) {
            window = options.windowToUse || lastActiveWindow;
            if (window) {
                window.focus();
            }
        }
        // Build up the window configuration from provided options, config and environment
        const configuration = {
            // Inherit CLI arguments from environment and/or
            // the specific properties from this launch if provided
            ...this.environmentMainService.args,
            ...options.cli,
            machineId: this.machineId,
            sqmId: this.sqmId,
            devDeviceId: this.devDeviceId,
            windowId: -1, // Will be filled in by the window once loaded later
            mainPid: process.pid,
            appRoot: this.environmentMainService.appRoot,
            execPath: process.execPath,
            codeCachePath: this.environmentMainService.codeCachePath,
            // If we know the backup folder upfront (for empty windows to restore), we can set it
            // directly here which helps for restoring UI state associated with that window.
            // For all other cases we first call into registerEmptyWindowBackup() to set it before
            // loading the window.
            backupPath: options.emptyWindowBackupInfo ? join(this.environmentMainService.backupHome, options.emptyWindowBackupInfo.backupFolder) : undefined,
            profiles: {
                home: this.userDataProfilesMainService.profilesHome,
                all: this.userDataProfilesMainService.profiles,
                // Set to default profile first and resolve and update the profile
                // only after the workspace-backup is registered.
                // Because, workspace identifier of an empty window is known only then.
                profile: defaultProfile
            },
            homeDir: this.environmentMainService.userHome.with({ scheme: Schemas.file }).fsPath,
            tmpDir: this.environmentMainService.tmpDir.with({ scheme: Schemas.file }).fsPath,
            userDataDir: this.environmentMainService.userDataPath,
            remoteAuthority: options.remoteAuthority,
            workspace: options.workspace,
            userEnv: { ...this.initialUserEnv, ...options.userEnv },
            nls: {
                messages: getNLSMessages(),
                language: getNLSLanguage()
            },
            filesToOpenOrCreate: options.filesToOpen?.filesToOpenOrCreate,
            filesToDiff: options.filesToOpen?.filesToDiff,
            filesToMerge: options.filesToOpen?.filesToMerge,
            filesToWait: options.filesToOpen?.filesToWait,
            logLevel: this.loggerService.getLogLevel(),
            loggers: this.loggerService.getGlobalLoggers(),
            logsPath: this.environmentMainService.logsHome.with({ scheme: Schemas.file }).fsPath,
            product,
            isInitialStartup: options.initialStartup,
            perfMarks: getMarks(),
            os: { release: release(), hostname: hostname(), arch: arch() },
            autoDetectHighContrast: windowConfig?.autoDetectHighContrast ?? true,
            autoDetectColorScheme: windowConfig?.autoDetectColorScheme ?? false,
            accessibilitySupport: app.accessibilitySupportEnabled,
            colorScheme: this.themeMainService.getColorScheme(),
            policiesData: this.policyService.serialize(),
            continueOn: this.environmentMainService.continueOn,
            cssModules: this.cssDevelopmentService.isEnabled ? await this.cssDevelopmentService.getCssModules() : undefined
        };
        // New window
        if (!window) {
            const state = this.windowsStateHandler.getNewWindowState(configuration);
            // Create the window
            mark('code/willCreateCodeWindow');
            const createdWindow = window = this.instantiationService.createInstance(CodeWindow, {
                state,
                extensionDevelopmentPath: configuration.extensionDevelopmentPath,
                isExtensionTestHost: !!configuration.extensionTestsPath
            });
            mark('code/didCreateCodeWindow');
            // Add as window tab if configured (macOS only)
            if (options.forceNewTabbedWindow) {
                const activeWindow = this.getLastActiveWindow();
                activeWindow?.addTabbedWindow(createdWindow);
            }
            // Add to our list of windows
            this.windows.set(createdWindow.id, createdWindow);
            // Indicate new window via event
            this._onDidOpenWindow.fire(createdWindow);
            // Indicate number change via event
            this._onDidChangeWindowsCount.fire({ oldCount: this.getWindowCount() - 1, newCount: this.getWindowCount() });
            // Window Events
            const disposables = new DisposableStore();
            disposables.add(createdWindow.onDidSignalReady(() => this._onDidSignalReadyWindow.fire(createdWindow)));
            disposables.add(Event.once(createdWindow.onDidClose)(() => this.onWindowClosed(createdWindow, disposables)));
            disposables.add(Event.once(createdWindow.onDidDestroy)(() => this.onWindowDestroyed(createdWindow)));
            disposables.add(createdWindow.onDidMaximize(() => this._onDidMaximizeWindow.fire(createdWindow)));
            disposables.add(createdWindow.onDidUnmaximize(() => this._onDidUnmaximizeWindow.fire(createdWindow)));
            disposables.add(createdWindow.onDidEnterFullScreen(() => this._onDidChangeFullScreen.fire({ window: createdWindow, fullscreen: true })));
            disposables.add(createdWindow.onDidLeaveFullScreen(() => this._onDidChangeFullScreen.fire({ window: createdWindow, fullscreen: false })));
            disposables.add(createdWindow.onDidTriggerSystemContextMenu(({ x, y }) => this._onDidTriggerSystemContextMenu.fire({ window: createdWindow, x, y })));
            const webContents = assertIsDefined(createdWindow.win?.webContents);
            webContents.removeAllListeners('devtools-reload-page'); // remove built in listener so we can handle this on our own
            disposables.add(Event.fromNodeEventEmitter(webContents, 'devtools-reload-page')(() => this.lifecycleMainService.reload(createdWindow)));
            // Lifecycle
            this.lifecycleMainService.registerWindow(createdWindow);
        }
        // Existing window
        else {
            // Some configuration things get inherited if the window is being reused and we are
            // in extension development host mode. These options are all development related.
            const currentWindowConfig = window.config;
            if (!configuration.extensionDevelopmentPath && currentWindowConfig?.extensionDevelopmentPath) {
                configuration.extensionDevelopmentPath = currentWindowConfig.extensionDevelopmentPath;
                configuration.extensionDevelopmentKind = currentWindowConfig.extensionDevelopmentKind;
                configuration['enable-proposed-api'] = currentWindowConfig['enable-proposed-api'];
                configuration.verbose = currentWindowConfig.verbose;
                configuration['inspect-extensions'] = currentWindowConfig['inspect-extensions'];
                configuration['inspect-brk-extensions'] = currentWindowConfig['inspect-brk-extensions'];
                configuration.debugId = currentWindowConfig.debugId;
                configuration.extensionEnvironment = currentWindowConfig.extensionEnvironment;
                configuration['extensions-dir'] = currentWindowConfig['extensions-dir'];
                configuration['disable-extensions'] = currentWindowConfig['disable-extensions'];
                configuration['disable-extension'] = currentWindowConfig['disable-extension'];
            }
            configuration.loggers = configuration.loggers;
        }
        // Update window identifier and session now
        // that we have the window object in hand.
        configuration.windowId = window.id;
        // If the window was already loaded, make sure to unload it
        // first and only load the new configuration if that was
        // not vetoed
        if (window.isReady) {
            this.lifecycleMainService.unload(window, 4 /* UnloadReason.LOAD */).then(async (veto) => {
                if (!veto) {
                    await this.doOpenInBrowserWindow(window, configuration, options, defaultProfile);
                }
            });
        }
        else {
            await this.doOpenInBrowserWindow(window, configuration, options, defaultProfile);
        }
        return window;
    }
    async doOpenInBrowserWindow(window, configuration, options, defaultProfile) {
        // Register window for backups unless the window
        // is for extension development, where we do not
        // keep any backups.
        if (!configuration.extensionDevelopmentPath) {
            if (isWorkspaceIdentifier(configuration.workspace)) {
                configuration.backupPath = this.backupMainService.registerWorkspaceBackup({
                    workspace: configuration.workspace,
                    remoteAuthority: configuration.remoteAuthority
                });
            }
            else if (isSingleFolderWorkspaceIdentifier(configuration.workspace)) {
                configuration.backupPath = this.backupMainService.registerFolderBackup({
                    folderUri: configuration.workspace.uri,
                    remoteAuthority: configuration.remoteAuthority
                });
            }
            else {
                // Empty windows are special in that they provide no workspace on
                // their configuration. To properly register them with the backup
                // service, we either use the provided associated `backupFolder`
                // in case we restore a previously opened empty window or we have
                // to generate a new empty window workspace identifier to be used
                // as `backupFolder`.
                configuration.backupPath = this.backupMainService.registerEmptyWindowBackup({
                    backupFolder: options.emptyWindowBackupInfo?.backupFolder ?? createEmptyWorkspaceIdentifier().id,
                    remoteAuthority: configuration.remoteAuthority
                });
            }
        }
        const workspace = configuration.workspace ?? toWorkspaceIdentifier(configuration.backupPath, false);
        const profilePromise = this.resolveProfileForBrowserWindow(options, workspace, defaultProfile);
        const profile = profilePromise instanceof Promise ? await profilePromise : profilePromise;
        configuration.profiles.profile = profile;
        if (!configuration.extensionDevelopmentPath) {
            // Associate the configured profile to the workspace
            // unless the window is for extension development,
            // where we do not persist the associations
            await this.userDataProfilesMainService.setProfileForWorkspace(workspace, profile);
        }
        // Load it
        window.load(configuration);
    }
    resolveProfileForBrowserWindow(options, workspace, defaultProfile) {
        if (options.forceProfile) {
            return this.userDataProfilesMainService.profiles.find(p => p.name === options.forceProfile) ?? this.userDataProfilesMainService.createNamedProfile(options.forceProfile);
        }
        if (options.forceTempProfile) {
            return this.userDataProfilesMainService.createTransientProfile();
        }
        return this.userDataProfilesMainService.getProfileForWorkspace(workspace) ?? defaultProfile;
    }
    onWindowClosed(window, disposables) {
        // Remove from our list so that Electron can clean it up
        this.windows.delete(window.id);
        // Emit
        this._onDidChangeWindowsCount.fire({ oldCount: this.getWindowCount() + 1, newCount: this.getWindowCount() });
        // Clean up
        disposables.dispose();
    }
    onWindowDestroyed(window) {
        // Remove from our list so that Electron can clean it up
        this.windows.delete(window.id);
        // Emit
        this._onDidDestroyWindow.fire(window);
    }
    getFocusedWindow() {
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
            return this.getWindowById(window.id);
        }
        return undefined;
    }
    getLastActiveWindow() {
        return this.doGetLastActiveWindow(this.getWindows());
    }
    getLastActiveWindowForAuthority(remoteAuthority) {
        return this.doGetLastActiveWindow(this.getWindows().filter(window => isEqualAuthority(window.remoteAuthority, remoteAuthority)));
    }
    doGetLastActiveWindow(windows) {
        return getLastFocused(windows);
    }
    sendToFocused(channel, ...args) {
        const focusedWindow = this.getFocusedWindow() || this.getLastActiveWindow();
        focusedWindow?.sendWhenReady(channel, CancellationToken.None, ...args);
    }
    sendToOpeningWindow(channel, ...args) {
        this._register(Event.once(this.onDidSignalReadyWindow)(window => {
            window.sendWhenReady(channel, CancellationToken.None, ...args);
        }));
    }
    sendToAll(channel, payload, windowIdsToIgnore) {
        for (const window of this.getWindows()) {
            if (windowIdsToIgnore && windowIdsToIgnore.indexOf(window.id) >= 0) {
                continue; // do not send if we are instructed to ignore it
            }
            window.sendWhenReady(channel, CancellationToken.None, payload);
        }
    }
    getWindows() {
        return Array.from(this.windows.values());
    }
    getWindowCount() {
        return this.windows.size;
    }
    getWindowById(windowId) {
        return this.windows.get(windowId);
    }
    getWindowByWebContents(webContents) {
        const browserWindow = BrowserWindow.fromWebContents(webContents);
        if (!browserWindow) {
            return undefined;
        }
        const window = this.getWindowById(browserWindow.id);
        return window?.matches(webContents) ? window : undefined;
    }
};
WindowsMainService = __decorate([
    __param(4, ILogService),
    __param(5, ILoggerMainService),
    __param(6, IStateService),
    __param(7, IPolicyService),
    __param(8, IEnvironmentMainService),
    __param(9, IUserDataProfilesMainService),
    __param(10, ILifecycleMainService),
    __param(11, IBackupMainService),
    __param(12, IConfigurationService),
    __param(13, IWorkspacesHistoryMainService),
    __param(14, IWorkspacesManagementMainService),
    __param(15, IInstantiationService),
    __param(16, IDialogMainService),
    __param(17, IFileService),
    __param(18, IProtocolMainService),
    __param(19, IThemeMainService),
    __param(20, IAuxiliaryWindowsMainService),
    __param(21, ICSSDevelopmentService)
], WindowsMainService);
export { WindowsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvd3MvZWxlY3Ryb24tbWFpbi93aW5kb3dzTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQWUsS0FBSyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLElBQUksQ0FBQztBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHVCQUF1QixFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDaEYsT0FBTyxFQUFF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