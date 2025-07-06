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
import { IWorkingCopyBackupService } from '../common/workingCopyBackup.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../common/workingCopyService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IFileDialogService, IDialogService, getFileNamesMessage } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { HotExitConfiguration } from '../../../../platform/files/common/files.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { WorkingCopyBackupTracker } from '../common/workingCopyBackupTracker.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { Promises, raceCancellation } from '../../../../base/common/async.js';
import { IWorkingCopyEditorService } from '../common/workingCopyEditorService.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
let NativeWorkingCopyBackupTracker = class NativeWorkingCopyBackupTracker extends WorkingCopyBackupTracker {
    static { this.ID = 'workbench.contrib.nativeWorkingCopyBackupTracker'; }
    constructor(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, fileDialogService, dialogService, contextService, nativeHostService, logService, environmentService, progressService, workingCopyEditorService, editorService, editorGroupService) {
        super(workingCopyBackupService, workingCopyService, logService, lifecycleService, filesConfigurationService, workingCopyEditorService, editorService, editorGroupService);
        this.fileDialogService = fileDialogService;
        this.dialogService = dialogService;
        this.contextService = contextService;
        this.nativeHostService = nativeHostService;
        this.environmentService = environmentService;
        this.progressService = progressService;
    }
    async onFinalBeforeShutdown(reason) {
        // Important: we are about to shutdown and handle modified working copies
        // and backups. We do not want any pending backup ops to interfer with
        // this because there is a risk of a backup being scheduled after we have
        // acknowledged to shutdown and then might end up with partial backups
        // written to disk, or even empty backups or deletes after writes.
        // (https://github.com/microsoft/vscode/issues/138055)
        this.cancelBackupOperations();
        // For the duration of the shutdown handling, suspend backup operations
        // and only resume after we have handled backups. Similar to above, we
        // do not want to trigger backup tracking during our shutdown handling
        // but we must resume, in case of a veto afterwards.
        const { resume } = this.suspendBackupOperations();
        try {
            // Modified working copies need treatment on shutdown
            const modifiedWorkingCopies = this.workingCopyService.modifiedWorkingCopies;
            if (modifiedWorkingCopies.length) {
                return await this.onBeforeShutdownWithModified(reason, modifiedWorkingCopies);
            }
            // No modified working copies
            else {
                return await this.onBeforeShutdownWithoutModified();
            }
        }
        finally {
            resume();
        }
    }
    async onBeforeShutdownWithModified(reason, modifiedWorkingCopies) {
        // If auto save is enabled, save all non-untitled working copies
        // and then check again for modified copies
        const workingCopiesToAutoSave = modifiedWorkingCopies.filter(wc => !(wc.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) && this.filesConfigurationService.getAutoSaveMode(wc.resource).mode !== 0 /* AutoSaveMode.OFF */);
        if (workingCopiesToAutoSave.length > 0) {
            // Save all modified working copies that can be auto-saved
            try {
                await this.doSaveAllBeforeShutdown(workingCopiesToAutoSave, 2 /* SaveReason.AUTO */);
            }
            catch (error) {
                this.logService.error(`[backup tracker] error saving modified working copies: ${error}`); // guard against misbehaving saves, we handle remaining modified below
            }
            // If we still have modified working copies, we either have untitled ones or working copies that cannot be saved
            const remainingModifiedWorkingCopies = this.workingCopyService.modifiedWorkingCopies;
            if (remainingModifiedWorkingCopies.length) {
                return this.handleModifiedBeforeShutdown(remainingModifiedWorkingCopies, reason);
            }
            return this.noVeto([...modifiedWorkingCopies]); // no veto (modified auto-saved)
        }
        // Auto save is not enabled
        return this.handleModifiedBeforeShutdown(modifiedWorkingCopies, reason);
    }
    async handleModifiedBeforeShutdown(modifiedWorkingCopies, reason) {
        // Trigger backup if configured and enabled for shutdown reason
        let backups = [];
        let backupError = undefined;
        const modifiedWorkingCopiesToBackup = await this.shouldBackupBeforeShutdown(reason, modifiedWorkingCopies);
        if (modifiedWorkingCopiesToBackup.length > 0) {
            try {
                const backupResult = await this.backupBeforeShutdown(modifiedWorkingCopiesToBackup);
                backups = backupResult.backups;
                backupError = backupResult.error;
                if (backups.length === modifiedWorkingCopies.length) {
                    return false; // no veto (backup was successful for all working copies)
                }
            }
            catch (error) {
                backupError = error;
            }
        }
        const remainingModifiedWorkingCopies = modifiedWorkingCopies.filter(workingCopy => !backups.includes(workingCopy));
        // We ran a backup but received an error that we show to the user
        if (backupError) {
            if (this.environmentService.isExtensionDevelopment) {
                this.logService.error(`[backup tracker] error creating backups: ${backupError}`);
                return false; // do not block shutdown during extension development (https://github.com/microsoft/vscode/issues/115028)
            }
            return this.showErrorDialog(localize('backupTrackerBackupFailed', "The following editors with unsaved changes could not be saved to the backup location."), remainingModifiedWorkingCopies, backupError, reason);
        }
        // Since a backup did not happen, we have to confirm for
        // the working copies that did not successfully backup
        try {
            return await this.confirmBeforeShutdown(remainingModifiedWorkingCopies);
        }
        catch (error) {
            if (this.environmentService.isExtensionDevelopment) {
                this.logService.error(`[backup tracker] error saving or reverting modified working copies: ${error}`);
                return false; // do not block shutdown during extension development (https://github.com/microsoft/vscode/issues/115028)
            }
            return this.showErrorDialog(localize('backupTrackerConfirmFailed', "The following editors with unsaved changes could not be saved or reverted."), remainingModifiedWorkingCopies, error, reason);
        }
    }
    async shouldBackupBeforeShutdown(reason, modifiedWorkingCopies) {
        if (!this.filesConfigurationService.isHotExitEnabled) {
            return []; // never backup when hot exit is disabled via settings
        }
        if (this.environmentService.isExtensionDevelopment) {
            return modifiedWorkingCopies; // always backup closing extension development window without asking to speed up debugging
        }
        switch (reason) {
            // Window Close
            case 1 /* ShutdownReason.CLOSE */:
                if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ && this.filesConfigurationService.hotExitConfiguration === HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE) {
                    return modifiedWorkingCopies; // backup if a workspace/folder is open and onExitAndWindowClose is configured
                }
                if (isMacintosh || await this.nativeHostService.getWindowCount() > 1) {
                    if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */) {
                        return modifiedWorkingCopies.filter(modifiedWorkingCopy => modifiedWorkingCopy.capabilities & 4 /* WorkingCopyCapabilities.Scratchpad */); // backup scratchpads automatically to avoid user confirmation
                    }
                    return []; // do not backup if a window is closed that does not cause quitting of the application
                }
                return modifiedWorkingCopies; // backup if last window is closed on win/linux where the application quits right after
            // Application Quit
            case 2 /* ShutdownReason.QUIT */:
                return modifiedWorkingCopies; // backup because next start we restore all backups
            // Window Reload
            case 3 /* ShutdownReason.RELOAD */:
                return modifiedWorkingCopies; // backup because after window reload, backups restore
            // Workspace Change
            case 4 /* ShutdownReason.LOAD */:
                if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */) {
                    if (this.filesConfigurationService.hotExitConfiguration === HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE) {
                        return modifiedWorkingCopies; // backup if a workspace/folder is open and onExitAndWindowClose is configured
                    }
                    return modifiedWorkingCopies.filter(modifiedWorkingCopy => modifiedWorkingCopy.capabilities & 4 /* WorkingCopyCapabilities.Scratchpad */); // backup scratchpads automatically to avoid user confirmation
                }
                return []; // do not backup because we are switching contexts with no workspace/folder open
        }
    }
    async showErrorDialog(message, workingCopies, error, reason) {
        this.logService.error(`[backup tracker] ${message}: ${error}`);
        const modifiedWorkingCopies = workingCopies.filter(workingCopy => workingCopy.isModified());
        const advice = localize('backupErrorDetails', "Try saving or reverting the editors with unsaved changes first and then try again.");
        const detail = modifiedWorkingCopies.length
            ? `${getFileNamesMessage(modifiedWorkingCopies.map(x => x.name))}\n${advice}`
            : advice;
        const { result } = await this.dialogService.prompt({
            type: 'error',
            message,
            detail,
            buttons: [
                {
                    label: localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                    run: () => true // veto
                },
                {
                    label: this.toForceShutdownLabel(reason),
                    run: () => false // no veto
                }
            ],
        });
        return result ?? true;
    }
    toForceShutdownLabel(reason) {
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
            case 4 /* ShutdownReason.LOAD */:
                return localize('shutdownForceClose', "Close Anyway");
            case 2 /* ShutdownReason.QUIT */:
                return localize('shutdownForceQuit', "Quit Anyway");
            case 3 /* ShutdownReason.RELOAD */:
                return localize('shutdownForceReload', "Reload Anyway");
        }
    }
    async backupBeforeShutdown(modifiedWorkingCopies) {
        const backups = [];
        let error = undefined;
        await this.withProgressAndCancellation(async (token) => {
            // Perform a backup of all modified working copies unless a backup already exists
            try {
                await Promises.settled(modifiedWorkingCopies.map(async (workingCopy) => {
                    // Backup exists
                    const contentVersion = this.getContentVersion(workingCopy);
                    if (this.workingCopyBackupService.hasBackupSync(workingCopy, contentVersion)) {
                        backups.push(workingCopy);
                    }
                    // Backup does not exist
                    else {
                        const backup = await workingCopy.backup(token);
                        if (token.isCancellationRequested) {
                            return;
                        }
                        await this.workingCopyBackupService.backup(workingCopy, backup.content, contentVersion, backup.meta, token);
                        if (token.isCancellationRequested) {
                            return;
                        }
                        backups.push(workingCopy);
                    }
                }));
            }
            catch (backupError) {
                error = backupError;
            }
        }, localize('backupBeforeShutdownMessage', "Backing up editors with unsaved changes is taking a bit longer..."), localize('backupBeforeShutdownDetail', "Click 'Cancel' to stop waiting and to save or revert editors with unsaved changes."));
        return { backups, error };
    }
    async confirmBeforeShutdown(modifiedWorkingCopies) {
        // Save
        const confirm = await this.fileDialogService.showSaveConfirm(modifiedWorkingCopies.map(workingCopy => workingCopy.name));
        if (confirm === 0 /* ConfirmResult.SAVE */) {
            const modifiedCountBeforeSave = this.workingCopyService.modifiedCount;
            try {
                await this.doSaveAllBeforeShutdown(modifiedWorkingCopies, 1 /* SaveReason.EXPLICIT */);
            }
            catch (error) {
                this.logService.error(`[backup tracker] error saving modified working copies: ${error}`); // guard against misbehaving saves, we handle remaining modified below
            }
            const savedWorkingCopies = modifiedCountBeforeSave - this.workingCopyService.modifiedCount;
            if (savedWorkingCopies < modifiedWorkingCopies.length) {
                return true; // veto (save failed or was canceled)
            }
            return this.noVeto(modifiedWorkingCopies); // no veto (modified saved)
        }
        // Don't Save
        else if (confirm === 1 /* ConfirmResult.DONT_SAVE */) {
            try {
                await this.doRevertAllBeforeShutdown(modifiedWorkingCopies);
            }
            catch (error) {
                this.logService.error(`[backup tracker] error reverting modified working copies: ${error}`); // do not block the shutdown on errors from revert
            }
            return this.noVeto(modifiedWorkingCopies); // no veto (modified reverted)
        }
        // Cancel
        return true; // veto (user canceled)
    }
    doSaveAllBeforeShutdown(workingCopies, reason) {
        return this.withProgressAndCancellation(async () => {
            // Skip save participants on shutdown for performance reasons
            const saveOptions = { skipSaveParticipants: true, reason };
            // First save through the editor service if we save all to benefit
            // from some extras like switching to untitled modified editors before saving.
            let result = undefined;
            if (workingCopies.length === this.workingCopyService.modifiedCount) {
                result = (await this.editorService.saveAll({
                    includeUntitled: { includeScratchpad: true },
                    ...saveOptions
                })).success;
            }
            // If we still have modified working copies, save those directly
            // unless the save was not successful (e.g. cancelled)
            if (result !== false) {
                await Promises.settled(workingCopies.map(workingCopy => workingCopy.isModified() ? workingCopy.save(saveOptions) : Promise.resolve(true)));
            }
        }, localize('saveBeforeShutdown', "Saving editors with unsaved changes is taking a bit longer..."), undefined, 
        // Do not pick `Dialog` as location for reporting progress if it is likely
        // that the save operation will itself open a dialog for asking for the
        // location to save to for untitled or scratchpad working copies.
        // https://github.com/microsoft/vscode-internalbacklog/issues/4943
        workingCopies.some(workingCopy => workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */ || workingCopy.capabilities & 4 /* WorkingCopyCapabilities.Scratchpad */) ? 10 /* ProgressLocation.Window */ : 20 /* ProgressLocation.Dialog */);
    }
    doRevertAllBeforeShutdown(modifiedWorkingCopies) {
        return this.withProgressAndCancellation(async () => {
            // Soft revert is good enough on shutdown
            const revertOptions = { soft: true };
            // First revert through the editor service if we revert all
            if (modifiedWorkingCopies.length === this.workingCopyService.modifiedCount) {
                await this.editorService.revertAll(revertOptions);
            }
            // If we still have modified working copies, revert those directly
            await Promises.settled(modifiedWorkingCopies.map(workingCopy => workingCopy.isModified() ? workingCopy.revert(revertOptions) : Promise.resolve()));
        }, localize('revertBeforeShutdown', "Reverting editors with unsaved changes is taking a bit longer..."));
    }
    onBeforeShutdownWithoutModified() {
        // We are about to shutdown without modified editors
        // and will discard any backups that are still
        // around that have not been handled depending
        // on the window state.
        //
        // Empty window: discard even unrestored backups to
        // prevent empty windows from restoring that cannot
        // be closed (workaround for not having implemented
        // https://github.com/microsoft/vscode/issues/127163
        // and a fix for what users have reported in issue
        // https://github.com/microsoft/vscode/issues/126725)
        //
        // Workspace/Folder window: do not discard unrestored
        // backups to give a chance to restore them in the
        // future. Since we do not restore workspace/folder
        // windows with backups, this is fine.
        return this.noVeto({ except: this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ? [] : Array.from(this.unrestoredBackups) });
    }
    async noVeto(arg1) {
        // Discard backups from working copies the
        // user either saved or reverted
        await this.discardBackupsBeforeShutdown(arg1);
        return false; // no veto (no modified)
    }
    async discardBackupsBeforeShutdown(arg1) {
        // We never discard any backups before we are ready
        // and have resolved all backups that exist. This
        // is important to not loose backups that have not
        // been handled.
        if (!this.isReady) {
            return;
        }
        await this.withProgressAndCancellation(async () => {
            // When we shutdown either with no modified working copies left
            // or with some handled, we start to discard these backups
            // to free them up. This helps to get rid of stale backups
            // as reported in https://github.com/microsoft/vscode/issues/92962
            //
            // However, we never want to discard backups that we know
            // were not restored in the session.
            try {
                if (Array.isArray(arg1)) {
                    await Promises.settled(arg1.map(workingCopy => this.workingCopyBackupService.discardBackup(workingCopy)));
                }
                else {
                    await this.workingCopyBackupService.discardBackups(arg1);
                }
            }
            catch (error) {
                this.logService.error(`[backup tracker] error discarding backups: ${error}`);
            }
        }, localize('discardBackupsBeforeShutdown', "Discarding backups is taking a bit longer..."));
    }
    withProgressAndCancellation(promiseFactory, title, detail, location = 20 /* ProgressLocation.Dialog */) {
        const cts = new CancellationTokenSource();
        return this.progressService.withProgress({
            location, // by default use a dialog to prevent the user from making any more changes now (https://github.com/microsoft/vscode/issues/122774)
            cancellable: true, // allow to cancel (https://github.com/microsoft/vscode/issues/112278)
            delay: 800, // delay so that it only appears when operation takes a long time
            title,
            detail
        }, () => raceCancellation(promiseFactory(cts.token), cts.token), () => cts.dispose(true));
    }
};
NativeWorkingCopyBackupTracker = __decorate([
    __param(0, IWorkingCopyBackupService),
    __param(1, IFilesConfigurationService),
    __param(2, IWorkingCopyService),
    __param(3, ILifecycleService),
    __param(4, IFileDialogService),
    __param(5, IDialogService),
    __param(6, IWorkspaceContextService),
    __param(7, INativeHostService),
    __param(8, ILogService),
    __param(9, IEnvironmentService),
    __param(10, IProgressService),
    __param(11, IWorkingCopyEditorService),
    __param(12, IEditorService),
    __param(13, IEditorGroupsService)
], NativeWorkingCopyBackupTracker);
export { NativeWorkingCopyBackupTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2VsZWN0cm9uLXNhbmRib3gvd29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRSxPQUFPLEVBQUUsMEJBQTBCLEVBQWdCLE1BQU0sOERBQThELENBQUM7QUFDeEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLHFDQUFxQyxDQUFDO0FBQ3hGLE9BQU8sRUFBaUIsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDeEksT0FBTyxFQUFrQix3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxN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