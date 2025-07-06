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
import { combinedDisposable, DisposableStore, DisposableMap } from '../../../base/common/lifecycle.js';
import { isCodeEditor, isDiffEditor } from '../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { shouldSynchronizeModel } from '../../../editor/common/model.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { extHostCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { MainThreadDocuments } from './mainThreadDocuments.js';
import { MainThreadTextEditor } from './mainThreadEditor.js';
import { MainThreadTextEditors } from './mainThreadEditors.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { AbstractTextEditor } from '../../browser/parts/editor/textEditor.js';
import { editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IWorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { diffSets, diffMaps } from '../../../base/common/collections.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IQuickDiffModelService } from '../../contrib/scm/browser/quickDiffModel.js';
class TextEditorSnapshot {
    constructor(editor) {
        this.editor = editor;
        this.id = `${editor.getId()},${editor.getModel().id}`;
    }
}
class DocumentAndEditorStateDelta {
    constructor(removedDocuments, addedDocuments, removedEditors, addedEditors, oldActiveEditor, newActiveEditor) {
        this.removedDocuments = removedDocuments;
        this.addedDocuments = addedDocuments;
        this.removedEditors = removedEditors;
        this.addedEditors = addedEditors;
        this.oldActiveEditor = oldActiveEditor;
        this.newActiveEditor = newActiveEditor;
        this.isEmpty = this.removedDocuments.length === 0
            && this.addedDocuments.length === 0
            && this.removedEditors.length === 0
            && this.addedEditors.length === 0
            && oldActiveEditor === newActiveEditor;
    }
    toString() {
        let ret = 'DocumentAndEditorStateDelta\n';
        ret += `\tRemoved Documents: [${this.removedDocuments.map(d => d.uri.toString(true)).join(', ')}]\n`;
        ret += `\tAdded Documents: [${this.addedDocuments.map(d => d.uri.toString(true)).join(', ')}]\n`;
        ret += `\tRemoved Editors: [${this.removedEditors.map(e => e.id).join(', ')}]\n`;
        ret += `\tAdded Editors: [${this.addedEditors.map(e => e.id).join(', ')}]\n`;
        ret += `\tNew Active Editor: ${this.newActiveEditor}\n`;
        return ret;
    }
}
class DocumentAndEditorState {
    static compute(before, after) {
        if (!before) {
            return new DocumentAndEditorStateDelta([], [...after.documents.values()], [], [...after.textEditors.values()], undefined, after.activeEditor);
        }
        const documentDelta = diffSets(before.documents, after.documents);
        const editorDelta = diffMaps(before.textEditors, after.textEditors);
        const oldActiveEditor = before.activeEditor !== after.activeEditor ? before.activeEditor : undefined;
        const newActiveEditor = before.activeEditor !== after.activeEditor ? after.activeEditor : undefined;
        return new DocumentAndEditorStateDelta(documentDelta.removed, documentDelta.added, editorDelta.removed, editorDelta.added, oldActiveEditor, newActiveEditor);
    }
    constructor(documents, textEditors, activeEditor) {
        this.documents = documents;
        this.textEditors = textEditors;
        this.activeEditor = activeEditor;
        //
    }
}
var ActiveEditorOrder;
(function (ActiveEditorOrder) {
    ActiveEditorOrder[ActiveEditorOrder["Editor"] = 0] = "Editor";
    ActiveEditorOrder[ActiveEditorOrder["Panel"] = 1] = "Panel";
})(ActiveEditorOrder || (ActiveEditorOrder = {}));
let MainThreadDocumentAndEditorStateComputer = class MainThreadDocumentAndEditorStateComputer {
    constructor(_onDidChangeState, _modelService, _codeEditorService, _editorService, _paneCompositeService) {
        this._onDidChangeState = _onDidChangeState;
        this._modelService = _modelService;
        this._codeEditorService = _codeEditorService;
        this._editorService = _editorService;
        this._paneCompositeService = _paneCompositeService;
        this._toDispose = new DisposableStore();
        this._toDisposeOnEditorRemove = new DisposableMap();
        this._activeEditorOrder = 0 /* ActiveEditorOrder.Editor */;
        this._modelService.onModelAdded(this._updateStateOnModelAdd, this, this._toDispose);
        this._modelService.onModelRemoved(_ => this._updateState(), this, this._toDispose);
        this._editorService.onDidActiveEditorChange(_ => this._updateState(), this, this._toDispose);
        this._codeEditorService.onCodeEditorAdd(this._onDidAddEditor, this, this._toDispose);
        this._codeEditorService.onCodeEditorRemove(this._onDidRemoveEditor, this, this._toDispose);
        this._codeEditorService.listCodeEditors().forEach(this._onDidAddEditor, this);
        Event.filter(this._paneCompositeService.onDidPaneCompositeOpen, event => event.viewContainerLocation === 1 /* ViewContainerLocation.Panel */)(_ => this._activeEditorOrder = 1 /* ActiveEditorOrder.Panel */, undefined, this._toDispose);
        Event.filter(this._paneCompositeService.onDidPaneCompositeClose, event => event.viewContainerLocation === 1 /* ViewContainerLocation.Panel */)(_ => this._activeEditorOrder = 0 /* ActiveEditorOrder.Editor */, undefined, this._toDispose);
        this._editorService.onDidVisibleEditorsChange(_ => this._activeEditorOrder = 0 /* ActiveEditorOrder.Editor */, undefined, this._toDispose);
        this._updateState();
    }
    dispose() {
        this._toDispose.dispose();
        this._toDisposeOnEditorRemove.dispose();
    }
    _onDidAddEditor(e) {
        this._toDisposeOnEditorRemove.set(e.getId(), combinedDisposable(e.onDidChangeModel(() => this._updateState()), e.onDidFocusEditorText(() => this._updateState()), e.onDidFocusEditorWidget(() => this._updateState(e))));
        this._updateState();
    }
    _onDidRemoveEditor(e) {
        const id = e.getId();
        if (this._toDisposeOnEditorRemove.has(id)) {
            this._toDisposeOnEditorRemove.deleteAndDispose(id);
            this._updateState();
        }
    }
    _updateStateOnModelAdd(model) {
        if (!shouldSynchronizeModel(model)) {
            // ignore
            return;
        }
        if (!this._currentState) {
            // too early
            this._updateState();
            return;
        }
        // small (fast) delta
        this._currentState = new DocumentAndEditorState(this._currentState.documents.add(model), this._currentState.textEditors, this._currentState.activeEditor);
        this._onDidChangeState(new DocumentAndEditorStateDelta([], [model], [], [], undefined, undefined));
    }
    _updateState(widgetFocusCandidate) {
        // models: ignore too large models
        const models = new Set();
        for (const model of this._modelService.getModels()) {
            if (shouldSynchronizeModel(model)) {
                models.add(model);
            }
        }
        // editor: only take those that have a not too large model
        const editors = new Map();
        let activeEditor = null; // Strict null work. This doesn't like being undefined!
        for (const editor of this._codeEditorService.listCodeEditors()) {
            if (editor.isSimpleWidget) {
                continue;
            }
            const model = editor.getModel();
            if (editor.hasModel() && model && shouldSynchronizeModel(model)
                && !model.isDisposed() // model disposed
                && Boolean(this._modelService.getModel(model.uri)) // model disposing, the flag didn't flip yet but the model service already removed it
            ) {
                const apiEditor = new TextEditorSnapshot(editor);
                editors.set(apiEditor.id, apiEditor);
                if (editor.hasTextFocus() || (widgetFocusCandidate === editor && editor.hasWidgetFocus())) {
                    // text focus has priority, widget focus is tricky because multiple
                    // editors might claim widget focus at the same time. therefore we use a
                    // candidate (which is the editor that has raised an widget focus event)
                    // in addition to the widget focus check
                    activeEditor = apiEditor.id;
                }
            }
        }
        // active editor: if none of the previous editors had focus we try
        // to match output panels or the active workbench editor with
        // one of editor we have just computed
        if (!activeEditor) {
            let candidate;
            if (this._activeEditorOrder === 0 /* ActiveEditorOrder.Editor */) {
                candidate = this._getActiveEditorFromEditorPart() || this._getActiveEditorFromPanel();
            }
            else {
                candidate = this._getActiveEditorFromPanel() || this._getActiveEditorFromEditorPart();
            }
            if (candidate) {
                for (const snapshot of editors.values()) {
                    if (candidate === snapshot.editor) {
                        activeEditor = snapshot.id;
                    }
                }
            }
        }
        // compute new state and compare against old
        const newState = new DocumentAndEditorState(models, editors, activeEditor);
        const delta = DocumentAndEditorState.compute(this._currentState, newState);
        if (!delta.isEmpty) {
            this._currentState = newState;
            this._onDidChangeState(delta);
        }
    }
    _getActiveEditorFromPanel() {
        const panel = this._paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        if (panel instanceof AbstractTextEditor) {
            const control = panel.getControl();
            if (isCodeEditor(control)) {
                return control;
            }
        }
        return undefined;
    }
    _getActiveEditorFromEditorPart() {
        let activeTextEditorControl = this._editorService.activeTextEditorControl;
        if (isDiffEditor(activeTextEditorControl)) {
            activeTextEditorControl = activeTextEditorControl.getModifiedEditor();
        }
        return activeTextEditorControl;
    }
};
MainThreadDocumentAndEditorStateComputer = __decorate([
    __param(1, IModelService),
    __param(2, ICodeEditorService),
    __param(3, IEditorService),
    __param(4, IPaneCompositePartService)
], MainThreadDocumentAndEditorStateComputer);
let MainThreadDocumentsAndEditors = class MainThreadDocumentsAndEditors {
    constructor(extHostContext, _modelService, _textFileService, _editorService, codeEditorService, fileService, textModelResolverService, _editorGroupService, paneCompositeService, environmentService, workingCopyFileService, uriIdentityService, _clipboardService, pathService, configurationService, quickDiffModelService) {
        this._modelService = _modelService;
        this._textFileService = _textFileService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._clipboardService = _clipboardService;
        this._toDispose = new DisposableStore();
        this._textEditors = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocumentsAndEditors);
        this._mainThreadDocuments = this._toDispose.add(new MainThreadDocuments(extHostContext, this._modelService, this._textFileService, fileService, textModelResolverService, environmentService, uriIdentityService, workingCopyFileService, pathService));
        extHostContext.set(MainContext.MainThreadDocuments, this._mainThreadDocuments);
        this._mainThreadEditors = this._toDispose.add(new MainThreadTextEditors(this, extHostContext, codeEditorService, this._editorService, this._editorGroupService, configurationService, quickDiffModelService, uriIdentityService));
        extHostContext.set(MainContext.MainThreadTextEditors, this._mainThreadEditors);
        // It is expected that the ctor of the state computer calls our `_onDelta`.
        this._toDispose.add(new MainThreadDocumentAndEditorStateComputer(delta => this._onDelta(delta), _modelService, codeEditorService, this._editorService, paneCompositeService));
    }
    dispose() {
        this._toDispose.dispose();
    }
    _onDelta(delta) {
        const removedEditors = [];
        const addedEditors = [];
        // removed models
        const removedDocuments = delta.removedDocuments.map(m => m.uri);
        // added editors
        for (const apiEditor of delta.addedEditors) {
            const mainThreadEditor = new MainThreadTextEditor(apiEditor.id, apiEditor.editor.getModel(), apiEditor.editor, { onGainedFocus() { }, onLostFocus() { } }, this._mainThreadDocuments, this._modelService, this._clipboardService);
            this._textEditors.set(apiEditor.id, mainThreadEditor);
            addedEditors.push(mainThreadEditor);
        }
        // removed editors
        for (const { id } of delta.removedEditors) {
            const mainThreadEditor = this._textEditors.get(id);
            if (mainThreadEditor) {
                mainThreadEditor.dispose();
                this._textEditors.delete(id);
                removedEditors.push(id);
            }
        }
        const extHostDelta = Object.create(null);
        let empty = true;
        if (delta.newActiveEditor !== undefined) {
            empty = false;
            extHostDelta.newActiveEditor = delta.newActiveEditor;
        }
        if (removedDocuments.length > 0) {
            empty = false;
            extHostDelta.removedDocuments = removedDocuments;
        }
        if (removedEditors.length > 0) {
            empty = false;
            extHostDelta.removedEditors = removedEditors;
        }
        if (delta.addedDocuments.length > 0) {
            empty = false;
            extHostDelta.addedDocuments = delta.addedDocuments.map(m => this._toModelAddData(m));
        }
        if (delta.addedEditors.length > 0) {
            empty = false;
            extHostDelta.addedEditors = addedEditors.map(e => this._toTextEditorAddData(e));
        }
        if (!empty) {
            // first update ext host
            this._proxy.$acceptDocumentsAndEditorsDelta(extHostDelta);
            // second update dependent document/editor states
            removedDocuments.forEach(this._mainThreadDocuments.handleModelRemoved, this._mainThreadDocuments);
            delta.addedDocuments.forEach(this._mainThreadDocuments.handleModelAdded, this._mainThreadDocuments);
            removedEditors.forEach(this._mainThreadEditors.handleTextEditorRemoved, this._mainThreadEditors);
            addedEditors.forEach(this._mainThreadEditors.handleTextEditorAdded, this._mainThreadEditors);
        }
    }
    _toModelAddData(model) {
        return {
            uri: model.uri,
            versionId: model.getVersionId(),
            lines: model.getLinesContent(),
            EOL: model.getEOL(),
            languageId: model.getLanguageId(),
            isDirty: this._textFileService.isDirty(model.uri),
            encoding: this._textFileService.getEncoding(model.uri)
        };
    }
    _toTextEditorAddData(textEditor) {
        const props = textEditor.getProperties();
        return {
            id: textEditor.getId(),
            documentUri: textEditor.getModel().uri,
            options: props.options,
            selections: props.selections,
            visibleRanges: props.visibleRanges,
            editorPosition: this._findEditorPosition(textEditor)
        };
    }
    _findEditorPosition(editor) {
        for (const editorPane of this._editorService.visibleEditorPanes) {
            if (editor.matches(editorPane)) {
                return editorGroupToColumn(this._editorGroupService, editorPane.group);
            }
        }
        return undefined;
    }
    findTextEditorIdFor(editorPane) {
        for (const [id, editor] of this._textEditors) {
            if (editor.matches(editorPane)) {
                return id;
            }
        }
        return undefined;
    }
    getIdOfCodeEditor(codeEditor) {
        for (const [id, editor] of this._textEditors) {
            if (editor.getCodeEditor() === codeEditor) {
                return id;
            }
        }
        return undefined;
    }
    getEditor(id) {
        return this._textEditors.get(id);
    }
};
MainThreadDocumentsAndEditors = __decorate([
    extHostCustomer,
    __param(1, IModelService),
    __param(2, ITextFileService),
    __param(3, IEditorService),
    __param(4, ICodeEditorService),
    __param(5, IFileService),
    __param(6, ITextModelService),
    __param(7, IEditorGroupsService),
    __param(8, IPaneCompositePartService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IWorkingCopyFileService),
    __param(11, IUriIdentityService),
    __param(12, IClipboardService),
    __param(13, IPathService),
    __param(14, IConfigurationService),
    __param(15, IQuickDiffModelService)
], MainThreadDocumentsAndEditors);
export { MainThreadDocumentsAndEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50c0FuZEVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZERvY3VtZW50c0FuZEVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkcsT0FBTyxFQUFlLFlBQVksRUFBRSxZQUFZLEVBQXFCLE1BQU0sMENBQTBDLENBQUM7QUFDdEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFM0YsT0FBTyxFQUFjLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQW1HLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzdLLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFN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