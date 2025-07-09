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
import { DisposableStore, dispose } from '../../../base/common/lifecycle.js';
import { equals } from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../platform/editor/common/editor.js';
import { getNotebookEditorFromEditorPane } from '../../contrib/notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../contrib/notebook/browser/services/notebookEditorService.js';
import { columnToEditorGroup, editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ExtHostContext, NotebookEditorRevealType } from '../common/extHost.protocol.js';
class MainThreadNotebook {
    constructor(editor, disposables) {
        this.editor = editor;
        this.disposables = disposables;
    }
    dispose() {
        this.disposables.dispose();
    }
}
let MainThreadNotebookEditors = class MainThreadNotebookEditors {
    constructor(extHostContext, _editorService, _notebookEditorService, _editorGroupService, _configurationService) {
        this._editorService = _editorService;
        this._notebookEditorService = _notebookEditorService;
        this._editorGroupService = _editorGroupService;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this._mainThreadEditors = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookEditors);
        this._editorService.onDidActiveEditorChange(() => this._updateEditorViewColumns(), this, this._disposables);
        this._editorGroupService.onDidRemoveGroup(() => this._updateEditorViewColumns(), this, this._disposables);
        this._editorGroupService.onDidMoveGroup(() => this._updateEditorViewColumns(), this, this._disposables);
    }
    dispose() {
        this._disposables.dispose();
        dispose(this._mainThreadEditors.values());
    }
    handleEditorsAdded(editors) {
        for (const editor of editors) {
            const editorDisposables = new DisposableStore();
            editorDisposables.add(editor.onDidChangeVisibleRanges(() => {
                this._proxy.$acceptEditorPropertiesChanged(editor.getId(), { visibleRanges: { ranges: editor.visibleRanges } });
            }));
            editorDisposables.add(editor.onDidChangeSelection(() => {
                this._proxy.$acceptEditorPropertiesChanged(editor.getId(), { selections: { selections: editor.getSelections() } });
            }));
            const wrapper = new MainThreadNotebook(editor, editorDisposables);
            this._mainThreadEditors.set(editor.getId(), wrapper);
        }
    }
    handleEditorsRemoved(editorIds) {
        for (const id of editorIds) {
            this._mainThreadEditors.get(id)?.dispose();
            this._mainThreadEditors.delete(id);
        }
    }
    _updateEditorViewColumns() {
        const result = Object.create(null);
        for (const editorPane of this._editorService.visibleEditorPanes) {
            const candidate = getNotebookEditorFromEditorPane(editorPane);
            if (candidate && this._mainThreadEditors.has(candidate.getId())) {
                result[candidate.getId()] = editorGroupToColumn(this._editorGroupService, editorPane.group);
            }
        }
        if (!equals(result, this._currentViewColumnInfo)) {
            this._currentViewColumnInfo = result;
            this._proxy.$acceptEditorViewColumns(result);
        }
    }
    async $tryShowNotebookDocument(resource, viewType, options) {
        const editorOptions = {
            cellSelections: options.selections,
            preserveFocus: options.preserveFocus,
            pinned: options.pinned,
            // selection: options.selection,
            // preserve pre 1.38 behaviour to not make group active when preserveFocus: true
            // but make sure to restore the editor to fix https://github.com/microsoft/vscode/issues/79633
            activation: options.preserveFocus ? EditorActivation.RESTORE : undefined,
            label: options.label,
            override: viewType
        };
        const editorPane = await this._editorService.openEditor({ resource: URI.revive(resource), options: editorOptions }, columnToEditorGroup(this._editorGroupService, this._configurationService, options.position));
        const notebookEditor = getNotebookEditorFromEditorPane(editorPane);
        if (notebookEditor) {
            return notebookEditor.getId();
        }
        else {
            throw new Error(`Notebook Editor creation failure for document ${JSON.stringify(resource)}`);
        }
    }
    async $tryRevealRange(id, range, revealType) {
        const editor = this._notebookEditorService.getNotebookEditor(id);
        if (!editor) {
            return;
        }
        const notebookEditor = editor;
        if (!notebookEditor.hasModel()) {
            return;
        }
        if (range.start >= notebookEditor.getLength()) {
            return;
        }
        const cell = notebookEditor.cellAt(range.start);
        switch (revealType) {
            case NotebookEditorRevealType.Default:
                return notebookEditor.revealCellRangeInView(range);
            case NotebookEditorRevealType.InCenter:
                return notebookEditor.revealInCenter(cell);
            case NotebookEditorRevealType.InCenterIfOutsideViewport:
                return notebookEditor.revealInCenterIfOutsideViewport(cell);
            case NotebookEditorRevealType.AtTop:
                return notebookEditor.revealInViewAtTop(cell);
        }
    }
    $trySetSelections(id, ranges) {
        const editor = this._notebookEditorService.getNotebookEditor(id);
        if (!editor) {
            return;
        }
        editor.setSelections(ranges);
        if (ranges.length) {
            editor.setFocus({ start: ranges[0].start, end: ranges[0].start + 1 });
        }
    }
};
MainThreadNotebookEditors = __decorate([
    __param(1, IEditorService),
    __param(2, INotebookEditorService),
    __param(3, IEditorGroupsService),
    __param(4, IConfigurationService)
], MainThreadNotebookEditors);
export { MainThreadNotebookEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rRWRpdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE5vdGVib29rRWRpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSwrQkFBK0IsRUFBMkMsTUFBTSxtREFBbUQsQ0FBQztBQUM3SSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUUxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFL0UsT0FBTyxFQUFFLGNBQWMsRUFBNEgsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVuTixNQUFNLGtCQUFrQjtJQUV2QixZQUNVLE1BQXVCLEVBQ3ZCLFdBQTRCO1FBRDVCLFdBQU0sR0FBTixNQUFNLENBQWlCO1FBQ3ZCLGdCQUFXLEdBQVgsV0FBVyxDQUFpQjtJQUNsQyxDQUFDO0lBRUwsT0FBTztRQUNOLElBQUks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