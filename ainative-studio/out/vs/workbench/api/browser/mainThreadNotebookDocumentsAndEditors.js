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
var MainThreadNotebooksAndEditors_1;
import { diffMaps, diffSets } from '../../../base/common/collections.js';
import { combinedDisposable, DisposableStore, DisposableMap } from '../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { MainThreadNotebookDocuments } from './mainThreadNotebookDocuments.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
import { MainThreadNotebookEditors } from './mainThreadNotebookEditors.js';
import { extHostCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { getNotebookEditorFromEditorPane } from '../../contrib/notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../contrib/notebook/browser/services/notebookEditorService.js';
import { INotebookService } from '../../contrib/notebook/common/notebookService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
class NotebookAndEditorState {
    static delta(before, after) {
        if (!before) {
            return {
                addedDocuments: [...after.documents],
                removedDocuments: [],
                addedEditors: [...after.textEditors.values()],
                removedEditors: [],
                visibleEditors: [...after.visibleEditors].map(editor => editor[0])
            };
        }
        const documentDelta = diffSets(before.documents, after.documents);
        const editorDelta = diffMaps(before.textEditors, after.textEditors);
        const newActiveEditor = before.activeEditor !== after.activeEditor ? after.activeEditor : undefined;
        const visibleEditorDelta = diffMaps(before.visibleEditors, after.visibleEditors);
        return {
            addedDocuments: documentDelta.added,
            removedDocuments: documentDelta.removed.map(e => e.uri),
            addedEditors: editorDelta.added,
            removedEditors: editorDelta.removed.map(removed => removed.getId()),
            newActiveEditor: newActiveEditor,
            visibleEditors: visibleEditorDelta.added.length === 0 && visibleEditorDelta.removed.length === 0
                ? undefined
                : [...after.visibleEditors].map(editor => editor[0])
        };
    }
    constructor(documents, textEditors, activeEditor, visibleEditors) {
        this.documents = documents;
        this.textEditors = textEditors;
        this.activeEditor = activeEditor;
        this.visibleEditors = visibleEditors;
        //
    }
}
let MainThreadNotebooksAndEditors = MainThreadNotebooksAndEditors_1 = class MainThreadNotebooksAndEditors {
    constructor(extHostContext, instantiationService, _notebookService, _notebookEditorService, _editorService, _editorGroupService, _logService) {
        this._notebookService = _notebookService;
        this._notebookEditorService = _notebookEditorService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._logService = _logService;
        this._disposables = new DisposableStore();
        this._editorListeners = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebook);
        this._mainThreadNotebooks = instantiationService.createInstance(MainThreadNotebookDocuments, extHostContext);
        this._mainThreadEditors = instantiationService.createInstance(MainThreadNotebookEditors, extHostContext);
        extHostContext.set(MainContext.MainThreadNotebookDocuments, this._mainThreadNotebooks);
        extHostContext.set(MainContext.MainThreadNotebookEditors, this._mainThreadEditors);
        this._notebookService.onWillAddNotebookDocument(() => this._updateState(), this, this._disposables);
        this._notebookService.onDidRemoveNotebookDocument(() => this._updateState(), this, this._disposables);
        this._editorService.onDidActiveEditorChange(() => this._updateState(), this, this._disposables);
        this._editorService.onDidVisibleEditorsChange(() => this._updateState(), this, this._disposables);
        this._notebookEditorService.onDidAddNotebookEditor(this._handleEditorAdd, this, this._disposables);
        this._notebookEditorService.onDidRemoveNotebookEditor(this._handleEditorRemove, this, this._disposables);
        this._updateState();
    }
    dispose() {
        this._mainThreadNotebooks.dispose();
        this._mainThreadEditors.dispose();
        this._disposables.dispose();
        this._editorListeners.dispose();
    }
    _handleEditorAdd(editor) {
        this._editorListeners.set(editor.getId(), combinedDisposable(editor.onDidChangeModel(() => this._updateState()), editor.onDidFocusWidget(() => this._updateState(editor))));
        this._updateState();
    }
    _handleEditorRemove(editor) {
        this._editorListeners.deleteAndDispose(editor.getId());
        this._updateState();
    }
    _updateState(focusedEditor) {
        const editors = new Map();
        const visibleEditorsMap = new Map();
        for (const editor of this._notebookEditorService.listNotebookEditors()) {
            if (editor.hasModel()) {
                editors.set(editor.getId(), editor);
            }
        }
        const activeNotebookEditor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        let activeEditor = null;
        if (activeNotebookEditor) {
            activeEditor = activeNotebookEditor.getId();
        }
        else if (focusedEditor?.textModel) {
            activeEditor = focusedEditor.getId();
        }
        if (activeEditor && !editors.has(activeEditor)) {
            this._logService.trace('MainThreadNotebooksAndEditors#_updateState: active editor is not in editors list', activeEditor, editors.keys());
            activeEditor = null;
        }
        for (const editorPane of this._editorService.visibleEditorPanes) {
            const notebookEditor = getNotebookEditorFromEditorPane(editorPane);
            if (notebookEditor?.hasModel() && editors.has(notebookEditor.getId())) {
                visibleEditorsMap.set(notebookEditor.getId(), notebookEditor);
            }
        }
        const newState = new NotebookAndEditorState(new Set(this._notebookService.listNotebookDocuments()), editors, activeEditor, visibleEditorsMap);
        this._onDelta(NotebookAndEditorState.delta(this._currentState, newState));
        this._currentState = newState;
    }
    _onDelta(delta) {
        if (MainThreadNotebooksAndEditors_1._isDeltaEmpty(delta)) {
            return;
        }
        const dto = {
            removedDocuments: delta.removedDocuments,
            removedEditors: delta.removedEditors,
            newActiveEditor: delta.newActiveEditor,
            visibleEditors: delta.visibleEditors,
            addedDocuments: delta.addedDocuments.map(MainThreadNotebooksAndEditors_1._asModelAddData),
            addedEditors: delta.addedEditors.map(this._asEditorAddData, this),
        };
        // send to extension FIRST
        this._proxy.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers(dto));
        // handle internally
        this._mainThreadEditors.handleEditorsRemoved(delta.removedEditors);
        this._mainThreadNotebooks.handleNotebooksRemoved(delta.removedDocuments);
        this._mainThreadNotebooks.handleNotebooksAdded(delta.addedDocuments);
        this._mainThreadEditors.handleEditorsAdded(delta.addedEditors);
    }
    static _isDeltaEmpty(delta) {
        if (delta.addedDocuments !== undefined && delta.addedDocuments.length > 0) {
            return false;
        }
        if (delta.removedDocuments !== undefined && delta.removedDocuments.length > 0) {
            return false;
        }
        if (delta.addedEditors !== undefined && delta.addedEditors.length > 0) {
            return false;
        }
        if (delta.removedEditors !== undefined && delta.removedEditors.length > 0) {
            return false;
        }
        if (delta.visibleEditors !== undefined && delta.visibleEditors.length > 0) {
            return false;
        }
        if (delta.newActiveEditor !== undefined) {
            return false;
        }
        return true;
    }
    static _asModelAddData(e) {
        return {
            viewType: e.viewType,
            uri: e.uri,
            metadata: e.metadata,
            versionId: e.versionId,
            cells: e.cells.map(NotebookDto.toNotebookCellDto)
        };
    }
    _asEditorAddData(add) {
        const pane = this._editorService.visibleEditorPanes.find(pane => getNotebookEditorFromEditorPane(pane) === add);
        return {
            id: add.getId(),
            documentUri: add.textModel.uri,
            selections: add.getSelections(),
            visibleRanges: add.visibleRanges,
            viewColumn: pane && editorGroupToColumn(this._editorGroupService, pane.group),
            viewType: add.getViewModel().viewType
        };
    }
};
MainThreadNotebooksAndEditors = MainThreadNotebooksAndEditors_1 = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService),
    __param(2, INotebookService),
    __param(3, INotebookEditorService),
    __param(4, IEditorService),
    __param(5, IEditorGroupsService),
    __param(6, ILogService)
], MainThreadNotebooksAndEditors);
export { MainThreadNotebooksAndEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rRG9jdW1lbnRzQW5kRWRpdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE5vdGVib29rRG9jdW1lbnRzQW5kRWRpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXZHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDekQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUN4RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsK0JBQStCLEVBQTBDLE1BQU0sbURBQW1ELENBQUM7QUFDNUksT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFMUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDM0YsT0FBTyxFQUFFLGNBQWMs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