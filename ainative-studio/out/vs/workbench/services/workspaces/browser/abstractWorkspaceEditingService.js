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
import { localize } from '../../../../nls.js';
import { hasWorkspaceFileExtension, isSavedWorkspace, isUntitledWorkspace, isWorkspaceIdentifier, IWorkspaceContextService, toWorkspaceIdentifier, WORKSPACE_EXTENSION, WORKSPACE_FILTER } from '../../../../platform/workspace/common/workspace.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { IWorkspacesService, rewriteWorkspaceFileForNewLocation } from '../../../../platform/workspaces/common/workspaces.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { distinct } from '../../../../base/common/arrays.js';
import { basename, isEqual, isEqualAuthority, joinPath, removeTrailingPathSeparator } from '../../../../base/common/resources.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IHostService } from '../../host/browser/host.js';
import { Schemas } from '../../../../base/common/network.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchConfigurationService } from '../../configuration/common/configuration.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let AbstractWorkspaceEditingService = class AbstractWorkspaceEditingService extends Disposable {
    constructor(jsonEditingService, contextService, configurationService, notificationService, commandService, fileService, textFileService, workspacesService, environmentService, fileDialogService, dialogService, hostService, uriIdentityService, workspaceTrustManagementService, userDataProfilesService, userDataProfileService) {
        super();
        this.jsonEditingService = jsonEditingService;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.commandService = commandService;
        this.fileService = fileService;
        this.textFileService = textFileService;
        this.workspacesService = workspacesService;
        this.environmentService = environmentService;
        this.fileDialogService = fileDialogService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileService = userDataProfileService;
    }
    async pickNewWorkspacePath() {
        const availableFileSystems = [Schemas.file];
        if (this.environmentService.remoteAuthority) {
            availableFileSystems.unshift(Schemas.vscodeRemote);
        }
        let workspacePath = await this.fileDialogService.showSaveDialog({
            saveLabel: localize('save', "Save"),
            title: localize('saveWorkspace', "Save Workspace"),
            filters: WORKSPACE_FILTER,
            defaultUri: joinPath(await this.fileDialogService.defaultWorkspacePath(), this.getNewWorkspaceName()),
            availableFileSystems
        });
        if (!workspacePath) {
            return; // canceled
        }
        if (!hasWorkspaceFileExtension(workspacePath)) {
            // Always ensure we have workspace file extension
            // (see https://github.com/microsoft/vscode/issues/84818)
            workspacePath = workspacePath.with({ path: `${workspacePath.path}.${WORKSPACE_EXTENSION}` });
        }
        return workspacePath;
    }
    getNewWorkspaceName() {
        // First try with existing workspace name
        const configPathURI = this.getCurrentWorkspaceIdentifier()?.configPath;
        if (configPathURI && isSavedWorkspace(configPathURI, this.environmentService)) {
            return basename(configPathURI);
        }
        // Then fallback to first folder if any
        const folder = this.contextService.getWorkspace().folders.at(0);
        if (folder) {
            return `${basename(folder.uri)}.${WORKSPACE_EXTENSION}`;
        }
        // Finally pick a good default
        return `workspace.${WORKSPACE_EXTENSION}`;
    }
    async updateFolders(index, deleteCount, foldersToAddCandidates, donotNotifyError) {
        const folders = this.contextService.getWorkspace().folders;
        let foldersToDelete = [];
        if (typeof deleteCount === 'number') {
            foldersToDelete = folders.slice(index, index + deleteCount).map(folder => folder.uri);
        }
        let foldersToAdd = [];
        if (Array.isArray(foldersToAddCandidates)) {
            foldersToAdd = foldersToAddCandidates.map(folderToAdd => ({ uri: removeTrailingPathSeparator(folderToAdd.uri), name: folderToAdd.name })); // Normalize
        }
        const wantsToDelete = foldersToDelete.length > 0;
        const wantsToAdd = foldersToAdd.length > 0;
        if (!wantsToAdd && !wantsToDelete) {
            return; // return early if there is nothing to do
        }
        // Add Folders
        if (wantsToAdd && !wantsToDelete) {
            return this.doAddFolders(foldersToAdd, index, donotNotifyError);
        }
        // Delete Folders
        if (wantsToDelete && !wantsToAdd) {
            return this.removeFolders(foldersToDelete);
        }
        // Add & Delete Folders
        else {
            // if we are in single-folder state and the folder is replaced with
            // other folders, we handle this specially and just enter workspace
            // mode with the folders that are being added.
            if (this.includesSingleFolderWorkspace(foldersToDelete)) {
                return this.createAndEnterWorkspace(foldersToAdd);
            }
            // if we are not in workspace-state, we just add the folders
            if (this.contextService.getWorkbenchState() !== 3 /* WorkbenchState.WORKSPACE */) {
                return this.doAddFolders(foldersToAdd, index, donotNotifyError);
            }
            // finally, update folders within the workspace
            return this.doUpdateFolders(foldersToAdd, foldersToDelete, index, donotNotifyError);
        }
    }
    async doUpdateFolders(foldersToAdd, foldersToDelete, index, donotNotifyError = false) {
        try {
            await this.contextService.updateFolders(foldersToAdd, foldersToDelete, index);
        }
        catch (error) {
            if (donotNotifyError) {
                throw error;
            }
            this.handleWorkspaceConfigurationEditingError(error);
        }
    }
    addFolders(foldersToAddCandidates, donotNotifyError = false) {
        // Normalize
        const foldersToAdd = foldersToAddCandidates.map(folderToAdd => ({ uri: removeTrailingPathSeparator(folderToAdd.uri), name: folderToAdd.name }));
        return this.doAddFolders(foldersToAdd, undefined, donotNotifyError);
    }
    async doAddFolders(foldersToAdd, index, donotNotifyError = false) {
        const state = this.contextService.getWorkbenchState();
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (remoteAuthority) {
            // https://github.com/microsoft/vscode/issues/94191
            foldersToAdd = foldersToAdd.filter(folder => folder.uri.scheme !== Schemas.file && (folder.uri.scheme !== Schemas.vscodeRemote || isEqualAuthority(folder.uri.authority, remoteAuthority)));
        }
        // If we are in no-workspace or single-folder workspace, adding folders has to
        // enter a workspace.
        if (state !== 3 /* WorkbenchState.WORKSPACE */) {
            let newWorkspaceFolders = this.contextService.getWorkspace().folders.map(folder => ({ uri: folder.uri }));
            newWorkspaceFolders.splice(typeof index === 'number' ? index : newWorkspaceFolders.length, 0, ...foldersToAdd);
            newWorkspaceFolders = distinct(newWorkspaceFolders, folder => this.uriIdentityService.extUri.getComparisonKey(folder.uri));
            if (state === 1 /* WorkbenchState.EMPTY */ && newWorkspaceFolders.length === 0 || state === 2 /* WorkbenchState.FOLDER */ && newWorkspaceFolders.length === 1) {
                return; // return if the operation is a no-op for the current state
            }
            return this.createAndEnterWorkspace(newWorkspaceFolders);
        }
        // Delegate addition of folders to workspace service otherwise
        try {
            await this.contextService.addFolders(foldersToAdd, index);
        }
        catch (error) {
            if (donotNotifyError) {
                throw error;
            }
            this.handleWorkspaceConfigurationEditingError(error);
        }
    }
    async removeFolders(foldersToRemove, donotNotifyError = false) {
        // If we are in single-folder state and the opened folder is to be removed,
        // we create an empty workspace and enter it.
        if (this.includesSingleFolderWorkspace(foldersToRemove)) {
            return this.createAndEnterWorkspace([]);
        }
        // Delegate removal of folders to workspace service otherwise
        try {
            await this.contextService.removeFolders(foldersToRemove);
        }
        catch (error) {
            if (donotNotifyError) {
                throw error;
            }
            this.handleWorkspaceConfigurationEditingError(error);
        }
    }
    includesSingleFolderWorkspace(folders) {
        if (this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceFolder = this.contextService.getWorkspace().folders[0];
            return (folders.some(folder => this.uriIdentityService.extUri.isEqual(folder, workspaceFolder.uri)));
        }
        return false;
    }
    async createAndEnterWorkspace(folders, path) {
        if (path && !await this.isValidTargetWorkspacePath(path)) {
            return;
        }
        const remoteAuthority = this.environmentService.remoteAuthority;
        const untitledWorkspace = await this.workspacesService.createUntitledWorkspace(folders, remoteAuthority);
        if (path) {
            try {
                await this.saveWorkspaceAs(untitledWorkspace, path);
            }
            finally {
                await this.workspacesService.deleteUntitledWorkspace(untitledWorkspace); // https://github.com/microsoft/vscode/issues/100276
            }
        }
        else {
            path = untitledWorkspace.configPath;
            if (!this.userDataProfileService.currentProfile.isDefault) {
                await this.userDataProfilesService.setProfileForWorkspace(untitledWorkspace, this.userDataProfileService.currentProfile);
            }
        }
        return this.enterWorkspace(path);
    }
    async saveAndEnterWorkspace(workspaceUri) {
        const workspaceIdentifier = this.getCurrentWorkspaceIdentifier();
        if (!workspaceIdentifier) {
            return;
        }
        // Allow to save the workspace of the current window
        // if we have an identical match on the path
        if (isEqual(workspaceIdentifier.configPath, workspaceUri)) {
            return this.saveWorkspace(workspaceIdentifier);
        }
        // From this moment on we require a valid target that is not opened already
        if (!await this.isValidTargetWorkspacePath(workspaceUri)) {
            return;
        }
        await this.saveWorkspaceAs(workspaceIdentifier, workspaceUri);
        return this.enterWorkspace(workspaceUri);
    }
    async isValidTargetWorkspacePath(workspaceUri) {
        return true; // OK
    }
    async saveWorkspaceAs(workspace, targetConfigPathURI) {
        const configPathURI = workspace.configPath;
        const isNotUntitledWorkspace = !isUntitledWorkspace(targetConfigPathURI, this.environmentService);
        if (isNotUntitledWorkspace && !this.userDataProfileService.currentProfile.isDefault) {
            const newWorkspace = await this.workspacesService.getWorkspaceIdentifier(targetConfigPathURI);
            await this.userDataProfilesService.setProfileForWorkspace(newWorkspace, this.userDataProfileService.currentProfile);
        }
        // Return early if target is same as source
        if (this.uriIdentityService.extUri.isEqual(configPathURI, targetConfigPathURI)) {
            return;
        }
        const isFromUntitledWorkspace = isUntitledWorkspace(configPathURI, this.environmentService);
        // Read the contents of the workspace file, update it to new location and save it.
        const raw = await this.fileService.readFile(configPathURI);
        const newRawWorkspaceContents = rewriteWorkspaceFileForNewLocation(raw.value.toString(), configPathURI, isFromUntitledWorkspace, targetConfigPathURI, this.uriIdentityService.extUri);
        await this.textFileService.create([{ resource: targetConfigPathURI, value: newRawWorkspaceContents, options: { overwrite: true } }]);
        // Set trust for the workspace file
        await this.trustWorkspaceConfiguration(targetConfigPathURI);
    }
    async saveWorkspace(workspace) {
        const configPathURI = workspace.configPath;
        // First: try to save any existing model as it could be dirty
        const existingModel = this.textFileService.files.get(configPathURI);
        if (existingModel) {
            await existingModel.save({ force: true, reason: 1 /* SaveReason.EXPLICIT */ });
            return;
        }
        // Second: if the file exists on disk, simply return
        const workspaceFileExists = await this.fileService.exists(configPathURI);
        if (workspaceFileExists) {
            return;
        }
        // Finally, we need to re-create the file as it was deleted
        const newWorkspace = { folders: [] };
        const newRawWorkspaceContents = rewriteWorkspaceFileForNewLocation(JSON.stringify(newWorkspace, null, '\t'), configPathURI, false, configPathURI, this.uriIdentityService.extUri);
        await this.textFileService.create([{ resource: configPathURI, value: newRawWorkspaceContents }]);
    }
    handleWorkspaceConfigurationEditingError(error) {
        switch (error.code) {
            case 0 /* JSONEditingErrorCode.ERROR_INVALID_FILE */:
                this.onInvalidWorkspaceConfigurationFileError();
                break;
            default:
                this.notificationService.error(error.message);
        }
    }
    onInvalidWorkspaceConfigurationFileError() {
        const message = localize('errorInvalidTaskConfiguration', "Unable to write into workspace configuration file. Please open the file to correct errors/warnings in it and try again.");
        this.askToOpenWorkspaceConfigurationFile(message);
    }
    askToOpenWorkspaceConfigurationFile(message) {
        this.notificationService.prompt(Severity.Error, message, [{
                label: localize('openWorkspaceConfigurationFile', "Open Workspace Configuration"),
                run: () => this.commandService.executeCommand('workbench.action.openWorkspaceConfigFile')
            }]);
    }
    async doEnterWorkspace(workspaceUri) {
        if (!!this.environmentService.extensionTestsLocationURI) {
            throw new Error('Entering a new workspace is not possible in tests.');
        }
        const workspace = await this.workspacesService.getWorkspaceIdentifier(workspaceUri);
        // Settings migration (only if we come from a folder workspace)
        if (this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            await this.migrateWorkspaceSettings(workspace);
        }
        await this.configurationService.initialize(workspace);
        return this.workspacesService.enterWorkspace(workspaceUri);
    }
    migrateWorkspaceSettings(toWorkspace) {
        return this.doCopyWorkspaceSettings(toWorkspace, setting => setting.scope === 4 /* ConfigurationScope.WINDOW */);
    }
    copyWorkspaceSettings(toWorkspace) {
        return this.doCopyWorkspaceSettings(toWorkspace);
    }
    doCopyWorkspaceSettings(toWorkspace, filter) {
        const configurationProperties = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
        const targetWorkspaceConfiguration = {};
        for (const key of this.configurationService.keys().workspace) {
            if (configurationProperties[key]) {
                if (filter && !filter(configurationProperties[key])) {
                    continue;
                }
                targetWorkspaceConfiguration[key] = this.configurationService.inspect(key).workspaceValue;
            }
        }
        return this.jsonEditingService.write(toWorkspace.configPath, [{ path: ['settings'], value: targetWorkspaceConfiguration }], true);
    }
    async trustWorkspaceConfiguration(configPathURI) {
        if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ && this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            await this.workspaceTrustManagementService.setUrisTrust([configPathURI], true);
        }
    }
    getCurrentWorkspaceIdentifier() {
        const identifier = toWorkspaceIdentifier(this.contextService.getWorkspace());
        if (isWorkspaceIdentifier(identifier)) {
            return identifier;
        }
        return undefined;
    }
};
AbstractWorkspaceEditingService = __decorate([
    __param(0, IJSONEditingService),
    __param(1, IWorkspaceContextService),
    __param(2, IWorkbenchConfigurationService),
    __param(3, INotificationService),
    __param(4, ICommandService),
    __param(5, IFileService),
    __param(6, ITextFileService),
    __param(7, IWorkspacesService),
    __param(8, IWorkbenchEnvironmentService),
    __param(9, IFileDialogService),
    __param(10, IDialogService),
    __param(11, IHostService),
    __param(12, IUriIdentityService),
    __param(13, IWorkspaceTrustManagementService),
    __param(14, IUserDataProfilesService),
    __param(15, IUserDataProfileService)
], AbstractWorkspaceEditingService);
export { AbstractWorkspaceEditingService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RXb3Jrc3BhY2VFZGl0aW5nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9icm93c2VyL2Fic3RyYWN0V29ya3NwYWNlRWRpdGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSx3QkFBd0IsRUFBd0IscUJBQXFCLEVBQWtCLG1CQUFtQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDM1IsT0FBTyxFQUFFLG1CQUFtQixFQUEwQyxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hILE9BQU8sRUFBZ0Msa0JBQWtCLEVBQUUsa0NBQWtDLEVBQTJDLE1BQU0sc0RBQXNELENBQUM7QUFFck0sT0FBTyxFQUE4QyxVQUFVLElBQUksdUJBQXVCLEVBQWdDLE1BQU0sb0VBQW9FLENBQUM7QUFDck0sT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEksT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxZQUFZ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