/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Promises } from '../../../../base/common/async.js';
/**
 * The working copy backup tracker deals with:
 * - restoring backups that exist
 * - creating backups for modified working copies
 * - deleting backups for saved working copies
 * - handling backups on shutdown
 */
export class WorkingCopyBackupTracker extends Disposable {
    constructor(workingCopyBackupService, workingCopyService, logService, lifecycleService, filesConfigurationService, workingCopyEditorService, editorService, editorGroupService) {
        super();
        this.workingCopyBackupService = workingCopyBackupService;
        this.workingCopyService = workingCopyService;
        this.logService = logService;
        this.lifecycleService = lifecycleService;
        this.filesConfigurationService = filesConfigurationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        // A map from working copy to a version ID we compute on each content
        // change. This version ID allows to e.g. ask if a backup for a specific
        // content has been made before closing.
        this.mapWorkingCopyToContentVersion = new Map();
        // A map of scheduled pending backup operations for working copies
        // Given https://github.com/microsoft/vscode/issues/158038, we explicitly
        // do not store `IWorkingCopy` but the identifier in the map, since it
        // looks like GC is not running for the working copy otherwise.
        this.pendingBackupOperations = new Map();
        this.suspended = false;
        //#endregion
        //#region Backup Restorer
        this.unrestoredBackups = new Set();
        this._isReady = false;
        this.whenReady = this.resolveBackupsToRestore();
        // Fill in initial modified working copies
        for (const workingCopy of this.workingCopyService.modifiedWorkingCopies) {
            this.onDidRegister(workingCopy);
        }
        this.registerListeners();
    }
    registerListeners() {
        // Working Copy events
        this._register(this.workingCopyService.onDidRegister(workingCopy => this.onDidRegister(workingCopy)));
        this._register(this.workingCopyService.onDidUnregister(workingCopy => this.onDidUnregister(workingCopy)));
        this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.onDidChangeDirty(workingCopy)));
        this._register(this.workingCopyService.onDidChangeContent(workingCopy => this.onDidChangeContent(workingCopy)));
        // Lifecycle
        this._register(this.lifecycleService.onBeforeShutdown(event => event.finalVeto(() => this.onFinalBeforeShutdown(event.reason), 'veto.backups')));
        this._register(this.lifecycleService.onWillShutdown(() => this.onWillShutdown()));
        // Once a handler registers, restore backups
        this._register(this.workingCopyEditorService.onDidRegisterHandler(handler => this.restoreBackups(handler)));
    }
    onWillShutdown() {
        // Here we know that we will shutdown. Any backup operation that is
        // already scheduled or being scheduled from this moment on runs
        // at the risk of corrupting a backup because the backup operation
        // might terminate at any given time now. As such, we need to disable
        // this tracker from performing more backups by cancelling pending
        // operations and suspending the tracker without resuming.
        this.cancelBackupOperations();
        this.suspendBackupOperations();
    }
    //#region Backup Creator
    // Delay creation of backups when content changes to avoid too much
    // load on the backup service when the user is typing into the editor
    // Since we always schedule a backup, even when auto save is on, we
    // have different scheduling delays based on auto save configuration.
    // With 'delayed' we avoid a (not critical but also not really wanted)
    // race between saving (after 1s per default) and making a backup of
    // the working copy.
    static { this.DEFAULT_BACKUP_SCHEDULE_DELAYS = {
        ['default']: 1000,
        ['delayed']: 2000
    }; }
    onDidRegister(workingCopy) {
        if (this.suspended) {
            this.logService.warn(`[backup tracker] suspended, ignoring register event`, workingCopy.resource.toString(), workingCopy.typeId);
            return;
        }
        if (workingCopy.isModified()) {
            this.scheduleBackup(workingCopy);
        }
    }
    onDidUnregister(workingCopy) {
        // Remove from content version map
        this.mapWorkingCopyToContentVersion.delete(workingCopy);
        // Check suspended
        if (this.suspended) {
            this.logService.warn(`[backup tracker] suspended, ignoring unregister event`, workingCopy.resource.toString(), workingCopy.typeId);
            return;
        }
        // Discard backup
        this.discardBackup(workingCopy);
    }
    onDidChangeDirty(workingCopy) {
        if (this.suspended) {
            this.logService.warn(`[backup tracker] suspended, ignoring dirty change event`, workingCopy.resource.toString(), workingCopy.typeId);
            return;
        }
        if (workingCopy.isDirty()) {
            this.scheduleBackup(workingCopy);
        }
        else {
            this.discardBackup(workingCopy);
        }
    }
    onDidChangeContent(workingCopy) {
        // Increment content version ID
        const contentVersionId = this.getContentVersion(workingCopy);
        this.mapWorkingCopyToContentVersion.set(workingCopy, contentVersionId + 1);
        // Check suspended
        if (this.suspended) {
            this.logService.warn(`[backup tracker] suspended, ignoring content change event`, workingCopy.resource.toString(), workingCopy.typeId);
            return;
        }
        // Schedule backup for modified working copies
        if (workingCopy.isModified()) {
            // this listener will make sure that the backup is
            // pushed out for as long as the user is still changing
            // the content of the working copy.
            this.scheduleBackup(workingCopy);
        }
    }
    scheduleBackup(workingCopy) {
        // Clear any running backup operation
        this.cancelBackupOperation(workingCopy);
        this.logService.trace(`[backup tracker] scheduling backup`, workingCopy.resource.toString(), workingCopy.typeId);
        // Schedule new backup
        const workingCopyIdentifier = { resource: workingCopy.resource, typeId: workingCopy.typeId };
        const cts = new CancellationTokenSource();
        const handle = setTimeout(async () => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            // Backup if modified
            if (workingCopy.isModified()) {
                this.logService.trace(`[backup tracker] creating backup`, workingCopy.resource.toString(), workingCopy.typeId);
                try {
                    const backup = await workingCopy.backup(cts.token);
                    if (cts.token.isCancellationRequested) {
                        return;
                    }
                    if (workingCopy.isModified()) {
                        this.logService.trace(`[backup tracker] storing backup`, workingCopy.resource.toString(), workingCopy.typeId);
                        await this.workingCopyBackupService.backup(workingCopy, backup.content, this.getContentVersion(workingCopy), backup.meta, cts.token);
                    }
                }
                catch (error) {
                    this.logService.error(error);
                }
            }
            // Clear disposable unless we got canceled which would
            // indicate another operation has started meanwhile
            if (!cts.token.isCancellationRequested) {
                this.doClearPendingBackupOperation(workingCopyIdentifier);
            }
        }, this.getBackupScheduleDelay(workingCopy));
        // Keep in map for disposal as needed
        this.pendingBackupOperations.set(workingCopyIdentifier, {
            cancel: () => {
                this.logService.trace(`[backup tracker] clearing pending backup creation`, workingCopy.resource.toString(), workingCopy.typeId);
                cts.cancel();
            },
            disposable: toDisposable(() => {
                cts.dispose();
                clearTimeout(handle);
            })
        });
    }
    getBackupScheduleDelay(workingCopy) {
        if (typeof workingCopy.backupDelay === 'number') {
            return workingCopy.backupDelay; // respect working copy override
        }
        let backupScheduleDelay;
        if (workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) {
            backupScheduleDelay = 'default'; // auto-save is never on for untitled working copies
        }
        else {
            backupScheduleDelay = this.filesConfigurationService.hasShortAutoSaveDelay(workingCopy.resource) ? 'delayed' : 'default';
        }
        return WorkingCopyBackupTracker.DEFAULT_BACKUP_SCHEDULE_DELAYS[backupScheduleDelay];
    }
    getContentVersion(workingCopy) {
        return this.mapWorkingCopyToContentVersion.get(workingCopy) || 0;
    }
    discardBackup(workingCopy) {
        // Clear any running backup operation
        this.cancelBackupOperation(workingCopy);
        // Schedule backup discard asap
        const workingCopyIdentifier = { resource: workingCopy.resource, typeId: workingCopy.typeId };
        const cts = new CancellationTokenSource();
        this.doDiscardBackup(workingCopyIdentifier, cts);
        // Keep in map for disposal as needed
        this.pendingBackupOperations.set(workingCopyIdentifier, {
            cancel: () => {
                this.logService.trace(`[backup tracker] clearing pending backup discard`, workingCopy.resource.toString(), workingCopy.typeId);
                cts.cancel();
            },
            disposable: cts
        });
    }
    async doDiscardBackup(workingCopyIdentifier, cts) {
        this.logService.trace(`[backup tracker] discarding backup`, workingCopyIdentifier.resource.toString(), workingCopyIdentifier.typeId);
        // Discard backup
        try {
            await this.workingCopyBackupService.discardBackup(workingCopyIdentifier, cts.token);
        }
        catch (error) {
            this.logService.error(error);
        }
        // Clear disposable unless we got canceled which would
        // indicate another operation has started meanwhile
        if (!cts.token.isCancellationRequested) {
            this.doClearPendingBackupOperation(workingCopyIdentifier);
        }
    }
    cancelBackupOperation(workingCopy) {
        // Given a working copy we want to find the matching
        // identifier in our pending operations map because
        // we cannot use the working copy directly, as the
        // identifier might have different object identity.
        let workingCopyIdentifier = undefined;
        for (const [identifier] of this.pendingBackupOperations) {
            if (identifier.resource.toString() === workingCopy.resource.toString() && identifier.typeId === workingCopy.typeId) {
                workingCopyIdentifier = identifier;
                break;
            }
        }
        if (workingCopyIdentifier) {
            this.doClearPendingBackupOperation(workingCopyIdentifier, { cancel: true });
        }
    }
    doClearPendingBackupOperation(workingCopyIdentifier, options) {
        const pendingBackupOperation = this.pendingBackupOperations.get(workingCopyIdentifier);
        if (!pendingBackupOperation) {
            return;
        }
        if (options?.cancel) {
            pendingBackupOperation.cancel();
        }
        pendingBackupOperation.disposable.dispose();
        this.pendingBackupOperations.delete(workingCopyIdentifier);
    }
    cancelBackupOperations() {
        for (const [, operation] of this.pendingBackupOperations) {
            operation.cancel();
            operation.disposable.dispose();
        }
        this.pendingBackupOperations.clear();
    }
    suspendBackupOperations() {
        this.suspended = true;
        return { resume: () => this.suspended = false };
    }
    get isReady() { return this._isReady; }
    async resolveBackupsToRestore() {
        // Wait for resolving backups until we are restored to reduce startup pressure
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        // Remember each backup that needs to restore
        for (const backup of await this.workingCopyBackupService.getBackups()) {
            this.unrestoredBackups.add(backup);
        }
        this._isReady = true;
    }
    async restoreBackups(handler) {
        // Wait for backups to be resolved
        await this.whenReady;
        // Figure out already opened editors for backups vs
        // non-opened.
        const openedEditorsForBackups = new Set();
        const nonOpenedEditorsForBackups = new Set();
        // Ensure each backup that can be handled has an
        // associated editor.
        const restoredBackups = new Set();
        for (const unrestoredBackup of this.unrestoredBackups) {
            const canHandleUnrestoredBackup = await handler.handles(unrestoredBackup);
            if (!canHandleUnrestoredBackup) {
                continue;
            }
            // Collect already opened editors for backup
            let hasOpenedEditorForBackup = false;
            for (const { editor } of this.editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
                const isUnrestoredBackupOpened = handler.isOpen(unrestoredBackup, editor);
                if (isUnrestoredBackupOpened) {
                    openedEditorsForBackups.add(editor);
                    hasOpenedEditorForBackup = true;
                }
            }
            // Otherwise, make sure to create at least one editor
            // for the backup to show
            if (!hasOpenedEditorForBackup) {
                nonOpenedEditorsForBackups.add(await handler.createEditor(unrestoredBackup));
            }
            // Remember as (potentially) restored
            restoredBackups.add(unrestoredBackup);
        }
        // Ensure editors are opened for each backup without editor
        // in the background without stealing focus
        if (nonOpenedEditorsForBackups.size > 0) {
            await this.editorGroupService.activeGroup.openEditors([...nonOpenedEditorsForBackups].map(nonOpenedEditorForBackup => ({
                editor: nonOpenedEditorForBackup,
                options: {
                    pinned: true,
                    preserveFocus: true,
                    inactive: true
                }
            })));
            for (const nonOpenedEditorForBackup of nonOpenedEditorsForBackups) {
                openedEditorsForBackups.add(nonOpenedEditorForBackup);
            }
        }
        // Then, resolve each opened editor to make sure the working copy
        // is loaded and the modified editor appears properly.
        // We only do that for editors that are not active in a group
        // already to prevent calling `resolve` twice!
        await Promises.settled([...openedEditorsForBackups].map(async (openedEditorForBackup) => {
            if (this.editorService.isVisible(openedEditorForBackup)) {
                return;
            }
            return openedEditorForBackup.resolve();
        }));
        // Finally, remove all handled backups from the list
        for (const restoredBackup of restoredBackups) {
            this.unrestoredBackups.delete(restoredBackup);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vd29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFLN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBTTVEOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBZ0Isd0JBQXlCLFNBQVEsVUFBVTtJQUVoRSxZQUNvQix3QkFBbUQsRUFDbkQsa0JBQXVDLEVBQ3ZDLFVBQXVCLEVBQ3pCLGdCQUFtQyxFQUNqQyx5QkFBcUQsRUFDdkQsd0JBQW1ELEVBQ2pELGFBQTZCLEVBQy9CLGtCQUF3QztRQUV6RCxLQUFLLEVBQUUsQ0FBQztRQVRXLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMkI7UUFDbkQsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN2QyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDakMsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUE0QjtRQUN2RCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO1FBQ2pELGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMvQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXNCO1FBNEQxRCxxRUFBcUU7UUFDckUsd0VBQXdFO1FBQ3hFLHdDQUF3QztRQUN2QixtQ0FBOEIsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQztRQUVsRixr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