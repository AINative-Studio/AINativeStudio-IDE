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
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { StoredFileWorkingCopy } from './storedFileWorkingCopy.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Promises, ResourceQueue } from '../../../../base/common/async.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IWorkingCopyFileService } from './workingCopyFileService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
import { BaseFileWorkingCopyManager } from './abstractFileWorkingCopyManager.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IElevatedFileService } from '../../files/common/elevatedFileService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyEditorService } from './workingCopyEditorService.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
let StoredFileWorkingCopyManager = class StoredFileWorkingCopyManager extends BaseFileWorkingCopyManager {
    constructor(workingCopyTypeId, modelFactory, fileService, lifecycleService, labelService, logService, workingCopyFileService, workingCopyBackupService, uriIdentityService, filesConfigurationService, workingCopyService, notificationService, workingCopyEditorService, editorService, elevatedFileService, progressService) {
        super(fileService, logService, workingCopyBackupService);
        this.workingCopyTypeId = workingCopyTypeId;
        this.modelFactory = modelFactory;
        this.lifecycleService = lifecycleService;
        this.labelService = labelService;
        this.workingCopyFileService = workingCopyFileService;
        this.uriIdentityService = uriIdentityService;
        this.filesConfigurationService = filesConfigurationService;
        this.workingCopyService = workingCopyService;
        this.notificationService = notificationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.editorService = editorService;
        this.elevatedFileService = elevatedFileService;
        this.progressService = progressService;
        //#region Events
        this._onDidResolve = this._register(new Emitter());
        this.onDidResolve = this._onDidResolve.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeReadonly = this._register(new Emitter());
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        this._onDidChangeOrphaned = this._register(new Emitter());
        this.onDidChangeOrphaned = this._onDidChangeOrphaned.event;
        this._onDidSaveError = this._register(new Emitter());
        this.onDidSaveError = this._onDidSaveError.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidRevert = this._register(new Emitter());
        this.onDidRevert = this._onDidRevert.event;
        this._onDidRemove = this._register(new Emitter());
        this.onDidRemove = this._onDidRemove.event;
        //#endregion
        this.mapResourceToWorkingCopyListeners = new ResourceMap();
        this.mapResourceToPendingWorkingCopyResolve = new ResourceMap();
        this.workingCopyResolveQueue = this._register(new ResourceQueue());
        //#endregion
        //#region Working Copy File Events
        this.mapCorrelationIdToWorkingCopiesToRestore = new Map();
        this.registerListeners();
    }
    registerListeners() {
        // Update working copies from file change events
        this._register(this.fileService.onDidFilesChange(e => this.onDidFilesChange(e)));
        // File system provider changes
        this._register(this.fileService.onDidChangeFileSystemProviderCapabilities(e => this.onDidChangeFileSystemProviderCapabilities(e)));
        this._register(this.fileService.onDidChangeFileSystemProviderRegistrations(e => this.onDidChangeFileSystemProviderRegistrations(e)));
        // Working copy operations
        this._register(this.workingCopyFileService.onWillRunWorkingCopyFileOperation(e => this.onWillRunWorkingCopyFileOperation(e)));
        this._register(this.workingCopyFileService.onDidFailWorkingCopyFileOperation(e => this.onDidFailWorkingCopyFileOperation(e)));
        this._register(this.workingCopyFileService.onDidRunWorkingCopyFileOperation(e => this.onDidRunWorkingCopyFileOperation(e)));
        // Lifecycle
        if (isWeb) {
            this._register(this.lifecycleService.onBeforeShutdown(event => event.veto(this.onBeforeShutdownWeb(), 'veto.fileWorkingCopyManager')));
        }
        else {
            this._register(this.lifecycleService.onWillShutdown(event => event.join(this.onWillShutdownDesktop(), { id: 'join.fileWorkingCopyManager', label: localize('join.fileWorkingCopyManager', "Saving working copies") })));
        }
    }
    onBeforeShutdownWeb() {
        if (this.workingCopies.some(workingCopy => workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */))) {
            // stored file working copies are pending to be saved:
            // veto because web does not support long running shutdown
            return true;
        }
        return false;
    }
    async onWillShutdownDesktop() {
        let pendingSavedWorkingCopies;
        // As long as stored file working copies are pending to be saved, we prolong the shutdown
        // until that has happened to ensure we are not shutting down in the middle of
        // writing to the working copy (https://github.com/microsoft/vscode/issues/116600).
        while ((pendingSavedWorkingCopies = this.workingCopies.filter(workingCopy => workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */))).length > 0) {
            await Promises.settled(pendingSavedWorkingCopies.map(workingCopy => workingCopy.joinState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */)));
        }
    }
    //#region Resolve from file or file provider changes
    onDidChangeFileSystemProviderCapabilities(e) {
        // Resolve working copies again for file systems that changed
        // capabilities to fetch latest metadata (e.g. readonly)
        // into all working copies.
        this.queueWorkingCopyReloads(e.scheme);
    }
    onDidChangeFileSystemProviderRegistrations(e) {
        if (!e.added) {
            return; // only if added
        }
        // Resolve working copies again for file systems that registered
        // to account for capability changes: extensions may unregister
        // and register the same provider with different capabilities,
        // so we want to ensure to fetch latest metadata (e.g. readonly)
        // into all working copies.
        this.queueWorkingCopyReloads(e.scheme);
    }
    onDidFilesChange(e) {
        // Trigger a resolve for any update or add event that impacts
        // the working copy. We also consider the added event
        // because it could be that a file was added and updated
        // right after.
        this.queueWorkingCopyReloads(e);
    }
    queueWorkingCopyReloads(schemeOrEvent) {
        for (const workingCopy of this.workingCopies) {
            if (workingCopy.isDirty()) {
                continue; // never reload dirty working copies
            }
            let resolveWorkingCopy = false;
            if (typeof schemeOrEvent === 'string') {
                resolveWorkingCopy = schemeOrEvent === workingCopy.resource.scheme;
            }
            else {
                resolveWorkingCopy = schemeOrEvent.contains(workingCopy.resource, 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */);
            }
            if (resolveWorkingCopy) {
                this.queueWorkingCopyReload(workingCopy);
            }
        }
    }
    queueWorkingCopyReload(workingCopy) {
        // Resolves a working copy to update (use a queue to prevent accumulation of
        // resolve when the resolving actually takes long. At most we only want the
        // queue to have a size of 2 (1 running resolve and 1 queued resolve).
        const queueSize = this.workingCopyResolveQueue.queueSize(workingCopy.resource);
        if (queueSize <= 1) {
            this.workingCopyResolveQueue.queueFor(workingCopy.resource, async () => {
                try {
                    await this.reload(workingCopy);
                }
                catch (error) {
                    this.logService.error(error);
                }
            });
        }
    }
    onWillRunWorkingCopyFileOperation(e) {
        // Move / Copy: remember working copies to restore after the operation
        if (e.operation === 2 /* FileOperation.MOVE */ || e.operation === 3 /* FileOperation.COPY */) {
            e.waitUntil((async () => {
                const workingCopiesToRestore = [];
                for (const { source, target } of e.files) {
                    if (source) {
                        if (this.uriIdentityService.extUri.isEqual(source, target)) {
                            continue; // ignore if resources are considered equal
                        }
                        // Find all working copies that related to source (can be many if resource is a folder)
                        const sourceWorkingCopies = [];
                        for (const workingCopy of this.workingCopies) {
                            if (this.uriIdentityService.extUri.isEqualOrParent(workingCopy.resource, source)) {
                                sourceWorkingCopies.push(workingCopy);
                            }
                        }
                        // Remember each source working copy to load again after move is done
                        // with optional content to restore if it was dirty
                        for (const sourceWorkingCopy of sourceWorkingCopies) {
                            const sourceResource = sourceWorkingCopy.resource;
                            // If the source is the actual working copy, just use target as new resource
                            let targetResource;
                            if (this.uriIdentityService.extUri.isEqual(sourceResource, source)) {
                                targetResource = target;
                            }
                            // Otherwise a parent folder of the source is being moved, so we need
                            // to compute the target resource based on that
                            else {
                                targetResource = joinPath(target, sourceResource.path.substr(source.path.length + 1));
                            }
                            workingCopiesToRestore.push({
                                source: sourceResource,
                                target: targetResource,
                                snapshot: sourceWorkingCopy.isDirty() ? await sourceWorkingCopy.model?.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None) : undefined
                            });
                        }
                    }
                }
                this.mapCorrelationIdToWorkingCopiesToRestore.set(e.correlationId, workingCopiesToRestore);
            })());
        }
    }
    onDidFailWorkingCopyFileOperation(e) {
        // Move / Copy: restore dirty flag on working copies to restore that were dirty
        if ((e.operation === 2 /* FileOperation.MOVE */ || e.operation === 3 /* FileOperation.COPY */)) {
            const workingCopiesToRestore = this.mapCorrelationIdToWorkingCopiesToRestore.get(e.correlationId);
            if (workingCopiesToRestore) {
                this.mapCorrelationIdToWorkingCopiesToRestore.delete(e.correlationId);
                for (const workingCopy of workingCopiesToRestore) {
                    // Snapshot presence means this working copy used to be modified and so we restore that
                    // flag. we do NOT have to restore the content because the working copy was only soft
                    // reverted and did not loose its original modified contents.
                    if (workingCopy.snapshot) {
                        this.get(workingCopy.source)?.markModified();
                    }
                }
            }
        }
    }
    onDidRunWorkingCopyFileOperation(e) {
        switch (e.operation) {
            // Create: Revert existing working copies
            case 0 /* FileOperation.CREATE */:
                e.waitUntil((async () => {
                    for (const { target } of e.files) {
                        const workingCopy = this.get(target);
                        if (workingCopy && !workingCopy.isDisposed()) {
                            await workingCopy.revert();
                        }
                    }
                })());
                break;
            // Move/Copy: restore working copies that were loaded before the operation took place
            case 2 /* FileOperation.MOVE */:
            case 3 /* FileOperation.COPY */:
                e.waitUntil((async () => {
                    const workingCopiesToRestore = this.mapCorrelationIdToWorkingCopiesToRestore.get(e.correlationId);
                    if (workingCopiesToRestore) {
                        this.mapCorrelationIdToWorkingCopiesToRestore.delete(e.correlationId);
                        await Promises.settled(workingCopiesToRestore.map(async (workingCopyToRestore) => {
                            // From this moment on, only operate on the canonical resource
                            // to fix a potential data loss issue:
                            // https://github.com/microsoft/vscode/issues/211374
                            const target = this.uriIdentityService.asCanonicalUri(workingCopyToRestore.target);
                            // Restore the working copy at the target. if we have previous dirty content, we pass it
                            // over to be used, otherwise we force a reload from disk. this is important
                            // because we know the file has changed on disk after the move and the working copy might
                            // have still existed with the previous state. this ensures that the working copy is not
                            // tracking a stale state.
                            await this.resolve(target, {
                                reload: { async: false }, // enforce a reload
                                contents: workingCopyToRestore.snapshot
                            });
                        }));
                    }
                })());
                break;
        }
    }
    //#endregion
    //#region Reload & Resolve
    async reload(workingCopy) {
        // Await a pending working copy resolve first before proceeding
        // to ensure that we never resolve a working copy more than once
        // in parallel.
        await this.joinPendingResolves(workingCopy.resource);
        if (workingCopy.isDirty() || workingCopy.isDisposed() || !this.has(workingCopy.resource)) {
            return; // the working copy possibly got dirty or disposed, so return early then
        }
        // Trigger reload
        await this.doResolve(workingCopy, { reload: { async: false } });
    }
    async resolve(resource, options) {
        // Await a pending working copy resolve first before proceeding
        // to ensure that we never resolve a working copy more than once
        // in parallel.
        const pendingResolve = this.joinPendingResolves(resource);
        if (pendingResolve) {
            await pendingResolve;
        }
        // Trigger resolve
        return this.doResolve(resource, options);
    }
    async doResolve(resourceOrWorkingCopy, options) {
        let workingCopy;
        let resource;
        if (URI.isUri(resourceOrWorkingCopy)) {
            resource = resourceOrWorkingCopy;
            workingCopy = this.get(resource);
        }
        else {
            resource = resourceOrWorkingCopy.resource;
            workingCopy = resourceOrWorkingCopy;
        }
        let workingCopyResolve;
        let didCreateWorkingCopy = false;
        const resolveOptions = {
            contents: options?.contents,
            forceReadFromFile: options?.reload?.force,
            limits: options?.limits
        };
        // Working copy exists
        if (workingCopy) {
            // Always reload if contents are provided
            if (options?.contents) {
                workingCopyResolve = workingCopy.resolve(resolveOptions);
            }
            // Reload async or sync based on options
            else if (options?.reload) {
                // Async reload: trigger a reload but return immediately
                if (options.reload.async) {
                    workingCopyResolve = Promise.resolve();
                    (async () => {
                        try {
                            await workingCopy.resolve(resolveOptions);
                        }
                        catch (error) {
                            if (!workingCopy.isDisposed()) {
                                onUnexpectedError(error); // only log if the working copy is still around
                            }
                        }
                    })();
                }
                // Sync reload: do not return until working copy reloaded
                else {
                    workingCopyResolve = workingCopy.resolve(resolveOptions);
                }
            }
            // Do not reload
            else {
                workingCopyResolve = Promise.resolve();
            }
        }
        // Stored file working copy does not exist
        else {
            didCreateWorkingCopy = true;
            workingCopy = new StoredFileWorkingCopy(this.workingCopyTypeId, resource, this.labelService.getUriBasenameLabel(resource), this.modelFactory, async (options) => { await this.resolve(resource, { ...options, reload: { async: false } }); }, this.fileService, this.logService, this.workingCopyFileService, this.filesConfigurationService, this.workingCopyBackupService, this.workingCopyService, this.notificationService, this.workingCopyEditorService, this.editorService, this.elevatedFileService, this.progressService);
            workingCopyResolve = workingCopy.resolve(resolveOptions);
            this.registerWorkingCopy(workingCopy);
        }
        // Store pending resolve to avoid race conditions
        this.mapResourceToPendingWorkingCopyResolve.set(resource, workingCopyResolve);
        // Make known to manager (if not already known)
        this.add(resource, workingCopy);
        // Emit some events if we created the working copy
        if (didCreateWorkingCopy) {
            // If the working copy is dirty right from the beginning,
            // make sure to emit this as an event
            if (workingCopy.isDirty()) {
                this._onDidChangeDirty.fire(workingCopy);
            }
        }
        try {
            await workingCopyResolve;
        }
        catch (error) {
            // Automatically dispose the working copy if we created
            // it because we cannot dispose a working copy we do not
            // own (https://github.com/microsoft/vscode/issues/138850)
            if (didCreateWorkingCopy) {
                workingCopy.dispose();
            }
            throw error;
        }
        finally {
            // Remove from pending resolves
            this.mapResourceToPendingWorkingCopyResolve.delete(resource);
        }
        // Stored file working copy can be dirty if a backup was restored, so we make sure to
        // have this event delivered if we created the working copy here
        if (didCreateWorkingCopy && workingCopy.isDirty()) {
            this._onDidChangeDirty.fire(workingCopy);
        }
        return workingCopy;
    }
    joinPendingResolves(resource) {
        const pendingWorkingCopyResolve = this.mapResourceToPendingWorkingCopyResolve.get(resource);
        if (!pendingWorkingCopyResolve) {
            return;
        }
        return this.doJoinPendingResolves(resource);
    }
    async doJoinPendingResolves(resource) {
        // While we have pending working copy resolves, ensure
        // to await the last one finishing before returning.
        // This prevents a race when multiple clients await
        // the pending resolve and then all trigger the resolve
        // at the same time.
        let currentWorkingCopyResolve;
        while (this.mapResourceToPendingWorkingCopyResolve.has(resource)) {
            const nextPendingWorkingCopyResolve = this.mapResourceToPendingWorkingCopyResolve.get(resource);
            if (nextPendingWorkingCopyResolve === currentWorkingCopyResolve) {
                return; // already awaited on - return
            }
            currentWorkingCopyResolve = nextPendingWorkingCopyResolve;
            try {
                await nextPendingWorkingCopyResolve;
            }
            catch (error) {
                // ignore any error here, it will bubble to the original requestor
            }
        }
    }
    registerWorkingCopy(workingCopy) {
        // Install working copy listeners
        const workingCopyListeners = new DisposableStore();
        workingCopyListeners.add(workingCopy.onDidResolve(() => this._onDidResolve.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidChangeDirty(() => this._onDidChangeDirty.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidChangeReadonly(() => this._onDidChangeReadonly.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidChangeOrphaned(() => this._onDidChangeOrphaned.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidSaveError(() => this._onDidSaveError.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidSave(e => this._onDidSave.fire({ workingCopy, ...e })));
        workingCopyListeners.add(workingCopy.onDidRevert(() => this._onDidRevert.fire(workingCopy)));
        // Keep for disposal
        this.mapResourceToWorkingCopyListeners.set(workingCopy.resource, workingCopyListeners);
    }
    remove(resource) {
        const removed = super.remove(resource);
        // Dispose any existing working copy listeners
        const workingCopyListener = this.mapResourceToWorkingCopyListeners.get(resource);
        if (workingCopyListener) {
            dispose(workingCopyListener);
            this.mapResourceToWorkingCopyListeners.delete(resource);
        }
        if (removed) {
            this._onDidRemove.fire(resource);
        }
        return removed;
    }
    //#endregion
    //#region Lifecycle
    canDispose(workingCopy) {
        // Quick return if working copy already disposed or not dirty and not resolving
        if (workingCopy.isDisposed() ||
            (!this.mapResourceToPendingWorkingCopyResolve.has(workingCopy.resource) && !workingCopy.isDirty())) {
            return true;
        }
        // Promise based return in all other cases
        return this.doCanDispose(workingCopy);
    }
    async doCanDispose(workingCopy) {
        // Await any pending resolves first before proceeding
        const pendingResolve = this.joinPendingResolves(workingCopy.resource);
        if (pendingResolve) {
            await pendingResolve;
            return this.canDispose(workingCopy);
        }
        // Dirty working copy: we do not allow to dispose dirty working copys
        // to prevent data loss cases. dirty working copys can only be disposed when
        // they are either saved or reverted
        if (workingCopy.isDirty()) {
            await Event.toPromise(workingCopy.onDidChangeDirty);
            return this.canDispose(workingCopy);
        }
        return true;
    }
    dispose() {
        super.dispose();
        // Clear pending working copy resolves
        this.mapResourceToPendingWorkingCopyResolve.clear();
        // Dispose the working copy change listeners
        dispose(this.mapResourceToWorkingCopyListeners.values());
        this.mapResourceToWorkingCopyListeners.clear();
    }
};
StoredFileWorkingCopyManager = __decorate([
    __param(2, IFileService),
    __param(3, ILifecycleService),
    __param(4, ILabelService),
    __param(5, ILogService),
    __param(6, IWorkingCopyFileService),
    __param(7, IWorkingCopyBackupService),
    __param(8, IUriIdentityService),
    __param(9, IFilesConfigurationService),
    __param(10, IWorkingCopyService),
    __param(11, INotificationService),
    __param(12, IWorkingCopyEditorService),
    __param(13, IEditorService),
    __param(14, IElevatedFileService),
    __param(15, IProgressService)
], StoredFileWorkingCopyManager);
export { StoredFileWorkingCopyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5TWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3N0b3JlZEZpbGVXb3JraW5nQ29weU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQXFPLE1BQU0sNEJBQTRCLENBQUM7QUFDdFMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0UsT0FBTyxFQUFtRCxZQUFZLEVBQW9GLE1BQU0sNENBQTRDLENBQUM7QUFDN00sT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBd0IsTUFBTSw2QkFBNkIsQ0FBQztBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3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