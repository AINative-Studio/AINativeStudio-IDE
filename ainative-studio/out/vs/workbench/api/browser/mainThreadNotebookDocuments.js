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
import { Event } from '../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { BoundModelReferenceCollection } from './mainThreadDocuments.js';
import { NotebookCellsChangeType } from '../../contrib/notebook/common/notebookCommon.js';
import { INotebookEditorModelResolverService } from '../../contrib/notebook/common/notebookEditorModelResolverService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { ExtHostContext } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
let MainThreadNotebookDocuments = class MainThreadNotebookDocuments {
    constructor(extHostContext, _notebookEditorModelResolverService, _uriIdentityService) {
        this._notebookEditorModelResolverService = _notebookEditorModelResolverService;
        this._uriIdentityService = _uriIdentityService;
        this._disposables = new DisposableStore();
        this._documentEventListenersMapping = new ResourceMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookDocuments);
        this._modelReferenceCollection = new BoundModelReferenceCollection(this._uriIdentityService.extUri);
        // forward dirty and save events
        this._disposables.add(this._notebookEditorModelResolverService.onDidChangeDirty(model => this._proxy.$acceptDirtyStateChanged(model.resource, model.isDirty())));
        this._disposables.add(this._notebookEditorModelResolverService.onDidSaveNotebook(e => this._proxy.$acceptModelSaved(e)));
        // when a conflict is going to happen RELEASE references that are held by extensions
        this._disposables.add(_notebookEditorModelResolverService.onWillFailWithConflict(e => {
            this._modelReferenceCollection.remove(e.resource);
        }));
    }
    dispose() {
        this._disposables.dispose();
        this._modelReferenceCollection.dispose();
        dispose(this._documentEventListenersMapping.values());
    }
    handleNotebooksAdded(notebooks) {
        for (const textModel of notebooks) {
            const disposableStore = new DisposableStore();
            disposableStore.add(textModel.onDidChangeContent(event => {
                const eventDto = {
                    versionId: event.versionId,
                    rawEvents: []
                };
                for (const e of event.rawEvents) {
                    switch (e.kind) {
                        case NotebookCellsChangeType.ModelChange:
                            eventDto.rawEvents.push({
                                kind: e.kind,
                                changes: e.changes.map(diff => [diff[0], diff[1], diff[2].map(cell => NotebookDto.toNotebookCellDto(cell))])
                            });
                            break;
                        case NotebookCellsChangeType.Move:
                            eventDto.rawEvents.push({
                                kind: e.kind,
                                index: e.index,
                                length: e.length,
                                newIdx: e.newIdx,
                            });
                            break;
                        case NotebookCellsChangeType.Output:
                            eventDto.rawEvents.push({
                                kind: e.kind,
                                index: e.index,
                                outputs: e.outputs.map(NotebookDto.toNotebookOutputDto)
                            });
                            break;
                        case NotebookCellsChangeType.OutputItem:
                            eventDto.rawEvents.push({
                                kind: e.kind,
                                index: e.index,
                                outputId: e.outputId,
                                outputItems: e.outputItems.map(NotebookDto.toNotebookOutputItemDto),
                                append: e.append
                            });
                            break;
                        case NotebookCellsChangeType.ChangeCellLanguage:
                        case NotebookCellsChangeType.ChangeCellContent:
                        case NotebookCellsChangeType.ChangeCellMetadata:
                        case NotebookCellsChangeType.ChangeCellInternalMetadata:
                            eventDto.rawEvents.push(e);
                            break;
                    }
                }
                const hasDocumentMetadataChangeEvent = event.rawEvents.find(e => e.kind === NotebookCellsChangeType.ChangeDocumentMetadata);
                // using the model resolver service to know if the model is dirty or not.
                // assuming this is the first listener it can mean that at first the model
                // is marked as dirty and that another event is fired
                this._proxy.$acceptModelChanged(textModel.uri, new SerializableObjectWithBuffers(eventDto), this._notebookEditorModelResolverService.isDirty(textModel.uri), hasDocumentMetadataChangeEvent ? textModel.metadata : undefined);
            }));
            this._documentEventListenersMapping.set(textModel.uri, disposableStore);
        }
    }
    handleNotebooksRemoved(uris) {
        for (const uri of uris) {
            this._documentEventListenersMapping.get(uri)?.dispose();
            this._documentEventListenersMapping.delete(uri);
        }
    }
    async $tryCreateNotebook(options) {
        if (options.content) {
            const ref = await this._notebookEditorModelResolverService.resolve({ untitledResource: undefined }, options.viewType);
            // untitled notebooks are disposed when they get saved. we should not hold a reference
            // to such a disposed notebook and therefore dispose the reference as well
            Event.once(ref.object.notebook.onWillDispose)(() => {
                ref.dispose();
            });
            // untitled notebooks with content are dirty by default
            this._proxy.$acceptDirtyStateChanged(ref.object.resource, true);
            // apply content changes... slightly HACKY -> this triggers a change event
            if (options.content) {
                const data = NotebookDto.fromNotebookDataDto(options.content);
                ref.object.notebook.reset(data.cells, data.metadata, ref.object.notebook.transientOptions);
            }
            return ref.object.notebook.uri;
        }
        else {
            // If we aren't adding content, we don't need to resolve the full editor model yet.
            // This will allow us to adjust settings when the editor is opened, e.g. scratchpad
            const notebook = await this._notebookEditorModelResolverService.createUntitledNotebookTextModel(options.viewType);
            return notebook.uri;
        }
    }
    async $tryOpenNotebook(uriComponents) {
        const uri = URI.revive(uriComponents);
        const ref = await this._notebookEditorModelResolverService.resolve(uri, undefined);
        if (uriComponents.scheme === 'untitled') {
            // untitled notebooks are disposed when they get saved. we should not hold a reference
            // to such a disposed notebook and therefore dispose the reference as well
            ref.object.notebook.onWillDispose(() => {
                ref.dispose();
            });
        }
        this._modelReferenceCollection.add(uri, ref);
        return uri;
    }
    async $trySaveNotebook(uriComponents) {
        const uri = URI.revive(uriComponents);
        const ref = await this._notebookEditorModelResolverService.resolve(uri);
        const saveResult = await ref.object.save();
        ref.dispose();
        return saveResult;
    }
};
MainThreadNotebookDocuments = __decorate([
    __param(1, INotebookEditorModelResolverService),
    __param(2, IUriIdentityService)
], MainThreadNotebookDocuments);
export { MainThreadNotebookDocuments };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rRG9jdW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTm90ZWJvb2tEb2N1bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFekUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDMUgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBbUksTUFBTSwrQkFBK0IsQ0FBQztBQUNoTSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDekQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFHN0YsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBMkI7SUFRdkMsWUFDQyxjQUErQixFQUNNLG1DQUF5RixFQUN6RyxtQkFBeUQ7UUFEeEIsd0NBQW1DLEdBQW5DLG1DQUFtQyxDQUFxQztRQUN4Rix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBVDlELGlCQUFZLEdB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