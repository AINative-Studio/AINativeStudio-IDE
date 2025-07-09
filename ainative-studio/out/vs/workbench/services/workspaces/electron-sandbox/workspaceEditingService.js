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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlRWRpdGluZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtzcGFjZXMvZWxlY3Ryb24tc2FuZGJveC93b3Jrc3BhY2VFZGl0aW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3JLLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFF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