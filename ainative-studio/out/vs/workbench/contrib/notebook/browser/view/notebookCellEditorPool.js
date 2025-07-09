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
import * as DOM from '../../../../../base/browser/dom.js';
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { CellFocusMode } from '../notebookBrowser.js';
import { CellEditorOptions } from './cellParts/cellEditorOptions.js';
let NotebookCellEditorPool = class NotebookCellEditorPool extends Disposable {
    constructor(notebookEditor, contextKeyServiceProvider, textModelService, _configurationService, _instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.contextKeyServiceProvider = contextKeyServiceProvider;
        this.textModelService = textModelService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._editorDisposable = this._register(new MutableDisposable());
        this._isInitialized = false;
        this._isDisposed = false;
        this._focusedEditorDOM = this.notebookEditor.getDomNode().appendChild(DOM.$('.cell-editor-part-cache'));
        this._focusedEditorDOM.style.position = 'absolute';
        this._focusedEditorDOM.style.top = '-50000px';
        this._focusedEditorDOM.style.width = '1px';
        this._focusedEditorDOM.style.height = '1px';
    }
    _initializeEditor(cell) {
        this._editorContextKeyService = this._register(this.contextKeyServiceProvider(this._focusedEditorDOM));
        const editorContainer = DOM.prepend(this._focusedEditorDOM, DOM.$('.cell-editor-container'));
        const editorInstaService = this._register(this._instantiationService.createChild(new ServiceCollection([IContextKeyService, this._editorContextKeyService])));
        EditorContextKeys.inCompositeEditor.bindTo(this._editorContextKeyService).set(true);
        const editorOptions = new CellEditorOptions(this.notebookEditor.getBaseCellEditorOptions(cell.language), this.notebookEditor.notebookOptions, this._configurationService);
        this._editor = this._register(editorInstaService.createInstance(CodeEditorWidget, editorContainer, {
            ...editorOptions.getDefaultValue(),
            dimension: {
                width: 0,
                height: 0
            },
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'auto',
                handleMouseWheel: false,
                useShadows: false,
            },
        }, {
            contributions: this.notebookEditor.creationOptions.cellEditorContributions
        }));
        editorOptions.dispose();
        this._isInitialized = true;
    }
    preserveFocusedEditor(cell) {
        if (!this._isInitialized) {
            this._initializeEditor(cell);
        }
        this._editorDisposable.clear();
        this._focusEditorCancellablePromise?.cancel();
        this._focusEditorCancellablePromise = createCancelablePromise(async (token) => {
            const ref = await this.textModelService.createModelReference(cell.uri);
            if (this._isDisposed || token.isCancellationRequested) {
                ref.dispose();
                return;
            }
            const editorDisposable = new DisposableStore();
            editorDisposable.add(ref);
            this._editor.setModel(ref.object.textEditorModel);
            this._editor.setSelections(cell.getSelections());
            this._editor.focus();
            const _update = () => {
                const editorSelections = this._editor.getSelections();
                if (editorSelections) {
                    cell.setSelections(editorSelections);
                }
                this.notebookEditor.revealInView(cell);
                this._editor.setModel(null);
                ref.dispose();
            };
            editorDisposable.add(this._editor.onDidChangeModelContent((e) => {
                _update();
            }));
            editorDisposable.add(this._editor.onDidChangeCursorSelection(e => {
                if (e.source === 'keyboard' || e.source === 'mouse') {
                    _update();
                }
            }));
            editorDisposable.add(this.notebookEditor.onDidChangeActiveEditor(() => {
                const latestActiveCell = this.notebookEditor.getActiveCell();
                if (latestActiveCell !== cell || latestActiveCell.focusMode !== CellFocusMode.Editor) {
                    // focus moves to another cell or cell container
                    // we should stop preserving the editor
                    this._editorDisposable.clear();
                    this._editor.setModel(null);
                    ref.dispose();
                }
            }));
            this._editorDisposable.value = editorDisposable;
        });
    }
    dispose() {
        this._isDisposed = true;
        this._focusEditorCancellablePromise?.cancel();
        super.dispose();
    }
};
NotebookCellEditorPool = __decorate([
    __param(2, ITextModelService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService)
], NotebookCellEditorPool);
export { NotebookCellEditorPool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsRWRpdG9yUG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvbm90ZWJvb2tDZWxsRWRpdG9yUG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxrQkFBa0IsRUFBNEIsTUFBTSx5REFBeUQsQ0FBQztBQUN2SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsYUFBYSxFQUEyQyxNQUFNLHVCQUF1QixDQUFDO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTlELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQVNyRCxZQUNVLGNBQXVDLEVBQy9CLHlCQUErRSxFQUM3RSxnQkFBb0Qs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