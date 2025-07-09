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
var MainThreadCustomEditorModel_1;
import { multibyteAwareBtoa } from '../../../base/browser/dom.js';
import { createCancelablePromise } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { isCancellationError, onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { basename } from '../../../base/common/path.js';
import { isEqual, isEqualOrParent, toLocalResource } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { localize } from '../../../nls.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { reviveWebviewExtension } from './mainThreadWebviews.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { CustomEditorInput } from '../../contrib/customEditor/browser/customEditorInput.js';
import { ICustomEditorService } from '../../contrib/customEditor/common/customEditor.js';
import { CustomTextEditorModel } from '../../contrib/customEditor/common/customTextEditorModel.js';
import { ExtensionKeyedWebviewOriginStore } from '../../contrib/webview/browser/webview.js';
import { IWebviewWorkbenchService } from '../../contrib/webviewPanel/browser/webviewWorkbenchService.js';
import { editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { ResourceWorkingCopy } from '../../services/workingCopy/common/resourceWorkingCopy.js';
import { NO_TYPE_ID } from '../../services/workingCopy/common/workingCopy.js';
import { IWorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
var CustomEditorModelType;
(function (CustomEditorModelType) {
    CustomEditorModelType[CustomEditorModelType["Custom"] = 0] = "Custom";
    CustomEditorModelType[CustomEditorModelType["Text"] = 1] = "Text";
})(CustomEditorModelType || (CustomEditorModelType = {}));
let MainThreadCustomEditors = class MainThreadCustomEditors extends Disposable {
    constructor(context, mainThreadWebview, mainThreadWebviewPanels, extensionService, storageService, workingCopyService, workingCopyFileService, _customEditorService, _editorGroupService, _editorService, _instantiationService, _webviewWorkbenchService, _uriIdentityService) {
        super();
        this.mainThreadWebview = mainThreadWebview;
        this.mainThreadWebviewPanels = mainThreadWebviewPanels;
        this._customEditorService = _customEditorService;
        this._editorGroupService = _editorGroupService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._webviewWorkbenchService = _webviewWorkbenchService;
        this._uriIdentityService = _uriIdentityService;
        this._editorProviders = this._register(new DisposableMap());
        this._editorRenameBackups = new Map();
        this._webviewOriginStore = new ExtensionKeyedWebviewOriginStore('mainThreadCustomEditors.origins', storageService);
        this._proxyCustomEditors = context.getProxy(extHostProtocol.ExtHostContext.ExtHostCustomEditors);
        this._register(workingCopyFileService.registerWorkingCopyProvider((editorResource) => {
            const matchedWorkingCopies = [];
            for (const workingCopy of workingCopyService.workingCopies) {
                if (workingCopy instanceof MainThreadCustomEditorModel) {
                    if (isEqualOrParent(editorResource, workingCopy.editorResource)) {
                        matchedWorkingCopies.push(workingCopy);
                    }
                }
            }
            return matchedWorkingCopies;
        }));
        // This reviver's only job is to activate custom editor extensions.
        this._register(_webviewWorkbenchService.registerResolver({
            canResolve: (webview) => {
                if (webview instanceof CustomEditorInput) {
                    extensionService.activateByEvent(`onCustomEditor:${webview.viewType}`);
                }
                return false;
            },
            resolveWebview: () => { throw new Error('not implemented'); }
        }));
        // Working copy operations
        this._register(workingCopyFileService.onWillRunWorkingCopyFileOperation(async (e) => this.onWillRunWorkingCopyFileOperation(e)));
    }
    $registerTextEditorProvider(extensionData, viewType, options, capabilities, serializeBuffersForPostMessage) {
        this.registerEditorProvider(1 /* CustomEditorModelType.Text */, reviveWebviewExtension(extensionData), viewType, options, capabilities, true, serializeBuffersForPostMessage);
    }
    $registerCustomEditorProvider(extensionData, viewType, options, supportsMultipleEditorsPerDocument, serializeBuffersForPostMessage) {
        this.registerEditorProvider(0 /* CustomEditorModelType.Custom */, reviveWebviewExtension(extensionData), viewType, options, {}, supportsMultipleEditorsPerDocument, serializeBuffersForPostMessage);
    }
    registerEditorProvider(modelType, extension, viewType, options, capabilities, supportsMultipleEditorsPerDocument, serializeBuffersForPostMessage) {
        if (this._editorProviders.has(viewType)) {
            throw new Error(`Provider for ${viewType} already registered`);
        }
        const disposables = new DisposableStore();
        disposables.add(this._customEditorService.registerCustomEditorCapabilities(viewType, {
            supportsMultipleEditorsPerDocument
        }));
        disposables.add(this._webviewWorkbenchService.registerResolver({
            canResolve: (webviewInput) => {
                return webviewInput instanceof CustomEditorInput && webviewInput.viewType === viewType;
            },
            resolveWebview: async (webviewInput, cancellation) => {
                const handle = generateUuid();
                const resource = webviewInput.resource;
                webviewInput.webview.origin = this._webviewOriginStore.getOrigin(viewType, extension.id);
                this.mainThreadWebviewPanels.addWebviewInput(handle, webviewInput, { serializeBuffersForPostMessage });
                webviewInput.webview.options = options;
                webviewInput.webview.extension = extension;
                // If there's an old resource this was a move and we must resolve the backup at the same time as the webview
                // This is because the backup must be ready upon model creation, and the input resolve method comes after
                let backupId = webviewInput.backupId;
                if (webviewInput.oldResource && !webviewInput.backupId) {
                    const backup = this._editorRenameBackups.get(webviewInput.oldResource.toString());
                    backupId = backup?.backupId;
                    this._editorRenameBackups.delete(webviewInput.oldResource.toString());
                }
                let modelRef;
                try {
                    modelRef = await this.getOrCreateCustomEditorModel(modelType, resource, viewType, { backupId }, cancellation);
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewInput.webview.setHtml(this.mainThreadWebview.getWebviewResolvedFailedContent(viewType));
                    return;
                }
                if (cancellation.isCancellationRequested) {
                    modelRef.dispose();
                    return;
                }
                const disposeSub = webviewInput.webview.onDidDispose(() => {
                    disposeSub.dispose();
                    // If the model is still dirty, make sure we have time to save it
                    if (modelRef.object.isDirty()) {
                        const sub = modelRef.object.onDidChangeDirty(() => {
                            if (!modelRef.object.isDirty()) {
                                sub.dispose();
                                modelRef.dispose();
                            }
                        });
                        return;
                    }
                    modelRef.dispose();
                });
                if (capabilities.supportsMove) {
                    webviewInput.onMove(async (newResource) => {
                        const oldModel = modelRef;
                        modelRef = await this.getOrCreateCustomEditorModel(modelType, newResource, viewType, {}, CancellationToken.None);
                        this._proxyCustomEditors.$onMoveCustomEditor(handle, newResource, viewType);
                        oldModel.dispose();
                    });
                }
                try {
                    await this._proxyCustomEditors.$resolveCustomEditor(this._uriIdentityService.asCanonicalUri(resource), handle, viewType, {
                        title: webviewInput.getTitle(),
                        contentOptions: webviewInput.webview.contentOptions,
                        options: webviewInput.webview.options,
                        active: webviewInput === this._editorService.activeEditor,
                    }, editorGroupToColumn(this._editorGroupService, webviewInput.group || 0), cancellation);
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewInput.webview.setHtml(this.mainThreadWebview.getWebviewResolvedFailedContent(viewType));
                    modelRef.dispose();
                    return;
                }
            }
        }));
        this._editorProviders.set(viewType, disposables);
    }
    $unregisterEditorProvider(viewType) {
        if (!this._editorProviders.has(viewType)) {
            throw new Error(`No provider for ${viewType} registered`);
        }
        this._editorProviders.deleteAndDispose(viewType);
        this._customEditorService.models.disposeAllModelsForView(viewType);
    }
    async getOrCreateCustomEditorModel(modelType, resource, viewType, options, cancellation) {
        const existingModel = this._customEditorService.models.tryRetain(resource, viewType);
        if (existingModel) {
            return existingModel;
        }
        switch (modelType) {
            case 1 /* CustomEditorModelType.Text */:
                {
                    const model = CustomTextEditorModel.create(this._instantiationService, viewType, resource);
                    return this._customEditorService.models.add(resource, viewType, model);
                }
            case 0 /* CustomEditorModelType.Custom */:
                {
                    const model = MainThreadCustomEditorModel.create(this._instantiationService, this._proxyCustomEditors, viewType, resource, options, () => {
                        return Array.from(this.mainThreadWebviewPanels.webviewInputs)
                            .filter(editor => editor instanceof CustomEditorInput && isEqual(editor.resource, resource));
                    }, cancellation);
                    return this._customEditorService.models.add(resource, viewType, model);
                }
        }
    }
    async $onDidEdit(resourceComponents, viewType, editId, label) {
        const model = await this.getCustomEditorModel(resourceComponents, viewType);
        model.pushEdit(editId, label);
    }
    async $onContentChange(resourceComponents, viewType) {
        const model = await this.getCustomEditorModel(resourceComponents, viewType);
        model.changeContent();
    }
    async getCustomEditorModel(resourceComponents, viewType) {
        const resource = URI.revive(resourceComponents);
        const model = await this._customEditorService.models.get(resource, viewType);
        if (!model || !(model instanceof MainThreadCustomEditorModel)) {
            throw new Error('Could not find model for webview editor');
        }
        return model;
    }
    //#region Working Copy
    async onWillRunWorkingCopyFileOperation(e) {
        if (e.operation !== 2 /* FileOperation.MOVE */) {
            return;
        }
        e.waitUntil((async () => {
            const models = [];
            for (const file of e.files) {
                if (file.source) {
                    models.push(...(await this._customEditorService.models.getAllModels(file.source)));
                }
            }
            for (const model of models) {
                if (model instanceof MainThreadCustomEditorModel && model.isDirty()) {
                    const workingCopy = await model.backup(CancellationToken.None);
                    if (workingCopy.meta) {
                        // This cast is safe because we do an instanceof check above and a custom document backup data is always returned
                        this._editorRenameBackups.set(model.editorResource.toString(), workingCopy.meta);
                    }
                }
            }
        })());
    }
};
MainThreadCustomEditors = __decorate([
    __param(3, IExtensionService),
    __param(4, IStorageService),
    __param(5, IWorkingCopyService),
    __param(6, IWorkingCopyFileService),
    __param(7, ICustomEditorService),
    __param(8, IEditorGroupsService),
    __param(9, IEditorService),
    __param(10, IInstantiationService),
    __param(11, IWebviewWorkbenchService),
    __param(12, IUriIdentityService)
], MainThreadCustomEditors);
export { MainThreadCustomEditors };
var HotExitState;
(function (HotExitState) {
    let Type;
    (function (Type) {
        Type[Type["Allowed"] = 0] = "Allowed";
        Type[Type["NotAllowed"] = 1] = "NotAllowed";
        Type[Type["Pending"] = 2] = "Pending";
    })(Type = HotExitState.Type || (HotExitState.Type = {}));
    HotExitState.Allowed = Object.freeze({ type: 0 /* Type.Allowed */ });
    HotExitState.NotAllowed = Object.freeze({ type: 1 /* Type.NotAllowed */ });
    class Pending {
        constructor(operation) {
            this.operation = operation;
            this.type = 2 /* Type.Pending */;
        }
    }
    HotExitState.Pending = Pending;
})(HotExitState || (HotExitState = {}));
let MainThreadCustomEditorModel = MainThreadCustomEditorModel_1 = class MainThreadCustomEditorModel extends ResourceWorkingCopy {
    static async create(instantiationService, proxy, viewType, resource, options, getEditors, cancellation) {
        const editors = getEditors();
        let untitledDocumentData;
        if (editors.length !== 0) {
            untitledDocumentData = editors[0].untitledDocumentData;
        }
        const { editable } = await proxy.$createCustomDocument(resource, viewType, options.backupId, untitledDocumentData, cancellation);
        return instantiationService.createInstance(MainThreadCustomEditorModel_1, proxy, viewType, resource, !!options.backupId, editable, !!untitledDocumentData, getEditors);
    }
    constructor(_proxy, _viewType, _editorResource, fromBackup, _editable, startDirty, _getEditors, _fileDialogService, fileService, _labelService, _undoService, _environmentService, workingCopyService, _pathService, extensionService) {
        super(MainThreadCustomEditorModel_1.toWorkingCopyResource(_viewType, _editorResource), fileService);
        this._proxy = _proxy;
        this._viewType = _viewType;
        this._editorResource = _editorResource;
        this._editable = _editable;
        this._getEditors = _getEditors;
        this._fileDialogService = _fileDialogService;
        this._labelService = _labelService;
        this._undoService = _undoService;
        this._environmentService = _environmentService;
        this._pathService = _pathService;
        this._fromBackup = false;
        this._hotExitState = HotExitState.Allowed;
        this._currentEditIndex = -1;
        this._savePoint = -1;
        this._edits = [];
        this._isDirtyFromContentChange = false;
        // TODO@mjbvz consider to enable a `typeId` that is specific for custom
        // editors. Using a distinct `typeId` allows the working copy to have
        // any resource (including file based resources) even if other working
        // copies exist with the same resource.
        //
        // IMPORTANT: changing the `typeId` has an impact on backups for this
        // working copy. Any value that is not the empty string will be used
        // as seed to the backup. Only change the `typeId` if you have implemented
        // a fallback solution to resolve any existing backups that do not have
        // this seed.
        this.typeId = NO_TYPE_ID;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this.onDidChangeReadonly = Event.None;
        this._fromBackup = fromBackup;
        if (_editable) {
            this._register(workingCopyService.registerWorkingCopy(this));
            this._register(extensionService.onWillStop(e => {
                e.veto(true, localize('vetoExtHostRestart', "An extension provided editor for '{0}' is still open that would close otherwise.", this.name));
            }));
        }
        // Normally means we're re-opening an untitled file
        if (startDirty) {
            this._isDirtyFromContentChange = true;
        }
    }
    get editorResource() {
        return this._editorResource;
    }
    dispose() {
        if (this._editable) {
            this._undoService.removeElements(this._editorResource);
        }
        this._proxy.$disposeCustomDocument(this._editorResource, this._viewType);
        super.dispose();
    }
    //#region IWorkingCopy
    // Make sure each custom editor has a unique resource for backup and edits
    static toWorkingCopyResource(viewType, resource) {
        const authority = viewType.replace(/[^a-z0-9\-_]/gi, '-');
        const path = `/${multibyteAwareBtoa(resource.with({ query: null, fragment: null }).toString(true))}`;
        return URI.from({
            scheme: Schemas.vscodeCustomEditor,
            authority: authority,
            path: path,
            query: JSON.stringify(resource.toJSON()),
        });
    }
    get name() {
        return basename(this._labelService.getUriLabel(this._editorResource));
    }
    get capabilities() {
        return this.isUntitled() ? 2 /* WorkingCopyCapabilities.Untitled */ : 0 /* WorkingCopyCapabilities.None */;
    }
    isDirty() {
        if (this._isDirtyFromContentChange) {
            return true;
        }
        if (this._edits.length > 0) {
            return this._savePoint !== this._currentEditIndex;
        }
        return this._fromBackup;
    }
    isUntitled() {
        return this._editorResource.scheme === Schemas.untitled;
    }
    //#endregion
    isReadonly() {
        return !this._editable;
    }
    get viewType() {
        return this._viewType;
    }
    get backupId() {
        return this._backupId;
    }
    pushEdit(editId, label) {
        if (!this._editable) {
            throw new Error('Document is not editable');
        }
        this.change(() => {
            this.spliceEdits(editId);
            this._currentEditIndex = this._edits.length - 1;
        });
        this._undoService.pushElement({
            type: 0 /* UndoRedoElementType.Resource */,
            resource: this._editorResource,
            label: label ?? localize('defaultEditLabel', "Edit"),
            code: 'undoredo.customEditorEdit',
            undo: () => this.undo(),
            redo: () => this.redo(),
        });
    }
    changeContent() {
        this.change(() => {
            this._isDirtyFromContentChange = true;
        });
    }
    async undo() {
        if (!this._editable) {
            return;
        }
        if (this._currentEditIndex < 0) {
            // nothing to undo
            return;
        }
        const undoneEdit = this._edits[this._currentEditIndex];
        this.change(() => {
            --this._currentEditIndex;
        });
        await this._proxy.$undo(this._editorResource, this.viewType, undoneEdit, this.isDirty());
    }
    async redo() {
        if (!this._editable) {
            return;
        }
        if (this._currentEditIndex >= this._edits.length - 1) {
            // nothing to redo
            return;
        }
        const redoneEdit = this._edits[this._currentEditIndex + 1];
        this.change(() => {
            ++this._currentEditIndex;
        });
        await this._proxy.$redo(this._editorResource, this.viewType, redoneEdit, this.isDirty());
    }
    spliceEdits(editToInsert) {
        const start = this._currentEditIndex + 1;
        const toRemove = this._edits.length - this._currentEditIndex;
        const removedEdits = typeof editToInsert === 'number'
            ? this._edits.splice(start, toRemove, editToInsert)
            : this._edits.splice(start, toRemove);
        if (removedEdits.length) {
            this._proxy.$disposeEdits(this._editorResource, this._viewType, removedEdits);
        }
    }
    change(makeEdit) {
        const wasDirty = this.isDirty();
        makeEdit();
        this._onDidChangeContent.fire();
        if (this.isDirty() !== wasDirty) {
            this._onDidChangeDirty.fire();
        }
    }
    async revert(options) {
        if (!this._editable) {
            return;
        }
        if (this._currentEditIndex === this._savePoint && !this._isDirtyFromContentChange && !this._fromBackup) {
            return;
        }
        if (!options?.soft) {
            this._proxy.$revert(this._editorResource, this.viewType, CancellationToken.None);
        }
        this.change(() => {
            this._isDirtyFromContentChange = false;
            this._fromBackup = false;
            this._currentEditIndex = this._savePoint;
            this.spliceEdits();
        });
    }
    async save(options) {
        const result = !!await this.saveCustomEditor(options);
        // Emit Save Event
        if (result) {
            this._onDidSave.fire({ reason: options?.reason, source: options?.source });
        }
        return result;
    }
    async saveCustomEditor(options) {
        if (!this._editable) {
            return undefined;
        }
        if (this.isUntitled()) {
            const targetUri = await this.suggestUntitledSavePath(options);
            if (!targetUri) {
                return undefined;
            }
            await this.saveCustomEditorAs(this._editorResource, targetUri, options);
            return targetUri;
        }
        const savePromise = createCancelablePromise(token => this._proxy.$onSave(this._editorResource, this.viewType, token));
        this._ongoingSave?.cancel();
        this._ongoingSave = savePromise;
        try {
            await savePromise;
            if (this._ongoingSave === savePromise) { // Make sure we are still doing the same save
                this.change(() => {
                    this._isDirtyFromContentChange = false;
                    this._savePoint = this._currentEditIndex;
                    this._fromBackup = false;
                });
            }
        }
        finally {
            if (this._ongoingSave === savePromise) { // Make sure we are still doing the same save
                this._ongoingSave = undefined;
            }
        }
        return this._editorResource;
    }
    suggestUntitledSavePath(options) {
        if (!this.isUntitled()) {
            throw new Error('Resource is not untitled');
        }
        const remoteAuthority = this._environmentService.remoteAuthority;
        const localResource = toLocalResource(this._editorResource, remoteAuthority, this._pathService.defaultUriScheme);
        return this._fileDialogService.pickFileToSave(localResource, options?.availableFileSystems);
    }
    async saveCustomEditorAs(resource, targetResource, _options) {
        if (this._editable) {
            // TODO: handle cancellation
            await createCancelablePromise(token => this._proxy.$onSaveAs(this._editorResource, this.viewType, targetResource, token));
            this.change(() => {
                this._savePoint = this._currentEditIndex;
            });
            return true;
        }
        else {
            // Since the editor is readonly, just copy the file over
            await this.fileService.copy(resource, targetResource, false /* overwrite */);
            return true;
        }
    }
    get canHotExit() { return typeof this._backupId === 'string' && this._hotExitState.type === 0 /* HotExitState.Type.Allowed */; }
    async backup(token) {
        const editors = this._getEditors();
        if (!editors.length) {
            throw new Error('No editors found for resource, cannot back up');
        }
        const primaryEditor = editors[0];
        const backupMeta = {
            viewType: this.viewType,
            editorResource: this._editorResource,
            backupId: '',
            extension: primaryEditor.extension ? {
                id: primaryEditor.extension.id.value,
                location: primaryEditor.extension.location,
            } : undefined,
            webview: {
                origin: primaryEditor.webview.origin,
                options: primaryEditor.webview.options,
                state: primaryEditor.webview.state,
            }
        };
        const backupData = {
            meta: backupMeta
        };
        if (!this._editable) {
            return backupData;
        }
        if (this._hotExitState.type === 2 /* HotExitState.Type.Pending */) {
            this._hotExitState.operation.cancel();
        }
        const pendingState = new HotExitState.Pending(createCancelablePromise(token => this._proxy.$backup(this._editorResource.toJSON(), this.viewType, token)));
        this._hotExitState = pendingState;
        token.onCancellationRequested(() => {
            pendingState.operation.cancel();
        });
        let errorMessage = '';
        try {
            const backupId = await pendingState.operation;
            // Make sure state has not changed in the meantime
            if (this._hotExitState === pendingState) {
                this._hotExitState = HotExitState.Allowed;
                backupData.meta.backupId = backupId;
                this._backupId = backupId;
            }
        }
        catch (e) {
            if (isCancellationError(e)) {
                // This is expected
                throw e;
            }
            // Otherwise it could be a real error. Make sure state has not changed in the meantime.
            if (this._hotExitState === pendingState) {
                this._hotExitState = HotExitState.NotAllowed;
            }
            if (e.message) {
                errorMessage = e.message;
            }
        }
        if (this._hotExitState === HotExitState.Allowed) {
            return backupData;
        }
        throw new Error(`Cannot backup in this state: ${errorMessage}`);
    }
};
MainThreadCustomEditorModel = MainThreadCustomEditorModel_1 = __decorate([
    __param(7, IFileDialogService),
    __param(8, IFileService),
    __param(9, ILabelService),
    __param(10, IUndoRedoService),
    __param(11, IWorkbenchEnvironmentService),
    __param(12, IWorkingCopyService),
    __param(13, IPathService),
    __param(14, IExtensionService)
], MainThreadCustomEditorModel);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEN1c3RvbUVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDdXN0b21FZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNsRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFM0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWMsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNqRixPQUFPLEVBQWlCLFlBQVksRUFB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