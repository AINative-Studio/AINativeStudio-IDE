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
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { dispose, Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { shouldSynchronizeModel } from '../../../editor/common/model.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { ExtHostContext } from '../common/extHost.protocol.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { toLocalResource, extUri } from '../../../base/common/resources.js';
import { IWorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { ResourceMap } from '../../../base/common/map.js';
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
export class BoundModelReferenceCollection {
    constructor(_extUri, _maxAge = 1000 * 60 * 3, // auto-dispse by age
    _maxLength = 1024 * 1024 * 80, // auto-dispose by total length
    _maxSize = 50 // auto-dispose by number of references
    ) {
        this._extUri = _extUri;
        this._maxAge = _maxAge;
        this._maxLength = _maxLength;
        this._maxSize = _maxSize;
        this._data = new Array();
        this._length = 0;
        //
    }
    dispose() {
        this._data = dispose(this._data);
    }
    remove(uri) {
        for (const entry of [...this._data] /* copy array because dispose will modify it */) {
            if (this._extUri.isEqualOrParent(entry.uri, uri)) {
                entry.dispose();
            }
        }
    }
    add(uri, ref, length = 0) {
        // const length = ref.object.textEditorModel.getValueLength();
        const dispose = () => {
            const idx = this._data.indexOf(entry);
            if (idx >= 0) {
                this._length -= length;
                ref.dispose();
                clearTimeout(handle);
                this._data.splice(idx, 1);
            }
        };
        const handle = setTimeout(dispose, this._maxAge);
        const entry = { uri, length, dispose };
        this._data.push(entry);
        this._length += length;
        this._cleanup();
    }
    _cleanup() {
        // clean-up wrt total length
        while (this._length > this._maxLength) {
            this._data[0].dispose();
        }
        // clean-up wrt number of documents
        const extraSize = Math.ceil(this._maxSize * 1.2);
        if (this._data.length >= extraSize) {
            dispose(this._data.slice(0, extraSize - this._maxSize));
        }
    }
}
class ModelTracker extends Disposable {
    constructor(_model, _onIsCaughtUpWithContentChanges, _proxy, _textFileService) {
        super();
        this._model = _model;
        this._onIsCaughtUpWithContentChanges = _onIsCaughtUpWithContentChanges;
        this._proxy = _proxy;
        this._textFileService = _textFileService;
        this._knownVersionId = this._model.getVersionId();
        this._store.add(this._model.onDidChangeContent((e) => {
            this._knownVersionId = e.versionId;
            this._proxy.$acceptModelChanged(this._model.uri, e, this._textFileService.isDirty(this._model.uri));
            if (this.isCaughtUpWithContentChanges()) {
                this._onIsCaughtUpWithContentChanges.fire(this._model.uri);
            }
        }));
    }
    isCaughtUpWithContentChanges() {
        return (this._model.getVersionId() === this._knownVersionId);
    }
}
let MainThreadDocuments = class MainThreadDocuments extends Disposable {
    constructor(extHostContext, _modelService, _textFileService, _fileService, _textModelResolverService, _environmentService, _uriIdentityService, workingCopyFileService, _pathService) {
        super();
        this._modelService = _modelService;
        this._textFileService = _textFileService;
        this._fileService = _fileService;
        this._textModelResolverService = _textModelResolverService;
        this._environmentService = _environmentService;
        this._uriIdentityService = _uriIdentityService;
        this._pathService = _pathService;
        this._onIsCaughtUpWithContentChanges = this._store.add(new Emitter());
        this.onIsCaughtUpWithContentChanges = this._onIsCaughtUpWithContentChanges.event;
        this._modelTrackers = new ResourceMap();
        this._modelReferenceCollection = this._store.add(new BoundModelReferenceCollection(_uriIdentityService.extUri));
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocuments);
        this._store.add(_modelService.onModelLanguageChanged(this._onModelModeChanged, this));
        this._store.add(_textFileService.files.onDidSave(e => {
            if (this._shouldHandleFileEvent(e.model.resource)) {
                this._proxy.$acceptModelSaved(e.model.resource);
            }
        }));
        this._store.add(_textFileService.files.onDidChangeDirty(m => {
            if (this._shouldHandleFileEvent(m.resource)) {
                this._proxy.$acceptDirtyStateChanged(m.resource, m.isDirty());
            }
        }));
        this._store.add(Event.any(_textFileService.files.onDidChangeEncoding, _textFileService.untitled.onDidChangeEncoding)(m => {
            if (this._shouldHandleFileEvent(m.resource)) {
                const encoding = m.getEncoding();
                if (encoding) {
                    this._proxy.$acceptEncodingChanged(m.resource, encoding);
                }
            }
        }));
        this._store.add(workingCopyFileService.onDidRunWorkingCopyFileOperation(e => {
            const isMove = e.operation === 2 /* FileOperation.MOVE */;
            if (isMove || e.operation === 1 /* FileOperation.DELETE */) {
                for (const pair of e.files) {
                    const removed = isMove ? pair.source : pair.target;
                    if (removed) {
                        this._modelReferenceCollection.remove(removed);
                    }
                }
            }
        }));
    }
    dispose() {
        dispose(this._modelTrackers.values());
        this._modelTrackers.clear();
        super.dispose();
    }
    isCaughtUpWithContentChanges(resource) {
        const tracker = this._modelTrackers.get(resource);
        if (tracker) {
            return tracker.isCaughtUpWithContentChanges();
        }
        return true;
    }
    _shouldHandleFileEvent(resource) {
        const model = this._modelService.getModel(resource);
        return !!model && shouldSynchronizeModel(model);
    }
    handleModelAdded(model) {
        // Same filter as in mainThreadEditorsTracker
        if (!shouldSynchronizeModel(model)) {
            // don't synchronize too large models
            return;
        }
        this._modelTrackers.set(model.uri, new ModelTracker(model, this._onIsCaughtUpWithContentChanges, this._proxy, this._textFileService));
    }
    _onModelModeChanged(event) {
        const { model } = event;
        if (!this._modelTrackers.has(model.uri)) {
            return;
        }
        this._proxy.$acceptModelLanguageChanged(model.uri, model.getLanguageId());
    }
    handleModelRemoved(modelUrl) {
        if (!this._modelTrackers.has(modelUrl)) {
            return;
        }
        this._modelTrackers.get(modelUrl).dispose();
        this._modelTrackers.delete(modelUrl);
    }
    // --- from extension host process
    async $trySaveDocument(uri) {
        const target = await this._textFileService.save(URI.revive(uri));
        return Boolean(target);
    }
    async $tryOpenDocument(uriData, options) {
        const inputUri = URI.revive(uriData);
        if (!inputUri.scheme || !(inputUri.fsPath || inputUri.authority)) {
            throw new ErrorNoTelemetry(`Invalid uri. Scheme and authority or path must be set.`);
        }
        const canonicalUri = this._uriIdentityService.asCanonicalUri(inputUri);
        let promise;
        switch (canonicalUri.scheme) {
            case Schemas.untitled:
                promise = this._handleUntitledScheme(canonicalUri, options);
                break;
            case Schemas.file:
            default:
                promise = this._handleAsResourceInput(canonicalUri, options);
                break;
        }
        let documentUri;
        try {
            documentUri = await promise;
        }
        catch (err) {
            throw new ErrorNoTelemetry(`cannot open ${canonicalUri.toString()}. Detail: ${toErrorMessage(err)}`);
        }
        if (!documentUri) {
            throw new ErrorNoTelemetry(`cannot open ${canonicalUri.toString()}`);
        }
        else if (!extUri.isEqual(documentUri, canonicalUri)) {
            throw new ErrorNoTelemetry(`cannot open ${canonicalUri.toString()}. Detail: Actual document opened as ${documentUri.toString()}`);
        }
        else if (!this._modelTrackers.has(canonicalUri)) {
            throw new ErrorNoTelemetry(`cannot open ${canonicalUri.toString()}. Detail: Files above 50MB cannot be synchronized with extensions.`);
        }
        else {
            return canonicalUri;
        }
    }
    $tryCreateDocument(options) {
        return this._doCreateUntitled(undefined, options);
    }
    async _handleAsResourceInput(uri, options) {
        if (options?.encoding) {
            const model = await this._textFileService.files.resolve(uri, { encoding: options.encoding, reason: 2 /* TextFileResolveReason.REFERENCE */ });
            if (model.isDirty()) {
                throw new ErrorNoTelemetry(`Cannot re-open a dirty text document with different encoding. Save it first.`);
            }
            await model.setEncoding(options.encoding, 1 /* EncodingMode.Decode */);
        }
        const ref = await this._textModelResolverService.createModelReference(uri);
        this._modelReferenceCollection.add(uri, ref, ref.object.textEditorModel.getValueLength());
        return ref.object.textEditorModel.uri;
    }
    async _handleUntitledScheme(uri, options) {
        const asLocalUri = toLocalResource(uri, this._environmentService.remoteAuthority, this._pathService.defaultUriScheme);
        const exists = await this._fileService.exists(asLocalUri);
        if (exists) {
            // don't create a new file ontop of an existing file
            return Promise.reject(new Error('file already exists'));
        }
        return await this._doCreateUntitled(Boolean(uri.path) ? uri : undefined, options);
    }
    async _doCreateUntitled(associatedResource, options) {
        const model = this._textFileService.untitled.create({
            associatedResource,
            languageId: options?.language,
            initialValue: options?.content,
            encoding: options?.encoding
        });
        const resource = model.resource;
        const ref = await this._textModelResolverService.createModelReference(resource);
        if (!this._modelTrackers.has(resource)) {
            ref.dispose();
            throw new Error(`expected URI ${resource.toString()} to have come to LIFE`);
        }
        this._modelReferenceCollection.add(resource, ref, ref.object.textEditorModel.getValueLength());
        Event.once(model.onDidRevert)(() => this._modelReferenceCollection.remove(resource));
        this._proxy.$acceptDirtyStateChanged(resource, true); // mark as dirty
        return resource;
    }
};
MainThreadDocuments = __decorate([
    __param(1, IModelService),
    __param(2, ITextFileService),
    __param(3, IFileService),
    __param(4, ITextModelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IUriIdentityService),
    __param(7, IWorkingCopyFileService),
    __param(8, IPathService)
], MainThreadDocuments);
export { MainThreadDocuments };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZERvY3VtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFjLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQWMsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBaUIsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFtRCxNQUFNLCtCQUErQixDQUFDO0FBQ2hILE9BQU8sRUFBc0MsZ0JBQWdCLEVBQXlCLE1BQU0sNkNBQTZDLENBQUM7QUFFMUksT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQVcsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtB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