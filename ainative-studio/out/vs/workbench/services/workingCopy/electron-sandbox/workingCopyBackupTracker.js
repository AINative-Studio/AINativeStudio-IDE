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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9lbGVjdHJvbi1zYW5kYm94L3dvcmtpbmdDb3B5QmFja3VwVHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFM0UsT0FBTyxFQUFFLDBCQUEwQixFQUFnQixNQUFNLDhEQUE4RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RixPQUFPLEVBQWlCLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hJLE9BQU8sRUFBa0Isd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUs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