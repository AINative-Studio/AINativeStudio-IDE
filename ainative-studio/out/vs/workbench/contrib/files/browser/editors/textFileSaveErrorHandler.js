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
import { localize } from '../../../../../nls.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { Action } from '../../../../../base/common/actions.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { dispose, Disposable } from '../../../../../base/common/lifecycle.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { TextFileContentProvider } from '../../common/files.js';
import { FileEditorInput } from './fileEditorInput.js';
import { SAVE_FILE_AS_LABEL } from '../fileConstants.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Event } from '../../../../../base/common/event.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { SideBySideEditor } from '../../../../common/editor.js';
import { hash } from '../../../../../base/common/hash.js';
export const CONFLICT_RESOLUTION_CONTEXT = 'saveConflictResolutionContext';
export const CONFLICT_RESOLUTION_SCHEME = 'conflictResolution';
const LEARN_MORE_DIRTY_WRITE_IGNORE_KEY = 'learnMoreDirtyWriteError';
const conflictEditorHelp = localize('userGuide', "Use the actions in the editor tool bar to either undo your changes or overwrite the content of the file with your changes.");
// A handler for text file save error happening with conflict resolution actions
let TextFileSaveErrorHandler = class TextFileSaveErrorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.textFileSaveErrorHandler'; }
    constructor(notificationService, textFileService, contextKeyService, editorService, textModelService, instantiationService, storageService) {
        super();
        this.notificationService = notificationService;
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.messages = new ResourceMap();
        this.activeConflictResolutionResource = undefined;
        this.conflictResolutionContext = new RawContextKey(CONFLICT_RESOLUTION_CONTEXT, false, true).bindTo(contextKeyService);
        const provider = this._register(instantiationService.createInstance(TextFileContentProvider));
        this._register(textModelService.registerTextModelContentProvider(CONFLICT_RESOLUTION_SCHEME, provider));
        // Set as save error handler to service for text files
        this.textFileService.files.saveErrorHandler = this;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.textFileService.files.onDidSave(e => this.onFileSavedOrReverted(e.model.resource)));
        this._register(this.textFileService.files.onDidRevert(model => this.onFileSavedOrReverted(model.resource)));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onActiveEditorChanged()));
    }
    onActiveEditorChanged() {
        let isActiveEditorSaveConflictResolution = false;
        let activeConflictResolutionResource;
        const activeInput = this.editorService.activeEditor;
        if (activeInput instanceof DiffEditorInput) {
            const resource = activeInput.original.resource;
            if (resource?.scheme === CONFLICT_RESOLUTION_SCHEME) {
                isActiveEditorSaveConflictResolution = true;
                activeConflictResolutionResource = activeInput.modified.resource;
            }
        }
        this.conflictResolutionContext.set(isActiveEditorSaveConflictResolution);
        this.activeConflictResolutionResource = activeConflictResolutionResource;
    }
    onFileSavedOrReverted(resource) {
        const messageHandle = this.messages.get(resource);
        if (messageHandle) {
            messageHandle.close();
            this.messages.delete(resource);
        }
    }
    onSaveError(error, model, options) {
        const fileOperationError = error;
        const resource = model.resource;
        let message;
        const primaryActions = [];
        const secondaryActions = [];
        // Dirty write prevention
        if (fileOperationError.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
            // If the user tried to save from the opened conflict editor, show its message again
            if (this.activeConflictResolutionResource && isEqual(this.activeConflictResolutionResource, model.resource)) {
                if (this.storageService.getBoolean(LEARN_MORE_DIRTY_WRITE_IGNORE_KEY, -1 /* StorageScope.APPLICATION */)) {
                    return; // return if this message is ignored
                }
                message = conflictEditorHelp;
                primaryActions.push(this.instantiationService.createInstance(ResolveConflictLearnMoreAction));
                secondaryActions.push(this.instantiationService.createInstance(DoNotShowResolveConflictLearnMoreAction));
            }
            // Otherwise show the message that will lead the user into the save conflict editor.
            else {
                message = localize('staleSaveError', "Failed to save '{0}': The content of the file is newer. Please compare your version with the file contents or overwrite the content of the file with your changes.", basename(resource));
                primaryActions.push(this.instantiationService.createInstance(ResolveSaveConflictAction, model));
                primaryActions.push(this.instantiationService.createInstance(SaveModelIgnoreModifiedSinceAction, model, options));
                secondaryActions.push(this.instantiationService.createInstance(ConfigureSaveConflictAction));
            }
        }
        // Any other save error
        else {
            const isWriteLocked = fileOperationError.fileOperationResult === 5 /* FileOperationResult.FILE_WRITE_LOCKED */;
            const triedToUnlock = isWriteLocked && fileOperationError.options?.unlock;
            const isPermissionDenied = fileOperationError.fileOperationResult === 6 /* FileOperationResult.FILE_PERMISSION_DENIED */;
            const canSaveElevated = resource.scheme === Schemas.file; // currently only supported for local schemes (https://github.com/microsoft/vscode/issues/48659)
            // Save Elevated
            if (canSaveElevated && (isPermissionDenied || triedToUnlock)) {
                primaryActions.push(this.instantiationService.createInstance(SaveModelElevatedAction, model, options, !!triedToUnlock));
            }
            // Unlock
            else if (isWriteLocked) {
                primaryActions.push(this.instantiationService.createInstance(UnlockModelAction, model, options));
            }
            // Retry
            else {
                primaryActions.push(this.instantiationService.createInstance(RetrySaveModelAction, model, options));
            }
            // Save As
            primaryActions.push(this.instantiationService.createInstance(SaveModelAsAction, model));
            // Revert
            primaryActions.push(this.instantiationService.createInstance(RevertModelAction, model));
            // Message
            if (isWriteLocked) {
                if (triedToUnlock && canSaveElevated) {
                    message = isWindows ? localize('readonlySaveErrorAdmin', "Failed to save '{0}': File is read-only. Select 'Overwrite as Admin' to retry as administrator.", basename(resource)) : localize('readonlySaveErrorSudo', "Failed to save '{0}': File is read-only. Select 'Overwrite as Sudo' to retry as superuser.", basename(resource));
                }
                else {
                    message = localize('readonlySaveError', "Failed to save '{0}': File is read-only. Select 'Overwrite' to attempt to make it writeable.", basename(resource));
                }
            }
            else if (canSaveElevated && isPermissionDenied) {
                message = isWindows ? localize('permissionDeniedSaveError', "Failed to save '{0}': Insufficient permissions. Select 'Retry as Admin' to retry as administrator.", basename(resource)) : localize('permissionDeniedSaveErrorSudo', "Failed to save '{0}': Insufficient permissions. Select 'Retry as Sudo' to retry as superuser.", basename(resource));
            }
            else {
                message = localize({ key: 'genericSaveError', comment: ['{0} is the resource that failed to save and {1} the error message'] }, "Failed to save '{0}': {1}", basename(resource), toErrorMessage(error, false));
            }
        }
        // Show message and keep function to hide in case the file gets saved/reverted
        const actions = { primary: primaryActions, secondary: secondaryActions };
        const handle = this.notificationService.notify({
            id: `${hash(model.resource.toString())}`, // unique per model (https://github.com/microsoft/vscode/issues/121539)
            severity: Severity.Error,
            message,
            actions
        });
        Event.once(handle.onDidClose)(() => { dispose(primaryActions); dispose(secondaryActions); });
        this.messages.set(model.resource, handle);
    }
    dispose() {
        super.dispose();
        this.messages.clear();
    }
};
TextFileSaveErrorHandler = __decorate([
    __param(0, INotificationService),
    __param(1, ITextFileService),
    __param(2, IContextKeyService),
    __param(3, IEditorService),
    __param(4, ITextModelService),
    __param(5, IInstantiationService),
    __param(6, IStorageService)
], TextFileSaveErrorHandler);
export { TextFileSaveErrorHandler };
const pendingResolveSaveConflictMessages = [];
function clearPendingResolveSaveConflictMessages() {
    while (pendingResolveSaveConflictMessages.length > 0) {
        const item = pendingResolveSaveConflictMessages.pop();
        item?.close();
    }
}
let ResolveConflictLearnMoreAction = class ResolveConflictLearnMoreAction extends Action {
    constructor(openerService) {
        super('workbench.files.action.resolveConflictLearnMore', localize('learnMore', "Learn More"));
        this.openerService = openerService;
    }
    async run() {
        await this.openerService.open(URI.parse('https://go.microsoft.com/fwlink/?linkid=868264'));
    }
};
ResolveConflictLearnMoreAction = __decorate([
    __param(0, IOpenerService)
], ResolveConflictLearnMoreAction);
let DoNotShowResolveConflictLearnMoreAction = class DoNotShowResolveConflictLearnMoreAction extends Action {
    constructor(storageService) {
        super('workbench.files.action.resolveConflictLearnMoreDoNotShowAgain', localize('dontShowAgain', "Don't Show Again"));
        this.storageService = storageService;
    }
    async run(notification) {
        // Remember this as application state
        this.storageService.store(LEARN_MORE_DIRTY_WRITE_IGNORE_KEY, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        // Hide notification
        notification.dispose();
    }
};
DoNotShowResolveConflictLearnMoreAction = __decorate([
    __param(0, IStorageService)
], DoNotShowResolveConflictLearnMoreAction);
let ResolveSaveConflictAction = class ResolveSaveConflictAction extends Action {
    constructor(model, editorService, notificationService, instantiationService, productService) {
        super('workbench.files.action.resolveConflict', localize('compareChanges', "Compare"));
        this.model = model;
        this.editorService = editorService;
        this.notificationService = notificationService;
        this.instantiationService = instantiationService;
        this.productService = productService;
    }
    async run() {
        if (!this.model.isDisposed()) {
            const resource = this.model.resource;
            const name = basename(resource);
            const editorLabel = localize('saveConflictDiffLabel', "{0} (in file) ↔ {1} (in {2}) - Resolve save conflict", name, name, this.productService.nameLong);
            await TextFileContentProvider.open(resource, CONFLICT_RESOLUTION_SCHEME, editorLabel, this.editorService, { pinned: true });
            // Show additional help how to resolve the save conflict
            const actions = { primary: [this.instantiationService.createInstance(ResolveConflictLearnMoreAction)] };
            const handle = this.notificationService.notify({
                id: `${hash(resource.toString())}`, // unique per model
                severity: Severity.Info,
                message: conflictEditorHelp,
                actions,
                neverShowAgain: { id: LEARN_MORE_DIRTY_WRITE_IGNORE_KEY, isSecondary: true }
            });
            Event.once(handle.onDidClose)(() => dispose(actions.primary));
            pendingResolveSaveConflictMessages.push(handle);
        }
    }
};
ResolveSaveConflictAction = __decorate([
    __param(1, IEditorService),
    __param(2, INotificationService),
    __param(3, IInstantiationService),
    __param(4, IProductService)
], ResolveSaveConflictAction);
class SaveModelElevatedAction extends Action {
    constructor(model, options, triedToUnlock) {
        super('workbench.files.action.saveModelElevated', triedToUnlock ? isWindows ? localize('overwriteElevated', "Overwrite as Admin...") : localize('overwriteElevatedSudo', "Overwrite as Sudo...") : isWindows ? localize('saveElevated', "Retry as Admin...") : localize('saveElevatedSudo', "Retry as Sudo..."));
        this.model = model;
        this.options = options;
        this.triedToUnlock = triedToUnlock;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.save({
                ...this.options,
                writeElevated: true,
                writeUnlock: this.triedToUnlock,
                reason: 1 /* SaveReason.EXPLICIT */
            });
        }
    }
}
class RetrySaveModelAction extends Action {
    constructor(model, options) {
        super('workbench.files.action.saveModel', localize('retry', "Retry"));
        this.model = model;
        this.options = options;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.save({ ...this.options, reason: 1 /* SaveReason.EXPLICIT */ });
        }
    }
}
class RevertModelAction extends Action {
    constructor(model) {
        super('workbench.files.action.revertModel', localize('revert', "Revert"));
        this.model = model;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.revert();
        }
    }
}
let SaveModelAsAction = class SaveModelAsAction extends Action {
    constructor(model, editorService) {
        super('workbench.files.action.saveModelAs', SAVE_FILE_AS_LABEL.value);
        this.model = model;
        this.editorService = editorService;
    }
    async run() {
        if (!this.model.isDisposed()) {
            const editor = this.findEditor();
            if (editor) {
                await this.editorService.save(editor, { saveAs: true, reason: 1 /* SaveReason.EXPLICIT */ });
            }
        }
    }
    findEditor() {
        let preferredMatchingEditor;
        const editors = this.editorService.findEditors(this.model.resource, { supportSideBySide: SideBySideEditor.PRIMARY });
        for (const identifier of editors) {
            if (identifier.editor instanceof FileEditorInput) {
                // We prefer a `FileEditorInput` for "Save As", but it is possible
                // that a custom editor is leveraging the text file model and as
                // such we need to fallback to any other editor having the resource
                // opened for running the save.
                preferredMatchingEditor = identifier;
                break;
            }
            else if (!preferredMatchingEditor) {
                preferredMatchingEditor = identifier;
            }
        }
        return preferredMatchingEditor;
    }
};
SaveModelAsAction = __decorate([
    __param(1, IEditorService)
], SaveModelAsAction);
class UnlockModelAction extends Action {
    constructor(model, options) {
        super('workbench.files.action.unlock', localize('overwrite', "Overwrite"));
        this.model = model;
        this.options = options;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.save({ ...this.options, writeUnlock: true, reason: 1 /* SaveReason.EXPLICIT */ });
        }
    }
}
class SaveModelIgnoreModifiedSinceAction extends Action {
    constructor(model, options) {
        super('workbench.files.action.saveIgnoreModifiedSince', localize('overwrite', "Overwrite"));
        this.model = model;
        this.options = options;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.save({ ...this.options, ignoreModifiedSince: true, reason: 1 /* SaveReason.EXPLICIT */ });
        }
    }
}
let ConfigureSaveConflictAction = class ConfigureSaveConflictAction extends Action {
    constructor(preferencesService) {
        super('workbench.files.action.configureSaveConflict', localize('configure', "Configure"));
        this.preferencesService = preferencesService;
    }
    async run() {
        this.preferencesService.openSettings({ query: 'files.saveConflictResolution' });
    }
};
ConfigureSaveConflictAction = __decorate([
    __param(0, IPreferencesService)
], ConfigureSaveConflictAction);
export const acceptLocalChangesCommand = (accessor, resource) => {
    return acceptOrRevertLocalChangesCommand(accessor, resource, true);
};
export const revertLocalChangesCommand = (accessor, resource) => {
    return acceptOrRevertLocalChangesCommand(accessor, resource, false);
};
async function acceptOrRevertLocalChangesCommand(accessor, resource, accept) {
    const editorService = accessor.get(IEditorService);
    const editorPane = editorService.activeEditorPane;
    if (!editorPane) {
        return;
    }
    const editor = editorPane.input;
    const group = editorPane.group;
    // Hide any previously shown message about how to use these actions
    clearPendingResolveSaveConflictMessages();
    // Accept or revert
    if (accept) {
        const options = { ignoreModifiedSince: true, reason: 1 /* SaveReason.EXPLICIT */ };
        await editorService.save({ editor, groupId: group.id }, options);
    }
    else {
        await editorService.revert({ editor, groupId: group.id });
    }
    // Reopen original editor
    await editorService.openEditor({ resource }, group);
    // Clean up
    return group.closeEditor(editor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTYXZlRXJyb3JIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZWRpdG9ycy90ZXh0RmlsZVNhdmVFcnJvckhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLGdCQUFnQixFQUF5RixNQUFNLG1EQUFtRCxDQUFDO0FBQzVLLE9BQU8sRUFBb0IscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVBQWUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDL0UsT0FBTyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0Is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