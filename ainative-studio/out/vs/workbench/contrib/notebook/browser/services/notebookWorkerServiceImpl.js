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
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../../base/common/lifecycle.js';
import { createWebWorker } from '../../../../../base/browser/webWorkerFactory.js';
import { CellUri, NotebookCellsChangeType } from '../../common/notebookCommon.js';
import { INotebookService } from '../../common/notebookService.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { FileAccess, Schemas } from '../../../../../base/common/network.js';
import { isEqual } from '../../../../../base/common/resources.js';
let NotebookEditorWorkerServiceImpl = class NotebookEditorWorkerServiceImpl extends Disposable {
    constructor(notebookService, modelService) {
        super();
        this._workerManager = this._register(new WorkerManager(notebookService, modelService));
    }
    canComputeDiff(original, modified) {
        throw new Error('Method not implemented.');
    }
    computeDiff(original, modified) {
        return this._workerManager.withWorker().then(client => {
            return client.computeDiff(original, modified);
        });
    }
    canPromptRecommendation(model) {
        return this._workerManager.withWorker().then(client => {
            return client.canPromptRecommendation(model);
        });
    }
};
NotebookEditorWorkerServiceImpl = __decorate([
    __param(0, INotebookService),
    __param(1, IModelService)
], NotebookEditorWorkerServiceImpl);
export { NotebookEditorWorkerServiceImpl };
class WorkerManager extends Disposable {
    // private _lastWorkerUsedTime: number;
    constructor(_notebookService, _modelService) {
        super();
        this._notebookService = _notebookService;
        this._modelService = _modelService;
        this._editorWorkerClient = null;
        // this._lastWorkerUsedTime = (new Date()).getTime();
    }
    withWorker() {
        // this._lastWorkerUsedTime = (new Date()).getTime();
        if (!this._editorWorkerClient) {
            this._editorWorkerClient = new NotebookWorkerClient(this._notebookService, this._modelService);
            this._register(this._editorWorkerClient);
        }
        return Promise.resolve(this._editorWorkerClient);
    }
}
class NotebookEditorModelManager extends Disposable {
    constructor(_proxy, _notebookService, _modelService) {
        super();
        this._proxy = _proxy;
        this._notebookService = _notebookService;
        this._modelService = _modelService;
        this._syncedModels = Object.create(null);
        this._syncedModelsLastUsedTime = Object.create(null);
    }
    ensureSyncedResources(resources) {
        for (const resource of resources) {
            const resourceStr = resource.toString();
            if (!this._syncedModels[resourceStr]) {
                this._beginModelSync(resource);
            }
            if (this._syncedModels[resourceStr]) {
                this._syncedModelsLastUsedTime[resourceStr] = (new Date()).getTime();
            }
        }
    }
    _beginModelSync(resource) {
        const model = this._notebookService.listNotebookDocuments().find(document => document.uri.toString() === resource.toString());
        if (!model) {
            return;
        }
        const modelUrl = resource.toString();
        this._proxy.$acceptNewModel(model.uri.toString(), model.metadata, model.transientOptions.transientDocumentMetadata, model.cells.map(cell => ({
            handle: cell.handle,
            url: cell.uri.toString(),
            source: cell.textBuffer.getLinesContent(),
            eol: cell.textBuffer.getEOL(),
            versionId: cell.textModel?.getVersionId() ?? 0,
            language: cell.language,
            mime: cell.mime,
            cellKind: cell.cellKind,
            outputs: cell.outputs.map(op => ({ outputId: op.outputId, outputs: op.outputs })),
            metadata: cell.metadata,
            internalMetadata: cell.internalMetadata,
        })));
        const toDispose = new DisposableStore();
        const cellToDto = (cell) => {
            return {
                handle: cell.handle,
                url: cell.uri.toString(),
                source: cell.textBuffer.getLinesContent(),
                eol: cell.textBuffer.getEOL(),
                versionId: 0,
                language: cell.language,
                cellKind: cell.cellKind,
                outputs: cell.outputs.map(op => ({ outputId: op.outputId, outputs: op.outputs })),
                metadata: cell.metadata,
                internalMetadata: cell.internalMetadata,
            };
        };
        const cellHandlers = new Set();
        const addCellContentChangeHandler = (cell) => {
            cellHandlers.add(cell);
            toDispose.add(cell.onDidChangeContent((e) => {
                if (typeof e === 'object' && e.type === 'model') {
                    this._proxy.$acceptCellModelChanged(modelUrl, cell.handle, e.event);
                }
            }));
        };
        model.cells.forEach(cell => addCellContentChangeHandler(cell));
        // Possible some of the models have not yet been loaded.
        // If all have been loaded, for all cells, then no need to listen to model add events.
        if (model.cells.length !== cellHandlers.size) {
            toDispose.add(this._modelService.onModelAdded((textModel) => {
                if (textModel.uri.scheme !== Schemas.vscodeNotebookCell || !(textModel instanceof TextModel)) {
                    return;
                }
                const cellUri = CellUri.parse(textModel.uri);
                if (!cellUri || !isEqual(cellUri.notebook, model.uri)) {
                    return;
                }
                const cell = model.cells.find(cell => cell.handle === cellUri.handle);
                if (cell) {
                    addCellContentChangeHandler(cell);
                }
            }));
        }
        toDispose.add(model.onDidChangeContent((event) => {
            const dto = [];
            event.rawEvents
                .forEach(e => {
                switch (e.kind) {
                    case NotebookCellsChangeType.ModelChange:
                    case NotebookCellsChangeType.Initialize: {
                        dto.push({
                            kind: e.kind,
                            changes: e.changes.map(diff => [diff[0], diff[1], diff[2].map(cell => cellToDto(cell))])
                        });
                        for (const change of e.changes) {
                            for (const cell of change[2]) {
                                addCellContentChangeHandler(cell);
                            }
                        }
                        break;
                    }
                    case NotebookCellsChangeType.Move: {
                        dto.push({
                            kind: NotebookCellsChangeType.Move,
                            index: e.index,
                            length: e.length,
                            newIdx: e.newIdx,
                            cells: e.cells.map(cell => cellToDto(cell))
                        });
                        break;
                    }
                    case NotebookCellsChangeType.ChangeCellContent:
                        // Changes to cell content are handled by the cell model change listener.
                        break;
                    case NotebookCellsChangeType.ChangeDocumentMetadata:
                        dto.push({
                            kind: e.kind,
                            metadata: e.metadata
                        });
                    default:
                        dto.push(e);
                }
            });
            this._proxy.$acceptModelChanged(modelUrl.toString(), {
                rawEvents: dto,
                versionId: event.versionId
            });
        }));
        toDispose.add(model.onWillDispose(() => {
            this._stopModelSync(modelUrl);
        }));
        toDispose.add(toDisposable(() => {
            this._proxy.$acceptRemovedModel(modelUrl);
        }));
        this._syncedModels[modelUrl] = toDispose;
    }
    _stopModelSync(modelUrl) {
        const toDispose = this._syncedModels[modelUrl];
        delete this._syncedModels[modelUrl];
        delete this._syncedModelsLastUsedTime[modelUrl];
        dispose(toDispose);
    }
}
class NotebookWorkerClient extends Disposable {
    constructor(_notebookService, _modelService) {
        super();
        this._notebookService = _notebookService;
        this._modelService = _modelService;
        this._worker = null;
        this._modelManager = null;
    }
    computeDiff(original, modified) {
        const proxy = this._ensureSyncedResources([original, modified]);
        return proxy.$computeDiff(original.toString(), modified.toString());
    }
    canPromptRecommendation(modelUri) {
        const proxy = this._ensureSyncedResources([modelUri]);
        return proxy.$canPromptRecommendation(modelUri.toString());
    }
    _getOrCreateModelManager(proxy) {
        if (!this._modelManager) {
            this._modelManager = this._register(new NotebookEditorModelManager(proxy, this._notebookService, this._modelService));
        }
        return this._modelManager;
    }
    _ensureSyncedResources(resources) {
        const proxy = this._getOrCreateWorker().proxy;
        this._getOrCreateModelManager(proxy).ensureSyncedResources(resources);
        return proxy;
    }
    _getOrCreateWorker() {
        if (!this._worker) {
            try {
                this._worker = this._register(createWebWorker(FileAccess.asBrowserUri('vs/workbench/contrib/notebook/common/services/notebookWebWorkerMain.js'), 'NotebookEditorWorker'));
            }
            catch (err) {
                throw (err);
            }
        }
        return this._worker;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tXb3JrZXJTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3NlcnZpY2VzL25vdGVib29rV29ya2VyU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRzFILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVsRixPQUFPLEVBQUUsT0FBTyxFQUFxQyx1QkFBdUIsRUFBOEIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqSixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUduRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTNELElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQWdDLFNBQVEsVUFBVTtJQUs5RCxZQUNtQixlQUFpQyxFQUNwQyxZQUEyQjtRQUUxQyxLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBQ0QsY0FBYyxDQUFDLFFBQWEsRUFBRSxRQUFhO1FBQzFD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