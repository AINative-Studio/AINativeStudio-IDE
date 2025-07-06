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
import { IWorkspaceEditingService } from '../common/workspaceEditing.js';
import { URI } from '../../../../base/common/uri.js';
import { hasWorkspaceFileExtension, isUntitledWorkspace, isWorkspaceIdentifier, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IWorkingCopyBackupService } from '../../workingCopy/common/workingCopyBackup.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { basename } from '../../../../base/common/resources.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IHostService } from '../../host/browser/host.js';
import { AbstractWorkspaceEditingService } from '../browser/abstractWorkspaceEditingService.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { WorkingCopyBackupService } from '../../workingCopy/common/workingCopyBackupService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchConfigurationService } from '../../configuration/common/configuration.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
let NativeWorkspaceEditingService = class NativeWorkspaceEditingService extends AbstractWorkspaceEditingService {
    constructor(jsonEditingService, contextService, nativeHostService, configurationService, storageService, extensionService, workingCopyBackupService, notificationService, commandService, fileService, textFileService, workspacesService, environmentService, fileDialogService, dialogService, lifecycleService, labelService, hostService, uriIdentityService, workspaceTrustManagementService, userDataProfilesService, userDataProfileService) {
        super(jsonEditingService, contextService, configurationService, notificationService, commandService, fileService, textFileService, workspacesService, environmentService, fileDialogService, dialogService, hostService, uriIdentityService, workspaceTrustManagementService, userDataProfilesService, userDataProfileService);
        this.nativeHostService = nativeHostService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.lifecycleService = lifecycleService;
        this.labelService = labelService;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.lifecycleService.onBeforeShutdown(e => {
            const saveOperation = this.saveUntitledBeforeShutdown(e.reason);
            e.veto(saveOperation, 'veto.untitledWorkspace');
        }));
    }
    async saveUntitledBeforeShutdown(reason) {
        if (reason !== 4 /* ShutdownReason.LOAD */ && reason !== 1 /* ShutdownReason.CLOSE */) {
            return false; // only interested when window is closing or loading
        }
        const workspaceIdentifier = this.getCurrentWorkspaceIdentifier();
        if (!workspaceIdentifier || !isUntitledWorkspace(workspaceIdentifier.configPath, this.environmentService)) {
            return false; // only care about untitled workspaces to ask for saving
        }
        const windowCount = await this.nativeHostService.getWindowCount();
        if (reason === 1 /* ShutdownReason.CLOSE */ && !isMacintosh && windowCount === 1) {
            return false; // Windows/Linux: quits when last window is closed, so do not ask then
        }
        const confirmSaveUntitledWorkspace = this.configurationService.getValue('window.confirmSaveUntitledWorkspace') !== false;
        if (!confirmSaveUntitledWorkspace) {
            await this.workspacesService.deleteUntitledWorkspace(workspaceIdentifier);
            return false; // no confirmation configured
        }
        let canceled = false;
        const { result, checkboxChecked } = await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('saveWorkspaceMessage', "Do you want to save your workspace configuration as a file?"),
            detail: localize('saveWorkspaceDetail', "Save your workspace if you plan to open it again."),
            buttons: [
                {
                    label: localize({ key: 'save', comment: ['&& denotes a mnemonic'] }, "&&Save"),
                    run: async () => {
                        const newWorkspacePath = await this.pickNewWorkspacePath();
                        if (!newWorkspacePath || !hasWorkspaceFileExtension(newWorkspacePath)) {
                            return true; // keep veto if no target was provided
                        }
                        try {
                            await this.saveWorkspaceAs(workspaceIdentifier, newWorkspacePath);
                            // Make sure to add the new workspace to the history to find it again
                            const newWorkspaceIdentifier = await this.workspacesService.getWorkspaceIdentifier(newWorkspacePath);
                            await this.workspacesService.addRecentlyOpened([{
                                    label: this.labelService.getWorkspaceLabel(newWorkspaceIdentifier, { verbose: 2 /* Verbosity.LONG */ }),
                                    workspace: newWorkspaceIdentifier,
                                    remoteAuthority: this.environmentService.remoteAuthority // remember whether this was a remote window
                                }]);
                            // Delete the untitled one
                            await this.workspacesService.deleteUntitledWorkspace(workspaceIdentifier);
                        }
                        catch (error) {
                            // ignore
                        }
                        return false;
                    }
                },
                {
                    label: localize({ key: 'doNotSave', comment: ['&& denotes a mnemonic'] }, "Do&&n't Save"),
                    run: async () => {
                        await this.workspacesService.deleteUntitledWorkspace(workspaceIdentifier);
                        return false;
                    }
                }
            ],
            cancelButton: {
                run: () => {
                    canceled = true;
                    return true; // veto
                }
            },
            checkbox: {
                label: localize('doNotAskAgain', "Always discard untitled workspaces without asking")
            }
        });
        if (!canceled && checkboxChecked) {
            await this.configurationService.updateValue('window.confirmSaveUntitledWorkspace', false, 2 /* ConfigurationTarget.USER */);
        }
        return result;
    }
    async isValidTargetWorkspacePath(workspaceUri) {
        const windows = await this.nativeHostService.getWindows({ includeAuxiliaryWindows: false });
        // Prevent overwriting a workspace that is currently opened in another window
        if (windows.some(window => isWorkspaceIdentifier(window.workspace) && this.uriIdentityService.extUri.isEqual(window.workspace.configPath, workspaceUri))) {
            await this.dialogService.info(localize('workspaceOpenedMessage', "Unable to save workspace '{0}'", basename(workspaceUri)), localize('workspaceOpenedDetail', "The workspace is already opened in another window. Please close that window first and then try again."));
            return false;
        }
        return true; // OK
    }
    async enterWorkspace(workspaceUri) {
        const stopped = await this.extensionService.stopExtensionHosts(localize('restartExtensionHost.reason', "Opening a multi-root workspace"));
        if (!stopped) {
            return;
        }
        const result = await this.doEnterWorkspace(workspaceUri);
        if (result) {
            // Migrate storage to new workspace
            await this.storageService.switch(result.workspace, true /* preserve data */);
            // Reinitialize backup service
            if (this.workingCopyBackupService instanceof WorkingCopyBackupService) {
                const newBackupWorkspaceHome = result.backupPath ? URI.file(result.backupPath).with({ scheme: this.environmentService.userRoamingDataHome.scheme }) : undefined;
                this.workingCopyBackupService.reinitialize(newBackupWorkspaceHome);
            }
        }
        // TODO@aeschli: workaround until restarting works
        if (this.environmentService.remoteAuthority) {
            this.hostService.reload();
        }
        // Restart the extension host: entering a workspace means a new location for
        // storage and potentially a change in the workspace.rootPath property.
        else {
            this.extensionService.startExtensionHosts();
        }
    }
};
NativeWorkspaceEditingService = __decorate([
    __param(0, IJSONEditingService),
    __param(1, IWorkspaceContextService),
    __param(2, INativeHostService),
    __param(3, IWorkbenchConfigurationService),
    __param(4, IStorageService),
    __param(5, IExtensionService),
    __param(6, IWorkingCopyBackupService),
    __param(7, INotificationService),
    __param(8, ICommandService),
    __param(9, IFileService),
    __param(10, ITextFileService),
    __param(11, IWorkspacesService),
    __param(12, INativeWorkbenchEnvironmentService),
    __param(13, IFileDialogService),
    __param(14, IDialogService),
    __param(15, ILifecycleService),
    __param(16, ILabelService),
    __param(17, IHostService),
    __param(18, IUriIdentityService),
    __param(19, IWorkspaceTrustManagementService),
    __param(20, IUserDataProfilesService),
    __param(21, IUserDataProfileService)
], NativeWorkspaceEditingService);
export { NativeWorkspaceEditingService };
registerSingleton(IWorkspaceEditingService, NativeWorkspaceEditingService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlRWRpdGluZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9lbGVjdHJvbi1zYW5kYm94L3dvcmtzcGFjZUVkaXRpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDckssT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUs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