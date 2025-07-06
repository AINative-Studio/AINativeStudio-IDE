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
var TextFileEditorModel_1;
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { mark } from '../../../../base/common/performance.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { ITextFileService } from './textfiles.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { BaseTextEditorModel } from '../../../common/editor/textEditorModel.js';
import { IWorkingCopyBackupService } from '../../workingCopy/common/workingCopyBackup.js';
import { IFileService, ETAG_DISABLED, NotModifiedSinceFileOperationError } from '../../../../platform/files/common/files.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { timeout, TaskSequentializer } from '../../../../base/common/async.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { basename } from '../../../../base/common/path.js';
import { IWorkingCopyService } from '../../workingCopy/common/workingCopyService.js';
import { NO_TYPE_ID } from '../../workingCopy/common/workingCopy.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { UTF16be, UTF16le, UTF8, UTF8_with_bom } from './encoding.js';
import { createTextBufferFactoryFromStream } from '../../../../editor/common/model/textModel.js';
import { ILanguageDetectionService } from '../../languageDetection/common/languageDetectionWorkerService.js';
import { IPathService } from '../../path/common/pathService.js';
import { extUri } from '../../../../base/common/resources.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { isCancellationError } from '../../../../base/common/errors.js';
/**
 * The text file editor model listens to changes to its underlying code editor model and saves these changes through the file service back to the disk.
 */
