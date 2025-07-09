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
var NotebookTextDiffEditor_1;
import * as nls from '../../../../../nls.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { findLastIdx } from '../../../../../base/common/arraysFind.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService, registerThemingParticipant } from '../../../../../platform/theme/common/themeService.js';
import { getDefaultNotebookCreationOptions } from '../notebookEditorWidget.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { SideBySideDiffElementViewModel } from './diffElementViewModel.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { CellDiffPlaceholderRenderer, CellDiffSideBySideRenderer, CellDiffSingleSideRenderer, NotebookCellTextDiffListDelegate, NotebookDocumentMetadataDiffRenderer, NotebookTextDiffList } from './notebookDiffList.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { diffDiagonalFill, editorBackground, focusBorder, foreground } from '../../../../../platform/theme/common/colorRegistry.js';
import { INotebookEditorWorkerService } from '../../common/services/notebookWorkerService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { BareFontInfo } from '../../../../../editor/common/config/fontInfo.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { DiffSide, DIFF_CELL_MARGIN } from './notebookDiffEditorBrowser.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { EditorPane } from '../../../../browser/parts/editor/editorPane.js';
import { CellUri, NOTEBOOK_DIFF_EDITOR_ID, NotebookSetting } from '../../common/notebookCommon.js';
import { SequencerByKey } from '../../../../../base/common/async.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { BackLayerWebView } from '../view/renderers/backLayerWebView.js';
import { NotebookDiffEditorEventDispatcher, NotebookDiffLayoutChangedEvent } from './eventDispatcher.js';
import { FontMeasurements } from '../../../../../editor/browser/config/fontMeasurements.js';
import { NotebookOptions } from '../notebookOptions.js';
import { cellIndexesToRanges, cellRangesToIndexes } from '../../common/notebookRange.js';
import { NotebookDiffOverviewRuler } from './notebookDiffOverviewRuler.js';
import { registerZIndex, ZIndex } from '../../../../../platform/layout/browser/zIndexRegistry.js';
import { NotebookDiffViewModel } from './notebookDiffViewModel.js';
import { INotebookService } from '../../common/notebookService.js';
import { DiffEditorHeightCalculatorService } from './editorHeightCalculator.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { NotebookInlineDiffWidget } from './inlineDiff/notebookInlineDiffWidget.js';
import { observableValue } from '../../../../../base/common/observable.js';
const $ = DOM.$;
class NotebookDiffEditorSelection {
    constructor(selections) {
        this.selections = selections;
    }
    compare(other) {
        if (!(other instanceof NotebookDiffEditorSelection)) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        if (this.selections.length !== other.selections.length) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        for (let i = 0; i < this.selections.length; i++) {
            if (this.selections[i] !== other.selections[i]) {
                return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
            }
        }
        return 1 /* EditorPaneSelectionCompareResult.IDENTICAL */;
    }
    restore(options) {
        const notebookOptions = {
            cellSelections: cellIndexesToRanges(this.selections)
        };
        Object.assign(notebookOptions, options);
        return notebookOptions;
    }
}
let NotebookTextDiffEditor = class NotebookTextDiffEditor extends EditorPane {
    static { NotebookTextDiffEditor_1 = this; }
    static { this.ENTIRE_DIFF_OVERVIEW_WIDTH = 30; }
    static { this.ID = NOTEBOOK_DIFF_EDITOR_ID; }
    get textModel() {
        return this._model?.modified.notebook;
    }
    get inlineNotebookEditor() {
        if (this._inlineView) {
            return this.inlineDiffWidget?.editorWidget;
        }
        return undefined;
    }
    get notebookOptions() {
        return this._notebookOptions;
    }
    get isDisposed() {
        return this._isDisposed;
    }
    constructor(group, instantiationService, themeService, contextKeyService, notebookEditorWorkerService, configurationService, telemetryService, storageService, notebookService, editorService) {
        super(NotebookTextDiffEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.configurationService = configurationService;
        this.notebookService = notebookService;
        this.editorService = editorService;
        this.creationOptions = getDefaultNotebookCreationOptions();
        this._dimension = undefined;
        this._modifiedWebview = null;
        this._originalWebview = null;
        this._webviewTransparentCover = null;
        this._inlineView = false;
        this._onMouseUp = this._register(new Emitter());
        this.onMouseUp = this._onMouseUp.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this.onDidChangeScroll = this._onDidScroll.event;
        this._model = null;
        this._modifiedResourceDisposableStore = this._register(new DisposableStore());
        this._insetModifyQueueByOutputId = new SequencerByKey();
        this._onDidDynamicOutputRendered = this._register(new Emitter());
        this.onDidDynamicOutputRendered = this._onDidDynamicOutputRendered.event;
        this._localStore = this._register(new DisposableStore());
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._isDisposed = false;
        this._currentChangedIndex = observableValue(this, -1);
        this.currentChangedIndex = this._currentChangedIndex;
        this.pendingLayouts = new WeakMap();
        this.diffEditorCalcuator = this.instantiationService.createInstance(DiffEditorHeightCalculatorService, this.fontInfo.lineHeight);
        this._notebookOptions = instantiationService.createInstance(NotebookOptions, this.window, false, undefined);
        this._register(this._notebookOptions);
        this._revealFirst = true;
    }
    get fontInfo() {
        if (!this._fontInfo) {
            this._fontInfo = this.createFontInfo();
        }
        return this._fontInfo;
    }
    createFontInfo() {
        const editorOptions = this.configurationService.getValue('editor');
        return FontMeasurements.readFontInfo(this.window, BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(this.window).value));
    }
    isOverviewRulerEnabled() {
        return this.configurationService.getValue(NotebookSetting.diffOverviewRuler) ?? false;
    }
    getSelection() {
        const selections = this._list.getFocus();
        return new NotebookDiffEditorSelection(selections);
    }
    toggleNotebookCellSelection(cell) {
        // throw new Error('Method not implemented.');
    }
    updatePerformanceMetadata(cellId, executionId, duration, rendererId) {
        // throw new Error('Method not implemented.');
    }
    async focusNotebookCell(cell, focus) {
        // throw new Error('Method not implemented.');
    }
    async focusNextNotebookCell(cell, focus) {
        // throw new Error('Method not implemented.');
    }
    didFocusOutputInputChange(inputFocused) {
        // noop
    }
    getScrollTop() {
        return this._list?.scrollTop ?? 0;
    }
    getScrollHeight() {
        return this._list?.scrollHeight ?? 0;
    }
    getScrollPosition() {
        return {
            scrollTop: this.getScrollTop(),
            scrollLeft: this._list?.scrollLeft ?? 0
        };
    }
    setScrollPosition(scrollPosition) {
        if (!this._list) {
            return;
        }
        this._list.scrollTop = scrollPosition.scrollTop;
        if (scrollPosition.scrollLeft !== undefined) {
            this._list.scrollLeft = scrollPosition.scrollLeft;
        }
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this._list?.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    updateOutputHeight(cellInfo, output, outputHeight, isInit) {
        const diffElement = cellInfo.diffElement;
        const cell = this.getCellByInfo(cellInfo);
        const outputIndex = cell.outputsViewModels.indexOf(output);
        if (diffElement instanceof SideBySideDiffElementViewModel) {
            const info = CellUri.parse(cellInfo.cellUri);
            if (!info) {
                return;
            }
            diffElement.updateOutputHeight(info.notebook.toString() === this._model?.original.resource.toString() ? DiffSide.Original : DiffSide.Modified, outputIndex, outputHeight);
        }
        else {
            diffElement.updateOutputHeight(diffElement.type === 'insert' ? DiffSide.Modified : DiffSide.Original, outputIndex, outputHeight);
        }
        if (isInit) {
            this._onDidDynamicOutputRendered.fire({ cell, output });
        }
    }
    setMarkupCellEditState(cellId, editState) {
        // throw new Error('Method not implemented.');
    }
    didStartDragMarkupCell(cellId, event) {
        // throw new Error('Method not implemented.');
    }
    didDragMarkupCell(cellId, event) {
        // throw new Error('Method not implemented.');
    }
    didEndDragMarkupCell(cellId) {
        // throw new Error('Method not implemented.');
    }
    didDropMarkupCell(cellId) {
        // throw new Error('Method not implemented.');
    }
    didResizeOutput(cellId) {
        // throw new Error('Method not implemented.');
    }
    async toggleInlineView() {
        this._layoutCancellationTokenSource?.dispose();
        this._inlineView = !this._inlineView;
        if (!this._lastLayoutProperties) {
            return;
        }
        if (this._inlineView) {
            this.layout(this._lastLayoutProperties?.dimension, this._lastLayoutProperties?.position);
            this.inlineDiffWidget?.show(this.input, this._model?.modified.notebook, this._model?.original.notebook, this._options);
        }
        else {
            this.layout(this._lastLayoutProperties?.dimension, this._lastLayoutProperties?.position);
            this.inlineDiffWidget?.hide();
        }
        this._layoutCancellationTokenSource = new CancellationTokenSource();
        this.updateLayout(this._layoutCancellationTokenSource.token);
    }
    createEditor(parent) {
        this._rootElement = DOM.append(parent, DOM.$('.notebook-text-diff-editor'));
        this._overflowContainer = document.createElement('div');
        this._overflowContainer.classList.add('notebook-overflow-widget-container', 'monaco-editor');
        DOM.append(parent, this._overflowContainer);
        const renderers = [
            this.instantiationService.createInstance(CellDiffSingleSideRenderer, this),
            this.instantiationService.createInstance(CellDiffSideBySideRenderer, this),
            this.instantiationService.createInstance(CellDiffPlaceholderRenderer, this),
            this.instantiationService.createInstance(NotebookDocumentMetadataDiffRenderer, this),
        ];
        this._listViewContainer = DOM.append(this._rootElement, DOM.$('.notebook-diff-list-view'));
        this._list = this.instantiationService.createInstance(NotebookTextDiffList, 'NotebookTextDiff', this._listViewContainer, this.instantiationService.createInstance(NotebookCellTextDiffListDelegate, this.window), renderers, this.contextKeyService, {
            setRowLineHeight: false,
            setRowHeight: false,
            supportDynamicHeights: true,
            horizontalScrolling: false,
            keyboardSupport: false,
            mouseSupport: true,
            multipleSelectionSupport: false,
            typeNavigationEnabled: true,
            paddingBottom: 0,
            // transformOptimization: (isMacintosh && isNative) || getTitleBarStyle(this.configurationService, this.environmentService) === 'native',
            styleController: (_suffix) => { return this._list; },
            overrideStyles: {
                listBackground: editorBackground,
                listActiveSelectionBackground: editorBackground,
                listActiveSelectionForeground: foreground,
                listFocusAndSelectionBackground: editorBackground,
                listFocusAndSelectionForeground: foreground,
                listFocusBackground: editorBackground,
                listFocusForeground: foreground,
                listHoverForeground: foreground,
                listHoverBackground: editorBackground,
                listHoverOutline: focusBorder,
                listFocusOutline: focusBorder,
                listInactiveSelectionBackground: editorBackground,
                listInactiveSelectionForeground: foreground,
                listInactiveFocusBackground: editorBackground,
                listInactiveFocusOutline: editorBackground,
            },
            accessibilityProvider: {
                getAriaLabel() { return null; },
                getWidgetAriaLabel() {
                    return nls.localize('notebookTreeAriaLabel', "Notebook Text Diff");
                }
            },
            // focusNextPreviousDelegate: {
            // 	onFocusNext: (applyFocusNext: () => void) => this._updateForCursorNavigationMode(applyFocusNext),
            // 	onFocusPrevious: (applyFocusPrevious: () => void) => this._updateForCursorNavigationMode(applyFocusPrevious),
            // }
        });
        this.inlineDiffWidget = this._register(this.instantiationService.createInstance(NotebookInlineDiffWidget, this._rootElement, this.group.id, this.window, this.notebookOptions, this._dimension));
        this._register(this._list);
        this._register(this._list.onMouseUp(e => {
            if (e.element) {
                if (typeof e.index === 'number') {
                    this._list.setFocus([e.index]);
                }
                this._onMouseUp.fire({ event: e.browserEvent, target: e.element });
            }
        }));
        this._register(this._list.onDidScroll(() => {
            this._onDidScroll.fire();
        }));
        this._register(this._list.onDidChangeFocus(() => this._onDidChangeSelection.fire({ reason: 2 /* EditorPaneSelectionChangeReason.USER */ })));
        this._overviewRulerContainer = document.createElement('div');
        this._overviewRulerContainer.classList.add('notebook-overview-ruler-container');
        this._rootElement.appendChild(this._overviewRulerContainer);
        this._registerOverviewRuler();
        // transparent cover
        this._webviewTransparentCover = DOM.append(this._list.rowsContainer, $('.webview-cover'));
        this._webviewTransparentCover.style.display = 'none';
        this._register(DOM.addStandardDisposableGenericMouseDownListener(this._overflowContainer, (e) => {
            if (e.target.classList.contains('slider') && this._webviewTransparentCover) {
                this._webviewTransparentCover.style.display = 'block';
            }
        }));
        this._register(DOM.addStandardDisposableGenericMouseUpListener(this._overflowContainer, () => {
            if (this._webviewTransparentCover) {
                // no matter when
                this._webviewTransparentCover.style.display = 'none';
            }
        }));
        this._register(this._list.onDidScroll(e => {
            this._webviewTransparentCover.style.top = `${e.scrollTop}px`;
        }));
    }
    _registerOverviewRuler() {
        this._overviewRuler = this._register(this.instantiationService.createInstance(NotebookDiffOverviewRuler, this, NotebookTextDiffEditor_1.ENTIRE_DIFF_OVERVIEW_WIDTH, this._overviewRulerContainer));
    }
    _updateOutputsOffsetsInWebview(scrollTop, scrollHeight, activeWebview, getActiveNestedCell, diffSide) {
        activeWebview.element.style.height = `${scrollHeight}px`;
        if (activeWebview.insetMapping) {
            const updateItems = [];
            const removedItems = [];
            activeWebview.insetMapping.forEach((value, key) => {
                const cell = getActiveNestedCell(value.cellInfo.diffElement);
                if (!cell) {
                    return;
                }
                const viewIndex = this._list.indexOf(value.cellInfo.diffElement);
                if (viewIndex === undefined) {
                    return;
                }
                if (cell.outputsViewModels.indexOf(key) < 0) {
                    // output is already gone
                    removedItems.push(key);
                }
                else {
                    const cellTop = this._list.getCellViewScrollTop(value.cellInfo.diffElement);
                    const outputIndex = cell.outputsViewModels.indexOf(key);
                    const outputOffset = value.cellInfo.diffElement.getOutputOffsetInCell(diffSide, outputIndex);
                    updateItems.push({
                        cell,
                        output: key,
                        cellTop: cellTop,
                        outputOffset: outputOffset,
                        forceDisplay: false
                    });
                }
            });
            activeWebview.removeInsets(removedItems);
            if (updateItems.length) {
                activeWebview.updateScrollTops(updateItems, []);
            }
        }
    }
    async setInput(input, options, context, token) {
        this.inlineDiffWidget?.hide();
        await super.setInput(input, options, context, token);
        const model = await input.resolve();
        if (this._model !== model) {
            this._detachModel();
            this._attachModel(model);
        }
        this._model = model;
        if (this._model === null) {
            return;
        }
        if (this._inlineView) {
            this._listViewContainer.style.display = 'none';
            this.inlineDiffWidget?.show(input, model.modified.notebook, model.original.notebook, options);
        }
        else {
            this._listViewContainer.style.display = 'block';
            this.inlineDiffWidget?.hide();
        }
        this._revealFirst = true;
        this._modifiedResourceDisposableStore.clear();
        this._layoutCancellationTokenSource = new CancellationTokenSource();
        this._modifiedResourceDisposableStore.add(Event.any(this._model.original.notebook.onDidChangeContent, this._model.modified.notebook.onDidChangeContent)(e => {
            // If the user has made changes to the notebook whilst in the diff editor,
            // then do not re-compute the diff of the notebook,
            // As change will result in re-computing diff and re-building entire diff view.
            if (this._model !== null && this.editorService.activeEditor !== input) {
                this._layoutCancellationTokenSource?.dispose();
                this._layoutCancellationTokenSource = new CancellationTokenSource();
                this.updateLayout(this._layoutCancellationTokenSource.token);
            }
        }));
        await this._createOriginalWebview(generateUuid(), this._model.original.viewType, this._model.original.resource);
        if (this._originalWebview) {
            this._modifiedResourceDisposableStore.add(this._originalWebview);
        }
        await this._createModifiedWebview(generateUuid(), this._model.modified.viewType, this._model.modified.resource);
        if (this._modifiedWebview) {
            this._modifiedResourceDisposableStore.add(this._modifiedWebview);
        }
        await this.updateLayout(this._layoutCancellationTokenSource.token, options?.cellSelections ? cellRangesToIndexes(options.cellSelections) : undefined);
    }
    setVisible(visible) {
        super.setVisible(visible);
        if (!visible) {
            this.inlineDiffWidget?.hide();
        }
    }
    _detachModel() {
        this._localStore.clear();
        this._originalWebview?.dispose();
        this._originalWebview?.element.remove();
        this._originalWebview = null;
        this._modifiedWebview?.dispose();
        this._modifiedWebview?.element.remove();
        this._modifiedWebview = null;
        this.notebookDiffViewModel?.dispose();
        this.notebookDiffViewModel = undefined;
        this._modifiedResourceDisposableStore.clear();
        this._list.clear();
    }
    _attachModel(model) {
        this._model = model;
        this._eventDispatcher = new NotebookDiffEditorEventDispatcher();
        const updateInsets = () => {
            DOM.scheduleAtNextAnimationFrame(this.window, () => {
                if (this._isDisposed) {
                    return;
                }
                if (this._modifiedWebview) {
                    this._updateOutputsOffsetsInWebview(this._list.scrollTop, this._list.scrollHeight, this._modifiedWebview, (diffElement) => {
                        return diffElement.modified;
                    }, DiffSide.Modified);
                }
                if (this._originalWebview) {
                    this._updateOutputsOffsetsInWebview(this._list.scrollTop, this._list.scrollHeight, this._originalWebview, (diffElement) => {
                        return diffElement.original;
                    }, DiffSide.Original);
                }
            });
        };
        this._localStore.add(this._list.onDidChangeContentHeight(() => {
            updateInsets();
        }));
        this._localStore.add(this._list.onDidChangeFocus((e) => {
            if (e.indexes.length && this.notebookDiffViewModel && e.indexes[0] < this.notebookDiffViewModel.items.length) {
                const selectedItem = this.notebookDiffViewModel.items[e.indexes[0]];
                const changedItems = this.notebookDiffViewModel.items.filter(item => item.type !== 'unchanged' && item.type !== 'unchangedMetadata' && item.type !== 'placeholder');
                if (selectedItem && selectedItem?.type !== 'placeholder' && selectedItem?.type !== 'unchanged' && selectedItem?.type !== 'unchangedMetadata') {
                    return this._currentChangedIndex.set(changedItems.indexOf(selectedItem), undefined);
                }
            }
            return this._currentChangedIndex.set(-1, undefined);
        }));
        this._localStore.add(this._eventDispatcher.onDidChangeCellLayout(() => {
            updateInsets();
        }));
        const vm = this.notebookDiffViewModel = this._register(new NotebookDiffViewModel(this._model, this.notebookEditorWorkerService, this.configurationService, this._eventDispatcher, this.notebookService, this.diffEditorCalcuator, this.fontInfo, undefined));
        this._localStore.add(this.notebookDiffViewModel.onDidChangeItems(e => {
            this._originalWebview?.removeInsets([...this._originalWebview?.insetMapping.keys()]);
            this._modifiedWebview?.removeInsets([...this._modifiedWebview?.insetMapping.keys()]);
            if (this._revealFirst && typeof e.firstChangeIndex === 'number' && e.firstChangeIndex > -1 && e.firstChangeIndex < this._list.length) {
                this._revealFirst = false;
                this._list.setFocus([e.firstChangeIndex]);
                this._list.reveal(e.firstChangeIndex, 0.3);
            }
            this._list.splice(e.start, e.deleteCount, e.elements);
            if (this.isOverviewRulerEnabled()) {
                this._overviewRuler.updateViewModels(vm.items, this._eventDispatcher);
            }
        }));
    }
    async _createModifiedWebview(id, viewType, resource) {
        this._modifiedWebview?.dispose();
        this._modifiedWebview = this.instantiationService.createInstance(BackLayerWebView, this, id, viewType, resource, {
            ...this._notebookOptions.computeDiffWebviewOptions(),
            fontFamily: this._generateFontFamily()
        }, undefined);
        // attach the webview container to the DOM tree first
        this._list.rowsContainer.insertAdjacentElement('afterbegin', this._modifiedWebview.element);
        this._modifiedWebview.createWebview(this.window);
        this._modifiedWebview.element.style.width = `calc(50% - 16px)`;
        this._modifiedWebview.element.style.left = `calc(50%)`;
    }
    _generateFontFamily() {
        return this.fontInfo.fontFamily ?? `"SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace`;
    }
    async _createOriginalWebview(id, viewType, resource) {
        this._originalWebview?.dispose();
        this._originalWebview = this.instantiationService.createInstance(BackLayerWebView, this, id, viewType, resource, {
            ...this._notebookOptions.computeDiffWebviewOptions(),
            fontFamily: this._generateFontFamily()
        }, undefined);
        // attach the webview container to the DOM tree first
        this._list.rowsContainer.insertAdjacentElement('afterbegin', this._originalWebview.element);
        this._originalWebview.createWebview(this.window);
        this._originalWebview.element.style.width = `calc(50% - 16px)`;
        this._originalWebview.element.style.left = `16px`;
    }
    setOptions(options) {
        const selections = options?.cellSelections ? cellRangesToIndexes(options.cellSelections) : undefined;
        if (selections) {
            this._list.setFocus(selections);
        }
    }
    async updateLayout(token, selections) {
        if (!this._model || !this.notebookDiffViewModel) {
            return;
        }
        await this.notebookDiffViewModel.computeDiff(token);
        if (token.isCancellationRequested) {
            // after await the editor might be disposed.
            return;
        }
        if (selections) {
            this._list.setFocus(selections);
        }
    }
    scheduleOutputHeightAck(cellInfo, outputId, height) {
        const diffElement = cellInfo.diffElement;
        // const activeWebview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
        let diffSide = DiffSide.Original;
        if (diffElement instanceof SideBySideDiffElementViewModel) {
            const info = CellUri.parse(cellInfo.cellUri);
            if (!info) {
                return;
            }
            diffSide = info.notebook.toString() === this._model?.original.resource.toString() ? DiffSide.Original : DiffSide.Modified;
        }
        else {
            diffSide = diffElement.type === 'insert' ? DiffSide.Modified : DiffSide.Original;
        }
        const webview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
        DOM.scheduleAtNextAnimationFrame(this.window, () => {
            webview?.ackHeight([{ cellId: cellInfo.cellId, outputId, height }]);
        }, 10);
    }
    layoutNotebookCell(cell, height) {
        const relayout = (cell, height) => {
            this._list.updateElementHeight2(cell, height);
        };
        let disposable = this.pendingLayouts.get(cell);
        if (disposable) {
            this._localStore.delete(disposable);
        }
        let r;
        const layoutDisposable = DOM.scheduleAtNextAnimationFrame(this.window, () => {
            this.pendingLayouts.delete(cell);
            relayout(cell, height);
            r();
        });
        disposable = toDisposable(() => {
            layoutDisposable.dispose();
            r();
        });
        this._localStore.add(disposable);
        this.pendingLayouts.set(cell, disposable);
        return new Promise(resolve => { r = resolve; });
    }
    setScrollTop(scrollTop) {
        this._list.scrollTop = scrollTop;
    }
    triggerScroll(event) {
        this._list.triggerScrollFromMouseWheelEvent(event);
    }
    firstChange() {
        if (!this.notebookDiffViewModel) {
            return;
        }
        // go to the first one
        const currentViewModels = this.notebookDiffViewModel.items;
        const index = currentViewModels.findIndex(vm => vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder');
        if (index >= 0) {
            this._list.setFocus([index]);
            this._list.reveal(index);
        }
    }
    lastChange() {
        if (!this.notebookDiffViewModel) {
            return;
        }
        // go to the first one
        const currentViewModels = this.notebookDiffViewModel.items;
        const item = currentViewModels.slice().reverse().find(vm => vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder');
        const index = item ? currentViewModels.indexOf(item) : -1;
        if (index >= 0) {
            this._list.setFocus([index]);
            this._list.reveal(index);
        }
    }
    previousChange() {
        if (!this.notebookDiffViewModel) {
            return;
        }
        let currFocus = this._list.getFocus()[0];
        if (isNaN(currFocus) || currFocus < 0) {
            currFocus = 0;
        }
        // find the index of previous change
        let prevChangeIndex = currFocus - 1;
        const currentViewModels = this.notebookDiffViewModel.items;
        while (prevChangeIndex >= 0) {
            const vm = currentViewModels[prevChangeIndex];
            if (vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder') {
                break;
            }
            prevChangeIndex--;
        }
        if (prevChangeIndex >= 0) {
            this._list.setFocus([prevChangeIndex]);
            this._list.reveal(prevChangeIndex);
        }
        else {
            // go to the last one
            const index = findLastIdx(currentViewModels, vm => vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder');
            if (index >= 0) {
                this._list.setFocus([index]);
                this._list.reveal(index);
            }
        }
    }
    nextChange() {
        if (!this.notebookDiffViewModel) {
            return;
        }
        let currFocus = this._list.getFocus()[0];
        if (isNaN(currFocus) || currFocus < 0) {
            currFocus = 0;
        }
        // find the index of next change
        let nextChangeIndex = currFocus + 1;
        const currentViewModels = this.notebookDiffViewModel.items;
        while (nextChangeIndex < currentViewModels.length) {
            const vm = currentViewModels[nextChangeIndex];
            if (vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder') {
                break;
            }
            nextChangeIndex++;
        }
        if (nextChangeIndex < currentViewModels.length) {
            this._list.setFocus([nextChangeIndex]);
            this._list.reveal(nextChangeIndex);
        }
        else {
            // go to the first one
            const index = currentViewModels.findIndex(vm => vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder');
            if (index >= 0) {
                this._list.setFocus([index]);
                this._list.reveal(index);
            }
        }
    }
    createOutput(cellDiffViewModel, cellViewModel, output, getOffset, diffSide) {
        this._insetModifyQueueByOutputId.queue(output.source.model.outputId + (diffSide === DiffSide.Modified ? '-right' : 'left'), async () => {
            const activeWebview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
            if (!activeWebview) {
                return;
            }
            if (!activeWebview.insetMapping.has(output.source)) {
                const cellTop = this._list.getCellViewScrollTop(cellDiffViewModel);
                await activeWebview.createOutput({ diffElement: cellDiffViewModel, cellHandle: cellViewModel.handle, cellId: cellViewModel.id, cellUri: cellViewModel.uri }, output, cellTop, getOffset());
            }
            else {
                const cellTop = this._list.getCellViewScrollTop(cellDiffViewModel);
                const outputIndex = cellViewModel.outputsViewModels.indexOf(output.source);
                const outputOffset = cellDiffViewModel.getOutputOffsetInCell(diffSide, outputIndex);
                activeWebview.updateScrollTops([{
                        cell: cellViewModel,
                        output: output.source,
                        cellTop,
                        outputOffset,
                        forceDisplay: true
                    }], []);
            }
        });
    }
    updateMarkupCellHeight() {
        // TODO
    }
    getCellByInfo(cellInfo) {
        return cellInfo.diffElement.getCellByUri(cellInfo.cellUri);
    }
    getCellById(cellId) {
        throw new Error('Not implemented');
    }
    removeInset(cellDiffViewModel, cellViewModel, displayOutput, diffSide) {
        this._insetModifyQueueByOutputId.queue(displayOutput.model.outputId + (diffSide === DiffSide.Modified ? '-right' : 'left'), async () => {
            const activeWebview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
            if (!activeWebview) {
                return;
            }
            if (!activeWebview.insetMapping.has(displayOutput)) {
                return;
            }
            activeWebview.removeInsets([displayOutput]);
        });
    }
    showInset(cellDiffViewModel, cellViewModel, displayOutput, diffSide) {
        this._insetModifyQueueByOutputId.queue(displayOutput.model.outputId + (diffSide === DiffSide.Modified ? '-right' : 'left'), async () => {
            const activeWebview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
            if (!activeWebview) {
                return;
            }
            if (!activeWebview.insetMapping.has(displayOutput)) {
                return;
            }
            const cellTop = this._list.getCellViewScrollTop(cellDiffViewModel);
            const outputIndex = cellViewModel.outputsViewModels.indexOf(displayOutput);
            const outputOffset = cellDiffViewModel.getOutputOffsetInCell(diffSide, outputIndex);
            activeWebview.updateScrollTops([{
                    cell: cellViewModel,
                    output: displayOutput,
                    cellTop,
                    outputOffset,
                    forceDisplay: true,
                }], []);
        });
    }
    hideInset(cellDiffViewModel, cellViewModel, output) {
        this._modifiedWebview?.hideInset(output);
        this._originalWebview?.hideInset(output);
    }
    // private async _resolveWebview(rightEditor: boolean): Promise<BackLayerWebView | null> {
    // 	if (rightEditor) {
    // 	}
    // }
    getDomNode() {
        return this._rootElement;
    }
    getOverflowContainerDomNode() {
        return this._overflowContainer;
    }
    getControl() {
        return this;
    }
    clearInput() {
        this.inlineDiffWidget?.hide();
        super.clearInput();
        this._modifiedResourceDisposableStore.clear();
        this._list?.splice(0, this._list?.length || 0);
        this._model = null;
        this.notebookDiffViewModel?.dispose();
        this.notebookDiffViewModel = undefined;
    }
    deltaCellOutputContainerClassNames(diffSide, cellId, added, removed) {
        if (diffSide === DiffSide.Original) {
            this._originalWebview?.deltaCellOutputContainerClassNames(cellId, added, removed);
        }
        else {
            this._modifiedWebview?.deltaCellOutputContainerClassNames(cellId, added, removed);
        }
    }
    getLayoutInfo() {
        if (!this._list) {
            throw new Error('Editor is not initalized successfully');
        }
        return {
            width: this._dimension.width,
            height: this._dimension.height,
            fontInfo: this.fontInfo,
            scrollHeight: this._list?.getScrollHeight() ?? 0,
            stickyHeight: 0,
        };
    }
    layout(dimension, position) {
        this._rootElement.classList.toggle('mid-width', dimension.width < 1000 && dimension.width >= 600);
        this._rootElement.classList.toggle('narrow-width', dimension.width < 600);
        const overviewRulerEnabled = this.isOverviewRulerEnabled();
        this._dimension = dimension.with(dimension.width - (overviewRulerEnabled ? NotebookTextDiffEditor_1.ENTIRE_DIFF_OVERVIEW_WIDTH : 0));
        this._listViewContainer.style.height = `${dimension.height}px`;
        this._listViewContainer.style.width = `${this._dimension.width}px`;
        if (this._inlineView) {
            this._listViewContainer.style.display = 'none';
            this.inlineDiffWidget?.setLayout(dimension, position);
        }
        else {
            this.inlineDiffWidget?.hide();
            this._listViewContainer.style.display = 'block';
            this._list?.layout(this._dimension.height, this._dimension.width);
            if (this._modifiedWebview) {
                this._modifiedWebview.element.style.width = `calc(50% - 16px)`;
                this._modifiedWebview.element.style.left = `calc(50%)`;
            }
            if (this._originalWebview) {
                this._originalWebview.element.style.width = `calc(50% - 16px)`;
                this._originalWebview.element.style.left = `16px`;
            }
            if (this._webviewTransparentCover) {
                this._webviewTransparentCover.style.height = `${this._dimension.height}px`;
                this._webviewTransparentCover.style.width = `${this._dimension.width}px`;
            }
            if (overviewRulerEnabled) {
                this._overviewRuler.layout();
            }
        }
        this._lastLayoutProperties = { dimension, position };
        this._eventDispatcher?.emit([new NotebookDiffLayoutChangedEvent({ width: true, fontInfo: true }, this.getLayoutInfo())]);
    }
    dispose() {
        this._isDisposed = true;
        this._layoutCancellationTokenSource?.dispose();
        this._detachModel();
        super.dispose();
    }
};
NotebookTextDiffEditor = NotebookTextDiffEditor_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IContextKeyService),
    __param(4, INotebookEditorWorkerService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, IStorageService),
    __param(8, INotebookService),
    __param(9, IEditorService)
], NotebookTextDiffEditor);
export { NotebookTextDiffEditor };
registerZIndex(ZIndex.Base, 10, 'notebook-diff-view-viewport-slider');
registerThemingParticipant((theme, collector) => {
    const diffDiagonalFillColor = theme.getColor(diffDiagonalFill);
    collector.addRule(`
	.notebook-text-diff-editor .diagonal-fill {
		background-image: linear-gradient(
			-45deg,
			${diffDiagonalFillColor} 12.5%,
			#0000 12.5%, #0000 50%,
			${diffDiagonalFillColor} 50%, ${diffDiagonalFillColor} 62.5%,
			#0000 62.5%, #0000 100%
		);
		background-size: 8px 8px;
	}
	`);
    collector.addRule(`.notebook-text-diff-editor .cell-body { margin: ${DIFF_CELL_MARGIN}px; }`);
    // We do not want a left margin, as we add an overlay for expanind the collapsed/hidden cells.
    collector.addRule(`.notebook-text-diff-editor .cell-placeholder-body { margin: ${DIFF_CELL_MARGIN}px 0; }`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9ub3RlYm9va0RpZmZFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVqSCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUcvRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEcsT0FBTyxFQUEyRCw4QkFBOEIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3BJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSwwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSxnQ0FBZ0MsRUFBRSxvQ0FBb0MsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFOLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsVUFBVSxF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