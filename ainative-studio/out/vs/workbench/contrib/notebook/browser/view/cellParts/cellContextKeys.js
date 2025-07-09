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
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { NotebookChatController } from '../../controller/chat/notebookChatController.js';
import { CellEditState, CellFocusMode } from '../../notebookBrowser.js';
import { CellContentPart } from '../cellPart.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { MarkupCellViewModel } from '../../viewModel/markupCellViewModel.js';
import { NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_EDITOR_FOCUSED, NOTEBOOK_CELL_EXECUTING, NOTEBOOK_CELL_EXECUTION_STATE, NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_INPUT_COLLAPSED, NOTEBOOK_CELL_LINE_NUMBERS, NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_OUTPUT_COLLAPSED, NOTEBOOK_CELL_RESOURCE, NOTEBOOK_CELL_TYPE, NOTEBOOK_CELL_GENERATED_BY_CHAT, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS } from '../../../common/notebookContextKeys.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
let CellContextKeyPart = class CellContextKeyPart extends CellContentPart {
    constructor(notebookEditor, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.cellContextKeyManager = this._register(this.instantiationService.createInstance(CellContextKeyManager, notebookEditor, undefined));
    }
    didRenderCell(element) {
        this.cellContextKeyManager.updateForElement(element);
    }
};
CellContextKeyPart = __decorate([
    __param(1, IInstantiationService)
], CellContextKeyPart);
export { CellContextKeyPart };
let CellContextKeyManager = class CellContextKeyManager extends Disposable {
    constructor(notebookEditor, element, _contextKeyService, _notebookExecutionStateService) {
        super();
        this.notebookEditor = notebookEditor;
        this.element = element;
        this._contextKeyService = _contextKeyService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.elementDisposables = this._register(new DisposableStore());
        this._contextKeyService.bufferChangeEvents(() => {
            this.cellType = NOTEBOOK_CELL_TYPE.bindTo(this._contextKeyService);
            this.cellEditable = NOTEBOOK_CELL_EDITABLE.bindTo(this._contextKeyService);
            this.cellFocused = NOTEBOOK_CELL_FOCUSED.bindTo(this._contextKeyService);
            this.cellEditorFocused = NOTEBOOK_CELL_EDITOR_FOCUSED.bindTo(this._contextKeyService);
            this.markdownEditMode = NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.bindTo(this._contextKeyService);
            this.cellRunState = NOTEBOOK_CELL_EXECUTION_STATE.bindTo(this._contextKeyService);
            this.cellExecuting = NOTEBOOK_CELL_EXECUTING.bindTo(this._contextKeyService);
            this.cellHasOutputs = NOTEBOOK_CELL_HAS_OUTPUTS.bindTo(this._contextKeyService);
            this.cellContentCollapsed = NOTEBOOK_CELL_INPUT_COLLAPSED.bindTo(this._contextKeyService);
            this.cellOutputCollapsed = NOTEBOOK_CELL_OUTPUT_COLLAPSED.bindTo(this._contextKeyService);
            this.cellLineNumbers = NOTEBOOK_CELL_LINE_NUMBERS.bindTo(this._contextKeyService);
            this.cellGeneratedByChat = NOTEBOOK_CELL_GENERATED_BY_CHAT.bindTo(this._contextKeyService);
            this.cellResource = NOTEBOOK_CELL_RESOURCE.bindTo(this._contextKeyService);
            this.cellHasErrorDiagnostics = NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS.bindTo(this._contextKeyService);
            if (element) {
                this.updateForElement(element);
            }
        });
        this._register(this._notebookExecutionStateService.onDidChangeExecution(e => {
            if (e.type === NotebookExecutionType.cell && this.element && e.affectsCell(this.element.uri)) {
                this.updateForExecutionState();
            }
        }));
    }
    updateForElement(element) {
        this.elementDisposables.clear();
        this.element = element;
        if (!element) {
            return;
        }
        this.elementDisposables.add(element.onDidChangeState(e => this.onDidChangeState(e)));
        if (element instanceof CodeCellViewModel) {
            this.elementDisposables.add(element.onDidChangeOutputs(() => this.updateForOutputs()));
            this.elementDisposables.add(autorun(reader => {
                this.cellHasErrorDiagnostics.set(!!reader.readObservable(element.executionErrorDiagnostic));
            }));
        }
        this.elementDisposables.add(this.notebookEditor.onDidChangeActiveCell(() => this.updateForFocusState()));
        if (this.element instanceof MarkupCellViewModel) {
            this.cellType.set('markup');
        }
        else if (this.element instanceof CodeCellViewModel) {
            this.cellType.set('code');
        }
        this._contextKeyService.bufferChangeEvents(() => {
            this.updateForFocusState();
            this.updateForExecutionState();
            this.updateForEditState();
            this.updateForCollapseState();
            this.updateForOutputs();
            this.updateForChat();
            this.cellLineNumbers.set(this.element.lineNumbers);
            this.cellResource.set(this.element.uri.toString());
        });
        const chatController = NotebookChatController.get(this.notebookEditor);
        if (chatController) {
            this.elementDisposables.add(chatController.onDidChangePromptCache(e => {
                if (e.cell.toString() === this.element.uri.toString()) {
                    this.updateForChat();
                }
            }));
        }
    }
    onDidChangeState(e) {
        this._contextKeyService.bufferChangeEvents(() => {
            if (e.internalMetadataChanged) {
                this.updateForExecutionState();
            }
            if (e.editStateChanged) {
                this.updateForEditState();
            }
            if (e.focusModeChanged) {
                this.updateForFocusState();
            }
            if (e.cellLineNumberChanged) {
                this.cellLineNumbers.set(this.element.lineNumbers);
            }
            if (e.inputCollapsedChanged || e.outputCollapsedChanged) {
                this.updateForCollapseState();
            }
        });
    }
    updateForFocusState() {
        if (!this.element) {
            return;
        }
        const activeCell = this.notebookEditor.getActiveCell();
        this.cellFocused.set(this.notebookEditor.getActiveCell() === this.element);
        if (activeCell === this.element) {
            this.cellEditorFocused.set(this.element.focusMode === CellFocusMode.Editor);
        }
        else {
            this.cellEditorFocused.set(false);
        }
    }
    updateForExecutionState() {
        if (!this.element) {
            return;
        }
        const internalMetadata = this.element.internalMetadata;
        this.cellEditable.set(!this.notebookEditor.isReadOnly);
        const exeState = this._notebookExecutionStateService.getCellExecution(this.element.uri);
        if (this.element instanceof MarkupCellViewModel) {
            this.cellRunState.reset();
            this.cellExecuting.reset();
        }
        else if (exeState?.state === NotebookCellExecutionState.Executing) {
            this.cellRunState.set('executing');
            this.cellExecuting.set(true);
        }
        else if (exeState?.state === NotebookCellExecutionState.Pending || exeState?.state === NotebookCellExecutionState.Unconfirmed) {
            this.cellRunState.set('pending');
            this.cellExecuting.set(true);
        }
        else if (internalMetadata.lastRunSuccess === true) {
            this.cellRunState.set('succeeded');
            this.cellExecuting.set(false);
        }
        else if (internalMetadata.lastRunSuccess === false) {
            this.cellRunState.set('failed');
            this.cellExecuting.set(false);
        }
        else {
            this.cellRunState.set('idle');
            this.cellExecuting.set(false);
        }
    }
    updateForEditState() {
        if (!this.element) {
            return;
        }
        if (this.element instanceof MarkupCellViewModel) {
            this.markdownEditMode.set(this.element.getEditState() === CellEditState.Editing);
        }
        else {
            this.markdownEditMode.set(false);
        }
    }
    updateForCollapseState() {
        if (!this.element) {
            return;
        }
        this.cellContentCollapsed.set(!!this.element.isInputCollapsed);
        this.cellOutputCollapsed.set(!!this.element.isOutputCollapsed);
    }
    updateForOutputs() {
        if (this.element instanceof CodeCellViewModel) {
            this.cellHasOutputs.set(this.element.outputsViewModels.length > 0);
        }
        else {
            this.cellHasOutputs.set(false);
        }
    }
    updateForChat() {
        const chatController = NotebookChatController.get(this.notebookEditor);
        if (!chatController || !this.element) {
            this.cellGeneratedByChat.set(false);
            return;
        }
        this.cellGeneratedByChat.set(chatController.isCellGeneratedByChat(this.element));
    }
};
CellContextKeyManager = __decorate([
    __param(2, IContextKeyService),
    __param(3, INotebookExecutionStateService)
], CellContextKeyManager);
export { CellContextKeyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENvbnRleHRLZXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbENvbnRleHRLZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RFLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUEyQyxNQUFNLDBCQUEwQixDQUFDO0FBRWpILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRSxPQUFPLEVBQXFDLHNCQUFzQixFQUFFLDRCQUE0QixFQUFFLHVCQUF1QixFQUFFLDZCQUE2QixFQUFFLHFCQUFxQixFQUFFLHlCQUF5QixFQUFFLDZCQUE2QixFQUFFLDBCQUEwQixFQUFFLGdDQUFnQyxFQUFFLDhCQUE4QixFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLCtCQUErQixFQUFFLG1DQUFtQyxFQUFF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