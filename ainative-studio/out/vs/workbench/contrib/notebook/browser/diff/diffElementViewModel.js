/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { hash } from '../../../../../base/common/hash.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { DiffEditorWidget } from '../../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { getEditorPadding } from './diffCellEditorOptions.js';
import { DiffNestedCellViewModel } from './diffNestedCellViewModel.js';
import { NotebookDiffViewEventType } from './eventDispatcher.js';
import { DIFF_CELL_MARGIN, DiffSide } from './notebookDiffEditorBrowser.js';
import { CellLayoutState } from '../notebookBrowser.js';
import { getFormattedMetadataJSON } from '../../common/model/notebookCellTextModel.js';
import { CellUri } from '../../common/notebookCommon.js';
import { Schemas } from '../../../../../base/common/network.js';
import { NotebookDocumentMetadataTextModel } from '../../common/model/notebookMetadataTextModel.js';
const PropertyHeaderHeight = 25;
// From `.monaco-editor .diff-hidden-lines .center` in src/vs/editor/browser/widget/diffEditor/style.css
export const HeightOfHiddenLinesRegionInDiffEditor = 24;
export const DefaultLineHeight = 17;
export var PropertyFoldingState;
(function (PropertyFoldingState) {
    PropertyFoldingState[PropertyFoldingState["Expanded"] = 0] = "Expanded";
    PropertyFoldingState[PropertyFoldingState["Collapsed"] = 1] = "Collapsed";
})(PropertyFoldingState || (PropertyFoldingState = {}));
export const OUTPUT_EDITOR_HEIGHT_MAGIC = 1440;
export class DiffElementViewModelBase extends Disposable {
    constructor(mainDocumentTextModel, editorEventDispatcher, initData) {
        super();
        this.mainDocumentTextModel = mainDocumentTextModel;
        this.editorEventDispatcher = editorEventDispatcher;
        this.initData = initData;
        this._layoutInfoEmitter = this._register(new Emitter());
        this.onDidLayoutChange = this._layoutInfoEmitter.event;
        this._register(this.editorEventDispatcher.onDidChangeLayout(e => this._layoutInfoEmitter.fire({ outerWidth: true })));
    }
}
export class DiffElementPlaceholderViewModel extends DiffElementViewModelBase {
    constructor(mainDocumentTextModel, editorEventDispatcher, initData) {
        super(mainDocumentTextModel, editorEventDispatcher, initData);
        this.type = 'placeholder';
        this.hiddenCells = [];
        this._unfoldHiddenCells = this._register(new Emitter());
        this.onUnfoldHiddenCells = this._unfoldHiddenCells.event;
        this.renderOutput = false;
    }
    get totalHeight() {
        return 24 + (2 * DIFF_CELL_MARGIN);
    }
    getHeight(_) {
        return this.totalHeight;
    }
    layoutChange() {
        //
    }
    showHiddenCells() {
        this._unfoldHiddenCells.fire();
    }
}
export class NotebookDocumentMetadataViewModel extends DiffElementViewModelBase {
    set editorHeight(height) {
        this._layout({ editorHeight: height });
    }
    get editorHeight() {
        throw new Error('Use Cell.layoutInfo.editorHeight');
    }
    set editorMargin(margin) {
        this._layout({ editorMargin: margin });
    }
    get editorMargin() {
        throw new Error('Use Cell.layoutInfo.editorMargin');
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    get totalHeight() {
        return this.layoutInfo.totalHeight;
    }
    constructor(originalDocumentTextModel, modifiedDocumentTextModel, type, editorEventDispatcher, initData, notebookService, editorHeightCalculator) {
        super(originalDocumentTextModel, editorEventDispatcher, initData);
        this.originalDocumentTextModel = originalDocumentTextModel;
        this.modifiedDocumentTextModel = modifiedDocumentTextModel;
        this.type = type;
        this.editorHeightCalculator = editorHeightCalculator;
        this.renderOutput = false;
        this._sourceEditorViewState = null;
        const cellStatusHeight = PropertyHeaderHeight;
        this._layoutInfo = {
            width: 0,
            editorHeight: 0,
            editorMargin: 0,
            metadataHeight: 0,
            cellStatusHeight,
            metadataStatusHeight: 0,
            rawOutputHeight: 0,
            outputTotalHeight: 0,
            outputStatusHeight: 0,
            outputMetadataHeight: 0,
            bodyMargin: 32,
            totalHeight: 82 + cellStatusHeight + 0,
            layoutState: CellLayoutState.Uninitialized
        };
        this.cellFoldingState = type === 'modifiedMetadata' ? PropertyFoldingState.Expanded : PropertyFoldingState.Collapsed;
        this.originalMetadata = this._register(new NotebookDocumentMetadataTextModel(originalDocumentTextModel));
        this.modifiedMetadata = this._register(new NotebookDocumentMetadataTextModel(modifiedDocumentTextModel));
    }
    async computeHeights() {
        if (this.type === 'unchangedMetadata') {
            this.editorHeight = this.editorHeightCalculator.computeHeightFromLines(this.originalMetadata.textBuffer.getLineCount());
        }
        else {
            const original = this.originalMetadata.uri;
            const modified = this.modifiedMetadata.uri;
            this.editorHeight = await this.editorHeightCalculator.diffAndComputeHeight(original, modified);
        }
    }
    layoutChange() {
        this._layout({ recomputeOutput: true });
    }
    _layout(delta) {
        const width = delta.width !== undefined ? delta.width : this._layoutInfo.width;
        const editorHeight = delta.editorHeight !== undefined ? delta.editorHeight : this._layoutInfo.editorHeight;
        const editorMargin = delta.editorMargin !== undefined ? delta.editorMargin : this._layoutInfo.editorMargin;
        const cellStatusHeight = delta.cellStatusHeight !== undefined ? delta.cellStatusHeight : this._layoutInfo.cellStatusHeight;
        const bodyMargin = delta.bodyMargin !== undefined ? delta.bodyMargin : this._layoutInfo.bodyMargin;
        const totalHeight = editorHeight
            + editorMargin
            + cellStatusHeight
            + bodyMargin;
        const newLayout = {
            width: width,
            editorHeight: editorHeight,
            editorMargin: editorMargin,
            metadataHeight: 0,
            cellStatusHeight,
            metadataStatusHeight: 0,
            outputTotalHeight: 0,
            outputStatusHeight: 0,
            bodyMargin: bodyMargin,
            rawOutputHeight: 0,
            outputMetadataHeight: 0,
            totalHeight: totalHeight,
            layoutState: CellLayoutState.Measured
        };
        let somethingChanged = false;
        const changeEvent = {};
        if (newLayout.width !== this._layoutInfo.width) {
            changeEvent.width = true;
            somethingChanged = true;
        }
        if (newLayout.editorHeight !== this._layoutInfo.editorHeight) {
            changeEvent.editorHeight = true;
            somethingChanged = true;
        }
        if (newLayout.editorMargin !== this._layoutInfo.editorMargin) {
            changeEvent.editorMargin = true;
            somethingChanged = true;
        }
        if (newLayout.cellStatusHeight !== this._layoutInfo.cellStatusHeight) {
            changeEvent.cellStatusHeight = true;
            somethingChanged = true;
        }
        if (newLayout.bodyMargin !== this._layoutInfo.bodyMargin) {
            changeEvent.bodyMargin = true;
            somethingChanged = true;
        }
        if (newLayout.totalHeight !== this._layoutInfo.totalHeight) {
            changeEvent.totalHeight = true;
            somethingChanged = true;
        }
        if (somethingChanged) {
            this._layoutInfo = newLayout;
            this._fireLayoutChangeEvent(changeEvent);
        }
    }
    getHeight(lineHeight) {
        if (this._layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            const editorHeight = this.cellFoldingState === PropertyFoldingState.Collapsed ? 0 : this.computeInputEditorHeight(lineHeight);
            return this._computeTotalHeight(editorHeight);
        }
        else {
            return this._layoutInfo.totalHeight;
        }
    }
    _computeTotalHeight(editorHeight) {
        const totalHeight = editorHeight
            + this._layoutInfo.editorMargin
            + this._layoutInfo.metadataHeight
            + this._layoutInfo.cellStatusHeight
            + this._layoutInfo.metadataStatusHeight
            + this._layoutInfo.outputTotalHeight
            + this._layoutInfo.outputStatusHeight
            + this._layoutInfo.outputMetadataHeight
            + this._layoutInfo.bodyMargin;
        return totalHeight;
    }
    computeInputEditorHeight(_lineHeight) {
        return this.editorHeightCalculator.computeHeightFromLines(Math.max(this.originalMetadata.textBuffer.getLineCount(), this.modifiedMetadata.textBuffer.getLineCount()));
    }
    _fireLayoutChangeEvent(state) {
        this._layoutInfoEmitter.fire(state);
        this.editorEventDispatcher.emit([{ type: NotebookDiffViewEventType.CellLayoutChanged, source: this._layoutInfo }]);
    }
    getComputedCellContainerWidth(layoutInfo, diffEditor, fullWidth) {
        if (fullWidth) {
            return layoutInfo.width - 2 * DIFF_CELL_MARGIN + (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0) - 2;
        }
        return (layoutInfo.width - 2 * DIFF_CELL_MARGIN + (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0)) / 2 - 18 - 2;
    }
    getSourceEditorViewState() {
        return this._sourceEditorViewState;
    }
    saveSpirceEditorViewState(viewState) {
        this._sourceEditorViewState = viewState;
    }
}
export class DiffElementCellViewModelBase extends DiffElementViewModelBase {
    hideUnchangedCells() {
        this._hideUnchangedCells.fire();
    }
    set rawOutputHeight(height) {
        this._layout({ rawOutputHeight: Math.min(OUTPUT_EDITOR_HEIGHT_MAGIC, height) });
    }
    get rawOutputHeight() {
        throw new Error('Use Cell.layoutInfo.rawOutputHeight');
    }
    set outputStatusHeight(height) {
        this._layout({ outputStatusHeight: height });
    }
    get outputStatusHeight() {
        throw new Error('Use Cell.layoutInfo.outputStatusHeight');
    }
    set outputMetadataHeight(height) {
        this._layout({ outputMetadataHeight: height });
    }
    get outputMetadataHeight() {
        throw new Error('Use Cell.layoutInfo.outputStatusHeight');
    }
    set editorHeight(height) {
        this._layout({ editorHeight: height });
    }
    get editorHeight() {
        throw new Error('Use Cell.layoutInfo.editorHeight');
    }
    set editorMargin(margin) {
        this._layout({ editorMargin: margin });
    }
    get editorMargin() {
        throw new Error('Use Cell.layoutInfo.editorMargin');
    }
    set metadataStatusHeight(height) {
        this._layout({ metadataStatusHeight: height });
    }
    get metadataStatusHeight() {
        throw new Error('Use Cell.layoutInfo.outputStatusHeight');
    }
    set metadataHeight(height) {
        this._layout({ metadataHeight: height });
    }
    get metadataHeight() {
        throw new Error('Use Cell.layoutInfo.metadataHeight');
    }
    set renderOutput(value) {
        this._renderOutput = value;
        this._layout({ recomputeOutput: true });
        this._stateChangeEmitter.fire({ renderOutput: this._renderOutput });
    }
    get renderOutput() {
        return this._renderOutput;
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    get totalHeight() {
        return this.layoutInfo.totalHeight;
    }
    get ignoreOutputs() {
        return this.configurationService.getValue('notebook.diff.ignoreOutputs') || !!(this.mainDocumentTextModel?.transientOptions.transientOutputs);
    }
    get ignoreMetadata() {
        return this.configurationService.getValue('notebook.diff.ignoreMetadata');
    }
    constructor(mainDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, index, configurationService, diffEditorHeightCalculator) {
        super(mainDocumentTextModel, editorEventDispatcher, initData);
        this.type = type;
        this.index = index;
        this.configurationService = configurationService;
        this.diffEditorHeightCalculator = diffEditorHeightCalculator;
        this._stateChangeEmitter = this._register(new Emitter());
        this.onDidStateChange = this._stateChangeEmitter.event;
        this._hideUnchangedCells = this._register(new Emitter());
        this.onHideUnchangedCells = this._hideUnchangedCells.event;
        this._renderOutput = true;
        this._sourceEditorViewState = null;
        this._outputEditorViewState = null;
        this._metadataEditorViewState = null;
        this.original = original ? this._register(new DiffNestedCellViewModel(original, notebookService)) : undefined;
        this.modified = modified ? this._register(new DiffNestedCellViewModel(modified, notebookService)) : undefined;
        const editorHeight = this._estimateEditorHeight(initData.fontInfo);
        const cellStatusHeight = PropertyHeaderHeight;
        this._layoutInfo = {
            width: 0,
            editorHeight: editorHeight,
            editorMargin: 0,
            metadataHeight: 0,
            cellStatusHeight,
            metadataStatusHeight: this.ignoreMetadata ? 0 : PropertyHeaderHeight,
            rawOutputHeight: 0,
            outputTotalHeight: 0,
            outputStatusHeight: this.ignoreOutputs ? 0 : PropertyHeaderHeight,
            outputMetadataHeight: 0,
            bodyMargin: 32,
            totalHeight: 82 + cellStatusHeight + editorHeight,
            layoutState: CellLayoutState.Uninitialized
        };
        this.cellFoldingState = modified?.getTextBufferHash() !== original?.getTextBufferHash() ? PropertyFoldingState.Expanded : PropertyFoldingState.Collapsed;
        this.metadataFoldingState = PropertyFoldingState.Collapsed;
        this.outputFoldingState = PropertyFoldingState.Collapsed;
    }
    layoutChange() {
        this._layout({ recomputeOutput: true });
    }
    _estimateEditorHeight(fontInfo) {
        const lineHeight = fontInfo?.lineHeight ?? 17;
        switch (this.type) {
            case 'unchanged':
            case 'insert':
                {
                    const lineCount = this.modified.textModel.textBuffer.getLineCount();
                    const editorHeight = lineCount * lineHeight + getEditorPadding(lineCount).top + getEditorPadding(lineCount).bottom;
                    return editorHeight;
                }
            case 'delete':
            case 'modified':
                {
                    const lineCount = this.original.textModel.textBuffer.getLineCount();
                    const editorHeight = lineCount * lineHeight + getEditorPadding(lineCount).top + getEditorPadding(lineCount).bottom;
                    return editorHeight;
                }
        }
    }
    _layout(delta) {
        const width = delta.width !== undefined ? delta.width : this._layoutInfo.width;
        const editorHeight = delta.editorHeight !== undefined ? delta.editorHeight : this._layoutInfo.editorHeight;
        const editorMargin = delta.editorMargin !== undefined ? delta.editorMargin : this._layoutInfo.editorMargin;
        const metadataHeight = delta.metadataHeight !== undefined ? delta.metadataHeight : this._layoutInfo.metadataHeight;
        const cellStatusHeight = delta.cellStatusHeight !== undefined ? delta.cellStatusHeight : this._layoutInfo.cellStatusHeight;
        const metadataStatusHeight = delta.metadataStatusHeight !== undefined ? delta.metadataStatusHeight : this._layoutInfo.metadataStatusHeight;
        const rawOutputHeight = delta.rawOutputHeight !== undefined ? delta.rawOutputHeight : this._layoutInfo.rawOutputHeight;
        const outputStatusHeight = delta.outputStatusHeight !== undefined ? delta.outputStatusHeight : this._layoutInfo.outputStatusHeight;
        const bodyMargin = delta.bodyMargin !== undefined ? delta.bodyMargin : this._layoutInfo.bodyMargin;
        const outputMetadataHeight = delta.outputMetadataHeight !== undefined ? delta.outputMetadataHeight : this._layoutInfo.outputMetadataHeight;
        const outputHeight = this.ignoreOutputs ? 0 : (delta.recomputeOutput || delta.rawOutputHeight !== undefined || delta.outputMetadataHeight !== undefined) ? this._getOutputTotalHeight(rawOutputHeight, outputMetadataHeight) : this._layoutInfo.outputTotalHeight;
        const totalHeight = editorHeight
            + editorMargin
            + cellStatusHeight
            + metadataHeight
            + metadataStatusHeight
            + outputHeight
            + outputStatusHeight
            + bodyMargin;
        const newLayout = {
            width: width,
            editorHeight: editorHeight,
            editorMargin: editorMargin,
            metadataHeight: metadataHeight,
            cellStatusHeight,
            metadataStatusHeight: metadataStatusHeight,
            outputTotalHeight: outputHeight,
            outputStatusHeight: outputStatusHeight,
            bodyMargin: bodyMargin,
            rawOutputHeight: rawOutputHeight,
            outputMetadataHeight: outputMetadataHeight,
            totalHeight: totalHeight,
            layoutState: CellLayoutState.Measured
        };
        let somethingChanged = false;
        const changeEvent = {};
        if (newLayout.width !== this._layoutInfo.width) {
            changeEvent.width = true;
            somethingChanged = true;
        }
        if (newLayout.editorHeight !== this._layoutInfo.editorHeight) {
            changeEvent.editorHeight = true;
            somethingChanged = true;
        }
        if (newLayout.editorMargin !== this._layoutInfo.editorMargin) {
            changeEvent.editorMargin = true;
            somethingChanged = true;
        }
        if (newLayout.metadataHeight !== this._layoutInfo.metadataHeight) {
            changeEvent.metadataHeight = true;
            somethingChanged = true;
        }
        if (newLayout.cellStatusHeight !== this._layoutInfo.cellStatusHeight) {
            changeEvent.cellStatusHeight = true;
            somethingChanged = true;
        }
        if (newLayout.metadataStatusHeight !== this._layoutInfo.metadataStatusHeight) {
            changeEvent.metadataStatusHeight = true;
            somethingChanged = true;
        }
        if (newLayout.outputTotalHeight !== this._layoutInfo.outputTotalHeight) {
            changeEvent.outputTotalHeight = true;
            somethingChanged = true;
        }
        if (newLayout.outputStatusHeight !== this._layoutInfo.outputStatusHeight) {
            changeEvent.outputStatusHeight = true;
            somethingChanged = true;
        }
        if (newLayout.bodyMargin !== this._layoutInfo.bodyMargin) {
            changeEvent.bodyMargin = true;
            somethingChanged = true;
        }
        if (newLayout.outputMetadataHeight !== this._layoutInfo.outputMetadataHeight) {
            changeEvent.outputMetadataHeight = true;
            somethingChanged = true;
        }
        if (newLayout.totalHeight !== this._layoutInfo.totalHeight) {
            changeEvent.totalHeight = true;
            somethingChanged = true;
        }
        if (somethingChanged) {
            this._layoutInfo = newLayout;
            this._fireLayoutChangeEvent(changeEvent);
        }
    }
    getHeight(lineHeight) {
        if (this._layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            const editorHeight = this.cellFoldingState === PropertyFoldingState.Collapsed ? 0 : this.computeInputEditorHeight(lineHeight);
            return this._computeTotalHeight(editorHeight);
        }
        else {
            return this._layoutInfo.totalHeight;
        }
    }
    _computeTotalHeight(editorHeight) {
        const totalHeight = editorHeight
            + this._layoutInfo.editorMargin
            + this._layoutInfo.metadataHeight
            + this._layoutInfo.cellStatusHeight
            + this._layoutInfo.metadataStatusHeight
            + this._layoutInfo.outputTotalHeight
            + this._layoutInfo.outputStatusHeight
            + this._layoutInfo.outputMetadataHeight
            + this._layoutInfo.bodyMargin;
        return totalHeight;
    }
    computeInputEditorHeight(lineHeight) {
        const lineCount = Math.max(this.original?.textModel.textBuffer.getLineCount() ?? 1, this.modified?.textModel.textBuffer.getLineCount() ?? 1);
        return this.diffEditorHeightCalculator.computeHeightFromLines(lineCount);
    }
    _getOutputTotalHeight(rawOutputHeight, metadataHeight) {
        if (this.outputFoldingState === PropertyFoldingState.Collapsed) {
            return 0;
        }
        if (this.renderOutput) {
            if (this.isOutputEmpty()) {
                // single line;
                return 24;
            }
            return this.getRichOutputTotalHeight() + metadataHeight;
        }
        else {
            return rawOutputHeight;
        }
    }
    _fireLayoutChangeEvent(state) {
        this._layoutInfoEmitter.fire(state);
        this.editorEventDispatcher.emit([{ type: NotebookDiffViewEventType.CellLayoutChanged, source: this._layoutInfo }]);
    }
    getComputedCellContainerWidth(layoutInfo, diffEditor, fullWidth) {
        if (fullWidth) {
            return layoutInfo.width - 2 * DIFF_CELL_MARGIN + (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0) - 2;
        }
        return (layoutInfo.width - 2 * DIFF_CELL_MARGIN + (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0)) / 2 - 18 - 2;
    }
    getOutputEditorViewState() {
        return this._outputEditorViewState;
    }
    saveOutputEditorViewState(viewState) {
        this._outputEditorViewState = viewState;
    }
    getMetadataEditorViewState() {
        return this._metadataEditorViewState;
    }
    saveMetadataEditorViewState(viewState) {
        this._metadataEditorViewState = viewState;
    }
    getSourceEditorViewState() {
        return this._sourceEditorViewState;
    }
    saveSpirceEditorViewState(viewState) {
        this._sourceEditorViewState = viewState;
    }
}
export class SideBySideDiffElementViewModel extends DiffElementCellViewModelBase {
    get originalDocument() {
        return this.otherDocumentTextModel;
    }
    get modifiedDocument() {
        return this.mainDocumentTextModel;
    }
    constructor(mainDocumentTextModel, otherDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, configurationService, index, diffEditorHeightCalculator) {
        super(mainDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, index, configurationService, diffEditorHeightCalculator);
        this.otherDocumentTextModel = otherDocumentTextModel;
        this.type = type;
        this.cellFoldingState = this.modified.textModel.getValue() !== this.original.textModel.getValue() ? PropertyFoldingState.Expanded : PropertyFoldingState.Collapsed;
        this.metadataFoldingState = PropertyFoldingState.Collapsed;
        this.outputFoldingState = PropertyFoldingState.Collapsed;
        if (this.checkMetadataIfModified()) {
            this.metadataFoldingState = PropertyFoldingState.Expanded;
        }
        if (this.checkIfOutputsModified()) {
            this.outputFoldingState = PropertyFoldingState.Expanded;
        }
        this._register(this.original.onDidChangeOutputLayout(() => {
            this._layout({ recomputeOutput: true });
        }));
        this._register(this.modified.onDidChangeOutputLayout(() => {
            this._layout({ recomputeOutput: true });
        }));
        this._register(this.modified.textModel.onDidChangeContent(() => {
            if (mainDocumentTextModel.transientOptions.cellContentMetadata) {
                const cellMetadataKeys = [...Object.keys(mainDocumentTextModel.transientOptions.cellContentMetadata)];
                const modifiedMedataRaw = Object.assign({}, this.modified.metadata);
                const originalCellMetadata = this.original.metadata;
                for (const key of cellMetadataKeys) {
                    if (key in originalCellMetadata) {
                        modifiedMedataRaw[key] = originalCellMetadata[key];
                    }
                }
                this.modified.textModel.metadata = modifiedMedataRaw;
            }
        }));
    }
    checkIfInputModified() {
        if (this.original.textModel.getTextBufferHash() === this.modified.textModel.getTextBufferHash()) {
            return false;
        }
        return {
            reason: 'Cell content has changed',
        };
    }
    checkIfOutputsModified() {
        if (this.mainDocumentTextModel.transientOptions.transientOutputs || this.ignoreOutputs) {
            return false;
        }
        const ret = outputsEqual(this.original?.outputs ?? [], this.modified?.outputs ?? []);
        if (ret === 0 /* OutputComparison.Unchanged */) {
            return false;
        }
        return {
            reason: ret === 1 /* OutputComparison.Metadata */ ? 'Output metadata has changed' : undefined,
            kind: ret
        };
    }
    checkMetadataIfModified() {
        if (this.ignoreMetadata) {
            return false;
        }
        const modified = hash(getFormattedMetadataJSON(this.mainDocumentTextModel.transientOptions.transientCellMetadata, this.original?.metadata || {}, this.original?.language)) !== hash(getFormattedMetadataJSON(this.mainDocumentTextModel.transientOptions.transientCellMetadata, this.modified?.metadata ?? {}, this.modified?.language));
        if (modified) {
            return { reason: undefined };
        }
        else {
            return false;
        }
    }
    updateOutputHeight(diffSide, index, height) {
        if (diffSide === DiffSide.Original) {
            this.original.updateOutputHeight(index, height);
        }
        else {
            this.modified.updateOutputHeight(index, height);
        }
    }
    getOutputOffsetInContainer(diffSide, index) {
        if (diffSide === DiffSide.Original) {
            return this.original.getOutputOffset(index);
        }
        else {
            return this.modified.getOutputOffset(index);
        }
    }
    getOutputOffsetInCell(diffSide, index) {
        const offsetInOutputsContainer = this.getOutputOffsetInContainer(diffSide, index);
        return this._layoutInfo.editorHeight
            + this._layoutInfo.editorMargin
            + this._layoutInfo.metadataHeight
            + this._layoutInfo.cellStatusHeight
            + this._layoutInfo.metadataStatusHeight
            + this._layoutInfo.outputStatusHeight
            + this._layoutInfo.bodyMargin / 2
            + offsetInOutputsContainer;
    }
    isOutputEmpty() {
        if (this.mainDocumentTextModel.transientOptions.transientOutputs) {
            return true;
        }
        if (this.checkIfOutputsModified()) {
            return false;
        }
        // outputs are not changed
        return (this.original?.outputs || []).length === 0;
    }
    getRichOutputTotalHeight() {
        return Math.max(this.original.getOutputTotalHeight(), this.modified.getOutputTotalHeight());
    }
    getNestedCellViewModel(diffSide) {
        return diffSide === DiffSide.Original ? this.original : this.modified;
    }
    getCellByUri(cellUri) {
        if (cellUri.toString() === this.original.uri.toString()) {
            return this.original;
        }
        else {
            return this.modified;
        }
    }
    computeInputEditorHeight(lineHeight) {
        if (this.type === 'modified' &&
            typeof this.editorHeightWithUnchangedLinesCollapsed === 'number' &&
            this.checkIfInputModified()) {
            return this.editorHeightWithUnchangedLinesCollapsed;
        }
        return super.computeInputEditorHeight(lineHeight);
    }
    async computeModifiedInputEditorHeight() {
        if (this.checkIfInputModified()) {
            this.editorHeightWithUnchangedLinesCollapsed = this._layoutInfo.editorHeight = await this.diffEditorHeightCalculator.diffAndComputeHeight(this.original.uri, this.modified.uri);
        }
    }
    async computeModifiedMetadataEditorHeight() {
        if (this.checkMetadataIfModified()) {
            const originalMetadataUri = CellUri.generateCellPropertyUri(this.originalDocument.uri, this.original.handle, Schemas.vscodeNotebookCellMetadata);
            const modifiedMetadataUri = CellUri.generateCellPropertyUri(this.modifiedDocument.uri, this.modified.handle, Schemas.vscodeNotebookCellMetadata);
            this._layoutInfo.metadataHeight = await this.diffEditorHeightCalculator.diffAndComputeHeight(originalMetadataUri, modifiedMetadataUri);
        }
    }
    async computeEditorHeights() {
        if (this.type === 'unchanged') {
            return;
        }
        await Promise.all([this.computeModifiedInputEditorHeight(), this.computeModifiedMetadataEditorHeight()]);
    }
}
export class SingleSideDiffElementViewModel extends DiffElementCellViewModelBase {
    get cellViewModel() {
        return this.type === 'insert' ? this.modified : this.original;
    }
    get originalDocument() {
        if (this.type === 'insert') {
            return this.otherDocumentTextModel;
        }
        else {
            return this.mainDocumentTextModel;
        }
    }
    get modifiedDocument() {
        if (this.type === 'insert') {
            return this.mainDocumentTextModel;
        }
        else {
            return this.otherDocumentTextModel;
        }
    }
    constructor(mainDocumentTextModel, otherDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, configurationService, diffEditorHeightCalculator, index) {
        super(mainDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, index, configurationService, diffEditorHeightCalculator);
        this.otherDocumentTextModel = otherDocumentTextModel;
        this.type = type;
        this._register(this.cellViewModel.onDidChangeOutputLayout(() => {
            this._layout({ recomputeOutput: true });
        }));
    }
    checkIfInputModified() {
        return {
            reason: 'Cell content has changed',
        };
    }
    getNestedCellViewModel(diffSide) {
        return this.type === 'insert' ? this.modified : this.original;
    }
    checkIfOutputsModified() {
        return false;
    }
    checkMetadataIfModified() {
        return false;
    }
    updateOutputHeight(diffSide, index, height) {
        this.cellViewModel?.updateOutputHeight(index, height);
    }
    getOutputOffsetInContainer(diffSide, index) {
        return this.cellViewModel.getOutputOffset(index);
    }
    getOutputOffsetInCell(diffSide, index) {
        const offsetInOutputsContainer = this.cellViewModel.getOutputOffset(index);
        return this._layoutInfo.editorHeight
            + this._layoutInfo.editorMargin
            + this._layoutInfo.metadataHeight
            + this._layoutInfo.cellStatusHeight
            + this._layoutInfo.metadataStatusHeight
            + this._layoutInfo.outputStatusHeight
            + this._layoutInfo.bodyMargin / 2
            + offsetInOutputsContainer;
    }
    isOutputEmpty() {
        if (this.mainDocumentTextModel.transientOptions.transientOutputs) {
            return true;
        }
        // outputs are not changed
        return (this.original?.outputs || this.modified?.outputs || []).length === 0;
    }
    getRichOutputTotalHeight() {
        return this.cellViewModel?.getOutputTotalHeight() ?? 0;
    }
    getCellByUri(cellUri) {
        return this.cellViewModel;
    }
}
export var OutputComparison;
(function (OutputComparison) {
    OutputComparison[OutputComparison["Unchanged"] = 0] = "Unchanged";
    OutputComparison[OutputComparison["Metadata"] = 1] = "Metadata";
    OutputComparison[OutputComparison["Other"] = 2] = "Other";
})(OutputComparison || (OutputComparison = {}));
export function outputEqual(a, b) {
    if (hash(a.metadata) === hash(b.metadata)) {
        return 2 /* OutputComparison.Other */;
    }
    // metadata not equal
    for (let j = 0; j < a.outputs.length; j++) {
        const aOutputItem = a.outputs[j];
        const bOutputItem = b.outputs[j];
        if (aOutputItem.mime !== bOutputItem.mime) {
            return 2 /* OutputComparison.Other */;
        }
        if (aOutputItem.data.buffer.length !== bOutputItem.data.buffer.length) {
            return 2 /* OutputComparison.Other */;
        }
        for (let k = 0; k < aOutputItem.data.buffer.length; k++) {
            if (aOutputItem.data.buffer[k] !== bOutputItem.data.buffer[k]) {
                return 2 /* OutputComparison.Other */;
            }
        }
    }
    return 1 /* OutputComparison.Metadata */;
}
function outputsEqual(original, modified) {
    if (original.length !== modified.length) {
        return 2 /* OutputComparison.Other */;
    }
    const len = original.length;
    for (let i = 0; i < len; i++) {
        const a = original[i];
        const b = modified[i];
        if (hash(a.metadata) !== hash(b.metadata)) {
            return 1 /* OutputComparison.Metadata */;
        }
        if (a.outputs.length !== b.outputs.length) {
            return 2 /* OutputComparison.Other */;
        }
        for (let j = 0; j < a.outputs.length; j++) {
            const aOutputItem = a.outputs[j];
            const bOutputItem = b.outputs[j];
            if (aOutputItem.mime !== bOutputItem.mime) {
                return 2 /* OutputComparison.Other */;
            }
            if (aOutputItem.data.buffer.length !== bOutputItem.data.buffer.length) {
                return 2 /* OutputComparison.Other */;
            }
            for (let k = 0; k < aOutputItem.data.buffer.length; k++) {
                if (aOutputItem.data.buffer[k] !== bOutputItem.data.buffer[k]) {
                    return 2 /* OutputComparison.Other */;
                }
            }
        }
    }
    return 0 /* OutputComparison.Unchanged */;
}
export function getStreamOutputData(outputs) {
    if (!outputs.length) {
        return null;
    }
    const first = outputs[0];
    const mime = first.mime;
    const sameStream = !outputs.find(op => op.mime !== mime);
    if (sameStream) {
        return outputs.map(opit => opit.data.toString()).join('');
    }
    else {
        return null;
    }
}
export function getFormattedOutputJSON(outputs) {
    if (outputs.length === 1) {
        const streamOutputData = getStreamOutputData(outputs[0].outputs);
        if (streamOutputData) {
            return streamOutputData;
        }
    }
    return JSON.stringify(outputs.map(output => {
        return ({
            metadata: output.metadata,
            outputItems: output.outputs.map(opit => ({
                mimeType: opit.mime,
                data: opit.data.toString()
            }))
        });
    }), undefined, '\t');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVsZW1lbnRWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2RpZmZFbGVtZW50Vmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBR3ZHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzlELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBcUMseUJBQXlCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNwRyxPQUFPLEVBQXNDLGdCQUFnQixFQUFFLFFBQVEsRUFBMEIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4SSxPQUFPLEVBQUUsZUFBZSxFQUF5QixNQUFNLHVCQUF1QixDQUFDO0FBRS9FLE9BQU8sRUFBRSx3QkFBd0IsRUFBeUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RyxPQUFPLEVBQUUsT0FBTyxFQUErRCxNQUFNLGdDQUFnQyxDQUFDO0FBR3RILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVwRyxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQztBQUVoQyx3R0FBd0c7QUFDeEcsTUFBTSxDQUFDLE1BQU0s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