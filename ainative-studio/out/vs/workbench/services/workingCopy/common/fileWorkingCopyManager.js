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
var FileWorkingCopyManager_1;
import { localize } from '../../../../nls.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Promises } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { toLocalResource, joinPath, isEqual, basename, dirname } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IPathService } from '../../path/common/pathService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { StoredFileWorkingCopyManager } from './storedFileWorkingCopyManager.js';
import { UntitledFileWorkingCopy } from './untitledFileWorkingCopy.js';
import { UntitledFileWorkingCopyManager } from './untitledFileWorkingCopyManager.js';
import { IWorkingCopyFileService } from './workingCopyFileService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IElevatedFileService } from '../../files/common/elevatedFileService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
import { IWorkingCopyEditorService } from './workingCopyEditorService.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { Schemas } from '../../../../base/common/network.js';
import { IDecorationsService } from '../../decorations/common/decorations.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { listErrorForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
let FileWorkingCopyManager = class FileWorkingCopyManager extends Disposable {
    static { FileWorkingCopyManager_1 = this; }
    static { this.FILE_WORKING_COPY_SAVE_CREATE_SOURCE = SaveSourceRegistry.registerSource('fileWorkingCopyCreate.source', localize('fileWorkingCopyCreate.source', "File Created")); }
    static { this.FILE_WORKING_COPY_SAVE_REPLACE_SOURCE = SaveSourceRegistry.registerSource('fileWorkingCopyReplace.source', localize('fileWorkingCopyReplace.source', "File Replaced")); }
    constructor(workingCopyTypeId, storedWorkingCopyModelFactory, untitledWorkingCopyModelFactory, fileService, lifecycleService, labelService, logService, workingCopyFileService, workingCopyBackupService, uriIdentityService, fileDialogService, filesConfigurationService, workingCopyService, notificationService, workingCopyEditorService, editorService, elevatedFileService, pathService, environmentService, dialogService, decorationsService, progressService) {
        super();
        this.workingCopyTypeId = workingCopyTypeId;
        this.storedWorkingCopyModelFactory = storedWorkingCopyModelFactory;
        this.untitledWorkingCopyModelFactory = untitledWorkingCopyModelFactory;
        this.fileService = fileService;
        this.logService = logService;
        this.workingCopyFileService = workingCopyFileService;
        this.uriIdentityService = uriIdentityService;
        this.fileDialogService = fileDialogService;
        this.filesConfigurationService = filesConfigurationService;
        this.pathService = pathService;
        this.environmentService = environmentService;
        this.dialogService = dialogService;
        this.decorationsService = decorationsService;
        // Stored file working copies manager
        this.stored = this._register(new StoredFileWorkingCopyManager(this.workingCopyTypeId, this.storedWorkingCopyModelFactory, fileService, lifecycleService, labelService, logService, workingCopyFileService, workingCopyBackupService, uriIdentityService, filesConfigurationService, workingCopyService, notificationService, workingCopyEditorService, editorService, elevatedFileService, progressService));
        // Untitled file working copies manager
        this.untitled = this._register(new UntitledFileWorkingCopyManager(this.workingCopyTypeId, this.untitledWorkingCopyModelFactory, async (workingCopy, options) => {
            const result = await this.saveAs(workingCopy.resource, undefined, options);
            return result ? true : false;
        }, fileService, labelService, logService, workingCopyBackupService, workingCopyService));
        // Events
        this.onDidCreate = Event.any(this.stored.onDidCreate, this.untitled.onDidCreate);
        // Decorations
        this.provideDecorations();
    }
    //#region decorations
    provideDecorations() {
        // File working copy decorations
        const provider = this._register(new class extends Disposable {
            constructor(stored) {
                super();
                this.stored = stored;
                this.label = localize('fileWorkingCopyDecorations', "File Working Copy Decorations");
                this._onDidChange = this._register(new Emitter());
                this.onDidChange = this._onDidChange.event;
                this.registerListeners();
            }
            registerListeners() {
                // Creates
                this._register(this.stored.onDidResolve(workingCopy => {
                    if (workingCopy.isReadonly() || workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */)) {
                        this._onDidChange.fire([workingCopy.resource]);
                    }
                }));
                // Removals: once a stored working copy is no longer
                // under our control, make sure to signal this as
                // decoration change because from this point on we
                // have no way of updating the decoration anymore.
                this._register(this.stored.onDidRemove(workingCopyUri => this._onDidChange.fire([workingCopyUri])));
                // Changes
                this._register(this.stored.onDidChangeReadonly(workingCopy => this._onDidChange.fire([workingCopy.resource])));
                this._register(this.stored.onDidChangeOrphaned(workingCopy => this._onDidChange.fire([workingCopy.resource])));
            }
            provideDecorations(uri) {
                const workingCopy = this.stored.get(uri);
                if (!workingCopy || workingCopy.isDisposed()) {
                    return undefined;
                }
                const isReadonly = workingCopy.isReadonly();
                const isOrphaned = workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */);
                // Readonly + Orphaned
                if (isReadonly && isOrphaned) {
                    return {
                        color: listErrorForeground,
                        letter: Codicon.lockSmall,
                        strikethrough: true,
                        tooltip: localize('readonlyAndDeleted', "Deleted, Read-only"),
                    };
                }
                // Readonly
                else if (isReadonly) {
                    return {
                        letter: Codicon.lockSmall,
                        tooltip: localize('readonly', "Read-only"),
                    };
                }
                // Orphaned
                else if (isOrphaned) {
                    return {
                        color: listErrorForeground,
                        strikethrough: true,
                        tooltip: localize('deleted', "Deleted"),
                    };
                }
                return undefined;
            }
        }(this.stored));
        this._register(this.decorationsService.registerDecorationsProvider(provider));
    }
    //#endregion
    //#region get / get all
    get workingCopies() {
        return [...this.stored.workingCopies, ...this.untitled.workingCopies];
    }
    get(resource) {
        return this.stored.get(resource) ?? this.untitled.get(resource);
    }
    resolve(arg1, arg2) {
        if (URI.isUri(arg1)) {
            // Untitled: via untitled manager
            if (arg1.scheme === Schemas.untitled) {
                return this.untitled.resolve({ untitledResource: arg1 });
            }
            // else: via stored file manager
            else {
                return this.stored.resolve(arg1, arg2);
            }
        }
        return this.untitled.resolve(arg1);
    }
    //#endregion
    //#region Save
    async saveAs(source, target, options) {
        // Get to target resource
        if (!target) {
            const workingCopy = this.get(source);
            if (workingCopy instanceof UntitledFileWorkingCopy && workingCopy.hasAssociatedFilePath) {
                target = await this.suggestSavePath(source);
            }
            else {
                target = await this.fileDialogService.pickFileToSave(await this.suggestSavePath(options?.suggestedTarget ?? source), options?.availableFileSystems);
            }
        }
        if (!target) {
            return; // user canceled
        }
        // Ensure target is not marked as readonly and prompt otherwise
        if (this.filesConfigurationService.isReadonly(target)) {
            const confirmed = await this.confirmMakeWriteable(target);
            if (!confirmed) {
                return;
            }
            else {
                this.filesConfigurationService.updateReadonly(target, false);
            }
        }
        // Just save if target is same as working copies own resource
        // and we are not saving an untitled file working copy
        if (this.fileService.hasProvider(source) && isEqual(source, target)) {
            return this.doSave(source, { ...options, force: true /* force to save, even if not dirty (https://github.com/microsoft/vscode/issues/99619) */ });
        }
        // If the target is different but of same identity, we
        // move the source to the target, knowing that the
        // underlying file system cannot have both and then save.
        // However, this will only work if the source exists
        // and is not orphaned, so we need to check that too.
        if (this.fileService.hasProvider(source) && this.uriIdentityService.extUri.isEqual(source, target) && (await this.fileService.exists(source))) {
            // Move via working copy file service to enable participants
            await this.workingCopyFileService.move([{ file: { source, target } }], CancellationToken.None);
            // At this point we don't know whether we have a
            // working copy for the source or the target URI so we
            // simply try to save with both resources.
            return (await this.doSave(source, options)) ?? (await this.doSave(target, options));
        }
        // Perform normal "Save As"
        return this.doSaveAs(source, target, options);
    }
    async doSave(resource, options) {
        // Save is only possible with stored file working copies,
        // any other have to go via `saveAs` flow.
        const storedFileWorkingCopy = this.stored.get(resource);
        if (storedFileWorkingCopy) {
            const success = await storedFileWorkingCopy.save(options);
            if (success) {
                return storedFileWorkingCopy;
            }
        }
        return undefined;
    }
    async doSaveAs(source, target, options) {
        let sourceContents;
        // If the source is an existing file working copy, we can directly
        // use that to copy the contents to the target destination
        const sourceWorkingCopy = this.get(source);
        if (sourceWorkingCopy?.isResolved()) {
            sourceContents = await sourceWorkingCopy.model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
        }
        // Otherwise we resolve the contents from the underlying file
        else {
            sourceContents = (await this.fileService.readFileStream(source)).value;
        }
        // Resolve target
        const { targetFileExists, targetStoredFileWorkingCopy } = await this.doResolveSaveTarget(source, target);
        // Confirm to overwrite if we have an untitled file working copy with associated path where
        // the file actually exists on disk and we are instructed to save to that file path.
        // This can happen if the file was created after the untitled file was opened.
        // See https://github.com/microsoft/vscode/issues/67946
        if (sourceWorkingCopy instanceof UntitledFileWorkingCopy &&
            sourceWorkingCopy.hasAssociatedFilePath &&
            targetFileExists &&
            this.uriIdentityService.extUri.isEqual(target, toLocalResource(sourceWorkingCopy.resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme))) {
            const overwrite = await this.confirmOverwrite(target);
            if (!overwrite) {
                return undefined;
            }
        }
        // Take over content from source to target
        await targetStoredFileWorkingCopy.model?.update(sourceContents, CancellationToken.None);
        // Set source options depending on target exists or not
        if (!options?.source) {
            options = {
                ...options,
                source: targetFileExists ? FileWorkingCopyManager_1.FILE_WORKING_COPY_SAVE_REPLACE_SOURCE : FileWorkingCopyManager_1.FILE_WORKING_COPY_SAVE_CREATE_SOURCE
            };
        }
        // Save target
        const success = await targetStoredFileWorkingCopy.save({
            ...options,
            from: source,
            force: true /* force to save, even if not dirty (https://github.com/microsoft/vscode/issues/99619) */
        });
        if (!success) {
            return undefined;
        }
        // Revert the source
        try {
            await sourceWorkingCopy?.revert();
        }
        catch (error) {
            // It is possible that reverting the source fails, for example
            // when a remote is disconnected and we cannot read it anymore.
            // However, this should not interrupt the "Save As" flow, so
            // we gracefully catch the error and just log it.
            this.logService.error(error);
        }
        // Events
        if (source.scheme === Schemas.untitled) {
            this.untitled.notifyDidSave(source, target);
        }
        return targetStoredFileWorkingCopy;
    }
    async doResolveSaveTarget(source, target) {
        // Prefer an existing stored file working copy if it is already resolved
        // for the given target resource
        let targetFileExists = false;
        let targetStoredFileWorkingCopy = this.stored.get(target);
        if (targetStoredFileWorkingCopy?.isResolved()) {
            targetFileExists = true;
        }
        // Otherwise create the target working copy empty if
        // it does not exist already and resolve it from there
        else {
            targetFileExists = await this.fileService.exists(target);
            // Create target file adhoc if it does not exist yet
            if (!targetFileExists) {
                await this.workingCopyFileService.create([{ resource: target }], CancellationToken.None);
            }
            // At this point we need to resolve the target working copy
            // and we have to do an explicit check if the source URI
            // equals the target via URI identity. If they match and we
            // have had an existing working copy with the source, we
            // prefer that one over resolving the target. Otherwise we
            // would potentially introduce a
            if (this.uriIdentityService.extUri.isEqual(source, target) && this.get(source)) {
                targetStoredFileWorkingCopy = await this.stored.resolve(source);
            }
            else {
                targetStoredFileWorkingCopy = await this.stored.resolve(target);
            }
        }
        return { targetFileExists, targetStoredFileWorkingCopy };
    }
    async confirmOverwrite(resource) {
        const { confirmed } = await this.dialogService.confirm({
            type: 'warning',
            message: localize('confirmOverwrite', "'{0}' already exists. Do you want to replace it?", basename(resource)),
            detail: localize('overwriteIrreversible', "A file or folder with the name '{0}' already exists in the folder '{1}'. Replacing it will overwrite its current contents.", basename(resource), basename(dirname(resource))),
            primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Replace")
        });
        return confirmed;
    }
    async confirmMakeWriteable(resource) {
        const { confirmed } = await this.dialogService.confirm({
            type: 'warning',
            message: localize('confirmMakeWriteable', "'{0}' is marked as read-only. Do you want to save anyway?", basename(resource)),
            detail: localize('confirmMakeWriteableDetail', "Paths can be configured as read-only via settings."),
            primaryButton: localize({ key: 'makeWriteableButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Save Anyway")
        });
        return confirmed;
    }
    async suggestSavePath(resource) {
        // 1.) Just take the resource as is if the file service can handle it
        if (this.fileService.hasProvider(resource)) {
            return resource;
        }
        // 2.) Pick the associated file path for untitled working copies if any
        const workingCopy = this.get(resource);
        if (workingCopy instanceof UntitledFileWorkingCopy && workingCopy.hasAssociatedFilePath) {
            return toLocalResource(resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
        }
        const defaultFilePath = await this.fileDialogService.defaultFilePath();
        // 3.) Pick the working copy name if valid joined with default path
        if (workingCopy) {
            const candidatePath = joinPath(defaultFilePath, workingCopy.name);
            if (await this.pathService.hasValidBasename(candidatePath, workingCopy.name)) {
                return candidatePath;
            }
        }
        // 4.) Finally fallback to the name of the resource joined with default path
        return joinPath(defaultFilePath, basename(resource));
    }
    //#endregion
    //#region Lifecycle
    async destroy() {
        await Promises.settled([
            this.stored.destroy(),
            this.untitled.destroy()
        ]);
    }
};
FileWorkingCopyManager = FileWorkingCopyManager_1 = __decorate([
    __param(3, IFileService),
    __param(4, ILifecycleService),
    __param(5, ILabelService),
    __param(6, ILogService),
    __param(7, IWorkingCopyFileService),
    __param(8, IWorkingCopyBackupService),
    __param(9, IUriIdentityService),
    __param(10, IFileDialogService),
    __param(11, IFilesConfigurationService),
    __param(12, IWorkingCopyService),
    __param(13, INotificationService),
    __param(14, IWorkingCopyEditorService),
    __param(15, IEditorService),
    __param(16, IElevatedFileService),
    __param(17, IPathService),
    __param(18, IWorkbenchEnvironmentService),
    __param(19, IDialogService),
    __param(20, IDecorationsService),
    __param(21, IProgressService)
], FileWorkingCopyManager);
export { FileWorkingCopyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVdvcmtpbmdDb3B5TWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL2ZpbGVXb3JraW5nQ29weU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQWdCLGtCQUFrQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0UsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdGLE9BQU8sRUFB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