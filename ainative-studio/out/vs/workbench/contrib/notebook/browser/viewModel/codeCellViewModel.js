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
import { Emitter, PauseableEmitter } from '../../../../../base/common/event.js';
import { dispose } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import * as UUID from '../../../../../base/common/uuid.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { PrefixSumComputer } from '../../../../../editor/common/model/prefixSumComputer.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { CellEditState, CellLayoutState } from '../notebookBrowser.js';
import { CellOutputViewModel } from './cellOutputViewModel.js';
import { CellKind } from '../../common/notebookCommon.js';
import { INotebookService } from '../../common/notebookService.js';
import { BaseCellViewModel } from './baseCellViewModel.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
export const outputDisplayLimit = 500;
let CodeCellViewModel = class CodeCellViewModel extends BaseCellViewModel {
    set editorHeight(height) {
        if (this._editorHeight === height) {
            return;
        }
        this._editorHeight = height;
        this.layoutChange({ editorHeight: true }, 'CodeCellViewModel#editorHeight');
    }
    get editorHeight() {
        throw new Error('editorHeight is write-only');
    }
    set chatHeight(height) {
        if (this._chatHeight === height) {
            return;
        }
        this._chatHeight = height;
        this.layoutChange({ chatHeight: true }, 'CodeCellViewModel#chatHeight');
    }
    get chatHeight() {
        return this._chatHeight;
    }
    get outputIsHovered() {
        return this._hoveringOutput;
    }
    set outputIsHovered(v) {
        this._hoveringOutput = v;
        this._onDidChangeState.fire({ outputIsHoveredChanged: true });
    }
    get outputIsFocused() {
        return this._focusOnOutput;
    }
    set outputIsFocused(v) {
        this._focusOnOutput = v;
        this._onDidChangeState.fire({ outputIsFocusedChanged: true });
    }
    get inputInOutputIsFocused() {
        return this._focusInputInOutput;
    }
    set inputInOutputIsFocused(v) {
        this._focusInputInOutput = v;
    }
    get outputMinHeight() {
        return this._outputMinHeight;
    }
    /**
     * The minimum height of the output region. It's only set to non-zero temporarily when replacing an output with a new one.
     * It's reset to 0 when the new output is rendered, or in one second.
     */
    set outputMinHeight(newMin) {
        this._outputMinHeight = newMin;
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    get outputsViewModels() {
        return this._outputViewModels;
    }
    constructor(viewType, model, initialNotebookLayoutInfo, viewContext, configurationService, _notebookService, modelService, undoRedoService, codeEditorService, inlineChatSessionService) {
        super(viewType, model, UUID.generateUuid(), viewContext, configurationService, modelService, undoRedoService, codeEditorService, inlineChatSessionService);
        this.viewContext = viewContext;
        this._notebookService = _notebookService;
        this.cellKind = CellKind.Code;
        this._onLayoutInfoRead = this._register(new Emitter());
        this.onLayoutInfoRead = this._onLayoutInfoRead.event;
        this._onDidStartExecution = this._register(new Emitter());
        this.onDidStartExecution = this._onDidStartExecution.event;
        this._onDidStopExecution = this._register(new Emitter());
        this.onDidStopExecution = this._onDidStopExecution.event;
        this._onDidChangeOutputs = this._register(new Emitter());
        this.onDidChangeOutputs = this._onDidChangeOutputs.event;
        this._onDidRemoveOutputs = this._register(new Emitter());
        this.onDidRemoveOutputs = this._onDidRemoveOutputs.event;
        this._outputCollection = [];
        this._outputsTop = null;
        this._pauseableEmitter = this._register(new PauseableEmitter());
        this.onDidChangeLayout = this._pauseableEmitter.event;
        this._editorHeight = 0;
        this._chatHeight = 0;
        this._hoveringOutput = false;
        this._focusOnOutput = false;
        this._focusInputInOutput = false;
        this._outputMinHeight = 0;
        this.executionErrorDiagnostic = observableValue('excecutionError', undefined);
        this._hasFindResult = this._register(new Emitter());
        this.hasFindResult = this._hasFindResult.event;
        this._outputViewModels = this.model.outputs.map(output => new CellOutputViewModel(this, output, this._notebookService));
        this._register(this.model.onDidChangeOutputs((splice) => {
            const removedOutputs = [];
            let outputLayoutChange = false;
            for (let i = splice.start; i < splice.start + splice.deleteCount; i++) {
                if (this._outputCollection[i] !== undefined && this._outputCollection[i] !== 0) {
                    outputLayoutChange = true;
                }
            }
            this._outputCollection.splice(splice.start, splice.deleteCount, ...splice.newOutputs.map(() => 0));
            removedOutputs.push(...this._outputViewModels.splice(splice.start, splice.deleteCount, ...splice.newOutputs.map(output => new CellOutputViewModel(this, output, this._notebookService))));
            this._outputsTop = null;
            this._onDidChangeOutputs.fire(splice);
            this._onDidRemoveOutputs.fire(removedOutputs);
            if (outputLayoutChange) {
                this.layoutChange({ outputHeight: true }, 'CodeCellViewModel#model.onDidChangeOutputs');
            }
            if (!this._outputCollection.length) {
                this.executionErrorDiagnostic.set(undefined, undefined);
            }
            dispose(removedOutputs);
        }));
        this._outputCollection = new Array(this.model.outputs.length);
        this._layoutInfo = {
            fontInfo: initialNotebookLayoutInfo?.fontInfo || null,
            editorHeight: 0,
            editorWidth: initialNotebookLayoutInfo
                ? this.viewContext.notebookOptions.computeCodeCellEditorWidth(initialNotebookLayoutInfo.width)
                : 0,
            chatHeight: 0,
            statusBarHeight: 0,
            commentOffset: 0,
            commentHeight: 0,
            outputContainerOffset: 0,
            outputTotalHeight: 0,
            outputShowMoreContainerHeight: 0,
            outputShowMoreContainerOffset: 0,
            totalHeight: this.computeTotalHeight(17, 0, 0, 0),
            codeIndicatorHeight: 0,
            outputIndicatorHeight: 0,
            bottomToolbarOffset: 0,
            layoutState: CellLayoutState.Uninitialized,
            estimatedHasHorizontalScrolling: false
        };
    }
    updateExecutionState(e) {
        if (e.changed) {
            this.executionErrorDiagnostic.set(undefined, undefined);
            this._onDidStartExecution.fire(e);
        }
        else {
            this._onDidStopExecution.fire(e);
        }
    }
    updateOptions(e) {
        super.updateOptions(e);
        if (e.cellStatusBarVisibility || e.insertToolbarPosition || e.cellToolbarLocation) {
            this.layoutChange({});
        }
    }
    pauseLayout() {
        this._pauseableEmitter.pause();
    }
    resumeLayout() {
        this._pauseableEmitter.resume();
    }
    layoutChange(state, source) {
        // recompute
        this._ensureOutputsTop();
        const notebookLayoutConfiguration = this.viewContext.notebookOptions.getLayoutConfiguration();
        const bottomToolbarDimensions = this.viewContext.notebookOptions.computeBottomToolbarDimensions(this.viewType);
        const outputShowMoreContainerHeight = state.outputShowMoreContainerHeight ? state.outputShowMoreContainerHeight : this._layoutInfo.outputShowMoreContainerHeight;
        const outputTotalHeight = Math.max(this._outputMinHeight, this.isOutputCollapsed ? notebookLayoutConfiguration.collapsedIndicatorHeight : this._outputsTop.getTotalSum());
        const commentHeight = state.commentHeight ? this._commentHeight : this._layoutInfo.commentHeight;
        const originalLayout = this.layoutInfo;
        if (!this.isInputCollapsed) {
            let newState;
            let editorHeight;
            let totalHeight;
            let hasHorizontalScrolling = false;
            const chatHeight = state.chatHeight ? this._chatHeight : this._layoutInfo.chatHeight;
            if (!state.editorHeight && this._layoutInfo.layoutState === CellLayoutState.FromCache && !state.outputHeight) {
                // No new editorHeight info - keep cached totalHeight and estimate editorHeight
                const estimate = this.estimateEditorHeight(state.font?.lineHeight ?? this._layoutInfo.fontInfo?.lineHeight);
                editorHeight = estimate.editorHeight;
                hasHorizontalScrolling = estimate.hasHorizontalScrolling;
                totalHeight = this._layoutInfo.totalHeight;
                newState = CellLayoutState.FromCache;
            }
            else if (state.editorHeight || this._layoutInfo.layoutState === CellLayoutState.Measured) {
                // Editor has been measured
                editorHeight = this._editorHeight;
                totalHeight = this.computeTotalHeight(this._editorHeight, outputTotalHeight, outputShowMoreContainerHeight, chatHeight);
                newState = CellLayoutState.Measured;
                hasHorizontalScrolling = this._layoutInfo.estimatedHasHorizontalScrolling;
            }
            else {
                const estimate = this.estimateEditorHeight(state.font?.lineHeight ?? this._layoutInfo.fontInfo?.lineHeight);
                editorHeight = estimate.editorHeight;
                hasHorizontalScrolling = estimate.hasHorizontalScrolling;
                totalHeight = this.computeTotalHeight(editorHeight, outputTotalHeight, outputShowMoreContainerHeight, chatHeight);
                newState = CellLayoutState.Estimated;
            }
            const statusBarHeight = this.viewContext.notebookOptions.computeEditorStatusbarHeight(this.internalMetadata, this.uri);
            const codeIndicatorHeight = editorHeight + statusBarHeight;
            const outputIndicatorHeight = outputTotalHeight + outputShowMoreContainerHeight;
            const outputContainerOffset = notebookLayoutConfiguration.editorToolbarHeight
                + notebookLayoutConfiguration.cellTopMargin // CELL_TOP_MARGIN
                + chatHeight
                + editorHeight
                + statusBarHeight;
            const outputShowMoreContainerOffset = totalHeight
                - bottomToolbarDimensions.bottomToolbarGap
                - bottomToolbarDimensions.bottomToolbarHeight / 2
                - outputShowMoreContainerHeight;
            const bottomToolbarOffset = this.viewContext.notebookOptions.computeBottomToolbarOffset(totalHeight, this.viewType);
            const editorWidth = state.outerWidth !== undefined
                ? this.viewContext.notebookOptions.computeCodeCellEditorWidth(state.outerWidth)
                : this._layoutInfo?.editorWidth;
            this._layoutInfo = {
                fontInfo: state.font ?? this._layoutInfo.fontInfo ?? null,
                chatHeight,
                editorHeight,
                editorWidth,
                statusBarHeight,
                outputContainerOffset,
                outputTotalHeight,
                outputShowMoreContainerHeight,
                outputShowMoreContainerOffset,
                commentOffset: outputContainerOffset + outputTotalHeight,
                commentHeight,
                totalHeight,
                codeIndicatorHeight,
                outputIndicatorHeight,
                bottomToolbarOffset,
                layoutState: newState,
                estimatedHasHorizontalScrolling: hasHorizontalScrolling
            };
        }
        else {
            const codeIndicatorHeight = notebookLayoutConfiguration.collapsedIndicatorHeight;
            const outputIndicatorHeight = outputTotalHeight + outputShowMoreContainerHeight;
            const chatHeight = state.chatHeight ? this._chatHeight : this._layoutInfo.chatHeight;
            const outputContainerOffset = notebookLayoutConfiguration.cellTopMargin + notebookLayoutConfiguration.collapsedIndicatorHeight;
            const totalHeight = notebookLayoutConfiguration.cellTopMargin
                + notebookLayoutConfiguration.collapsedIndicatorHeight
                + notebookLayoutConfiguration.cellBottomMargin //CELL_BOTTOM_MARGIN
                + bottomToolbarDimensions.bottomToolbarGap //BOTTOM_CELL_TOOLBAR_GAP
                + chatHeight
                + commentHeight
                + outputTotalHeight + outputShowMoreContainerHeight;
            const outputShowMoreContainerOffset = totalHeight
                - bottomToolbarDimensions.bottomToolbarGap
                - bottomToolbarDimensions.bottomToolbarHeight / 2
                - outputShowMoreContainerHeight;
            const bottomToolbarOffset = this.viewContext.notebookOptions.computeBottomToolbarOffset(totalHeight, this.viewType);
            const editorWidth = state.outerWidth !== undefined
                ? this.viewContext.notebookOptions.computeCodeCellEditorWidth(state.outerWidth)
                : this._layoutInfo?.editorWidth;
            this._layoutInfo = {
                fontInfo: state.font ?? this._layoutInfo.fontInfo ?? null,
                editorHeight: this._layoutInfo.editorHeight,
                editorWidth,
                chatHeight: chatHeight,
                statusBarHeight: 0,
                outputContainerOffset,
                outputTotalHeight,
                outputShowMoreContainerHeight,
                outputShowMoreContainerOffset,
                commentOffset: outputContainerOffset + outputTotalHeight,
                commentHeight,
                totalHeight,
                codeIndicatorHeight,
                outputIndicatorHeight,
                bottomToolbarOffset,
                layoutState: this._layoutInfo.layoutState,
                estimatedHasHorizontalScrolling: false
            };
        }
        this._fireOnDidChangeLayout({
            ...state,
            totalHeight: this.layoutInfo.totalHeight !== originalLayout.totalHeight,
            source,
        });
    }
    _fireOnDidChangeLayout(state) {
        this._pauseableEmitter.fire(state);
    }
    restoreEditorViewState(editorViewStates, totalHeight) {
        super.restoreEditorViewState(editorViewStates);
        if (totalHeight !== undefined && this._layoutInfo.layoutState !== CellLayoutState.Measured) {
            this._layoutInfo = {
                ...this._layoutInfo,
                totalHeight: totalHeight,
                layoutState: CellLayoutState.FromCache,
            };
        }
    }
    getDynamicHeight() {
        this._onLayoutInfoRead.fire();
        return this._layoutInfo.totalHeight;
    }
    getHeight(lineHeight) {
        if (this._layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            const estimate = this.estimateEditorHeight(lineHeight);
            return this.computeTotalHeight(estimate.editorHeight, 0, 0, 0);
        }
        else {
            return this._layoutInfo.totalHeight;
        }
    }
    estimateEditorHeight(lineHeight = 20) {
        let hasHorizontalScrolling = false;
        const cellEditorOptions = this.viewContext.getBaseCellEditorOptions(this.language);
        if (this.layoutInfo.fontInfo && cellEditorOptions.value.wordWrap === 'off') {
            for (let i = 0; i < this.lineCount; i++) {
                const max = this.textBuffer.getLineLastNonWhitespaceColumn(i + 1);
                const estimatedWidth = max * (this.layoutInfo.fontInfo.typicalHalfwidthCharacterWidth + this.layoutInfo.fontInfo.letterSpacing);
                if (estimatedWidth > this.layoutInfo.editorWidth) {
                    hasHorizontalScrolling = true;
                    break;
                }
            }
        }
        const verticalScrollbarHeight = hasHorizontalScrolling ? 12 : 0; // take zoom level into account
        const editorPadding = this.viewContext.notebookOptions.computeEditorPadding(this.internalMetadata, this.uri);
        const editorHeight = this.lineCount * lineHeight
            + editorPadding.top
            + editorPadding.bottom // EDITOR_BOTTOM_PADDING
            + verticalScrollbarHeight;
        return {
            editorHeight,
            hasHorizontalScrolling
        };
    }
    computeTotalHeight(editorHeight, outputsTotalHeight, outputShowMoreContainerHeight, chatHeight) {
        const layoutConfiguration = this.viewContext.notebookOptions.getLayoutConfiguration();
        const { bottomToolbarGap } = this.viewContext.notebookOptions.computeBottomToolbarDimensions(this.viewType);
        return layoutConfiguration.editorToolbarHeight
            + layoutConfiguration.cellTopMargin
            + chatHeight
            + editorHeight
            + this.viewContext.notebookOptions.computeEditorStatusbarHeight(this.internalMetadata, this.uri)
            + this._commentHeight
            + outputsTotalHeight
            + outputShowMoreContainerHeight
            + bottomToolbarGap
            + layoutConfiguration.cellBottomMargin;
    }
    onDidChangeTextModelContent() {
        if (this.getEditState() !== CellEditState.Editing) {
            this.updateEditState(CellEditState.Editing, 'onDidChangeTextModelContent');
            this._onDidChangeState.fire({ contentChanged: true });
        }
    }
    onDeselect() {
        this.updateEditState(CellEditState.Preview, 'onDeselect');
    }
    updateOutputShowMoreContainerHeight(height) {
        this.layoutChange({ outputShowMoreContainerHeight: height }, 'CodeCellViewModel#updateOutputShowMoreContainerHeight');
    }
    updateOutputMinHeight(height) {
        this.outputMinHeight = height;
    }
    unlockOutputHeight() {
        this.outputMinHeight = 0;
        this.layoutChange({ outputHeight: true });
    }
    updateOutputHeight(index, height, source) {
        if (index >= this._outputCollection.length) {
            throw new Error('Output index out of range!');
        }
        this._ensureOutputsTop();
        try {
            if (index === 0 || height > 0) {
                this._outputViewModels[index].setVisible(true);
            }
            else if (height === 0) {
                this._outputViewModels[index].setVisible(false);
            }
        }
        catch (e) {
            const errorMessage = `Failed to update output height for cell ${this.handle}, output ${index}. `
                + `this.outputCollection.length: ${this._outputCollection.length}, this._outputViewModels.length: ${this._outputViewModels.length}`;
            throw new Error(`${errorMessage}.\n Error: ${e.message}`);
        }
        if (this._outputViewModels[index].visible.get() && height < 28) {
            height = 28;
        }
        this._outputCollection[index] = height;
        if (this._outputsTop.setValue(index, height)) {
            this.layoutChange({ outputHeight: true }, source);
        }
    }
    getOutputOffsetInContainer(index) {
        this._ensureOutputsTop();
        if (index >= this._outputCollection.length) {
            throw new Error('Output index out of range!');
        }
        return this._outputsTop.getPrefixSum(index - 1);
    }
    getOutputOffset(index) {
        return this.layoutInfo.outputContainerOffset + this.getOutputOffsetInContainer(index);
    }
    spliceOutputHeights(start, deleteCnt, heights) {
        this._ensureOutputsTop();
        this._outputsTop.removeValues(start, deleteCnt);
        if (heights.length) {
            const values = new Uint32Array(heights.length);
            for (let i = 0; i < heights.length; i++) {
                values[i] = heights[i];
            }
            this._outputsTop.insertValues(start, values);
        }
        this.layoutChange({ outputHeight: true }, 'CodeCellViewModel#spliceOutputs');
    }
    _ensureOutputsTop() {
        if (!this._outputsTop) {
            const values = new Uint32Array(this._outputCollection.length);
            for (let i = 0; i < this._outputCollection.length; i++) {
                values[i] = this._outputCollection[i];
            }
            this._outputsTop = new PrefixSumComputer(values);
        }
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
        this._outputCollection = [];
        this._outputsTop = null;
        dispose(this._outputViewModels);
    }
};
CodeCellViewModel = __decorate([
    __param(4, IConfigurationService),
    __param(5, INotebookService),
    __param(6, ITextModelService),
    __param(7, IUndoRedoService),
    __param(8, ICodeEditorService),
    __param(9, IInlineChatSessionService)
], CodeCellViewModel);
export { CodeCellViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNlbGxWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvY29kZUNlbGxWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFpQixlQUFlLEVBQXVGLE1BQU0sdUJBQXVCLENBQUM7QUFHM0ssT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHL0QsT0FBTyxFQUFFLFFBQVEsRUFBbUQsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFP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