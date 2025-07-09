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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwQ2VsbFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9tYXJrdXBDZWxsVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQW1DLGlCQUFpQixFQUFFLGVBQWUsRUFBdUgsTUFBTSx1QkFBdUIsQ0FBQztBQUNoUCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUUzRCxPQUFPLEVBQUUsUUFBUSxFQUF3QixNQUFNLGdDQUFnQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSw2QkFBNkIsRUFBc0IsTUFBTSwwQkFBMEIsQ0FBQztBQUM3RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU3RixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLGlCQUFpQjtJQVF6RCxJQUFXLFlBQVksS0FBeUIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUM1RSxJQUFXLFlBQVksQ0FBQyxLQUF5QjtRQUNoRCxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7WUFDM0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFJRCxJQUFJLHNCQUFzQixDQUFDLFNBQWlCO1FBQzNDLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFJRCxJQUFJLFVBQVUsQ0FBQyxTQUFpQjtRQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztRQUM3QixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFJRCxJQUFJLFlBQVksQ0FBQyxTQUFpQjtRQUNqQyxJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQztRQUMvQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUNsRixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFLRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUdELElBQVcsZUFBZTtRQUN6QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDN0IsQ0FBQztJQUVELElBQVcsZUFBZSxDQUFDLENBQVU7UUFDcEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUdELElBQVcsZUFBZTtRQUN6QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQVcsZUFBZSxDQUFDLENBQVU7UUFDcEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVELElBQVcsc0JBQXNCO1FBQ2hDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELElBQVcsc0JBQXNCLENBQUMsQ0FBVTtRQUMzQyxFQUFFO0lBQ0gsQ0FBQztJQUdELElBQVcsYUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDM0IsQ0FBQztJQUVELElBQVcsYUFBYSxDQUFDLENBQVU7UUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLG9CQUFvQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELFlBQ0MsUUFBZ0IsRUFDaEIsS0FBNEIsRUFDNUIseUJBQW9ELEVBQzNDLGVBQTJDLEVBQzNDLFdBQXdCLEVBQ1Ysb0JBQTJDLEVBQy9DLGdCQUFtQyxFQUNwQyxlQUFpQyxFQUMvQixpQkFBcUMsRUFDOUIsd0JBQW1EO1FBRTlFLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxXQUFXLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFSdEosb0JBQWUsR0FBZixlQUFlLENBQTRCO1FBQzNDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBaEd6QixhQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQWtCNUIsbUJBQWMsR0FBRyxDQUFDLENBQUM7UUFPbkIsZ0JBQVcsR0FBRyxDQUFDLENBQUM7UUFXaEIsa0JBQWEsR0FBRyxDQUFDLENBQUM7UUFDbEIscUJBQWdCLEdBQUcsQ0FBQyxDQUFDO1FBV1YsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBK0IsQ0FBQyxDQUFDO1FBQzFGLHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFNbkQsb0JBQWUsR0FBWSxLQUFLLENBQUM7UUFTakMsbUJBQWMsR0FBWSxLQUFLLENBQUM7UUFpQmhDLGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBcUY5Qjs7V0FFRztRQUNILHNCQUFpQixHQUEyQixFQUFFLENBQUM7UUFnSDlCLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUM7UUFDekQsa0JBQWEsR0FBbUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7UUFqTHpFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU1RyxJQUFJLENBQUMsV0FBVyxHQUFHO1lBQ2xCLFVBQVUsRUFBRSxDQUFDO1lBQ2IsWUFBWSxFQUFFLENBQUM7WUFDZixhQUFhLEVBQUUsQ0FBQztZQUNoQixRQUFRLEVBQUUseUJBQXlCLEVBQUUsUUFBUSxJQUFJLElBQUk7WUFDckQsV0FBVyxFQUFFLHlCQUF5QixFQUFFLEtBQUs7Z0JBQzVDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7Z0JBQ2xHLENBQUMsQ0FBQyxDQUFDO1lBQ0osYUFBYSxFQUFFLENBQUM7WUFDaEIsYUFBYSxFQUFFLENBQUM7WUFDaEIsbUJBQW1CLEVBQUUsZ0JBQWdCO1lBQ3JDLFdBQVcsRUFBRSxHQUFHO1lBQ2hCLFdBQVcsRUFBRSxlQUFlLENBQUMsYUFBYTtZQUMxQyxjQUFjLEVBQUUsQ0FBQztZQUNqQixlQUFlLEVBQUUsQ0FBQztTQUNsQixDQUFDO1FBRUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDeEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUxRixJQUFJLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0UsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUN0RixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUcsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFFckQsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25ELE9BQU8sSUFBSSxDQUFDLGFBQWE7a0JBQ3RCLG1CQUFtQixDQUFDLHFCQUFxQjtrQkFDekMsbUJBQW1CLENBQUMsd0JBQXdCO2tCQUM1QyxnQkFBZ0I7a0JBQ2hCLElBQUksQ0FBQyxnQkFBZ0I7a0JBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDeEIsQ0FBQzthQUFNLENBQUM7WUFDUCxZQUFZO1lBQ1oseUZBQXlGO1lBQ3pGLHVHQUF1RztZQUN2Ryx3Q0FBd0M7WUFDeEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsY0FBYyxHQUFHLGdCQUFnQixHQUFHLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkcsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxhQUFhLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxZQUFZLHVDQUErQixDQUFDLENBQUMsQ0FBQztZQUMzRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFLENBQUMsc0JBQXNCLENBQUM7SUFDdkYsQ0FBQztJQUVRLGFBQWEsQ0FBQyxDQUE2QjtRQUNuRCxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxDQUFDLHVCQUF1QixJQUFJLENBQUMsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNuRixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQU1ELGVBQWUsQ0FBQyxLQUFhO1FBQzVCLDhDQUE4QztRQUM5QyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUNELGtCQUFrQixDQUFDLEtBQWEsRUFBRSxNQUFjO1FBQy9DLDhDQUE4QztJQUMvQyxDQUFDO0lBRUQseUJBQXlCO1FBQ3hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxTQUFpQixFQUFFLE9BQTJCO1FBQ3hFLElBQUksU0FBUyxLQUFLLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUN4RCxDQUFDO0lBQ0YsQ0FBQztJQUVELFlBQVksQ0FBQyxLQUFrQztRQUM5QyxJQUFJLFdBQW1CLENBQUM7UUFDeEIsSUFBSSxjQUFzQixDQUFDO1FBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUMsQ0FBQztnQkFDOUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVc7b0JBQzVCLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztvQkFDL0IsR0FBRyxDQUFDLENBQUM7b0JBQ0wsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxLQUFLLENBQUMsV0FBVyxDQUFDO1lBQ25CLFlBQVk7WUFDWixjQUFjLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDaEQsQ0FBQzthQUFNLENBQUM7WUFDUCxXQUFXO2dCQUNWLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZTtxQkFDOUIsa0NBQWtDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JELEtBQUssQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1lBRWhDLGNBQWMsR0FBRyxDQUFDLENBQUM7UUFDcEIsQ0FBQztRQUNELElBQUksYUFBcUIsQ0FBQztRQUMxQixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQzlGLGFBQWEsR0FBRywyQkFBMkIsQ0FBQyxtQkFBbUI7a0JBQzVELDJCQUEyQixDQUFDLGFBQWEsQ0FBQyxrQkFBa0I7a0JBQzVELElBQUksQ0FBQyxXQUFXO2tCQUNoQixJQUFJLENBQUMsYUFBYTtrQkFDbEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBQzFCLENBQUM7YUFBTSxDQUFDO1lBQ1AsYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDckMsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLEdBQUc7WUFDbEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRO1lBQ2pELFdBQVcsRUFBRSxLQUFLLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUM1QyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWU7cUJBQzlCLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVc7WUFDN0IsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzVCLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNoQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtZQUN0QyxhQUFhLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDbEMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlO2lCQUNuRCwwQkFBMEIsQ0FDMUIsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDN0IsV0FBVztZQUNYLFdBQVcsRUFBRSxlQUFlLENBQUMsUUFBUTtZQUNyQyxjQUFjO1lBQ2QsYUFBYTtZQUNiLGFBQWEsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhO1NBQy9CLENBQUM7UUFFRixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFUSxzQkFBc0IsQ0FBQyxnQkFBMEQsRUFBRSxXQUFvQjtRQUMvRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUMvQywrRUFBK0U7UUFDL0UsSUFBSSxXQUFXLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNoRyxJQUFJLENBQUMsV0FBVyxHQUFHO2dCQUNsQixHQUFHLElBQUksQ0FBQyxVQUFVO2dCQUNsQixXQUFXLEVBQUUsV0FBVztnQkFDeEIsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXO2dCQUM1QixZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWE7Z0JBQ2hDLGVBQWUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO2dCQUN0QyxXQUFXLEVBQUUsZUFBZSxDQUFDLFNBQVM7YUFDdEMsQ0FBQztZQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUNGLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxTQUFTLENBQUMsVUFBa0I7UUFDM0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEUsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUM7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFUywyQkFBMkI7UUFDcEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxVQUFVO0lBQ1YsQ0FBQztJQU1ELFNBQVMsQ0FBQyxLQUFhLEVBQUUsT0FBNkI7UUFDckQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFcEQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTztZQUNOLElBQUksRUFBRSxJQUFJO1lBQ1YsY0FBYyxFQUFFLE9BQU87U0FDdkIsQ0FBQztJQUNILENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLGVBQXVCLEdBQUcsSUFBSSxDQUFDO0lBQ3RDLENBQUM7Q0FDRCxDQUFBO0FBL1NZLG1CQUFtQjtJQW1HN0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHlCQUF5QixDQUFBO0dBdkdmLG1CQUFtQixDQStTL0IifQ==