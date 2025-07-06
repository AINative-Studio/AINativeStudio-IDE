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
import { Emitter } from '../../../../../base/common/event.js';
import * as UUID from '../../../../../base/common/uuid.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { CellEditState, CellLayoutContext, CellLayoutState } from '../notebookBrowser.js';
import { BaseCellViewModel } from './baseCellViewModel.js';
import { CellKind } from '../../common/notebookCommon.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { NotebookCellStateChangedEvent } from '../notebookViewEvents.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
let MarkupCellViewModel = class MarkupCellViewModel extends BaseCellViewModel {
    get renderedHtml() { return this._renderedHtml; }
    set renderedHtml(value) {
        if (this._renderedHtml !== value) {
            this._renderedHtml = value;
            this._onDidChangeState.fire({ contentChanged: true });
        }
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    set renderedMarkdownHeight(newHeight) {
        this._previewHeight = newHeight;
        this._updateTotalHeight(this._computeTotalHeight());
    }
    set chatHeight(newHeight) {
        this._chatHeight = newHeight;
        this._updateTotalHeight(this._computeTotalHeight());
    }
    get chatHeight() {
        return this._chatHeight;
    }
    set editorHeight(newHeight) {
        this._editorHeight = newHeight;
        this._statusBarHeight = this.viewContext.notebookOptions.computeStatusBarHeight();
        this._updateTotalHeight(this._computeTotalHeight());
    }
    get editorHeight() {
        throw new Error('MarkdownCellViewModel.editorHeight is write only');
    }
    get foldingState() {
        return this.foldingDelegate.getFoldingState(this.foldingDelegate.getCellIndex(this));
    }
    get outputIsHovered() {
        return this._hoveringOutput;
    }
    set outputIsHovered(v) {
        this._hoveringOutput = v;
    }
    get outputIsFocused() {
        return this._focusOnOutput;
    }
    set outputIsFocused(v) {
        this._focusOnOutput = v;
    }
    get inputInOutputIsFocused() {
        return false;
    }
    set inputInOutputIsFocused(_) {
        //
    }
    get cellIsHovered() {
        return this._hoveringCell;
    }
    set cellIsHovered(v) {
        this._hoveringCell = v;
        this._onDidChangeState.fire({ cellIsHoveredChanged: true });
    }
    constructor(viewType, model, initialNotebookLayoutInfo, foldingDelegate, viewContext, configurationService, textModelService, undoRedoService, codeEditorService, inlineChatSessionService) {
        super(viewType, model, UUID.generateUuid(), viewContext, configurationService, textModelService, undoRedoService, codeEditorService, inlineChatSessionService);
        this.foldingDelegate = foldingDelegate;
        this.viewContext = viewContext;
        this.cellKind = CellKind.Markup;
        this._previewHeight = 0;
        this._chatHeight = 0;
        this._editorHeight = 0;
        this._statusBarHeight = 0;
        this._onDidChangeLayout = this._register(new Emitter());
        this.onDidChangeLayout = this._onDidChangeLayout.event;
        this._hoveringOutput = false;
        this._focusOnOutput = false;
        this._hoveringCell = false;
        /**
         * we put outputs stuff here to make compiler happy
         */
        this.outputsViewModels = [];
        this._hasFindResult = this._register(new Emitter());
        this.hasFindResult = this._hasFindResult.event;
        const { bottomToolbarGap } = this.viewContext.notebookOptions.computeBottomToolbarDimensions(this.viewType);
        this._layoutInfo = {
            chatHeight: 0,
            editorHeight: 0,
            previewHeight: 0,
            fontInfo: initialNotebookLayoutInfo?.fontInfo || null,
            editorWidth: initialNotebookLayoutInfo?.width
                ? this.viewContext.notebookOptions.computeMarkdownCellEditorWidth(initialNotebookLayoutInfo.width)
                : 0,
            commentOffset: 0,
            commentHeight: 0,
            bottomToolbarOffset: bottomToolbarGap,
            totalHeight: 100,
            layoutState: CellLayoutState.Uninitialized,
            foldHintHeight: 0,
            statusBarHeight: 0
        };
        this._register(this.onDidChangeState(e => {
            this.viewContext.eventDispatcher.emit([new NotebookCellStateChangedEvent(e, this.model)]);
            if (e.foldingStateChanged) {
                this._updateTotalHeight(this._computeTotalHeight(), CellLayoutContext.Fold);
            }
        }));
    }
    _computeTotalHeight() {
        const layoutConfiguration = this.viewContext.notebookOptions.getLayoutConfiguration();
        const { bottomToolbarGap } = this.viewContext.notebookOptions.computeBottomToolbarDimensions(this.viewType);
        const foldHintHeight = this._computeFoldHintHeight();
        if (this.getEditState() === CellEditState.Editing) {
            return this._editorHeight
                + layoutConfiguration.markdownCellTopMargin
                + layoutConfiguration.markdownCellBottomMargin
                + bottomToolbarGap
                + this._statusBarHeight
                + this._commentHeight;
        }
        else {
            // @rebornix
            // On file open, the previewHeight + bottomToolbarGap for a cell out of viewport can be 0
            // When it's 0, the list view will never try to render it anymore even if we scroll the cell into view.
            // Thus we make sure it's greater than 0
            return Math.max(1, this._previewHeight + bottomToolbarGap + foldHintHeight + this._commentHeight);
        }
    }
    _computeFoldHintHeight() {
        return (this.getEditState() === CellEditState.Editing || this.foldingState !== 2 /* CellFoldingState.Collapsed */) ?
            0 : this.viewContext.notebookOptions.getLayoutConfiguration().markdownFoldHintHeight;
    }
    updateOptions(e) {
        super.updateOptions(e);
        if (e.cellStatusBarVisibility || e.insertToolbarPosition || e.cellToolbarLocation) {
            this._updateTotalHeight(this._computeTotalHeight());
        }
    }
    getOutputOffset(index) {
        // throw new Error('Method not implemented.');
        return -1;
    }
    updateOutputHeight(index, height) {
        // throw new Error('Method not implemented.');
    }
    triggerFoldingStateChange() {
        this._onDidChangeState.fire({ foldingStateChanged: true });
    }
    _updateTotalHeight(newHeight, context) {
        if (newHeight !== this.layoutInfo.totalHeight) {
            this.layoutChange({ totalHeight: newHeight, context });
        }
    }
    layoutChange(state) {
        let totalHeight;
        let foldHintHeight;
        if (!this.isInputCollapsed) {
            totalHeight = state.totalHeight === undefined ?
                (this._layoutInfo.layoutState ===
                    CellLayoutState.Uninitialized ?
                    100 :
                    this._layoutInfo.totalHeight) :
                state.totalHeight;
            // recompute
            foldHintHeight = this._computeFoldHintHeight();
        }
        else {
            totalHeight =
                this.viewContext.notebookOptions
                    .computeCollapsedMarkdownCellHeight(this.viewType);
            state.totalHeight = totalHeight;
            foldHintHeight = 0;
        }
        let commentOffset;
        if (this.getEditState() === CellEditState.Editing) {
            const notebookLayoutConfiguration = this.viewContext.notebookOptions.getLayoutConfiguration();
            commentOffset = notebookLayoutConfiguration.editorToolbarHeight
                + notebookLayoutConfiguration.cellTopMargin // CELL_TOP_MARGIN
                + this._chatHeight
                + this._editorHeight
                + this._statusBarHeight;
        }
        else {
            commentOffset = this._previewHeight;
        }
        this._layoutInfo = {
            fontInfo: state.font || this._layoutInfo.fontInfo,
            editorWidth: state.outerWidth !== undefined ?
                this.viewContext.notebookOptions
                    .computeMarkdownCellEditorWidth(state.outerWidth) :
                this._layoutInfo.editorWidth,
            chatHeight: this._chatHeight,
            editorHeight: this._editorHeight,
            statusBarHeight: this._statusBarHeight,
            previewHeight: this._previewHeight,
            bottomToolbarOffset: this.viewContext.notebookOptions
                .computeBottomToolbarOffset(totalHeight, this.viewType),
            totalHeight,
            layoutState: CellLayoutState.Measured,
            foldHintHeight,
            commentOffset,
            commentHeight: state.commentHeight ?
                this._commentHeight :
                this._layoutInfo.commentHeight,
        };
        this._onDidChangeLayout.fire(state);
    }
    restoreEditorViewState(editorViewStates, totalHeight) {
        super.restoreEditorViewState(editorViewStates);
        // we might already warmup the viewport so the cell has a total height computed
        if (totalHeight !== undefined && this.layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            this._layoutInfo = {
                ...this.layoutInfo,
                totalHeight: totalHeight,
                chatHeight: this._chatHeight,
                editorHeight: this._editorHeight,
                statusBarHeight: this._statusBarHeight,
                layoutState: CellLayoutState.FromCache,
            };
            this.layoutChange({});
        }
    }
    getDynamicHeight() {
        return null;
    }
    getHeight(lineHeight) {
        if (this._layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            return 100;
        }
        else {
            return this._layoutInfo.totalHeight;
        }
    }
    onDidChangeTextModelContent() {
        this._onDidChangeState.fire({ contentChanged: true });
    }
    onDeselect() {
    }
    startFind(value, options) {
        const matches = super.cellStartFind(value, options);
        if (matches === null) {
            return null;
        }
        return {
            cell: this,
            contentMatches: matches
        };
    }
    dispose() {
        super.dispose();
        this.foldingDelegate = null;
    }
};
MarkupCellViewModel = __decorate([
    __param(5, IConfigurationService),
    __param(6, ITextModelService),
    __param(7, IUndoRedoService),
    __param(8, ICodeEditorService),
    __param(9, IInlineChatSessionService)
], MarkupCellViewModel);
export { MarkupCellViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwQ2VsbFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL21hcmt1cENlbGxWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUM7QUFFM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBbUMsaUJBQWlCLEVBQUUsZUFBZSxFQUF1SCxNQUFNLHVCQUF1QixDQUFDO0FBQ2hQLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTNELE9BQU8sRUFBRSxRQUFRLEVBQXdCLE1BQU0sZ0NBQWdDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLDZCQUE2QixFQUFzQixNQUFNLDBCQUEwQixDQUFDO0FBQzdGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTdGLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsaUJBQWlCO0lBUXpELElBQVcsWUFBWSxLQUF5QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQzVFLElBQVcsWUFBWSxDQUFDLEtBQXlCO1FBQ2hE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