let TextFileEditorModel = class TextFileEditorModel extends BaseTextEditorModel {
    static { TextFileEditorModel_1 = this; }
    static { this.TEXTFILE_SAVE_ENCODING_SOURCE = SaveSourceRegistry.registerSource('textFileEncoding.source', localize('textFileCreate.source', "File Encoding Changed")); }
    static { this.UNDO_REDO_SAVE_PARTICIPANTS_AUTO_SAVE_THROTTLE_THRESHOLD = 500; }
    constructor(resource, preferredEncoding, // encoding as chosen by the user
    preferredLanguageId, languageService, modelService, fileService, textFileService, workingCopyBackupService, logService, workingCopyService, filesConfigurationService, labelService, languageDetectionService, accessibilityService, pathService, extensionService, progressService) {
        super(modelService, languageService, languageDetectionService, accessibilityService);
        this.resource = resource;
        this.preferredEncoding = preferredEncoding;
        this.preferredLanguageId = preferredLanguageId;
        this.fileService = fileService;
        this.textFileService = textFileService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.logService = logService;
        this.workingCopyService = workingCopyService;
        this.filesConfigurationService = filesConfigurationService;
        this.labelService = labelService;
        this.pathService = pathService;
        this.extensionService = extensionService;
        this.progressService = progressService;
        //#region Events
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidResolve = this._register(new Emitter());
        this.onDidResolve = this._onDidResolve.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidSaveError = this._register(new Emitter());
        this.onDidSaveError = this._onDidSaveError.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidRevert = this._register(new Emitter());
        this.onDidRevert = this._onDidRevert.event;
        this._onDidChangeEncoding = this._register(new Emitter());
        this.onDidChangeEncoding = this._onDidChangeEncoding.event;
        this._onDidChangeOrphaned = this._register(new Emitter());
        this.onDidChangeOrphaned = this._onDidChangeOrphaned.event;
        this._onDidChangeReadonly = this._register(new Emitter());
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        //#endregion
        this.typeId = NO_TYPE_ID; // IMPORTANT: never change this to not break existing assumptions (e.g. backups)
        this.capabilities = 0 /* WorkingCopyCapabilities.None */;
        this.versionId = 0;
        this.ignoreDirtyOnModelContentChange = false;
        this.ignoreSaveFromSaveParticipants = false;
        this.lastModelContentChangeFromUndoRedo = undefined;
        this.saveSequentializer = new TaskSequentializer();
        this.dirty = false;
        this.inConflictMode = false;
        this.inOrphanMode = false;
        this.inErrorMode = false;
        this.hasEncodingSetExplicitly = false;
        this.name = basename(this.labelService.getUriLabel(this.resource));
        this.resourceHasExtension = !!extUri.extname(this.resource);
        // Make known to working copy service
        this._register(this.workingCopyService.registerWorkingCopy(this));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.fileService.onDidFilesChange(e => this.onDidFilesChange(e)));
        this._register(this.filesConfigurationService.onDidChangeFilesAssociation(() => this.onDidChangeFilesAssociation()));
        this._register(this.filesConfigurationService.onDidChangeReadonly(() => this._onDidChangeReadonly.fire()));
    }
    async onDidFilesChange(e) {
        let fileEventImpactsModel = false;
        let newInOrphanModeGuess;
        // If we are currently orphaned, we check if the model file was added back
        if (this.inOrphanMode) {
            const modelFileAdded = e.contains(this.resource, 1 /* FileChangeType.ADDED */);
            if (modelFileAdded) {
                newInOrphanModeGuess = false;
                fileEventImpactsModel = true;
            }
        }
        // Otherwise we check if the model file was deleted
        else {
            const modelFileDeleted = e.contains(this.resource, 2 /* FileChangeType.DELETED */);
            if (modelFileDeleted) {
                newInOrphanModeGuess = true;
                fileEventImpactsModel = true;
            }
        }
        if (fileEventImpactsModel && this.inOrphanMode !== newInOrphanModeGuess) {
            let newInOrphanModeValidated = false;
            if (newInOrphanModeGuess) {
                // We have received reports of users seeing delete events even though the file still
                // exists (network shares issue: https://github.com/microsoft/vscode/issues/13665).
                // Since we do not want to mark the model as orphaned, we have to check if the
                // file is really gone and not just a faulty file event.
                await timeout(100, CancellationToken.None);
                if (this.isDisposed()) {
                    newInOrphanModeValidated = true;
                }
                else {
                    const exists = await this.fileService.exists(this.resource);
                    newInOrphanModeValidated = !exists;
                }
            }
            if (this.inOrphanMode !== newInOrphanModeValidated && !this.isDisposed()) {
                this.setOrphaned(newInOrphanModeValidated);
            }
        }
    }
    setOrphaned(orphaned) {
        if (this.inOrphanMode !== orphaned) {
            this.inOrphanMode = orphaned;
            this._onDidChangeOrphaned.fire();
        }
    }
    onDidChangeFilesAssociation() {
        if (!this.isResolved()) {
            return;
        }
        const firstLineText = this.getFirstLineText(this.textEditorModel);
        const languageSelection = this.getOrCreateLanguage(this.resource, this.languageService, this.preferredLanguageId, firstLineText);
        this.textEditorModel.setLanguage(languageSelection);
    }
    setLanguageId(languageId, source) {
        super.setLanguageId(languageId, source);
        this.preferredLanguageId = languageId;
    }
    //#region Backup
    async backup(token) {
        // Fill in metadata if we are resolved
        let meta = undefined;
        if (this.lastResolvedFileStat) {
            meta = {
                mtime: this.lastResolvedFileStat.mtime,
                ctime: this.lastResolvedFileStat.ctime,
                size: this.lastResolvedFileStat.size,
                etag: this.lastResolvedFileStat.etag,
                orphaned: this.inOrphanMode
            };
        }
        // Fill in content the same way we would do when
        // saving the file via the text file service
        // encoding support (hardcode UTF-8)
        const content = await this.textFileService.getEncodedReadable(this.resource, this.createSnapshot() ?? undefined, { encoding: UTF8 });
        return { meta, content };
    }
    //#endregion
    //#region Revert
    async revert(options) {
        if (!this.isResolved()) {
            return;
        }
        // Unset flags
        const wasDirty = this.dirty;
        const undo = this.doSetDirty(false);
        // Force read from disk unless reverting soft
        const softUndo = options?.soft;
        if (!softUndo) {
            try {
                await this.forceResolveFromFile();
            }
            catch (error) {
                // FileNotFound means the file got deleted meanwhile, so ignore it
                if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    // Set flags back to previous values, we are still dirty if revert failed
                    undo();
                    throw error;
                }
            }
        }
        // Emit file change event
        this._onDidRevert.fire();
        // Emit dirty change event
        if (wasDirty) {
            this._onDidChangeDirty.fire();
        }
    }
    //#endregion
    //#region Resolve
    async resolve(options) {
        this.trace('resolve() - enter');
        mark('code/willResolveTextFileEditorModel');
        // Return early if we are disposed
        if (this.isDisposed()) {
            this.trace('resolve() - exit - without resolving because model is disposed');
            return;
        }
        // Unless there are explicit contents provided, it is important that we do not
        // resolve a model that is dirty or is in the process of saving to prevent data
        // loss.
        if (!options?.contents && (this.dirty || this.saveSequentializer.isRunning())) {
            this.trace('resolve() - exit - without resolving because model is dirty or being saved');
            return;
        }
        // Resolve either from backup or from file
        await this.doResolve(options);
        mark('code/didResolveTextFileEditorModel');
    }
    async doResolve(options) {
        // First check if we have contents to use for the model
        if (options?.contents) {
            return this.resolveFromBuffer(options.contents, options);
        }
        // Second, check if we have a backup to resolve from (only for new models)
        const isNewModel = !this.isResolved();
        if (isNewModel) {
            const resolvedFromBackup = await this.resolveFromBackup(options);
            if (resolvedFromBackup) {
                return;
            }
        }
        // Finally, resolve from file resource
        return this.resolveFromFile(options);
    }
    async resolveFromBuffer(buffer, options) {
        this.trace('resolveFromBuffer()');
        // Try to resolve metdata from disk
        let mtime;
        let ctime;
        let size;
        let etag;
        try {
            const metadata = await this.fileService.stat(this.resource);
            mtime = metadata.mtime;
            ctime = metadata.ctime;
            size = metadata.size;
            etag = metadata.etag;
            // Clear orphaned state when resolving was successful
            this.setOrphaned(false);
        }
        catch (error) {
            // Put some fallback values in error case
            mtime = Date.now();
            ctime = Date.now();
            size = 0;
            etag = ETAG_DISABLED;
            // Apply orphaned state based on error code
            this.setOrphaned(error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */);
        }
        const preferredEncoding = await this.textFileService.encoding.getPreferredWriteEncoding(this.resource, this.preferredEncoding);
        // Resolve with buffer
        this.resolveFromContent({
            resource: this.resource,
            name: this.name,
            mtime,
            ctime,
            size,
            etag,
            value: buffer,
            encoding: preferredEncoding.encoding,
            readonly: false,
            locked: false
        }, true /* dirty (resolved from buffer) */, options);
    }
    async resolveFromBackup(options) {
        // Resolve backup if any
        const backup = await this.workingCopyBackupService.resolve(this);
        // Resolve preferred encoding if we need it
        let encoding = UTF8;
        if (backup) {
            encoding = (await this.textFileService.encoding.getPreferredWriteEncoding(this.resource, this.preferredEncoding)).encoding;
        }
        // Abort if someone else managed to resolve the model by now
        const isNewModel = !this.isResolved();
        if (!isNewModel) {
            this.trace('resolveFromBackup() - exit - without resolving because previously new model got created meanwhile');
            return true; // imply that resolving has happened in another operation
        }
        // Try to resolve from backup if we have any
        if (backup) {
            await this.doResolveFromBackup(backup, encoding, options);
            return true;
        }
        // Otherwise signal back that resolving did not happen
        return false;
    }
    async doResolveFromBackup(backup, encoding, options) {
        this.trace('doResolveFromBackup()');
        // Resolve with backup
        this.resolveFromContent({
            resource: this.resource,
            name: this.name,
            mtime: backup.meta ? backup.meta.mtime : Date.now(),
            ctime: backup.meta ? backup.meta.ctime : Date.now(),
            size: backup.meta ? backup.meta.size : 0,
            etag: backup.meta ? backup.meta.etag : ETAG_DISABLED, // etag disabled if unknown!
            value: await createTextBufferFactoryFromStream(await this.textFileService.getDecodedStream(this.resource, backup.value, { encoding: UTF8 })),
            encoding,
            readonly: false,
            locked: false
        }, true /* dirty (resolved from backup) */, options);
        // Restore orphaned flag based on state
        if (backup.meta?.orphaned) {
            this.setOrphaned(true);
        }
    }
    async resolveFromFile(options) {
        this.trace('resolveFromFile()');
        const forceReadFromFile = options?.forceReadFromFile;
        const allowBinary = this.isResolved() /* always allow if we resolved previously */ || options?.allowBinary;
        // Decide on etag
        let etag;
        if (forceReadFromFile) {
            etag = ETAG_DISABLED; // disable ETag if we enforce to read from disk
        }
        else if (this.lastResolvedFileStat) {
            etag = this.lastResolvedFileStat.etag; // otherwise respect etag to support caching
        }
        // Remember current version before doing any long running operation
        // to ensure we are not changing a model that was changed meanwhile
        const currentVersionId = this.versionId;
        // Resolve Content
        try {
            const content = await this.textFileService.readStream(this.resource, {
                acceptTextOnly: !allowBinary,
                etag,
                encoding: this.preferredEncoding,
                limits: options?.limits
            });
            // Clear orphaned state when resolving was successful
            this.setOrphaned(false);
            // Return early if the model content has changed
            // meanwhile to prevent loosing any changes
            if (currentVersionId !== this.versionId) {
                this.trace('resolveFromFile() - exit - without resolving because model content changed');
                return;
            }
            return this.resolveFromContent(content, false /* not dirty (resolved from file) */, options);
        }
        catch (error) {
            const result = error.fileOperationResult;
            // Apply orphaned state based on error code
            this.setOrphaned(result === 1 /* FileOperationResult.FILE_NOT_FOUND */);
            // NotModified status is expected and can be handled gracefully
            // if we are resolved. We still want to update our last resolved
            // stat to e.g. detect changes to the file's readonly state
            if (this.isResolved() && result === 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */) {
                if (error instanceof NotModifiedSinceFileOperationError) {
                    this.updateLastResolvedFileStat(error.stat);
                }
                return;
            }
            // Unless we are forced to read from the file, Ignore when a model has been resolved once
            // and the file was deleted meanwhile. Since we already have the model resolved, we can return
            // to this state and update the orphaned flag to indicate that this model has no version on
            // disk anymore.
            if (this.isResolved() && result === 1 /* FileOperationResult.FILE_NOT_FOUND */ && !forceReadFromFile) {
                return;
            }
            // Otherwise bubble up the error
            throw error;
        }
    }
    resolveFromContent(content, dirty, options) {
        this.trace('resolveFromContent() - enter');
        // Return early if we are disposed
        if (this.isDisposed()) {
            this.trace('resolveFromContent() - exit - because model is disposed');
            return;
        }
        // Update our resolved disk stat model
        this.updateLastResolvedFileStat({
            resource: this.resource,
            name: content.name,
            mtime: content.mtime,
            ctime: content.ctime,
            size: content.size,
            etag: content.etag,
            readonly: content.readonly,
            locked: content.locked,
            isFile: true,
            isDirectory: false,
            isSymbolicLink: false,
            children: undefined
        });
        // Keep the original encoding to not loose it when saving
        const oldEncoding = this.contentEncoding;
        this.contentEncoding = content.encoding;
        // Handle events if encoding changed
        if (this.preferredEncoding) {
            this.updatePreferredEncoding(this.contentEncoding); // make sure to reflect the real encoding of the file (never out of sync)
        }
        else if (oldEncoding !== this.contentEncoding) {
            this._onDidChangeEncoding.fire();
        }
        // Update Existing Model
        if (this.textEditorModel) {
            this.doUpdateTextModel(content.value);
        }
        // Create New Model
        else {
            this.doCreateTextModel(content.resource, content.value);
        }
        // Update model dirty flag. This is very important to call
        // in both cases of dirty or not because it conditionally
        // updates the `bufferSavedVersionId` to determine the
        // version when to consider the model as saved again (e.g.
        // when undoing back to the saved state)
        this.setDirty(!!dirty);
        // Emit as event
        this._onDidResolve.fire(options?.reason ?? 3 /* TextFileResolveReason.OTHER */);
    }
    doCreateTextModel(resource, value) {
        this.trace('doCreateTextModel()');
        // Create model
        const textModel = this.createTextEditorModel(value, resource, this.preferredLanguageId);
        // Model Listeners
        this.installModelListeners(textModel);
        // Detect language from content
        this.autoDetectLanguage();
    }
    doUpdateTextModel(value) {
        this.trace('doUpdateTextModel()');
        // Update model value in a block that ignores content change events for dirty tracking
        this.ignoreDirtyOnModelContentChange = true;
        try {
            this.updateTextEditorModel(value, this.preferredLanguageId);
        }
        finally {
            this.ignoreDirtyOnModelContentChange = false;
        }
    }
    installModelListeners(model) {
        // See https://github.com/microsoft/vscode/issues/30189
        // This code has been extracted to a different method because it caused a memory leak
        // where `value` was captured in the content change listener closure scope.
        this._register(model.onDidChangeContent(e => this.onModelContentChanged(model, e.isUndoing || e.isRedoing)));
        this._register(model.onDidChangeLanguage(() => this.onMaybeShouldChangeEncoding())); // detect possible encoding change via language specific settings
        super.installModelListeners(model);
    }
    onModelContentChanged(model, isUndoingOrRedoing) {
        this.trace(`onModelContentChanged() - enter`);
        // In any case increment the version id because it tracks the textual content state of the model at all times
        this.versionId++;
        this.trace(`onModelContentChanged() - new versionId ${this.versionId}`);
        // Remember when the user changed the model through a undo/redo operation.
        // We need this information to throttle save participants to fix
        // https://github.com/microsoft/vscode/issues/102542
        if (isUndoingOrRedoing) {
            this.lastModelContentChangeFromUndoRedo = Date.now();
        }
        // We mark check for a dirty-state change upon model content change, unless:
        // - explicitly instructed to ignore it (e.g. from model.resolve())
        // - the model is readonly (in that case we never assume the change was done by the user)
        if (!this.ignoreDirtyOnModelContentChange && !this.isReadonly()) {
            // The contents changed as a matter of Undo and the version reached matches the saved one
            // In this case we clear the dirty flag and emit a SAVED event to indicate this state.
            if (model.getAlternativeVersionId() === this.bufferSavedVersionId) {
                this.trace('onModelContentChanged() - model content changed back to last saved version');
                // Clear flags
                const wasDirty = this.dirty;
                this.setDirty(false);
                // Emit revert event if we were dirty
                if (wasDirty) {
                    this._onDidRevert.fire();
                }
            }
            // Otherwise the content has changed and we signal this as becoming dirty
            else {
                this.trace('onModelContentChanged() - model content changed and marked as dirty');
                // Mark as dirty
                this.setDirty(true);
            }
        }
        // Emit as event
        this._onDidChangeContent.fire();
        // Detect language from content
        this.autoDetectLanguage();
    }
    async autoDetectLanguage() {
        // Wait to be ready to detect language
        await this.extensionService?.whenInstalledExtensionsRegistered();
        // Only perform language detection conditionally
        const languageId = this.getLanguageId();
        if (this.resource.scheme === this.pathService.defaultUriScheme && // make sure to not detect language for non-user visible documents
            (!languageId || languageId === PLAINTEXT_LANGUAGE_ID) && // only run on files with plaintext language set or no language set at all
            !this.resourceHasExtension // only run if this particular file doesn't have an extension
        ) {
            return super.autoDetectLanguage();
        }
    }
    async forceResolveFromFile() {
        if (this.isDisposed()) {
            return; // return early when the model is invalid
        }
        // We go through the text file service to make
        // sure this kind of `resolve` is properly
        // running in sequence with any other running
        // `resolve` if any, including subsequent runs
        // that are triggered right after.
        await this.textFileService.files.resolve(this.resource, {
            reload: { async: false },
            forceReadFromFile: true
        });
    }
    //#endregion
    //#region Dirty
    isDirty() {
        return this.dirty;
    }
    isModified() {
        return this.isDirty();
    }
    setDirty(dirty) {
        if (!this.isResolved()) {
            return; // only resolved models can be marked dirty
        }
        // Track dirty state and version id
        const wasDirty = this.dirty;
        this.doSetDirty(dirty);
        // Emit as Event if dirty changed
        if (dirty !== wasDirty) {
            this._onDidChangeDirty.fire();
        }
    }
    doSetDirty(dirty) {
        const wasDirty = this.dirty;
        const wasInConflictMode = this.inConflictMode;
        const wasInErrorMode = this.inErrorMode;
        const oldBufferSavedVersionId = this.bufferSavedVersionId;
        if (!dirty) {
            this.dirty = false;
            this.inConflictMode = false;
            this.inErrorMode = false;
            this.updateSavedVersionId();
        }
        else {
            this.dirty = true;
        }
        // Return function to revert this call
        return () => {
            this.dirty = wasDirty;
            this.inConflictMode = wasInConflictMode;
            this.inErrorMode = wasInErrorMode;
            this.bufferSavedVersionId = oldBufferSavedVersionId;
        };
    }
    //#endregion
    //#region Save
    async save(options = Object.create(null)) {
        if (!this.isResolved()) {
            return false;
        }
        if (this.isReadonly()) {
            this.trace('save() - ignoring request for readonly resource');
            return false; // if model is readonly we do not attempt to save at all
        }
        if ((this.hasState(3 /* TextFileEditorModelState.CONFLICT */) || this.hasState(5 /* TextFileEditorModelState.ERROR */)) &&
            (options.reason === 2 /* SaveReason.AUTO */ || options.reason === 3 /* SaveReason.FOCUS_CHANGE */ || options.reason === 4 /* SaveReason.WINDOW_CHANGE */)) {
            this.trace('save() - ignoring auto save request for model that is in conflict or error');
            return false; // if model is in save conflict or error, do not save unless save reason is explicit
        }
        // Actually do save and log
        this.trace('save() - enter');
        await this.doSave(options);
        this.trace('save() - exit');
        return this.hasState(0 /* TextFileEditorModelState.SAVED */);
    }
    async doSave(options) {
        if (typeof options.reason !== 'number') {
            options.reason = 1 /* SaveReason.EXPLICIT */;
        }
        const versionId = this.versionId;
        this.trace(`doSave(${versionId}) - enter with versionId ${versionId}`);
        // Return early if saved from within save participant to break recursion
        //
        // Scenario: a save participant triggers a save() on the model
        if (this.ignoreSaveFromSaveParticipants) {
            this.trace(`doSave(${versionId}) - exit - refusing to save() recursively from save participant`);
            return;
        }
        // Lookup any running save for this versionId and return it if found
        //
        // Scenario: user invoked the save action multiple times quickly for the same contents
        //           while the save was not yet finished to disk
        //
        if (this.saveSequentializer.isRunning(versionId)) {
            this.trace(`doSave(${versionId}) - exit - found a running save for versionId ${versionId}`);
            return this.saveSequentializer.running;
        }
        // Return early if not dirty (unless forced)
        //
        // Scenario: user invoked save action even though the model is not dirty
        if (!options.force && !this.dirty) {
            this.trace(`doSave(${versionId}) - exit - because not dirty and/or versionId is different (this.isDirty: ${this.dirty}, this.versionId: ${this.versionId})`);
            return;
        }
        // Return if currently saving by storing this save request as the next save that should happen.
        // Never ever must 2 saves execute at the same time because this can lead to dirty writes and race conditions.
        //
        // Scenario A: auto save was triggered and is currently busy saving to disk. this takes long enough that another auto save
        //             kicks in.
        // Scenario B: save is very slow (e.g. network share) and the user manages to change the buffer and trigger another save
        //             while the first save has not returned yet.
        //
        if (this.saveSequentializer.isRunning()) {
            this.trace(`doSave(${versionId}) - exit - because busy saving`);
            // Indicate to the save sequentializer that we want to
            // cancel the running operation so that ours can run
            // before the running one finishes.
            // Currently this will try to cancel running save
            // participants but never a running save.
            this.saveSequentializer.cancelRunning();
            // Queue this as the upcoming save and return
            return this.saveSequentializer.queue(() => this.doSave(options));
        }
        // Push all edit operations to the undo stack so that the user has a chance to
        // Ctrl+Z back to the saved version.
        if (this.isResolved()) {
            this.textEditorModel.pushStackElement();
        }
        const saveCancellation = new CancellationTokenSource();
        return this.progressService.withProgress({
            title: localize('saveParticipants', "Saving '{0}'", this.name),
            location: 10 /* ProgressLocation.Window */,
            cancellable: true,
            delay: this.isDirty() ? 3000 : 5000
        }, progress => {
            return this.doSaveSequential(versionId, options, progress, saveCancellation);
        }, () => {
            saveCancellation.cancel();
        }).finally(() => {
            saveCancellation.dispose();
        });
    }
    doSaveSequential(versionId, options, progress, saveCancellation) {
        return this.saveSequentializer.run(versionId, (async () => {
            // A save participant can still change the model now and since we are so close to saving
            // we do not want to trigger another auto save or similar, so we block this
            // In addition we update our version right after in case it changed because of a model change
            //
            // Save participants can also be skipped through API.
            if (this.isResolved() && !options.skipSaveParticipants) {
                try {
                    // Measure the time it took from the last undo/redo operation to this save. If this
                    // time is below `UNDO_REDO_SAVE_PARTICIPANTS_THROTTLE_THRESHOLD`, we make sure to
                    // delay the save participant for the remaining time if the reason is auto save.
                    //
                    // This fixes the following issue:
                    // - the user has configured auto save with delay of 100ms or shorter
                    // - the user has a save participant enabled that modifies the file on each save
                    // - the user types into the file and the file gets saved
                    // - the user triggers undo operation
                    // - this will undo the save participant change but trigger the save participant right after
                    // - the user has no chance to undo over the save participant
                    //
                    // Reported as: https://github.com/microsoft/vscode/issues/102542
                    if (options.reason === 2 /* SaveReason.AUTO */ && typeof this.lastModelContentChangeFromUndoRedo === 'number') {
                        const timeFromUndoRedoToSave = Date.now() - this.lastModelContentChangeFromUndoRedo;
                        if (timeFromUndoRedoToSave < TextFileEditorModel_1.UNDO_REDO_SAVE_PARTICIPANTS_AUTO_SAVE_THROTTLE_THRESHOLD) {
                            await timeout(TextFileEditorModel_1.UNDO_REDO_SAVE_PARTICIPANTS_AUTO_SAVE_THROTTLE_THRESHOLD - timeFromUndoRedoToSave);
                        }
                    }
                    // Run save participants unless save was cancelled meanwhile
                    if (!saveCancellation.token.isCancellationRequested) {
                        this.ignoreSaveFromSaveParticipants = true;
                        try {
                            await this.textFileService.files.runSaveParticipants(this, { reason: options.reason ?? 1 /* SaveReason.EXPLICIT */, savedFrom: options.from }, progress, saveCancellation.token);
                        }
                        catch (err) {
                            if (isCancellationError(err) && !saveCancellation.token.isCancellationRequested) {
                                // participant wants to cancel this operation
                                saveCancellation.cancel();
                            }
                        }
                        finally {
                            this.ignoreSaveFromSaveParticipants = false;
                        }
                    }
                }
                catch (error) {
                    this.logService.error(`[text file model] runSaveParticipants(${versionId}) - resulted in an error: ${error.toString()}`, this.resource.toString());
                }
            }
            // It is possible that a subsequent save is cancelling this
            // running save. As such we return early when we detect that
            // However, we do not pass the token into the file service
            // because that is an atomic operation currently without
            // cancellation support, so we dispose the cancellation if
            // it was not cancelled yet.
            if (saveCancellation.token.isCancellationRequested) {
                return;
            }
            else {
                saveCancellation.dispose();
            }
            // We have to protect against being disposed at this point. It could be that the save() operation
            // was triggerd followed by a dispose() operation right after without waiting. Typically we cannot
            // be disposed if we are dirty, but if we are not dirty, save() and dispose() can still be triggered
            // one after the other without waiting for the save() to complete. If we are disposed(), we risk
            // saving contents to disk that are stale (see https://github.com/microsoft/vscode/issues/50942).
            // To fix this issue, we will not store the contents to disk when we got disposed.
            if (this.isDisposed()) {
                return;
            }
            // We require a resolved model from this point on, since we are about to write data to disk.
            if (!this.isResolved()) {
                return;
            }
            // update versionId with its new value (if pre-save changes happened)
            versionId = this.versionId;
            // Clear error flag since we are trying to save again
            this.inErrorMode = false;
            // Save to Disk. We mark the save operation as currently running with
            // the latest versionId because it might have changed from a save
            // participant triggering
            progress.report({ message: localize('saveTextFile', "Writing into file...") });
            this.trace(`doSave(${versionId}) - before write()`);
            const lastResolvedFileStat = assertIsDefined(this.lastResolvedFileStat);
            const resolvedTextFileEditorModel = this;
            return this.saveSequentializer.run(versionId, (async () => {
                try {
                    const stat = await this.textFileService.write(lastResolvedFileStat.resource, resolvedTextFileEditorModel.createSnapshot(), {
                        mtime: lastResolvedFileStat.mtime,
                        encoding: this.getEncoding(),
                        etag: (options.ignoreModifiedSince || !this.filesConfigurationService.preventSaveConflicts(lastResolvedFileStat.resource, resolvedTextFileEditorModel.getLanguageId())) ? ETAG_DISABLED : lastResolvedFileStat.etag,
                        unlock: options.writeUnlock,
                        writeElevated: options.writeElevated
                    });
                    this.handleSaveSuccess(stat, versionId, options);
                }
                catch (error) {
                    this.handleSaveError(error, versionId, options);
                }
            })());
        })(), () => saveCancellation.cancel());
    }
    handleSaveSuccess(stat, versionId, options) {
        // Updated resolved stat with updated stat
        this.updateLastResolvedFileStat(stat);
        // Update dirty state unless model has changed meanwhile
        if (versionId === this.versionId) {
            this.trace(`handleSaveSuccess(${versionId}) - setting dirty to false because versionId did not change`);
            this.setDirty(false);
        }
        else {
            this.trace(`handleSaveSuccess(${versionId}) - not setting dirty to false because versionId did change meanwhile`);
        }
        // Update orphan state given save was successful
        this.setOrphaned(false);
        // Emit Save Event
        this._onDidSave.fire({ reason: options.reason, stat, source: options.source });
    }
    handleSaveError(error, versionId, options) {
        (options.ignoreErrorHandler ? this.logService.trace : this.logService.error).apply(this.logService, [`[text file model] handleSaveError(${versionId}) - exit - resulted in a save error: ${error.toString()}`, this.resource.toString()]);
        // Return early if the save() call was made asking to
        // handle the save error itself.
        if (options.ignoreErrorHandler) {
            throw error;
        }
        // In any case of an error, we mark the model as dirty to prevent data loss
        // It could be possible that the write corrupted the file on disk (e.g. when
        // an error happened after truncating the file) and as such we want to preserve
        // the model contents to prevent data loss.
        this.setDirty(true);
        // Flag as error state in the model
        this.inErrorMode = true;
        // Look out for a save conflict
        if (error.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
            this.inConflictMode = true;
        }
        // Show to user
        this.textFileService.files.saveErrorHandler.onSaveError(error, this, options);
        // Emit as event
        this._onDidSaveError.fire();
    }
    updateSavedVersionId() {
        // we remember the models alternate version id to remember when the version
        // of the model matches with the saved version on disk. we need to keep this
        // in order to find out if the model changed back to a saved version (e.g.
        // when undoing long enough to reach to a version that is saved and then to
        // clear the dirty flag)
        if (this.isResolved()) {
            this.bufferSavedVersionId = this.textEditorModel.getAlternativeVersionId();
        }
    }
    updateLastResolvedFileStat(newFileStat) {
        const oldReadonly = this.isReadonly();
        // First resolve - just take
        if (!this.lastResolvedFileStat) {
            this.lastResolvedFileStat = newFileStat;
        }
        // Subsequent resolve - make sure that we only assign it if the mtime is equal or has advanced.
        // This prevents race conditions from resolving and saving. If a save comes in late after a revert
        // was called, the mtime could be out of sync.
        else if (this.lastResolvedFileStat.mtime <= newFileStat.mtime) {
            this.lastResolvedFileStat = newFileStat;
        }
        // In all other cases update only the readonly and locked flags
        else {
            this.lastResolvedFileStat = { ...this.lastResolvedFileStat, readonly: newFileStat.readonly, locked: newFileStat.locked };
        }
        // Signal that the readonly state changed
        if (this.isReadonly() !== oldReadonly) {
            this._onDidChangeReadonly.fire();
        }
    }
    //#endregion
    hasState(state) {
        switch (state) {
            case 3 /* TextFileEditorModelState.CONFLICT */:
                return this.inConflictMode;
            case 1 /* TextFileEditorModelState.DIRTY */:
                return this.dirty;
            case 5 /* TextFileEditorModelState.ERROR */:
                return this.inErrorMode;
            case 4 /* TextFileEditorModelState.ORPHAN */:
                return this.inOrphanMode;
            case 2 /* TextFileEditorModelState.PENDING_SAVE */:
                return this.saveSequentializer.isRunning();
            case 0 /* TextFileEditorModelState.SAVED */:
                return !this.dirty;
        }
    }
    async joinState(state) {
        return this.saveSequentializer.running;
    }
    getLanguageId() {
        if (this.textEditorModel) {
            return this.textEditorModel.getLanguageId();
        }
        return this.preferredLanguageId;
    }
    //#region Encoding
    async onMaybeShouldChangeEncoding() {
        // This is a bit of a hack but there is a narrow case where
        // per-language configured encodings are not working:
        //
        // On startup we may not yet have all languages resolved so
        // we pick a wrong encoding. We never used to re-apply the
        // encoding when the language was then resolved, because that
        // is an operation that is will have to fetch the contents
        // again from disk.
        //
        // To mitigate this issue, when we detect the model language
        // changes, we see if there is a specific encoding configured
        // for the new language and apply it, only if the model is
        // not dirty and only if the encoding was not explicitly set.
        //
        // (see https://github.com/microsoft/vscode/issues/127936)
        if (this.hasEncodingSetExplicitly) {
            this.trace('onMaybeShouldChangeEncoding() - ignoring because encoding was set explicitly');
            return; // never change the user's choice of encoding
        }
        if (this.contentEncoding === UTF8_with_bom || this.contentEncoding === UTF16be || this.contentEncoding === UTF16le) {
            this.trace('onMaybeShouldChangeEncoding() - ignoring because content encoding has a BOM');
            return; // never change an encoding that we can detect 100% via BOMs
        }
        const { encoding } = await this.textFileService.encoding.getPreferredReadEncoding(this.resource);
        if (typeof encoding !== 'string' || !this.isNewEncoding(encoding)) {
            this.trace(`onMaybeShouldChangeEncoding() - ignoring because preferred encoding ${encoding} is not new`);
            return; // return early if encoding is invalid or did not change
        }
        if (this.isDirty()) {
            this.trace('onMaybeShouldChangeEncoding() - ignoring because model is dirty');
            return; // return early to prevent accident saves in this case
        }
        this.logService.info(`Adjusting encoding based on configured language override to '${encoding}' for ${this.resource.toString(true)}.`);
        // Force resolve to pick up the new encoding
        return this.forceResolveFromFile();
    }
    setEncoding(encoding, mode) {
        // Remember that an explicit encoding was set
        this.hasEncodingSetExplicitly = true;
        return this.setEncodingInternal(encoding, mode);
    }
    async setEncodingInternal(encoding, mode) {
        // Encode: Save with encoding
        if (mode === 0 /* EncodingMode.Encode */) {
            this.updatePreferredEncoding(encoding);
            // Save
            if (!this.isDirty()) {
                this.versionId++; // needs to increment because we change the model potentially
                this.setDirty(true);
            }
            if (!this.inConflictMode) {
                await this.save({ source: TextFileEditorModel_1.TEXTFILE_SAVE_ENCODING_SOURCE });
            }
        }
        // Decode: Resolve with encoding
        else {
            if (!this.isNewEncoding(encoding)) {
                return; // return early if the encoding is already the same
            }
            if (this.isDirty() && !this.inConflictMode) {
                await this.save();
            }
            this.updatePreferredEncoding(encoding);
            await this.forceResolveFromFile();
        }
    }
    updatePreferredEncoding(encoding) {
        if (!this.isNewEncoding(encoding)) {
            return;
        }
        this.preferredEncoding = encoding;
        // Emit
        this._onDidChangeEncoding.fire();
    }
    isNewEncoding(encoding) {
        if (this.preferredEncoding === encoding) {
            return false; // return early if the encoding is already the same
        }
        if (!this.preferredEncoding && this.contentEncoding === encoding) {
            return false; // also return if we don't have a preferred encoding but the content encoding is already the same
        }
        return true;
    }
    getEncoding() {
        return this.preferredEncoding || this.contentEncoding;
    }
    //#endregion
    trace(msg) {
        this.logService.trace(`[text file model] ${msg}`, this.resource.toString());
    }
    isResolved() {
        return !!this.textEditorModel;
    }
    isReadonly() {
        return this.filesConfigurationService.isReadonly(this.resource, this.lastResolvedFileStat);
    }
    dispose() {
        this.trace('dispose()');
        this.inConflictMode = false;
        this.inOrphanMode = false;
        this.inErrorMode = false;
        super.dispose();
    }
};
TextFileEditorModel = TextFileEditorModel_1 = __decorate([
    __param(3, ILanguageService),
    __param(4, IModelService),
    __param(5, IFileService),
    __param(6, ITextFileService),
    __param(7, IWorkingCopyBackupService),
    __param(8, ILogService),
    __param(9, IWorkingCopyService),
    __param(10, IFilesConfigurationService),
    __param(11, ILabelService),
    __param(12, ILanguageDetectionService),
    __param(13, IAccessibilityService),
    __param(14, IPathService),
    __param(15, IExtensionService),
    __param(16, IProgressService)
], TextFileEditorModel);
export { TextFileEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9jb21tb24vdGV4dEZpbGVFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBZ0IsZ0JBQWdCLEVBQStNLE1BQU0sZ0JBQWdCLENBQUM7QUFDN1EsT0FBTyxFQUE4QixrQkFBa0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzNGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx5QkFBeUIsRUFBOEIsTUFBTSwrQ0FBK0MsQ0FBQztBQUN0SCxPQUFPLEVBQUUsWUFBWSxFQUFvRyxhQUFhLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvTixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRS9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFD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